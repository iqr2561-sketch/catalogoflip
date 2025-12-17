import { MongoClient, GridFSBucket } from 'mongodb';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

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
      console.error('[upload-zip-simple] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false, // Sin límite de respuesta
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
    console.log('[upload-zip-simple] Iniciando recepción de ZIP...');
    console.log('[upload-zip-simple] Headers recibidos:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    });

    // Usar formidable para parsear multipart/form-data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      keepExtensions: true,
    });

    let zipFile;
    try {
      const [fields, files] = await form.parse(req);
      console.log('[upload-zip-simple] Form parseado:', {
        fields: Object.keys(fields),
        files: Object.keys(files),
      });
      
      zipFile = Array.isArray(files.zip) ? files.zip[0] : files.zip;
      
      if (!zipFile) {
        console.error('[upload-zip-simple] No se encontró archivo ZIP. Archivos recibidos:', Object.keys(files));
        return sendJsonResponse(400, { 
          error: 'No se proporcionó ningún archivo ZIP',
          hint: 'Asegúrate de que el campo del formulario se llame "zip"',
          receivedFiles: Object.keys(files),
        });
      }
    } catch (parseError) {
      console.error('[upload-zip-simple] Error al parsear formulario:', {
        error: parseError.message,
        name: parseError.name,
        stack: parseError.stack,
      });
      return sendJsonResponse(400, {
        error: 'Error al procesar el formulario',
        details: parseError.message,
        hint: 'Verifica que el archivo sea un ZIP válido y no exceda 100MB',
      });
    }

    console.log(`[upload-zip-simple] Archivo recibido:`, {
      originalFilename: zipFile.originalFilename,
      newFilename: zipFile.newFilename,
      filepath: zipFile.filepath,
      size: zipFile.size,
      mimetype: zipFile.mimetype,
    });

    // Leer el archivo
    let zipBuffer;
    try {
      if (!fs.existsSync(zipFile.filepath)) {
        console.error('[upload-zip-simple] El archivo temporal no existe:', zipFile.filepath);
        return sendJsonResponse(500, {
          error: 'El archivo temporal no se pudo encontrar',
          details: `Ruta: ${zipFile.filepath}`,
        });
      }
      
      zipBuffer = fs.readFileSync(zipFile.filepath);
      console.log(`[upload-zip-simple] ZIP leído: ${zipBuffer.length} bytes`);
      
      if (zipBuffer.length === 0) {
        console.error('[upload-zip-simple] El archivo está vacío');
        return sendJsonResponse(400, {
          error: 'El archivo ZIP está vacío',
        });
      }
    } catch (readError) {
      console.error('[upload-zip-simple] Error al leer archivo:', {
        error: readError.message,
        name: readError.name,
        code: readError.code,
        path: zipFile.filepath,
        stack: readError.stack,
      });
      return sendJsonResponse(500, {
        error: 'Error al leer el archivo ZIP',
        details: readError.message,
        code: readError.code,
      });
    }

    // Validar que sea un ZIP
    if (zipBuffer.length < 4) {
      return sendJsonResponse(400, { 
        error: 'El archivo está vacío o es inválido',
      });
    }

    const zipHeader = zipBuffer.slice(0, 2).toString('hex');
    if (zipHeader !== '504b') {
      return sendJsonResponse(400, { 
        error: 'El archivo no es un ZIP válido',
        receivedHeader: zipHeader,
      });
    }

    // Extraer ZIP
    let zip;
    try {
      console.log('[upload-zip-simple] Extrayendo ZIP...');
      zip = new AdmZip(zipBuffer);
    } catch (zipError) {
      console.error('[upload-zip-simple] Error al leer ZIP:', zipError);
      return sendJsonResponse(400, {
        error: 'Error al leer el archivo ZIP',
        details: zipError.message,
      });
    }

    const zipEntries = zip.getEntries();
    console.log(`[upload-zip-simple] ZIP contiene ${zipEntries.length} archivos`);

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

    console.log(`[upload-zip-simple] Encontradas ${imageEntries.length} imágenes JPG`);

    // Ordenar por nombre
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
        console.log(`[upload-zip-simple] Eliminando ${existingImages.length} imágenes antiguas...`);
        for (const file of existingImages) {
          await imagesBucket.delete(file._id);
        }
        console.log('[upload-zip-simple] Imágenes antiguas eliminadas');
      } catch (deleteError) {
        console.warn('[upload-zip-simple] Error al eliminar imágenes antiguas:', deleteError);
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
        console.log(`[upload-zip-simple] ✓ Imagen ${pageNumber}/${imageEntries.length} guardada en MongoDB`);
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
          console.log(`[upload-zip-simple] ✓ Imagen ${pageNumber}/${imageEntries.length} guardada en filesystem`);
        } else {
          // Limpiar archivo temporal
          try {
            fs.unlinkSync(zipFile.filepath);
          } catch (unlinkError) {
            console.warn('[upload-zip-simple] No se pudo eliminar archivo temporal:', unlinkError);
          }
          return sendJsonResponse(500, {
            error: 'MongoDB no está configurado',
            hint: 'Configura MONGODB_URI para usar esta funcionalidad en producción',
          });
        }
      }
    }

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(zipFile.filepath);
    } catch (unlinkError) {
      console.warn('[upload-zip-simple] No se pudo eliminar archivo temporal:', unlinkError);
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
    console.error('[upload-zip-simple] Error crítico:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      path: error.path,
      timestamp: new Date().toISOString(),
    });
    
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el ZIP: ${error.message}`,
      details: error.message,
      errorType: error.name,
      code: error.code,
      hint: 'Verifica los logs del servidor para más detalles. Si el problema persiste, verifica la conexión a MongoDB o el tamaño del archivo.',
    });
  }
}

