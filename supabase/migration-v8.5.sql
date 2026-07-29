-- v8.5: store partial lesson progress, not just the final score.
-- Without these columns, progress made mid-lesson is lost on the next sign-in.

alter table lesson_progress add column if not exists pct int default 0;
alter table lesson_progress add column if not exists stage text default 'vocab';
