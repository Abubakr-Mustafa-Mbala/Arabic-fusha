import { useRef } from "react";
import { C } from "../lib/shared";

// لَوْحَةُ التَّشْكِيلِ — phone Arabic keyboards don't offer harakat.
// This strip sits under any Arabic input and inserts them at the cursor.

const MARKS = [
  { m: "\u064E", label: "فَتْحَة", show: "◌َ" },
  { m: "\u0650", label: "كَسْرَة", show: "◌ِ" },
  { m: "\u064F", label: "ضَمَّة", show: "◌ُ" },
  { m: "\u0652", label: "سُكُون", show: "◌ْ" },
  { m: "\u0651", label: "شَدَّة", show: "◌ّ" },
  { m: "\u064B", label: "تَنْوِين فَتْح", show: "◌ً" },
  { m: "\u064D", label: "تَنْوِين كَسْر", show: "◌ٍ" },
  { m: "\u064C", label: "تَنْوِين ضَمّ", show: "◌ٌ" },
];

const EXTRAS = [
  { m: "ة", label: "تاء مربوطة" },
  { m: "أ", label: "همزة" },
  { m: "إ", label: "همزة" },
  { m: "آ", label: "مدّ" },
  { m: "ى", label: "ألف مقصورة" },
  { m: "ئ", label: "همزة" },
  { m: "ؤ", label: "همزة" },
];

export default function TashkeelBar({ targetRef, onInsert }) {
  const lastRef = useRef(null);

  const insert = (ch) => {
    const el = targetRef?.current;
    if (!el) {
      onInsert?.(ch);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + ch + el.value.slice(end);
    // Fire a native-style change so React state updates
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype,
      "value"
    )?.set;
    if (setter) setter.call(el, next);
    else el.value = next;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + ch.length;
      try { el.setSelectionRange(pos, pos); } catch {}
    });
    lastRef.current = ch;
  };

  const Btn = ({ ch, show, label }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => insert(ch)}
      title={label}
      style={{
        minWidth: 40, padding: "7px 6px", borderRadius: 9,
        background: C.surface, border: `1px solid ${C.border}`,
        fontSize: 19, lineHeight: 1.1,
      }}
    >
      <span className="arabic">{show}</span>
    </button>
  );

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 9.5, color: C.faded, textAlign: "center", marginBottom: 4 }}>
        اَلتَّشْكِيلُ — tap to add harakat your keyboard doesn't have
      </div>
      <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
        {MARKS.map((k) => <Btn key={k.m} ch={k.m} show={k.show} label={k.label} />)}
      </div>
      <div dir="rtl" style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginTop: 5 }}>
        {EXTRAS.map((k) => <Btn key={k.m} ch={k.m} show={k.m} label={k.label} />)}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = targetRef?.current;
            if (!el) return;
            const start = el.selectionStart ?? 0;
            if (start === 0) return;
            const next = el.value.slice(0, start - 1) + el.value.slice(el.selectionEnd ?? start);
            const setter = Object.getOwnPropertyDescriptor(
              el instanceof HTMLTextAreaElement
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype,
              "value"
            )?.set;
            if (setter) setter.call(el, next);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            requestAnimationFrame(() => {
              el.focus();
              try { el.setSelectionRange(start - 1, start - 1); } catch {}
            });
          }}
          style={{
            minWidth: 44, padding: "7px 6px", borderRadius: 9,
            background: C.redSoft, border: `1px solid ${C.red}`, color: C.red, fontSize: 15,
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
