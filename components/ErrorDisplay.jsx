import { useState } from 'react';

export default function ErrorDisplay({ error, onRetry, onDismiss }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message || 'Error desconocido';
  const errorDetails = typeof error === 'object' && error.stack ? error.stack : null;
  const errorLogs = typeof error === 'object' && error.logs ? error.logs : [];

  const copyToClipboard = () => {
    const textToCopy = [
      `Error: ${errorMessage}`,
      errorDetails ? `\nStack:\n${errorDetails}` : '',
      errorLogs.length > 0 ? `\nLogs:\n${errorLogs.join('\n')}` : '',
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideDown">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Error al Cargar PDF</h2>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Error Message */}
          <div className="mb-4">
            <p className="text-gray-800 text-lg font-semibold mb-2">Mensaje de Error:</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-mono text-sm break-words">{errorMessage}</p>
            </div>
          </div>

          {/* Error Details Toggle */}
          {(errorDetails || errorLogs.length > 0) && (
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors mb-2"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold">
                  {showDetails ? 'Ocultar' : 'Mostrar'} Detalles Técnicos
                </span>
              </button>

              {showDetails && (
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-64 overflow-y-auto">
                  {errorDetails && (
                    <div className="mb-4">
                      <div className="text-yellow-400 mb-1">Stack Trace:</div>
                      <pre className="whitespace-pre-wrap break-words">{errorDetails}</pre>
                    </div>
                  )}
                  {errorLogs.length > 0 && (
                    <div>
                      <div className="text-yellow-400 mb-1">Logs de Error:</div>
                      {errorLogs.map((log, idx) => (
                        <div key={idx} className="mb-1 text-green-300">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-900 font-semibold mb-2">💡 Sugerencias:</p>
            <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
              <li>Verifica que el archivo PDF no esté corrupto</li>
              <li>Intenta subir el PDF desde el panel de control</li>
              <li>Revisa la conexión a internet</li>
              <li>Si el problema persiste, contacta al administrador</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? 'Copiado!' : 'Copiar Error'}
          </button>
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

