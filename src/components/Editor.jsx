import { useEffect, useRef, useState } from "react";
import { C, speak } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";
import { supabase } from "../lib/supabaseClient";
import TashkeelBar from "./TashkeelBar";

// اَلتَّحْرِيرُ — admin editing.
// Overrides are stored in Supabase and merged over the built-in curriculum
// at runtime, so nothing needs redeploying to fix a translation or add a picture.

export async function fetchOverrides() {
  if (!supabase) return {};
  const { data, error } = await supabase.from("lesson_overrides").select("lesson_id, patch");
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => { map[r.lesson_id] = r.patch; });
  return map;
}

async function saveOverride(lessonId, patch, userId) {
  if (!supabase) throw new Error("no backend");
  const { error } = await supabase
    .from("lesson_overrides")
    .upsert({ lesson_id: lessonId, patch, updated_by: userId, updated_at: new Date().toISOString() },
            { onConflict: "lesson_id" });
  if (error) throw error;
}

async function uploadImage(file) {
  if (!supabase) throw new Error("no backend");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `img/${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase.storage.from("recordings").upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("recordings").getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function Editor({ session, onExit }) {
  const [lesson, setLesson] = useState(null);
  const [overrides, setOverrides] = useState({});

  useEffect(() => { fetchOverrides().then(setOverrides).catch(() => {}); }, []);

  if (lesson) {
    return (
      <LessonEditor
        lesson={lesson}
        patch={overrides[lesson.id] || {}}
        session={session}
        onBack={() => { fetchOverrides().then(setOverrides).catch(() => {}); setLesson(null); }}
      />
    );
  }

  return (
    <div className="fadein">
      <Header title="تَحْرِيرُ الدُّرُوسِ" onBack={onExit} />
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2, marginBottom: 12 }}>
        Fix a translation, add a missing meaning, or attach a picture — no redeploy needed
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CURRICULUM.lessons.map((l, i) => {
          const edited = overrides[l.id] && Object.keys(overrides[l.id]).length;
          return (
            <button key={l.id} dir="rtl" className="card" onClick={() => setLesson(l)}
              style={{ width: "100%", padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: "50%", background: C.emeraldSoft, color: C.emerald,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                }}>{i + 1}</span>
                <span className="arabic" style={{ fontSize: 20 }}>{l.title}</span>
              </div>
              {edited ? <span style={{ fontSize: 10, color: C.gold }}>✎ edited</span> : null}
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

function LessonEditor({ lesson, patch, session, onBack }) {
  const [tab, setTab] = useState("teach");
  // vocab overrides keyed by the Arabic word: { en, img }
  const [vocab, setVocab] = useState(() => patch.vocab || {});
  // teaching steps — the admin can rewrite, add or remove explanations
  const [teach, setTeach] = useState(() => patch.teach || lesson.rule?.teach || []);
  const [extra, setExtra] = useState(() => patch.extra || "");
  // exercises — the admin can correct, add, remove, and choose what reaches the exam
  const [drills, setDrills] = useState(() => patch.drills || lesson.drills || []);
  const activeRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRefs = useRef({});

  const inp = {
    width: "100%", borderRadius: 10, padding: "8px 10px", fontSize: 14,
    background: C.surface, border: `1.5px solid ${C.border}`, marginTop: 5,
  };

  const setField = (ar, key, val) =>
    setVocab((v) => ({ ...v, [ar]: { ...(v[ar] || {}), [key]: val } }));

  const pickImage = async (ar, file) => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const url = await uploadImage(file);
      if (url) setField(ar, "img", url);
      setMsg("Image uploaded — remember to save.");
    } catch (e) {
      setMsg("Upload failed: " + (e?.message || "unknown"));
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      // strip empty entries so the patch stays small
      const clean = {};
      Object.entries(vocab).forEach(([ar, o]) => {
        const e = {};
        if (o.en && o.en.trim()) e.en = o.en.trim();
        if (o.img) e.img = o.img;
        if (Object.keys(e).length) clean[ar] = e;
      });
      const cleanTeach = teach
        .filter((t) => (t.say && t.say.trim()) || (t.show && t.show.trim()))
        .map((t) => ({
          say: (t.say || "").trim(),
          ...(t.show && t.show.trim() ? { show: t.show.trim() } : {}),
          ...(t.warn && t.warn.trim() ? { warn: t.warn.trim() } : {}),
        }));
      const cleanDrills = drills
        .filter((d) => d.q && String(d.q).trim())
        .map((d) => {
          const out = { t: d.t || "mcq", q: String(d.q).trim() };
          if (d.t === "match") {
            out.pairs = (d.pairs || []).filter((p) => p[0]?.trim() && p[1]?.trim());
          } else if (d.t === "assemble") {
            out.a = String(d.a || "").trim();
            out.chips = out.a.split(" ").filter(Boolean);
          } else if (d.t === "arrange") {
            out.a = String(d.a || "").trim();
            out.letters = out.a.replace(/\s/g, "").split("");
          } else {
            out.options = (d.options || []).map((o) => String(o).trim()).filter(Boolean);
            out.a = String(d.a || "").trim();
          }
          if (d.why?.trim()) out.why = d.why.trim();
          if (d.example?.trim()) out.example = d.example.trim();
          if (d.exam === false) out.exam = false;   // excluded from the unit exam
          return out;
        });
      await saveOverride(
        lesson.id,
        { ...patch, vocab: clean, teach: cleanTeach, extra: extra.trim(), drills: cleanDrills },
        session?.user?.id
      );
      setMsg("Saved. Learners will see it on their next load.");
    } catch (e) {
      setMsg("Save failed: " + (e?.message || "unknown"));
    } finally { setBusy(false); }
  };

  return (
    <div className="fadein">
      <Header title={lesson.title} onBack={onBack} />
      <p style={{ textAlign: "center", fontSize: 10.5, color: C.faded, marginTop: 2 }}>
        Anything left blank keeps the built-in value
      </p>

      {/* which part of the lesson to edit */}
      <div dir="rtl" style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {[["teach", "اَلشَّرْحُ", "Explanation"], ["vocab", "اَلْمُفْرَدَاتُ", "Words"], ["drills", "اَلتَّدْرِيبَاتُ", "Exercises & exam"]].map(([id, ar, en]) => (
          <button key={id} onClick={() => setTab(id)} className="card"
            style={{
              flex: 1, padding: "9px 6px", textAlign: "center",
              borderColor: tab === id ? C.emerald : C.border,
              background: tab === id ? C.emeraldSoft : C.surface,
            }}>
            <div className="arabic" style={{ fontSize: 18, color: tab === id ? C.emerald : C.ink }}>{ar}</div>
            <div style={{ fontSize: 9, color: C.faded }}>{en}</div>
          </button>
        ))}
      </div>

      {/* ——— explanation editor ——— */}
      {tab === "teach" && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, color: C.faded, textAlign: "center", marginBottom: 8 }}>
            Each step is one idea: what you say, then the Arabic it produces.
            Use the keyboard below to add harakat.
          </p>

          {teach.map((t, i) => (
            <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: C.gold, fontWeight: 700 }}>STEP {i + 1}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {i > 0 && (
                    <button onClick={() => setTeach((a) => { const b=[...a]; [b[i-1],b[i]]=[b[i],b[i-1]]; return b; })}
                      style={{ fontSize: 13, color: C.faded }}>↑</button>
                  )}
                  {i < teach.length - 1 && (
                    <button onClick={() => setTeach((a) => { const b=[...a]; [b[i+1],b[i]]=[b[i],b[i+1]]; return b; })}
                      style={{ fontSize: 13, color: C.faded }}>↓</button>
                  )}
                  <button onClick={() => setTeach((a) => a.filter((_, k) => k !== i))}
                    style={{ fontSize: 13, color: C.red }}>🗑</button>
                </div>
              </div>

              <textarea
                value={t.say || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setTeach((a) => a.map((x, k) => (k === i ? { ...x, say: e.target.value } : x)))}
                placeholder="What you say to the learner, in plain English"
                style={{ ...inp, minHeight: 70, resize: "vertical" }}
              />

              <textarea
                dir="rtl" className="arabic"
                value={t.show || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setTeach((a) => a.map((x, k) => (k === i ? { ...x, show: e.target.value } : x)))}
                placeholder="اَلْعَرَبِيَّةُ الَّتِي تُعْرَضُ..."
                style={{ ...inp, minHeight: 60, fontSize: 21, resize: "vertical" }}
              />

              <textarea
                dir="rtl" className="arabic"
                value={t.warn || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setTeach((a) => a.map((x, k) => (k === i ? { ...x, warn: e.target.value } : x)))}
                placeholder="اَلْخَطَأُ الشَّائِعُ (optional)"
                style={{ ...inp, minHeight: 44, fontSize: 19, borderColor: C.red, resize: "vertical" }}
              />
            </div>
          ))}

          <button
            onClick={() => setTeach((a) => [...a, { say: "", show: "" }])}
            className="card"
            style={{ width: "100%", padding: 11, color: C.emerald, borderColor: C.emerald }}
          >
            ➕ add a teaching step
          </button>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10.5, color: C.faded, letterSpacing: "0.1em", marginBottom: 4 }}>
              EXTRA NOTES (shown at the end of the explanation)
            </div>
            <textarea
              dir="rtl" className="arabic"
              value={extra}
              onFocus={(e) => (activeRef.current = e.target)}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="أَيُّ شَرْحٍ إِضَافِيٍّ..."
              style={{ ...inp, minHeight: 80, fontSize: 20, resize: "vertical" }}
            />
          </div>

          {/* harakat keyboard for whichever box is focused */}
          <div style={{ position: "sticky", bottom: 0, background: C.paper, paddingTop: 8 }}>
            <TashkeelBar targetRef={activeRef} />
          </div>
        </div>
      )}

      {/* ——— exercises ——— */}
      {tab === "drills" && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, color: C.faded, textAlign: "center", marginBottom: 8, lineHeight: 1.6 }}>
            These are also the pool the unit exam draws from.
            Untick <b>in exam</b> to keep a question in the lesson but out of the exam.
          </p>

          {drills.map((d, i) => (
            <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <select
                  value={d.t || "mcq"}
                  onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, t: e.target.value } : x)))}
                  style={{ fontSize: 11, padding: "3px 6px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface }}
                >
                  <option value="mcq">Multiple choice</option>
                  <option value="complete">Complete the missing</option>
                  <option value="match">Matching</option>
                  <option value="assemble">Build the sentence</option>
                  <option value="arrange">Arrange the letters</option>
                </select>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <label style={{ fontSize: 10, color: C.faded, display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={d.exam !== false}
                      onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, exam: e.target.checked } : x)))}
                    />
                    in exam
                  </label>
                  {i > 0 && <button onClick={() => setDrills((a) => { const b=[...a]; [b[i-1],b[i]]=[b[i],b[i-1]]; return b; })} style={{ fontSize: 13, color: C.faded }}>↑</button>}
                  <button onClick={() => setDrills((a) => a.filter((_, k) => k !== i))} style={{ fontSize: 13, color: C.red }}>🗑</button>
                </div>
              </div>

              <textarea
                dir="rtl" className="arabic"
                value={d.q || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))}
                placeholder={d.t === "complete" ? "اَلسُّؤَالُ مَعَ ___ فِي مَوْضِعِ النَّقْصِ" : "اَلسُّؤَالُ..."}
                style={{ ...inp, minHeight: 52, fontSize: 20, resize: "vertical" }}
              />

              {(d.t === "assemble" || d.t === "arrange") && (
                <input
                  dir="rtl" className="arabic"
                  value={d.a || ""}
                  onFocus={(e) => (activeRef.current = e.target)}
                  onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))}
                  placeholder={d.t === "arrange" ? "اَلْكَلِمَةُ الصَّحِيحَةُ" : "اَلْجُمْلَةُ الصَّحِيحَةُ كَامِلَةً"}
                  style={{ ...inp, fontSize: 20, borderColor: C.emerald }}
                />
              )}

              {d.t === "match" && (
                <div style={{ marginTop: 6 }}>
                  {(d.pairs || [["",""],["",""],["",""]]).map((pr, k) => (
                    <div key={k} dir="rtl" style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input dir="rtl" className="arabic" value={pr[0] || ""}
                        onFocus={(e) => (activeRef.current = e.target)}
                        onChange={(e) => setDrills((a) => a.map((x, m) => m === i
                          ? { ...x, pairs: (x.pairs || [["",""],["",""],["",""]]).map((p, n) => n === k ? [e.target.value, p[1]] : p) } : x))}
                        placeholder="اَلْكَلِمَةُ" style={{ ...inp, flex: 1, fontSize: 18, marginTop: 0 }} />
                      <input value={pr[1] || ""}
                        onFocus={(e) => (activeRef.current = e.target)}
                        onChange={(e) => setDrills((a) => a.map((x, m) => m === i
                          ? { ...x, pairs: (x.pairs || [["",""],["",""],["",""]]).map((p, n) => n === k ? [p[0], e.target.value] : p) } : x))}
                        placeholder="its meaning" style={{ ...inp, flex: 1, fontSize: 14, marginTop: 0 }} />
                    </div>
                  ))}
                  <button
                    onClick={() => setDrills((a) => a.map((x, m) => m === i ? { ...x, pairs: [...(x.pairs || []), ["",""]] } : x))}
                    style={{ fontSize: 11, color: C.emerald, marginTop: 6 }}
                  >➕ add a pair</button>
                </div>
              )}

              {(d.t === "mcq" || d.t === "complete" || !d.t) && (
                <div style={{ marginTop: 6 }}>
                  {(d.options || ["", "", "", ""]).map((o, k) => (
                    <div key={k} dir="rtl" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <input dir="rtl" className="arabic" value={o}
                        onFocus={(e) => (activeRef.current = e.target)}
                        onChange={(e) => setDrills((a) => a.map((x, m) => m === i
                          ? { ...x, options: (x.options || ["","","",""]).map((y, n) => n === k ? e.target.value : y) } : x))}
                        placeholder={`خِيَار ${k + 1}`}
                        style={{ ...inp, flex: 1, fontSize: 18, marginTop: 0,
                                 borderColor: o && o === d.a ? C.emerald : C.border }} />
                      <button
                        onClick={() => setDrills((a) => a.map((x, m) => m === i ? { ...x, a: o } : x))}
                        style={{ fontSize: 15, color: o && o === d.a ? C.emerald : C.faded, padding: "0 6px" }}
                        title="mark as the correct answer"
                      >{o && o === d.a ? "✓" : "○"}</button>
                    </div>
                  ))}
                  <div style={{ fontSize: 9.5, color: C.faded, marginTop: 3 }}>tap ○ beside the correct answer</div>
                </div>
              )}

              <textarea
                value={d.why || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, why: e.target.value } : x)))}
                placeholder="Why this answer is right — shown after they answer (optional)"
                style={{ ...inp, minHeight: 46, fontSize: 13, resize: "vertical" }}
              />
              <input
                dir="rtl" className="arabic"
                value={d.example || ""}
                onFocus={(e) => (activeRef.current = e.target)}
                onChange={(e) => setDrills((a) => a.map((x, k) => (k === i ? { ...x, example: e.target.value } : x)))}
                placeholder="مِثَالٌ يُعْرَضُ مَعَ الشَّرْحِ (اِخْتِيَارِيٌّ)"
                style={{ ...inp, fontSize: 19 }}
              />
            </div>
          ))}

          <button
            onClick={() => setDrills((a) => [...a, { t: "mcq", q: "", options: ["", "", "", ""], a: "" }])}
            className="card"
            style={{ width: "100%", padding: 11, color: C.emerald, borderColor: C.emerald }}
          >
            ➕ add an exercise
          </button>

          <div style={{ position: "sticky", bottom: 0, background: C.paper, paddingTop: 8 }}>
            <TashkeelBar targetRef={activeRef} />
          </div>
        </div>
      )}

      {tab === "vocab" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {(lesson.vocab || []).map((w) => {
          const o = vocab[w.ar] || {};
          const shown = o.img || w.img;
          return (
            <div key={w.ar} className="card" style={{ padding: 12 }}>
              <div dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="arabic" style={{ fontSize: 24 }}>{w.ar}</span>
                <button onClick={() => speak(w.ar)} style={{ fontSize: 15, color: C.emerald }}>🔊</button>
              </div>

              <input
                value={o.en ?? w.en ?? ""}
                onChange={(e) => setField(w.ar, "en", e.target.value)}
                placeholder="English meaning"
                style={inp}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                {shown ? (
                  <img src={shown} alt="" style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 8, border: `1px solid ${C.border}` }} />
                ) : (
                  <div style={{
                    width: 54, height: 54, borderRadius: 8, border: `1px dashed ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.faded,
                  }}>no image</div>
                )}
                <input
                  ref={(el) => (fileRefs.current[w.ar] = el)}
                  type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => pickImage(w.ar, e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRefs.current[w.ar]?.click()}
                  disabled={busy}
                  className="card"
                  style={{ padding: "7px 14px", fontSize: 12, color: C.emerald, borderColor: C.emerald }}
                >
                  {shown ? "Replace picture" : "Upload picture"}
                </button>
                {o.img && (
                  <button onClick={() => setField(w.ar, "img", "")} style={{ fontSize: 12, color: C.red }}>remove</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {msg && (
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10, fontSize: 12, textAlign: "center",
          background: msg.startsWith("Saved") || msg.startsWith("Image") ? C.emeraldSoft : C.redSoft,
          color: msg.startsWith("Saved") || msg.startsWith("Image") ? C.emerald : C.red,
        }}>{msg}</div>
      )}

      <button className="btn-primary arabic" style={{ width: "100%", marginTop: 14, fontSize: 21 }} disabled={busy} onClick={save}>
        {busy ? "..." : "حَفْظٌ ✓"}
      </button>
    </div>
  );
}
