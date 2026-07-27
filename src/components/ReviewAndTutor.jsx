import { useEffect, useRef, useState } from "react";
import { C, speak, callAI, shuffle, LEVELS, getLevel, setLevel, markSeen, needsHint } from "../lib/shared";
import { Beads } from "./LessonPlayer";

// Strip harakat/tanwin — used once a word is mastered (reps >= 4)
export function bare(word) {
  return word.replace(/[\u064B-\u0652\u0670]/g, "");
}

// ——— SRS review session ———
export function ReviewSession({ dueList, allVocab, srs = {}, onAnswer, onExit }) {
  const [queue] = useState(() => shuffle(dueList));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);

  const display = (w) => ((srs[w]?.reps ?? 0) >= 4 ? bare(w) : w);

  if (queue.length === 0 || pos >= queue.length) {
    return (
      <div className="card fadein" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>📿</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 28, color: C.emerald }}>
          اِنْتَهَتِ الْمُرَاجَعَةُ! أَحْسَنْتَ
        </div>
        <div style={{ color: C.faded, fontSize: 13, marginTop: 6 }}>{right}/{queue.length}</div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 18, fontSize: 21 }} onClick={onExit}>
          ← اَلدُّرُوسُ
        </button>
      </div>
    );
  }

  const word = queue[pos];
  const entry = allVocab.find((v) => v.ar === word) || { ar: word, emoji: "📖" };
  const distractors = shuffle(allVocab.filter((v) => v.ar !== word)).slice(0, 3);
  const options = picked ? optionsCache.current : shuffle([entry, ...distractors]);
  if (!picked) optionsCache.current = options;

  const choose = (opt) => {
    if (picked) return;
    const correct = opt.ar === word;
    setPicked({ ar: opt.ar, correct });
    speak(word);
    if (correct) setRight((r) => r + 1);
    onAnswer(word, correct);
  };

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.gold, fontWeight: 700 }}>مُرَاجَعَةٌ 📿</div>
        <div style={{ width: 34 }} />
      </div>
      <Beads total={queue.length} filled={pos + (picked ? 1 : 0)} />
      <div className="card" style={{ padding: "34px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 66 }}>{entry?.emoji}</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded, marginTop: 6 }}>مَا هَذَا؟</div>
      </div>
      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {options.map((opt) => {
          let bg = C.surface, bd = C.border, col = C.ink;
          if (picked) {
            if (opt.ar === word) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
            else if (opt.ar === picked.ar) { bg = C.redSoft; bd = C.red; col = C.red; }
          }
          return (
            <button key={opt.ar} onClick={() => choose(opt)}
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "11px 14px" }}>
              <span className="arabic" style={{ fontSize: 26, color: col }}>{display(opt.ar)}</span>
              {display(opt.ar) !== opt.ar && (
                <span style={{ fontSize: 10, color: C.gold, marginRight: 8 }}>👁️</span>
              )}
            </button>
          );
        })}
      </div>
      {picked && (
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }}
          onClick={() => { setPicked(null); setPos(pos + 1); }}>
          اَلتَّالِي
        </button>
      )}
    </div>
  );
}
const optionsCache = { current: [] };

// ——— AI tutor chat ———
const CHAT_KEY = "fusha_tutor_chat_v1";
const GREETING = { role: "assistant", content: "السَّلَامُ عَلَيْكُمْ! 👋\n👉 🏠 مَا هَذَا؟" };

function loadChat() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || "null");
    return Array.isArray(raw) && raw.length ? raw : [GREETING];
  } catch {
    return [GREETING];
  }
}
function saveChat(messages) {
  try {
    // keep the file bounded — last 80 messages is plenty of visible history
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-80)));
  } catch {}
}

export function Tutor({ learnedVocab, onExit }) {
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const [level, setLevelState] = useState(getLevel());
  useEffect(() => { markSeen("instr:tutorlevel"); }, []);
  const pickLevel = (l) => { setLevel(l); setLevelState(l); };
  const bottomRef = useRef(null);
  const recRef = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceNote("Voice input isn't supported in this browser — Chrome on Android works best. You can still type.");
      return;
    }
    if (listening) {
      try { recRef.current?.stop(); } catch {}
      setListening(false);
      return;
    }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = "ar-SA";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const t = e.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        if (t) send(t);
      };
      rec.onerror = () => {
        setListening(false);
        setVoiceNote("I couldn't hear that — try again closer to the mic, or type instead.");
      };
      rec.onend = () => setListening(false);
      setVoiceNote(null);
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setVoiceNote("Voice input failed to start — you can still type.");
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (arg) => {
    const text = (arg ?? input).trim();
    if (!text || loading) return;
    setError(false);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    saveChat(next);
    setInput("");
    setLoading(true);
    try {
      const vocab = learnedVocab.map((v) => `${v.ar} ${v.emoji}`).join("، ");
      const reply = await callAI({ mode: "tutor", vocab, level, messages: next });
      setMessages((m) => {
        const withReply = [...m, { role: "assistant", content: reply }];
        saveChat(withReply);
        return withReply;
      });
      speak(reply);
    } catch {
      setError(true);
      setMessages(next.slice(0, -1));
      saveChat(next.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const starters = ["وَعَلَيْكُمُ السَّلَامُ", "مَا هَذَا؟", "مَا مَعْنَى...؟"];

  return (
    <div className="fadein" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 40px)", maxHeight: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.emerald, fontWeight: 700 }}>اَلْمُعَلِّمُ 🎓</div>
        <button
          onClick={() => {
            setMessages([GREETING]);
            saveChat([GREETING]);
          }}
          style={{ color: C.faded, fontSize: 12, padding: 6 }}
          aria-label="start new conversation"
        >
          ↺ جَدِيدَة
        </button>
      </div>

      {needsHint("instr:tutorlevel") && (
        <p style={{ textAlign: "center", fontSize: 10.5, color: C.faded, marginTop: 6 }}>
          Your level — beginner · intermediate · advanced
        </p>
      )}
      <div dir="rtl" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 4 }}>
        {LEVELS.map((l) => (
          <button key={l.id} onClick={() => pickLevel(l.id)}
            style={{
              borderRadius: 999, padding: "4px 12px",
              background: level === l.id ? C.emerald : "transparent",
              border: `1px solid ${level === l.id ? C.emerald : C.border}`,
            }}>
            <span className="arabic" style={{ fontSize: 16, color: level === l.id ? "#fff" : C.emerald }}>
              {l.emoji} {l.ar}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ flex: 1, marginTop: 10, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} dir="rtl"
            style={{
              maxWidth: "85%", borderRadius: 16, padding: "10px 14px",
              alignSelf: m.role === "user" ? "flex-start" : "flex-end",
              background: m.role === "user" ? C.emeraldSoft : C.paper,
              border: `1px solid ${C.border}`,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
            <span className="arabic" style={{ fontSize: 23, whiteSpace: "pre-line" }}>{m.content}</span>
            {m.role === "assistant" && (
              <button onClick={() => speak(m.content)} aria-label="listen"
                style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: "50%", width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>
                🔊
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div dir="rtl" style={{ alignSelf: "flex-end", background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, padding: "10px 14px" }}>
            <span className="arabic" style={{ fontSize: 20, color: C.faded }}>...</span>
          </div>
        )}
        {error && (
          <div style={{ alignSelf: "center", background: C.redSoft, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 10 }}>
            The tutor didn't respond — check the connection and send again.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {starters.map((s) => (
          <button key={s} onClick={() => send(s)}
            style={{ background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 999, padding: "6px 12px" }}>
            <span className="arabic" style={{ fontSize: 18 }}>{s}</span>
          </button>
        ))}
      </div>

      {voiceNote && (
        <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: C.goldSoft, color: C.ink, fontSize: 12, textAlign: "center" }}>
          {voiceNote}
        </div>
      )}
      <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={startListening}
          disabled={loading}
          aria-label="speak"
          style={{
            width: 52, borderRadius: 14, fontSize: 22,
            background: listening ? C.red : C.emeraldSoft,
            color: listening ? "#fff" : C.emerald,
            border: `1.5px solid ${listening ? C.red : C.emerald}`,
          }}
        >
          {listening ? "⏹" : "🎤"}
        </button>
        <input
          dir="rtl"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={listening ? "أَسْمَعُكَ... تَكَلَّمْ 🎙️" : (needsHint("instr:tutorinput") ? "اُكْتُبْ أَوْ تَكَلَّمْ... (type or tap 🎤)" : "اُكْتُبْ أَوْ تَكَلَّمْ...")}
          className="arabic"
          style={{ flex: 1, borderRadius: 14, padding: "11px 14px", fontSize: 22, background: C.surface, border: `1.5px solid ${listening ? C.red : C.border}` }}
        />
        <button onClick={() => send()} disabled={loading} className="btn-primary" style={{ padding: "0 20px" }}>➤</button>
      </div>
    </div>
  );
}
