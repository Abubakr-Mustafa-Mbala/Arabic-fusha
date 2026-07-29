# Vocabulary images

Drop your own pictures here — copyright-free photos, or your own drawings
in the style of the Madinah books. PNG or SVG, ideally square, on a plain
background.

To attach one to a word, add an `img` field in src/data/curriculum.js:

    { ar: "كِتَابٌ", en: "book", img: "/img/kitab.png" }

The app shows the image if it is there, falls back to the emoji if not,
and shows nothing at all if neither exists. Nothing else needs changing.

Suggested naming: use the bare Arabic word in Latin letters —
kitab.png · bayt.png · qalam.png · miftah.png
