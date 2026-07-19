import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let rejectionHandlerInstalled = false;

function trimEnv(value: string | undefined): string {
  return (value || '').trim().replace(/^["']|["']$/g, '');
}

/** Clear persisted Supabase auth keys so a bad refresh token stops looping. */
export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith('sb-') && k.includes('auth-token')
    );
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function installAuthRejectionHandler(client: SupabaseClient) {
  if (typeof window === 'undefined' || rejectionHandlerInstalled) return;
  rejectionHandlerInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason ?? '');
    const name = reason instanceof Error ? reason.name : '';
    const isAuthFetch =
      /failed to fetch|networkerror|fetch failed|authretryablefetcherror/i.test(msg) ||
      /AuthRetryableFetchError/i.test(name);

    if (!isAuthFetch) return;

    // Prevent Next.js red overlay for background token refresh failures
    event.preventDefault();
    console.warn('[calo/auth] Supabase fetch failed — clearing local session');
    clearSupabaseAuthStorage();
    void client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  });
}

export function createClient() {
  if (browserClient) return browserClient;

  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
  const key =
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

  browserClient = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  installAuthRejectionHandler(browserClient);

  return browserClient;
}

export function hasSupabaseConfig() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && key && !url.includes('placeholder'));
}
