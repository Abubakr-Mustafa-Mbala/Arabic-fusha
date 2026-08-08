import { useEffect, useRef, useState } from "react";
import { C, speak, callAI, parseJSONLoose } from "../lib/shared";
import TashkeelBar from "./TashkeelBar";
import { CURRICULUM } from "../data/curriculum";

// The browser's own speech recogniser. Arabic support varies — it is good on
// Chrome and Android, absent on some others — so it is offered only when present.
const SR = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// اَلْمُحَادَثَةُ — conversation practice.
//
// A learner can know every rule and still freeze when asked a question. The
// only cure is producing Arabic under mild pressure, repeatedly. This gives
// them a partner who never tires, never switches to English, and corrects one
// thing at a time — because a learner corrected on everything stops speaking.

const TOPICS = [
  { id: "intro", ar: "اَلتَّعَارُفُ", en: "Introducing yourself", open: "اَلسَّلَامُ عَلَيْكُمْ! مَا اسْمُكَ؟" },
  { id: "family", ar: "اَلْأُسْرَةُ", en: "Your family", open: "أَخْبِرْنِي عَنْ أُسْرَتِكَ. كَمْ أَخًا لَكَ؟" },
  { id: "study", ar: "اَلدِّرَاسَةُ", en: "Studying Arabic", open: "مُنْذُ مَتَى تَدْرُسُ الْعَرَبِيَّةَ؟" },
  { id: "day", ar: "يَوْمِي", en: "Your day", open: "مَاذَا فَعَلْتَ الْيَوْمَ؟" },
  { id: "market", ar: "فِي السُّوقِ", en: "At the market", open: "أَهْلًا! مَاذَا تُرِيدُ أَنْ تَشْتَرِيَ؟" },
  { id: "masjid", ar: "فِي الْمَسْجِدِ", en: "At the mosque", open: "هَلْ صَلَّيْتَ الْفَجْرَ فِي الْمَسْجِدِ؟" },
  { id: "food", ar: "اَلطَّعَامُ", en: "Food and drink", open: "مَا طَعَامُكَ الْمُفَضَّلُ؟" },
  { id: "travel", ar: "اَلسَّفَرُ", en: "Travel", open: "هَلْ سَافَرْتَ إِلَى بَلَدٍ آخَرَ؟" },
];

const LEVELS = [
  { id: "beginner", ar: "مُبْتَدِئٌ", en: "simple words, present tense" },
  { id: "intermediate", ar: "مُتَوَسِّطٌ", en: "past and future, longer replies" },
  { id: "advanced", ar: "مُتَقَدِّمٌ", en: "natural pace, full vocabulary" },
];

export default function Converse({ onExit }) {
  const [topic, setTopic] = useState(null);
  const [level, setLevel] = useState("beginner");
  const [showLessons, setShowLessons] = useState(false);

  if (topic) return <Chat topic={topic} level={level} onBack={() => setTopic(null)} />;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald, fontWeight: 700 }}>
          اَلْمُحَادَثَةُ
        </div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, lineHeight: 1.6 }}>
        Speak or write. Everything stays in Arabic.
        <br />
        You will be corrected on one thing at a time.
      </p>

      <div className="card" style={{ padding: 12, marginTop: 14 }}>
        <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", marginBottom: 7 }}>
          YOUR LEVEL
        </div>
        <div dir="rtl" style={{ display: "flex", gap: 6 }}>
          {LEVELS.map((l) => (
            <button key={l.id} onClick={() => setLevel(l.id)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 10,
                background: level === l.id ? C.emerald : C.surface,
                border: `1px solid ${level === l.id ? C.emerald : C.border}`,
              }}>
              <div className="arabic" style={{ fontSize: 16, color: level === l.id ? "#fff" : C.ink }}>{l.ar}</div>
            </button>
          ))}
        </div>
        <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "center", marginTop: 6 }}>
          {LEVELS.find((l) => l.id === level).en}
        </div>
      </div>

      {/* practise one lesson — the partner uses only that lesson's words */}
      <button
        onClick={() => setShowLessons((v) => !v)}
        dir="rtl"
        className="card"
        style={{ width: "100%", padding: "13px 15px", marginTop: 14, borderColor: C.gold, background: C.goldSoft, display: "block" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="arabic" style={{ fontSize: 20, color: C.gold, fontWeight: 700 }}>
            🎯 تَدَرَّبْ عَلَى دَرْسٍ
          </span>
          <span style={{ color: C.gold, fontSize: 13 }}>{showLessons ? "▾" : "‹"}</span>
        </div>
        <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "right", marginTop: 2 }}>
          Converse using only one lesson's vocabulary
        </div>
      </button>

      {showLessons && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, maxHeight: 320, overflowY: "auto" }}>
          {CURRICULUM.lessons.map((l, i) => (
            <button
              key={l.id}
              dir="rtl"
              className="card"
              onClick={() => setTopic({
                id: l.id,
                ar: l.title,
                en: `Lesson ${i + 1}`,
                open: `أَهْلًا! سَنَتَدَرَّبُ الْيَوْمَ عَلَى دَرْسِ «${l.title}». هَلْ أَنْتَ مُسْتَعِدٌّ؟`,
                lessonWords: (l.vocab || []).map((v) => `${v.ar} = ${v.en || ""}`).join("\n"),
                lessonTitle: l.title,
              })}
              style={{ width: "100%", padding: "9px 13px", display: "block", textAlign: "right" }}
            >
              <span style={{ fontSize: 10, color: C.faded, float: "left" }}>{i + 1}</span>
              <span className="arabic" style={{ fontSize: 18, color: C.ink }}>{l.title}</span>
            </button>
          ))}
        </div>
      )}

      <div dir="ltr" style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.12em", margin: "16px 0 7px" }}>
        OR A GENERAL TOPIC
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {TOPICS.map((t) => (
          <button key={t.id} dir="rtl" className="card" onClick={() => setTopic(t)}
            style={{ width: "100%", padding: "12px 14px", display: "block", textAlign: "right" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="arabic" style={{ fontSize: 21, color: C.ink }}>{t.ar}</span>
              <span dir="ltr" style={{ fontSize: 10.5, color: C.faded }}>{t.en}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Chat({ topic, level, onBack }) {
  const [turns, setTurns] = useState([{ who: "them", ar: topic.open }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const taRef = useRef(null);
  const endRef = useRef(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  // Speak instead of typing, where the browser allows it.
  const listen = () => {
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "ar-SA";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const said = e.results?.[0]?.[0]?.transcript || "";
      if (said) setText((t) => (t ? t + " " : "") + said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    setListening(true);
    r.start();
  };

  useEffect(() => { speak(topic.open); }, [topic]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  const send = async () => {
    const mine = text.trim();
    if (!mine) return;
    setText("");
    setErr(null);
    setTurns((t) => [...t, { who: "me", ar: mine }]);
    setBusy(true);
    try {
      const history = turns.map((t) => ({
        role: t.who === "me" ? "user" : "assistant",
        content: t.ar,
      }));
      const raw = await callAI({
        mode: "converse", level, text: mine, history,
        lessonWords: topic.lessonWords || null,
        lessonTitle: topic.lessonTitle || null,
      });
      const p = parseJSONLoose(raw);
      setTurns((t) => [
        ...t,
        { who: "them", ar: p.reply, note: p.note || "", corrected: p.corrected || "" },
      ]);
      if (p.reply) speak(p.reply);
    } catch (e) {
      setErr(String(e?.message || "Could not reach your partner."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fadein" style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 20, color: C.emerald }}>{topic.ar}</div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ flex: 1, marginTop: 10 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div
              dir="rtl"
              className="card"
              style={{
                padding: "12px 14px",
                marginLeft: t.who === "me" ? 0 : 34,
                marginRight: t.who === "me" ? 34 : 0,
                background: t.who === "me" ? C.emeraldSoft : C.surface,
                borderColor: t.who === "me" ? C.emerald : C.border,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div className="arabic" style={{ flex: 1, fontSize: 22, lineHeight: 2, textAlign: "right" }}>
                  {t.ar}
                </div>
                {t.who === "them" && (
                  <button onClick={() => speak(t.ar)} style={{ fontSize: 14, color: C.emerald, marginTop: 5 }}>🔊</button>
                )}
              </div>
            </div>

            {/* one correction, gently */}
            {t.corrected && (
              <div className="card" dir="rtl" style={{
                padding: "9px 12px", marginTop: 5, marginLeft: 34,
                background: C.goldSoft, borderColor: C.gold,
              }}>
                <div className="arabic" style={{ fontSize: 19, color: C.gold, textAlign: "right", lineHeight: 1.9 }}>
                  ✓ {t.corrected}
                </div>
                {t.note && (
                  <div dir="ltr" style={{ fontSize: 11, color: C.faded, marginTop: 3, lineHeight: 1.6, textAlign: "left" }}>
                    {t.note}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p className="arabic" dir="rtl" style={{ textAlign: "center", color: C.gold, fontSize: 17 }}>...</p>
        )}
        {err && (
          <div style={{ padding: 11, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12, textAlign: "center" }}>
            {err}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          ref={taRef}
          dir="rtl"
          className="arabic"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="أَجِبْ بِالْعَرَبِيَّةِ..."
          style={{
            width: "100%", minHeight: 62, padding: 11, fontSize: 21,
            borderRadius: 14, background: C.surface, border: `1.5px solid ${C.border}`, lineHeight: 1.9,
          }}
        />
        <TashkeelBar targetRef={taRef} />

        <div dir="rtl" style={{ display: "flex", gap: 7, marginTop: 7 }}>
          {SR && (
            <button
              onClick={listen}
              style={{
                width: 58, borderRadius: 12, fontSize: 21,
                background: listening ? C.red : C.emeraldSoft,
                border: `1.5px solid ${listening ? C.red : C.emerald}`,
                color: listening ? "#fff" : C.emerald,
              }}
              aria-label="speak"
            >
              {listening ? "⏹" : "🎤"}
            </button>
          )}
          <button className="btn-primary arabic"
            style={{ flex: 1, fontSize: 20, opacity: text.trim() && !busy ? 1 : 0.45 }}
            disabled={!text.trim() || busy}
            onClick={send}>
            أَرْسِلْ ←
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: C.faded, marginTop: 7, lineHeight: 1.6 }}>
          {SR
            ? (listening ? "Speaking — say your answer in Arabic" : "Tap 🎤 to speak, or type. Say it aloud either way.")
            : "Say your answer aloud before typing it. That is the part that matters."}
        </p>
      </div>
    </div>
  );
}
