-- Keepalive: mencegah Free Plan pause setelah ~7 hari idle.
-- Jalankan sekali di Supabase SQL Editor.
-- Tabel dummy 1 baris; anon hanya boleh SELECT (tidak ada data sensitif).

create table if not exists public.keepalive (
  id int primary key,
  ping text not null default 'ok',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.keepalive enable row level security;

drop policy if exists "keepalive public read" on public.keepalive;
create policy "keepalive public read"
  on public.keepalive
  for select
  using (true);

insert into public.keepalive (id, ping)
values (1, 'ok')
on conflict (id) do nothing;

-- Opsional: izinkan update timestamp via RPC (dipakai cron)
create or replace function public.touch_keepalive()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz;
begin
  update public.keepalive
  set ping = 'ok', updated_at = timezone('utc'::text, now())
  where id = 1
  returning updated_at into ts;

  if ts is null then
    insert into public.keepalive (id, ping)
    values (1, 'ok')
    returning updated_at into ts;
  end if;

  return ts;
end;
$$;

revoke all on function public.touch_keepalive() from public;
grant execute on function public.touch_keepalive() to anon, authenticated;
