import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { WorkerProfile } from '../types/profile';

type SupabaseContextValue = {
  client: SupabaseClient;
  profile: WorkerProfile | null;
  session: Session | null;
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.id) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
        navigate('/auth', { replace: true });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user.id) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        navigate('/auth', { replace: true });
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        // Don't sign out on error - just continue with null profile
      } else if (data) {
        setProfile(data as WorkerProfile);
      }
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      // Don't sign out - continue anyway
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ client: supabase, profile, session, loading }),
    [profile, session, loading]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }

  return context;
}
