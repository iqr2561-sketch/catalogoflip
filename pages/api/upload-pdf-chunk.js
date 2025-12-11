import { MongoClient, GridFSBucket } from 'mongodb';

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
    responseLimit: '4mb',
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
    const data = JSON.parse(buffer.toString());
    
    const { chunkIndex, totalChunks, chunkData, filename, sessionId } = data;
    
    console.log(`[upload-pdf-chunk] Recibiendo chunk ${chunkIndex + 1}/${totalChunks} de ${filename} (${chunkData.length} chars)`);
    
    if (!mongoUri) {
      return sendJsonResponse(500, {
        error: 'MongoDB no está configurado',
        hint: 'Configura MONGODB_URI en las variables de entorno',
      });
    }

    const clientPromise = getMongoClient();
    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    
    // Guardar el chunk en una colección temporal
    const chunksCollection = db.collection('pdf_upload_chunks');
    
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
    
    console.log(`[upload-pdf-chunk] Chunk ${chunkIndex + 1}/${totalChunks} guardado`);
    
    // Si es el último chunk, ensamblar el archivo completo
    if (chunkIndex === totalChunks - 1) {
      console.log(`[upload-pdf-chunk] Último chunk recibido, ensamblando archivo...`);
      console.log(`[upload-pdf-chunk] SessionId: ${sessionId}, TotalChunks: ${totalChunks}`);
      
      // Obtener todos los chunks
      console.log(`[upload-pdf-chunk] Buscando chunks en MongoDB...`);
      const allChunks = await chunksCollection
        .find({ sessionId })
        .sort({ chunkIndex: 1 })
        .toArray();
      
      console.log(`[upload-pdf-chunk] Chunks encontrados: ${allChunks.length}`);
      
      if (allChunks.length !== totalChunks) {
        return sendJsonResponse(400, {
          error: `Faltan chunks. Recibidos: ${allChunks.length}, Esperados: ${totalChunks}`,
        });
      }
      
      // Ensamblar el archivo
      console.log(`[upload-pdf-chunk] Ensamblando ${allChunks.length} chunks...`);
      
      try {
        const base64Data = allChunks.map(c => c.chunkData).join('');
        console.log(`[upload-pdf-chunk] Base64 data length: ${base64Data.length} chars`);
        
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        console.log(`[upload-pdf-chunk] PDF Buffer creado: ${pdfBuffer.length} bytes`);
        
        if (pdfBuffer.length === 0) {
          throw new Error('El buffer del PDF está vacío después del ensamblaje');
        }
      
        // Validar que sea un PDF válido
        const header = pdfBuffer.slice(0, 4).toString();
        console.log(`[upload-pdf-chunk] Header del PDF: "${header}"`);
        
        if (header !== '%PDF') {
          // Limpiar chunks
          await chunksCollection.deleteMany({ sessionId });
          return sendJsonResponse(400, {
            error: 'El archivo no es un PDF válido',
            receivedHeader: header,
          });
        }
        
        console.log(`[upload-pdf-chunk] PDF válido, guardando en GridFS...`);
        
        // Guardar en GridFS
        const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
      
        // Eliminar PDF anterior
        try {
          console.log(`[upload-pdf-chunk] Buscando PDFs anteriores...`);
          const existingFiles = await bucket.find({ filename: 'catalogo.pdf' }).toArray();
          console.log(`[upload-pdf-chunk] PDFs anteriores encontrados: ${existingFiles.length}`);
          for (const file of existingFiles) {
            await bucket.delete(file._id);
            console.log(`[upload-pdf-chunk] PDF anterior eliminado: ${file._id}`);
          }
        } catch (e) {
          console.warn('[upload-pdf-chunk] No se pudo eliminar PDF anterior:', e.message);
        }
        
        // Subir nuevo PDF
        console.log(`[upload-pdf-chunk] Subiendo PDF a GridFS...`);
        const { Readable } = require('stream');
        const uploadStream = bucket.openUploadStream('catalogo.pdf', {
          contentType: 'application/pdf',
        });
        
        // Crear stream readable desde el buffer
        const readable = new Readable();
        readable.push(pdfBuffer);
        readable.push(null); // EOF
        readable.pipe(uploadStream);
        
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => {
            console.log(`[upload-pdf-chunk] Upload stream finished`);
            resolve();
          });
          uploadStream.on('error', (err) => {
            console.error(`[upload-pdf-chunk] Upload stream error:`, err);
            reject(err);
          });
        });
        
        console.log(`[upload-pdf-chunk] ✓ PDF guardado en GridFS exitosamente`);
        
        // Limpiar chunks temporales
        console.log(`[upload-pdf-chunk] Limpiando chunks temporales...`);
        const deleteResult = await chunksCollection.deleteMany({ sessionId });
        console.log(`[upload-pdf-chunk] ${deleteResult.deletedCount} chunks eliminados`);
        
        // Actualizar configuración
        console.log(`[upload-pdf-chunk] Actualizando configuración del catálogo...`);
        await db.collection('catalogs').updateOne(
          { isMain: true },
          {
            $set: {
              pdfUpdatedAt: new Date(),
              pdfSize: pdfBuffer.length,
            },
            $setOnInsert: { isMain: true }
          },
          { upsert: true }
        );
        
        console.log(`[upload-pdf-chunk] ✓ Proceso completado exitosamente`);
        
        return sendJsonResponse(200, {
          ok: true,
          message: 'PDF cargado exitosamente. Genera las imágenes desde el panel.',
          filename: 'catalogo.pdf',
          size: pdfBuffer.length,
          totalChunks,
          assembled: true,
        });
        
      } catch (assemblyError) {
        console.error('[upload-pdf-chunk] Error durante el ensamblaje:', {
          message: assemblyError.message,
          name: assemblyError.name,
          stack: assemblyError.stack,
        });
        
        // Limpiar chunks en caso de error
        try {
          await chunksCollection.deleteMany({ sessionId });
        } catch (cleanError) {
          console.error('[upload-pdf-chunk] Error al limpiar chunks:', cleanError);
        }
        
        throw assemblyError;
      }
    }
    
    // No es el último chunk, simplemente confirmar recepción
    return sendJsonResponse(200, {
      ok: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
      chunkIndex,
      totalChunks,
    });
    
  } catch (error) {
    console.error('[upload-pdf-chunk] Error crítico:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Intentar limpiar chunks en caso de error
    try {
      if (mongoUri) {
        const clientPromise = getMongoClient();
        const mongoClient = await clientPromise;
        const db = mongoClient.db();
        const chunksCollection = db.collection('pdf_upload_chunks');
        const deletedCount = await chunksCollection.deleteMany({ 
          uploadedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
        });
        console.log(`[upload-pdf-chunk] Limpieza: ${deletedCount.deletedCount} chunks antiguos eliminados`);
      }
    } catch (cleanupError) {
      console.error('[upload-pdf-chunk] Error al limpiar chunks:', cleanupError);
    }
    
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al procesar el chunk: ${error.name}`,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Verifica los logs del servidor para más detalles',
    });
  }
}

