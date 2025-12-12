/**
 * Convierte un PDF en un array de imágenes (dataURLs) usando PDF.js
 * @param {string|ArrayBuffer|Uint8Array} pdfSource - URL del archivo PDF
 *   (por ejemplo "/catalogo.pdf") o los datos binarios del PDF (por ejemplo
 *   el resultado de file.arrayBuffer() en el navegador)
 * @returns {Promise<string[]>} Array de dataURLs de las páginas
 */
export async function pdfToImages(pdfSource) {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configurar el worker de PDF.js
  // Usar unpkg CDN directamente (más confiable que cdnjs)
  if (typeof window !== 'undefined') {
    const pdfjsVersion = pdfjsLib.version || '4.10.38';
    
    // Usar unpkg que es más confiable y tiene mejor disponibilidad
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`;
  }

  const startTime = Date.now();
  const errorLogs = [];
  
  try {
    console.log('[pdfToImages] Iniciando conversión de PDF a imágenes...');
    let loadingTask;

    // Cargar el PDF (desde URL o desde datos binarios)
    if (typeof pdfSource === 'string') {
      console.log(`[pdfToImages] Cargando PDF desde URL: ${pdfSource}`);
      try {
        // Primero obtenemos los bytes del PDF via fetch y luego se los pasamos a PDF.js
        const response = await fetch(pdfSource);
        if (!response.ok) {
          const errorMsg = `No se pudo obtener el PDF desde ${pdfSource} (HTTP ${response.status})`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[pdfToImages] PDF descargado: ${arrayBuffer.byteLength} bytes`);
        loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      } catch (fetchError) {
        const errorMsg = `Error al descargar PDF desde ${pdfSource}: ${fetchError.message}`;
        errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
        console.error('[pdfToImages]', errorMsg, {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack,
        });
        throw new Error(errorMsg);
      }
    } else {
      console.log(`[pdfToImages] Cargando PDF desde datos binarios: ${pdfSource.byteLength || pdfSource.length} bytes`);
      loadingTask = pdfjsLib.getDocument({ data: pdfSource });
    }
    
    let pdf;
    try {
      pdf = await loadingTask.promise;
      console.log(`[pdfToImages] PDF cargado exitosamente: ${pdf.numPages} páginas`);
    } catch (loadError) {
      const errorMsg = `Error al cargar PDF con PDF.js: ${loadError.message}`;
      errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
      console.error('[pdfToImages]', errorMsg, {
        name: loadError.name,
        message: loadError.message,
        stack: loadError.stack,
      });
      throw new Error(errorMsg);
    }
    
    const numPages = pdf.numPages;
    const images = [];
    const maxPages = 100; // Límite de seguridad
    
    if (numPages > maxPages) {
      console.warn(`[pdfToImages] Advertencia: PDF tiene ${numPages} páginas, procesando solo las primeras ${maxPages}`);
    }
    
    // Convertir cada página a imagen
    for (let pageNum = 1; pageNum <= Math.min(numPages, maxPages); pageNum++) {
      try {
        console.log(`[pdfToImages] Procesando página ${pageNum}/${numPages}...`);
        const page = await pdf.getPage(pageNum);
        
        // Configurar el viewport con escala reducida para imágenes más livianas
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Crear un canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Fondo blanco para JPEG
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Renderizar la página en el canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Convertir canvas a dataURL en JPEG (más liviano que PNG)
        const dataURL = canvas.toDataURL('image/jpeg', 0.85);
        images.push(dataURL);
        console.log(`[pdfToImages] ✓ Página ${pageNum} convertida exitosamente`);
      } catch (pageError) {
        const errorMsg = `Error al procesar página ${pageNum}: ${pageError.message}`;
        errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
        console.error(`[pdfToImages] ${errorMsg}`, {
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
    console.log(`[pdfToImages] ✓ Conversión completada: ${images.length}/${numPages} páginas en ${totalTime}ms`);
    
    if (errorLogs.length > 0) {
      console.warn(`[pdfToImages] Advertencias durante la conversión: ${errorLogs.length} errores registrados`);
    }
    
    return images;
  } catch (error) {
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      logs: errorLogs,
      source: typeof pdfSource === 'string' ? pdfSource : 'binary data',
    };
    console.error('[pdfToImages] Error crítico al convertir PDF a imágenes:', errorDetails);
    const enhancedError = new Error(errorLogs.length > 0 
      ? `${error.message}. Logs: ${errorLogs.join('; ')}`
      : error.message
    );
    enhancedError.originalError = error;
    enhancedError.logs = errorLogs;
    throw enhancedError;
  }
}

