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
      console.error('[upload-zip-chunk] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
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
    // Leer el body completo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      return sendJsonResponse(400, { error: 'No se recibió ningún dato.' });
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Parsear JSON
    let data;
    try {
      const jsonString = buffer.toString('utf8');
      data = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[upload-zip-chunk] Error al parsear JSON:', {
        error: parseError.message,
        bufferLength: buffer.length,
        preview: buffer.toString('utf8').substring(0, 200),
      });
      return sendJsonResponse(400, { 
        error: 'Error al parsear los datos JSON',
        details: parseError.message,
      });
    }
    
    const { chunkIndex, totalChunks, chunkData, filename, sessionId } = data;
    
    // Validar datos requeridos
    if (chunkIndex === undefined || totalChunks === undefined || !chunkData || !filename || !sessionId) {
      return sendJsonResponse(400, {
        error: 'Datos incompletos',
        received: { chunkIndex, totalChunks, hasChunkData: !!chunkData, filename, sessionId },
      });
    }

    console.log(`[upload-zip-chunk] Recibiendo chunk ${chunkIndex + 1}/${totalChunks} de ${filename} (${chunkData.length} chars)`);

    const useMongo = Boolean(mongoUri);
    let mongoClient = null;
    let db = null;
    
    if (useMongo) {
      try {
        console.log('[upload-zip-chunk] Intentando conectar a MongoDB...');
        const clientPromise = getMongoClient();
        if (clientPromise) {
          mongoClient = await clientPromise;
          db = mongoClient.db();
          console.log('[upload-zip-chunk] ✓ Conexión a MongoDB exitosa');
        }
      } catch (mongoError) {
        console.error('[upload-zip-chunk] Error al conectar a MongoDB:', mongoError);
      }
    }

    // Ruta de almacenamiento temporal
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const tmpDir = isServerless 
      ? path.join('/tmp', 'zip-chunks')
      : path.join(process.cwd(), '.tmp', 'zip-chunks');
    
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (mkdirError) {
      console.error('[upload-zip-chunk] Error al crear directorio temporal:', mkdirError);
      if (!useMongo || !db) {
        return sendJsonResponse(500, {
          error: 'No se pudo crear el directorio temporal y MongoDB no está disponible',
          details: mkdirError.message,
        });
      }
    }

    if (useMongo && db) {
      const chunksCollection = db.collection('zip_upload_chunks');
      
      try {
        // Guardar el chunk en colección temporal
        await chunksCollection.updateOne(
          { sessionId, chunkIndex },
          {
            $set: {
              sessionId,
              chunkIndex,
              totalChunks,
              chunkData,
              filename,
              uploadedAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log(`[upload-zip-chunk] ✓ Chunk ${chunkIndex + 1}/${totalChunks} guardado en MongoDB`);
      } catch (mongoWriteError) {
        console.error('[upload-zip-chunk] Error al escribir chunk en MongoDB:', mongoWriteError);
        throw mongoWriteError;
      }      

      if (chunkIndex === totalChunks - 1) {
        console.log(`[upload-zip-chunk] Último chunk recibido, ensamblando ZIP...`);
        
        try {
          // Usar find sin sort para evitar problemas de memoria, ordenar en memoria
          const allChunks = await chunksCollection
            .find({ sessionId })
            .toArray();
          
          // Ordenar en memoria en lugar de en MongoDB
          allChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

          if (allChunks.length !== totalChunks) {
            return sendJsonResponse(400, {
              error: `Faltan chunks. Recibidos: ${allChunks.length}, Esperados: ${totalChunks}`,
            });
          }

          const buffers = allChunks.map((c) => Buffer.from(c.chunkData, 'base64'));
          const zipBuffer = Buffer.concat(buffers);

          if (zipBuffer.length === 0) {
            await chunksCollection.deleteMany({ sessionId });
            return sendJsonResponse(400, { error: 'El buffer del ZIP está vacío después del ensamblaje' });
          }

          const zipHeader = zipBuffer.slice(0, 2).toString('hex');
          if (zipHeader !== '504b') {
            await chunksCollection.deleteMany({ sessionId });
            return sendJsonResponse(400, {
              error: 'El archivo no es un ZIP válido',
              receivedHeader: zipHeader,
            });
          }

          // Procesar ZIP
          let zip;
          try {
            zip = new AdmZip(zipBuffer);
          } catch (zipError) {
            await chunksCollection.deleteMany({ sessionId });
            return sendJsonResponse(400, {
              error: 'Error al leer el archivo ZIP',
              details: zipError.message,
            });
          }

          const zipEntries = zip.getEntries();
          const imageEntries = zipEntries.filter(entry => {
            const name = entry.entryName.toLowerCase();
            return !entry.isDirectory && (name.endsWith('.jpg') || name.endsWith('.jpeg'));
          });

          if (imageEntries.length === 0) {
            await chunksCollection.deleteMany({ sessionId });
            return sendJsonResponse(400, {
              error: 'No se encontraron imágenes JPG en el ZIP',
              hint: 'El ZIP debe contener archivos .jpg o .jpeg',
            });
          }

          imageEntries.sort((a, b) => {
            return a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' });
          });

          const imageUrls = [];
          const imagesBucket = new GridFSBucket(db, { bucketName: 'catalog_images' });

          // Eliminar imágenes antiguas
          try {
            const existingImages = await imagesBucket.find({ filename: { $regex: /^catalog_page_/ } }).toArray();
            for (const file of existingImages) {
              await imagesBucket.delete(file._id);
            }
          } catch (deleteError) {
            console.warn('[upload-zip-chunk] Error al eliminar imágenes antiguas:', deleteError);
          }

          // Procesar cada imagen
          for (let i = 0; i < imageEntries.length; i++) {
            const entry = imageEntries[i];
            const imageBuffer = entry.getData();
            const pageNumber = i + 1;
            const imageFilename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;

            const uploadStream = imagesBucket.openUploadStream(imageFilename, {
              contentType: 'image/jpeg',
            });

            await new Promise((resolve, reject) => {
              uploadStream.on('finish', resolve);
              uploadStream.on('error', reject);
              uploadStream.end(imageBuffer);
            });

            imageUrls.push(`/api/catalog-image/${pageNumber}`);
            console.log(`[upload-zip-chunk] ✓ Imagen ${pageNumber}/${imageEntries.length} guardada`);
          }

          await chunksCollection.deleteMany({ sessionId });

          // Actualizar configuración
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

          return sendJsonResponse(200, {
            ok: true,
            message: `✓ ${imageEntries.length} imágenes cargadas exitosamente`,
            numPages: imageEntries.length,
            imageUrls: imageUrls,
            assembled: true,
            storedIn: 'mongo',
          });
        } catch (assembleError) {
          console.error('[upload-zip-chunk] Error al ensamblar ZIP:', assembleError);
          throw assembleError;
        }
      }

      return sendJsonResponse(200, {
        ok: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
        chunkIndex,
        totalChunks,
      });
    }

    // Fallback sin Mongo: guardar chunks en filesystem temporal
    if (!fs.existsSync(tmpDir)) {
      return sendJsonResponse(500, {
        error: 'No se puede usar el sistema de archivos como fallback',
        details: 'El directorio temporal no existe y MongoDB no está disponible',
        hint: 'Configura MONGODB_URI para habilitar la subida de ZIPs',
      });
    }
  
    try {
      const partPath = path.join(tmpDir, `${sessionId}-${chunkIndex}.part`);
      fs.writeFileSync(partPath, chunkData, 'utf8');
      console.log(`[upload-zip-chunk] Chunk ${chunkIndex + 1}/${totalChunks} guardado en filesystem`);
    } catch (writeError) {
      console.error('[upload-zip-chunk] Error al escribir chunk en filesystem:', writeError);
      return sendJsonResponse(500, {
        error: 'Error al guardar el chunk en el sistema de archivos',
        details: writeError.message,
      });
    }

    if (chunkIndex === totalChunks - 1) {
      // Ensamblar desde disco
      const buffers = [];
      for (let i = 0; i < totalChunks; i++) {
        const p = path.join(tmpDir, `${sessionId}-${i}.part`);
        if (!fs.existsSync(p)) {
          return sendJsonResponse(400, { error: `Falta el chunk ${i + 1}/${totalChunks}` });
        }
        try {
          buffers.push(Buffer.from(fs.readFileSync(p, 'utf8'), 'base64'));
        } catch (readError) {
          console.error(`[upload-zip-chunk] Error al leer chunk ${i + 1}:`, readError);
          return sendJsonResponse(500, { 
            error: `Error al leer el chunk ${i + 1}/${totalChunks}`,
            details: readError.message,
          });
        }
      }
      const zipBuffer = Buffer.concat(buffers);

      if (zipBuffer.length === 0) {
        return sendJsonResponse(400, { error: 'El buffer del ZIP está vacío después del ensamblaje' });
      }

      const zipHeader = zipBuffer.slice(0, 2).toString('hex');
      if (zipHeader !== '504b') {
        return sendJsonResponse(400, { error: 'El archivo no es un ZIP válido', receivedHeader: zipHeader });
      }

      // Procesar ZIP
      let zip;
      try {
        zip = new AdmZip(zipBuffer);
      } catch (zipError) {
        return sendJsonResponse(400, {
          error: 'Error al leer el archivo ZIP',
          details: zipError.message,
        });
      }

      const zipEntries = zip.getEntries();
      const imageEntries = zipEntries.filter(entry => {
        const name = entry.entryName.toLowerCase();
        return !entry.isDirectory && (name.endsWith('.jpg') || name.endsWith('.jpeg'));
      });

      if (imageEntries.length === 0) {
        return sendJsonResponse(400, {
          error: 'No se encontraron imágenes JPG en el ZIP',
        });
      }

      imageEntries.sort((a, b) => {
        return a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' });
      });

      // Guardar en filesystem (solo desarrollo)
      if (!isServerless) {
        const imagesDir = path.join(process.cwd(), 'public', 'catalog-images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        const imageUrls = [];
        for (let i = 0; i < imageEntries.length; i++) {
          const entry = imageEntries[i];
          const imageBuffer = entry.getData();
          const pageNumber = i + 1;
          const filename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;
          const imagePath = path.join(imagesDir, filename);
          fs.writeFileSync(imagePath, imageBuffer);
          imageUrls.push(`/catalog-images/${filename}`);
        }

        // Limpiar partes
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tmpDir, `${sessionId}-${i}.part`);
          try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch (unlinkError) {
            console.warn(`[upload-zip-chunk] No se pudo eliminar chunk ${i + 1}:`, unlinkError);
          }
        }

        return sendJsonResponse(200, {
          ok: true,
          message: `✓ ${imageEntries.length} imágenes cargadas exitosamente`,
          numPages: imageEntries.length,
          imageUrls: imageUrls,
          assembled: true,
          storedIn: 'filesystem',
        });
      } else {
        return sendJsonResponse(500, {
          error: 'MongoDB no está configurado',
          hint: 'Configura MONGODB_URI para usar esta funcionalidad en producción',
        });
      }
    }

    return sendJsonResponse(200, {
      ok: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
      chunkIndex,
      totalChunks,
      storedIn: 'filesystem',
    });
    
  } catch (error) {
    console.error('[upload-zip-chunk] Error crítico:', error);
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${error.message}`,
      details: error.message,
    });
  }
}

