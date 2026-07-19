'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { dateKey } from '@/lib/calories';
import type { CalorieLog } from '@/lib/types';

type RangeMode = 'week' | 'month' | 'all';

type DayPoint = {
  key: string;
  label: string;
  fullLabel: string;
  food: number;
  exercise: number;
  net: number;
  target: number;
  over: boolean;
  hasData: boolean;
};

export default function WeeklyPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [logs, setLogs] = useState<CalorieLog[]>([]);
  const [mode, setMode] = useState<RangeMode>('week');
  const [loading, setLoading] = useState(false);

  const target = profile?.target_calories ?? 2000;
  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (mode === 'week') {
      const from = startOfWeek(today, { weekStartsOn: 1 });
      const to = addDays(from, 6);
      return { from, to, days: eachDayOfInterval({ start: from, end: to }) };
    }
    if (mode === 'month') {
      const from = startOfMonth(today);
      const to = endOfMonth(today);
      return { from, to, days: eachDayOfInterval({ start: from, end: to }) };
    }
    // all: last 90 days window for chart readability (data query can be wider)
    const to = today;
    const from = subDays(today, 89);
    return { from, to, days: eachDayOfInterval({ start: from, end: to }) };
  }, [mode, today]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const from = dateKey(range.from);
    const to = dateKey(range.to);
    let query = supabase
      .from('calorie_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: true });

    if (mode !== 'all') {
      query = query.gte('log_date', from).lte('log_date', to);
    } else {
      query = query.gte('log_date', from).lte('log_date', to);
    }

    void query.then(({ data }) => {
      setLogs((data as CalorieLog[]) || []);
      setLoading(false);
    });
  }, [user, supabase, range.from, range.to, mode]);

  const byDay: DayPoint[] = useMemo(() => {
    return range.days.map((day) => {
      const key = dateKey(day);
      const dayLogs = logs.filter((l) => l.log_date === key);
      const food = dayLogs.filter((l) => l.type === 'food').reduce((s, l) => s + l.calories, 0);
      const exercise = dayLogs
        .filter((l) => l.type === 'exercise')
        .reduce((s, l) => s + l.calories, 0);
      const net = food - exercise;
      const hasData = dayLogs.length > 0;
      return {
        key,
        label:
          mode === 'week'
            ? format(day, 'EEE', { locale: localeId })
            : format(day, mode === 'month' ? 'd' : 'd/M', { locale: localeId }),
        fullLabel: format(day, 'EEEE, d MMM yyyy', { locale: localeId }),
        food,
        exercise,
        net,
        target,
        over: hasData && food > target,
        hasData,
      };
    });
  }, [range.days, logs, target, mode]);

  const loggedDays = byDay.filter((d) => d.hasData && d.food > 0);
  const avgNet =
    loggedDays.reduce((s, d) => s + d.net, 0) / Math.max(1, loggedDays.length) || 0;
  const daysOver = loggedDays.filter((d) => d.food > target).length;
  const daysUnder = loggedDays.filter((d) => d.food > 0 && d.food <= target).length;

  const chartData = byDay.map((d) => ({
    ...d,
    // null agar garis putus di hari tanpa data
    foodPlot: d.hasData ? d.food : null,
    targetPlot: target,
  }));

  const title =
    mode === 'week' ? 'Mingguan' : mode === 'month' ? 'Bulanan' : 'Semua data';

  return (
    <AppShell title="Ringkasan">
      <div className="px-4 pb-8 space-y-4">
        <div className="flex gap-1 rounded-2xl border border-[var(--border)] bg-white p-1 animate-fade-up">
          {(
            [
              { id: 'week', label: 'Mingguan' },
              { id: 'month', label: 'Bulanan' },
              { id: 'all', label: 'Semua' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                mode === tab.id
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--muted)] hover:bg-[var(--bg)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="rounded-[20px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)] animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Ringkasan {title.toLowerCase()}
          </p>
          <p className="display-font mt-1 text-3xl font-semibold">{Math.round(avgNet)} kcal</p>
          <p className="text-sm text-[var(--muted)]">rata-rata bersih / hari tercatat</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Target {target} kcal · {daysUnder} hari ≤ target · {daysOver} hari di atas target
            {loading ? ' · memuat…' : ''}
          </p>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,35,50,0.08)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#5b6b7c' }}
                  interval={mode === 'week' ? 0 : 'preserveStartEnd'}
                  minTickGap={mode === 'all' ? 24 : 8}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#5b6b7c' }}
                  width={40}
                  domain={[0, (dataMax: number) => Math.max(dataMax || 0, target) * 1.15]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(26,35,50,0.08)',
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as DayPoint | undefined)?.fullLabel || ''
                  }
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value);
                    if (name === 'foodPlot') return [`${n} kcal`, 'Makan'];
                    if (name === 'targetPlot') return [`${n} kcal`, 'Target'];
                    return [value, name];
                  }}
                />
                <Legend
                  formatter={(v) => (v === 'foodPlot' ? 'Kalori makan' : 'Target harian')}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <ReferenceLine
                  y={target}
                  stroke="var(--miss)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="targetPlot"
                  stroke="var(--miss)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="foodPlot"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx?: number;
                      cy?: number;
                      payload?: DayPoint;
                    };
                    if (cx == null || cy == null || !payload?.hasData) return null;
                    return (
                      <circle
                        key={payload.key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={payload.over ? 'var(--miss)' : 'var(--brand)'}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Titik merah = di atas target · titik biru = di bawah/sesuai target · garis putus-putus =
            target harian
          </p>
        </section>

        <section className="space-y-2 animate-fade-up">
          {byDay
            .filter((d) => d.hasData)
            .slice()
            .reverse()
            .map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {format(parseISO(d.key), 'EEEE, d MMM', { locale: localeId })}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Makan {d.food} · Olahraga −{d.exercise}
                    {d.over ? ' · di atas target' : d.food > 0 ? ' · on track' : ''}
                  </p>
                </div>
                <p
                  className={`font-semibold ${d.over ? 'text-[var(--miss)]' : 'text-[var(--ink)]'}`}
                >
                  {d.net} kcal
                </p>
              </div>
            ))}
          {!loading && loggedDays.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              Belum ada data di periode ini.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
