const QUESTIONS = [
  "Een dier",
  "Snoep",
  "Een land",
  "Een stad",
  "Een fruitsoort",
  "Een groente",
  "Een drankje",
  "Een beroep",
  "Een kleur",
  "Een sport",
  "Een merk",
  "Een film",
  "Een lichaamsdeel",
  "Een kledingstuk",
  "Een meubelstuk",
  "Een vervoersmiddel",
  "Een muziekinstrument",
  "Een gerecht",
  "Een tv-serie",
  "Een vogel",
  "Een insect",
  "Iets uit de supermarkt",
  "Een plant of boom",
  "Een stuk gereedschap",
  "Een snack",
  "Een jongensnaam",
  "Een meisjesnaam",
  "Een schoolvak",
  "Een hobby",
  "Iets uit de keuken"
];

// No Q, X or Y: too hard to answer
const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split("");

const TIME_PER_QUESTION = 30;
const MIN_PLAYERS = 2;

// ----- elements -----
const setupEl = document.getElementById("setup");
const playersEl = document.getElementById("players");
const setupMsg = document.getElementById("setupMsg");
const jillaToggle = document.getElementById("jillaToggle");
const startBtn = document.getElementById("start");

const gameEl = document.getElementById("game");
const turnEl = document.getElementById("turn");
const questionEl = document.getElementById("question");
const letterEl = document.getElementById("letter");
const timerEl = document.getElementById("timer");
const nextBtn = document.getElementById("next");
const backBtn = document.getElementById("back");
const jillaBtn = document.getElementById("jilla");

// ----- setup screen -----
let selected = [];      // chosen player names, in playing order
let jillaOn = false;
let accountsReady = false;

function updateSelection() {
  const buttons = playersEl.children;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const position = selected.indexOf(btn.dataset.name);
    btn.classList.toggle("on", position !== -1);
    btn.setAttribute("aria-pressed", position !== -1 ? "true" : "false");
    btn.firstChild.textContent = position !== -1 ? String(position + 1) : "";
  }
  if (accountsReady) {
    setupMsg.textContent = selected.length < MIN_PLAYERS
      ? "Kies minstens " + MIN_PLAYERS + " spelers."
      : "";
  }
  startBtn.disabled = selected.length < MIN_PLAYERS;
}

function togglePlayer(name) {
  const position = selected.indexOf(name);
  if (position === -1) {
    selected.push(name);
  } else {
    selected.splice(position, 1);
  }
  updateSelection();
}

function renderPlayers(names) {
  playersEl.innerHTML = "";
  names.forEach((name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player";
    btn.dataset.name = name;

    const badge = document.createElement("span");
    badge.className = "badge";
    const label = document.createElement("span");
    label.textContent = name;

    btn.append(badge, label);
    btn.addEventListener("click", () => togglePlayer(name));
    playersEl.append(btn);
  });
  accountsReady = true;
  updateSelection();
}

async function loadAccounts() {
  setupMsg.textContent = "Accounts laden...";
  try {
    const rows = await fetchAccounts();
    if (rows.length === 0) {
      setupMsg.textContent = "Er zijn nog geen accounts. Maak er een aan via Instellingen.";
      return;
    }
    renderPlayers(rows.map((row) => row.name));
  } catch (err) {
    setupMsg.textContent = err.message;
  }
}

jillaToggle.addEventListener("click", () => {
  jillaOn = !jillaOn;
  jillaToggle.classList.toggle("on", jillaOn);
  jillaToggle.setAttribute("aria-pressed", jillaOn ? "true" : "false");
  jillaToggle.textContent = "Jilla: " + (jillaOn ? "aan" : "uit");
});

// ----- game -----
let players = [];       // names in playing order
let startLetter = "";   // one letter for the whole game
let skips = [];         // true = this player is skipped on their next turn
let deck = [];          // questions not used yet (shuffled)
let history = [];       // { question, player, skipsAtStart } for every turn
let index = -1;         // which turn is on screen
let timeLeft = TIME_PER_QUESTION;
let timerId = null;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function newQuestion() {
  if (deck.length === 0) {
    deck = shuffle([...QUESTIONS]);
  }
  return deck.pop();
}

// The next player in order. Players marked in `skips` are passed over once.
function nextPlayer(from) {
  while (true) {
    from = (from + 1) % players.length;
    if (skips[from]) {
      skips[from] = false;
      continue;
    }
    return from;
  }
}

function renderTimer() {
  timerEl.textContent = timeLeft;
}

function sendToJilla() {
  clearInterval(timerId);
  skips[history[index].player] = true;
  document.body.classList.add("jailed");
}

function startTimer() {
  clearInterval(timerId);
  timeLeft = TIME_PER_QUESTION;
  renderTimer();
  timerId = setInterval(() => {
    timeLeft--;
    renderTimer();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      if (jillaOn) {
        sendToJilla();
      }
    }
  }, 1000);
}

function showCurrent() {
  const turn = history[index];
  skips = turn.skipsAtStart.slice();
  document.body.classList.remove("jailed");

  turnEl.textContent = players[turn.player] + " is aan de beurt";
  questionEl.textContent = turn.question;
  letterEl.textContent = "Letter: " + startLetter;
  letterEl.hidden = index !== 0; // only relevant for the first question
  backBtn.disabled = index === 0;
  startTimer();
}

startBtn.addEventListener("click", () => {
  players = selected.slice();
  startLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  skips = players.map(() => false);
  deck = [];
  history = [{ question: newQuestion(), player: 0, skipsAtStart: skips.slice() }];
  index = 0;

  setupEl.hidden = true;
  gameEl.hidden = false;
  jillaBtn.hidden = !jillaOn;
  showCurrent();
});

nextBtn.addEventListener("click", () => {
  const player = nextPlayer(history[index].player);
  // Going forward again after Terug keeps the same question
  const question = index < history.length - 1 ? history[index + 1].question : newQuestion();
  history[index + 1] = { question, player, skipsAtStart: skips.slice() };
  index++;
  showCurrent();
});

backBtn.addEventListener("click", () => {
  if (index > 0) {
    index--;
    showCurrent();
  }
});

jillaBtn.addEventListener("click", () => {
  if (jillaOn) {
    sendToJilla();
  }
});

loadAccounts();
