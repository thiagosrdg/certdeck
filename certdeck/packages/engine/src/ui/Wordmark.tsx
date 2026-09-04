export interface WordmarkProps {
  /** The app's name — the deck's title. */
  name: string;
  /** Small line beneath, usually the certification and its exam code. */
  subtitle?: React.ReactNode;
  /** Third line, smaller still. */
  meta?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

/**
 * The title treatment every deck shares.
 *
 * Cinzel's inscriptional capitals, widely letterspaced, between two gilt
 * hairlines that fade at their ends — the same foil detail the card's
 * metadata row uses, so the title reads as the deck's own front rather than
 * as an app header. Each app supplies only its name; the identity lives
 * here, so a second certification inherits it.
 */
export function Wordmark({ name, subtitle, meta, size = "lg", className = "" }: WordmarkProps) {
  const nameSize = size === "lg" ? "text-3xl sm:text-4xl" : "text-xl";

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <Hairline />
      <h1
        className={`px-2 py-2 font-bold uppercase leading-tight text-ink ${nameSize}`}
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}
      >
        {name}
      </h1>
      <Hairline flip />
      {subtitle && <p className="mt-3 text-sm text-ink-muted">{subtitle}</p>}
      {meta && <p className="mt-1 font-mono text-[11px] text-ink-muted">{meta}</p>}
    </div>
  );
}

/** A gilt rule that fades out at both ends, with a lozenge at its centre. */
function Hairline({ flip = false }: { flip?: boolean }) {
  return (
    <div className="flex w-full max-w-xs items-center gap-2" aria-hidden="true">
      <span
        className="h-px flex-1"
        style={{ background: "linear-gradient(to right, transparent, var(--cd-gilt))" }}
      />
      <span
        className="block h-1.5 w-1.5 rotate-45 border border-gilt"
        style={{ backgroundColor: flip ? "var(--cd-gilt)" : "transparent" }}
      />
      <span
        className="h-px flex-1"
        style={{ background: "linear-gradient(to left, transparent, var(--cd-gilt))" }}
      />
    </div>
  );
}
