/**
 * Convierte un PDF a imágenes en el servidor usando PDF.js y Canvas
 * Esto permite generar las imágenes automáticamente cuando se sube el PDF
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

export async function pdfToImagesServer(pdfBuffer, scale = 2.0) {
  try {
    // Cargar el documento PDF
    const loadingTask = getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const images = [];

    // Convertir cada página a imagen
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Crear canvas con las dimensiones de la página
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      // Renderizar la página en el canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convertir canvas a buffer PNG
      const imageBuffer = canvas.toBuffer('image/png');
      images.push({
        pageNum,
        buffer: imageBuffer,
        width: viewport.width,
        height: viewport.height,
      });
    }

    return images;
  } catch (error) {
    console.error('Error al convertir PDF a imágenes en el servidor:', error);
    throw error;
  }
}
