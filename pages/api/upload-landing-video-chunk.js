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
    return sendJsonResponse(501, {
      error: 'Subida de video no disponible sin MongoDB',
      hint: 'Configura MONGODB_URI para habilitar la subida por chunks y el almacenamiento en GridFS.',
    });
  }

  try {
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

    const { chunkIndex, totalChunks, chunkData, filename, sessionId, contentType } = data || {};

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
    const chunksCollection = db.collection('landing_video_upload_chunks');

    // Guardar chunk (base64)
    await chunksCollection.updateOne(
      { sessionId, chunkIndex },
      {
        $set: {
          sessionId,
          chunkIndex,
          totalChunks,
          chunkData,
          filename,
          contentType: contentType || 'video/mp4',
          uploadedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (chunkIndex !== totalChunks - 1) {
      return sendJsonResponse(200, {
        ok: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
        chunkIndex,
        totalChunks,
        storedIn: 'mongo',
      });
    }

    // Ensamblar video
    const allChunks = await chunksCollection
      .find({ sessionId })
      .sort({ chunkIndex: 1 })
      .toArray();

    if (allChunks.length !== totalChunks) {
      return sendJsonResponse(400, {
        error: 'Faltan chunks para ensamblar el video',
        receivedChunks: allChunks.length,
        expectedChunks: totalChunks,
      });
    }

    const videoBuffer = Buffer.concat(allChunks.map((c) => Buffer.from(c.chunkData, 'base64')));
    if (videoBuffer.length === 0) {
      await chunksCollection.deleteMany({ sessionId });
      return sendJsonResponse(400, { error: 'El buffer del video está vacío después del ensamblaje' });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'landing_videos' });
    const targetFilename = 'landing-hero-video';
    const existing = await bucket.find({ filename: targetFilename }).toArray();
    if (existing.length > 0) {
      try {
        await bucket.delete(existing[0]._id);
      } catch (_) {
        // ignore
      }
    }

    const ct = (contentType || 'video/mp4').toString();
    await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(targetFilename, { contentType: ct });
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(videoBuffer);
    });

    await chunksCollection.deleteMany({ sessionId });

    // Guardar referencia en el catálogo
    await db.collection('catalogs').updateOne(
      { isMain: true },
      {
        $set: {
          'landingPage.video': {
            source: 'gridfs',
            filename: targetFilename,
            contentType: ct,
            originalName: filename,
            updatedAt: new Date(),
          },
        },
        $setOnInsert: { isMain: true },
      },
      { upsert: true }
    );

    return sendJsonResponse(200, {
      ok: true,
      message: 'Video cargado exitosamente',
      filename: targetFilename,
      originalName: filename,
      size: videoBuffer.length,
      totalChunks,
      assembled: true,
      storedIn: 'mongo',
      videoUrl: '/api/landing-video',
    });
  } catch (error) {
    console.error('[upload-landing-video-chunk] Error:', error);
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${error?.message || 'Error desconocido'}`,
    });
  }
}


