export const C = {
  paper: "#F6F4EC",
  surface: "#FFFFFF",
  ink: "#1C2B21",
  faded: "#6B7A6E",
  emerald: "#0E5237",
  emeraldSoft: "#E4EEE7",
  gold: "#B9862F",
  goldSoft: "#F4EAD5",
  red: "#A34038",
  redSoft: "#F6E4E2",
  border: "#E3DFD2",
};

let cachedVoices = [];
if (typeof window !== "undefined" && window.speechSynthesis) {
  const refresh = () => { cachedVoices = window.speechSynthesis.getVoices() || []; };
  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;
}

// ——— human voice layer ———
// Recordings map (text -> public audio url) is loaded once at sign-in by App.
let humanVoice = {};
export function setHumanVoice(map) { humanVoice = map || {}; }
export function hasHumanVoice(text) { return !!humanVoice[String(text).trim()]; }

export function speak(text) {
  const key = String(text).trim();
  // A real human recording always wins over machine speech.
  if (humanVoice[key]) {
    try {
      const a = new Audio(humanVoice[key]);
      a.play();
      return;
    } catch {}
  }
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const clean = String(text).replace(/[^\u0600-\u06FF\s؟!،.]/g, "");
    if (!clean.trim()) return;
    const fire = () => {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "ar-SA";
      u.rate = 0.8;
      const pool = cachedVoices.length ? cachedVoices : synth.getVoices();
      const v = pool.find((x) => x.lang && x.lang.startsWith("ar"));
      if (v) u.voice = v;
      synth.speak(u);
    };
    // Chrome/Android sometimes hasn't loaded the voice list on the very first call —
    // if it's empty, wait one tick for it to populate, then speak anyway either way.
    if (!cachedVoices.length && synth.getVoices().length === 0) {
      setTimeout(() => { cachedVoices = synth.getVoices(); fire(); }, 150);
    } else {
      fire();
    }
  } catch {}
}

export async function callAI(payload) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "AI request failed");
  return data.text;
}

export function parseJSONLoose(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export const LEVELS = [
  { id: "beginner", ar: "مُبْتَدِئ", emoji: "🌱" },
  { id: "intermediate", ar: "مُتَوَسِّط", emoji: "🌿" },
  { id: "advanced", ar: "مُتَقَدِّم", emoji: "🌳" },
];

export function getLevel() {
  try { return localStorage.getItem("fusha_level") || "beginner"; } catch { return "beginner"; }
}
export function setLevel(l) {
  try { localStorage.setItem("fusha_level", l); } catch {}
}

// ——— English scaffolding that fades ———
// English hints appear only while a word/instruction is genuinely new to the learner.
// Once they've met it enough times, the English disappears and Arabic stands alone.
// This mirrors how a teacher uses a little English at the start, then abandons it.

const SEEN_KEY = "fusha_seen_v1";
const FADE_AFTER = 3; // met this many times -> English hint disappears

function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
}
function saveSeen(o) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(o)); } catch {}
}

// Record that the learner has encountered this item (a word, or an instruction key).
export function markSeen(key) {
  if (!key) return;
  const seen = loadSeen();
  seen[key] = (seen[key] || 0) + 1;
  saveSeen(seen);
}

// Should we still show the English hint for this item?
export function needsHint(key) {
  if (!key) return false;
  return (loadSeen()[key] || 0) < FADE_AFTER;
}

// How many times has it been met (for showing a fade indicator if wanted)
export function seenCount(key) {
  return loadSeen()[key] || 0;
}
