import { useMemo, useState } from "react";
import { C, speak, shuffle } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";
import { VOCAB_BANK } from "../data/vocabBank";
import { gradeBand } from "../data/curriculum";
import TashkeelBar from "./TashkeelBar";
import { useRef } from "react";

// اَلْمُفْرَدَاتُ — a dedicated vocabulary trainer.
// Every word in the whole curriculum, split into small sets of ten,
// drilled six different ways. Anything answered wrong comes back.

const SET_SIZE = 10;

function bareWord(w) {
  return String(w).replace(/[\u064B-\u0652\u0670\u0640]/g, "");
}

function buildSets() {
  const seen = new Set();
  const words = [];
  CURRICULUM.lessons.forEach((l) => {
    (l.vocab || []).forEach((v) => {
      const key = v.ar;
      if (seen.has(key)) return;
      seen.add(key);
      if (!v.en) return; // a word with no gloss cannot be drilled both ways
      // find a sentence from this lesson that actually uses the word —
      // a word is remembered far better inside a real sentence than alone
      const bare = (x) => String(x).replace(/[\u064B-\u0652\u0670\u0640]/g, "");
      const ctx = (l.examples || []).find((e) => bare(e.ar).includes(bare(v.ar).split(" ")[0]));
      words.push({
        ar: v.ar, en: v.en, emoji: v.emoji, img: v.img,
        quran: v.quran, quranRef: v.quranRef,
        example: ctx ? ctx.ar : null,
        from: l.title,
      });
    });
  });
  // add the thematic bank on top of the curriculum vocabulary
  VOCAB_BANK.forEach((g) => {
    g.words.forEach((w) => {
      if (seen.has(w.ar)) return;
      seen.add(w.ar);
      words.push({ ar: w.ar, en: w.en, quran: w.quran, from: g.theme, themeEn: g.themeEn });
    });
  });

  const sets = [];
  for (let i = 0; i < words.length; i += SET_SIZE) {
    sets.push(words.slice(i, i + SET_SIZE));
  }
  return sets;
}

export default function Vocabulary({ onExit, onAddWord }) {
  const sets = useMemo(buildSets, []);
  const [view, setView] = useState({ name: "list" });

  if (view.name === "train") {
    return (
      <Trainer
        set={sets[view.i]}
        index={view.i}
        onExit={() => setView({ name: "list" })}
        onAddWord={onAddWord}
      />
    );
  }

  return (
    <div className="fadein">
      <Header title="اَلْمُفْرَدَاتُ" onBack={onExit} />
      <p style={{ textAlign: "center", fontSize: 12, color: C.faded, margin: "4px 0 14px" }}>
        {sets.reduce((n, s) => n + s.length, 0)} words · {sets.length} sets of {SET_SIZE}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {sets.map((set, i) => (
          <button key={i} onClick={() => setView({ name: "train", i })} className="card"
            style={{ flex: "1 1 calc(33% - 6px)", minWidth: 96, padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.emerald }}>{i + 1}</div>
            <div className="arabic" dir="rtl" style={{ fontSize: 15, color: C.ink, marginTop: 2 }}>
              {set[0].ar}
            </div>
            <div style={{ fontSize: 8.5, color: C.faded, marginTop: 1 }}>
              {set[0].themeEn || set[0].from || ""}
            </div>
            <div style={{ fontSize: 9, color: C.faded }}>{set.length} words</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
      <div className="arabic" dir="rtl" style={{ fontSize: 24, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

// ——— build a mixed exercise queue from one set of words ———
function buildQueue(set) {
  const q = [];
  const others = (w) => shuffle(set.filter((x) => x.ar !== w.ar));

  set.forEach((w) => {
    // 1. Arabic → English
    q.push({
      t: "ar2en", w,
      q: w.ar,
      options: shuffle([w.en, ...others(w).slice(0, 3).map((x) => x.en)]),
      a: w.en,
    });
    // 2. English → Arabic
    q.push({
      t: "en2ar", w,
      q: w.en,
      options: shuffle([w.ar, ...others(w).slice(0, 3).map((x) => x.ar)]),
      a: w.ar,
    });
    // 3. missing letter
    const bare = bareWord(w.ar).replace(/\s/g, "");
    if (bare.length >= 3) {
      const pos = 1 + Math.floor(Math.random() * (bare.length - 2));
      const missing = bare[pos];
      const pool = shuffle([missing, ...shuffle("بتثجحخدذرزسشصضطظعغفقكلمنهوي".split("")).filter((c) => c !== missing).slice(0, 3)]);
      q.push({
        t: "missing", w,
        q: bare.slice(0, pos) + "__" + bare.slice(pos + 1),
        options: pool, a: missing,
      });
    }
    // 4. unscramble
    if (bare.length >= 3 && bare.length <= 7) {
      q.push({ t: "scramble", w, letters: bare.split(""), a: bare });
    }
  });

  // 5. matching, in blocks of four
  for (let i = 0; i < set.length; i += 4) {
    const chunk = set.slice(i, i + 4);
    if (chunk.length >= 3) {
      q.push({ t: "match", pairs: chunk.map((w) => [w.ar, w.en]), right: shuffle(chunk.map((w) => w.en)) });
    }
  }

  return shuffle(q);
}

function Trainer({ set, index, onExit, onAddWord }) {
  const [queue, setQueue] = useState(() => buildQueue(set));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [built, setBuilt] = useState([]);
  const [matched, setMatched] = useState({});
  const [selLeft, setSelLeft] = useState(null);
  const [right, setRight] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongWords, setWrongWords] = useState([]);

  const item = queue[pos];

  const finish = (ok, word) => {
    setAttempted((a) => a + 1);
    if (ok) setRight((r) => r + 1);
    else if (word) setWrongWords((ws) => (ws.some((x) => x.ar === word.ar) ? ws : [...ws, word]));
  };

  const next = () => {
    let q = queue;
    // a wrong answer is put back into the queue — it will come round again
    if (picked && !picked.correct) q = [...queue, { ...item, _again: true }];
    setQueue(q);
    setPicked(null); setBuilt([]); setMatched({}); setSelLeft(null);
    if (pos < q.length - 1) setPos(pos + 1);
    else setDone(true);
  };

  if (done) {
    const score = attempted ? Math.round((right / attempted) * 100) : 0;
    const band = gradeBand(score);
    return (
      <div className="fadein">
        <Header title={`مَجْمُوعَةٌ ${index + 1}`} onBack={onExit} />
        <div className="card" style={{ padding: 26, textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: band.color }}>{score}%</div>
          <div className="arabic" dir="rtl" style={{ fontSize: 30, color: band.color }}>{band.ar}</div>
          <div style={{ fontSize: 11, color: C.faded, marginTop: 4 }}>{right} of {attempted} correct</div>
        </div>

        {wrongWords.length > 0 && (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: C.gold }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: "0.12em", textAlign: "center" }}>
              WORDS TO REVISE
            </div>
            <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
              {wrongWords.map((w) => (
                <button key={w.ar} onClick={() => speak(w.ar)}
                  style={{ background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 999, padding: "4px 11px" }}>
                  <span className="arabic" style={{ fontSize: 18 }}>{w.ar}</span>
                  <span style={{ fontSize: 10, color: C.faded, marginRight: 5 }}>{w.en}</span>
                </button>
              ))}
            </div>
            <button
              className="btn-primary arabic"
              style={{ width: "100%", marginTop: 12, fontSize: 19 }}
              onClick={() => { onAddWord?.(wrongWords.map((w) => ({ ar: w.ar, emoji: w.emoji || "📗" }))); onExit(); }}
            >
              أَضِفْهَا إِلَى الْمُرَاجَعَةِ 📿
            </button>
          </div>
        )}

        <button className="card arabic" style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 19 }} onClick={onExit}>
          ← اَلْمَجْمُوعَاتُ
        </button>
      </div>
    );
  }

  const Btn = ({ children, onClick, state, disabled }) => {
    let bg = C.surface, bd = C.border, col = C.ink;
    if (state === "ok") { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
    if (state === "no") { bg = C.redSoft; bd = C.red; col = C.red; }
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 13, padding: "11px 14px", color: col, textAlign: "center" }}>
        {children}
      </button>
    );
  };

  const LABEL = {
    ar2en: "مَا مَعْنَى هَذِهِ الْكَلِمَةِ؟",
    en2ar: "كَيْفَ تَقُولُ هَذَا بِالْعَرَبِيَّةِ؟",
    missing: "أَكْمِلِ الْحَرْفَ النَّاقِصَ",
    scramble: "رَتِّبِ الْحُرُوفَ",
    match: "صِلْ كُلَّ كَلِمَةٍ بِمَعْنَاهَا",
  };
  const LABEL_EN = {
    ar2en: "What does this word mean?",
    en2ar: "How do you say this in Arabic?",
    missing: "Complete the missing letter",
    scramble: "Arrange the letters",
    match: "Match each word to its meaning",
  };

  return (
    <div className="fadein">
      <Header title={`مَجْمُوعَةٌ ${index + 1}`} onBack={onExit} />

      <div style={{ height: 5, background: C.border, borderRadius: 99, margin: "6px 0 4px", overflow: "hidden" }}>
        <div style={{ width: `${(pos / queue.length) * 100}%`, height: "100%", background: C.emerald }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 10, color: C.faded }}>
        {pos + 1} / {queue.length} · {right} ✓
      </p>

      <p className="arabic" dir="rtl" style={{ textAlign: "center", fontSize: 19, color: C.emerald, marginTop: 10 }}>
        {LABEL[item.t]}
      </p>
      <p style={{ textAlign: "center", fontSize: 10.5, color: C.faded, marginBottom: 10 }}>{LABEL_EN[item.t]}</p>

      {/* ——— Arabic → English ——— */}
      {item.t === "ar2en" && (
        <>
          <div className="card" style={{ padding: "22px 14px", textAlign: "center" }}>
            {item.w?.img && <img src={item.w.img} alt="" style={{ maxWidth: 150, maxHeight: 120, objectFit: "contain", marginBottom: 8 }} />}
            <div className="arabic" dir="rtl" style={{ fontSize: 38 }}>{item.q}</div>
            <button onClick={() => speak(item.q)} style={{ marginTop: 8, fontSize: 15, color: C.emerald }}>🔊</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
            {item.options.map((o) => (
              <Btn key={o} disabled={!!picked}
                state={picked ? (o === item.a ? "ok" : o === picked.opt ? "no" : null) : null}
                onClick={() => { const ok = o === item.a; setPicked({ opt: o, correct: ok }); finish(ok, item.w); }}>
                <span style={{ fontSize: 15 }}>{o}</span>
              </Btn>
            ))}
          </div>
        </>
      )}

      {/* ——— English → Arabic ——— */}
      {item.t === "en2ar" && (
        <>
          <div className="card" style={{ padding: "22px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, color: C.ink }}>{item.q}</div>
          </div>
          <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
            {item.options.map((o) => (
              <Btn key={o} disabled={!!picked}
                state={picked ? (o === item.a ? "ok" : o === picked.opt ? "no" : null) : null}
                onClick={() => { const ok = o === item.a; setPicked({ opt: o, correct: ok }); if (ok) speak(o); finish(ok, item.w); }}>
                <span className="arabic" style={{ fontSize: 26 }}>{o}</span>
              </Btn>
            ))}
          </div>
        </>
      )}

      {/* ——— missing letter ——— */}
      {item.t === "missing" && (
        <>
          <div className="card" style={{ padding: "22px 14px", textAlign: "center" }}>
            <div className="arabic" dir="rtl" style={{ fontSize: 38, letterSpacing: 3 }}>
              {picked ? item.q.replace("__", picked.opt) : item.q}
            </div>
            <div style={{ fontSize: 13, color: C.faded, marginTop: 6 }}>{item.w.en}</div>
          </div>
          <div dir="rtl" style={{ display: "flex", gap: 9, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {item.options.map((o) => (
              <Btn key={o} disabled={!!picked}
                state={picked ? (o === item.a ? "ok" : o === picked.opt ? "no" : null) : null}
                onClick={() => { const ok = o === item.a; setPicked({ opt: o, correct: ok }); finish(ok, item.w); }}>
                <span className="arabic" style={{ fontSize: 30, padding: "0 8px" }}>{o}</span>
              </Btn>
            ))}
          </div>
        </>
      )}

      {/* ——— unscramble ——— */}
      {item.t === "scramble" && (
        <>
          <div className="card" style={{ padding: "22px 14px", textAlign: "center", minHeight: 84 }}>
            <div className="arabic" dir="rtl" style={{ fontSize: 36, letterSpacing: 2 }}>
              {built.length ? built.join("") : "..."}
            </div>
            <div style={{ fontSize: 13, color: C.faded, marginTop: 6 }}>{item.w.en}</div>
          </div>
          <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {shuffle([...item.letters]).map((ch, k) => (
              <button key={ch + k} disabled={!!picked}
                onClick={() => {
                  const nb = [...built, ch];
                  setBuilt(nb);
                  if (nb.length === item.letters.length) {
                    const ok = nb.join("") === item.a;
                    setPicked({ opt: nb.join(""), correct: ok });
                    if (ok) speak(item.w.ar);
                    finish(ok, item.w);
                  }
                }}
                style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 15px" }}>
                <span className="arabic" style={{ fontSize: 28 }}>{ch}</span>
              </button>
            ))}
            {built.length > 0 && !picked && (
              <button onClick={() => setBuilt(built.slice(0, -1))}
                style={{ background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: 12, padding: "9px 13px", color: C.red }}>⌫</button>
            )}
          </div>
          {picked && !picked.correct && (
            <div dir="rtl" className="arabic fadein" style={{ textAlign: "center", marginTop: 10, fontSize: 26, color: C.emerald }}>
              ✅ {item.w.ar}
            </div>
          )}
        </>
      )}

      {/* ——— matching ——— */}
      {item.t === "match" && (
        <div dir="rtl" style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {item.pairs.map(([l]) => {
              const doneL = matched[l] !== undefined;
              const ok = doneL && matched[l] === item.pairs.find((p) => p[0] === l)[1];
              return (
                <button key={l} disabled={doneL} onClick={() => setSelLeft(selLeft === l ? null : l)}
                  style={{
                    background: doneL ? (ok ? C.emeraldSoft : C.redSoft) : selLeft === l ? C.goldSoft : C.surface,
                    border: `1.5px solid ${doneL ? (ok ? C.emerald : C.red) : selLeft === l ? C.gold : C.border}`,
                    borderRadius: 12, padding: "10px 6px",
                  }}>
                  <span className="arabic" style={{ fontSize: 21 }}>{l}</span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {item.right.map((r, k) => {
              const used = Object.values(matched).includes(r);
              return (
                <button key={r + k} disabled={used || !selLeft}
                  onClick={() => {
                    const nm = { ...matched, [selLeft]: r };
                    setMatched(nm); setSelLeft(null);
                    if (Object.keys(nm).length === item.pairs.length) {
                      const allOk = item.pairs.every(([l, rr]) => nm[l] === rr);
                      setPicked({ opt: "match", correct: allOk });
                      setAttempted((a) => a + 1);
                      if (allOk) setRight((x) => x + 1);
                      else item.pairs.forEach(([l, rr]) => {
                        if (nm[l] !== rr) {
                          const w = set.find((x) => x.ar === l);
                          if (w) setWrongWords((ws) => (ws.some((x) => x.ar === w.ar) ? ws : [...ws, w]));
                        }
                      });
                    }
                  }}
                  style={{
                    background: used ? C.paper : C.surface, border: `1.5px solid ${C.border}`,
                    borderRadius: 12, padding: "10px 6px", opacity: used ? 0.35 : 1,
                  }}>
                  <span style={{ fontSize: 12.5 }}>{r}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* feedback in context — the word inside a real sentence, plus the Quran where it occurs */}
      {picked && item.w && (
        <div className="card fadein" dir="rtl" style={{
          marginTop: 12, padding: "12px 14px",
          borderColor: picked.correct ? C.emerald : C.gold, borderWidth: 1.5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{picked.correct ? "✅" : "💡"}</span>
            <span className="arabic" style={{ fontSize: 24 }}>{item.w.ar}</span>
            <button onClick={() => speak(item.w.ar)} style={{ fontSize: 14, color: C.emerald }}>🔊</button>
            <span style={{ fontSize: 12.5, color: C.faded }}>{item.w.en}</span>
          </div>

          {item.w.example && (
            <div dir="rtl" style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.1em" }}>فِي جُمْلَةٍ</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span className="arabic" style={{ fontSize: 21 }}>{item.w.example}</span>
                <button onClick={() => speak(item.w.example)} style={{ fontSize: 13, color: C.emerald }}>🔊</button>
              </div>
            </div>
          )}

          {item.w.quran && (
            <div dir="rtl" style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 10,
              background: C.goldSoft, border: `1px solid ${C.gold}`,
            }}>
              <div style={{ fontSize: 9, color: C.gold, letterSpacing: "0.12em" }}>فِي الْقُرْآنِ</div>
              <div className="arabic" style={{ fontSize: 19, lineHeight: 1.9 }}>{item.w.quran}</div>
              {item.w.quranRef && <div style={{ fontSize: 9.5, color: C.faded }}>{item.w.quranRef}</div>}
            </div>
          )}
        </div>
      )}

      {/* context: the word living inside a real sentence, plus its ayah if it has one */}
      {picked && item.w && (item.w.ctx || item.w.quran) && (
        <div className="card fadein" dir="rtl" style={{ marginTop: 12, padding: "12px 14px", borderColor: C.emerald }}>
          {item.w.ctx && (
            <>
              <div style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", textAlign: "center" }}>
                فِي جُمْلَةٍ
              </div>
              <div className="arabic" style={{ fontSize: 22, textAlign: "center", marginTop: 4, lineHeight: 1.9 }}>
                {item.w.ctx}
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                <button onClick={() => speak(item.w.ctx)} style={{ fontSize: 14, color: C.emerald }}>🔊</button>
              </div>
            </>
          )}
          {item.w.quran && (
            <div style={{ marginTop: item.w.ctx ? 10 : 0, paddingTop: item.w.ctx ? 8 : 0, borderTop: item.w.ctx ? `1px dashed ${C.border}` : "none" }}>
              <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.12em", textAlign: "center" }}>
                فِي الْقُرْآنِ
              </div>
              <div className="arabic" style={{ fontSize: 20, textAlign: "center", marginTop: 3, color: C.gold, lineHeight: 1.9 }}>
                {item.w.quran}
              </div>
            </div>
          )}
        </div>
      )}

      {picked && (
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} onClick={next}>
          {picked.correct ? "أَحْسَنْتَ! اَلتَّالِي" : "سَنُعِيدُهَا ↺"}
        </button>
      )}
    </div>
  );
}
