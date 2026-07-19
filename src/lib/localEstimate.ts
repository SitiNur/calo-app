import type { AiResponse, FoodItem, ExerciseItem } from '@/lib/types';
import { normalizeAiResponse, normalizeFoodItem } from '@/lib/nutrition';

type FoodRef = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  unit: 'piece' | 'portion' | 'tbsp' | 'cup' | 'glass' | 'gram' | 'skewer';
  baseGrams?: number;
  keywords: string[];
  exclude?: string[];
};

const FOODS: FoodRef[] = [
  {
    name: 'Putih telur',
    calories: 52,
    protein: 10.9,
    carbs: 0.7,
    fat: 0.2,
    serving: '100g',
    unit: 'gram',
    baseGrams: 100,
    keywords: ['putih telur', 'egg white', 'putih telor'],
  },
  { name: 'Telur rebus', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, serving: '1 butir besar', unit: 'piece', baseGrams: 50, keywords: ['telur rebus', 'telor rebus', 'boiled egg'] },
  { name: 'Telur dadar', calories: 145, protein: 8, carbs: 1, fat: 11, serving: '1 butir', unit: 'piece', baseGrams: 60, keywords: ['telur dadar', 'telor dadar', 'omelet'] },
  { name: 'Telur ceplok', calories: 125, protein: 7, carbs: 0.5, fat: 10, serving: '1 butir', unit: 'piece', baseGrams: 55, keywords: ['telur ceplok', 'telor ceplok', 'telur mata sapi'] },
  {
    name: 'Telur ayam kampung (kecil)',
    calories: 60,
    protein: 5.5,
    carbs: 0.5,
    fat: 4.2,
    serving: '1 butir kecil',
    unit: 'piece',
    baseGrams: 40,
    keywords: ['telur ayam kampung', 'telor ayam kampung', 'telur kampung', 'telor kampung', 'telur kecil', 'telor kecil'],
  },
  {
    name: 'Telur',
    calories: 78,
    protein: 6.3,
    carbs: 0.6,
    fat: 5.3,
    serving: '1 butir besar',
    unit: 'piece',
    baseGrams: 50,
    keywords: ['telur', 'telor', 'egg'],
    exclude: [
      'putih telur',
      'putih telor',
      'telur rebus',
      'telor rebus',
      'telur dadar',
      'egg white',
      'kampung',
      'ukuran kecil',
      'telur kecil',
    ],
  },

  { name: 'Nasi putih', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g matang', unit: 'gram', baseGrams: 100, keywords: ['nasi putih', 'nasi', 'white rice'] },
  { name: 'Nasi goreng', calories: 380, protein: 10, carbs: 48, fat: 15, serving: '1 piring', unit: 'portion', baseGrams: 250, keywords: ['nasi goreng'] },

  { name: 'Roti tawar', calories: 70, protein: 2.3, carbs: 13, fat: 0.9, serving: '1 slice', unit: 'piece', baseGrams: 28, keywords: ['roti tawar', 'roti gandum', 'slice roti', 'roti'], exclude: ['tepung roti', 'tepung panir', 'breadcrumb', 'dibalur', 'air fryer'] },
  { name: 'Selai kacang', calories: 94, protein: 4, carbs: 3.5, fat: 8, serving: '1 sdm', unit: 'tbsp', baseGrams: 16, keywords: ['selai kacang', 'peanut butter'] },

  {
    name: 'Udang keju air fryer (homemade)',
    calories: 85,
    protein: 8,
    carbs: 5,
    fat: 3.5,
    serving: '1 buah kecil',
    unit: 'piece',
    baseGrams: 45,
    keywords: [
      'udang keju air fryer',
      'udang keju',
      'air fryer udang',
      'udang keju homemade',
      'udang isi keju',
    ],
  },

  {
    name: 'Risol sayur/bihun',
    calories: 130,
    protein: 2.5,
    carbs: 16,
    fat: 6,
    serving: '1 buah sedang',
    unit: 'piece',
    baseGrams: 60,
    keywords: ['risol', 'risoles'],
    exclude: ['daging', 'mayo', 'smoke', 'besar'],
  },
  {
    name: 'Risol daging',
    calories: 190,
    protein: 7,
    carbs: 18,
    fat: 10,
    serving: '1 buah',
    unit: 'piece',
    baseGrams: 75,
    keywords: ['risol daging', 'risoles daging', 'risol mayo', 'risol smooke', 'risol smoke'],
  },
  {
    name: 'Bolen pisang/keju',
    calories: 240,
    protein: 4,
    carbs: 30,
    fat: 12,
    serving: '1 buah sedang',
    unit: 'piece',
    baseGrams: 80,
    keywords: ['bolen', 'bolen pisang', 'bolen keju'],
  },

  { name: 'Ayam grill tanpa minyak', calories: 180, protein: 27, carbs: 0, fat: 7, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['ayam grill', 'grill no oil', 'grill tanpa', 'dada dicampur paha', 'dada ayam', 'paha ayam', 'dicampur paha ayam'] },
  { name: 'Ayam bakar', calories: 200, protein: 26, carbs: 3, fat: 9, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['ayam bakar'] },
  { name: 'Ayam goreng', calories: 250, protein: 24, carbs: 6, fat: 14, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['ayam goreng'] },

  { name: 'Tempe goreng', calories: 118, protein: 7, carbs: 6, fat: 8, serving: '1 potong (~50g)', unit: 'piece', baseGrams: 50, keywords: ['tempe goreng'] },
  { name: 'Tempe', calories: 95, protein: 9, carbs: 4, fat: 5, serving: '1 potong (~50g)', unit: 'piece', baseGrams: 50, keywords: ['tempe'] },
  { name: 'Tahu goreng', calories: 80, protein: 5, carbs: 3, fat: 5.5, serving: '1 potong', unit: 'piece', baseGrams: 40, keywords: ['tahu goreng'] },

  { name: 'Susu kedelai', calories: 80, protein: 7, carbs: 4, fat: 4, serving: '1 cup (~240ml)', unit: 'cup', baseGrams: 240, keywords: ['susu kedelai', 'soy milk', 'soya milk'] },
  {
    name: 'Susu UHT low fat',
    calories: 70,
    protein: 6.5,
    carbs: 9,
    fat: 1.5,
    serving: '1 gelas (~200ml)',
    unit: 'glass',
    baseGrams: 200,
    keywords: ['susu uht low fat', 'susu low fat', 'susu rendah lemak', 'uht lowfat', 'uht low fat'],
    exclude: ['latte', 'late', 'caffe', 'caffè', 'cafe', 'kopi', 'espresso', 'cappuccino'],
  },
  {
    name: 'Susu UHT',
    calories: 130,
    protein: 7,
    carbs: 12,
    fat: 5,
    serving: '1 kotak (200ml)',
    unit: 'glass',
    baseGrams: 200,
    keywords: ['susu uht'],
    exclude: [
      'kedelai',
      'low fat',
      'lowfat',
      'rendah lemak',
      'soy',
      'latte',
      'late',
      'caffe',
      'cafe',
      'kopi',
      'espresso',
    ],
  },
  { name: 'Bubuk matcha', calories: 5, protein: 0.5, carbs: 1, fat: 0, serving: '1g', unit: 'gram', baseGrams: 1, keywords: ['bubuk matcha', 'matcha powder', 'matcha'] },

  {
    name: 'Caffè latte low fat',
    calories: 94,
    protein: 6.8,
    carbs: 10,
    fat: 2.4,
    serving: '200ml',
    unit: 'glass',
    baseGrams: 200,
    keywords: [
      'caffe latte',
      'caffè latte',
      'cafe latte',
      'caffe late',
      'cafe late',
      'latte low fat',
      'latte lowfat',
      'latte uht',
      'latte',
    ],
    exclude: ['full cream', 'fullcream', 'dirty'],
  },
  {
    name: 'Kopi susu',
    calories: 130,
    protein: 5,
    carbs: 14,
    fat: 5,
    serving: '1 cup',
    unit: 'cup',
    baseGrams: 240,
    keywords: ['kopi susu', 'dirty latte'],
    exclude: ['low fat', 'lowfat'],
  },
  { name: 'Es teh manis', calories: 90, protein: 0, carbs: 22, fat: 0, serving: '1 gelas', unit: 'glass', baseGrams: 300, keywords: ['es teh', 'teh manis'] },

  { name: 'Indomie goreng', calories: 390, protein: 9, carbs: 52, fat: 16, serving: '1 bungkus', unit: 'piece', baseGrams: 85, keywords: ['indomie', 'mie instan'] },
  { name: 'Dimsum', calories: 70, protein: 4, carbs: 8, fat: 2.5, serving: '1 pcs', unit: 'piece', baseGrams: 30, keywords: ['dimsum'] },
  { name: 'Pisang', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['pisang', 'banana'] },
  {
    name: 'Keju taburan',
    calories: 36,
    protein: 2.2,
    carbs: 0.3,
    fat: 3,
    serving: '10g',
    unit: 'gram',
    baseGrams: 10,
    keywords: ['keju', 'cheese', 'parmesan', 'cheddar'],
    exclude: ['udang keju', 'bolen keju', 'risol', 'air fryer'],
  },
];

const EXERCISES: { name: string; met: number; keywords: string[] }[] = [
  { name: 'Jalan kaki', met: 3.5, keywords: ['jalan kaki', 'walking'] },
  { name: 'Lari', met: 9.8, keywords: ['lari', 'running', 'jogging'] },
  { name: 'Bersepeda', met: 6.8, keywords: ['sepeda', 'cycling'] },
  { name: 'Gym', met: 5.0, keywords: ['gym', 'angkat beban', 'workout'] },
  { name: 'Renang', met: 8.0, keywords: ['renang', 'swim'] },
];

const WORD_QTY: Record<string, number> = {
  setengah: 0.5,
  seperdua: 0.5,
  seperempat: 0.25,
  sepertiga: 1 / 3,
  sepiring: 1,
  semangkuk: 1,
  secangkir: 1,
  segelas: 1,
  sebungkus: 1,
  sepotong: 1,
  sebutir: 1,
  sedikit: 0.5,
  taburan: 0.5,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
};

const RECIPE_HINT =
  /pancake|panckake|pancacke|panekuk|salad|smoothie|bowl|omelet|dadar|mix|campur|wrap|sandwich|granola/i;

/** Normalize common typos / aliases before parsing. */
export function normalizeFoodText(text: string): string {
  return (text || '')
    .replace(/\bcaffe?\s*late\b/gi, 'caffe latte')
    .replace(/\bcaffè\s*late\b/gi, 'caffe latte')
    .replace(/\bpanckake\b/gi, 'pancake')
    .replace(/\bpancacke\b/gi, 'pancake')
    .replace(/\bpanekuk\b/gi, 'pancake')
    .replace(/\b1\/2\b/g, 'setengah')
    .replace(/\b½\b/g, 'setengah');
}

/** Split on +, &, dan, comma, newline — but keep text inside parentheses together. */
export function splitFoodSegments(text: string): string[] {
  const normalized = normalizeFoodText(text).replace(/\s+dan\s+/gi, ' + ');
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);

    if (depth === 0 && (ch === '+' || ch === '&' || ch === ',' || ch === '\n' || ch === ';' || ch === '|')) {
      const trimmed = current.trim();
      if (trimmed.length > 1) parts.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }
  const last = current.trim();
  if (last.length > 1) parts.push(last);
  return parts;
}

/** Expand "pancake (...)" into ingredients. Do NOT expand drinks like latte (espresso + milk). */
export function expandRecipeSegments(segment: string): string[] {
  const m = segment.match(/^(.+?)\((.+)\)\s*$/);
  if (!m) return [segment];
  const outer = m[1].trim();
  const inner = m[2].trim();
  // Only expand known recipes — parenthetical drink/notes stay with the item
  if (!RECIPE_HINT.test(outer) && !RECIPE_HINT.test(segment)) {
    return [segment];
  }
  const ingredients = splitFoodSegments(inner);
  if (ingredients.length < 2) return [segment];
  return ingredients;
}

export function expandAllSegments(message: string): string[] {
  const cleaned = normalizeFoodText(message);
  const top = splitFoodSegments(cleaned);
  const base = top.length ? top : [cleaned.trim()].filter(Boolean);
  const out: string[] = [];
  for (const seg of base) {
    out.push(...expandRecipeSegments(seg));
  }
  return out.filter((s) => s.length > 1);
}

export function parseExplicitCalories(segment: string): number | null {
  const paren = segment.match(/\(\s*(\d+)\s*(?:kcal|kalori)\s*\)/i);
  if (paren) return Number(paren[1]);
  const inline = segment.match(/(\d+)\s*(?:kcal|kalori)\b/i);
  if (inline) return Number(inline[1]);
  return null;
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type ParsedQty = { multiplier: number; label?: string };

function parseQuantity(segment: string, food: FoodRef): ParsedQty {
  const s = segment.toLowerCase();

  // Default sprinkle for bare "keju"
  if (food.keywords.some((k) => k === 'keju' || k === 'cheese') && !/\d/.test(s)) {
    return { multiplier: 0.5, label: '~5g' };
  }

  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    const n = Number(frac[1]) / Number(frac[2]);
    if (n > 0 && n < 20) return { multiplier: n };
  }

  const weight = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g|ml)\b/i);
  if (weight && food.baseGrams) {
    let amount = Number(weight[1].replace(',', '.'));
    const unit = weight[2].toLowerCase();
    if (unit === 'kg') amount *= 1000;
    return { multiplier: amount / food.baseGrams, label: `${amount}${unit === 'ml' ? 'ml' : 'g'}` };
  }
  for (const [word, val] of Object.entries(WORD_QTY)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(s)) {
      if (food.unit !== 'piece') return { multiplier: val };
      const unitWord = /bolen|risol|pisang|buah/.test(food.name.toLowerCase())
        ? 'buah'
        : 'butir';
      const pieceLabel =
        val === 1 ? food.serving : val === 0.5 ? `0.5 ${unitWord}` : `${round1(val)} ${unitWord}`;
      return { multiplier: val, label: pieceLabel };
    }
  }
  const countUnits = 'pcs|pc|buah|butir|slice|sdm|sdt|porsi|piring|gelas|cup|mangkok|tusuk|potong|bungkus';
  const counted = s.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${countUnits})\\b`, 'i'));
  if (counted) return { multiplier: Number(counted[1].replace(',', '.')) || 1 };
  for (const kw of food.keywords) {
    const before = s.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${escapeReg(kw)}`, 'i'));
    if (before) return { multiplier: Number(before[1].replace(',', '.')) || 1 };
  }
  const lead = s.match(/^(\d{1,2}(?:[.,]\d+)?)\b/);
  if (lead) {
    const n = Number(lead[1].replace(',', '.'));
    if (n > 0 && n <= 20) return { multiplier: n };
  }
  return { multiplier: 1 };
}

function scaleFood(food: FoodRef, segment: string): FoodItem {
  const { multiplier, label } = parseQuantity(segment, food);
  const m = multiplier > 0 && multiplier < 200 ? multiplier : 1;
  let serving = label || food.serving;
  if (!label && m !== 1 && food.unit === 'piece') {
    const unitWord = /bolen|risol|pisang|buah/.test(food.name.toLowerCase()) ? 'buah' : 'butir';
    serving = m === 0.5 ? `0.5 ${unitWord}` : `${round1(m)} ${unitWord}`;
  }
  return normalizeFoodItem({
    name: food.name,
    calories: food.calories * m,
    protein: food.protein * m,
    carbs: food.carbs * m,
    fat: food.fat * m,
    serving,
  });
}

function macrosFromCalories(kcal: number, kind: 'protein' | 'carb' | 'fat' | 'balanced' | 'powder') {
  const split = {
    protein: { p: 0.5, c: 0.05, f: 0.25 },
    carb: { p: 0.1, c: 0.75, f: 0.1 },
    fat: { p: 0.15, c: 0.1, f: 0.7 },
    powder: { p: 0.2, c: 0.6, f: 0.05 },
    balanced: { p: 0.25, c: 0.45, f: 0.3 },
  }[kind];
  return {
    protein: round1((kcal * split.p) / 4),
    carbs: round1((kcal * split.c) / 4),
    fat: round1((kcal * split.f) / 9),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function guessMacroKind(segment: string): 'protein' | 'carb' | 'fat' | 'balanced' | 'powder' {
  const s = segment.toLowerCase();
  if (/matcha|bubuk/.test(s)) return 'powder';
  if (/ayam|dada|paha|telur|ikan|tahu|tempe|protein|putih telur/.test(s)) return 'protein';
  if (/nasi|roti|mie|indomie|pisang|karbo|risol/.test(s)) return 'carb';
  if (/selai|mentega|minyak|goreng|keju/.test(s)) return 'fat';
  return 'balanced';
}

function cleanSegmentLabel(segment: string): string {
  return (
    segment
      .replace(/\(\s*\d+\s*(?:kcal|kalori)\s*\)/gi, '')
      .replace(/\d+\s*(?:kcal|kalori)\b/gi, '')
      .trim()
      .slice(0, 80) || 'Makanan'
  );
}

function matchFood(segment: string): FoodItem | null {
  const s = segment.toLowerCase();
  const explicit = parseExplicitCalories(segment);

  let best: { food: FoodRef; score: number } | null = null;
  for (const food of FOODS) {
    if (food.exclude?.some((ex) => s.includes(ex))) continue;
    if (food.name === 'Risol sayur/bihun' && /daging|mayo|smoke|besar/.test(s)) continue;
    const matching = food.keywords.filter((k) => s.includes(k));
    if (!matching.length) continue;
    const score = Math.max(...matching.map((k) => k.length));
    if (!best || score > best.score) best = { food, score };
  }

  if (best) {
    const scaled = scaleFood(best.food, segment);
    if (explicit !== null) {
      // Hormati kalori user, tapi makro tetap dari tabel gizi (bukan % Atwater)
      return normalizeFoodItem({
        name: cleanSegmentLabel(segment) || best.food.name,
        calories: explicit,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        serving: scaled.serving,
      });
    }
    return scaled;
  }

  if (explicit !== null) {
    return normalizeFoodItem({
      name: cleanSegmentLabel(segment),
      calories: explicit,
      ...macrosFromCalories(explicit, guessMacroKind(segment)),
      serving: 'sesuai input user',
    });
  }
  return null;
}

function isExerciseSegment(segment: string): boolean {
  return EXERCISES.some((ex) => ex.keywords.some((k) => segment.toLowerCase().includes(k)));
}

function matchExercise(segment: string, weightKg: number): ExerciseItem | null {
  const s = segment.toLowerCase();
  const durationMatch = s.match(/(\d+)\s*(menit|mnt|min|jam)\b/i);
  let duration = 30;
  if (durationMatch) {
    duration = Number(durationMatch[1]);
    if (/jam/i.test(durationMatch[2])) duration *= 60;
  }
  for (const ex of EXERCISES) {
    if (ex.keywords.some((k) => s.includes(k))) {
      return {
        name: ex.name,
        caloriesBurned: Math.round(ex.met * weightKg * (duration / 60)),
        durationMinutes: duration,
      };
    }
  }
  return null;
}

export function isParseComplete(message: string, result: AiResponse): boolean {
  const segments = expandAllSegments(normalizeFoodText(message).toLowerCase().trim());
  if (segments.length === 0) {
    return (result.foodItems?.length || 0) > 0 || (result.exerciseItems?.length || 0) > 0;
  }
  let foodExpected = 0;
  let exerciseExpected = 0;
  for (const seg of segments) {
    if (isExerciseSegment(seg)) exerciseExpected++;
    else foodExpected++;
  }
  return (
    (result.foodItems?.length || 0) >= foodExpected &&
    (result.exerciseItems?.length || 0) >= exerciseExpected
  );
}

export function estimateLocally(message: string, weightKg = 70): AiResponse {
  const text = normalizeFoodText(message || '').trim();
  if (!text) {
    return normalizeAiResponse({
      type: 'chat',
      reply: 'Cerita aja mau makan apa atau olahraga apa — aku bantu hitung kalorinya.',
    });
  }
  const parts = expandAllSegments(text);
  const foodItems: FoodItem[] = [];
  const exerciseItems: ExerciseItem[] = [];
  for (const part of parts.length ? parts : [text]) {
    if (isExerciseSegment(part)) {
      const ex = matchExercise(part, weightKg);
      if (ex) exerciseItems.push(ex);
      continue;
    }
    const food = matchFood(part);
    if (food) foodItems.push(food);
  }
  if (!foodItems.length && !exerciseItems.length) {
    return normalizeAiResponse({
      type: 'chat',
      reply:
        'Aku belum yakin bahan pastinya. Coba lebih spesifik, contoh: "nasi 50g + ayam grill 100g" atau tulis kalorinya "(70kcal)".',
    });
  }
  return normalizeAiResponse({
    type: foodItems.length ? 'food' : 'exercise',
    reply: '',
    foodItems,
    exerciseItems,
  });
}

export function refineWithLocalDb(
  ai: AiResponse,
  originalMessage: string,
  weightKg = 70
): AiResponse & { source?: AiResponse['source'] } {
  const local = estimateLocally(originalMessage, weightKg);
  if (isParseComplete(originalMessage, local) && (local.foodItems?.length || local.exerciseItems?.length)) {
    const total = (local.foodItems || []).reduce((s, f) => s + f.calories, 0);
    return {
      ...normalizeAiResponse({
        ...local,
        reply: ai.reply || `Oke, dicatat ~${total} kcal (database gizi TKPI/USDA).`,
      }),
      source: 'local-db',
    };
  }

  // Hybrid: replace AI items with local DB when the original segment is known
  const segments = expandAllSegments(originalMessage);
  const localBySeg = segments
    .filter((s) => !isExerciseSegment(s))
    .map((s) => matchFood(s))
    .filter(Boolean) as FoodItem[];

  if (localBySeg.length > 0 && localBySeg.length >= (ai.foodItems?.length || 0)) {
    const total = localBySeg.reduce((s, f) => s + f.calories, 0);
    return {
      ...normalizeAiResponse({
        type: 'food',
        reply: ai.reply || `Oke, dicatat ~${total} kcal (database gizi TKPI/USDA).`,
        foodItems: localBySeg,
        exerciseItems: ai.exerciseItems || [],
      }),
      source: 'local-db',
    };
  }

  return {
    ...normalizeAiResponse({
      ...ai,
      foodItems: (ai.foodItems || []).map(normalizeFoodItem),
      exerciseItems: ai.exerciseItems || [],
    }),
    source: 'gemini',
  };
}
