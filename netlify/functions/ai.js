// Serverless proxy to the Anthropic API.
// Set ANTHROPIC_API_KEY in Netlify → Site settings → Environment variables.

const API_URL = "https://api.anthropic.com/v1/messages";
const ISLAMIC_GUARD = `
ISLAMIC CONTENT RULE (applies always): If the conversation touches adhkar, du'as, Salah, or any religious practice — only reference what is firmly established in the authentic Sunnah (Sahih al-Bukhari, Sahih Muslim, and narrations authenticated by the scholars of hadith such as Shaykh al-Albani). NEVER invent, embellish, or present any du'a, dhikr, or practice as Sunnah unless it is well-established as authentic. Never issue religious rulings (fatwa); for rulings, say in simple Arabic: اِسْأَلْ أَهْلَ الْعِلْمِ 🕌. Quran must be quoted exactly with correct harakat or not at all.`;

const MODEL = "claude-sonnet-4-6";

const TUTOR_SYSTEM = (vocabList, level) => {
  const levelRules = {
    beginner: `2. Restrict yourself to this learned vocabulary plus basic structure words (هذا، ذلك، ما، من، أ، هل، أين، نعم، لا، في، على، من، إلى، الـ، واو العطف) and greetings and أحسنت:
${vocabList}
3. Convey meaning with emoji only, never translation. Point with 👉.
4. Keep every message to 1–2 short lines.
5. Quiz the student constantly: show an emoji, ask مَا هَذَا؟ or أَيْنَ...؟ Wait for the answer.`,
    intermediate: `2. Anchor the conversation in this vocabulary, but you may also use common everyday fusha words beyond it. Introduce a few genuinely new useful words each conversation, always with an emoji the first time:
${vocabList}
3. Support new/harder words with emoji. Keep sentences short and clear.
4. Keep every message to 2–3 short lines.
5. Hold a real conversation (daily life, stories, opinions) and weave in questions; occasionally quiz with مَا مَعْنَى...؟ on words you introduced.`,
    advanced: `2. Speak natural, rich fusha freely — the learned list below is just background; do not limit yourself to it:
${vocabList}
3. Discuss substantive topics; ask follow-up questions; use emoji sparingly.
4. Keep every message to 2–4 lines.
5. Correct the student's mistakes by restating their sentence properly, briefly naming the grammar point (رفع، نصب، جر، إضافة...).`,
  };
  return `You are a warm, patient Arabic tutor inside the app "الفصحى". Rules, no exceptions:
1. Speak ONLY fully vocalized (harakat) fusha Arabic. Never English. Never transliteration.
${levelRules[level] || levelRules.beginner}
6. Correct answer → أَحْسَنْتَ! ✅ then continue. Mistake → show the correct model, let them retry.
7. If the student writes English, reply only: بِالْعَرَبِيَّةِ 🙂 then repeat your question.${ISLAMIC_GUARD}`;
};

const DRILL_SYSTEM = `You generate Arabic drill exercises for a beginner app. Respond with ONLY a JSON array, no markdown fences, no preamble. Each item: {"t":"mcq","q":"<emoji or Arabic prompt>","options":["..4 fully vocalized Arabic options.."],"a":"<the correct option, exactly matching one element of options>"}. Use ONLY the vocabulary and grammar the user specifies. All Arabic must be fully vocalized fusha. Make distractors plausible (same lesson vocabulary). Generate exactly the number requested.`;

const GRADE_SYSTEM = `You are an Arabic teacher grading a beginner's written sentences. The student knows only the vocabulary and grammar listed by the user. Respond with ONLY JSON, no fences: {"score": <0-100>, "feedback": "<2-3 short lines in simple fully vocalized Arabic: praise what is correct, then show corrections as: ❌ wrong → ✅ correct, naming the grammar term (مبتدأ، خبر، تنوين، مجرور...) briefly>"}. Be encouraging but precise.`;

const INGEST_SYSTEM = `You process a document for an Arabic learning app. The document should contain Arabic text (it may be a book excerpt, article, or lesson). Respond with ONLY JSON, no fences:
{"title":"<short Arabic title, vocalized>","excerpt":"<the Arabic text cleaned and normalized, up to ~6000 characters, keep original wording>","vocab":[{"ar":"<key word, FULLY vocalized>","emoji":"<single best emoji, or 📖 if none fits>"} ... 12-20 items]}
Choose vocab that is most useful and frequent in the document. If the document contains no meaningful Arabic text, respond with {"error":"no_arabic"}.`;

const DOCQUIZ_SYSTEM = `You write comprehension questions about a document for an Arabic learner. Respond with ONLY a JSON array, no fences. Each item: {"q":"<question in simple FULLY vocalized fusha Arabic about the document's content>","options":["..4 short vocalized Arabic options.."],"a":"<correct option, exactly matching one element of options>"}. Questions must test understanding of the document's actual content (who/what/where/why), not grammar. Keep language as simple as possible while staying in Arabic. Generate exactly the number requested.`;

const AYAH_CHECK_SYSTEM = `You check whether a learner has understood an ayah or dhikr. You are given the Arabic text, a simple reference meaning, and the learner's own attempt at explaining it (in English or Arabic). Judge ONLY whether they grasped the meaning — not their wording, spelling, or eloquence. Respond with ONLY JSON, no fences:
{"score": <0-100>, "verdict": "<one of: correct | close | incorrect>", "feedback": "<2-3 short lines: first in simple vocalized Arabic, then one short English line. Praise what they got right, then name precisely what they missed or misunderstood. Never be harsh.>"}
Scoring: 85+ if they captured the core meaning even loosely; 60-84 if partly right but missing something important; below 60 if they misunderstood. Be encouraging but honest — this is memorization and understanding of revelation, so accuracy matters.${ISLAMIC_GUARD}`;

const DICT_SYSTEM = `You are a classical-style Arabic dictionary (in the tradition of root-based lexicons like Lisan al-Arab and al-Qamus al-Muhit) inside a learning app for beginners. The user sends one Arabic word (possibly unvocalized, possibly with attached particles like الـ or بـ). Respond with ONLY JSON, no fences:
{"word":"<the base word, FULLY vocalized>","root":"<root letters separated by spaces, e.g. 'ك ت ب', or null for particles/pronouns>","definition":"<1-2 very short lines in VERY simple fully vocalized fusha Arabic; use emoji to carry meaning where possible; NEVER use English>","examples":["<very simple vocalized sentence>","<another>"],"derivations":[{"ar":"<vocalized word from the same root>","emoji":"<one emoji or null>"} ... up to 4],"note":"<one short line in simple vocalized Arabic describing the root's core meaning in the manner of the classical lexicons — describe, do NOT fabricate verbatim quotations from any lexicon>","en":"<ONE or TWO English words giving the plain meaning — nothing more, no sentence>"}
If the input is not an Arabic word, respond {"error":"not_arabic"}.`;

const EXPLAIN_SYSTEM = `You are a patient Arabic grammar teacher. The user sends an Arabic passage. Teach it sentence by sentence, entirely in simple FULLY vocalized fusha Arabic (never English, never transliteration), using emoji to support meaning. For EACH sentence output exactly this structure:

📖 «the sentence, fully vocalized»

then one line per word or phrase:
🔹 الكلمة — دورها النحوي (مُبْتَدَأ / خَبَر / فِعْل / فَاعِل / مَفْعُول بِه / حَرْف جَرّ / اِسْم مَجْرُور / مُضَاف إِلَيْه / نَعْت ...) — مَعْنَاهَا بِكَلِمَاتٍ بَسِيطَةٍ + emoji

then one summary line:
✨ مَعْنَى الْجُمْلَةِ بِبَسَاطَةٍ + emoji

Separate sentences with a blank line. Be accurate with all harakat and case endings. Keep explanations as simple as possible for a beginner. If the passage is long, cover at most the first 8 sentences and end with: 🔽 أَرْسِلْ بَقِيَّةَ النَّصِّ لِلْمُتَابَعَةِ${ISLAMIC_GUARD}`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(500, { error: "ANTHROPIC_API_KEY is not set in Netlify environment variables." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const { mode } = payload;
  let system, messages, maxTokens = 1000;

  if (mode === "tutor") {
    system = TUTOR_SYSTEM(payload.vocab || "", payload.level || "beginner");
    messages = (payload.messages || []).slice(-24);
  } else if (mode === "drills") {
    system = DRILL_SYSTEM;
    messages = [{ role: "user", content: payload.prompt || "" }];
    maxTokens = 1500;
  } else if (mode === "compose") {
    system = `You are a patient Arabic teacher marking a beginner's writing.
The task given was: ${payload.expected ? "using " + payload.expected : "free writing"}.
Return ONLY JSON, no other text:
{"corrected":"<their text rewritten correctly, fully vowelled>","feedback":"<2-4 sentences in plain English: what they did well first, then the one or two most important corrections and why. Be encouraging. Do not list every small error.>"}
If the writing is empty or not Arabic, say so kindly in the feedback and leave corrected empty.`;
    messages = [{ role: "user", content: `اَلْمَطْلُوبُ: ${payload.prompt || ""}\n\nمَا كَتَبَهُ الطَّالِبُ:\n${payload.text || ""}` }];
    maxTokens = 1200;
  } else if (mode === "grade") {
    system = GRADE_SYSTEM;
    messages = [{ role: "user", content: payload.prompt || "" }];
  } else if (mode === "ingest") {
    system = INGEST_SYSTEM;
    maxTokens = 1500;
    if (payload.pdf_base64) {
      messages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: payload.pdf_base64 } },
          { type: "text", text: "Process this document." },
        ],
      }];
    } else {
      messages = [{ role: "user", content: "Process this document:\n\n" + (payload.text || "").slice(0, 30000) }];
    }
  } else if (mode === "docquiz") {
    system = DOCQUIZ_SYSTEM;
    maxTokens = 2000;
    messages = [{
      role: "user",
      content: `Learner level: ${payload.level || "beginner"} (beginner = very simple language; intermediate = normal simple fusha; advanced = natural fusha).\nDocument:\n${(payload.content || "").slice(0, 12000)}\n\nGenerate ${payload.count || 5} comprehension questions.`,
    }];
  } else if (mode === "ayahcheck") {
    system = AYAH_CHECK_SYSTEM;
    maxTokens = 800;
    messages = [{
      role: "user",
      content: `Arabic: ${payload.ar}\nReference meaning: ${payload.simple}\nLearner's attempt: ${payload.attempt}`,
    }];
  } else if (mode === "dict") {
    system = DICT_SYSTEM;
    maxTokens = 1200;
    messages = [{ role: "user", content: String(payload.word || "").slice(0, 60) }];
  } else if (mode === "explain") {
    system = EXPLAIN_SYSTEM;
    maxTokens = 1400;
    messages = [{ role: "user", content: String(payload.content || "").slice(0, 6000) }];
  } else {
    return json(400, { error: "Unknown mode." });
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
    }).finally(() => clearTimeout(timer));
    const data = await res.json();
    if (!res.ok) return json(res.status, { error: data.error?.message || "Upstream error" });
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    return json(200, { text });
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return json(aborted ? 504 : 500, {
      error: aborted
        ? "That took too long to generate. Try a shorter passage."
        : String(e?.message || e),
    });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
