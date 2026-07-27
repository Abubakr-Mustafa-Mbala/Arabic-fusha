-- v3.9: recorded passages (a human reads a full text aloud)
create table if not exists passages (
  id bigint generated always as identity primary key,
  title text not null,              -- e.g. "الأصول الثلاثة — المقدمة"
  source text,                      -- book / where it is from
  text_ar text not null,            -- the full Arabic passage
  storage_path text,                -- audio recording of the whole passage
  questions jsonb default '[]',     -- comprehension questions authored by the recorder
  level text default 'beginner',    -- beginner | intermediate | advanced
  recorded_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

alter table passages enable row level security;

create policy "anyone can read passages"
  on passages for select using (auth.role() = 'authenticated');

create policy "recorders manage passages"
  on passages for all
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));
