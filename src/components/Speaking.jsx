import { useEffect, useRef, useState } from "react";
import { C, speak, callAI, parseJSONLoose, shuffle } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";
import { VOCAB_BANK } from "../data/vocabBank";

// اَلنُّطْقُ — say it aloud.
//
// Recognising a word among four options is not the same as being able to
// produce it. This shows the English and asks the learner to SAY the Arabic,
// with nothing to choose from. It is the hardest kind of recall, and the
// closest thing to real use.

const SR = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function Speaking({ onExit }) {
  const [set, setSet] = useState(null);

  if (set) return <Drill words={set.words} title={set.title} onBack={() => setSet(null)} />;

  // sources: any lesson, or any theme from the bank
  const lessons = CURRICULUM.lessons
    .map((l, i) => ({ title: `${i + 1}. ${l.title}`, words: (l.vocab || []).filter((v) => v.en) }))
    .filter((x) => x.words.length >= 5);

  const themes = VOCAB_BANK
    .map((g) => ({ title: g.theme, words: g.words.filter((w) => w.en) }))
    .filter((x) => x.words.length >= 5);

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald, fontWeight: 700 }}>
          اَلنُّطْقُ
        </div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, lineHeight: 1.7 }}>
        You see the meaning. You say the Arabic aloud.
        <br />
        Nothing to choose from — this is real recall.
      </p>

      {!SR && (
        <div className="card" style={{ padding: 13, marginTop: 12, borderColor: C.gold, background: C.goldSoft }}>
          <div dir="ltr" style={{ fontSize: 12, color: C.ink, textAlign: "center", lineHeight: 1.7 }}>
            Your browser cannot listen. You can still practise — say each word aloud,
            then tap to reveal and judge yourself honestly.
            <br />
            <b>Chrome on Android works best for the microphone.</b>
          </div>
        </div>
      )}

      <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", margin: "16px 0 7px" }}>
        FROM A LESSON
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 250, overflowY: "auto" }}>
        {lessons.map((x) => (
          <button key={x.title} dir="rtl" className="card" onClick={() => setSet(x)}
            style={{ width: "100%", padding: "9px 13px", display: "block", textAlign: "right" }}>
            <span style={{ fontSize: 10, color: C.faded, float: "left" }}>{x.words.length}</span>
            <span className="arabic" style={{ fontSize: 18 }}>{x.title}</span>
          </button>
        ))}
      </div>

      <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", margin: "16px 0 7px" }}>
        OR A THEME
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 250, overflowY: "auto" }}>
        {themes.map((x) => (
          <button key={x.title} dir="rtl" className="card" onClick={() => setSet(x)}
            style={{ width: "100%", padding: "9px 13px", display: "block", textAlign: "right" }}>
            <span style={{ fontSize: 10, color: C.faded, float: "left" }}>{x.words.length}</span>
            <span className="arabic" style={{ fontSize: 18 }}>{x.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Drill({ words, title, onBack }) {
  const [queue] = useState(() => shuffle(words).slice(0, 12));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState("ask");   // ask → judged
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [right, setRight] = useState(0);
  const recRef = useRef(null);

  const w = queue[i];
  const last = i === queue.length - 1;

  useEffect(() => () => recRef.current?.stop?.(), []);

  const listen = () => {
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "ar-SA";
    r.interimResults = false;
    r.onresult = (e) => {
      const said = e.results?.[0]?.[0]?.transcript || "";
      setHeard(said);
      check(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    setListening(true);
    r.start();
  };

  const check = async (said) => {
    setBusy(true);
    try {
      const raw = await callAI({ mode: "vocabcheck", target: w.ar, meaning: w.en, text: said });
      const p = parseJSONLoose(raw);
      setResult(p);
      if (p.correct) setRight((n) => n + 1);
    } catch {
      setResult({ correct: null, note: "Could not check that — judge yourself against the answer below." });
    } finally {
      setBusy(false);
      setPhase("judged");
    }
  };

  const next = () => {
    if (last) { onBack(); return; }
    setI(i + 1); setPhase("ask"); setHeard(""); setResult(null);
  };

  if (!w) return null;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 18, color: C.emerald }}>{title}</div>
        <div style={{ width: 34 }} />
      </div>
      <p dir="ltr" style={{ textAlign: "center", fontSize: 10, color: C.faded }}>
        {i + 1} / {queue.length} · {right} correct
      </p>

      <div className="card" style={{ padding: "34px 18px", marginTop: 14, textAlign: "center" }}>
        <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.14em" }}>SAY THIS IN ARABIC</div>
        <div dir="ltr" style={{ fontSize: 26, color: C.ink, marginTop: 10, lineHeight: 1.5 }}>
          {w.en}
        </div>
      </div>

      {phase === "ask" && (
        <>
          {SR ? (
            <button
              onClick={listen}
              disabled={busy}
              style={{
                width: "100%", marginTop: 16, padding: "18px 0", borderRadius: 16, fontSize: 30,
                background: listening ? C.red : C.emerald,
                border: "none", color: "#fff",
              }}
            >
              {busy ? "..." : listening ? "⏹" : "🎤"}
            </button>
          ) : null}
          <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 8, lineHeight: 1.6 }}>
            {SR
              ? (listening ? "Listening — say the Arabic word now" : "Tap and say the Arabic word aloud")
              : "Say it aloud, then reveal the answer"}
          </p>
          <button className="card arabic"
            style={{ width: "100%", marginTop: 8, padding: 12, fontSize: 18, color: C.faded }}
            onClick={() => { setResult({ correct: null }); setPhase("judged"); }}>
            أَرِنِي الْجَوَابَ
          </button>
        </>
      )}

      {phase === "judged" && (
        <div className="fadein">
          {heard && (
            <div className="card" style={{ padding: 12, marginTop: 12 }}>
              <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.1em" }}>WHAT WAS HEARD</div>
              <div className="arabic" dir="rtl" style={{ fontSize: 21, textAlign: "center", marginTop: 3 }}>{heard}</div>
            </div>
          )}

          <div className="card" style={{
            padding: 20, marginTop: 10, textAlign: "center",
            borderColor: result?.correct === true ? C.emerald : result?.correct === false ? C.red : C.gold,
          }}>
            <div dir="ltr" style={{ fontSize: 9.5, color: C.emerald, letterSpacing: "0.12em" }}>THE ANSWER</div>
            <div className="arabic" dir="rtl" style={{ fontSize: 32, color: C.emerald, marginTop: 6, lineHeight: 1.7 }}>
              {w.ar}
            </div>
            <button onClick={() => speak(w.ar)} style={{ fontSize: 21, color: C.emerald, marginTop: 6 }}>🔊</button>
            {result?.note && (
              <div dir="ltr" style={{ fontSize: 12, color: C.faded, marginTop: 8, lineHeight: 1.7 }}>
                {result.note}
              </div>
            )}
          </div>

          <button className="btn-primary arabic" style={{ width: "100%", marginTop: 12, fontSize: 20 }} onClick={next}>
            {last ? "اِنْتَهَيْتُ" : "اَلتَّالِيَةُ →"}
          </button>
        </div>
      )}
    </div>
  );
}
