import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { buildNutritionPrompt, type DayContext, type ProfileContext } from '@/lib/ai-prompt';
import { buildLocalReply, parseGeminiPayload, stripMealTimeLabels } from '@/lib/ai-parse';
import { estimateLocally, isParseComplete, refineWithLocalDb } from '@/lib/localEstimate';
import { normalizeAiResponse } from '@/lib/nutrition';
import type { AiResponse } from '@/lib/types';

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

function isUsefulCaption(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return false;
  return !/^(analisis foto|foto makanan|📷|photo)/i.test(t);
}

function buildUserVisionPrompt(message: string, hasImage: boolean): string {
  const text = (message || '').trim();
  if (hasImage && isUsefulCaption(text)) {
    return `Ada FOTO makanan + teks penjelasan dari user.

TEKS USER (prioritas untuk kuantitas, cara masak, nama item, minuman yang mungkin tidak terlihat jelas):
"""${text}"""

Instruksi:
- Analisis foto: ukuran/porsi item yang terlihat (mis. 1 risol + sendok sebagai skala).
- Hormati teks user untuk jumlah & cara masak (mis. "2 buah", "ga digoreng", "air fryer").
- Item di teks yang tidak terlihat di foto (mis. "minum flimeal") TETAP dicatat.
- JANGAN menyebut makan pagi/siang/malam kecuali user menulisnya.
- Sisa kalori di pesan: hitung dari PROGRESS HARI INI (sisa sebelum input − total makanan baru + olahraga baru).
- Return JSON sesuai format wajib.`;
  }
  if (hasImage) {
    return `Analisis FOTO makanan/minuman ini.
Identifikasi setiap item, estimasi porsi realistis Indonesia, hitung kalori + makro dari tabel gizi.
Sebutkan asumsi porsi di "serving".
JANGAN menyebut makan pagi/siang/malam.
Return JSON sesuai format wajib.`;
  }
  return text || 'Cerita aja mau makan apa — aku bantu hitung kalorinya.';
}

/** Always rewrite food/exercise replies so "sisa kalori" matches MacroSummary math. */
function withSyncedAppReply(
  parsed: AiResponse,
  day: DayContext | undefined,
  profile: ProfileContext | undefined
): AiResponse {
  const normalized = normalizeAiResponse(parsed);
  const foodTotal = (normalized.foodItems || []).reduce((s, f) => s + f.calories, 0);
  const exTotal = (normalized.exerciseItems || []).reduce((s, e) => s + e.caloriesBurned, 0);

  if (normalized.type === 'chat' || (!foodTotal && !exTotal)) {
    return {
      ...normalized,
      reply: stripMealTimeLabels(normalized.reply || ''),
    };
  }

  const remainingBefore = day?.remaining ?? profile?.target_calories ?? 2000;
  const remainingAfter =
    normalized.type === 'exercise' ? remainingBefore + exTotal : remainingBefore - foodTotal;

  return {
    ...normalized,
    reply: buildLocalReply(
      normalized.type === 'exercise' ? 'exercise' : 'food',
      normalized.type === 'exercise' ? exTotal : foodTotal,
      remainingAfter,
      profile?.full_name || undefined
    ),
  };
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
  const hasImage = Boolean(image);

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

  const currentParts: ContentPart[] = [];

  // Image first helps vision models ground analysis, then caption/text
  if (image) {
    const base64Data = String(image).includes(',') ? String(image).split(',')[1] : String(image);
    currentParts.push({
      inlineData: {
        data: base64Data,
        mimeType: imageType || 'image/jpeg',
      },
    });
  }

  currentParts.push({
    text: `${systemInstruction}\n\n---\nINPUT PENGGUNA SAAT INI:\n${buildUserVisionPrompt(message, hasImage)}`,
  });

  contents.push({ role: 'user', parts: currentParts });

  let lastError: unknown;
  const timeoutMs = hasImage ? 40000 : 25000;

  for (const modelName of MODEL_CANDIDATES) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: hasImage ? 0.1 : 0.15,
        responseMimeType: 'application/json',
      },
    });

    try {
      const result = await withTimeout(model.generateContent({ contents }), timeoutMs);
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
    const hasImage = Boolean(image);

    // Text-only path can use local DB. Photos always go to vision model.
    const localFirst = estimateLocally(message || '', weight);
    const localParsedWell =
      !hasImage &&
      isParseComplete(message || '', localFirst) &&
      ((localFirst.foodItems?.length || 0) > 0 || (localFirst.exerciseItems?.length || 0) > 0);

    if (localParsedWell) {
      return NextResponse.json({
        ...withSyncedAppReply(localFirst, day, profile),
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
        // Vision JSON parse failed — if user wrote a caption, try local text parse
        const fallback = estimateLocally(message || '', weight);
        if (hasImage && !(fallback.foodItems?.length || fallback.exerciseItems?.length)) {
          return NextResponse.json({
            ...normalizeAiResponse({
              type: 'chat',
              reply:
                'Foto sudah diterima, tapi aku belum yakin isi piringnya. Coba tulis penjelasan singkat, contoh: "nasi 150g + ayam bakar + sayur".',
              foodItems: [],
              exerciseItems: [],
            }),
            source: 'local',
          });
        }
        return NextResponse.json({
          ...withSyncedAppReply(fallback, day, profile),
          source: 'local-db',
        });
      }

      // Foto + caption lengkap di DB lokal → pakai angka tabel (lebih konsisten, acuan Gemini chat)
      if (hasImage && isUsefulCaption(message || '')) {
        const localCaption = estimateLocally(message || '', weight);
        if (
          isParseComplete(message || '', localCaption) &&
          (localCaption.foodItems?.length || localCaption.exerciseItems?.length)
        ) {
          return NextResponse.json({
            ...withSyncedAppReply(localCaption, day, profile),
            source: 'local-db',
          });
        }
        // Caption belum lengkap di DB — pakai vision, tapi sisa kalori selalu dari app
        return NextResponse.json({
          ...withSyncedAppReply(parsed, day, profile),
          source: 'gemini',
        });
      }

      if (hasImage) {
        return NextResponse.json({
          ...withSyncedAppReply(parsed, day, profile),
          source: 'gemini',
        });
      }

      const refined = refineWithLocalDb(parsed, message || '', weight);
      return NextResponse.json({
        ...withSyncedAppReply(refined, day, profile),
        source: refined.source || 'gemini',
      });
    } catch (error) {
      console.warn('[calo/chat] falling back to local estimate', error);
      const local = estimateLocally(message || '', weight);

      if (hasImage && !(local.foodItems?.length || local.exerciseItems?.length)) {
        return NextResponse.json({
          ...normalizeAiResponse({
            type: 'chat',
            reply:
              'Aku belum bisa analisis foto saat ini. Tulis isi makanannya ya, contoh: "nasi putih 150g + 1 telur rebus + tempe".',
            foodItems: [],
            exerciseItems: [],
          }),
          source: 'local',
        });
      }

      return NextResponse.json({
        ...withSyncedAppReply(local, day, profile),
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
