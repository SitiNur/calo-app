'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { dateKey } from '@/lib/calories';
import type { CalorieLog } from '@/lib/types';

export default function WeeklyPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [logs, setLogs] = useState<CalorieLog[]>([]);
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    if (!user) return;
    const from = dateKey(weekStart);
    const to = dateKey(addDays(weekStart, 6));
    void supabase
      .from('calorie_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', from)
      .lte('log_date', to)
      .then(({ data }) => setLogs((data as CalorieLog[]) || []));
  }, [user, supabase, weekStart]);

  const byDay = useMemo(() => {
    return days.map((day) => {
      const key = dateKey(day);
      const dayLogs = logs.filter((l) => l.log_date === key);
      const food = dayLogs.filter((l) => l.type === 'food').reduce((s, l) => s + l.calories, 0);
      const exercise = dayLogs
        .filter((l) => l.type === 'exercise')
        .reduce((s, l) => s + l.calories, 0);
      return { day, key, food, exercise, net: food - exercise };
    });
  }, [days, logs]);

  const target = profile?.target_calories ?? 2000;
  const maxVal = Math.max(target, ...byDay.map((d) => d.food), 1);
  const avg =
    byDay.filter((d) => d.food > 0).reduce((s, d) => s + d.net, 0) /
      Math.max(1, byDay.filter((d) => d.food > 0).length) || 0;

  return (
    <AppShell title="Mingguan">
      <div className="px-4 pb-8 space-y-4">
        <section className="rounded-[20px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)] animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Minggu ini
          </p>
          <p className="display-font mt-1 text-3xl font-semibold">{Math.round(avg)} kcal</p>
          <p className="text-sm text-[var(--muted)]">rata-rata bersih / hari tercatat</p>

          <div className="mt-6 flex h-40 items-end justify-between gap-2">
            {byDay.map(({ day, food, key }) => {
              const h = Math.round((food / maxVal) * 100);
              const over = food > target;
              return (
                <div key={key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-28 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[28px] rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max(food ? h : 4, 4)}%`,
                        background: over ? 'var(--miss)' : 'var(--brand)',
                        minHeight: food ? 8 : 4,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">
                    {format(day, 'EEE', { locale: localeId })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 animate-fade-up">
          {byDay.map(({ day, food, exercise, net, key }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{format(day, 'EEEE, d MMM', { locale: localeId })}</p>
                <p className="text-xs text-[var(--muted)]">
                  Makan {food} · Olahraga −{exercise}
                </p>
              </div>
              <p className="font-semibold">{net} kcal</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
