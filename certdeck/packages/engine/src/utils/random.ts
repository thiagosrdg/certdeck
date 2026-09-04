export type RNG = () => number;

/**
 * A small, fast, seedable PRNG (mulberry32). Used so exam generation is
 * reproducible in tests; the app itself defaults to Math.random.
 */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle. Does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: RNG = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function pickN<T>(items: readonly T[], n: number, rng: RNG = Math.random): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, n));
}
