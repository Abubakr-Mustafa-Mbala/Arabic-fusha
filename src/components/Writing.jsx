import { useRef, useState } from "react";
import { C, speak, callAI, parseJSONLoose } from "../lib/shared";
import { DICTATION, COMPOSITION } from "../data/dictation";
import TashkeelBar from "./TashkeelBar";

// اَلْإِمْلَاءُ وَالتَّعْبِيرُ — dictation and composition, the two writing subjects
// the Madinah institute teaches separately from grammar.

export default function Writing({ unlockedIds = [], onExit }) {
  const [tab, setTab] = useState("imla");
  const [open, setOpen] = useState(null);

  if (open?.kind === "imla") return <Dictation set={open.set} onBack={() => setOpen(null)} />;
  if (open?.kind === "tabir") return <Composition task={open.task} onBack={() => setOpen(null)} />;

  const list = tab === "imla" ? DICTATION : COMPOSITION;

  return (
    <div className="fadein">
      <Header title="اَلْكِتَابَةُ" onBack={onExit} />

      <div dir="rtl" style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {[["imla", "اَلْإِمْلَاءُ", "Dictation"], ["tabir", "اَلتَّعْبِيرُ", "Composition"]].map(([id, ar, en]) => (
          <button key={id} onClick={() => setTab(id)} className="card"
            style={{
              flex: 1, padding: "9px 6px", textAlign: "center",
              borderColor: tab === id ? C.emerald : C.border,
              background: tab === id ? C.emeraldSoft : C.surface,
            }}>
            <div className="arabic" style={{ fontSize: 19, color: tab === id ? C.emerald : C.ink }}>{ar}</div>
            <div style={{ fontSize: 9, color: C.faded }}>{en}</div>
          </button>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 10.5, color: C.faded, margin: "10px 0" }}>
        {tab === "imla"
          ? "Listen, then write it exactly — spelling is its own skill"
          : "Write your own Arabic; the teacher will correct it"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((x) => {
          const ready = !unlockedIds.length || unlockedIds.includes(x.after);
          return (
            <button key={x.id} dir="rtl" className="card" disabled={!ready}
              onClick={() => ready && setOpen(tab === "imla" ? { kind: "imla", set: x } : { kind: "tabir", task: x })}
              style={{ width: "100%", padding: "13px 15px", display: "block", opacity: ready ? 1 : 0.45 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div className="arabic" style={{ fontSize: 22, color: C.ink }}>{x.focus || x.title}</div>
                  <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "right" }}>
                    {x.focusEn || x.titleEn}
                  </div>
                </div>
                <span dir="ltr" style={{ fontSize: 9.5, color: C.faded }}>level {x.level}</span>
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

const bare = (t) => String(t).replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/\s+/g, " ").trim();

function Dictation({ set, onBack }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(null);
  const [right, setRight] = useState(0);
  const taRef = useRef(null);

  const item = set.items[i];
  const last = i === set.items.length - 1;

  const check = () => {
    // compare ignoring harakat — the learner is being tested on letters and spelling
    const ok = bare(text) === bare(item.ar);
    setChecked({ ok });
    if (ok) setRight((r) => r + 1);
  };

  if (checked?.done) {
    return (
      <div className="fadein">
        <Header title={set.focus} onBack={onBack} />
        <div className="card" style={{ padding: 26, textAlign: "center", marginTop: 14, borderColor: C.emerald }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.emerald }}>{right} / {set.items.length}</div>
          <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald }}>
            {right === set.items.length ? "أَحْسَنْتَ" : "أَعِدِ الْمُحَاوَلَةَ"}
          </div>
        </div>
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 12, fontSize: 20 }} onClick={onBack}>
          ← اَلْكِتَابَةُ
        </button>
      </div>
    );
  }

  return (
    <div className="fadein">
      <Header title={set.focus} onBack={onBack} />
      <p dir="ltr" style={{ textAlign: "center", fontSize: 10, color: C.faded }}>
        {i + 1} / {set.items.length} · {right} correct
      </p>

      <div className="card" style={{ padding: "26px 16px", marginTop: 10, textAlign: "center" }}>
        <button onClick={() => speak(item.ar)}
          style={{
            background: C.emerald, color: "#fff", border: "none", borderRadius: "50%",
            width: 62, height: 62, fontSize: 24,
          }}>🔊</button>
        <div style={{ fontSize: 11, color: C.faded, marginTop: 8 }}>
          Listen as many times as you need, then write it
        </div>
      </div>

      <textarea
        ref={taRef}
        dir="rtl"
        className="arabic"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!checked}
        placeholder="اُكْتُبْ مَا سَمِعْتَ..."
        style={{
          width: "100%", minHeight: 90, marginTop: 12, padding: 12, fontSize: 24,
          borderRadius: 14, background: C.surface,
          border: `1.5px solid ${checked ? (checked.ok ? C.emerald : C.red) : C.border}`,
        }}
      />
      {!checked && <TashkeelBar targetRef={taRef} />}

      {checked && (
        <div className="card fadein" dir="rtl" style={{
          padding: 14, marginTop: 10, borderColor: checked.ok ? C.emerald : C.gold,
        }}>
          <div className="arabic" style={{ fontSize: 24, textAlign: "center", color: C.emerald, lineHeight: 1.9 }}>
            {item.ar}
          </div>
          {item.note && (
            <div dir="ltr" style={{ fontSize: 12.5, color: C.ink, marginTop: 8, lineHeight: 1.7, textAlign: "left" }}>
              {item.note}
            </div>
          )}
        </div>
      )}

      <button
        className="btn-primary arabic"
        style={{ width: "100%", marginTop: 12, fontSize: 20, opacity: text.trim() || checked ? 1 : 0.45 }}
        disabled={!text.trim() && !checked}
        onClick={() => {
          if (!checked) return check();
          if (last) setChecked({ done: true });
          else { setI(i + 1); setText(""); setChecked(null); }
        }}
      >
        {!checked ? "تَحَقَّقْ ✓" : last ? "اَلنَّتِيجَةُ" : "اَلتَّالِيَةُ →"}
      </button>
    </div>
  );
}

function Composition({ task, onBack }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const taRef = useRef(null);

  const submit = async () => {
    setLoading(true);
    try {
      const raw = await callAI("compose", {
        prompt: task.prompt,
        expected: task.use.join("، "),
        text,
      });
      setResult(parseJSONLoose(raw) || { feedback: raw });
    } catch {
      setResult({ feedback: "لَمْ أَسْتَطِعِ التَّصْحِيحَ الْآنَ — حَاوِلْ مَرَّةً أُخْرَى." });
    } finally { setLoading(false); }
  };

  return (
    <div className="fadein">
      <Header title={task.title} onBack={onBack} />

      <div className="card" style={{ padding: 16, marginTop: 10 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 21, textAlign: "center", lineHeight: 1.9 }}>
          {task.prompt}
        </div>
        <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "center", marginTop: 4 }}>
          {task.titleEn}
        </div>

        <div dir="rtl" style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.12em", marginBottom: 5 }}>اِسْتَعِنْ بِهَذَا</div>
          {task.scaffold.map((line, k) => (
            <div key={k} className="arabic" style={{ fontSize: 19, color: C.faded, padding: "3px 0" }}>{line}</div>
          ))}
        </div>

        <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {task.use.map((u) => (
            <span key={u} className="arabic" style={{
              fontSize: 13, padding: "3px 9px", borderRadius: 99,
              background: C.emeraldSoft, color: C.emerald,
            }}>{u}</span>
          ))}
        </div>
      </div>

      <textarea
        ref={taRef}
        dir="rtl"
        className="arabic"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اُكْتُبْ هُنَا..."
        style={{
          width: "100%", minHeight: 160, marginTop: 12, padding: 12, fontSize: 22,
          borderRadius: 14, background: C.surface, border: `1.5px solid ${C.border}`, lineHeight: 1.9,
        }}
      />
      <TashkeelBar targetRef={taRef} />

      {result && (
        <div className="card fadein" dir="rtl" style={{ padding: 14, marginTop: 10, borderColor: C.emerald }}>
          {result.corrected && (
            <>
              <div style={{ fontSize: 10, color: C.emerald, letterSpacing: "0.12em" }}>اَلتَّصْحِيحُ</div>
              <div className="arabic" style={{ fontSize: 21, lineHeight: 2, marginTop: 4 }}>{result.corrected}</div>
            </>
          )}
          {result.feedback && (
            <div dir="ltr" style={{ fontSize: 13, color: C.ink, marginTop: 10, lineHeight: 1.75, textAlign: "left" }}>
              {result.feedback}
            </div>
          )}
        </div>
      )}

      <button className="btn-primary arabic"
        style={{ width: "100%", marginTop: 12, fontSize: 20, opacity: text.trim() ? 1 : 0.45 }}
        disabled={!text.trim() || loading}
        onClick={submit}>
        {loading ? "..." : "صَحِّحْ لِي ✓"}
      </button>
    </div>
  );
}
