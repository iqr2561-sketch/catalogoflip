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
  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'hotspots'
  const [bulkCount, setBulkCount] = useState(1);
  const [productosPage, setProductosPage] = useState(1);
  const [hotspotsPage, setHotspotsPage] = useState(1);
  const itemsPerPage = 10; // Productos por página
  const hotspotsPerPage = 15; // Hotspots por página

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/catalog-config');
        const data = await res.json();
        // Asegurar que todos los hotspots tengan la propiedad enabled
        const normalized = {
          ...data,
          hotspots: (data.hotspots || []).map((h) => ({
            enabled: true,
            ...h,
          })),
        };
        setConfig(normalized);
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

      // Si se cambió la página, crear o actualizar el hotspot
      if (field === 'page') {
        const pageNum = Number.isNaN(parseInt(value, 10))
          ? 1
          : Math.max(1, Math.min(prev.numPages || 1, parseInt(value, 10)));

        // Buscar si ya existe un hotspot para este producto
        const existingHotspotIndex = prev.hotspots.findIndex(
          (h) => h.idProducto === id
        );

        let updatedHotspots = [...prev.hotspots];

        if (existingHotspotIndex >= 0) {
          // Actualizar el hotspot existente
          updatedHotspots[existingHotspotIndex] = {
            ...updatedHotspots[existingHotspotIndex],
            page: pageNum,
            enabled: true, // Habilitar automáticamente cuando se asigna página
          };
        } else {
          // Crear un nuevo hotspot
          updatedHotspots.push({
            page: pageNum,
            idProducto: id,
            enabled: true,
            x: 50,
            y: 50,
            width: 20,
            height: 20,
          });
        }

        return {
          ...prev,
          productos: updatedProductos,
          hotspots: updatedHotspots,
        };
      }

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
      const hotspots = [...prev.hotspots];
      const numPages = prev.numPages || 1;

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

        // Crear un hotspot asociado, distribuyendo las páginas de forma cíclica
        const page =
          numPages > 0
            ? ((hotspots.length + i) % numPages) + 1
            : 1;

        hotspots.push({
          page,
          idProducto: newId,
          enabled: false,
          x: 50,
          y: 50,
          width: 20,
          height: 20,
        });
      }

      return {
        ...prev,
        productos,
        hotspots,
      };
    });
  };

  const handleAddProducto = () => {
    handleBulkAddProductos(1);
  };

  const handleDeleteProducto = (id) => {
    setConfig((prev) => {
      const remaining = prev.productos.filter((p) => p.id !== id);
      const fallbackId = remaining[0]?.id || '';

      return {
        ...prev,
        productos: remaining,
        hotspots: prev.hotspots.map((h) =>
          h.idProducto === id ? { ...h, idProducto: fallbackId } : h
        ),
      };
    });
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
            enabled: true,
            x: 50,
            y: 50,
            width: 20,
            height: 20,
          },
        ],
      };
    });
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

  const handleTestDb = async () => {
    try {
      setMessage(null);
      setError(null);

      const res = await fetch('/api/db-check');
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Error desconocido');
      }

      setMessage(
        `Conexión a la base de datos OK en ${data.durationMs ?? '?'} ms.`
      );
    } catch (err) {
      console.error('Error al probar la conexión a la BD:', err);
      setError('No se pudo conectar a la base de datos. Revisa las variables de entorno y los logs.');
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
        {/* Header fijo */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  Panel de Control
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Activa/desactiva hotspots y ajusta precios y descripciones de productos.
                </p>
                {typeof config.numPages === 'number' && config.numPages > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-semibold text-primary-600">{config.numPages}</span> páginas detectadas en el catálogo
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/catalog')}
                  className="px-4 py-2 rounded-xl border border-primary-300 text-primary-700 text-sm font-semibold bg-primary-50 hover:bg-primary-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Catálogo
                </button>
                <button
                  type="button"
                  onClick={handleTestDb}
                  className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  Probar conexión BD
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>

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
              onClick={() => setActiveTab('hotspots')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === 'hotspots'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Hotspots
            </button>
          </div>

          {/* Sección productos */}
          {activeTab === 'productos' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Productos</h2>
            <p className="text-gray-600 text-sm mb-6">
              Edita el precio y la descripción que se muestran en el modal de cada producto.
            </p>

            {/* Paginación de productos */}
            {config.productos.length > itemsPerPage && (
              <div className="flex items-center justify-between mb-4 px-2">
                <p className="text-xs text-gray-500">
                  Mostrando {((productosPage - 1) * itemsPerPage) + 1} - {Math.min(productosPage * itemsPerPage, config.productos.length)} de {config.productos.length} productos
                </p>
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
              </div>
            )}

            <div className="grid gap-5 md:gap-6 md:grid-cols-2 mb-4">
              {config.productos
                .slice((productosPage - 1) * itemsPerPage, productosPage * itemsPerPage)
                .map((producto) => (
                <div
                  key={producto.id}
                  className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  {/* banda lateral */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary-500/80" />

                  <div className="relative p-4 md:p-5 flex flex-col gap-4">
                    {/* encabezado */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                          {producto.id}
                        </span>
                        <input
                          type="text"
                          className="w-full max-w-xs border-0 bg-transparent px-0 py-0 text-base md:text-lg font-semibold text-gray-900 focus:ring-0"
                          value={producto.nombre}
                          onChange={(e) =>
                            handleProductoChange(producto.id, 'nombre', e.target.value)
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProducto(producto.id)}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
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
                    </div>

                    {/* cuerpo */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-4 items-start">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                            Precio (COP)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white/80"
                              value={producto.precio}
                              onChange={(e) =>
                                handleProductoChange(producto.id, 'precio', e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                            Descripción corta
                          </label>
                          <textarea
                            rows={2}
                            className="w-full rounded-lg border border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm resize-y bg-white/80"
                            value={producto.descripcion || ''}
                            onChange={(e) =>
                              handleProductoChange(producto.id, 'descripcion', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* Campo de página */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                          Página del Catálogo
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            className="flex-1 rounded-lg border border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white/80 px-3 py-2"
                            value={
                              config.hotspots.find((h) => h.idProducto === producto.id)?.page || ''
                            }
                            onChange={(e) =>
                              handleProductoChange(producto.id, 'page', e.target.value)
                            }
                          >
                            <option value="">Sin página asignada</option>
                            {(() => {
                              const numPages = config.numPages && config.numPages > 0 ? config.numPages : 1;
                              return Array.from({ length: numPages }, (_, i) => i + 1).map(
                                (pageNum) => (
                                  <option key={pageNum} value={pageNum}>
                                    Página {pageNum}
                                  </option>
                                )
                              );
                            })()}
                          </select>
                          {(() => {
                            const hotspot = config.hotspots.find((h) => h.idProducto === producto.id);
                            if (hotspot?.enabled && hotspot?.page) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Visible
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {(() => {
                            const hotspot = config.hotspots.find((h) => h.idProducto === producto.id);
                            if (hotspot?.page) {
                              return `El hotspot aparecerá en la página ${hotspot.page} del catálogo`;
                            }
                            return 'Selecciona una página para mostrar el hotspot en el catálogo';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
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
                  Crear
                </button>
              </div>
            </div>
          </section>
          )}

          {/* Sección hotspots */}
          {activeTab === 'hotspots' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hotspots</h2>
            <p className="text-gray-600 text-sm mb-6">
              Activa o desactiva los puntos clicables en cada página del catálogo.
            </p>

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
                    <th className="py-2 pr-4">Activo</th>
                    <th className="py-2 pr-4">Página</th>
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Posición (%)</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Tamaño (%)</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Vista previa</th>
                  </tr>
                </thead>
                <tbody>
                  {config.hotspots
                    .slice((hotspotsPage - 1) * hotspotsPerPage, hotspotsPage * hotspotsPerPage)
                    .map((h, index) => {
                      const globalIndex = (hotspotsPage - 1) * hotspotsPerPage + index;
                    const producto = config.productos.find((p) => p.id === h.idProducto);
                    return (
                      <tr key={`${h.page}-${h.idProducto}-${index}`} className="border-b border-gray-100">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddHotspot}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary-300 text-primary-700 text-sm font-semibold bg-primary-50/40 hover:bg-primary-50 hover:border-primary-400 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Añadir hotspot
            </button>
          </section>
          )}
        </div>
      </main>
    </>
  );
}


