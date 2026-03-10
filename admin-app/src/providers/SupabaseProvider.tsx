import { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { WorkerProfile } from '../types/profile';

type SupabaseContextValue = {
  client: SupabaseClient;
  profile: WorkerProfile;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'administrador@gmail.com';
const DEFAULT_ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME ?? 'Administrador';

export function SupabaseProvider({ children }: PropsWithChildren) {
  const profile = useMemo<WorkerProfile>(
    () => ({
      id: 'static-admin',
      email: DEFAULT_ADMIN_EMAIL,
      full_name: DEFAULT_ADMIN_NAME,
      phone: null,
      role: 'admin'
    }),
    []
  );

  const value = useMemo(() => ({ client: supabase, profile }), [profile]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }

  return context;
}
