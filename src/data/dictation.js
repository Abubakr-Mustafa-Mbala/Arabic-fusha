// اَلْإِمْلَاءُ — dictation.
//
// The Madinah institute teaches this as its own subject, and for good reason:
// a learner can read Arabic long before they can write it correctly. Hearing a
// sentence and producing it with the right hamzas, taa marbutas and spacing is
// a separate skill, and it is where careless spelling gets caught.

export const DICTATION = [
  {
    id: "d1", after: "l13", level: 1,
    focus: "هَمْزَةُ الْوَصْلِ وَالْقَطْعِ",
    focusEn: "Connecting and cutting hamza",
    items: [
      { ar: "اِسْمُ الْوَلَدِ مُحَمَّدٌ", note: "اِسْم takes a connecting hamza — no dot above." },
      { ar: "أَحْمَدُ طَالِبٌ مُجْتَهِدٌ", note: "أَحْمَد takes a cutting hamza — written on the alif." },
      { ar: "اِبْنُ الرَّجُلِ فِي الْمَدْرَسَةِ", note: "اِبْن is one of the words with a connecting hamza." },
      { ar: "أَكَلَ الْوَلَدُ الْخُبْزَ", note: "أَكَلَ begins with a cutting hamza." },
      { ar: "اِفْتَحِ الْبَابَ يَا أَخِي", note: "Command verbs of three letters take a connecting hamza." },
    ],
  },
  {
    id: "d2", after: "l13", level: 1,
    focus: "اَلتَّاءُ الْمَرْبُوطَةُ وَالْمَفْتُوحَةُ",
    focusEn: "Tied and open taa",
    items: [
      { ar: "اَلْمَدْرَسَةُ كَبِيرَةٌ", note: "A feminine noun ends in ة." },
      { ar: "مَدْرَسَتُهُ قَرِيبَةٌ مِنَ الْبَيْتِ", note: "The ة opens into ت once a pronoun attaches." },
      { ar: "كَتَبَتِ الْبِنْتُ الدَّرْسَ", note: "A verb takes an open ت, never a tied one." },
      { ar: "حَقِيبَتِي جَدِيدَةٌ", note: "حَقِيبَة + ي gives حَقِيبَتِي with an open taa." },
      { ar: "اَلْمُسْلِمَاتُ صَابِرَاتٌ", note: "The sound feminine plural always takes an open ت." },
    ],
  },
  {
    id: "d3", after: "l31", level: 2,
    focus: "اَلتَّنْوِينُ وَالْأَلِفُ",
    focusEn: "Tanwin and the silent alif",
    items: [
      { ar: "قَرَأْتُ كِتَابًا مُفِيدًا", note: "Tanwin fath usually adds a silent alif." },
      { ar: "شَرِبْتُ مَاءً بَارِدًا", note: "After a hamza on the line, no extra alif is written." },
      { ar: "رَأَيْتُ مُحَمَّدًا فِي الْمَسْجِدِ", note: "A proper noun takes tanwin unless it is a diptote." },
      { ar: "ذَهَبْتُ إِلَى مَكَّةَ", note: "مَكَّة is a diptote — a fatha, and no tanwin." },
      { ar: "جَاءَ الطُّلَّابُ جَمِيعًا", note: "Tanwin fath with the silent alif again." },
    ],
  },
  {
    id: "d4", after: "l41", level: 2,
    focus: "اَلْأَلِفُ الْمَقْصُورَةُ وَالْمَمْدُودَةُ",
    focusEn: "Shortened and long alif",
    items: [
      { ar: "مَشَى الرَّجُلُ إِلَى الْمَسْجِدِ", note: "مَشَى ends in a shortened alif — ى without dots." },
      { ar: "دَعَا الْإِمَامُ لِلْمُسْلِمِينَ", note: "دَعَا ends in a long alif — ا." },
      { ar: "هَذِهِ هِيَ الْكُبْرَى", note: "Feminine of أفعل ends in ى." },
      { ar: "صَلَّى عَلَى النَّبِيِّ", note: "Both صَلَّى and عَلَى end in the shortened alif." },
      { ar: "هَذَا مُصْطَفَى وَذَلِكَ عِيسَى", note: "Many names end in ى." },
    ],
  },
  {
    id: "d5", after: "l54", level: 3,
    focus: "اَلْأَفْعَالُ وَنُونُ الرَّفْعِ",
    focusEn: "Verbs and the nun",
    items: [
      { ar: "اَلطُّلَّابُ يَكْتُبُونَ الدَّرْسَ", note: "The nun stays — the verb is nominative." },
      { ar: "لَنْ يَكْتُبُوا الدَّرْسَ", note: "The nun drops, and a silent alif follows the waw." },
      { ar: "لَمْ يَذْهَبُوا إِلَى السُّوقِ", note: "Same rule under jussive." },
      { ar: "أَنْتِ تَقْرَئِينَ الْقُرْآنَ", note: "The nun of أنتِ, kept because it is nominative." },
      { ar: "اَلنِّسَاءُ يَقْرَأْنَ الْقُرْآنَ", note: "This nun is نون النسوة and never drops." },
    ],
  },
  {
    id: "d6", after: "l64", level: 4,
    focus: "اَلْهَمْزَةُ الْمُتَوَسِّطَةُ وَالْمُتَطَرِّفَةُ",
    focusEn: "Hamza in the middle and at the end",
    items: [
      { ar: "سَأَلَ الطَّالِبُ الْمُعَلِّمَ", note: "A hamza on the alif when the vowel before it is a fatha." },
      { ar: "قَرَأَ الْإِمَامُ سُورَةَ الْفَاتِحَةِ", note: "Final hamza on the alif after a fatha." },
      { ar: "يَسْأَلُ النَّاسُ عَنِ الْحَقِّ", note: "The hamza sits on the alif in the middle here." },
      { ar: "جَاءَ الرَّجُلُ وَبَدَأَ الدَّرْسُ", note: "A hamza after a long alif is written on the line." },
      { ar: "شَيْءٌ مِنَ الْخَيْرِ خَيْرٌ مِنْ لَا شَيْءَ", note: "After a sukun, the final hamza sits on the line." },
    ],
  },
];

// ——— اَلتَّعْبِيرُ — guided composition ———
// The institute's third subject. A learner is given a scaffold and asked to
// produce, not to recognise. The AI tutor marks what they write.

export const COMPOSITION = [
  {
    id: "c1", after: "l13", level: 1,
    title: "صِفْ فَصْلَكَ",
    titleEn: "Describe your classroom",
    prompt: "اُكْتُبْ سِتَّ جُمَلٍ عَنْ فَصْلِكَ أَوْ غُرْفَتِكَ",
    scaffold: [
      "هَذَا ... وَهَذِهِ ...",
      "فِي ... مَكْتَبٌ وَ...",
      "اَلْـ... كَبِيرٌ / صَغِيرٌ",
      "اَلْـ... عَلَى / تَحْتَ / أَمَامَ ...",
      "بَابُ ... و نَافِذَةُ ...",
    ],
    use: ["هَذَا / هَذِهِ", "اَلْإِضَافَةُ", "حُرُوفُ الْجَرِّ", "اَلنَّعْتُ"],
  },
  {
    id: "c2", after: "l31", level: 2,
    title: "أُسْرَتِي",
    titleEn: "My family",
    prompt: "اُكْتُبْ ثَمَانِيَ جُمَلٍ عَنْ أُسْرَتِكَ: مَنْ فِيهَا، وَأَعْمَارُهُمْ، وَمَاذَا يَعْمَلُونَ",
    scaffold: [
      "فِي أُسْرَتِي ... أَشْخَاصٍ",
      "أَبِي ... وَأُمِّي ...",
      "لِي ... إِخْوَةٍ وَ... أَخَوَاتٍ",
      "عُمْرُ أَخِي ... سَنَةً",
      "عَمِّي ... وَخَالِي ...",
    ],
    use: ["اَلْأَعْدَادُ", "لِي / عِنْدِي", "اَلْمُثَنَّى وَالْجَمْعُ", "اَلْعَمُّ وَالْخَالُ"],
  },
  {
    id: "c3", after: "l41", level: 2,
    title: "فِي السُّوقِ",
    titleEn: "At the market",
    prompt: "اُكْتُبْ حِوَارًا بَيْنَكَ وَبَيْنَ الْبَائِعِ، لَا يَقِلُّ عَنْ عَشْرِ جُمَلٍ",
    scaffold: [
      "— اَلسَّلَامُ عَلَيْكُمْ",
      "— عِنْدَكَ ...؟",
      "— بِكَمْ ...؟",
      "— هَذَا غَالٍ، عِنْدَكَ أَرْخَصُ؟",
      "— طَيِّبٌ، آخُذُ ...",
    ],
    use: ["اَلْأَسْئِلَةُ", "بِكَمْ", "اَلْأَعْدَادُ", "أَفْعَلُ التَّفْضِيلِ"],
  },
  {
    id: "c4", after: "l54", level: 3,
    title: "يَوْمِي",
    titleEn: "My day",
    prompt: "صِفْ يَوْمَكَ مِنَ الْفَجْرِ إِلَى النَّوْمِ فِي عَشْرِ جُمَلٍ، مُسْتَعْمِلًا الْمُضَارِعَ",
    scaffold: [
      "أَسْتَيْقِظُ فِي السَّاعَةِ ...",
      "ثُمَّ أَتَوَضَّأُ وَأُصَلِّي ...",
      "بَعْدَ ... أَذْهَبُ إِلَى ...",
      "فِي الْمَسَاءِ ...",
      "وَأَنَامُ فِي السَّاعَةِ ...",
    ],
    use: ["اَلْمُضَارِعُ", "اَلسَّاعَةُ", "ثُمَّ / بَعْدَ", "أَفْعَالُ الْيَوْمِ"],
  },
  {
    id: "c5", after: "l64", level: 4,
    title: "لِمَاذَا أَتَعَلَّمُ الْعَرَبِيَّةَ",
    titleEn: "Why I am learning Arabic",
    prompt: "اُكْتُبْ فِقْرَةً مِنْ عَشْرِ جُمَلٍ: اِبْدَأْ بِرَأْيِكَ، ثُمَّ اذْكُرْ سَبَبَيْنِ، ثُمَّ اخْتِمْ",
    scaffold: [
      "فِي رَأْيِي، ...",
      "أَوَّلًا: ... لِأَنَّ ...",
      "ثَانِيًا: ...",
      "وَمَعَ ذَلِكَ ...",
      "وَأَخِيرًا، هَدَفِي أَنْ ...",
    ],
    use: ["فِي رَأْيِي", "لِأَنَّ", "أَوَّلًا وَثَانِيًا", "أَنْ + مَنْصُوبٌ"],
  },
];
