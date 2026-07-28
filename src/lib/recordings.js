import { supabase } from "./supabaseClient";
import { CURRICULUM } from "../data/curriculum";
import { QURAN } from "../data/quran";

const BUCKET = "recordings";

// ——— Collect every Arabic string in the app that should have a human voice ———
// Returns a flat, de-duplicated list: { text, kind, source }
export function collectRecordables() {
  const seen = new Map();
  const add = (text, kind, source) => {
    const t = (text || "").trim();
    if (!t) return;
    if (!seen.has(t)) seen.set(t, { text: t, kind, source });
  };

  CURRICULUM.lessons.forEach((l) => {
    const src = l.title;
    (l.vocab || []).forEach((v) => add(v.ar, "word", src));
    (l.examples || []).forEach((e) => add(e.ar, "sentence", src));
    if (l.rule?.ar) {
      // rule text can be multi-line — record each line separately
      String(l.rule.ar).split("\n").forEach((line) => add(line, "sentence", src));
    }
    (l.drills || []).forEach((d) => {
      if (d.a) add(d.a, d.t === "assemble" ? "sentence" : "word", src);
    });
  });

  QURAN.forEach((s) => {
    (s.ayat || []).forEach((a) => {
      add(a.ar, "ayah", s.name);
      (a.words || []).forEach((w) => add(w.ar, "word", s.name));
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
