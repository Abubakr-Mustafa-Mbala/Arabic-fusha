import { useEffect, useRef, useState } from "react";
import { C } from "../lib/shared";
import { fetchQuranAudio, audioUrl } from "../lib/recordings";

// اَلْمُصْحَفُ — full Quran reader (text: Tanzil-verified dataset bundled at /quran.json)
// Bookmark is stored on-device. Audio: real recitation (Mishary Alafasy) streamed per ayah.

const BK_KEY = "fusha_quran_bookmark";

function loadBookmark() {
  try { return JSON.parse(localStorage.getItem(BK_KEY) || "null"); } catch { return null; }
}
function saveBookmark(b) {
  try { localStorage.setItem(BK_KEY, JSON.stringify(b)); } catch {}
}

export default function Mushaf({ onExit, onLookup }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [surah, setSurah] = useState(null); // surah object
  const [bookmark, setBookmark] = useState(loadBookmark);
  const audioRef = useRef(null);
  const [playingAyah, setPlayingAyah] = useState(null);
  const [continuous, setContinuous] = useState(true);   // default: play the whole surah
  const contRef = useRef(true);
  const surahRef = useRef(null);
  const [ourAudio, setOurAudio] = useState({});   // ayah -> storage path, for the current surah

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/quran/quran-uthmani")
      .then((r) => r.json())
      .then((json) => {
        const surahs = json?.data?.surahs || [];
        let offset = 0;
        const out = surahs.map((s) => {
          const v = s.ayahs.map((a) => a.text);
          const entry = { id: s.number, name: s.name.replace(/^سُورَةُ /, ""), n: v.length, off: offset, v };
          offset += v.length;
          return entry;
        });
        setData(out);
      })
      .catch(() => setError(true));
    return () => { audioRef.current?.pause(); };
  }, []);

  // Plays one ayah. If continuous mode is on, rolls straight into the next ayah,
  // and when a surah finishes it opens the next surah and keeps reciting.
  const loadOurs = (sur) => {
    fetchQuranAudio(sur.id).then(setOurAudio).catch(() => setOurAudio({}));
  };

  const playFrom = (sur, i) => {
    try {
      surahRef.current = sur;
      const globalN = sur.off + i + 1;
      audioRef.current?.pause();
      // our reciter's voice takes priority; the stream is only a fallback
      const mine = ourAudio[i + 1] ? audioUrl(ourAudio[i + 1]) : null;
      const a = new Audio(mine || `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalN}.mp3`);
      audioRef.current = a;
      setPlayingAyah(globalN);
      a.onended = () => {
        if (!contRef.current) { setPlayingAyah(null); return; }
        if (i + 1 < sur.v.length) {
          playFrom(sur, i + 1);
          document.getElementById(`ayah-${i + 2}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          // surah finished — move to the next one automatically
          const nxt = data.find((x) => x.id === sur.id + 1);
          if (nxt) {
            setSurah(nxt);
            loadOurs(nxt);
            window.scrollTo(0, 0);
            setTimeout(() => playFrom(nxt, 0), 400);
          } else setPlayingAyah(null);
        }
      };
      a.onerror = () => setPlayingAyah(null);
      a.play().catch(() => setPlayingAyah(null));
    } catch { setPlayingAyah(null); }
  };

  const playAyah = (sur, i) => {
    const globalN = sur.off + i + 1;
    if (playingAyah === globalN) {
      audioRef.current?.pause();
      setPlayingAyah(null);
      return;
    }
    playFrom(sur, i);
  };

  const stopAll = () => {
    audioRef.current?.pause();
    setPlayingAyah(null);
  };

  const mark = (s, i) => {
    const b = { surahId: s.id, ayah: i + 1 };
    saveBookmark(b);
    setBookmark(b);
  };

  if (error) {
    return (
      <div className="fadein">
        <Header title="اَلْمُصْحَفُ 📖" onBack={onExit} />
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 13, textAlign: "center" }}>
          Couldn't load the mushaf — check the connection and reopen.
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="fadein">
        <Header title="اَلْمُصْحَفُ 📖" onBack={onExit} />
        <p style={{ textAlign: "center", color: C.gold, marginTop: 30, fontSize: 13 }}>...</p>
      </div>
    );
  }

  if (surah) {
    return (
      <div className="fadein">
        <Header title={`سُورَةُ ${surah.name}`} onBack={() => setSurah(null)} />
        {/* recitation player — plays the whole surah, then the next */}
        <div className="card" style={{ padding: "12px 14px", margin: "8px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => (playingAyah ? stopAll() : playFrom(surah, 0))}
            style={{
              background: C.emerald, color: "#fff", border: "none", borderRadius: "50%",
              width: 46, height: 46, fontSize: 19, flexShrink: 0,
            }}
          >
            {playingAyah ? "⏸" : "▶"}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>
              {playingAyah ? "Reciting…" : "Play the whole surah"}
            </div>
            <label dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 10.5, color: C.faded }}>
              <input
                type="checkbox"
                checked={continuous}
                onChange={(e) => { setContinuous(e.target.checked); contRef.current = e.target.checked; }}
              />
              continue into the next surah automatically
            </label>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 10, color: C.faded, marginBottom: 6 }}>
          tap a word for the dictionary · 🔖 bookmark · ▶ single ayah
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {surah.id !== 1 && surah.id !== 9 && (
            <div className="arabic" dir="rtl" style={{ textAlign: "center", fontSize: 24, color: C.emerald, padding: "6px 0" }}>
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
            </div>
          )}
          {surah.v.map((text, i) => {
            const isBk = bookmark && bookmark.surahId === surah.id && bookmark.ayah === i + 1;
            const globalN = surah.off + i + 1;
            return (
              <div key={i} id={`ayah-${i + 1}`} className="card"
                style={{ padding: "12px 14px", borderColor: isBk ? C.gold : C.border, borderWidth: isBk ? 1.5 : 1 }}>
                <p className="arabic" dir="rtl" style={{ fontSize: 26, lineHeight: 2.2, color: C.ink }}>
                  {text.split(/(\s+)/).map((tok, j) =>
                    /\S/.test(tok) ? (
                      <span key={j} onClick={() => onLookup(tok.replace(/[^\u0600-\u06FF]/g, ""))} style={{ cursor: "pointer" }}>
                        {tok}
                      </span>
                    ) : ( tok )
                  )}
                  <span style={{ color: C.gold, fontSize: 20 }}> ﴿{toArabicNum(i + 1)}﴾</span>
                </p>
                <div dir="rtl" style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <button onClick={() => playAyah(surah, i)} style={{ fontSize: 13, color: C.emerald }}>
                    {playingAyah === globalN ? "⏸ إِيقَاف" : "▶️ تِلَاوَة"}
                  </button>
                  <button onClick={() => mark(surah, i)} style={{ fontSize: 13, color: isBk ? C.gold : C.faded }}>
                    {isBk ? "🔖 عَلَامَتُكَ هُنَا" : "🔖 ضَعْ عَلَامَةً"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const bkSurah = bookmark && data.find((s) => s.id === bookmark.surahId);

  return (
    <div className="fadein">
      <Header title="اَلْمُصْحَفُ 📖" onBack={onExit} />
      {bkSurah && (
        <button
          className="card"
          dir="rtl"
          onClick={() => {
            setSurah(bkSurah);
            setTimeout(() => document.getElementById(`ayah-${bookmark.ayah}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          }}
          style={{ width: "100%", marginTop: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderColor: C.gold, borderWidth: 1.5 }}
        >
          <span className="arabic" style={{ fontSize: 20, color: C.gold }}>
            🔖 تَابِعْ: سُورَةُ {bkSurah.name} — آيَة {toArabicNum(bookmark.ayah)}
          </span>
          <span style={{ color: C.gold }}>‹</span>
        </button>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
        {data.map((s) => (
          <button key={s.id} dir="rtl" className="card" onClick={() => { setSurah(s); loadOurs(s); }}
            style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="arabic" style={{
                width: 34, height: 34, borderRadius: "50%", background: C.emeraldSoft, color: C.emerald,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
              }}>
                {toArabicNum(s.id)}
              </span>
              <span className="arabic" style={{ fontSize: 22, color: C.ink }}>{s.name}</span>
            </div>
            <span className="arabic" style={{ fontSize: 13, color: C.faded }}>{toArabicNum(s.n)} آيَة</span>
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
      <div className="arabic" dir="rtl" style={{ fontSize: 24, color: C.emerald, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function toArabicNum(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}
