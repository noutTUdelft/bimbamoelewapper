const GAME_TYPE = document.body.dataset.game;

// No Q, X or Y: too hard to answer
const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split("");

const NO_CATEGORY = 0; // the "Zonder categorie" choice (real category ids start at 1)
const TIME_PER_QUESTION = 30;
const MIN_PLAYERS = 2;
const IDLE_SAVE_MS = 10 * 60 * 1000; // save after 10 minutes without touching the page

// ----- elements -----
const homeLink = document.getElementById("home");

const setupEl = document.getElementById("setup");
const setupTitle = document.getElementById("setupTitle");
const playersEl = document.getElementById("players");
const catToggle = document.getElementById("catToggle");
const catChips = document.getElementById("catChips");
const setupMsg = document.getElementById("setupMsg");
const jillaToggle = document.getElementById("jillaToggle");
const rankedToggle = document.getElementById("rankedToggle");
const startBtn = document.getElementById("start");

const gameEl = document.getElementById("game");
const turnEl = document.getElementById("turn");
const questionEl = document.getElementById("question");
const letterEl = document.getElementById("letter");
const timerEl = document.getElementById("timer");
const nextBtn = document.getElementById("next");
const doubleBtn = document.getElementById("double");
const tripleBtn = document.getElementById("triple");
const backBtn = document.getElementById("back");
const jillaBtn = document.getElementById("jilla");
const gameSettingsBtn = document.getElementById("gameSettings");

const recapEl = document.getElementById("recap");
const recapList = document.getElementById("recapList");
const recapJilla = document.getElementById("recapJilla");
const recapMsg = document.getElementById("recapMsg");
const retrySaveBtn = document.getElementById("retrySave");

// ----- state -----
let phase = "setup";      // setup | play | menu (game settings) | recap
let accounts = [];        // [{ id, name }]
let names = {};           // id -> name
let accountsReady = false;
let selected = [];        // ids chosen in the menu, in playing order
let jillaOn = false;      // true = a player who goes to Jilla is skipped once
let ranked = false;       // true = the game is saved and counts for the leaderboards

let categories = [];      // [{ id, name }] from the database
let questions = [];       // [{ text, category_ids }] from the database
let selectedCats = new Set(); // chosen categories (none chosen = all questions)
let questionsReady = false;
let questionsProblem = "";    // shown in the menu when the questions can't be used

let players = [];         // ids currently playing, in order
let participants = new Set(); // everyone who took part at any point
let stats = {};           // id -> { points, jilla } (kept for the recap in every game)
let skips = {};           // id -> true when skipped on their next turn
let startLetter = "";
let deck = [];
let history = [];         // { question, player, jilla, after? } per turn
let viewIndex = 0;        // which turn is on screen (Terug looks back, nothing changes)
let answeredCount = 0;
let timeLeft = TIME_PER_QUESTION;
let timerId = null;

let gameId = "";
let dirty = false;        // there is something that is not saved yet (ranked games only)
let saveError = "";
let idleTimerId = null;
let startedAt = 0;        // when the game started
let lastActivityAt = 0;   // last time someone touched the page during the game

// =============== menu (players, categories, Jilla, ranked) ===============

function paintToggles() {
  jillaToggle.textContent = "Jilla: " + (jillaOn ? "aan" : "uit");
  jillaToggle.classList.toggle("on", jillaOn);
  jillaToggle.setAttribute("aria-pressed", jillaOn ? "true" : "false");

  rankedToggle.textContent = "Ranked: " + (ranked ? "aan" : "uit");
  rankedToggle.classList.toggle("on", ranked);
  rankedToggle.setAttribute("aria-pressed", ranked ? "true" : "false");
  rankedToggle.disabled = phase === "menu"; // can't change ranked during a game
}

// The questions the game may use: all of them, or only the chosen categories
function questionPool() {
  if (selectedCats.size === 0) {
    return questions;
  }
  return questions.filter((q) =>
    q.category_ids.length === 0
      ? selectedCats.has(NO_CATEGORY)
      : q.category_ids.some((id) => selectedCats.has(id))
  );
}

// The categories button reads "alle" until you pick specific categories
function paintCatToggle() {
  const count = selectedCats.size;
  catToggle.textContent = "Categorie\u00ebn: " + (count === 0 ? "alle" : count);
  catToggle.classList.toggle("on", count > 0);
  catToggle.setAttribute("aria-expanded", catChips.hidden ? "false" : "true");
}

function updateSelection() {
  paintCatToggle();
  const buttons = playersEl.children;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const position = selected.indexOf(Number(btn.dataset.id));
    btn.classList.toggle("on", position !== -1);
    btn.setAttribute("aria-pressed", position !== -1 ? "true" : "false");
    btn.firstChild.textContent = position !== -1 ? String(position + 1) : "";
  }

  const poolEmpty = questionsReady && questionPool().length === 0;
  if (accountsReady) {
    if (questionsProblem !== "") {
      setupMsg.textContent = questionsProblem;
    } else if (poolEmpty) {
      setupMsg.textContent = "Er zijn geen vragen in de gekozen categorie\u00ebn.";
    } else {
      setupMsg.textContent = selected.length < MIN_PLAYERS
        ? "Kies minstens " + MIN_PLAYERS + " spelers."
        : "";
    }
  }
  startBtn.disabled = selected.length < MIN_PLAYERS || !questionsReady || poolEmpty;
}

function togglePlayer(id) {
  const position = selected.indexOf(id);
  if (position === -1) {
    selected.push(id);
  } else {
    selected.splice(position, 1);
  }
  updateSelection();
}

function renderPlayers() {
  playersEl.innerHTML = "";
  accounts.forEach((account) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player";
    btn.dataset.id = String(account.id);

    const badge = document.createElement("span");
    badge.className = "badge";
    const label = document.createElement("span");
    label.textContent = account.name;

    btn.append(badge, label);
    btn.addEventListener("click", () => togglePlayer(account.id));
    playersEl.append(btn);
  });
  accountsReady = true;
  updateSelection();
}

function renderCategoryChips() {
  catChips.innerHTML = "";
  catToggle.hidden = categories.length === 0;
  if (categories.length === 0) {
    catChips.hidden = true;
  }
  // the categories, plus "Zonder categorie" when some questions have none
  const choices = categories.slice();
  if (questions.some((q) => q.category_ids.length === 0)) {
    choices.push({ id: NO_CATEGORY, name: "Zonder categorie" });
  }
  choices.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (selectedCats.has(category.id) ? " on" : "");
    chip.textContent = category.name;
    chip.setAttribute("aria-pressed", selectedCats.has(category.id) ? "true" : "false");
    chip.addEventListener("click", () => {
      if (selectedCats.has(category.id)) {
        selectedCats.delete(category.id);
      } else {
        selectedCats.add(category.id);
      }
      chip.classList.toggle("on", selectedCats.has(category.id));
      chip.setAttribute("aria-pressed", selectedCats.has(category.id) ? "true" : "false");
      updateSelection();
    });
    catChips.append(chip);
  });
}

async function loadAccounts() {
  setupMsg.textContent = "Accounts laden...";
  try {
    accounts = await fetchAccounts();
    accounts.forEach((account) => { names[account.id] = account.name; });
    if (accounts.length === 0) {
      setupMsg.textContent = "Er zijn nog geen accounts. Maak er een aan via Instellingen.";
      return;
    }
    renderPlayers();
  } catch (err) {
    setupMsg.textContent = err.message;
  }
}

async function loadQuestions() {
  try {
    const data = await fetchGameData();
    categories = data.categories;
    questions = data.questions;
    renderCategoryChips();
    if (questions.length === 0) {
      questionsProblem = "Er zijn nog geen vragen. Maak ze aan via Instellingen.";
    } else {
      questionsReady = true;
      questionsProblem = "";
    }
  } catch (err) {
    questionsProblem = err.message;
  }
  updateSelection();
}

catToggle.addEventListener("click", () => {
  catChips.hidden = !catChips.hidden;
  paintCatToggle();
});

jillaToggle.addEventListener("click", () => {
  jillaOn = !jillaOn;
  paintToggles();
});

rankedToggle.addEventListener("click", () => {
  if (phase !== "setup") {
    return;
  }
  ranked = !ranked;
  paintToggles();
});

// =============== helpers ===============

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function newQuestion() {
  if (deck.length === 0) {
    deck = shuffle(questionPool().map((q) => q.text));
  }
  return deck.pop();
}

function makeId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

function addParticipant(id) {
  participants.add(id);
  if (!stats[id]) {
    stats[id] = { points: 0, jilla: 0 };
  }
}

// The next player after `fromId` in `order`. Players still in `players`
// who are marked in `skips` are passed over once.
function nextPlayer(order, fromId) {
  let position = order.indexOf(fromId);
  for (let i = 0; i < order.length * 2 + 2; i++) {
    position = (position + 1) % order.length;
    const id = order[position];
    if (!players.includes(id)) {
      continue;
    }
    if (skips[id]) {
      skips[id] = false;
      continue;
    }
    return id;
  }
  return players[0];
}

// =============== timer ===============

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function tick() {
  timeLeft--;
  timerEl.textContent = timeLeft;
  if (timeLeft <= 0) {
    stopTimer();
    sendToJilla(); // time is up = Jilla
  }
}

function runTimer() {
  stopTimer();
  timerId = setInterval(tick, 1000);
}

// =============== showing the game ===============

function render() {
  const live = viewIndex === history.length - 1;
  const turn = history[viewIndex];

  document.body.classList.toggle("viewing", !live);
  document.body.classList.toggle("jailed", live && turn.jilla);

  turnEl.textContent = names[turn.player] + (live ? " is aan de beurt" : " was aan de beurt");
  questionEl.textContent = turn.question;
  letterEl.textContent = "Letter: " + startLetter;
  letterEl.hidden = viewIndex !== 0; // only relevant for the first question
  timerEl.textContent = timeLeft;
  backBtn.disabled = viewIndex === 0;
  jillaBtn.disabled = !live || turn.jilla;
}

function showOnly(section) {
  setupEl.hidden = section !== "setup";
  gameEl.hidden = section !== "game";
  recapEl.hidden = section !== "recap";
}

// =============== playing ===============

function markDirty() {
  if (ranked) {
    dirty = true;
  }
}

function sendToJilla() {
  const turn = history[history.length - 1];
  if (phase !== "play" || turn.jilla) {
    return;
  }
  stopTimer();
  turn.jilla = true;
  stats[turn.player].jilla++;
  if (jillaOn) {
    skips[turn.player] = true; // skipped on their next turn
  }
  markDirty();
  render();
}

// Gives points for a correct answer and moves on to the next question and player.
function answer(points) {
  const turn = history[history.length - 1];
  stopTimer();

  const earned = turn.jilla ? 0 : points;
  stats[turn.player].points += earned;
  answeredCount++;
  markDirty();

  const next = nextPlayer(players, turn.after !== undefined ? turn.after : turn.player);
  history.push({ question: newQuestion(), player: next, jilla: false });
  viewIndex = history.length - 1;
  timeLeft = TIME_PER_QUESTION;
  render();
  runTimer();
}

function resumeTimerIfLive() {
  const turn = history[history.length - 1];
  if (viewIndex === history.length - 1 && !turn.jilla && timeLeft > 0) {
    runTimer();
  }
}

function startGame() {
  players = selected.slice();
  startLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  participants = new Set();
  stats = {};
  skips = {};
  players.forEach(addParticipant);
  deck = [];
  history = [{ question: newQuestion(), player: players[0], jilla: false }];
  viewIndex = 0;
  answeredCount = 0;
  gameId = makeId();
  dirty = false;
  startedAt = Date.now();
  lastActivityAt = startedAt;

  phase = "play";
  showOnly("game");
  timeLeft = TIME_PER_QUESTION;
  render();
  runTimer();
  bumpIdle();
}

nextBtn.addEventListener("click", () => {
  if (viewIndex < history.length - 1) {
    // Looking back: just step forward again, nothing is scored
    viewIndex++;
    render();
    resumeTimerIfLive();
    return;
  }
  answer(1);
});

doubleBtn.addEventListener("click", () => {
  if (viewIndex === history.length - 1) {
    answer(2);
  }
});

tripleBtn.addEventListener("click", () => {
  if (viewIndex === history.length - 1) {
    answer(3);
  }
});

backBtn.addEventListener("click", () => {
  if (viewIndex > 0) {
    stopTimer(); // the timer waits while you look back
    viewIndex--;
    render();
  }
});

jillaBtn.addEventListener("click", () => {
  if (viewIndex === history.length - 1) {
    sendToJilla();
  }
});

// =============== game settings during the game ===============

gameSettingsBtn.addEventListener("click", () => {
  if (phase !== "play") {
    return;
  }
  stopTimer();
  viewIndex = history.length - 1;
  phase = "menu";
  selected = players.slice();
  setupTitle.textContent = "Spelinstellingen";
  startBtn.textContent = "Verder";
  paintToggles();
  catChips.hidden = true;
  renderCategoryChips();
  updateSelection();
  showOnly("setup");
});

function applyMenuChanges() {
  const oldPlayers = players.slice();
  players = selected.slice();
  players.forEach(addParticipant);
  deck = []; // new questions come from the (possibly changed) categories

  const turn = history[history.length - 1];
  let newTimer = false;

  if (!players.includes(turn.player)) {
    // The player whose turn it is was removed: the next player in the new order continues
    const replacement = nextPlayer(oldPlayers, turn.player);
    if (turn.jilla) {
      // already dealt with, so just make sure the next turn goes to the replacement
      turn.after = players[(players.indexOf(replacement) - 1 + players.length) % players.length];
    } else {
      turn.player = replacement;
      newTimer = true;
    }
  }

  markDirty();
  phase = "play";
  showOnly("game");
  if (newTimer) {
    timeLeft = TIME_PER_QUESTION;
  }
  render();
  resumeTimerIfLive();
}

startBtn.addEventListener("click", () => {
  if (phase === "setup") {
    startGame();
  } else if (phase === "menu") {
    applyMenuChanges();
  }
});

// =============== saving (ranked games only) ===============

async function saveGame(keepalive = false) {
  if (!ranked || answeredCount === 0 || !dirty) {
    return true;
  }
  dirty = false;
  const scores = [...participants].map((id) => ({
    account_id: id,
    points: stats[id].points,
    jilla: stats[id].jilla
  }));
  try {
    const seconds = Math.max(0, Math.round((lastActivityAt - startedAt) / 1000));
    await saveGameScores(gameId, GAME_TYPE, scores, seconds, answeredCount, keepalive);
    return true;
  } catch (err) {
    dirty = true;
    saveError = err.message;
    return false;
  }
}

// Save after 10 minutes without touching the page
function bumpIdle() {
  if (phase === "play" || phase === "menu") {
    lastActivityAt = Date.now();
  }
  clearTimeout(idleTimerId);
  if (ranked && (phase === "play" || phase === "menu")) {
    idleTimerId = setTimeout(() => saveGame(false), IDLE_SAVE_MS);
  }
}
document.addEventListener("pointerdown", bumpIdle, true);
document.addEventListener("keydown", bumpIdle, true);

// Save when the page is closed or put away
window.addEventListener("pagehide", () => saveGame(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveGame(true);
  }
});

// =============== ending the game (Home) ===============

function formatDuration(seconds) {
  if (seconds < 60) {
    return seconds + " sec";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes + " min";
  }
  return Math.floor(minutes / 60) + " u " + String(minutes % 60).padStart(2, "0") + " min";
}

function showRecap() {
  recapList.innerHTML = "";
  const rows = [...participants].map((id) => ({
    name: names[id],
    points: stats[id].points,
    jilla: stats[id].jilla
  }));
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  rows.forEach((row) => {
    const line = document.createElement("div");
    line.className = "row";
    const who = document.createElement("span");
    who.textContent = row.name;
    const value = document.createElement("span");
    value.textContent = row.points + (row.points === 1 ? " punt" : " punten");
    line.append(who, value);
    recapList.append(line);
  });

  const seconds = Math.max(0, Math.round((lastActivityAt - startedAt) / 1000));
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = "Speeltijd: " + formatDuration(seconds) + " \u00b7 Rondes: " + answeredCount;
  recapList.append(meta);

  const most = Math.max(...rows.map((row) => row.jilla));
  if (most === 0) {
    recapJilla.textContent = "Niemand ging naar Jilla.";
  } else {
    const who = rows.filter((row) => row.jilla === most).map((row) => row.name).join(", ");
    recapJilla.textContent = "Meeste Jilla: " + who + " (" + most + "\u00d7)";
  }
}

async function saveAndReport() {
  retrySaveBtn.hidden = true;
  if (!ranked) {
    recapMsg.textContent = "Dit spel was niet ranked, dus het is niet opgeslagen.";
    return;
  }
  recapMsg.textContent = "Opslaan...";
  const ok = await saveGame(false);
  if (ok) {
    recapMsg.textContent = "Het spel is opgeslagen.";
  } else {
    recapMsg.textContent = "Opslaan mislukt. " + saveError;
    retrySaveBtn.hidden = false;
  }
}

function endGame() {
  stopTimer();
  clearTimeout(idleTimerId);
  phase = "recap";
  document.body.classList.remove("jailed", "viewing");
  showOnly("recap");
  showRecap();
  saveAndReport();
}

retrySaveBtn.addEventListener("click", saveAndReport);

// Home shows the recap of a game that was started, ranked or not
homeLink.addEventListener("click", (event) => {
  const inGame = phase === "play" || phase === "menu";
  if (inGame && answeredCount > 0) {
    event.preventDefault();
    endGame();
  }
});

paintToggles();
loadAccounts();
loadQuestions();
