import type { CalorieLog, DayTotals, Profile } from './types';
import { format, parseISO, subDays, isSameDay } from 'date-fns';

export function dateKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

export function formatDisplayDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'd MMM yyyy');
  } catch {
    return isoDate;
  }
}

export function computeDayTotals(logs: CalorieLog[], profile: Profile | null): DayTotals {
  const target = profile?.target_calories ?? 2000;
  let foodCalories = 0;
  let exerciseCalories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const log of logs) {
    if (log.type === 'food') {
      foodCalories += log.calories;
      protein += Number(log.protein) || 0;
      carbs += Number(log.carbs) || 0;
      fat += Number(log.fat) || 0;
    } else {
      exerciseCalories += log.calories;
    }
  }

  return {
    foodCalories,
    exerciseCalories,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    remaining: target - foodCalories + exerciseCalories,
  };
}

export function computeStreak(logDates: string[]): number {
  const unique = new Set(logDates);
  let streak = 0;
  let cursor = new Date();
  // If today has no log yet, start from yesterday
  if (!unique.has(dateKey(cursor))) {
    cursor = subDays(cursor, 1);
  }
  while (unique.has(dateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function dayStatus(
  date: Date,
  loggedDates: Set<string>,
  selected: Date
): 'selected' | 'logged' | 'missed' | 'future' | 'neutral' {
  if (isSameDay(date, selected)) return 'selected';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d > today) return 'future';
  const key = dateKey(date);
  if (loggedDates.has(key)) return 'logged';
  if (d < today) return 'missed';
  return 'neutral';
}

export const ML_PER_CUP = 250;
