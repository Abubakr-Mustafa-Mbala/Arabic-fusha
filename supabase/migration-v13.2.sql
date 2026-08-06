-- v13.2: reviewer access, for the shaykh and the review team.
-- A reviewer sees the whole curriculum unlocked and can leave notes on any
-- lesson, without being treated as a student.

create table if not exists reviewers (
  user_id uuid primary key references auth.users on delete cascade,
  name text,
  created_at timestamptz default now()
);

alter table reviewers enable row level security;

create policy "anyone signed in can see who reviews"
  on reviewers for select using (auth.role() = 'authenticated');

-- notes a reviewer leaves on a lesson
create table if not exists review_notes (
  id bigint generated always as identity primary key,
  lesson_id text not null,
  reviewer uuid references auth.users on delete set null,
  reviewer_name text,
  note text not null,
  status text default 'open',        -- open | fixed
  created_at timestamptz default now()
);

alter table review_notes enable row level security;

create policy "anyone signed in can read notes"
  on review_notes for select using (auth.role() = 'authenticated');

create policy "reviewers write notes"
  on review_notes for insert to authenticated
  with check (exists (select 1 from reviewers r where r.user_id = auth.uid()));

create policy "reviewers update their notes"
  on review_notes for update to authenticated
  using (exists (select 1 from reviewers r where r.user_id = auth.uid()));

-- Add your shaykh after he has signed up once:
-- insert into reviewers(user_id, name)
--   select id, 'الشيخ ...' from auth.users where email = 'his@email.com';
