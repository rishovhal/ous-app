// ─── GOOGLE SHEETS CONFIG ─────────────────────────────────────────────────────
export const SHEET_ID = "1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU";
export const API_KEY  = "AIzaSyC-18yYzvaF-0-UY6slU9nLKYFcaChDPSs";

// ⚠️ REPLACE THIS after deploying the Apps Script (Step in README)
// Leave as empty string until you have the URL
export let APPS_SCRIPT_URL = "";

// Call this from the app once you have the deployed script URL
export function setScriptUrl(url) {
  APPS_SCRIPT_URL = url;
  localStorage.setItem("ous_script_url", url);
}

// On load, restore from localStorage if saved
const saved = localStorage.getItem("ous_script_url");
if (saved) APPS_SCRIPT_URL = saved;

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

export const TABS = {
  CLUB: "Club", ADMINS: "Admins", MEMBERS: "Members",
  EVENTS: "Events", INCOMES: "Incomes", EXPENSES: "Expenses",
};

// ─── READ (uses API key — works fine, read-only) ──────────────────────────────
export async function sheetRead(tab) {
  const url = `${BASE}/values/${encodeURIComponent(tab)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Read failed: ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
  );
}

// ─── WRITE via Apps Script (handles append / update / delete) ─────────────────
async function scriptCall(action, payload) {
  const url = APPS_SCRIPT_URL;
  if (!url) throw new Error("NO_SCRIPT_URL");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoid CORS preflight
    body: JSON.stringify({ action, ...payload }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { status: "ok" }; }
}

export async function sheetAppend(tab, rowObj) {
  return scriptCall("append", { tab, row: rowObj });
}

export async function sheetUpdateRow(tab, id, updatedObj) {
  return scriptCall("update", { tab, id, row: updatedObj });
}

export async function sheetDeleteRow(tab, id) {
  return scriptCall("delete", { tab, id });
}

// ─── INIT: just verify read works, no writes needed (data entered manually) ───
export async function initSheets() {
  // Just test that we can read the Admins tab
  await sheetRead(TABS.ADMINS);
}
