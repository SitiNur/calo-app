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

## Mencegah Supabase Free Plan pause

Free Plan pause otomatis setelah ~7 hari aktivitas DB rendah. Solusi di repo ini:

1. **Jalankan SQL sekali** di Supabase SQL Editor: [`supabase/keepalive.sql`](supabase/keepalive.sql)
2. **GitHub Actions** (disarankan) — workflow [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) ping 2× sehari.
   - Push repo ke GitHub
   - Settings → Secrets → Actions: isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Actions → **Supabase keepalive** → Run workflow (uji sekali)
3. **Alternatif** — monitor eksternal (cron-job.org / UptimeRobot) hit `GET https://your-app/api/keepalive` tiap hari.
   - Opsional: set `KEEPALIVE_SECRET` di env, kirim header `x-keepalive-secret`

> Jika project **sudah pause**, Resume dulu di Dashboard. Cron tidak bisa membangunkan project yang paused.  
> Solusi permanen: upgrade ke **Pro** (tidak pernah di-pause karena idle).

## Fitur

- Onboarding: BMR → TDEE → target kalori (turun/maintain/naik BB)
- Chat logging makanan & olahraga (teks + gambar)
- Sisa kalori harian + makro + water tracker
- Weekly summary, weight log, goals, reminders, settings
- PWA: Install to Home Screen (manifest + icons)
- Keepalive cron untuk Supabase Free Plan

## Rumus kalori

`sisa = target − makanan + olahraga`

TDEE memakai Mifflin–St Jeor + multiplier aktivitas; defisit/surplus dari `kg/minggu × 7700 / 7`.
