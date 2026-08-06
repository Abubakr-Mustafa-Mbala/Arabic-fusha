import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set, the app runs in device-only mode.
export const supabase = url && key ? createClient(url, key) : null;

// ——— remote progress (per-user, RLS-protected) ———

export async function fetchRemoteState(userId) {
  const [lp, sc] = await Promise.all([
    supabase.from("lesson_progress").select("lesson_id, score, pct, stage, completed_at").eq("user_id", userId),
    supabase.from("srs_cards").select("word, ease, interval_days, due, reps").eq("user_id", userId),
  ]);
  if (lp.error || sc.error) throw lp.error || sc.error;
  const lessons = {};
  (lp.data || []).forEach((r) => {
    lessons[r.lesson_id] = {
      score: r.score ?? 0,
      pct: r.pct ?? 0,
      stage: r.stage || "vocab",
      completedAt: new Date(r.completed_at).getTime(),
    };
  });
  const srs = {};
  (sc.data || []).forEach((r) => {
    srs[r.word] = {
      ease: r.ease,
      interval: r.interval_days,
      due: new Date(r.due).getTime(),
      reps: r.reps,
    };
  });
  return { lessons, srs };
}

export async function saveRemoteLesson(userId, lessonId, rec) {
  // rec may be a bare score (legacy) or the full { score, pct, stage } record
  const r = typeof rec === "number" ? { score: rec, pct: 100, stage: "produce" } : rec || {};
  await supabase.from("lesson_progress").upsert({
    user_id: userId,
    lesson_id: lessonId,
    score: r.score ?? 0,
    pct: r.pct ?? 0,
    stage: r.stage || "vocab",
    completed_at: new Date().toISOString(),
  });
}

export async function saveRemoteCards(userId, cardsObj) {
  const rows = Object.entries(cardsObj).map(([word, c]) => ({
    user_id: userId,
    word,
    ease: c.ease,
    interval_days: c.interval,
    due: new Date(c.due).toISOString(),
    reps: c.reps,
  }));
  if (rows.length) await supabase.from("srs_cards").upsert(rows);
}


// ——— Reviewer access — the shaykh and the review team ———
// A reviewer sees everything unlocked and can leave a note on any lesson.

export async function checkReviewer(userId) {
  if (!supabase || !userId) return false;
  const { data } = await supabase.from("reviewers").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export async function fetchNotes(lessonId) {
  if (!supabase) return [];
  const q = supabase.from("review_notes").select("*").order("created_at", { ascending: false });
  const { data } = lessonId ? await q.eq("lesson_id", lessonId) : await q;
  return data || [];
}

export async function addNote(lessonId, userId, name, note) {
  if (!supabase) throw new Error("no backend");
  const { error } = await supabase.from("review_notes").insert({
    lesson_id: lessonId, reviewer: userId, reviewer_name: name || null, note,
  });
  if (error) throw error;
}

export async function resolveNote(id) {
  if (!supabase) return;
  await supabase.from("review_notes").update({ status: "fixed" }).eq("id", id);
}
