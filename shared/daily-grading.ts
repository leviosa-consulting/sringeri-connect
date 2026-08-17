/**
 * Text answers to the Activity of the Day are matched leniently: devotees type
 * on phone keyboards, so case, surrounding spaces, repeated spaces and simple
 * punctuation should not decide whether an answer is right.
 */
export function normalizeDailyAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:'"()\-_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Anagram answers are matched ignoring spacing entirely, not just collapsed:
 * a devotee who types "EKASHLOKI" and one who types "EKA SHLOKI" solved the
 * same anagram, so both must match the one stored answer.
 */
export function normalizeAnagramAnswer(value: string): string {
  return normalizeDailyAnswer(value).replace(/\s+/g, "");
}
