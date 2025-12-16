import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    if (message && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgColor = type === 'error' 
    ? 'bg-red-100 border-red-400 text-red-900' 
    : 'bg-green-100 border-green-400 text-green-900';
  const iconColor = type === 'error' ? 'text-red-700' : 'text-green-700';
  const iconBg = type === 'error' ? 'bg-red-200' : 'bg-green-200';

  return (
    <div className="fixed top-20 right-4 z-50 animate-slideInRight max-w-md">
      <div className={`rounded-xl border-2 shadow-2xl p-5 ${bgColor} backdrop-blur-sm`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
            {type === 'error' ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold leading-tight">{message}</p>
            {type === 'error' && (
              <p className="text-xs mt-1 text-red-700 opacity-90">
                Recarga la página si el problema persiste
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${iconColor} hover:opacity-70 transition-opacity p-1 rounded-full hover:bg-black/10`}
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

