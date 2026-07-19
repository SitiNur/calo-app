import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { estimateLocally, isParseComplete } from '@/lib/localEstimate';
import { normalizeFoodItem } from '@/lib/nutrition';
import type { FoodItem } from '@/lib/types';

export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY || '';

function macrosFromCalories(
  kcal: number,
  kind: 'protein' | 'carb' | 'fat' | 'balanced' | 'powder'
) {
  const split = {
    protein: { p: 0.5, c: 0.05, f: 0.25 },
    carb: { p: 0.1, c: 0.75, f: 0.1 },
    fat: { p: 0.15, c: 0.1, f: 0.7 },
    powder: { p: 0.2, c: 0.6, f: 0.05 },
    balanced: { p: 0.25, c: 0.45, f: 0.3 },
  }[kind];
  return {
    protein: Math.round(((kcal * split.p) / 4) * 10) / 10,
    carbs: Math.round(((kcal * split.c) / 4) * 10) / 10,
    fat: Math.round(((kcal * split.f) / 9) * 10) / 10,
  };
}

function guessKind(name: string): 'protein' | 'carb' | 'fat' | 'balanced' | 'powder' {
  const s = name.toLowerCase();
  if (/matcha|bubuk/.test(s)) return 'powder';
  if (/ayam|dada|paha|telur|ikan|tahu|tempe|protein|daging/.test(s)) return 'protein';
  if (/nasi|roti|mie|indomie|pisang|karbo|risol|bolen/.test(s)) return 'carb';
  if (/selai|mentega|minyak|goreng|keju/.test(s)) return 'fat';
  return 'balanced';
}

async function estimateWithGemini(name: string, calories: number | null, serving: string | null) {
  if (!apiKey) return null;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.15, responseMimeType: 'application/json' },
  });

  const prompt = `Hitung gizi dari TABEL GIZI (TKPI/USDA), skalakan ke porsi. Return HANYA JSON:
{"name":"...","calories":0,"protein":0,"carbs":0,"fat":0,"serving":"..."}
Aturan:
- Ambil P/K/L dari tabel gizi, BUKAN dari rumus % kalori atau Atwater.
- Jangan paksa calories = protein×4+carbs×4+fat×9; angka tabel boleh sedikit beda.
- Skalakan linear ke gram/ml yang disebut.
- Gorengan ambigu: asumsi konservatif.
Nama: "${name}".${calories != null ? ` Kalori user (opsional): ${calories} kcal — jika ada, pakai kalori itu tapi makro tetap dari tabel.` : ''}${serving ? ` Porsi: ${serving}.` : ''}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as FoodItem;
  return normalizeFoodItem(parsed);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const calories =
      body.calories !== undefined && body.calories !== null && body.calories !== ''
        ? Math.round(Number(body.calories))
        : null;
    const serving = body.serving ? String(body.serving).trim() : null;

    if (!name) {
      return NextResponse.json({ error: 'Nama makanan wajib' }, { status: 400 });
    }

    // Prefer portion text for table lookup; don't inject kcal into query (avoids fake macros)
    const query = [name, serving].filter(Boolean).join(' ');
    const local = estimateLocally(query);
    if (isParseComplete(query, local) && local.foodItems?.[0]) {
      const base = local.foodItems[0];
      return NextResponse.json({
        ...normalizeFoodItem({
          name: name || base.name,
          calories: calories != null ? calories : base.calories,
          protein: base.protein,
          carbs: base.carbs,
          fat: base.fat,
          serving: serving || base.serving,
        }),
        source: 'local-db',
      });
    }

    try {
      const gemini = await estimateWithGemini(name, calories, serving);
      if (gemini) {
        return NextResponse.json({ ...gemini, source: 'gemini' });
      }
    } catch (err) {
      console.warn('[recalculate-item] gemini failed', err);
    }

    const kcal = calories ?? 100;
    return NextResponse.json({
      ...normalizeFoodItem({
        name,
        calories: kcal,
        ...macrosFromCalories(kcal, guessKind(name)),
        serving: serving || '1 porsi',
      }),
      source: 'local',
    });
  } catch (error: unknown) {
    console.error('recalculate-item error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal hitung ulang' },
      { status: 500 }
    );
  }
}
