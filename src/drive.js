// ─── GOOGLE DRIVE PHOTO UPLOAD ────────────────────────────────────────────────
// Uses Google Identity Services (OAuth 2.0) for browser-based upload
// No backend needed — uploads directly from the browser to Drive

// ⚠️  You need to set your OAuth Client ID below.
// Steps to get it (one-time, 5 mins):
//   1. console.cloud.google.com → your OUS project
//   2. APIs & Services → Credentials → + Create Credentials → OAuth Client ID
//   3. Application type: Web application
//   4. Authorised JavaScript origins: add your GitHub Pages URL
//      e.g. https://yourusername.github.io
//   5. Copy the Client ID and paste below

export const OAUTH_CLIENT_ID = "443989182941-ofuv0fiuavn8l6lbf6vl41jtampd3m60.apps.googleusercontent.com";

// Root folder name in Google Drive
const ROOT_FOLDER = "OUS-Photos";

let accessToken = null;
let tokenExpiry  = 0;

// ─── LOAD GOOGLE IDENTITY SERVICES ───────────────────────────────────────────
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── GET ACCESS TOKEN (shows Google sign-in popup if needed) ─────────────────
export async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  await loadGIS();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: OAUTH_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        accessToken = resp.access_token;
        tokenExpiry  = Date.now() + (resp.expires_in - 60) * 1000;
        resolve(accessToken);
      },
    });
    client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

// ─── FIND OR CREATE FOLDER ────────────────────────────────────────────────────
async function findOrCreateFolder(name, parentId = null) {
  const token = await getAccessToken();
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const meta = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  const folder = await createRes.json();
  return folder.id;
}

// ─── UPLOAD PHOTO TO DRIVE ───────────────────────────────────────────────────
// eventName: e.g. "DurgaPuja"
// year:      e.g. "2026"
// file:      File object from <input type="file">
export async function uploadPhotoToDrive(eventName, year, file) {
  if (OAUTH_CLIENT_ID === "PASTE_YOUR_OAUTH_CLIENT_ID_HERE") {
    throw new Error("OAuth Client ID not configured. See Admin Guide.");
  }

  const token = await getAccessToken();

  // Create folder path: OUS-Photos → DurgaPuja → 2026
  const rootId  = await findOrCreateFolder(ROOT_FOLDER);
  const evId    = await findOrCreateFolder(eventName, rootId);
  const yearId  = await findOrCreateFolder(String(year), evId);

  // Upload file using multipart upload
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [yearId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );

  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
  const uploaded = await uploadRes.json();

  // Make file publicly viewable (so the gallery works for everyone)
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  // Return direct thumbnail URL
  const thumbUrl = `https://drive.google.com/thumbnail?id=${uploaded.id}&sz=w400`;
  const viewUrl  = `https://drive.google.com/file/d/${uploaded.id}/view`;

  return { id: uploaded.id, thumbUrl, viewUrl, name: file.name };
}
