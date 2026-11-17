// Necesita tracker.js cargado ANTES de este archivo, y Chart.js también

const days = getWeekSummary();
const entries = getData().entries;

document.getElementById("week-total").textContent = "$" + totalBought();
document.getElementById("reset-date").textContent = weekResetsOn();

// Productos comprados en un día, agrupados por nombre: [{ name, count, total }]
function boughtOn(key) {
  const grouped = {};
  entries
    .filter((e) => e.date === key && e.action === "bought")
    .forEach((e) => {
      if (!grouped[e.item]) grouped[e.item] = { count: 0, total: 0 };
      grouped[e.item].count += 1;
      grouped[e.item].total += e.amount;
    });
  return Object.keys(grouped).map((name) => ({
    name: name,
    count: grouped[name].count,
    total: grouped[name].total,
  }));
}

function describe(item) {
  return item.name + (item.count > 1 ? " ×" + item.count : "") + " ($" + item.total + ")";
}

// ----- Gráfica (pasa el mouse sobre una barra para ver qué se compró ese día) -----
new Chart(document.getElementById("spending-chart"), {
  type: "bar",
  data: {
    labels: days.map((d) => d.label),
    datasets: [{
      label: "Spent ($)",
      data: days.map((d) => d.total),
      backgroundColor: "#198754",
    }],
  },
  options: {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const items = boughtOn(days[context[0].dataIndex].key);
            return items.length ? items.map(describe) : ["Nothing bought"];
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Spent ($)" } },
    },
  },
});

// ----- Lista: una fila por día -----
const list = document.getElementById("daily-list");

days.forEach((day) => {
  const items = boughtOn(day.key);

  const li = document.createElement("li");
  li.className = "list-group-item d-flex justify-content-between align-items-start";

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.className = "fw-bold";
  title.textContent = day.label;
  left.appendChild(title);

  if (items.length === 0) {
    const none = document.createElement("div");
    none.className = "text-body-secondary";
    none.textContent = "Nothing bought";
    left.appendChild(none);
  } else {
    items.forEach((item) => {
      const line = document.createElement("div");
      line.textContent = describe(item);
      left.appendChild(line);
    });
  }

  const badge = document.createElement("span");
  badge.className = "badge text-bg-success rounded-pill";
  badge.textContent = "$" + day.total;

  li.appendChild(left);
  li.appendChild(badge);
  list.appendChild(li);
});