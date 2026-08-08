import { useRef, useState } from "react";
import { C, callAI, parseJSONLoose } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";

// عَلِّمْنِي — teach it back.
//
// You do not fully own a thing until you can explain it. A learner who can pick
// the right option out of four may still not be able to say WHY. This asks them
// to teach the concept in their own words, and marks whether they understood it.
//
// It is also the closest thing an app can offer to teaching — which is the last
// stage of mastery, and the one no drill reaches.

// Concepts worth explaining, drawn from the pillars.
const CONCEPTS = [
  {
    id: "c1", tier: 1,
    ar: "اَلْمُبْتَدَأُ وَالْخَبَرُ",
    ask: "Explain how a nominal sentence works in Arabic. Why is اَلْبَيْتُ كَبِيرٌ a complete sentence when there is no word for 'is'?",
  },
  {
    id: "c2", tier: 1,
    ar: "اَلتَّنْوِينُ",
    ask: "What does the tanwin on a noun tell you? Explain the difference between بَيْتٌ and اَلْبَيْتُ.",
  },
  {
    id: "c3", tier: 1,
    ar: "اَلْإِضَافَةُ",
    ask: "Explain what happens to both words in an إضافة. Why is it بَابُ الْبَيْتِ and not اَلْبَابُ الْبَيْتُ?",
  },
  {
    id: "c4", tier: 2,
    ar: "اَلْإِعْرَابُ",
    ask: "Explain the three cases. What causes a damma, what causes a fatha, and what causes a kasra?",
  },
  {
    id: "c5", tier: 2,
    ar: "اَلنَّعْتُ",
    ask: "Explain how an adjective agrees with its noun in Arabic. What is the difference between اَلْبَيْتُ الْكَبِيرُ and اَلْبَيْتُ كَبِيرٌ?",
  },
  {
    id: "c6", tier: 2,
    ar: "اَلتَّذْكِيرُ وَالتَّأْنِيثُ",
    ask: "How do you decide whether an Arabic noun is masculine or feminine? Give the signs, and mention a word that is feminine without any sign.",
  },
  {
    id: "c7", tier: 2,
    ar: "اَلْجَذْرُ وَالْوَزْنُ",
    ask: "Explain the root-and-pattern system. Why does knowing ك ت ب give you eight words instead of one?",
  },
  {
    id: "c8", tier: 3,
    ar: "كَانَ وَإِنَّ",
    ask: "Explain what كَانَ does to a sentence, and what إِنَّ does. Why are they described as mirrors of each other?",
  },
  {
    id: "c9", tier: 3,
    ar: "اَلْعَدَدُ وَالْمَعْدُودُ",
    ask: "Explain the rules for the counted noun: what happens with 3 to 10, what happens from 11 upward, and what happens with 100.",
  },
  {
    id: "c10", tier: 3,
    ar: "اَلْأَزْمِنَةُ",
    ask: "Arabic has only two verb forms. Explain how it expresses the future, the habitual past, and 'has already happened'.",
  },
  {
    id: "c11", tier: 3,
    ar: "اَلْأَوْزَانُ",
    ask: "Explain what Form II (فَعَّلَ), Form V (تَفَعَّلَ) and Form X (اِسْتَفْعَلَ) each do to a verb's meaning. Give an example of each from one root.",
  },
  {
    id: "c12", tier: 4,
    ar: "أَبْوَابُ النَّحْوِ",
    ask: "Explain the four doors of نحو — المرفوعات، المنصوبات، المجرورات، التوابع. What decides which door a word passes through?",
  },
  {
    id: "c13", tier: 4,
    ar: "اَلْمَمْنُوعُ مِنَ الصَّرْفِ",
    ask: "Explain what a diptote is and how it behaves differently. Why do we say اَللهُ أَكْبَرُ and never أَكْبَرٌ?",
  },
  {
    id: "c14", tier: 4,
    ar: "اَلْحَالُ وَالتَّمْيِيزُ",
    ask: "Explain the difference between a حال and a تمييز. Both are accusative and indefinite — so what separates them?",
  },
  {
    id: "c15", tier: 4,
    ar: "اَلْجُذُورُ الْمُعْتَلَّةُ",
    ask: "Explain why مِيعَاد is not مِوْعَاد, and why قَائِل is not قَاوِل. What is happening to the weak letter?",
  },
];

const TIERS = [
  { n: 1, ar: "اَلْأَسَاسُ", en: "Foundation" },
  { n: 2, ar: "مُتَوَسِّطٌ", en: "Intermediate" },
  { n: 3, ar: "مُتَقَدِّمٌ", en: "Advanced" },
  { n: 4, ar: "اَلْإِتْقَانُ", en: "Mastery" },
];

export default function TeachBack({ onExit }) {
  const [open, setOpen] = useState(null);

  if (open) return <Explain concept={open} onBack={() => setOpen(null)} />;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald, fontWeight: 700 }}>
          عَلِّمْنِي
        </div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, lineHeight: 1.7 }}>
        You do not own a thing until you can explain it.
        <br />
        Teach the concept back, in your own words.
      </p>

      {TIERS.map((t) => (
        <div key={t.n} style={{ marginTop: 16 }}>
          <div dir="rtl" style={{
            background: C.emerald, color: "#fff", borderRadius: 11,
            padding: "7px 13px", marginBottom: 7,
          }}>
            <span className="arabic" style={{ fontSize: 18, fontWeight: 700 }}>{t.ar}</span>
            <span dir="ltr" style={{ fontSize: 9.5, opacity: 0.85, float: "left" }}>{t.en}</span>
          </div>
          {CONCEPTS.filter((c) => c.tier === t.n).map((c) => (
            <button key={c.id} dir="rtl" className="card" onClick={() => setOpen(c)}
              style={{ width: "100%", padding: "11px 14px", marginBottom: 6, display: "block", textAlign: "right" }}>
              <span className="arabic" style={{ fontSize: 20, color: C.ink }}>{c.ar}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Explain({ concept, onBack }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const taRef = useRef(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const raw = await callAI({ mode: "teachback", concept: concept.ar + " — " + concept.ask, text });
      setResult(parseJSONLoose(raw));
    } catch (e) {
      setErr(String(e?.message || "Could not mark your explanation."));
    } finally {
      setBusy(false);
    }
  };

  const band = result?.score >= 80 ? C.emerald : result?.score >= 50 ? C.gold : C.red;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 20, color: C.emerald }}>{concept.ar}</div>
        <div style={{ width: 34 }} />
      </div>

      <div className="card" style={{ padding: 16, marginTop: 12, borderColor: C.gold }}>
        <div dir="ltr" style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.12em" }}>EXPLAIN THIS</div>
        <div dir="ltr" style={{ fontSize: 14.5, color: C.ink, marginTop: 5, lineHeight: 1.75 }}>
          {concept.ask}
        </div>
      </div>

      {!result && (
        <>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Explain it as if teaching a friend who has never studied Arabic..."
            style={{
              width: "100%", minHeight: 150, marginTop: 12, padding: 12, fontSize: 14,
              borderRadius: 14, background: C.surface, border: `1.5px solid ${C.border}`, lineHeight: 1.7,
            }}
          />
          <p style={{ fontSize: 10.5, color: C.faded, textAlign: "center", marginTop: 6, lineHeight: 1.6 }}>
            Write in English or Arabic. You are marked on whether you understood it,
            <br />
            not on how elegantly you said it.
          </p>
          <button className="btn-primary arabic"
            style={{ width: "100%", marginTop: 8, fontSize: 20, opacity: text.trim() && !busy ? 1 : 0.45 }}
            disabled={!text.trim() || busy}
            onClick={submit}>
            {busy ? "..." : "سَلِّمْ ✓"}
          </button>
        </>
      )}

      {err && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12.5, textAlign: "center" }}>
          {err}
        </div>
      )}

      {result && (
        <div className="fadein">
          <div className="card" style={{ padding: 18, marginTop: 12, textAlign: "center", borderColor: band }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: band }}>{result.score}</div>
            <div dir="ltr" style={{ fontSize: 13.5, color: C.ink, marginTop: 4, lineHeight: 1.7 }}>
              {result.verdict}
            </div>
          </div>

          {result.missed && (
            <div className="card" style={{ padding: 14, marginTop: 10, borderColor: C.gold, background: C.goldSoft }}>
              <div dir="ltr" style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.12em" }}>WHAT YOU MISSED</div>
              <div dir="ltr" style={{ fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 1.7 }}>
                {result.missed}
              </div>
            </div>
          )}

          {result.model && (
            <div className="card" style={{ padding: 14, marginTop: 10, borderColor: C.emerald }}>
              <div dir="ltr" style={{ fontSize: 9.5, color: C.emerald, letterSpacing: "0.12em" }}>
                HOW IT COULD BE SAID
              </div>
              <div dir="ltr" style={{ fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 1.75 }}>
                {result.model}
              </div>
            </div>
          )}

          <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="card arabic" style={{ flex: 1, padding: 12, fontSize: 18, color: C.gold, borderColor: C.gold }}
              onClick={() => { setResult(null); setText(""); }}>
              ↺ مَرَّةً أُخْرَى
            </button>
            <button className="btn-primary arabic" style={{ flex: 1, fontSize: 18 }} onClick={onBack}>
              ← اَلْمَفَاهِيمُ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
