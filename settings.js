function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

// ---------- codes (one box at the bottom) ----------
const settingsMain = document.getElementById("settingsMain");
const codeBar = document.getElementById("codeBar");
const codeInput = document.getElementById("codeInput");
const codeBtn = document.getElementById("codeBtn");
const codeMsg = document.getElementById("codeMsg");

const MESSAGE_SECONDS = 3; // how long "Admin ontgrendeld." etc. stays visible

let adminCode = ""; // filled in once the admin code was accepted
let staffCode = ""; // filled in once the staff code was accepted
let codeMsgTimer = null;

function isAdmin() {
  return adminCode !== "";
}

// The code box disappears once the admin code is accepted (it unlocks everything).
// It comes back when the page is opened again.
function updateCodeBar() {
  const showInput = !isAdmin();
  codeInput.hidden = !showInput;
  codeBtn.hidden = !showInput;
  const barVisible = showInput || codeMsg.textContent !== "";
  codeBar.hidden = !barVisible;
  settingsMain.classList.toggle("withbar", barVisible);
}

// Shows a message for a few seconds
function flashCodeMsg(text) {
  clearTimeout(codeMsgTimer);
  codeMsg.textContent = text;
  updateCodeBar();
  codeMsgTimer = setTimeout(() => {
    codeMsg.textContent = "";
    updateCodeBar();
  }, MESSAGE_SECONDS * 1000);
}

function showAdminFeatures() {
  openLogsBtn.hidden = !isAdmin();
  if (!isAdmin()) {
    logsPanel.hidden = true;
  }
  refreshAccountControls();
  updateCreateForm();
  updateCodeBar();
}

function showStaffFeatures() {
  openQuestionsBtn.hidden = staffCode === "";
  if (staffCode === "") {
    questionsPanel.hidden = true;
  }
}

function lockAdmin() {
  if (staffCode === adminCode) {
    staffCode = "";
  }
  adminCode = "";
  showAdminFeatures();
  showStaffFeatures();
}

codeBar.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = codeInput.value;
  if (code === "") {
    return;
  }

  codeBtn.disabled = true;
  clearTimeout(codeMsgTimer);
  codeMsg.textContent = "Bezig...";

  let message = "";
  try {
    if (await checkAdminCode(code)) {
      adminCode = code;
      staffCode = code; // the admin code works for questions too
      showAdminFeatures();
      showStaffFeatures();
      message = "Admin ontgrendeld.";
    } else if (await checkStaffCode(code)) {
      staffCode = code;
      showStaffFeatures();
      message = "Staff ontgrendeld.";
    } else {
      message = "Verkeerde code.";
    }
  } catch (err) {
    message = err.message;
  }

  codeInput.value = "";
  codeBtn.disabled = false;
  flashCodeMsg(message);
});

// ---------- create account ----------
const openCreateBtn = document.getElementById("openCreate");
const createForm = document.getElementById("createForm");
const nameInput = document.getElementById("name");
const submitBtn = document.getElementById("submit");
const createMsg = document.getElementById("createMsg");

const CREATE_HINT = "Typ eerst de admincode onderaan de pagina.";

// You can only create an account once the admin code was typed correctly
function updateCreateForm() {
  submitBtn.disabled = !isAdmin();
  if (!isAdmin()) {
    if (createMsg.textContent === "") {
      createMsg.textContent = CREATE_HINT;
    }
  } else if (createMsg.textContent === CREATE_HINT) {
    createMsg.textContent = "";
  }
}

openCreateBtn.addEventListener("click", () => {
  createForm.hidden = !createForm.hidden;
  if (!createForm.hidden) {
    updateCreateForm();
    nameInput.focus();
  }
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!isAdmin()) {
    createMsg.textContent = CREATE_HINT;
    return;
  }
  if (name === "") {
    createMsg.textContent = "Vul een accountnaam in.";
    return;
  }

  submitBtn.disabled = true;
  createMsg.textContent = "Bezig...";

  try {
    const result = await createAccount(name, adminCode);
    if (result === "ok") {
      createMsg.textContent = "Account \u201c" + name + "\u201d is aangemaakt.";
      nameInput.value = "";
      if (!accountListEl.hidden) {
        loadList();
      }
    } else if (result === "wrong_code") {
      lockAdmin();
      createMsg.textContent = "Verkeerde admincode.";
    } else if (result === "name_taken") {
      createMsg.textContent = "Deze naam bestaat al.";
    } else if (result === "invalid_name") {
      createMsg.textContent = "Vul een geldige naam in (maximaal 20 tekens).";
    } else {
      createMsg.textContent = "Er ging iets mis. Probeer het opnieuw.";
    }
  } catch (err) {
    createMsg.textContent = err.message;
  }

  submitBtn.disabled = !isAdmin();
});

// ---------- accounts list and delete ----------
const openListBtn = document.getElementById("openList");
const accountListEl = document.getElementById("accountList");
const deleteBtn = document.getElementById("delete");
const listMsg = document.getElementById("listMsg");

const DELETE_ACCOUNTS_HINT = "Hun scores worden ook verwijderd.";

let accounts = [];
let marked = []; // ids selected for deletion
let deleteArmed = false; // true after the first press ("Zeker weten?")
let deleteTimer = null;

function updateList() {
  const buttons = accountListEl.children;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const on = marked.includes(Number(btn.dataset.id));
    btn.classList.toggle("on", on);
    btn.disabled = !isAdmin();
    btn.firstChild.textContent = on ? "\u2713" : "";
  }
  deleteArmed = false;
  clearTimeout(deleteTimer);
  if (listMsg.textContent === DELETE_ACCOUNTS_HINT) {
    listMsg.textContent = "";
  }
  deleteBtn.textContent = "Verwijderen (" + marked.length + ")";
  deleteBtn.disabled = marked.length === 0;
}

function refreshAccountControls() {
  deleteBtn.hidden = !(isAdmin() && !accountListEl.hidden);
  updateList();
}

function renderList() {
  accountListEl.innerHTML = "";
  accounts.forEach((account) => {
    const btn = el("button", "player");
    btn.type = "button";
    btn.dataset.id = String(account.id);
    btn.append(el("span", "badge"), el("span", "", account.name));
    btn.addEventListener("click", () => {
      if (!isAdmin()) {
        return;
      }
      const position = marked.indexOf(account.id);
      if (position === -1) {
        marked.push(account.id);
      } else {
        marked.splice(position, 1);
      }
      updateList();
    });
    accountListEl.append(btn);
  });
  refreshAccountControls();
}

async function loadList() {
  listMsg.textContent = "Accounts laden...";
  try {
    accounts = await fetchAccounts();
    renderList();
    listMsg.textContent = accounts.length === 0 ? "Er zijn nog geen accounts." : "";
  } catch (err) {
    listMsg.textContent = err.message;
  }
}

openListBtn.addEventListener("click", () => {
  const opening = accountListEl.hidden;
  accountListEl.hidden = !opening;
  marked = [];
  listMsg.textContent = "";
  if (opening) {
    loadList();
  }
  refreshAccountControls();
});

deleteBtn.addEventListener("click", async () => {
  if (!isAdmin() || marked.length === 0) {
    return;
  }
  const count = marked.length;

  if (!deleteArmed) {
    // first press: ask again, second press deletes
    deleteArmed = true;
    deleteBtn.textContent = "Zeker weten?";
    listMsg.textContent = DELETE_ACCOUNTS_HINT;
    clearTimeout(deleteTimer);
    deleteTimer = setTimeout(updateList, 5000);
    return;
  }
  deleteArmed = false;
  clearTimeout(deleteTimer);

  deleteBtn.disabled = true;
  listMsg.textContent = "Bezig...";
  try {
    const result = await deleteAccounts(marked, adminCode);
    if (result === "ok") {
      marked = [];
      await loadList();
      listMsg.textContent = plural(count, "account is", "accounts zijn") + " verwijderd.";
    } else {
      lockAdmin();
      listMsg.textContent = "Verkeerde admincode.";
    }
  } catch (err) {
    listMsg.textContent = err.message;
    deleteBtn.disabled = false;
  }
});

// ---------- logs (admin) ----------
const openLogsBtn = document.getElementById("openLogs");
const logsPanel = document.getElementById("logsPanel");
const logsMsg = document.getElementById("logsMsg");
const logsList = document.getElementById("logsList");

const GAME_NAMES = { baap: "Bim Bam Baap", bong: "Bim Bam Bong", blunt: "Bim Bam Blunt" };

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return "onbekend";
  }
  if (seconds < 60) {
    return seconds + " sec";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes + " min";
  }
  return Math.floor(minutes / 60) + " u " + String(minutes % 60).padStart(2, "0") + " min";
}

// rows: one per player per game, newest game first
function renderLogs(rows) {
  logsList.innerHTML = "";

  const games = [];
  const byId = new Map();
  rows.forEach((row) => {
    let game = byId.get(row.r_game_id);
    if (!game) {
      game = {
        id: row.r_game_id,
        type: row.r_game_type,
        playedAt: new Date(row.r_played_at),
        seconds: row.r_seconds,
        rounds: row.r_rounds,
        players: []
      };
      byId.set(row.r_game_id, game);
      games.push(game);
    }
    game.players.push({ name: row.r_name, points: row.r_points });
  });

  let lastDate = "";
  games.forEach((game) => {
    const dateText = dateFormat.format(game.playedAt);
    if (dateText !== lastDate) {
      logsList.append(el("h3", "datetitle", dateText));
      lastDate = dateText;
    }

    const card = el("div", "board logcard type-" + game.type);
    makeExpandable(card);
    card.title = GAME_NAMES[game.type] || "";
    game.players.forEach((player) => {
      const line = el("div", "row");
      line.append(el("span", "", player.name), el("span", "", plural(player.points, "punt", "punten")));
      card.append(line);
    });
    const rounds = game.rounds === null || game.rounds === undefined ? "onbekend" : String(game.rounds);
    card.append(el("div", "meta", "Speeltijd: " + formatDuration(game.seconds) + " \u00b7 Rondes: " + rounds));

    const actions = el("div", "qactions");
    actions.append(dangerButton(
      "Verwijderen",
      "Zeker weten? De punten tellen dan niet meer mee in de ranglijsten.",
      logsMsg,
      () => removeGame(game.id)
    ));
    card.append(actions);
    logsList.append(card);
  });

  if (games.length === 0) {
    logsMsg.textContent = "Er zijn nog geen spellen opgeslagen.";
  }
}

async function removeGame(gameId) {
  logsMsg.textContent = "Bezig...";
  try {
    const result = await deleteGame(adminCode, gameId);
    if (result === "ok") {
      await loadLogs();
      if (logsList.children.length > 0) {
        logsMsg.textContent = "Spel verwijderd.";
      }
    } else {
      lockAdmin();
      logsMsg.textContent = "Verkeerde admincode.";
    }
  } catch (err) {
    logsMsg.textContent = err.message;
  }
}

async function loadLogs() {
  logsMsg.textContent = "Logs laden...";
  try {
    const rows = await fetchGameLogs(adminCode);
    logsMsg.textContent = "";
    renderLogs(rows);
  } catch (err) {
    logsMsg.textContent = err.message;
  }
}

// Scrolls so the element is at the top of the screen (or as far down as the page goes)
function scrollToTop(element) {
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

openLogsBtn.addEventListener("click", async () => {
  const opening = logsPanel.hidden;
  logsPanel.hidden = !opening;
  if (opening) {
    await loadLogs();
    scrollToTop(logsPanel);
  }
});

// ---------- questions and categories (staff) ----------
const openQuestionsBtn = document.getElementById("openQuestions");
const questionsPanel = document.getElementById("questionsPanel");
const qMsg = document.getElementById("qMsg");
const newQuestionBtn = document.getElementById("newQuestionBtn");
const questionForm = document.getElementById("questionForm");
const questionText = document.getElementById("questionText");
const newQuestionChips = document.getElementById("newQuestionChips");
const questionListEl = document.getElementById("questionList");
const newCategoryBtn = document.getElementById("newCategoryBtn");
const categoryForm = document.getElementById("categoryForm");
const categoryName = document.getElementById("categoryName");
const categoryListEl = document.getElementById("categoryList");

const ERRORS = {
  wrong_code: "Verkeerde staffcode.",
  name_taken: "Deze categorie bestaat al.",
  invalid_name: "Vul een geldige naam in (maximaal 30 tekens).",
  invalid_text: "Vul een vraag in (maximaal 200 tekens).",
  not_found: "Deze vraag bestaat niet meer."
};

let qData = { categories: [], questions: [] };
let editing = null;                // { key, mode: "text" | "cats", set? }
const newQuestionCategories = new Set();

// A row of category buttons you can switch on and off
function makeChips(selectedSet) {
  const wrap = el("div", "chips");
  if (qData.categories.length === 0) {
    wrap.append(el("span", "hint", "Er zijn nog geen categorie\u00ebn."));
  }
  qData.categories.forEach((category) => {
    const chip = el("button", "chip" + (selectedSet.has(category.id) ? " on" : ""), category.name);
    chip.type = "button";
    chip.addEventListener("click", () => {
      if (selectedSet.has(category.id)) {
        selectedSet.delete(category.id);
      } else {
        selectedSet.add(category.id);
      }
      chip.classList.toggle("on", selectedSet.has(category.id));
    });
    wrap.append(chip);
  });
  return wrap;
}

// Pressing a box shows its buttons. Pressing it again, or another box, hides them.
let expandedBox = null;

function makeExpandable(box) {
  box.addEventListener("click", (event) => {
    if (event.target && event.target.closest && event.target.closest("button, input")) {
      return; // pressing a button inside the box doesn't close it
    }
    if (expandedBox === box) {
      box.classList.remove("expanded");
      expandedBox = null;
      return;
    }
    if (expandedBox) {
      expandedBox.classList.remove("expanded");
    }
    box.classList.add("expanded");
    expandedBox = box;
  });
}

function miniButton(text, danger, onClick) {
  const btn = el("button", "mini" + (danger ? " danger" : ""), text);
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}

// A red button that needs two presses: the first changes it to "Zeker weten?"
function dangerButton(text, hint, messageEl, onConfirm) {
  const btn = el("button", "mini danger", text);
  btn.type = "button";
  let armed = false;
  let timer = null;

  function reset() {
    armed = false;
    btn.textContent = text;
    clearTimeout(timer);
    if (messageEl.textContent === hint) {
      messageEl.textContent = "";
    }
  }

  btn.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      btn.textContent = "Zeker weten?";
      messageEl.textContent = hint;
      timer = setTimeout(reset, 5000);
      return;
    }
    armed = false;
    clearTimeout(timer);
    btn.textContent = text;
    onConfirm();
  });
  return btn;
}

async function mutate(action, okMessage) {
  qMsg.textContent = "Bezig...";
  try {
    const result = await action();
    if (result === "ok") {
      editing = null;
      await loadQuestions();
      qMsg.textContent = okMessage || "";
      return true;
    }
    if (result === "wrong_code") {
      staffCode = "";
      showStaffFeatures();
    }
    qMsg.textContent = ERRORS[result] || "Er ging iets mis. Probeer het opnieuw.";
  } catch (err) {
    qMsg.textContent = err.message;
  }
  return false;
}

function questionBox(question, sectionKey) {
  const editKey = question.id + "|" + sectionKey;
  const box = el("div", "qbox");
  const editingThis = editing && editing.key === editKey;

  if (editingThis && editing.mode === "text") {
    const input = el("input", "textin");
    input.type = "text";
    input.maxLength = 200;
    input.value = question.text;
    const row = el("div", "editrow");
    row.append(
      miniButton("Opslaan", false, () =>
        mutate(() => saveQuestion(staffCode, question.id, input.value, question.category_ids), "Vraag aangepast.")),
      miniButton("Annuleren", false, () => { editing = null; renderQuestions(); })
    );
    box.append(input, row);
    return box;
  }

  box.append(el("div", "qtext", question.text));

  if (editingThis && editing.mode === "cats") {
    const row = el("div", "editrow");
    row.append(
      miniButton("Opslaan", false, () =>
        mutate(() => saveQuestion(staffCode, question.id, question.text, [...editing.set]), "Categorie\u00ebn aangepast.")),
      miniButton("Annuleren", false, () => { editing = null; renderQuestions(); })
    );
    box.append(makeChips(editing.set), row);
    return box;
  }

  const actions = el("div", "qactions");
  actions.append(
    miniButton("Tekst aanpassen", false, () => {
      editing = { key: editKey, mode: "text" };
      renderQuestions();
    }),
    miniButton("Categorie\u00ebn aanpassen", false, () => {
      editing = { key: editKey, mode: "cats", set: new Set(question.category_ids) };
      renderQuestions();
    }),
    dangerButton("Verwijderen", "Zeker weten? Deze vraag wordt verwijderd.", qMsg, () =>
      mutate(() => deleteQuestion(staffCode, question.id), "Vraag verwijderd."))
  );
  box.append(actions);
  makeExpandable(box);
  return box;
}

function addSection(title, questions, sectionKey) {
  questionListEl.append(el("h3", "datetitle", title));
  questions.forEach((question) => questionListEl.append(questionBox(question, sectionKey)));
}

// Questions are listed per category. A question with two categories shows up twice.
// Questions without a category come last.
function renderQuestions() {
  questionListEl.innerHTML = "";

  const categories = qData.categories.slice().sort((a, b) => a.name.localeCompare(b.name));
  categories.forEach((category) => {
    const inCategory = qData.questions.filter((q) => q.category_ids.includes(category.id));
    if (inCategory.length > 0) {
      addSection(category.name, inCategory, "c" + category.id);
    }
  });

  const loose = qData.questions.filter((q) => q.category_ids.length === 0);
  if (loose.length > 0) {
    addSection("Zonder categorie", loose, "none");
  }

  if (qData.questions.length === 0) {
    questionListEl.append(el("p", "msg", "Er zijn nog geen vragen."));
  }
}

function renderCategories() {
  categoryListEl.innerHTML = "";
  if (qData.categories.length === 0) {
    categoryListEl.append(el("p", "msg", "Er zijn nog geen categorie\u00ebn."));
  }
  qData.categories.forEach((category) => {
    const count = qData.questions.filter((q) => q.category_ids.includes(category.id)).length;
    const box = el("div", "catbox");
    box.append(el("div", "qtext", category.name));

    const info = el("div", "hoverinfo");
    info.append(
      el("span", "", plural(count, "vraag", "vragen")),
      dangerButton("Verwijderen", "Zeker weten? De vragen in deze categorie blijven bestaan.", qMsg, () =>
        mutate(() => deleteCategory(staffCode, category.id), "Categorie verwijderd."))
    );
    box.append(info);
    makeExpandable(box);
    categoryListEl.append(box);
  });
}

function renderNewQuestionChips() {
  newQuestionChips.innerHTML = "";
  newQuestionChips.append(makeChips(newQuestionCategories));
}

async function loadQuestions() {
  const data = await fetchQuestionData(staffCode);
  if (!data) {
    staffCode = "";
    showStaffFeatures();
    qMsg.textContent = "Verkeerde staffcode.";
    return;
  }
  qData = data;
  // forget selected categories that were deleted
  [...newQuestionCategories].forEach((id) => {
    if (!qData.categories.some((c) => c.id === id)) {
      newQuestionCategories.delete(id);
    }
  });
  renderQuestions();
  renderCategories();
  renderNewQuestionChips();
}

openQuestionsBtn.addEventListener("click", async () => {
  const opening = questionsPanel.hidden;
  questionsPanel.hidden = !opening;
  if (opening) {
    qMsg.textContent = "Laden...";
    try {
      await loadQuestions();
      if (staffCode !== "") {
        qMsg.textContent = "";
        scrollToTop(document.getElementById("questionsTitle"));
      }
    } catch (err) {
      qMsg.textContent = err.message;
    }
  }
});

newQuestionBtn.addEventListener("click", () => {
  questionForm.hidden = !questionForm.hidden;
  if (!questionForm.hidden) {
    questionText.focus();
  }
});

newCategoryBtn.addEventListener("click", () => {
  categoryForm.hidden = !categoryForm.hidden;
  if (!categoryForm.hidden) {
    categoryName.focus();
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const ok = await mutate(
    () => saveQuestion(staffCode, null, questionText.value, [...newQuestionCategories]),
    "Vraag aangemaakt."
  );
  if (ok) {
    questionText.value = "";
    newQuestionCategories.clear();
    renderNewQuestionChips();
  }
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const ok = await mutate(() => createCategory(staffCode, categoryName.value), "Categorie aangemaakt.");
  if (ok) {
    categoryName.value = "";
  }
});

// ---------- start ----------
showAdminFeatures();
showStaffFeatures();
