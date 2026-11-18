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
