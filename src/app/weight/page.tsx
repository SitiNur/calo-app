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
import { dateKey } from '@/lib/calories';
import type { ActivityLevel, Gender, WeightGoal, WeightLog } from '@/lib/types';

function sortLogs(logs: WeightLog[]): WeightLog[] {
  return [...logs].sort((a, b) => {
    const byDate = a.logged_at.localeCompare(b.logged_at);
    if (byDate !== 0) return byDate;
    return a.created_at.localeCompare(b.created_at);
  });
}

export default function WeightPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => dateKey());
  const [adjustTargets, setAdjustTargets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(90);
    setLogs(sortLogs((data as WeightLog[]) || []));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Update berat profil; target kalori hanya jika adjustTargets = true. */
  const syncProfileFromLatest = async (
    nextLogs: WeightLog[],
    opts: { adjustTargets: boolean }
  ) => {
    if (!user || !profile || nextLogs.length === 0) return;
    const latest = nextLogs[nextLogs.length - 1];
    const value = Number(latest.weight_kg);
    if (!value) return;

    if (!opts.adjustTargets) {
      await supabase
        .from('profiles')
        .update({ weight: value, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      await refreshProfile();
      setNotice(null);
      return;
    }

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
      setNotice('Berat profil diperbarui. Lengkapi data akun untuk hitung ulang target.');
      return;
    }

    const prevTarget = profile.target_calories;
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

    if (prevTarget != null && prevTarget !== targets.targetCalories) {
      setNotice(`Target harian diperbarui: ${prevTarget} → ${targets.targetCalories} kcal`);
    } else {
      setNotice(`Target harian: ${targets.targetCalories} kcal (mengikuti berat terbaru)`);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const value = Number(weight);
    if (!value || value <= 0) return;
    if (!loggedAt) return;
    setSaving(true);
    setNotice(null);
    try {
      await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: value,
        logged_at: loggedAt,
      });
      const { data: refreshed } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(90);
      const nextLogs = sortLogs((refreshed as WeightLog[]) || []);
      setLogs(nextLogs);
      await syncProfileFromLatest(nextLogs, { adjustTargets });
      setWeight('');
      setLoggedAt(dateKey());
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (log: WeightLog) => {
    setEditingId(log.id);
    setEditValue(String(log.weight_kg));
    setEditDate(log.logged_at);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditDate('');
  };

  const saveEdit = async (log: WeightLog) => {
    if (!user) return;
    const value = Number(editValue);
    if (!value || value <= 0 || !editDate) return;
    setEditBusy(true);
    setNotice(null);
    try {
      await supabase
        .from('weight_logs')
        .update({ weight_kg: value, logged_at: editDate })
        .eq('id', log.id)
        .eq('user_id', user.id);

      const { data: refreshed } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(90);
      const nextLogs = sortLogs((refreshed as WeightLog[]) || []);
      setLogs(nextLogs);
      // Edit log: update berat profil saja, jangan ubah target kecuali user centang opsi di form
      await syncProfileFromLatest(nextLogs, { adjustTargets: false });
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
    setNotice(null);
    try {
      await supabase.from('weight_logs').delete().eq('id', log.id).eq('user_id', user.id);
      const { data: refreshed } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(90);
      const nextLogs = sortLogs((refreshed as WeightLog[]) || []);
      setLogs(nextLogs);

      if (nextLogs.length > 0) {
        await syncProfileFromLatest(nextLogs, { adjustTargets: false });
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
  const todayKey = dateKey();

  return (
    <AppShell title="Berat badan">
      <div className="min-h-0 flex-1 px-4 pb-8 space-y-4">
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

        <form onSubmit={onSubmit} className="space-y-2 animate-fade-up">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Berat (kg)"
              className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              type="date"
              value={loggedAt}
              max={todayKey}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-[9.5rem] shrink-0 rounded-2xl border border-[var(--border)] bg-white px-2 py-3 text-sm outline-none"
              aria-label="Tanggal"
            />
            <button
              type="submit"
              disabled={saving || !weight || !loggedAt}
              className="shrink-0 rounded-2xl bg-[var(--brand)] px-4 font-semibold text-white disabled:opacity-40"
            >
              Simpan
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={adjustTargets}
              onChange={(e) => setAdjustTargets(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Sesuaikan target kalori</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Default off — catat berat tidak mengubah target harian. Centang jika ingin BMR/TDEE
                dihitung ulang dari berat terbaru. Atau atur manual di Akun.
              </span>
            </span>
          </label>

          {notice && (
            <p className="rounded-xl bg-[var(--ok-soft)] px-3 py-2 text-xs text-[var(--ok)]">
              {notice}
            </p>
          )}
        </form>

        <section className="space-y-2">
          {[...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
            >
              {editingId === log.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={editDate}
                    max={todayKey}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm outline-none"
                    aria-label="Tanggal"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-right text-sm outline-none"
                    autoFocus
                  />
                  <span className="text-[var(--muted)]">kg</span>
                  <div className="ml-auto flex items-center gap-1">
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
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--muted)]">
                    {format(parseISO(log.logged_at), 'd MMM yyyy', { locale: localeId })}
                  </span>
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
