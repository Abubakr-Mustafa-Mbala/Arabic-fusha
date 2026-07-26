# اَلْفُصْحَى (Al-Fusha)

Learn Arabic **in Arabic**. No English definitions — meaning is carried by emoji, audio, and pattern, the way the Madinah-style direct method teaches. Rigor-first: real grammar terms (مبتدأ، خبر، مجرور) from lesson one, mastery gates, institute-style grades (ممتاز → راسب), and revision that must be cleared before new lessons unlock.

## What's inside (v0.1)

- **Level 1, Unit 1 — 4 authored lessons:** هَذَا · ذَلِكَ (with مَنْ/مَا) · المبتدأ والخبر · حروف الجر
- **Lesson flow:** مفردات → أمثلة → القاعدة → تدريبات → إنتاج
- **Drills:** authored MCQ + sentence-assembly; wrong answers re-queue until correct; unlimited AI-generated extras (تدريبات إضافية)
- **AI grading:** free writing corrected with named grammar feedback, scored 0–100 with the institute grade bands
- **SRS engine (SM-2):** vocabulary comes due for revision across days; due reviews lock new lessons until cleared
- **AI tutor (المعلم):** pure vocalized fusha, constrained to your learned vocabulary, quizzes you constantly
- **Accounts (v0.2):** email + password via Supabase; per-user progress sync protected by row-level security
- **Tashkeel fade (v0.2):** once a word reaches 4 correct spaced reviews, it appears WITHOUT harakat from then on — vowels fade word-by-word as each learner earns them, training reading toward unvocalized text
- **المعجم — Dictionary (v0.4):** root-based lookup in the tradition of Lisan al-Arab / al-Qamus al-Muhit — the word, its جذر, meaning explained in simple vocalized Arabic (never English), example sentences, same-root derivations, and a note on the root's classical sense. Tap any word inside a library document to look it up instantly; add any word to your revision with one tap.
- **اِشْرَحْ لِي — Explain (v0.5):** on any library document, a teacher mode breaks the text down sentence by sentence — every word's grammatical role (مبتدأ، خبر، فعل، فاعل، جار ومجرور...) and meaning, entirely in simple vocalized Arabic with emoji.
- **Lesson 5 (v0.5):** تعبيرات يومية — daily/Islamic courtesy expressions taught as call-and-response pairs (السلام عليكم ↔ وعليكم السلام، كيف حالك ↔ الحمد لله، ما شاء الله، جزاك الله خيرا، حياك الله، إن شاء الله...).
- **Read the originals (v0.6):** every dictionary entry links straight to the full classical texts — the actual لسان العرب entry for that root (tafsir.app) and the multi-lexicon search covering القاموس المحيط, الصحاح, and مقاييس اللغة (baheth.info). The app teaches the simplified meaning; one tap opens Ibn Manzur's real words.
- **اَلْمُصْحَفُ — Mushaf reader (v1.1/v1.2):** all 114 surahs, fetched live from the Tanzil-based alquran.cloud API (no AI-generated Quran text, and no giant file bundled in the app), real qari recitation per ayah (Mishary Alafasy), tap-word dictionary lookup, and a bookmark that remembers exactly where you stopped so you can open the app and continue reciting.
- **Retry → hint → reveal (v1.1):** wrong answers in lesson drills now get a real second and third chance — 1st mistake: try again. 2nd mistake: a wrong option is eliminated as a hint. 3rd mistake: the correct answer is shown and you move on, with the item queued for a future revision review.
- **Authenticity policy (v1.0):** all Islamic content is restricted to what is firmly established as authentic — Quran, and adhkar from the Sahihayn and narrations authenticated by the scholars of hadith (e.g. Shaykh al-Albani's صفة صلاة النبي). The AI is hard-instructed to never present anything as Sunnah unless well-established authentic, and to never issue rulings — it directs those to the people of knowledge.
- **القرآن — Understand your Salah (v0.9):** al-Fatiha taught word by word (hand-authored word glosses in simplified Arabic + emoji), plus al-Ikhlas, al-Falaq, an-Nas, al-Asr, al-Kawthar and أذكار الصلاة — every word tappable into the dictionary, per-ayah simplified meanings behind a reveal (test yourself first), audio per ayah, comprehension drills with institute grades, and one-tap harvest of each surah's key words into your SRS revision. Simplified meanings are learning aids; the UI points learners back to tafsir and the scholars.
- **Practice levels (v0.8):** in المعلم, choose 🌱 مبتدئ / 🌿 متوسط / 🌳 متقدم. Beginner keeps the tutor inside your learned vocabulary; intermediate anchors there but introduces new everyday words (emoji-supported) and holds real conversations; advanced speaks natural fusha and corrects with named grammar. Library comprehension quizzes match the chosen level too. A proper AI placement exam joins when Levels 2–3 content ships.
- **Voice conversation (v0.7):** tap 🎤 in المعلم and SPEAK your Arabic — the browser's speech engine transcribes it, the tutor replies in vocalized fusha and reads the reply aloud. A real spoken practice partner, daily. Works best in Chrome on Android; typing always remains as fallback. (Roadmap: premium natural-voice calls via a dedicated voice provider.)
- **Audio:** device speech synthesis (Arabic voice)
- **المكتبة — Library (v0.3):** paste Arabic text or upload a PDF (≤4 MB) / .txt. The AI harvests 12–20 key vocalized words into your SRS revision queue, then generates comprehension quizzes in Arabic on the document's actual content, graded on the institute scale. Per-user, synced to your account.

## Deploy (no terminal needed)

1. **Supabase (accounts):** create a project → SQL Editor → paste and run `supabase/schema.sql`. (Already deployed v0.2? Just run `supabase/migration-v0.3.sql` instead.) Then Authentication → Sign In / Providers → Email → turn **off** "Confirm email" (so friends can sign up instantly without confirmation emails).
2. **GitHub:** create a new repository → "uploading an existing file" → drag in everything in this folder (keep the folder structure: `netlify/functions/ai.js`, `src/...`, etc.) → commit.
3. **Netlify:** Add new site → Import an existing project → pick the repo. Build settings are read automatically from `netlify.toml`.
4. **Environment variables** (Site settings → Environment variables):
   - `ANTHROPIC_API_KEY` — your Anthropic key (stays server-side in the function, never exposed to the browser)
   - `VITE_SUPABASE_URL` — from Supabase → Settings → API
   - `VITE_SUPABASE_ANON_KEY` — from the same page (the anon/public key; safe for the browser, data is protected per-user by RLS)
5. Deploy. Done — the site is live with accounts.

Every user signs up with email + password; their lesson grades and revision schedule sync to their account (and you can see everyone's progress in Supabase → Table Editor → `lesson_progress`). If the Supabase variables are missing, the app falls back to device-only mode. Without the API key, lessons/drills/revision/grades all still work — only the AI tutor, AI drill generator, and writing correction need it.

## Architecture notes

- `src/data/curriculum.js` — the deterministic curriculum: all vocabulary, examples, rules, and authored drills live here (never AI-generated, so never wrong). Add Unit 2 by appending lessons to this file.
- `netlify/functions/ai.js` — single serverless endpoint with three modes: `tutor`, `drills` (fresh exercises as JSON), `grade` (writing correction). Model: claude-sonnet-4-6.
- `src/lib/store.js` — SM-2 spaced repetition + localStorage persistence. Swap `load`/`save` for Supabase calls to move to accounts (schema ready in `supabase/schema.sql`).
- Grade bands: ممتاز 90+ · جيد جدا 80–89 · جيد 70–79 · مقبول 60–69 · راسب <60. مقبول unlocks the next lesson; retake any lesson to raise the grade.

## Roadmap

Unit exams with sectioned scoring → reading module (graded passages, word-by-word audio, add-the-harakat drills) → spaced re-quizzing of library documents → proper Arabic TTS (device voices vary) → listening module with real fusha clips → Level 1 Units 2–4 → weekly progress report written in Arabic.
