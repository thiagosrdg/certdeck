import type { CSSProperties, ReactElement } from "react";

/**
 * A fixed set of inline-SVG icons the engine ships. `cert.config.ts` names
 * one per domain (see docs/design.md) — the engine has no idea what a
 * "domain" means, it just draws whichever glyph the app asked for. Falls
 * back to `node` for an unrecognised name rather than rendering nothing.
 */
const ICONS: Record<string, ReactElement> = {
  node: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    </>
  ),
  link: (
    <>
      <rect x="3" y="8" width="9" height="8" rx="4" />
      <rect x="12" y="8" width="9" height="8" rx="4" />
    </>
  ),
  wave: <path d="M2 13c2 0 2-6 4-6s2 6 4 6 2-6 4-6 2 6 4 6 2-6 4-6" />,
  shield: <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />,
  wrench: (
    <g transform="rotate(45 12 12)">
      <rect x="10.4" y="2" width="3.2" height="7.5" rx="1.6" />
      <circle cx="12" cy="2.6" r="2.4" />
      <rect x="10.4" y="14.5" width="3.2" height="7.5" rx="1.6" />
      <circle cx="12" cy="21.4" r="2.4" />
    </g>
  ),
  signal: (
    <>
      <rect x="3" y="14" width="3" height="7" />
      <rect x="9" y="10" width="3" height="11" />
      <rect x="15" y="6" width="3" height="15" />
      <rect x="21" y="2" width="3" height="19" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 17l9 5 9-5" />
    </>
  ),
};

export interface SuitIconProps {
  name: string;
  /**
   * An image to draw instead of the built-in glyph — each app supplies its
   * own suit art (see docs/design.md). The engine neither knows nor cares
   * what it depicts; without it the SVG glyph is used, so an app that ships
   * no art still renders.
   */
  src?: string;
  /** Accessible name. Omit for decoration, which is the usual case. */
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function SuitIcon({ name, src, alt, className, style }: SuitIconProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        aria-hidden={alt ? undefined : true}
        className={className}
        style={style}
        draggable={false}
      />
    );
  }

  const icon = ICONS[name] ?? ICONS.node;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

export const SUIT_ICON_NAMES = Object.keys(ICONS);
