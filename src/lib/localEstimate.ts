import type { AiResponse, FoodItem, ExerciseItem } from '@/lib/types';
import { normalizeAiResponse, normalizeFoodItem } from '@/lib/nutrition';

type FoodRef = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  unit: 'piece' | 'portion' | 'tbsp' | 'tsp' | 'cup' | 'glass' | 'gram' | 'ml' | 'skewer';
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
    // Acuan Gemini chat: 2 buah sedang-kecil tanpa minyak ≈ 110 kcal (≈55/buah)
    name: 'Risol tanpa minyak',
    calories: 55,
    protein: 2,
    carbs: 9,
    fat: 1.5,
    serving: '1 buah sedang-kecil',
    unit: 'piece',
    baseGrams: 45,
    keywords: [
      'risol tanpa minyak',
      'risol kukus',
      'risol tidak digoreng',
      'risol ga digoreng',
      'risol tidak goreng',
      'risol ga goreng',
      'risoles tanpa minyak',
      'risol',
      'risoles',
    ],
  },
  {
    name: 'Risol air fryer',
    calories: 70,
    protein: 2.2,
    carbs: 10,
    fat: 2.5,
    serving: '1 buah sedang-kecil',
    unit: 'piece',
    baseGrams: 50,
    keywords: [
      'risol air fryer',
      'risol airfryer',
      'risoles air fryer',
      'risoles airfryer',
      'risol',
      'risoles',
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
    exclude: [
      'daging',
      'mayo',
      'smoke',
      'tanpa minyak',
      'tidak digoreng',
      'ga digoreng',
      'tidak goreng',
      'ga goreng',
      'air fryer',
      'airfryer',
      'kukus',
    ],
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
    // Arem-arem isi sayur/tempe — 1 buah sedang ~150 kcal; kecil di-skala ~0.7
    name: 'Arem-arem',
    calories: 150,
    protein: 3.5,
    carbs: 22,
    fat: 5.5,
    serving: '1 buah sedang',
    unit: 'piece',
    baseGrams: 80,
    keywords: ['arem-arem', 'arem arem', 'arem2', 'aremarem', 'arem'],
  },
  {
    // Fiber drink sachet Indonesia — acuan Gemini ≈ 190 kcal / 28g karbo
    name: 'Flimeal',
    calories: 190,
    protein: 8,
    carbs: 28,
    fat: 4,
    serving: '1 sachet',
    unit: 'piece',
    baseGrams: 40,
    keywords: ['flimeal', 'fli meal', 'flimeal drink', 'minum flimeal'],
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

  {
    name: 'Ayam grill tanpa minyak',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    serving: '100g',
    unit: 'gram',
    baseGrams: 100,
    keywords: [
      'ayam grill',
      'grill no oil',
      'grill tanpa',
      'dada dicampur paha',
      'dada ayam',
      'paha ayam',
      'dicampur paha ayam',
      'ayam no oil',
    ],
  },
  { name: 'Ayam bakar', calories: 200, protein: 26, carbs: 3, fat: 9, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['ayam bakar'] },
  { name: 'Ayam goreng', calories: 250, protein: 24, carbs: 6, fat: 14, serving: '100g', unit: 'gram', baseGrams: 100, keywords: ['ayam goreng'] },
  {
    // Kulit cireng / spring roll — 1 lembar kering ~10g
    name: 'Rice paper',
    calories: 35,
    protein: 0.5,
    carbs: 8,
    fat: 0.1,
    serving: '1 lembar',
    unit: 'piece',
    baseGrams: 10,
    keywords: [
      'rice paper',
      'rice papper',
      'ricepaper',
      'kulit lumpia',
      'kulit cireng',
      'lembar rice',
    ],
  },

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
    keywords: [
      'susu uht low fat',
      'susu low fat',
      'susu lowfat',
      'susu rendah lemak',
      'uht lowfat',
      'uht low fat',
    ],
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
  {
    name: 'Pisang goreng',
    calories: 160,
    protein: 1.2,
    carbs: 22,
    fat: 8,
    serving: '1 potong sedang',
    unit: 'piece',
    baseGrams: 60,
    keywords: ['pisang goreng', 'pisang goreng tepung', 'fried banana'],
  },
  {
    name: 'Pisang',
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    serving: '100g',
    unit: 'gram',
    baseGrams: 100,
    keywords: ['pisang', 'banana'],
    exclude: ['goreng', 'fried'],
  },
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
  /pancake|panckake|pancacke|panekuk|salad|smoothie|bowl|omelet|dadar|mix|campur|wrap|sandwich|granola|matcha|minuman|resep|cireng|homemade|risoles?/i;

/** Composite drinks that stay ONE item unless user breaks down kcal per bahan */
const KEEP_COMPOSITE_DRINK =
  /^(caffe?\s*latte|caffè\s*latte|cafe\s*latte|latte|cappuccino|kopi susu|americano|flat white)\b/i;

/** Normalize common typos / aliases before parsing. */
export function normalizeFoodText(text: string): string {
  return (text || '')
    .replace(/\bcaffe?\s*late\b/gi, 'caffe latte')
    .replace(/\bcaffè\s*late\b/gi, 'caffe latte')
    .replace(/\bpanckake\b/gi, 'pancake')
    .replace(/\bpancacke\b/gi, 'pancake')
    .replace(/\bpanekuk\b/gi, 'pancake')
    .replace(/\blowfat\b/gi, 'low fat')
    .replace(/\brice\s*papper\b/gi, 'rice paper')
    .replace(/\bno\s*oil\b/gi, 'tanpa minyak')
    .replace(/\barem2\b/gi, 'arem-arem')
    .replace(/\barem\s*arem\b/gi, 'arem-arem')
    .replace(/\btelur\s+utuh\b/gi, 'telur')
    .replace(/\b1\/2\b/g, 'setengah')
    .replace(/\b½\b/g, 'setengah')
    // "3sdm" / "3 sdm" → spasi konsisten
    .replace(/(\d+(?:[.,]\d+)?)\s*(sdm|sdt|tbsp|tsp)\b/gi, '$1 $2')
    // "4gr = 20kcal" / "4g=20 kcal" → keep parseable
    .replace(/=\s*(\d+)\s*(?:kcal|kalori)\b/gi, '($1kcal)');
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

/** Expand "Matcha (bubuk … + susu …)" into ingredients. Keep latte(espresso+susu) as one item. */
export function expandRecipeSegments(segment: string): string[] {
  const m = segment.match(/^(.+?)\((.+)\)\s*$/);
  if (!m) return [segment];
  const outer = m[1].trim();
  const inner = m[2].trim();
  const ingredients = splitFoodSegments(inner);

  if (ingredients.length >= 2) {
    const hasPerPartKcal = /\(\s*\d+\s*(?:kcal|kalori)\s*\)|\b\d+\s*(?:kcal|kalori)\b/i.test(
      inner
    );
    // latte (espresso + susu) → satu item; Matcha (bubuk + susu) / pancake (...) → pecah
    if (KEEP_COMPOSITE_DRINK.test(outer) && !hasPerPartKcal && !RECIPE_HINT.test(outer)) {
      return [segment];
    }
    return ingredients;
  }

  // Single note in parens: only expand known recipes if somehow multi after normalize
  if (!RECIPE_HINT.test(outer) && !RECIPE_HINT.test(segment)) {
    return [segment];
  }
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
  // Prefer kcal that belongs to THIS segment only (after recipe expand).
  // "bubuk matcha 4gr (20kcal)" or "bubuk matcha 4gr = 20kcal"
  const paren = segment.match(/\(\s*(\d+)\s*(?:kcal|kalori)\s*\)/i);
  if (paren) return Number(paren[1]);
  const eq = segment.match(/=\s*(\d+)\s*(?:kcal|kalori)\b/i);
  if (eq) return Number(eq[1]);
  const inline = segment.match(/(\d+)\s*(?:kcal|kalori)\b/i);
  if (inline) return Number(inline[1]);
  return null;
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type ParsedQty = { multiplier: number; label?: string };

/** 1 sdm/sdt → gram perkiraan menurut jenis bahan (bukan “3 porsi”). */
function gramsPerSpoon(food: FoodRef, spoonUnit: string): number {
  const isTsp = /^(sdt|tsp)$/i.test(spoonUnit);
  const name = food.name.toLowerCase();
  if (food.unit === 'tbsp') return isTsp ? 1 / 3 : 1; // multiplier in tbsp units
  if (food.unit === 'tsp') return isTsp ? 1 : 3;
  if (/susu|air|minyak|kuah|sirup|sauce|kecap/.test(name) || food.unit === 'ml' || food.unit === 'glass') {
    return isTsp ? 5 : 15; // ≈ ml
  }
  if (/matcha|bubuk|powder|tepung|gula|protein|cocoa|kakao/.test(name)) {
    return isTsp ? 3 : 8;
  }
  // Daging suwir, sayur, padat: 1 sdm ≈ 15g
  return isTsp ? 5 : 15;
}

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

  // PENTING: "3sdm dada ayam" = ~45g, BUKAN 3× porsi 100g
  const spoon = s.match(/(\d+(?:[.,]\d+)?)\s*(sdm|sdt|tbsp|tsp)\b/i);
  if (spoon) {
    const n = Number(spoon[1].replace(',', '.')) || 1;
    const unit = spoon[2].toLowerCase();
    if (food.unit === 'tbsp') {
      const m = unit === 'sdt' || unit === 'tsp' ? n / 3 : n;
      return { multiplier: m, label: `${round1(m)} sdm` };
    }
    if (food.unit === 'tsp') {
      const m = unit === 'sdm' || unit === 'tbsp' ? n * 3 : n;
      return { multiplier: m, label: `${round1(m)} sdt` };
    }
    if (food.baseGrams) {
      const grams = n * gramsPerSpoon(food, unit);
      return {
        multiplier: grams / food.baseGrams,
        label: `~${Math.round(grams)}g (${n} ${unit})`,
      };
    }
  }

  for (const [word, val] of Object.entries(WORD_QTY)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(s)) {
      if (food.unit !== 'piece') return { multiplier: val };
      const unitWord = /bolen|risol|pisang|buah|rice paper|lembar/.test(food.name.toLowerCase())
        ? 'buah'
        : 'butir';
      const pieceLabel =
        val === 1 ? food.serving : val === 0.5 ? `0.5 ${unitWord}` : `${round1(val)} ${unitWord}`;
      return { multiplier: val, label: pieceLabel };
    }
  }
  // Jangan masukkan sdm/sdt di sini — sudah ditangani di atas
  const countUnits =
    'pcs|pc|buah|butir|slice|lembar|porsi|piring|gelas|cup|mangkok|tusuk|potong|bungkus|sachet';
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

/** "ukuran kecil/besar" — skala porsi piece/portion, bukan membuang segmen. */
function sizeFactor(segment: string): { factor: number; note?: string } {
  const s = segment.toLowerCase();
  if (/\b(ukuran\s*)?(sangat\s*)?(kecil|mini)\b/.test(s)) {
    return { factor: 0.7, note: 'ukuran kecil' };
  }
  if (/\b(ukuran\s*)?(sangat\s*)?(besar|jumbo|gede)\b/.test(s)) {
    return { factor: 1.3, note: 'ukuran besar' };
  }
  if (/\bukuran\s*sedang\b|\bsedang\b/.test(s) && /ukuran/.test(s)) {
    return { factor: 1, note: 'ukuran sedang' };
  }
  return { factor: 1 };
}

function scaleFood(food: FoodRef, segment: string): FoodItem {
  const { multiplier, label } = parseQuantity(segment, food);
  const qty = multiplier > 0 && multiplier < 200 ? multiplier : 1;
  const size = sizeFactor(segment);
  // Skala ukuran untuk porsi per buah/potong (bukan gram eksplisit seperti "100g")
  const hasExplicitGrams = /\d+(?:[.,]\d+)?\s*(kg|gram|gr|g|ml)\b/i.test(segment);
  const sizeMul =
    !hasExplicitGrams && (food.unit === 'piece' || food.unit === 'portion') ? size.factor : 1;
  const m = qty * sizeMul;

  const unitWord = /bolen|risol|pisang|arem|buah|potong/.test(food.name.toLowerCase())
    ? 'buah'
    : 'butir';
  let serving = label || food.serving;
  if (food.unit === 'piece' || food.unit === 'portion') {
    if (size.note && sizeMul !== 1) {
      const qtyLabel =
        qty === 1 ? `1 ${unitWord}` : qty === 0.5 ? `0.5 ${unitWord}` : `${round1(qty)} ${unitWord}`;
      serving = `${qtyLabel} · ${size.note}`;
    } else if (!label && qty !== 1) {
      serving = qty === 0.5 ? `0.5 ${unitWord}` : `${round1(qty)} ${unitWord}`;
    }
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

function mentionsAirFryer(s: string): boolean {
  const t = s.toLowerCase();
  const negated =
    /ga\s+(di\s+)?air\s*fry|gak\s+(di\s+)?air\s*fry|tidak\s+(di\s+)?air\s*fry|bukan\s+air\s*fry|ga\s+di\s+airfryer|gak\s+di\s+airfryer|tidak\s+di\s+airfryer/.test(
      t
    );
  return /air\s*fry|airfryer/.test(t) && !negated;
}

function mentionsNonFried(s: string): boolean {
  const t = s.toLowerCase();
  return /tanpa minyak|tidak digoreng|ga digoreng|gak digoreng|tidak goreng|ga goreng|gak goreng|kukus|ga\s+di\s+airfryer|gak\s+di\s+airfryer|tidak\s+di\s+airfryer|ga\s+di\s+air\s*fry/.test(
    t
  );
}

function pickRisolFood(segment: string): FoodRef | null {
  const s = segment.toLowerCase();
  if (!/\brisol|\brisoles\b/.test(s)) return null;
  if (/daging|mayo|smoke|smooke/.test(s)) {
    return FOODS.find((f) => f.name === 'Risol daging') || null;
  }
  // Positive air fryer (not "ga di airfryer")
  if (mentionsAirFryer(s)) {
    return FOODS.find((f) => f.name === 'Risol air fryer') || null;
  }
  // Non-fried / steamed (Gemini: ~55 kcal per small-medium piece)
  if (mentionsNonFried(s)) {
    return FOODS.find((f) => f.name === 'Risol tanpa minyak') || null;
  }
  return FOODS.find((f) => f.name === 'Risol sayur/bihun') || null;
}

function matchFood(segment: string): FoodItem | null {
  const s = segment.toLowerCase();
  const explicit = parseExplicitCalories(segment);

  const risolPick = pickRisolFood(segment);
  if (risolPick) {
    const scaled = scaleFood(risolPick, segment);
    if (explicit !== null) {
      return normalizeFoodItem({
        name: cleanSegmentLabel(segment) || risolPick.name,
        calories: explicit,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        serving: scaled.serving,
      });
    }
    return scaled;
  }

  let best: { food: FoodRef; score: number } | null = null;
  for (const food of FOODS) {
    if (food.name.startsWith('Risol')) continue; // handled above
    if (food.exclude?.some((ex) => s.includes(ex))) continue;
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

/** Segmen makanan/olahraga setelah normalisasi (shared by estimate + completeness). */
function preparedSegments(message: string): string[] {
  const text = normalizeFoodText(message || '').trim();
  const risolHint = cookingHintsForRisol(text);
  return expandAllSegments(text)
    .filter((p) => !isMetaOrCookingNote(p))
    .map((p) =>
      risolHint &&
      /\brisol|\brisoles\b/i.test(p) &&
      !/air\s*fry|airfryer|tanpa minyak|tidak digoreng|ga digoreng/i.test(p)
        ? `${p} ${risolHint}`
        : p
    );
}

export function isParseComplete(message: string, result: AiResponse): boolean {
  const segments = preparedSegments(message);
  if (segments.length === 0) {
    return (result.foodItems?.length || 0) > 0 || (result.exerciseItems?.length || 0) > 0;
  }
  let foodExpected = 0;
  let exerciseExpected = 0;
  for (const seg of segments) {
    if (isExerciseSegment(seg)) {
      // Segmen olahraga harus memang match
      if (!EXERCISES.some((ex) => ex.keywords.some((k) => seg.toLowerCase().includes(k)))) {
        return false;
      }
      exerciseExpected++;
      continue;
    }
    // Penting: segmen makanan yang tidak dikenali → TIDAK complete (jangan local-only)
    if (!matchFood(seg)) return false;
    foodExpected++;
  }
  return (
    (result.foodItems?.length || 0) >= foodExpected &&
    (result.exerciseItems?.length || 0) >= exerciseExpected
  );
}

/** Cooking notes often appear in a separate clause after a comma — attach to risol segments. */
function cookingHintsForRisol(fullText: string): string {
  if (mentionsAirFryer(fullText)) return 'air fryer';
  if (mentionsNonFried(fullText)) return 'tanpa minyak';
  return '';
}

/** Skip clauses that ONLY describe size/cooking — never drop "1 arem ukuran kecil". */
function isMetaOrCookingNote(segment: string): boolean {
  const s = segment.toLowerCase().trim().replace(/^\+\s*/, '');

  // Ada keyword makanan di DB → pasti bukan meta
  for (const food of FOODS) {
    if (food.exclude?.some((ex) => s.includes(ex))) continue;
    if (food.keywords.some((k) => s.includes(k))) return false;
  }

  // Token makanan umum / typo yang belum tentu ada di DB
  if (
    /arem|cireng|pisang|goreng|telur|nasi|ayam|tempe|tahu|susu|roti|mie|bakso|risol|bolen|matcha|flimeal|dimsum|keju|udang|latte|kopi/.test(
      s
    )
  ) {
    return false;
  }

  // Hanya catatan murni
  if (/^(ukuran\s*)?(kecil|sedang|besar|mini|jumbo)$/i.test(s)) return true;
  if (/^ukuran(nya)?(\s+\w+)?$/i.test(s)) return true;
  if (/^(tanpa minyak|no oil|without oil|homemade)$/i.test(s)) return true;
  return /seperti di foto|^(dimasak|menggunakan)\b|air\s*fry|airfryer|tidak digoreng|ga digoreng|gak digoreng|tidak goreng|ga goreng/.test(
    s
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
  const parts = preparedSegments(text);
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

  // Hybrid: pakai DB lokal HANYA jika SEMUA segmen makanan dikenali (jangan timpa AI dengan parse parsial)
  const foodSegs = expandAllSegments(originalMessage).filter(
    (s) => !isExerciseSegment(s) && !isMetaOrCookingNote(s)
  );
  const localBySeg = foodSegs.map((s) => matchFood(s));
  if (
    foodSegs.length > 0 &&
    localBySeg.length === foodSegs.length &&
    localBySeg.every(Boolean)
  ) {
    const items = localBySeg as FoodItem[];
    const total = items.reduce((s, f) => s + f.calories, 0);
    return {
      ...normalizeAiResponse({
        type: 'food',
        reply: ai.reply || `Oke, dicatat ~${total} kcal (database gizi TKPI/USDA).`,
        foodItems: items,
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
