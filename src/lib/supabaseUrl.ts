import Constants from 'expo-constants';

/** Supabase project URL from Expo extra or env (same keys as supabaseClient). */
export function getSupabaseProjectUrl(): string | undefined {
  const c = (Constants as { expoConfig?: { extra?: Record<string, string> }; manifest?: { extra?: Record<string, string> } })
    .expoConfig || (Constants as { manifest?: { extra?: Record<string, string> } }).manifest || {};
  const extra = c.extra ?? {};
  return (
    extra.VITE_SUPABASE_URL ||
    extra.SUPABASE_URL ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    undefined
  );
}

export function getStripePublishableKey(): string | undefined {
  const c = (Constants as { expoConfig?: { extra?: Record<string, string> }; manifest?: { extra?: Record<string, string> } })
    .expoConfig || (Constants as { manifest?: { extra?: Record<string, string> } }).manifest || {};
  const extra = c.extra ?? {};
  const k =
    extra.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    extra.VITE_STRIPE_PUBLISHABLE_KEY ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
    '';
  return k.trim() || undefined;
}
