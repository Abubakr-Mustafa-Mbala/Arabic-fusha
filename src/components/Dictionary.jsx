import { useEffect, useState } from "react";
import { C, speak, callAI, parseJSONLoose, markSeen, needsHint } from "../lib/shared";

export default function Dictionary({ initialWord = "", onExit, onAddWord }) {
  const [input, setInput] = useState(initialWord);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);
  const [showEn, setShowEn] = useState(false);

  const lookup = async (w) => {
    const word = (w ?? input).trim();
    if (!word || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);
    try {
      const raw = await callAI({ mode: "dict", word });
      const parsed = parseJSONLoose(raw);
      if (parsed.error === "not_arabic") {
        setError("اُكْتُبْ كَلِمَةً عَرَبِيَّةً 🙂");
        return;
      }
      setResult(parsed);
      setShowEn(needsHint(`word:${parsed.word}`));
      markSeen(`word:${parsed.word}`);
      speak(parsed.word);
    } catch {
      setError("Lookup failed — check the connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialWord) lookup(initialWord);
  }, []); // eslint-disable-line

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 26, color: C.emerald, fontWeight: 700 }}>اَلْمُعْجَمُ 📕</div>
        <div style={{ width: 34 }} />
      </div>

      <div dir="rtl" style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          dir="rtl"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="اُكْتُبْ كَلِمَةً... (type any Arabic word)"
          className="arabic"
          style={{ flex: 1, borderRadius: 14, padding: "11px 14px", fontSize: 24, background: C.surface, border: `1.5px solid ${C.border}` }}
        />
        <button onClick={() => lookup()} disabled={loading} className="btn-primary" style={{ padding: "0 20px", fontSize: 18 }}>
          🔍
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 16, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>📖</div>
          <p className="arabic" dir="rtl" style={{ color: C.gold, fontSize: 20, marginTop: 8 }}>
            جَارٍ الْبَحْثُ...
          </p>
        </div>
      )}
      {error && (
        <div className="arabic" dir="rtl" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.redSoft, color: C.red, fontSize: 18, textAlign: "center" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="fadein" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* word + root */}
          <div className="card" style={{ padding: "22px 18px", textAlign: "center" }}>
            <div dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span className="arabic" style={{ fontSize: 44 }}>{result.word}</span>
              <button onClick={() => speak(result.word)} aria-label="listen"
                style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: "50%", width: 40, height: 40, fontSize: 18 }}>
                🔊
              </button>
            </div>
            {result.root && (
              <div dir="rtl" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: C.faded, letterSpacing: "0.15em" }}>اَلْجَذْرُ</span>
                <div dir="rtl" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 4 }}>
                  {result.root.split(" ").map((l, i) => (
                    <span key={i} className="arabic"
                      style={{ fontSize: 28, color: C.gold, background: C.goldSoft, borderRadius: 10, padding: "0 12px", fontWeight: 700 }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* definition */}
          <div className="card" dir="rtl" style={{ padding: 16 }}>
            <div className="arabic" style={{ fontSize: 25, whiteSpace: "pre-line" }}>{result.definition}</div>
            {showEn && result.en && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${C.border}`, textAlign: "center" }}>
                <span style={{ fontSize: 13, color: C.faded, fontStyle: "italic" }}>{result.en}</span>
                <div style={{ fontSize: 9.5, color: C.faded, marginTop: 3 }}>
                  new word — this English hint fades once you've met it a few times
                </div>
              </div>
            )}
          </div>

          {/* examples */}
          {(result.examples || []).map((ex, i) => (
            <div key={i} className="card" dir="rtl" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="arabic" style={{ fontSize: 23 }}>{ex}</span>
              <button onClick={() => speak(ex)} aria-label="listen"
                style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: "50%", width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                🔊
              </button>
            </div>
          ))}

          {/* derivations */}
          {result.derivations?.length > 0 && (
            <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.derivations.map((d) => (
                <button key={d.ar} onClick={() => { setInput(d.ar); lookup(d.ar); }}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 12px" }}>
                  <span className="arabic" style={{ fontSize: 20 }}>{d.emoji ? d.emoji + " " : ""}{d.ar}</span>
                </button>
              ))}
            </div>
          )}

          {/* classical note */}
          {result.note && (
            <div className="card" dir="rtl" style={{ padding: 14, borderColor: C.gold }}>
              <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.15em", textAlign: "right" }}>مِنْ بَابِ الْمَعَاجِمِ</div>
              <div className="arabic" style={{ fontSize: 21, marginTop: 4 }}>{result.note}</div>
            </div>
          )}

          {/* read the original volumes */}
          <div dir="rtl" style={{ display: "flex", gap: 8 }}>
            <a
              href={`https://tafsir.app/lisan/${encodeURIComponent((result.root ? result.root.replace(/\s+/g, "") : result.word).replace(/[\u064B-\u0652\u0670]/g, ""))}`}
              target="_blank" rel="noreferrer"
              className="card arabic"
              style={{ flex: 1, padding: "10px 8px", textAlign: "center", fontSize: 18, color: C.emerald, }}
            >
              📜 لِسَانُ الْعَرَبِ
            </a>
            <a
              href="https://www.baheth.info/"
              target="_blank" rel="noreferrer"
              className="card arabic"
              style={{ flex: 1, padding: "10px 8px", textAlign: "center", fontSize: 18, color: C.emerald, }}
            >
              🌊 اَلْقَامُوسُ وَغَيْرُهُ
            </a>
          </div>

          {/* add to revision */}
          {onAddWord && (
            <button
              className="btn-primary arabic"
              style={{ width: "100%", fontSize: 21, background: added ? C.gold : C.emerald }}
              disabled={added}
              onClick={() => {
                onAddWord({ ar: result.word, emoji: result.derivations?.[0]?.emoji || "📕" });
                setAdded(true);
              }}
            >
              {added ? "✅ فِي مُرَاجَعَتِكَ 📿" : "أَضِفْ إِلَى الْمُرَاجَعَةِ 📿"}
            </button>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card" dir="rtl" style={{ marginTop: 16, padding: 20, textAlign: "center", color: C.faded }}>
          <div style={{ fontSize: 34 }}>📕</div>
          <div className="arabic" style={{ fontSize: 20, marginTop: 6 }}>
            مُعْجَمٌ عَلَى طَرِيقَةِ لِسَانِ الْعَرَبِ: اَلْكَلِمَةُ ← اَلْجَذْرُ ← اَلْمَعْنَى بِالْعَرَبِيَّةِ
          </div>
        </div>
      )}
    </div>
  );
}
