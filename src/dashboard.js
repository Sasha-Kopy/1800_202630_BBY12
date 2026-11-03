import { db } from "./firebaseConfig.js";
import { requireUser } from "./authentication.js";
import {
  collection, addDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp,
} from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";

const form = document.getElementById("expenseForm");
const descInput = document.getElementById("expenseDesc");
const amountInput = document.getElementById("expenseAmount");
const dateInput = document.getElementById("expenseDate");
const addButton = form.querySelector("button[type=submit]");
const alertBox = document.getElementById("expenseAlert");
const list = document.getElementById("expenseList");
const totalEl = document.getElementById("expenseTotal");
const listHeading = document.getElementById("expenseListHeading");

let currentUser = null;

dateInput.value = todayStr();

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("d-none");
}
const hideAlert = () => alertBox.classList.add("d-none");

const expensesRef = () => collection(db, "users", currentUser.uid, "transactions");

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

    const money = document.createElement("span");
    money.className = "fw-semibold";
    money.textContent = `$${formatCents(toCents(amount))}`;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-sm btn-outline-danger";
    del.setAttribute("aria-label", `Delete ${description}`);
    del.innerHTML = '<i class="bi bi-trash"></i>';
    del.addEventListener("click", () => removeExpense(d.id));

    item.append(label, money, del);
    list.append(item);
  }

  totalEl.textContent = formatCents(totalCents);
}

async function loadExpenses() {
  listHeading.textContent =
    dateInput.value === todayStr() ? "Today's expenses" : `Expenses on ${dateInput.value}`;
  try {
    const snap = await getDocs(query(expensesRef(), where("date", "==", dateInput.value)));
    // Oldest first; createdAt can be missing on very old docs, so default to 0
    const docs = snap.docs.sort(
      (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0)
    );
    render(docs);
  } catch (error) {
    console.error("Error loading expenses:", error);
    showAlert("Couldn't load your expenses. Refresh to try again.");
  }
}

async function removeExpense(id) {
  hideAlert();
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
    await loadExpenses();
  } catch (error) {
    console.error("Error deleting expense:", error);
    showAlert("Couldn't delete that expense. Try again.");
  }
}

requireUser((user) => {
  currentUser = user;
  loadExpenses();
});

dateInput.addEventListener("change", () => {
  if (currentUser && dateInput.value) loadExpenses();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  if (!form.reportValidity()) return;
  if (!currentUser) return;

  const cents = toCents(amountInput.value);
  if (cents <= 0) {
    showAlert("Enter an amount greater than $0.00.");
    return;
  }

  addButton.disabled = true;
  try {
    await addDoc(expensesRef(), {
      description: descInput.value.trim(),
      amount: cents / 100,
      date: dateInput.value, // local YYYY-MM-DD, same format home.js queries
      createdAt: serverTimestamp(),
    });
    descInput.value = "";
    amountInput.value = "";
    descInput.focus();
    await loadExpenses();
  } catch (error) {
    console.error("Error adding expense:", error);
    showAlert("Couldn't add that expense. Check your connection and try again.");
  } finally {
    addButton.disabled = false;
  }
});
