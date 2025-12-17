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
      console.error('[delete-catalog-images] Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  const sendJsonResponse = (status, data) => {
    res.status(status).json(data);
  };

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return sendJsonResponse(405, { error: 'Método no permitido' });
  }

  try {
    const clientPromise = getMongoClient();
    const mongoClient = clientPromise ? await clientPromise : null;
    const db = mongoClient ? mongoClient.db() : null;

    if (!db) {
      return sendJsonResponse(500, {
        error: 'MongoDB no está configurado',
        hint: 'Configura MONGODB_URI para usar esta funcionalidad',
      });
    }

    let deletedImages = 0;
    let deletedThumbnails = 0;

    // Eliminar imágenes del catálogo
    try {
      const imagesBucket = new GridFSBucket(db, { bucketName: 'catalog_images' });
      const imageFiles = await imagesBucket.find({ filename: { $regex: /^catalog_page_/ } }).toArray();
      
      for (const file of imageFiles) {
        await imagesBucket.delete(file._id);
        deletedImages++;
      }
      console.log(`[delete-catalog-images] ${deletedImages} imágenes eliminadas`);
    } catch (imagesError) {
      console.error('[delete-catalog-images] Error al eliminar imágenes:', imagesError);
    }

    // Eliminar miniaturas
    try {
      const thumbnailsBucket = new GridFSBucket(db, { bucketName: 'catalog_thumbnails' });
      const thumbnailFiles = await thumbnailsBucket.find({ filename: { $regex: /^catalog_page_/ } }).toArray();
      
      for (const file of thumbnailFiles) {
        await thumbnailsBucket.delete(file._id);
        deletedThumbnails++;
      }
      console.log(`[delete-catalog-images] ${deletedThumbnails} miniaturas eliminadas`);
    } catch (thumbnailsError) {
      console.error('[delete-catalog-images] Error al eliminar miniaturas:', thumbnailsError);
    }

    // Actualizar configuración del catálogo
    await db.collection('catalogs').updateOne(
      { isMain: true },
      {
        $unset: {
          useImages: '',
          imageUrls: '',
          numPages: '',
          zipFilename: '',
          imagesUpdatedAt: '',
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    return sendJsonResponse(200, {
      ok: true,
      message: `✓ ${deletedImages} imágenes y ${deletedThumbnails} miniaturas eliminadas`,
      deletedImages,
      deletedThumbnails,
    });

  } catch (error) {
    console.error('[delete-catalog-images] Error crítico:', error);
    return sendJsonResponse(500, {
      ok: false,
      error: `Error al eliminar imágenes: ${error.message}`,
      details: error.message,
    });
  }
}

