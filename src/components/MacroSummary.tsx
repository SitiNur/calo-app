'use client';

import { useEffect, useRef, useState } from 'react';
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
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11px] font-medium">{label}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--bg)]">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-[4.5rem] shrink-0 text-right text-[10px] tabular-nums text-[var(--muted)]">
        {current}/{target}g
      </span>
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const target = profile?.target_calories ?? 2000;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width > 0) {
      el.scrollTo({ left: page * width, behavior: 'smooth' });
    }
  }, [page]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setPage((prev) => (prev === next ? prev : next));
  }

  return (
    <div className="mx-4 mb-2 rounded-xl border border-[var(--border)] bg-white/90 px-2.5 py-2 shadow-[var(--shadow)] animate-fade-up">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {page === 0 ? 'Sisa kalori' : 'Makro'}
        </p>
        <div className="flex items-center gap-0.5 rounded-full bg-[#fff6e0] px-1.5 py-0.5 text-[10px] font-semibold text-[#b7791f]">
          <Zap size={9} fill="currentColor" />
          {streak}
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-[52px] snap-x snap-mandatory overflow-x-auto scrollbar-none touch-pan-x"
      >
        <div className="flex h-full min-w-full shrink-0 basis-full snap-center items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <p className="display-font text-[1.75rem] font-semibold leading-none tracking-tight">
              {totals.remaining}
            </p>
            <p className="text-[11px] text-[var(--muted)]">kcal sisa</p>
          </div>
          <div className="space-y-0 text-right text-[10px] leading-snug text-[var(--muted)]">
            <p>Target {target}</p>
            <p>Makan {totals.foodCalories}</p>
            <p>Olahraga +{totals.exerciseCalories}</p>
          </div>
        </div>

        <div className="flex h-full min-w-full shrink-0 basis-full snap-center flex-col justify-center gap-1.5">
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
      </div>

      <div className="mt-1.5 flex justify-center gap-1">
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ringkasan ${i + 1}`}
            onClick={() => setPage(i)}
            className={`h-1 rounded-full transition-all ${
              page === i ? 'w-3.5 bg-[var(--brand)]' : 'w-1 bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
