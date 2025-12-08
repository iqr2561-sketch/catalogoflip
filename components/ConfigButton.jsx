import { useState } from 'react';
import ConfigModal from './ConfigModal';

export default function ConfigButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-40 px-4 py-2 rounded-full bg-white/90 border border-primary-200 text-primary-700 text-xs font-semibold shadow-md hover:shadow-lg hover:bg-primary-50 transition-all duration-200 flex items-center gap-2"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
          ⚙
        </span>
        Configuración
      </button>

      <ConfigModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}


