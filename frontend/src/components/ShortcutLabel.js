'use client';

/**
 * Keyboard shortcut helpers for buttons and links.
 *
 * 1. Underline the shortcut letter in a label (follows customised shortcuts):
 *      <ShortcutLabel text="Save Booking" combo={shortcuts.SAVE_VOUCHER.key} />   ->  <u>S</u>ave Booking
 *    If the shortcut letter is not in the label, the text is shown without an underline.
 *
 * 2. Flash the target when its shortcut is pressed:
 *      <button data-shortcut="SAVE_VOUCHER">…</button>
 *      flashShortcut('SAVE_VOUCHER');   // call from the key handler
 *    Uses the global `.shortcut-flash` animation in app/globals.css.
 *    Put `data-shortcut` on an element whose className does not change on the same action,
 *    otherwise React re-render removes the flash class.
 */

// "Alt+s" -> "s"; returns '' for combos without a single-letter key (e.g. "Escape")
export function getShortcutLetter(combo) {
  if (!combo || typeof combo !== 'string') return '';
  const parts = combo.split('+');
  const key = parts[parts.length - 1];
  return parts.length > 1 && key.length === 1 ? key : '';
}

// "Alt+s" -> "Alt + S" (for tooltips)
export function formatShortcut(combo) {
  if (!combo || typeof combo !== 'string') return '';
  return combo
    .split('+')
    .map(part => (part.length === 1 ? part.toUpperCase() : part))
    .join(' + ');
}

// Position of the shortcut letter in the label. Prefers a capital at the start of a word
// ("Bill / Invoice" + i -> Invoice), otherwise the first occurrence in any case.
function findShortcutIndex(text, key) {
  if (!key || !text) return -1;
  const upperIndex = text.indexOf(key.toUpperCase());
  if (upperIndex >= 0 && (upperIndex === 0 || /[\s/(&-]/.test(text.charAt(upperIndex - 1)))) {
    return upperIndex;
  }
  return text.toLowerCase().indexOf(key.toLowerCase());
}

// Pass either `combo` ("Alt+s") or a direct `letter` ("s", used by sidebar menu accelerators)
export function ShortcutLabel({ text, combo, letter }) {
  const key = letter || getShortcutLetter(combo);
  const index = findShortcutIndex(text, key);
  if (index < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <u>{text.charAt(index)}</u>
      {text.slice(index + 1)}
    </>
  );
}

export function flashShortcut(shortcutId) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`[data-shortcut="${shortcutId}"]`).forEach((el) => {
    el.classList.remove('shortcut-flash');
    void el.offsetWidth; // restart the animation on repeated presses
    el.classList.add('shortcut-flash');
    clearTimeout(el._shortcutFlashTimer);
    el._shortcutFlashTimer = setTimeout(() => el.classList.remove('shortcut-flash'), 700);
  });
}
