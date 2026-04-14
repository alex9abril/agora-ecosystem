/**
 * Cliente Supabase solo para el navegador (recuperación de contraseña, etc.)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;

export function isBrowserSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!isBrowserSupabaseConfigured()) {
    return null;
  }
  if (browserClient === undefined) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return browserClient;
}
