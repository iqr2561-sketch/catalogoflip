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
      return null;
    }
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  try {
    // Intentar leer desde MongoDB GridFS primero
    if (mongoUri) {
      try {
        const clientPromise = getMongoClient();
        if (clientPromise) {
          const client = await clientPromise;
          const db = client.db();
          const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
          
          // Buscar el PDF en GridFS
          const files = await bucket.find({ filename: 'catalogo.pdf' }).sort({ uploadDate: -1 }).limit(1).toArray();
          
          if (files.length > 0) {
            const file = files[0];
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Length': file.length,
              'Content-Disposition': 'inline; filename="catalogo.pdf"',
              'Cache-Control': 'public, max-age=3600',
            });
            
            const downloadStream = bucket.openDownloadStreamByName('catalogo.pdf');
            downloadStream.pipe(res);
            return;
          }
        }
      } catch (mongoError) {
        console.warn('No se pudo leer desde MongoDB GridFS, usando fallback:', mongoError.message);
        // Continuar con fallback a sistema de archivos
      }
    }
    
    // Fallback: leer desde sistema de archivos
    const pdfPath = path.join(process.cwd(), 'catalogo.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({ 
        error: 'El archivo catalogo.pdf no existe.',
        hint: 'Sube un PDF desde el botón de Configuración → PDF',
      });
      return;
    }
    
    const stat = fs.statSync(pdfPath);
    
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Content-Disposition': 'inline; filename="catalogo.pdf"',
      'Cache-Control': 'public, max-age=3600',
    });
    
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error al servir PDF:', error);
    res.status(500).json({
      error: 'Error al servir el archivo PDF.',
      details: error.message,
    });
  }
}


