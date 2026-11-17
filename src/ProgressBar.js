// (this is temporary since I need the other code to link it to this glup)
let goal = 100;
let progress = 0;

const bar = document.getElementById("progress-bar");
const wrapper = document.getElementById("progress-wrapper");
const progressText = document.getElementById("progress-text");

function updateProgressBar() {
  const percent = goal > 0 ? Math.min(Math.round((progress / goal) * 100), 100) : 0;
  bar.style.width = percent + "%";
  progressText.textContent = percent + "%";
  wrapper.setAttribute("aria-valuenow", percent);
}

// "Bought it" advances the bar by that item's data-amount
document.querySelectorAll('[data-action="bought"]').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const amount = Number(btn.closest(".daily-item").dataset.amount) || 0;
    progress += amount;
    updateProgressBar();
  });
});

// Call this if the user changes the goal
function setGoal(newGoal) {
  goal = Number(newGoal);
  updateProgressBar();
}