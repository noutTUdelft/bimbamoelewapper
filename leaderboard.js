const BOARDS = [
  { title: "Meeste punten", key: "points" },
  { title: "Meeste spellen gespeeld", key: "games" },
  { title: "Vaakst in Jilla", key: "jilla" }
];
const SLOTS = 5;

const boardsEl = document.getElementById("boards");
const boardMsg = document.getElementById("boardMsg");
const periodButtons = document.querySelectorAll("[data-period]");

let period = "all";

// Start of this year / this month (calendar), or null for all time
function sinceFor(which) {
  const now = new Date();
  if (which === "year") {
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }
  if (which === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

function topFive(rows, key) {
  return rows
    .filter((row) => Number(row[key]) > 0)
    .sort((a, b) => Number(b[key]) - Number(a[key]) || a.name.localeCompare(b.name))
    .slice(0, SLOTS);
}

function renderBoards(rows) {
  boardsEl.innerHTML = "";
  BOARDS.forEach((board) => {
    const card = document.createElement("section");
    card.className = "board";

    const title = document.createElement("h2");
    title.textContent = board.title;
    card.append(title);

    const top = topFive(rows, board.key);
    for (let i = 0; i < SLOTS; i++) {
      const line = document.createElement("div");
      line.className = "row";

      const who = document.createElement("span");
      who.textContent = (i + 1) + ". " + (top[i] ? top[i].name : "\u2014");
      const value = document.createElement("span");
      value.textContent = top[i] ? String(top[i][board.key]) : "";

      line.append(who, value);
      card.append(line);
    }
    boardsEl.append(card);
  });
}

async function load() {
  boardMsg.textContent = "Laden...";
  try {
    const rows = await fetchLeaderboard(sinceFor(period));
    renderBoards(rows);
    boardMsg.textContent = "";
  } catch (err) {
    boardsEl.innerHTML = "";
    boardMsg.textContent = err.message;
  }
}

periodButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    period = btn.dataset.period;
    periodButtons.forEach((other) => {
      other.classList.toggle("on", other === btn);
    });
    load();
  });
});

load();
