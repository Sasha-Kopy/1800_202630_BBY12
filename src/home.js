import { db } from "./firebaseConfig.js";
import { onUser } from "./authentication.js";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";

const card = document.getElementById("budgetCard");
const statusIcon = document.getElementById("budgetStatusIcon");
const statusText = document.getElementById("budgetStatusText");
const spentVal = document.getElementById("spentTodayVal");
const limitVal = document.getElementById("dailyLimitVal");

function setStatus(iconClasses, message) {
  statusIcon.className = `bi ${iconClasses} fs-1`;
  statusText.textContent = message;
}

onUser(async (user) => {
  // The card is only for logged-in users; it starts hidden (d-none) in index.html
  card.classList.toggle("d-none", !user);
  if (!user) return;

  try {
    // 1. Daily limit from settings (users/{uid})
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const limitCents = toCents(userSnap.exists() ? userSnap.data().dailyExpenseLimit : 0);

    // 2. Today's expenses (users/{uid}/transactions), summed in cents
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      where("date", "==", todayStr())
    );
    const snap = await getDocs(q);
    const spentCents = snap.docs.reduce((sum, d) => sum + toCents(d.data().amount), 0);

    limitVal.textContent = formatCents(limitCents);
    spentVal.textContent = formatCents(spentCents);

    // 3. Icon + text (integer math: spent >= 80% of limit)
    if (limitCents === 0) {
      setStatus("bi-info-circle-fill text-info", "Set a daily limit in Settings");
    } else if (spentCents > limitCents) {
      setStatus("bi-exclamation-triangle-fill text-danger", "Over daily limit");
    } else if (spentCents * 10 >= limitCents * 8) {
      setStatus("bi-exclamation-circle-fill text-warning", "Approaching daily limit");
    } else {
      setStatus("bi-check-circle-fill text-success", "Within budget");
    }
  } catch (error) {
    console.error("Error calculating budget status:", error);
    setStatus("bi-x-circle-fill text-danger", "Couldn't load your budget. Refresh to try again.");
  }
});
