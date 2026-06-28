import { useState, useEffect, useCallback } from "react";
import { sheetRead, sheetAppend, sheetDeleteRow, sheetUpdateRow, initSheets, TABS, setScriptUrl, APPS_SCRIPT_URL } from "./sheets";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INCOME_TYPES = [
  "Advertisement – Banner", "Advertisement – Bill", "Advertisement – Flex",
  "Advertisement – Others", "Membership", "Donation",
  "Outside Bill Collection", "Miscellaneous / Others",
];
const EXPENSE_TYPES = [
  "Light & Sound", "Idol", "Pandal and Decorators", "Puja Specific",
  "Ashtami Bhog", "Purohit", "Helper", "Dhaaki Foods",
  "Dhaaki", "Coolie", "Transports & Fare", "Miscellaneous",
];

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  saffron: "#E8640A", deepRed: "#B5180E", gold: "#D4AF37",
  cream: "#FDF6EC", darkBg: "#1A0A00", card: "#FFFFFF",
  muted: "#6B5B4E", border: "#E8D5B0", success: "#2E7D32", danger: "#C62828",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'Poppins', 'Hind Siliguri', sans-serif", background: C.cream, minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative" },
  header: { background: `linear-gradient(135deg, ${C.darkBg} 0%, #4A1000 60%, ${C.deepRed} 100%)`, color: "#fff", padding: "14px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 3px 12px rgba(0,0,0,0.4)" },
  page: { padding: "14px 14px 88px", minHeight: "calc(100vh - 58px)", overflowY: "auto" },
  card: { background: C.card, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: `1px solid ${C.border}` },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: C.deepRed, marginBottom: 12, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6 },
  label: { fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 600, display: "block" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 10, boxSizing: "border-box", background: "#FAFAFA", outline: "none" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 10, background: "#FAFAFA" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 10, boxSizing: "border-box", background: "#FAFAFA", minHeight: 72, resize: "vertical" },
  btnPrimary: { background: `linear-gradient(135deg, ${C.deepRed}, ${C.saffron})`, color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 4 },
  btnSmall: (bg = C.saffron, fg = "#fff") => ({ background: bg, color: fg, border: "none", borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }),
  badge: (bg = C.saffron, fg = "#fff") => ({ background: bg, color: fg, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-block" }),
  tag: { background: "#FFF3E0", color: C.deepRed, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, marginRight: 4, marginBottom: 4, display: "inline-block" },
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  between: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "12px 0" },
  amtGreen: { color: C.success, fontWeight: 800 },
  amtRed: { color: C.danger, fontWeight: 800 },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.darkBg, display: "flex", borderTop: `2px solid ${C.saffron}`, zIndex: 100 },
  navBtn: (a) => ({ flex: 1, padding: "9px 2px 7px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", color: a ? C.gold : "#777", cursor: "pointer", fontSize: 10, fontWeight: a ? 700 : 400 }),
  spinner: { display: "flex", justifyContent: "center", alignItems: "center", height: 120, color: C.muted, flexDirection: "column", gap: 10 },
  stub: { textAlign: "center", padding: "50px 20px", color: C.muted },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36).toUpperCase();
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ ...S.between, marginBottom: 16 }}>
          <strong style={{ fontSize: 15, color: C.deepRed }}>{title}</strong>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: C.darkBg, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 13, zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
function Spinner({ text = "Loading..." }) {
  return (
    <div style={S.spinner}>
      <div style={{ width: 36, height: 36, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.saffron}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13 }}>{text}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ isAdmin, setPage, toast }) {
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [clubRows, evRows] = await Promise.all([sheetRead(TABS.CLUB), sheetRead(TABS.EVENTS)]);
        setClub(clubRows[0] || {});
        setEvents(evRows);
      } catch { toast("⚠️ Could not load data. Check internet."); }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await sheetUpdateRow(TABS.CLUB, "club1", form);
      setClub(form);
      setEditing(false);
      toast("✅ Club details saved!");
    } catch { toast("❌ Save failed. Try again."); }
    setSaving(false);
  }

  const upcoming = events.filter(e => e.status === "upcoming");
  const navItems = [
    { key: "events", icon: "🎉", label: "Events / উৎসব" },
    { key: "meetings", icon: "📋", label: "Meetings / সভা" },
    { key: "activities", icon: "🎭", label: "Activities / কার্যক্রম" },
  ];

  if (loading) return <div style={S.page}><Spinner text="লোড হচ্ছে..." /></div>;

  return (
    <div style={S.page}>
      {/* Club Banner */}
      <div style={{ ...S.card, background: `linear-gradient(160deg, ${C.darkBg} 0%, #3A0800 50%, #6B1000 100%)`, color: "#fff", textAlign: "center", position: "relative", padding: "22px 16px 18px" }}>
        {club?.photoUrl
          ? <img src={club.photoUrl} alt="Club" style={{ width: 82, height: 82, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.gold}`, marginBottom: 10 }} />
          : <div style={{ width: 82, height: 82, borderRadius: "50%", background: `linear-gradient(135deg, ${C.saffron}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 36, border: `3px solid ${C.gold}` }}>🪔</div>
        }
        <div style={{ fontFamily: "'Hind Siliguri', sans-serif", fontSize: 22, fontWeight: 700, color: C.gold, letterSpacing: 0.5 }}>
          {club?.nameBn || "উদয় সংঘ ভাটপাড়া"}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, opacity: 0.95, letterSpacing: 0.5 }}>
          {club?.name || "Uday Sangha Bhatpara"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 5, letterSpacing: 1 }}>
          Est. {club?.established || "1943"}
          {club?.regNo ? <span style={{ marginLeft: 10 }}>Reg. No: {club.regNo}</span> : null}
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ ...club }); setEditing(true); }}
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 7, padding: "5px 11px", fontSize: 12, cursor: "pointer" }}>
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Club Info */}
      <div style={S.card}>
        <div style={S.sectionTitle}>📍 Club Information</div>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 2 }}>
          {club?.address && <div>📍 {club.address}</div>}
          {club?.phone && <div>📞 {club.phone}</div>}
          {club?.email && <div>📧 {club.email}</div>}
          {club?.about && <div style={{ marginTop: 8, fontStyle: "italic", color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>"{club.about}"</div>}
        </div>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>🪔 Upcoming / আসন্ন উৎসব</div>
          {upcoming.map(ev => (
            <div key={ev.id} style={{ background: "linear-gradient(90deg,#FFF8F0,#FFF3E0)", borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${C.gold}` }}>
              <div style={S.between}>
                <div>
                  <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontWeight: 700, color: C.deepRed, fontSize: 15 }}>{ev.nameBn}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{ev.name}</div>
                </div>
                <span style={S.badge("#27AE60")}>✨ Upcoming</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>📅 {ev.dateFrom} → {ev.dateTo} | 📍 {ev.venue}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Nav */}
      <div style={S.card}>
        <div style={S.sectionTitle}>🧭 Navigate / নেভিগেট</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)}
              style={{ background: `linear-gradient(135deg,${C.saffron}18,${C.deepRed}0A)`, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", cursor: "pointer", textAlign: "center", fontSize: 11, color: C.deepRed, fontWeight: 600, lineHeight: 1.4 }}>
              <div style={{ fontSize: 26, marginBottom: 5 }}>{item.icon}</div>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="✏️ Edit Club Details">
        {[["name","Club Name (English)"],["nameBn","Club Name (Bengali)"],["established","Established Year"],["regNo","Registration No."],["address","Address"],["phone","Phone"],["email","Email"]].map(([f, l]) => (
          <div key={f}>
            <label style={S.label}>{l}</label>
            <input style={S.input} value={form[f] || ""} onChange={e => setForm({ ...form, [f]: e.target.value })} />
          </div>
        ))}
        <label style={S.label}>About the Club</label>
        <textarea style={S.textarea} value={form.about || ""} onChange={e => setForm({ ...form, about: e.target.value })} />
        <label style={S.label}>Profile Photo URL</label>
        <input style={S.input} value={form.photoUrl || ""} onChange={e => setForm({ ...form, photoUrl: e.target.value })} placeholder="Paste image URL..." />
        <button style={S.btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</button>
      </Modal>
    </div>
  );
}

// ─── DURGA PUJA PAGE ──────────────────────────────────────────────────────────
function DurgaPujaPage({ isAdmin, onBack, toast }) {
  const [tab, setTab] = useState("info");
  const [event, setEvent] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInc, setShowInc] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [incForm, setIncForm] = useState({ type: INCOME_TYPES[0], amount: "", date: "", depositedTo: "", description: "" });
  const [expForm, setExpForm] = useState({ type: EXPENSE_TYPES[0], amount: "", date: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRows, incRows, expRows] = await Promise.all([
        sheetRead(TABS.EVENTS), sheetRead(TABS.INCOMES), sheetRead(TABS.EXPENSES),
      ]);
      setEvent(evRows.find(e => e.id === "durga2026") || null);
      setIncomes(incRows.filter(r => r.eventId === "durga2026"));
      setExpenses(expRows.filter(r => r.eventId === "durga2026"));
    } catch { toast("⚠️ Could not load event data."); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function addIncome() {
    if (!incForm.amount || !incForm.date) { toast("⚠️ Amount & Date required"); return; }
    setSaving(true);
    try {
      const row = { id: uid(), eventId: "durga2026", ...incForm, amount: parseFloat(incForm.amount) };
      await sheetAppend(TABS.INCOMES, row);
      setIncomes(prev => [...prev, row]);
      setShowInc(false);
      setIncForm({ type: INCOME_TYPES[0], amount: "", date: "", depositedTo: "", description: "" });
      toast("✅ Income saved!");
    } catch { toast("❌ Failed to save. Try again."); }
    setSaving(false);
  }

  async function addExpense() {
    if (!expForm.amount || !expForm.date) { toast("⚠️ Amount & Date required"); return; }
    setSaving(true);
    try {
      const row = { id: uid(), eventId: "durga2026", ...expForm, amount: parseFloat(expForm.amount) };
      await sheetAppend(TABS.EXPENSES, row);
      setExpenses(prev => [...prev, row]);
      setShowExp(false);
      setExpForm({ type: EXPENSE_TYPES[0], amount: "", date: "", description: "" });
      toast("✅ Expense saved!");
    } catch { toast("❌ Failed to save. Try again."); }
    setSaving(false);
  }

  async function delIncome(id) {
    if (!window.confirm("Delete this entry?")) return;
    try { await sheetDeleteRow(TABS.INCOMES, id); setIncomes(prev => prev.filter(i => i.id !== id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  async function delExpense(id) {
    if (!window.confirm("Delete this entry?")) return;
    try { await sheetDeleteRow(TABS.EXPENSES, id); setExpenses(prev => prev.filter(i => i.id !== id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  const totalInc = incomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalExp = expenses.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const cash = totalInc - totalExp;

  const groupBy = (arr, key) => arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + parseFloat(item.amount || 0);
    return acc;
  }, {});

  if (loading) return <div style={S.page}><button onClick={onBack} style={{ background: "none", border: "none", color: C.deepRed, cursor: "pointer", fontSize: 14, padding: "0 0 10px" }}>← Back</button><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.card, background: `linear-gradient(135deg,${C.deepRed},#6B0000)`, color: "#fff" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", marginBottom: 8, opacity: 0.85 }}>← Back to Events</button>
        <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontSize: 22, fontWeight: 700, color: C.gold }}>দুর্গা পূজা ২০২৬</div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Durga Puja 2026</div>
        {event && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>📅 {event.dateFrom} → {event.dateTo} | 📍 {event.venue}</div>}
        <span style={{ ...S.badge("#27AE60"), marginTop: 10, display: "inline-block" }}>✨ Upcoming</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {["info", "finance", "photos"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "11px 0", border: "none", background: tab === t ? C.deepRed : "transparent", color: tab === t ? "#fff" : C.muted, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 12 }}>
            {t === "info" ? "ℹ️ Info" : t === "finance" ? "₹ Finance" : "📸 Photos"}
          </button>
        ))}
      </div>

      {tab === "info" && event && (
        <div style={S.card}>
          <div style={S.sectionTitle}>About This Event</div>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, margin: 0 }}>{event.description}</p>
          <div style={S.divider} />
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.9 }}>
            <div><strong>Venue:</strong> {event.venue}</div>
            <div><strong>Dates:</strong> {event.dateFrom} to {event.dateTo}</div>
            {event.bankName && <div><strong>Bank:</strong> {event.bankName}</div>}
            {event.bankAccount && <div><strong>A/C No:</strong> {event.bankAccount}</div>}
            {event.notes && <div style={{ marginTop: 8, fontStyle: "italic" }}>📝 {event.notes}</div>}
          </div>
        </div>
      )}

      {tab === "finance" && (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[{ l: "Total Income", v: totalInc, c: C.success }, { l: "Total Expense", v: totalExp, c: C.danger }, { l: "Cash in Hand", v: cash, c: cash >= 0 ? C.success : C.danger }].map(x => (
              <div key={x.l} style={{ background: "#fff", borderRadius: 10, padding: 10, border: `1px solid ${x.c}44`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, lineHeight: 1.3 }}>{x.l}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: x.c }}>₹{fmt(x.v)}</div>
              </div>
            ))}
          </div>

          {/* Income */}
          <div style={S.card}>
            <div style={{ ...S.between, marginBottom: 10 }}>
              <div style={S.sectionTitle}>📥 Income / আয়</div>
              {isAdmin && <button style={S.btnSmall(C.success)} onClick={() => setShowInc(true)}>➕ Add</button>}
            </div>
            {Object.entries(groupBy(incomes, "type")).map(([type, total]) => (
              <div key={type} style={{ ...S.between, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: "#444" }}>{type}</span>
                <span style={S.amtGreen}>₹{fmt(total)}</span>
              </div>
            ))}
            {incomes.length === 0 && <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>No income entries yet.</div>}
            <div style={{ marginTop: 10 }}>
              {incomes.map(inc => (
                <div key={inc.id} style={{ background: "#F0FFF4", borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${C.success}33` }}>
                  <div style={S.between}>
                    <span style={S.tag}>{inc.type}</span>
                    {isAdmin && <button onClick={() => delIncome(inc.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>🗑</button>}
                  </div>
                  <div style={{ ...S.amtGreen, fontSize: 16, margin: "4px 0" }}>₹{fmt(inc.amount)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>📅 {inc.date}{inc.depositedTo ? ` | 👤 ${inc.depositedTo}` : ""}</div>
                  {inc.description && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>📝 {inc.description}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div style={S.card}>
            <div style={{ ...S.between, marginBottom: 10 }}>
              <div style={S.sectionTitle}>📤 Expense / ব্যয়</div>
              {isAdmin && <button style={S.btnSmall(C.danger)} onClick={() => setShowExp(true)}>➕ Add</button>}
            </div>
            {Object.entries(groupBy(expenses, "type")).map(([type, total]) => (
              <div key={type} style={{ ...S.between, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: "#444" }}>{type}</span>
                <span style={S.amtRed}>₹{fmt(total)}</span>
              </div>
            ))}
            {expenses.length === 0 && <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>No expense entries yet.</div>}
            <div style={{ marginTop: 10 }}>
              {expenses.map(exp => (
                <div key={exp.id} style={{ background: "#FFF5F5", borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${C.danger}33` }}>
                  <div style={S.between}>
                    <span style={S.tag}>{exp.type}</span>
                    {isAdmin && <button onClick={() => delExpense(exp.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>🗑</button>}
                  </div>
                  <div style={{ ...S.amtRed, fontSize: 16, margin: "4px 0" }}>₹{fmt(exp.amount)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>📅 {exp.date}</div>
                  {exp.description && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>📝 {exp.description}</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "photos" && (
        <div style={{ ...S.card, ...S.stub }}>
          <div style={{ fontSize: 50 }}>📸</div>
          <div style={{ fontWeight: 700, color: C.deepRed, marginTop: 10, fontSize: 15 }}>Photos Coming Soon</div>
          <div style={{ fontSize: 13, marginTop: 6, color: C.muted }}>Year-wise event photos will appear here. Admin can add later.</div>
        </div>
      )}

      {/* Income Modal */}
      <Modal open={showInc} onClose={() => setShowInc(false)} title="📥 Add Income Entry">
        <label style={S.label}>Income Type</label>
        <select style={S.select} value={incForm.type} onChange={e => setIncForm({ ...incForm, type: e.target.value })}>
          {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Amount (₹) *</label>
        <input style={S.input} type="number" value={incForm.amount} onChange={e => setIncForm({ ...incForm, amount: e.target.value })} placeholder="0" />
        <label style={S.label}>Date *</label>
        <input style={S.input} type="date" value={incForm.date} onChange={e => setIncForm({ ...incForm, date: e.target.value })} />
        <label style={S.label}>Deposited To (Person Name)</label>
        <input style={S.input} value={incForm.depositedTo} onChange={e => setIncForm({ ...incForm, depositedTo: e.target.value })} placeholder="Who received this amount..." />
        <label style={S.label}>Description / Comments</label>
        <textarea style={S.textarea} value={incForm.description} onChange={e => setIncForm({ ...incForm, description: e.target.value })} placeholder="Additional details, source name..." />
        <button style={S.btnPrimary} onClick={addIncome} disabled={saving}>{saving ? "Saving..." : "💾 Save Income"}</button>
      </Modal>

      {/* Expense Modal */}
      <Modal open={showExp} onClose={() => setShowExp(false)} title="📤 Add Expense Entry">
        <label style={S.label}>Expense Type</label>
        <select style={S.select} value={expForm.type} onChange={e => setExpForm({ ...expForm, type: e.target.value })}>
          {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Amount (₹) *</label>
        <input style={S.input} type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0" />
        <label style={S.label}>Date *</label>
        <input style={S.input} type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
        <label style={S.label}>Description / Comments</label>
        <textarea style={S.textarea} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} placeholder="What was this expense for..." />
        <button style={S.btnPrimary} onClick={addExpense} disabled={saving}>{saving ? "Saving..." : "💾 Save Expense"}</button>
      </Modal>
    </div>
  );
}

// ─── EVENTS PAGE ──────────────────────────────────────────────────────────────
function EventsPage({ isAdmin, setSubPage, toast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sheetRead(TABS.EVENTS).then(setEvents).catch(() => toast("⚠️ Could not load events.")).finally(() => setLoading(false));
  }, []);

  const OTHER_EVENTS = ["Kali Puja", "Holi", "Annual Picnic", "NabaBarsha"];

  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>🎉 Events / উৎসব</div>
      {events.map(ev => (
        <div key={ev.id} style={{ ...S.card, cursor: ev.id === "durga2026" ? "pointer" : "default" }}
          onClick={() => ev.id === "durga2026" && setSubPage("durga2026")}>
          <div style={S.between}>
            <div>
              <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontWeight: 700, color: C.deepRed, fontSize: 15 }}>{ev.nameBn}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{ev.name}</div>
            </div>
            <span style={S.badge(ev.status === "upcoming" ? "#27AE60" : C.saffron)}>
              {ev.status === "upcoming" ? "✨ Upcoming" : "Past"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>📅 {ev.dateFrom} | 📍 {ev.venue}</div>
          {ev.id === "durga2026" && <div style={{ fontSize: 12, color: C.saffron, marginTop: 4, fontWeight: 600 }}>Tap to view full details →</div>}
        </div>
      ))}
      <div style={{ ...S.card, border: `2px dashed ${C.border}`, background: "transparent", textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗓️</div>
        <strong style={{ fontSize: 14 }}>More Events Being Added</strong>
        <div style={{ marginTop: 8 }}>{OTHER_EVENTS.map(t => <span key={t} style={S.tag}>{t}</span>)}</div>
        <div style={{ fontSize: 11, marginTop: 8 }}>Admin can add new events from Admin Portal.</div>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, toast }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function login() {
    if (!form.username || !form.password) { setErr("Please enter both fields."); return; }
    setLoading(true);
    setErr("");
    try {
      const admins = await sheetRead(TABS.ADMINS);
      const found = admins.find(a => a.username === form.username && a.password === form.password);
      if (found) { onLogin(found); toast(`✅ Welcome, ${found.name || found.username}!`); }
      else setErr("Invalid username or password.");
    } catch { setErr("Could not connect. Check internet."); }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 20 }}>
        <div style={{ fontSize: 52 }}>🔐</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.deepRed, marginTop: 8 }}>Admin Login</div>
        <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontSize: 14, color: C.muted }}>অ্যাডমিন লগইন</div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Username / ইউজারনেম</label>
        <input style={S.input} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin1" autoComplete="off" />
        <label style={S.label}>Password / পাসওয়ার্ড</label>
        <input style={S.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && login()} />
        {err && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
        <button style={S.btnPrimary} onClick={login} disabled={loading}>{loading ? "Checking..." : "🔒 Login"}</button>
      </div>
      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14 }}>
        Contact your club admin for login credentials.
      </div>
    </div>
  );
}

// ─── SCRIPT URL SETUP ────────────────────────────────────────────────────────
function ScriptUrlSetup({ toast }) {
  const [url, setUrl] = useState(localStorage.getItem("ous_script_url") || "");
  const [saved, setSaved] = useState(!!localStorage.getItem("ous_script_url"));
  function save() {
    if (!url.includes("script.google.com")) { toast("⚠️ Paste the correct Apps Script URL"); return; }
    setScriptUrl(url); setSaved(true); toast("✅ Script URL saved! Writes now enabled.");
  }
  return (
    <div style={{ ...S.card, border: saved ? `1.5px solid ${C.success}` : `1.5px solid ${C.gold}`, background: saved ? "#F0FFF4" : "#FFFBF0" }}>
      <div style={{ fontWeight: 700, color: saved ? C.success : C.saffron, fontSize: 14, marginBottom: 8 }}>
        {saved ? "✅ Write: Connected" : "⚙️ Enable Write to Google Sheets"}
      </div>
      {!saved // ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────// ─── ADMIN PORTAL ───────────────────────────────────────────────────────────── <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Paste your Apps Script deployment URL to enable saving data.</div>}
      <input style={{ ...S.input, fontSize: 12 }} value={url} onChange={e => { setUrl(e.target.value); setSaved(false); }} placeholder="https://script.google.com/macros/s/..." />
      <button style={S.btnPrimary} onClick={save}>{saved ? "🔄 Update URL" : "💾 Save & Enable Writes"}</button>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ admin, onLogout, toast }) {
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMember, setShowMember] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mForm, setMForm] = useState({ name: "", nameBn: "", phone: "", email: "", address: "", joinDate: "", memberType: "General" });
  const [aForm, setAForm] = useState({ name: "", username: "", password: "", role: "admin" });

  useEffect(() => {
    Promise.all([sheetRead(TABS.MEMBERS), sheetRead(TABS.ADMINS)])
      .then(([m, a]) => { setMembers(m); setAdmins(a); })
      .catch(() => toast("⚠️ Could not load data."))
      .finally(() => setLoading(false));
  }, []);

  async function addMember() {
    if (!mForm.name) { toast("⚠️ Name is required"); return; }
    setSaving(true);
    try {
      const row = { id: "MBR" + uid(), ...mForm, createdAt: new Date().toISOString().split("T")[0] };
      await sheetAppend(TABS.MEMBERS, row);
      setMembers(prev => [...prev, row]);
      setShowMember(false);
      setMForm({ name: "", nameBn: "", phone: "", email: "", address: "", joinDate: "", memberType: "General" });
      toast("✅ Member added!");
    } catch { toast("❌ Failed to add member."); }
    setSaving(false);
  }

  async function delMember(id) {
    if (!window.confirm("Delete this member?")) return;
    try { await sheetDeleteRow(TABS.MEMBERS, id); setMembers(prev => prev.filter(m => m.id !== id)); toast("Member deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  async function addAdmin() {
    if (!aForm.username || !aForm.password) { toast("⚠️ Username & Password required"); return; }
    setSaving(true);
    try {
      const row = { id: "ADM" + uid(), ...aForm };
      await sheetAppend(TABS.ADMINS, row);
      setAdmins(prev => [...prev, row]);
      setShowAdmin(false);
      setAForm({ name: "", username: "", password: "", role: "admin" });
      toast("✅ Admin account created!");
    } catch { toast("❌ Failed to create admin."); }
    setSaving(false);
  }

  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.card, background: `linear-gradient(135deg,${C.darkBg},#2A0A00)`, color: "#fff" }}>
        <div style={S.between}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>🔐 Admin Portal</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>👤 {admin.name || admin.username} <span style={S.badge(C.saffron)}>{admin.role}</span></div>
          </div>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 12 }}>↩️ Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {["members", "admins", "info"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "11px 0", border: "none", background: tab === t ? C.deepRed : "transparent", color: tab === t ? "#fff" : C.muted, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 11 }}>
            {t === "members" ? "👥 Members" : t === "admins" ? "🔐 Admins" : "ℹ️ Info"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div style={S.card}>
          <div style={{ ...S.between, marginBottom: 12 }}>
            <div style={S.sectionTitle}>👥 Members ({members.length})</div>
            <button style={S.btnSmall()} onClick={() => setShowMember(true)}>➕ Add</button>
          </div>
          {members.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No members yet. Add your first member!</div>}
          {members.map(m => (
            <div key={m.id} style={{ background: "#FAFAFA", borderRadius: 9, padding: 11, marginBottom: 8, border: `1px solid ${C.border}` }}>
              <div style={S.between}>
                <div>
                  <div style={{ fontWeight: 700, color: C.deepRed }}>{m.name}</div>
                  {m.nameBn && <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontSize: 12, color: C.muted }}>{m.nameBn}</div>}
                </div>
                <div style={S.row}>
                  <span style={S.badge(C.saffron, "#fff")}>{m.id}</span>
                  <button onClick={() => delMember(m.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                {m.phone && <span>📞 {m.phone} </span>}
                <span style={S.tag}>{m.memberType || "General"}</span>
                {m.joinDate && <span>📅 {m.joinDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "admins" && (
        <div style={S.card}>
          <div style={{ ...S.between, marginBottom: 12 }}>
            <div style={S.sectionTitle}>🔐 Admin Accounts ({admins.length})</div>
            {admin.role === "superadmin" && <button style={S.btnSmall()} onClick={() => setShowAdmin(true)}>➕ Add</button>}
          </div>
          {admins.map(a => (
            <div key={a.id} style={{ background: "#FAFAFA", borderRadius: 9, padding: 11, marginBottom: 8, border: `1px solid ${C.border}` }}>
              <div style={S.between}>
                <div>
                  <div style={{ fontWeight: 700, color: C.deepRed }}>{a.name || a.username}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>@{a.username}</div>
                </div>
                <span style={S.badge(a.role === "superadmin" ? C.deepRed : C.saffron)}>{a.role}</span>
              </div>
            </div>
          ))}
          {admin.role !== "superadmin" && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>ℹ️ Only superadmin can manage admin accounts.</div>}
        </div>
      )}

      {tab === "info" && (
        <div>
          <ScriptUrlSetup toast={toast} />
          <div style={S.card}>
            <div style={S.sectionTitle}>ℹ️ Admin Guide</div>
            <div style={{ fontSize: 13, color: "#444", lineHeight: 2 }}>
              <div>• <strong>Club details</strong> — Edit from Home Page banner (✏️ Edit button)</div>
              <div>• <strong>Finance entries</strong> — Events → Durga Puja 2026 → Finance tab</div>
              <div>• <strong>Members</strong> — Manage here in Admin Portal</div>
              <div>• <strong>All data</strong> — Saved live to Google Sheets (shared with all admins)</div>
              <div>• <strong>Google Sheet</strong> — <a href="https://docs.google.com/spreadsheets/d/1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU" target="_blank" rel="noreferrer" style={{ color: C.saffron }}>OUS-Database ↗</a></div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal open={showMember} onClose={() => setShowMember(false)} title="👤 Add New Member">
        {[["name","Full Name *"],["nameBn","Bengali Name"],["phone","Phone Number"],["email","Email"],["address","Address"],["joinDate","Join Date"]].map(([f, l]) => (
          <div key={f}>
            <label style={S.label}>{l}</label>
            <input style={S.input} type={f === "joinDate" ? "date" : "text"} value={mForm[f] || ""} onChange={e => setMForm({ ...mForm, [f]: e.target.value })} />
          </div>
        ))}
        <label style={S.label}>Member Type</label>
        <select style={S.select} value={mForm.memberType} onChange={e => setMForm({ ...mForm, memberType: e.target.value })}>
          {["General", "Life", "Honorary", "Youth", "Patron"].map(t => <option key={t}>{t}</option>)}
        </select>
        <button style={S.btnPrimary} onClick={addMember} disabled={saving}>{saving ? "Saving..." : "💾 Save Member"}</button>
      </Modal>

      {/* Add Admin Modal */}
      <Modal open={showAdmin} onClose={() => setShowAdmin(false)} title="🔐 Add Admin Account">
        {[["name","Full Name"],["username","Username *"],["password","Password *"]].map(([f, l]) => (
          <div key={f}>
            <label style={S.label}>{l}</label>
            <input style={S.input} type={f === "password" ? "password" : "text"} value={aForm[f] || ""} onChange={e => setAForm({ ...aForm, [f]: e.target.value })} />
          </div>
        ))}
        <label style={S.label}>Role</label>
        <select style={S.select} value={aForm.role} onChange={e => setAForm({ ...aForm, role: e.target.value })}>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <button style={S.btnPrimary} onClick={addAdmin} disabled={saving}>{saving ? "Creating..." : "💾 Create Admin"}</button>
      </Modal>
    </div>
  );
}

// ─── STUB PAGES ───────────────────────────────────────────────────────────────
function StubPage({ icon, en, bn, desc }) {
  return (
    <div style={{ ...S.page, ...S.stub }}>
      <div style={{ fontSize: 58 }}>{icon}</div>
      <div style={{ fontWeight: 800, color: C.deepRed, fontSize: 18, marginTop: 12 }}>{en}</div>
      <div style={{ fontFamily: "'Hind Siliguri',sans-serif", color: C.muted, fontSize: 14, marginTop: 4 }}>{bn}</div>
      <p style={{ fontSize: 13, color: "#888", maxWidth: 260, margin: "14px auto 0", lineHeight: 1.6 }}>{desc}</p>
      <span style={{ ...S.badge(C.saffron), marginTop: 18, display: "inline-block" }}>🚧 Coming Soon</span>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [subPage, setSubPage] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [ready, setReady] = useState(false);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }, []);

  useEffect(() => {
    initSheets().then(() => setReady(true)).catch(() => {
      toast("⚠️ Google Sheets connection issue. Check API key and sheet sharing.");
      setReady(true);
    });
  }, []);

  function handleNav(key) { setPage(key); setSubPage(null); }

  const navItems = [
    { key: "home",       icon: "🏠", label: "Home" },
    { key: "events",     icon: "🎉", label: "Events" },
    { key: "meetings",   icon: "📋", label: "Meetings" },
    { key: "activities", icon: "🎭", label: "Activities" },
    { key: "admin",      icon: "🔐", label: "Admin" },
  ];

  const titles = {
    home: { en: "One Uday Sangha", bn: "উদয় সংঘ বার্তা" },
    events: { en: "Events", bn: "উৎসব" },
    meetings: { en: "Meetings", bn: "সভা" },
    activities: { en: "Activities", bn: "কার্যক্রম" },
    admin: { en: "Admin Portal", bn: "অ্যাডমিন" },
  };

  const title = titles[page] || titles.home;

  function renderPage() {
    if (!ready) return <div style={S.page}><Spinner text="Connecting to Google Sheets..." /></div>;
    if (page === "home") return <HomePage isAdmin={!!adminUser} setPage={handleNav} toast={toast} />;
    if (page === "events") {
      if (subPage === "durga2026") return <DurgaPujaPage isAdmin={!!adminUser} onBack={() => setSubPage(null)} toast={toast} />;
      return <EventsPage isAdmin={!!adminUser} setSubPage={setSubPage} toast={toast} />;
    }
    if (page === "meetings") return <StubPage icon="📋" en="Meetings History" bn="সভার ইতিহাস" desc="Meeting notes, attendees & minutes. Accessible to logged-in members. Coming soon." />;
    if (page === "activities") return <StubPage icon="🎭" en="Club Activities" bn="ক্লাব কার্যক্রম" desc="Sports, cultural programs & community activities. Coming soon." />;
    if (page === "admin") {
      if (!adminUser) return <AdminLogin onLogin={setAdminUser} toast={toast} />;
      return <AdminPortal admin={adminUser} onLogout={() => setAdminUser(null)} toast={toast} />;
    }
  }

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ fontFamily: "'Hind Siliguri',sans-serif", fontSize: 17, fontWeight: 700, color: C.gold }}>{title.bn}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>{title.en}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {adminUser && <span style={S.badge(C.gold, C.darkBg)}>ADMIN</span>}
          <span style={{ fontSize: 24 }}>🪔</span>
        </div>
      </div>

      {/* Page */}
      <div style={{ height: "calc(100vh - 58px)", overflowY: "auto" }}>
        {renderPage()}
      </div>

      {/* Bottom Nav */}
      <nav style={S.nav}>
        {navItems.map(item => (
          <button key={item.key} style={S.navBtn(page === item.key)} onClick={() => handleNav(item.key)}>
            <span style={{ fontSize: 19 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <Toast msg={toastMsg} />
    </div>
  );
}
