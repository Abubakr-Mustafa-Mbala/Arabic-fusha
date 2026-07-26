-- Run this if you already deployed v0.2 (adds only the new table).
create table if not exists documents (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  content text not null,
  vocab jsonb not null default '[]',
  best_score int,
  last_practiced timestamptz,
  created_at timestamptz default now()
);

alter table documents enable row level security;
create policy "own docs" on documents for all using (auth.uid() = user_id);
