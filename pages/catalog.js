import { useState, useEffect } from 'react';
import Head from 'next/head';
import FlipbookCatalog from '../components/FlipbookCatalog';
import Cart from '../components/Cart';
import ConfigButton from '../components/ConfigButton';
import ErrorDisplay from '../components/ErrorDisplay';
import catalogData from '../data/catalog.json'; // Fallback

export default function CatalogPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [images, setImages] = useState(null); // Array de URLs de imágenes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogConfig, setCatalogConfig] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState('');

  // Cargar configuración del catálogo
  useEffect(() => {
    const loadCatalogConfig = async () => {
      try {
        setLoadingProgress('Cargando configuración...');
        const response = await fetch('/api/catalog-config');
        if (response.ok) {
          const data = await response.json();
          setCatalogConfig(data);
          
          // Priorizar imágenes sobre PDF para carga más rápida
          if (data.useImages && data.imageUrls && data.imageUrls.length > 0) {
            setImages(data.imageUrls);
            setPdfUrl(null);
            console.log(`[catalog] ✓ Usando ${data.imageUrls.length} imágenes del catálogo (carga rápida)`);
          } else if (data.pdf) {
            // Fallback a PDF si no hay imágenes
            const pdfUrl = data.pdf || '/api/catalogo';
            setPdfUrl(pdfUrl);
            setImages(null);
            console.log(`[catalog] Usando PDF: ${pdfUrl}`);
          } else {
            setPdfUrl('/api/catalogo');
            setImages(null);
          }
        } else {
          console.warn('[catalog] No se pudo cargar desde API, usando JSON estático');
          setCatalogConfig(catalogData);
          setPdfUrl('/api/catalogo');
          setImages(null);
        }
      } catch (err) {
        console.error('[catalog] Error al cargar configuración:', err);
        setCatalogConfig(catalogData);
        setPdfUrl('/api/catalogo');
        setImages(null);
      } finally {
        setLoading(false);
        setLoadingProgress('');
      }
    };

    loadCatalogConfig();
  }, []);

  if (loading) {
    return (
      <>
        <Head>
          <title>Catálogo Interactivo - Cargando...</title>
        </Head>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center max-w-md mx-4">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mb-4"></div>
            <p className="text-gray-700 text-lg font-semibold">
              {loadingProgress || 'Cargando catálogo...'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              La primera carga puede tardar un momento
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

  if (!loading && !pdfUrl && !images) {
    return (
      <>
        <Head>
          <title>Catálogo vacío - Catálogo Interactivo</title>
        </Head>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center max-w-md mx-4">
            <div className="text-5xl mb-4">📄</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo cargar el catálogo</h1>
            <p className="text-gray-600 mb-4">
              No se encontró el PDF o imágenes del catálogo. Por favor, sube un PDF o un ZIP con imágenes JPG desde el panel de administración.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              Recargar
            </button>
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
        <ConfigButton />

        {catalogConfig && (pdfUrl || images) && (
          <FlipbookCatalog
            pdfUrl={pdfUrl}
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
