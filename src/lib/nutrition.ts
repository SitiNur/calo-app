import type { FoodItem, ExerciseItem, AiResponse } from './types';

/**
 * Pass-through for table-based nutrition (TKPI/USDA).
 * Do NOT rescale macros to fit Atwater (P×4+C×4+L×9) — table values
 * often diverge slightly from that rule (e.g. egg white).
 */
export function normalizeFoodItem(item: FoodItem): FoodItem {
  const protein = round1(clamp(Number(item.protein) || 0, 0, 300));
  const carbs = round1(clamp(Number(item.carbs) || 0, 0, 500));
  const fat = round1(clamp(Number(item.fat) || 0, 0, 200));
  let calories = Math.round(Number(item.calories) || 0);

  // Only invent calories if completely missing
  if (!calories && (protein > 0 || carbs > 0 || fat > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  }

  return {
    name: (item.name || 'Makanan').trim().slice(0, 100),
    calories: clamp(calories, 0, 3000),
    protein,
    carbs,
    fat,
    serving: item.serving?.trim() || '1 porsi',
  };
}

export function normalizeExerciseItem(item: ExerciseItem): ExerciseItem {
  const durationMinutes = clamp(Math.round(Number(item.durationMinutes) || 30), 1, 600);
  let caloriesBurned = Math.round(Number(item.caloriesBurned) || 0);
  caloriesBurned = clamp(caloriesBurned, 0, 2000);
  return {
    name: (item.name || 'Olahraga').trim().slice(0, 80),
    caloriesBurned,
    durationMinutes,
  };
}

export function normalizeAiResponse(raw: Partial<AiResponse>): AiResponse {
  const foodItems = (raw.foodItems || []).map(normalizeFoodItem).filter((f) => f.calories > 0 || f.name);
  const exerciseItems = (raw.exerciseItems || []).map(normalizeExerciseItem);
  let type = raw.type;
  if (!type || !['food', 'exercise', 'chat'].includes(type)) {
    type = foodItems.length ? 'food' : exerciseItems.length ? 'exercise' : 'chat';
  }
  const reply =
    (raw.reply || '').trim() ||
    (type === 'chat'
      ? 'Cerita aja mau makan apa — aku bantu hitung kalorinya.'
      : 'Sudah aku catat ya.');

  return { type, reply, foodItems, exerciseItems, source: raw.source };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
