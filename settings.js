// ---------- create account ----------
const openCreateBtn = document.getElementById("openCreate");
const createForm = document.getElementById("createForm");
const nameInput = document.getElementById("name");
const codeInput = document.getElementById("code");
const submitBtn = document.getElementById("submit");
const createMsg = document.getElementById("createMsg");

openCreateBtn.addEventListener("click", () => {
  createForm.hidden = !createForm.hidden;
  if (!createForm.hidden) {
    nameInput.focus();
  }
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const code = codeInput.value;
  if (name === "") {
    createMsg.textContent = "Vul een accountnaam in.";
    return;
  }

  submitBtn.disabled = true;
  createMsg.textContent = "Bezig...";

  try {
    const result = await createAccount(name, code);
    if (result === "ok") {
      createMsg.textContent = "Account \u201c" + name + "\u201d is aangemaakt.";
      nameInput.value = "";
      if (!accountListEl.hidden) {
        loadList();
      }
    } else if (result === "wrong_code") {
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

  submitBtn.disabled = false;
});

// ---------- account list and delete ----------
const settingsMain = document.getElementById("settingsMain");
const openListBtn = document.getElementById("openList");
const accountListEl = document.getElementById("accountList");
const listMsg = document.getElementById("listMsg");
const adminBar = document.getElementById("adminBar");
const adminCodeInput = document.getElementById("adminCode");
const unlockBtn = document.getElementById("unlock");
const deleteBtn = document.getElementById("delete");

let accounts = [];
let unlocked = false;
let adminCode = "";
let marked = []; // ids selected for deletion

function lock() {
  unlocked = false;
  adminCode = "";
  marked = [];
  adminCodeInput.value = "";
  adminCodeInput.hidden = false;
  unlockBtn.hidden = false;
  deleteBtn.hidden = true;
}

function updateList() {
  const buttons = accountListEl.children;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const on = marked.includes(Number(btn.dataset.id));
    btn.classList.toggle("on", on);
    btn.disabled = !unlocked;
    btn.firstChild.textContent = on ? "\u2713" : "";
  }
  deleteBtn.textContent = "Verwijderen (" + marked.length + ")";
  deleteBtn.disabled = marked.length === 0;
}

function renderList() {
  accountListEl.innerHTML = "";
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

    btn.addEventListener("click", () => {
      if (!unlocked) {
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
  updateList();
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
  adminBar.hidden = !opening;
  settingsMain.classList.toggle("withbar", opening);
  lock();
  listMsg.textContent = "";
  if (opening) {
    loadList();
  }
});

adminBar.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = adminCodeInput.value;
  if (code === "") {
    return;
  }

  unlockBtn.disabled = true;
  listMsg.textContent = "Bezig...";
  try {
    const correct = await checkAdminCode(code);
    if (correct === true) {
      unlocked = true;
      adminCode = code;
      adminCodeInput.hidden = true;
      unlockBtn.hidden = true;
      deleteBtn.hidden = false;
      listMsg.textContent = "Ontgrendeld. Kies de accounts die je wilt verwijderen.";
      updateList();
    } else {
      listMsg.textContent = "Verkeerde admincode.";
    }
  } catch (err) {
    listMsg.textContent = err.message;
  }
  unlockBtn.disabled = false;
});

deleteBtn.addEventListener("click", async () => {
  if (!unlocked || marked.length === 0) {
    return;
  }
  const count = marked.length;
  const ok = window.confirm(
    "Weet je het zeker? " + count + (count === 1 ? " account wordt" : " accounts worden") +
    " verwijderd, inclusief hun scores."
  );
  if (!ok) {
    return;
  }

  deleteBtn.disabled = true;
  listMsg.textContent = "Bezig...";
  try {
    const result = await deleteAccounts(marked, adminCode);
    if (result === "ok") {
      marked = [];
      await loadList();
      listMsg.textContent = count + (count === 1 ? " account is verwijderd." : " accounts zijn verwijderd.");
    } else {
      lock();
      updateList();
      listMsg.textContent = "Verkeerde admincode.";
    }
  } catch (err) {
    listMsg.textContent = err.message;
    deleteBtn.disabled = false;
  }
});
