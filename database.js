// Talks to Supabase. Your URL and key are in config.js.

async function dbRequest(path, options = {}) {
  if (SUPABASE_URL.startsWith("PASTE") || SUPABASE_KEY.startsWith("PASTE")) {
    throw new Error("De database is nog niet ingesteld (zie config.js).");
  }

  let response;
  try {
    response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    throw new Error("Geen verbinding met de database.");
  }

  if (!response.ok) {
    throw new Error("De database gaf een fout (" + response.status + ").");
  }
  return response.json();
}

function rpc(name, body, extra = {}) {
  return dbRequest("rpc/" + name, { method: "POST", body: JSON.stringify(body), ...extra });
}

// ----- accounts -----

// [{ id: 1, name: "Anna" }, ...]
function fetchAccounts() {
  return dbRequest("accounts?select=id,name&order=name.asc");
}

// "ok", "wrong_code", "name_taken" or "invalid_name"
function createAccount(name, adminCode) {
  return rpc("create_account", { account_name: name, admin_code: adminCode });
}

// true or false
function checkAdminCode(adminCode) {
  return rpc("check_admin_code", { p_admin_code: adminCode });
}

// true or false
function checkStaffCode(staffCode) {
  return rpc("is_staff_code", { p_code: staffCode });
}

// "ok" or "wrong_code". Also removes the scores of those accounts.
function deleteAccounts(ids, adminCode) {
  return rpc("delete_accounts", { p_account_ids: ids, p_admin_code: adminCode });
}

// ----- games and scores -----

// scores: [{ account_id, points, jilla }]. Saving the same game again just updates it.
function saveGameScores(gameId, gameType, scores, seconds, rounds, keepalive = false) {
  return rpc(
    "save_game_v2",
    { p_game_id: gameId, p_game_type: gameType, p_scores: scores, p_seconds: seconds, p_rounds: rounds },
    { keepalive }
  );
}

// since: ISO date text or null (= all time). Returns [{ name, points, games, jilla }]
function fetchLeaderboard(since) {
  return rpc("leaderboard", { p_since: since });
}

// Needs the admin code. One row per player per game, newest game first.
function fetchGameLogs(adminCode) {
  return rpc("game_logs_v2", { p_admin_code: adminCode });
}

// ----- questions and categories (staff code) -----

// { categories: [{ id, name }], questions: [{ id, text, category_ids }] } or null if the code is wrong
function fetchQuestionData(staffCode) {
  return rpc("questions_list", { p_staff_code: staffCode });
}

function createCategory(staffCode, name) {
  return rpc("category_create", { p_staff_code: staffCode, p_name: name });
}

function deleteCategory(staffCode, id) {
  return rpc("category_delete", { p_staff_code: staffCode, p_id: id });
}

// id = null creates a new question
function saveQuestion(staffCode, id, text, categoryIds) {
  return rpc("question_save", { p_staff_code: staffCode, p_id: id, p_text: text, p_category_ids: categoryIds });
}

function deleteQuestion(staffCode, id) {
  return rpc("question_delete", { p_staff_code: staffCode, p_id: id });
}

// ----- questions for the game (public) and deleting a game log (admin) -----

// { categories: [{ id, name }], questions: [{ text, category_ids }] }
function fetchGameData() {
  return rpc("game_data", {});
}

// "ok" or "wrong_code". Also removes the points of that game from the leaderboards.
function deleteGame(adminCode, gameId) {
  return rpc("delete_game", { p_admin_code: adminCode, p_game_id: gameId });
}
