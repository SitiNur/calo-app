import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { buildNutritionPrompt, type DayContext, type ProfileContext } from '@/lib/ai-prompt';
import { buildLocalReply, parseGeminiPayload } from '@/lib/ai-parse';
import { estimateLocally, isParseComplete, refineWithLocalDb } from '@/lib/localEstimate';
import { normalizeAiResponse } from '@/lib/nutrition';

export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || '';

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
].filter(Boolean) as string[];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|Too Many Requests|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`TIMEOUT_${ms}`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithGemini(
  message: string,
  image: string | undefined,
  imageType: string | undefined,
  history: Array<{ sender: string; message_text?: string }> | undefined,
  profile: ProfileContext | undefined,
  day: DayContext | undefined
): Promise<string> {
  if (!apiKey) throw new Error('NO_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = buildNutritionPrompt(profile, day);

  type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };
  const contents: Array<{ role: string; parts: ContentPart[] }> = [];

  if (Array.isArray(history)) {
    for (const msg of history.slice(-4)) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.message_text || '' }],
      });
    }
  }

  const currentParts: ContentPart[] = [
    {
      text: `${systemInstruction}\n\n---\nINPUT PENGGUNA SAAT INI:\n${message || 'Analisis gambar makanan/olahraga ini dan catat estimasi gizinya.'}`,
    },
  ];

  if (image) {
    const base64Data = String(image).includes(',') ? String(image).split(',')[1] : String(image);
    currentParts.push({
      inlineData: {
        data: base64Data,
        mimeType: imageType || 'image/jpeg',
      },
    });
  }

  contents.push({ role: 'user', parts: currentParts });

  let lastError: unknown;

  for (const modelName of MODEL_CANDIDATES) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json',
      },
    });

    try {
      const result = await withTimeout(model.generateContent({ contents }), 25000);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[calo/chat] model ${modelName} failed:`, msg);
      if (/404|no longer available|not found|TIMEOUT_/i.test(msg)) continue;
      if (isRateLimited(error)) {
        await sleep(300);
        continue;
      }
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini gagal');
}

function buildDayContext(
  profile: ProfileContext | undefined,
  dayTotals?: Partial<DayContext>
): DayContext | undefined {
  if (!dayTotals && !profile) return undefined;
  const target = profile?.target_calories ?? 2000;
  const food = dayTotals?.foodCalories ?? 0;
  const exercise = dayTotals?.exerciseCalories ?? 0;
  return {
    foodCalories: food,
    exerciseCalories: exercise,
    remaining: dayTotals?.remaining ?? target - food + exercise,
    protein: dayTotals?.protein ?? 0,
    carbs: dayTotals?.carbs ?? 0,
    fat: dayTotals?.fat ?? 0,
    targetCalories: target,
    proteinTarget: profile?.protein_target_g ?? 75,
    carbsTarget: profile?.carbs_target_g ?? 150,
    fatTarget: profile?.fat_target_g ?? 50,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, image, imageType, history, userProfile, dayTotals } = body;
    const weight = Number(userProfile?.weight) || 70;
    const profile = userProfile as ProfileContext | undefined;
    const day = buildDayContext(profile, dayTotals);

    const localFirst = estimateLocally(message || '', weight);
    const localParsedWell =
      !image &&
      isParseComplete(message || '', localFirst) &&
      ((localFirst.foodItems?.length || 0) > 0 || (localFirst.exerciseItems?.length || 0) > 0);

    if (localParsedWell) {
      const foodTotal = (localFirst.foodItems || []).reduce((s, f) => s + f.calories, 0);
      const exTotal = (localFirst.exerciseItems || []).reduce((s, e) => s + e.caloriesBurned, 0);
      const delta = localFirst.type === 'exercise' ? -exTotal : foodTotal;
      const remainingAfter = (day?.remaining ?? profile?.target_calories ?? 2000) - delta;

      const reply = buildLocalReply(
        localFirst.type === 'exercise' ? 'exercise' : 'food',
        localFirst.type === 'exercise' ? exTotal : foodTotal,
        remainingAfter,
        profile?.full_name || undefined
      );

      return NextResponse.json({
        ...normalizeAiResponse({ ...localFirst, reply }),
        source: 'local-db',
      });
    }

    try {
      const responseText = await generateWithGemini(
        message,
        image,
        imageType,
        history,
        profile,
        day
      );

      let parsed: ReturnType<typeof parseGeminiPayload>;
      try {
        parsed = parseGeminiPayload(JSON.parse(responseText));
      } catch {
        const fallback = estimateLocally(message || '', weight);
        const foodTotal = (fallback.foodItems || []).reduce((s, f) => s + f.calories, 0);
        const remainingAfter =
          (day?.remaining ?? profile?.target_calories ?? 2000) -
          (fallback.type === 'exercise'
            ? -(fallback.exerciseItems || []).reduce((s, e) => s + e.caloriesBurned, 0)
            : foodTotal);
        parsed = normalizeAiResponse({
          ...fallback,
          reply: buildLocalReply(
            fallback.type === 'exercise' ? 'exercise' : 'food',
            fallback.type === 'exercise'
              ? (fallback.exerciseItems || []).reduce((s, e) => s + e.caloriesBurned, 0)
              : foodTotal,
            remainingAfter,
            profile?.full_name || undefined
          ),
        });
        return NextResponse.json({ ...parsed, source: 'local-db' });
      }

      const refined = refineWithLocalDb(parsed, message || '', weight);
      return NextResponse.json(refined);
    } catch (error) {
      console.warn('[calo/chat] falling back to local estimate', error);
      const local = estimateLocally(message || '', weight);

      if (image && !(message || '').trim()) {
        return NextResponse.json({
          ...normalizeAiResponse({
            type: 'chat',
            reply:
              'Aku belum bisa analisis foto saat ini. Coba tulis makananmu, contoh: "nasi putih 150g + 1 telur rebus". Kamu pasti bisa konsisten hari ini!',
            foodItems: [],
            exerciseItems: [],
          }),
          source: 'local',
        });
      }

      const foodTotal = (local.foodItems || []).reduce((s, f) => s + f.calories, 0);
      const exTotal = (local.exerciseItems || []).reduce((s, e) => s + e.caloriesBurned, 0);
      const remainingAfter =
        (day?.remaining ?? profile?.target_calories ?? 2000) -
        (local.type === 'exercise' ? -exTotal : foodTotal);

      return NextResponse.json({
        ...normalizeAiResponse({
          ...local,
          reply: buildLocalReply(
            local.type === 'exercise' ? 'exercise' : 'food',
            local.type === 'exercise' ? exTotal : foodTotal,
            remainingAfter,
            profile?.full_name || undefined
          ),
        }),
        source: 'local',
      });
    }
  } catch (error: unknown) {
    console.error('Chat route error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memproses' },
      { status: 500 }
    );
  }
}
