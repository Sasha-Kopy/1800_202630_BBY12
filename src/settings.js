import { db } from "./firebaseConfig.js";
import { requireUser } from "./authentication.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toCents } from "./money.js";

const form = document.getElementById("settingsForm");
const limitInput = document.getElementById("dailyLimitInput");
const goalInput = document.getElementById("savingsGoalInput");
const saveButton = form.querySelector("button[type=submit]");
const statusMessage = document.getElementById("statusMessage");

let currentUser = null;

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `mt-3 text-center text-${type}`;
}

// Logged-out visitors are sent to login.html; otherwise load saved settings
requireUser(async (user) => {
  currentUser = user;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.dailyExpenseLimit !== undefined) limitInput.value = data.dailyExpenseLimit;
      if (data.savingsGoal !== undefined) goalInput.value = data.savingsGoal;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
    setStatus("Couldn't load your saved settings. Refresh to try again.", "danger");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  if (!currentUser) {
    setStatus("You need to be logged in to save settings.", "danger");
    return;
  }

  // Round to whole cents so 12.345 is saved as 12.35 (and never 12.3500000001)
  const dailyExpenseLimit = toCents(limitInput.value) / 100;
  const savingsGoal = toCents(goalInput.value) / 100;

  saveButton.disabled = true;
  try {
    // merge: true creates the document if it doesn't exist and keeps other fields
    await setDoc(
      doc(db, "users", currentUser.uid),
      { dailyExpenseLimit, savingsGoal, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setStatus("Settings saved.", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    setStatus("Couldn't save your settings. Check your connection and try again.", "danger");
  } finally {
    saveButton.disabled = false;
  }
});
