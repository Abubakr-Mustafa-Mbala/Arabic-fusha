-- v7.7: Quran recitation recorded by the team, ayah by ayah.
-- Run this in the Supabase SQL Editor.

create table if not exists quran_audio (
  surah int not null,
  ayah int not null,
  storage_path text not null,
  reciter uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  primary key (surah, ayah)
);

alter table quran_audio enable row level security;

-- anyone signed in may listen
create policy "anyone can hear recitation"
  on quran_audio for select
  using (auth.role() = 'authenticated');

-- only approved reciters may add or replace
create policy "reciters manage recitation"
  on quran_audio for all
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));

-- optional: assign a surah to a particular brother so the team can divide the work
create table if not exists quran_assignments (
  surah int primary key,
  assigned_to uuid references auth.users on delete set null,
  assigned_name text,
  created_at timestamptz default now()
);

alter table quran_assignments enable row level security;
create policy "anyone can see assignments"
  on quran_assignments for select using (auth.role() = 'authenticated');
create policy "recorders manage assignments"
  on quran_assignments for all
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));
