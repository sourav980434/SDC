/**
 * Code 39 barcode as SVG rectangles - enough for registration / booking numbers on a report
 * (digits, capital letters, - . space $ / + %). Other characters are left out.
 */

// n = narrow, w = wide; 9 elements per character: bar, space, bar, space ... bar
const CODE39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
  $: 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
};

/** Bars of a Code 39 barcode: { bars: [{ x, w }], width } in narrow-bar units. */
export function code39Bars(text) {
  const clean = String(text || '').toUpperCase().split('').filter(c => c !== '*' && CODE39[c]).join('');
  const bars = [];
  let x = 0;
  `*${clean}*`.split('').forEach((c, i, all) => {
    CODE39[c].split('').forEach((el, j) => {
      const w = el === 'w' ? 3 : 1;
      if (j % 2 === 0) bars.push({ x, w });
      x += w;
    });
    if (i < all.length - 1) x += 1;   // gap between characters
  });
  return { bars, width: x };
}
