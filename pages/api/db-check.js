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
    try {
      client = new MongoClient(mongoUri, {
        maxPoolSize: 1, // Limitar conexiones en serverless
        serverSelectionTimeoutMS: 15000, // Aumentado para dar más tiempo
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  if (!mongoUri) {
    const envVars = Object.keys(process.env).filter(key => 
      key.includes('MONGO') || key.includes('DATABASE')
    );
    return res.status(500).json({
      ok: false,
      error: 'MONGODB_URI no está configurada en las variables de entorno.',
      hint: 'Configura MONGODB_URI en Vercel → Settings → Environment Variables',
      availableEnvVars: envVars.length > 0 ? envVars : 'Ninguna variable relacionada encontrada',
      logs: [`[${new Date().toISOString()}] MONGODB_URI no configurada`],
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
    const logs = [];
    const start = Date.now();
    
    logs.push(`[${new Date().toISOString()}] Iniciando conexión a MongoDB...`);
    logs.push(`[${new Date().toISOString()}] URI configurada: ${mongoUri.substring(0, 30)}...`);
    
    const client = await clientPromise;
    logs.push(`[${new Date().toISOString()}] Cliente MongoDB conectado exitosamente`);
    
    // Probar la conexión ejecutando un comando simple
    logs.push(`[${new Date().toISOString()}] Ejecutando ping()...`);
    const result = await client.db().admin().ping();
    const pingDuration = Date.now() - start;
    logs.push(`[${new Date().toISOString()}] Ping exitoso (${pingDuration}ms)`);

    // Obtener información de la base de datos
    logs.push(`[${new Date().toISOString()}] Obteniendo información del servidor...`);
    const db = client.db();
    const dbName = db.databaseName;
    
    // Listar bases de datos disponibles
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    const databases = dbList.databases.map(db => db.name);
    
    // Obtener información del servidor
    let serverInfo = {};
    let serverVersion = 'unknown';
    try {
      // Intentar obtener versión de otra forma si serverStatus no está permitido
      const buildInfo = await adminDb.command({ buildInfo: 1 });
      serverVersion = buildInfo?.version || 'unknown';
      logs.push(`[${new Date().toISOString()}] Información del servidor obtenida`);
    } catch (err) {
      // Si buildInfo tampoco funciona, usar una versión por defecto o intentar otra forma
      try {
        const connectionInfo = client.topology?.s?.options?.metadata?.server?.version;
        serverVersion = connectionInfo || 'unknown';
      } catch (e) {
        serverVersion = 'unknown';
      }
      logs.push(`[${new Date().toISOString()}] Advertencia: No se pudo obtener serverStatus (normal con permisos limitados): ${err.message}`);
    }

    // Obtener información de colecciones si hay alguna
    let collections = [];
    try {
      collections = await db.listCollections().toArray();
      logs.push(`[${new Date().toISOString()}] Colecciones encontradas: ${collections.length}`);
    } catch (err) {
      logs.push(`[${new Date().toISOString()}] Advertencia: No se pudo listar colecciones: ${err.message}`);
    }

    const totalDuration = Date.now() - start;
    logs.push(`[${new Date().toISOString()}] Prueba completada en ${totalDuration}ms`);

    return res.status(200).json({
      ok: true,
      dbOk: result.ok === 1,
      durationMs: totalDuration,
      timestamp: new Date().toISOString(),
      connectionType: 'direct',
      database: dbName || 'default',
      serverVersion,
      databases: databases || [],
      collections: collections.map(c => c.name) || [],
      logs,
      details: {
        uriConfigured: !!mongoUri,
        uriLength: mongoUri.length,
        connectionPoolSize: 1,
        pingResult: result,
      },
    });
  } catch (error) {
    const errorLogs = [];
    errorLogs.push(`[${new Date().toISOString()}] ERROR: ${error.name || 'UnknownError'}`);
    errorLogs.push(`[${new Date().toISOString()}] Mensaje: ${error.message}`);
    if (error.stack) {
      errorLogs.push(`[${new Date().toISOString()}] Stack: ${error.stack.split('\n').slice(0, 3).join(' ')}`);
    }
    
    console.error('Error en prueba de conexión a MongoDB:', error);
    
    return res.status(500).json({
      ok: false,
      error: 'No se pudo conectar a MongoDB Atlas. Revisa las variables de entorno y los logs.',
      errorName: error.name || 'UnknownError',
      details: error.message,
      logs: errorLogs,
      hint: 'Verifica que MONGODB_URI apunte a tu cluster de MongoDB Atlas correctamente y que tu IP esté en la whitelist',
    });
  }
}
