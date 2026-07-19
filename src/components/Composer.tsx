'use client';

import { useRef, useState } from 'react';
import { Camera, ImageIcon, Send, Loader2 } from 'lucide-react';

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (payload: { text: string; imageBase64?: string; imageType?: string; imageFile?: File }) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) =>
    new Promise<{ base64: string; type: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve({ base64: result, type: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const submit = async (opts?: { imageBase64?: string; imageType?: string; imageFile?: File; textOverride?: string }) => {
    const message = (opts?.textOverride ?? text).trim();
    if (!message && !opts?.imageBase64) return;
    setSending(true);
    try {
      await onSend({
        text: message || 'Analisis foto makanan ini.',
        imageBase64: opts?.imageBase64,
        imageType: opts?.imageType,
        imageFile: opts?.imageFile,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    const { base64, type } = await readFile(file);
    await submit({ imageBase64: base64, imageType: type, imageFile: file, textOverride: text });
  };

  return (
    <div className="safe-bottom border-t border-[var(--border)] bg-white/95 px-3 pt-3 backdrop-blur">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <textarea
            rows={1}
            value={text}
            disabled={disabled || sending}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Apa yang kamu makan atau olahraga?"
            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            aria-label="Galeri"
            disabled={disabled || sending}
            onClick={() => galleryRef.current?.click()}
            className="p-1.5 text-[var(--muted)]"
          >
            <ImageIcon size={20} />
          </button>
          <button
            type="button"
            aria-label="Kamera"
            disabled={disabled || sending}
            onClick={() => cameraRef.current?.click()}
            className="p-1.5 text-[var(--muted)]"
          >
            <Camera size={20} />
          </button>
        </div>
        <button
          type="button"
          disabled={disabled || sending || !text.trim()}
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
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
    </div>
  );
}
