import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.min.mjs'
  );

  if (!fs.existsSync(workerPath)) {
    res
      .status(404)
      .json({ error: 'No se encontró el worker de PDF.js en node_modules/pdfjs-dist.' });
    return;
  }

  const source = fs.readFileSync(workerPath, 'utf8');

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(source);
}


