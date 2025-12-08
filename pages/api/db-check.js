import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  '';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  if (!connectionString) {
    return res.status(500).json({
      ok: false,
      error: 'DATABASE_URL / POSTGRES_PRISMA_URL no está configurada en las variables de entorno.',
    });
  }

  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as ok');
    const duration = Date.now() - start;

    return res.status(200).json({
      ok: true,
      dbOk: result.rows[0]?.ok === 1,
      durationMs: duration,
    });
  } catch (error) {
    console.error('Error en prueba de conexión a BD:', error);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo conectar a la base de datos. Revisa las variables de entorno y los logs.',
      details: error.message,
    });
  }
}


