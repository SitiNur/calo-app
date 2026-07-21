'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, ImageIcon, Loader2, X } from 'lucide-react';

type PendingImage = {
  file: File;
  previewUrl: string;
  base64: string;
  type: string;
};

const MAX_TEXTAREA_PX = 64;
const PLACEHOLDER =
  'Apa yang kamu makan atau olahraga apa yang kamu lakukan?';

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (payload: {
    text: string;
    imageBase64?: string;
    imageType?: string;
    imageFile?: File;
  }) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingImage | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    };
  }, [pending?.previewUrl]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [text]);

  const readFile = (file: File) =>
    new Promise<{ base64: string; type: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ base64: String(reader.result || ''), type: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const clearPending = () => {
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { base64, type } = await readFile(file);
      setPending((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          type,
        };
      });
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      console.error('Gagal baca foto', err);
      alert('Gagal membaca foto. Coba lagi.');
    }
  };

  const submit = async () => {
    const message = text.trim();
    if (!message && !pending) return;
    setSending(true);
    try {
      const caption = message || (pending ? 'Foto makanan' : '');
      await onSend({
        text: caption,
        imageBase64: pending?.base64,
        imageType: pending?.type,
        imageFile: pending?.file,
      });
      setText('');
      clearPending();
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(text.trim() || pending);

  return (
    <div className="safe-bottom shrink-0 border-t border-[var(--border)] bg-white/95 px-2 pt-1.5 backdrop-blur">
      {pending && (
        <div className="mb-1.5 flex items-start gap-2 animate-fade-up">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pending.previewUrl}
              alt="Preview foto"
              className="h-14 w-14 rounded-lg object-cover border border-[var(--border)]"
            />
            <button
              type="button"
              aria-label="Hapus foto"
              disabled={sending}
              onClick={clearPending}
              className="absolute -right-1 -top-1 rounded-full bg-[var(--ink)] p-0.5 text-white shadow"
            >
              <X size={10} />
            </button>
          </div>
          <p className="flex-1 pt-0.5 text-[11px] leading-snug text-[var(--muted)]">
            Foto siap. Tulis penjelasan (opsional), lalu kirim.
          </p>
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          disabled={disabled || sending}
          onChange={(e) => setText(e.target.value)}
          placeholder={pending ? 'Jelaskan isi fotonya (opsional)…' : PLACEHOLDER}
          className="max-h-16 min-h-[32px] flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[13px] leading-4 outline-none placeholder:text-[var(--muted)]"
        />
        <div className="flex shrink-0 items-center gap-px pb-px">
          <button
            type="button"
            aria-label="Galeri"
            disabled={disabled || sending}
            onClick={() => galleryRef.current?.click()}
            className={`rounded-md p-1.5 ${pending ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            aria-label="Kamera"
            disabled={disabled || sending}
            onClick={() => cameraRef.current?.click()}
            className={`rounded-md p-1.5 ${pending ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
          >
            <Camera size={16} />
          </button>
          <button
            type="button"
            disabled={disabled || sending || !canSend}
            onClick={() => void submit()}
            className="rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : 'Kirim'}
          </button>
        </div>
      </div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
