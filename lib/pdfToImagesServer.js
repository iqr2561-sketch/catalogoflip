/**
 * Convierte un PDF a imágenes en el servidor usando PDF.js y Canvas
 * Esto permite generar las imágenes automáticamente cuando se sube el PDF
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

export async function pdfToImagesServer(pdfBuffer, scale = 2.0) {
  const errorLogs = [];
  const startTime = Date.now();
  
  try {
    // Validar que el buffer no esté vacío
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('El buffer del PDF está vacío o es inválido');
    }

    // Validar que sea un PDF válido (debe comenzar con %PDF)
    if (pdfBuffer.length < 4 || pdfBuffer.slice(0, 4).toString() !== '%PDF') {
      throw new Error('El archivo no parece ser un PDF válido. Debe comenzar con %PDF');
    }

    console.log(`[pdfToImagesServer] Iniciando conversión de PDF (${pdfBuffer.length} bytes)...`);
    
    // Cargar el documento PDF con configuración robusta
    const loadingTask = getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
      verbosity: 0, // Reducir logs innecesarios
      stopAtErrors: false, // Continuar aunque haya errores menores
    });
    
    let pdf;
    try {
      pdf = await loadingTask.promise;
      console.log(`[pdfToImagesServer] PDF cargado exitosamente: ${pdf.numPages} páginas`);
    } catch (loadError) {
      const errorMsg = `Error al cargar el documento PDF: ${loadError.message}`;
      errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
      console.error('[pdfToImagesServer]', errorMsg, {
        name: loadError.name,
        message: loadError.message,
        stack: loadError.stack,
      });
      throw new Error(errorMsg);
    }
    
    const numPages = pdf.numPages;
    if (numPages === 0) {
      throw new Error('El PDF no contiene páginas');
    }
    
    const images = [];
    const maxPages = 100; // Límite de seguridad
    
    if (numPages > maxPages) {
      console.warn(`[pdfToImagesServer] Advertencia: PDF tiene ${numPages} páginas, procesando solo las primeras ${maxPages}`);
    }

    // Convertir cada página a imagen con manejo de errores individual
    for (let pageNum = 1; pageNum <= Math.min(numPages, maxPages); pageNum++) {
      try {
        console.log(`[pdfToImagesServer] Procesando página ${pageNum}/${numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Validar dimensiones del viewport
        if (viewport.width <= 0 || viewport.height <= 0) {
          const errorMsg = `Página ${pageNum} tiene dimensiones inválidas: ${viewport.width}x${viewport.height}`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.warn(`[pdfToImagesServer] ${errorMsg}`);
          continue; // Saltar esta página y continuar
        }

        // Limitar tamaño máximo del canvas para evitar problemas de memoria
        const maxDimension = 10000;
        if (viewport.width > maxDimension || viewport.height > maxDimension) {
          const errorMsg = `Página ${pageNum} es demasiado grande (${viewport.width}x${viewport.height}), reduciendo escala...`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.warn(`[pdfToImagesServer] ${errorMsg}`);
          // Ajustar escala automáticamente
          const adjustedScale = Math.min(scale, maxDimension / Math.max(viewport.width, viewport.height));
          const adjustedViewport = page.getViewport({ scale: adjustedScale });
          const canvas = createCanvas(adjustedViewport.width, adjustedViewport.height);
          const context = canvas.getContext('2d');
          const renderContext = {
            canvasContext: context,
            viewport: adjustedViewport,
          };
          await page.render(renderContext).promise;
          const imageBuffer = canvas.toBuffer('image/png');
          images.push({
            pageNum,
            buffer: imageBuffer,
            width: adjustedViewport.width,
            height: adjustedViewport.height,
          });
          continue;
        }

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
        
        if (!imageBuffer || imageBuffer.length === 0) {
          const errorMsg = `Página ${pageNum} generó un buffer vacío`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.warn(`[pdfToImagesServer] ${errorMsg}`);
          continue;
        }
        
        images.push({
          pageNum,
          buffer: imageBuffer,
          width: viewport.width,
          height: viewport.height,
        });
        
        console.log(`[pdfToImagesServer] ✓ Página ${pageNum} convertida exitosamente (${imageBuffer.length} bytes)`);
      } catch (pageError) {
        const errorMsg = `Error al procesar página ${pageNum}: ${pageError.message}`;
        errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
        console.error(`[pdfToImagesServer] ${errorMsg}`, {
          name: pageError.name,
          message: pageError.message,
          stack: pageError.stack,
          pageNum,
        });
        // Continuar con las siguientes páginas en lugar de fallar completamente
      }
    }

    if (images.length === 0) {
      const errorMsg = `No se pudo convertir ninguna página del PDF. Logs: ${errorLogs.join('; ')}`;
      throw new Error(errorMsg);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[pdfToImagesServer] ✓ Conversión completada: ${images.length}/${numPages} páginas en ${totalTime}ms`);
    
    if (errorLogs.length > 0) {
      console.warn(`[pdfToImagesServer] Advertencias durante la conversión: ${errorLogs.length} errores registrados`);
    }

    return images;
  } catch (error) {
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      logs: errorLogs,
      bufferSize: pdfBuffer ? pdfBuffer.length : 0,
    };
    console.error('[pdfToImagesServer] Error crítico al convertir PDF a imágenes:', errorDetails);
    const enhancedError = new Error(errorLogs.length > 0 
      ? `${error.message}. Logs: ${errorLogs.join('; ')}`
      : error.message
    );
    enhancedError.originalError = error;
    enhancedError.logs = errorLogs;
    throw enhancedError;
  }
}
