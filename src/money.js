// Money helpers. Amounts are stored in Firestore as dollars (e.g. 12.5),
// but all adding and comparing is done in whole cents to avoid float drift
// (0.1 + 0.2 !== 0.3 in JavaScript).

export const toCents = (dollars) => Math.round(Number(dollars) * 100) || 0;

export const formatCents = (cents) => (cents / 100).toFixed(2);

// Today's date as local YYYY-MM-DD.
// Not toISOString(): that is UTC and flips to "tomorrow" in the evening in Vancouver.
export function todayStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
