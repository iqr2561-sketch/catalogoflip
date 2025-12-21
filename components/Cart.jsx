import { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';

export default function Cart({ whatsappNumber = null, cotizacionDolar = 1, mostrarPreciosEnPesos = false, imagenGeneralProductos = '' }) {
  const productos = useCartStore((state) => state.productos);
  const eliminarProducto = useCartStore((state) => state.eliminarProducto);
  const actualizarCantidad = useCartStore((state) => state.actualizarCantidad);
  const limpiarCarrito = useCartStore((state) => state.limpiarCarrito);
  const getTotal = useCartStore((state) => state.getTotal);
  const tipoPrecio = useCartStore((state) => state.tipoPrecio);
  const [isOpen, setIsOpen] = useState(false);
  const [whatsappNum, setWhatsappNum] = useState(whatsappNumber);
  const [config, setConfig] = useState({ 
    cotizacionDolar: 1, 
    mostrarPreciosEnPesos: false, 
    imagenGeneralProductos: '',
    minProductosMayorista: 50 
  });
  const [swipedKey, setSwipedKey] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  // Cargar configuración desde la API
  useEffect(() => {
    fetch('/api/catalog-config')
      .then(res => res.json())
      .then(data => {
        if (data.whatsappNumber && !whatsappNum) {
          setWhatsappNum(data.whatsappNumber);
        }
        setConfig({
          cotizacionDolar: data.cotizacionDolar || cotizacionDolar || 1,
          mostrarPreciosEnPesos: data.mostrarPreciosEnPesos || mostrarPreciosEnPesos || false,
          imagenGeneralProductos: data.imagenGeneralProductos || imagenGeneralProductos || '',
          minProductosMayorista: data.minProductosMayorista || 50
        });
      })
      .catch(err => console.error('Error al cargar configuración:', err));
  }, [whatsappNum, cotizacionDolar, mostrarPreciosEnPesos, imagenGeneralProductos]);

  const total = getTotal();
  const itemCount = productos.reduce((sum, p) => sum + (p.cantidad || 1), 0);
  const minProductosMayorista = config.minProductosMayorista || 50;
  const productosFaltantes = Math.max(0, minProductosMayorista - itemCount);
  const puedeFinalizar = tipoPrecio === 'minorista' || itemCount >= minProductosMayorista;
  const porcentajeProgreso = tipoPrecio === 'mayorista' 
    ? Math.min(100, (itemCount / minProductosMayorista) * 100)
    : 100;

  // Función helper para formatear precios
  const formatearPrecio = (precio) => {
    const mostrarPesos = config.mostrarPreciosEnPesos || mostrarPreciosEnPesos;
    const cotizacion = config.cotizacionDolar || cotizacionDolar || 1;
    const precioFinal = mostrarPesos 
      ? precio * cotizacion 
      : precio;
    const simbolo = mostrarPesos ? '' : 'USD $';
    const moneda = mostrarPesos ? ' Pesos' : '';
    return `${simbolo}${precioFinal.toLocaleString()}${moneda}`;
  };

  // Formato de precio específico para el mensaje de WhatsApp (siempre con $ y 2 decimales)
  const formatearPrecioWhatsapp = (precio) => {
    const mostrarPesos = config.mostrarPreciosEnPesos || mostrarPreciosEnPesos;
    const cotizacion = config.cotizacionDolar || cotizacionDolar || 1;
    const precioFinal = mostrarPesos ? (precio || 0) * cotizacion : (precio || 0);
    return `$${Number(precioFinal || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const numeroEmoji = (n) => {
    const map = {
      1: '1️⃣',
      2: '2️⃣',
      3: '3️⃣',
      4: '4️⃣',
      5: '5️⃣',
      6: '6️⃣',
      7: '7️⃣',
      8: '8️⃣',
      9: '9️⃣',
      10: '🔟',
    };
    return map[n] || `${n}️⃣`;
  };

  const construirTituloProductoParaWhatsapp = (producto) => {
    // Si viene como "Nombre (Variación)" lo convertimos a "Nombre – Variación"
    if (typeof producto?.nombre === 'string') {
      const m = producto.nombre.match(/^(.*)\s+\((.*)\)\s*$/);
      if (m && m[1] && m[2]) return `${m[1]} – ${m[2]}`;
    }

    // Si hay variación seleccionada, intentamos armar "Producto – Variación"
    const variaciones = producto?.variacionesSeleccionadas;
    if (variaciones && typeof variaciones === 'object' && Object.keys(variaciones).length > 0) {
      const firstValue = Object.values(variaciones)[0];
      if (firstValue) return `${producto?.nombre || 'Producto'} – ${firstValue}`;
    }

    return producto?.nombre || 'Producto';
  };

  const handleCheckout = () => {
    if (!whatsappNum) {
      alert('No se ha configurado un número de WhatsApp. Por favor, configúralo en el panel de control.');
      return;
    }
    
    // Validar mínimo de productos para lista mayorista
    if (tipoPrecio === 'mayorista' && itemCount < minProductosMayorista) {
      alert(`Para finalizar una compra mayorista necesitas al menos ${minProductosMayorista} productos. Actualmente tienes ${itemCount} productos. Te faltan ${productosFaltantes} productos.`);
      return;
    }

    // Construir mensaje de WhatsApp
    let mensaje = '🧾 *Detalle del pedido*\n\n';

    productos.forEach((producto, index) => {
      const cantidad = producto.cantidad || 1;
      const precioUnitario = producto.precio || 0;
      const subtotal = precioUnitario * cantidad;
      const titulo = construirTituloProductoParaWhatsapp(producto);

      mensaje += `${numeroEmoji(index + 1)} *${titulo}*\n`;
      mensaje += `• Cantidad: ${cantidad}\n`;
      mensaje += `• Precio unitario: ${formatearPrecioWhatsapp(precioUnitario)}\n`;
      mensaje += `• Subtotal: ${formatearPrecioWhatsapp(subtotal)}\n\n`;
    });

    mensaje += '────────────────────\n';
    mensaje += `💰 *Total del pedido:* ${formatearPrecioWhatsapp(total)}\n`;
    mensaje += '────────────────────\n\n';
    mensaje += '🙏 Gracias por tu pedido. Estamos preparando tu compra.';

    // Codificar el mensaje para URL
    const mensajeEncoded = encodeURIComponent(mensaje);
    
    // Formatear número de WhatsApp (eliminar caracteres no numéricos excepto +)
    const numeroLimpio = whatsappNum.replace(/[^\d+]/g, '');
    
    // Guardar la orden en el sistema antes de enviar
    const orderData = {
      productos: productos.map(p => ({
        id: p.id,
        nombre: construirTituloProductoParaWhatsapp(p),
        precio: p.precio || 0,
        cantidad: p.cantidad || 1,
        variaciones: p.variacionesSeleccionadas || {},
      })),
      total: total,
      cotizacionDolar: config.cotizacionDolar || cotizacionDolar || 1,
      mostrarPreciosEnPesos: config.mostrarPreciosEnPesos || mostrarPreciosEnPesos || false,
      whatsappNumber: whatsappNum,
      timestamp: new Date().toISOString(),
    };

    // Guardar orden en el backend (no bloquea el flujo si falla)
    fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.ok) {
          console.log('[Cart] ✅ Orden guardada correctamente:', data);
        } else {
          console.warn('[Cart] ⚠️ No se pudo guardar la orden:', data);
        }
      })
      .catch(err => {
        console.error('[Cart] ❌ Error al guardar orden:', err);
        // No bloqueamos el flujo, pero registramos el error
      });

    // Abrir WhatsApp Web/App
    const whatsappUrl = `https://wa.me/${numeroLimpio}?text=${mensajeEncoded}`;
    window.open(whatsappUrl, '_blank');
    
    // Limpiar carrito después de enviar
    limpiarCarrito();
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón flotante del carrito */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] w-16 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Modal del carrito */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Carrito de Compras</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-4">
              {productos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Agrupar productos por nombre base */}
                  {(() => {
                    // Agrupar productos por nombre base (sin variaciones)
                    const grupos = productos.reduce((acc, producto) => {
                      // Extraer nombre base (antes del "–")
                      const nombreBase = producto.nombre.split(' – ')[0];
                      if (!acc[nombreBase]) {
                        acc[nombreBase] = [];
                      }
                      acc[nombreBase].push(producto);
                      return acc;
                    }, {});

                    return Object.entries(grupos).map(([nombreBase, productosGrupo]) => (
                      <div key={nombreBase} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Encabezado del grupo si hay más de un producto o variaciones */}
                        {productosGrupo.length > 1 && (
                          <div className="px-4 py-2 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
                            <h4 className="font-semibold text-primary-700 text-sm">{nombreBase}</h4>
                            <p className="text-xs text-primary-600 mt-0.5">
                              {productosGrupo.length} {productosGrupo.length === 1 ? 'variante' : 'variantes'}
                            </p>
                          </div>
                        )}
                        <div className="divide-y divide-gray-100">
                          {productosGrupo.map((producto) => (
                            <div key={producto.cartKey || producto.id} className="relative overflow-hidden">
                              {/* Acción de borrar (visible al hacer swipe) */}
                              <div className="absolute inset-y-0 right-0 w-20 bg-red-600 flex items-center justify-center z-10">
                                <button
                                  onClick={() => eliminarProducto(producto.cartKey || producto.id)}
                                  className="text-white font-bold text-sm"
                                  aria-label="Eliminar"
                                >
                                  Eliminar
                                </button>
                              </div>

                              <div
                                className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors"
                                style={{
                                  transform: swipedKey === (producto.cartKey || producto.id) ? 'translateX(-80px)' : 'translateX(0px)',
                                  transition: touchStartX === null ? 'transform 180ms ease' : 'none',
                                }}
                                onTouchStart={(e) => {
                                  const x = e.touches?.[0]?.clientX;
                                  setTouchStartX(typeof x === 'number' ? x : null);
                                }}
                                onTouchMove={(e) => {
                                  if (touchStartX === null) return;
                                  const x = e.touches?.[0]?.clientX;
                                  if (typeof x !== 'number') return;
                                  const delta = x - touchStartX;
                                  if (delta < -40) setSwipedKey(producto.cartKey || producto.id);
                                  if (delta > 30) setSwipedKey(null);
                                }}
                                onTouchEnd={() => {
                                  setTouchStartX(null);
                                }}
                              >
                                {/* Imagen */}
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {(producto.imagen || config.imagenGeneralProductos) ? (
                                    <img
                                      src={producto.imagen || config.imagenGeneralProductos}
                                      alt={producto.nombre}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xl md:text-2xl">📦</span>
                                  )}
                                </div>

                                {/* Información del producto */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                  {/* Nombre completo solo si hay variaciones o si es único */}
                                  {productosGrupo.length === 1 ? (
                                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">
                                      {producto.nombre}
                                    </h3>
                                  ) : (
                                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">
                                      {producto.nombre.split(' – ').slice(1).join(' – ') || producto.nombre}
                                    </h3>
                                  )}
                                  
                                  {/* Detalle de variación si existe */}
                                  {producto.variacionesSeleccionadas && Object.keys(producto.variacionesSeleccionadas).length > 0 && (
                                    <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block w-fit">
                                      {Object.values(producto.variacionesSeleccionadas).join(', ')}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
                                    <div className="flex flex-col gap-0.5">
                                      <p className="text-primary-600 font-bold text-sm md:text-base">
                                        {formatearPrecio(producto.precio || 0)}
                                      </p>
                                      {producto.precioBase !== undefined && producto.precioBase !== producto.precio && (
                                        <p className="text-xs text-gray-400 line-through">
                                          Base: {formatearPrecio(producto.precioBase || 0)}
                                        </p>
                                      )}
                                    </div>
                                    {/* Cantidad */}
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                      <button
                                        onClick={() =>
                                          actualizarCantidad(
                                            producto.cartKey || producto.id,
                                            Math.max(1, (producto.cantidad || 1) - 1)
                                          )
                                        }
                                        className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                      >
                                        <svg
                                          className="w-3 h-3 md:w-4 md:h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M20 12H4"
                                          />
                                        </svg>
                                      </button>
                                      <span className="w-6 text-center font-semibold text-sm md:text-base">
                                        {producto.cantidad || 1}
                                      </span>
                                      <button
                                        onClick={() =>
                                          actualizarCantidad(
                                            producto.cartKey || producto.id,
                                            (producto.cantidad || 1) + 1
                                          )
                                        }
                                        className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                      >
                                        <svg
                                          className="w-3 h-3 md:w-4 md:h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Subtotal */}
                                  <p className="text-xs text-gray-500 font-medium">
                                    Subtotal: {formatearPrecio((producto.precio || 0) * (producto.cantidad || 1))}
                                  </p>
                                </div>

                                {/* Botón eliminar (desktop) */}
                                <button
                                  onClick={() => eliminarProducto(producto.cartKey || producto.id)}
                                  className="hidden md:flex w-8 h-8 md:w-10 md:h-10 items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                  aria-label="Eliminar producto"
                                >
                                  <svg
                                    className="w-4 h-4 md:w-5 md:h-5"
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
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
                      {/* Acción de borrar (visible al hacer swipe) */}
                      <div className="absolute inset-y-0 right-0 w-20 bg-red-600 flex items-center justify-center">
                        <button
                          onClick={() => eliminarProducto(producto.cartKey || producto.id)}
                          className="text-white font-bold"
                          aria-label="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div
                        className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        style={{
                          transform: swipedKey === (producto.cartKey || producto.id) ? 'translateX(-80px)' : 'translateX(0px)',
                          transition: touchStartX === null ? 'transform 180ms ease' : 'none',
                        }}
                        onTouchStart={(e) => {
                          const x = e.touches?.[0]?.clientX;
                          setTouchStartX(typeof x === 'number' ? x : null);
                        }}
                        onTouchMove={(e) => {
                          if (touchStartX === null) return;
                          const x = e.touches?.[0]?.clientX;
                          if (typeof x !== 'number') return;
                          const delta = x - touchStartX; // negativo -> izquierda
                          if (delta < -40) setSwipedKey(producto.cartKey || producto.id);
                          if (delta > 30) setSwipedKey(null);
                        }}
                        onTouchEnd={() => {
                          setTouchStartX(null);
                        }}
                      >
                      {/* Imagen más pequeña en móvil */}
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {(producto.imagen || config.imagenGeneralProductos) ? (
                          <img
                            src={producto.imagen || config.imagenGeneralProductos}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl md:text-2xl">📦</span>
                        )}
                      </div>

                      {/* Información del producto - mejorada para móvil */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">
                          {producto.nombre}
                        </h3>
                        {/* Detalle de variación si existe */}
                        {producto.variacionesSeleccionadas && Object.keys(producto.variacionesSeleccionadas).length > 0 && (
                          <p className="text-xs text-gray-500">
                            {Object.values(producto.variacionesSeleccionadas).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex flex-col gap-1">
                            <p className="text-primary-600 font-bold text-sm md:text-base">
                              {formatearPrecio(producto.precio || 0)}
                            </p>
                            {producto.precioBase !== undefined && producto.precioBase !== producto.precio && (
                              <p className="text-xs text-gray-400 line-through">
                                Base: {formatearPrecio(producto.precioBase || 0)}
                              </p>
                            )}
                          </div>
                          {/* Cantidad visible y separada del nombre */}
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200">
                            <button
                              onClick={() =>
                                actualizarCantidad(
                                  producto.cartKey || producto.id,
                                  Math.max(1, (producto.cantidad || 1) - 1)
                                )
                              }
                              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              <svg
                                className="w-3 h-3 md:w-4 md:h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span className="w-6 text-center font-semibold text-sm md:text-base">
                              {producto.cantidad || 1}
                            </span>
                            <button
                              onClick={() =>
                                actualizarCantidad(
                                  producto.cartKey || producto.id,
                                  (producto.cantidad || 1) + 1
                                )
                              }
                              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              <svg
                                className="w-3 h-3 md:w-4 md:h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {/* Subtotal */}
                        <p className="text-xs text-gray-500">
                          Subtotal: {formatearPrecio((producto.precio || 0) * (producto.cantidad || 1))}
                        </p>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        onClick={() => eliminarProducto(producto.cartKey || producto.id)}
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        aria-label="Eliminar producto"
                      >
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {productos.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                {/* Barra de progreso para lista mayorista */}
                {tipoPrecio === 'mayorista' && (
                  <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary-700">
                        Progreso para compra mayorista
                      </span>
                      <span className="text-sm font-bold text-primary-600">
                        {itemCount} / {minProductosMayorista} productos
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          puedeFinalizar 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : 'bg-gradient-to-r from-primary-500 to-primary-600'
                        }`}
                        style={{ width: `${porcentajeProgreso}%` }}
                      />
                    </div>
                    {!puedeFinalizar && (
                      <p className="text-xs text-primary-600 font-medium">
                        Te faltan <strong>{productosFaltantes} productos</strong> para alcanzar el mínimo de {minProductosMayorista} productos variados
                      </p>
                    )}
                    {puedeFinalizar && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Has alcanzado el mínimo requerido para compra mayorista
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatearPrecio(total)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={limpiarCarrito}
                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={!puedeFinalizar}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      puedeFinalizar
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Enviar por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

