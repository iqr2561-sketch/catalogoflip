import { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';

export default function ProductModal({ producto, isOpen, onClose, whatsappNumber = null, cotizacionDolar = 1, tipoPrecioDefault = 'minorista', mostrarPreciosEnPesos = false, imagenGeneralProductos = '' }) {
  const agregarProducto = useCartStore((state) => state.agregarProducto);
  const [imageError, setImageError] = useState(false);
  const [variacionesCantidades, setVariacionesCantidades] = useState({});
  
  // Debug: verificar que los props se reciban correctamente
  useEffect(() => {
    if (isOpen && producto) {
      console.log('[ProductModal] Props recibidos:', {
        mostrarPreciosEnPesos,
        cotizacionDolar,
        precioBase: producto.precio,
        precioEnPesos: mostrarPreciosEnPesos ? (producto.precio || 0) * cotizacionDolar : producto.precio
      });
    }
  }, [isOpen, producto, mostrarPreciosEnPesos, cotizacionDolar]);
  
  // Resetear selecciones cuando cambia el producto o se abre el modal
  useEffect(() => {
    if (isOpen && producto) {
      setVariacionesCantidades({});
    }
  }, [isOpen, producto]);
  
  const getPrecioVariacion = (variacion) => {
    return tipoPrecioDefault === 'mayorista'
      ? (variacion.precioMayorista || 0)
      : (variacion.precioMinorista || 0);
  };

  // Total del detalle (sumatoria de ítems seleccionados con cantidades)
  const calcularTotalDetalle = () => {
    if (!producto) return 0;
    
    if (!producto.variaciones || producto.variaciones.length === 0) {
      return producto.precio || 0;
    }
    
    let total = 0;
    (producto.variaciones || []).forEach((variacion) => {
      const qty = variacionesCantidades[variacion.nombre] || 0;
      if (qty > 0) {
        // El precio de la variación es el precio FINAL, no un incremental
        const precioUnitario = getPrecioVariacion(variacion) || (producto.precio || 0);
        total += precioUnitario * qty;
      }
    });
    return total;
  };

  if (!isOpen || !producto) return null;
  
  const totalDetalle = calcularTotalDetalle();

  const handleAgregar = () => {
    // Si no hay variaciones, agregar el producto base
    if (!producto.variaciones || producto.variaciones.length === 0) {
      const productoBase = {
        ...producto,
        precio: producto.precio || 0,
        variacionesSeleccionadas: {},
      };
      agregarProducto(productoBase, 1);
      onClose();
      return;
    }

    const variacionesActivas = Object.entries(variacionesCantidades)
      .filter(([, qty]) => (qty || 0) > 0)
      .map(([nombre]) => nombre);

    if (variacionesActivas.length === 0) {
      // Si no hay variaciones seleccionadas, agregar solo el producto base
      const productoBase = {
        ...producto,
        precio: producto.precio || 0,
        variacionesSeleccionadas: {},
      };
      agregarProducto(productoBase, 1);
    } else {
      // Agregar cada variación como un item separado con su cantidad
      variacionesActivas.forEach((nombreVariacion) => {
        const variacion = producto.variaciones.find(v => v.nombre === nombreVariacion);
        if (variacion) {
          const qty = Math.max(1, variacionesCantidades[nombreVariacion] || 1);
          const precioVariacion = getPrecioVariacion(variacion);
          
          // El precio de la variación es el precio FINAL, no un incremental
          // Guardamos el precio base para mostrarlo en el carrito
          const precioFinal = precioVariacion || (producto.precio || 0);
          
          const productoConVariacion = {
            ...producto,
            nombre: `${producto.nombre} – ${nombreVariacion}`,
            precio: precioFinal,
            precioBase: producto.precio || 0, // Guardar precio base para mostrar en carrito
            variacionesSeleccionadas: { [nombreVariacion]: nombreVariacion },
          };
          
          agregarProducto(productoConVariacion, qty);
        }
      });
    }

    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          >
            <svg
              className="w-6 h-6 text-gray-700"
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

          {/* Imagen del producto - Más pequeña */}
          <div className="w-full h-32 md:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden rounded-t-2xl">
            {!imageError && (producto.imagen || imagenGeneralProductos) ? (
              <img
                src={producto.imagen || imagenGeneralProductos}
                alt={producto.nombre}
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="text-gray-400 text-4xl">📦</div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {producto.nombre}
          </h2>

          {/* Variaciones (Sistema Simplificado) */}
          {(producto.variaciones || []).length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Opciones Disponibles
              </h3>
              {(producto.variaciones || []).map((variacion, variacionIndex) => (
                <div key={variacionIndex} className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-base font-bold text-gray-900 mb-1">
                        {variacion.nombre}
                      </label>
                      <p className="text-sm text-gray-600">
                        Precio: <span className="font-semibold text-primary-600">
                          {mostrarPreciosEnPesos ? (
                            <>${((tipoPrecioDefault === 'mayorista' 
                              ? (variacion.precioMayorista || producto.precio || 0)
                              : (variacion.precioMinorista || producto.precio || 0)
                            ) * cotizacionDolar).toLocaleString()} Pesos</>
                          ) : (
                            <>USD ${(tipoPrecioDefault === 'mayorista' 
                              ? (variacion.precioMayorista || producto.precio || 0)
                              : (variacion.precioMinorista || producto.precio || 0)
                            ).toLocaleString()}</>
                          )}
                        </span>
                        {!mostrarPreciosEnPesos && cotizacionDolar && cotizacionDolar !== 1 && (
                          <span className="text-xs text-gray-500 ml-2">
                            (≈ ${((tipoPrecioDefault === 'mayorista' 
                              ? (variacion.precioMayorista || producto.precio || 0)
                              : (variacion.precioMinorista || producto.precio || 0)
                            ) * cotizacionDolar).toLocaleString()} Pesos)
                          </span>
                        )}
                        {mostrarPreciosEnPesos && cotizacionDolar && cotizacionDolar !== 1 && (
                          <span className="text-xs text-gray-500 ml-2">
                            (≈ USD ${(((tipoPrecioDefault === 'mayorista' 
                              ? (variacion.precioMayorista || producto.precio || 0)
                              : (variacion.precioMinorista || producto.precio || 0)
                            ) * cotizacionDolar) / cotizacionDolar).toLocaleString()})
                          </span>
                        )}
                      </p>
                    </div>
                    {((variacionesCantidades[variacion.nombre] || 0) > 0) ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVariacionesCantidades((prev) => {
                              const curr = prev[variacion.nombre] || 0;
                              const next = Math.max(0, curr - 1);
                              const out = { ...prev };
                              if (next === 0) delete out[variacion.nombre];
                              else out[variacion.nombre] = next;
                              return out;
                            });
                          }}
                          className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center"
                          aria-label="Disminuir cantidad"
                        >
                          <span className="text-xl leading-none">−</span>
                        </button>
                        <div className="min-w-[44px] text-center font-bold text-gray-900">
                          {variacionesCantidades[variacion.nombre] || 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVariacionesCantidades((prev) => ({
                              ...prev,
                              [variacion.nombre]: (prev[variacion.nombre] || 0) + 1,
                            }));
                          }}
                          className="w-10 h-10 rounded-lg border-2 border-primary-300 bg-primary-50 hover:bg-primary-100 flex items-center justify-center"
                          aria-label="Aumentar cantidad"
                        >
                          <span className="text-xl leading-none">+</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVariacionesCantidades((prev) => {
                              const out = { ...prev };
                              delete out[variacion.nombre];
                              return out;
                            });
                          }}
                          className="w-10 h-10 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600"
                          aria-label="Eliminar variación"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setVariacionesCantidades((prev) => ({
                            ...prev,
                            [variacion.nombre]: 1,
                          }));
                        }}
                        className="px-5 py-3 rounded-lg border-2 transition-all flex items-center gap-2 min-w-[140px] justify-center font-semibold shadow-sm border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm">Incluir</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen / Subtotal */}
          {(producto.variaciones || []).length > 0 && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Detalle</h4>
                <span className="text-sm font-bold text-primary-700">
                  {mostrarPreciosEnPesos
                    ? `$${(totalDetalle * cotizacionDolar).toLocaleString()} Pesos`
                    : `USD ${totalDetalle.toLocaleString()}`}
                </span>
              </div>
              {Object.keys(variacionesCantidades).length === 0 ? (
                <p className="text-xs text-gray-500">Selecciona una o más variaciones para ver el detalle.</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(variacionesCantidades)
                    .filter(([, qty]) => (qty || 0) > 0)
                    .map(([nombre, qty]) => {
                      const variacion = (producto.variaciones || []).find((v) => v.nombre === nombre);
                      // El precio de la variación es el precio FINAL, no un incremental
                      const unit = variacion ? (getPrecioVariacion(variacion) || producto.precio || 0) : (producto.precio || 0);
                      const sub = unit * qty;
                      return (
                        <div key={nombre} className="flex items-center justify-between text-xs text-gray-700">
                          <span className="truncate pr-2">{qty} × {producto.nombre} – {nombre}</span>
                          <span className="font-semibold">
                            {mostrarPreciosEnPesos
                              ? `$${(sub * cotizacionDolar).toLocaleString()} Pesos`
                              : `USD ${sub.toLocaleString()}`}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Precio */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              {mostrarPreciosEnPesos ? (
                <>
                  <span className="block text-4xl md:text-5xl font-bold text-primary-600">
                    {(producto.variaciones || []).length > 0
                      ? `$${(totalDetalle * cotizacionDolar).toLocaleString()} Pesos`
                      : `$${((producto.precio || 0) * cotizacionDolar).toLocaleString()} Pesos`}
                  </span>
                  {cotizacionDolar && cotizacionDolar !== 1 && (
                    <span className="text-2xl md:text-3xl font-bold text-gray-500">
                      ≈ USD {(producto.variaciones || []).length > 0 ? totalDetalle.toLocaleString() : (producto.precio || 0).toLocaleString()}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="block text-4xl md:text-5xl font-bold text-primary-600">
                    USD {(producto.variaciones || []).length > 0 ? totalDetalle.toLocaleString() : (producto.precio || 0).toLocaleString()}
                  </span>
                  {cotizacionDolar && cotizacionDolar !== 1 && (
                    <span className="text-2xl md:text-3xl font-bold text-gray-500">
                      ≈ {(((producto.variaciones || []).length > 0 ? totalDetalle : (producto.precio || 0)) * cotizacionDolar).toLocaleString()} Pesos
                    </span>
                  )}
                </>
              )}
            </div>
            {(producto.variaciones || []).length > 0 && producto.precio > 0 && (
              <span className="mt-1 block text-xs text-gray-500">
                Precio base: {mostrarPreciosEnPesos 
                  ? `${((producto.precio || 0) * cotizacionDolar).toLocaleString()} Pesos`
                  : `USD ${producto.precio.toLocaleString()}`
                }
              </span>
            )}
          </div>

          {producto.descripcion && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-600 leading-relaxed">{producto.descripcion}</p>
            </div>
          )}

          {/* Botón Agregar */}
          <button
            onClick={handleAgregar}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <>
              <svg
                className="w-6 h-6"
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
              Agregar
            </>
          </button>
        </div>
      </div>
    </div>
  );
}

