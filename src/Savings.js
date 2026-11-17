// Savings page: last 7 days of real data from Firestore (the same expenses logged on the Dashboard
// and Home pages) plus money saved by skipping items. Chart.js is loaded from the CDN in Savings.html.
import { db } from "./firebaseConfig.js";
import { requireUser } from "./authentication.js";
import { collection, getDocs, query, where } from "firebase/firestore";
import { todayStr, toCents, formatCents } from "./money.js";

const alertBox = document.getElementById("savingsAlert");

// One entry per day, oldest first, ending today
const days = [];
for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  days.push({
    key: todayStr(d),
    label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    spentCents: 0,
    savedCents: 0,
    items: {}, // description -> { count, cents }
  });
}
const byKey = Object.fromEntries(days.map((d) => [d.key, d]));

const money = (cents) => `$${formatCents(cents)}`;
const describe = (name, g) => `${name}${g.count > 1 ? ` \u00d7${g.count}` : ""} (${money(g.cents)})`;

function drawChart() {
  new window.Chart(document.getElementById("spending-chart"), {
    type: "bar",
    data: {
      labels: days.map((d) => d.label),
      datasets: [{ label: "Spent ($)", data: days.map((d) => d.spentCents / 100), backgroundColor: "#1b6b57" }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterBody: (ctx) => {
              const items = Object.entries(days[ctx[0].dataIndex].items);
              return items.length ? items.map(([n, g]) => describe(n, g)) : ["Nothing bought"];
            },
          },
        },
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Spent ($)" } } },
    },
  });
}

function drawList() {
  const list = document.getElementById("daily-list");
  list.replaceChildren();
  for (const day of days) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-start";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "fw-bold";
    title.textContent = day.label;
    left.append(title);

    const entries = Object.entries(day.items);
    if (entries.length === 0) {
      const none = document.createElement("div");
      none.className = "text-body-secondary";
      none.textContent = "Nothing bought";
      left.append(none);
    }
    for (const [name, g] of entries) {
      const line = document.createElement("div");
      line.textContent = describe(name, g);
      left.append(line);
    }
    if (day.savedCents > 0) {
      const saved = document.createElement("div");
      saved.className = "text-success small";
      saved.textContent = `Saved ${money(day.savedCents)} by skipping`;
      left.append(saved);
    }

    const badge = document.createElement("span");
    badge.className = "badge text-bg-success rounded-pill";
    badge.textContent = money(day.spentCents);
    li.append(left, badge);
    list.append(li);
  }
}

requireUser(async (user) => {
  try {
    // Single-field range query: no composite index needed
    const fetchSince = (name) =>
      getDocs(query(collection(db, "users", user.uid, name), where("date", ">=", days[0].key)));
    const [tx, skips] = await Promise.all([fetchSince("transactions"), fetchSince("skips")]);

    tx.forEach((s) => {
      const { date, description, amount } = s.data();
      const day = byKey[date];
      if (!day) return; // outside the 7-day window (e.g. a future date)
      const cents = toCents(amount);
      day.spentCents += cents;
      const g = (day.items[description] ??= { count: 0, cents: 0 });
      g.count += 1;
      g.cents += cents;
    });
    skips.forEach((s) => {
      const { date, amount } = s.data();
      if (byKey[date]) byKey[date].savedCents += toCents(amount);
    });

    document.getElementById("week-total").textContent = formatCents(days.reduce((n, d) => n + d.spentCents, 0));
    document.getElementById("saved-total").textContent = formatCents(days.reduce((n, d) => n + d.savedCents, 0));
    drawList();
    drawChart();
  } catch (error) {
    console.error("Error loading savings:", error);
    const hint = error?.code === "permission-denied" ? " (permission denied: deploy the latest firestore.rules)" : "";
    alertBox.textContent = "Couldn't load your savings. Refresh to try again." + hint;
    alertBox.classList.remove("d-none");
  }
});
