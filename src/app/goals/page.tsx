'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function GoalsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(150);
  const [fat, setFat] = useState(50);
  const [water, setWater] = useState(2000);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCalories(profile.target_calories || 2000);
    setProtein(profile.protein_target_g || 150);
    setCarbs(profile.carbs_target_g || 150);
    setFat(profile.fat_target_g || 50);
    setWater(profile.water_goal_ml || 2000);
  }, [profile]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({
        target_calories: calories,
        protein_target_g: protein,
        carbs_target_g: carbs,
        fat_target_g: fat,
        water_goal_ml: water,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  };

  return (
    <AppShell title="Target harian">
      <form onSubmit={onSubmit} className="px-4 pb-8 space-y-4 animate-fade-up">
        {profile?.tdee && (
          <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm">
            <p className="text-[var(--muted)]">Referensi dari onboarding</p>
            <p className="font-medium">
              BMR {profile.bmr} · TDEE {profile.tdee} kcal
            </p>
          </div>
        )}

        {[
          { label: 'Kalori (kcal)', value: calories, set: setCalories },
          { label: 'Protein (g)', value: protein, set: setProtein },
          { label: 'Karbohidrat (g)', value: carbs, set: setCarbs },
          { label: 'Lemak (g)', value: fat, set: setFat },
          { label: 'Air (ml)', value: water, set: setWater },
        ].map((field) => (
          <label key={field.label} className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{field.label}</span>
            <input
              type="number"
              value={field.value}
              onChange={(e) => field.set(Number(e.target.value))}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-[var(--brand)] py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan target'}
        </button>
        {saved && <p className="text-center text-sm text-[var(--ok)]">Target disimpan.</p>}
      </form>
    </AppShell>
  );
}
