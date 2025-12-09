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
      console.error('Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { page } = req.query;
  const pageNum = parseInt(page, 10);

  if (!pageNum || pageNum < 1) {
    return res.status(400).json({ error: 'Número de página inválido' });
  }

  try {
    // Intentar leer desde MongoDB GridFS primero
    if (mongoUri) {
      try {
        const clientPromise = getMongoClient();
        if (clientPromise) {
          const client = await clientPromise;
          const db = client.db();
          const bucket = new GridFSBucket(db, { bucketName: 'pdfImages' });
          
          const filename = `page-${pageNum}.png`;
          const files = await bucket.find({ filename }).toArray();
          
          if (files.length > 0) {
            const file = files[0];
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': file.length,
              'Cache-Control': 'public, max-age=31536000, immutable',
            });
            
            const downloadStream = bucket.openDownloadStreamByName(filename);
            downloadStream.pipe(res);
            return;
          }
        }
      } catch (mongoError) {
        console.warn('No se pudo leer desde MongoDB GridFS:', mongoError.message);
      }
    }
    
    // Fallback: leer desde sistema de archivos
    const imagePath = path.join(process.cwd(), 'public', 'pdf-images', `page-${pageNum}.png`);
    
    if (fs.existsSync(imagePath)) {
      const stat = fs.statSync(imagePath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      
      const stream = fs.createReadStream(imagePath);
      stream.pipe(res);
      return;
    }
    
    res.status(404).json({ 
      error: `Imagen de página ${pageNum} no encontrada.`,
      hint: 'Las imágenes se generan automáticamente al subir el PDF.',
    });
  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).json({ 
      error: 'Error al servir la imagen.',
      details: error.message,
    });
  }
}

