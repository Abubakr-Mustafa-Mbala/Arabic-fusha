import { useEffect, useRef, useState } from "react";
import { C } from "../lib/shared";
import { fetchQuranAudio, fetchQuranProgress, uploadAyah, deleteAyah, audioUrl } from "../lib/recordings";

// اِسْتِوْدِيُو التِّلَاوَةِ — for approved reciters.
// Pick a surah, record it ayah by ayah, and the app plays your voice
// everywhere in the Mushaf instead of the streamed reciter.

export default function QuranStudio({ session, onExit }) {
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState({});
  const [surah, setSurah] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/quran/quran-uthmani")
      .then((r) => r.json())
      .then((json) => {
        const surahs = json?.data?.surahs || [];
        setData(surahs.map((s) => ({
          id: s.number,
          name: s.name.replace(/^سُورَةُ /, ""),
          v: s.ayahs.map((a) => a.text),
        })));
      })
      .catch(() => setError("Couldn't load the mushaf — check the connection."));
    fetchQuranProgress().then(setProgress).catch(() => {});
  }, []);

  if (surah) {
    return (
      <SurahRecorder
        surah={surah}
        session={session}
        onBack={() => { setSurah(null); fetchQuranProgress().then(setProgress).catch(() => {}); }}
      />
    );
  }

  const totalDone = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <div className="fadein">
      <Header title="اِسْتِوْدِيُو التِّلَاوَةِ" onBack={onExit} />
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2 }}>
        Record the Quran ayah by ayah — your voice replaces the streamed reciter
      </p>

      <div className="card" style={{ padding: 14, marginTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.emerald }}>
          {totalDone} <span style={{ fontSize: 14, color: C.faded }}>/ 6236</span>
        </div>
        <div style={{ fontSize: 10, color: C.faded }}>ayat recorded by the team</div>
        <div style={{ height: 6, background: C.border, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${(totalDone / 6236) * 100}%`, height: "100%", background: C.emerald }} />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12, textAlign: "center" }}>
          {error}
        </div>
      )}
      {!data && !error && <p style={{ textAlign: "center", color: C.faded, marginTop: 20 }}>...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {data && data.map((s) => {
          const done = progress[s.id] || 0;
          const pct = Math.round((done / s.v.length) * 100);
          return (
            <button key={s.id} dir="rtl" className="card" onClick={() => setSurah(s)}
              style={{ width: "100%", padding: "10px 14px", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: pct === 100 ? C.emerald : C.emeraldSoft,
                    color: pct === 100 ? "#fff" : C.emerald,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                  }}>
                    {pct === 100 ? "✓" : s.id}
                  </span>
                  <span className="arabic" style={{ fontSize: 21, color: C.ink }}>{s.name}</span>
                </div>
                <span dir="ltr" style={{ fontSize: 10.5, color: pct ? C.gold : C.faded }}>
                  {done} / {s.v.length}
                </span>
              </div>
              {done > 0 && (
                <div style={{ height: 4, background: C.border, borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.emerald : C.gold }} />
                </div>
              )}
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
      <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function SurahRecorder({ surah, session, onBack }) {
  const [recorded, setRecorded] = useState(null);   // ayah number -> storage path
  const [i, setI] = useState(0);                    // current ayah index
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    fetchQuranAudio(surah.id).then((m) => {
      setRecorded(m);
      // jump to the first ayah that has not been recorded yet
      const firstGap = surah.v.findIndex((_, k) => !m[k + 1]);
      setI(firstGap === -1 ? 0 : firstGap);
    }).catch(() => setRecorded({}));
  }, [surah]);

  const ayahNo = i + 1;
  const path = recorded?.[ayahNo];

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
          const p = await uploadAyah(session?.user?.id, surah.id, ayahNo, blob);
          setRecorded((r) => ({ ...r, [ayahNo]: p }));
          // move on automatically so the reciter can keep flowing
          if (i < surah.v.length - 1) setTimeout(() => setI(i + 1), 400);
        } catch (e) {
          setError("Upload failed: " + (e?.message || "unknown"));
        } finally { setBusy(false); }
      };
      mr.start();
      setRecording(true);
    } catch {
      setError("Microphone blocked — allow mic access for this site.");
    }
  };

  const stop = () => { try { mediaRef.current?.stop(); } catch {} setRecording(false); };
  const play = () => { const u = audioUrl(path); if (u) try { new Audio(u).play(); } catch {} };
  const remove = async () => {
    await deleteAyah(surah.id, ayahNo, path).catch(() => {});
    setRecorded((r) => { const n = { ...r }; delete n[ayahNo]; return n; });
  };

  const doneCount = recorded ? Object.keys(recorded).length : 0;

  return (
    <div className="fadein">
      <Header title={`سُورَةُ ${surah.name}`} onBack={onBack} />

      <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.faded, marginTop: 6 }}>
        <span>Ayah {ayahNo} of {surah.v.length}</span>
        <span style={{ color: C.emerald, fontWeight: 700 }}>{doneCount} recorded</span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 99, margin: "5px 0 12px", overflow: "hidden" }}>
        <div style={{ width: `${(doneCount / surah.v.length) * 100}%`, height: "100%", background: C.emerald }} />
      </div>

      {/* the ayah to recite */}
      <div className="card" style={{ padding: "26px 18px", borderColor: path ? C.emerald : C.border, borderWidth: 1.5 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 30, lineHeight: 2.3, textAlign: "center" }}>
          {surah.v[i]}
          <span style={{ color: C.gold, fontSize: 22 }}> ﴿{ayahNo}﴾</span>
        </div>
        {path && (
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.emerald }}>✓ recorded</div>
        )}
      </div>

      {/* record controls */}
      <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {!recording ? (
          <button onClick={start} disabled={busy} className="btn-primary arabic"
            style={{ flex: 1, fontSize: 20, background: path ? C.gold : C.emerald }}>
            {busy ? "..." : path ? "🎙️ إِعَادَةُ التَّسْجِيلِ" : "🎙️ سَجِّلْ"}
          </button>
        ) : (
          <button onClick={stop} className="btn-primary arabic" style={{ flex: 1, fontSize: 20, background: C.red }}>
            ⏹ إِيقَافٌ وَحِفْظٌ
          </button>
        )}
        {path && !recording && (
          <>
            <button onClick={play} className="card" style={{ padding: "0 16px", fontSize: 16 }}>▶</button>
            <button onClick={remove} className="card" style={{ padding: "0 14px", color: C.red }}>🗑</button>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 12, textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* move between ayat */}
      <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button disabled={i === 0} onClick={() => setI(i - 1)} className="card"
          style={{ flex: 1, padding: 11, opacity: i === 0 ? 0.4 : 1 }}>
          <span className="arabic" style={{ fontSize: 18 }}>← السَّابِقَةُ</span>
        </button>
        <button disabled={i >= surah.v.length - 1} onClick={() => setI(i + 1)} className="card"
          style={{ flex: 1, padding: 11, opacity: i >= surah.v.length - 1 ? 0.4 : 1 }}>
          <span className="arabic" style={{ fontSize: 18 }}>التَّالِيَةُ →</span>
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: C.faded, marginTop: 10 }}>
        After saving, it moves to the next ayah automatically — record straight through.
      </p>
    </div>
  );
}
