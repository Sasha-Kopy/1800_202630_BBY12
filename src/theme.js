// Dark mode: remembers your choice, falls back to your device setting,
// and adds a toggle button to the navbar.

const STORAGE_KEY = "theme";

function getSavedTheme() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null; // storage blocked: just use the device setting
    }
}

function getTheme() {
    const saved = getSavedTheme();
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Chart.js (Savings page) doesn't read CSS, so give it matching colors
function updateCharts(theme) {
    if (!window.Chart) return;
    const dark = theme === "dark";
    window.Chart.defaults.color = dark ? "#d5e3de" : "#666";
    window.Chart.defaults.borderColor = dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
    Object.values(window.Chart.instances ?? {}).forEach((chart) => chart.update());
}

let button = null;

function updateButton(theme) {
    if (!button) return;
    const dark = theme === "dark";
    button.textContent = dark ? "☀️" : "🌙";
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    button.title = dark ? "Switch to light mode" : "Switch to dark mode";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    updateButton(theme);
    updateCharts(theme);
}

function addToggleButton() {
    const menu = document.querySelector(".navbar-collapse");
    if (!menu) return; // pages without a navbar (login, signup) just get the theme

    button = document.createElement("button");
    button.type = "button";
    button.id = "themeToggle";
    button.className = "btn btn-outline-light ms-lg-auto theme-toggle";
    menu.append(button);

    button.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore: the theme still changes for this visit
        }
        applyTheme(next);
    });
}

addToggleButton();
applyTheme(getTheme());