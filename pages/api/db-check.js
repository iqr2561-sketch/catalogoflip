import { MongoClient } from 'mongodb';

// Usar MongoDB Atlas - conexión directa
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  '';

// Cliente reutilizable para conexiones eficientes
let client = null;
let clientPromise = null;

function getMongoClient() {
  if (!mongoUri) {
    return null;
  }

  if (!clientPromise) {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 1, // Limitar conexiones en serverless
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  if (!mongoUri) {
    return res.status(500).json({
      ok: false,
      error: 'MONGODB_URI no está configurada en las variables de entorno.',
      hint: 'Configura MONGODB_URI en Vercel → Settings → Environment Variables',
    });
  }

  const clientPromise = getMongoClient();
  if (!clientPromise) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo inicializar el cliente de MongoDB.',
    });
  }

  try {
    const start = Date.now();
    const client = await clientPromise;
    
    // Probar la conexión ejecutando un comando simple
    const result = await client.db().admin().ping();
    const duration = Date.now() - start;

    // Obtener información de la base de datos
    const dbName = client.db().databaseName;
    const serverInfo = await client.db().admin().serverStatus();

    return res.status(200).json({
      ok: true,
      dbOk: result.ok === 1,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      connectionType: 'direct',
      database: dbName,
      serverVersion: serverInfo?.version || 'unknown',
    });
  } catch (error) {
    console.error('Error en prueba de conexión a MongoDB:', error);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo conectar a MongoDB Atlas. Revisa las variables de entorno y los logs.',
      details: error.message,
      hint: 'Verifica que MONGODB_URI apunte a tu cluster de MongoDB Atlas correctamente',
    });
  }
}
