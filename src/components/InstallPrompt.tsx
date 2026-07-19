'use client';

import { useEffect, useState } from 'react';

export function InstallPrompt() {
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS safari
      navigator.standalone === true;
    const wasDismissed = localStorage.getItem('calo-install-dismissed') === '1';
    if (isIos && !isStandalone && !wasDismissed) setShowIos(true);
  }, []);

  if (!showIos || dismissed) return null;

  return (
    <div className="absolute bottom-24 left-3 right-3 z-40 rounded-2xl bg-[var(--ink)] px-4 py-3 text-white shadow-lg animate-fade-up">
      <p className="text-sm font-medium">Pasang Calo di HP</p>
      <p className="mt-1 text-xs text-white/75">
        Di Safari: Bagikan → Tambah ke Layar Utama
      </p>
      <button
        type="button"
        className="mt-2 text-xs underline text-white/90"
        onClick={() => {
          localStorage.setItem('calo-install-dismissed', '1');
          setDismissed(true);
        }}
      >
        Tutup
      </button>
    </div>
  );
}
