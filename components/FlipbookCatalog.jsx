import { useEffect, useRef, useState } from 'react';
import Hotspot from './Hotspot';
import ProductModal from './ProductModal';

export default function FlipbookCatalog({
  pdfUrl,
  images = null, // Array de URLs de imágenes (alternativa al PDF)
  hotspots = [],
  productos = [],
  whatsappNumber = null,
}) {
  const flipbookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'double'
  const [containerSize, setContainerSize] = useState({ width: 600, height: 800 });
  const [flipDirection, setFlipDirection] = useState(null); // 'next' | 'prev' | null
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Estados para PDF y renderizado
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(new Set()); // Páginas ya renderizadas
  const [loading, setLoading] = useState(true);
  const canvasRefs = useRef({}); // Referencias a los canvas de cada página
  const renderQueue = useRef(new Set()); // Cola de páginas pendientes de renderizar

  // Cargar imágenes o PDF
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);

        // Si hay imágenes, usarlas directamente
        if (images && images.length > 0) {
          console.log(`[FlipbookCatalog] Usando ${images.length} imágenes del catálogo`);
          setNumPages(images.length);
          setPdfDoc(null); // No hay PDF
          setLoading(false);
          return;
        }

        // Si hay PDF, cargarlo
        if (pdfUrl) {
          console.log('[FlipbookCatalog] Cargando PDF desde:', pdfUrl);

          // Importar PDF.js dinámicamente
          const pdfjsLib = await import('pdfjs-dist');
          
          // Configurar worker de PDF.js
          const pdfjsVersion = pdfjsLib.version || '4.10.38';
          pdfjsLib.GlobalWorkerOptions.workerSrc = 
            `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`;

          // Cargar el PDF
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`Error al cargar PDF: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          
          const loadingTask = pdfjsLib.getDocument({ 
            data: arrayBuffer,
            verbosity: 0,
          });
          
          const pdf = await loadingTask.promise;
          
          if (!mounted) return;
          
          console.log(`[FlipbookCatalog] PDF cargado: ${pdf.numPages} páginas`);
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
        }
      } catch (error) {
        console.error('[FlipbookCatalog] Error al cargar contenido:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      mounted = false;
    };
  }, [pdfUrl, images]);

  // Calcular tamaño del contenedor para que el catálogo quepa en pantalla
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculateSize = () => {
      const viewportWidth = window.innerWidth * 0.9; // margen lateral
      const viewportHeight = window.innerHeight * 0.8; // dejar espacio para controles
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      // Forzar vista de una sola página en móvil
      if (mobile && viewMode === 'double') {
        setViewMode('single');
      }

      const pageAspect = 3 / 4; // relación de aspecto aproximada del PDF (ancho / alto)
      const pages = !mobile && viewMode === 'double' ? 2 : 1;

      // Partimos del alto máximo disponible
      let height = viewportHeight;
      let width = height * pageAspect * pages;

      // Si nos salimos por ancho, ajustamos tomando como base el ancho máximo
      if (width > viewportWidth) {
        width = viewportWidth;
        height = width / (pageAspect * pages);
      }

      setContainerSize({
        width,
        height,
      });
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);

    return () => {
      window.removeEventListener('resize', calculateSize);
    };
  }, [viewMode]);

  useEffect(() => {
    // Calcular dimensiones de una página individual (para hotspots)
    const pages = !isMobile && viewMode === 'double' ? 2 : 1;
    const pageWidth = containerSize.width / pages;
    const pageHeight = containerSize.height;

    setPageDimensions({
      width: pageWidth,
      height: pageHeight,
    });
  }, [containerSize.width, containerSize.height, viewMode, isMobile]);

  const handleHotspotClick = (producto) => {
    setSelectedProduct(producto);
    setIsModalOpen(true);
  };

  // Función para renderizar una página a canvas (PDF o imagen)
  const renderPageToCanvas = async (pageNum, canvas, mobile = isMobile) => {
    if (!canvas) return;

    try {
      // Si hay imágenes, cargar directamente (optimizado para velocidad)
      if (images && images.length > 0) {
        const pageIndex = pageNum - 1;
        if (pageIndex >= 0 && pageIndex < images.length) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              // Ajustar tamaño del canvas según la imagen
              const maxWidth = mobile ? window.innerWidth * 0.9 : 1200;
              const maxHeight = mobile ? window.innerHeight * 0.8 : 1600;
              
              let width = img.width;
              let height = img.height;
              
              // Escalar si es necesario
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
              
              canvas.width = width;
              canvas.height = height;
              
              const context = canvas.getContext('2d');
              context.drawImage(img, 0, 0, width, height);
              
              setRenderedPages(prev => new Set([...prev, pageIndex]));
              renderQueue.current.delete(pageIndex);
              console.log(`[FlipbookCatalog] ✓ Imagen ${pageNum} cargada`);
              resolve();
            };
            img.onerror = reject;
            img.src = images[pageIndex];
          });
        }
        return;
      }

      // Si hay PDF, renderizar desde PDF
      if (pdfDoc) {
        const page = await pdfDoc.getPage(pageNum);
        
        // Escala adaptativa: mobile 1.1, desktop 1.5
        const scale = mobile ? 1.1 : 1.5;
        const viewport = page.getViewport({ scale });
        
        // Ajustar tamaño del canvas
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        
        // Fondo blanco
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Renderizar página
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Marcar como renderizada
        setRenderedPages(prev => new Set([...prev, pageNum - 1]));
        renderQueue.current.delete(pageNum - 1);
        
        console.log(`[FlipbookCatalog] ✓ Página ${pageNum} renderizada`);
      }
    } catch (error) {
      console.error(`[FlipbookCatalog] Error al renderizar página ${pageNum}:`, error);
      renderQueue.current.delete(pageNum - 1);
    }
  };

  // Renderizar páginas iniciales (lazy loading)
  useEffect(() => {
    if ((!pdfDoc && !images) || !containerSize.width || numPages === 0) return;

    const initialPages = isMobile ? [0, 1] : [0, 1, 2]; // Mobile: 2 páginas, Desktop: 3 páginas
    
    initialPages.forEach(pageIndex => {
      if (pageIndex < numPages && !renderedPages.has(pageIndex) && !renderQueue.current.has(pageIndex)) {
        renderQueue.current.add(pageIndex);
        // Usar setTimeout para asegurar que el canvas esté montado
        setTimeout(() => {
          const canvas = canvasRefs.current[pageIndex];
          if (canvas) {
            renderPageToCanvas(pageIndex + 1, canvas, isMobile);
          }
        }, 100);
      }
    });
  }, [pdfDoc, containerSize.width, numPages, isMobile, renderedPages]);

  // Renderizar páginas adyacentes cuando cambia la página actual
  useEffect(() => {
    if ((!pdfDoc && !images) || numPages === 0) return;

    // Páginas a pre-renderizar alrededor de la actual
    const pagesToRender = [];
    
    // Página actual
    if (currentPage < numPages && !renderedPages.has(currentPage)) {
      pagesToRender.push(currentPage);
    }
    
    // Páginas siguientes (hasta 2 adelante)
    for (let i = 1; i <= 2; i++) {
      const nextPage = currentPage + i;
      if (nextPage < numPages && !renderedPages.has(nextPage)) {
        pagesToRender.push(nextPage);
      }
    }
    
    // Páginas anteriores (hasta 1 atrás)
    const prevPage = currentPage - 1;
    if (prevPage >= 0 && !renderedPages.has(prevPage)) {
      pagesToRender.push(prevPage);
    }

    // Renderizar páginas pendientes
    pagesToRender.forEach(pageIndex => {
      if (!renderQueue.current.has(pageIndex)) {
        renderQueue.current.add(pageIndex);
        // Usar setTimeout para asegurar que el canvas esté montado
        setTimeout(() => {
          const canvas = canvasRefs.current[pageIndex];
          if (canvas) {
            renderPageToCanvas(pageIndex + 1, canvas, isMobile);
          }
        }, 100);
      }
    });
  }, [currentPage, pdfDoc, numPages, renderedPages, isMobile]);

  // Limpiar canvas no visibles para evitar memory leaks
  useEffect(() => {
    if (!pdfDoc && !images) return;

    const cleanup = () => {
      // Mantener solo las páginas visibles y adyacentes
      const keepPages = new Set();
      
      // Página actual
      keepPages.add(currentPage);
      
      // Páginas adyacentes (hasta 2 adelante y 1 atrás)
      for (let i = -1; i <= 2; i++) {
        const pageIndex = currentPage + i;
        if (pageIndex >= 0 && pageIndex < numPages) {
          keepPages.add(pageIndex);
        }
      }

      // Limpiar canvas de páginas no necesarias
      Object.keys(canvasRefs.current).forEach(pageIndexStr => {
        const pageIndex = parseInt(pageIndexStr);
        if (!keepPages.has(pageIndex)) {
          const canvas = canvasRefs.current[pageIndex];
          if (canvas) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            // No eliminamos la referencia, solo limpiamos el canvas
          }
        }
      });
    };

    // Limpiar después de un delay para no hacerlo en cada cambio
    const timeoutId = setTimeout(cleanup, 5000);
    return () => clearTimeout(timeoutId);
  }, [currentPage, pdfDoc, numPages]);

  const handlePrevPage = () => {
    if (isTransitioning) return;
    
    const newPage = (() => {
      if (!isMobile && viewMode === 'double') {
        const base = currentPage - (currentPage % 2);
        return Math.max(0, base - 2);
      }
      return Math.max(0, currentPage - 1);
    })();
    
    if (newPage === currentPage) return;
    
    setFlipDirection('prev');
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentPage(newPage);
      setTimeout(() => {
        setIsTransitioning(false);
        setFlipDirection(null);
      }, 400);
    }, 50);
  };

  const handleNextPage = () => {
    if (isTransitioning || !numPages) return;
    
    const newPage = (() => {
      if (!isMobile && viewMode === 'double') {
        const base = currentPage - (currentPage % 2);
        const target = base + 2;
        return target >= numPages ? currentPage : target;
      }
      return Math.min(numPages - 1, currentPage + 1);
    })();
    
    if (newPage === currentPage) return;
    
    setFlipDirection('next');
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentPage(newPage);
      setTimeout(() => {
        setIsTransitioning(false);
        setFlipDirection(null);
      }, 400);
    }, 50);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Asegurar que la página actual sea válida cuando cambia el número de páginas
  useEffect(() => {
    if (numPages > 0 && currentPage >= numPages) {
      setCurrentPage(Math.max(0, numPages - 1));
    }
  }, [numPages, currentPage]);

  // Gestos táctiles para móvil - Swipe
  const minSwipeDistance = 50; // Distancia mínima para considerar un swipe

  const onTouchStart = (e) => {
    if (isModalOpen || isTransitioning) return;
    const touch = e.touches[0];
    setTouchEnd(null);
    setTouchStart(touch.clientX);
  };

  const onTouchMove = (e) => {
    if (!touchStart || isModalOpen || isTransitioning) return;
    const touch = e.touches[0];
    setTouchEnd(touch.clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isModalOpen || isTransitioning) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < numPages - 1) {
      handleNextPage();
    } else if (isRightSwipe && currentPage > 0) {
      handlePrevPage();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const onTouchCancel = () => {
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Obtener hotspots de las páginas visibles (solo los habilitados)
  const isDouble = !isMobile && viewMode === 'double';
  const baseIndex = isDouble ? currentPage - (currentPage % 2) : currentPage;
  const leftPageNum = baseIndex + 1;
  const rightPageNum = isDouble && baseIndex + 1 < numPages ? baseIndex + 2 : null;
  
  const visiblePageNumbers = isDouble 
    ? [leftPageNum, rightPageNum].filter(Boolean)
    : [currentPage + 1];
  
  const currentPageHotspots = hotspots.filter((h) => {
    const pageMatch = visiblePageNumbers.includes(h.page);
    const isEnabled = h.enabled !== false;
    return pageMatch && isEnabled;
  });
  
  // Mapear productos a hotspots
  const currentPageProducts = currentPageHotspots.map((hotspot) => {
    const producto = productos.find((p) => {
      // Comparar IDs como strings para evitar problemas de tipo
      return String(p.id) === String(hotspot.idProducto);
    });
    
    // Debug: mostrar si no se encuentra el producto
    if (!producto && hotspot.idProducto) {
      console.warn(`Producto no encontrado para hotspot:`, {
        hotspotId: hotspot.idProducto,
        productosDisponibles: productos.map(p => p.id),
        page: hotspot.page,
      });
    }
    
    return producto;
  }).filter(Boolean); // Eliminar productos no encontrados

  return (
    <div className="relative w-full flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      {/* Controles de navegación */}
      <div className="mb-4 md:mb-6 w-full max-w-4xl mx-auto px-4">
        {/* Controles principales - Desktop */}
        <div className="hidden md:flex flex-wrap items-center gap-4 justify-center">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              currentPage === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            <svg
              className="w-5 h-5 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Selector de modo de vista - Solo desktop */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Vista:</span>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-2 text-sm rounded-lg border ${
                viewMode === 'single'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Una página
            </button>
            <button
              type="button"
              onClick={() => setViewMode('double')}
              className={`px-3 py-2 text-sm rounded-lg border ${
                viewMode === 'double'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Dos páginas
            </button>
          </div>

          <div className="px-6 py-3 bg-white rounded-xl shadow-lg">
            <span className="text-gray-700 font-semibold">
              Página {currentPage + 1} de {numPages || 0}
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= (numPages - 1)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              currentPage >= (numPages - 1)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            <svg
              className="w-5 h-5 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Controles móviles - Compactos */}
        <div className="md:hidden flex items-center justify-between gap-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              currentPage === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg active:scale-95'
            }`}
            aria-label="Página anterior"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex-1 px-4 py-2 bg-white rounded-xl shadow-md text-center">
            <span className="text-gray-700 font-semibold text-sm">
              {currentPage + 1} / {numPages || 0}
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= (numPages - 1)}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              currentPage >= (numPages - 1)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg active:scale-95'
            }`}
            aria-label="Página siguiente"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Botón de zoom - Solo desktop */}
        <div className="hidden md:block">
          <button
            onClick={toggleZoom}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isZoomed ? (
              <>
                <svg
                  className="w-5 h-5 inline-block mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                  />
                </svg>
                Alejar
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 inline-block mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                  />
                </svg>
                Acercar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contenedor del flipbook con zoom controlado */}
      <div className="relative flex justify-center" style={{ perspective: '1200px' }}>
        <div 
          className="relative bg-gray-300/60 rounded-2xl p-4 shadow-inner overflow-hidden"
          style={{
            width: isZoomed ? `${containerSize.width * 1.5}px` : `${containerSize.width}px`,
            height: isZoomed ? `${containerSize.height * 1.5}px` : `${containerSize.height}px`,
            maxWidth: '90vw',
            maxHeight: '80vh',
            transition: 'width 0.3s ease, height 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="relative w-full h-full overflow-hidden"
          >
            {(() => {
              const isDouble = !isMobile && viewMode === 'double';
              const baseIndex = isDouble ? currentPage - (currentPage % 2) : currentPage;
              const leftIndex = baseIndex;
              const rightIndex = isDouble ? baseIndex + 1 : null;

              // Clases de animación por dirección y lado
              const leftPageClass =
                flipDirection === 'prev' ? 'page-flip-prev' : '';
              const rightPageClass =
                flipDirection === 'next' ? 'page-flip-next' : '';

              const handleClickLeftPage = () => {
                if (isDouble && leftIndex > 0) {
                  handlePrevPage();
                }
              };

              const handleClickRightPage = () => {
                if (isDouble && rightIndex !== null && rightIndex < numPages - 1) {
                  handleNextPage();
                }
              };

              const handleClickSinglePage = (event) => {
                if (!numPages) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const isRightSide = clickX > rect.width / 2;

                if (isRightSide && currentPage < numPages - 1) {
                  handleNextPage();
                } else if (!isRightSide && currentPage > 0) {
                  handlePrevPage();
                }
              };

              return (
                <div
                  ref={flipbookRef}
                  className="flipbook-container bg-white shadow-2xl rounded-lg overflow-hidden relative"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transform: isZoomed ? 'scale(1.5)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s ease',
                    touchAction: 'pan-y pinch-zoom',
                    userSelect: 'none',
                  }}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onTouchCancel={onTouchCancel}
                >
                  {isDouble ? (
                    // Modo double: mostrar par de páginas actual con canvas
                    <div className="flex w-full h-full">
                      {baseIndex < numPages && (
                        <div
                          className="w-1/2 h-full bg-white flex items-center justify-center cursor-pointer border-r border-gray-200 relative"
                          onClick={handleClickLeftPage}
                        >
                          <canvas
                            ref={(el) => {
                              if (el) canvasRefs.current[baseIndex] = el;
                            }}
                            className={`w-full h-full object-contain shadow-xl rounded-sm page-transition ${
                              flipDirection === 'prev' ? 'page-slide-in-left' : 
                              flipDirection === 'next' ? 'page-slide-out-left' : ''
                            }`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              display: renderedPages.has(baseIndex) ? 'block' : 'none'
                            }}
                          />
                          {!renderedPages.has(baseIndex) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {baseIndex + 1 < numPages && (
                        <div
                          className="w-1/2 h-full bg-white flex items-center justify-center cursor-pointer relative"
                          onClick={handleClickRightPage}
                        >
                          <canvas
                            ref={(el) => {
                              if (el) canvasRefs.current[baseIndex + 1] = el;
                            }}
                            className={`w-full h-full object-contain shadow-xl rounded-sm page-transition ${
                              flipDirection === 'prev' ? 'page-slide-in-right' : 
                              flipDirection === 'next' ? 'page-slide-out-right' : ''
                            }`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              display: renderedPages.has(baseIndex + 1) ? 'block' : 'none'
                            }}
                          />
                          {!renderedPages.has(baseIndex + 1) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Modo single: mostrar solo la página actual con canvas
                    <div className="w-full h-full flex items-center justify-center relative">
                      {loading && currentPage === 0 ? (
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-600 mb-4"></div>
                          <p className="text-gray-600">Cargando primera página...</p>
                        </div>
                      ) : (
                        <>
                          <canvas
                            ref={(el) => {
                              if (el) canvasRefs.current[currentPage] = el;
                            }}
                            className={`w-full h-full object-contain shadow-xl rounded-sm page-transition ${
                              flipDirection === 'prev' ? 'page-slide-in-right' : 
                              flipDirection === 'next' ? 'page-slide-in-left' : ''
                            }`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              display: renderedPages.has(currentPage) ? 'block' : 'none'
                            }}
                            onClick={handleClickSinglePage}
                          />
                          {!renderedPages.has(currentPage) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
                                <p className="text-gray-600 text-sm">Cargando página {currentPage + 1}...</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                {/* Hotspots superpuestos - sobre el flipbook */}
                {pageDimensions.width > 0 && (
                  <>
                    {isDouble ? (
                      // Modo double: hotspots en ambas páginas
                      <>
                        {/* Hotspots de la página izquierda */}
                        <div
                          className="absolute top-0 left-0 pointer-events-none"
                          style={{
                            width: (pageDimensions.width || 600) / 2,
                            height: pageDimensions.height || 800,
                          }}
                        >
                          {currentPageHotspots
                            .filter((h) => h.page === leftPageNum)
                            .map((hotspot, index) => {
                              const producto = productos.find((p) => String(p.id) === String(hotspot.idProducto));
                              if (!producto) return null;

                              return (
                                <div key={`left-${hotspot.page}-${hotspot.idProducto}-${index}`} className="pointer-events-auto">
                                  <Hotspot
                                    hotspot={hotspot}
                                    producto={producto}
                                    onHotspotClick={handleHotspotClick}
                                    pageWidth={(pageDimensions.width || 600) / 2}
                                    pageHeight={pageDimensions.height || 800}
                                  />
                                </div>
                              );
                            })}
                        </div>
                        {/* Hotspots de la página derecha */}
                        {rightPageNum && (
                          <div
                            className="absolute top-0 left-1/2 pointer-events-none"
                            style={{
                              width: (pageDimensions.width || 600) / 2,
                              height: pageDimensions.height || 800,
                            }}
                          >
                            {currentPageHotspots
                              .filter((h) => h.page === rightPageNum)
                              .map((hotspot, index) => {
                                const producto = productos.find((p) => String(p.id) === String(hotspot.idProducto));
                                if (!producto) return null;

                                return (
                                  <div key={`right-${hotspot.page}-${hotspot.idProducto}-${index}`} className="pointer-events-auto">
                                    <Hotspot
                                      hotspot={hotspot}
                                      producto={producto}
                                      onHotspotClick={handleHotspotClick}
                                      pageWidth={(pageDimensions.width || 600) / 2}
                                      pageHeight={pageDimensions.height || 800}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    ) : (
                      // Modo single: hotspots en una sola página
                      <div
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: pageDimensions.width || 600,
                          height: pageDimensions.height || 800,
                        }}
                      >
                        {currentPageHotspots.map((hotspot, index) => {
                          const producto = currentPageProducts[index];
                          // Si no hay producto, no renderizar el hotspot
                          if (!producto) {
                            console.warn(`Hotspot sin producto en página ${hotspot.page}:`, hotspot);
                            return null;
                          }

                          return (
                            <div key={`${hotspot.page}-${hotspot.idProducto}-${index}`} className="pointer-events-auto">
                              <Hotspot
                                hotspot={hotspot}
                                producto={producto}
                                onHotspotClick={handleHotspotClick}
                                pageWidth={pageDimensions.width || 600}
                                pageHeight={pageDimensions.height || 800}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          </div>
        </div>
      </div>

      {/* Indicadores de página (dots) - Móvil */}
      {isMobile && numPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap px-4">
          {Array.from({ length: numPages }, (_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentPage(idx);
              }}
              className={`transition-all duration-300 rounded-full ${
                idx === currentPage
                  ? 'w-3 h-3 bg-primary-600 shadow-lg scale-110'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400 active:bg-gray-500'
              }`}
              aria-label={`Ir a página ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-6 text-center text-gray-600">
        <p className="text-sm">
          Haz clic en los puntos destacados para ver más información del producto
        </p>
        {isMobile ? (
          <p className="text-xs mt-2">
            Desliza hacia los lados para cambiar de página • Toca los puntos para saltar a una página
          </p>
        ) : (
          <p className="text-xs mt-2">
            Usa las flechas del teclado, el espacio, o haz clic en los lados de la página para navegar
          </p>
        )}
      </div>

      {/* Modal de producto */}
      <ProductModal
        producto={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}

