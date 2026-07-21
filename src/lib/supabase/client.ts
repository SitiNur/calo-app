import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let noiseHandlersInstalled = false;

function trimEnv(value: string | undefined): string {
  return (value || '').trim().replace(/^["']|["']$/g, '');
}

function isAuthNetworkNoise(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const name = err instanceof Error ? err.name : '';
  if (/AbortError|aborted/i.test(`${name} ${msg}`)) return false;
  return (
    /failed to fetch|networkerror|fetch failed|authretryablefetcherror|load failed|network request failed/i.test(
      `${name} ${msg}`
    ) || /AuthRetryableFetchError/i.test(name)
  );
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

/**
 * Supabase auth refresh can throw TypeError("Failed to fetch") when offline /
 * project slow. Next.js dev overlay treats console TypeError as a red screen —
 * swallow that noise and clear the local session instead.
 */
function installAuthNoiseHandlers(client: SupabaseClient) {
  if (typeof window === 'undefined' || noiseHandlersInstalled) return;
  noiseHandlersInstalled = true;

  let recovering = false;
  const recover = () => {
    if (recovering) return;
    recovering = true;
    console.warn('[calo/auth] Supabase fetch failed — clearing local session');
    clearSupabaseAuthStorage();
    void client.auth.signOut({ scope: 'local' }).finally(() => {
      recovering = false;
    });
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (!isAuthNetworkNoise(event.reason)) return;
    event.preventDefault();
    recover();
  });

  // Next.js "Console TypeError" overlay listens to console.error(Error)
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const hit = args.some((a) => isAuthNetworkNoise(a));
    if (hit) {
      console.warn('[calo/auth] suppressed auth network error');
      recover();
      return;
    }
    originalError(...args);
  };
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutMs = 15_000;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    window.clearTimeout(timer)
  );
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
    global: {
      fetch: fetchWithTimeout,
    },
  });

  installAuthNoiseHandlers(browserClient);

  return browserClient;
}

export function hasSupabaseConfig() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && key && !url.includes('placeholder'));
}
