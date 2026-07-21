'use client';

import { addDays, format, startOfWeek, isSameDay, isAfter, startOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, dayCalorieTone, type DayCalorieTone } from '@/lib/calories';

function dayButtonClass(tone: DayCalorieTone, isSelected: boolean): string {
  const base =
    'flex min-w-0 flex-1 flex-col items-center rounded-lg px-0.5 py-1 transition disabled:opacity-35';

  if (isSelected) {
    if (tone === 'over') return `${base} bg-[var(--miss-soft)] ring-2 ring-[var(--miss)]`;
    if (tone === 'missed') return `${base} bg-[var(--miss-soft)] ring-2 ring-[var(--miss)]`;
    if (tone === 'ok') return `${base} bg-[var(--ok-soft)] ring-2 ring-[var(--ok)]`;
    // today / neutral selected
    return `${base} bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]`;
  }

  if (tone === 'today') return `${base} bg-[var(--brand)]/10`;
  if (tone === 'ok') return `${base} bg-[var(--ok-soft)]`;
  if (tone === 'over') return `${base} bg-[var(--miss-soft)]`;
  if (tone === 'missed') return `${base} bg-[var(--miss-soft)]/70`;
  return `${base} bg-white/60`;
}

function dayNumClass(tone: DayCalorieTone, isSelected: boolean): string {
  const base =
    'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold';

  if (isSelected) {
    if (tone === 'over' || tone === 'missed') return `${base} bg-[var(--miss)] text-white`;
    if (tone === 'ok') return `${base} bg-[var(--ok)] text-white`;
    return `${base} bg-[var(--brand)] text-white`;
  }

  if (tone === 'today') return `${base} bg-[var(--brand)] text-white`;
  if (tone === 'ok') return `${base} bg-[var(--ok)] text-white`;
  if (tone === 'over') return `${base} bg-[var(--miss)] text-white`;
  if (tone === 'missed') return `${base} text-[var(--miss)]`;
  return `${base} text-[var(--ink)]`;
}

export function DateStrip({
  selected,
  onSelect,
  dayNets,
  targetCalories,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  /** net kcal per tanggal (makan − olahraga); key hanya untuk hari yang punya log */
  dayNets: Record<string, number>;
  targetCalories: number;
}) {
  const start = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = startOfDay(new Date());
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const canGoNext = start.getTime() < thisWeekStart.getTime();

  const shiftWeek = (delta: number) => {
    const next = addDays(selected, delta * 7);
    if (delta > 0 && isAfter(startOfDay(next), today)) {
      onSelect(today);
      return;
    }
    onSelect(next);
  };

  return (
    <div className="flex items-center gap-0.5 px-1.5 pb-1 pt-0.5">
      <button
        type="button"
        aria-label="Minggu sebelumnya"
        onClick={() => shiftWeek(-1)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-white/80"
      >
        <ChevronLeft size={14} />
      </button>

      <div className="flex min-w-0 flex-1 gap-0.5">
        {days.map((day) => {
          const tone = dayCalorieTone(day, dayNets, targetCalories);
          const isSelected = isSameDay(day, selected);
          const isFuture = isAfter(startOfDay(day), today);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={dateKey(day)}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(day)}
              title={
                tone === 'ok'
                  ? 'On track'
                  : tone === 'over'
                    ? 'Di atas target'
                    : tone === 'missed'
                      ? 'Belum diisi'
                      : isToday
                        ? 'Hari ini'
                        : undefined
              }
              className={dayButtonClass(tone, isSelected)}
            >
              <span
                className={`text-[8px] uppercase leading-none tracking-wide ${
                  isToday && !isSelected ? 'font-semibold text-[var(--brand)]' : 'text-[var(--muted)]'
                }`}
              >
                {format(day, 'EEE', { locale: localeId })}
              </span>
              <span className={dayNumClass(tone, isSelected)}>{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Minggu berikutnya"
        disabled={!canGoNext}
        onClick={() => shiftWeek(1)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-white/80 disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
