import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'catalog.json');
const pdfPath = path.join(process.cwd(), 'catalogo.pdf');

async function getPdfPageCount() {
  try {
    if (!fs.existsSync(pdfPath)) return null;

    const pdfjsLib = await import('pdfjs-dist');
    const data = fs.readFileSync(pdfPath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    return pdf.numPages || null;
  } catch (e) {
    console.error('No se pudo obtener el número de páginas del PDF:', e);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Detectar cantidad de páginas del PDF
      const numPages = await getPdfPageCount();
      if (numPages && (!data.numPages || data.numPages !== numPages)) {
        data.numPages = numPages;
      }

      // Asegurar estructuras básicas
      if (!Array.isArray(data.hotspots)) data.hotspots = [];
      if (!Array.isArray(data.productos)) data.productos = [];

      // Crear al menos un hotspot por página si no existe ninguno para esa página
      if (numPages) {
        const firstProductId = data.productos[0]?.id || '';
        for (let page = 1; page <= numPages; page++) {
          const tieneHotspot = data.hotspots.some((h) => h.page === page);
          if (!tieneHotspot) {
            data.hotspots.push({
              page,
              idProducto: firstProductId,
              enabled: false,
              x: 50,
              y: 50,
              width: 20,
              height: 20,
            });
          }
        }
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Error al leer catalog.json:', error);
      res.status(500).json({ error: 'No se pudo leer la configuración del catálogo.' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error al escribir catalog.json:', error);
      res.status(500).json({ error: 'No se pudo guardar la configuración del catálogo.' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Método ${req.method} no permitido`);
}

