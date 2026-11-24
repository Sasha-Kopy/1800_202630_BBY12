// Profile & Settings. Everything is stored in users/{uid}: displayName, city, currency, photoData,
// monthlyBudget, monthlySavingsTarget, overspendAlert, sharedBudget. The Budget page (home.js) and
// the Home progress bar (Savingsprogress.js) read the budget and savings target from here.
import { db } from "./firebaseConfig.js";
import { requireUser, logOut } from "./authentication.js";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toCents } from "./money.js";

const $ = (id) => document.getElementById(id);
const SYMBOLS = { CAD: "$", USD: "$", EUR: "\u20ac", GBP: "\u00a3" };
const DEFAULT_AVATAR = $("profileImage").src; // the inline placeholder from the HTML

let user = null;
let data = {}; // last saved copy of users/{uid}
let editing = false;
let toastTimer;

function notify(message, type = "success") {
  const t = $("settingsToast");
  t.textContent = message;
  t.className = `alert alert-${type} position-fixed bottom-0 start-50 translate-middle-x mb-3 shadow`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("d-none"), 4000);
}

function fail(message, error) {
  console.error(message, error);
  const hint = error?.code === "permission-denied" ? " (permission denied: deploy the latest firestore.rules)" : "";
  notify(message + hint, "danger");
}

const symbol = () => SYMBOLS[data.currency] || "$";
const perMonth = (n) =>
  n === undefined ? "Not set" : `${symbol()}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo`;

function fillHeader() {
  const name = data.displayName ?? user.displayName ?? "";
  $("displayNameHeader").textContent = name || "Your name";
  $("displayEmailHeader").textContent = user.email;
  $("profileImage").src = data.photoData || DEFAULT_AVATAR;
  $("summaryBudgetLimit").textContent = perMonth(data.monthlyBudget);
  $("summarySavingsGoal").textContent = perMonth(data.monthlySavingsTarget);
  document.querySelectorAll(".currency-symbol").forEach((el) => (el.textContent = symbol()));
}

function fillProfile() {
  $("nameInput").value = data.displayName ?? user.displayName ?? "";
  $("emailInput").value = user.email;
  $("cityInput").value = data.city ?? "";
  $("currencySelect").value = data.currency ?? "CAD";
}

function fillPrefs() {
  $("monthlyBudgetInput").value = data.monthlyBudget ?? "";
  $("savingsTargetInput").value = data.monthlySavingsTarget ?? "";
  $("overspendAlertSwitch").checked = data.overspendAlert !== false; // on unless turned off
  $("sharedBudgetSwitch").checked = data.sharedBudget === true;
}

// merge: true keeps every other field on the document
async function persist(fields) {
  await setDoc(doc(db, "users", user.uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true });
  Object.assign(data, fields);
  fillHeader();
}

/* ---------- Profile: Edit / Cancel / Save ---------- */

function setEditing(on) {
  editing = on;
  $("personalInfoFields").disabled = !on;
  $("saveButton").classList.toggle("d-none", !on);
  $("editButton").innerHTML = on
    ? '<i class="bi bi-x-lg me-1"></i>Cancel'
    : '<i class="bi bi-pencil me-1"></i>Edit Profile';
  if (on) $("nameInput").focus();
  else fillProfile(); // Cancel (or after saving): show the saved values
}

async function saveProfile() {
  const displayName = $("nameInput").value.trim();
  if (!displayName) {
    notify("Enter your name.", "danger");
    return;
  }
  const button = $("saveButton");
  button.disabled = true;
  try {
    await updateProfile(user, { displayName }); // so the greeting on the Budget page updates too
    await persist({ displayName, city: $("cityInput").value.trim(), currency: $("currencySelect").value });
    setEditing(false);
    notify("Profile saved.");
  } catch (error) {
    fail("Couldn't save your profile. Try again.", error);
  } finally {
    button.disabled = false;
  }
}

$("editButton").addEventListener("click", () => setEditing(!editing));
$("saveButton").addEventListener("click", saveProfile);
$("personalInfoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (editing) saveProfile();
});

/* ---------- Profile picture: resized to 160px and stored on the user document ---------- */

$("avatarUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = ""; // lets the same file be picked again
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    notify("Choose an image file.", "danger");
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const size = 160;
    const side = Math.min(bitmap.width, bitmap.height); // centre-crop to a square
    const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
    canvas
      .getContext("2d")
      .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    await persist({ photoData: canvas.toDataURL("image/jpeg", 0.8) });
    notify("Profile picture updated.");
  } catch (error) {
    fail("Couldn't update your picture. Try a different image.", error);
  }
});

/* ---------- Budget preferences ---------- */

$("budgetPrefsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!e.currentTarget.reportValidity()) return;
  const button = $("savePrefsButton");
  button.disabled = true;
  try {
    await persist({
      monthlyBudget: toCents($("monthlyBudgetInput").value) / 100, // whole cents, never 12.3500000001
      monthlySavingsTarget: toCents($("savingsTargetInput").value) / 100,
      overspendAlert: $("overspendAlertSwitch").checked,
      sharedBudget: $("sharedBudgetSwitch").checked,
    });
    fillPrefs();
    notify("Preferences updated.");
  } catch (error) {
    fail("Couldn't save your preferences. Check your connection and try again.", error);
  } finally {
    button.disabled = false;
  }
});

$("logoutButton").addEventListener("click", async () => {
  try {
    await logOut();
    location.href = "login.html";
  } catch (error) {
    fail("Couldn't log out. Try again.", error);
  }
});

/* ---------- Load ---------- */

requireUser(async (u) => {
  user = u;
  try {
    const snap = await getDoc(doc(db, "users", u.uid));
    data = snap.exists() ? snap.data() : {};
  } catch (error) {
    fail("Couldn't load your settings. Refresh to try again.", error);
  }
  fillHeader();
  fillProfile();
  fillPrefs();
});