'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authError } = useAuth();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const configured = hasSupabaseConfig();

  useEffect(() => {
    const authErr = searchParams.get('error');
    if (authErr === 'auth') {
      setError('Login Google gagal atau dibatalkan. Coba lagi.');
    } else if (authError) {
      setError(authError);
    }
  }, [searchParams, authError]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!configured) {
      setError('Isi NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY di .env.local dulu.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signError) throw signError;
        setInfo('Akun dibuat. Jika diminta konfirmasi email, cek inbox dulu. Lanjut masuk…');
        setMode('login');
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        router.replace('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal autentikasi';
      if (/failed to fetch|network/i.test(msg)) {
        setError(
          'Gagal terhubung ke Supabase. Pastikan project tidak di-pause di dashboard.supabase.com, internet stabil, lalu login lagi.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setInfo('');
    if (!configured) {
      setError('Isi NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY di .env.local dulu.');
      return;
    }
    setGoogleLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setGoogleLoading(false);
      const msg = err instanceof Error ? err.message : 'Gagal login Google';
      if (/provider is not enabled|unsupported provider/i.test(msg)) {
        setError(
          'Google login belum diaktifkan. Aktifkan provider Google di Supabase → Authentication → Providers.'
        );
      } else {
        setError(msg);
      }
    }
  };

  return (
    <>
      <div className="mb-10 animate-fade-up">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-bold text-white">
          C
        </div>
        <h1 className="display-font text-4xl font-semibold tracking-tight text-[var(--brand-dark)]">
          Calo
        </h1>
        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-[var(--muted)]">
          Asisten diet yang chat seperti teman. Catat makan & olahraga, pantau sisa kalori harian.
        </p>
      </div>

      <div className="space-y-3 animate-fade-up">
        {!configured && (
          <p className="rounded-2xl bg-[var(--miss-soft)] px-4 py-3 text-sm text-[var(--miss)]">
            Belum ada kredensial Supabase. Salin `.env.local.example` → `.env.local` lalu isi key-mu.
          </p>
        )}

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading || googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-white py-3.5 text-sm font-semibold text-[var(--ink)] shadow-sm disabled:opacity-50"
        >
          <GoogleIcon className="h-5 w-5" />
          {googleLoading ? 'Menghubungkan Google…' : 'Lanjut dengan Google'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted)]">atau pakai email</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 6)"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          {error && <p className="text-sm text-[var(--miss)]">{error}</p>}
          {info && <p className="text-sm text-[var(--ok)]">{info}</p>}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-2xl bg-[var(--brand)] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
        <button
          type="button"
          className="font-semibold text-[var(--brand)]"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setInfo('');
          }}
        >
          {mode === 'login' ? 'Daftar' : 'Masuk'}
        </button>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="phone-frame px-6 py-10">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
