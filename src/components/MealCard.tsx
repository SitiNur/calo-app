'use client';

import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { AiResponse, CalorieLog, ChatMessage } from '@/lib/types';

const SOURCE_LABEL: Record<string, string> = {
  'local-db': 'Tabel gizi TKPI/USDA',
  gemini: 'Tabel gizi (AI)',
  local: 'Estimasi lokal',
};

function MealBreakdown({ data, logs }: { data: AiResponse; logs: CalorieLog[] }) {
  const foodLogs = logs.filter((l) => l.type === 'food');
  const exerciseLogs = logs.filter((l) => l.type === 'exercise');
  const foods =
    foodLogs.length > 0
      ? foodLogs.map((l) => ({
          name: l.name,
          calories: l.calories,
          protein: l.protein,
          carbs: l.carbs,
          fat: l.fat,
          serving: l.serving || undefined,
        }))
      : data.foodItems || [];
  const exercises =
    exerciseLogs.length > 0
      ? exerciseLogs.map((l) => ({
          name: l.name,
          caloriesBurned: l.calories,
          durationMinutes: l.duration_minutes || 0,
        }))
      : data.exerciseItems || [];

  const foodTotal = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      carbs: acc.carbs + (f.carbs || 0),
      protein: acc.protein + (f.protein || 0),
      fat: acc.fat + (f.fat || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const exerciseTotal = exercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0);

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
      {data.source && (
        <p className="text-[10px] text-[var(--muted)]">
          Sumber data: <span className="font-medium">{SOURCE_LABEL[data.source] || data.source}</span>
          {data.source === 'local-db'
            ? ' — angka diskalakan dari tabel gizi (bukan rumus Atwater).'
            : ' — AI memakai pola tabel gizi.'}
        </p>
      )}

      {foods.map((item, i) => (
        <div key={`${item.name}-${i}`} className="text-sm">
          <p className="font-medium">
            {item.name}
            {item.serving ? (
              <span className="font-normal text-[var(--muted)]"> · {item.serving}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {item.calories} kcal · K {item.carbs}g · P {item.protein}g · L {item.fat}g
          </p>
        </div>
      ))}

      {exercises.map((item, i) => (
        <div key={`${item.name}-${i}`} className="text-sm">
          <p className="font-medium">{item.name}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            −{item.caloriesBurned} kcal · {item.durationMinutes} menit
          </p>
        </div>
      ))}

      {foods.length > 0 && (
        <div className="rounded-xl bg-[var(--bg)] px-3 py-2 text-xs">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="font-semibold">{foodTotal.calories}</p>
              <p className="text-[var(--muted)]">kcal</p>
            </div>
            <div>
              <p className="font-semibold">{Math.round(foodTotal.carbs)}g</p>
              <p className="text-[var(--muted)]">karbo</p>
            </div>
            <div>
              <p className="font-semibold">{Math.round(foodTotal.protein)}g</p>
              <p className="text-[var(--muted)]">protein</p>
            </div>
            <div>
              <p className="font-semibold">{Math.round(foodTotal.fat)}g</p>
              <p className="text-[var(--muted)]">lemak</p>
            </div>
          </div>
        </div>
      )}

      {exerciseTotal > 0 && foods.length === 0 && (
        <p className="text-xs font-semibold text-[var(--ok)]">Total bakar: {exerciseTotal} kcal</p>
      )}
    </div>
  );
}

export function MealCard({
  message,
  userText,
  logs = [],
  onEditUserMessage,
  onDeleteUserMessage,
}: {
  message: ChatMessage;
  userText?: string;
  logs?: CalorieLog[];
  onEditUserMessage?: (text: string) => Promise<void>;
  onDeleteUserMessage?: () => Promise<void>;
}) {
  const data = message.structured_data;
  const time = format(parseISO(message.created_at), 'h:mm a', { locale: localeId });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message_text || '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(message.message_text || '');
  }, [message.message_text, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const saveEdit = async () => {
    if (!onEditUserMessage) return;
    const next = draft.trim();
    // Allow re-save of same text only if nothing changed — just close
    if (next === (message.message_text || '').trim()) {
      setEditing(false);
      return;
    }
    // Need some text to recalculate (photo-only: keep a placeholder caption)
    const payload = next || (message.image_url ? 'Analisis ulang foto ini' : '');
    if (!payload) return;
    setSaving(true);
    try {
      await onEditUserMessage(payload);
      setEditing(false);
    } catch {
      // parent handles alert
    } finally {
      setSaving(false);
    }
  };

  if (message.sender === 'user') {
    const canSave = Boolean(draft.trim() || message.image_url);
    return (
      <div className="mx-4 mb-3 animate-fade-up">
        <div className="ml-8">
          <div className="rounded-2xl rounded-tr-md bg-[var(--brand)] px-4 py-3 text-sm text-white shadow-sm">
            {message.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.image_url}
                alt="Foto makanan"
                className="mb-2 max-h-48 w-full rounded-xl object-cover"
              />
            )}
            {editing ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  disabled={saving}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDraft(message.message_text || '');
                      setEditing(false);
                    }
                  }}
                  rows={2}
                  className="w-full resize-none rounded-lg bg-white/10 px-2 py-1.5 text-sm leading-relaxed text-white outline-none ring-1 ring-white/30 placeholder:text-white/60"
                  placeholder="Ubah catatan makanan…"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    aria-label="Batal"
                    onClick={() => {
                      setDraft(message.message_text || '');
                      setEditing(false);
                    }}
                    className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={saving || !canSave}
                    aria-label="Simpan"
                    onClick={() => void saveEdit()}
                    className="rounded-full bg-white p-1.5 text-[var(--brand)] disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                </div>
                {saving && (
                  <p className="text-[10px] text-white/80">Menghitung ulang kalori…</p>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.message_text || (message.image_url ? '📷 Foto makanan' : '')}
              </p>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-2">
            {!editing && (onEditUserMessage || onDeleteUserMessage) && (
              <div className="flex gap-1">
                {onEditUserMessage && (
                  <button
                    type="button"
                    aria-label="Edit chat"
                    title="Edit & hitung ulang"
                    onClick={() => setEditing(true)}
                    className="rounded-full border border-[var(--border)] bg-white p-1.5 text-[var(--brand)] shadow-sm"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {onDeleteUserMessage && (
                  <button
                    type="button"
                    aria-label="Hapus chat"
                    title="Hapus chat"
                    onClick={() => void onDeleteUserMessage()}
                    className="rounded-full border border-[var(--border)] bg-white p-1.5 text-[var(--miss)] shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
            <p className="text-[10px] text-[var(--muted)]">{time}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 animate-fade-up">
      <div className="mr-6 rounded-2xl rounded-tl-md border border-[var(--border)] bg-white px-4 py-3 shadow-[var(--shadow)]">
        {userText && data && (data.foodItems?.length || data.exerciseItems?.length) ? (
          <p className="mb-2 rounded-lg bg-[var(--bg)] px-3 py-2 text-xs italic text-[var(--muted)]">
            &ldquo;{userText}&rdquo;
          </p>
        ) : null}
        <p className="text-sm leading-relaxed">
          {(() => {
            const text = message.message_text || '';
            if (/GoogleGenerativeAI Error|429 Too Many Requests|gemini-2\.0-flash/i.test(text)) {
              return 'Pesan error lama. Kirim ulang makananmu di bawah.';
            }
            return text;
          })()}
        </p>
        {data && (data.foodItems?.length || data.exerciseItems?.length) ? (
          <MealBreakdown data={data} logs={logs} />
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {onDeleteUserMessage && (
          <button
            type="button"
            aria-label="Hapus jawaban"
            title="Hapus jawaban tersisa"
            onClick={() => void onDeleteUserMessage()}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--miss)] shadow-sm"
          >
            <Trash2 size={12} />
            Hapus
          </button>
        )}
        <p className="text-[10px] text-[var(--muted)]">{time}</p>
      </div>
    </div>
  );
}
