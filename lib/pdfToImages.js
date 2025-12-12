/**
 * Convierte un PDF en un array de imágenes (dataURLs) usando PDF.js
 * Incluye cache en localStorage para evitar reconvertir el mismo PDF
 * @param {string|ArrayBuffer|Uint8Array} pdfSource - URL del archivo PDF
 * @returns {Promise<string[]>} Array de dataURLs de las páginas
 */
export async function pdfToImages(pdfSource) {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configurar el worker de PDF.js
  if (typeof window !== 'undefined') {
    const pdfjsVersion = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`;
  }

  const startTime = Date.now();
  
  try {
    console.log('[pdfToImages] Iniciando conversión de PDF a imágenes...');
    
    // Intentar cargar desde cache si es una URL
    if (typeof pdfSource === 'string' && typeof localStorage !== 'undefined') {
      try {
        const cacheKey = `pdf_images_${pdfSource}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          console.log(`[pdfToImages] ✓ Imágenes cargadas desde cache (${data.images.length} páginas)`);
          return data.images;
        }
      } catch (cacheError) {
        console.warn('[pdfToImages] Error al leer cache, regenerando:', cacheError);
      }
    }
    
    let loadingTask;
    let pdfSourceForCache = typeof pdfSource === 'string' ? pdfSource : null;

    // Cargar el PDF
    if (typeof pdfSource === 'string') {
      const response = await fetch(pdfSource);
      if (!response.ok) {
        throw new Error(`No se pudo obtener el PDF (HTTP ${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[pdfToImages] PDF descargado: ${arrayBuffer.byteLength} bytes`);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    } else {
      console.log(`[pdfToImages] Cargando PDF desde datos binarios`);
      loadingTask = pdfjsLib.getDocument({ data: pdfSource });
    }
    
    const pdf = await loadingTask.promise;
    console.log(`[pdfToImages] PDF cargado exitosamente: ${pdf.numPages} páginas`);
    
    const numPages = pdf.numPages;
    const maxPages = 100;
    const images = [];
    
    if (numPages > maxPages) {
      console.warn(`[pdfToImages] PDF tiene ${numPages} páginas, procesando solo ${maxPages}`);
    }
    
    // Convertir cada página a imagen JPEG (más liviano)
    for (let pageNum = 1; pageNum <= Math.min(numPages, maxPages); pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Escala 1.5 para balance calidad/tamaño
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Fondo blanco para JPEG
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // JPEG al 85% de calidad (mucho más liviano que PNG)
      const dataURL = canvas.toDataURL('image/jpeg', 0.85);
      images.push(dataURL);
      
      // Log de progreso cada 5 páginas
      if (pageNum % 5 === 0 || pageNum === numPages) {
        console.log(`[pdfToImages] Procesadas ${pageNum}/${numPages} páginas`);
      }
    }
    
    if (images.length === 0) {
      throw new Error('No se pudo convertir ninguna página del PDF');
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[pdfToImages] ✓ Conversión completada: ${images.length} páginas en ${totalTime}ms`);
    
    // Guardar en cache si es posible (solo para URLs)
    if (pdfSourceForCache && typeof localStorage !== 'undefined') {
      try {
        const cacheKey = `pdf_images_${pdfSourceForCache}`;
        const cacheData = JSON.stringify({
          images,
          timestamp: Date.now(),
          numPages: images.length,
        });
        
        // Solo cachear si no es muy grande (< 50MB en localStorage)
        if (cacheData.length < 50 * 1024 * 1024) {
          localStorage.setItem(cacheKey, cacheData);
          console.log('[pdfToImages] Imágenes guardadas en cache para próximas cargas');
        } else {
          console.warn('[pdfToImages] Cache muy grande, no se guardó');
        }
      } catch (cacheError) {
        console.warn('[pdfToImages] No se pudo guardar en cache (probablemente cuota excedida)');
        // Si falla por quota, limpiar cache antiguo
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('pdf_images_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          // Ignorar
        }
      }
    }
    
    return images;
  } catch (error) {
    console.error('[pdfToImages] Error crítico:', error);
    throw new Error(`Error al convertir PDF: ${error.message}`);
  }
}
