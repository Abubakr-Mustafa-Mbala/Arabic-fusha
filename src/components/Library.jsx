import { useEffect, useState } from "react";
import { C, speak, callAI, parseJSONLoose, shuffle, getLevel } from "../lib/shared";
import { gradeBand } from "../data/curriculum";
import { fetchDocs, insertDoc, updateDocScore, deleteDoc, fileToBase64, fileToText } from "../lib/docs";
import { Beads } from "./LessonPlayer";
import Dictionary from "./Dictionary";

// A PDF is sent as base64, which grows it by about a third, and the serverless
// function accepts at most 6 MB per request. Anything over ~3.5 MB fails at the
// network layer and looks like a connection problem, so we stop it here instead.
// Netlify caps a function REQUEST at 6 MB, and base64 inflates a file by ~37%.
// It also caps the function's own runtime at 10 seconds, and a large PDF cannot
// be read by the model in that window. Both limits point to the same number.
const MAX_PDF_MB = 2;

export default function Library({ session, onExit, onNewVocab }) {
  const [dictWord, setDictWord] = useState(null);
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState({ name: "list" });
  const userId = session?.user?.id || null;

  useEffect(() => {
    fetchDocs(userId).then(setDocs).catch(() => setDocs([]));
  }, [userId]);

  if (dictWord !== null) {
    return (
      <Dictionary
        initialWord={dictWord}
        onExit={() => setDictWord(null)}
        onAddWord={(v) => onNewVocab([v])}
      />
    );
  }

  if (view.name === "add") {
    return (
      <AddDoc
        onCancel={() => setView({ name: "list" })}
        onIngested={async (doc) => {
          try {
            const savedDoc = await insertDoc(userId, doc);
            setDocs((d) => [savedDoc, ...(d || [])]);
            onNewVocab(doc.vocab);
            setView({ name: "doc", doc: savedDoc, fresh: true });
          } catch {
            setView({ name: "list" });
          }
        }}
      />
    );
  }

  if (view.name === "doc") {
    return (
      <DocView
        doc={view.doc}
        fresh={view.fresh}
        onLookup={(w) => setDictWord(w)}
        onBack={() => setView({ name: "list" })}
        onDelete={async () => {
          await deleteDoc(userId, view.doc.id).catch(() => {});
          setDocs((d) => d.filter((x) => x.id !== view.doc.id));
          setView({ name: "list" });
        }}
        onQuizDone={async (score) => {
          await updateDocScore(userId, view.doc.id, score).catch(() => {});
          setDocs((d) =>
            d.map((x) =>
              x.id === view.doc.id
                ? { ...x, best_score: Math.max(x.best_score || 0, score), last_practiced: new Date().toISOString() }
                : x
            )
          );
        }}
      />
    );
  }

  return (
    <div className="fadein">
      <Header title="اَلْمَكْتَبَةُ 📚" onBack={onExit} />
      <p style={{ fontSize: 12, color: C.faded, textAlign: "center", margin: "4px 0 14px" }}>
        Upload an Arabic text — its vocabulary joins your revision, and the app quizzes you on its contents.
      </p>
      <button className="btn-primary arabic" dir="rtl" style={{ width: "100%", fontSize: 22 }} onClick={() => setView({ name: "add" })}>
        ➕ أَضِفْ نَصًّا جَدِيدًا
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {docs === null && <p style={{ textAlign: "center", color: C.faded }}>...</p>}
        {docs && docs.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: C.faded }}>
            <div style={{ fontSize: 40 }}>📚</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Your library is empty — add your first text above.</div>
          </div>
        )}
        {docs && docs.map((d) => {
          const band = d.best_score != null ? gradeBand(d.best_score) : null;
          return (
            <button key={d.id} dir="rtl" className="card" onClick={() => setView({ name: "doc", doc: d })}
              style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div style={{ textAlign: "right" }}>
                  <div className="arabic" style={{ fontSize: 24, color: C.ink }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: C.faded }}>
                    {(d.vocab || []).length} words {d.last_practiced ? "· practiced" : "· not practiced yet"}
                  </div>
                </div>
              </div>
              {band && <span className="arabic" style={{ fontSize: 17, color: band.color, fontWeight: 700 }}>{band.ar}</span>}
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
      <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function AddDoc({ onCancel, onIngested }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ingest = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      const raw = await callAI({ mode: "ingest", ...payload });
      const parsed = parseJSONLoose(raw);
      if (parsed.error === "no_arabic") {
        setError("No Arabic text was found in that document — the Library practices Arabic content.");
        return;
      }
      if (!parsed.title || !parsed.excerpt || !Array.isArray(parsed.vocab)) throw new Error("bad");
      onIngested({ title: parsed.title, content: parsed.excerpt, vocab: parsed.vocab });
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("413")) {
        setError(
          "The document did not reach the server — almost always because the file is too big. " +
          "Try a smaller PDF, or paste the text directly above."
        );
      } else {
        setError("Couldn't process that document. Try pasting its text instead.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        if (file.size > MAX_PDF_MB * 1024 * 1024) {
          setError(
            `That PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large to send. ` +
            `Keep it under ${MAX_PDF_MB} MB (one chapter, not a whole book). ` +
            `You can also paste the text directly in the box above, which always works.`
          );
          return;
        }
        const b64 = await fileToBase64(file);
        await ingest({ pdf_base64: b64 });
      } else {
        const t = await fileToText(file);
        await ingest({ text: t });
      }
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("413") || msg.includes("too large") || msg.includes("Payload")) {
        setError("The file was too large for the server. Try a smaller PDF, or paste the text instead.");
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("The upload did not reach the server. This is usually the file being too big — try a smaller one, or paste the text.");
      } else {
        setError("Could not read that file. Try pasting its text into the box above instead.");
      }
    }
  };

  return (
    <div className="fadein">
      <Header title="نَصٌّ جَدِيدٌ ➕" onBack={onCancel} />
      <textarea
        dir="rtl"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اِلْصَقِ النَّصَّ الْعَرَبِيَّ هُنَا... (paste Arabic text here)"
        className="arabic"
        style={{
          width: "100%", minHeight: 160, marginTop: 12, padding: 14, fontSize: 22,
          background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, resize: "vertical",
        }}
      />
      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 12, fontSize: 21 }}
        disabled={busy || !text.trim()} onClick={() => ingest({ text })}>
        {busy ? "..." : "حَلِّلِ النَّصَّ ✓"}
      </button>

      <div style={{ textAlign: "center", margin: "14px 0 6px", color: C.faded, fontSize: 12 }}>— or upload a file —</div>
      <label className="card" style={{ display: "block", padding: 16, textAlign: "center", cursor: "pointer", borderStyle: "dashed" }}>
        <span style={{ fontSize: 26 }}>📎</span>
        <div style={{ fontSize: 13, color: C.faded, marginTop: 4 }}>PDF (≤ {MAX_PDF_MB} MB) or .txt</div>
        <div style={{ fontSize: 10.5, color: C.faded, marginTop: 2, lineHeight: 1.6 }}>
          A whole book will not upload — the server has a hard size and time limit.
          <br />
          <b>Paste one chapter's text in the box above instead. That always works.</b>
        </div>
        <input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={onFile} style={{ display: "none" }} disabled={busy} />
      </label>

      {busy && <p style={{ textAlign: "center", color: C.gold, fontSize: 13, marginTop: 12 }}>Reading the document, harvesting vocabulary...</p>}
      {error && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 13, textAlign: "center" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function DocView({ doc, fresh, onBack, onDelete, onQuizDone, onLookup }) {
  const [mode, setMode] = useState("view"); // view | quiz | explain
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (mode === "quiz") {
    return <DocQuiz doc={doc} onExit={() => setMode("view")} onDone={onQuizDone} />;
  }
  if (mode === "explain") {
    return <DocExplain doc={doc} onExit={() => setMode("view")} />;
  }

  return (
    <div className="fadein">
      <Header title={doc.title} onBack={onBack} />
      {fresh && (
        <div className="card" dir="rtl" style={{ marginTop: 10, padding: 12, borderColor: C.gold, textAlign: "center" }}>
          <span className="arabic" style={{ fontSize: 19, color: C.gold }}>
            ✅ {doc.vocab.length} كَلِمَةً دَخَلَتْ فِي مُرَاجَعَتِكَ 📿
          </span>
        </div>
      )}

      <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {(doc.vocab || []).map((v) => (
          <button
            key={v.ar}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              speak(v.ar);
              onLookup(String(v.ar).replace(/[^\u0600-\u06FF]/g, ""));
            }}
            style={{
              background: C.emeraldSoft, border: `1px solid ${C.emerald}`, borderRadius: 999,
              padding: "7px 14px", touchAction: "manipulation",
              WebkitTapHighlightColor: "rgba(14,82,55,0.2)",
            }}
          >
            <span className="arabic" style={{ fontSize: 20, color: C.emerald }}>{v.emoji} {v.ar}</span>
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.faded }}>
        👆 Tap any word above or below — it opens in the dictionary
      </div>
      <div className="card" dir="rtl" style={{ marginTop: 6, padding: 16, maxHeight: 260, overflowY: "auto" }}>
        <p className="arabic" style={{ fontSize: 23, lineHeight: 2.1 }}>
          {doc.content.split(/(\s+)/).map((tok, i) => {
            const clean = tok.replace(/[^\u0600-\u06FF]/g, "");
            if (!/\S/.test(tok)) return tok;
            if (!clean) return tok;   // punctuation stays plain
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLookup(clean); }}
                className="arabic"
                style={{
                  background: "transparent", border: "none", padding: "1px 2px", margin: 0,
                  fontSize: "inherit", fontFamily: "inherit", lineHeight: "inherit",
                  color: C.ink, cursor: "pointer", borderRadius: 5,
                  borderBottom: `1px dotted ${C.border}`,
                  WebkitTapHighlightColor: "rgba(14,82,55,0.15)",
                  touchAction: "manipulation",
                }}
              >
                {tok}
              </button>
            );
          })}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }} dir="rtl">
        <button className="btn-primary arabic" style={{ flex: 1, fontSize: 20 }} onClick={() => setMode("quiz")}>
          اِخْتَبِرْ فَهْمَكَ 🎯
        </button>
        <button className="arabic" onClick={() => setMode("explain")}
          style={{ flex: 1, fontSize: 20, borderRadius: 14, padding: "13px 10px", background: C.goldSoft, border: `1.5px solid ${C.gold}`, color: C.ink, fontWeight: 600 }}>
          اِشْرَحْ لِي 🧑‍🏫
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 11, color: C.faded }}>
            Remove from library
          </button>
        ) : (
          <button onClick={onDelete} style={{ fontSize: 12, color: C.red }}>
            Tap again to confirm removal
          </button>
        )}
      </div>
    </div>
  );
}

function DocQuiz({ doc, onExit, onDone }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let alive = true;
    callAI({ mode: "docquiz", content: doc.content, count: 5, level: getLevel() })
      .then((raw) => {
        const parsed = parseJSONLoose(raw).filter(
          (d) => d.q && Array.isArray(d.options) && d.options.includes(d.a)
        );
        if (!parsed.length) throw new Error("empty");
        if (alive) setItems(parsed.map((d) => ({ ...d, options: shuffle(d.options) })));
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [doc]);

  if (error) {
    return (
      <div className="fadein">
        <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 13, textAlign: "center" }}>
          Couldn't generate the quiz — check the connection and try again.
        </div>
      </div>
    );
  }
  if (!items) {
    return (
      <div className="fadein">
        <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
        <p style={{ textAlign: "center", color: C.gold, marginTop: 30 }}>Writing your questions...</p>
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
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 18, fontSize: 21 }} onClick={onExit}>
          ← اَلنَّصُّ
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
    else {
      const score = Math.round(((right) / items.length) * 100);
      onDone(score);
      setFinished(true);
    }
  };

  return (
    <div className="fadein">
      <Header title="اِخْتِبَارٌ 🎯" onBack={onExit} />
      <Beads total={items.length} filled={right} />
      <div className="card" style={{ padding: "22px 16px" }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 26, textAlign: "center" }}>{item.q}</div>
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
              style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "11px 14px" }}>
              <span className="arabic" style={{ fontSize: 24, color: col }}>{opt}</span>
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


function DocExplain({ doc, onExit }) {
  const [text, setText] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    callAI({ mode: "explain", content: doc.content })
      .then((t) => alive && setText(t))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [doc]);

  return (
    <div className="fadein">
      <Header title="اَلشَّرْحُ 🧑‍🏫" onBack={onExit} />
      {!text && !error && (
        <p style={{ textAlign: "center", color: C.gold, fontSize: 13, marginTop: 24 }}>
          Your teacher is preparing the breakdown...
        </p>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 13, textAlign: "center" }}>
          Couldn't generate the explanation — check the connection and try again.
        </div>
      )}
      {text && (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <button onClick={() => speak(text)} aria-label="listen"
              style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: 999, padding: "8px 18px", fontSize: 14 }}>
              🔊 اِسْتَمِعْ
            </button>
          </div>
          <div className="card" dir="rtl" style={{ marginTop: 10, padding: 18 }}>
            <div className="arabic" style={{ fontSize: 23, whiteSpace: "pre-line", lineHeight: 2.1 }}>{text}</div>
          </div>
        </>
      )}
    </div>
  );
}
