import { Pool } from 'pg';

// Usar solo la conexión directa, NO branches automáticos
// Prioridad: DATABASE_URL > POSTGRES_URL (Prisma es solo fallback silencioso)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

// Pool reutilizable para conexiones eficientes
let pool = null;

function getPool() {
  if (!pool && connectionString) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')
        ? { rejectUnauthorized: false }
        : false,
      max: 1, // Limitar conexiones en serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  if (!connectionString) {
    return res.status(500).json({
      ok: false,
      error: 'DATABASE_URL no está configurada en las variables de entorno.',
      hint: 'Configura DATABASE_URL en Vercel → Settings → Environment Variables',
    });
  }

  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo inicializar el pool de conexiones.',
    });
  }

  try {
    const start = Date.now();
    const result = await dbPool.query('SELECT 1 as ok, NOW() as timestamp');
    const duration = Date.now() - start;

    return res.status(200).json({
      ok: true,
      dbOk: result.rows[0]?.ok === 1,
      durationMs: duration,
      timestamp: result.rows[0]?.timestamp,
      connectionType: 'direct', // Confirmamos que NO usamos branches automáticos
    });
  } catch (error) {
    console.error('Error en prueba de conexión a BD:', error);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo conectar a la base de datos. Revisa las variables de entorno y los logs.',
      details: error.message,
      hint: 'Verifica que DATABASE_URL apunte a tu base de datos principal (no a un branch automático)',
    });
  }
}


