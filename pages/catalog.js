import { useState, useEffect } from 'react';
import Head from 'next/head';
import FlipbookCatalog from '../components/FlipbookCatalog';
import Cart from '../components/Cart';
import ConfigButton from '../components/ConfigButton';
import ErrorDisplay from '../components/ErrorDisplay';
import { pdfToImages } from '../lib/pdfToImages';
import catalogData from '../data/catalog.json'; // Fallback

export default function CatalogPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogConfig, setCatalogConfig] = useState(null);

  // Cargar configuración del catálogo desde la API (MongoDB o JSON)
  useEffect(() => {
    const loadCatalogConfig = async () => {
      try {
        const response = await fetch('/api/catalog-config');
        if (response.ok) {
          const data = await response.json();
          setCatalogConfig(data);
        } else {
          // Si falla la API, usar datos del JSON estático
          console.warn('No se pudo cargar desde API, usando JSON estático');
          setCatalogConfig(catalogData);
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
        // Fallback a JSON estático
        setCatalogConfig(catalogData);
      }
    };

    loadCatalogConfig();
  }, []);

  // Cargar imágenes del catálogo
  useEffect(() => {
    if (!catalogConfig) return;

    const loadImages = async () => {
      const startTime = Date.now();
      const errorLogs = [];
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('[catalog] Iniciando carga de imágenes del catálogo...');
        const numPages = catalogConfig.numPages || 1;
        console.log(`[catalog] Configuración detectada: ${numPages} páginas`);
        
        // Intentar cargar imágenes pre-generadas desde el servidor
        // Verificar primero si las imágenes están generadas
        let checkImagesResponse;
        let configData = null;
        try {
          checkImagesResponse = await fetch('/api/catalog-config');
          if (checkImagesResponse.ok) {
            configData = await checkImagesResponse.json();
            console.log('[catalog] Configuración cargada desde API:', {
              imagesGenerated: configData?.imagesGenerated,
              numPages: configData?.numPages,
            });
          } else {
            errorLogs.push(`[${new Date().toISOString()}] Error HTTP al cargar configuración: ${checkImagesResponse.status}`);
            console.warn('[catalog] No se pudo cargar configuración desde API');
          }
        } catch (configError) {
          errorLogs.push(`[${new Date().toISOString()}] Error al cargar configuración: ${configError.message}`);
          console.error('[catalog] Error al cargar configuración:', {
            message: configError.message,
            stack: configError.stack,
          });
        }
        
        const imagesGenerated = configData?.imagesGenerated || false;
        let validUrls = [];
        
        if (imagesGenerated && numPages > 0) {
          console.log(`[catalog] Intentando cargar ${numPages} imágenes pre-generadas desde el servidor...`);
          // Las imágenes ya están generadas, cargarlas directamente
          // Cargar todas las imágenes en paralelo para mayor velocidad
          const imagePromises = [];
          for (let page = 1; page <= numPages; page++) {
            imagePromises.push(
              fetch(`/api/pdf-images?page=${page}`)
                .then(response => {
                  if (response.ok) {
                    console.log(`[catalog] ✓ Imagen de página ${page} cargada exitosamente`);
                    return `/api/pdf-images?page=${page}`;
                  } else {
                    const errorMsg = `Imagen de página ${page} no encontrada (HTTP ${response.status})`;
                    errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
                    console.warn(`[catalog] ${errorMsg}`);
                    return null;
                  }
                })
                .catch((err) => {
                  const errorMsg = `Error al cargar imagen de página ${page}: ${err.message}`;
                  errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
                  console.error(`[catalog] ${errorMsg}`, {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                  });
                  return null;
                })
            );
          }
          
          const results = await Promise.all(imagePromises);
          validUrls = results.filter(url => url !== null);
          
          if (validUrls.length === numPages) {
            // Todas las imágenes existen, cargarlas
            const loadTime = Date.now() - startTime;
            setImages(validUrls);
            setLoading(false);
            console.log(`[catalog] ✓ ${validUrls.length} imágenes cargadas desde el servidor en ${loadTime}ms`);
            return;
          } else {
            const warningMsg = `No todas las imágenes pre-generadas se encontraron (${validUrls.length}/${numPages})`;
            errorLogs.push(`[${new Date().toISOString()}] ${warningMsg}`);
            console.warn(`[catalog] ${warningMsg}`);
          }
        }
        
        // Si no existen imágenes pre-generadas, convertir PDF (solo como fallback)
        console.warn('[catalog] Imágenes no encontradas o no generadas, convirtiendo PDF en cliente (fallback)...');
        console.log('[catalog] Estado actual:', {
          imagesGenerated,
          numPages,
          validUrlsCount: validUrls.length,
          timestamp: new Date().toISOString(),
        });
        
        const pdfUrl = catalogConfig.pdf || '/api/catalogo';
        console.log(`[catalog] Intentando cargar PDF desde: ${pdfUrl}`);
        
        let pdfImages;
        try {
          pdfImages = await pdfToImages(pdfUrl);
          console.log(`[catalog] ✓ PDF convertido exitosamente: ${pdfImages.length} imágenes generadas`);
        } catch (pdfError) {
          const errorDetails = {
            message: pdfError.message,
            name: pdfError.name,
            stack: pdfError.stack,
            pdfUrl,
            timestamp: new Date().toISOString(),
          };
          errorLogs.push(`[${new Date().toISOString()}] Error crítico al convertir PDF: ${pdfError.message}`);
          console.error('[catalog] Error crítico al convertir PDF:', errorDetails);
          throw new Error(`Error al convertir PDF: ${pdfError.message}. Logs: ${errorLogs.join('; ')}`);
        }
        
        setImages(pdfImages);
        
        // Guardar las imágenes en el servidor para próximas cargas
        try {
          console.log('[catalog] Intentando guardar imágenes en el servidor...');
          const saveResponse = await fetch('/api/generate-images', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              images: pdfImages,
              pageNumbers: Array.from({ length: pdfImages.length }, (_, i) => i + 1),
            }),
          });
          
          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            console.log('[catalog] ✓ Imágenes guardadas en el servidor exitosamente');
          } else {
            const errorData = await saveResponse.json().catch(() => ({ error: 'Error desconocido' }));
            const errorMsg = `Error al guardar imágenes (HTTP ${saveResponse.status}): ${JSON.stringify(errorData)}`;
            errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
            console.error('[catalog] Error al guardar imágenes en el servidor:', {
              status: saveResponse.status,
              data: errorData,
            });
          }
        } catch (saveError) {
          const errorMsg = `Error al guardar imágenes: ${saveError.message}`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.error('[catalog] Error al guardar las imágenes en el servidor:', {
            message: saveError.message,
            stack: saveError.stack,
            name: saveError.name,
          });
          // Continuar sin error, las imágenes ya están cargadas
        }
      } catch (err) {
        const errorDetails = {
          message: err.message,
          name: err.name,
          stack: err.stack,
          timestamp: new Date().toISOString(),
          logs: errorLogs,
        };
        console.error('[catalog] Error crítico al cargar el catálogo:', errorDetails);
        const errorMessage = errorLogs.length > 0 
          ? `Error al cargar el catálogo. Logs: ${errorLogs.join('; ')}`
          : `Error al cargar el catálogo: ${err.message}`;
        setError(errorMessage);
      } finally {
        const totalTime = Date.now() - startTime;
        console.log(`[catalog] Proceso de carga completado en ${totalTime}ms`);
        setLoading(false);
      }
    };

    loadImages();
  }, [catalogConfig]);

  const handleFileUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const errorLogs = [];
    
    try {
      setLoading(true);
      setError(null);

      // Validar tipo de archivo
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('El archivo seleccionado no es un PDF válido');
      }

      // Validar tamaño (máximo 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo es 50MB`);
      }

      if (file.size === 0) {
        throw new Error('El archivo está vacío');
      }

      console.log(`[catalog] Cargando PDF desde archivo: ${file.name} (${file.size} bytes)`);
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Validar que el buffer comience con %PDF
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = String.fromCharCode(...uint8Array.slice(0, 4));
      if (header !== '%PDF') {
        throw new Error('El archivo no parece ser un PDF válido. El formato del archivo es incorrecto.');
      }

      const pdfImages = await pdfToImages(arrayBuffer);
      
      if (!pdfImages || pdfImages.length === 0) {
        throw new Error('No se pudieron generar imágenes del PDF. El archivo puede estar corrupto.');
      }
      
      console.log(`[catalog] ✓ PDF cargado exitosamente: ${pdfImages.length} imágenes generadas`);
      setImages(pdfImages);
    } catch (err) {
      const errorDetails = {
        message: err.message,
        name: err.name,
        stack: err.stack,
        logs: errorLogs,
        timestamp: new Date().toISOString(),
      };
      console.error('[catalog] Error al cargar el PDF desde archivo:', errorDetails);
      
      const enhancedError = new Error(err.message);
      enhancedError.originalError = err;
      enhancedError.logs = errorLogs;
      enhancedError.stack = err.stack;
      setError(enhancedError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Catálogo Interactivo - Cargando...</title>
        </Head>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mb-4"></div>
            <p className="text-gray-700 text-lg font-semibold">
              Cargando catálogo...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {images.length > 0 ? 'Cargando imágenes...' : 'Convirtiendo PDF a imágenes...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Error - Catálogo Interactivo</title>
        </Head>
        <ConfigButton />
        <ErrorDisplay
          error={error}
          onRetry={() => {
            setError(null);
            window.location.reload();
          }}
          onDismiss={() => setError(null)}
        />
      </>
    );
  }

  // Fallback: si no hubo error pero tampoco se generaron imágenes
  if (!loading && !error && images.length === 0) {
    return (
      <>
        <Head>
          <title>Catálogo vacío - Catálogo Interactivo</title>
        </Head>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center max-w-md mx-4">
            <div className="text-5xl mb-4">📄</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudieron generar páginas del catálogo</h1>
            <p className="text-gray-600 mb-4">
              El PDF se ha cargado pero no se han generado imágenes de sus páginas. Esto puede deberse a un problema con el
              archivo PDF o con el conversor.
            </p>
            <p className="text-gray-600 text-sm mb-6">
              Prueba a cargar un PDF diferente desde tu equipo o usa el botón de <strong>Configuración</strong> arriba a la derecha.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="inline-block cursor-pointer">
                <span className="px-6 py-3 bg-white border border-primary-600 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors inline-block">
                  Seleccionar PDF
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                Recargar
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Catálogo Interactivo</title>
        <meta name="description" content="Catálogo interactivo tipo flipbook" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="relative">
        {/* Botón de configuración siempre visible (abre modal de acceso al panel) */}
        <ConfigButton />

        {catalogConfig && (
          <FlipbookCatalog
            images={images}
            hotspots={catalogConfig.hotspots || []}
            productos={catalogConfig.productos || []}
            whatsappNumber={catalogConfig.whatsappNumber || null}
          />
        )}
        <Cart whatsappNumber={catalogConfig?.whatsappNumber || null} />
      </main>
    </>
  );
}

