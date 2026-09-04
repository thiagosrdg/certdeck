import { describe, expect, it } from "vitest";
import { ACCENTS, findAccent } from "../ui/accents";

/**
 * The accent palette's rules are documented in accents.ts, which is where a
 * future colour will be added — and documentation does not stop anyone
 * pasting in a hex that fails them. These tests do.
 *
 * The reference colours are duplicated from tokens.css and the Network+
 * config on purpose: a test that imported them would silently follow a
 * change to them, when a change to them is exactly the moment the palette
 * needs re-checking.
 */

const CARD_LIGHT = "#FAF6EC";
const CARD_DARK = "#211E2C";
const STATE = { correct: "#2F7A4F", incorrect: "#9C3D46" };
const SUITS = ["#3B6EA5", "#2E8B57", "#6B4FA0", "#9C3D46", "#C0762B"];

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = channels(hex).map(linearise) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function lab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(linearise) as [number, number, number];
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [la, aa, ba] = lab(a);
  const [lb, ab, bb] = lab(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

describe("accent palette", () => {
  it("offers a choice without overwhelming it", () => {
    expect(ACCENTS.length).toBeGreaterThanOrEqual(4);
    expect(ACCENTS.length).toBeLessThanOrEqual(12);
  });

  it("has unique ids and names", () => {
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length);
    expect(new Set(ACCENTS.map((a) => a.name)).size).toBe(ACCENTS.length);
  });

  it("keeps lilac as the first entry, since it is the default a null setting falls back to", () => {
    expect(ACCENTS[0]?.id).toBe("lilac");
  });

  it.each(ACCENTS.map((a) => [a.name, a] as const))(
    "%s carries button text on both card faces (WCAG AA)",
    (_name, accent) => {
      expect(contrastRatio(accent.light, CARD_LIGHT)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accent.dark, CARD_DARK)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(ACCENTS.map((a) => [a.name, a] as const))(
    "%s cannot be mistaken for the correct/incorrect signal",
    (_name, accent) => {
      for (const [role, hex] of Object.entries(STATE)) {
        expect(deltaE(accent.light, hex), `${accent.name} vs ${role}`).toBeGreaterThanOrEqual(25);
      }
    }
  );

  it.each(ACCENTS.map((a) => [a.name, a] as const))("%s cannot be mistaken for a suit", (_name, accent) => {
    for (const suit of SUITS) {
      expect(deltaE(accent.light, suit), `${accent.name} vs ${suit}`).toBeGreaterThanOrEqual(18);
    }
  });

  it.each(ACCENTS.map((a) => [a.name, a] as const))("%s sits in the usable lightness band", (_name, accent) => {
    const lightness = lab(accent.light)[0];
    expect(lightness).toBeGreaterThanOrEqual(30);
    expect(lightness).toBeLessThanOrEqual(62);
  });

  it("keeps every pair of swatches tellable apart", () => {
    for (let i = 0; i < ACCENTS.length; i++) {
      for (let j = i + 1; j < ACCENTS.length; j++) {
        const [a, b] = [ACCENTS[i]!, ACCENTS[j]!];
        expect(deltaE(a.light, b.light), `${a.name} vs ${b.name}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("pairs a lighter dark value with its darker light value, never the reverse", () => {
    for (const accent of ACCENTS) {
      expect(lab(accent.dark)[0], accent.name).toBeGreaterThan(lab(accent.light)[0]);
    }
  });
});

describe("findAccent", () => {
  it("resolves a known id", () => {
    expect(findAccent("teal")?.name).toBe("Teal");
  });

  it("returns undefined for null, undefined and unknown ids, so callers fall back to the app default", () => {
    expect(findAccent(null)).toBeUndefined();
    expect(findAccent(undefined)).toBeUndefined();
    expect(findAccent("chartreuse")).toBeUndefined();
  });
});
