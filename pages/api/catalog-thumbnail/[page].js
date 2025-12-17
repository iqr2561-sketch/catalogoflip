import { MongoClient, GridFSBucket } from 'mongodb';
import sharp from 'sharp';
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
      console.error('[catalog-thumbnail] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { page } = req.query;
  const pageNumber = parseInt(page, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ error: 'Número de página inválido' });
  }

  try {
    const clientPromise = getMongoClient();
    const mongoClient = clientPromise ? await clientPromise : null;
    const db = mongoClient ? mongoClient.db() : null;

    if (!db) {
      // Fallback a filesystem
      const thumbnailPath = path.join(process.cwd(), 'public', 'catalog-thumbnails', `page_${String(pageNumber).padStart(3, '0')}.jpg`);
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(imageBuffer);
      }
      return res.status(404).json({ error: 'Miniatura no encontrada' });
    }

    const thumbnailsBucket = new GridFSBucket(db, { bucketName: 'catalog_thumbnails' });
    const filename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;

    // Buscar miniatura existente
    const existingThumbnails = await thumbnailsBucket.find({ filename }).toArray();
    
    if (existingThumbnails.length > 0) {
      // Miniatura ya existe, servirla
      const downloadStream = thumbnailsBucket.openDownloadStreamByName(filename);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return downloadStream.pipe(res);
    }

    // Miniatura no existe, generarla desde la imagen original
    const imagesBucket = new GridFSBucket(db, { bucketName: 'catalog_images' });
    const originalFilename = `catalog_page_${String(pageNumber).padStart(3, '0')}.jpg`;
    const originalFiles = await imagesBucket.find({ filename: originalFilename }).toArray();

    if (originalFiles.length === 0) {
      return res.status(404).json({ error: 'Imagen original no encontrada' });
    }

    // Leer imagen original
    const originalDownloadStream = imagesBucket.openDownloadStreamByName(originalFilename);
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      originalDownloadStream.on('data', (chunk) => chunks.push(chunk));
      originalDownloadStream.on('end', resolve);
      originalDownloadStream.on('error', reject);
    });

    const originalBuffer = Buffer.concat(chunks);

    // Generar miniatura con sharp (máximo 8cm = ~300px a 96dpi, o ~226px a 72dpi)
    // Usamos 300px como máximo para buena calidad
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(300, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Guardar miniatura en GridFS
    const uploadStream = thumbnailsBucket.openUploadStream(filename, {
      contentType: 'image/jpeg',
    });

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(thumbnailBuffer);
    });

    // Servir la miniatura
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(thumbnailBuffer);

  } catch (error) {
    console.error('[catalog-thumbnail] Error:', error);
    return res.status(500).json({
      error: 'Error al generar o servir miniatura',
      details: error.message,
    });
  }
}

