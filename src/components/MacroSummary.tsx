'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { DayTotals, Profile } from '@/lib/types';

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-[var(--muted)]">
          {current}g / {target}g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg)]">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function MacroSummary({
  totals,
  profile,
  streak,
}: {
  totals: DayTotals;
  profile: Profile | null;
  streak: number;
}) {
  const [page, setPage] = useState(0);
  const target = profile?.target_calories ?? 2000;

  return (
    <div className="mx-4 mb-3 rounded-[20px] bg-white/90 p-4 shadow-[var(--shadow)] border border-[var(--border)] animate-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {page === 0 ? 'Sisa kalori' : 'Makro'}
        </p>
        <div className="flex items-center gap-1 rounded-full bg-[#fff6e0] px-2.5 py-1 text-xs font-semibold text-[#b7791f]">
          <Zap size={12} fill="currentColor" />
          {streak}
        </div>
      </div>

      {page === 0 ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="display-font text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
              {totals.remaining}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">kcal tersisa hari ini</p>
          </div>
          <div className="text-right text-xs text-[var(--muted)] space-y-1">
            <p>Target {target}</p>
            <p>Makan {totals.foodCalories}</p>
            <p>Olahraga +{totals.exerciseCalories}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <MacroBar
            label="Karbo"
            current={totals.carbs}
            target={profile?.carbs_target_g ?? 150}
            color="var(--carbs)"
          />
          <MacroBar
            label="Protein"
            current={totals.protein}
            target={profile?.protein_target_g ?? 75}
            color="var(--protein)"
          />
          <MacroBar
            label="Lemak"
            current={totals.fat}
            target={profile?.fat_target_g ?? 50}
            color="var(--fat)"
          />
        </div>
      )}

      <div className="mt-4 flex justify-center gap-1.5">
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ringkasan ${i + 1}`}
            onClick={() => setPage(i)}
            className={`h-1.5 rounded-full transition-all ${
              page === i ? 'w-5 bg-[var(--brand)]' : 'w-1.5 bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
