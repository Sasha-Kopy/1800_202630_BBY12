// Home page. Daily items are the user's quick-add items (the same ones as on the Dashboard).
//   "Bought it"  -> a normal expense in users/{uid}/transactions (counts toward the limit, streak, charts)
//   "Skipped it" -> money saved, in users/{uid}/skips (moves the progress bar toward savingsGoal)
import { db } from "./firebaseConfig.js";
import { requireUser } from "./authentication.js";
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp } from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";

const bar = document.getElementById("progress-bar");
const wrapper = document.getElementById("progress-wrapper");
const progressText = document.getElementById("progress-text");
const caption = document.getElementById("progress-caption");
const itemsEl = document.getElementById("daily-items");
const alertBox = document.getElementById("homeAlert");

let user = null;
let goalCents = 0;
let savedCents = 0;

const createdMs = (d) => d.data().createdAt?.toMillis?.() ?? 0;
const userCol = (name) => collection(db, "users", user.uid, name);

function showError(message, error) {
  console.error(message, error);
  const hint = error?.code === "permission-denied" ? " (permission denied: deploy the latest firestore.rules)" : "";
  alertBox.textContent = message + hint;
  alertBox.classList.remove("d-none");
}

function updateProgressBar() {
  const percent = goalCents > 0 ? Math.min(Math.round((savedCents / goalCents) * 100), 100) : 0;
  bar.style.width = percent + "%";
  progressText.textContent = percent + "%";
  wrapper.setAttribute("aria-valuenow", percent);
  caption.textContent =
    goalCents > 0
      ? `Saved $${formatCents(savedCents)} of $${formatCents(goalCents)}`
      : "Set a savings goal in Settings to track your progress.";
}

function makeButton(label, classes) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn btn-primary ${classes}`;
  b.textContent = label;
  return b;
}

async function logAction(item, kind, buttons, note) {
  alertBox.classList.add("d-none");
  buttons.forEach((b) => (b.disabled = true)); // no accidental double-tap
  const cents = toCents(item.amount);
  const amount = `$${formatCents(cents)}`;
  try {
    await addDoc(userCol(kind === "bought" ? "transactions" : "skips"), {
      description: item.description,
      amount: cents / 100,
      date: todayStr(),
      createdAt: serverTimestamp(),
    });
    if (kind === "skipped") {
      savedCents += cents;
      updateProgressBar();
    }
    note.textContent = kind === "bought" ? `Logged ${amount} as spent today.` : `Nice! You saved ${amount}.`;
    note.className = "small mb-0 mt-2 text-success";
  } catch (error) {
    showError("Couldn't save that. Check your connection and try again.", error);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

function renderItems(items) {
  itemsEl.replaceChildren();

  if (items.length === 0) {
    const p = document.createElement("p");
    p.className = "text-muted";
    p.append("No daily items yet. Add some as quick-add items on the ");
    const link = document.createElement("a");
    link.href = "dashboard.html";
    link.textContent = "Dashboard";
    p.append(link, ".");
    itemsEl.append(p);
    return;
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "col d-flex align-items-start daily-item";

    const icon = document.createElement("div");
    icon.className = "icon-square d-inline-flex align-items-center justify-content-center fs-4 flex-shrink-0 me-3";
    icon.innerHTML = '<i class="bi bi-bag"></i>';

    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "fs-2 text-body-emphasis text-break";
    title.textContent = item.description; // textContent: descriptions are user input
    const price = document.createElement("p");
    price.className = "text-muted mb-2";
    price.textContent = `$${formatCents(toCents(item.amount))}`;
    const note = document.createElement("p");
    note.className = "small mb-0 mt-2";
    note.setAttribute("role", "status");

    const bought = makeButton("Bought it.", "me-2");
    const skipped = makeButton("Skipped it.", "");
    const both = [bought, skipped];
    bought.addEventListener("click", () => logAction(item, "bought", both, note));
    skipped.addEventListener("click", () => logAction(item, "skipped", both, note));

    body.append(title, price, bought, skipped, note);
    card.append(icon, body);
    itemsEl.append(card);
  }
}

async function load() {
  try {
    const [settings, skips, items] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDocs(userCol("skips")),
      getDocs(userCol("quickItems")),
    ]);
    goalCents = toCents(settings.exists() ? settings.data().savingsGoal : 0);
    savedCents = skips.docs.reduce((sum, d) => sum + toCents(d.data().amount), 0);
    updateProgressBar();
    renderItems(items.docs.sort((a, b) => createdMs(a) - createdMs(b)).map((d) => ({ id: d.id, ...d.data() })));
  } catch (error) {
    showError("Couldn't load your items. Refresh to try again.", error);
  }
}

requireUser((u) => {
  user = u;
  load();
});
