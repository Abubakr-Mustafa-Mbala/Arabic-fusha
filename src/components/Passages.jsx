import { useEffect, useRef, useState } from "react";
import { C, shuffle } from "../lib/shared";
import { gradeBand } from "../data/curriculum";
import { fetchPassages, savePassage, uploadPassageAudio, deletePassage, audioUrl } from "../lib/recordings";
import { Beads } from "./LessonPlayer";

// اَلنُّصُوصُ الْمَسْمُوعَةُ — a human reads a full passage aloud.
// Learners hear it (text hidden by default), then answer comprehension questions.
// Recorders (the shaykh / trusted reciters) add passages via the studio.

export default function Passages({ session, canRecord, onExit, onLookup }) {
  const [list, setList] = useState(null);
  const [view, setView] = useState({ name: "list" });

  const load = () => fetchPassages().then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  if (view.name === "listen") {
    return <ListenPassage passage={view.p} onExit={() => setView({ name: "list" })} onLookup={onLookup} />;
  }
  if (view.name === "add") {
    return (
      <AddPassage
        session={session}
        existing={view.p}
        onDone={() => { load(); setView({ name: "list" }); }}
        onCancel={() => setView({ name: "list" })}
      />
    );
  }

  return (
    <div className="fadein">
      <Header title="اَلنُّصُوصُ الْمَسْمُوعَةُ 🎧" onBack={onExit} />
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, margin: "4px 0 12px" }}>
        Listen to a real human reading — then test what you understood
      </p>

      {canRecord && (
        <button className="btn-primary arabic" style={{ width: "100%", fontSize: 21, marginBottom: 12 }}
          onClick={() => setView({ name: "add" })}>
          ➕ أَضِفْ نَصًّا مَسْمُوعًا
        </button>
      )}

      {list === null && <p style={{ textAlign: "center", color: C.faded }}>...</p>}
      {list && list.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: "center", color: C.faded }}>
          <div style={{ fontSize: 34 }}>🎧</div>
          <div className="arabic" dir="rtl" style={{ fontSize: 20, marginTop: 6 }}>لَا نُصُوصَ بَعْدُ</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            No recorded passages yet — a reciter needs to add the first one.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list && list.map((p) => (
          <button key={p.id} dir="rtl" className="card" onClick={() => setView({ name: "listen", p })}
            style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{p.storage_path ? "🎧" : "📄"}</span>
              <div style={{ textAlign: "right" }}>
                <div className="arabic" style={{ fontSize: 23, color: C.ink }}>{p.title}</div>
                <div style={{ fontSize: 10, color: C.faded }}>
                  {p.source || "—"} · {(p.questions || []).length} سُؤَال
                </div>
              </div>
            </div>
            <span style={{ color: C.faded }}>‹</span>
          </button>
        ))}
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

// ——— listening experience ———
function ListenPassage({ passage, onExit, onLookup }) {
  const [showText, setShowText] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const url = passage.storage_path ? audioUrl(passage.storage_path) : null;

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = () => {
    if (!url) return;
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    const a = audioRef.current || new Audio(url);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
  };

  if (quiz) {
    return <PassageQuiz passage={passage} onExit={() => setQuiz(false)} />;
  }

  return (
    <div className="fadein">
      <Header title={passage.title} onBack={onExit} />

      <div className="card" style={{ padding: "26px 18px", textAlign: "center", marginTop: 10 }}>
        {url ? (
          <>
            <button onClick={toggle}
              style={{ background: C.emerald, color: "#fff", border: "none", borderRadius: "50%", width: 88, height: 88, fontSize: 34 }}>
              {playing ? "⏸" : "▶️"}
            </button>
            <div style={{ marginTop: 10 }}>
              <button onClick={restart} style={{ fontSize: 13, color: C.faded }}>↺ مِنَ الْبِدَايَةِ</button>
            </div>
            <p className="arabic" dir="rtl" style={{ fontSize: 18, color: C.faded, marginTop: 8 }}>
              اِسْتَمِعْ جَيِّدًا 👂
            </p>
            <p style={{ fontSize: 11, color: C.faded }}>Listen first — reveal the text only if you need it</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: C.faded }}>No audio recorded for this passage yet.</p>
        )}
      </div>

      <button onClick={() => setShowText((v) => !v)} className="card" dir="rtl"
        style={{ width: "100%", marginTop: 10, padding: "10px 16px", textAlign: "center" }}>
        <span className="arabic" style={{ fontSize: 19, color: C.gold }}>
          {showText ? "🙈 أَخْفِ النَّصَّ" : "👁️ أَظْهِرِ النَّصَّ"}
        </span>
      </button>

      {showText && (
        <div className="card fadein" dir="rtl" style={{ marginTop: 10, padding: 18, maxHeight: 300, overflowY: "auto" }}>
          <p className="arabic" style={{ fontSize: 24, lineHeight: 2.2 }}>
            {passage.text_ar.split(/(\s+)/).map((tok, i) =>
              /\S/.test(tok) ? (
                <span key={i} onClick={() => onLookup?.(tok.replace(/[^\u0600-\u06FF]/g, ""))} style={{ cursor: "pointer" }}>
                  {tok}
                </span>
              ) : tok
            )}
          </p>
        </div>
      )}

      {(passage.questions || []).length > 0 && (
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} onClick={() => setQuiz(true)}>
          اِخْتَبِرْ فَهْمَكَ 🎯
        </button>
      )}
    </div>
  );
}

// ——— comprehension quiz on what was heard ———
function PassageQuiz({ passage, onExit }) {
  const [items] = useState(() =>
    (passage.questions || []).map((q) => ({ ...q, options: shuffle([...q.options]) }))
  );
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    const score = Math.round((right / items.length) * 100);
    const band = gradeBand(score);
    return (
      <div className="card fadein" style={{ padding: 28, textAlign: "center", marginTop: 10 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.faded }}>نَتِيجَةُ الِاسْتِمَاعِ</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: band.color }}>{score}%</div>
        <div className="arabic" dir="rtl" style={{ fontSize: 34, color: band.color }}>{band.ar}</div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 18, fontSize: 21 }} onClick={onExit}>
          ← اَلنَّصُّ
        </button>
      </div>
    );
  }

  const item = items[pos];
  const choose = (o) => {
    if (picked) return;
    setPicked({ o, ok: o === item.a });
    if (o === item.a) setRight((r) => r + 1);
  };
  const next = () => {
    setPicked(null);
    if (pos < items.length - 1) setPos(pos + 1);
    else setDone(true);
  };

  return (
    <div className="fadein">
      <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
      <Beads total={items.length} filled={right} />
      <div className="card" style={{ padding: "20px 16px" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 24, textAlign: "center" }}>{item.q}</div>
      </div>
      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {item.options.map((o) => {
          let bg = C.surface, bd = C.border, col = C.ink;
          if (picked) {
            if (o === item.a) { bg = C.emeraldSoft; bd = C.emerald; col = C.emerald; }
            else if (o === picked.o) { bg = C.redSoft; bd = C.red; col = C.red; }
          }
          return (
            <button key={o} onClick={() => choose(o)}
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "11px 14px", textAlign: "right" }}>
              <span className="arabic" style={{ fontSize: 22, color: col }}>{o}</span>
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

// ——— recorder: add a passage, record it, author questions ———
function AddPassage({ session, existing, onDone, onCancel }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [source, setSource] = useState(existing?.source || "");
  const [text, setText] = useState(existing?.text_ar || "");
  const [questions, setQuestions] = useState(existing?.questions || []);
  const [path, setPath] = useState(existing?.storage_path || null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBusy(true);
        try {
          const p = await uploadPassageAudio(blob);
          setPath(p);
        } catch (e) {
          setError("Audio upload failed: " + (e?.message || "unknown"));
        } finally {
          setBusy(false);
        }
      };
      mr.start();
      setRecording(true);
    } catch {
      setError("Microphone blocked — allow mic access for this site.");
    }
  };
  const stop = () => { try { mediaRef.current?.stop(); } catch {} setRecording(false); };

  const addQ = () => setQuestions((qs) => [...qs, { q: "", options: ["", "", "", ""], a: "" }]);
  const setQ = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, k, v) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, options: q.options.map((o, m) => (m === k ? v : o)) } : q)));

  const save = async () => {
    setError(null);
    if (!title.trim() || !text.trim()) { setError("Title and Arabic text are required."); return; }
    setBusy(true);
    try {
      const clean = questions
        .filter((q) => q.q.trim() && q.a.trim() && q.options.filter((o) => o.trim()).length >= 2)
        .map((q) => ({ q: q.q.trim(), a: q.a.trim(), options: q.options.filter((o) => o.trim()) }));
      await savePassage(session?.user?.id, {
        id: existing?.id, title: title.trim(), source: source.trim(),
        text_ar: text.trim(), storage_path: path, questions: clean,
      });
      onDone();
    } catch (e) {
      setError("Save failed: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const inp = {
    width: "100%", borderRadius: 12, padding: "10px 12px", fontSize: 16,
    background: C.surface, border: `1.5px solid ${C.border}`, marginTop: 6,
  };

  return (
    <div className="fadein">
      <Header title="نَصٌّ مَسْمُوعٌ ➕" onBack={onCancel} />

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (Arabic)" dir="rtl" className="arabic" style={{ ...inp, fontSize: 22 }} />
      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source / book (optional)" style={inp} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} dir="rtl" className="arabic"
        placeholder="اِلْصَقِ النَّصَّ الْعَرَبِيَّ هُنَا..." style={{ ...inp, minHeight: 140, fontSize: 22, resize: "vertical" }} />

      {/* recording */}
      <div className="card" style={{ marginTop: 12, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.faded, marginBottom: 8 }}>
          {path ? "✅ Recording saved — record again to replace it" : "Read the passage aloud and record it"}
        </div>
        {!recording ? (
          <button onClick={start} disabled={busy}
            style={{ background: C.emeraldSoft, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 12, padding: "12px 22px", fontSize: 16 }}>
            {busy ? "..." : path ? "🎙️ إِعَادَةُ التَّسْجِيلِ" : "🎙️ سَجِّلْ"}
          </button>
        ) : (
          <button onClick={stop}
            style={{ background: C.red, color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 16 }}>
            ⏹ إِيقَاف
          </button>
        )}
      </div>

      {/* questions */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="arabic" dir="rtl" style={{ fontSize: 20, color: C.emerald }}>أَسْئِلَةُ الْفَهْمِ</span>
          <button onClick={addQ} style={{ fontSize: 13, color: C.gold }}>➕ سُؤَال</button>
        </div>
        {questions.map((q, i) => (
          <div key={i} className="card" style={{ padding: 12, marginTop: 8 }}>
            <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} dir="rtl" className="arabic"
              placeholder="اَلسُّؤَالُ..." style={{ ...inp, fontSize: 20, marginTop: 0 }} />
            {q.options.map((o, k) => (
              <input key={k} value={o} onChange={(e) => setOpt(i, k, e.target.value)} dir="rtl" className="arabic"
                placeholder={`خِيَار ${k + 1}`} style={{ ...inp, fontSize: 18 }} />
            ))}
            <input value={q.a} onChange={(e) => setQ(i, { a: e.target.value })} dir="rtl" className="arabic"
              placeholder="اَلْجَوَابُ الصَّحِيحُ (يُطَابِقُ أَحَدَ الْخِيَارَاتِ)"
              style={{ ...inp, fontSize: 18, borderColor: C.emerald }} />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12, textAlign: "center" }}>
          {error}
        </div>
      )}

      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} disabled={busy} onClick={save}>
        {busy ? "..." : "حَفْظٌ ✓"}
      </button>
    </div>
  );
}
