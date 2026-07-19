'use client';

import { addDays, format, startOfWeek, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { dateKey, dayStatus } from '@/lib/calories';

export function DateStrip({
  selected,
  onSelect,
  loggedDates,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  loggedDates: Set<string>;
}) {
  const start = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none">
      {days.map((day) => {
        const status = dayStatus(day, loggedDates, selected);
        const isSelected = isSameDay(day, selected);
        return (
          <button
            key={dateKey(day)}
            type="button"
            onClick={() => onSelect(day)}
            className={`flex min-w-[52px] flex-col items-center rounded-2xl px-2 py-2 transition ${
              isSelected
                ? 'bg-[var(--ok-soft)] ring-2 ring-[var(--ok)]'
                : 'bg-white/70'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {format(day, 'EEE', { locale: localeId })}
            </span>
            <span
              className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                status === 'logged' && !isSelected
                  ? 'bg-[var(--ok)] text-white'
                  : status === 'missed' && !isSelected
                    ? 'bg-[var(--miss-soft)] text-[var(--miss)]'
                    : isSelected
                      ? 'bg-[var(--ok)] text-white'
                      : 'text-[var(--ink)]'
              }`}
            >
              {format(day, 'd')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
