import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

let client = null;
let clientPromise = null;

function getMongoClient() {
  if (!mongoUri) return null;

  if (!clientPromise) {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      w: 'majority',
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

export default async function handler(req, res) {
  const method = req.method || 'GET';

  if (!mongoUri && method === 'GET') {
    // Fallback: devolver información del PDF en filesystem si existe
    const pdfPath = path.join(process.cwd(), 'catalogo.pdf');
    if (!fs.existsSync(pdfPath)) {
      return res.status(200).json({ pdfs: [] });
    }
    const stat = fs.statSync(pdfPath);
    return res.status(200).json({
      pdfs: [
        {
          id: 'filesystem',
          filename: 'catalogo.pdf',
          length: stat.size,
          uploadDate: stat.mtime,
          storage: 'filesystem',
        },
      ],
    });
  }

  if (!mongoUri) {
    return res.status(500).json({
      error: 'MongoDB no está configurado',
      hint: 'Configura MONGODB_URI para administrar PDFs',
    });
  }

  try {
    const clientPromise = getMongoClient();
    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });

    if (method === 'GET') {
      const files = await bucket
        .find({ filename: 'catalogo.pdf' })
        .sort({ uploadDate: -1 })
        .toArray();

      return res.status(200).json({
        pdfs: files.map((file) => ({
          id: file._id.toString(),
          filename: file.filename,
          length: file.length,
          uploadDate: file.uploadDate,
          contentType: file.contentType,
          md5: file.md5,
          storage: 'mongo',
        })),
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Falta id del PDF a eliminar' });
      }

      try {
        await bucket.delete(new ObjectId(id));
      } catch (err) {
        return res.status(500).json({ error: 'No se pudo eliminar el PDF', details: err.message });
      }

      // Si eliminamos el PDF actual, marcar imágenes como desactualizadas
      try {
        await db.collection('catalogs').updateOne(
          { isMain: true },
          {
            $set: {
              imagesGenerated: false,
              numPages: null,
            },
          }
        );
      } catch (e) {
        // No bloquear por esto
      }

      return res.status(200).json({ ok: true, deletedId: id });
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: `Método ${method} no permitido` });
  } catch (error) {
    console.error('[catalog-pdfs] Error:', error);
    return res.status(500).json({ error: 'Error al gestionar PDFs', details: error.message });
  }
}

