import { MongoClient, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Aumentar el límite del body para permitir cargas grandes (imágenes en base64)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

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

/**
 * Endpoint que recibe imágenes generadas en el cliente y las guarda
 * Esto evita tener que convertir el PDF cada vez que se carga la página
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { images, pageNumbers } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    // Guardar imágenes en MongoDB GridFS o sistema de archivos
    if (mongoUri) {
      try {
        const clientPromise = getMongoClient();
        if (clientPromise) {
          const client = await clientPromise;
          const db = client.db();
          const bucket = new GridFSBucket(db, { bucketName: 'pdf_images' });
          
          // Eliminar imágenes anteriores
          try {
            const existingFiles = await bucket.find({ filename: { $regex: /^catalogo_page_/ } }).toArray();
            for (const file of existingFiles) {
              await bucket.delete(file._id);
            }
          } catch (e) {
            console.warn('No se pudo eliminar imágenes anteriores:', e);
          }
          
          // Guardar nuevas imágenes
          for (let i = 0; i < images.length; i++) {
            const pageNum = pageNumbers?.[i] || (i + 1);
            const imageData = images[i];
            
            // Convertir dataURL a buffer
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            const filename = `catalogo_page_${pageNum}.png`;
            const uploadStream = bucket.openUploadStream(filename, {
              contentType: 'image/png',
            });
            
            const readable = Readable.from([buffer]);
            readable.pipe(uploadStream);
            
            await new Promise((resolve, reject) => {
              uploadStream.on('finish', resolve);
              uploadStream.on('error', reject);
            });
          }
          
          // Marcar que las imágenes están generadas
          await db.collection('catalogs').updateOne(
            { isMain: true },
            { 
              $set: { 
                imagesGenerated: true,
                imagesGeneratedAt: new Date(),
                numPages: images.length,
              },
              $setOnInsert: { isMain: true }
            },
            { upsert: true }
          );
          
          return res.status(200).json({
            ok: true,
            message: `${images.length} imágenes guardadas exitosamente`,
            imagesCount: images.length,
          });
        }
      } catch (mongoError) {
        console.error('Error al guardar en MongoDB:', mongoError);
      }
    }
    
    // Fallback: guardar en sistema de archivos
    const imagesDir = path.join(process.cwd(), 'public', 'pdf-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    for (let i = 0; i < images.length; i++) {
      const pageNum = pageNumbers?.[i] || (i + 1);
      const imageData = images[i];
      
      // Convertir dataURL a buffer
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filename = `page-${pageNum}.png`;
      const filePath = path.join(imagesDir, filename);
      fs.writeFileSync(filePath, buffer);
    }
    
    return res.status(200).json({
      ok: true,
      message: `${images.length} imágenes guardadas exitosamente en sistema de archivos`,
      imagesCount: images.length,
      storedIn: 'filesystem',
    });
  } catch (error) {
    console.error('Error al guardar imágenes:', error);
    return res.status(500).json({
      error: 'Error al guardar las imágenes',
      details: error.message,
    });
  }
}

