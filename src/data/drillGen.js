// مُوَلِّدُ التَّدْرِيبَاتِ — generates extra exercises from a lesson's own material.
//
// The Madinah books give nine exercise sets per lesson; we were giving twelve
// questions. This closes that gap by deriving more drills from the vocabulary
// and examples a lesson already contains — recognition, production, spelling,
// word order, and matching — so every lesson has enough repetitions to make
// the material automatic rather than merely familiar.

import { shuffle } from "../lib/shared";

const bare = (t) => String(t).replace(/[\u064B-\u0652\u0670\u0640]/g, "");
const LETTERS = "بتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

// Words that shouldn't be scrambled or spelled — phrases, or too short/long
function drillable(w) {
  const b = bare(w.ar).replace(/[^\u0600-\u06FF ]/g, "").trim();
  return b.length >= 3 && b.split(" ").length === 1;
}

export function generateDrills(lesson) {
  const out = [];
  const vocab = (lesson.vocab || []).filter((v) => v.en);
  const examples = (lesson.examples || []).map((e) => e.ar).filter(Boolean);
  if (!vocab.length) return out;

  const others = (w) => shuffle(vocab.filter((x) => x.ar !== w.ar));

  // ① Arabic → English, for every word
  vocab.forEach((w) => {
    const d = others(w).slice(0, 3).map((x) => x.en);
    if (d.length < 3) return;
    out.push({
      t: "mcq",
      q: w.ar,
      options: [w.en, ...d],
      a: w.en,
      why: `${w.ar} means "${w.en}".`,
      _gen: true,
    });
  });

  // ② English → Arabic, for every word
  vocab.forEach((w) => {
    const d = others(w).slice(0, 3).map((x) => x.ar);
    if (d.length < 3) return;
    out.push({
      t: "mcq",
      q: w.en,
      options: [w.ar, ...d],
      a: w.ar,
      why: `"${w.en}" is ${w.ar}.`,
      _gen: true,
    });
  });

  // ③ Missing letter — spelling practice
  vocab.filter(drillable).forEach((w) => {
    const b = bare(w.ar).replace(/\s/g, "");
    const pos = 1 + Math.floor(Math.random() * (b.length - 2));
    const missing = b[pos];
    const distract = shuffle(LETTERS.filter((c) => c !== missing)).slice(0, 3);
    out.push({
      t: "complete",
      q: b.slice(0, pos) + "___" + b.slice(pos + 1),
      options: [missing, ...distract],
      a: missing,
      why: `The word is ${w.ar} — "${w.en}".`,
      example: w.ar,
      _gen: true,
    });
  });

  // ④ Arrange the letters — the exercise from the Madinah exercise sets
  vocab.filter(drillable).slice(0, 8).forEach((w) => {
    const b = bare(w.ar).replace(/\s/g, "");
    if (b.length > 6) return;
    out.push({
      t: "arrange",
      q: w.en,
      letters: b.split(""),
      a: b,
      why: `${w.ar} — "${w.en}".`,
      _gen: true,
    });
  });

  // ⑤ Matching, in blocks of four
  const mv = vocab.filter((v) => v.en);
  for (let i = 0; i + 3 < mv.length && i < 12; i += 4) {
    const chunk = mv.slice(i, i + 4);
    out.push({
      t: "match",
      q: "صِلْ كُلَّ كَلِمَةٍ بِمَعْنَاهَا",
      pairs: chunk.map((w) => [w.ar, w.en]),
      _gen: true,
    });
  }

  // ⑥ Rebuild the sentence — word order practice from the lesson's own examples
  examples.filter((e) => e.split(" ").length >= 3 && e.split(" ").length <= 7).forEach((e) => {
    out.push({
      t: "assemble",
      q: "رَتِّبِ الْكَلِمَاتِ",
      chips: e.split(" "),
      a: e,
      _gen: true,
    });
  });

  // ⑦ Complete the sentence — remove one word from an example
  examples.filter((e) => e.split(" ").length >= 3).slice(0, 6).forEach((e) => {
    const parts = e.split(" ");
    const k = 1 + Math.floor(Math.random() * (parts.length - 1));
    const answer = parts[k];
    const pool = shuffle(vocab.map((v) => v.ar).filter((a) => a !== answer)).slice(0, 3);
    if (pool.length < 3) return;
    out.push({
      t: "complete",
      q: parts.map((p, n) => (n === k ? "___" : p)).join(" "),
      options: [answer, ...pool],
      a: answer,
      example: e,
      _gen: true,
    });
  });

  return out;
}

// Lesson drills first (they carry the taught explanations), then generated ones.
// A practice session: every taught drill, plus a rotating selection of generated
// ones. Capped so a sitting stays finishable — but the selection changes each
// time, so repeating a lesson never means repeating the same questions.
export function fullDrills(lesson, cap = 30) {
  const own = lesson.drills || [];
  const gen = generateDrills(lesson);
  const asked = new Set(own.map((d) => `${d.t}:${d.q}:${d.a || ""}`));
  const extra = shuffle(gen.filter((d) => !asked.has(`${d.t}:${d.q}:${d.a || ""}`)));
  const room = Math.max(0, cap - own.length);
  return [...own, ...extra.slice(0, room)];
}

// Everything available, for the exam pool and for "more practice".
export function allDrills(lesson) {
  const own = lesson.drills || [];
  const gen = generateDrills(lesson);
  const asked = new Set(own.map((d) => `${d.t}:${d.q}:${d.a || ""}`));
  return [...own, ...gen.filter((d) => !asked.has(`${d.t}:${d.q}:${d.a || ""}`))];
}
