import { useState } from "react";
import { C, speak, shuffle } from "../lib/shared";
import { QURAN } from "../data/quran";
import { gradeBand } from "../data/curriculum";
import { Beads } from "./LessonPlayer";
import Dictionary from "./Dictionary";
import Mushaf from "./Mushaf";

export default function Quran({ onExit, onAddWord }) {
  const [view, setView] = useState({ name: "list" });
  const [dictWord, setDictWord] = useState(null);

  if (dictWord !== null) {
    return (
      <Dictionary
        initialWord={dictWord}
        onExit={() => setDictWord(null)}
        onAddWord={(v) => onAddWord([v])}
      />
    );
  }

  if (view.name === "mushaf") {
    return <Mushaf onExit={() => setView({ name: "list" })} onLookup={(w) => setDictWord(w)} />;
  }

  if (view.name === "surah") {
    return (
      <SurahView
        surah={view.surah}
        onBack={() => setView({ name: "list" })}
        onLookup={(w) => setDictWord(w)}
        onDrill={() => setView({ name: "drill", surah: view.surah })}
      />
    );
  }

  if (view.name === "drill") {
    return (
      <SurahDrill
        surah={view.surah}
        onExit={() => setView({ name: "surah", surah: view.surah })}
        onAddVocab={() => onAddWord(view.surah.keyVocab || [])}
      />
    );
  }

  return (
    <div className="fadein">
      <Header title="اَلْقُرْآنُ 📖" onBack={onExit} />

      <button dir="rtl" className="btn-primary" onClick={() => setView({ name: "mushaf" })}
        style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>📖</span>
        <span className="arabic" style={{ fontSize: 23 }}>اَلْمُصْحَفُ — اِقْرَأْ وَرَتِّلْ</span>
      </button>
      <div className="arabic" dir="rtl" style={{ textAlign: "center", fontSize: 17, color: C.faded, marginBottom: 8 }}>
        اِفْهَمْ صَلَاتَكَ 🕌
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {QURAN.map((s) => (
          <button key={s.id} dir="rtl" className="card" onClick={() => setView({ name: "surah", surah: s })}
            style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{s.id === "salah" ? "🕌" : "📖"}</span>
              <div style={{ textAlign: "right" }}>
                <div className="arabic" style={{ fontSize: 25, color: C.ink }}>{s.name}</div>
                <div className="arabic" style={{ fontSize: 15, color: C.faded }}>{s.note}</div>
              </div>
            </div>
            <span style={{ color: C.faded }}>‹</span>
          </button>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 10, color: C.faded, marginTop: 18, lineHeight: 1.6 }}>
        The simplified meanings are learning aids to help you begin understanding —
        for the full meanings, return to the books of tafsir and the people of knowledge.
      </p>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
      <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function SurahView({ surah, onBack, onLookup, onDrill }) {
  const [open, setOpen] = useState({}); // ayah index -> meanings revealed

  return (
    <div className="fadein">
      <Header title={surah.name} onBack={onBack} />
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, margin: "6px 0 4px" }}>
        👆 Tap any word for the dictionary · 👁️ reveals the simplified meaning
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {surah.ayat.map((a, i) => (
          <div key={i} className="card" style={{ padding: "16px 16px 12px" }}>
            <div dir="rtl" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <p className="arabic" dir="rtl" style={{ fontSize: 27, lineHeight: 2.1, color: C.ink, flex: 1 }}>
                {a.ar.split(/(\s+)/).map((tok, j) =>
                  /\S/.test(tok) ? (
                    <span key={j} onClick={() => onLookup(tok.replace(/[^\u0600-\u06FF]/g, ""))} style={{ cursor: "pointer" }}>
                      {tok}
                    </span>
                  ) : (
                    tok
                  )
                )}
              </p>
              <button onClick={() => speak(a.ar)} aria-label="listen"
                style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: "50%", width: 34, height: 34, fontSize: 14, flexShrink: 0 }}>
                🔊
              </button>
            </div>

            <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              style={{ marginTop: 8, fontSize: 13, color: C.gold }}>
              {open[i] ? "👁️ إِخْفَاءُ الْمَعْنَى" : "👁️ اَلْمَعْنَى"}
            </button>

            {open[i] && (
              <div className="fadein" dir="rtl" style={{ marginTop: 8, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                {a.words && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {a.words.map((w) => (
                      <div key={w.ar} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        <span className="arabic" style={{ fontSize: 21, color: C.emerald, fontWeight: 700 }}>{w.ar}</span>
                        <span className="arabic" style={{ fontSize: 19, color: C.ink }}>← {w.gloss}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="arabic" style={{ fontSize: 20, color: C.gold, background: C.goldSoft, borderRadius: 10, padding: "8px 12px" }}>
                  ✨ {a.simple}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} onClick={onDrill}>
        اِخْتَبِرْ فَهْمَكَ 🎯
      </button>
    </div>
  );
}

function buildQuranDrills(surah) {
  const items = [];
  // ayah → simplified meaning
  const withMeanings = surah.ayat.filter((a) => a.simple);
  withMeanings.forEach((a) => {
    const wrong = shuffle(withMeanings.filter((x) => x.simple !== a.simple)).slice(0, 2);
    if (wrong.length < 1) return;
    items.push({
      q: a.ar,
      qSpeak: a.ar,
      prompt: "مَا مَعْنَى هَذِهِ الْآيَةِ؟ 👁️",
      options: shuffle([a.simple, ...wrong.map((x) => x.simple)]),
      a: a.simple,
    });
  });
  // word → gloss (Fatiha-style authored words)
  surah.ayat.forEach((a) => {
    (a.words || []).forEach((w) => {
      const pool = surah.ayat.flatMap((x) => x.words || []).filter((x) => x.gloss !== w.gloss);
      const wrong = shuffle(pool).slice(0, 2);
      if (wrong.length < 2) return;
      items.push({
        q: w.ar,
        qSpeak: w.ar,
        prompt: "مَا مَعْنَى هَذِهِ الْكَلِمَةِ؟",
        options: shuffle([w.gloss, ...wrong.map((x) => x.gloss)]),
        a: w.gloss,
      });
    });
  });
  return shuffle(items).slice(0, 12);
}

function SurahDrill({ surah, onExit, onAddVocab }) {
  const [items] = useState(() => buildQuranDrills(surah));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [added, setAdded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="fadein">
        <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
        <p className="arabic" dir="rtl" style={{ textAlign: "center", color: C.faded, marginTop: 24, fontSize: 20 }}>
          لَا تَدْرِيبَاتٍ هُنَا بَعْدُ
        </p>
      </div>
    );
  }

  if (finished) {
    const score = Math.round((right / items.length) * 100);
    const band = gradeBand(score);
    return (
      <div className="card fadein" style={{ padding: 28, textAlign: "center", marginTop: 10 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded }}>نَتِيجَةُ الْفَهْمِ</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: band.color }}>{score}%</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 34, color: band.color }}>{band.ar}</div>
        {surah.keyVocab?.length > 0 && (
          <button
            className="btn-primary arabic"
            style={{ width: "100%", marginTop: 18, fontSize: 20, background: added ? C.gold : C.emerald }}
            disabled={added}
            onClick={() => { onAddVocab(); setAdded(true); }}
          >
            {added ? "✅ فِي مُرَاجَعَتِكَ 📿" : "أَضِفْ كَلِمَاتِ السُّورَةِ إِلَى الْمُرَاجَعَةِ 📿"}
          </button>
        )}
        <button className="arabic" onClick={onExit} style={{ marginTop: 14, color: C.faded, fontSize: 19, textDecoration: "underline" }}>
          ← اَلسُّورَةُ
        </button>
      </div>
    );
  }

  const item = items[pos];

  const choose = (opt) => {
    if (picked) return;
    const correct = opt === item.a;
    setPicked({ opt, correct });
    if (correct) setRight((r) => r + 1);
  };

  const next = () => {
    setPicked(null);
    if (pos < items.length - 1) setPos(pos + 1);
    else setFinished(true);
  };

  return (
    <div className="fadein">
      <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
      <Beads total={items.length} filled={right} />
      <div className="card" style={{ padding: "20px 16px" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 17, color: C.faded, textAlign: "center" }}>{item.prompt}</div>
        <div dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
          <div className="arabic" dir="rtl" style={{ fontSize: 26, textAlign: "center", lineHeight: 2 }}>{item.q}</div>
          <button onClick={() => speak(item.qSpeak)} aria-label="listen"
            style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: "50%", width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
            🔊
          </button>
        </div>
      </div>
      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {item.options.map((opt) => {
          let bg = C.surface, bd = C.border, col = C.ink;
          if (picked) {
            if (opt === item.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
            else if (opt === picked.opt) { bg = C.redSoft; bd = C.red; col = C.red; }
          }
          return (
            <button key={opt} onClick={() => choose(opt)}
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "11px 14px", textAlign: "right" }}>
              <span className="arabic" style={{ fontSize: 20, color: col }}>{opt}</span>
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
