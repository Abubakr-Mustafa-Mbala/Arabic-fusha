// اَلْقِرَاءَةُ بِلَا شَكْلٍ — reading without harakat.
//
// Every real book a learner will ever open is unvowelled. Yet every teaching
// text is fully vowelled, so learners arrive at the library unable to read.
// The gap is not knowledge — it is habit, and habit is trained by degrees.
//
// Five stages, removing the vowels a layer at a time. By the last stage the
// learner is reading exactly what is printed in a classical book.

const HARAKAT = /[\u064B-\u0652\u0670]/g;
const SHORT = /[\u064E\u064F\u0650\u0652]/g;      // fatha damma kasra sukun
const TANWIN = /[\u064B\u064C\u064D]/g;           // the doubled endings
const SHADDA = /\u0651/g;

export const STAGES = [
  {
    id: 1,
    ar: "مَشْكُولٌ كَامِلًا",
    en: "Fully vowelled",
    hint: "Everything marked, as in a teaching book.",
    strip: (t) => t,
  },
  {
    id: 2,
    ar: "بِلَا تَنْوِينٍ",
    en: "Without tanwin",
    hint: "The doubled endings are gone. You must supply them yourself.",
    strip: (t) => t.replace(TANWIN, ""),
  },
  {
    id: 3,
    ar: "بِلَا حَرَكَاتِ الْآخِرِ",
    en: "Without final vowels",
    hint: "The case endings are gone — the hardest part, and the one that matters.",
    strip: (t) =>
      t
        .split(/\s+/)
        .map((w) => {
          const bare = w.replace(TANWIN, "");
          // remove only the last short vowel of each word
          return bare.replace(/[\u064E\u064F\u0650\u0652](?=[^\u0600-\u06FF]*$)/, "");
        })
        .join(" "),
  },
  {
    id: 4,
    ar: "بِالشَّدَّةِ فَقَطْ",
    en: "Shadda only",
    hint: "Only the doubling mark remains — as in most printed books.",
    strip: (t) => {
      let out = "";
      for (const ch of t) {
        if (ch === "\u0651") { out += ch; continue; }
        if (HARAKAT.test(ch)) { HARAKAT.lastIndex = 0; continue; }
        out += ch;
      }
      return out;
    },
  },
  {
    id: 5,
    ar: "بِلَا شَكْلٍ",
    en: "Completely bare",
    hint: "Exactly as a classical book is printed. This is the goal.",
    strip: (t) => t.replace(HARAKAT, "").replace(SHADDA, ""),
  },
];

export function stripTo(text, stage) {
  const s = STAGES.find((x) => x.id === stage) || STAGES[0];
  return s.strip(String(text));
}

// Compare what the learner read aloud (or typed) against the true text,
// ignoring vowels — we are testing whether they read the right WORDS.
export function sameWords(a, b) {
  const norm = (t) =>
    String(t).replace(HARAKAT, "").replace(SHADDA, "").replace(/[^\u0600-\u06FF\s]/g, "").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

// Passages for the trainer, in rising difficulty. Every one is either Quran,
// hadith, or a sentence the learner has already met in the lessons.
export const PASSAGES = [
  {
    id: "r1", level: 1, source: "مِنَ الدُّرُوسِ",
    text: "ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ",
    en: "The student went to the school",
  },
  {
    id: "r2", level: 1, source: "مِنَ الدُّرُوسِ",
    text: "اَلْبَيْتُ كَبِيرٌ وَالْغُرْفَةُ صَغِيرَةٌ",
    en: "The house is big and the room is small",
  },
  {
    id: "r3", level: 1, source: "مِنَ الدُّرُوسِ",
    text: "مِفْتَاحُ الْبَيْتِ عَلَى الْمَكْتَبِ",
    en: "The key of the house is on the desk",
  },
  {
    id: "r4", level: 2, source: "اَلْفَاتِحَةُ",
    text: "اَلْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    en: "All praise is for Allah, Lord of the worlds",
  },
  {
    id: "r5", level: 2, source: "اَلْفَاتِحَةُ",
    text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    en: "You alone we worship and You alone we ask for help",
  },
  {
    id: "r6", level: 2, source: "اَلْإِخْلَاصُ",
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ",
    en: "Say: He is Allah, One. Allah, the Eternal Refuge",
  },
  {
    id: "r7", level: 3, source: "اَلْبَقَرَةُ ٢",
    text: "ذَلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِلْمُتَّقِينَ",
    en: "That is the Book about which there is no doubt, a guidance for the God-fearing",
  },
  {
    id: "r8", level: 3, source: "اَلْعَصْرُ",
    text: "وَالْعَصْرِ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ",
    en: "By time, indeed mankind is in loss",
  },
  {
    id: "r9", level: 3, source: "حَدِيثٌ",
    text: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    en: "Deeds are but by intentions, and every man shall have what he intended",
  },
  {
    id: "r10", level: 4, source: "اَلْحُجُرَاتُ ١٣",
    text: "إِنَّ أَكْرَمَكُمْ عِنْدَ اللَّهِ أَتْقَاكُمْ",
    en: "Indeed the noblest of you before Allah is the most God-fearing of you",
  },
  {
    id: "r11", level: 4, source: "حَدِيثٌ",
    text: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    en: "Whoever treads a path seeking knowledge, Allah makes easy for him a path to Paradise",
  },
  {
    id: "r12", level: 5, source: "اَلنُّورُ ٣٥",
    text: "اَللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ",
    en: "Allah is the Light of the heavens and the earth. The likeness of His light is as a niche within which is a lamp",
  },
];
