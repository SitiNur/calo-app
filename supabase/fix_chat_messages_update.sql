-- Run this once in Supabase SQL Editor so edit-chat can UPDATE messages.
drop policy if exists "Users can update own messages" on public.chat_messages;
create policy "Users can update own messages" on public.chat_messages
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
