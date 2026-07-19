'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImageIcon, Send, Loader2, X } from 'lucide-react';

type PendingImage = {
  file: File;
  previewUrl: string;
  base64: string;
  type: string;
};

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
      // Biarkan user menulis penjelasan setelah pilih foto
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
      // Teks di bubble: caption user, atau label singkat jika foto saja
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
    <div className="safe-bottom border-t border-[var(--border)] bg-white/95 px-3 pt-3 backdrop-blur">
      {pending && (
        <div className="mb-2 flex items-start gap-2 animate-fade-up">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pending.previewUrl}
              alt="Preview foto"
              className="h-20 w-20 rounded-xl object-cover border border-[var(--border)]"
            />
            <button
              type="button"
              aria-label="Hapus foto"
              disabled={sending}
              onClick={clearPending}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--ink)] p-1 text-white shadow"
            >
              <X size={12} />
            </button>
          </div>
          <p className="flex-1 pt-1 text-xs leading-relaxed text-[var(--muted)]">
            Foto siap. Tulis penjelasan (opsional), contoh: &ldquo;nasi 150g + ayam bakar tanpa kulit&rdquo;,
            lalu kirim.
          </p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            disabled={disabled || sending}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={
              pending
                ? 'Jelaskan isi fotonya (opsional)…'
                : 'Apa yang kamu makan atau olahraga?'
            }
            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            aria-label="Galeri"
            disabled={disabled || sending}
            onClick={() => galleryRef.current?.click()}
            className={`p-1.5 ${pending ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
          >
            <ImageIcon size={20} />
          </button>
          <button
            type="button"
            aria-label="Kamera"
            disabled={disabled || sending}
            onClick={() => cameraRef.current?.click()}
            className={`p-1.5 ${pending ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
          >
            <Camera size={20} />
          </button>
        </div>
        <button
          type="button"
          disabled={disabled || sending || !canSend}
          onClick={() => void submit()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white disabled:opacity-40"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
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
