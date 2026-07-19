'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ChangePasswordModal({
  email,
  onClose,
}: {
  email?: string | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    setSaving(true);
    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updErr) {
      setError(updErr.message || 'Gagal mengganti password.');
      return;
    }
    setSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-[var(--shadow)] animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="change-password-title" className="display-font text-lg font-semibold">
              Ganti password
            </h2>
            {email && <p className="mt-1 text-xs text-[var(--muted)]">{email}</p>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--bg)]"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ok)]">Password berhasil diganti.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[var(--brand)] py-3 text-sm font-semibold text-white"
            >
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password baru"
              autoComplete="new-password"
              autoFocus
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none"
            />
            {error && <p className="text-xs text-[var(--miss)]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[var(--border)] py-3 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !newPassword}
                className="flex-1 rounded-2xl bg-[var(--brand)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
