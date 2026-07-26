import { supabase } from "./supabaseClient";

const LOCAL_KEY = "fusha_docs_v1";

// ——— device-only fallback ———
function localLoad() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function localSave(docs) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(docs));
  } catch {}
}

export async function fetchDocs(userId) {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, vocab, best_score, last_practiced, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return localLoad();
}

export async function insertDoc(userId, doc) {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("documents")
      .insert({ user_id: userId, title: doc.title, content: doc.content, vocab: doc.vocab })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const local = { ...doc, id: Date.now(), created_at: new Date().toISOString() };
  localSave([local, ...localLoad()]);
  return local;
}

export async function updateDocScore(userId, docId, score) {
  if (supabase && userId) {
    await supabase
      .from("documents")
      .update({ best_score: score, last_practiced: new Date().toISOString() })
      .eq("id", docId)
      .eq("user_id", userId);
    return;
  }
  const docs = localLoad().map((d) =>
    d.id === docId
      ? { ...d, best_score: Math.max(d.best_score || 0, score), last_practiced: new Date().toISOString() }
      : d
  );
  localSave(docs);
}

export async function deleteDoc(userId, docId) {
  if (supabase && userId) {
    await supabase.from("documents").delete().eq("id", docId).eq("user_id", userId);
    return;
  }
  localSave(localLoad().filter((d) => d.id !== docId));
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });
}

export function fileToText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsText(file);
  });
}
