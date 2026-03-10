import { useEffect, useState } from 'react';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AdminRoutes } from './routes/AdminRoutes';

function App() {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    function check() {
      if (typeof window !== 'undefined') {
        setIsSupported(window.innerWidth >= 900);
      }
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isSupported) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 24,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        <div>
          <h2>Admin disponible solo en escritorio o tablet</h2>
          <p>Esta interfaz no es compatible con pantallas pequeñas. Por favor, accede desde una computadora o una tablet.</p>
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
