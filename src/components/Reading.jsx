import { useState } from "react";
import { C, speak } from "../lib/shared";
import { PASSAGES } from "../data/passages";

// اَلْقِرَاءَةُ — continuous texts and dialogues, the way the Madinah books teach.
// Each passage uses only what has already been taught, then asks about it.

export default function Reading({ unlockedIds = [], onExit }) {
  const [open, setOpen] = useState(null);

  if (open) return <Passage p={open} onBack={() => setOpen(null)} />;

  return (
    <div className="fadein">
      <Header title="اَلْقِرَاءَةُ" onBack={onExit} />
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, marginBottom: 12 }}>
        Every passage uses only what you have already been taught
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PASSAGES.map((p) => {
          const ready = !unlockedIds.length || unlockedIds.includes(p.after);
          return (
            <button key={p.id} dir="rtl" className="card" disabled={!ready}
              onClick={() => ready && setOpen(p)}
              style={{ width: "100%", padding: "13px 15px", display: "block", opacity: ready ? 1 : 0.45 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div className="arabic" style={{ fontSize: 23, color: C.ink }}>{p.title}</div>
                  <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "right" }}>{p.titleEn}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.gold }}>{p.dialogue ? "حِوَارٌ" : "نَصٌّ"}</div>
                  <div dir="ltr" style={{ fontSize: 9.5, color: C.faded }}>level {p.level}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
      <div className="arabic" dir="rtl" style={{ fontSize: 23, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function Passage({ p, onBack }) {
  const [phase, setPhase] = useState("read");   // read → answer → done
  const [picked, setPicked] = useState({});
  const [graded, setGraded] = useState(false);

  const right = p.questions.filter((q, i) => picked[i] === q.a).length;

  return (
    <div className="fadein">
      <Header title={p.title} onBack={onBack} />

      {/* the text itself */}
      <div className="card" style={{ padding: "20px 16px", marginTop: 10 }}>
        {p.text.map((line, i) => (
          <div key={i} dir="rtl" style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "7px 0",
            borderBottom: i < p.text.length - 1 ? `1px dashed ${C.border}` : "none",
          }}>
            <div className="arabic" style={{ flex: 1, fontSize: 24, lineHeight: 2.1, textAlign: "right" }}>
              {line}
            </div>
            <button onClick={() => speak(line)} style={{ fontSize: 13, color: C.emerald, marginTop: 6 }}>🔊</button>
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={() => speak(p.text.join(" "))}
            className="card" style={{ padding: "8px 18px", fontSize: 12, color: C.emerald, borderColor: C.emerald }}>
            🔊 اِسْتَمِعْ إِلَى النَّصِّ كُلِّهِ
          </button>
        </div>
      </div>

      {phase === "read" && (
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }}
          onClick={() => setPhase("answer")}>
          اَلْأَسْئِلَةُ ←
        </button>
      )}

      {phase === "answer" && (
        <div style={{ marginTop: 14 }}>
          <p className="arabic" dir="rtl" style={{ textAlign: "center", fontSize: 19, color: C.emerald }}>
            أَجِبْ عَنِ الْأَسْئِلَةِ
          </p>
          <p style={{ textAlign: "center", fontSize: 10, color: C.faded, marginBottom: 10 }}>
            Answer them all, then check — the text stays above you
          </p>

          {p.questions.map((q, i) => {
            const chosen = picked[i];
            const ok = graded && chosen === q.a;
            return (
              <div key={i} className="card" style={{
                padding: "12px 13px", marginBottom: 8,
                borderColor: graded ? (ok ? C.emerald : C.red) : C.border,
              }}>
                <div className="arabic" dir="rtl" style={{ fontSize: 20, marginBottom: 7, lineHeight: 1.8 }}>
                  {q.q}
                </div>
                <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {q.options.map((o) => {
                    let bg = C.surface, bd = C.border, col = C.ink;
                    if (graded) {
                      if (o === q.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
                      else if (o === chosen) { bg = C.redSoft; bd = C.red; col = C.red; }
                    } else if (o === chosen) { bg = C.goldSoft; bd = C.gold; col = C.gold; }
                    return (
                      <button key={o} disabled={graded}
                        onClick={() => setPicked((s) => ({ ...s, [i]: o }))}
                        style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 11, padding: "8px 13px", color: col }}>
                        <span className="arabic" style={{ fontSize: 19 }}>{o}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!graded ? (
            <button className="btn-primary arabic"
              style={{ width: "100%", marginTop: 8, fontSize: 20,
                       opacity: Object.keys(picked).length === p.questions.length ? 1 : 0.45 }}
              disabled={Object.keys(picked).length !== p.questions.length}
              onClick={() => setGraded(true)}>
              تَحَقَّقْ ✓ ({Object.keys(picked).length}/{p.questions.length})
            </button>
          ) : (
            <>
              <div className="card" style={{ padding: 16, marginTop: 10, textAlign: "center", borderColor: C.emerald }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: C.emerald }}>
                  {right} / {p.questions.length}
                </div>
                <div className="arabic" dir="rtl" style={{ fontSize: 20, color: C.emerald }}>
                  {right === p.questions.length ? "أَحْسَنْتَ" : "أَعِدْ قِرَاءَةَ النَّصِّ"}
                </div>
              </div>
              <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="card arabic" style={{ flex: 1, padding: 12, fontSize: 19, color: C.gold, borderColor: C.gold }}
                  onClick={() => { setPicked({}); setGraded(false); setPhase("read"); }}>
                  ↺ مَرَّةً أُخْرَى
                </button>
                <button className="btn-primary arabic" style={{ flex: 1, fontSize: 19 }} onClick={onBack}>
                  ← اَلنُّصُوصُ
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
