import { db } from "./firebaseConfig.js";
import { requireUser } from "./authentication.js";
import {
  collection, addDoc, deleteDoc, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp,
} from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";
import { computeStreak } from "./streak.js";

// If dashboard.html is out of date, say so instead of failing silently
const REQUIRED_IDS = [
  "expenseForm", "expenseDesc", "expenseAmount", "expenseDate", "saveQuickCheck", "expenseAlert",
  "expenseList", "expenseTotal", "expenseListHeading", "quickItems", "quickStatus",
  "quickForm", "quickDesc", "quickAmount",
  "streakIcon", "streakCount", "streakUnit", "streakMessage", "streakBest",
];
const missingIds = REQUIRED_IDS.filter((id) => !document.getElementById(id));
if (missingIds.length > 0) {
  const box = document.getElementById("expenseAlert");
  if (box) {
    box.textContent = `dashboard.html is out of date (missing: ${missingIds.join(", ")}). Replace it with the latest version and refresh.`;
    box.classList.remove("d-none");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  throw new Error(`dashboard.html is missing elements: ${missingIds.join(", ")}`);
}

const form = document.getElementById("expenseForm");
const descInput = document.getElementById("expenseDesc");
const amountInput = document.getElementById("expenseAmount");
const dateInput = document.getElementById("expenseDate");
const saveQuickCheck = document.getElementById("saveQuickCheck");
const addButton = form.querySelector("button[type=submit]");
const alertBox = document.getElementById("expenseAlert");
const list = document.getElementById("expenseList");
const totalEl = document.getElementById("expenseTotal");
const listHeading = document.getElementById("expenseListHeading");
const quickList = document.getElementById("quickItems");
const quickStatus = document.getElementById("quickStatus");
const quickForm = document.getElementById("quickForm");
const quickDesc = document.getElementById("quickDesc");
const quickAmount = document.getElementById("quickAmount");
const quickButton = quickForm.querySelector("button[type=submit]");
const streakIcon = document.getElementById("streakIcon");
const streakCount = document.getElementById("streakCount");
const streakUnit = document.getElementById("streakUnit");
const streakMessage = document.getElementById("streakMessage");
const streakBest = document.getElementById("streakBest");

let currentUser = null;
let quickItems = []; // [{ id, description, amount }]
let streakStart = null; // YYYY-MM-DD: the first day the streak is counted from
let statusTimer = null;

dateInput.value = todayStr();

const plural = (n) => `${n} ${n === 1 ? "day" : "days"}`;
const money = (amount) => `$${formatCents(toCents(amount))}`;
const createdMs = (d) => d.data().createdAt?.toMillis?.() ?? 0; // missing on very old docs

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("d-none");
  alertBox.scrollIntoView({ behavior: "smooth", block: "center" }); // never leave an error off-screen
}

// Firebase says "permission-denied" when firestore.rules haven't been deployed
const why = (error) =>
  error?.code === "permission-denied" ? " (permission denied: deploy the latest firestore.rules)" : "";

function fail(message, error) {
  console.error(message, error);
  showAlert(message + why(error));
}
const hideAlert = () => alertBox.classList.add("d-none");

// A small toast fixed to the bottom of the screen, so feedback is visible wherever you tapped
function showStatus(message) {
  quickStatus.textContent = message;
  quickStatus.classList.remove("d-none");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => quickStatus.classList.add("d-none"), 4000);
}

const userRef = () => doc(db, "users", currentUser.uid);
const expensesRef = () => collection(db, "users", currentUser.uid, "transactions");
const quickRef = () => collection(db, "users", currentUser.uid, "quickItems");

const addExpense = (description, cents, date) =>
  addDoc(expensesRef(), {
    description,
    amount: cents / 100,
    date, // local YYYY-MM-DD, same format home.js queries
    createdAt: serverTimestamp(),
  });

/* ---------- Expense list ---------- */

function render(docs) {
  list.replaceChildren();
  let totalCents = 0;

  if (docs.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-group-item text-muted";
    empty.textContent = "No expenses logged for this day yet.";
    list.append(empty);
  }

  for (const d of docs) {
    const { description, amount } = d.data();
    totalCents += toCents(amount);

    const item = document.createElement("li");
    item.className = "list-group-item d-flex justify-content-between align-items-center gap-2";

    const label = document.createElement("span");
    label.className = "me-auto text-break";
    label.textContent = description; // textContent, never innerHTML: descriptions are user input

    const price = document.createElement("span");
    price.className = "fw-semibold";
    price.textContent = money(amount);

    const star = document.createElement("button");
    star.type = "button";
    star.className = "btn btn-sm btn-outline-warning";
    star.title = "Save as quick-add item";
    star.setAttribute("aria-label", `Save ${description} as a quick-add item`);
    star.innerHTML = '<i class="bi bi-star"></i>';
    star.addEventListener("click", () => saveQuickItem(description, toCents(amount)));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-sm btn-outline-danger";
    del.setAttribute("aria-label", `Delete ${description}`);
    del.innerHTML = '<i class="bi bi-trash"></i>';
    del.addEventListener("click", () => removeExpense(d.id));

    item.append(label, price, star, del);
    list.append(item);
  }

  totalEl.textContent = formatCents(totalCents);
}

async function loadExpenses() {
  listHeading.textContent =
    dateInput.value === todayStr() ? "Today's expenses" : `Expenses on ${dateInput.value}`;
  try {
    const snap = await getDocs(query(expensesRef(), where("date", "==", dateInput.value)));
    render(snap.docs.sort((a, b) => createdMs(a) - createdMs(b)));
  } catch (error) {
    fail("Couldn't load your expenses. Refresh to try again.", error);
  }
}

// Adding or deleting an expense can change the streak, so refresh both together
const refreshAll = () => Promise.all([loadExpenses(), refreshStreak()]);

async function removeExpense(id) {
  hideAlert();
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
    await refreshAll();
  } catch (error) {
    fail("Couldn't delete that expense. Try again.", error);
  }
}

/* ---------- Quick-add items ---------- */

function renderQuickItems() {
  quickList.replaceChildren();

  if (quickItems.length === 0) {
    const hint = document.createElement("span");
    hint.className = "text-muted";
    hint.textContent =
      "Nothing saved yet. Add an item with the form below, or tap the star on an expense.";
    quickList.append(hint);
    return;
  }

  for (const item of quickItems) {
    const group = document.createElement("div");
    group.className = "btn-group";
    group.setAttribute("role", "group");

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-outline-primary";
    add.textContent = `${item.description} \u00b7 ${money(item.amount)}`;
    add.addEventListener("click", () => quickAdd(item, add));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-outline-secondary";
    remove.setAttribute("aria-label", `Remove ${item.description} from quick add`);
    remove.innerHTML = '<i class="bi bi-x-lg"></i>';
    remove.addEventListener("click", () => removeQuickItem(item.id));

    group.append(add, remove);
    quickList.append(group);
  }
}

async function loadQuickItems() {
  try {
    const snap = await getDocs(quickRef());
    quickItems = snap.docs
      .sort((a, b) => createdMs(a) - createdMs(b))
      .map((d) => ({ id: d.id, ...d.data() }));
    renderQuickItems();
  } catch (error) {
    fail("Couldn't load your quick-add items. Refresh to try again.", error);
  }
}

// Returns "saved", "duplicate" or "failed". quiet: skip the toast (the caller shows its own).
async function saveQuickItem(description, cents, { quiet = false } = {}) {
  hideAlert();
  const duplicate = quickItems.some(
    (i) => i.description.toLowerCase() === description.toLowerCase() && toCents(i.amount) === cents
  );
  if (duplicate) {
    if (!quiet) showStatus(`"${description}" is already in your quick-add items.`);
    return "duplicate";
  }
  try {
    await addDoc(quickRef(), { description, amount: cents / 100, createdAt: serverTimestamp() });
    await loadQuickItems();
    if (!quiet) showStatus(`Saved "${description}" to quick add.`);
    return "saved";
  } catch (error) {
    fail("Couldn't save that quick-add item. Try again.", error);
    return "failed";
  }
}

async function removeQuickItem(id) {
  hideAlert();
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "quickItems", id));
    await loadQuickItems();
  } catch (error) {
    fail("Couldn't remove that item. Try again.", error);
  }
}

// One click: log this item as an expense on the date picked in the form
async function quickAdd(item, button) {
  hideAlert();
  if (!dateInput.value) {
    showAlert("Pick a date first.");
    return;
  }
  button.disabled = true; // stops an accidental double-tap from logging it twice
  try {
    await addExpense(item.description, toCents(item.amount), dateInput.value);
    showStatus(`Added ${item.description} (${money(item.amount)}) to ${dateInput.value}.`);
    await refreshAll();
  } catch (error) {
    fail("Couldn't add that expense. Check your connection and try again.", error);
  } finally {
    button.disabled = false;
  }
}

/* ---------- No-spend streak ---------- */

function renderStreak(current, best, spentToday) {
  streakCount.textContent = current;
  streakUnit.textContent = current === 1 ? "day" : "days";
  streakIcon.className = `bi bi-fire fs-1 ${current > 0 ? "text-warning" : "text-secondary"}`;
  streakBest.textContent = plural(best);
  streakMessage.textContent = spentToday
    ? "You spent today, so the streak is back to 0. Skip spending tomorrow to start a new one."
    : "Nothing spent so far today. Keep it up!";
}

async function refreshStreak() {
  try {
    // The streak counts from the first time this page was opened with the feature on.
    // Stored in the user's settings document so it follows them across devices.
    if (!streakStart) {
      const snap = await getDoc(userRef());
      streakStart = snap.exists() ? snap.data().streakStart : null;
      if (!streakStart) {
        streakStart = todayStr();
        await setDoc(userRef(), { streakStart }, { merge: true });
      }
    }

    const snap = await getDocs(query(expensesRef(), where("date", ">=", streakStart)));
    const spendDates = new Set();
    snap.forEach((d) => {
      const { date, amount } = d.data();
      if (toCents(amount) > 0) spendDates.add(date);
    });

    const today = todayStr();
    const { current, best } = computeStreak(streakStart, today, spendDates);
    renderStreak(current, best, spendDates.has(today));
  } catch (error) {
    console.error("Error calculating streak:", error);
    streakMessage.textContent = "Couldn't load your streak. Refresh to try again." + why(error);
  }
}

/* ---------- Wiring ---------- */

requireUser((user) => {
  currentUser = user;
  loadExpenses();
  loadQuickItems();
  refreshStreak();
});

dateInput.addEventListener("change", () => {
  if (currentUser && dateInput.value) loadExpenses();
});

// Save a quick-add item on its own: no expense is logged
quickForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  if (!quickForm.reportValidity()) return;
  if (!currentUser) return;

  const description = quickDesc.value.trim();
  const cents = toCents(quickAmount.value);
  if (!description) {
    showAlert("Enter a name for the item.");
    return;
  }
  if (cents <= 0) {
    showAlert("Enter a price greater than $0.00.");
    return;
  }

  quickButton.disabled = true;
  const result = await saveQuickItem(description, cents); // shows its own toast or error
  quickButton.disabled = false;
  if (result === "saved") {
    quickDesc.value = "";
    quickAmount.value = "";
    quickDesc.focus();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  if (!form.reportValidity()) return;
  if (!currentUser) return;

  const description = descInput.value.trim();
  const cents = toCents(amountInput.value);
  if (!description) {
    showAlert("Enter what you spent on.");
    return;
  }
  if (cents <= 0) {
    showAlert("Enter an amount greater than $0.00.");
    return;
  }

  addButton.disabled = true;
  let added = false;
  try {
    await addExpense(description, cents, dateInput.value);
    added = true;
  } catch (error) {
    fail("Couldn't add that expense. Check your connection and try again.", error);
  } finally {
    addButton.disabled = false;
  }
  if (!added) return;

  let message = `Added ${description} (${money(cents / 100)}).`;
  if (saveQuickCheck.checked) {
    const result = await saveQuickItem(description, cents, { quiet: true });
    if (result === "saved") message += " Saved to quick add.";
    if (result === "duplicate") message += " It's already in quick add.";
  }
  showStatus(message);
  descInput.value = "";
  amountInput.value = "";
  saveQuickCheck.checked = false;
  descInput.focus();
  await refreshAll();
});