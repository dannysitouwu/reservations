import React, { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type SupabaseContextValue = {
  client: any;
  session: any | null;
  initializing: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setInitializing(false);
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, nextSession: any) => {
      setSession(nextSession);
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ client: supabase, session, initializing }), [session, initializing]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) throw new Error('useSupabase must be used within a SupabaseProvider');
  return context;
}

export default SupabaseProvider;
