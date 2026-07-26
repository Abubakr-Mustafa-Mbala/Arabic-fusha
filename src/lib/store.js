// Progress store (on-device for v1; swaps to Supabase later without UI changes)

const KEY = "fusha_progress_v1";

const empty = () => ({
  lessons: {}, // id -> { score, completedAt }
  srs: {}, // word -> { ease, interval, due, reps }
  lexicon: {}, // word -> emoji, for vocab learned outside lessons (e.g. documents)
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — session continues in memory
  }
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// ——— SM-2 lite ———
const DAY = 24 * 60 * 60 * 1000;

export function initCard() {
  return { ease: 2.5, interval: 0, due: Date.now(), reps: 0 };
}

export function review(card, correct) {
  const c = { ...card };
  if (correct) {
    c.reps += 1;
    if (c.reps === 1) c.interval = 1;
    else if (c.reps === 2) c.interval = 3;
    else c.interval = Math.round(c.interval * c.ease);
    c.ease = Math.min(3.0, c.ease + 0.1);
  } else {
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
  }
  c.due = Date.now() + (c.interval === 0 ? 10 * 60 * 1000 : c.interval * DAY);
  return c;
}

export function dueWords(state) {
  const now = Date.now();
  return Object.entries(state.srs)
    .filter(([, card]) => card.due <= now)
    .map(([word]) => word);
}

export function seedLessonIntoSrs(state, lesson) {
  const srs = { ...state.srs };
  lesson.vocab.forEach((v) => {
    if (!srs[v.ar]) srs[v.ar] = initCard();
  });
  return { ...state, srs };
}
