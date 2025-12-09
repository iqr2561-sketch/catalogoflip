import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // Intentar diferentes rutas posibles para el worker
    const possiblePaths = [
      // Ruta estándar (legacy build)
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs'),
      // Ruta alternativa (build normal)
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
      // Ruta con .js en lugar de .mjs (legacy)
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js'),
      // Ruta con .js (build normal)
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
    ];

    let workerPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        workerPath = possiblePath;
        break;
      }
    }

    if (!workerPath) {
      console.warn('Worker de PDF.js no encontrado en node_modules, usando unpkg CDN como fallback');
      // Si no encontramos el worker, usar unpkg que es más confiable
      const pdfjsPackage = require('pdfjs-dist/package.json');
      const pdfjsVersion = pdfjsPackage.version || '4.10.38';
      const cdnUrl = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`;
      
      // Redirigir al CDN (el navegador lo cargará directamente)
      res.setHeader('Location', cdnUrl);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(307).end();
      return;
    }

    // Leer el archivo
    // Intentar leer como texto primero (para .mjs), si falla leer como binario
    let source;
    try {
      source = fs.readFileSync(workerPath, 'utf8');
    } catch (e) {
      source = fs.readFileSync(workerPath);
    }

    // Headers apropiados
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    // Responder con el contenido del worker
    res.status(200).send(source);
  } catch (error) {
    console.error('Error al servir el worker de PDF.js:', error);
    
    // Fallback a CDN si hay error
    try {
      const pdfjsPackage = require('pdfjs-dist/package.json');
      const pdfjsVersion = pdfjsPackage.version || '4.10.38';
      const cdnUrl = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`;
      
      // Redirigir al CDN
      res.setHeader('Location', cdnUrl);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(307).end();
      return;
    } catch (fallbackError) {
      res.status(500).json({
        error: 'No se pudo cargar el worker de PDF.js',
        details: error.message,
        hint: 'Verifica que pdfjs-dist esté instalado correctamente',
      });
    }
  }
}


