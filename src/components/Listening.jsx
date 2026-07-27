import { useState } from "react";
import { C, speak, shuffle } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";
import { gradeBand } from "../data/curriculum";
import { Beads } from "./LessonPlayer";

// اَلِاسْتِمَاعُ — listening practice.
// The learner HEARS a sentence without seeing it, then picks what they heard.
// This trains the ear separately from the eye — the gap that stops learners
// understanding a live dars even when they can read well.

function buildListeningItems(maxLesson) {
  const pool = [];
  CURRICULUM.lessons.slice(0, maxLesson + 1).forEach((l) => {
    (l.examples || []).forEach((e) => {
      if (e.ar && e.ar.split(" ").length >= 2) pool.push({ ar: e.ar, emoji: e.emoji, src: l.title });
    });
  });
  return shuffle(pool);
}

export default function Listening({ maxLesson, onExit }) {
  const [items] = useState(() => buildListeningItems(maxLesson).slice(0, 10));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (items.length < 4) {
    return (
      <div className="fadein">
        <Header onBack={onExit} />
        <div className="card" style={{ padding: 24, textAlign: "center", marginTop: 14 }}>
          <div style={{ fontSize: 34 }}>👂</div>
          <p className="arabic" dir="rtl" style={{ fontSize: 20, color: C.faded, marginTop: 8 }}>
            أَكْمِلْ دُرُوسًا أَكْثَرَ أَوَّلًا
          </p>
          <p style={{ fontSize: 12, color: C.faded, marginTop: 4 }}>
            Complete a few more lessons to unlock listening practice.
          </p>
        </div>
      </div>
    );
  }

  if (finished) {
    const score = Math.round((right / items.length) * 100);
    const band = gradeBand(score);
    return (
      <div className="card fadein" style={{ padding: 28, textAlign: "center", marginTop: 10 }}>
        <div style={{ fontSize: 34 }}>👂</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded }}>نَتِيجَةُ الِاسْتِمَاعِ</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: band.color }}>{score}%</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 34, color: band.color }}>{band.ar}</div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 18, fontSize: 21 }} onClick={onExit}>
          ← اَلرَّئِيسِيَّةُ
        </button>
      </div>
    );
  }

  const item = items[pos];
  const distractors = shuffle(items.filter((x) => x.ar !== item.ar)).slice(0, 3);
  const options = shuffle([item, ...distractors]).map((x) => x.ar);

  const choose = (opt) => {
    if (picked) return;
    const correct = opt === item.ar;
    setPicked({ opt, correct });
    setRevealed(true);
    if (correct) setRight((r) => r + 1);
  };

  const next = () => {
    setPicked(null);
    setRevealed(false);
    if (pos < items.length - 1) setPos(pos + 1);
    else setFinished(true);
  };

  return (
    <div className="fadein">
      <Header onBack={onExit} />
      <Beads total={items.length} filled={right} />

      {/* the audio itself — deliberately no text until answered */}
      <div className="card" style={{ padding: "28px 18px", textAlign: "center" }}>
        <button
          onClick={() => speak(item.ar)}
          style={{
            background: C.emerald, color: "#fff", border: "none", borderRadius: "50%",
            width: 88, height: 88, fontSize: 36,
          }}
          aria-label="listen"
        >
          🔊
        </button>
        <p className="arabic" dir="rtl" style={{ fontSize: 19, color: C.faded, marginTop: 12 }}>
          اِسْتَمِعْ ثُمَّ اخْتَرْ
        </p>
        <p style={{ fontSize: 11, color: C.faded }}>Tap to hear it again — as many times as you need</p>
        {revealed && (
          <div className="fadein" style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 26 }}>{item.emoji}</div>
            <div className="arabic" dir="rtl" style={{ fontSize: 24, color: C.emerald, marginTop: 4 }}>{item.ar}</div>
          </div>
        )}
      </div>

      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {options.map((opt) => {
          let bg = C.surface, bd = C.border, col = C.ink;
          if (picked) {
            if (opt === item.ar) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
            else if (opt === picked.opt) { bg = C.redSoft; bd = C.red; col = C.red; }
          }
          return (
            <button key={opt} onClick={() => choose(opt)}
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "11px 14px", textAlign: "right" }}>
              <span className="arabic" style={{ fontSize: 22, color: col }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} onClick={next}>
          {pos < items.length - 1 ? "اَلتَّالِي" : "اَلنَّتِيجَةُ ✓"}
        </button>
      )}
    </div>
  );
}

function Header({ onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
      <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.emerald, fontWeight: 700 }}>اَلِاسْتِمَاعُ 👂</div>
      <div style={{ width: 34 }} />
    </div>
  );
}
