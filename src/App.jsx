import { useEffect, useMemo, useState } from "react";
import { CURRICULUM, allLearnedVocab, gradeBand } from "./data/curriculum";
import { load, save, review, initCard, dueWords, seedLessonIntoSrs } from "./lib/store";
import { C } from "./lib/shared";
import { supabase, fetchRemoteState, saveRemoteLesson, saveRemoteCards } from "./lib/supabaseClient";
import LessonPlayer from "./components/LessonPlayer";
import { ReviewSession, Tutor } from "./components/ReviewAndTutor";
import AuthScreen from "./components/AuthScreen";
import Library from "./components/Library";
import Dictionary from "./components/Dictionary";
import Quran from "./components/Quran";

const PASS_GATE = 60; // مقبول unlocks the next lesson; retake anytime to raise the grade

export default function App() {
  const [state, setState] = useState(load);
  const [view, setView] = useState({ name: "home" });
  const [session, setSession] = useState(null);
  const [booted, setBooted] = useState(!supabase);

  // ——— auth boot ———
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setBooted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ——— pull this user's progress after sign-in ———
  useEffect(() => {
    if (!supabase || !session) return;
    fetchRemoteState(session.user.id)
      .then((remote) => {
        setState((s) => {
          const merged = {
            lessons: { ...s.lessons, ...remote.lessons },
            srs: { ...s.srs, ...remote.srs },
          };
          save(merged);
          return merged;
        });
      })
      .catch(() => {});
  }, [session]);

  const update = (fn) => {
    setState((s) => {
      const n = fn(s);
      save(n);
      return n;
    });
  };

  const due = useMemo(() => dueWords(state), [state]);
  const lessons = CURRICULUM.lessons;

  const highestUnlocked = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < lessons.length; i++) {
      const rec = state.lessons[lessons[i].id];
      if (rec && rec.score >= PASS_GATE) idx = i + 1;
      else break;
    }
    return Math.min(idx, lessons.length - 1);
  }, [state, lessons]);

  const learnedUpto = (i) => allLearnedVocab(i);
  const reviewsBlock = due.length > 0;

  const addVocab = (vocab) => {
    const newCards = {};
    update((s) => {
      const srs = { ...s.srs };
      const lexicon = { ...(s.lexicon || {}) };
      vocab.forEach((v) => {
        lexicon[v.ar] = v.emoji || "📖";
        if (!srs[v.ar]) {
          srs[v.ar] = initCard();
          newCards[v.ar] = srs[v.ar];
        }
      });
      return { ...s, srs, lexicon };
    });
    if (supabase && session) {
      saveRemoteCards(session.user.id, newCards).catch(() => {});
    }
  };

  if (!booted) {
    return (
      <Shell>
        <p style={{ textAlign: "center", color: C.faded, marginTop: 80 }}>...</p>
      </Shell>
    );
  }

  if (supabase && !session) return <AuthScreen />;

  if (view.name === "lesson") {
    const i = view.index;
    const lesson = lessons[i];
    return (
      <Shell>
        <LessonPlayer
          lesson={lesson}
          learnedVocab={learnedUpto(i)}
          onExit={() => setView({ name: "home" })}
          onFinish={(score) => {
            const prev = state.lessons[lesson.id];
            const finalScore = Math.max(prev?.score ?? 0, score ?? 0);
            let newCards = {};
            update((s) => {
              const seeded = seedLessonIntoSrs(s, lesson);
              lesson.vocab.forEach((v) => {
                if (!s.srs[v.ar]) newCards[v.ar] = seeded.srs[v.ar];
              });
              return {
                ...seeded,
                lessons: {
                  ...seeded.lessons,
                  [lesson.id]: { score: finalScore, completedAt: Date.now() },
                },
              };
            });
            if (supabase && session) {
              saveRemoteLesson(session.user.id, lesson.id, finalScore).catch(() => {});
              saveRemoteCards(session.user.id, newCards).catch(() => {});
            }
            setView({ name: "home" });
          }}
        />
      </Shell>
    );
  }

  if (view.name === "review") {
    const lessonVocab = learnedUpto(lessons.length - 1).filter((v) => state.srs[v.ar]);
    const docVocab = Object.entries(state.lexicon || {}).map(([ar, emoji]) => ({ ar, emoji }));
    const vocabAll = [...lessonVocab, ...docVocab.filter((d) => !lessonVocab.some((l) => l.ar === d.ar))];
    return (
      <Shell>
        <ReviewSession
          dueList={due}
          allVocab={vocabAll.length >= 4 ? vocabAll : learnedUpto(0)}
          srs={state.srs}
          onAnswer={(word, correct) => {
            const newCard = review(state.srs[word] || initCard(), correct);
            update((s) => ({ ...s, srs: { ...s.srs, [word]: newCard } }));
            if (supabase && session) {
              saveRemoteCards(session.user.id, { [word]: newCard }).catch(() => {});
            }
          }}
          onExit={() => setView({ name: "home" })}
        />
      </Shell>
    );
  }

  if (view.name === "tutor") {
    const upto = Math.max(0, highestUnlocked - (state.lessons[lessons[highestUnlocked]?.id] ? 0 : 1));
    return (
      <Shell>
        <Tutor learnedVocab={learnedUpto(Math.max(0, upto))} onExit={() => setView({ name: "home" })} />
      </Shell>
    );
  }

  if (view.name === "library") {
    return (
      <Shell>
        <Library
          session={session}
          onExit={() => setView({ name: "home" })}
          onNewVocab={addVocab}
        />
      </Shell>
    );
  }

  if (view.name === "quran") {
    return (
      <Shell>
        <Quran onExit={() => setView({ name: "home" })} onAddWord={addVocab} />
      </Shell>
    );
  }

  if (view.name === "dict") {
    return (
      <Shell>
        <Dictionary onExit={() => setView({ name: "home" })} onAddWord={(v) => addVocab([v])} />
      </Shell>
    );
  }

  // ——— home / dashboard ———
  const masteredBare = Object.values(state.srs).filter((c) => c.reps >= 4).length;

  return (
    <Shell>
      <header style={{ textAlign: "center", marginBottom: 6 }}>
        <div className="arabic" dir="rtl" style={{ fontSize: 40, color: C.emerald, fontWeight: 700 }}>
          اَلْفُصْحَى
        </div>
        <div style={{ fontSize: 10, color: C.faded, letterSpacing: "0.28em", textTransform: "uppercase" }}>
          learn arabic · in arabic
        </div>
      </header>

      <div className="arabic" dir="rtl" style={{ textAlign: "center", fontSize: 20, color: C.faded, marginBottom: 14 }}>
        {CURRICULUM.levelName} · {CURRICULUM.unitName}
      </div>

      <button
        onClick={() => due.length > 0 && setView({ name: "review" })}
        className="card fadein"
        style={{
          width: "100%", padding: 16, display: "flex", alignItems: "center",
          justifyContent: "space-between", borderColor: due.length ? C.gold : C.border,
          borderWidth: due.length ? 1.5 : 1, cursor: due.length ? "pointer" : "default",
        }}
        dir="rtl"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 30 }}>📿</span>
          <div style={{ textAlign: "right" }}>
            <div className="arabic" style={{ fontSize: 24, color: due.length ? C.gold : C.faded }}>
              اَلْمُرَاجَعَةُ أَوَّلًا
            </div>
            <div style={{ fontSize: 11, color: C.faded }}>
              {due.length > 0 ? `${due.length} due — clears before new lessons unlock` : "No reviews due — go learn ✓"}
            </div>
          </div>
        </div>
        {due.length > 0 && (
          <span style={{ background: C.gold, color: "#fff", borderRadius: 999, padding: "4px 12px", fontWeight: 700 }}>
            {due.length}
          </span>
        )}
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {lessons.map((l, i) => {
          const rec = state.lessons[l.id];
          const unlocked = i <= highestUnlocked && (!reviewsBlock || i < highestUnlocked || rec);
          const band = rec ? gradeBand(rec.score) : null;
          return (
            <button
              key={l.id}
              dir="rtl"
              disabled={!unlocked}
              onClick={() => setView({ name: "lesson", index: i })}
              className="card"
              style={{
                width: "100%", padding: "14px 16px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                opacity: unlocked ? 1 : 0.45,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{rec ? "✅" : unlocked ? "📖" : "🔒"}</span>
                <div style={{ textAlign: "right" }}>
                  <div className="arabic" style={{ fontSize: 26, color: C.ink }}>{l.title}</div>
                  <div className="arabic" style={{ fontSize: 15, color: C.faded }}>{l.subtitle}</div>
                </div>
              </div>
              {band && (
                <span className="arabic" style={{ fontSize: 18, color: band.color, fontWeight: 700 }}>{band.ar}</span>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={() => setView({ name: "tutor" })} className="btn-primary" dir="rtl"
        style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🎓</span>
        <span className="arabic" style={{ fontSize: 24 }}>تَحَدَّثْ مَعَ الْمُعَلِّمِ</span>
      </button>

      <button onClick={() => setView({ name: "quran" })} className="card" dir="rtl"
        style={{ width: "100%", marginTop: 10, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderColor: "#B9862F", borderWidth: 1.5 }}>
        <span style={{ fontSize: 22 }}>📖</span>
        <span className="arabic" style={{ fontSize: 24, color: "#B9862F" }}>اَلْقُرْآنُ — اِفْهَمْ صَلَاتَكَ</span>
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={() => setView({ name: "library" })} className="card" dir="rtl"
          style={{ flex: 1, padding: "13px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderColor: "#0E5237" }}>
          <span style={{ fontSize: 20 }}>📚</span>
          <span className="arabic" style={{ fontSize: 22, color: "#0E5237" }}>اَلْمَكْتَبَةُ</span>
        </button>
        <button onClick={() => setView({ name: "dict" })} className="card" dir="rtl"
          style={{ flex: 1, padding: "13px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderColor: "#0E5237" }}>
          <span style={{ fontSize: 20 }}>📕</span>
          <span className="arabic" style={{ fontSize: 22, color: "#0E5237" }}>اَلْمُعْجَمُ</span>
        </button>
      </div>

      {masteredBare > 0 && (
        <div className="card" dir="rtl" style={{ marginTop: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderColor: C.gold }}>
          <span style={{ fontSize: 22 }}>👁️</span>
          <div style={{ textAlign: "right" }}>
            <span className="arabic" style={{ fontSize: 20, color: C.gold }}>بِدُونِ تَشْكِيلٍ: {masteredBare}</span>
            <div style={{ fontSize: 10, color: C.faded }}>words you now read bare — mastered in revision</div>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 22 }}>
        {supabase && session && (
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, color: C.faded, textDecoration: "underline" }}>
            Sign out ({session.user.email})
          </button>
        )}
        <p style={{ fontSize: 10, color: C.faded, marginTop: 6 }}>
          الفصحى v1.3 {supabase ? "· progress synced to your account" : "· progress stored on this device"}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", background: C.paper }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "20px 16px 40px" }}>{children}</div>
    </div>
  );
}
