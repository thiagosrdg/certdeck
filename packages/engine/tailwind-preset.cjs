/**
 * Shared Tailwind preset. Every app extends this in its own tailwind
 * config rather than redefining tokens — colours resolve through the CSS
 * custom properties in ui/tokens.css, so light/dark and per-app accents
 * keep working without touching this file.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        table: "var(--cd-table)",
        card: "var(--cd-card)",
        ink: "var(--cd-ink)",
        "ink-muted": "var(--cd-ink-muted)",
        edge: "var(--cd-edge)",
        gilt: "var(--cd-gilt)",
        correct: "var(--cd-correct)",
        incorrect: "var(--cd-incorrect)",
        accent: "var(--cd-accent)",
      },
      fontFamily: {
        sans: ['"Libre Franklin"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      aspectRatio: {
        card: "5 / 7",
      },
      borderRadius: {
        card: "14px",
      },
      transitionTimingFunction: {
        settle: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      transitionDuration: {
        flip: "300ms",
      },
    },
  },
};
