import { MongoClient, GridFSBucket } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

let client = null;
let clientPromise = null;

function getMongoClient() {
  if (!mongoUri) return null;
  if (!clientPromise) {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      w: 'majority',
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

export default async function handler(req, res) {
  const sendJsonResponse = (status, data) => res.status(status).json(data);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return sendJsonResponse(405, { error: 'Método no permitido' });
  }

  if (!mongoUri) {
    // En Vercel/serverless el fallback a filesystem suele ser inconsistente.
    return sendJsonResponse(501, {
      error: 'Subida de PDF no disponible sin MongoDB',
      hint: 'Configura MONGODB_URI para habilitar la subida por chunks y el almacenamiento en GridFS.',
    });
  }

  try {
    // Leer el body completo (JSON)
    const bodyChunks = [];
    for await (const chunk of req) bodyChunks.push(chunk);
    if (bodyChunks.length === 0) {
      return sendJsonResponse(400, { error: 'No se recibió ningún dato.' });
    }

    let data;
    try {
      data = JSON.parse(Buffer.concat(bodyChunks).toString('utf8'));
    } catch (parseError) {
      return sendJsonResponse(400, {
        error: 'Error al parsear los datos JSON',
        details: parseError.message,
      });
    }

    const { chunkIndex, totalChunks, chunkData, filename, sessionId } = data || {};

    if (
      chunkIndex === undefined ||
      totalChunks === undefined ||
      !chunkData ||
      !filename ||
      !sessionId
    ) {
      return sendJsonResponse(400, {
        error: 'Datos incompletos',
        received: {
          chunkIndex,
          totalChunks,
          hasChunkData: !!chunkData,
          filename,
          sessionId,
        },
      });
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db();
    const chunksCollection = db.collection('pdf_upload_chunks');

    // Guardar chunk (base64) en Mongo
    await chunksCollection.updateOne(
      { sessionId, chunkIndex },
      {
        $set: {
          sessionId,
          chunkIndex,
          totalChunks,
          chunkData,
          filename,
          uploadedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Si no es el último, confirmar recepción
    if (chunkIndex !== totalChunks - 1) {
      return sendJsonResponse(200, {
        ok: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
        chunkIndex,
        totalChunks,
        storedIn: 'mongo',
      });
    }

    // Ensamblar PDF desde Mongo
    const allChunks = await chunksCollection
      .find({ sessionId })
      .sort({ chunkIndex: 1 })
      .toArray();

    if (allChunks.length !== totalChunks) {
      return sendJsonResponse(400, {
        error: 'Faltan chunks para ensamblar el PDF',
        receivedChunks: allChunks.length,
        expectedChunks: totalChunks,
      });
    }

    const pdfBuffer = Buffer.concat(allChunks.map((c) => Buffer.from(c.chunkData, 'base64')));
    if (pdfBuffer.length === 0) {
      await chunksCollection.deleteMany({ sessionId });
      return sendJsonResponse(400, { error: 'El buffer del PDF está vacío después del ensamblaje' });
    }

    const header = pdfBuffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      await chunksCollection.deleteMany({ sessionId });
      return sendJsonResponse(400, { error: 'El archivo no es un PDF válido', receivedHeader: header });
    }

    // Subir a GridFS como catalogo.pdf (reemplazando si existe)
    const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    const existing = await bucket.find({ filename: 'catalogo.pdf' }).toArray();
    if (existing.length > 0) {
      try {
        await bucket.delete(existing[0]._id);
      } catch (_) {
        // ignore
      }
    }

    await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream('catalogo.pdf', { contentType: 'application/pdf' });
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(pdfBuffer);
    });

    await chunksCollection.deleteMany({ sessionId });

    await db.collection('catalogs').updateOne(
      { isMain: true },
      {
        $set: {
          pdfUpdatedAt: new Date(),
          pdfSize: pdfBuffer.length,
          imagesGenerated: false,
          numPages: null,
        },
        $setOnInsert: { isMain: true },
      },
      { upsert: true }
    );

    return sendJsonResponse(200, {
      ok: true,
      message: 'PDF cargado exitosamente. Genera las imágenes desde el panel.',
      filename: 'catalogo.pdf',
      size: pdfBuffer.length,
      totalChunks,
      assembled: true,
      storedIn: 'mongo',
    });
  } catch (error) {
    console.error('[upload-pdf-chunk] Error:', error);
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${error?.message || 'Error desconocido'}`,
    });
  }
}


