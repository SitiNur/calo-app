import type { ActivityLevel, Gender, WeightGoal } from './types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Kurang gerak (kerja duduk)',
  light: 'Ringan (olahraga 1–3x/minggu)',
  moderate: 'Sedang (olahraga 3–5x/minggu)',
  active: 'Aktif (olahraga 6–7x/minggu)',
  very_active: 'Sangat aktif (kerja fisik/2x sehari)',
};

export const GOAL_LABELS: Record<WeightGoal, string> = {
  lose: 'Turun berat badan',
  maintain: 'Pertahankan berat',
  gain: 'Naik berat badan',
};

export interface TdeeInput {
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  weightGoal: WeightGoal;
  targetSpeed: number;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  waterGoalMl: number;
  dailyAdjust: number;
}

/** Mifflin–St Jeor BMR */
export function calculateBmr(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return Math.round(base + 5);
  return Math.round(base - 161);
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Daily calorie adjustment from kg/week goal.
 * 1 kg fat ≈ 7700 kcal → per day = kg_week * 7700 / 7
 */
export function calculateTargets(input: TdeeInput): TdeeResult {
  const bmr = calculateBmr(input.gender, input.weight, input.height, input.age);
  const tdee = calculateTdee(bmr, input.activityLevel);

  // Jangan pakai `|| 0.5` — nilai 0 valid (maintain / tanpa penyesuaian)
  const rawSpeed = Number(input.targetSpeed);
  const speed = Number.isFinite(rawSpeed) ? Math.max(0, Math.min(1, rawSpeed)) : 0.5;
  const dailyAdjust = Math.round((speed * 7700) / 7);

  let targetCalories = tdee;
  if (input.weightGoal === 'lose') {
    const floor = input.gender === 'male' ? 1500 : 1200;
    // Defisit dari kecepatan; dibatasi minimum aman
    targetCalories = Math.max(floor, tdee - dailyAdjust);
  } else if (input.weightGoal === 'gain') {
    targetCalories = tdee + dailyAdjust;
  }

  const proteinTargetG = Math.round((targetCalories * 0.3) / 4);
  const carbsTargetG = Math.round((targetCalories * 0.4) / 4);
  const fatTargetG = Math.round((targetCalories * 0.3) / 9);
  const waterGoalMl = Math.round(Math.max(1500, input.weight * 35));

  return {
    bmr,
    tdee,
    targetCalories,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    waterGoalMl,
    dailyAdjust: input.weightGoal === 'maintain' ? 0 : dailyAdjust,
  };
}
