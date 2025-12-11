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
      
      // Obtener todos los chunks
      const allChunks = await chunksCollection
        .find({ sessionId })
        .sort({ chunkIndex: 1 })
        .toArray();
      
      if (allChunks.length !== totalChunks) {
        return sendJsonResponse(400, {
          error: `Faltan chunks. Recibidos: ${allChunks.length}, Esperados: ${totalChunks}`,
        });
      }
      
      // Ensamblar el archivo
      console.log(`[upload-pdf-chunk] Ensamblando ${allChunks.length} chunks...`);
      const base64Data = allChunks.map(c => c.chunkData).join('');
      console.log(`[upload-pdf-chunk] Base64 data length: ${base64Data.length}`);
      
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      console.log(`[upload-pdf-chunk] Archivo ensamblado: ${pdfBuffer.length} bytes`);
      
      // Validar que sea un PDF válido
      const header = pdfBuffer.slice(0, 4).toString();
      console.log(`[upload-pdf-chunk] Header del PDF: ${header}`);
      
      if (header !== '%PDF') {
        // Limpiar chunks
        await chunksCollection.deleteMany({ sessionId });
        return sendJsonResponse(400, {
          error: 'El archivo no es un PDF válido',
          receivedHeader: header,
        });
      }
      
      // Guardar en GridFS
      const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
      
      // Eliminar PDF anterior
      try {
        const existingFiles = await bucket.find({ filename: 'catalogo.pdf' }).toArray();
        for (const file of existingFiles) {
          await bucket.delete(file._id);
        }
      } catch (e) {
        console.warn('[upload-pdf-chunk] No se pudo eliminar PDF anterior:', e);
      }
      
      // Subir nuevo PDF
      const { Readable } = await import('stream');
      const uploadStream = bucket.openUploadStream('catalogo.pdf', {
        contentType: 'application/pdf',
      });
      
      const readable = Readable.from([pdfBuffer]);
      readable.pipe(uploadStream);
      
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error', reject);
      });
      
      console.log(`[upload-pdf-chunk] PDF guardado en GridFS`);
      
      // Limpiar chunks temporales
      await chunksCollection.deleteMany({ sessionId });
      console.log(`[upload-pdf-chunk] Chunks temporales eliminados`);
      
      // Actualizar configuración
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
      
      return sendJsonResponse(200, {
        ok: true,
        message: 'PDF cargado exitosamente',
        filename: 'catalogo.pdf',
        size: pdfBuffer.length,
        totalChunks,
        assembled: true,
      });
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
    });
    return sendJsonResponse(500, {
      ok: false,
      error: 'Error al procesar el chunk',
      details: error.message,
    });
  }
}

