import { MongoClient, GridFSBucket } from 'mongodb';

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
      console.error('[catalog-image] Error al crear cliente MongoDB:', err);
      return null;
    }
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { page } = req.query;
    const pageNumber = parseInt(page, 10);

    if (!pageNumber || pageNumber < 1) {
      return res.status(400).json({ error: 'Número de página inválido' });
    }

    const filename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;

    // Intentar desde MongoDB
    const clientPromise = getMongoClient();
    if (clientPromise) {
      const mongoClient = await clientPromise;
      const db = mongoClient.db();
      const imagesBucket = new GridFSBucket(db, { bucketName: 'catalog_images' });

      const files = await imagesBucket.find({ filename }).toArray();
      
      if (files.length > 0) {
        const downloadStream = imagesBucket.openDownloadStreamByName(filename);
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        
        downloadStream.pipe(res);
        return;
      }
    }

    // Fallback: filesystem
    const fs = require('fs');
    const path = require('path');
    const imagePath = path.join(process.cwd(), 'public', 'catalog-images', filename);

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(imageBuffer);
    }

    return res.status(404).json({ error: 'Imagen no encontrada' });

  } catch (error) {
    console.error('[catalog-image] Error:', error);
    return res.status(500).json({ error: 'Error al obtener la imagen' });
  }
}

