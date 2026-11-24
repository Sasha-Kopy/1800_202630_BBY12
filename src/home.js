// Budget page. Reads Settings (users/{uid}): monthlyBudget, monthlySavingsTarget, overspendAlert,
// streakStart (old dailyExpenseLimit / savingsGoal as fallbacks), plus transactions and skips.
import { db } from "./firebaseConfig.js";
import { onUser } from "./authentication.js";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";
import { computeStreak } from "./streak.js";

const $ = (id) => document.getElementById(id);
const card = $("budgetCard");
const tiles = $("statTiles");

function setStatus(iconClasses, message) {
  $("budgetStatusIcon").className = `bi ${iconClasses} fs-1`;
  $("budgetStatusText").textContent = message;
}

function setMonth(spentCents, budgetCents, warnAt80) {
  const percent = budgetCents > 0 ? Math.min(Math.round((spentCents / budgetCents) * 100), 100) : 0;
  const color =
    spentCents > budgetCents ? "bg-danger" : warnAt80 && spentCents * 10 >= budgetCents * 8 ? "bg-warning" : "bg-success";
  $("monthBar").className = `progress-bar ${color}`;
  $("monthBar").style.width = `${percent}%`;
  $("monthWrap").setAttribute("aria-valuenow", percent);
  $("monthSpentVal").textContent = formatCents(spentCents);
  $("monthBudgetVal").textContent = formatCents(budgetCents);
  $("monthHint").classList.toggle("d-none", budgetCents > 0);
}

function setStreakTile(streakStart, spendDates, today) {
  const current = streakStart ? computeStreak(streakStart, today, spendDates).current : 0;
  $("tileStreak").textContent = current;
  $("tileStreakUnit").textContent = current === 1 ? "day" : "days";
  $("tileStreakIcon").className = `bi bi-fire fs-2 ${current > 0 ? "text-warning" : "text-secondary"}`;
  $("tileStreakHint").textContent = !streakStart
    ? "Open the Dashboard to start your streak."
    : spendDates.has(today)
      ? "You spent today. Streak resets."
      : "Nothing spent today. Keep it up!";
}

function setSavedTile(savedCents, goalCents) {
  const percent = goalCents > 0 ? Math.min(Math.round((savedCents / goalCents) * 100), 100) : 0;
  $("tileSaved").textContent = formatCents(savedCents);
  $("tileSavedBar").style.width = `${percent}%`;
  $("tileSavedWrap").setAttribute("aria-valuenow", percent);
  $("tileSavedHint").textContent =
    goalCents > 0 ? `of $${formatCents(goalCents)} target` : "Set a savings target in Settings";
}

function renderRecent(docs) {
  const list = $("recentList");
  list.replaceChildren();
  if (docs.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-group-item text-muted";
    empty.append("No expenses yet. Add one on the ");
    const link = document.createElement("a");
    link.href = "dashboard.html";
    link.textContent = "Dashboard";
    empty.append(link, ".");
    list.append(empty);
    return;
  }
  for (const d of docs) {
    const { description, amount, date } = d.data();
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center gap-2";
    const label = document.createElement("span");
    label.className = "me-auto text-break";
    label.textContent = description; // textContent: descriptions are user input
    const when = document.createElement("small");
    when.className = "text-muted";
    when.textContent = date;
    const price = document.createElement("span");
    price.className = "fw-semibold";
    price.textContent = `$${formatCents(toCents(amount))}`;
    li.append(label, when, price);
    list.append(li);
  }
}

onUser(async (user) => {
  // Both sections start hidden (d-none) in index.html and only show for logged-in users
  card.classList.toggle("d-none", !user);
  tiles.classList.toggle("d-none", !user);
  if (!user) return;

  try {
    const today = todayStr();
    const month = today.slice(0, 7); // YYYY-MM
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const s = userSnap.exists() ? userSnap.data() : {};
    const warnAt80 = s.overspendAlert !== false;
    const streakStart = s.streakStart || null;

    // One range query covers both this month's totals and the streak window
    const rangeStart = streakStart && streakStart < `${month}-01` ? streakStart : `${month}-01`;
    const col = (name) => collection(db, "users", user.uid, name);
    const [snap, skipSnap, recentSnap] = await Promise.all([
      getDocs(query(col("transactions"), where("date", ">=", rangeStart))),
      getDocs(query(col("skips"), where("date", ">=", `${month}-01`))),
      getDocs(query(col("transactions"), orderBy("createdAt", "desc"), limit(3))),
    ]);

    // Daily limit = monthly budget spread over this month's days (old dailyExpenseLimit if no monthly budget)
    const monthlyCents = toCents(s.monthlyBudget);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const limitCents = monthlyCents > 0 ? Math.round(monthlyCents / daysInMonth) : toCents(s.dailyExpenseLimit);

    let spentCents = 0;
    let monthCents = 0;
    const spendDates = new Set();
    snap.forEach((d) => {
      const { date, amount } = d.data();
      const cents = toCents(amount);
      if (!date) return;
      if (streakStart && date >= streakStart && cents > 0) spendDates.add(date);
      if (!date.startsWith(month)) return; // ignore dates in later months
      monthCents += cents;
      if (date === today) spentCents += cents;
    });
    const savedCents = skipSnap.docs.reduce(
      (sum, d) => (d.data().date?.startsWith(month) ? sum + toCents(d.data().amount) : sum),
      0
    );

    $("dailyLimitVal").textContent = formatCents(limitCents);
    $("spentTodayVal").textContent = formatCents(spentCents);
    setMonth(monthCents, monthlyCents, warnAt80);
    setStreakTile(streakStart, spendDates, today);
    setSavedTile(savedCents, toCents(s.monthlySavingsTarget ?? s.savingsGoal));
    renderRecent(recentSnap.docs);

    if (limitCents === 0) {
      setStatus("bi-info-circle-fill text-info", "Set a monthly budget in Settings");
    } else if (spentCents > limitCents) {
      setStatus("bi-exclamation-triangle-fill text-danger", "Over daily limit");
    } else if (warnAt80 && spentCents * 10 >= limitCents * 8) {
      setStatus("bi-exclamation-circle-fill text-warning", "Approaching daily limit");
    } else {
      setStatus("bi-check-circle-fill text-success", "Within budget");
    }
  } catch (error) {
    console.error("Error loading budget page:", error);
    setStatus("bi-x-circle-fill text-danger", "Couldn't load your budget. Refresh to try again.");
  }
});