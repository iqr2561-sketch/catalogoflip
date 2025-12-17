import { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';

export default function ProductModal({ producto, isOpen, onClose, whatsappNumber = null }) {
  const agregarProducto = useCartStore((state) => state.agregarProducto);
  const [imageError, setImageError] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [variacionesSeleccionadas, setVariacionesSeleccionadas] = useState({});
  
  // Resetear selecciones cuando cambia el producto o se abre el modal
  useEffect(() => {
    if (isOpen && producto) {
      const inicial = {};
      (producto.variaciones || []).forEach((variacion) => {
        // Sistema simplificado: no hay valores, solo nombre y precio
        if (variacion.nombre) {
          inicial[variacion.nombre] = variacion.nombre;
        }
      });
      setVariacionesSeleccionadas(inicial);
    }
  }, [isOpen, producto]);
  
  // Calcular precio basado en variaciones seleccionadas (sistema simplificado)
  const calcularPrecio = () => {
    if (!producto) return 0;
    
    if (!producto.variaciones || producto.variaciones.length === 0) {
      return producto.precio || 0;
    }
    
    let precioTotal = producto.precio || 0;
    // Sistema simplificado: cada variación tiene un precio directo
    (producto.variaciones || []).forEach((variacion) => {
      if (variacionesSeleccionadas[variacion.nombre]) {
        precioTotal += variacion.precio || 0;
      }
    });
    
    return precioTotal;
  };

  if (!isOpen || !producto) return null;
  
  const precioFinal = calcularPrecio();

  const handleComprar = () => {
    const qty = Math.max(1, cantidad || 1);

    // Crear objeto de producto con variaciones seleccionadas
    const productoConVariaciones = {
      ...producto,
      precio: precioFinal,
      variacionesSeleccionadas: { ...variacionesSeleccionadas },
    };

    // Siempre guardar en el carrito con la cantidad elegida
    agregarProducto(productoConVariaciones, qty);

    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
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
            {!imageError && producto.imagen ? (
              <img
                src={producto.imagen}
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
            <div className="mb-6 space-y-4">
              {(producto.variaciones || []).map((variacion, variacionIndex) => (
                <div key={variacionIndex}>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {variacion.nombre}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const isSelected = variacionesSeleccionadas[variacion.nombre] === variacion.nombre;
                        setVariacionesSeleccionadas((prev) => {
                          if (isSelected) {
                            const newState = { ...prev };
                            delete newState[variacion.nombre];
                            return newState;
                          } else {
                            return {
                              ...prev,
                              [variacion.nombre]: variacion.nombre,
                            };
                          }
                        });
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        variacionesSeleccionadas[variacion.nombre] === variacion.nombre
                          ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 ${variacionesSeleccionadas[variacion.nombre] === variacion.nombre ? 'text-primary-600' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {variacionesSeleccionadas[variacion.nombre] === variacion.nombre ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      <span className="text-sm">Incluir {variacion.nombre}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        +${(variacion.precio || 0).toLocaleString()}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Precio + cantidad (agrupados para que se vean juntos en móvil) */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
            <div>
              <span className="block text-4xl md:text-5xl font-bold text-primary-600">
                ${precioFinal.toLocaleString()}
              </span>
              <span className="mt-1 inline-block text-sm font-semibold text-gray-600">
                x {Math.max(1, cantidad || 1)} unidad
                {Math.max(1, cantidad || 1) > 1 ? 'es' : ''}
              </span>
              {(producto.variaciones || []).length > 0 && producto.precio > 0 && (
                <span className="mt-1 block text-xs text-gray-500">
                  Precio base: ${producto.precio.toLocaleString()}
                </span>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Cantidad</h3>
              <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(1, (prev || 1) - 1))}
                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 rounded-full shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-14 text-center bg-transparent border-0 focus:ring-0 font-semibold text-gray-900"
              />
              <button
                type="button"
                onClick={() => setCantidad((prev) => (prev || 1) + 1)}
                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 rounded-full shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>

          {producto.descripcion && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-600 leading-relaxed">{producto.descripcion}</p>
            </div>
          )}

          {/* Botón Comprar */}
          <button
            onClick={handleComprar}
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Agregar al Carrito
            </>
          </button>
        </div>
      </div>
    </div>
  );
}

