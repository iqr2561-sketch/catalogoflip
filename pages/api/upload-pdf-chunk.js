import { MongoClient, GridFSBucket } from 'mongodb';
import fs from 'fs';
import path from 'path';

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

let client = null;
let clientPromise = null;

function getMongoClient() {
  if (!mongoUri) return null;
  
  if (!clientPromise) {
    try {
      client = new MongoClient(mongoUri, {
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        retryWrites: true,
        w: 'majority',
      });
      clientPromise = client.connect();
    } catch (err) {
      console.error('[upload-pdf-chunk] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '4mb',
  },
};

export default async function handler(req, res) {
  const sendJsonResponse = (status, data) => {
    res.status(status).json(data);
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return sendJsonResponse(405, { error: 'Método no permitido' });
  }

  try {
    // Leer el body completo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      return sendJsonResponse(400, { error: 'No se recibió ningún dato.' });
    }
    
    const buffer = Buffer.concat(chunks);
    const data = JSON.parse(buffer.toString());
    
    const { chunkIndex, totalChunks, chunkData, filename, sessionId } = data;
    
    console.log(`[upload-pdf-chunk] Recibiendo chunk ${chunkIndex + 1}/${totalChunks} de ${filename} (${chunkData.length} chars)`);
    
    const useMongo = Boolean(mongoUri);
    const clientPromise = useMongo ? getMongoClient() : null;
    const mongoClient = clientPromise ? await clientPromise : null;
    const db = mongoClient ? mongoClient.db() : null;

    // Ruta de almacenamiento temporal local cuando no hay Mongo
    const tmpDir = path.join(process.cwd(), '.tmp', 'pdf-chunks');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    if (useMongo && db) {
      // Guardar el chunk en colección temporal
      const chunksCollection = db.collection('pdf_upload_chunks');
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

      console.log(`[upload-pdf-chunk] Chunk ${chunkIndex + 1}/${totalChunks} guardado (Mongo)`);      

      if (chunkIndex === totalChunks - 1) {
        console.log(`[upload-pdf-chunk] Último chunk recibido, ensamblando archivo...`);
        const allChunks = await chunksCollection
          .find({ sessionId })
          .sort({ chunkIndex: 1 })
          .toArray();

        if (allChunks.length !== totalChunks) {
          return sendJsonResponse(400, {
            error: `Faltan chunks. Recibidos: ${allChunks.length}, Esperados: ${totalChunks}`,
          });
        }

        const buffers = allChunks.map((c) => Buffer.from(c.chunkData, 'base64'));
        const pdfBuffer = Buffer.concat(buffers);

        if (pdfBuffer.length === 0) {
          await chunksCollection.deleteMany({ sessionId });
          return sendJsonResponse(400, { error: 'El buffer del PDF está vacío después del ensamblaje' });
        }

        const header = pdfBuffer.slice(0, 4).toString();
        if (header !== '%PDF') {
          await chunksCollection.deleteMany({ sessionId });
          return sendJsonResponse(400, {
            error: 'El archivo no es un PDF válido',
            receivedHeader: header,
          });
        }

        const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
        const { Readable } = require('stream');
        const uploadStream = bucket.openUploadStream('catalogo.pdf', {
          contentType: 'application/pdf',
        });

        const readable = new Readable();
        readable.push(pdfBuffer);
        readable.push(null);
        readable.pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
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
            $setOnInsert: { isMain: true }
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
      }

      return sendJsonResponse(200, {
        ok: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
        chunkIndex,
        totalChunks,
      });
    }

    // Fallback sin Mongo: guardar chunks en filesystem temporal
    const partPath = path.join(tmpDir, `${sessionId}-${chunkIndex}.part`);
    fs.writeFileSync(partPath, chunkData, 'utf8');
    console.log(`[upload-pdf-chunk] Chunk ${chunkIndex + 1}/${totalChunks} guardado en filesystem`);

    if (chunkIndex === totalChunks - 1) {
      // Ensamblar desde disco
      const buffers = [];
      for (let i = 0; i < totalChunks; i++) {
        const p = path.join(tmpDir, `${sessionId}-${i}.part`);
        if (!fs.existsSync(p)) {
          return sendJsonResponse(400, { error: `Falta el chunk ${i + 1}/${totalChunks}` });
        }
        buffers.push(Buffer.from(fs.readFileSync(p, 'utf8'), 'base64'));
      }
      const pdfBuffer = Buffer.concat(buffers);

      if (pdfBuffer.length === 0) {
        return sendJsonResponse(400, { error: 'El buffer del PDF está vacío después del ensamblaje' });
      }

      const header = pdfBuffer.slice(0, 4).toString();
      if (header !== '%PDF') {
        return sendJsonResponse(400, { error: 'El archivo no es un PDF válido', receivedHeader: header });
      }

      const targetPath = path.join(process.cwd(), 'catalogo.pdf');
      fs.writeFileSync(targetPath, pdfBuffer);

      // Limpiar partes
      for (let i = 0; i < totalChunks; i++) {
        const p = path.join(tmpDir, `${sessionId}-${i}.part`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }

      return sendJsonResponse(200, {
        ok: true,
        message: 'PDF cargado en filesystem. Genera las imágenes desde el panel.',
        filename: 'catalogo.pdf',
        size: pdfBuffer.length,
        totalChunks,
        assembled: true,
        storedIn: 'filesystem',
      });
    }

    return sendJsonResponse(200, {
      ok: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
      chunkIndex,
      totalChunks,
      storedIn: 'filesystem',
    });
    
  } catch (error) {
    console.error('[upload-pdf-chunk] Error crítico:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Intentar limpiar chunks en caso de error
    try {
      if (mongoUri) {
        const clientPromise = getMongoClient();
        const mongoClient = await clientPromise;
        const db = mongoClient.db();
        const chunksCollection = db.collection('pdf_upload_chunks');
        const deletedCount = await chunksCollection.deleteMany({ 
          uploadedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
        });
        console.log(`[upload-pdf-chunk] Limpieza: ${deletedCount.deletedCount} chunks antiguos eliminados`);
      }
    } catch (cleanupError) {
      console.error('[upload-pdf-chunk] Error al limpiar chunks:', cleanupError);
    }
    
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${error.name}`,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Verifica los logs del servidor para más detalles',
    });
  }
}

