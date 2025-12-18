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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!mongoUri) {
    return res.status(404).json({ error: 'Video no disponible (MongoDB no configurado)' });
  }

  try {
    const clientPromise = getMongoClient();
    if (!clientPromise) return res.status(404).json({ error: 'Video no disponible' });

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const catalog = (await db.collection('catalogs').findOne({ isMain: true })) || (await db.collection('catalogs').findOne());
    const filename = catalog?.landingPage?.video?.filename || 'landing-hero-video';

    const bucket = new GridFSBucket(db, { bucketName: 'landing_videos' });
    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const file = files[0];
    const contentType = file.contentType || catalog?.landingPage?.video?.contentType || 'video/mp4';

    // Nota: streaming simple (sin range) para mantenerlo robusto.
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on('error', (err) => {
      console.error('[landing-video] Stream error:', err);
      if (!res.headersSent) res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error('[landing-video] Error:', error);
    return res.status(500).json({ error: 'Error al obtener el video' });
  }
}


