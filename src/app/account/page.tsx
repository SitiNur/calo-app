'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  calculateTargets,
} from '@/lib/tdee';
import type { ActivityLevel, Gender, WeightGoal } from '@/lib/types';

export default function AccountPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain');
  const [targetSpeed, setTargetSpeed] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    if (profile.gender) setGender(profile.gender);
    if (profile.age) setAge(profile.age);
    if (profile.height) setHeight(Number(profile.height));
    if (profile.weight) setWeight(Number(profile.weight));
    if (profile.activity_level) setActivityLevel(profile.activity_level);
    if (profile.weight_goal) setWeightGoal(profile.weight_goal);
    if (profile.target_speed != null && Number(profile.target_speed) > 0) {
      setTargetSpeed(Number(profile.target_speed));
    } else if (profile.weight_goal && profile.weight_goal !== 'maintain') {
      setTargetSpeed(0.5);
    }
  }, [profile]);

  const preview = useMemo(
    () =>
      calculateTargets({
        gender,
        age,
        height,
        weight,
        activityLevel,
        weightGoal,
        targetSpeed: weightGoal === 'maintain' ? 0 : targetSpeed,
      }),
    [gender, age, height, weight, activityLevel, weightGoal, targetSpeed]
  );

  const floor = gender === 'male' ? 1500 : 1200;
  const rawLoseTarget = preview.tdee - preview.dailyAdjust;
  const hitFloor = weightGoal === 'lose' && rawLoseTarget < floor;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setDone(false);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        gender,
        age,
        height,
        weight,
        activity_level: activityLevel,
        weight_goal: weightGoal,
        target_speed: weightGoal === 'maintain' ? 0 : targetSpeed,
        bmr: preview.bmr,
        tdee: preview.tdee,
        target_calories: preview.targetCalories,
        protein_target_g: preview.proteinTargetG,
        carbs_target_g: preview.carbsTargetG,
        fat_target_g: preview.fatTargetG,
        water_goal_ml: preview.waterGoalMl,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      alert(error.message || 'Gagal menyimpan profil');
      return;
    }
    await refreshProfile();
    setDone(true);
  };

  return (
    <AppShell title="Akun">
      <div className="px-4 pb-8 space-y-6 animate-fade-up">
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-xs text-[var(--muted)]">{user?.email}</p>

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`rounded-2xl border py-3 text-sm ${
                  gender === g
                    ? 'border-[var(--brand)] bg-[var(--bg-soft)]'
                    : 'border-[var(--border)] bg-white'
                }`}
              >
                {g === 'male' ? 'Pria' : 'Wanita'}
              </button>
            ))}
          </div>

          {[
            { label: 'Usia', value: age, set: setAge },
            { label: 'Tinggi (cm)', value: height, set: setHeight },
            { label: 'Berat (kg)', value: weight, set: setWeight },
          ].map((f) => (
            <label key={f.label} className="block text-xs text-[var(--muted)]">
              {f.label}
              <input
                type="number"
                value={f.value}
                onChange={(e) => f.set(Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
              />
            </label>
          ))}

          <label className="block text-xs text-[var(--muted)]">
            Aktivitas
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Tujuan
            <select
              value={weightGoal}
              onChange={(e) => setWeightGoal(e.target.value as WeightGoal)}
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
            >
              {(Object.keys(GOAL_LABELS) as WeightGoal[]).map((k) => (
                <option key={k} value={k}>
                  {GOAL_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

          {weightGoal !== 'maintain' && (
            <label className="block text-xs text-[var(--muted)]">
              Kecepatan {targetSpeed} kg/minggu
              <input
                type="range"
                min={0.25}
                max={1}
                step={0.25}
                value={targetSpeed}
                onChange={(e) => setTargetSpeed(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <span className="mt-1 block text-[11px]">
                Penyesuaian ≈ {preview.dailyAdjust} kcal/hari (
                {weightGoal === 'lose' ? 'defisit' : 'surplus'})
              </span>
            </label>
          )}

          <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm space-y-2">
            <div className="space-y-1.5 text-xs leading-relaxed text-[var(--muted)]">
              <p>
                <span className="font-semibold text-[var(--ink)]">BMR</span> (Basal Metabolic
                Rate) — kalori yang tubuh bakar saat istirahat total, untuk fungsi dasar seperti
                napas dan detak jantung.
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">TDEE</span> (Total Daily Energy
                Expenditure) — total kalori harian setelah ditambah aktivitas. Target makanmu
                dihitung dari TDEE ± tujuan (turun/maintain/naik BB).
              </p>
            </div>

            <p>
              BMR {preview.bmr} · TDEE {preview.tdee}
            </p>
            {weightGoal === 'lose' && (
              <p className="text-xs text-[var(--muted)]">
                TDEE − {preview.dailyAdjust} = {rawLoseTarget}
                {hitFloor ? ` → dibatasi minimum aman ${floor}` : ''}
              </p>
            )}
            {weightGoal === 'gain' && (
              <p className="text-xs text-[var(--muted)]">
                TDEE + {preview.dailyAdjust} = {preview.targetCalories}
              </p>
            )}
            <p className="font-semibold text-[var(--brand-dark)]">
              Target baru: {preview.targetCalories} kcal
            </p>
            {hitFloor && (
              <p className="text-xs text-[var(--miss)]">
                Kecepatan lebih tinggi tidak menurunkan target lagi karena sudah di batas aman (
                {floor} kcal).
              </p>
            )}
            {profile?.target_calories != null &&
              profile.target_calories !== preview.targetCalories && (
                <p className="text-xs text-[var(--ok)]">
                  Berubah dari {profile.target_calories} → {preview.targetCalories} kcal (tekan
                  Simpan)
                </p>
              )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-[var(--brand)] py-3.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : 'Simpan & hitung ulang'}
          </button>
          {done && (
            <button
              type="button"
              onClick={() => router.push('/today')}
              className="w-full text-sm text-[var(--ok)]"
            >
              Profil diperbarui — kembali ke Hari ini
            </button>
          )}
        </form>
      </div>
    </AppShell>
  );
}
