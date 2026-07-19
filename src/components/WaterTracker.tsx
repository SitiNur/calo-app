'use client';

import { Minus, Plus } from 'lucide-react';
import { ML_PER_CUP } from '@/lib/calories';

export function WaterTracker({
  cups,
  goalMl,
  onChange,
  loading,
}: {
  cups: number;
  goalMl: number;
  onChange: (nextCups: number) => void;
  loading?: boolean;
}) {
  const goalCups = Math.max(1, Math.round(goalMl / ML_PER_CUP));
  const remaining = Math.max(0, goalCups - cups);
  const ml = cups * ML_PER_CUP;

  return (
    <section
      id="water"
      className="mx-4 mb-3 rounded-[20px] border border-[var(--border)] bg-white/90 px-4 py-3 shadow-[var(--shadow)] animate-fade-up"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Air: {(ml / 1000).toFixed(2)}L</p>
          <p className="text-xs text-[var(--muted)]">
            {cups} gelas · {remaining} gelas tersisa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || cups <= 0}
            onClick={() => onChange(Math.max(0, cups - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onChange(cups + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-white disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
