import { useState } from 'react';

export default function Hotspot({ hotspot, producto, onHotspotClick, pageWidth, pageHeight }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!hotspot || !producto) return null;
  if (hotspot.enabled === false) return null;

  // Calcular posición y tamaño relativo a la página
  const left = (hotspot.x / 100) * pageWidth;
  const top = (hotspot.y / 100) * pageHeight;
  const width = (hotspot.width / 100) * pageWidth;
  const height = (hotspot.height / 100) * pageHeight;

  return (
    <div
      className="absolute cursor-pointer transition-all duration-200"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onHotspotClick(producto)}
    >
      {/* Área de interacción invisible que ocupa todo el rectángulo configurado */}
      <div className="absolute inset-0" />

      {/* Botón de carrito morado centrado */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 
            bg-purple-600 text-white border-2 border-white/70
            ${isHovered ? 'scale-110 shadow-xl bg-purple-700' : 'scale-100'}`}
        >
          <svg
            className="w-5 h-5"
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
        </div>
      </div>

      {/* Tooltip al hacer hover */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap z-50">
          <div className="font-semibold">{producto.nombre}</div>
          {typeof producto.precio === 'number' && (
            <div className="text-purple-300 font-bold mt-0.5">
              ${producto.precio.toLocaleString()}
            </div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

