import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

export default function PanelDeControl() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'marcadores' | 'configuracion' | 'lista-precios'
  const [bulkCount, setBulkCount] = useState(1);
  const [productosPage, setProductosPage] = useState(1);
  const [hotspotsPage, setHotspotsPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [bulkHotspotCount, setBulkHotspotCount] = useState(1);
  const [bulkHotspotStartPage, setBulkHotspotStartPage] = useState(1);
  const [bulkHotspotEndPage, setBulkHotspotEndPage] = useState(null);
  const [globalPosition, setGlobalPosition] = useState({ x: 50, y: 50, width: 20, height: 20 });
  const [selectedHotspots, setSelectedHotspots] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
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
          variacionesGlobales: data.variacionesGlobales || [], // Variaciones globales predefinidas
        };
        setConfig(normalized);
        
        // Cargar miniaturas si hay páginas
        if (normalized.numPages) {
          loadThumbnails(normalized.numPages);
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

  const loadThumbnails = async (numPages) => {
    if (!numPages || numPages === 0) {
      setThumbnails([]);
      return;
    }
    
    setLoadingThumbnails(true);
    try {
      console.log(`[panel] Cargando ${numPages} miniaturas...`);
      const thumbnailPromises = [];
      for (let i = 1; i <= Math.min(numPages, 100); i++) { // Limitar a 100 para no sobrecargar
        thumbnailPromises.push(
          fetch(`/api/catalog-thumbnail/${i}`, { cache: 'no-cache' })
            .then(res => {
              if (res.ok) {
                return `/api/catalog-thumbnail/${i}`;
              }
              return null;
            })
            .catch(() => null)
        );
      }
      
      const results = await Promise.all(thumbnailPromises);
      const validThumbnails = results.filter(Boolean);
      console.log(`[panel] ${validThumbnails.length} miniaturas cargadas de ${numPages} páginas`);
      setThumbnails(validThumbnails);
    } catch (error) {
      console.error('[panel] Error al cargar miniaturas:', error);
      setThumbnails([]);
    } finally {
      setLoadingThumbnails(false);
    }
  };

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
          variaciones: [], // Array de variaciones
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
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Producto',
      message: '¿Estás seguro de que quieres eliminar este producto?',
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        deleteProducto(id);
      }
    });
  };

  const deleteProducto = async (id) => {
    // Calcular la configuración actualizada ANTES de actualizar el estado
    setConfig((prev) => {
      const remaining = prev.productos.filter((p) => p.id !== id);
      const fallbackId = remaining[0]?.id || '';

      const updatedConfig = {
        ...prev,
        productos: remaining,
        hotspots: prev.hotspots.map((h) =>
          h.idProducto === id ? { ...h, idProducto: fallbackId } : h
        ),
      };

      // Guardar automáticamente después de eliminar
      (async () => {
        try {
          setSaving(true);
          setMessage(null);
          setError(null);
          
          console.log('[panel] Guardando configuración después de eliminar producto:', {
            productosRestantes: updatedConfig.productos.length,
            hotspots: updatedConfig.hotspots.length,
            timestamp: new Date().toISOString()
          });
          
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedConfig, null, 2),
          });

          const result = await res.json();
          
          if (res.ok && result.ok) {
            console.log('[panel] Guardado exitoso:', result);
            setMessage(`✓ Producto eliminado correctamente`);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error('[panel] Error al guardar:', result);
            setError(`✗ No se pudo eliminar el producto. Intenta nuevamente.`);
            setTimeout(() => setError(null), 8000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar:', err);
          setError(`✗ Error de conexión. Intenta nuevamente.`);
          setTimeout(() => setError(null), 8000);
        } finally {
          setSaving(false);
        }
      })();

      return updatedConfig;
    });
  };

  const handleDeleteAllProductos = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Todos los Productos',
      message: `¿Estás seguro de que quieres eliminar TODOS los ${config.productos.length} productos? Esta acción también eliminará todos los marcadores asociados. Esta acción no se puede deshacer.`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        deleteAllProductos();
      }
    });
  };

  const deleteAllProductos = async () => {
    setConfig((prev) => {
      const count = prev.productos.length;
      const updatedConfig = {
        ...prev,
        productos: [],
        hotspots: [], // También eliminar todos los marcadores ya que dependen de productos
      };

      // Guardar automáticamente después de eliminar
      (async () => {
        try {
          setSaving(true);
          setMessage(null);
          setError(null);
          
          console.log('[panel] Guardando configuración después de eliminar todos los productos:', {
            productosEliminados: count,
            productosRestantes: 0,
            hotspotsEliminados: prev.hotspots.length,
            timestamp: new Date().toISOString()
          });
          
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedConfig, null, 2),
          });

          const result = await res.json();
          
          if (res.ok && result.ok) {
            console.log('[panel] Guardado exitoso:', result);
            setMessage(`✓ Todos los productos y marcadores han sido eliminados correctamente`);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error('[panel] Error al guardar:', result);
            setError(`✗ No se pudieron eliminar los productos. Intenta nuevamente.`);
            setTimeout(() => setError(null), 8000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar:', err);
          setError(`✗ Error de conexión. Intenta nuevamente.`);
          setTimeout(() => setError(null), 8000);
        } finally {
          setSaving(false);
        }
      })();

      return updatedConfig;
    });
  };

  const handleHotspotToggle = (index, enabled) => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h, i) => (i === index ? { ...h, enabled } : h)),
    }));
  };

  const handleHideAllHotspots = async () => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h) => ({ ...h, enabled: false })),
    }));
    
    // Guardar automáticamente
    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        hotspots: config.hotspots.map((h) => ({ ...h, enabled: false })),
      };
      
      const res = await fetch('/api/catalog-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      
      if (res.ok) {
        setMessage('✓ Todos los marcadores han sido ocultados');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError('✗ Error al ocultar marcadores. Intenta nuevamente.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('[panel] Error al ocultar marcadores:', err);
      setError('✗ Error de conexión. Intenta nuevamente.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleShowAllHotspots = async () => {
    setConfig((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((h) => ({ ...h, enabled: true })),
    }));
    
    // Guardar automáticamente
    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        hotspots: config.hotspots.map((h) => ({ ...h, enabled: true })),
      };
      
      const res = await fetch('/api/catalog-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      
      if (res.ok) {
        setMessage('✓ Todos los marcadores han sido mostrados');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError('✗ Error al mostrar marcadores. Intenta nuevamente.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('[panel] Error al mostrar marcadores:', err);
      setError('✗ Error de conexión. Intenta nuevamente.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
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
    const maxPages = config?.numPages || 9999; // Permitir más páginas si no está definido
    const start = Math.max(1, startPage || 1);
    const end = endPage ? Math.max(start, endPage) : null;
    const pos = position || globalPosition;

    setConfig((prev) => {
      let productos = [...prev.productos];
      const newHotspots = [];
      
      // Calcular cuántos marcadores se van a crear
      let marcadoresACrear = 0;
      if (end && end >= start) {
        // Usar rango de páginas
        const pages = [];
        for (let p = start; p <= end && pages.length < count; p++) {
          pages.push(p);
          marcadoresACrear++;
        }
      } else {
        // Modo secuencial - crear todos los marcadores solicitados
        marcadoresACrear = count;
      }

      // Crear productos automáticamente si no hay suficientes
      if (productos.length < marcadoresACrear) {
        const productosNecesarios = marcadoresACrear - productos.length;
        let nextIndex = productos.length + 1;
        
        for (let i = 0; i < productosNecesarios; i++) {
          const newId = `p${String(nextIndex).padStart(3, '0')}`;
          nextIndex++;
          
          productos.push({
            id: newId,
            nombre: `Producto Página ${start + i}`,
            precio: 0,
            imagen: '',
            descripcion: '',
          });
        }
      }

      // Crear los marcadores
      if (end && end >= start) {
        // Usar rango de páginas
        const pages = [];
        for (let p = start; p <= end && pages.length < count; p++) {
          pages.push(p);
        }
        pages.forEach((page, index) => {
          // Asignar producto diferente a cada marcador si hay suficientes
          const productIndex = Math.min(index, productos.length - 1);
          const productId = productos[productIndex]?.id || productos[0]?.id || '';
          
          newHotspots.push({
            page: page,
            idProducto: productId,
            enabled: false,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
          });
        });
      } else {
        // Modo secuencial - crear todos los marcadores sin limitación de páginas
        for (let i = 0; i < count; i++) {
          const page = start + i;
          // Asignar producto diferente a cada marcador si hay suficientes
          const productIndex = Math.min(i, productos.length - 1);
          const productId = productos[productIndex]?.id || productos[0]?.id || '';
          
          newHotspots.push({
            page: page,
            idProducto: productId,
            enabled: false,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
          });
        }
      }

      console.log(`[handleBulkAddHotspots] Creados ${newHotspots.length} marcadores desde página ${start}`, {
        cantidadSolicitada: count,
        marcadoresCreados: newHotspots.length,
        productosDisponibles: productos.length
      });

      return {
        ...prev,
        productos: productos,
        hotspots: [...prev.hotspots, ...newHotspots],
      };
    });
  };

  const handleBulkDeleteHotspots = async () => {
    if (selectedHotspots.size === 0) {
      alert('Selecciona al menos un marcador para eliminar');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Marcadores',
      message: `¿Estás seguro de que quieres eliminar ${selectedHotspots.size} marcador(es)?`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        deleteBulkHotspots();
      }
    });
  };

  const deleteBulkHotspots = () => {

    const countToDelete = selectedHotspots.size;

    setConfig((prev) => {
      const indicesToDelete = Array.from(selectedHotspots).sort((a, b) => b - a); // Ordenar descendente
      const newHotspots = prev.hotspots.filter((_, index) => !indicesToDelete.includes(index));
      
      const updatedConfig = {
        ...prev,
        hotspots: newHotspots,
      };

      setSelectedHotspots(new Set());

      // Guardar automáticamente después de eliminar
      (async () => {
        try {
          setSaving(true);
          setMessage(null);
          setError(null);
          
          console.log('[panel] Guardando configuración después de eliminar marcadores masivamente:', {
            eliminados: countToDelete,
            hotspotsRestantes: updatedConfig.hotspots.length,
            timestamp: new Date().toISOString()
          });
          
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedConfig, null, 2),
          });

          const result = await res.json();
          
          if (res.ok && result.ok) {
            console.log('[panel] Guardado exitoso:', result);
            setMessage(`✓ ${countToDelete} marcador(es) eliminado(s) correctamente`);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error('[panel] Error al guardar:', result);
            setError(`✗ No se pudieron eliminar los marcadores. Intenta nuevamente.`);
            setTimeout(() => setError(null), 8000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar:', err);
          setError(`✗ Error de conexión. Intenta nuevamente.`);
          setTimeout(() => setError(null), 8000);
        } finally {
          setSaving(false);
        }
      })();

      return updatedConfig;
    });
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

  // Exportar a Excel
  const handleExportToExcel = () => {
    if (!config || !config.productos || config.productos.length === 0) {
      setError('No hay productos para exportar');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Preparar datos para Excel
      const excelData = [];
      
      config.productos.forEach((producto) => {
        // Fila para el producto base
        excelData.push({
          'Producto': producto.nombre || '',
          'Precio Base': producto.precio || 0,
          'Variación': '',
          'Precio Variación': ''
        });

        // Filas para cada variación
        if (producto.variaciones && producto.variaciones.length > 0) {
          producto.variaciones.forEach((variacion) => {
            excelData.push({
              'Producto': producto.nombre || '',
              'Precio Base': producto.precio || 0,
              'Variación': variacion.nombre || '',
              'Precio Variación': variacion.precio || 0
            });
          });
        }
      });

      // Crear workbook y worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lista de Precios');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 30 }, // Producto
        { wch: 15 }, // Precio Base
        { wch: 30 }, // Variación
        { wch: 18 }  // Precio Variación
      ];
      ws['!cols'] = colWidths;

      // Generar archivo Excel
      const fileName = `lista_precios_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setMessage('✓ Excel exportado correctamente');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      setError('Error al exportar el archivo Excel');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Importar desde Excel
  const handleImportFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setSaving(true);
      setMessage('Leyendo archivo Excel...');
      setError(null);

      // Leer archivo
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        throw new Error('El archivo Excel está vacío o no tiene datos válidos');
      }

      setMessage('Procesando datos...');

      // Procesar datos y actualizar productos
      const productosMap = new Map();
      let productosActualizados = 0;
      let variacionesAgregadas = 0;
      let variacionesActualizadas = 0;

      // Primero, crear un mapa de productos existentes
      config.productos.forEach((p) => {
        productosMap.set(p.nombre?.toLowerCase().trim(), p);
      });

      // Procesar cada fila del Excel
      data.forEach((row) => {
        const nombreProducto = (row['Producto'] || row['producto'] || '').toString().trim();
        const precioBase = parseFloat(row['Precio Base'] || row['precio base'] || row['PrecioBase'] || 0);
        const nombreVariacion = (row['Variación'] || row['variación'] || row['Variacion'] || '').toString().trim();
        const precioVariacion = parseFloat(row['Precio Variación'] || row['precio variación'] || row['PrecioVariacion'] || row['Precio Variacion'] || 0);

        if (!nombreProducto) return; // Saltar filas sin nombre de producto

        const key = nombreProducto.toLowerCase();
        let producto = productosMap.get(key);

        // Si el producto no existe, crearlo
        if (!producto) {
          producto = {
            id: `producto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            nombre: nombreProducto,
            precio: precioBase || 0,
            imagen: '',
            descripcion: '',
            variaciones: []
          };
          productosMap.set(key, producto);
          productosActualizados++;
        } else {
          // Actualizar precio base si es diferente
          if (precioBase && precioBase !== producto.precio) {
            producto.precio = precioBase;
            productosActualizados++;
          }
        }

        // Si hay una variación en esta fila
        if (nombreVariacion) {
          // Buscar si la variación ya existe
          const variacionExistente = producto.variaciones?.find(
            (v) => v.nombre?.toLowerCase().trim() === nombreVariacion.toLowerCase().trim()
          );

          if (variacionExistente) {
            // Actualizar precio de variación existente
            if (precioVariacion !== undefined && precioVariacion !== variacionExistente.precio) {
              variacionExistente.precio = precioVariacion;
              variacionesActualizadas++;
            }
          } else {
            // Agregar nueva variación
            if (!producto.variaciones) {
              producto.variaciones = [];
            }
            producto.variaciones.push({
              nombre: nombreVariacion,
              precio: precioVariacion || 0
            });
            variacionesAgregadas++;
          }
        }
      });

      // Actualizar config con los productos procesados
      const productosActualizadosArray = Array.from(productosMap.values());
      
      setConfig((prev) => ({
        ...prev,
        productos: productosActualizadosArray
      }));

      // Guardar en la base de datos
      const res = await fetch('/api/catalog-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          productos: productosActualizadosArray
        }, null, 2),
      });

      if (!res.ok) {
        throw new Error('Error al guardar los cambios');
      }

      setMessage(
        `✓ Importación completada: ${productosActualizados} productos actualizados, ${variacionesAgregadas} variaciones agregadas, ${variacionesActualizadas} variaciones actualizadas`
      );
      setTimeout(() => setMessage(null), 5000);

      // Limpiar input
      e.target.value = '';
    } catch (err) {
      console.error('Error al importar Excel:', err);
      setError(`Error al importar Excel: ${err.message || 'Error desconocido'}`);
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
          }
        } catch (chunkError) {
          // Intentar obtener más detalles del error
          let errorDetails = chunkError.message || String(chunkError);
          if (chunkError instanceof Error) {
            errorDetails = chunkError.message;
            if (chunkError.cause) {
              errorDetails += ` (Causa: ${chunkError.cause})`;
            }
          }
          
          const errorMsg = `Error al subir chunk ${i + 1}/${totalChunks}: ${errorDetails}`;
          errorLogs.push(`[${new Date().toISOString()}] ${errorMsg}`);
          console.error('[panel]', errorMsg, chunkError);
          
          // Lanzar error con más contexto
          const enhancedError = new Error(errorMsg);
          enhancedError.originalError = chunkError;
          throw enhancedError;
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

  // Funciones para gestionar variaciones globales (en Configuración)
  const handleAddVariacionGlobal = () => {
    setConfig((prev) => {
      const updatedConfig = {
        ...prev,
        variacionesGlobales: [
          ...(prev.variacionesGlobales || []),
          {
            nombre: 'Nueva variación',
            precioBase: 0,
          },
        ],
      };
      
      // Guardar automáticamente
      (async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            setMessage('✓ Variación global agregada correctamente');
            setTimeout(() => setMessage(null), 2000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar variación global:', err);
        } finally {
          setSaving(false);
        }
      })();
      
      return updatedConfig;
    });
  };

  const handleDeleteVariacionGlobal = (index) => {
    setConfig((prev) => {
      const updatedConfig = {
        ...prev,
        variacionesGlobales: (prev.variacionesGlobales || []).filter((_, i) => i !== index),
      };
      
      // Guardar automáticamente
      (async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            setMessage('✓ Variación global eliminada correctamente');
            setTimeout(() => setMessage(null), 2000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar variación global:', err);
        } finally {
          setSaving(false);
        }
      })();
      
      return updatedConfig;
    });
  };

  const handleVariacionGlobalChange = (index, field, value) => {
    setConfig((prev) => {
      const updated = (prev.variacionesGlobales || []).map((v, i) =>
        i === index
          ? {
              ...v,
              [field]:
                field === 'precioBase'
                  ? value === '' || value === null || value === undefined
                    ? 0
                    : Number.isNaN(parseFloat(value.toString().replace(',', '.')))
                      ? 0
                      : parseFloat(value.toString().replace(',', '.'))
                  : value,
            }
          : v
      );
      
      const updatedConfig = {
        ...prev,
        variacionesGlobales: updated,
      };
      
      // Guardar automáticamente después de un pequeño delay para evitar demasiadas llamadas
      clearTimeout(handleVariacionGlobalChange.saveTimeout);
      handleVariacionGlobalChange.saveTimeout = setTimeout(async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            console.log('[panel] Variación global actualizada');
          }
        } catch (err) {
          console.error('[panel] Error al guardar variación global:', err);
        } finally {
          setSaving(false);
        }
      }, 1000);
      
      return updatedConfig;
    });
  };

  // Agregar variación global a un producto (simplificado)
  const handleAddVariacionGlobalToProducto = (productoId, variacionGlobal) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: [
                ...(p.variaciones || []),
                {
                  nombre: variacionGlobal.nombre,
                  precio: variacionGlobal.precioBase, // Precio inicial desde la variación global
                },
              ],
            }
          : p
      );
      
      const updatedConfig = {
        ...prev,
        productos: updatedProductos,
      };
      
      // Guardar automáticamente
      (async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            setMessage('✓ Variación agregada correctamente');
            setTimeout(() => setMessage(null), 2000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar variación:', err);
        } finally {
          setSaving(false);
        }
      })();
      
      return updatedConfig;
    });
  };

  // Actualizar precio de variación en producto
  const handleUpdateVariacionPrecio = (productoId, variacionIndex, precio) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).map((v, i) =>
                i === variacionIndex
                  ? {
                      ...v,
                      precio: precio === '' || precio === null || precio === undefined 
                        ? 0 
                        : Number.isNaN(parseFloat(precio.toString().replace(',', '.'))) 
                          ? 0 
                          : parseFloat(precio.toString().replace(',', '.')),
                    }
                  : v
              ),
            }
          : p
      );
      
      const updatedConfig = {
        ...prev,
        productos: updatedProductos,
      };
      
      // Guardar automáticamente después de un pequeño delay para evitar demasiadas llamadas
      clearTimeout(handleUpdateVariacionPrecio.saveTimeout);
      handleUpdateVariacionPrecio.saveTimeout = setTimeout(async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            console.log('[panel] Precio de variación guardado');
          }
        } catch (err) {
          console.error('[panel] Error al guardar precio de variación:', err);
        } finally {
          setSaving(false);
        }
      }, 1000);
      
      return updatedConfig;
    });
  };

  // Funciones para gestionar variaciones de productos
  const handleAddVariacion = (productoId) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: [
                ...(p.variaciones || []),
                {
                  nombre: 'Nueva variación',
                  precio: 0.00, // Sistema simplificado: solo nombre y precio (con decimales)
                },
              ],
            }
          : p
      );
      
      const updatedConfig = {
        ...prev,
        productos: updatedProductos,
      };
      
      // Guardar automáticamente
      (async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            setMessage('✓ Variación agregada correctamente');
            setTimeout(() => setMessage(null), 2000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar variación:', err);
        } finally {
          setSaving(false);
        }
      })();
      
      return updatedConfig;
    });
  };

  const handleDeleteVariacion = (productoId, variacionIndex) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).filter((_, i) => i !== variacionIndex),
            }
          : p
      );
      
      const updatedConfig = {
        ...prev,
        productos: updatedProductos,
      };
      
      // Guardar automáticamente
      (async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            setMessage('✓ Variación eliminada correctamente');
            setTimeout(() => setMessage(null), 2000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar variación:', err);
        } finally {
          setSaving(false);
        }
      })();
      
      return updatedConfig;
    });
  };

  const handleVariacionChange = (productoId, variacionIndex, field, value) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).map((v, i) =>
                i === variacionIndex ? { ...v, [field]: value } : v
              ),
            }
          : p
      );
      
      const updatedConfig = {
        ...prev,
        productos: updatedProductos,
      };
      
      // Guardar automáticamente después de un pequeño delay para evitar demasiadas llamadas
      clearTimeout(handleVariacionChange.saveTimeout);
      handleVariacionChange.saveTimeout = setTimeout(async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig, null, 2),
          });
          if (res.ok) {
            console.log('[panel] Variación actualizada');
          }
        } catch (err) {
          console.error('[panel] Error al guardar variación:', err);
        } finally {
          setSaving(false);
        }
      }, 1000);
      
      return updatedConfig;
    });
  };

  const handleAddValorVariacion = (productoId, variacionIndex) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).map((v, i) =>
                i === variacionIndex
                  ? {
                      ...v,
                      valores: [
                        ...(v.valores || []),
                        { nombre: `Opción ${(v.valores || []).length + 1}`, precio: 0 },
                      ],
                    }
                  : v
              ),
            }
          : p
      );
      return {
        ...prev,
        productos: updatedProductos,
      };
    });
  };

  const handleDeleteValorVariacion = (productoId, variacionIndex, valorIndex) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).map((v, i) =>
                i === variacionIndex
                  ? {
                      ...v,
                      valores: (v.valores || []).filter((_, vi) => vi !== valorIndex),
                    }
                  : v
              ),
            }
          : p
      );
      return {
        ...prev,
        productos: updatedProductos,
      };
    });
  };

  const handleValorVariacionChange = (productoId, variacionIndex, valorIndex, field, value) => {
    setConfig((prev) => {
      const updatedProductos = prev.productos.map((p) =>
        p.id === productoId
          ? {
              ...p,
              variaciones: (p.variaciones || []).map((v, i) =>
                i === variacionIndex
                  ? {
                      ...v,
                      valores: (v.valores || []).map((val, vi) =>
                        vi === valorIndex
                          ? {
                              ...val,
                              [field]:
                                field === 'precio'
                                  ? Number.isNaN(parseInt(value, 10))
                                    ? 0
                                    : parseInt(value, 10)
                                  : value,
                            }
                          : val
                      ),
                    }
                  : v
              ),
            }
          : p
      );
      return {
        ...prev,
        productos: updatedProductos,
      };
    });
  };

  const handleZipResponse = async (res) => {
    console.log('[panel] Respuesta del servidor:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
    });

    if (!res.ok) {
      let errorData;
      try {
        const text = await res.text();
        console.error('[panel] Respuesta de error del servidor (texto):', text);
        try {
          errorData = JSON.parse(text);
          console.error('[panel] Respuesta de error del servidor (JSON):', errorData);
        } catch (parseError) {
          console.error('[panel] No se pudo parsear la respuesta como JSON:', parseError);
          errorData = { error: text || `Error HTTP ${res.status}: ${res.statusText}` };
        }
      } catch (readError) {
        console.error('[panel] Error al leer la respuesta:', readError);
        errorData = { 
          error: `Error HTTP ${res.status}: ${res.statusText}`,
          details: readError.message 
        };
      }
      
      const errorMessage = errorData.error || errorData.message || `Error al subir el ZIP (HTTP ${res.status})`;
      const errorDetails = errorData.details ? ` - ${errorData.details}` : '';
      const errorHint = errorData.hint ? `\n\n💡 ${errorData.hint}` : '';
      
      console.error('[panel] Error completo:', {
        message: errorMessage,
        details: errorData.details,
        hint: errorData.hint,
        fullError: errorData,
        status: res.status,
      });
      
      throw new Error(`${errorMessage}${errorDetails}${errorHint}`);
    }

    let data;
    try {
      const text = await res.text();
      console.log('[panel] Respuesta exitosa del servidor (texto):', text.substring(0, 200));
      data = JSON.parse(text);
      console.log('[panel] ZIP subido exitosamente:', data);
    } catch (parseError) {
      console.error('[panel] Error al parsear respuesta exitosa:', parseError);
      throw new Error('Error al procesar la respuesta del servidor');
    }

    setMessage(`✓ ${data.numPages || 0} imágenes cargadas exitosamente`);
    setError(null);

    // Recargar configuración
    const configRes = await fetch('/api/catalog-config');
    if (configRes.ok) {
      const newConfig = await configRes.json();
      setConfig(newConfig);
      // Cargar miniaturas después de actualizar configuración
      if (newConfig.numPages) {
        setTimeout(() => loadThumbnails(newConfig.numPages), 500);
      }
    }

    // Limpiar después de un delay
    setTimeout(() => {
      setMessage(null);
      setZipFile(null);
    }, 3000);
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones del archivo
    if (file.type !== 'application/zip' && 
        file.type !== 'application/x-zip-compressed' && 
        !file.name.toLowerCase().endsWith('.zip')) {
      setError('Por favor, selecciona un archivo ZIP válido.');
      return;
    }
    
    // Validar tamaño máximo
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo es 100MB`);
      return;
    }

    if (file.size === 0) {
      setError('El archivo está vacío. Por favor, selecciona un ZIP válido.');
      return;
    }

    setZipUploading(true);
    setError(null);
    setMessage(null);
    setZipFile(file);

    try {
      console.log(`[panel] Iniciando subida de ZIP: ${file.name} (${file.size} bytes)`);
      
      // Vercel tiene límite de 4.5MB por petición, necesitamos usar chunks para archivos grandes
      const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB por chunk (por debajo del límite de Vercel)
      
      if (file.size <= MAX_CHUNK_SIZE) {
        // Archivo pequeño, subir directamente
        console.log('[panel] Archivo pequeño, subiendo directamente...');
        setMessage('Subiendo ZIP y procesando imágenes...');
        
        const formData = new FormData();
        formData.append('zip', file);
        
        const res = await fetch('/api/upload-zip-simple', {
          method: 'POST',
          body: formData,
        });
        
        await handleZipResponse(res);
      } else {
        // Archivo grande, usar chunks
        console.log('[panel] Archivo grande, usando chunks...');
        const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
        const sessionId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        console.log(`[panel] Archivo dividido en ${totalChunks} chunks de ~${(MAX_CHUNK_SIZE / 1024 / 1024).toFixed(2)}MB`);
        setMessage(`Subiendo ZIP: 0/${totalChunks} partes...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Subir cada chunk
        for (let i = 0; i < totalChunks; i++) {
          const start = i * MAX_CHUNK_SIZE;
          const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
          const chunkArray = uint8Array.slice(start, end);
          
          // Convertir a base64
          let binary = '';
          for (let j = 0; j < chunkArray.length; j++) {
            binary += String.fromCharCode(chunkArray[j]);
          }
          const chunkBase64 = btoa(binary);
          
          console.log(`[panel] Subiendo chunk ZIP ${i + 1}/${totalChunks} (${chunkArray.length} bytes)`);
          setMessage(`Subiendo ZIP: ${i + 1}/${totalChunks} partes...`);
          
          const res = await fetch('/api/upload-zip-chunk', {
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
          console.log(`[panel] Chunk ZIP ${i + 1}/${totalChunks} subido exitosamente`);
          
          // Si es el último chunk y se ensambló correctamente
          if (data.assembled) {
            console.log(`[panel] ZIP ensamblado exitosamente en el servidor`);
            setMessage(`✓ ${data.numPages || 0} imágenes cargadas exitosamente`);
            setError(null);

            // Recargar configuración
            setTimeout(async () => {
              try {
                const configRes = await fetch('/api/catalog-config');
                if (configRes.ok) {
                  const newConfig = await configRes.json();
                  setConfig(newConfig);
                  // Cargar miniaturas después de actualizar configuración
                  if (newConfig.numPages) {
                    setTimeout(() => loadThumbnails(newConfig.numPages), 1000);
                  }
                }
              } catch (err) {
                console.error('[panel] Error al recargar configuración:', err);
              }
            }, 1000);

            // Limpiar después de un delay
            setTimeout(() => {
              setMessage(null);
              setZipFile(null);
            }, 3000);
            
            return; // Salir del loop
          }
        }
      }

      await handleZipResponse(res);

    } catch (err) {
      console.error('[panel] Error al subir ZIP:', err);
      setError(`Error al subir el archivo ZIP: ${err.message || 'Error desconocido'}`);
      setMessage(null);
    } finally {
      setZipUploading(false);
    }
  };

  const handleDeleteHotspot = async (index) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Marcador',
      message: '¿Estás seguro de que quieres eliminar este marcador?',
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        deleteHotspot(index);
      }
    });
  };

  const deleteHotspot = async (index) => {
    
    setConfig((prev) => {
      const updatedConfig = {
        ...prev,
        hotspots: prev.hotspots.filter((_, i) => i !== index),
      };

      // Guardar automáticamente después de eliminar
      (async () => {
        try {
          setSaving(true);
          setMessage(null);
          setError(null);
          
          console.log('[panel] Guardando configuración después de eliminar marcador:', {
            hotspotsRestantes: updatedConfig.hotspots.length,
            timestamp: new Date().toISOString()
          });
          
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedConfig, null, 2),
          });

          const result = await res.json();
          
          if (res.ok && result.ok) {
            console.log('[panel] Guardado exitoso:', result);
            setMessage(`✓ Marcador eliminado correctamente`);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error('[panel] Error al guardar:', result);
            setError(`✗ No se pudo eliminar el marcador. Intenta nuevamente.`);
            setTimeout(() => setError(null), 8000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar marcador:', err);
          setError(`✗ Error de conexión. Intenta nuevamente.`);
          setTimeout(() => setError(null), 8000);
        } finally {
          setSaving(false);
        }
      })();

      return updatedConfig;
    });
  };

  const handleDeleteAllImages = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar ZIP e Imágenes',
      message: `¿Estás seguro de que quieres eliminar el archivo ZIP "${config?.zipFilename}" y todas las ${config?.numPages || 0} imágenes del catálogo? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar Todo',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try {
          setMessage('Eliminando imágenes del catálogo...');
          const res = await fetch('/api/delete-catalog-images', {
            method: 'DELETE',
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || 'Error al eliminar imágenes');
          }
          
          const data = await res.json();
          setMessage(`✓ ${data.deletedImages || 0} imágenes eliminadas correctamente`);
          
          // Recargar configuración
          const configRes = await fetch('/api/catalog-config');
          if (configRes.ok) {
            const newConfig = await configRes.json();
            setConfig(newConfig);
            setThumbnails([]);
          }
          
          setTimeout(() => setMessage(null), 3000);
        } catch (err) {
          console.error('[panel] Error al eliminar imágenes:', err);
          setError(`Error al eliminar imágenes: ${err.message}`);
        }
      },
    });
  };

  const handleDeleteAllHotspots = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Todos los Marcadores',
      message: `¿Estás seguro de que quieres eliminar TODOS los ${config.hotspots.length} marcadores? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        deleteAllHotspots();
      }
    });
  };

  const deleteAllHotspots = async () => {

    setConfig((prev) => {
      const count = prev.hotspots.length;
      const updatedConfig = {
        ...prev,
        hotspots: [],
      };

      setSelectedHotspots(new Set());

      // Guardar automáticamente después de eliminar
      (async () => {
        try {
          setSaving(true);
          setMessage(null);
          setError(null);
          
          console.log('[panel] Guardando configuración después de eliminar todos los marcadores:', {
            eliminados: count,
            hotspotsRestantes: 0,
            timestamp: new Date().toISOString()
          });
          
          const res = await fetch('/api/catalog-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedConfig, null, 2),
          });

          const result = await res.json();
          
          if (res.ok && result.ok) {
            console.log('[panel] Guardado exitoso:', result);
            setMessage(`✓ Todos los marcadores (${count}) eliminados correctamente`);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error('[panel] Error al guardar:', result);
            setError(`✗ No se pudieron eliminar los marcadores. Intenta nuevamente.`);
            setTimeout(() => setError(null), 8000);
          }
        } catch (err) {
          console.error('[panel] Error al guardar después de eliminar todos los marcadores:', err);
          setError(`✗ Error de conexión. Intenta nuevamente.`);
          setTimeout(() => setError(null), 8000);
        } finally {
          setSaving(false);
        }
      })();

      return updatedConfig;
    });
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
          duration={5000}
        />
        <Toast
          message={error}
          type="error"
          onClose={() => setError(null)}
          duration={8000}
        />

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm || (() => {})}
          onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
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
            <button
              type="button"
              onClick={() => setActiveTab('lista-precios')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === 'lista-precios'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Lista de Precios
            </button>
          </div>

          {/* Sección productos */}
          {activeTab === 'productos' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Productos</h2>
                <p className="text-gray-600 text-sm">
              Edita el precio y la descripción que se muestran en el modal de cada producto.
            </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {config.productos && config.productos.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Valor total estimado</p>
                    <p className="text-lg font-bold text-primary-600">
                      ${config.productos.reduce((sum, p) => sum + (p.precio || 0), 0).toLocaleString()}
                    </p>
                  </div>
                )}
                {config.productos && config.productos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllProductos}
                    className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors border-2 border-red-800 flex items-center gap-2"
                    title="Eliminar todos los productos"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Todos
                  </button>
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
                      <>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-32">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                              Precio Base
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
                        {/* Variaciones en vista lista (compacta) */}
                        {(producto.variaciones || []).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase">Variaciones:</span>
                              {(producto.variaciones || []).map((variacion, variacionIndex) => (
                                <span key={variacionIndex} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {variacion.nombre} ({(variacion.valores || []).length} opciones)
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleAddVariacion(producto.id)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        )}
                      </>
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
                    
                    {/* Sección de Variaciones */}
                    {viewMode === 'grid' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Variaciones del Producto</h4>
                          <button
                            type="button"
                            onClick={() => handleAddVariacion(producto.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar Variación
                          </button>
                        </div>
                        
                        {(producto.variaciones || []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No hay variaciones. Agrega una para ofrecer diferentes opciones (ej: Tamaño, Color, etc.)</p>
                        ) : (
                          <div className="space-y-4">
                            {(producto.variaciones || []).map((variacion, variacionIndex) => (
                              <div key={variacionIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <input
                                    type="text"
                                    value={variacion.nombre || ''}
                                    onChange={(e) => handleVariacionChange(producto.id, variacionIndex, 'nombre', e.target.value)}
                                    placeholder="Nombre de la variación (ej: Tamaño de hoja)"
                                    className="flex-1 px-2 py-1 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVariacion(producto.id, variacionIndex)}
                                    className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar variación"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                
                                {/* Sistema simplificado: precio directo en la variación */}
                                <div className="flex items-center gap-2 mt-2">
                                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Precio:</label>
                                  <div className="flex items-center gap-1 flex-1">
                                    <span className="text-xs text-gray-500">$</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      step="0.01"
                                      value={variacion.precio !== undefined && variacion.precio !== null ? variacion.precio.toString().replace('.', ',') : ''}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.');
                                        handleUpdateVariacionPrecio(producto.id, variacionIndex, value);
                                      }}
                                      placeholder="0,00"
                                      className="flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
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
                        setConfirmModal({
                          isOpen: true,
                          title: 'Eliminar Productos Sin Nombre',
                          message: `¿Eliminar ${sinNombre.length} producto(s) sin nombre o con nombre por defecto?`,
                          onConfirm: () => {
                            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                            sinNombre.forEach((p) => deleteProducto(p.id));
                          }
                        });
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
                
                {/* Variaciones Globales */}
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Variaciones Globales</h3>
                      <p className="text-sm text-gray-600">
                        Crea variaciones que podrás agregar a cualquier producto (ej: "Hoja 12 cm", "Color Rojo", etc.)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariacionGlobal}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar Variación
                    </button>
                  </div>
                  
                  {(config.variacionesGlobales || []).length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">
                      No hay variaciones globales. Crea una para poder agregarla a tus productos.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(config.variacionesGlobales || []).map((variacion, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                Nombre de la Variación
                              </label>
                              <input
                                type="text"
                                value={variacion.nombre || ''}
                                onChange={(e) => handleVariacionGlobalChange(index, 'nombre', e.target.value)}
                                placeholder="Ej: Hoja 12 cm, Color Rojo, Tamaño Grande"
                                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                Precio Base
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-xs font-medium">
                                  $
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={variacion.precioBase !== undefined && variacion.precioBase !== null ? variacion.precioBase.toString().replace('.', ',') : ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.');
                                    handleVariacionGlobalChange(index, 'precioBase', value);
                                  }}
                                  placeholder="0,00"
                                  className="w-full pl-6 pr-2 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariacionGlobal(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar variación global"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Cargar PDF - OCULTO */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm" style={{ display: 'none' }}>
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

                {/* Información del ZIP actual y opción de eliminar */}
                {config?.useImages && config?.zipFilename && (
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Archivo ZIP del Catálogo
                    </label>
                    <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-800">{config.zipFilename}</span>
                          </div>
                          {config.imagesUpdatedAt && (
                            <p className="text-xs text-gray-500">
                              Subido: {new Date(config.imagesUpdatedAt).toLocaleString('es-ES')}
                            </p>
                          )}
                          {config.numPages && (
                            <p className="text-xs text-gray-500">
                              {config.numPages} imágenes en el catálogo
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteAllImages}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar ZIP e Imágenes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cargar ZIP con imágenes */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cargar Catálogo desde ZIP (Imágenes JPG)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors bg-white">
                    <input
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={handleZipUpload}
                      disabled={zipUploading}
                      className="hidden"
                      id="zip-upload"
                    />
                    <label
                      htmlFor="zip-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 block">
                          {zipFile ? zipFile.name : 'Haz clic para seleccionar ZIP'}
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          {zipUploading ? 'Procesando...' : 'ZIP con imágenes JPG (jpg, jpeg). Las imágenes se ordenarán por nombre.'}
                        </span>
                      </div>
                    </label>
                  </div>
                  {zipFile && !zipUploading && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                      ✓ Archivo seleccionado: {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  {zipUploading && (
                    <div className="mt-2 text-sm text-blue-600">
                      ⏳ Procesando imágenes...
                    </div>
                  )}
                </div>

                {/* Sección de Miniaturas */}
                {config?.numPages && (
                  <div className="bg-white rounded-xl shadow-md p-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">
                        📸 Miniaturas del Catálogo ({config.numPages} páginas)
                      </h3>
                      <button
                        onClick={() => loadThumbnails(config.numPages)}
                        disabled={loadingThumbnails}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                      >
                        {loadingThumbnails ? 'Cargando...' : '🔄 Actualizar'}
                      </button>
                    </div>
                    
                    {loadingThumbnails ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p className="mt-2 text-gray-600">Cargando miniaturas...</p>
                      </div>
                    ) : thumbnails.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                        {thumbnails.map((thumbnail, index) => (
                          <div
                            key={index}
                            className="relative group cursor-pointer hover:scale-105 transition-transform"
                            style={{ maxWidth: '8cm' }}
                          >
                            <img
                              src={thumbnail}
                              alt={`Página ${index + 1}`}
                              className="w-full h-auto rounded-lg shadow-md border-2 border-gray-200 group-hover:border-primary-400 transition-colors"
                              style={{ maxWidth: '8cm', height: 'auto' }}
                              loading="lazy"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              Página {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">No hay miniaturas disponibles.</p>
                        <p className="text-sm">Las miniaturas se generan automáticamente al subir un ZIP con imágenes.</p>
                        <button
                          onClick={() => loadThumbnails(config.numPages)}
                          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          Intentar cargar de nuevo
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                    max={config?.numPages || 9999}
                    step={1}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={bulkHotspotStartPage}
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '' || inputVal === null) {
                        setBulkHotspotStartPage(1);
                        return;
                      }
                      const numVal = parseInt(inputVal, 10);
                      if (!isNaN(numVal) && numVal >= 1) {
                        const maxPage = config?.numPages || 9999;
                        const val = Math.max(1, Math.min(maxPage, numVal));
                        setBulkHotspotStartPage(val);
                        // Si la página final es menor que la inicial, ajustarla
                        if (bulkHotspotEndPage !== null && bulkHotspotEndPage < val) {
                          setBulkHotspotEndPage(val);
                        }
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
                    min={bulkHotspotStartPage || 1}
                    max={config?.numPages || 9999}
                    step={1}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={bulkHotspotEndPage || ''}
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '' || inputVal === null) {
                        setBulkHotspotEndPage(null);
                      } else {
                        const numVal = parseInt(inputVal, 10);
                        if (!isNaN(numVal) && numVal >= 1) {
                          const maxPage = config?.numPages || 9999;
                          const minVal = bulkHotspotStartPage || 1;
                          const val = Math.max(minVal, Math.min(maxPage, numVal));
                          setBulkHotspotEndPage(val);
                        }
                      }
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

            {/* Botones para gestionar marcadores masivamente */}
            <div className="mb-4 space-y-3">
              {/* Sección para ocultar/mostrar todos */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Gestionar Visibilidad de Marcadores</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleHideAllHotspots}
                    className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
                    title="Ocultar todos los marcadores"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Ocultar Todos
                  </button>
                  <button
                    type="button"
                    onClick={handleShowAllHotspots}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    title="Mostrar todos los marcadores"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Mostrar Todos
                  </button>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="font-semibold">
                      {config.hotspots.filter(h => h.enabled).length} visibles
                    </span>
                    <span>de</span>
                    <span className="font-semibold">{config.hotspots.length} total</span>
                  </div>
                </div>
              </div>

              {/* Botones para eliminar masivamente */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {selectedHotspots.size > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
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
                {config.hotspots && config.hotspots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllHotspots}
                    className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors border-2 border-red-800"
                    title="Eliminar todos los marcadores"
                  >
                    🗑️ Eliminar Todos los Marcadores
                  </button>
                )}
              </div>
            </div>

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
                          <div className="w-16 h-24 rounded-md border-2 border-gray-300 relative overflow-hidden bg-gray-100">
                            <img
                              src={`/api/catalog-thumbnail/${h.page}`}
                              alt={`Página ${h.page}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback a placeholder si no hay miniatura
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) {
                                  placeholder.style.display = 'block';
                                }
                              }}
                            />
                            <div
                              className="absolute inset-0 bg-gray-50"
                              style={{ display: 'none' }}
                            />
                            <div
                              className="absolute rounded-sm border-2 border-primary-500/90 bg-primary-500/25 z-10"
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

          {/* Sección Lista de Precios */}
          {activeTab === 'lista-precios' && (
          <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Lista de Precios</h2>
                <p className="text-gray-600 text-sm">Exporta e importa precios de productos y variaciones desde Excel</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Exportar a Excel */}
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-5 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Exportar a Excel</h3>
                    <p className="text-sm text-gray-600">
                      Descarga un archivo Excel con todos los productos y sus variaciones con precios
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar Excel
                  </button>
                </div>
              </div>

              {/* Importar desde Excel */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Importar desde Excel</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Sube un archivo Excel para actualizar precios. Las variaciones que no existan se agregarán automáticamente.
                  </p>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-white">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportFromExcel}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 block">
                          Haz clic para seleccionar archivo Excel
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          Formatos soportados: .xlsx, .xls
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Información sobre el formato */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Formato del Excel</h4>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>El archivo Excel debe tener las siguientes columnas:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Producto:</strong> Nombre del producto</li>
                    <li><strong>Precio Base:</strong> Precio base del producto</li>
                    <li><strong>Variación:</strong> Nombre de la variación (opcional)</li>
                    <li><strong>Precio Variación:</strong> Precio de la variación (opcional)</li>
                  </ul>
                  <p className="mt-3 text-gray-500 italic">
                    Si un producto tiene variaciones, cada variación debe estar en una fila separada con el mismo nombre de producto.
                  </p>
                </div>
              </div>
            </div>
          </section>
          )}
        </div>
      </main>
    </>
  );
}


