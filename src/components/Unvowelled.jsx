import { useRef, useState } from "react";
import { C, speak } from "../lib/shared";
import { STAGES, stripTo, sameWords, PASSAGES } from "../data/unvowelled";
import TashkeelBar from "./TashkeelBar";

// اَلْقِرَاءَةُ بِلَا شَكْلٍ — the bridge from a teaching book to a real one.
//
// The learner reads a passage with the vowels progressively removed, restores
// them himself, and only then sees the original. This is the single skill that
// separates someone who can read a textbook from someone who can read a book.

export default function Unvowelled({ onExit }) {
  const [stage, setStage] = useState(1);
  const [open, setOpen] = useState(null);

  if (open) {
    return <Reader passage={open} stage={stage} onBack={() => setOpen(null)} />;
  }

  const st = STAGES.find((s) => s.id === stage);

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald, fontWeight: 700 }}>
          اَلْقِرَاءَةُ بِلَا شَكْلٍ
        </div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, lineHeight: 1.6 }}>
        Every real book is printed without vowels.
        <br />
        This is how you learn to read one.
      </p>

      {/* choose how much support to remove */}
      <div className="card" style={{ padding: 13, marginTop: 14 }}>
        <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", marginBottom: 8 }}>
          DIFFICULTY
        </div>
        <div dir="rtl" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              style={{
                flex: "1 1 auto", minWidth: 62, padding: "8px 6px", borderRadius: 10,
                background: stage === s.id ? C.emerald : C.surface,
                border: `1px solid ${stage === s.id ? C.emerald : C.border}`,
                color: stage === s.id ? "#fff" : C.ink,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{s.id}</div>
            </button>
          ))}
        </div>
        <div dir="rtl" className="arabic" style={{ fontSize: 19, color: C.emerald, textAlign: "center", marginTop: 10 }}>
          {st.ar}
        </div>
        <div dir="ltr" style={{ fontSize: 11, color: C.faded, textAlign: "center", lineHeight: 1.6, marginTop: 2 }}>
          {st.hint}
        </div>
      </div>

      {/* the passages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
        {PASSAGES.map((p) => (
          <button key={p.id} dir="rtl" className="card" onClick={() => setOpen(p)}
            style={{ width: "100%", padding: "12px 14px", display: "block", textAlign: "right" }}>
            <div className="arabic" style={{ fontSize: 21, lineHeight: 1.9, color: C.ink }}>
              {stripTo(p.text, stage)}
            </div>
            <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 9.5, color: C.faded }}>level {p.level}</span>
              <span className="arabic" style={{ fontSize: 12, color: C.gold }}>{p.source}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Reader({ passage, stage, onBack }) {
  const [phase, setPhase] = useState("read");   // read → restore → check
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState(null);
  const taRef = useRef(null);

  const shown = stripTo(passage.text, stage);

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 19, color: C.gold }}>{passage.source}</div>
        <div style={{ width: 34 }} />
      </div>

      {/* the bare text */}
      <div className="card" style={{ padding: "22px 16px", marginTop: 12 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 27, lineHeight: 2.2, textAlign: "center" }}>
          {shown}
        </div>
      </div>

      {phase === "read" && (
        <>
          <p style={{ textAlign: "center", fontSize: 12, color: C.faded, marginTop: 14, lineHeight: 1.7 }}>
            Read it aloud, supplying the vowels yourself.
            <br />
            Do not rush — work out each ending from its position.
          </p>
          <button className="btn-primary arabic" style={{ width: "100%", marginTop: 12, fontSize: 20 }}
            onClick={() => setPhase("restore")}>
            اُكْتُبْهَا مَشْكُولَةً ←
          </button>
          <button className="card arabic" style={{ width: "100%", marginTop: 8, padding: 11, fontSize: 18, color: C.faded }}
            onClick={() => setPhase("check")}>
            أَرِنِي الْأَصْلَ
          </button>
        </>
      )}

      {phase === "restore" && (
        <>
          <p style={{ textAlign: "center", fontSize: 11.5, color: C.faded, marginTop: 12 }}>
            Write it out with every vowel in place
          </p>
          <textarea
            ref={taRef}
            dir="rtl"
            className="arabic"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            style={{
              width: "100%", minHeight: 110, marginTop: 8, padding: 12, fontSize: 24,
              borderRadius: 14, background: C.surface, border: `1.5px solid ${C.border}`, lineHeight: 2,
            }}
          />
          <TashkeelBar targetRef={taRef} />
          <button className="btn-primary arabic"
            style={{ width: "100%", marginTop: 8, fontSize: 20, opacity: typed.trim() ? 1 : 0.45 }}
            disabled={!typed.trim()}
            onClick={() => { setResult(typed.trim() === passage.text.trim()); setPhase("check"); }}>
            تَحَقَّقْ ✓
          </button>
        </>
      )}

      {phase === "check" && (
        <div className="fadein">
          <div className="card" style={{
            padding: "20px 16px", marginTop: 12,
            borderColor: result === true ? C.emerald : C.gold,
          }}>
            <div dir="ltr" style={{ fontSize: 9.5, color: C.emerald, letterSpacing: "0.12em", textAlign: "right" }}>
              THE ORIGINAL
            </div>
            <div className="arabic" dir="rtl" style={{ fontSize: 26, lineHeight: 2.2, textAlign: "center", color: C.emerald, marginTop: 4 }}>
              {passage.text}
            </div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button onClick={() => speak(passage.text)} style={{ fontSize: 20, color: C.emerald }}>🔊</button>
            </div>
            <div dir="ltr" style={{ fontSize: 12, color: C.faded, textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
              {passage.en}
            </div>
          </div>

          {typed && (
            <div className="card" style={{ padding: 14, marginTop: 10, borderColor: result ? C.emerald : C.red }}>
              <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.1em", textAlign: "right" }}>
                YOUR VOWELLING
              </div>
              <div className="arabic" dir="rtl" style={{ fontSize: 23, lineHeight: 2, textAlign: "center", marginTop: 3 }}>
                {typed}
              </div>
              {!result && (
                <div dir="ltr" style={{ fontSize: 11, color: C.faded, textAlign: "center", marginTop: 6, lineHeight: 1.6 }}>
                  Compare them line by line. Every difference is something worth knowing.
                </div>
              )}
            </div>
          )}

          <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="card arabic" style={{ flex: 1, padding: 12, fontSize: 18, color: C.gold, borderColor: C.gold }}
              onClick={() => { setTyped(""); setResult(null); setPhase("read"); }}>
              ↺ مَرَّةً أُخْرَى
            </button>
            <button className="btn-primary arabic" style={{ flex: 1, fontSize: 18 }} onClick={onBack}>
              ← اَلنُّصُوصُ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
