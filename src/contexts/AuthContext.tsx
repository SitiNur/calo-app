'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  clearSupabaseAuthStorage,
  createClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isNetworkAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const name = err instanceof Error ? err.name : '';
  return /failed to fetch|networkerror|fetch failed|authretryablefetcherror|timeout/i.test(
    `${name} ${msg}`
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearLocalAuth = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          console.error('Profile fetch error', error);
          setProfile(null);
          return;
        }
        setProfile(data as Profile | null);
      } catch (err) {
        console.error('Profile fetch failed', err);
        setProfile(null);
      }
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig()) {
      setAuthError('Konfigurasi Supabase belum lengkap di .env.local');
      setLoading(false);
      return;
    }

    const recoverFromNetworkFailure = async (err: unknown) => {
      console.warn('[calo/auth] session recovery', err);
      clearSupabaseAuthStorage();
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
      if (!mounted) return;
      clearLocalAuth();
      setAuthError(
        'Koneksi ke Supabase gagal (Failed to fetch). Cek internet / project aktif, lalu login ulang.'
      );
      setLoading(false);
    };

    const loadSession = async () => {
      try {
        // Prefer getSession; if refresh fails it may throw Failed to fetch (×2 with auto-refresh)
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          if (isNetworkAuthError(error)) {
            await recoverFromNetworkFailure(error);
            return;
          }
          clearLocalAuth();
          setLoading(false);
          return;
        }

        setAuthError(null);
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
      } catch (err) {
        if (isNetworkAuthError(err)) {
          await recoverFromNetworkFailure(err);
          return;
        }
        if (!mounted) return;
        clearLocalAuth();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !nextSession)) {
        clearLocalAuth();
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setAuthError(null);
        await fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Pause auto-refresh while offline to avoid Failed to fetch spam
    const onOffline = () => {
      try {
        supabase.auth.stopAutoRefresh();
      } catch {
        // ignore
      }
    };
    const onOnline = () => {
      try {
        supabase.auth.startAutoRefresh();
      } catch {
        // ignore
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', onOffline);
      window.addEventListener('online', onOnline);
      if (!navigator.onLine) onOffline();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('online', onOnline);
      }
    };
  }, [supabase, fetchProfile, clearLocalAuth]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('signOut failed', err);
    }
    clearSupabaseAuthStorage();
    clearLocalAuth();
    setAuthError(null);
  }, [supabase, clearLocalAuth]);

  const value = useMemo(
    () => ({ user, session, profile, loading, authError, refreshProfile, signOut }),
    [user, session, profile, loading, authError, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
