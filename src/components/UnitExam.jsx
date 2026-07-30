import { useMemo, useState } from "react";
import { C, speak, shuffle } from "../lib/shared";
import { CURRICULUM, UNITS, gradeBand } from "../data/curriculum";

// اِمْتِحَانُ الْوَحْدَةِ — the exam that closes a unit.
// Questions are drawn from EVERY lesson in the unit, so nothing can be skipped.
// Below the pass mark the learner is shown exactly which lessons let them down.

const PASS = 80;

function buildExam(unit, lessons) {
  const pool = [];
  unit.lessons.forEach((id) => {
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    const drills = (l.drills || []).filter((d) => d.t === "mcq" || d.t === "complete");
    // two from every lesson, so the exam covers the whole unit evenly
    shuffle(drills).slice(0, 2).forEach((d) => {
      pool.push({ ...d, options: shuffle([...(d.options || [])]), lesson: l.title, lessonId: l.id });
    });
  });
  return shuffle(pool);
}

export default function UnitExam({ unitId, lessons, onExit, onPassed }) {
  const unit = UNITS.find((u) => u.id === unitId);
  const [attempt, setAttempt] = useState(0);
  const items = useMemo(() => buildExam(unit, lessons), [unitId, attempt]);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const [wrongBy, setWrongBy] = useState({});   // lesson title -> count wrong
  const [done, setDone] = useState(false);

  if (!unit) return null;

  const restart = () => {
    setAttempt((a) => a + 1);
    setPos(0); setPicked(null); setRight(0); setWrongBy({}); setDone(false);
  };

  if (done) {
    const score = Math.round((right / items.length) * 100);
    const band = gradeBand(score);
    const passed = score >= PASS;
    if (passed) onPassed?.(unitId, score);
    const weak = Object.entries(wrongBy).sort((a, b) => b[1] - a[1]);

    return (
      <div className="fadein">
        <Header title={`اِمْتِحَانُ ${unit.ar}`} onBack={onExit} />
        <div className="card" style={{ padding: 28, textAlign: "center", marginTop: 12, borderColor: passed ? C.emerald : C.gold, borderWidth: 1.5 }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: band.color }}>{score}%</div>
          <div className="arabic" dir="rtl" style={{ fontSize: 32, color: band.color }}>{band.ar}</div>
          <div style={{ fontSize: 12, color: C.faded, marginTop: 6 }}>
            {right} of {items.length} correct · pass mark {PASS}%
          </div>
          <div className="arabic" dir="rtl" style={{ fontSize: 22, marginTop: 12, color: passed ? C.emerald : C.gold }}>
            {passed ? "نَجَحْتَ ✓ بَارَكَ اللهُ فِيكَ" : "لَمْ تَنْجَحْ بَعْدُ — أَعِدِ الْمُحَاوَلَةَ"}
          </div>
        </div>

        {!passed && weak.length > 0 && (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: C.gold }}>
            <div style={{ fontSize: 10.5, color: C.gold, letterSpacing: "0.12em", textAlign: "center" }}>
              GO BACK OVER THESE LESSONS
            </div>
            <div dir="rtl" style={{ marginTop: 8 }}>
              {weak.slice(0, 5).map(([title, n]) => (
                <div key={title} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px dashed ${C.border}` }}>
                  <span className="arabic" style={{ fontSize: 19 }}>{title}</span>
                  <span dir="ltr" style={{ fontSize: 11, color: C.red }}>{n} wrong</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn-primary arabic" style={{ flex: 1, fontSize: 20 }} onClick={restart}>
            ↺ أَعِدِ الِامْتِحَانَ
          </button>
          <button className="card arabic" style={{ flex: 1, padding: 12, fontSize: 20 }} onClick={onExit}>
            ← اَلدُّرُوسُ
          </button>
        </div>
      </div>
    );
  }

  const item = items[pos];
  if (!item) {
    return (
      <div className="fadein">
        <Header title={unit.ar} onBack={onExit} />
        <div className="card" style={{ padding: 24, textAlign: "center", marginTop: 14, color: C.faded }}>
          <div className="arabic" dir="rtl" style={{ fontSize: 20 }}>لَا تُوجَدُ أَسْئِلَةٌ بَعْدُ</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>No questions available for this unit yet.</div>
        </div>
      </div>
    );
  }

  const choose = (o) => {
    if (picked) return;
    const ok = o === item.a;
    setPicked({ o, ok });
    if (ok) setRight((r) => r + 1);
    else setWrongBy((w) => ({ ...w, [item.lesson]: (w[item.lesson] || 0) + 1 }));
  };

  const next = () => {
    setPicked(null);
    if (pos < items.length - 1) setPos(pos + 1);
    else setDone(true);
  };

  return (
    <div className="fadein">
      <Header title={`اِمْتِحَانُ ${unit.ar}`} onBack={onExit} />

      <div style={{ height: 6, background: C.border, borderRadius: 99, margin: "8px 0 4px", overflow: "hidden" }}>
        <div style={{ width: `${(pos / items.length) * 100}%`, height: "100%", background: C.gold }} />
      </div>
      <p dir="ltr" style={{ textAlign: "center", fontSize: 10, color: C.faded }}>
        {pos + 1} / {items.length} · {right} correct
      </p>

      <div className="card" style={{ padding: "22px 16px", marginTop: 8 }}>
        <div style={{ fontSize: 9.5, color: C.faded, textAlign: "center", letterSpacing: "0.1em" }}>
          {item.lesson}
        </div>
        <div className="arabic" dir="rtl" style={{ fontSize: 25, textAlign: "center", marginTop: 8, lineHeight: 1.9 }}>
          {item.q}
        </div>
      </div>

      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        {(item.options || []).map((o) => {
          let bg = C.surface, bd = C.border, col = C.ink;
          if (picked) {
            if (o === item.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
            else if (o === picked.o) { bg = C.redSoft; bd = C.red; col = C.red; }
          }
          return (
            <button key={o} onClick={() => choose(o)} disabled={!!picked}
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 13, padding: "11px 14px", textAlign: "right" }}>
              <span className="arabic" style={{ fontSize: 22, color: col }}>{o}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <>
          {item.why && (
            <div className="card fadein" dir="rtl" style={{ marginTop: 10, padding: "12px 14px", borderColor: picked.ok ? C.emerald : C.gold }}>
              <div dir="ltr" style={{ fontSize: 13, color: C.ink, lineHeight: 1.7, textAlign: "left" }}>{item.why}</div>
              {item.example && (
                <div className="arabic" style={{ fontSize: 21, marginTop: 8, textAlign: "center", color: C.emerald }}>
                  {item.example}
                  <button onClick={() => speak(item.example)} style={{ fontSize: 14, marginRight: 8, color: C.emerald }}>🔊</button>
                </div>
              )}
            </div>
          )}
          <button className="btn-primary arabic" style={{ width: "100%", marginTop: 12, fontSize: 21 }} onClick={next}>
            {pos < items.length - 1 ? "اَلتَّالِي →" : "اَلنَّتِيجَةُ ✓"}
          </button>
        </>
      )}
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
      <div className="arabic" dir="rtl" style={{ fontSize: 21, color: C.gold, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}
