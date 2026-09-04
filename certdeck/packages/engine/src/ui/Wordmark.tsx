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
 * JetBrains Mono in caps, letterspaced. Monospace already sets its own even
 * rhythm, so the tracking here is light — enough to read as a wordmark rather
 * than as code, without pulling the letters apart.
 *
 * Each app supplies only its name; the identity lives here, so a second
 * certification inherits it.
 */
export function Wordmark({ name, subtitle, meta, size = "lg", className = "" }: WordmarkProps) {
  const nameSize = size === "lg" ? "text-3xl sm:text-4xl" : "text-xl";

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <h1
        className={`font-extrabold uppercase leading-tight text-ink ${nameSize}`}
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
      >
        {name}
      </h1>
      {subtitle && <p className="mt-3 text-sm text-ink-muted">{subtitle}</p>}
      {meta && <p className="mt-1 font-mono text-[11px] text-ink-muted">{meta}</p>}
    </div>
  );
}
