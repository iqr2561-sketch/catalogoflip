import { useState, useEffect } from 'react';
import Head from 'next/head';
import FlipbookCatalog from '../components/FlipbookCatalog';
import Cart from '../components/Cart';
import ConfigButton from '../components/ConfigButton';
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
      try {
        setLoading(true);
        setError(null);
        
        const numPages = catalogConfig.numPages || 1;
        
        // Intentar cargar imágenes pre-generadas desde el servidor
        const imageUrls = [];
        let allImagesExist = true;
        
        for (let page = 1; page <= numPages; page++) {
          try {
            const response = await fetch(`/api/pdf-images?page=${page}`);
            if (response.ok) {
              // Si la imagen existe, usar la URL del servidor
              imageUrls.push(`/api/pdf-images?page=${page}`);
            } else {
              allImagesExist = false;
              break;
            }
          } catch (e) {
            allImagesExist = false;
            break;
          }
        }
        
        if (allImagesExist && imageUrls.length > 0) {
          // Cargar imágenes desde URLs (más rápido)
          setImages(imageUrls);
          setLoading(false);
          return;
        }
        
        // Si no existen imágenes pre-generadas, convertir PDF (solo primera vez)
        console.log('Imágenes no encontradas, convirtiendo PDF...');
        const pdfUrl = catalogConfig.pdf || '/api/catalogo';
        const pdfImages = await pdfToImages(pdfUrl);
        setImages(pdfImages);
        
        // Guardar las imágenes en el servidor para próximas cargas
        try {
          await fetch('/api/generate-images', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              images: pdfImages,
              pageNumbers: Array.from({ length: pdfImages.length }, (_, i) => i + 1),
            }),
          });
          console.log('Imágenes guardadas en el servidor para próximas cargas');
        } catch (saveError) {
          console.warn('No se pudieron guardar las imágenes en el servidor:', saveError);
          // Continuar sin error, las imágenes ya están cargadas
        }
      } catch (err) {
        console.error('Error al cargar el catálogo:', err);
        setError('Error al cargar el catálogo. Por favor, asegúrate de que el archivo PDF existe.');
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [catalogConfig]);

  const handleFileUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const arrayBuffer = await file.arrayBuffer();
      const pdfImages = await pdfToImages(arrayBuffer);
      setImages(pdfImages);
    } catch (err) {
      console.error('Error al cargar el PDF desde archivo:', err);
      setError('No se pudo cargar el archivo PDF seleccionado. Por favor, intenta con otro archivo.');
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
              Convirtiendo PDF a imágenes
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
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar el catálogo</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-600 text-sm mb-6">
              Si el archivo <code>public/catalogo.pdf</code> no existe o no es accesible, puedes cargar un PDF manualmente
              desde tu equipo para visualizarlo como flipbook. También puedes usar el botón de <strong>Configuración</strong> arriba a la derecha.
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
                Reintentar
              </button>
            </div>
          </div>
        </div>
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
        <Cart />
      </main>
    </>
  );
}

