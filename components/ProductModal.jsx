import { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';

export default function ProductModal({ producto, isOpen, onClose, whatsappNumber = null, cotizacionDolar = 1, tipoPrecioDefault = 'minorista' }) {
  const agregarProducto = useCartStore((state) => state.agregarProducto);
  const [imageError, setImageError] = useState(false);
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
  
  // Calcular precio basado en variaciones seleccionadas (sistema con mayorista/minorista)
  const calcularPrecio = () => {
    if (!producto) return 0;
    
    if (!producto.variaciones || producto.variaciones.length === 0) {
      return producto.precio || 0;
    }
    
    let precioTotal = producto.precio || 0;
    // Sistema con precios mayorista/minorista
    (producto.variaciones || []).forEach((variacion) => {
      if (variacionesSeleccionadas[variacion.nombre]) {
        const precioVariacion = tipoPrecioDefault === 'mayorista' 
          ? (variacion.precioMayorista || 0)
          : (variacion.precioMinorista || 0);
        precioTotal += precioVariacion;
      }
    });
    
    return precioTotal;
  };

  if (!isOpen || !producto) return null;
  
  const precioFinal = calcularPrecio();

  const handleAgregar = () => {
    // Si no hay variaciones, agregar el producto base
    if (!producto.variaciones || producto.variaciones.length === 0) {
      const productoBase = {
        ...producto,
        precio: precioFinal,
        variacionesSeleccionadas: {},
      };
      agregarProducto(productoBase, 1);
      onClose();
      return;
    }

    // Si hay variaciones seleccionadas, agregar cada una como item separado
    const variacionesActivas = Object.keys(variacionesSeleccionadas).filter(
      key => variacionesSeleccionadas[key] === key
    );

    if (variacionesActivas.length === 0) {
      // Si no hay variaciones seleccionadas, agregar solo el producto base
      const productoBase = {
        ...producto,
        precio: producto.precio || 0,
        variacionesSeleccionadas: {},
      };
      agregarProducto(productoBase, 1);
    } else {
      // Agregar cada variación como un item separado
      variacionesActivas.forEach((nombreVariacion) => {
        const variacion = producto.variaciones.find(v => v.nombre === nombreVariacion);
        if (variacion) {
          const precioVariacion = tipoPrecioDefault === 'mayorista' 
            ? (variacion.precioMayorista || 0)
            : (variacion.precioMinorista || 0);
          
          const precioTotal = (producto.precio || 0) + precioVariacion;
          
          const productoConVariacion = {
            ...producto,
            precio: precioTotal,
            variacionesSeleccionadas: { [nombreVariacion]: nombreVariacion },
          };
          
          agregarProducto(productoConVariacion, 1);
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
                        Precio adicional: <span className="font-semibold text-primary-600">
                          +USD ${(tipoPrecioDefault === 'mayorista' 
                            ? (variacion.precioMayorista || 0)
                            : (variacion.precioMinorista || 0)
                          ).toLocaleString()}
                        </span>
                        {cotizacionDolar && cotizacionDolar !== 1 && (
                          <span className="text-xs text-gray-500 ml-2">
                            (≈ ${((tipoPrecioDefault === 'mayorista' 
                              ? (variacion.precioMayorista || 0)
                              : (variacion.precioMinorista || 0)
                            ) * cotizacionDolar).toLocaleString()} COP)
                          </span>
                        )}
                      </p>
                    </div>
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
                      className={`px-5 py-3 rounded-lg border-2 transition-all flex items-center gap-2 min-w-[140px] justify-center font-semibold shadow-sm ${
                        variacionesSeleccionadas[variacion.nombre] === variacion.nombre
                          ? 'border-primary-600 bg-primary-600 text-white shadow-md hover:bg-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 ${variacionesSeleccionadas[variacion.nombre] === variacion.nombre ? 'text-white' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {variacionesSeleccionadas[variacion.nombre] === variacion.nombre ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        )}
                      </svg>
                      <span className="text-sm">
                        {variacionesSeleccionadas[variacion.nombre] === variacion.nombre ? 'Incluido' : 'Incluir'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Precio */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="block text-4xl md:text-5xl font-bold text-primary-600">
                USD ${precioFinal.toLocaleString()}
              </span>
              {cotizacionDolar && cotizacionDolar !== 1 && (
                <span className="text-2xl md:text-3xl font-bold text-gray-500">
                  ≈ ${(precioFinal * cotizacionDolar).toLocaleString()} COP
                </span>
              )}
            </div>
            {(producto.variaciones || []).length > 0 && producto.precio > 0 && (
              <span className="mt-1 block text-xs text-gray-500">
                Precio base: USD ${producto.precio.toLocaleString()}
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

