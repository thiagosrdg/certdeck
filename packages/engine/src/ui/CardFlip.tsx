import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export type FlipAxis = "y" | "x";

export interface FlipTarget {
  /** identity of the face being requested — changing it triggers a flip */
  key: string;
  content: ReactNode;
  /** rotateY for question-to-question navigation, rotateX for the front/explanation reveal */
  axis: FlipAxis;
  /** sign of the rotation: 1 = forward/reveal, -1 = backward/unreveal */
  direction: 1 | -1;
  /** plain text announced to screen readers when this face becomes current */
  announce: string;
}

export interface CardFlipProps {
  target: FlipTarget;
  /** forces the reduced-motion path regardless of the OS/browser setting (the settings toggle) */
  disableAnimation?: boolean;
  className?: string;
}

interface FaceSnapshot {
  key: string;
  content: ReactNode;
}

interface Transition {
  outgoing: FaceSnapshot;
  axis: FlipAxis;
  direction: 1 | -1;
}

/**
 * The signature interaction (see docs/design.md#card-flip-animation).
 *
 * At rest (no transition in flight) this always renders `target.content`
 * directly rather than a copy captured in state — the card must reflect
 * whatever the caller passes on *every* render (an option gets selected, a
 * flag gets toggled), not just when `target.key` changes. A transition
 * only kicks in when the key itself changes, animating a real 3D rotation
 * from a one-time snapshot of the previous face to the live new one. A key
 * change arriving mid-flip cancels the in-flight transform and redirects
 * to the latest target instead of queuing.
 */
export function CardFlip({ target, disableAnimation = false, className = "" }: CardFlipProps) {
  const reducedMotion = usePrefersReducedMotion();
  const useInstantSwap = disableAnimation || reducedMotion;

  const [transition, setTransition] = useState<Transition | null>(null);
  const [angle, setAngle] = useState(0);
  const [instant, setInstant] = useState(false);

  const lastFaceRef = useRef<FaceSnapshot>({ key: target.key, content: target.content });
  const rafRef = useRef<number[]>([]);

  // Detects a key change and starts a transition, snapshotting whatever
  // was last rendered for the previous key. Declared before the "mirror
  // latest content" effect below so, within one commit, this always sees
  // last commit's value — see that effect's comment.
  useEffect(() => {
    if (useInstantSwap) {
      setTransition(null);
      return;
    }
    if (target.key === lastFaceRef.current.key) return;

    for (const id of rafRef.current) cancelAnimationFrame(id);
    rafRef.current = [];

    setTransition({ outgoing: lastFaceRef.current, axis: target.axis, direction: target.direction });
    setInstant(true);
    setAngle(0);

    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame(() => {
        setInstant(false);
        setAngle(180 * target.direction);
      });
      rafRef.current.push(second);
    });
    rafRef.current.push(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.key, target.axis, target.direction, useInstantSwap]);

  // Runs after every commit (no dependency array) and always after the
  // effect above in the same commit (React runs a component's effects in
  // declaration order), so it can't overwrite lastFaceRef before that
  // effect reads it on the very render that changed the key.
  useEffect(() => {
    lastFaceRef.current = { key: target.key, content: target.content };
  });

  useEffect(
    () => () => {
      for (const id of rafRef.current) cancelAnimationFrame(id);
    },
    []
  );

  function handleTransitionEnd() {
    setTransition(null);
    setInstant(true);
    setAngle(0);
    requestAnimationFrame(() => setInstant(false));
  }

  if (useInstantSwap || !transition) {
    return (
      <div className={className}>
        {target.content}
        <LiveAnnouncer text={target.announce} />
      </div>
    );
  }

  const rotate = transition.axis === "y" ? `rotateY(${angle}deg)` : `rotateX(${angle}deg)`;
  const counterRotate = transition.axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)";

  return (
    <div className={className} style={{ perspective: "1600px" }}>
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: rotate,
          transition: instant ? "none" : "transform var(--cd-flip-duration) var(--cd-flip-easing)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }} aria-hidden="true">
          {transition.outgoing.content}
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: counterRotate }}>{target.content}</div>
      </div>
      <LiveAnnouncer text={target.announce} />
    </div>
  );
}

function LiveAnnouncer({ text }: { text: string }) {
  return (
    <div aria-live="polite" className="sr-only">
      {text}
    </div>
  );
}
