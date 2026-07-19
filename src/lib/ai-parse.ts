import type { AiResponse, ExerciseItem, FoodItem } from '@/lib/types';
import { normalizeAiResponse } from '@/lib/nutrition';

/** New Gemini schema from nutrition assistant prompt */
export interface GeminiNutritionPayload {
  data_update?: {
    type?: 'food' | 'exercise' | 'report_request' | 'general_chat' | string;
    items?: Array<{
      name?: string;
      calories?: number;
      serving?: string;
      macros?: {
        carbs_g?: number;
        protein_g?: number;
        fat_g?: number;
      };
      duration_minutes?: number;
    }>;
  };
  ai_response?: {
    message?: string;
  };
}

/** Legacy flat schema (backward compat for old chat logs) */
interface LegacyPayload {
  type?: string;
  reply?: string;
  foodItems?: FoodItem[];
  exerciseItems?: ExerciseItem[];
}

export function parseGeminiPayload(raw: unknown): AiResponse {
  if (!raw || typeof raw !== 'object') {
    return normalizeAiResponse({ type: 'chat', reply: 'Maaf, respons tidak valid.' });
  }

  const obj = raw as GeminiNutritionPayload & LegacyPayload;

  // New nested format
  if (obj.data_update || obj.ai_response) {
    return normalizeAiResponse(fromNutritionFormat(obj as GeminiNutritionPayload));
  }

  // Legacy format
  return normalizeAiResponse({
    type: mapLegacyType(obj.type),
    reply: obj.reply,
    foodItems: obj.foodItems,
    exerciseItems: obj.exerciseItems,
  });
}

function fromNutritionFormat(payload: GeminiNutritionPayload): Partial<AiResponse> {
  const updateType = payload.data_update?.type || 'general_chat';
  const items = payload.data_update?.items || [];
  const message = payload.ai_response?.message?.trim() || '';

  if (updateType === 'report_request' || updateType === 'general_chat') {
    return {
      type: 'chat',
      reply:
        message ||
        (updateType === 'report_request'
          ? 'Laporan mingguan bisa kamu lihat di menu Ringkasan Mingguan ya!'
          : 'Ada yang bisa aku bantu catat hari ini?'),
      foodItems: [],
      exerciseItems: [],
    };
  }

  if (updateType === 'exercise') {
    const exerciseItems: ExerciseItem[] = items.map((item) => ({
      name: item.name || 'Olahraga',
      caloriesBurned: Math.round(Number(item.calories) || 0),
      durationMinutes: Math.round(Number(item.duration_minutes) || 30),
    }));
    const total = exerciseItems.reduce((s, e) => s + e.caloriesBurned, 0);
    return {
      type: 'exercise',
      reply:
        message ||
        `Mantap! Olahraga kamu kira-kira bakar ${total} kcal. Sudah aku catat — terus semangat!`,
      exerciseItems,
      foodItems: [],
    };
  }

  // food (default)
  const foodItems: FoodItem[] = items.map((item) => {
    const servingFromName = item.name?.match(/\(([^)]+)\)/)?.[1];
    return {
      name: item.name || 'Makanan',
      calories: Math.round(Number(item.calories) || 0),
      protein: Number(item.macros?.protein_g) || 0,
      carbs: Number(item.macros?.carbs_g) || 0,
      fat: Number(item.macros?.fat_g) || 0,
      serving: item.serving || servingFromName || '1 porsi',
    };
  });

  const total = foodItems.reduce((s, f) => s + f.calories, 0);
  return {
    type: 'food',
    reply:
      message ||
      `Sudah dicatat! Total estimasi ~${total} kcal. Pilihan yang bagus — lanjutkan hari ini dengan semangat!`,
    foodItems,
    exerciseItems: [],
  };
}

function mapLegacyType(t?: string): AiResponse['type'] {
  if (t === 'food' || t === 'exercise' || t === 'chat') return t;
  return 'chat';
}

/** Build motivational reply — never invent meal labels; remaining must match app math */
export function buildLocalReply(
  type: 'food' | 'exercise',
  totalKcal: number,
  remainingAfter: number,
  name?: string
): string {
  const greet = name ? `${name}, ` : '';
  if (type === 'exercise') {
    return `${greet}keren banget! Olahraga ini estimasi bakar ~${totalKcal} kcal — sudah aku catat. Sisa kalorimu sekarang ~${remainingAfter} kcal. Terus jaga konsistensimu!`;
  }
  let advice = '';
  if (remainingAfter < 0) {
    advice = ` Kamu sudah di atas target hari ini (${Math.abs(remainingAfter)} kcal). Besok kita balance lagi ya — atau tambah sedikit aktivitas.`;
  } else if (remainingAfter < 300) {
    advice = ` Sisa kalorimu tinggal ~${remainingAfter} kcal — pilih camilan ringan atau protein kalau masih lapar.`;
  } else if (remainingAfter > 800) {
    advice = ` Masih ada ~${remainingAfter} kcal tersisa — pastikan makan berikutnya tetap seimbang protein & karbo.`;
  } else {
    advice = ` Sisa kalorimu ~${remainingAfter} kcal — masih on track!`;
  }
  return `${greet}mantap, sudah dicatat (~${totalKcal} kcal)!${advice} Tetap semangat hari ini!`;
}

/** Strip hallucinated meal-time labels from AI reply if any slipped through */
export function stripMealTimeLabels(reply: string): string {
  return (reply || '')
    .replace(/\bMakan\s+(pagi|siang|malam|sore)\b\s*/gi, '')
    .replace(/\b(sarapan|makan\s+siang|makan\s+malam|makan\s+sore)\b\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
