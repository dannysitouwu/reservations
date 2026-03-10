import { Suspense } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { SupabaseProvider } from './providers/SupabaseProvider';

function App() {
  return (
    <SupabaseProvider>
      <Suspense fallback={null}>
        <AppRoutes />
      </Suspense>
    </SupabaseProvider>
  );
}

export default App;
