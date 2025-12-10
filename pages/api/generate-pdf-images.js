import { MongoClient, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { pdfToImagesServer } from '../../lib/pdfToImagesServer';

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
      console.error('[generate-pdf-images] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: true,
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
    if (!mongoUri) {
      return sendJsonResponse(500, {
        error: 'MongoDB no está configurado',
        hint: 'Configura MONGODB_URI en las variables de entorno',
      });
    }

    const clientPromise = getMongoClient();
    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    
    // Obtener el PDF desde GridFS
    const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    const files = await pdfBucket.find({ filename: 'catalogo.pdf' }).sort({ uploadDate: -1 }).limit(1).toArray();
    
    if (files.length === 0) {
      return sendJsonResponse(404, {
        error: 'No se encontró el PDF en el servidor',
        hint: 'Sube un PDF primero',
      });
    }
    
    console.log('[generate-pdf-images] Descargando PDF desde GridFS...');
    
    // Descargar el PDF
    const downloadStream = pdfBucket.openDownloadStreamByName('catalogo.pdf');
    const chunks = [];
    
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    
    const pdfBuffer = Buffer.concat(chunks);
    console.log(`[generate-pdf-images] PDF descargado: ${pdfBuffer.length} bytes`);
    
    // Generar imágenes
    console.log('[generate-pdf-images] Generando imágenes del PDF...');
    const images = await pdfToImagesServer(pdfBuffer, 2.0);
    console.log(`[generate-pdf-images] ${images.length} imágenes generadas exitosamente`);
    
    // Guardar imágenes en GridFS
    const imagesBucket = new GridFSBucket(db, { bucketName: 'pdf_images' });
    
    // Eliminar imágenes antiguas
    try {
      console.log('[generate-pdf-images] Eliminando imágenes antiguas...');
      const existingImages = await imagesBucket.find({ filename: { $regex: /^catalogo_page_/ } }).toArray();
      console.log(`[generate-pdf-images] Encontradas ${existingImages.length} imágenes antiguas`);
      for (const file of existingImages) {
        await imagesBucket.delete(file._id);
      }
    } catch (e) {
      console.warn('[generate-pdf-images] Error al eliminar imágenes antiguas:', e);
    }
    
    // Guardar nuevas imágenes
    console.log('[generate-pdf-images] Guardando nuevas imágenes...');
    for (const image of images) {
      const filename = `catalogo_page_${image.pageNum}.png`;
      const uploadStream = imagesBucket.openUploadStream(filename, {
        contentType: 'image/png',
      });
      
      const readable = Readable.from([image.buffer]);
      readable.pipe(uploadStream);
      
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          console.log(`[generate-pdf-images] ✓ ${filename} guardada`);
          resolve();
        });
        uploadStream.on('error', reject);
      });
    }
    
    // Actualizar configuración
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
    
    console.log(`[generate-pdf-images] ✓ Proceso completado: ${images.length} imágenes generadas y guardadas`);
    
    return sendJsonResponse(200, {
      ok: true,
      message: `${images.length} imágenes generadas y guardadas exitosamente`,
      numPages: images.length,
      imagesGenerated: true,
    });
    
  } catch (error) {
    console.error('[generate-pdf-images] Error crítico:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return sendJsonResponse(500, {
      ok: false,
      error: 'Error al generar imágenes del PDF',
      details: error.message,
    });
  }
}

