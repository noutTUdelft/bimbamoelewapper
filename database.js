// Fill in these two values from Supabase: Project Settings -> API.
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

// Returns a list like [{ name: "Anna" }, { name: "Bram" }]
function fetchAccounts() {
  return dbRequest("accounts?select=name&order=name.asc");
}

// Returns "ok", "wrong_code", "name_taken" or "invalid_name"
function createAccount(name, adminCode) {
  return dbRequest("rpc/create_account", {
    method: "POST",
    body: JSON.stringify({ account_name: name, admin_code: adminCode })
  });
}
