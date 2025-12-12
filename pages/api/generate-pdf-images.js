import { MongoClient, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
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

async function getPdfBuffer(db) {
  // 1) Intentar desde MongoDB si existe
  if (mongoUri && db) {
    try {
      const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
      const files = await pdfBucket
        .find({ filename: 'catalogo.pdf' })
        .sort({ uploadDate: -1 })
        .limit(1)
        .toArray();

      if (files.length > 0) {
        const chunks = [];
        const downloadStream = pdfBucket.openDownloadStreamByName('catalogo.pdf');
        for await (const chunk of downloadStream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return { buffer, source: 'mongo', fileId: files[0]._id?.toString() };
      }
    } catch (err) {
      console.warn('[generate-pdf-images] No se pudo leer PDF desde MongoDB, probando filesystem', err);
    }
  }

  // 2) Fallback: sistema de archivos
  const pdfPath = path.join(process.cwd(), 'catalogo.pdf');
  if (fs.existsSync(pdfPath)) {
    const buffer = fs.readFileSync(pdfPath);
    return { buffer, source: 'filesystem' };
  }

  return null;
}

function wipeFsImagesDir(imagesDir) {
  try {
    if (!fs.existsSync(imagesDir)) return;
    const files = fs.readdirSync(imagesDir);
    files.forEach((file) => {
      if (file.endsWith('.png')) {
        fs.unlinkSync(path.join(imagesDir, file));
      }
    });
  } catch (e) {
    console.warn('[generate-pdf-images] No se pudieron limpiar imágenes previas en filesystem', e);
  }
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
    const clientPromise = getMongoClient();
    const mongoClient = clientPromise ? await clientPromise : null;
    const db = mongoClient ? mongoClient.db() : null;

    const pdfData = await getPdfBuffer(db);
    if (!pdfData) {
      return sendJsonResponse(404, {
        error: 'No se encontró el PDF en el servidor',
        hint: 'Sube un PDF primero y vuelve a intentar generar las imágenes',
      });
    }

    console.log(`[generate-pdf-images] Fuente de PDF: ${pdfData.source}`);
    console.log('[generate-pdf-images] Generando imágenes del PDF...');
    const images = await pdfToImagesServer(pdfData.buffer, 2.0);
    console.log(`[generate-pdf-images] ${images.length} imágenes generadas exitosamente`);

    let storedIn = [];

    // Guardar en GridFS si está disponible
    if (db) {
      const imagesBucket = new GridFSBucket(db, { bucketName: 'pdf_images' });

      try {
        console.log('[generate-pdf-images] Eliminando imágenes antiguas en MongoDB...');
        const existingImages = await imagesBucket
          .find({ filename: { $regex: /^catalogo_page_/ } })
          .toArray();
        for (const file of existingImages) {
          await imagesBucket.delete(file._id);
        }
      } catch (e) {
        console.warn('[generate-pdf-images] Error al eliminar imágenes antiguas en MongoDB:', e);
      }

      console.log('[generate-pdf-images] Guardando nuevas imágenes en MongoDB...');
      for (const image of images) {
        const filename = `catalogo_page_${image.pageNum}.png`;
        const uploadStream = imagesBucket.openUploadStream(filename, {
          contentType: 'image/png',
        });

        const readable = Readable.from([image.buffer]);
        readable.pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });
      }

      try {
        await db.collection('catalogs').updateOne(
          { isMain: true },
          {
            $set: {
              imagesGenerated: true,
              imagesGeneratedAt: new Date(),
              numPages: images.length,
              currentPdfFileId: pdfData.fileId || null,
            },
            $setOnInsert: { isMain: true },
          },
          { upsert: true }
        );
      } catch (e) {
        console.warn('[generate-pdf-images] No se pudo actualizar el documento de catálogo:', e);
      }

      storedIn.push('mongo');
    }

    // Guardar en filesystem como respaldo
    const imagesDir = path.join(process.cwd(), 'public', 'pdf-images');
    try {
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      } else {
        wipeFsImagesDir(imagesDir);
      }

      for (const image of images) {
        const filename = `page-${image.pageNum}.png`;
        const filePath = path.join(imagesDir, filename);
        fs.writeFileSync(filePath, image.buffer);
      }
      storedIn.push('filesystem');
    } catch (fsError) {
      console.warn('[generate-pdf-images] No se pudieron guardar imágenes en filesystem:', fsError);
    }

    console.log(`[generate-pdf-images] ✓ Proceso completado: ${images.length} imágenes generadas`);

    return sendJsonResponse(200, {
      ok: true,
      message: `${images.length} imágenes generadas y guardadas`,
      numPages: images.length,
      imagesGenerated: true,
      storedIn,
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

