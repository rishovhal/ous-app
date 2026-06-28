# 🪔 One Uday Sangha — App

**Uday Sangha Bhatpara** | উদয় সংঘ ভাটপাড়া  
Est. 1943 | oneudaysangha@gmail.com

---

## 📦 What's Inside

| File | Purpose |
|------|---------|
| `src/App.js` | All app pages & UI |
| `src/sheets.js` | Google Sheets API connection |
| `src/index.js` | React entry point |
| `public/index.html` | HTML shell |
| `.github/workflows/deploy.yml` | Auto-deploy to GitHub Pages |

---

## 🚀 Deployment Steps (One Time)

### Step 1 — Set up Google Sheet
1. Open your Google Sheet (OUS-Database)
2. Create these tabs manually (one tab each):
   - `Club`
   - `Admins`
   - `Members`
   - `Events`
   - `Incomes`
   - `Expenses`
3. Make sure sheet is shared: **Anyone with link → Editor**

### Step 2 — Push to GitHub
```bash
# In your terminal, from this folder:
git init
git add .
git commit -m "Initial OUS App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ous-app.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. Go to your GitHub repo
2. Settings → Pages
3. Source: **Deploy from a branch**
4. Branch: **gh-pages** → Save

### Step 4 — Wait 2-3 minutes
Your app will be live at:
```
https://YOUR_USERNAME.github.io/ous-app
```

---

## 📱 Add to Phone Home Screen

**iPhone:**
Safari → Share button → "Add to Home Screen" → Add

**Android:**
Chrome → ⋮ menu → "Add to Home Screen" → Add

---

## 🔐 Default Admin Credentials

| Username | Password | Role |
|----------|----------|------|
| admin1 | Admin@123 | superadmin |
| admin2 | Admin@456 | admin |
| admin3 | Admin@789 | admin |

> ⚠️ Change these passwords after first login (edit directly in Google Sheet → Admins tab)

---

## 📊 Google Sheet Structure

Each tab has these columns (auto-created on first app load):

**Club:** id, name, nameBn, established, regNo, address, phone, email, about, photoUrl  
**Admins:** id, name, username, password, role  
**Members:** id, name, nameBn, phone, email, address, joinDate, memberType, createdAt  
**Events:** id, name, nameBn, year, type, status, dateFrom, dateTo, venue, description, bankAccount, bankName, notes  
**Incomes:** id, eventId, type, amount, date, depositedTo, description  
**Expenses:** id, eventId, type, amount, date, description  

---

## ✏️ Making Changes Later

### Change club name / address / details:
→ Open the app → Home Page → Admin logged in → ✏️ Edit button

### Add income/expense:
→ Events → Durga Puja 2026 → Finance tab → Add button

### Add/remove members:
→ Admin Portal → Members tab

### Change admin passwords:
→ Open OUS-Database Google Sheet → Admins tab → Edit directly

### Want new features (new events, meetings page etc):
→ Come back to Claude chat and say "Update the OUS app — add..."

---

## 🔮 Future: Move to AWS S3

When ready to migrate from Google Sheets to S3/proper database:
1. Export all 6 sheets as CSV/JSON
2. Upload to S3 bucket
3. Update `src/sheets.js` to point to S3 API instead
4. All existing data transfers as-is

---

## 📞 Support
Gmail: oneudaysangha@gmail.com
