import { mulberry32, shuffle, type Question } from "@certdeck/engine";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Applies the "shuffle answer options" setting. The shuffle is seeded from
 * the attempt id + question id so an option's position stays put while
 * navigating back and forth within one attempt, but varies attempt to
 * attempt.
 */
export function withDisplayOptions(question: Question, seed: string, shuffleEnabled: boolean): Question {
  if (!shuffleEnabled) return question;
  const rng = mulberry32(hashString(seed + question.id));
  return { ...question, options: shuffle(question.options, rng) };
}
