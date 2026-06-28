// ─── GOOGLE SHEETS CONFIG ────────────────────────────────────────────────────
// Sheet ID extracted from the shared URL
export const SHEET_ID = "1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU";
export const API_KEY  = "AIzaSyC-18yYzvaF-0-UY6slU9nLKYFcaChDPSs";

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

// Sheet tab names — one tab per data type
export const TABS = {
  CLUB:     "Club",
  ADMINS:   "Admins",
  MEMBERS:  "Members",
  EVENTS:   "Events",
  INCOMES:  "Incomes",
  EXPENSES: "Expenses",
};

// ─── READ ─────────────────────────────────────────────────────────────────────
export async function sheetRead(tab) {
  const url = `${BASE}/values/${tab}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Read failed: ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]))
  );
}

// ─── APPEND ROW ───────────────────────────────────────────────────────────────
export async function sheetAppend(tab, rowObj) {
  const existing = await sheetRead(tab);
  // Get headers from first row
  const url = `${BASE}/values/${tab}?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const headers = (data.values || [[]])[0] || [];
  const row = headers.map(h => rowObj[h] !== undefined ? String(rowObj[h]) : "");

  const appendUrl = `${BASE}/values/${tab}:append?valueInputOption=RAW&key=${API_KEY}`;
  const appRes = await fetch(appendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });
  if (!appRes.ok) throw new Error(`Append failed: ${appRes.status}`);
  return appRes.json();
}

// ─── UPDATE SINGLE ROW by matching id column ──────────────────────────────────
export async function sheetUpdateRow(tab, id, updatedObj) {
  const url = `${BASE}/values/${tab}?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const rows = data.values || [];
  if (!rows.length) return;
  const headers = rows[0];
  const idIdx = headers.indexOf("id");
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === String(id));
  if (rowIdx === -1) return;

  const sheetRow = rowIdx + 1; // 1-based
  const range = `${tab}!A${sheetRow}`;
  const newRow = headers.map(h => updatedObj[h] !== undefined ? String(updatedObj[h]) : "");

  const putUrl = `${BASE}/values/${range}?valueInputOption=RAW&key=${API_KEY}`;
  await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [newRow] }),
  });
}

// ─── DELETE ROW by id (clears the row) ───────────────────────────────────────
export async function sheetDeleteRow(tab, id) {
  const url = `${BASE}/values/${tab}?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const rows = data.values || [];
  if (!rows.length) return;
  const headers = rows[0];
  const idIdx = headers.indexOf("id");
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === String(id));
  if (rowIdx === -1) return;

  // Get the spreadsheet ID for batchUpdate (to delete the row)
  const sheetInfoUrl = `${BASE}?key=${API_KEY}`;
  const sheetInfoRes = await fetch(sheetInfoUrl);
  const sheetInfo = await sheetInfoRes.json();
  const sheetMeta = sheetInfo.sheets?.find(s => s.properties.title === tab);
  if (!sheetMeta) return;
  const sheetIdNum = sheetMeta.properties.sheetId;

  const deleteUrl = `${BASE}:batchUpdate?key=${API_KEY}`;
  await fetch(deleteUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetIdNum,
            dimension: "ROWS",
            startIndex: rowIdx,
            endIndex: rowIdx + 1,
          }
        }
      }]
    })
  });
}

// ─── INIT SHEET HEADERS (run once on first load) ──────────────────────────────
const SHEET_HEADERS = {
  [TABS.CLUB]:     ["id","name","nameBn","established","regNo","address","phone","email","about","photoUrl"],
  [TABS.ADMINS]:   ["id","name","username","password","role"],
  [TABS.MEMBERS]:  ["id","name","nameBn","phone","email","address","joinDate","memberType","createdAt"],
  [TABS.EVENTS]:   ["id","name","nameBn","year","type","status","dateFrom","dateTo","venue","description","bankAccount","bankName","notes"],
  [TABS.INCOMES]:  ["id","eventId","type","amount","date","depositedTo","description"],
  [TABS.EXPENSES]: ["id","eventId","type","amount","date","description"],
};

export async function initSheets() {
  // For each tab, check if header row exists; if not, write it
  for (const [tab, headers] of Object.entries(SHEET_HEADERS)) {
    try {
      const url = `${BASE}/values/${tab}!A1?key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const hasHeader = data.values && data.values[0] && data.values[0][0];
      if (!hasHeader) {
        // Write headers
        const writeUrl = `${BASE}/values/${tab}!A1?valueInputOption=RAW&key=${API_KEY}`;
        await fetch(writeUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: [headers] }),
        });
        // Seed default data
        if (tab === TABS.CLUB) {
          await sheetAppend(tab, {
            id: "club1", name: "Uday Sangha Bhatpara",
            nameBn: "উদয় সংঘ ভাটপাড়া", established: "1943",
            regNo: "", address: "Bhatpara, West Bengal, India",
            phone: "", email: "oneudaysangha@gmail.com",
            about: "A Bengali cultural club celebrating festivals, community, and togetherness since 1943.",
            photoUrl: "",
          });
        }
        if (tab === TABS.ADMINS) {
          await sheetAppend(tab, { id: "admin1", name: "Admin One", username: "admin1", password: "Admin@123", role: "superadmin" });
          await sheetAppend(tab, { id: "admin2", name: "Admin Two", username: "admin2", password: "Admin@456", role: "admin" });
          await sheetAppend(tab, { id: "admin3", name: "Admin Three", username: "admin3", password: "Admin@789", role: "admin" });
        }
        if (tab === TABS.EVENTS) {
          await sheetAppend(tab, {
            id: "durga2026", name: "Durga Puja 2026", nameBn: "দুর্গা পূজা ২০২৬",
            year: "2026", type: "Durga Puja", status: "upcoming",
            dateFrom: "2026-10-01", dateTo: "2026-10-05",
            venue: "Club Pandal, Bhatpara", description: "Annual Durga Puja celebration of Uday Sangha Bhatpara.",
            bankAccount: "", bankName: "", notes: "",
          });
        }
      }
    } catch (e) {
      console.warn(`Sheet init warning for ${tab}:`, e.message);
    }
  }
}
