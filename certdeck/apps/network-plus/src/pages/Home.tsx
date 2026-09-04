import { useNavigate } from "react-router";
import { Button } from "@certdeck/engine";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { useExamStore } from "../stores";

export default function Home() {
  const navigate = useNavigate();
  const resumable = useExamStore((s) => s.hasResumableAttempt());

  function resume() {
    useExamStore.getState().resume();
    const attempt = useExamStore.getState().attempt;
    if (!attempt) return;
    navigate(attempt.mode === "full-exam" ? "/exam" : attempt.mode === "practice" ? "/practice" : "/random");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-accent">{certConfig.appName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {certConfig.certName} · {certConfig.examCode}
        </p>
        <p className="mt-1 font-mono text-xs text-ink-muted">{questions.length} questions loaded</p>
      </div>

      {resumable && (
        <div className="rounded-lg border border-gilt bg-gilt/10 p-4 text-center text-sm">
          <p className="mb-2">You have an exam in progress.</p>
          <Button onClick={resume}>Resume</Button>
        </div>
      )}

      <nav className="flex flex-col gap-3">
        <Button onClick={() => navigate("/exam")}>Full exam</Button>
        <Button variant="secondary" onClick={() => navigate("/practice")}>
          Practice by domain
        </Button>
        <Button variant="secondary" onClick={() => navigate("/random")}>
          Random question
        </Button>
        <Button variant="ghost" onClick={() => navigate("/history")}>
          History
        </Button>
        <Button variant="ghost" onClick={() => navigate("/settings")}>
          Settings
        </Button>
      </nav>

      <p className="text-center text-xs text-ink-muted">Unofficial. Not affiliated with CompTIA.</p>
    </div>
  );
}
