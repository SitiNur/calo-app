# Calo — Asisten Diet (PWA)

Web app installable di HP untuk tracking kalori dengan UI chat. Input teks/foto makanan atau olahraga, AI Gemini menghitung nutrisi, Supabase menyimpan log.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase Auth / Postgres / Storage
- Google Gemini Flash (free tier)

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Env** — salin `.env.local.example` ke `.env.local` dan isi:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   GEMINI_API_KEY=
   ```

3. **Supabase**
   - Buat project baru di [supabase.com](https://supabase.com)
   - Jalankan SQL di [`supabase/schema.sql`](supabase/schema.sql) lewat SQL Editor
   - Storage → buat bucket `food-photos` (public) atau jalankan [`supabase/storage.sql`](supabase/storage.sql)
   - Auth → Email provider aktif (disable confirm email di lokal jika ingin cepat uji)

4. **Login Google**
   1. [Google Cloud Console](https://console.cloud.google.com/) → buat OAuth Client ID (tipe **Web application**)
   2. Authorized JavaScript origins: `http://localhost:3000` (+ domain production)
   3. Authorized redirect URIs — **wajib URL Supabase** (bukan localhost app):
      `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   4. Supabase → **Authentication → Providers → Google** → Enable → paste Client ID & Secret
   5. Supabase → **Authentication → URL Configuration**:
      - Site URL: `http://localhost:3000`
      - Redirect URLs: `http://localhost:3000/auth/callback` (+ URL production)

5. **Gemini**
   - Ambil API key gratis di [Google AI Studio](https://aistudio.google.com/apikey)

6. **Jalankan**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Fitur

- Onboarding: BMR → TDEE → target kalori (turun/maintain/naik BB)
- Chat logging makanan & olahraga (teks + gambar)
- Sisa kalori harian + makro + water tracker
- Weekly summary, weight log, goals, reminders, settings
- PWA: Install to Home Screen (manifest + icons)

## Rumus kalori

`sisa = target − makanan + olahraga`

TDEE memakai Mifflin–St Jeor + multiplier aktivitas; defisit/surplus dari `kg/minggu × 7700 / 7`.
