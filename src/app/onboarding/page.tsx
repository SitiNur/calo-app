'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  calculateTargets,
  type TdeeInput,
} from '@/lib/tdee';
import type { ActivityLevel, Gender, WeightGoal } from '@/lib/types';

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('lose');
  const [targetSpeed, setTargetSpeed] = useState(0.5);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile?.profile_completed) {
      router.replace('/today');
    }
    if (profile?.full_name) setFullName(profile.full_name);
  }, [user, profile, loading, router]);

  const preview = useMemo(() => {
    const input: TdeeInput = {
      gender,
      age,
      height,
      weight,
      activityLevel,
      weightGoal,
      targetSpeed: weightGoal === 'maintain' ? 0 : targetSpeed,
    };
    return calculateTargets(input);
  }, [gender, age, height, weight, activityLevel, weightGoal, targetSpeed]);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const { error: upError } = await supabase
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

      if (upError) throw upError;

      await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: weight,
        logged_at: new Date().toISOString().slice(0, 10),
      });

      await refreshProfile();
      router.replace('/today');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="phone-frame items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="phone-frame px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
        Onboarding · {step}/4
      </p>
      <div className="mt-2 mb-6 h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="animate-fade-up space-y-4">
          <h1 className="display-font text-3xl font-semibold">Halo, kenalan dulu</h1>
          <p className="text-sm text-[var(--muted)]">Nama ini muncul di chat asisten Calo.</p>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama panggilan"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="button"
            disabled={!fullName.trim()}
            onClick={() => setStep(2)}
            className="w-full rounded-2xl bg-[var(--brand)] py-3.5 font-semibold text-white disabled:opacity-40"
          >
            Lanjut
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-up space-y-4">
          <h1 className="display-font text-3xl font-semibold">Detail tubuh</h1>
          <p className="text-sm text-[var(--muted)]">Untuk menghitung BMR & TDEE-mu.</p>

          <div className="grid grid-cols-2 gap-2">
            {([
              ['male', 'Pria'],
              ['female', 'Wanita'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                className={`rounded-2xl border py-3 text-sm font-medium ${
                  gender === val
                    ? 'border-[var(--brand)] bg-[var(--bg-soft)] text-[var(--brand-dark)]'
                    : 'border-[var(--border)] bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {[
            { label: 'Usia', value: age, set: setAge, unit: 'th' },
            { label: 'Tinggi', value: height, set: setHeight, unit: 'cm' },
            { label: 'Berat', value: weight, set: setWeight, unit: 'kg' },
          ].map((field) => (
            <label key={field.label} className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
                {field.label} ({field.unit})
              </span>
              <input
                type="number"
                value={field.value}
                onChange={(e) => field.set(Number(e.target.value))}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </label>
          ))}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-[var(--border)] py-3">
              Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-[2] rounded-2xl bg-[var(--brand)] py-3 font-semibold text-white"
            >
              Lanjut
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-up space-y-4">
          <h1 className="display-font text-3xl font-semibold">Aktivitas & tujuan</h1>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Aktivitas harian</span>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--muted)]">Tujuan</span>
            {(Object.keys(GOAL_LABELS) as WeightGoal[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setWeightGoal(key)}
                className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                  weightGoal === key
                    ? 'border-[var(--brand)] bg-[var(--bg-soft)]'
                    : 'border-[var(--border)] bg-white'
                }`}
              >
                {GOAL_LABELS[key]}
              </button>
            ))}
          </div>

          {weightGoal !== 'maintain' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
                Kecepatan (kg / minggu): {targetSpeed}
              </span>
              <input
                type="range"
                min={0.25}
                max={1}
                step={0.25}
                value={targetSpeed}
                onChange={(e) => setTargetSpeed(Number(e.target.value))}
                className="w-full"
              />
            </label>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-2xl border border-[var(--border)] py-3">
              Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-[2] rounded-2xl bg-[var(--brand)] py-3 font-semibold text-white"
            >
              Lihat target
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <form onSubmit={save} className="animate-fade-up space-y-4">
          <h1 className="display-font text-3xl font-semibold">Target kamu</h1>
          <p className="text-sm text-[var(--muted)]">
            Dihitung dari BMR → TDEE → target kalori sesuai tujuan.
          </p>

          <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-white p-4">
            <Row label="BMR" value={`${preview.bmr} kcal`} />
            <Row label="TDEE" value={`${preview.tdee} kcal`} />
            <Row
              label={weightGoal === 'lose' ? 'Defisit / hari' : weightGoal === 'gain' ? 'Surplus / hari' : 'Penyesuaian'}
              value={`${preview.dailyAdjust} kcal`}
            />
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--muted)]">Target kalori harian</p>
              <p className="display-font text-4xl font-semibold text-[var(--brand-dark)]">
                {preview.targetCalories}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-[var(--bg)] p-2">
                <p className="font-semibold">{preview.carbsTargetG}g</p>
                <p className="text-[var(--muted)]">karbo</p>
              </div>
              <div className="rounded-xl bg-[var(--bg)] p-2">
                <p className="font-semibold">{preview.proteinTargetG}g</p>
                <p className="text-[var(--muted)]">protein</p>
              </div>
              <div className="rounded-xl bg-[var(--bg)] p-2">
                <p className="font-semibold">{preview.fatTargetG}g</p>
                <p className="text-[var(--muted)]">lemak</p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Target air ≈ {(preview.waterGoalMl / 1000).toFixed(1)} L / hari
            </p>
          </div>

          {error && <p className="text-sm text-[var(--miss)]">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-2xl border border-[var(--border)] py-3">
              Kembali
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] rounded-2xl bg-[var(--brand)] py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Mulai tracking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
