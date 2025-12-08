import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const pdfPath = path.join(process.cwd(), 'catalogo.pdf');

  if (!fs.existsSync(pdfPath)) {
    res.status(404).json({ error: 'El archivo catalogo.pdf no existe en la raíz del proyecto.' });
    return;
  }

  const stat = fs.statSync(pdfPath);

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': stat.size,
    'Content-Disposition': 'inline; filename=\"catalogo.pdf\"',
  });

  const stream = fs.createReadStream(pdfPath);
  stream.pipe(res);
}


