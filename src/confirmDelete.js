// Asks "Are you sure?" before something is deleted on the Dashboard.
// Covers both the expense list and the quick-add items.
// It sits in front of the delete buttons, so dashboard.js does not need to change:
// the click is paused, and only replayed if the user confirms.

const modalEl = document.getElementById("confirmDeleteModal");
const confirmBtn = document.getElementById("confirmDeleteBtn");
const titleEl = document.getElementById("confirmDeleteTitle");
const textEl = document.getElementById("confirmDeleteText");

// Each area we protect, and what to call its items in the popup
const areas = [
    { container: document.getElementById("expenseList"), title: "Delete this expense?" },
    { container: document.getElementById("quickItems"), title: "Delete this quick-add item?" },
];

// What a delete control looks like: red buttons, trash/x icons, or a label like "Delete"
const DELETE_SELECTOR =
    ".btn-danger, .btn-outline-danger, .btn-close, .bi-trash, .bi-trash3, .bi-x, .bi-x-lg, " +
    "button:has(.bi-trash, .bi-trash3, .bi-x, .bi-x-lg)";

function isDeleteControl(el) {
    if (el.matches(DELETE_SELECTOR)) return true;
    const label = `${el.getAttribute("aria-label") ?? ""} ${el.title ?? ""}`;
    if (/delete|remove|trash/i.test(label)) return true;
    const text = el.textContent.trim();
    return /^(delete|remove)$/i.test(text) || /^[×✕✖xX]$/.test(text);
}

// Walk up from what was clicked to find the delete control (if any)
function findDeleteControl(target, container) {
    for (let el = target; el && el !== container; el = el.parentElement) {
        if (el.matches("button, a, [role='button'], i, span, svg") && isDeleteControl(el)) {
            return el;
        }
    }
    return null;
}

// Describe the item using the text of its row (without the button labels)
function describeRow(control, container) {
    let row = control.closest("li, .btn-group, .badge") ?? control.parentElement;
    if (!row || row === container) row = control.previousElementSibling;
    if (!row) return "";
    const clone = row.cloneNode(true);
    clone.querySelectorAll("button, a, [role='button']").forEach((el) => el.remove());
    const text = clone.textContent.replace(/\s+/g, " ").trim();
    return text.length > 40 ? text.slice(0, 77) + "..." : text;
}

if (modalEl && confirmBtn && titleEl && textEl) {
    let pendingControl = null;
    let replaying = false;
    let modal = null;

    const getModal = () => (modal ??= new window.bootstrap.Modal(modalEl));

    for (const { container, title } of areas) {
        if (!container) continue;

        // Capture phase: runs before the delete button's own handler
        container.addEventListener(
            "click",
            (event) => {
                if (replaying) return; // the confirmed click: let it through

                const control = findDeleteControl(event.target, container);
                if (!control) return; // not a delete button (e.g. the quick-add button itself)

                event.preventDefault();
                event.stopPropagation();

                pendingControl = control;
                titleEl.textContent = title;
                textEl.textContent = describeRow(control, container);
                getModal().show();
            },
            true
        );
    }

    confirmBtn.addEventListener("click", () => {
        const control = pendingControl;
        pendingControl = null;
        getModal().hide();

        if (control && control.isConnected) {
            replaying = true;
            control.click();
            replaying = false;
        }
    });

    // Cancel / close: forget the pending delete
    modalEl.addEventListener("hidden.bs.modal", () => {
        pendingControl = null;
    });
}