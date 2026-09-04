import { useNavigate } from "react-router-dom";
import { Button } from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { useHistoryStore } from "../stores";

export default function History() {
  const navigate = useNavigate();
  const entries = useHistoryStore((s) => s.entries);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const clearAll = useHistoryStore((s) => s.clearAll);

  return (
    <PageShell
      title="History"
      backTo="/"
      actions={
        entries.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Clear all history? This cannot be undone.")) clearAll();
            }}
          >
            Clear all
          </Button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm text-ink-muted">No attempts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.attempt.id} className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-card px-4 py-3">
              <button type="button" className="flex-1 text-left" onClick={() => navigate(`/results/${entry.attempt.id}`)}>
                <div className="text-sm font-semibold capitalize">
                  {new Date(entry.attempt.startedAt).toLocaleDateString()} · {entry.attempt.mode.replace("-", " ")}
                </div>
                <div className="font-mono text-xs text-ink-muted">
                  {entry.result.correctCount}/{entry.result.totalCount} ({Math.round(entry.result.score * 100)}%) ·{" "}
                  {entry.result.passed ? "Passed" : "Not passed"}
                </div>
              </button>
              <button
                type="button"
                onClick={() => removeEntry(entry.attempt.id)}
                className="flex-shrink-0 text-xs text-ink-muted hover:text-incorrect"
                aria-label="Delete attempt"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
