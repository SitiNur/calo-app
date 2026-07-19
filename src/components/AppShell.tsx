'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { InstallPrompt } from './InstallPrompt';

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, profile, loading, authError, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile && !profile.profile_completed && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [user, profile, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="phone-frame items-center justify-center gap-3 p-8">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--muted)]">
          {authError || 'Memuat Calo…'}
        </p>
        {authError && (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
            className="mt-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            Ke halaman login
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="phone-frame">
      <Sidebar
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSignOut={async () => {
          await signOut();
          router.replace('/login');
        }}
        name={profile?.full_name || 'Pengguna'}
      />
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 border border-[var(--border)]"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-4 bg-[var(--ink)]" />
            <span className="block h-0.5 w-4 bg-[var(--ink)]" />
            <span className="block h-0.5 w-3 bg-[var(--ink)]" />
          </span>
        </button>
        <div className="flex-1 text-center">
          <p className="display-font text-lg font-semibold tracking-tight">{title || 'Hari ini'}</p>
        </div>
        <div className="w-10" />
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <InstallPrompt />
    </div>
  );
}
