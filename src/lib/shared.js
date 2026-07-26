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

export function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const clean = String(text).replace(/[^\u0600-\u06FF\s؟!،.]/g, "");
    if (!clean.trim()) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "ar-SA";
    u.rate = 0.8;
    const v = synth.getVoices().find((x) => x.lang && x.lang.startsWith("ar"));
    if (v) u.voice = v;
    synth.speak(u);
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
