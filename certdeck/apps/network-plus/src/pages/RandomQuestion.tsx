import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  CardFlip,
  CardFrame,
  ExplanationPanel,
  OptionList,
  generateExam,
  isAnswerCorrect,
  useKeyboardNav,
  type FlipTarget,
} from "@certdeck/engine";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { withDisplayOptions } from "../lib/display-question";
import { domainName, suitFor } from "../lib/suit";
import { useSettingsStore } from "../stores";

function drawOne(excludeId?: string): string | null {
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = generateExam(certConfig, questions, { count: 1 });
    const id = result.questionIds[0];
    if (id && id !== excludeId) return id;
  }
  return questions[Math.floor(Math.random() * questions.length)]?.id ?? null;
}

export default function RandomQuestion() {
  const settings = useSettingsStore((s) => s.settings);
  const [questionId, setQuestionId] = useState<string | null>(() => drawOne());
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [seed] = useState(() => Math.random().toString(36));

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), []);
  const question = questionId ? questionMap.get(questionId) : undefined;
  const displayQuestion = question ? withDisplayOptions(question, seed, settings.shuffleOptions) : undefined;

  function next() {
    setQuestionId(drawOne(questionId ?? undefined));
    setSelected([]);
    setRevealed(false);
  }

  function check() {
    if (selected.length === 0) return;
    setRevealed(true);
  }

  useKeyboardNav({
    enabled: !!displayQuestion,
    onSelectOption: (i) => {
      if (revealed || !displayQuestion) return;
      const option = displayQuestion.options[i];
      if (!option) return;
      setSelected((prev) =>
        displayQuestion.type === "single" ? [option.id] : prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id]
      );
    },
    onSubmit: revealed ? next : check,
  });

  const header = (
    <header className="flex items-center gap-2">
      <Link to="/" className="text-lg text-ink-muted hover:text-ink" aria-label="Back">
        ←
      </Link>
      <h1 className="text-lg font-bold">Random question</h1>
    </header>
  );

  if (!displayQuestion) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
        {header}
        <p className="text-sm text-ink-muted">No questions available.</p>
      </div>
    );
  }

  const suit = suitFor(displayQuestion.domain);

  const flipTarget: FlipTarget = {
    key: `${displayQuestion.id}-${revealed}`,
    axis: revealed ? "x" : "y",
    direction: 1,
    announce: revealed ? "Feedback revealed." : displayQuestion.stem,
    content: (
      <CardFrame
        suitName={suit.name}
        suitHue={suit.hue}
        domainLabel={domainName(displayQuestion.domain)}
        metaLeft={`${displayQuestion.domain} · Obj ${displayQuestion.objective}`}
        difficulty={displayQuestion.difficulty}
        footer={
          revealed ? (
            <Button className="ml-auto" onClick={next}>
              Next question →
            </Button>
          ) : (
            <Button className="ml-auto" onClick={check} disabled={selected.length === 0}>
              Check answer
            </Button>
          )
        }
      >
        {revealed ? (
          <div className="flex flex-col gap-4">
            <OptionList
              type={displayQuestion.type}
              options={displayQuestion.options}
              selected={selected}
              onChange={() => undefined}
              disabled
              reveal={{ correctIds: displayQuestion.correct }}
            />
            <ExplanationPanel question={displayQuestion} correct={isAnswerCorrect(displayQuestion, selected)} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayQuestion.stem}</p>
            <OptionList type={displayQuestion.type} options={displayQuestion.options} selected={selected} onChange={setSelected} />
          </div>
        )}
      </CardFrame>
    ),
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      {header}
      <div className="mx-auto aspect-card w-full max-w-sm flex-1">
        <CardFlip target={flipTarget} disableAnimation={!settings.cardFlipEnabled} className="h-full w-full" />
      </div>
    </div>
  );
}
