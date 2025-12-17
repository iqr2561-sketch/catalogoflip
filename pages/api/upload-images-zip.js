import { MongoClient, GridFSBucket } from 'mongodb';
import AdmZip from 'adm-zip';
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
      console.error('[upload-images-zip] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
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
    console.log('[upload-images-zip] Iniciando recepción de ZIP...');
    
    // Leer el body completo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      console.error('[upload-images-zip] No se recibieron datos');
      return sendJsonResponse(400, { error: 'No se recibió ningún dato.' });
    }
    
    const buffer = Buffer.concat(chunks);
    console.log(`[upload-images-zip] Datos recibidos: ${buffer.length} bytes`);
    
    // Parsear JSON
    let data;
    try {
      const jsonString = buffer.toString('utf8');
      data = JSON.parse(jsonString);
      console.log(`[upload-images-zip] JSON parseado correctamente, filename: ${data.filename || 'no especificado'}`);
    } catch (parseError) {
      console.error('[upload-images-zip] Error al parsear JSON:', {
        error: parseError.message,
        bufferLength: buffer.length,
        preview: buffer.toString('utf8').substring(0, 200),
      });
      return sendJsonResponse(400, { 
        error: 'Error al parsear los datos JSON',
        details: parseError.message,
      });
    }
    
    const { zipData, filename } = data;
    
    if (!zipData || !filename) {
      console.error('[upload-images-zip] Datos incompletos:', { hasZipData: !!zipData, filename });
      return sendJsonResponse(400, {
        error: 'Datos incompletos',
        received: { hasZipData: !!zipData, filename },
      });
    }

    console.log(`[upload-images-zip] Procesando ZIP: ${filename}, tamaño base64: ${zipData.length} caracteres`);

    // Decodificar base64
    let zipBuffer;
    try {
      zipBuffer = Buffer.from(zipData, 'base64');
      console.log(`[upload-images-zip] ZIP decodificado: ${zipBuffer.length} bytes`);
    } catch (base64Error) {
      console.error('[upload-images-zip] Error al decodificar base64:', base64Error);
      return sendJsonResponse(400, {
        error: 'Error al decodificar los datos base64',
        details: base64Error.message,
      });
    }
    
    // Validar que sea un ZIP
    if (zipBuffer.length < 4 || zipBuffer.slice(0, 2).toString('hex') !== '504b') {
      return sendJsonResponse(400, { 
        error: 'El archivo no es un ZIP válido',
        hint: 'El archivo debe ser un ZIP que contenga imágenes JPG',
      });
    }

    // Extraer ZIP
    let zip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (zipError) {
      console.error('[upload-images-zip] Error al leer ZIP:', zipError);
      return sendJsonResponse(400, {
        error: 'Error al leer el archivo ZIP',
        details: zipError.message,
      });
    }

    const zipEntries = zip.getEntries();
    console.log(`[upload-images-zip] ZIP contiene ${zipEntries.length} archivos`);

    // Filtrar solo imágenes JPG/JPEG
    const imageEntries = zipEntries.filter(entry => {
      const name = entry.entryName.toLowerCase();
      return !entry.isDirectory && (name.endsWith('.jpg') || name.endsWith('.jpeg'));
    });

    if (imageEntries.length === 0) {
      return sendJsonResponse(400, {
        error: 'No se encontraron imágenes JPG en el ZIP',
        hint: 'El ZIP debe contener archivos .jpg o .jpeg',
      });
    }

    console.log(`[upload-images-zip] Encontradas ${imageEntries.length} imágenes JPG`);

    // Ordenar por nombre para mantener el orden
    imageEntries.sort((a, b) => {
      return a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Conectar a MongoDB si está disponible
    const clientPromise = getMongoClient();
    const mongoClient = clientPromise ? await clientPromise : null;
    const db = mongoClient ? mongoClient.db() : null;

    const imageUrls = [];
    const imagesBucket = db ? new GridFSBucket(db, { bucketName: 'catalog_images' }) : null;

    // Eliminar imágenes antiguas si hay MongoDB
    if (imagesBucket) {
      try {
        const existingImages = await imagesBucket.find({ filename: { $regex: /^catalog_page_/ } }).toArray();
        console.log(`[upload-images-zip] Eliminando ${existingImages.length} imágenes antiguas...`);
        for (const file of existingImages) {
          await imagesBucket.delete(file._id);
        }
        console.log('[upload-images-zip] Imágenes antiguas eliminadas');
      } catch (deleteError) {
        console.warn('[upload-images-zip] Error al eliminar imágenes antiguas:', deleteError);
      }
    }

    // Procesar cada imagen
    for (let i = 0; i < imageEntries.length; i++) {
      const entry = imageEntries[i];
      const imageBuffer = entry.getData();
      const pageNumber = i + 1;
      const filename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;

      if (imagesBucket) {
        // Guardar en MongoDB GridFS
        const uploadStream = imagesBucket.openUploadStream(filename, {
          contentType: 'image/jpeg',
        });

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
          uploadStream.end(imageBuffer);
        });

        imageUrls.push(`/api/catalog-image/${pageNumber}`);
        console.log(`[upload-images-zip] ✓ Imagen ${pageNumber}/${imageEntries.length} guardada en MongoDB`);
      } else {
        // Fallback: guardar en filesystem (solo en desarrollo)
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
        if (!isServerless) {
          const imagesDir = path.join(process.cwd(), 'public', 'catalog-images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }
          const imagePath = path.join(imagesDir, filename);
          fs.writeFileSync(imagePath, imageBuffer);
          imageUrls.push(`/catalog-images/${filename}`);
          console.log(`[upload-images-zip] ✓ Imagen ${pageNumber}/${imageEntries.length} guardada en filesystem`);
        } else {
          return sendJsonResponse(500, {
            error: 'MongoDB no está configurado',
            hint: 'Configura MONGODB_URI para usar esta funcionalidad en producción',
          });
        }
      }
    }

    // Actualizar configuración del catálogo
    if (db) {
      await db.collection('catalogs').updateOne(
        { isMain: true },
        {
          $set: {
            imagesUpdatedAt: new Date(),
            numPages: imageEntries.length,
            useImages: true,
            imageUrls: imageUrls,
          },
          $setOnInsert: { isMain: true }
        },
        { upsert: true }
      );
    }

    return sendJsonResponse(200, {
      ok: true,
      message: `✓ ${imageEntries.length} imágenes cargadas exitosamente`,
      numPages: imageEntries.length,
      imageUrls: imageUrls,
      storedIn: db ? 'mongo' : 'filesystem',
    });

  } catch (error) {
    console.error('[upload-images-zip] Error crítico:', error);
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el ZIP: ${error.message}`,
      details: error.message,
    });
  }
}

