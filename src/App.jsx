import { useEffect, useMemo, useRef, useState } from "react";
import { CURRICULUM, allLearnedVocab, gradeBand } from "./data/curriculum";
import { load, save, review, initCard, dueWords, seedLessonIntoSrs } from "./lib/store";
import { C, setHumanVoice, setHumanOnly, getHumanOnly } from "./lib/shared";
import { supabase, fetchRemoteState, saveRemoteLesson, saveRemoteCards } from "./lib/supabaseClient";
import LessonPlayer from "./components/LessonPlayer";
import { ReviewSession, Tutor } from "./components/ReviewAndTutor";
import AuthScreen from "./components/AuthScreen";
import Library from "./components/Library";
import Dictionary from "./components/Dictionary";
import Quran from "./components/Quran";
import Studio from "./components/Studio";
import Listening from "./components/Listening";
import Passages from "./components/Passages";
import Syllabus from "./components/Syllabus";
import { fetchRecordings, isRecorder, audioUrl } from "./lib/recordings";

const PASS_GATE = 60; // مقبول unlocks the next lesson; retake anytime to raise the grade

export default function App() {
  const [state, setState] = useState(load);
  const [view, setView] = useState({ name: "home" });
  const [session, setSession] = useState(null);
  const [booted, setBooted] = useState(!supabase);
  const [canRecord, setCanRecord] = useState(false);
  const scrollMemory = useRef({});
  const [moreOpen, setMoreOpen] = useState(false);
  const wide = useWide();
  const [humanOnly, setHumanOnlyState] = useState(getHumanOnly);
  useEffect(() => { setHumanOnly(humanOnly); }, [humanOnly]);

  // Remember where the learner was scrolled in each view, and restore it on return —
  // so coming back from a surah doesn't dump them at the top of the dashboard.
  // Android/browser back should move within the app, not exit the site.
  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.fusha;
      if (v) setView(v);
      else setView({ name: "home" });
    };
    window.addEventListener("popstate", onPop);
    window.history.replaceState({ fusha: { name: "home" } }, "");
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (next) => {
    scrollMemory.current[view.name] = window.scrollY;
    setView(next);
    setMoreOpen(false);
    try { window.history.pushState({ fusha: next }, ""); } catch {}
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollMemory.current[next.name] || 0);
    });
  };

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
            ...s,
            lessons: { ...s.lessons, ...remote.lessons },
            srs: { ...s.srs, ...remote.srs },
          };
          save(merged);
          return merged;
        });
      })
      .catch(() => {});
  }, [session]);

  // ——— load human recordings + check recorder rights ———
  useEffect(() => {
    if (!supabase || !session) return;
    fetchRecordings()
      .then((map) => {
        const urls = {};
        Object.entries(map).forEach(([text, path]) => {
          const u = audioUrl(path);
          if (u) urls[text] = u;
        });
        setHumanVoice(urls);
      })
      .catch(() => {});
    isRecorder(session.user.id).then(setCanRecord).catch(() => setCanRecord(false));
  }, [session]);

  const update = (fn) => {
    setState((s) => {
      const n = fn(s);
      save(n);
      return n;
    });
  };

  const due = useMemo(() => dueWords(state), [state]);
  const masteredBare = useMemo(
    () => Object.values(state.srs || {}).filter((c) => c.reps >= 4).length,
    [state]
  );
  const lessons = CURRICULUM.lessons;

  const highestUnlocked = useMemo(() => {
    // Admins/recorders can see the whole curriculum — they review and record it.
    if (canRecord) return lessons.length - 1;
    let idx = 0;
    for (let i = 0; i < lessons.length; i++) {
      const rec = state.lessons[lessons[i].id];
      if (rec && rec.score >= PASS_GATE) idx = i + 1;
      else break;
    }
    return Math.min(idx, lessons.length - 1);
  }, [state, lessons, canRecord]);

  const learnedUpto = (i) => allLearnedVocab(i);
  const reviewsBlock = due.length > 0 && !canRecord;

  // Saves a lesson result to device + account. Called when drills finish AND at lesson end,
  // so progress is never lost by leaving before the final button.
  const saveLessonResult = (lesson, score) => {
    const prev = state.lessons[lesson.id];
    const finalScore = Math.max(prev?.score ?? 0, score ?? 0);
    const newCards = {};
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
  };

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

  const sideBar = wide ? (
    <SideBar
      current={view.name}
      go={go}
      canRecord={canRecord}
      session={session}
      dueCount={due.length}
      bareCount={masteredBare}
    />
  ) : null;

  const navBar = wide ? null : (
    <>
      <TopBar dueCount={due.length} bareCount={masteredBare} onHome={() => go({ name: "home" })} />
      <BottomNav current={view.name} go={go} onMore={() => setMoreOpen(true)} />
      {moreOpen && (
        <MoreSheet
          go={go}
          canRecord={canRecord}
          onClose={() => setMoreOpen(false)}
          session={session}
        />
      )}
    </>
  );

  if (!booted) {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <p style={{ textAlign: "center", color: C.faded, marginTop: 80 }}>...</p>
      </Shell>
    );
  }

  if (supabase && !session) return <AuthScreen />;

  if (view.name === "lesson") {
    const i = view.index;
    const lesson = lessons[i];
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <LessonPlayer
          lesson={lesson}
          learnedVocab={learnedUpto(i)}
          onExit={() => go({ name: "home" })}
          onProgress={(score) => saveLessonResult(lesson, score)}
          onFinish={(score) => {
            saveLessonResult(lesson, score);
            go({ name: "home" });
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
      <Shell nav={navBar} sidebar={sideBar}>
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
          onExit={() => go({ name: "home" })}
        />
      </Shell>
    );
  }

  if (view.name === "tutor") {
    const upto = Math.max(0, highestUnlocked - (state.lessons[lessons[highestUnlocked]?.id] ? 0 : 1));
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Tutor learnedVocab={learnedUpto(Math.max(0, upto))} onExit={() => go({ name: "home" })} />
      </Shell>
    );
  }

  if (view.name === "library") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Library
          session={session}
          onExit={() => go({ name: "home" })}
          onNewVocab={addVocab}
        />
      </Shell>
    );
  }

  if (view.name === "studio") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <>
          <div className="card" style={{ padding: 12, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", borderColor: C.gold }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Human voices only</div>
              <div style={{ fontSize: 10, color: C.faded }}>
                {humanOnly ? "Silent where nothing is recorded yet" : "Falls back to machine voice"}
              </div>
            </div>
            <button
              onClick={() => setHumanOnlyState((v) => !v)}
              style={{
                width: 50, height: 28, borderRadius: 99, border: "none",
                background: humanOnly ? C.emerald : C.border, position: "relative",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: humanOnly ? 25 : 3,
                width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .15s",
              }} />
            </button>
          </div>
          <Studio session={session} onExit={() => go({ name: "home" })} />
        </>
      </Shell>
    );
  }

  if (view.name === "syllabus") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Syllabus onExit={() => go({ name: "home" })} />
      </Shell>
    );
  }

  if (view.name === "passages") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Passages
          session={session}
          canRecord={canRecord}
          onExit={() => go({ name: "home" })}
          onLookup={(w) => setView({ name: "dict", word: w })}
        />
      </Shell>
    );
  }

  if (view.name === "listening") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Listening maxLesson={highestUnlocked} onExit={() => go({ name: "home" })} />
      </Shell>
    );
  }

  if (view.name === "quran") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Quran onExit={() => go({ name: "home" })} onAddWord={addVocab} />
      </Shell>
    );
  }

  if (view.name === "dict") {
    return (
      <Shell nav={navBar} sidebar={sideBar}>
        <Dictionary initialWord={view.word || ""} onExit={() => go({ name: "home" })} onAddWord={(v) => addVocab([v])} />
      </Shell>
    );
  }

  // ——— home / dashboard ———

  return (
    <Shell nav={navBar} sidebar={sideBar}>
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
        onClick={() => due.length > 0 && go({ name: "review" })}
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
        <p style={{ fontSize: 10, color: C.faded, marginTop: 6 }}>
          الفصحى v6.5 {supabase ? "· progress synced to your account" : "· progress stored on this device"}
        </p>
      </div>
    </Shell>
  );
}

function MoreSheet({ go, canRecord, onClose, session }) {
  const items = [
    { v: "passages", emoji: "🎧", ar: "اَلنُّصُوصُ الْمَسْمُوعَةُ", en: "Recorded texts — hear a human read" },
    { v: "library", emoji: "📚", ar: "اَلْمَكْتَبَةُ", en: "My library — upload your own texts" },
    { v: "dict", emoji: "📕", ar: "اَلْمُعْجَمُ", en: "Dictionary — look up any word" },
  ];
  if (canRecord) {
    items.push({ v: "studio", emoji: "🎙️", ar: "اَلتَّسْجِيلُ", en: "Recording studio (admin)" });
    items.push({ v: "syllabus", emoji: "📋", ar: "اَلْمَنْهَجُ", en: "Full curriculum — review every lesson" });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fadein"
        style={{
          width: "100%", maxWidth: 440, background: C.paper,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: "14px 16px 96px", borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <button key={it.v} onClick={() => go({ name: it.v })} className="card" dir="rtl"
              style={{ width: "100%", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{it.emoji}</span>
              <div style={{ textAlign: "right" }}>
                <div className="arabic" style={{ fontSize: 21, color: C.ink }}>{it.ar}</div>
                <div style={{ fontSize: 10, color: C.faded }}>{it.en}</div>
              </div>
            </button>
          ))}
        </div>
        {supabase && session && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, color: C.faded, textDecoration: "underline" }}>
              Sign out ({session.user.email})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// True on desktop-width screens — drives the sidebar layout.
export function useWide() {
  const [wide, setWide] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 900 : false
  );
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return wide;
}

function Shell({ children, nav, sidebar }) {
  // Desktop: permanent sidebar on the left, content in a readable column beside it.
  if (sidebar) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", background: C.paper }}>
        {sidebar}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 720, padding: "36px 32px 60px" }}>{children}</div>
        </div>
      </div>
    );
  }
  // Phone: unchanged.
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", background: C.paper }}>
      <div style={{ width: "100%", maxWidth: 440, padding: nav ? "64px 16px 88px" : "20px 16px 40px" }}>
        {children}
      </div>
      {nav}
    </div>
  );
}

// ——— desktop sidebar: every destination visible at once ———
function SideBar({ current, go, canRecord, session, dueCount, bareCount }) {
  const items = [
    { v: "home", emoji: "🏠", ar: "اَلدُّرُوس", en: "Lessons" },
    { v: "tutor", emoji: "🎓", ar: "اَلْمُعَلِّم", en: "AI teacher" },
    { v: "quran", emoji: "📖", ar: "اَلْقُرْآن", en: "Quran & Salah" },
    { v: "listening", emoji: "👂", ar: "اَلِاسْتِمَاع", en: "Listening" },
    { v: "passages", emoji: "🎧", ar: "نُصُوصٌ مَسْمُوعَةٌ", en: "Recorded texts" },
    { v: "library", emoji: "📚", ar: "اَلْمَكْتَبَة", en: "My library" },
    { v: "dict", emoji: "📕", ar: "اَلْمُعْجَم", en: "Dictionary" },
  ];
  if (canRecord) {
    items.push({ v: "studio", emoji: "🎙️", ar: "اَلتَّسْجِيل", en: "Recording studio" });
    items.push({ v: "syllabus", emoji: "📋", ar: "اَلْمَنْهَج", en: "Full curriculum (review)" });
  }

  return (
    <div style={{
      width: 260, flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0,
      borderRight: `1px solid ${C.border}`, background: C.surface,
      padding: "26px 14px", display: "flex", flexDirection: "column",
    }}>
      <button onClick={() => go({ name: "home" })} className="arabic"
        style={{ fontSize: 34, color: C.emerald, fontWeight: 700, marginBottom: 4 }}>
        اَلْفُصْحَى
      </button>
      <div style={{ fontSize: 9.5, color: C.faded, letterSpacing: "0.18em", marginBottom: 18 }}>
        LEARN ARABIC · IN ARABIC
      </div>

      {/* live progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {dueCount > 0 && (
          <span style={{ background: C.goldSoft, color: C.gold, borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 700 }}>
            📿 {dueCount} due
          </span>
        )}
        {bareCount > 0 && (
          <span style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 700 }}>
            👁️ {bareCount} bare
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((it) => {
          const active = it.v === current;
          return (
            <button key={it.v} onClick={() => go({ name: it.v })} dir="rtl"
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
                borderRadius: 11, border: "none", textAlign: "right",
                background: active ? C.emeraldSoft : "transparent",
              }}>
              <span style={{ fontSize: 19 }}>{it.emoji}</span>
              <div style={{ textAlign: "right" }}>
                <div className="arabic" style={{ fontSize: 19, color: active ? C.emerald : C.ink, fontWeight: active ? 700 : 400 }}>
                  {it.ar}
                </div>
                <div style={{ fontSize: 9, color: C.faded }}>{it.en}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        {supabase && session && (
          <button onClick={() => supabase.auth.signOut()}
            style={{ fontSize: 10.5, color: C.faded, textDecoration: "underline" }}>
            Sign out ({session.user.email})
          </button>
        )}
      </div>
    </div>
  );
}

// ——— fixed top bar: identity + live revision count ———
function TopBar({ dueCount, bareCount, onHome }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
      display: "flex", justifyContent: "center",
      background: "rgba(250,247,242,0.96)", borderBottom: `1px solid ${C.border}`,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onHome} className="arabic" style={{ fontSize: 24, color: C.emerald, fontWeight: 700 }}>
          اَلْفُصْحَى
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {dueCount > 0 && (
            <span style={{ background: C.goldSoft, color: C.gold, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              📿 {dueCount} due
            </span>
          )}
          {bareCount > 0 && (
            <span style={{ background: C.emeraldSoft, color: C.emerald, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              👁️ {bareCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— fixed bottom nav: always reachable, never scrolled to ———
function BottomNav({ current, go, onMore }) {
  const items = [
    { v: "home", emoji: "🏠", ar: "اَلدُّرُوس", en: "Lessons" },
    { v: "tutor", emoji: "🎓", ar: "اَلْمُعَلِّم", en: "AI teacher" },
    { v: "quran", emoji: "📖", ar: "اَلْقُرْآن", en: "Quran" },
    { v: "listening", emoji: "👂", ar: "اِسْتِمَاع", en: "Listen" },
    { v: "__more", emoji: "☰", ar: "اَلْمَزِيد", en: "More" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      display: "flex", justifyContent: "center",
      background: "rgba(250,247,242,0.97)", borderTop: `1px solid ${C.border}`,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", padding: "6px 4px 10px" }}>
        {items.map((it) => {
          const active = it.v === current;
          return (
            <button
              key={it.v}
              onClick={() => (it.v === "__more" ? onMore() : go({ name: it.v }))}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                padding: "6px 2px", background: "transparent", border: "none",
              }}
            >
              <span style={{ fontSize: 19, opacity: active ? 1 : 0.55 }}>{it.emoji}</span>
              <span className="arabic" style={{ fontSize: 13, color: active ? C.emerald : C.faded, fontWeight: active ? 700 : 400 }}>
                {it.ar}
              </span>
              <span style={{ fontSize: 8, color: active ? C.emerald : C.faded }}>{it.en}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
