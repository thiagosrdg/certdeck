import type { ReactNode } from "react";
import { Link } from "react-router";

export interface PageShellProps {
  title: string;
  backTo?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, backTo, actions, children }: PageShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {backTo && (
            <Link to={backTo} className="text-lg text-ink-muted hover:text-ink" aria-label="Back">
              ←
            </Link>
          )}
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
