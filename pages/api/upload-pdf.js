import { MongoClient, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

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

// Función para parsear multipart/form-data
function parseMultipartFormData(buffer, boundary) {
  const parts = [];
  const partsArray = buffer.split(`--${boundary}`);
  
  for (let i = 1; i < partsArray.length - 1; i++) {
    const part = partsArray[i];
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const headers = part.substring(0, headerEnd);
    const body = part.substring(headerEnd + 4);
    // Remover el \r\n final
    const cleanBody = body.replace(/\r\n$/, '');
    
    const contentDisposition = headers.match(/Content-Disposition:.*name="([^"]+)"/);
    const contentType = headers.match(/Content-Type:\s*([^\r\n]+)/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (contentDisposition) {
      parts.push({
        name: contentDisposition[1],
        data: Buffer.from(cleanBody, 'binary'),
        contentType: contentType ? contentType[1].trim() : 'application/octet-stream',
        filename: filenameMatch ? filenameMatch[1] : null,
      });
    }
  }
  
  return parts;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Leer el body completo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Obtener el boundary del Content-Type
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No se pudo parsear el formulario multipart.' });
    }
    
    const boundary = boundaryMatch[1];
    const parts = parseMultipartFormData(buffer.toString('binary'), boundary);
    
    const pdfPart = parts.find(p => p.name === 'pdf');
    
    if (!pdfPart) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo PDF.' });
    }
    
    // Verificar que sea PDF
    const isPdf = pdfPart.contentType.includes('pdf') || 
                  pdfPart.data.slice(0, 4).toString() === '%PDF';
    
    if (!isPdf) {
      return res.status(400).json({ error: 'El archivo debe ser un PDF.' });
    }
    
    // Guardar en MongoDB GridFS
    if (mongoUri) {
      try {
        const clientPromise = getMongoClient();
        if (clientPromise) {
          const client = await clientPromise;
          const db = client.db();
          const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
          
          // Eliminar el PDF anterior si existe
          try {
            const existingFiles = await bucket.find({ filename: 'catalogo.pdf' }).toArray();
            for (const file of existingFiles) {
              await bucket.delete(file._id);
            }
          } catch (e) {
            console.warn('No se pudo eliminar PDF anterior:', e);
          }
          
          // Subir el nuevo PDF
          const uploadStream = bucket.openUploadStream('catalogo.pdf', {
            contentType: 'application/pdf',
          });
          
          const readable = Readable.from([pdfPart.data]);
          readable.pipe(uploadStream);
          
          await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
          });
          
          return res.status(200).json({
            ok: true,
            message: 'PDF cargado exitosamente en MongoDB',
            filename: 'catalogo.pdf',
            size: pdfPart.data.length,
            storedIn: 'MongoDB GridFS',
          });
        }
      } catch (mongoError) {
        console.error('Error al guardar en MongoDB:', mongoError);
        // Continuar con fallback a sistema de archivos
      }
    }
    
    // Fallback: guardar en sistema de archivos (solo funciona en local, no en Vercel)
    const fs = await import('fs');
    const path = await import('path');
    
    const targetPath = path.join(process.cwd(), 'catalogo.pdf');
    
    try {
      // Backup del PDF anterior
      if (fs.existsSync(targetPath)) {
        const backupPath = path.join(process.cwd(), `catalogo.backup.${Date.now()}.pdf`);
        fs.copyFileSync(targetPath, backupPath);
      }
      
      // Guardar nuevo PDF
      fs.writeFileSync(targetPath, pdfPart.data);
      
      return res.status(200).json({
        ok: true,
        message: 'PDF cargado exitosamente',
        filename: 'catalogo.pdf',
        size: pdfPart.data.length,
        storedIn: 'filesystem',
      });
    } catch (fsError) {
      console.error('Error al guardar en filesystem:', fsError);
      return res.status(500).json({
        error: 'No se pudo guardar el PDF. MongoDB no disponible y filesystem no accesible.',
        hint: 'Configura MONGODB_URI para guardar en MongoDB GridFS',
        details: fsError.message,
      });
    }
  } catch (error) {
    console.error('Error al subir PDF:', error);
    return res.status(500).json({
      error: 'Error al subir el archivo PDF.',
      details: error.message,
    });
  }
}
