-- الفصحى — Supabase schema (v2: accounts + synced progress)
-- Run in the Supabase SQL editor when you're ready to add user accounts.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists lesson_progress (
  user_id uuid references auth.users on delete cascade,
  lesson_id text not null,
  score int not null check (score between 0 and 100),
  completed_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

create table if not exists srs_cards (
  user_id uuid references auth.users on delete cascade,
  word text not null,
  ease real not null default 2.5,
  interval_days int not null default 0,
  due timestamptz not null default now(),
  reps int not null default 0,
  primary key (user_id, word)
);

create table if not exists exam_results (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  exam_id text not null,
  section_scores jsonb not null, -- {"مفردات":85,"قواعد":70,...}
  overall int not null,
  passed boolean not null,
  taken_at timestamptz default now()
);

alter table profiles enable row level security;
alter table lesson_progress enable row level security;
alter table srs_cards enable row level security;
alter table exam_results enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own lesson progress" on lesson_progress for all using (auth.uid() = user_id);
create policy "own srs" on srs_cards for all using (auth.uid() = user_id);
create policy "own exams" on exam_results for all using (auth.uid() = user_id);

-- v0.3: user document library
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
