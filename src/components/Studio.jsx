import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../lib/shared";
import {
  collectRecordables, fetchRecordings, uploadRecording,
  deleteRecording, audioUrl,
} from "../lib/recordings";

export default function Studio({ session, onExit }) {
  const [recorded, setRecorded] = useState(null); // text -> storage_path
  const [filter, setFilter] = useState("todo"); // todo | done | all
  const [kind, setKind] = useState("all"); // all | word | sentence
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null); // text currently uploading
  const [error, setError] = useState(null);

  const all = useMemo(() => collectRecordables(), []);

  useEffect(() => {
    fetchRecordings().then(setRecorded).catch(() => setRecorded({}));
  }, []);

  const list = useMemo(() => {
    if (!recorded) return [];
    return all.filter((item) => {
      const done = !!recorded[item.text];
      if (filter === "todo" && done) return false;
      if (filter === "done" && !done) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (search.trim() && !item.text.includes(search.trim())) return false;
      return true;
    });
  }, [all, recorded, filter, kind, search]);

  const doneCount = recorded ? all.filter((i) => recorded[i.text]).length : 0;

  const onSaved = (text, path) => setRecorded((r) => ({ ...r, [text]: path }));
  const onRemoved = (text) =>
    setRecorded((r) => {
      const n = { ...r };
      delete n[text];
      return n;
    });

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 24, color: C.emerald, fontWeight: 700 }}>اَلتَّسْجِيلُ 🎙️</div>
        <div style={{ width: 34 }} />
      </div>

      {/* progress */}
      <div className="card" style={{ padding: 14, marginTop: 10, textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.emerald }}>
          {doneCount} <span style={{ color: C.faded, fontSize: 16 }}>/ {all.length}</span>
        </div>
        <div style={{ fontSize: 11, color: C.faded }}>recorded</div>
        <div style={{ height: 6, background: C.border, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${all.length ? (doneCount / all.length) * 100 : 0}%`, height: "100%", background: C.emerald }} />
        </div>
      </div>

      {/* filters */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {[["todo", "To record"], ["done", "Done"], ["all", "All"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{
              flex: 1, fontSize: 12, padding: "7px 4px", borderRadius: 10,
              background: filter === id ? C.emerald : "transparent",
              color: filter === id ? "#fff" : C.emerald,
              border: `1px solid ${filter === id ? C.emerald : C.border}`,
            }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {[["all", "All"], ["word", "Words"], ["sentence", "Sentences"], ["ayah", "Quran"]].map(([id, label]) => (
          <button key={id} onClick={() => setKind(id)}
            style={{
              flex: 1, fontSize: 11, padding: "6px 4px", borderRadius: 10,
              background: kind === id ? C.goldSoft : "transparent",
              color: kind === id ? C.ink : C.faded,
              border: `1px solid ${kind === id ? C.gold : C.border}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      <input
        dir="rtl"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث... (search)"
        className="arabic"
        style={{
          width: "100%", marginTop: 8, borderRadius: 12, padding: "9px 12px", fontSize: 20,
          background: C.surface, border: `1.5px solid ${C.border}`,
        }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12, textAlign: "center" }}>
          {error}
        </div>
      )}

      {recorded === null && <p style={{ textAlign: "center", color: C.faded, marginTop: 20 }}>...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {recorded && list.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: C.faded, fontSize: 13 }}>
            {filter === "todo" ? "✅ Nothing left to record here — ماشاء الله" : "Nothing matches."}
          </div>
        )}
        {list.map((item) => (
          <Row
            key={item.text}
            item={item}
            path={recorded?.[item.text]}
            userId={session?.user?.id}
            busy={busy === item.text}
            setBusy={setBusy}
            setError={setError}
            onSaved={onSaved}
            onRemoved={onRemoved}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ item, path, userId, busy, setBusy, setError, onSaved, onRemoved }) {
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState(null); // local blob url after recording
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
        setPreview(URL.createObjectURL(blob));
        setBusy(item.text);
        try {
          const p = await uploadRecording(userId, item.text, item.kind, blob);
          onSaved(item.text, p);
        } catch (e) {
          setError("Upload failed: " + (e?.message || e?.error || "unknown error"));
        } finally {
          setBusy(null);
        }
      };
      mr.start();
      setRecording(true);
    } catch {
      setError("Microphone blocked — allow mic access for this site in your browser settings.");
    }
  };

  const stop = () => {
    try { mediaRef.current?.stop(); } catch {}
    setRecording(false);
  };

  const play = () => {
    const url = preview || audioUrl(path);
    if (!url) return;
    try { new Audio(url).play(); } catch {}
  };

  const remove = async () => {
    await deleteRecording(item.text, path).catch(() => {});
    setPreview(null);
    onRemoved(item.text);
  };

  const done = !!path;

  return (
    <div className="card" style={{ padding: "12px 14px", borderColor: done ? C.emerald : C.border }}>
      <div dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ textAlign: "right", flex: 1 }}>
          <div className="arabic" style={{ fontSize: item.kind === "word" ? 27 : 22, lineHeight: 1.9 }}>{item.text}</div>
          <div style={{ fontSize: 9.5, color: C.faded }}>{item.source} · {item.kind}</div>
        </div>
        <span style={{ fontSize: 18 }}>{done ? "✅" : "⚪"}</span>
      </div>

      <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!recording ? (
          <button onClick={start} disabled={busy}
            style={{
              flex: 1, minWidth: 110, fontSize: 14, padding: "9px 10px", borderRadius: 10,
              background: C.emeraldSoft, color: C.emerald, border: `1px solid ${C.emerald}`,
            }}>
            {busy ? "..." : done ? "🎙️ إِعَادَة" : "🎙️ سَجِّلْ"}
          </button>
        ) : (
          <button onClick={stop}
            style={{ flex: 1, minWidth: 110, fontSize: 14, padding: "9px 10px", borderRadius: 10, background: C.red, color: "#fff", border: "none" }}>
            ⏹ إِيقَاف
          </button>
        )}

        {(done || preview) && !recording && (
          <>
            <button onClick={play}
              style={{ flex: 1, minWidth: 90, fontSize: 14, padding: "9px 10px", borderRadius: 10, background: C.surface, color: C.ink, border: `1px solid ${C.border}` }}>
              ▶️ اِسْمَعْ
            </button>
            <button onClick={remove}
              style={{ fontSize: 12, padding: "9px 12px", borderRadius: 10, background: "transparent", color: C.faded, border: `1px solid ${C.border}` }}>
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  );
}
