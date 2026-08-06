import { useEffect, useState } from "react";
import { C, speak } from "../lib/shared";
import { CURRICULUM, UNITS } from "../data/curriculum";
import { fetchNotes, addNote, resolveNote } from "../lib/supabaseClient";

// مُرَاجَعَةُ الْمَنْهَجِ — for the shaykh and the review team.
//
// A reviewer is not a student. He needs to read every lesson in full, in order,
// without unlocking anything or being graded — and to say plainly where a
// lesson is wrong, so it can be corrected before learners ever see it.

export default function Review({ session, reviewerName, onExit }) {
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => { fetchNotes().then(setNotes).catch(() => {}); }, []);

  if (open) {
    return (
      <LessonReview
        lesson={open}
        session={session}
        reviewerName={reviewerName}
        onBack={() => { fetchNotes().then(setNotes).catch(() => {}); setOpen(null); }}
      />
    );
  }

  const openCount = notes.filter((n) => n.status !== "fixed").length;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 22, color: C.gold, fontWeight: 700 }}>
          مُرَاجَعَةُ الْمَنْهَجِ
        </div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2 }}>
        Read any lesson in full and leave a note where it needs correcting
      </p>

      <div className="card" style={{ padding: 13, marginTop: 12, textAlign: "center" }}>
        <div dir="ltr" style={{ display: "flex", justifyContent: "space-around" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.emerald }}>{CURRICULUM.lessons.length}</div>
            <div style={{ fontSize: 9.5, color: C.faded }}>LESSONS</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: openCount ? C.red : C.emerald }}>{openCount}</div>
            <div style={{ fontSize: 9.5, color: C.faded }}>OPEN NOTES</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.faded }}>{notes.length - openCount}</div>
            <div style={{ fontSize: 9.5, color: C.faded }}>RESOLVED</div>
          </div>
        </div>
      </div>

      {UNITS.map((u, ui) => {
        const ls = u.lessons.map((id) => CURRICULUM.lessons.find((l) => l.id === id)).filter(Boolean);
        return (
          <div key={u.id} style={{ marginTop: 16 }}>
            <div dir="rtl" style={{
              background: C.emerald, color: "#fff", borderRadius: 11,
              padding: "8px 13px", marginBottom: 8,
            }}>
              <div className="arabic" style={{ fontSize: 20, fontWeight: 700 }}>{ui + 1}. {u.ar}</div>
              <div dir="ltr" style={{ fontSize: 9.5, opacity: 0.85 }}>{u.en}</div>
            </div>
            {ls.map((l) => {
              const n = notes.filter((x) => x.lesson_id === l.id && x.status !== "fixed").length;
              const idx = CURRICULUM.lessons.findIndex((x) => x.id === l.id) + 1;
              return (
                <button key={l.id} dir="rtl" className="card" onClick={() => setOpen(l)}
                  style={{ width: "100%", padding: "10px 13px", marginBottom: 6, display: "block" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%", fontSize: 10.5, fontWeight: 700,
                        background: C.emeraldSoft, color: C.emerald, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{idx}</span>
                      <span className="arabic" style={{ fontSize: 20 }}>{l.title}</span>
                    </div>
                    {n > 0 && (
                      <span dir="ltr" style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>{n} note{n > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function LessonReview({ lesson, session, reviewerName, onBack }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetchNotes(lesson.id).then(setNotes).catch(() => {});
  useEffect(load, [lesson.id]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addNote(lesson.id, session?.user?.id, reviewerName, text.trim());
      setText("");
      load();
    } catch {} finally { setBusy(false); }
  };

  const idx = CURRICULUM.lessons.findIndex((l) => l.id === lesson.id) + 1;

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: C.faded, fontSize: 22, padding: 6 }}>←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 21, color: C.gold, fontWeight: 700 }}>{lesson.title}</div>
        <div style={{ width: 34 }} />
      </div>
      <p dir="ltr" style={{ textAlign: "center", fontSize: 10, color: C.faded }}>Lesson {idx} of {CURRICULUM.lessons.length}</p>

      {/* ——— everything in the lesson, on one page ——— */}
      <Section title="اَلْمُفْرَدَاتُ" en={`Vocabulary (${(lesson.vocab || []).length})`}>
        {(lesson.vocab || []).map((v, k) => (
          <div key={k} dir="rtl" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px dashed ${C.border}` }}>
            <span className="arabic" style={{ fontSize: 20 }}>{v.ar}</span>
            <span dir="ltr" style={{ fontSize: 11.5, color: C.faded }}>{v.en || "—"}</span>
          </div>
        ))}
      </Section>

      <Section title="اَلشَّرْحُ" en={`Teaching steps (${(lesson.rule?.teach || []).length})`}>
        {(lesson.rule?.teach || []).map((t, k) => (
          <div key={k} style={{ padding: "8px 0", borderBottom: `1px dashed ${C.border}` }}>
            <div dir="ltr" style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.65 }}>
              <span style={{ color: C.gold }}>{k + 1}. </span>{t.say}
            </div>
            {t.show && (
              <div className="arabic" dir="rtl" style={{ fontSize: 19, color: C.emerald, whiteSpace: "pre-line", marginTop: 4, lineHeight: 1.9 }}>
                {t.show}
              </div>
            )}
            {t.warn && (
              <div className="arabic" dir="rtl" style={{ fontSize: 17, color: C.red, whiteSpace: "pre-line", marginTop: 3 }}>
                {t.warn}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="اَلْأَمْثِلَةُ" en={`Examples (${(lesson.examples || []).length})`}>
        {(lesson.examples || []).map((e, k) => (
          <div key={k} dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px dashed ${C.border}` }}>
            <span className="arabic" style={{ fontSize: 21, lineHeight: 1.9 }}>{e.ar}</span>
            <button onClick={() => speak(e.ar)} style={{ fontSize: 13, color: C.emerald }}>🔊</button>
          </div>
        ))}
      </Section>

      <Section title="اَلتَّدْرِيبَاتُ" en={`Exercises (${(lesson.drills || []).length} written)`}>
        {(lesson.drills || []).map((d, k) => (
          <div key={k} style={{ padding: "6px 0", borderBottom: `1px dashed ${C.border}` }}>
            <div dir="rtl" className="arabic" style={{ fontSize: 17 }}>
              <span style={{ color: C.faded, fontSize: 11 }}>{d.t}</span> — {d.q || d.a}
            </div>
            {d.a && <div dir="rtl" className="arabic" style={{ fontSize: 16, color: C.emerald }}>✓ {d.a}</div>}
          </div>
        ))}
      </Section>

      {lesson.production && (
        <Section title="اَلْإِنْتَاجُ" en="Writing task">
          <div className="arabic" dir="rtl" style={{ fontSize: 19, lineHeight: 1.9 }}>{lesson.production}</div>
          <div dir="ltr" style={{ fontSize: 11.5, color: C.faded, marginTop: 4 }}>{lesson.productionEn}</div>
        </Section>
      )}

      {/* ——— the reviewer's own notes ——— */}
      <div className="card" style={{ padding: 14, marginTop: 14, borderColor: C.gold }}>
        <div dir="rtl" className="arabic" style={{ fontSize: 19, color: C.gold, textAlign: "center" }}>
          مُلَاحَظَاتُ الْمُرَاجِعِ
        </div>
        <div dir="ltr" style={{ fontSize: 10.5, color: C.faded, textAlign: "center", marginBottom: 8 }}>
          Anything wrong, missing, or badly explained — write it here
        </div>

        {notes.map((n) => (
          <div key={n.id} style={{
            padding: "8px 10px", borderRadius: 9, marginBottom: 6,
            background: n.status === "fixed" ? C.emeraldSoft : C.paper,
            border: `1px solid ${n.status === "fixed" ? C.emerald : C.border}`,
          }}>
            <div dir="ltr" style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.6 }}>{n.note}</div>
            <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9.5, color: C.faded }}>{n.reviewer_name || "reviewer"}</span>
              {n.status !== "fixed" && (
                <button onClick={() => resolveNote(n.id).then(load)} style={{ fontSize: 10, color: C.emerald }}>
                  mark fixed ✓
                </button>
              )}
            </div>
          </div>
        ))}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Step 4 explains the fatha before the learner has met it — move it after step 6."
          style={{
            width: "100%", minHeight: 70, marginTop: 6, padding: 10, fontSize: 13,
            borderRadius: 10, background: C.surface, border: `1.5px solid ${C.border}`,
          }}
        />
        <button className="btn-primary arabic" style={{ width: "100%", marginTop: 8, fontSize: 18 }}
          disabled={!text.trim() || busy} onClick={send}>
          {busy ? "..." : "أَضِفْ مُلَاحَظَةً"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, en, children }) {
  return (
    <div className="card" style={{ padding: 13, marginTop: 12 }}>
      <div dir="rtl" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="arabic" style={{ fontSize: 19, color: C.emerald, fontWeight: 700 }}>{title}</span>
        <span dir="ltr" style={{ fontSize: 9.5, color: C.faded }}>{en}</span>
      </div>
      {children}
    </div>
  );
}
