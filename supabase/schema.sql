-- Calo — Supabase schema
-- Run this in the Supabase SQL Editor

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  gender text check (gender in ('male', 'female', 'other')),
  age integer,
  height numeric,
  weight numeric,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  weight_goal text check (weight_goal in ('lose', 'maintain', 'gain')),
  target_speed numeric default 0.5,
  bmr integer,
  tdee integer,
  target_calories integer,
  protein_target_g integer,
  carbs_target_g integer,
  fat_target_g integer,
  water_goal_ml integer default 2000,
  show_water_tracker boolean default true,
  profile_completed boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Calorie logs
create table if not exists public.calorie_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  log_date date default current_date not null,
  type text check (type in ('food', 'exercise')) not null,
  name text not null,
  calories integer not null,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  serving text,
  duration_minutes integer,
  message_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.calorie_logs enable row level security;

create policy "Users can view own logs" on public.calorie_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on public.calorie_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own logs" on public.calorie_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own logs" on public.calorie_logs
  for delete using (auth.uid() = user_id);

create index if not exists calorie_logs_user_date_idx on public.calorie_logs (user_id, log_date);

-- 3. Chat messages
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  log_date date default current_date not null,
  sender text check (sender in ('user', 'assistant')) not null,
  message_text text,
  image_url text,
  structured_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

create policy "Users can view own messages" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy "Users can update own messages" on public.chat_messages
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own messages" on public.chat_messages
  for delete using (auth.uid() = user_id);

create index if not exists chat_messages_user_date_idx on public.chat_messages (user_id, log_date, created_at);

alter table public.calorie_logs
  drop constraint if exists calorie_logs_message_id_fkey;
alter table public.calorie_logs
  add constraint calorie_logs_message_id_fkey
  foreign key (message_id) references public.chat_messages(id) on delete set null;

-- 4. Water logs
create table if not exists public.water_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  log_date date default current_date not null,
  cups integer default 0 not null,
  ml integer default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

create policy "Users can view own water" on public.water_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own water" on public.water_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own water" on public.water_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own water" on public.water_logs
  for delete using (auth.uid() = user_id);

-- 5. Weight logs
create table if not exists public.weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight_kg numeric not null,
  logged_at date default current_date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.weight_logs enable row level security;

create policy "Users can view own weight" on public.weight_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own weight" on public.weight_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own weight" on public.weight_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own weight" on public.weight_logs
  for delete using (auth.uid() = user_id);

-- 6. Reminder settings
create table if not exists public.reminder_settings (
  user_id uuid references auth.users on delete cascade primary key,
  breakfast_enabled boolean default true,
  breakfast_time text default '08:00',
  lunch_enabled boolean default true,
  lunch_time text default '12:30',
  dinner_enabled boolean default true,
  dinner_time text default '19:00',
  water_enabled boolean default true,
  water_interval_hours integer default 2,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reminder_settings enable row level security;

create policy "Users can view own reminders" on public.reminder_settings
  for select using (auth.uid() = user_id);
create policy "Users can insert own reminders" on public.reminder_settings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own reminders" on public.reminder_settings
  for update using (auth.uid() = user_id);

-- 7. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, profile_completed)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    false
  );
  insert into public.reminder_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Keepalive (mencegah Free Plan pause setelah ~7 hari idle)
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

-- 9. Storage bucket (run in dashboard or via SQL if allowed)
-- Create bucket "food-photos" (public read optional)
-- insert into storage.buckets (id, name, public) values ('food-photos', 'food-photos', true);

-- Storage policies (adjust after bucket exists):
-- create policy "Auth users can upload food photos"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Auth users can read food photos"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
