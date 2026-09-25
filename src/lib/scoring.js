// Transparent 0-100 daily score. Weights/caps come from settings so they're
// tunable without touching this formula.
//
// Carry-over decision: carried-forward tasks count fully, exactly like any
// other task, in both `planned` and `completed`. taskSubscore is a ratio
// (completed/planned), not a raw count, so a carried task can only dilute
// the ratio if left undone again — it never "inflates" the score upward,
// and it's a real obligation for that day, so excluding it would be
// dishonest. Only tasks explicitly marked "Skipped" (a distinct action from
// carrying) are dropped from `planned` below.
export function computeDailyScore({ tasks, ideasCount, wordsCount, weights, caps }) {
  const planned = tasks.filter((t) => t.status !== "Skipped").length;
  const completed = tasks.filter((t) => t.status === "Done").length;
  const taskSubscore = planned === 0 ? (tasks.length === 0 ? 1 : 0) : completed / planned;

  const ideasSubscore = Math.min(1, ideasCount / Math.max(1, caps.ideasLogged));
  const wordsSubscore = Math.min(1, wordsCount / Math.max(1, caps.wordsLearned));

  const weightSum = weights.taskCompletion + weights.ideasLogged + weights.wordsLearned || 1;
  const raw =
    (taskSubscore * weights.taskCompletion +
      ideasSubscore * weights.ideasLogged +
      wordsSubscore * weights.wordsLearned) /
    weightSum;

  return {
    score: Math.round(raw * 100),
    tasksPlanned: planned,
    tasksCompleted: completed,
    ideasLogged: ideasCount,
    wordsLearned: wordsCount,
  };
}
