import { useEffect, useRef, useState } from "react";
import { C, speak, callAI, parseJSONLoose, shuffle, markSeen, needsHint } from "../lib/shared";
import TashkeelBar from "./TashkeelBar";
import { gradeBand } from "../data/curriculum";
import { fullDrills } from "../data/drillGen";

function Speaker({ text, size = 22 }) {
  return (
    <button
      onClick={() => speak(text)}
      aria-label="listen"
      style={{
        width: size + 18,
        height: size + 18,
        borderRadius: "50%",
        background: C.emeraldSoft,
        color: C.emerald,
        fontSize: size - 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      🔊
    </button>
  );
}

export function Beads({ total, filled }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "12px 0" }} dir="ltr">
      {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && <div style={{ width: 9, height: 2, background: C.border }} />}
          <div
            style={{
              width: i < filled ? 12 : 9,
              height: i < filled ? 12 : 9,
              borderRadius: "50%",
              background: i < filled ? C.gold : "#DDD8C8",
              boxShadow: i < filled ? `0 0 0 3px ${C.goldSoft}` : "none",
              transition: "all .3s",
            }}
          />
        </div>
      ))}
    </div>
  );
}

const STAGE_LABELS = [
  { id: "intro", ar: "فِي هَذَا الدَّرْسِ", en: "In this lesson" },
  { id: "vocab", ar: "مُفْرَدَات", en: "Vocabulary" },
  { id: "pattern", ar: "أَمْثِلَة", en: "Examples" },
  { id: "rule", ar: "اَلْقَاعِدَة", en: "The Rule" },
  { id: "drill", ar: "تَدْرِيبَات", en: "Practice" },
  { id: "produce", ar: "إِنْتَاج", en: "Write Your Own" },
];

export default function LessonPlayer({ lesson, learnedVocab, onFinish, onProgress, onExit, saved }) {
  // Resume exactly where the learner left off last time.
  const VALID = ["intro", "vocab", "pattern", "rule", "drill", "produce"];
  const [stage, setStage] = useState(
    VALID.includes(saved?.stage) ? saved.stage : "intro"
  );

  // Report progress on EVERY stage change so nothing is ever lost by leaving.
  const goStage = (next) => {
    setStage(next);
    const pct = Math.round(((STAGE_LABELS.findIndex((x) => x.id === next)) / STAGE_LABELS.length) * 100);
    onProgress?.({ stage: next, pct });
  };

  // record each stage view so its English label fades once it's familiar
  useEffect(() => { markSeen(`stage:${stage}`); }, [stage]);
  const [drillScore, setDrillScore] = useState(0);
  const stageIdx = STAGE_LABELS.findIndex((s) => s.id === stage);

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
        <div style={{ textAlign: "center" }}>
          <div className="arabic" dir="rtl" style={{ fontSize: 28, color: C.emerald, fontWeight: 700 }}>{lesson.title}</div>
          <div className="arabic" dir="rtl" style={{ fontSize: 15, color: C.faded }}>{lesson.subtitle}</div>
        </div>
        <div style={{ width: 34 }} />
      </div>

      <div dir="rtl" style={{ display: "flex", justifyContent: "center", gap: 5, margin: "14px 0", flexWrap: "wrap" }}>
        {STAGE_LABELS.map((s, i) => (
          <span
            key={s.id}
            className="arabic"
            style={{
              fontSize: 14,
              padding: "4px 10px",
              borderRadius: 999,
              background: i === stageIdx ? C.emerald : i < stageIdx ? C.emeraldSoft : "transparent",
              color: i === stageIdx ? "#fff" : C.emerald,
              border: `1px solid ${i <= stageIdx ? C.emerald : C.border}`,
              opacity: i > stageIdx ? 0.5 : 1,
            }}
          >
            {i < stageIdx ? "✓ " : ""}{s.ar}
          </span>
        ))}
      </div>

      {needsHint(`stage:${stage}`) && (
        <p style={{ textAlign: "center", fontSize: 11, color: C.faded, margin: "6px 0 10px", letterSpacing: "0.05em" }}>
          {STAGE_LABELS[stageIdx]?.en}
        </p>
      )}

      {/* never let a learner be trapped: a way forward from any stage */}
      {stage !== "produce" && (
        <div style={{ textAlign: "center", marginTop: 4, marginBottom: 6 }}>
          <button
            onClick={() => {
              const order = ["intro", "vocab", "pattern", "rule", "drill", "produce"];
              const nx = order[Math.min(order.indexOf(stage) + 1, order.length - 1)];
              goStage(nx);
            }}
            style={{ fontSize: 11, color: C.faded }}
          >
            تَخَطَّ هَذِهِ الْمَرْحَلَةَ ← skip this stage
          </button>
        </div>
      )}

      {stage === "intro" && <IntroStage lesson={lesson} onDone={() => goStage("vocab")} />}
      {stage === "vocab" && <VocabStage lesson={lesson} onDone={() => goStage("pattern")} />}
      {stage === "pattern" && <PatternStage lesson={lesson} onDone={() => goStage("rule")} />}
      {stage === "rule" && (
        lesson.rule
          ? <RuleStage lesson={lesson} onDone={() => goStage("drill")} />
          : <SkipStage onDone={() => goStage("drill")} />
      )}
      {stage === "drill" && (
        <DrillStage
          lesson={lesson}
          onDone={(score) => {
            setDrillScore(score);
            // graded work done — save the score AND the position
            onProgress?.({ stage: "produce", pct: 80, score });
            setStage("produce");
          }}
        />
      )}
      {stage === "produce" && (
        <ProduceStage lesson={lesson} learnedVocab={learnedVocab} onDone={() => onFinish(drillScore)} />
      )}
    </div>
  );
}

// اَلْمُقَدِّمَةُ — exactly how a Madinah lesson opens:
// state plainly what will be learned, showing the actual sentences.
function IntroStage({ lesson, onDone }) {
  const items = (lesson.examples || []).slice(0, 6);
  return (
    <div className="fadein">
      <div className="card" style={{ padding: "22px 18px" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 23, color: C.emerald, fontWeight: 700, textAlign: "center" }}>
          فِي هَذَا الدَّرْسِ نَتَعَلَّمُ:
        </div>
        <div style={{ fontSize: 11, color: C.faded, textAlign: "center", marginTop: 2 }}>
          In this lesson we learn the following
        </div>

        <div dir="rtl" style={{ marginTop: 16 }}>
          {items.map((e, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "9px 0", borderBottom: i < items.length - 1 ? `1px dashed ${C.border}` : "none",
            }}>
              <span style={{ color: C.gold, fontSize: 13, flexShrink: 0, marginTop: 5 }}>
                {["١","٢","٣","٤","٥","٦"][i]}
              </span>
              <div style={{ flex: 1 }}>
                <div className="arabic" style={{ fontSize: 24, lineHeight: 1.9 }}>{e.ar}</div>
              </div>
              <button onClick={() => speak(e.ar)} style={{ fontSize: 14, color: C.emerald, flexShrink: 0, marginTop: 4 }}>🔊</button>
            </div>
          ))}
        </div>

        {lesson.rule?.name && (
          <div dir="rtl" style={{
            marginTop: 14, padding: "9px 12px", borderRadius: 10,
            background: C.goldSoft, textAlign: "center",
          }}>
            <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.12em" }}>اَلْقَاعِدَةُ</div>
            <div className="arabic" style={{ fontSize: 19, color: C.gold, marginTop: 2 }}>{lesson.rule.name}</div>
          </div>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 12 }}>
        Read them aloud once, then begin. You are not expected to understand yet.
      </p>

      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 10, fontSize: 22 }} onClick={onDone}>
        اِبْدَأْ ←
      </button>
    </div>
  );
}

function VocabStage({ lesson, onDone }) {
  const [peek, setPeek] = useState({});
  const [idx, setIdx] = useState(0);
  const w = lesson.vocab[idx];
  useEffect(() => { speak(w.ar); markSeen(`word:${w.ar}`); }, [idx]); // eslint-disable-line
  const showEn = w.en && needsHint(`word:${w.ar}`);

  return (
    <div>
      <Beads total={lesson.vocab.length} filled={idx + 1} />
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "38px 20px" }}>
        {w.img ? (
          <img src={w.img} alt="" style={{ maxWidth: 200, maxHeight: 160, objectFit: "contain" }} />
        ) : w.emoji ? (
          <div style={{ fontSize: 72 }}>{w.emoji}</div>
        ) : null}
        <div className="arabic" dir="rtl" style={{ fontSize: 52 }}>{w.ar}</div>
        {w.en && (
          <div style={{
            marginTop: 10, padding: "7px 14px", borderRadius: 10, display: "inline-block",
            background: C.emeraldSoft, border: `1px solid ${C.emerald}`,
            fontSize: 15, color: C.emerald, fontWeight: 500,
          }}>
            {w.en}
          </div>
        )}
        {w.quran && (
          <div className="fadein" style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 12,
            background: C.goldSoft, border: `1px solid ${C.gold}`, textAlign: "center",
          }}>
            <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.14em" }}>فِي الْقُرْآنِ</div>
            <div className="arabic" dir="rtl" style={{ fontSize: 21, marginTop: 3, lineHeight: 1.9 }}>{w.quran}</div>
            {w.quranRef && <div style={{ fontSize: 10, color: C.faded, marginTop: 2 }}>{w.quranRef}</div>}
          </div>
        )}
        <div style={{ marginTop: 12 }}><Speaker text={w.ar} size={26} /></div>
      </div>
      <div dir="rtl" style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          className="btn-primary arabic"
          style={{ flex: 1, fontSize: 22 }}
          onClick={() => (idx < lesson.vocab.length - 1 ? setIdx(idx + 1) : onDone())}
        >
          {idx === lesson.vocab.length - 1 ? "تَمَّ ✓" : "اَلتَّالِي →"}
        </button>
        <button
          className="card"
          disabled={idx === 0}
          onClick={() => setIdx(Math.max(0, idx - 1))}
          style={{ padding: "0 16px", opacity: idx === 0 ? 0.3 : 1 }}
        >
          <span className="arabic" style={{ fontSize: 17, color: C.faded }}>← السَّابِقُ</span>
        </button>
      </div>
    </div>
  );
}

// Words appearing in an example that the learner has not met enough times yet
function newWordsIn(sentence, lesson) {
  const bare = (t) => String(t).replace(/[\u064B-\u0652\u0670\u0640]/g, "");
  const b = bare(sentence);
  return (lesson.vocab || []).filter((v) => v.en && b.includes(bare(v.ar)) && needsHint(`w:${v.ar}`));
}

function PatternStage({ lesson, onDone }) {
  const [n, setN] = useState(1);
  const all = lesson.examples;
  return (
    <div>
      <Beads total={all.length} filled={n} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {all.slice(0, n).map((ex, i) => (
          <div key={i} dir="rtl" className="card fadein" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 26 }}>{ex.emoji}</span>
              <span className="arabic" style={{ fontSize: 28 }}>{ex.ar}</span>
            </div>
            <Speaker text={ex.ar} size={16} />
          </div>
        ))}
      </div>
      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 18, fontSize: 22 }}
        onClick={() => (n < all.length ? setN(n + 1) : onDone())}>
        {n < all.length ? "اَلتَّالِي" : "فَهِمْتُ ✓"}
      </button>
    </div>
  );
}

// If a lesson has no rule section, never strand the learner here.
function SkipStage({ onDone }) {
  return (
    <div className="fadein">
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded }}>
          لَا قَاعِدَةَ فِي هَذَا الدَّرْسِ
        </div>
        <div style={{ fontSize: 11, color: C.faded, marginTop: 4 }}>
          This lesson has no grammar section — go straight to the practice.
        </div>
      </div>
      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} onClick={onDone}>
        إِلَى التَّدْرِيبَاتِ ←
      </button>
    </div>
  );
}

function RuleStage({ lesson, onDone }) {
  // A rule is TAUGHT one step at a time, not dumped as a summary.
  // Each step: a plain-English explanation, then the Arabic it produces.
  const steps = lesson.rule.teach || null;
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(false);

  if (!steps || !steps.length) {
    // legacy lessons that have no teaching sequence yet
    return (
      <div className="fadein">
        <div className="card" style={{ padding: "26px 20px", borderColor: C.gold, borderWidth: 1.5 }}>
          <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.gold, fontWeight: 700, textAlign: "center" }}>
            {lesson.rule.name}
          </div>
          <div className="arabic" dir="rtl" style={{ fontSize: 26, marginTop: 16, whiteSpace: "pre-line", textAlign: "center" }}>
            {lesson.rule?.ar || lesson.rule?.name || "—"}
          </div>
          {lesson.rule?.hint && (
            <div dir="ltr" style={{ fontSize: 13, color: C.faded, marginTop: 12, lineHeight: 1.7, textAlign: "left" }}>
              {lesson.rule.hint}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <Speaker text={lesson.rule.ar} size={20} />
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => setHint(!hint)} style={{ color: C.faded, fontSize: 13 }}>؟</button>
          {hint && (
            <div className="card fadein" style={{ padding: 12, marginTop: 8, fontSize: 13, color: C.faded }}>
              {lesson.rule.hint}
            </div>
          )}
        </div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 16, fontSize: 22 }} onClick={onDone}>
          إِلَى التَّدْرِيبَاتِ ←
        </button>
      </div>
    );
  }

  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fadein">
      <div className="arabic" dir="rtl" style={{ fontSize: 24, color: C.gold, fontWeight: 700, textAlign: "center" }}>
        {lesson.rule.name}
      </div>

      {/* progress through the teaching steps */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, margin: "10px 0 14px" }}>
        {steps.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`step ${k + 1}`}
            style={{
              width: k === i ? 20 : 9, height: 9, borderRadius: 99, border: "none", padding: 0,
              background: k <= i ? C.gold : C.border, transition: "width .2s",
            }} />
        ))}
      </div>

      <div className="card fadein" key={i} style={{ padding: "20px 18px", borderColor: C.gold }}>
        {/* the explanation, in plain language */}
        <p style={{ fontSize: 14.5, lineHeight: 1.75, color: C.ink, margin: 0 }}>{step.say}</p>

        {/* the Arabic it produces */}
        {step.show && (
          <div dir="rtl" style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 12,
            background: C.emeraldSoft, border: `1px solid ${C.emerald}`,
          }}>
            <div className="arabic" style={{ fontSize: 25, lineHeight: 2, whiteSpace: "pre-line", textAlign: "center" }}>
              {step.show}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <Speaker text={String(step.show).split("\n")[0]} size={17} />
            </div>
          </div>
        )}

        {/* the warning / common mistake */}
        {step.warn && (
          <div dir="rtl" style={{
            marginTop: 10, padding: "10px 12px", borderRadius: 10,
            background: C.redSoft, border: `1px solid ${C.red}`,
          }}>
            <div className="arabic" style={{ fontSize: 20, color: C.red, whiteSpace: "pre-line", textAlign: "center" }}>
              {step.warn}
            </div>
          </div>
        )}
      </div>

      <div dir="rtl" style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          className="btn-primary arabic"
          style={{ flex: 1, fontSize: 21 }}
          onClick={() => { markSeen(`w:${w.ar}`); last ? onDone() : setI(i + 1); }}
        >
          {last ? "إِلَى التَّدْرِيبَاتِ ←" : "اَلتَّالِي →"}
        </button>
        <button
          className="card"
          disabled={i === 0}
          onClick={() => setI(Math.max(0, i - 1))}
          style={{ padding: "0 16px", opacity: i === 0 ? 0.3 : 1 }}
        >
          <span className="arabic" style={{ fontSize: 17, color: C.faded }}>← السَّابِقُ</span>
        </button>
      </div>
      {last && lesson.rule.extra && (
        <div className="card fadein" dir="rtl" style={{ marginTop: 12, padding: 14, borderColor: C.gold }}>
          <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.12em", textAlign: "center" }}>
            زِيَادَةُ شَرْحٍ
          </div>
          <div className="arabic" style={{ fontSize: 21, whiteSpace: "pre-line", lineHeight: 2, marginTop: 6 }}>
            {lesson.rule.extra}
          </div>
        </div>
      )}
      <p style={{ textAlign: "center", fontSize: 10.5, color: C.faded, marginTop: 8 }}>
        Step {i + 1} of {steps.length}
      </p>
    </div>
  );
}


function normalizeDrill(d) {
  if (d.t === "mcq") return { ...d, options: shuffle(d.options) };
  if (d.t === "assemble") return { ...d, pool: shuffle(d.chips) };
  if (d.t === "match") return { ...d, right: shuffle(d.pairs.map((p) => p[1])) };
  if (d.t === "arrange") return { ...d, pool: shuffle(d.letters) };
  if (d.t === "complete") return { ...d, options: shuffle(d.options) };
  return d;
}

function DrillStage({ lesson, onDone }) {
  const [queue, setQueue] = useState(() => shuffle(fullDrills(lesson)).map(normalizeDrill));
  const [pos, setPos] = useState(0);
  const [firstTry, setFirstTry] = useState({ right: 0, total: lesson.drills.length });
  const [picked, setPicked] = useState(null);
  const [attempts, setAttempts] = useState(0); // wrong attempts on the current item
  const [eliminated, setEliminated] = useState([]); // options removed as a hint
  const [matched, setMatched] = useState({});       // match drill: left -> right
  const [selLeft, setSelLeft] = useState(null);     // match drill: selected left item
  const [built, setBuilt] = useState([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const item = queue[pos];
  const isRetry = pos >= firstTry.total;

  const answerMcq = (opt) => {
    if (picked) return;
    const correct = opt === item.a;
    if (correct) {
      setPicked({ opt, correct: true, revealed: false });
      speak(item.a);
      if (!isRetry && !item._requeued) setFirstTry((f) => ({ ...f, right: f.right + 1 }));
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts === 1) {
      // 1st wrong: show it's wrong, let them try again — no answer revealed
      markSeen("instr:retry");
      setPicked({ opt, correct: false, revealed: false, stage: "retry" });
      return;
    }
    if (nextAttempts === 2) {
      // 2nd wrong: give a hint by eliminating one other wrong option
      const others = item.options.filter((o) => o !== item.a && o !== opt && !eliminated.includes(o));
      if (others.length) setEliminated((e) => [...e, others[0]]);
      markSeen("instr:hint");
      setPicked({ opt, correct: false, revealed: false, stage: "hint" });
      return;
    }
    // 3rd wrong: reveal the correct answer and move on
    markSeen("instr:reveal");
    setPicked({ opt, correct: false, revealed: true, stage: "reveal" });
    speak(item.a);
  };

  const chipTap = (chip, i) => {
    const nb = [...built, chip];
    setBuilt(nb);
    if (nb.length === item.chips.length) {
      const correct = nb.join(" ") === item.a;
      setPicked({ opt: nb.join(" "), correct, revealed: !correct });
      speak(item.a);
      if (correct && !isRetry && !item._requeued) setFirstTry((f) => ({ ...f, right: f.right + 1 }));
    }
  };

  const next = () => {
    let q = queue;
    if (picked && !picked.correct && picked.revealed) {
      // only requeue if they never got it right — a retry-recovered correct doesn't requeue
      q = [...queue, normalizeDrill({ ...item, _requeued: true })];
      setQueue(q);
    }
    setPicked(null);
    setBuilt([]);
    setAttempts(0);
    setEliminated([]);
    setMatched({});
    setSelLeft(null);
    if (pos < q.length - 1) setPos(pos + 1);
    else setFinished(true);
  };

  const tryAgain = () => setPicked(null);

  const moreDrills = async () => {
    setExtraLoading(true);
    try {
      const vocab = lesson.vocab.map((v) => `${v.ar} ${v.emoji}`).join("، ");
      const text = await callAI({
        mode: "drills",
        prompt: `Lesson grammar: ${lesson.rule.name}. Vocabulary: ${vocab}. Generate 5 mcq drills at this exact level.`,
      });
      const items = parseJSONLoose(text)
        .filter((d) => d.t === "mcq" && Array.isArray(d.options) && d.options.includes(d.a))
        .map((d) => normalizeDrill({ ...d, _requeued: true }));
      if (items.length) {
        setQueue((q) => [...q, ...items]);
        setFinished(false);
        setPos(queue.length);
      }
    } catch {
      // AI extras unavailable — authored drills still work
    } finally {
      setExtraLoading(false);
    }
  };

  if (finished) {
    const score = Math.round((firstTry.right / firstTry.total) * 100);
    const band = gradeBand(score);
    return (
      <div className="card fadein" style={{ padding: 28, textAlign: "center" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded }}>نَتِيجَةُ التَّدْرِيبَاتِ</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: band.color, marginTop: 6 }}>{score}%</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 34, color: band.color }}>{band.ar}</div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 20, fontSize: 21 }} onClick={() => onDone(score)}>
          إِلَى الْإِنْتَاجِ ←
        </button>
        <button
          className="arabic"
          disabled={extraLoading}
          onClick={moreDrills}
          style={{ marginTop: 12, color: C.gold, fontSize: 19 }}
        >
          {extraLoading ? "..." : "تَدْرِيبَاتٌ إِضَافِيَّةٌ ➕"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <Beads total={firstTry.total} filled={firstTry.right} />
      <div className="card" style={{ padding: "26px 18px", textAlign: "center" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 30 }}>{item.q}</div>
      </div>

      {item.t === "mcq" && (
        <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {item.options.map((opt) => {
            const isEliminated = eliminated.includes(opt);
            let bg = C.surface, bd = C.border, col = C.ink;
            if (picked) {
              if (picked.revealed && opt === item.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
              else if (picked.correct && opt === item.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
              else if (opt === picked.opt) { bg = C.redSoft; bd = C.red; col = C.red; }
            }
            return (
              <button key={opt} onClick={() => !isEliminated && answerMcq(opt)} disabled={isEliminated}
                style={{
                  background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "12px 14px",
                  opacity: isEliminated ? 0.3 : 1, textDecoration: isEliminated ? "line-through" : "none",
                }}>
                <span className="arabic" style={{ fontSize: 26, color: col }}>{opt}</span>
              </button>
            );
          })}
          {picked && !picked.correct && picked.stage === "retry" && (
            <div dir="rtl" style={{ textAlign: "center", color: C.red, fontSize: 18 }} className="arabic fadein">
              ❌ حَاوِلْ مَرَّةً أُخْرَى
              {needsHint("instr:retry") && (
                <div style={{ fontSize: 11, color: C.faded, fontStyle: "italic" }}>Try again</div>
              )}
            </div>
          )}
          {picked && !picked.correct && picked.stage === "hint" && (
            <div dir="rtl" style={{ textAlign: "center", color: C.gold, fontSize: 18 }} className="arabic fadein">
              💡 إِلَيْكَ تَلْمِيحٌ: حَذَفْنَا خِيَارًا خَاطِئًا — حَاوِلْ مَرَّةً أَخِيرَةً
              {needsHint("instr:hint") && (
                <div style={{ fontSize: 11, color: C.faded, fontStyle: "italic" }}>Hint: one wrong option removed — last try</div>
              )}
            </div>
          )}
          {picked && (picked.revealed || picked.correct) && (item.why || item.a) && (
            <div className="card fadein" dir="rtl" style={{
              marginTop: 10, padding: "12px 14px",
              borderColor: picked.correct ? C.emerald : C.gold, borderWidth: 1.5,
            }}>
              {!picked.correct && (
                <div className="arabic" style={{ fontSize: 19, color: C.faded }}>
                  اَلْجَوَابُ الصَّحِيحُ: <span style={{ color: C.emerald, fontWeight: 700 }}>{item.a}</span>
                </div>
              )}
              {item.why && (
                <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.7, marginTop: 6, direction: "ltr", textAlign: "left" }}>
                  {item.why}
                </div>
              )}
              {item.example && (
                <div className="arabic" dir="rtl" style={{
                  fontSize: 21, marginTop: 8, padding: "8px 12px", borderRadius: 10,
                  background: C.emeraldSoft, color: C.emerald, textAlign: "center",
                }}>
                  {item.example}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                <Speaker text={item.example || item.a} size={16} />
              </div>
            </div>
          )}
          {false && (
            <div dir="rtl" style={{ textAlign: "center", color: C.faded, fontSize: 18 }} className="arabic fadein">
              <span>{item.a}</span>
              {needsHint("instr:reveal") && (
                <div style={{ fontSize: 11, color: C.faded, fontStyle: "italic" }}>The correct answer</div>
              )}
            </div>
          )}
        </div>
      )}

      {item.t === "arrange" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ textAlign: "center", fontSize: 12, color: C.faded, marginBottom: 8 }}>
            رَتِّبِ الْحُرُوفَ لِتُكَوِّنَ الْكَلِمَةَ
            {needsHint("instr:arrange") && <span style={{ display: "block", fontSize: 10.5 }}>Arrange the letters to form the word</span>}
          </p>
          <div className="card" style={{ padding: "18px 14px", textAlign: "center", minHeight: 60 }}>
            <span className="arabic" dir="rtl" style={{ fontSize: 34, letterSpacing: 2 }}>
              {built.length ? built.join("") : "..."}
            </span>
          </div>
          <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" }}>
            {item.pool.map((ch, k) => {
              const used = built.filter((b) => b === ch).length >= item.pool.filter((x) => x === ch).length;
              return (
                <button key={ch + k} disabled={picked || used}
                  onClick={() => {
                    const nb = [...built, ch];
                    setBuilt(nb);
                    if (nb.length === item.letters.length) {
                      markSeen("instr:arrange");
                      const ok = nb.join("") === item.a;
                      setPicked({ opt: nb.join(""), correct: ok, revealed: !ok });
                      if (ok && !isRetry && !item._requeued) setFirstTry((f) => ({ ...f, right: f.right + 1 }));
                    }
                  }}
                  style={{
                    background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12,
                    padding: "10px 16px", opacity: used ? 0.3 : 1,
                  }}>
                  <span className="arabic" style={{ fontSize: 28 }}>{ch}</span>
                </button>
              );
            })}
            {built.length > 0 && !picked && (
              <button onClick={() => setBuilt(built.slice(0, -1))}
                style={{ background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: 12, padding: "10px 14px", color: C.red }}>
                ⌫
              </button>
            )}
          </div>
          {picked && picked.revealed && (
            <div dir="rtl" className="arabic fadein" style={{ textAlign: "center", marginTop: 10, fontSize: 24, color: C.emerald }}>
              ✅ {item.a}
            </div>
          )}
        </div>
      )}

      {item.t === "complete" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ textAlign: "center", fontSize: 12, color: C.faded, marginBottom: 8 }}>
            أَكْمِلِ النَّاقِصَ
            {needsHint("instr:complete") && <span style={{ display: "block", fontSize: 10.5 }}>Complete the missing part</span>}
          </p>
          <div className="card" style={{ padding: "20px 14px" }}>
            <div className="arabic" dir="rtl" style={{ fontSize: 26, textAlign: "center", lineHeight: 2 }}>
              {item.q.split("___").map((part, k, arr) => (
                <span key={k}>
                  {part}
                  {k < arr.length - 1 && (
                    <span style={{
                      display: "inline-block", minWidth: 70, borderBottom: `2px dashed ${picked ? (picked.correct ? C.emerald : C.red) : C.gold}`,
                      color: picked ? (picked.correct ? C.emerald : C.red) : C.gold, textAlign: "center",
                    }}>
                      {picked ? picked.opt : "؟"}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" }}>
            {item.options.map((o) => (
              <button key={o} disabled={!!picked}
                onClick={() => {
                  markSeen("instr:complete");
                  const ok = o === item.a;
                  setPicked({ opt: o, correct: ok, revealed: !ok });
                  if (ok && !isRetry && !item._requeued) setFirstTry((f) => ({ ...f, right: f.right + 1 }));
                }}
                style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 16px" }}>
                <span className="arabic" style={{ fontSize: 23 }}>{o}</span>
              </button>
            ))}
          </div>
          {picked && picked.revealed && (
            <div dir="rtl" className="arabic fadein" style={{ textAlign: "center", marginTop: 10, fontSize: 22, color: C.emerald }}>
              ✅ {item.a}
            </div>
          )}
        </div>
      )}

      {item.t === "match" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginBottom: 8 }}>
            {needsHint("instr:match") ? "Tap a word, then tap its meaning" : ""}
          </p>
          <div dir="rtl" style={{ display: "flex", gap: 10 }}>
            {/* left column: the Arabic words */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {item.pairs.map(([left]) => {
                const done = matched[left] !== undefined;
                const ok = done && matched[left] === item.pairs.find((p) => p[0] === left)[1];
                const sel = selLeft === left;
                return (
                  <button key={left} disabled={done}
                    onClick={() => setSelLeft(sel ? null : left)}
                    style={{
                      background: done ? (ok ? C.emeraldSoft : C.redSoft) : sel ? C.goldSoft : C.surface,
                      border: `1.5px solid ${done ? (ok ? C.emerald : C.red) : sel ? C.gold : C.border}`,
                      borderRadius: 12, padding: "10px 8px",
                    }}>
                    <span className="arabic" style={{ fontSize: 21, color: done ? (ok ? C.emerald : C.red) : C.ink }}>{left}</span>
                  </button>
                );
              })}
            </div>
            {/* right column: the meanings */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {item.right.map((r, i) => {
                const usedBy = Object.keys(matched).find((k) => matched[k] === r);
                return (
                  <button key={r + i} disabled={!!usedBy || !selLeft}
                    onClick={() => {
                      if (!selLeft) return;
                      const next = { ...matched, [selLeft]: r };
                      setMatched(next);
                      setSelLeft(null);
                      if (Object.keys(next).length === item.pairs.length) {
                        const allRight = item.pairs.every(([l, rr]) => next[l] === rr);
                        markSeen("instr:match");
                        setPicked({ opt: "match", correct: allRight, revealed: !allRight });
                        if (allRight && !isRetry && !item._requeued) setFirstTry((f) => ({ ...f, right: f.right + 1 }));
                      }
                    }}
                    style={{
                      background: usedBy ? C.paper : C.surface,
                      border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 8px",
                      opacity: usedBy ? 0.35 : 1,
                    }}>
                    <span className="arabic" style={{ fontSize: 19 }}>{r}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {picked && picked.revealed && (
            <div dir="rtl" className="fadein" style={{ marginTop: 10, padding: 10, borderRadius: 10, background: C.goldSoft }}>
              {item.pairs.map(([l, r]) => (
                <div key={l} className="arabic" style={{ fontSize: 17 }}>{l} ← {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {item.t === "assemble" && (
        <div style={{ marginTop: 16 }}>
          <div dir="rtl" className="card" style={{ minHeight: 60, padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderStyle: "dashed" }}>
            {built.map((b, i) => (
              <span key={i} className="arabic" style={{ fontSize: 26, background: C.emeraldSoft, borderRadius: 10, padding: "2px 10px" }}>{b}</span>
            ))}
            {built.length === 0 && <span className="arabic" style={{ color: C.faded, fontSize: 18 }}>رَتِّبِ الْكَلِمَاتِ...</span>}
          </div>
          <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
            {item.pool.filter((c) => {
              const used = built.filter((b) => b === c).length;
              const avail = item.chips.filter((x) => x === c).length;
              return used < avail;
            }).map((chip, i) => (
              <button key={chip + i} onClick={() => !picked && chipTap(chip, i)}
                style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "8px 14px" }}>
                <span className="arabic" style={{ fontSize: 26 }}>{chip}</span>
              </button>
            ))}
          </div>
          {picked && (
            <div dir="rtl" className="fadein" style={{ textAlign: "center", marginTop: 12 }}>
              <span className="arabic" style={{ fontSize: 24, color: picked.correct ? C.emerald : C.red }}>
                {picked.correct ? "✅" : `❌ → ${item.a}`}
              </span>
            </div>
          )}
        </div>
      )}

      {picked && (picked.stage === "retry" || picked.stage === "hint") && (
        <button className="btn-primary arabic" onClick={tryAgain}
          style={{ width: "100%", marginTop: 16, fontSize: 21, background: C.gold }}>
          حَاوِلْ مَرَّةً أُخْرَى ↺
        </button>
      )}
      {/* immediate feedback that explains, never a bare "wrong" */}
      {picked && (picked.correct || picked.revealed) && (
        <div className="card fadein" dir="rtl" style={{
          marginTop: 12, padding: "12px 14px",
          borderColor: picked.correct ? C.emerald : C.gold, borderWidth: 1.5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 17 }}>{picked.correct ? "✅" : "💡"}</span>
            <span className="arabic" style={{ fontSize: 19, color: picked.correct ? C.emerald : C.gold, fontWeight: 700 }}>
              {picked.correct ? "أَحْسَنْتَ" : "اَلْجَوَابُ الصَّحِيحُ"}
            </span>
            <span className="arabic" style={{ fontSize: 21, color: C.ink }}>{item.a}</span>
            <Speaker text={String(item.a)} size={15} />
          </div>

          {/* why it is right */}
          {item.why && (
            <p style={{ fontSize: 13, lineHeight: 1.65, color: C.ink, margin: "4px 0 0" }}>{item.why}</p>
          )}

          {/* what the wrong choice would have meant */}
          {!picked.correct && item.wrongWhy && item.wrongWhy[picked.opt] && (
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: C.red, margin: "6px 0 0" }}>
              ❌ {item.wrongWhy[picked.opt]}
            </p>
          )}

          {/* an example sentence using it */}
          {item.example && (
            <div dir="rtl" style={{
              marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <span className="arabic" style={{ fontSize: 20 }}>{item.example}</span>
              <Speaker text={item.example} size={14} />
            </div>
          )}
        </div>
      )}

      {picked && (picked.correct || picked.revealed) && (
        <button className="btn-primary arabic" onClick={next}
          style={{ width: "100%", marginTop: 16, fontSize: 21, background: picked.correct ? C.emerald : C.gold }}>
          {picked.correct ? "أَحْسَنْتَ! اَلتَّالِي" : "فَهِمْتُ، اَلتَّالِي"}
        </button>
      )}
    </div>
  );
}

function ProduceStage({ lesson, learnedVocab, onDone }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const taRef = useRef(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(false);
    try {
      const vocab = learnedVocab.map((v) => v.ar).join("، ");
      const raw = await callAI({
        mode: "grade",
        prompt: `Known vocabulary: ${vocab}. Grammar covered: ${lesson.rule.name}. Task: ${lesson.production}\nStudent wrote:\n${text}`,
      });
      setResult(parseJSONLoose(raw));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { markSeen("instr:production"); }, []);

  return (
    <div className="fadein">
      <div className="card" style={{ padding: 18 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 24, textAlign: "center" }}>{lesson.production}</div>
        {lesson.productionEn && needsHint("instr:production") && (
          <div style={{ fontSize: 12, color: C.faded, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
            {lesson.productionEn}
          </div>
        )}
      </div>
      <textarea
        ref={taRef}
        dir="rtl"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اُكْتُبْ هُنَا... (write here)"
        className="arabic"
        style={{
          width: "100%", minHeight: 120, marginTop: 14, padding: 14, fontSize: 24,
          background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, resize: "vertical",
        }}
      />
      <TashkeelBar targetRef={taRef} />
      {result && (
        <div className="card fadein" style={{ padding: 16, marginTop: 12, borderColor: C.gold }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: gradeBand(result.score).color, textAlign: "center" }}>
            {result.score}% · <span className="arabic">{gradeBand(result.score).ar}</span>
          </div>
          <div className="arabic" dir="rtl" style={{ fontSize: 22, marginTop: 8, whiteSpace: "pre-line" }}>
            {result.feedback}
          </div>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 13, textAlign: "center" }}>
          Grading didn't respond — check the connection and try again, or finish the lesson and come back.
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }} dir="rtl">
        {!result && (
          <button className="btn-primary arabic" style={{ flex: 1, fontSize: 21 }} disabled={loading} onClick={submit}>
            {loading ? "..." : "صَحِّحْ لِي ✓"}
          </button>
        )}
        <button
          className="arabic"
          onClick={onDone}
          style={{
            flex: 1, fontSize: 21, borderRadius: 14, padding: "13px 18px",
            background: result ? C.emerald : C.surface,
            color: result ? "#fff" : C.faded,
            border: result ? "none" : `1px solid ${C.border}`,
            fontWeight: 600,
          }}
        >
          إِنْهَاءُ الدَّرْسِ ✓
        </button>
      </div>
    </div>
  );
}
