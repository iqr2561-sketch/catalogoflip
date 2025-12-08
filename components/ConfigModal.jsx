import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ConfigModal({ isOpen, onClose }) {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Nota: esto NO es seguridad real, solo un bloqueo básico de panel.
    if (username === 'admin' && password === '1234') {
      onClose();
      router.push('/panel');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl border border-gray-200 animate-slideUp">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>
            <p className="text-xs text-gray-500">
              Acceso rápido al panel de control del catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white/80"
              placeholder="admin"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white/80"
              placeholder="1234"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Entrar al panel
            </button>
          </div>

          <p className="text-[10px] text-gray-400 pt-1">
            Este acceso es solo para control interno del catálogo. Para seguridad real se recomienda
            implementar autenticación de usuarios.
          </p>
        </form>
      </div>
    </div>
  );
}


