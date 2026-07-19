'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flag,
  BarChart3,
  Scale,
  Bell,
  User,
  Settings,
  LogOut,
  MessageCircle,
  X,
} from 'lucide-react';

const links = [
  { href: '/today', label: 'Hari ini', icon: MessageCircle },
  { href: '/goals', label: 'Target Harian', icon: Flag },
  { href: '/weekly', label: 'Ringkasan', icon: BarChart3 },
  { href: '/weight', label: 'Pelacak Berat', icon: Scale },
  { href: '/reminders', label: 'Pengingat', icon: Bell },
  { href: '/account', label: 'Akun', icon: User },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export function Sidebar({
  open,
  onClose,
  onSignOut,
  name,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  name: string;
}) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Tutup menu"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-[82%] max-w-[320px] flex-col bg-white animate-drawer shadow-xl">
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] text-white font-bold">
              C
            </div>
            <div>
              <p className="display-font text-xl font-semibold text-[var(--brand)]">Calo</p>
              <p className="text-xs text-[var(--muted)]">{name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href.split('#')[0] && !href.includes('#');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? 'bg-[var(--bg-soft)] text-[var(--brand-dark)] font-semibold'
                    : 'text-[var(--ink)] hover:bg-[var(--bg)]'
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-3 safe-bottom">
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--miss)]"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>
    </div>
  );
}
