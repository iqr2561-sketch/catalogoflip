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

  try {
    let loadingTask;

    // Cargar el PDF (desde URL o desde datos binarios)
    if (typeof pdfSource === 'string') {
      // Primero obtenemos los bytes del PDF via fetch y luego se los pasamos a PDF.js
      const response = await fetch(pdfSource);
      if (!response.ok) {
        throw new Error(`No se pudo obtener el PDF desde ${pdfSource} (status ${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    } else {
      loadingTask = pdfjsLib.getDocument({ data: pdfSource });
    }
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const images = [];
    
    // Convertir cada página a imagen
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Configurar el viewport con alta resolución
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Crear un canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Renderizar la página en el canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Convertir canvas a dataURL
      const dataURL = canvas.toDataURL('image/png');
      images.push(dataURL);
    }
    
    return images;
  } catch (error) {
    console.error('Error al convertir PDF a imágenes:', error);
    throw error;
  }
}

