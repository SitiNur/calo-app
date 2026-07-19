'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, KeyRound } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getShowWaterTracker, setShowWaterTrackerLocal } from '@/lib/preferences';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [showWater, setShowWater] = useState(true);
  const [savingWater, setSavingWater] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    setShowWater(getShowWaterTracker(user?.id, profile?.show_water_tracker));
  }, [user?.id, profile?.show_water_tracker]);

  const toggleWater = async () => {
    if (!user) return;
    const next = !showWater;
    setShowWater(next);
    setShowWaterTrackerLocal(user.id, next);
    setSavingWater(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        show_water_tracker: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setSavingWater(false);
    if (error) {
      // Tetap pakai localStorage supaya toggle tetap berfungsi tanpa kolom DB
      if (!/show_water_tracker|column/i.test(error.message)) {
        console.warn('[calo] simpan preferensi air ke DB gagal', error.message);
      }
      return;
    }
    await refreshProfile();
  };

  return (
    <AppShell title="Pengaturan">
      <div className="px-4 pb-8 space-y-3 animate-fade-up">
        <button
          type="button"
          onClick={() => setPwOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-soft)] text-[var(--brand)]">
            <KeyRound size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Ganti password</span>
            <span className="block text-xs text-[var(--muted)]">Perbarui kata sandi akun</span>
          </span>
          <ChevronRight size={18} className="text-[var(--muted)]" />
        </button>

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

        <section
          id="water"
          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Tampilkan air minum di Hari ini</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Target & penghitung gelas di halaman Hari ini
                {savingWater ? ' · menyimpan…' : ''}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showWater}
              onClick={() => void toggleWater()}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                showWater ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  showWater ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

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

      {pwOpen && (
        <ChangePasswordModal email={user?.email} onClose={() => setPwOpen(false)} />
      )}
    </AppShell>
  );
}
