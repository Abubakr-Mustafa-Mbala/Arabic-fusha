import { supabase } from "./supabaseClient";
import { CURRICULUM } from "../data/curriculum";
import { QURAN } from "../data/quran";
import { VOCAB_BANK } from "../data/vocabBank";

const BUCKET = "recordings";

// ——— Collect every Arabic string in the app that should have a human voice ———
// Returns a flat, de-duplicated list: { text, kind, source }
export function collectRecordables() {
  const seen = new Map();
  // Each item carries the lesson it comes from, so recording can proceed
  // in curriculum order — the earliest lessons get their audio first.
  const add = (text, kind, source, order = 999) => {
    const t = (text || "").trim();
    if (!t) return;
    if (!seen.has(t)) seen.set(t, { text: t, kind, source, order });
  };

  CURRICULUM.lessons.forEach((l, li) => {
    const src = l.title;
    // within a lesson: words first, then its sentences
    (l.vocab || []).forEach((v) => add(v.ar, "word", src, li * 10));
    (l.examples || []).forEach((e) => add(e.ar, "sentence", src, li * 10 + 1));
    if (l.rule?.ar) {
      String(l.rule.ar).split("\n").forEach((line) => add(line, "sentence", src, li * 10 + 2));
    }
    (l.drills || []).forEach((d) => {
      if (d.a) add(d.a, d.t === "assemble" ? "sentence" : "word", src, li * 10 + 3);
    });
  });

  QURAN.forEach((s) => {
    (s.ayat || []).forEach((a) => {
      add(a.ar, "ayah", s.name, 9000);
      (a.words || []).forEach((w) => add(w.ar, "word", s.name, 9001));
    });
  });

  return Array.from(seen.values());
}

// ——— Data access ———

export async function fetchRecordings() {
  if (!supabase) return {};
  const { data, error } = await supabase.from("recordings").select("text_ar, storage_path");
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => { map[r.text_ar] = r.storage_path; });
  return map;
}

export async function isRecorder(userId) {
  if (!supabase || !userId) return false;
  const { data } = await supabase.from("recorders").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export function audioUrl(storagePath) {
  if (!supabase || !storagePath) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

export async function uploadRecording(userId, text, kind, blob) {
  if (!supabase) throw new Error("no backend");
  // Supabase storage keys must be ASCII — Arabic text in the filename is rejected
  // as an "Invalid key", so derive a short stable hash from the text instead.
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  const path = `w-${hash.toString(36)}-${Date.now().toString(36)}.webm`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (up.error) throw up.error;

  const { error } = await supabase
    .from("recordings")
    .upsert({ text_ar: text, kind, storage_path: path, recorded_by: userId }, { onConflict: "text_ar" });
  if (error) throw error;
  return path;
}

export async function deleteRecording(text, storagePath) {
  if (!supabase) return;
  await supabase.from("recordings").delete().eq("text_ar", text);
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
}

// ——— اَلنُّصُوصُ الْمَسْمُوعَةُ — recorded passages ———
// A human (the shaykh / a trusted reciter) reads a full text aloud.
// Learners listen, then answer comprehension questions on what they heard.

export async function fetchPassages() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("passages")
    .select("id, title, source, text_ar, storage_path, questions, level, created_at")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function savePassage(userId, p) {
  if (!supabase) throw new Error("no backend");
  const row = {
    title: p.title,
    source: p.source || null,
    text_ar: p.text_ar,
    storage_path: p.storage_path || null,
    questions: p.questions || [],
    level: p.level || "beginner",
    recorded_by: userId,
  };
  if (p.id) {
    const { error } = await supabase.from("passages").update(row).eq("id", p.id);
    if (error) throw error;
    return p.id;
  }
  const { data, error } = await supabase.from("passages").insert(row).select().single();
  if (error) throw error;
  return data.id;
}

export async function uploadPassageAudio(blob) {
  if (!supabase) throw new Error("no backend");
  const path = `passage-${Date.now()}.webm`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePassage(id, storagePath) {
  if (!supabase) return;
  await supabase.from("passages").delete().eq("id", id);
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
}

// ——— تِلَاوَةُ الْقُرْآنِ — recitation recorded by the team ———
// One row per ayah. The Mushaf plays the team's voice when it exists,
// and falls back to the streamed reciter only where nothing is recorded yet.

export async function fetchQuranAudio(surah) {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("quran_audio")
    .select("ayah, storage_path")
    .eq("surah", surah);
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => { map[r.ayah] = r.storage_path; });
  return map;
}

export async function fetchQuranProgress() {
  if (!supabase) return {};
  const { data, error } = await supabase.from("quran_audio").select("surah");
  if (error) return {};
  const counts = {};
  (data || []).forEach((r) => { counts[r.surah] = (counts[r.surah] || 0) + 1; });
  return counts;
}

export async function uploadAyah(userId, surah, ayah, blob) {
  if (!supabase) throw new Error("no backend");
  const path = `quran/${surah}-${ayah}-${Date.now().toString(36)}.webm`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (up.error) throw up.error;
  const { error } = await supabase
    .from("quran_audio")
    .upsert({ surah, ayah, storage_path: path, reciter: userId }, { onConflict: "surah,ayah" });
  if (error) throw error;
  return path;
}

export async function deleteAyah(surah, ayah, storagePath) {
  if (!supabase) return;
  await supabase.from("quran_audio").delete().eq("surah", surah).eq("ayah", ayah);
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
}
