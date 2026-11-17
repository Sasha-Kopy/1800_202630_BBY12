// No-spend streak logic. Pure functions: no Firebase, no DOM.
import { todayStr as dateStr } from "./money.js";

// Walks every day from startStr to endStr (inclusive, local YYYY-MM-DD) and returns
//   current: no-spend days in a row ending on endStr (0 if endStr has spending)
//   best:    the longest run of no-spend days in that range
// spendDates is a Set of YYYY-MM-DD strings that have at least one expense.
export function computeStreak(startStr, endStr, spendDates) {
  const [y, m, d] = startStr.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  let run = 0;
  let best = 0;

  for (let i = 0; i < 3660; i++) { // safety cap: ten years
    const s = dateStr(day);
    if (s > endStr) break; // YYYY-MM-DD strings sort like dates
    if (spendDates.has(s)) {
      run = 0;
    } else {
      run += 1;
      if (run > best) best = run;
    }
    day.setDate(day.getDate() + 1);
  }
  return { current: run, best };
}