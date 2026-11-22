// Fill in these two values from Supabase: Project Settings -> API Keys.
// Both are meant to be public, so it is fine that they are in the website code.
const SUPABASE_URL = "https://wudvyfrlmmpisztprkkt.supabase.co";
const SUPABASE_KEY = "sb_publishable_meyL-xPAcyd4auLtVd6rdw_d51aQRFM";

async function dbRequest(path, options = {}) {
  if (SUPABASE_URL.startsWith("PASTE") || SUPABASE_KEY.startsWith("PASTE")) {
    throw new Error("De database is nog niet ingesteld (zie database.js).");
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

// "ok" or "wrong_code". Also removes the scores of those accounts.
function deleteAccounts(ids, adminCode) {
  return rpc("delete_accounts", { p_account_ids: ids, p_admin_code: adminCode });
}

// scores: [{ account_id, points, jilla }]. Saving the same game again just updates it.
function saveGameScores(gameId, gameType, scores, keepalive = false) {
  return rpc("save_game", { p_game_id: gameId, p_game_type: gameType, p_scores: scores }, { keepalive });
}

// since: ISO date text or null (= all time). Returns [{ name, points, games, jilla }]
function fetchLeaderboard(since) {
  return rpc("leaderboard", { p_since: since });
}
