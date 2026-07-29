-- v8.6: admin overrides for lessons (translations, images) — no redeploy needed.

create table if not exists lesson_overrides (
  lesson_id text primary key,
  patch jsonb not null default '{}',
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz default now()
);

alter table lesson_overrides enable row level security;

create policy "anyone can read overrides"
  on lesson_overrides for select using (auth.role() = 'authenticated');

create policy "recorders manage overrides"
  on lesson_overrides for all
  using (exists (select 1 from recorders r where r.user_id = auth.uid()));

-- allow image uploads into the existing bucket
create policy "recorders can upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings');
