import { useState } from "react";
import { C, speak } from "../lib/shared";
import { CURRICULUM } from "../data/curriculum";
import { QURAN } from "../data/quran";

// اَلْمَنْهَجُ — admin/review view of the entire curriculum.
// Built for the shaykh and reviewers: read every lesson whole, on one screen,
// without having to sit exams or click through stages like a student.

const LEVELS = [
  {
    ar: "اَلْمُسْتَوَى الْأَوَّلُ — اَلتَّأْسِيسُ",
    range: "Lessons 1–10",
    colour: "#0E5237",
    can: [
      "Operate inside an Arabic-only classroom: ask what a word means, ask how to say something, say they didn't understand, request a repeat",
      "Name and describe everyday things — house, school, family, food, colours, body",
      "Build correct nominal sentences with gender agreement (البيتُ كبيرٌ / الأمُّ كبيرةٌ)",
      "Use the possessive construction (كتابُ الطالبِ) and prepositions correctly",
      "Count 1–10 and tell the time of day and days of the week",
      "Use all 14 pronouns and greet properly with the Islamic courtesies",
      "Form past-tense verbal sentences: فعل + فاعل + مفعول به",
    ],
  },
  {
    ar: "اَلْمُسْتَوَى الثَّانِي — اَلْجُمْلَةُ الْفِعْلِيَّةُ",
    range: "Lessons 11–23",
    colour: "#B9862F",
    can: [
      "Speak in past AND present, and negate correctly with لا / ما / لم / ليس",
      "Ask all ten question words and hold a real first-meeting conversation",
      "Use كان وأخواتها and إنَّ وأخواتها with correct case endings",
      "Handle plurals — broken and sound — including the non-human agreement rule",
      "Attach pronouns to nouns, verbs and particles (كتابي، سمعني، عندي)",
      "Join clauses with الذي / التي / الذين",
      "Count to thousands, and parse any noun as مرفوع / منصوب / مجرور",
    ],
  },
  {
    ar: "اَلْمُسْتَوَى الثَّالِثُ — اَلتَّوَسُّعُ",
    range: "Lessons 24–32",
    colour: "#7A4E9E",
    can: [
      "Pronounce الـ correctly (solar and lunar) and use the dual throughout",
      "Give and receive instructions — commands and prohibitions",
      "Talk about travel, the city, the market, health and the body",
      "Recognise the language of a dars: قال، أي، يعني، الدليل، المسألة، الحكم",
      "Derive whole word-families from a root (مصدر، اسم فاعل، اسم مفعول)",
      "Run their household in Arabic: call, ask, request, refuse, instruct",
      "State ages, dates, days, ordinals and repetition",
    ],
  },
  {
    ar: "اَلْمُسْتَوَى الرَّابِعُ — اَلْفِعْلُ وَالتَّرَاكِيبُ",
    range: "Lessons 33–50",
    colour: "#7A4E9E",
    can: [
      "Conjugate any verb across all 14 forms, past and present",
      "Negate and command with correct نصب and جزم",
      "Compose their own du'a and make polite requests",
      "Use the passive, كان and إنَّ families, relative clauses and comparatives",
      "Derive word families from roots, and describe a live scene using الحال",
      "Recognise the language of a scholar's lesson",
    ],
  },
  {
    ar: "اَلْمُسْتَوَى الْخَامِسُ — اَلِاسْتِقْلَالُ",
    range: "Planned",
    colour: "#8A8A8A",
    can: [
      "Follow a scholar's dars and take notes in Arabic",
      "Read unvocalized text aloud correctly",
      "Perform إعراب on real sentences from classical texts",
      "Write a one-page report and sit a spoken interview in Arabic",
      "Study the Madinah books cold, without a key",
    ],
  },
];

export default function Syllabus({ onExit }) {
  const [open, setOpen] = useState(null);
  const [showQuran, setShowQuran] = useState(false);

  const lessons = CURRICULUM.lessons;
  const totalVocab = lessons.reduce((n, l) => n + (l.vocab || []).length, 0);
  const totalDrills = lessons.reduce((n, l) => n + (l.drills || []).length, 0);

  return (
    <div className="fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ color: C.faded, fontSize: 22, padding: 6 }} aria-label="back">←</button>
        <div className="arabic" dir="rtl" style={{ fontSize: 25, color: C.emerald, fontWeight: 700 }}>اَلْمَنْهَجُ 📋</div>
        <div style={{ width: 34 }} />
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 2 }}>
        Full curriculum — for review. No exams, no gates.
      </p>

      {/* level outcomes — what a learner can DO at each stage */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {LEVELS.map((lv) => (
          <div key={lv.name} className="card" dir="rtl" style={{ padding: 14, borderColor: lv.colour, borderWidth: 1.5 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="arabic" style={{ fontSize: 21, color: lv.colour, fontWeight: 700 }}>{lv.ar}</span>
              <span style={{ fontSize: 10, color: C.faded }}>{lv.range}</span>
            </div>
            <div style={{ fontSize: 10.5, color: C.faded, letterSpacing: "0.1em", margin: "6px 0 4px" }}>
              BY THE END, THE LEARNER CAN:
            </div>
            <ul style={{ margin: 0, paddingRight: 18, direction: "rtl" }}>
              {lv.can.map((c, i) => (
                <li key={i} style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.75, direction: "ltr", textAlign: "left" }}>{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* totals */}
      <div className="card" style={{ padding: 14, marginTop: 12, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {[
          { n: lessons.length, l: "lessons" },
          { n: totalVocab, l: "words" },
          { n: totalDrills, l: "drills" },
          { n: QURAN.length, l: "Quran sets" },
        ].map((x) => (
          <div key={x.l}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.emerald }}>{x.n}</div>
            <div style={{ fontSize: 10, color: C.faded }}>{x.l}</div>
          </div>
        ))}
      </div>

      {/* lesson list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {lessons.map((l, i) => (
          <div key={l.id}>
            <button
              dir="rtl"
              className="card"
              onClick={() => setOpen(open === l.id ? null : l.id)}
              style={{ width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", background: C.emeraldSoft, color: C.emerald,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ textAlign: "right" }}>
                  <div className="arabic" style={{ fontSize: 21, color: C.ink }}>{l.title}</div>
                  <div style={{ fontSize: 9.5, color: C.faded }}>
                    {(l.vocab || []).length} words · {(l.drills || []).length} drills · {l.rule?.name || "—"}
                  </div>
                </div>
              </div>
              <span style={{ color: C.faded, fontSize: 13 }}>{open === l.id ? "▾" : "‹"}</span>
            </button>

            {open === l.id && <LessonDetail lesson={l} />}
          </div>
        ))}
      </div>

      {/* Quran sets */}
      <button className="card" dir="rtl" onClick={() => setShowQuran((v) => !v)}
        style={{ width: "100%", marginTop: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: C.gold }}>
        <span className="arabic" style={{ fontSize: 21, color: C.gold }}>📖 اَلْقُرْآنُ وَالْأَذْكَارُ</span>
        <span style={{ color: C.faded, fontSize: 13 }}>{showQuran ? "▾" : "‹"}</span>
      </button>
      {showQuran && (
        <div className="fadein" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {QURAN.map((s) => (
            <div key={s.id} className="card" dir="rtl" style={{ padding: 12 }}>
              <div className="arabic" style={{ fontSize: 20, color: C.emerald }}>{s.name}</div>
              <div style={{ fontSize: 9.5, color: C.faded, marginBottom: 6 }}>{s.ayat.length} lines · {s.note}</div>
              {s.ayat.map((a, k) => (
                <div key={k} style={{ borderTop: `1px dashed ${C.border}`, padding: "6px 0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <button onClick={() => speak(a.ar)} style={{ fontSize: 12, color: C.emerald, flexShrink: 0 }}>🔊</button>
                    <div className="arabic" style={{ fontSize: 19, lineHeight: 1.9 }}>{a.ar}</div>
                  </div>
                  <div className="arabic" style={{ fontSize: 16, color: C.gold, marginTop: 2 }}>✨ {a.simple}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonDetail({ lesson }) {
  const Section = ({ title, children }) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.14em", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="card fadein" dir="rtl" style={{ padding: 14, marginTop: 6, borderColor: C.emerald }}>
      <Section title="VOCABULARY">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(lesson.vocab || []).map((v) => (
            <button key={v.ar} onClick={() => speak(v.ar)}
              style={{ background: C.emeraldSoft, border: `1px solid ${C.emerald}`, borderRadius: 999, padding: "4px 10px" }}>
              <span className="arabic" style={{ fontSize: 17, color: C.emerald }}>{v.emoji} {v.ar}</span>
              {v.en && <span style={{ fontSize: 9, color: C.faded, marginRight: 4 }}>{v.en}</span>}
            </button>
          ))}
        </div>
      </Section>

      <Section title="EXAMPLES">
        {(lesson.examples || []).map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
            <button onClick={() => speak(e.ar)} style={{ fontSize: 12, color: C.emerald, flexShrink: 0 }}>🔊</button>
            <span className="arabic" style={{ fontSize: 18 }}>{e.ar}</span>
            <span style={{ fontSize: 13 }}>{e.emoji}</span>
          </div>
        ))}
      </Section>

      {lesson.rule && (
        <Section title={`RULE — ${lesson.rule.name}`}>
          <div className="arabic" style={{ fontSize: 18, whiteSpace: "pre-line", lineHeight: 1.9, background: C.goldSoft, borderRadius: 10, padding: "8px 12px" }}>
            {lesson.rule.ar}
          </div>
          {lesson.rule.hint && (
            <div style={{ fontSize: 11, color: C.faded, marginTop: 5, fontStyle: "italic", direction: "ltr", textAlign: "left" }}>
              {lesson.rule.hint}
            </div>
          )}
        </Section>
      )}

      <Section title={`DRILLS (${(lesson.drills || []).length})`}>
        {(lesson.drills || []).map((d, i) => (
          <div key={i} style={{ borderTop: `1px dashed ${C.border}`, padding: "5px 0" }}>
            <div className="arabic" style={{ fontSize: 16 }}>
              <span style={{ color: C.faded, fontSize: 11 }}>{d.t}</span> · {d.q}
            </div>
            <div className="arabic" style={{ fontSize: 16, color: C.emerald }}>✅ {d.a}</div>
          </div>
        ))}
      </Section>

      <Section title="WRITING TASK">
        <div className="arabic" style={{ fontSize: 17 }}>{lesson.production}</div>
        {lesson.productionEn && (
          <div style={{ fontSize: 11, color: C.faded, fontStyle: "italic", direction: "ltr", textAlign: "left", marginTop: 3 }}>
            {lesson.productionEn}
          </div>
        )}
      </Section>
    </div>
  );
}
