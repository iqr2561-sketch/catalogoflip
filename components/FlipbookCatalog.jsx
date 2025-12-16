import { useEffect, useRef, useState } from 'react';
import Hotspot from './Hotspot';
import ProductModal from './ProductModal';

export default function FlipbookCatalog({
  images,
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
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePrevPage = () => {
    setFlipDirection('prev');
    setCurrentPage((prev) => {
      if (!isMobile && viewMode === 'double') {
        const base = prev - (prev % 2); // index de la página izquierda actual
        const target = Math.max(0, base - 2);
        return target;
      }
      return Math.max(0, prev - 1);
    });
  };

  const handleNextPage = () => {
    setFlipDirection('next');
    setCurrentPage((prev) => {
      if (!isMobile && viewMode === 'double') {
        const base = prev - (prev % 2);
        const target = base + 2;
        return target >= images.length ? prev : target;
      }
      return Math.min(images.length - 1, prev + 1);
    });
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Asegurar que la página actual sea válida cuando cambian imágenes o modo de vista
  useEffect(() => {
    if (currentPage >= images.length && images.length > 0) {
      setCurrentPage(0);
    }
  }, [images.length, currentPage]);

  // Limpiar estado de animación después de cada vuelta de página
  useEffect(() => {
    if (!flipDirection) return;
    const timeoutId = setTimeout(() => setFlipDirection(null), 400);
    return () => clearTimeout(timeoutId);
  }, [flipDirection]);

  // Obtener hotspots de las páginas visibles (solo los habilitados)
  const isDouble = !isMobile && viewMode === 'double';
  const baseIndex = isDouble ? currentPage - (currentPage % 2) : currentPage;
  const leftPageNum = baseIndex + 1;
  const rightPageNum = isDouble && baseIndex + 1 < images.length ? baseIndex + 2 : null;
  
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
              Página {currentPage + 1} de {images.length}
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === images.length - 1}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              currentPage === images.length - 1
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
              {currentPage + 1} / {images.length}
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === images.length - 1}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              currentPage === images.length - 1
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
          }}
        >
          <div
            className="relative w-full h-full overflow-auto"
            style={{
              scrollbarWidth: 'thin',
            }}
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
                if (isDouble && rightIndex !== null && rightIndex < images.length - 1) {
                  handleNextPage();
                }
              };

              const handleClickSinglePage = (event) => {
                if (!images.length) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const isRightSide = clickX > rect.width / 2;

                if (isRightSide && currentPage < images.length - 1) {
                  handleNextPage();
                } else if (!isRightSide && currentPage > 0) {
                  handlePrevPage();
                }
              };

              return (
                <div
                  ref={flipbookRef}
                  className="flipbook-container flex bg-white shadow-2xl rounded-lg overflow-hidden mx-auto"
                  style={{
                    position: 'relative',
                    width: `${containerSize.width}px`,
                    height: `${containerSize.height}px`,
                    transform: isZoomed ? 'scale(1.5)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s ease',
                  }}
                >
            {isDouble ? (
              <>
                {images[leftIndex] && (
                  <div
                    className={`w-1/2 h-full bg-white flex items-center justify-center ${leftPageClass} cursor-pointer`}
                    onClick={handleClickLeftPage}
                  >
                    <img
                      src={images[leftIndex]}
                      alt={`Página ${leftIndex + 1}`}
                      className="object-contain w-[95%] h-[95%] shadow-xl rounded-sm"
                    />
                  </div>
                )}
                {rightIndex !== null && rightIndex < images.length && images[rightIndex] && (
                  <div
                    className={`w-1/2 h-full bg-white flex items-center justify-center border-l border-gray-200 ${rightPageClass} cursor-pointer`}
                    onClick={handleClickRightPage}
                  >
                    <img
                      src={images[rightIndex]}
                      alt={`Página ${rightIndex + 1}`}
                      className="object-contain w-[95%] h-[95%] shadow-xl rounded-sm transition-opacity duration-300"
                      loading={rightIndex <= 2 ? "eager" : "lazy"}
                      style={{ opacity: loadedImages.has(images[rightIndex]) ? 1 : 0.3 }}
                      onLoad={(e) => {
                        setLoadedImages(prev => new Set([...prev, images[rightIndex]]));
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              images[currentPage] && (
                <div
                  className={`w-full h-full bg-white flex items-center justify-center ${
                    flipDirection ? (flipDirection === 'next' ? 'page-flip-next' : 'page-flip-prev') : ''
                  } cursor-pointer`}
                  onClick={handleClickSinglePage}
                >
                  <img
                    src={images[currentPage]}
                    alt={`Página ${currentPage + 1}`}
                    className="object-contain w-[95%] h-[95%] shadow-xl rounded-sm transition-opacity duration-300"
                    loading={currentPage <= 2 ? "eager" : "lazy"}
                    style={{ opacity: loadedImages.has(images[currentPage]) ? 1 : 0.3 }}
                    onLoad={(e) => {
                      setLoadedImages(prev => new Set([...prev, images[currentPage]]));
                    }}
                  />
                </div>
              )
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

      {/* Instrucciones */}
      <div className="mt-6 text-center text-gray-600">
        <p className="text-sm">
          Haz clic en los puntos destacados para ver más información del producto
        </p>
        <p className="text-xs mt-2">
          Arrastra las esquinas o usa las flechas para pasar las páginas
        </p>
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

