# CertDeck — design plan

This is the design system for every simulator in the monorepo. It lives once,
in `packages/engine`, and each app supplies only its accent colour and suit
marks. Read this before touching any UI code.

## Principle

The card-game identity is structural, not decorative. A question is not a
quiz row with a card-shaped `border-radius` bolted on — it is the single
object on screen, sized and framed like a physical card sitting on a table.
Everything else (the deck, the suits, the flip) follows from taking that
seriously.

Reference point: a well-produced modern collectible card game (Lorcana,
recent Magic frames) or a finely printed tarot deck — considered, tactile,
restrained ink-and-foil printing. Explicitly **not** a casino: no felt green,
no neon glow, no chip icons, no red/black playing-card kitsch, no dollar
signs.

## Palette

Two defaults are overused and both are explicitly avoided: warm cream +
terracotta, and near-black + a single acid-green accent. Instead, the palette
is built around the actual relationship that matters here — a printed card
face sitting on a dark table — plus one warm metallic that reads as foil
stamping, not gold-rush kitsch.

Core tokens, defined once in the engine (`packages/engine/src/ui/tokens.css`)
as CSS custom properties, themed for light and dark:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--cd-table` | `#E7E4F1` (pale cool lavender-grey) | `#12111A` (deep aubergine-black) | Page background — the table the deck sits on |
| `--cd-card` | `#FAF6EC` (warm ivory cardstock) | `#211E2C` (charcoal-plum cardstock) | Card face |
| `--cd-ink` | `#201B2E` (deep plum-black) | `#EDE9F5` (warm parchment-white) | Primary text, "ink" on the card |
| `--cd-ink-muted` | `#5B5570` | `#A79FC2` | Secondary text |
| `--cd-edge` | `#D8D2C2` | `#3A3550` | Card border / table seam |
| `--cd-gilt` | `#B08D2B` (antique gold) | `#D4B24C` | Foil accents: rank corner, dividers, flag mark — shared by every deck |
| `--cd-correct` | `#2F7A4F` | `#57C285` | Correct-state green |
| `--cd-incorrect` | `#9C3D46` | `#E37680` | Incorrect-state red |

The card face keeps roughly the same warm-ivory / charcoal-plum "paper"
identity in both themes so it always reads as cardstock against whichever
table colour surrounds it — that relationship is the one thing that must not
drift between light and dark.

Every other colour — the app's accent and its five suit hues — is supplied
by that app's `cert.config.ts` as CSS custom properties the engine consumes
(`--cd-accent`, `--cd-suit-1` … `--cd-suit-5`), so a second deck is
recognisably a different deck without touching engine code.

**The Network+ deck's** accent and suits, chosen from network/signal
iconography rather than hearts-and-spades:

| Domain | Suit | Icon | Hue |
|---|---|---|---|
| 1.0 Networking Concepts | Node | concentric-circle node | `#3B6EA5` steel blue |
| 2.0 Network Implementation | Link | chain link | `#2E8B57` signal green |
| 3.0 Network Operations | Wave | signal wave | `#6B4FA0` violet |
| 4.0 Network Security | Shield | shield | `#9C3D46` garnet |
| 5.0 Network Troubleshooting | Wrench | wrench | `#C0762B` burnt amber |

The five suit hues are a categorical palette, so they are held to one: no two
may be confusable, and none may desaturate into grey. Verify a change to them
rather than judging it by eye — the original `#3F7D53` measured a chroma of
0.093 (reading grey) and only ΔE 15.0 from the steel blue of domain 1.0 in
*normal* vision, which is why it moved. The set now clears the lightness
band, the chroma floor, colour-vision separation and 3:1 contrast against the
light surface.

Against the dark table two hues land near 2.6:1, which is why a suit hue is
never the only cue: every place a suit appears it carries its mark and its
domain name as well.

App accent (`--cd-accent`, used for primary buttons, active nav, the PWA
theme colour): `#7B2FA8` royal purple in light, `#BFA0F0` lilac in dark.

Unlike the core tokens, an accent needs both values supplied by the app: a
hue saturated enough to carry a filled button on ivory is too dark to read
on the charcoal-plum card, so each app declares a light and a dark accent in
its own stylesheet. Both must clear WCAG AA against the card face in their
own theme — this pair measures 6.91 and 7.38.

An accent also has to clear the app's own suit hues, not just the core
tokens: domain 3.0 is already violet, and most purples land on top of it.
Measure before choosing — amethyst `#6D3FA0` sits only ΔE 11.7 from that
suit and would have read as the same thing. This accent measures ΔE 25.6
from it, and 67.3 from `--cd-incorrect`.

### The accent palette

The accent is the one token a user picks, from the set in
`packages/engine/src/ui/accents.ts`: Lilac (the default), Indigo, Teal,
Moss, Rose, Plum, Slate. Settings offers them in a native `<select>` rather
than a row of swatches — it keeps the page short, and on a phone or tablet it
opens the system picker. A swatch beside it confirms the current colour; the
rest of the screen is the real preview, since the choice applies at once. Each is a light/dark pair, and the app's stylesheet
declares `--cd-accent-light` and `--cd-accent-dark` with `--cd-accent`
resolving to whichever the current theme calls for — so choosing a colour is
setting two custom properties, and the light/dark rule stays in CSS where
`prefers-color-scheme` needs no listener.

A new entry has to clear four bars, and `accents.test.ts` enforces every one
of them rather than trusting this paragraph:

- WCAG AA against its own theme's card face — the accent carries button text.
- ΔE >= 25 from `--cd-correct` and `--cd-incorrect`. An accent that reads as
  the verdict breaks the one signal this app cannot get wrong. Crimson, pine
  and copper were rejected here.
- ΔE >= 18 from all five suit hues, so a button is never taken for a domain.
  Ocean blue (ΔE 5.8 from the blue suit) and amber (ΔE 11.9 from the amber
  suit) were rejected here.
- ΔE >= 20 from every other accent — a picker of near-identical swatches is a
  worse picker. Fuchsia was rejected here, at ΔE 16.4 from lilac.

## Type

Three typefaces, self-hosted via `@fontsource` packages (bundled into the
build, served from the app's own origin — no Google Fonts CDN, works
offline from the first load):

- **JetBrains Mono** — display only: the deck wordmark and nothing else,
  set in caps with light tracking (the engine's `Wordmark`). Monospace
  already carries its own even rhythm, so the wordmark needs far less
  letterspacing than an inscriptional face would. It ships at two weights
  *because* its use is this narrow — the moment it appears in a paragraph it
  stops being a wordmark and starts being a cost.

  Note that this leaves two monospace families in the build: this one for
  the wordmark and IBM Plex Mono for metadata. Consolidating to one is
  available and would shrink the bundle; keeping them separate keeps the
  wordmark from drifting whenever the metadata face is retuned.
- **Libre Franklin** — UI chrome and body text: headings, question stems,
  options, buttons, results. A grotesque with enough weight range to carry
  both interface (600/700) and long-form reading (400/500) without switching
  families. Question stems stay here: a display face is unreadable at 90
  questions.
- **IBM Plex Mono** — question metadata (`1.0 · Objective 1.1 · medium`),
  command-line output inside question stems, and the countdown timer. Never
  body text. Justified by the subject matter (CLI networking tools) and it
  visually separates "data about the question" from "the question."

### Scrollbars

Styled once in `tokens.css` and inherited by every app. The thumb is
`--cd-scrollbar`, ink at a low alpha, with a transparent track — translucent
rather than solid, because two different surfaces scroll (the page over
`--cd-table`, a card body over `--cd-card`) and a translucent thumb settles
into both without knowing which it is on.

Measure before changing it. `--cd-edge` was the obvious first choice and
turned out to sit ΔE 16.6 from the light table where Chrome's own grey sits
at 11.1 — the "subtle" bar was louder than the default it replaced. The alpha
version lands near ΔE 7 on both surfaces.

## Card anatomy

```
┌───────────────────────────────┐
│ ◆ Networking Concepts    M ◆  │  ← suit tab (hue + icon)  ·  rank (difficulty), top corners
│  1.0 · Obj 1.1 · Q 07/90  🚩  │  ← mono metadata row, flag toggle right-aligned
│ ─────────────────────────────  │  ← gilt hairline
│                                 │
│   A technician runs the        │
│   following command:           │
│                                 │
│   ┌─────────────────────────┐  │  ← mono block for CLI output in stems
│   │ $ show ip route         │  │
│   └─────────────────────────┘  │
│                                 │
│   ○ A. Static route             │
│   ○ B. Default gateway          │  ← option list, radio or checkbox
│   ○ C. Loopback interface       │
│   ○ D. Broadcast address        │
│                                 │
│ ─────────────────────────────  │
│  ← Prev     ⟲ flip     Next →  │  ← footer nav, mono deck position
└───────────────────────────────┘
```

- Real card proportions: `aspect-ratio: 5 / 7` (the printed tarot/poker
  ratio), width clamped so the card is always the dominant object, never
  full-bleed.
- The suit tab and rank corner are the only elements allowed to sit outside
  the card's inner padding — they read as printed at the card's edge.
- The gilt hairline under the metadata row is the one recurring "foil"
  detail, reused on the results screen and history rows so the whole app
  feels like one print run.
- Front face: stem + options, no feedback. Back face (practice/random modes
  only, after submitting): verdict, the correct option restated, the full
  explanation, and every distractor's explanation — this is the actual
  product, laid out as the primary content of the back, not a footnote.

### Mobile (≈375px width)

```
┌─────────────────────────┐
│ ◆ Node        M ◆       │
│ 1.0 · Obj 1.1 · 07/90 🚩│
│──────────────────────────│
│                          │
│  A technician runs the  │
│  following command:     │
│  ┌────────────────────┐ │
│  │ $ show ip route     │ │
│  └────────────────────┘ │
│                          │
│  ○ A. Static route      │
│  ○ B. Default gateway   │
│  ○ C. Loopback iface    │
│  ○ D. Broadcast addr    │
│                          │
│──────────────────────────│
│ ← Prev   ⟲   Next →     │
└─────────────────────────┘
```

Card fills the viewport width minus a small margin (the "table" is barely
visible as a frame); everything is single-column, thumb-reachable nav in the
footer, number keys for options work identically.

### Desktop (≥1024px)

```
        (table background, --cd-table)

              ┌───────────────────────┐
              │ ◆ Node          M ◆   │
   [ history  │ 1.0 · Obj 1.1 · 07/90 │  [ navigator
     / exit ] │────────────────────── │    spread,
              │  A technician runs... │    collapsible ]
              │  ┌──────────────────┐ │
              │  │ $ show ip route  │ │
              │  └──────────────────┘ │
              │  ○ A  ○ B  ○ C  ○ D   │
              │──────────────────────  │
              │ ← Prev   ⟲   Next →   │
              └───────────────────────┘
```

Card stays at its intrinsic 5:7 proportions and centres in the viewport; the
navigator spread and timer/flag/exit controls live in side rails rather than
stretching the card itself. The card never grows wider than comfortable
reading measure (~640px) even on a large monitor.

## Suit system

- Suit mark + hue are data, not markup: `cert.config.ts` provides
  `{ id, name, hue, icon }` per domain, where `icon` is one of a small fixed
  set of inline-SVG icon names the engine ships (`node`, `link`, `wave`,
  `shield`, `wrench`, `signal`, `lock`, `layers`, …) so a future cert can
  reuse or extend the set without the engine knowing what a "domain" means
  semantically.
- The suit tab renders as a small pill at the card's top-left: icon + hue
  background at low opacity, hue-coloured icon stroke.
- The navigator spread shows suit + state (answered / flagged / current) on
  the face-down back of each mini card, so the shape of a user's weak areas
  is visible before they even open the results screen.

## Card flip animation

Implemented once, in the engine's `CardFlip` component:

- `transform-style: preserve-3d` on a wrapper, `rotateY` for forward/back
  navigation, `rotateX` reserved for the front↔explanation flip so the two
  motions are never confused. `backface-visibility: hidden` on both faces.
- 300ms, `cubic-bezier(0.2, 0.7, 0.2, 1)` (settles, no overshoot/bounce).
- A monotonically increasing "flip token" cancels any in-flight animation
  when a new navigation happens mid-flip — the component always jumps
  straight to the latest requested face, never queues.
- Only `transform` and `opacity` are animated, scoped to the flip wrapper.
- `@media (prefers-reduced-motion: reduce)` — and the equivalent settings
  toggle — switch the component to a 120ms opacity cross-fade with no
  rotation, same DOM structure.
- The question text is rendered in a visually-hidden `aria-live="polite"`
  region that updates on every navigation regardless of which face is
  visually shown, so screen readers announce content changes on the engine's
  timing, not the animation's.

## Routing — hash-based, by design

GitHub Pages serves one static tree with no server-side rewrite, so a
path-based SPA route 404s on refresh or direct link. Two standard fixes
exist: a `404.html` redirect trick, or a hash router. This project uses
**`HashRouter`** (`react-router-dom`) in every app:

- Every route is `/#/exam`, `/#/practice`, etc. — the fragment never reaches
  the server, so GitHub Pages only ever needs to serve `index.html` once, and
  every deep link, refresh, and PWA `start_url` resolves correctly with zero
  extra infrastructure.
- It composes cleanly with each app's own `base` (`/certdeck/network-plus/`
  in production): the base is the real path Pages serves, the hash is
  in-app routing on top of it.
- The `404.html` redirect trick was considered and rejected: it works, but it
  means shipping a second HTML entry point per app whose only job is a
  redirect script, and it has to be kept in sync with `base` by hand for
  every future certification. A hash router needs none of that.

Do not switch to `BrowserRouter`/path-based routing without updating this
section and re-solving deep-link 404s for both apps.

## Motion outside the flip

Beyond the flip and explicit state changes (answer selected, card flagged,
navigator cell filling in), there is no ambient motion: no
fade-and-slide-up on section mount, no hover animation across every
navigator cell, no confetti or emoji praise on a correct answer. Feedback is
calm — the flip is the one moment of drama, and it only earns that by being
the exception.
