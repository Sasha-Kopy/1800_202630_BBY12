// Needs tracker.js loaded BEFORE this file

// Set this from wherever the user enters their goal
let goal = 100;
let progress = totalBought(); // restores this week's total after a refresh

const bar = document.getElementById("progress-bar");
const wrapper = document.getElementById("progress-wrapper");
const progressText = document.getElementById("progress-text");

function updateProgressBar() {
  const percent = goal > 0 ? Math.min(Math.round((progress / goal) * 100), 100) : 0;
  bar.style.width = percent + "%";
  progressText.textContent = percent + "%";
  wrapper.setAttribute("aria-valuenow", percent);
}

// Both buttons are saved; only "Bought it" moves the bar
document.querySelectorAll("[data-action]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const item = btn.closest(".daily-item");
    const name = item.querySelector("h3").textContent.trim();
    const amount = Number(item.dataset.amount) || 0;

    if (btn.dataset.action === "bought") {
      logAction(name, "bought", amount);
      progress = totalBought();
      updateProgressBar();
    } else {
      logAction(name, "skipped", 0);
    }
  });
});

// Call this if the user changes the goal
function setGoal(newGoal) {
  goal = Number(newGoal);
  updateProgressBar();
}

updateProgressBar();