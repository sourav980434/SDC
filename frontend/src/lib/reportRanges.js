/**
 * Reference ranges of the Test Format Master (tbl_web_test_param_ranges) applied to a patient.
 *
 * A range line has sex A / M / F, an optional age window (age_from - age_to in Y / M / D) and a
 * low and / or high value. For a patient the most specific line wins:
 *   1. age window matches and sex matches
 *   2. age window matches, sex All
 *   3. no age window, sex matches
 *   4. no age window, sex All
 */

const DAYS = { D: 1, M: 30.4375, Y: 365.25 };

const num = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : Number(String(v).replace(/,/g, '')));

/** Patient age in days from a value and unit ('Y' | 'M' | 'D', also 'Yrs' / 'Mths' / 'Days'). */
export function ageInDays(age, unit = 'Y') {
  const n = num(age);
  if (n === null || Number.isNaN(n)) return null;
  const u = String(unit || 'Y').charAt(0).toUpperCase();
  return n * (DAYS[u] || DAYS.Y);
}

function inAgeWindow(range, days) {
  const from = num(range.age_from);
  const to = num(range.age_to);
  if (from === null && to === null) return null;          // no window on this line
  if (days === null) return false;
  const factor = DAYS[range.age_unit] || DAYS.Y;
  if (from !== null && days < from * factor) return false;
  if (to !== null && days > to * factor) return false;    // "to" is inclusive: 0 - 1 year includes 1 year
  return true;
}

/** The range line that applies to a patient, or null. sex: 'M' | 'F' | anything else (unknown). */
export function pickRange(ranges, sex, days) {
  const s = String(sex || '').charAt(0).toUpperCase();
  let best = null;
  let bestScore = -1;
  (ranges || []).forEach(r => {
    if (num(r.low) === null && num(r.high) === null) return;
    const window = inAgeWindow(r, days);
    if (window === false) return;
    const sexOk = r.sex === 'A' || r.sex === s;
    if (!sexOk) return;
    const score = (window ? 2 : 0) + (r.sex !== 'A' ? 1 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  });
  return best;
}

/** 'H' | 'L' | '' for a result against a range. Values that are not numbers get no flag. */
export function flagFor(value, range) {
  const v = num(value);
  if (!range || v === null || Number.isNaN(v)) return '';
  const low = num(range.low);
  const high = num(range.high);
  if (low !== null && v < low) return 'L';
  if (high !== null && v > high) return 'H';
  return '';
}

/** True when a result is beyond a panic (critical) limit of the range. */
export function isPanic(value, range) {
  const v = num(value);
  if (!range || v === null || Number.isNaN(v)) return false;
  const pl = num(range.panic_low);
  const ph = num(range.panic_high);
  return (pl !== null && v <= pl) || (ph !== null && v >= ph);
}

const decimalsOf = (v) => {
  const s = String(v ?? '');
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

/**
 * Number of decimals to show: the parameter setting, else as many as the range uses - the printed
 * range text counts too, since a stored 13.0 comes back as 13 ("13.0 - 18.0" -> 1 decimal).
 */
export function decimalsFor(param, range) {
  if (param?.decimals !== null && param?.decimals !== undefined && String(param.decimals) !== '') return Number(param.decimals);
  const fromText = (String(param?.ref_text || '').match(/\d+\.\d+/g) || []).map(decimalsOf);
  const all = [...fromText, ...(range ? [decimalsOf(range.low), decimalsOf(range.high)] : [])];
  return all.length ? Math.min(3, Math.max(...all)) : null;
}

export function formatNumber(value, decimals) {
  const v = num(value);
  if (v === null || Number.isNaN(v)) return String(value ?? '');
  if (decimals === null || decimals === undefined) return String(v);
  return v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** "13.0 - 18.0", "< 20", "> 60" - used when a parameter has no printed range text. */
export function rangeText(range, decimals) {
  if (!range) return '';
  const low = num(range.low);
  const high = num(range.high);
  const f = (v) => formatNumber(v, decimals);
  if (low !== null && high !== null) return `${f(low)} - ${f(high)}`;
  if (high !== null) return `< ${f(high)}`;
  if (low !== null) return `> ${f(low)}`;
  return '';
}
