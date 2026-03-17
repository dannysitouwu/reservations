import { useEffect, useState } from 'react';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AdminRoutes } from './routes/AdminRoutes';

function App() {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    function check() {
      if (typeof window !== 'undefined') {
        // 1024px breakpoint for proper desktop/tablet support
        setIsSupported(window.innerWidth >= 1024);
      }
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isSupported) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200">
              <svg className="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.25 17H5.75A2.75 2.75 0 013 14.25V9.75A2.75 2.75 0 015.75 7h12.5A2.75 2.75 0 0121 9.75v4.5a2.75 2.75 0 01-2.75 2.75h-3.5l-3 3v-3Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Acceso de escritorio requerido</h1>
            <p className="text-sm text-slate-600">ReservaPro Admin está optimizado para pantallas más grandes. Por favor, accede desde una computadora o tableta.</p>
          </div>
          
          <div className="space-y-3 rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-mono text-blue-900">Resolución actual: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</p>
            <p className="text-xs text-blue-700">Resolución mínima requerida: 1024x768</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SupabaseProvider>
      <AdminRoutes />
    </SupabaseProvider>
  );
}

export default App;
