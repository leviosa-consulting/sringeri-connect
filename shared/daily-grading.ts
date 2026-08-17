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
