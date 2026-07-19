-- Storage: food-photos bucket + RLS policies
-- Jalankan di Supabase Dashboard → SQL Editor

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-photos',
  'food-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Hapus policy lama jika ada (aman dijalankan ulang)
drop policy if exists "Authenticated users can upload own food photos" on storage.objects;
drop policy if exists "Authenticated users can update own food photos" on storage.objects;
drop policy if exists "Authenticated users can delete own food photos" on storage.objects;
drop policy if exists "Anyone can read food photos" on storage.objects;
drop policy if exists "Auth users can upload food photos" on storage.objects;
drop policy if exists "Auth users can read food photos" on storage.objects;

-- Upload: hanya ke folder miliknya (user_id/...)
create policy "Authenticated users can upload own food photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'food-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Authenticated users can update own food photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'food-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Authenticated users can delete own food photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'food-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read (bucket public)
create policy "Anyone can read food photos"
  on storage.objects for select
  using (bucket_id = 'food-photos');
