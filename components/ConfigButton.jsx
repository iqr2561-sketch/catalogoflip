import { useState } from 'react';
import ConfigModal from './ConfigModal';

export default function ConfigButton() {
  const [open, setOpen] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ConfigButton] Click detectado, abriendo modal...');
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="fixed top-4 right-4 z-[100] px-4 py-2 rounded-full bg-white/90 border border-primary-200 text-primary-700 text-xs font-semibold shadow-md hover:shadow-lg hover:bg-primary-50 transition-all duration-200 flex items-center gap-2 pointer-events-auto"
        style={{ zIndex: 1000 }}
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
          ⚙
        </span>
        Configuración
      </button>

      <ConfigModal isOpen={open} onClose={() => {
        console.log('[ConfigButton] Cerrando modal...');
        setOpen(false);
      }} />
    </>
  );
}


