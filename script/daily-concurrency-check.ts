/**
 * Run with: npx tsx script/daily-concurrency-check.ts
 *
 * Concurrency check: an admin edit or delete racing a devotee's first
 * submission must never grade an answer against content other than the
 * revision that ends up saved, and must never 500.
 */
import { storage } from "../server/storage";
import { ensureDailyPracticeSchema } from "../server/daily-schema";

const DATE = "2099-01-04";

async function reset(user: string) {
  await storage.deleteDailyQuestionIfUnanswered(DATE);
  await storage.deleteDailyActivityIfUnanswered(DATE);
  return user;
}

async function main() {
  await ensureDailyPracticeSchema();

  // --- Question: admin edit racing a submission ---
  for (let run = 0; run < 5; run++) {
    const user = `race-q-${run}`;
    await storage.saveDailyQuestionIfUnanswered({
      contentDate: DATE, questionText: "old", options: ["a", "b"], correctIndex: 0, points: 1,
    });

    const [submitted, saved] = await Promise.all([
      storage.gradeDailyQuestion(user, DATE, 0),
      storage.saveDailyQuestionIfUnanswered({
        contentDate: DATE, questionText: "new", options: ["x", "y"], correctIndex: 1, points: 50,
      }),
    ]);

    const stored = await storage.getDailyQuestion(DATE);
    if (submitted.status !== "graded") throw new Error(`run ${run}: unexpected ${submitted.status}`);

    // Whatever the interleaving, the response must belong to the question row
    // that is saved, and its points must match that revision's rules.
    const gradedAgainst = submitted.content;
    const expectedPoints = gradedAgainst.correctIndex === submitted.response.selectedIndex ? gradedAgainst.points : 0;
    const consistent =
      submitted.response.questionId === stored!.id &&
      submitted.response.pointsAwarded === expectedPoints &&
      // if the edit won, it must have been refused as frozen, and the stored
      // text must still be the revision the answer was graded against
      (saved === "frozen" ? stored!.questionText === gradedAgainst.questionText : true);

    console.log(`q run ${run}: save=${saved} graded="${gradedAgainst.questionText}" stored="${stored!.questionText}" pts=${submitted.response.pointsAwarded} consistent=${consistent}`);
    if (!consistent) throw new Error(`run ${run}: stale grading detected`);

    await storage.deleteDailyQuestionIfUnanswered(DATE);
    // the question is frozen by the response, so clear it directly
    await storage.deleteDailyQuestion(DATE);
  }

  // --- Activity: admin delete racing a submission (must not 500 on the FK) ---
  for (let run = 0; run < 5; run++) {
    const user = await reset(`race-a-${run}`);
    await storage.saveDailyActivityIfUnanswered({
      contentDate: DATE, activityType: "anagram", answerMode: "text", prompt: "P", correctAnswer: "sharada", points: 3,
    });

    const [submitted, deleted] = await Promise.all([
      storage.gradeDailyActivity(user, DATE, { answer: "  Sharada " }),
      storage.deleteDailyActivityIfUnanswered(DATE),
    ]);

    const stored = await storage.getDailyActivity(DATE);
    const ok =
      (submitted.status === "graded" && stored !== undefined && submitted.response.activityId === stored.id) ||
      (submitted.status === "missing" && stored === undefined);
    console.log(`a run ${run}: delete=${deleted} submit=${submitted.status} stored=${!!stored} ok=${ok}`);
    if (!ok) throw new Error(`run ${run}: inconsistent delete race outcome`);

    await storage.deleteDailyActivity(DATE);
  }

  console.log("ALL CONCURRENCY CHECKS PASSED");
  process.exit(0);
}

main().catch((e) => { console.error("FAILED", e); process.exit(1); });
