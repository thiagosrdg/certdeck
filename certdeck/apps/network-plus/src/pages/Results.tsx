import { useNavigate, useParams } from "react-router";
import { Button, ResultsSummary } from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { suitFor } from "../lib/suit";
import { useHistoryStore } from "../stores";

export default function Results() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const entries = useHistoryStore((s) => s.entries);
  const entry = entries.find((e) => e.attempt.id === attemptId);

  if (!entry) {
    return (
      <PageShell title="Results" backTo="/">
        <p className="text-sm text-ink-muted">Attempt not found.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Results" backTo="/">
      <ResultsSummary result={entry.result} suitFor={suitFor} />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={() => navigate(`/review/${entry.attempt.id}`)}>
          Review answers
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate("/")}>
          Back to home
        </Button>
      </div>
    </PageShell>
  );
}
