-- Jalankan di Supabase SQL Editor (sekali)
alter table public.profiles
  add column if not exists show_water_tracker boolean default true;
