-- v2.0: human voice recordings
-- Run this in the Supabase SQL Editor.

-- 1) Table mapping Arabic text -> stored audio file
create table if not exists recordings (
  id bigint generated always as identity primary key,
  text_ar text not null unique,        -- the exact Arabic string, fully vocalized
  kind text not null default 'word',   -- 'word' | 'sentence' | 'explanation'
  storage_path text not null,          -- path inside the 'recordings' storage bucket
  recorded_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

alter table recordings enable row level security;

-- Everyone signed in can LISTEN to recordings
create policy "anyone can read recordings"
  on recordings for select
  using (auth.role() = 'authenticated');

-- Only approved recorders can add/replace them
create table if not exists recorders (
  user_id uuid primary key references auth.users on delete cascade,
  added_at timestamptz default now()
);

alter table recorders enable row level security;
create policy "recorders can see the list"
  on recorders for select
  using (auth.role() = 'authenticated');

create policy "recorders can insert recordings"
  on recordings for insert
  with check (exists (select 1 from recorders r where r.user_id = auth.uid()));

create policy "recorders can update recordings"
  on recordings for update
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));

create policy "recorders can delete recordings"
  on recordings for delete
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));
