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
          // Intentar ambos nombres de bucket para compatibilidad
          let bucket = new GridFSBucket(db, { bucketName: 'pdf_images' });
          let filename = `catalogo_page_${pageNum}.png`;
          let files = await bucket.find({ filename }).toArray();
          
          // Si no se encuentra, intentar con el nombre antiguo
          if (files.length === 0) {
            bucket = new GridFSBucket(db, { bucketName: 'pdfImages' });
            filename = `page-${pageNum}.png`;
            files = await bucket.find({ filename }).toArray();
          }
          
          if (files.length > 0) {
            const file = files[0];
            console.log(`[pdf-images] Imagen encontrada en GridFS: ${filename} (página ${pageNum}, tamaño: ${file.length} bytes)`);
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': file.length,
              'Cache-Control': 'public, max-age=31536000, immutable',
            });
            
            const downloadStream = bucket.openDownloadStreamByName(filename);
            downloadStream.on('error', (streamError) => {
              console.error(`[pdf-images] Error al descargar desde GridFS (página ${pageNum}):`, streamError);
            });
            downloadStream.pipe(res);
            return;
          } else {
            console.warn(`[pdf-images] Imagen no encontrada en GridFS: ${filename} (página ${pageNum})`);
          }
        }
      } catch (mongoError) {
        console.error(`[pdf-images] Error al leer desde MongoDB GridFS (página ${pageNum}):`, {
          message: mongoError.message,
          stack: mongoError.stack,
          page: pageNum,
        });
      }
    }
    
    // Fallback: leer desde sistema de archivos
    const imagePath = path.join(process.cwd(), 'public', 'pdf-images', `page-${pageNum}.png`);
    
    if (fs.existsSync(imagePath)) {
      try {
        const stat = fs.statSync(imagePath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': stat.size,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        
        const stream = fs.createReadStream(imagePath);
        stream.on('error', (streamError) => {
          console.error(`[pdf-images] Error al leer archivo del sistema de archivos (página ${pageNum}):`, streamError);
        });
        stream.pipe(res);
        return;
      } catch (fsError) {
        console.error(`[pdf-images] Error al acceder al archivo del sistema de archivos (página ${pageNum}):`, {
          message: fsError.message,
          path: imagePath,
        });
      }
    } else {
      console.warn(`[pdf-images] Imagen no encontrada en sistema de archivos: ${imagePath} (página ${pageNum})`);
    }
    
    console.error(`[pdf-images] Imagen de página ${pageNum} no encontrada en ninguna ubicación`);
    res.status(404).json({ 
      error: `Imagen de página ${pageNum} no encontrada.`,
      hint: 'Las imágenes se generan automáticamente al subir el PDF.',
      page: pageNum,
    });
  } catch (error) {
    console.error(`[pdf-images] Error crítico al servir imagen (página ${pageNum}):`, {
      message: error.message,
      stack: error.stack,
      page: pageNum,
    });
    res.status(500).json({ 
      error: 'Error al servir la imagen.',
      details: error.message,
      page: pageNum,
    });
  }
}

