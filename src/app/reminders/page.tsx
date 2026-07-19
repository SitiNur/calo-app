'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { ReminderSettings } from '@/lib/types';

const defaults: Omit<ReminderSettings, 'user_id'> = {
  breakfast_enabled: true,
  breakfast_time: '08:00',
  lunch_enabled: true,
  lunch_time: '12:30',
  dinner_enabled: true,
  dinner_time: '19:00',
  water_enabled: true,
  water_interval_hours: 2,
};

export default function RemindersPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [form, setForm] = useState(defaults);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            breakfast_enabled: data.breakfast_enabled,
            breakfast_time: data.breakfast_time,
            lunch_enabled: data.lunch_enabled,
            lunch_time: data.lunch_time,
            dinner_enabled: data.dinner_enabled,
            dinner_time: data.dinner_time,
            water_enabled: data.water_enabled,
            water_interval_hours: data.water_interval_hours,
          });
        }
      });
  }, [user, supabase]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification('Calo', { body: 'Pengingat siap. Kami akan mengingatkan waktu makan.' });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('reminder_settings').upsert({
      user_id: user.id,
      ...form,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
  };

  return (
    <AppShell title="Pengingat">
      <form onSubmit={onSubmit} className="px-4 pb-8 space-y-4 animate-fade-up">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
          <p className="font-medium">Izin notifikasi browser</p>
          <p className="mt-1 text-[var(--muted)]">Status: {permission}</p>
          {permission !== 'granted' && (
            <button
              type="button"
              onClick={requestPermission}
              className="mt-3 rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-[var(--brand-dark)] font-medium"
            >
              Aktifkan notifikasi
            </button>
          )}
        </div>

        {(
          [
            ['breakfast', 'Sarapan'],
            ['lunch', 'Makan siang'],
            ['dinner', 'Makan malam'],
          ] as const
        ).map(([key, label]) => {
          const enabledKey = `${key}_enabled` as keyof typeof form;
          const timeKey = `${key}_time` as keyof typeof form;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
            >
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form[enabledKey])}
                  onChange={(e) => setForm((f) => ({ ...f, [enabledKey]: e.target.checked }))}
                />
                {label}
              </label>
              <input
                type="time"
                value={String(form[timeKey])}
                onChange={(e) => setForm((f) => ({ ...f, [timeKey]: e.target.value }))}
                className="rounded-xl border border-[var(--border)] px-2 py-1 text-sm"
              />
            </div>
          );
        })}

        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 space-y-2">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.water_enabled}
              onChange={(e) => setForm((f) => ({ ...f, water_enabled: e.target.checked }))}
            />
            Pengingat minum air
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Setiap (jam)
            <input
              type="number"
              min={1}
              max={6}
              value={form.water_interval_hours}
              onChange={(e) =>
                setForm((f) => ({ ...f, water_interval_hours: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)]"
            />
          </label>
        </div>

        <button type="submit" className="w-full rounded-2xl bg-[var(--brand)] py-3.5 font-semibold text-white">
          Simpan pengingat
        </button>
        {saved && <p className="text-center text-sm text-[var(--ok)]">Pengingat disimpan.</p>}
      </form>
    </AppShell>
  );
}
