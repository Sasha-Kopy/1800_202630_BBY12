// Shared storage for the spending tracker (used by the Home page and the Savings page)
const STORAGE_KEY = "spendingTracker";
const WEEK_LENGTH = 7; // days before the data restarts

// "2026-11-10" in the user's local time
function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && raw.weekStart && Array.isArray(raw.entries)) return raw;
  } catch (e) {}
  return { weekStart: dateKey(), entries: [] };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

// Returns the current week's data. If 7 days have passed, it starts a fresh week.
function getData() {
  let data = loadData();
  const daysPassed = Math.round((parseKey(dateKey()) - parseKey(data.weekStart)) / 86400000);
  if (daysPassed >= WEEK_LENGTH) {
    data = { weekStart: dateKey(), entries: [] };
    saveData(data);
  }
  return data;
}

// action is "bought" or "skipped"
function logAction(item, action, amount) {
  const data = getData();
  data.entries.push({
    date: dateKey(),
    time: new Date().toISOString(),
    item: item,
    action: action,
    amount: amount,
  });
  saveData(data);
}

// Total spent so far this week
function totalBought() {
  return getData()
    .entries.filter((e) => e.action === "bought")
    .reduce((sum, e) => sum + e.amount, 0);
}

// One row per day of the week: { key, label, total }
function getWeekSummary() {
  const data = getData();
  const start = parseKey(data.weekStart);
  const days = [];
  for (let i = 0; i < WEEK_LENGTH; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const total = data.entries
      .filter((e) => e.date === key && e.action === "bought")
      .reduce((sum, e) => sum + e.amount, 0);
    days.push({
      key: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      total: total,
    });
  }
  return days;
}

// The date the data will restart
function weekResetsOn() {
  const d = parseKey(getData().weekStart);
  d.setDate(d.getDate() + WEEK_LENGTH);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}