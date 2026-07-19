-- Allow deleting own water logs (needed to purge past days)
drop policy if exists "Users can delete own water" on public.water_logs;
create policy "Users can delete own water" on public.water_logs
  for delete using (auth.uid() = user_id);
