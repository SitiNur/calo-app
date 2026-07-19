'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const configured = hasSupabaseConfig();

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

  return (
    <div className="phone-frame px-6 py-10">
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

      <form onSubmit={onSubmit} className="space-y-3 animate-fade-up">
        {!configured && (
          <p className="rounded-2xl bg-[var(--miss-soft)] px-4 py-3 text-sm text-[var(--miss)]">
            Belum ada kredensial Supabase. Salin `.env.local.example` → `.env.local` lalu isi key-mu.
          </p>
        )}
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
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--brand)] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>
      </form>

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
    </div>
  );
}
