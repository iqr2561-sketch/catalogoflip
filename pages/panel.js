import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Toast from '../components/Toast';

export default function PanelDeControl() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'marcadores' | 'configuracion'
  const [bulkCount, setBulkCount] = useState(1);
  const [productosPage, setProductosPage] = useState(1);
  const [hotspotsPage, setHotspotsPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(null);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [bulkHotspotCount, setBulkHotspotCount] = useState(1);
  const [bulkHotspotStartPage, setBulkHotspotStartPage] = useState(1);
  const [bulkHotspotEndPage, setBulkHotspotEndPage] = useState(1);
  const [globalPosition, setGlobalPosition] = useState({ x: 50, y: 50, width: 20, height: 20 });
  const [selectedHotspots, setSelectedHotspots] = useState(new Set());
  const itemsPerPage = 10; // Productos por página
  const hotspotsPerPage = 15; // Hotspots por página

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/catalog-config');
        const data = await res.json();
        // Solo normalizar los hotspots existentes, NO crear nuevos
        const normalized = {
          ...data,
          hotspots: (data.hotspots || []).map((h) => ({
            enabled: h.enabled !== undefined ? h.enabled : false,
            ...h,
          })),
        };
        setConfig(normalized);
        // Inicializar página final con el número de páginas si está disponible
        if (normalized.numPages) {
          setBulkHotspotEndPage(normalized.numPages);
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
        setError('No se pudo cargar la configuración del catálogo.');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleProductoChange = (id, field, value) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === 'precio'
                  ? Number.isNaN(parseInt(value, 10))
                    ? 0
                    : parseInt(value, 10)
                  : field === 'page'
                  ? Number.isNaN(parseInt(value, 10))
                    ? 1
                    : Math.max(1, Math.min(prev.numPages || 1, parseInt(value, 10)))
                  : value,
            }
          : p
      );
      return {
        ...prev,
        productos: updatedProductos,
      };
    });
  };

  const handleBulkAddProductos = (cantidad) => {
    const count = Math.max(1, Math.min(100, cantidad || 1));

    setConfig((prev) => {
      const productos = [...prev.productos];

      let nextIndex = productos.length + 1;

      for (let i = 0; i < count; i++) {
        const newId = `p${String(nextIndex).padStart(3, '0')}`;
        nextIndex++;

        productos.push({
          id: newId,
          nombre: `Nuevo producto ${newId}`,
          precio: 0,
          imagen: '',
          descripcion: '',
        });
      }

      return {
        ...prev,
        productos,
      };
    });
  };

  const handleAddProducto = () => {
    handleBulkAddProductos(1);
  };

  const handleDeleteProducto = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    let updatedConfig = null;

    setConfig((prev) => {
      const remaining = prev.productos.filter((p) => p.id !== id);
      const fallbackId = remaining[0]?.id || '';

      updatedConfig = {
        ...prev,
        productos: remaining,
        hotspots: prev.hotspots.map((h) =>
          h.idProducto === id ? { ...h, idProducto: fallbackId } : h
        ),
      };

      return updatedConfig;
    });

    // Guardar automáticamente después de eliminar
    if (updatedConfig) {
      try {
        setSaving(true);
        const res = await fetch('/api/catalog-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedConfig, null, 2),
        });

        if (res.ok) {
          setMessage('Producto eliminado y cambios guardados');
          setTimeout(() => setMessage(null), 3000);
        } else {
          setError('Producto eliminado localmente, pero no se pudo guardar. Guarda manualmente.');
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        console.error('Error al guardar después de eliminar:', err);
        setError('Producto eliminado localmente, pero no se pudo guardar. Guarda manualmente.');
        setTimeout(() => setError(null), 5000);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleHotspotToggle = (index, enabled) => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h, i) => (i === index ? { ...h, enabled } : h)),
    }));
  };

  const handleHotspotFieldChange = (index, field, value) => {
    const num = parseFloat(value);
    const safe =
      Number.isNaN(num) || !Number.isFinite(num)
        ? 0
        : Math.min(100, Math.max(0, num));

    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h, i) =>
        i === index
          ? {
              ...h,
              [field]: safe,
            }
          : h
      ),
    }));
  };

  const handleHotspotPageChange = (index, value) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return;
    const maxPage = typeof config?.numPages === 'number' ? config.numPages : num;
    const safe = Math.min(maxPage, Math.max(1, num));

    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h, i) =>
        i === index
          ? {
              ...h,
              page: safe,
            }
          : h
      ),
    }));
  };

  const handleHotspotProductChange = (index, value) => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h, i) =>
        i === index
          ? {
              ...h,
              idProducto: value,
            }
          : h
      ),
    }));
  };

  const handleAddHotspot = () => {
    setConfig((prev) => {
      const defaultProductId = prev.productos[0]?.id || '';
      return {
        ...prev,
        hotspots: [
          ...prev.hotspots,
          {
            page: 1,
            idProducto: defaultProductId,
            enabled: false, // Por defecto deshabilitado
            x: globalPosition.x,
            y: globalPosition.y,
            width: globalPosition.width,
            height: globalPosition.height,
          },
        ],
      };
    });
  };

  const handleBulkAddHotspots = (cantidad, startPage, endPage, position) => {
    const count = Math.max(1, Math.min(100, cantidad || 1));
    const maxPages = config?.numPages || 1;
    const start = Math.max(1, Math.min(maxPages, startPage || 1));
    const end = endPage ? Math.max(start, Math.min(maxPages, endPage)) : null;
    const pos = position || globalPosition;

    setConfig((prev) => {
      const defaultProductId = prev.productos[0]?.id || '';
      const newHotspots = [];
      
      if (end && end >= start) {
        // Usar rango de páginas
        const pages = [];
        for (let p = start; p <= end && pages.length < count; p++) {
          pages.push(p);
        }
        pages.forEach((page) => {
          newHotspots.push({
            page: page,
            idProducto: defaultProductId,
            enabled: false,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
          });
        });
      } else {
        // Modo secuencial (comportamiento anterior)
        for (let i = 0; i < count; i++) {
          const page = start + i;
          if (page <= maxPages) {
            newHotspots.push({
              page: page,
              idProducto: defaultProductId,
              enabled: false,
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height,
            });
          }
        }
      }

      return {
        ...prev,
        hotspots: [...prev.hotspots, ...newHotspots],
      };
    });
  };

  const handleBulkDeleteHotspots = async () => {
    if (selectedHotspots.size === 0) {
      alert('Selecciona al menos un marcador para eliminar');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres eliminar ${selectedHotspots.size} marcador(es)?`)) {
      return;
    }

    let updatedConfig = null;
    const countToDelete = selectedHotspots.size;

    setConfig((prev) => {
      const indicesToDelete = Array.from(selectedHotspots).sort((a, b) => b - a); // Ordenar descendente
      const newHotspots = prev.hotspots.filter((_, index) => !indicesToDelete.includes(index));
      
      updatedConfig = {
        ...prev,
        hotspots: newHotspots,
      };

      return updatedConfig;
    });

    setSelectedHotspots(new Set());

    // Guardar automáticamente después de eliminar
    if (updatedConfig) {
      try {
        setSaving(true);
        const res = await fetch('/api/catalog-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedConfig, null, 2),
        });

        if (res.ok) {
          setMessage(`${countToDelete} marcador(es) eliminado(s) y cambios guardados`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setError('Marcadores eliminados localmente, pero no se pudo guardar. Guarda manualmente.');
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        console.error('Error al guardar después de eliminar:', err);
        setError('Marcadores eliminados localmente, pero no se pudo guardar. Guarda manualmente.');
        setTimeout(() => setError(null), 5000);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSelectAllHotspots = () => {
    const currentPageIndices = [];
    const start = (hotspotsPage - 1) * hotspotsPerPage;
    const end = Math.min(start + hotspotsPerPage, config.hotspots.length);
    
    for (let i = start; i < end; i++) {
      currentPageIndices.push(i);
    }

    if (currentPageIndices.every(idx => selectedHotspots.has(idx))) {
      // Deseleccionar todos de la página actual
      const newSelected = new Set(selectedHotspots);
      currentPageIndices.forEach(idx => newSelected.delete(idx));
      setSelectedHotspots(newSelected);
    } else {
      // Seleccionar todos de la página actual
      const newSelected = new Set(selectedHotspots);
      currentPageIndices.forEach(idx => newSelected.add(idx));
      setSelectedHotspots(newSelected);
    }
  };

  const handleApplyGlobalPosition = () => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h) => ({
        ...h,
        x: globalPosition.x,
        y: globalPosition.y,
        width: globalPosition.width,
        height: globalPosition.height,
      })),
    }));
    setMessage('Posición global aplicada a todos los marcadores');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const res = await fetch('/api/catalog-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config, null, 2),
      });

      if (!res.ok) {
        throw new Error('Error HTTP ' + res.status);
      }

      setMessage('Cambios guardados correctamente');
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      setError('No se pudieron guardar los cambios. Revisa la consola para más detalles.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones del archivo
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor, selecciona un archivo PDF válido.');
      return;
    }

    // Validar tamaño máximo
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo es 50MB`);
      return;
    }

    if (file.size === 0) {
      setError('El archivo está vacío. Por favor, selecciona un PDF válido.');
      return;
    }

    setPdfUploading(true);
    setError(null);
    setMessage(null);
    setPdfFile(file);
    setPdfPageCount(null);

    const errorLogs = [];

    try {
      console.log(`[panel] Iniciando subida de PDF por chunks: ${file.name} (${file.size} bytes)`);
      
      // Subir en chunks para evitar el límite de 4.5MB de Vercel
      const chunkSize = 2 * 1024 * 1024; // 2MB por chunk (más pequeño para mayor confiabilidad)
      const totalChunks = Math.ceil(file.size / chunkSize);
      const sessionId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      console.log(`[panel] Archivo dividido en ${totalChunks} chunks de ~${(chunkSize / 1024 / 1024).toFixed(2)}MB`);
      setMessage(`Subiendo PDF: 0/${totalChunks} partes...`);
      
      // Leer el archivo completo
      const arrayBuffer = await file.arrayBuffer();
      // Crear una copia del buffer para evitar "detached ArrayBuffer" si pdf.js lo consume
      const bufferCopy = arrayBuffer.slice(0);
      const uint8Array = new Uint8Array(bufferCopy);
      
      // Obtener cantidad de páginas para informar al usuario (usando copia separada)
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Usar otra copia para pdf.js
        const pdfBufferCopy = arrayBuffer.slice(0);
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfBufferCopy }).promise;
        setPdfPageCount(pdfDoc.numPages);
        setMessage(`PDF detectado con ${pdfDoc.numPages} páginas. Preparando subida...`);
      } catch (pageCountError) {
        console.warn('[panel] No se pudo leer el número de páginas antes de subir:', pageCountError);
      }

      // Subir cada chunk
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunkArray = uint8Array.slice(start, end);
        
        // Convertir a base64
        let binary = '';
        for (let j = 0; j < chunkArray.length; j++) {
          binary += String.fromCharCode(chunkArray[j]);
        }
        const chunkBase64 = btoa(binary);
        
        console.log(`[panel] Subiendo chunk ${i + 1}/${totalChunks} (${chunkArray.length} bytes)`);
        setMessage(`Subiendo PDF: ${i + 1}/${totalChunks} partes...`);
        
        try {
          const res = await fetch('/api/upload-pdf-chunk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              chunkIndex: i,
              totalChunks,
              chunkData: chunkBase64,
              filename: file.name,
            }),
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || `Error al subir chunk ${i + 1}/${totalChunks}`);
          }
          
          const data = await res.json();
          console.log(`[panel] Chunk ${i + 1}/${totalChunks} subido exitosamente`);
          
          // Si es el último chunk y se ensambló correctamente
          if (data.assembled) {
            console.log(`[panel] PDF ensamblado exitosamente en el servidor`);
            setMessage('PDF subido exitosamente. Generando imágenes...');
            
            // Generar imágenes del PDF
            try {
              const genRes = await fetch('/api/generate-pdf-images', {
                method: 'POST',
              });
              
              if (genRes.ok) {
                const genData = await genRes.json();
                setMessage(`✓ PDF cargado y ${genData.numPages || 0} imágenes generadas exitosamente.`);
                
                // Recargar configuración
                setTimeout(async () => {
                  try {
                    const configRes = await fetch('/api/catalog-config');
                    if (configRes.ok) {
                      const newConfig = await configRes.json();
                      setConfig(newConfig);
                    }
                  } catch (err) {
                    console.error('[panel] Error al recargar configuración:', err);
                  }
                }, 1000);
              } else {
                const genError = await genRes.json().catch(() => ({ error: 'Error desconocido' }));
                setMessage(`PDF subido, pero hubo un error al generar imágenes: ${genError.error}. Se generarán en la primera carga.`);
              }
            } catch (genError) {
              console.error('[panel] Error al generar imágenes:', genError);
              setMessage('PDF subido exitosamente. Las imágenes se generarán en la primera carga del catálogo.');
            }

            await fetchPdfList();
          }
        } catch (chunkError) {
          const errorMsg = `Error al subir chunk ${i + 1}/${totalChunks}: ${chunkError.message || chunkError}`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.error('[panel]', errorMsg, chunkError);
          throw new Error(errorMsg);
        }
      }
      
      setPdfFile(null);
    } catch (err) {
      const errorDetails = {
        message: err.message || String(err),
        name: err.name,
        logs: errorLogs,
        timestamp: new Date().toISOString(),
      };
      console.error('[panel] Error al subir PDF:', errorDetails);
      
      const errorMessage = errorLogs.length > 0 
        ? `Error al subir el archivo PDF: ${err.message}`
        : `Error al subir el archivo PDF: ${err.message}`;
      
      setError(errorMessage);
      setPdfFile(null);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleDeleteHotspot = (index) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este marcador?')) {
      return;
    }
    
    const updated = { ...config };
    updated.hotspots = updated.hotspots.filter((_, i) => i !== index);
    setConfig(updated);
    setMessage('Marcador eliminado. Recuerda guardar los cambios.');
  };

  const handleTestDatabase = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    setError(null);
    
    try {
      const res = await fetch('/api/db-check');
      const data = await res.json();
      setDbTestResult(data);
      
      if (!data.ok) {
        setError(data.error || 'Error al conectar con la base de datos');
      } else {
        setMessage('Conexión a la base de datos exitosa');
      }
    } catch (err) {
      console.error('Error al probar conexión:', err);
      setDbTestResult({
        ok: false,
        error: 'Error al probar la conexión',
        details: err.message,
        logs: [`[${new Date().toISOString()}] Error: ${err.message}`],
      });
      setError('No se pudo probar la conexión a la base de datos');
    } finally {
      setDbTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-gray-700 text-lg font-semibold">Cargando panel de control...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-red-600 text-lg font-semibold">
          No se pudo cargar la configuración. Revisa el servidor.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Panel de Control - Catálogo Interactivo</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header fijo con animación */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-md border-b border-gray-200 shadow-lg animate-slideDown">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                    Panel de Control
                  </h1>
              {typeof config?.numPages === 'number' && config.numPages > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-50 border border-primary-200">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-primary-700">
                    <span className="text-primary-600">{config.numPages}</span> páginas
                  </span>
                </div>
              )}
                </div>
                <p className="text-gray-600 mt-1 text-xs md:text-sm">
                  Gestiona productos, marcadores y configuración del catálogo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/catalog')}
                  className="px-3 py-1.5 rounded-lg border border-primary-300 text-primary-700 text-xs md:text-sm font-semibold bg-primary-50 hover:bg-primary-100 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Catálogo
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-xs md:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Espaciador para el header fijo */}
        <div className="h-20 md:h-24"></div>

        {/* Toast notifications */}
        <Toast
          message={message}
          type="success"
          onClose={() => setMessage(null)}
        />
        <Toast
          message={error}
          type="error"
          onClose={() => setError(null)}
        />

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

          {/* Resumen/Estadísticas */}
          {config && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-900">{config.productos?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Marcadores Activos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {config.hotspots?.filter((h) => h.enabled !== false).length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Marcadores</p>
                    <p className="text-2xl font-bold text-gray-900">{config.hotspots?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Páginas del PDF</p>
                    <p className="text-2xl font-bold text-gray-900">{config.numPages || 'N/A'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-2 py-2 flex gap-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('productos')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === 'productos'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Productos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('marcadores')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === 'marcadores'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Marcadores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('configuracion')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === 'configuracion'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Configuración
            </button>
          </div>

          {/* Sección productos */}
          {activeTab === 'productos' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Productos</h2>
                <p className="text-gray-600 text-sm">
                  Edita el precio y la descripción que se muestran en el modal de cada producto.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {config.productos && config.productos.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Valor total estimado</p>
                    <p className="text-lg font-bold text-primary-600">
                      ${config.productos.reduce((sum, p) => sum + (p.precio || 0), 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Paginación y selector de vista */}
            <div className="flex items-center justify-between mb-4 px-2 flex-wrap gap-3">
              <p className="text-xs text-gray-500">
                {config.productos.length > itemsPerPage && (
                  <>Mostrando {((productosPage - 1) * itemsPerPage) + 1} - {Math.min(productosPage * itemsPerPage, config.productos.length)} de {config.productos.length} productos</>
                )}
                {config.productos.length <= itemsPerPage && (
                  <>{config.productos.length} productos</>
                )}
              </p>
              <div className="flex items-center gap-3">
                {/* Selector de vista */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Vista de cuadrícula"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Vista de lista"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
                {/* Paginación */}
                {config.productos.length > itemsPerPage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProductosPage(p => Math.max(1, p - 1))}
                      disabled={productosPage === 1}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {productosPage} de {Math.ceil(config.productos.length / itemsPerPage)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductosPage(p => Math.min(Math.ceil(config.productos.length / itemsPerPage), p + 1))}
                      disabled={productosPage >= Math.ceil(config.productos.length / itemsPerPage)}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={viewMode === 'grid' ? 'grid gap-5 md:gap-6 md:grid-cols-2 mb-4' : 'flex flex-col gap-2 mb-4'}>
              {config.productos
                .slice((productosPage - 1) * itemsPerPage, productosPage * itemsPerPage)
                .map((producto) => (
                <div
                  key={producto.id}
                  className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-all duration-200 ${
                    viewMode === 'list' ? 'flex flex-row items-center gap-4 py-3 px-4' : 'p-4 md:p-5'
                  }`}
                  style={{
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                  }}
                >
                  {/* banda lateral */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary-500/80" />

                  <div className={`relative flex ${viewMode === 'list' ? 'flex-row items-center gap-4 flex-1' : 'flex-col gap-4'}`}>
                    {/* encabezado */}
                    <div className={`flex ${viewMode === 'list' ? 'items-center gap-3 flex-1' : 'items-start justify-between gap-3'}`}>
                      <div className={`flex ${viewMode === 'list' ? 'items-center gap-3 flex-1' : 'flex-col gap-2'} min-w-0 flex-1`}>
                        {/* ID separado del nombre */}
                        {viewMode === 'list' ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-mono font-semibold border border-primary-200 shrink-0">
                            {producto.id.substring(0, 8)}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-mono font-semibold border border-primary-200">
                              {producto.id.substring(0, 8)}
                            </span>
                          </div>
                        )}
                        {/* Nombre del producto */}
                        <input
                          type="text"
                          className={`w-full border-0 bg-transparent px-0 py-0 font-semibold text-gray-900 focus:ring-0 placeholder-gray-400 ${
                            viewMode === 'list' ? 'text-sm' : 'text-base md:text-lg'
                          }`}
                          value={producto.nombre}
                          placeholder="Nombre del producto"
                          onChange={(e) =>
                            handleProductoChange(producto.id, 'nombre', e.target.value)
                          }
                        />
                      </div>
                      {viewMode === 'grid' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProducto(producto.id)}
                          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 shrink-0"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Eliminar
                        </button>
                      )}
                    </div>

                    {/* cuerpo */}
                    {viewMode === 'list' ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-32">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                            Precio
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-xs font-medium">
                              $
                            </span>
                            <input
                              type="number"
                              className="w-full pl-5 pr-2 py-1.5 rounded border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-xs bg-white font-medium"
                              value={producto.precio || ''}
                              onChange={(e) =>
                                handleProductoChange(producto.id, 'precio', e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                            Descripción
                          </label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-xs bg-white px-2 py-1.5"
                            value={(producto.descripcion || '').substring(0, 60)}
                            onChange={(e) =>
                              handleProductoChange(producto.id, 'descripcion', e.target.value)
                            }
                            placeholder="Descripción..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-4 items-start">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                              Precio (COP)
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm font-medium">
                                $
                              </span>
                              <input
                                type="number"
                                className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white font-medium transition-all hover:border-primary-300"
                                value={producto.precio || ''}
                                onChange={(e) =>
                                  handleProductoChange(producto.id, 'precio', e.target.value)
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                              Descripción corta
                            </label>
                            <textarea
                              rows={3}
                              className="w-full rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-y bg-white px-3 py-2.5 transition-all hover:border-primary-300"
                              value={producto.descripcion || ''}
                              onChange={(e) =>
                                handleProductoChange(producto.id, 'descripcion', e.target.value)
                              }
                              placeholder="Descripción del producto..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Campo de página eliminado: los hotspots se agregan manualmente */}
                    
                    {/* Botón eliminar en vista lista */}
                    {viewMode === 'list' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProducto(producto.id)}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 shrink-0"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleAddProducto}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary-300 text-primary-700 text-sm font-semibold bg-primary-50/40 hover:bg-primary-50 hover:border-primary-400 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                Añadir producto
              </button>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Agregar varios:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.max(1, Math.min(100, parseInt(e.target.value || '1', 10))))}
                  className="w-16 px-2 py-1 rounded-md border border-gray-200 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => handleBulkAddProductos(bulkCount)}
                  className="px-3 py-1 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                >
                  Crear {bulkCount} Producto{bulkCount !== 1 ? 's' : ''}
                </button>
              </div>

              {config.productos && config.productos.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sinNombre = config.productos.filter((p) => !p.nombre || p.nombre.trim() === '' || p.nombre.includes('Nuevo producto'));
                      if (sinNombre.length > 0) {
                        if (window.confirm(`¿Eliminar ${sinNombre.length} producto(s) sin nombre o con nombre por defecto?`)) {
                          sinNombre.forEach((p) => handleDeleteProducto(p.id));
                        }
                      } else {
                        alert('No hay productos sin nombre para eliminar');
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200"
                    title="Eliminar productos sin nombre o con nombre por defecto"
                  >
                    Limpiar sin nombre
                  </button>
                </div>
              )}
            </div>
          </section>
          )}

          {/* Sección Configuración */}
          {activeTab === 'configuracion' && config && (
            <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Configuración General</h2>
              </div>
              <div className="space-y-6">
                {/* Cargar PDF */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cargar Catálogo PDF
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors bg-white">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      disabled={pdfUploading}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 block">
                          {pdfFile ? pdfFile.name : 'Haz clic para seleccionar PDF'}
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          {pdfUploading ? 'Procesando...' : 'Selecciona un archivo PDF para actualizar el catálogo'}
                        </span>
                      </div>
                    </label>
                  </div>
                  {pdfFile && !pdfUploading && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                      ✓ Archivo seleccionado: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* WhatsApp Number */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Número de WhatsApp para Pedidos
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium text-base">+</span>
                    <input
                      type="text"
                      className="flex-1 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white px-4 py-3 font-medium transition-all hover:border-primary-300"
                      placeholder="573001234567"
                      value={config?.whatsappNumber || ''}
                      onChange={(e) => {
                        setConfig((prev) => ({
                          ...prev,
                          whatsappNumber: e.target.value.replace(/\D/g, ''), // Solo números
                        }));
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Número sin el símbolo +. Se usará para enviar pedidos desde el carrito.
                  </p>
                </div>

                {/* Prueba de Base de Datos */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Prueba de Conexión a Base de Datos
                  </label>
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={dbTesting}
                    className="w-full md:w-auto px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {dbTesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Probando conexión...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Probar Conexión
                      </>
                    )}
                  </button>

                  {dbTestResult && (
                    <div className={`mt-4 rounded-lg p-4 border-2 ${
                      dbTestResult.ok 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          dbTestResult.ok ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {dbTestResult.ok ? (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-sm mb-1 ${
                            dbTestResult.ok ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {dbTestResult.ok ? 'Conexión Exitosa' : 'Error de Conexión'}
                          </h3>
                          {dbTestResult.ok && (
                            <div className="text-xs text-green-700 space-y-1 mb-3">
                              <p>Base de datos: <span className="font-mono">{dbTestResult.database || 'N/A'}</span></p>
                              <p>Versión del servidor: <span className="font-mono">{dbTestResult.serverVersion || 'N/A'}</span></p>
                              <p>Duración: <span className="font-mono">{dbTestResult.durationMs}ms</span></p>
                              {dbTestResult.collections && dbTestResult.collections.length > 0 && (
                                <p>Colecciones: <span className="font-mono">{dbTestResult.collections.length}</span></p>
                              )}
                            </div>
                          )}
                          {!dbTestResult.ok && (
                            <div className="text-xs text-red-700 space-y-1 mb-3">
                              <p><strong>Error:</strong> {dbTestResult.error || 'Error desconocido'}</p>
                              {dbTestResult.details && (
                                <p><strong>Detalles:</strong> {dbTestResult.details}</p>
                              )}
                              {dbTestResult.hint && (
                                <p className="text-red-600 italic">{dbTestResult.hint}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Logs */}
                          {dbTestResult.logs && dbTestResult.logs.length > 0 && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const logsText = dbTestResult.logs.join('\n');
                                  navigator.clipboard.writeText(logsText);
                                  setMessage('Logs copiados al portapapeles');
                                  setTimeout(() => setMessage(null), 2000);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-800 mb-2 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar logs
                              </button>
                              <div className="bg-gray-900 text-green-400 text-xs font-mono p-3 rounded-md max-h-64 overflow-y-auto">
                                {dbTestResult.logs.map((log, idx) => (
                                  <div key={idx} className="mb-1">{log}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Sección marcadores (puntos de compra interactivos) */}
          {activeTab === 'marcadores' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Marcadores</h2>
            <p className="text-gray-600 text-sm mb-6">
              Activa o desactiva los puntos de compra interactivos en cada página del catálogo.
            </p>

            {/* Sección de agregar múltiples marcadores - MOVIDA A LA PARTE SUPERIOR */}
            <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-5 border border-primary-200 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Múltiples Marcadores</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={bulkHotspotCount}
                    onChange={(e) => setBulkHotspotCount(Math.max(1, Math.min(100, parseInt(e.target.value || '1', 10))))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Página Inicial
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={config?.numPages || 1}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={bulkHotspotStartPage}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(config?.numPages || 1, parseInt(e.target.value || '1', 10)));
                      setBulkHotspotStartPage(val);
                      if (bulkHotspotEndPage < val) {
                        setBulkHotspotEndPage(val);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Página Final (Opcional)
                  </label>
                  <input
                    type="number"
                    min={bulkHotspotStartPage}
                    max={config?.numPages || 1}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={bulkHotspotEndPage || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Math.max(bulkHotspotStartPage, Math.min(config?.numPages || 1, parseInt(e.target.value, 10))) : null;
                      setBulkHotspotEndPage(val);
                    }}
                    placeholder="Auto"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkHotspotEndPage ? `Rango: ${bulkHotspotStartPage}-${bulkHotspotEndPage}` : `Secuencial desde página ${bulkHotspotStartPage}`}
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleBulkAddHotspots(bulkHotspotCount, bulkHotspotStartPage, bulkHotspotEndPage, globalPosition)}
                    className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Crear {bulkHotspotCount} Marcador{bulkHotspotCount !== 1 ? 'es' : ''}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón para eliminar masivamente */}
            {selectedHotspots.size > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-red-700 font-semibold">
                  {selectedHotspots.size} marcador(es) seleccionado(s)
                </span>
                <button
                  type="button"
                  onClick={handleBulkDeleteHotspots}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Eliminar Seleccionados
                </button>
              </div>
            )}

            {/* Paginación de hotspots */}
            {config.hotspots.length > hotspotsPerPage && (
              <div className="flex items-center justify-between mb-4 px-2">
                <p className="text-xs text-gray-500">
                  Mostrando {((hotspotsPage - 1) * hotspotsPerPage) + 1} - {Math.min(hotspotsPage * hotspotsPerPage, config.hotspots.length)} de {config.hotspots.length} hotspots
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHotspotsPage(p => Math.max(1, p - 1))}
                    disabled={hotspotsPage === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {hotspotsPage} de {Math.ceil(config.hotspots.length / hotspotsPerPage)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHotspotsPage(p => Math.min(Math.ceil(config.hotspots.length / hotspotsPerPage), p + 1))}
                    disabled={hotspotsPage >= Math.ceil(config.hotspots.length / hotspotsPerPage)}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-sm align-middle">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={config.hotspots.slice((hotspotsPage - 1) * hotspotsPerPage, hotspotsPage * hotspotsPerPage).length > 0 && 
                                config.hotspots.slice((hotspotsPage - 1) * hotspotsPerPage, hotspotsPage * hotspotsPerPage)
                                  .every((_, idx) => selectedHotspots.has((hotspotsPage - 1) * hotspotsPerPage + idx))}
                        onChange={handleSelectAllHotspots}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        title="Seleccionar todos de esta página"
                      />
                    </th>
                    <th className="py-2 pr-4">Activo</th>
                    <th className="py-2 pr-4">Página</th>
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Posición (%)</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Tamaño (%)</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Vista previa</th>
                    <th className="py-2 pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {config.hotspots
                    .slice((hotspotsPage - 1) * hotspotsPerPage, hotspotsPage * hotspotsPerPage)
                    .map((h, index) => {
                      const globalIndex = (hotspotsPage - 1) * hotspotsPerPage + index;
                    const producto = config.productos.find((p) => p.id === h.idProducto);
                    const isSelected = selectedHotspots.has(globalIndex);
                    return (
                      <tr key={`${h.page}-${h.idProducto}-${index}`} className={`border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedHotspots);
                              if (e.target.checked) {
                                newSelected.add(globalIndex);
                              } else {
                                newSelected.delete(globalIndex);
                              }
                              setSelectedHotspots(newSelected);
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              checked={h.enabled !== false}
                              onChange={(e) => handleHotspotToggle(globalIndex, e.target.checked)}
                            />
                            <span className="text-xs text-gray-600">Visible</span>
                          </label>
                        </td>
                        <td className="py-2 pr-4 text-gray-800 font-medium">
                          <input
                            type="number"
                            min={1}
                            max={config.numPages || undefined}
                            className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs focus:ring-primary-500 focus:border-primary-500"
                            value={h.page}
                            onChange={(e) => handleHotspotPageChange(globalIndex, e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-4 text-gray-800">
                          <select
                            className="min-w-[140px] px-2 py-1 rounded-md border border-gray-200 text-xs bg-white focus:ring-primary-500 focus:border-primary-500"
                            value={h.idProducto || ''}
                            onChange={(e) => handleHotspotProductChange(globalIndex, e.target.value)}
                          >
                            <option value="">Sin producto</option>
                            {config.productos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} ({p.id})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-4 text-gray-800">
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-500 uppercase">X</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs focus:ring-primary-500 focus:border-primary-500"
                                value={h.x}
                                onChange={(e) =>
                                  handleHotspotFieldChange(globalIndex, 'x', e.target.value)
                                }
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-500 uppercase">Y</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs focus:ring-primary-500 focus:border-primary-500"
                                value={h.y}
                                onChange={(e) =>
                                  handleHotspotFieldChange(globalIndex, 'y', e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-gray-800 hidden md:table-cell">
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-500 uppercase">Ancho</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs focus:ring-primary-500 focus:border-primary-500"
                                value={h.width}
                                onChange={(e) =>
                                  handleHotspotFieldChange(globalIndex, 'width', e.target.value)
                                }
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-500 uppercase">Alto</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs focus:ring-primary-500 focus:border-primary-500"
                                value={h.height}
                                onChange={(e) =>
                                  handleHotspotFieldChange(globalIndex, 'height', e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4 hidden md:table-cell">
                          <div className="w-16 h-24 bg-gray-50 rounded-md border-2 border-gray-300 relative overflow-hidden">
                            <div
                              className="absolute rounded-sm border-2 border-primary-500/90 bg-primary-500/25"
                              style={{
                                left: `${h.x}%`,
                                top: `${h.y}%`,
                                width: `${h.width}%`,
                                height: `${h.height}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteHotspot(globalIndex)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar marcador"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              {/* Configuración de posición global */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Posición Global para Marcadores</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      X (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                      value={globalPosition.x}
                      onChange={(e) => setGlobalPosition(prev => ({ ...prev, x: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Y (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                      value={globalPosition.y}
                      onChange={(e) => setGlobalPosition(prev => ({ ...prev, y: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Ancho (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                      value={globalPosition.width}
                      onChange={(e) => setGlobalPosition(prev => ({ ...prev, width: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Alto (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                      value={globalPosition.height}
                      onChange={(e) => setGlobalPosition(prev => ({ ...prev, height: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyGlobalPosition}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Aplicar a Todos los Marcadores
                </button>
              </div>

              {/* Agregar marcadores individuales */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddHotspot}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary-300 text-primary-700 text-sm font-semibold bg-primary-50/40 hover:bg-primary-50 hover:border-primary-400 transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                  Añadir marcador
                </button>
              </div>

            </div>
          </section>
          )}
        </div>
      </main>
    </>
  );
}


