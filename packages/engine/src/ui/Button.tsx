import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-card hover:brightness-110 focus-visible:ring-accent",
  secondary: "bg-card text-ink border border-edge hover:border-accent focus-visible:ring-accent",
  ghost: "bg-transparent text-ink-muted hover:text-ink focus-visible:ring-accent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
        "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-table",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
});
