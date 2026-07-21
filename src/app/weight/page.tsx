'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { calculateTargets } from '@/lib/tdee';
import type { ActivityLevel, Gender, WeightGoal, WeightLog } from '@/lib/types';

export default function WeightPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(90);
    setLogs((data as WeightLog[]) || []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const syncProfileWeight = async (value: number) => {
    if (!user || !profile) return;
    if (
      !profile.gender ||
      !profile.age ||
      !profile.height ||
      !profile.activity_level ||
      !profile.weight_goal
    ) {
      await supabase
        .from('profiles')
        .update({ weight: value, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      await refreshProfile();
      return;
    }

    const speed =
      profile.target_speed != null && Number.isFinite(Number(profile.target_speed))
        ? Number(profile.target_speed)
        : 0.5;
    const targets = calculateTargets({
      gender: profile.gender as Gender,
      age: profile.age,
      height: Number(profile.height),
      weight: value,
      activityLevel: profile.activity_level as ActivityLevel,
      weightGoal: profile.weight_goal as WeightGoal,
      targetSpeed: profile.weight_goal === 'maintain' ? 0 : speed || 0.5,
    });
    await supabase
      .from('profiles')
      .update({
        weight: value,
        bmr: targets.bmr,
        tdee: targets.tdee,
        target_calories: targets.targetCalories,
        protein_target_g: targets.proteinTargetG,
        carbs_target_g: targets.carbsTargetG,
        fat_target_g: targets.fatTargetG,
        water_goal_ml: targets.waterGoalMl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    await refreshProfile();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const value = Number(weight);
    if (!value) return;
    setSaving(true);
    try {
      await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: value,
        logged_at: new Date().toISOString().slice(0, 10),
      });
      await syncProfileWeight(value);
      setWeight('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (log: WeightLog) => {
    setEditingId(log.id);
    setEditValue(String(log.weight_kg));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (log: WeightLog) => {
    if (!user) return;
    const value = Number(editValue);
    if (!value || value <= 0) return;
    setEditBusy(true);
    try {
      await supabase
        .from('weight_logs')
        .update({ weight_kg: value })
        .eq('id', log.id)
        .eq('user_id', user.id);

      const { data: refreshed } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(90);
      const nextLogs = (refreshed as WeightLog[]) || [];
      setLogs(nextLogs);

      const latest = nextLogs[nextLogs.length - 1];
      if (latest) {
        await syncProfileWeight(Number(latest.weight_kg));
      }
      cancelEdit();
    } finally {
      setEditBusy(false);
    }
  };

  const deleteLog = async (log: WeightLog) => {
    if (!user) return;
    const ok = window.confirm(
      `Hapus catatan berat ${log.weight_kg} kg (${format(parseISO(log.logged_at), 'd MMM yyyy', {
        locale: localeId,
      })})?`
    );
    if (!ok) return;
    setEditBusy(true);
    try {
      await supabase.from('weight_logs').delete().eq('id', log.id).eq('user_id', user.id);
      const { data: refreshed } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(90);
      const nextLogs = (refreshed as WeightLog[]) || [];
      setLogs(nextLogs);

      if (nextLogs.length > 0) {
        const latest = nextLogs[nextLogs.length - 1];
        await syncProfileWeight(Number(latest.weight_kg));
      }
      if (editingId === log.id) cancelEdit();
    } finally {
      setEditBusy(false);
    }
  };

  const chartData = useMemo(
    () =>
      logs.map((log) => ({
        key: log.id,
        date: log.logged_at,
        label: format(parseISO(log.logged_at), 'd MMM', { locale: localeId }),
        fullLabel: format(parseISO(log.logged_at), 'd MMMM yyyy', { locale: localeId }),
        weight: Number(log.weight_kg),
      })),
    [logs]
  );

  const latest = logs.length ? Number(logs[logs.length - 1].weight_kg) : profile?.weight;
  const first = logs.length ? Number(logs[0].weight_kg) : undefined;
  const delta = latest != null && first != null ? latest - first : 0;

  return (
    <AppShell title="Berat badan">
      <div className="px-4 pb-8 space-y-4">
        <section className="rounded-[20px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)] animate-fade-up">
          <p className="text-xs text-[var(--muted)]">Berat saat ini</p>
          <p className="display-font text-4xl font-semibold">{latest ?? '—'} kg</p>
          {logs.length > 1 && (
            <p className={`mt-1 text-sm ${delta <= 0 ? 'text-[var(--ok)]' : 'text-[var(--miss)]'}`}>
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} kg sejak catatan awal di grafik
            </p>
          )}

          {chartData.length >= 2 ? (
            <div className="mt-4 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,35,50,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5b6b7c' }} minTickGap={20} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#5b6b7c' }}
                    width={36}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(26,35,50,0.08)',
                      fontSize: 12,
                    }}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullLabel?: string } | undefined)?.fullLabel || ''
                    }
                    formatter={(value) => [`${value} kg`, 'Berat']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: 'var(--brand)', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Catat minimal 2 kali untuk melihat grafik tren berat.
            </p>
          )}
        </section>

        <form onSubmit={onSubmit} className="flex gap-2 animate-fade-up">
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Berat baru (kg)"
            className="flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={saving || !weight}
            className="rounded-2xl bg-[var(--brand)] px-5 font-semibold text-white disabled:opacity-40"
          >
            Simpan
          </button>
        </form>

        <section className="space-y-2">
          {[...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
            >
              <span className="shrink-0 text-[var(--muted)]">
                {format(parseISO(log.logged_at), 'd MMM yyyy', { locale: localeId })}
              </span>

              {editingId === log.id ? (
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-right text-sm outline-none"
                    autoFocus
                  />
                  <span className="text-[var(--muted)]">kg</span>
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={() => void saveEdit(log)}
                    className="rounded-lg p-1.5 text-[var(--ok)] hover:bg-[var(--ok-soft)] disabled:opacity-40"
                    aria-label="Simpan"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={cancelEdit}
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] disabled:opacity-40"
                    aria-label="Batal"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{log.weight_kg} kg</span>
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={() => startEdit(log)}
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)] disabled:opacity-40"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={() => void deleteLog(log)}
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--miss-soft)] hover:text-[var(--miss)] disabled:opacity-40"
                    aria-label="Hapus"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Belum ada catatan berat.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
