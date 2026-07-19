'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { profile } = useAuth();

  return (
    <AppShell title="Pengaturan">
      <div className="px-4 pb-8 space-y-3 animate-fade-up">
        <Link
          href="/account"
          className="block rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-medium"
        >
          Edit profil & hitung ulang TDEE
        </Link>
        <Link
          href="/goals"
          className="block rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-medium"
        >
          Sesuaikan target kalori & makro
        </Link>
        <Link
          href="/reminders"
          className="block rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-medium"
        >
          Pengingat makan & air
        </Link>

        <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm">
          <p className="font-medium">Pasang di HP (PWA)</p>
          <p className="mt-1 text-[var(--muted)]">
            Android Chrome: menu ⋮ → Install app / Tambahkan ke layar utama.
            <br />
            iPhone Safari: Bagikan → Tambah ke Layar Utama.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm">
          <p className="font-medium">Tentang</p>
          <p className="mt-1 text-[var(--muted)]">
            Calo v0.1 · Target saat ini {profile?.target_calories ?? '—'} kcal · TDEE{' '}
            {profile?.tdee ?? '—'}
          </p>
        </section>

        <a
          href="mailto:support@calo.app?subject=Feedback%20Calo"
          className="block rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-medium"
        >
          Feedback & dukungan
        </a>
      </div>
    </AppShell>
  );
}
