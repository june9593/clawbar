// Pure helpers for deriving a stable visual identity from a Claude project key.

/** Extract the last non-empty segment of a /-separated path. */
export function shortName(decodedPath: string): string {
  const parts = decodedPath.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : decodedPath || '?';
}

/** First letter of `shortName`, uppercased. Falls back to '?' for empty input. */
export function firstLetter(name: string): string {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

/** Hash a key string into a stable HSL colour string (mid-saturation, mid-lightness). */
export function colorFromKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) & 0xffff;
  }
  return `hsl(${h % 360}, 55%, 55%)`;
}

// Smoke checks (dev only). console.assert never throws — safe even when assertions fail.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  console.assert(shortName('/Users/yueliu/edge/clawbar') === 'clawbar', 'shortName');
  console.assert(shortName('') === '?', 'shortName empty');
  console.assert(firstLetter('clawbar') === 'C', 'firstLetter');
  console.assert(firstLetter('') === '?', 'firstLetter empty');
  console.assert(colorFromKey('foo') === colorFromKey('foo'), 'colorFromKey stable');
  console.assert(colorFromKey('a').startsWith('hsl('), 'colorFromKey hsl');
}
