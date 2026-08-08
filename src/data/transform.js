// اَلتَّحْوِيلُ — sentence transformation.
//
// This is the step between recognising Arabic and producing it. A learner who
// can only answer multiple-choice has recognition; a learner who can take one
// sentence and turn it past, future, negated, plural and feminine has command.
//
// One sentence becomes ten exercises. Nothing here is guessed — a transform is
// only offered when the sentence's shape makes the answer certain.

const bare = (t) => String(t).replace(/[\u064B-\u0652\u0670\u0640]/g, "");

// ——— past ↔ present, for the commonest verb shapes ———
const VERB_PAIRS = [
  ["ذَهَبَ", "يَذْهَبُ"], ["كَتَبَ", "يَكْتُبُ"], ["قَرَأَ", "يَقْرَأُ"],
  ["جَلَسَ", "يَجْلِسُ"], ["خَرَجَ", "يَخْرُجُ"], ["دَخَلَ", "يَدْخُلُ"],
  ["سَمِعَ", "يَسْمَعُ"], ["فَتَحَ", "يَفْتَحُ"], ["أَكَلَ", "يَأْكُلُ"],
  ["شَرِبَ", "يَشْرَبُ"], ["فَهِمَ", "يَفْهَمُ"], ["نَصَرَ", "يَنْصُرُ"],
  ["عَلِمَ", "يَعْلَمُ"], ["عَمِلَ", "يَعْمَلُ"], ["رَجَعَ", "يَرْجِعُ"],
  ["نَظَرَ", "يَنْظُرُ"], ["جَاءَ", "يَجِيءُ"], ["قَالَ", "يَقُولُ"],
  ["صَلَّى", "يُصَلِّي"], ["دَرَسَ", "يَدْرُسُ"], ["لَعِبَ", "يَلْعَبُ"],
  ["حَفِظَ", "يَحْفَظُ"], ["طَلَبَ", "يَطْلُبُ"], ["وَجَدَ", "يَجِدُ"],
];

// ——— singular → plural, for nouns whose plural is certain ———
const PLURALS = [
  ["اَلطَّالِبُ", "اَلطُّلَّابُ"], ["اَلْوَلَدُ", "اَلْأَوْلَادُ"],
  ["اَلرَّجُلُ", "اَلرِّجَالُ"], ["اَلْمُسْلِمُ", "اَلْمُسْلِمُونَ"],
  ["اَلْمُدَرِّسُ", "اَلْمُدَرِّسُونَ"], ["اَلْمُؤْمِنُ", "اَلْمُؤْمِنُونَ"],
  ["اَلْكِتَابُ", "اَلْكُتُبُ"], ["اَلْبَيْتُ", "اَلْبُيُوتُ"],
  ["اَلْقَلَمُ", "اَلْأَقْلَامُ"], ["اَلْبَابُ", "اَلْأَبْوَابُ"],
  ["اَلْمَسْجِدُ", "اَلْمَسَاجِدُ"], ["اَلنَّجْمُ", "اَلنُّجُومُ"],
];

// ——— masculine → feminine ———
const FEMININE = [
  ["اَلطَّالِبُ", "اَلطَّالِبَةُ"], ["اَلْمُدَرِّسُ", "اَلْمُدَرِّسَةُ"],
  ["اَلْمُسْلِمُ", "اَلْمُسْلِمَةُ"], ["اَلْوَلَدُ", "اَلْبِنْتُ"],
  ["اَلرَّجُلُ", "اَلْمَرْأَةُ"], ["اَلطَّبِيبُ", "اَلطَّبِيبَةُ"],
];

function findPair(sentence, table) {
  const b = bare(sentence);
  for (const [a, x] of table) {
    if (b.includes(bare(a))) return [a, x];
  }
  return null;
}

// The verb's past form, if the sentence opens with one we know.
function pastVerbIn(sentence) {
  const b = bare(sentence).trim();
  for (const [past, pres] of VERB_PAIRS) {
    if (b.startsWith(bare(past))) return [past, pres];
  }
  return null;
}

function swap(sentence, from, to) {
  // Replace on the bare form but return the vowelled original with the new part.
  const words = sentence.split(/\s+/);
  const out = words.map((w) => (bare(w) === bare(from) ? to : w));
  return out.join(" ");
}

export function transformDrills(lesson, max = 6) {
  // Only real sentences. Word lists, ayat, questions and pattern demonstrations
  // cannot be transformed meaningfully, so they are excluded.
  const sentences = (lesson.examples || [])
    .map((e) => e.ar)
    .filter((a) => {
      if (!a) return false;
      if (a.includes("﴿") || a.includes("؟") || a.includes("·") || a.includes("←") || a.includes("=")) return false;
      const n = a.trim().split(/\s+/).length;
      return n >= 3 && n <= 7;
    });

  const out = [];

  sentences.forEach((sen) => {
    const vp = pastVerbIn(sen);

    // ① past → present
    if (vp) {
      const [past, pres] = vp;
      out.push({
        t: "transform",
        q: sen,
        ask: "حَوِّلْ إِلَى الْمُضَارِعِ",
        askEn: "Change it to the present tense",
        a: swap(sen, past, pres),
        why: `${past} is past; its present form is ${pres}. Nothing else in the sentence changes.`,
        _gen: true,
      });

      // ② past → future
      out.push({
        t: "transform",
        q: sen,
        ask: "حَوِّلْ إِلَى الْمُسْتَقْبَلِ",
        askEn: "Change it to the future",
        a: swap(sen, past, "سَ" + pres),
        why: `The future is the present with سَـ attached: سَ${pres}.`,
        _gen: true,
      });

      // ③ negate the past
      out.push({
        t: "transform",
        q: sen,
        ask: "اِنْفِ الْجُمْلَةَ بِـ «مَا»",
        askEn: "Negate it with مَا",
        a: "مَا " + sen,
        why: "مَا before a past verb negates it, and changes nothing else.",
        _gen: true,
      });

      // ④ turn it into a question
      out.push({
        t: "transform",
        q: sen,
        ask: "اِجْعَلْهَا سُؤَالًا بِـ «هَلْ»",
        askEn: "Turn it into a question with هَلْ",
        a: "هَلْ " + sen + "؟",
        why: "هَلْ at the front turns any statement into a yes-or-no question.",
        _gen: true,
      });
    }

    // ⑤ singular → plural
    const pl = findPair(sen, PLURALS);
    if (pl) {
      out.push({
        t: "transform",
        q: sen,
        ask: "حَوِّلِ الْمُفْرَدَ إِلَى الْجَمْعِ",
        askEn: "Change the singular to a plural",
        a: swap(sen, pl[0], pl[1]),
        why: `${pl[0]} becomes ${pl[1]} in the plural.`,
        _gen: true,
      });
    }

    // ⑥ masculine → feminine
    const fm = findPair(sen, FEMININE);
    if (fm && vp) {
      // the verb takes تْ when the doer is feminine
      const withFem = swap(sen, fm[0], fm[1]);
      out.push({
        t: "transform",
        q: sen,
        ask: "حَوِّلِ الْفَاعِلَ إِلَى الْمُؤَنَّثِ",
        askEn: "Make the doer feminine",
        a: swap(withFem, vp[0], vp[0] + "تْ"),
        why: `${fm[0]} becomes ${fm[1]}, and the verb takes تْ because its doer is now feminine.`,
        _gen: true,
      });
    } else if (fm) {
      out.push({
        t: "transform",
        q: sen,
        ask: "حَوِّلْ إِلَى الْمُؤَنَّثِ",
        askEn: "Make it feminine",
        a: swap(sen, fm[0], fm[1]),
        why: `${fm[0]} becomes ${fm[1]}.`,
        _gen: true,
      });
    }
  });

  return out.slice(0, max);
}
