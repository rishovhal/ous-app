// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID = "1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU";
const API_KEY  = "AIzaSyC-18yYzvaF-0-UY6slU9nLKYFcaChDPSs";
const SHEETDB  = "https://sheetdb.io/api/v1/qvb4ybz4plwaq";

const GBASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

export const TABS = {
  CLUB: "Club", ADMINS: "Admins", MEMBERS: "Members",
  EVENTS: "Events", INCOMES: "Incomes", EXPENSES: "Expenses",
};

// ─── READ via Google Sheets API (free, unlimited) ─────────────────────────────
export async function sheetRead(tab) {
  const url = `${GBASE}/values/${encodeURIComponent(tab)}?key=${API_KEY}`;
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

// ─── APPEND via SheetDB ───────────────────────────────────────────────────────
export async function sheetAppend(tab, rowObj) {
  const res = await fetch(`${SHEETDB}?sheet=${tab}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ data: [rowObj] }),
  });
  if (!res.ok) throw new Error(`Append failed: ${res.status}`);
  return res.json();
}

// ─── UPDATE via SheetDB (match by id column) ──────────────────────────────────
export async function sheetUpdateRow(tab, id, updatedObj) {
  const res = await fetch(`${SHEETDB}/id/${encodeURIComponent(id)}?sheet=${tab}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ data: updatedObj }),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
}

// ─── DELETE via SheetDB (match by id column) ──────────────────────────────────
export async function sheetDeleteRow(tab, id) {
  const res = await fetch(`${SHEETDB}/id/${encodeURIComponent(id)}?sheet=${tab}`, {
    method: "DELETE",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return res.json();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
export async function initSheets() {
  await sheetRead(TABS.ADMINS);
}
