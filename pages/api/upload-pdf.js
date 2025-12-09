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

// Función para parsear multipart/form-data de forma más robusta
function parseMultipartFormData(buffer, boundary) {
  const parts = [];
  
  // Convertir buffer a string binario para parsing
  const bufferStr = buffer.toString('binary');
  const boundaryStr = `--${boundary}`;
  const partsArray = bufferStr.split(boundaryStr);
  
  for (let i = 1; i < partsArray.length - 1; i++) {
    const part = partsArray[i].trim();
    if (!part) continue;
    
    // Buscar el separador de headers y body
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      // Intentar con solo \n\n
      const altHeaderEnd = part.indexOf('\n\n');
      if (altHeaderEnd === -1) continue;
      
      const headers = part.substring(0, altHeaderEnd);
      const body = part.substring(altHeaderEnd + 2);
      
      const contentDisposition = headers.match(/Content-Disposition:.*name=["']([^"']+)["']/);
      const contentType = headers.match(/Content-Type:\s*([^\r\n]+)/);
      const filenameMatch = headers.match(/filename=["']([^"']+)["']/);
      
      if (contentDisposition) {
        // Convertir body a buffer correctamente
        const bodyBuffer = Buffer.from(body.replace(/\r\n$/, ''), 'binary');
        parts.push({
          name: contentDisposition[1],
          data: bodyBuffer,
          contentType: contentType ? contentType[1].trim() : 'application/octet-stream',
          filename: filenameMatch ? filenameMatch[1] : null,
        });
      }
      continue;
    }
    
    const headers = part.substring(0, headerEnd);
    const body = part.substring(headerEnd + 4);
    
    // Remover el \r\n final si existe
    const cleanBody = body.replace(/\r\n$/, '').replace(/\n$/, '');
    
    const contentDisposition = headers.match(/Content-Disposition:.*name=["']([^"']+)["']/);
    const contentType = headers.match(/Content-Type:\s*([^\r\n]+)/);
    const filenameMatch = headers.match(/filename=["']([^"']+)["']/);
    
    if (contentDisposition) {
      // Convertir body a buffer correctamente
      const bodyBuffer = Buffer.from(cleanBody, 'binary');
      parts.push({
        name: contentDisposition[1],
        data: bodyBuffer,
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
    // Verificar Content-Type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type debe ser multipart/form-data.' });
    }
    
    // Leer el body completo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No se recibió ningún dato.' });
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Obtener el boundary del Content-Type
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No se pudo encontrar el boundary en Content-Type.' });
    }
    
    const boundary = boundaryMatch[1].trim();
    const parts = parseMultipartFormData(buffer, boundary);
    
    if (parts.length === 0) {
      return res.status(400).json({ error: 'No se pudo parsear ningún campo del formulario.' });
    }
    
    const pdfPart = parts.find(p => p.name === 'pdf');
    
    if (!pdfPart) {
      return res.status(400).json({ 
        error: 'No se proporcionó ningún archivo PDF.',
        receivedFields: parts.map(p => p.name),
      });
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
          
          // Generar imágenes automáticamente en el servidor
          try {
            console.log('Generando imágenes del PDF en el servidor...');
            const images = await pdfToImagesServer(pdfPart.data, 2.0);
            
            // Guardar imágenes en GridFS
            const imagesBucket = new GridFSBucket(db, { bucketName: 'pdf_images' });
            
            // Eliminar imágenes antiguas
            try {
              const existingImages = await imagesBucket.find({ filename: { $regex: /^catalogo_page_/ } }).toArray();
              for (const file of existingImages) {
                await imagesBucket.delete(file._id);
              }
            } catch (e) {
              console.warn('No se pudieron eliminar imágenes antiguas:', e);
            }
            
            // Guardar nuevas imágenes
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
            
            // Actualizar configuración con número de páginas e imágenes generadas
            await db.collection('catalogs').updateOne(
              { isMain: true },
              { 
                $set: { 
                  imagesGenerated: true,
                  imagesGeneratedAt: new Date(),
                  numPages: images.length,
                  pdfUpdatedAt: new Date(),
                },
                $setOnInsert: { isMain: true }
              },
              { upsert: true }
            );
            
            console.log(`✓ ${images.length} imágenes generadas y guardadas exitosamente`);
            
            return res.status(200).json({
              ok: true,
              message: `PDF cargado exitosamente. ${images.length} imágenes generadas automáticamente.`,
              filename: 'catalogo.pdf',
              size: pdfPart.data.length,
              storedIn: 'MongoDB GridFS',
              imagesGenerated: true,
              numPages: images.length,
            });
          } catch (imageError) {
            console.error('Error al generar imágenes:', imageError);
            // Continuar aunque falle la generación de imágenes
            // El cliente las generará en la primera carga
            await db.collection('catalogs').updateOne(
              { isMain: true },
              { 
                $set: { 
                  imagesGenerated: false,
                  pdfUpdatedAt: new Date(),
                },
                $setOnInsert: { isMain: true }
              },
              { upsert: true }
            );
            
            return res.status(200).json({
              ok: true,
              message: 'PDF cargado exitosamente. Las imágenes se generarán en la primera carga.',
              filename: 'catalogo.pdf',
              size: pdfPart.data.length,
              storedIn: 'MongoDB GridFS',
              imagesGenerated: false,
              warning: 'No se pudieron generar imágenes automáticamente. Se generarán en la primera carga.',
            });
          }
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
