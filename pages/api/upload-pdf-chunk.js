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
      console.error('[upload-pdf-chunk] Error al crear cliente MongoDB:', err);
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
    
    // Parsear JSON con mejor manejo de errores
    let data;
    try {
      const jsonString = buffer.toString('utf8');
      data = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[upload-pdf-chunk] Error al parsear JSON:', {
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
    
    console.log(`[upload-pdf-chunk] Recibiendo chunk ${chunkIndex + 1}/${totalChunks} de ${filename} (${chunkData.length} chars)`);
    console.log(`[upload-pdf-chunk] MongoDB URI configurada: ${mongoUri ? 'Sí' : 'No'}`);
    console.log(`[upload-pdf-chunk] Entorno serverless: ${process.env.VERCEL ? 'Vercel' : process.env.AWS_LAMBDA_FUNCTION_NAME ? 'AWS Lambda' : 'No'}`);
    
    const useMongo = Boolean(mongoUri);
    let mongoClient = null;
    let db = null;
    
    if (useMongo) {
      try {
        console.log('[upload-pdf-chunk] Intentando conectar a MongoDB...');
        const clientPromise = getMongoClient();
        if (clientPromise) {
          mongoClient = await clientPromise;
          db = mongoClient.db();
          console.log('[upload-pdf-chunk] ✓ Conexión a MongoDB exitosa');
        } else {
          console.warn('[upload-pdf-chunk] getMongoClient() retornó null');
        }
      } catch (mongoError) {
        console.error('[upload-pdf-chunk] Error al conectar a MongoDB:', {
          error: mongoError.message,
          name: mongoError.name,
          stack: mongoError.stack,
        });
        // Continuar con fallback a filesystem si MongoDB falla
      }
    } else {
      console.warn('[upload-pdf-chunk] MongoDB no configurado, usando fallback a filesystem');
    }

    // Ruta de almacenamiento temporal local cuando no hay Mongo
    // En entornos serverless (Vercel, Lambda), usar /tmp que es el único directorio escribible
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const tmpDir = isServerless 
      ? path.join('/tmp', 'pdf-chunks')
      : path.join(process.cwd(), '.tmp', 'pdf-chunks');
    
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (mkdirError) {
      console.error('[upload-pdf-chunk] Error al crear directorio temporal:', {
        error: mkdirError.message,
        path: tmpDir,
        isServerless,
      });
      // Si no podemos crear el directorio y no hay MongoDB, devolver error
      if (!useMongo || !db) {
        return sendJsonResponse(500, {
          error: 'No se pudo crear el directorio temporal y MongoDB no está disponible',
          details: mkdirError.message,
          hint: 'Configura MONGODB_URI o verifica los permisos del sistema de archivos',
        });
      }
      // Si hay MongoDB, continuar sin filesystem fallback
    }

    if (useMongo && db) {
      try {
        // Guardar el chunk en colección temporal
        const chunksCollection = db.collection('pdf_upload_chunks');
        console.log(`[upload-pdf-chunk] Guardando chunk ${chunkIndex + 1}/${totalChunks} en MongoDB...`);
        
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

        console.log(`[upload-pdf-chunk] ✓ Chunk ${chunkIndex + 1}/${totalChunks} guardado en MongoDB`);
      } catch (mongoWriteError) {
        console.error('[upload-pdf-chunk] Error al escribir chunk en MongoDB:', {
          error: mongoWriteError.message,
          name: mongoWriteError.name,
          code: mongoWriteError.code,
        });
        throw mongoWriteError;
      }      

      if (chunkIndex === totalChunks - 1) {
        console.log(`[upload-pdf-chunk] Último chunk recibido, ensamblando archivo...`);
        const allChunks = await chunksCollection
          .find({ sessionId })
          .sort({ chunkIndex: 1 })
          .toArray();

        if (allChunks.length !== totalChunks) {
          return sendJsonResponse(400, {
            error: `Faltan chunks. Recibidos: ${allChunks.length}, Esperados: ${totalChunks}`,
          });
        }

        const buffers = allChunks.map((c) => Buffer.from(c.chunkData, 'base64'));
        const pdfBuffer = Buffer.concat(buffers);

        if (pdfBuffer.length === 0) {
          await chunksCollection.deleteMany({ sessionId });
          return sendJsonResponse(400, { error: 'El buffer del PDF está vacío después del ensamblaje' });
        }

        const header = pdfBuffer.slice(0, 4).toString();
        if (header !== '%PDF') {
          await chunksCollection.deleteMany({ sessionId });
          return sendJsonResponse(400, {
            error: 'El archivo no es un PDF válido',
            receivedHeader: header,
          });
        }

        console.log('[upload-pdf-chunk] Subiendo PDF a GridFS...');
        const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
        const { Readable } = require('stream');
        
        // Eliminar PDF anterior si existe
        try {
          const existingFiles = await bucket.find({ filename: 'catalogo.pdf' }).toArray();
          if (existingFiles.length > 0) {
            console.log('[upload-pdf-chunk] Eliminando PDF anterior...');
            await bucket.delete(existingFiles[0]._id);
          }
        } catch (deleteError) {
          console.warn('[upload-pdf-chunk] No se pudo eliminar PDF anterior (puede no existir):', deleteError.message);
        }
        
        const uploadStream = bucket.openUploadStream('catalogo.pdf', {
          contentType: 'application/pdf',
        });

        const readable = new Readable();
        readable.push(pdfBuffer);
        readable.push(null);
        readable.pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => {
            console.log('[upload-pdf-chunk] ✓ PDF subido a GridFS exitosamente');
            resolve();
          });
          uploadStream.on('error', (err) => {
            console.error('[upload-pdf-chunk] Error al subir a GridFS:', err);
            reject(err);
          });
        });

        await chunksCollection.deleteMany({ sessionId });

        await db.collection('catalogs').updateOne(
          { isMain: true },
          {
            $set: {
              pdfUpdatedAt: new Date(),
              pdfSize: pdfBuffer.length,
              imagesGenerated: false,
              numPages: null,
            },
            $setOnInsert: { isMain: true }
          },
          { upsert: true }
        );

        return sendJsonResponse(200, {
          ok: true,
          message: 'PDF cargado exitosamente. Genera las imágenes desde el panel.',
          filename: 'catalogo.pdf',
          size: pdfBuffer.length,
          totalChunks,
          assembled: true,
          storedIn: 'mongo',
        });
      }

      return sendJsonResponse(200, {
        ok: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
        chunkIndex,
        totalChunks,
      });
    }

    // Fallback sin Mongo: guardar chunks en filesystem temporal
    // Solo usar filesystem si el directorio existe y es escribible
    if (!fs.existsSync(tmpDir)) {
      return sendJsonResponse(500, {
        error: 'No se puede usar el sistema de archivos como fallback',
        details: 'El directorio temporal no existe y MongoDB no está disponible',
        hint: 'Configura MONGODB_URI para habilitar la subida de PDFs',
      });
    }
    
    try {
      const partPath = path.join(tmpDir, `${sessionId}-${chunkIndex}.part`);
      fs.writeFileSync(partPath, chunkData, 'utf8');
      console.log(`[upload-pdf-chunk] Chunk ${chunkIndex + 1}/${totalChunks} guardado en filesystem`);
    } catch (writeError) {
      console.error('[upload-pdf-chunk] Error al escribir chunk en filesystem:', writeError);
      return sendJsonResponse(500, {
        error: 'Error al guardar el chunk en el sistema de archivos',
        details: writeError.message,
        hint: 'Configura MONGODB_URI para usar almacenamiento en base de datos',
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
          console.error(`[upload-pdf-chunk] Error al leer chunk ${i + 1}:`, readError);
          return sendJsonResponse(500, { 
            error: `Error al leer el chunk ${i + 1}/${totalChunks}`,
            details: readError.message,
          });
        }
      }
      const pdfBuffer = Buffer.concat(buffers);

      if (pdfBuffer.length === 0) {
        return sendJsonResponse(400, { error: 'El buffer del PDF está vacío después del ensamblaje' });
      }

      const header = pdfBuffer.slice(0, 4).toString();
      if (header !== '%PDF') {
        return sendJsonResponse(400, { error: 'El archivo no es un PDF válido', receivedHeader: header });
      }

      // En entornos serverless, no podemos escribir en process.cwd()
      // Guardar en /tmp o devolver error si no es posible
      const targetPath = isServerless 
        ? path.join('/tmp', 'catalogo.pdf')
        : path.join(process.cwd(), 'catalogo.pdf');
      
      try {
        fs.writeFileSync(targetPath, pdfBuffer);
        console.log(`[upload-pdf-chunk] PDF guardado en: ${targetPath}`);
      } catch (writeError) {
        console.error('[upload-pdf-chunk] Error al guardar PDF final:', writeError);
        return sendJsonResponse(500, {
          error: 'Error al guardar el PDF final',
          details: writeError.message,
          hint: 'En entornos serverless, se requiere MongoDB para almacenar PDFs',
        });
      }

      // Limpiar partes
      for (let i = 0; i < totalChunks; i++) {
        const p = path.join(tmpDir, `${sessionId}-${i}.part`);
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (unlinkError) {
          console.warn(`[upload-pdf-chunk] No se pudo eliminar chunk ${i + 1}:`, unlinkError);
        }
      }

      return sendJsonResponse(200, {
        ok: true,
        message: 'PDF cargado en filesystem. Genera las imágenes desde el panel.',
        filename: 'catalogo.pdf',
        size: pdfBuffer.length,
        totalChunks,
        assembled: true,
        storedIn: 'filesystem',
      });
    }

    return sendJsonResponse(200, {
      ok: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
      chunkIndex,
      totalChunks,
      storedIn: 'filesystem',
    });
    
  } catch (error) {
    const errorDetails = {
      message: error.message || 'Error desconocido',
      name: error.name || 'Error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    
    console.error('[upload-pdf-chunk] Error crítico:', errorDetails);
    
    // Intentar limpiar chunks en caso de error
    try {
      if (mongoUri) {
        const clientPromise = getMongoClient();
        if (clientPromise) {
          const mongoClient = await clientPromise;
          const db = mongoClient.db();
          const chunksCollection = db.collection('pdf_upload_chunks');
          const deletedCount = await chunksCollection.deleteMany({ 
            uploadedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
          });
          console.log(`[upload-pdf-chunk] Limpieza: ${deletedCount.deletedCount} chunks antiguos eliminados`);
        }
      }
    } catch (cleanupError) {
      console.error('[upload-pdf-chunk] Error al limpiar chunks:', cleanupError);
    }
    
    // Mensaje de error más descriptivo
    const errorMessage = error.message || error.toString() || 'Error desconocido al procesar el chunk';
    
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${errorMessage}`,
      errorType: error.name || 'Error',
      details: error.message || error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Verifica los logs del servidor para más detalles. Si el problema persiste, verifica la conexión a MongoDB o el tamaño del archivo.',
    });
  }
}

