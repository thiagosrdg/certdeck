/**
 * The accents a deck can wear.
 *
 * Every entry is a *pair*, because one hue cannot serve both card faces: a
 * value saturated enough to carry white text on ivory goes muddy on the
 * charcoal-plum card, and its dark counterpart would wash out on ivory.
 *
 * These are not free choices. Each was measured before it earned a slot, and
 * a new one has to clear the same four bars:
 *
 * 1. WCAG AA (>= 4.5:1) against its own theme's card face, since the accent
 *    carries button text.
 * 2. At least ΔE 25 from `--cd-correct` and `--cd-incorrect`. An accent that
 *    reads as the right/wrong signal breaks the one thing this app must never
 *    get wrong. This is what ruled out crimson, pine and copper.
 * 3. At least ΔE 18 from all five suit hues, so a button is never mistaken
 *    for a domain. This is what ruled out ocean blue (ΔE 5.8 from the blue
 *    suit) and amber (ΔE 11.9 from the amber suit).
 * 4. At least ΔE 20 from every other accent here — a picker whose swatches
 *    look alike is a worse picker. This is what ruled out fuchsia, which sat
 *    ΔE 16.4 from lilac.
 *
 * L* is also held between 30 and 62: darker than that stops reading as a
 * colour at all, lighter loses contrast on ivory.
 */
export interface AccentOption {
  id: string;
  name: string;
  /** Used on the ivory card face. */
  light: string;
  /** Used on the charcoal-plum card face. */
  dark: string;
}

export const ACCENTS: readonly AccentOption[] = [
  { id: "lilac", name: "Lilac", light: "#7B2FA8", dark: "#BFA0F0" },
  { id: "indigo", name: "Indigo", light: "#4338CA", dark: "#A5B4FC" },
  { id: "teal", name: "Teal", light: "#0F6E6E", dark: "#5FD9CE" },
  { id: "moss", name: "Moss", light: "#556F1C", dark: "#B5D46A" },
  { id: "rose", name: "Rose", light: "#B01E64", dark: "#F58ABE" },
  { id: "plum", name: "Plum", light: "#8A3A74", dark: "#DE95C6" },
  { id: "slate", name: "Slate", light: "#4A5568", dark: "#AEB8C9" },
];

export function findAccent(id: string | null | undefined): AccentOption | undefined {
  return id ? ACCENTS.find((a) => a.id === id) : undefined;
}
