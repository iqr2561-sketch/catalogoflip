import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ConfigModal({ isOpen, onClose }) {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'pdf' | 'database'
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResult, setDbResult] = useState(null);
  const [dbLogs, setDbLogs] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);

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

  const handleTestDatabase = async () => {
    setDbTesting(true);
    setDbResult(null);
    setDbLogs([]);
    setError(null);

    try {
      const res = await fetch('/api/db-check');
      const data = await res.json();

      if (data.logs) {
        setDbLogs(data.logs);
      }

      if (!res.ok || !data.ok) {
        setDbResult({
          success: false,
          error: data.error || 'Error desconocido',
          details: data.details || data.errorName || '',
          hint: data.hint || '',
        });
      } else {
        setDbResult({
          success: true,
          duration: data.durationMs,
          database: data.database,
          serverVersion: data.serverVersion,
          databases: data.databases || [],
          collections: data.collections || [],
          timestamp: data.timestamp,
        });
      }
    } catch (err) {
      setDbLogs([`[${new Date().toISOString()}] ERROR: ${err.message}`]);
      setDbResult({
        success: false,
        error: 'Error al conectar con el servidor',
        details: err.message,
      });
    } finally {
      setDbTesting(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor, selecciona un archivo PDF válido.');
      return;
    }

    setPdfUploading(true);
    setError(null);

    try {
      // Aquí podrías subir el PDF a un servidor o almacenarlo
      // Por ahora solo mostramos que se seleccionó
      setPdfFile(file);
      setError(null);
      // TODO: Implementar subida real del PDF
    } catch (err) {
      setError('Error al procesar el archivo PDF: ' + err.message);
    } finally {
      setPdfUploading(false);
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
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl border border-gray-200 animate-slideUp overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>
            <p className="text-xs text-gray-500">
              Acceso al panel de control y configuración del catálogo.
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Panel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'pdf'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'database'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Base de Datos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Tab: Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
            </form>
          )}

          {/* Tab: PDF */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Cargar Catálogo PDF
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={pdfUploading}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <span className="text-4xl">📄</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {pdfFile ? pdfFile.name : 'Haz clic para seleccionar PDF'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {pdfUploading ? 'Procesando...' : 'Selecciona un archivo PDF'}
                    </span>
                  </label>
                </div>
              </div>

              {pdfFile && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700">
                  ✓ Archivo seleccionado: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Tab: Database */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Prueba de Conexión</h3>
                  <p className="text-xs text-gray-500">Verifica la conexión con MongoDB Atlas</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestDatabase}
                  disabled={dbTesting}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {dbTesting ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Probando...
                    </>
                  ) : (
                    <>
                      <span>🔌</span>
                      Probar Conexión
                    </>
                  )}
                </button>
              </div>

              {dbResult && (
                <div
                  className={`rounded-xl px-4 py-3 border ${
                    dbResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {dbResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <span>✓</span>
                        <span>Conexión exitosa</span>
                      </div>
                      <div className="text-xs text-green-600 space-y-1">
                        <p>⏱️ Duración: {dbResult.duration}ms</p>
                        <p>🗄️ Base de datos: {dbResult.database || 'default'}</p>
                        <p>🔧 Versión del servidor: {dbResult.serverVersion}</p>
                        {dbResult.databases && dbResult.databases.length > 0 && (
                          <p>📚 Bases de datos: {dbResult.databases.join(', ')}</p>
                        )}
                        {dbResult.collections && dbResult.collections.length > 0 && (
                          <p>📦 Colecciones: {dbResult.collections.join(', ')}</p>
                        )}
                        <p>🕐 Timestamp: {new Date(dbResult.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                        <span>✗</span>
                        <span>Error de conexión</span>
                      </div>
                      <div className="text-xs text-red-600 space-y-1">
                        <p><strong>Error:</strong> {dbResult.error}</p>
                        {dbResult.details && <p><strong>Detalles:</strong> {dbResult.details}</p>}
                        {dbResult.hint && <p><strong>Hint:</strong> {dbResult.hint}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {dbLogs.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Logs de Conexión
                  </label>
                  <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs max-h-64 overflow-y-auto">
                    {dbLogs.map((log, idx) => (
                      <div key={idx} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400">
            Este acceso es solo para control interno del catálogo. Para seguridad real se recomienda
            implementar autenticación de usuarios.
          </p>
        </div>
      </div>
    </div>
  );
}
