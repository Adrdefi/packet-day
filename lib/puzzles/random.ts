// Seeded randomness for the puzzle generators. Every puzzle is built from a
// per-packet seed, so the same seed always rebuilds the same puzzle.

export type Rng = () => number;

/** mulberry32: small, fast, good enough for puzzle layout. Returns [0, 1). */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh 32-bit seed for a new packet. */
export function newPuzzleSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** A second, independent seed derived from a seed and a label. */
export function deriveSeed(seed: number, label: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h >>> 0;
}

export function randInt(rng: Rng, n: number): number {
  return Math.min(Math.floor(rng() * n), n - 1);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, items.length)];
}

/** In-place Fisher-Yates shuffle. Returns the same array. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
