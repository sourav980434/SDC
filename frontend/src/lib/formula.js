/**
 * Formula parameters of the Test Format Master: "[Total Protein] - [Albumin]",
 * "[Albumin] / [Globulin]", "([Total Cholesterol] - [HDL]) - [Triglyceride] / 5".
 * Names in [ ] are other parameters of the same report (case and spacing do not matter).
 * Only numbers, + - * / and brackets are allowed; anything else gives no result.
 */

const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Result of a formula, or '' when it cannot be worked out yet (a value missing / not a number). */
export function evaluateFormula(formula, valueByName) {
  if (!formula || !String(formula).trim()) return '';
  let missing = false;
  const expression = String(formula).replace(/\[([^\]]+)\]/g, (_, name) => {
    const raw = valueByName[norm(name)];
    const v = raw === undefined || raw === null ? NaN : Number(String(raw).replace(/,/g, ''));
    if (Number.isNaN(v)) missing = true;
    return `(${v})`;
  });
  if (missing || !/^[\d\s+\-*/().]+$/.test(expression)) return '';
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? String(Math.round(result * 1000) / 1000) : '';
  } catch (e) {
    return '';
  }
}

/** Map of normalised parameter name -> value, for evaluateFormula. */
export function valuesByName(parameters, values, keyOf) {
  const map = {};
  parameters.forEach((p, i) => {
    if (p.row_type === 'PARAM') map[norm(p.name)] = values[keyOf(p, i)];
  });
  return map;
}
