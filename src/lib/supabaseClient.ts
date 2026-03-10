import Constants from 'expo-constants';
// import createClient dynamically to avoid type resolution issues in TS when
// @supabase/supabase-js types are not available in this environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createClient } = require('@supabase/supabase-js');

function getExtra(key: string) {
  // Expo provides extras in different locations depending on config
  // Try expoConfig (app.config.ts/app.json) then manifest (expo pre-49)
  const c = (Constants as any).expoConfig || (Constants as any).manifest || {};
  return c.extra?.[key] ?? process.env?.[key];
}

const supabaseUrl = getExtra('VITE_SUPABASE_URL') || getExtra('SUPABASE_URL');
const supabaseAnonKey = getExtra('VITE_SUPABASE_ANON_KEY') || getExtra('SUPABASE_ANON_KEY');

if (!supabaseUrl) {
  console.warn('[supabaseClient] Missing VITE_SUPABASE_URL (check app.json extra or env)');
}

if (!supabaseAnonKey) {
  console.warn('[supabaseClient] Missing VITE_SUPABASE_ANON_KEY (check app.json extra or env)');
}

// If config is present, create a real client. Otherwise export a safe stub
let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  // minimal stub to avoid runtime errors during development
  const noop = async () => ({ data: { session: null } });
  const fakeListener = { subscription: { unsubscribe: () => {} } };

  const supabaseStub: any = {
    auth: {
      getSession: noop,
      onAuthStateChange: (_cb: any) => ({ data: fakeListener }),
      signIn: async () => ({ data: null, error: null }),
      signOut: async () => ({ data: null, error: null }),
    },
    from: () => ({ select: async () => ({ data: null, error: null }) }),
  };

  supabase = supabaseStub;
}

export { supabase };
export default supabase;
