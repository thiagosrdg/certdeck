import { useId, useState } from "react";
import type { ExamTrendPoint } from "../engine/statistics";

export interface ScoreTrendProps {
  points: readonly ExamTrendPoint[];
  /** 0..1; drawn as the line a score has to clear. */
  passThreshold: number;
  className?: string;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD_X = 10;
const PAD_Y = 12;

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Full-exam scores in the order they were taken.
 *
 * One series, so there is no legend — the heading names it. The pass
 * threshold is a gilt reference line rather than a second series, since it is
 * the same constant on every point. Marks carry a status colour *and* a fill
 * difference (passed points are solid, failed points hollow), so pass/fail is
 * never colour alone. The scale is pinned to 0–100% so two runs a few points
 * apart cannot look like a cliff.
 */
export function ScoreTrend({ points, passThreshold, className = "" }: ScoreTrendProps) {
  const clipId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length === 0) return null;

  const innerW = VIEW_W - PAD_X * 2;
  const innerH = VIEW_H - PAD_Y * 2;
  const x = (i: number) => (points.length === 1 ? VIEW_W / 2 : PAD_X + (i / (points.length - 1)) * innerW);
  const y = (score: number) => PAD_Y + (1 - score) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const thresholdY = y(passThreshold);
  const active = hovered === null ? null : points[hovered];

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height: VIEW_H }}
        role="img"
        aria-label={`Exam scores over time, ${points.length} attempt${points.length === 1 ? "" : "s"}, most recent ${Math.round(
          points[points.length - 1]!.score * 100
        )} percent`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={VIEW_W} height={thresholdY} />
          </clipPath>
        </defs>

        {/* Recessive baseline and ceiling. */}
        {[0, 1].map((v) => (
          <line key={v} x1={PAD_X} x2={VIEW_W - PAD_X} y1={y(v)} y2={y(v)} stroke="var(--cd-edge)" strokeWidth={1} />
        ))}

        <line
          x1={PAD_X}
          x2={VIEW_W - PAD_X}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--cd-gilt)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {points.length > 1 && (
          <>
            <path d={path} fill="none" stroke="var(--cd-ink-muted)" strokeWidth={2} strokeLinejoin="round" />
            {/* The same line again, clipped above the threshold, so the part
                of the run that is passing reads as passing. */}
            <path
              d={path}
              fill="none"
              stroke="var(--cd-correct)"
              strokeWidth={2}
              strokeLinejoin="round"
              clipPath={`url(#${clipId})`}
            />
          </>
        )}

        {points.map((p, i) => (
          <g key={p.attemptId}>
            <circle
              cx={x(i)}
              cy={y(p.score)}
              r={5}
              fill={p.passed ? "var(--cd-correct)" : "var(--cd-card)"}
              stroke={p.passed ? "var(--cd-correct)" : "var(--cd-incorrect)"}
              strokeWidth={2}
            />
            {/* Hit target larger than the mark. */}
            <circle
              cx={x(i)}
              cy={y(p.score)}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            />
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
        <span>{formatDate(points[0]!.finishedAt)}</span>
        <span className="text-gilt">pass {Math.round(passThreshold * 100)}%</span>
        <span>{points.length > 1 ? formatDate(points[points.length - 1]!.finishedAt) : ""}</span>
      </div>

      {active && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-edge bg-card px-2 py-1 font-mono text-[11px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]">
          {Math.round(active.score * 100)}% · {formatDate(active.finishedAt)} ·{" "}
          <span className={active.passed ? "text-correct" : "text-incorrect"}>
            {active.passed ? "passed" : "not passed"}
          </span>
        </div>
      )}

      {/* The table view the contrast relief obliges, and the way a screen
          reader gets the actual numbers. */}
      <details className="mt-2">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-ink-muted">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
              <th className="pb-1 font-normal">Date</th>
              <th className="pb-1 font-normal">Score</th>
              <th className="pb-1 font-normal">Result</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.attemptId} className="border-t border-edge">
                <td className="py-1">{formatDate(p.finishedAt)}</td>
                <td className="py-1 font-mono">{Math.round(p.score * 100)}%</td>
                <td className={`py-1 ${p.passed ? "text-correct" : "text-incorrect"}`}>
                  {p.passed ? "Passed" : "Not passed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
