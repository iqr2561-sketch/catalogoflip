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
          
          // SOLO usar imágenes JPG - NO renderizar PDFs en el catálogo
          if (data.useImages && data.imageUrls && data.imageUrls.length > 0) {
            setImages(data.imageUrls);
            setPdfUrl(null); // NO pasar PDF si hay imágenes
            console.log(`[catalog] ✓ Usando ${data.imageUrls.length} imágenes JPG (carga rápida, sin PDF)`);
          } else {
            // Si no hay imágenes, mostrar mensaje de error
            setImages(null);
            setPdfUrl(null); // NO usar PDF en el catálogo
            console.warn('[catalog] ⚠ No hay imágenes JPG disponibles. Sube un ZIP con imágenes desde el panel.');
          }
        } else {
          console.warn('[catalog] No se pudo cargar desde API, usando JSON estático');
          setCatalogConfig(catalogData);
          // NO usar PDF, solo imágenes
          if (catalogData.useImages && catalogData.imageUrls && catalogData.imageUrls.length > 0) {
            setImages(catalogData.imageUrls);
            setPdfUrl(null);
          } else {
            setImages(null);
            setPdfUrl(null);
          }
        }
      } catch (err) {
        console.error('[catalog] Error al cargar configuración:', err);
        setCatalogConfig(catalogData);
        // NO usar PDF, solo imágenes
        if (catalogData.useImages && catalogData.imageUrls && catalogData.imageUrls.length > 0) {
          setImages(catalogData.imageUrls);
          setPdfUrl(null);
        } else {
          setImages(null);
          setPdfUrl(null);
        }
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

  if (!loading && !images) {
    return (
      <>
        <Head>
          <title>Catálogo vacío - Catálogo Interactivo</title>
        </Head>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <ConfigButton />
          <div className="text-center max-w-md mx-4">
            <div className="text-5xl mb-4">🖼️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">No hay imágenes disponibles</h1>
            <p className="text-gray-600 mb-4">
              El catálogo solo funciona con imágenes JPG. Por favor, sube un ZIP con imágenes JPG desde el panel de administración.
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

        {catalogConfig && images && images.length > 0 && (
          <FlipbookCatalog
            pdfUrl={null}
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
