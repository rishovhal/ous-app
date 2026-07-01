import { useState, useEffect, useCallback, useRef } from "react";
import { sheetRead, sheetAppend, sheetDeleteRow, sheetUpdateRow, initSheets, TABS } from "./sheets";
import { uploadPhotoToDrive, OAUTH_CLIENT_ID } from "./drive";
import { OUS_Logo } from "./assets/OUS_Logo.png";

// ─── INCOME & EXPENSE TYPES ───────────────────────────────────────────────────
const INCOME_TYPES = [
  "Advertisement – Banner",
  "Advertisement – Bill",
  "Advertisement – Flex",
  "Advertisement – Others",
  "Membership",
  "Donation",
  "Outside Bill Collection",
  "Miscellaneous / Others",
];
const EXPENSE_TYPES = [
  "Light & Sound",
  "Idol",
  "Pandal and Decorators",
  "Puja Specific",
  "Ashtami Bhog",
  "Purohit",
  "Helper",
  "Dhaaki Foods",
  "Dhaaki",
  "Coolie",
  "Transports & Fare",
  "Miscellaneous",
];

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  saffron:"#E8640A", deepRed:"#B5180E", gold:"#D4AF37",
  cream:"#FDF6EC",   darkBg:"#1A0A00",  card:"#FFFFFF",
  muted:"#6B5B4E",   border:"#E8D5B0",  success:"#2E7D32", danger:"#C62828",
};
const S = {
  app:      { fontFamily:"'Poppins','Hind Siliguri',sans-serif", background:C.cream, minHeight:"100vh", maxWidth:480, margin:"0 auto" },
  header:   { background:`linear-gradient(135deg,${C.darkBg} 0%,#4A1000 60%,${C.deepRed} 100%)`, color:"#fff", padding:"14px 16px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 3px 12px rgba(0,0,0,0.4)" },
  page:     { padding:"14px 14px 90px" },
  card:     { background:C.card, borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 2px 10px rgba(0,0,0,0.07)", border:`1px solid ${C.border}` },
  secTitle: { fontSize:15, fontWeight:700, color:C.deepRed, marginBottom:12, borderBottom:`2px solid ${C.gold}`, paddingBottom:6 },
  label:    { fontSize:12, color:C.muted, marginBottom:3, fontWeight:600, display:"block" },
  input:    { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, marginBottom:10, boxSizing:"border-box", background:"#FAFAFA", outline:"none" },
  select:   { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, marginBottom:10, background:"#FAFAFA" },
  textarea: { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, marginBottom:10, boxSizing:"border-box", background:"#FAFAFA", minHeight:72, resize:"vertical" },
  btnPrimary:{ background:`linear-gradient(135deg,${C.deepRed},${C.saffron})`, color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%", marginTop:4 },
  btnSm:    (bg=C.saffron,fg="#fff")=>({ background:bg, color:fg, border:"none", borderRadius:7, padding:"7px 13px", fontSize:12, fontWeight:700, cursor:"pointer" }),
  badge:    (bg=C.saffron,fg="#fff")=>({ background:bg, color:fg, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-block" }),
  tag:      { background:"#FFF3E0", color:C.deepRed, border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 10px", fontSize:11, marginRight:4, marginBottom:4, display:"inline-block" },
  btwn:     { display:"flex", justifyContent:"space-between", alignItems:"center" },
  divider:  { borderTop:`1px solid ${C.border}`, margin:"12px 0" },
  green:    { color:C.success, fontWeight:800 },
  red:      { color:C.danger,  fontWeight:800 },
  nav:      { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.darkBg, display:"flex", borderTop:`2px solid ${C.saffron}`, zIndex:100 },
  navBtn:   (a)=>({ flex:1, padding:"9px 2px 7px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", color:a?C.gold:"#777", cursor:"pointer", fontSize:10, fontWeight:a?700:400 }),
  stub:     { textAlign:"center", padding:"50px 20px", color:C.muted },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid     = ()=> Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
const fmt     = (n)=> Number(n||0).toLocaleString("en-IN");
const sum     = (arr,key)=> arr.reduce((s,i)=>s+parseFloat(i[key]||0),0);
const groupSum= (arr,key)=> arr.reduce((acc,i)=>{ acc[i[key]]=(acc[i[key]]||0)+parseFloat(i.amount||0); return acc; },{});

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end" }}
         onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"20px 20px 0 0", padding:20, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ ...S.btwn, marginBottom:16 }}>
          <strong style={{ fontSize:15, color:C.deepRed }}>{title}</strong>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }) {
  if (!photo) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:500, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}
         onClick={onClose}>
      <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", fontSize:24, borderRadius:"50%", width:40, height:40, cursor:"pointer" }}>✕</button>
      <img src={photo.thumbUrl} alt={photo.caption||""} style={{ maxWidth:"95vw", maxHeight:"80vh", borderRadius:8, objectFit:"contain" }} onClick={e=>e.stopPropagation()} />
      {photo.caption && <div style={{ color:"#fff", marginTop:12, fontSize:13, textAlign:"center", padding:"0 20px" }}>{photo.caption}</div>}
      <a href={photo.viewUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
         style={{ marginTop:10, color:C.gold, fontSize:12, textDecoration:"underline" }}>Open full size in Drive ↗</a>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)", background:C.darkBg, color:"#fff", padding:"10px 22px", borderRadius:30, fontSize:13, zIndex:300, boxShadow:"0 4px 16px rgba(0,0,0,0.3)", whiteSpace:"nowrap", maxWidth:"90vw" }}>{msg}</div>;
}

function Spinner({ text="লোড হচ্ছে..." }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:50, gap:12, color:C.muted }}>
      <div style={{ width:36, height:36, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.saffron}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ fontSize:13 }}>{text}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── PHOTO GALLERY COMPONENT ─────────────────────────────────────────────────
function PhotoGallery({ eventId, eventName, isAdmin, toast }) {
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ year:"2026", caption:"" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef();

  const oauthReady = OAUTH_CLIENT_ID !== "PASTE_YOUR_OAUTH_CLIENT_ID_HERE";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await sheetRead(TABS.PHOTOS);
      setPhotos(all.filter(p => p.eventId === eventId));
    } catch { toast("⚠️ Could not load photos."); }
    setLoading(false);
  }, [eventId, toast]);

  useEffect(() => { load(); }, [load]);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("⚠️ Please select an image file."); return; }
    if (file.size > 15 * 1024 * 1024) { toast("⚠️ File too large. Max 15MB."); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) { toast("⚠️ Please select a photo first."); return; }
    if (!oauthReady)   { toast("⚠️ OAuth Client ID not set. See Admin Guide."); return; }
    setUploading(true);
    try {
      const result = await uploadPhotoToDrive(eventName, uploadForm.year, selectedFile);
      const row = {
        id: uid(),
        eventId,
        year:       uploadForm.year,
        caption:    uploadForm.caption,
        thumbUrl:   result.thumbUrl,
        viewUrl:    result.viewUrl,
        driveId:    result.id,
        uploadedAt: new Date().toISOString().split("T")[0],
      };
      await sheetAppend(TABS.PHOTOS, row);
      setPhotos(prev => [...prev, row]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadForm({ year:"2026", caption:"" });
      toast("✅ Photo uploaded successfully!");
    } catch(e) {
      toast("❌ Upload failed: " + e.message);
    }
    setUploading(false);
  }

  async function deletePhoto(photo) {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await sheetDeleteRow(TABS.PHOTOS, photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast("Photo deleted.");
    } catch { toast("❌ Delete failed."); }
  }

  const years    = [...new Set(photos.map(p => p.year))].sort((a,b)=>b-a);
  const filtered = yearFilter === "all" ? photos : photos.filter(p => p.year === yearFilter);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header Row */}
      <div style={{ ...S.btwn, marginBottom:12 }}>
        <div style={S.secTitle}>📸 Photos / ছবি</div>
        {isAdmin && (
          <button style={S.btnSm(C.saffron)} onClick={()=>setShowUploadModal(true)}>
            📤 Upload
          </button>
        )}
      </div>

      {/* OAuth Warning */}
      {isAdmin && !oauthReady && (
        <div style={{ background:"#FFF8E1", border:`1px solid ${C.gold}`, borderRadius:10, padding:12, marginBottom:12, fontSize:12, color:"#555" }}>
          ⚠️ <strong>OAuth Client ID not configured yet.</strong> Photo upload is disabled until you add your Client ID to <code>src/drive.js</code>. See Admin Guide for steps.
        </div>
      )}

      {/* Year filter tabs */}
      {years.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
          <button onClick={()=>setYearFilter("all")} style={S.btnSm(yearFilter==="all"?C.deepRed:C.border, yearFilter==="all"?"#fff":C.muted)}>All</button>
          {years.map(y=>(
            <button key={y} onClick={()=>setYearFilter(y)} style={S.btnSm(yearFilter===y?C.deepRed:C.border, yearFilter===y?"#fff":C.muted)}>{y}</button>
          ))}
        </div>
      )}

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"30px 20px", color:C.muted }}>
          <div style={{ fontSize:40 }}>📷</div>
          <div style={{ marginTop:10, fontSize:13 }}>
            {isAdmin ? "No photos yet. Tap Upload to add the first photo." : "No photos yet. Admin will add photos soon."}
          </div>
        </div>
      ) : (
        <>
          {/* Group by year */}
          {(yearFilter==="all" ? years : [yearFilter]).map(year => {
            const yearPhotos = filtered.filter(p=>p.year===year);
            if (!yearPhotos.length) return null;
            return (
              <div key={year}>
                <div style={{ fontSize:13, fontWeight:700, color:C.muted, marginBottom:8, marginTop:4 }}>📅 {year} ({yearPhotos.length} photos)</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:16 }}>
                  {yearPhotos.map(photo=>(
                    <div key={photo.id} style={{ position:"relative", aspectRatio:"1", borderRadius:8, overflow:"hidden", background:"#f0f0f0", cursor:"pointer" }}
                         onClick={()=>setLightbox(photo)}>
                      <img
                        src={photo.thumbUrl}
                        alt={photo.caption||"Event photo"}
                        style={{ width:"100%", height:"100%", objectFit:"cover" }}
                        loading="lazy"
                        onError={e=>{ e.target.style.display="none"; }}
                      />
                      {photo.caption && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:9, padding:"3px 5px", lineHeight:1.3 }}>
                          {photo.caption}
                        </div>
                      )}
                      {isAdmin && (
                        <button
                          onClick={e=>{ e.stopPropagation(); deletePhoto(photo); }}
                          style={{ position:"absolute", top:3, right:3, background:"rgba(198,40,40,0.85)", border:"none", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Upload Modal */}
      <Modal open={showUploadModal} onClose={()=>{ setShowUploadModal(false); setSelectedFile(null); setPreviewUrl(null); }} title="📤 Upload Photo">

        {/* File Picker */}
        <div
          style={{ border:`2px dashed ${selectedFile?C.success:C.border}`, borderRadius:12, padding:20, textAlign:"center", marginBottom:12, background: selectedFile?"#F0FFF4":"#FAFAFA", cursor:"pointer" }}
          onClick={()=>fileInputRef.current?.click()}>
          {previewUrl ? (
            <img src={previewUrl} alt="preview" style={{ maxHeight:160, maxWidth:"100%", borderRadius:8, objectFit:"contain" }} />
          ) : (
            <>
              <div style={{ fontSize:36 }}>📷</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:8 }}>Tap to choose photo</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>From camera, gallery, or files</div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display:"none" }}
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
            📄 {selectedFile.name} ({(selectedFile.size/1024/1024).toFixed(1)} MB)
            <button onClick={()=>{ setSelectedFile(null); setPreviewUrl(null); fileInputRef.current.value=""; }} style={{ marginLeft:8, background:"none", border:"none", color:C.danger, cursor:"pointer", fontSize:12 }}>Remove</button>
          </div>
        )}

        <label style={S.label}>Year / বছর</label>
        <select style={S.select} value={uploadForm.year} onChange={e=>setUploadForm({...uploadForm,year:e.target.value})}>
          {["2026","2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013","2012","2011","2010"].map(y=><option key={y}>{y}</option>)}
        </select>

        <label style={S.label}>Caption / বিবরণ (optional)</label>
        <input style={S.input} value={uploadForm.caption} onChange={e=>setUploadForm({...uploadForm,caption:e.target.value})} placeholder="e.g. Maha Ashtami 2026, Sindoor Khela..." />

        <div style={{ fontSize:11, color:C.muted, marginBottom:12, background:"#FFF8F0", borderRadius:8, padding:"8px 10px" }}>
          ℹ️ A Google sign-in popup will appear to authorise the upload to the Uday Sangha Drive folder.
        </div>

        <button style={S.btnPrimary} onClick={handleUpload} disabled={uploading||!selectedFile}>
          {uploading ? "Uploading to Drive..." : "📤 Upload to Google Drive"}
        </button>
      </Modal>

      {/* Lightbox */}
      <Lightbox photo={lightbox} onClose={()=>setLightbox(null)} />
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ isAdmin, setPage, toast }) {
  const [club,    setClub]    = useState(null);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const logoInputRef = useRef();

  useEffect(()=>{
    Promise.all([sheetRead(TABS.CLUB), sheetRead(TABS.EVENTS)])
      .then(([c,e])=>{ setClub(c[0]||{}); setEvents(e); })
      .catch(()=>toast("⚠️ Could not load. Check internet."))
      .finally(()=>setLoading(false));
  },[]);

  async function handleLogoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("⚠️ Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast("⚠️ File too large. Max 10MB."); return; }
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const { uploadPhotoToDrive } = await import("./drive");
      const result = await uploadPhotoToDrive("ClubLogo", "current", file);
      setForm(f => ({ ...f, photoUrl: result.thumbUrl }));
      toast("✅ Logo uploaded! Tap Save to apply.");
    } catch(e) { toast("❌ Logo upload failed: " + e.message); setLogoPreview(null); }
    setLogoUploading(false);
  }

  async function save() {
    setSaving(true);
    try { await sheetUpdateRow(TABS.CLUB,"club1",form); setClub(form); setEditing(false); setLogoPreview(null); toast("✅ Club details saved!"); }
    catch { toast("❌ Save failed."); }
    setSaving(false);
  }

  const upcoming = events.filter(e=>e.status==="upcoming");
  const navGrid  = [
    {key:"events",icon:"🎉",label:"Events / উৎসব"},
    {key:"meetings",icon:"📋",label:"Meetings / সভা"},
    {key:"activities",icon:"🎭",label:"Activities / কার্যক্রম"},
  ];

  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.card, background:`linear-gradient(160deg,${C.darkBg} 0%,#3A0800 50%,#6B1000 100%)`, color:"#fff", textAlign:"center", position:"relative", padding:"22px 16px 18px" }}>
        {club?.photoUrl
          ? <img src={club.photoUrl} alt="Club" style={{ width:82,height:82,borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.gold}`,marginBottom:10 }} />
          : <div style={{ width:82,height:82,borderRadius:"50%",background:`linear-gradient(135deg,${C.saffron},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:36,border:`3px solid ${C.gold}` }}>
            <img 
            src={OUS_Logo}
            alt="OUS Logo"
            style={{
              width: 20,
              height: 20,
              objectFit: "contain",
              verticalAlign: "middle",
              marginRight: 6,
            }}
            />
          </div>
        }
        <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontSize:22,fontWeight:700,color:C.gold }}>{club?.nameBn||"উদয় সংঘ ভাটপাড়া"}</div>
        <div style={{ fontSize:15,fontWeight:700,marginTop:2,opacity:0.95 }}>{club?.name||"Uday Sangha Bhatpara"}</div>
        <div style={{ fontSize:12,opacity:0.72,marginTop:5,letterSpacing:1 }}>
          Est. {club?.established||"1943"}
          {club?.regNo?<span style={{ marginLeft:10 }}>| Reg. No: {club.regNo}</span>:null}
        </div>
        {isAdmin && (
          <button onClick={()=>{setForm({...club});setEditing(true);}}
            style={{ position:"absolute",top:12,right:12,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:7,padding:"5px 11px",fontSize:12,cursor:"pointer" }}>
            ✏️ Edit
          </button>
        )}
      </div>

      <div style={S.card}>
        <div style={S.secTitle}>📍 Club Information</div>
        <div style={{ fontSize:13,color:"#444",lineHeight:2 }}>
          {club?.address && <div>📍 {club.address}</div>}
          {club?.phone   && <div>📞 {club.phone}</div>}
          {club?.email   && <div>📧 {club.email}</div>}
          {club?.about   && <div style={{ marginTop:8,fontStyle:"italic",color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:8 }}>"{club.about}"</div>}
        </div>
      </div>

      {upcoming.length>0&&(
        <div style={S.card}>
          <div style={S.secTitle}>🪔 Upcoming / আসন্ন উৎসব</div>
          {upcoming.map(ev=>(
            <div key={ev.id} style={{ background:"linear-gradient(90deg,#FFF8F0,#FFF3E0)",borderRadius:10,padding:12,marginBottom:8,border:`1px solid ${C.gold}` }}>
              <div style={S.btwn}>
                <div>
                  <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontWeight:700,color:C.deepRed,fontSize:15 }}>{ev.nameBn}</div>
                  <div style={{ fontSize:12,color:C.muted }}>{ev.name}</div>
                </div>
                <span style={S.badge("#27AE60")}>✨ Upcoming</span>
              </div>
              <div style={{ fontSize:12,color:C.muted,marginTop:6 }}>📅 {ev.dateFrom} → {ev.dateTo} | 📍 {ev.venue}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={S.secTitle}>🧭 Navigate / নেভিগেট</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
          {navGrid.map(item=>(
            <button key={item.key} onClick={()=>setPage(item.key)}
              style={{ background:`linear-gradient(135deg,${C.saffron}18,${C.deepRed}0A)`,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 8px",cursor:"pointer",textAlign:"center",fontSize:11,color:C.deepRed,fontWeight:600,lineHeight:1.4 }}>
              <div style={{ fontSize:26,marginBottom:5 }}>{item.icon}</div>{item.label}
            </button>
          ))}
        </div>
      </div>

      <Modal open={editing} onClose={()=>setEditing(false)} title="✏️ Edit Club Details">
        {[["name","Club Name (English)"],["nameBn","Club Name (Bengali)"],["established","Established Year"],["regNo","Registration No."],["address","Address"],["phone","Phone"],["email","Email"]].map(([f,l])=>(
          <div key={f}><label style={S.label}>{l}</label><input style={S.input} value={form[f]||""} onChange={e=>setForm({...form,[f]:e.target.value})} /></div>
        ))}
        <label style={S.label}>About the Club</label>
        <textarea style={S.textarea} value={form.about||""} onChange={e=>setForm({...form,about:e.target.value})} />
        <label style={S.label}>Club Logo / Profile Photo</label>
        <div style={{ border:`2px dashed ${logoPreview||form.photoUrl?C.success:C.border}`, borderRadius:10, padding:14, textAlign:"center", marginBottom:10, background: logoPreview||form.photoUrl?"#F0FFF4":"#FAFAFA", cursor:"pointer" }}
             onClick={()=>logoInputRef.current?.click()}>
          {logoPreview||form.photoUrl ? (
            <img src={logoPreview||form.photoUrl} alt="logo preview" style={{ width:80,height:80,borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.gold}` }} />
          ) : (
            <>
              <div style={{ fontSize:32 }}>🖼️</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:6 }}>Tap to upload club logo</div>
              <div style={{ fontSize:11,color:C.muted }}>From camera, gallery or files</div>
            </>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoSelect} />
        </div>
        {logoUploading && <div style={{ fontSize:12,color:C.saffron,marginBottom:8,textAlign:"center" }}>⏳ Uploading logo to Drive...</div>}
        {(logoPreview||form.photoUrl) && !logoUploading && (
          <div style={{ fontSize:11,color:C.muted,marginBottom:8,textAlign:"center" }}>
            ✅ Logo ready &nbsp;
            <button onClick={()=>{ setLogoPreview(null); setForm(f=>({...f,photoUrl:""})); logoInputRef.current.value=""; }}
              style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:11 }}>Remove</button>
          </div>
        )}
        <button style={S.btnPrimary} onClick={save} disabled={saving||logoUploading}>{saving?"Saving...":"💾 Save Changes"}</button>
      </Modal>
    </div>
  );
}

// ─── DURGA PUJA PAGE ──────────────────────────────────────────────────────────
function DurgaPujaPage({ isAdmin, onBack, toast }) {
  const [tab,   setTab]   = useState("info");
  const [event, setEvent] = useState(null);
  const [incs,  setIncs]  = useState([]);
  const [exps,  setExps]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showInc,  setShowInc]  = useState(false);
  const [showExp,  setShowExp]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const blankInc = { type:INCOME_TYPES[0], amount:"", date:"", depositedTo:"", description:"" };
  const blankExp = { type:EXPENSE_TYPES[0], amount:"", date:"", description:"" };
  const [incForm, setIncForm] = useState(blankInc);
  const [expForm, setExpForm] = useState(blankExp);

  const load = useCallback(async()=>{
    setLoading(true);
    // If non-admin somehow lands on finance tab, redirect to info
    if (!isAdmin && tab === "finance") setTab("info");
    try {
      const rows = isAdmin
        ? await Promise.all([sheetRead(TABS.EVENTS), sheetRead(TABS.INCOMES), sheetRead(TABS.EXPENSES)])
        : await Promise.all([sheetRead(TABS.EVENTS), Promise.resolve([]), Promise.resolve([])]);
      const [evRows, incRows, expRows] = rows;
      setEvent(evRows.find(e=>e.id==="durga2026")||null);
      setIncs(incRows.filter(r=>r.eventId==="durga2026"));
      setExps(expRows.filter(r=>r.eventId==="durga2026"));
    } catch { toast("⚠️ Could not load event data."); }
    setLoading(false);
  },[toast, isAdmin]);

  useEffect(()=>{ load(); },[load]);

  async function addIncome() {
    if (!incForm.amount||!incForm.date){ toast("⚠️ Amount & Date required"); return; }
    setSaving(true);
    try {
      const row = { id:uid(), eventId:"durga2026", ...incForm, amount:parseFloat(incForm.amount) };
      await sheetAppend(TABS.INCOMES, row);
      setIncs(p=>[...p,row]); setShowInc(false); setIncForm(blankInc);
      toast("✅ Income saved!");
    } catch(e){ toast("❌ "+e.message); }
    setSaving(false);
  }

  async function addExpense() {
    if (!expForm.amount||!expForm.date){ toast("⚠️ Amount & Date required"); return; }
    setSaving(true);
    try {
      const row = { id:uid(), eventId:"durga2026", ...expForm, amount:parseFloat(expForm.amount) };
      await sheetAppend(TABS.EXPENSES, row);
      setExps(p=>[...p,row]); setShowExp(false); setExpForm(blankExp);
      toast("✅ Expense saved!");
    } catch(e){ toast("❌ "+e.message); }
    setSaving(false);
  }

  async function delIncome(id) {
    if (!window.confirm("Delete?")) return;
    try { await sheetDeleteRow(TABS.INCOMES,id); setIncs(p=>p.filter(i=>i.id!==id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }
  async function delExpense(id) {
    if (!window.confirm("Delete?")) return;
    try { await sheetDeleteRow(TABS.EXPENSES,id); setExps(p=>p.filter(i=>i.id!==id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  const totalInc  = sum(incs,"amount");
  const totalExp  = sum(exps,"amount");
  const cash      = totalInc - totalExp;
  const incByType = groupSum(incs,"type");
  const expByType = groupSum(exps,"type");

  if (loading) return <div style={S.page}><button onClick={onBack} style={{ background:"none",border:"none",color:C.deepRed,cursor:"pointer",fontSize:14 }}>← Back</button><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.card, background:`linear-gradient(135deg,${C.deepRed},#6B0000)`, color:"#fff" }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:"#fff",fontSize:13,cursor:"pointer",marginBottom:8,opacity:0.85 }}>← Back to Events</button>
        <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontSize:22,fontWeight:700,color:C.gold }}>দুর্গা পূজা ২০২৬</div>
        <div style={{ fontSize:14,opacity:0.9 }}>Durga Puja 2026</div>
        {event&&<div style={{ fontSize:12,opacity:0.75,marginTop:6 }}>📅 {event.dateFrom} → {event.dateTo} | 📍 {event.venue}</div>}
        <span style={{ ...S.badge("#27AE60"),marginTop:10,display:"inline-block" }}>✨ Upcoming</span>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:12 }}>
        {(isAdmin?["info","finance","photos"]:["info","photos"]).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1,padding:"11px 0",border:"none",background:tab===t?C.deepRed:"transparent",color:tab===t?"#fff":C.muted,fontWeight:tab===t?700:400,cursor:"pointer",fontSize:12 }}>
            {t==="info"?"ℹ️ Info":t==="finance"?"₹ Finance":"📸 Photos"}
          </button>
        ))}
      </div>

      {tab==="info"&&event&&(
        <div style={S.card}>
          <div style={S.secTitle}>About This Event</div>
          <p style={{ fontSize:13,color:"#444",lineHeight:1.7,margin:0 }}>{event.description}</p>
          <div style={S.divider} />
          <div style={{ fontSize:13,color:C.muted,lineHeight:1.9 }}>
            <div><strong>Venue:</strong> {event.venue}</div>
            <div><strong>Dates:</strong> {event.dateFrom} to {event.dateTo}</div>
            {event.bankName&&<div><strong>Bank:</strong> {event.bankName}</div>}
            {event.bankAccount&&<div><strong>A/C:</strong> {event.bankAccount}</div>}
            {event.notes&&<div style={{ marginTop:8,fontStyle:"italic" }}>📝 {event.notes}</div>}
          </div>
        </div>
      )}

      {tab==="finance"&&isAdmin&&(
        <>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
            {[{l:"Income",v:totalInc,c:C.success},{l:"Expense",v:totalExp,c:C.danger},{l:"Cash in Hand",v:cash,c:cash>=0?C.success:C.danger}].map(x=>(
              <div key={x.l} style={{ background:"#fff",borderRadius:10,padding:10,border:`1px solid ${x.c}44`,textAlign:"center" }}>
                <div style={{ fontSize:10,color:C.muted,marginBottom:3 }}>{x.l}</div>
                <div style={{ fontSize:15,fontWeight:800,color:x.c }}>₹{fmt(x.v)}</div>
              </div>
            ))}
          </div>

          {/* INCOME */}
          <div style={S.card}>
            <div style={{ ...S.btwn,marginBottom:10 }}>
              <div style={S.secTitle}>📥 Income / আয়</div>
              {isAdmin&&<button style={S.btnSm(C.success)} onClick={()=>{setIncForm(blankInc);setShowInc(true);}}>➕ Add Income</button>}
            </div>
            {Object.keys(incByType).length>0&&(
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5 }}>Category Totals</div>
                {Object.entries(incByType).map(([type,total])=>(
                  <div key={type} style={{ ...S.btwn,padding:"5px 0",borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:12,color:"#444" }}>{type}</span>
                    <span style={{ ...S.green,fontSize:13 }}>₹{fmt(total)}</span>
                  </div>
                ))}
                <div style={{ ...S.btwn,padding:"8px 0",marginTop:4 }}>
                  <span style={{ fontSize:13,fontWeight:700 }}>Grand Total</span>
                  <span style={{ ...S.green,fontSize:15 }}>₹{fmt(totalInc)}</span>
                </div>
              </div>
            )}
            {incs.length===0
              ?<div style={{ color:C.muted,fontSize:13,padding:"8px 0",textAlign:"center" }}>No income entries yet.{isAdmin?" Tap Add Income to start.":""}</div>
              :incs.map(inc=>(
                <div key={inc.id} style={{ background:"#F0FFF4",borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.success}33` }}>
                  <div style={S.btwn}>
                    <span style={S.tag}>{inc.type}</span>
                    {isAdmin&&<button onClick={()=>delIncome(inc.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:18 }}>🗑</button>}
                  </div>
                  <div style={{ ...S.green,fontSize:17,margin:"5px 0" }}>₹{fmt(inc.amount)}</div>
                  <div style={{ fontSize:11,color:C.muted }}>📅 {inc.date}{inc.depositedTo&&<span> | 👤 <strong>{inc.depositedTo}</strong></span>}</div>
                  {inc.description&&<div style={{ fontSize:11,color:"#555",marginTop:4 }}>📝 {inc.description}</div>}
                </div>
              ))
            }
          </div>

          {/* EXPENSE */}
          <div style={S.card}>
            <div style={{ ...S.btwn,marginBottom:10 }}>
              <div style={S.secTitle}>📤 Expense / ব্যয়</div>
              {isAdmin&&<button style={S.btnSm(C.danger)} onClick={()=>{setExpForm(blankExp);setShowExp(true);}}>➕ Add Expense</button>}
            </div>
            {Object.keys(expByType).length>0&&(
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5 }}>Category Totals</div>
                {Object.entries(expByType).map(([type,total])=>(
                  <div key={type} style={{ ...S.btwn,padding:"5px 0",borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:12,color:"#444" }}>{type}</span>
                    <span style={{ ...S.red,fontSize:13 }}>₹{fmt(total)}</span>
                  </div>
                ))}
                <div style={{ ...S.btwn,padding:"8px 0",marginTop:4 }}>
                  <span style={{ fontSize:13,fontWeight:700 }}>Grand Total</span>
                  <span style={{ ...S.red,fontSize:15 }}>₹{fmt(totalExp)}</span>
                </div>
              </div>
            )}
            {exps.length===0
              ?<div style={{ color:C.muted,fontSize:13,padding:"8px 0",textAlign:"center" }}>No expense entries yet.{isAdmin?" Tap Add Expense to start.":""}</div>
              :exps.map(exp=>(
                <div key={exp.id} style={{ background:"#FFF5F5",borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.danger}33` }}>
                  <div style={S.btwn}>
                    <span style={S.tag}>{exp.type}</span>
                    {isAdmin&&<button onClick={()=>delExpense(exp.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:18 }}>🗑</button>}
                  </div>
                  <div style={{ ...S.red,fontSize:17,margin:"5px 0" }}>₹{fmt(exp.amount)}</div>
                  <div style={{ fontSize:11,color:C.muted }}>📅 {exp.date}</div>
                  {exp.description&&<div style={{ fontSize:11,color:"#555",marginTop:4 }}>📝 {exp.description}</div>}
                </div>
              ))
            }
          </div>
        </>
      )}

      {tab==="photos"&&(
        <div style={S.card}>
          <PhotoGallery eventId="durga2026" eventName="DurgaPuja" isAdmin={isAdmin} toast={toast} />
        </div>
      )}

      {/* Income Modal */}
      <Modal open={showInc} onClose={()=>setShowInc(false)} title="📥 Add Income Entry">
        <label style={S.label}>Income Type *</label>
        <select style={S.select} value={incForm.type} onChange={e=>setIncForm({...incForm,type:e.target.value})}>
          {INCOME_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Amount (₹) *</label>
        <input style={S.input} type="number" min="0" value={incForm.amount} onChange={e=>setIncForm({...incForm,amount:e.target.value})} placeholder="0" />
        <label style={S.label}>Date *</label>
        <input style={S.input} type="date" value={incForm.date} onChange={e=>setIncForm({...incForm,date:e.target.value})} />
        <label style={S.label}>Deposited To (Person Name)</label>
        <input style={S.input} value={incForm.depositedTo} onChange={e=>setIncForm({...incForm,depositedTo:e.target.value})} placeholder="Who received this amount..." />
        <label style={S.label}>Description / Comments</label>
        <textarea style={S.textarea} value={incForm.description} onChange={e=>setIncForm({...incForm,description:e.target.value})} placeholder="Source, advertiser name, donor name..." />
        <button style={S.btnPrimary} onClick={addIncome} disabled={saving}>{saving?"Saving...":"💾 Save Income"}</button>
      </Modal>

      {/* Expense Modal */}
      <Modal open={showExp} onClose={()=>setShowExp(false)} title="📤 Add Expense Entry">
        <label style={S.label}>Expense Type *</label>
        <select style={S.select} value={expForm.type} onChange={e=>setExpForm({...expForm,type:e.target.value})}>
          {EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Amount (₹) *</label>
        <input style={S.input} type="number" min="0" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} placeholder="0" />
        <label style={S.label}>Date *</label>
        <input style={S.input} type="date" value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} />
        <label style={S.label}>Description / Comments</label>
        <textarea style={S.textarea} value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder="Vendor name, receipt details..." />
        <button style={S.btnPrimary} onClick={addExpense} disabled={saving}>{saving?"Saving...":"💾 Save Expense"}</button>
      </Modal>
    </div>
  );
}

// ─── EVENTS PAGE ──────────────────────────────────────────────────────────────
function EventsPage({ isAdmin, setSubPage, toast }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const EVENT_TYPES = ["Durga Puja","Kali Puja","Holi","Annual Picnic","NabaBarsha","Other"];
  const blank = { name:"", nameBn:"", type:EVENT_TYPES[0], year:new Date().getFullYear().toString(), status:"upcoming", dateFrom:"", dateTo:"", venue:"", description:"", bankAccount:"", bankName:"", notes:"" };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    sheetRead(TABS.EVENTS).then(setEvents).catch(()=>toast("⚠️ Could not load events.")).finally(()=>setLoading(false));
  },[]);

  async function addEvent() {
    if (!form.name||!form.dateFrom) { toast("⚠️ Name & Start Date required"); return; }
    setSaving(true);
    try {
      const row = { id:"EVT"+uid(), ...form };
      await sheetAppend(TABS.EVENTS, row);
      setEvents(p=>[...p,row]); setShowAdd(false); setForm(blank);
      toast("✅ Event added!");
    } catch(e) { toast("❌ "+e.message); }
    setSaving(false);
  }

  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.btwn, marginBottom:12 }}>
        <div style={S.secTitle}>🎉 Events / উৎসব</div>
        {isAdmin && <button style={S.btnSm()} onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add Event</button>}
      </div>
      {events.map(ev=>(
        <div key={ev.id} style={{ ...S.card, cursor:"pointer" }}
          onClick={()=>ev.id==="durga2026"&&setSubPage("durga2026")}>
          <div style={S.btwn}>
            <div>
              <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontWeight:700,color:C.deepRed,fontSize:15 }}>{ev.nameBn||ev.name}</div>
              <div style={{ fontSize:12,color:C.muted }}>{ev.name}</div>
            </div>
            <span style={S.badge(ev.status==="upcoming"?"#27AE60":C.saffron)}>{ev.status==="upcoming"?"✨ Upcoming":"✔ Past"}</span>
          </div>
          <div style={{ fontSize:12,color:C.muted,marginTop:6 }}>📅 {ev.dateFrom}{ev.dateTo?" → "+ev.dateTo:""} | 📍 {ev.venue}</div>
          {ev.id==="durga2026"&&<div style={{ fontSize:12,color:C.saffron,marginTop:4,fontWeight:600 }}>Tap to view details, finance & photos →</div>}
        </div>
      ))}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🎉 Add New Event">
        <label style={S.label}>Event Name (English) *</label>
        <input style={S.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Kali Puja 2026" />
        <label style={S.label}>Event Name (Bengali)</label>
        <input style={S.input} value={form.nameBn} onChange={e=>setForm({...form,nameBn:e.target.value})} placeholder="e.g. কালী পূজা ২০২৬" />
        <label style={S.label}>Event Type</label>
        <select style={S.select} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
          {EVENT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Year</label>
        <input style={S.input} value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="2026" />
        <label style={S.label}>Status</label>
        <select style={S.select} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <label style={S.label}>Start Date *</label>
        <input style={S.input} type="date" value={form.dateFrom} onChange={e=>setForm({...form,dateFrom:e.target.value})} />
        <label style={S.label}>End Date</label>
        <input style={S.input} type="date" value={form.dateTo} onChange={e=>setForm({...form,dateTo:e.target.value})} />
        <label style={S.label}>Venue</label>
        <input style={S.input} value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} placeholder="Club Pandal, Bhatpara" />
        <label style={S.label}>Description</label>
        <textarea style={S.textarea} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
        <label style={S.label}>Bank Name</label>
        <input style={S.input} value={form.bankName} onChange={e=>setForm({...form,bankName:e.target.value})} />
        <label style={S.label}>Bank Account No.</label>
        <input style={S.input} value={form.bankAccount} onChange={e=>setForm({...form,bankAccount:e.target.value})} />
        <button style={S.btnPrimary} onClick={addEvent} disabled={saving}>{saving?"Saving...":"💾 Save Event"}</button>
      </Modal>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, toast }) {
  const [form,setForm]=useState({username:"",password:""});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  async function login() {
    if (!form.username||!form.password){setErr("Please enter both fields.");return;}
    setLoading(true);setErr("");
    try {
      const admins=await sheetRead(TABS.ADMINS);
      const found=admins.find(a=>a.username===form.username&&a.password===form.password);
      if(found){onLogin(found);toast(`✅ Welcome, ${found.name||found.username}!`);}
      else setErr("Invalid username or password.");
    } catch {setErr("Could not connect. Check internet.");}
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={{ textAlign:"center",marginBottom:28,paddingTop:20 }}>
        <div style={{ fontSize:52 }}>🔐</div>
        <div style={{ fontSize:20,fontWeight:800,color:C.deepRed,marginTop:8 }}>Admin Login</div>
        <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontSize:14,color:C.muted }}>অ্যাডমিন লগইন</div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Username</label>
        <input style={S.input} value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="admin1" autoComplete="off" />
        <label style={S.label}>Password</label>
        <input style={S.input} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&login()} />
        {err&&<div style={{ color:C.danger,fontSize:13,marginBottom:8 }}>⚠️ {err}</div>}
        <button style={S.btnPrimary} onClick={login} disabled={loading}>{loading?"Checking...":"🔒 Login"}</button>
      </div>
      <div style={{ fontSize:11,color:C.muted,textAlign:"center",marginTop:14 }}>Contact your club admin for credentials.</div>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ admin, onLogout, toast, setPage, setSubPage }) {
  const [tab,setTab]=useState("members");
  const [members,setMembers]=useState([]);
  const [admins,setAdmins]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showMember,setShowMember]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [saving,setSaving]=useState(false);
  const blankM={name:"",nameBn:"",phone:"",email:"",address:"",joinDate:"",memberType:"General"};
  const blankA={name:"",username:"",password:"",role:"admin"};
  const [mForm,setMForm]=useState(blankM);
  const [aForm,setAForm]=useState(blankA);

  useEffect(()=>{
    Promise.all([sheetRead(TABS.MEMBERS),sheetRead(TABS.ADMINS)])
      .then(([m,a])=>{setMembers(m);setAdmins(a);})
      .catch(()=>toast("⚠️ Could not load data."))
      .finally(()=>setLoading(false));
  },[]);

  async function addMember(){
    if(!mForm.name){toast("⚠️ Name required");return;}
    setSaving(true);
    try {
      const row={id:"MBR"+uid(),...mForm,createdAt:new Date().toISOString().split("T")[0]};
      await sheetAppend(TABS.MEMBERS,row);
      setMembers(p=>[...p,row]);setShowMember(false);setMForm(blankM);
      toast("✅ Member added!");
    } catch(e){toast("❌ "+e.message);}
    setSaving(false);
  }

  async function delMember(id){
    if(!window.confirm("Delete this member?"))return;
    try{await sheetDeleteRow(TABS.MEMBERS,id);setMembers(p=>p.filter(m=>m.id!==id));toast("Deleted.");}
    catch{toast("❌ Delete failed.");}
  }

  async function addAdmin(){
    if(!aForm.username||!aForm.password){toast("⚠️ Username & Password required");return;}
    setSaving(true);
    try {
      const row={id:"ADM"+uid(),...aForm};
      await sheetAppend(TABS.ADMINS,row);
      setAdmins(p=>[...p,row]);setShowAdmin(false);setAForm(blankA);
      toast("✅ Admin created!");
    } catch(e){toast("❌ "+e.message);}
    setSaving(false);
  }

  if(loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.card,background:`linear-gradient(135deg,${C.darkBg},#2A0A00)`,color:"#fff" }}>
        <div style={S.btwn}>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:C.gold }}>🔐 Admin Portal</div>
            <div style={{ fontSize:12,opacity:0.8,marginTop:2 }}>👤 {admin.name||admin.username} &nbsp;<span style={S.badge(C.saffron)}>{admin.role}</span></div>
          </div>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:7,padding:"7px 14px",cursor:"pointer",fontSize:12 }}>↩️ Logout</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
        <button onClick={()=>{setPage("events");setSubPage("durga2026");}}
          style={{ background:`linear-gradient(135deg,${C.deepRed}22,${C.saffron}11)`,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 10px",cursor:"pointer",textAlign:"center",fontSize:12,color:C.deepRed,fontWeight:700 }}>
          <div style={{ fontSize:24,marginBottom:4 }}>₹</div>Finance / Photos<br/><span style={{ fontSize:10,fontWeight:400,color:C.muted }}>Durga Puja 2026</span>
        </button>
        <button onClick={()=>setTab("members")}
          style={{ background:`linear-gradient(135deg,${C.success}22,${C.success}11)`,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 10px",cursor:"pointer",textAlign:"center",fontSize:12,color:C.success,fontWeight:700 }}>
          <div style={{ fontSize:24,marginBottom:4 }}>👥</div>Add Member<br/><span style={{ fontSize:10,fontWeight:400,color:C.muted }}>Manage members</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:12 }}>
        {["members","admins","guide"].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1,padding:"11px 0",border:"none",background:tab===t?C.deepRed:"transparent",color:tab===t?"#fff":C.muted,fontWeight:tab===t?700:400,cursor:"pointer",fontSize:11 }}>
            {t==="members"?"👥 Members":t==="admins"?"🔐 Admins":"📖 Guide"}
          </button>
        ))}
      </div>

      {tab==="members"&&(
        <div style={S.card}>
          <div style={{ ...S.btwn,marginBottom:12 }}>
            <div style={S.secTitle}>👥 Members ({members.length})</div>
            <button style={S.btnSm()} onClick={()=>{setMForm(blankM);setShowMember(true);}}>➕ Add</button>
          </div>
          {members.length===0&&<div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:16 }}>No members yet. Tap ➕ Add to begin.</div>}
          {members.map(m=>(
            <div key={m.id} style={{ background:"#FAFAFA",borderRadius:9,padding:11,marginBottom:8,border:`1px solid ${C.border}` }}>
              <div style={S.btwn}>
                <div>
                  <div style={{ fontWeight:700,color:C.deepRed }}>{m.name}</div>
                  {m.nameBn&&<div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontSize:12,color:C.muted }}>{m.nameBn}</div>}
                </div>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  <span style={S.badge(C.saffron)}>{m.id}</span>
                  <button onClick={()=>delMember(m.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:18 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize:11,color:C.muted,marginTop:5 }}>
                {m.phone&&<span>📞 {m.phone} &nbsp;</span>}
                <span style={S.tag}>{m.memberType||"General"}</span>
                {m.joinDate&&<span>📅 {m.joinDate}</span>}
              </div>
              {m.address&&<div style={{ fontSize:11,color:C.muted }}>📍 {m.address}</div>}
            </div>
          ))}
        </div>
      )}

      {tab==="admins"&&(
        <div style={S.card}>
          <div style={{ ...S.btwn,marginBottom:12 }}>
            <div style={S.secTitle}>🔐 Admin Accounts ({admins.length})</div>
            {admin.role==="superadmin"&&<button style={S.btnSm()} onClick={()=>{setAForm(blankA);setShowAdmin(true);}}>➕ Add</button>}
          </div>
          {admins.map(a=>(
            <div key={a.id} style={{ background:"#FAFAFA",borderRadius:9,padding:11,marginBottom:8,border:`1px solid ${C.border}` }}>
              <div style={S.btwn}>
                <div>
                  <div style={{ fontWeight:700,color:C.deepRed }}>{a.name||a.username}</div>
                  <div style={{ fontSize:12,color:C.muted }}>@{a.username}</div>
                </div>
                <span style={S.badge(a.role==="superadmin"?C.deepRed:C.saffron)}>{a.role}</span>
              </div>
            </div>
          ))}
          {admin.role!=="superadmin"&&<div style={{ fontSize:12,color:C.muted,marginTop:8 }}>ℹ️ Only superadmin can manage admin accounts.</div>}
        </div>
      )}

      {tab==="guide"&&(
        <div style={S.card}>
          <div style={S.secTitle}>📖 Admin Guide</div>
          <div style={{ fontSize:13,color:"#444",lineHeight:2.1 }}>
            <div>📸 <strong>Upload Photos</strong><br/>&nbsp;&nbsp;→ Events → Durga Puja → Photos tab → Upload<br/>&nbsp;&nbsp;→ Pick from camera, gallery, or files<br/>&nbsp;&nbsp;→ Google sign-in popup will appear (use oneudaysangha@gmail.com)</div>
            <div style={S.divider}/>
            <div>💰 <strong>Add Income/Expense</strong><br/>&nbsp;&nbsp;→ Events → Durga Puja 2026 → Finance tab</div>
            <div style={S.divider}/>
            <div>👥 <strong>Add Members</strong><br/>&nbsp;&nbsp;→ Members tab above</div>
            <div style={S.divider}/>
            <div>🏠 <strong>Edit Club Details</strong><br/>&nbsp;&nbsp;→ Home Page → ✏️ Edit</div>
            <div style={S.divider}/>
            <div>🔑 <strong>Change Passwords</strong><br/>&nbsp;&nbsp;→ Edit in Google Sheet → Admins tab directly</div>
            <div style={S.divider}/>
            <div>⚙️ <strong>Enable Photo Upload (one-time setup)</strong><br/>&nbsp;&nbsp;→ Need OAuth Client ID in <code>src/drive.js</code><br/>&nbsp;&nbsp;→ console.cloud.google.com → Credentials → OAuth 2.0 Client ID (Web)<br/>&nbsp;&nbsp;→ Add your GitHub Pages URL as authorised origin<br/>&nbsp;&nbsp;→ Paste Client ID into drive.js → push to GitHub</div>
            <div style={S.divider}/>
            <div>📊 <strong>View Raw Data</strong><br/>&nbsp;&nbsp;→ <a href="https://docs.google.com/spreadsheets/d/1VAM7ajyEg7J99zbBScthfFkXyncdCZ29ceLSF6OZFqU" target="_blank" rel="noreferrer" style={{ color:C.saffron }}>Open OUS-Database ↗</a></div>
          </div>
        </div>
      )}

      <Modal open={showMember} onClose={()=>setShowMember(false)} title="👤 Add New Member">
        {[["name","Full Name *"],["nameBn","Bengali Name"],["phone","Phone"],["email","Email"],["address","Address"],["joinDate","Join Date"]].map(([f,l])=>(
          <div key={f}><label style={S.label}>{l}</label><input style={S.input} type={f==="joinDate"?"date":"text"} value={mForm[f]||""} onChange={e=>setMForm({...mForm,[f]:e.target.value})} /></div>
        ))}
        <label style={S.label}>Member Type</label>
        <select style={S.select} value={mForm.memberType} onChange={e=>setMForm({...mForm,memberType:e.target.value})}>
          {["General","Life","Honorary","Youth","Patron"].map(t=><option key={t}>{t}</option>)}
        </select>
        <button style={S.btnPrimary} onClick={addMember} disabled={saving}>{saving?"Saving...":"💾 Save Member"}</button>
      </Modal>

      <Modal open={showAdmin} onClose={()=>setShowAdmin(false)} title="🔐 Add Admin Account">
        {[["name","Full Name"],["username","Username *"],["password","Password *"]].map(([f,l])=>(
          <div key={f}><label style={S.label}>{l}</label><input style={S.input} type={f==="password"?"password":"text"} value={aForm[f]||""} onChange={e=>setAForm({...aForm,[f]:e.target.value})} /></div>
        ))}
        <label style={S.label}>Role</label>
        <select style={S.select} value={aForm.role} onChange={e=>setAForm({...aForm,role:e.target.value})}>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <button style={S.btnPrimary} onClick={addAdmin} disabled={saving}>{saving?"Creating...":"💾 Create Admin"}</button>
      </Modal>
    </div>
  );
}

// ─── MEMBERS PAGE (public view) ──────────────────────────────────────────────
function MembersPage({ isAdmin, toast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const blank = { name:"", nameBn:"", phone:"", email:"", address:"", joinDate:"", memberType:"General" };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    sheetRead(TABS.MEMBERS).then(setMembers).catch(()=>toast("⚠️ Could not load members.")).finally(()=>setLoading(false));
  },[]);

  async function addMember() {
    if (!form.name) { toast("⚠️ Name required"); return; }
    setSaving(true);
    try {
      const row = { id:"MBR"+uid(), ...form, createdAt: new Date().toISOString().split("T")[0] };
      await sheetAppend(TABS.MEMBERS, row);
      setMembers(p=>[...p,row]); setShowAdd(false); setForm(blank);
      toast("✅ Member added!");
    } catch(e) { toast("❌ "+e.message); }
    setSaving(false);
  }

  async function delMember(id) {
    if (!window.confirm("Delete this member?")) return;
    try { await sheetDeleteRow(TABS.MEMBERS,id); setMembers(p=>p.filter(m=>m.id!==id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  const types = ["General","Life","Honorary","Youth","Patron"];
  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.btwn, marginBottom:12 }}>
        <div style={S.secTitle}>👥 Members / সদস্য ({members.length})</div>
        {isAdmin && <button style={S.btnSm()} onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add</button>}
      </div>
      {members.length===0 && <div style={{ ...S.card, textAlign:"center", color:C.muted, padding:30 }}>No members yet.</div>}
      {members.map(m=>(
        <div key={m.id} style={S.card}>
          <div style={S.btwn}>
            <div>
              <div style={{ fontWeight:700, color:C.deepRed }}>{m.name}</div>
              {m.nameBn && <div style={{ fontFamily:"'Hind Siliguri',sans-serif", fontSize:12, color:C.muted }}>{m.nameBn}</div>}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={S.badge(C.saffron)}>{m.id}</span>
              {isAdmin && <button onClick={()=>delMember(m.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:18 }}>🗑</button>}
            </div>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>
            {m.phone && <span>📞 {m.phone} &nbsp;</span>}
            <span style={S.tag}>{m.memberType||"General"}</span>
            {m.joinDate && <span>📅 {m.joinDate}</span>}
          </div>
          {m.address && <div style={{ fontSize:11, color:C.muted }}>📍 {m.address}</div>}
        </div>
      ))}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="👤 Add New Member">
        {[["name","Full Name *"],["nameBn","Bengali Name"],["phone","Phone"],["email","Email"],["address","Address"],["joinDate","Join Date"]].map(([f,l])=>(
          <div key={f}><label style={S.label}>{l}</label><input style={S.input} type={f==="joinDate"?"date":"text"} value={form[f]||""} onChange={e=>setForm({...form,[f]:e.target.value})} /></div>
        ))}
        <label style={S.label}>Member Type</label>
        <select style={S.select} value={form.memberType} onChange={e=>setForm({...form,memberType:e.target.value})}>
          {types.map(t=><option key={t}>{t}</option>)}
        </select>
        <button style={S.btnPrimary} onClick={addMember} disabled={saving}>{saving?"Saving...":"💾 Save Member"}</button>
      </Modal>
    </div>
  );
}

// ─── MEETINGS PAGE ────────────────────────────────────────────────────────────
function MeetingsPage({ isAdmin, toast }) {
  const [meetings, setMeetings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const blank = { title:"", date:"", attendees:"", agenda:"", discussion:"", decisions:"", nextMeeting:"" };
  const [form, setForm] = useState(blank);
  const [expanded, setExpanded] = useState(null);

  useEffect(()=>{
    sheetRead(TABS.MEETINGS).then(setMeetings).catch(()=>toast("⚠️ Could not load meetings.")).finally(()=>setLoading(false));
  },[]);

  async function addMeeting() {
    if (!form.title||!form.date) { toast("⚠️ Title & Date required"); return; }
    setSaving(true);
    try {
      const row = { id:"MTG"+uid(), ...form, createdAt: new Date().toISOString().split("T")[0] };
      await sheetAppend(TABS.MEETINGS, row);
      setMeetings(p=>[...p,row]); setShowAdd(false); setForm(blank);
      toast("✅ Meeting added!");
    } catch(e) { toast("❌ "+e.message); }
    setSaving(false);
  }

  async function delMeeting(id) {
    if (!window.confirm("Delete this meeting record?")) return;
    try { await sheetDeleteRow(TABS.MEETINGS,id); setMeetings(p=>p.filter(m=>m.id!==id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  if (loading) return <div style={S.page}><Spinner /></div>;

  return (
    <div style={S.page}>
      <div style={{ ...S.btwn, marginBottom:12 }}>
        <div style={S.secTitle}>📋 Meetings / সভা ({meetings.length})</div>
        {isAdmin && <button style={S.btnSm()} onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add MoM</button>}
      </div>
      {meetings.length===0 && <div style={{ ...S.card, textAlign:"center", color:C.muted, padding:30 }}>No meeting records yet.{isAdmin?" Tap ➕ to add.":""}</div>}
      {[...meetings].reverse().map(m=>(
        <div key={m.id} style={S.card}>
          <div style={S.btwn} onClick={()=>setExpanded(expanded===m.id?null:m.id)}>
            <div>
              <div style={{ fontWeight:700, color:C.deepRed }}>{m.title}</div>
              <div style={{ fontSize:12, color:C.muted }}>📅 {m.date}</div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:C.saffron, fontSize:18 }}>{expanded===m.id?"▲":"▼"}</span>
              {isAdmin && <button onClick={e=>{e.stopPropagation();delMeeting(m.id);}} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:18 }}>🗑</button>}
            </div>
          </div>
          {expanded===m.id && (
            <div style={{ marginTop:10, fontSize:13, color:"#444", lineHeight:1.8 }}>
              {m.attendees  && <div><strong>Attendees:</strong> {m.attendees}</div>}
              {m.agenda     && <div><strong>Agenda:</strong> {m.agenda}</div>}
              {m.discussion && <div><strong>Discussion:</strong> {m.discussion}</div>}
              {m.decisions  && <div><strong>Decisions:</strong> {m.decisions}</div>}
              {m.nextMeeting&& <div><strong>Next Meeting:</strong> {m.nextMeeting}</div>}
            </div>
          )}
        </div>
      ))}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📋 Add Meeting Record (MoM)">
        <label style={S.label}>Meeting Title *</label>
        <input style={S.input} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Monthly Committee Meeting" />
        <label style={S.label}>Date *</label>
        <input style={S.input} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
        <label style={S.label}>Attendees</label>
        <input style={S.input} value={form.attendees} onChange={e=>setForm({...form,attendees:e.target.value})} placeholder="Names separated by commas..." />
        <label style={S.label}>Agenda</label>
        <textarea style={S.textarea} value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})} placeholder="Topics discussed..." />
        <label style={S.label}>Discussion Points</label>
        <textarea style={S.textarea} value={form.discussion} onChange={e=>setForm({...form,discussion:e.target.value})} placeholder="Key discussion points..." />
        <label style={S.label}>Decisions Taken</label>
        <textarea style={S.textarea} value={form.decisions} onChange={e=>setForm({...form,decisions:e.target.value})} placeholder="Decisions and action items..." />
        <label style={S.label}>Next Meeting Date</label>
        <input style={S.input} type="date" value={form.nextMeeting} onChange={e=>setForm({...form,nextMeeting:e.target.value})} />
        <button style={S.btnPrimary} onClick={addMeeting} disabled={saving}>{saving?"Saving...":"💾 Save Meeting Record"}</button>
      </Modal>
    </div>
  );
}

// ─── GENERAL FINANCE PAGE ─────────────────────────────────────────────────────
function GeneralFinancePage({ isAdmin, toast }) {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab,setActiveTab]= useState("membership");
  const [showAdd,  setShowAdd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const blank = { category:"membership", subType:"Monthly Fee", month:"", year:new Date().getFullYear().toString(), amount:"", description:"", paidBy:"" };
  const [form, setForm] = useState(blank);

  const MEMBERSHIP_TYPES = ["Monthly Fee","Annual Fee","Joining Fee","Renewal Fee","Arrears"];
  const BUSINESS_IN  = ["Rental Income","Sponsorship","Donation","Grant","Other Income"];
  const BUSINESS_EXP = ["Maintenance","Utilities","Printing","Stationery","Office Expense","Bank Charges","Other Expense"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  useEffect(()=>{
    sheetRead(TABS.GENERAL_FINANCE).then(setRecords).catch(()=>toast("⚠️ Could not load.")).finally(()=>setLoading(false));
  },[]);

  async function addRecord() {
    if (!form.amount) { toast("⚠️ Amount required"); return; }
    setSaving(true);
    try {
      const row = { id:"GF"+uid(), ...form, createdAt: new Date().toISOString().split("T")[0] };
      await sheetAppend(TABS.GENERAL_FINANCE, row);
      setRecords(p=>[...p,row]); setShowAdd(false); setForm(blank);
      toast("✅ Record saved!");
    } catch(e) { toast("❌ "+e.message); }
    setSaving(false);
  }

  async function delRecord(id) {
    if (!window.confirm("Delete this record?")) return;
    try { await sheetDeleteRow(TABS.GENERAL_FINANCE,id); setRecords(p=>p.filter(r=>r.id!==id)); toast("Deleted."); }
    catch { toast("❌ Delete failed."); }
  }

  const membership  = records.filter(r=>r.category==="membership");
  const bizIncome   = records.filter(r=>r.category==="biz_income");
  const bizExpense  = records.filter(r=>r.category==="biz_expense");
  const totalMemFee = sum(membership,"amount");
  const totalBizIn  = sum(bizIncome,"amount");
  const totalBizExp = sum(bizExpense,"amount");
  const netBiz      = totalBizIn - totalBizExp;

  if (!isAdmin) return (
    <div style={{ ...S.page, ...S.stub }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontWeight:700, color:C.deepRed, fontSize:16, marginTop:12 }}>Admin Access Only</div>
      <div style={{ fontSize:13, color:C.muted, marginTop:6 }}>Financial records are visible to admins only.</div>
    </div>
  );

  if (loading) return <div style={S.page}><Spinner /></div>;

  const tabs = [["membership","💳 Membership"],["business","🏢 Business"]];

  return (
    <div style={S.page}>
      <div style={{ ...S.btwn, marginBottom:12 }}>
        <div style={S.secTitle}>💰 General Finance</div>
        <button style={S.btnSm()} onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add</button>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {[{l:"Membership",v:totalMemFee,c:C.success},{l:"Biz Income",v:totalBizIn,c:C.success},{l:"Biz Expense",v:totalBizExp,c:C.danger}].map(x=>(
          <div key={x.l} style={{ background:"#fff",borderRadius:10,padding:10,border:`1px solid ${x.c}44`,textAlign:"center" }}>
            <div style={{ fontSize:10,color:C.muted,marginBottom:3 }}>{x.l}</div>
            <div style={{ fontSize:14,fontWeight:800,color:x.c }}>₹{fmt(x.v)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:12 }}>
        {tabs.map(([key,label])=>(
          <button key={key} onClick={()=>setActiveTab(key)}
            style={{ flex:1,padding:"11px 0",border:"none",background:activeTab===key?C.deepRed:"transparent",color:activeTab===key?"#fff":C.muted,fontWeight:activeTab===key?700:400,cursor:"pointer",fontSize:12 }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab==="membership" && (
        <div style={S.card}>
          <div style={S.secTitle}>💳 Membership Fees</div>
          {membership.length===0 && <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:16 }}>No membership fee records yet.</div>}
          {membership.map(r=>(
            <div key={r.id} style={{ background:"#F0FFF4",borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.success}33` }}>
              <div style={S.btwn}>
                <span style={S.tag}>{r.subType}</span>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  <span style={{ ...S.green,fontSize:15 }}>₹{fmt(r.amount)}</span>
                  <button onClick={()=>delRecord(r.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:16 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>
                {r.month && <span>📅 {r.month} {r.year} &nbsp;</span>}
                {r.paidBy && <span>👤 {r.paidBy}</span>}
              </div>
              {r.description && <div style={{ fontSize:11,color:"#555",marginTop:3 }}>📝 {r.description}</div>}
            </div>
          ))}
        </div>
      )}

      {activeTab==="business" && (
        <>
          <div style={S.card}>
            <div style={S.secTitle}>📈 Business Income</div>
            {bizIncome.length===0 && <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:10 }}>No business income records.</div>}
            {bizIncome.map(r=>(
              <div key={r.id} style={{ background:"#F0FFF4",borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.success}33` }}>
                <div style={S.btwn}>
                  <span style={S.tag}>{r.subType}</span>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    <span style={{ ...S.green,fontSize:15 }}>₹{fmt(r.amount)}</span>
                    <button onClick={()=>delRecord(r.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:16 }}>🗑</button>
                  </div>
                </div>
                {r.description && <div style={{ fontSize:11,color:"#555",marginTop:3 }}>📝 {r.description}</div>}
                <div style={{ fontSize:11,color:C.muted }}>📅 {r.month} {r.year}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ ...S.btwn,marginBottom:8 }}>
              <div style={S.secTitle}>📉 Business Expense</div>
              <div style={{ ...S.red,fontSize:14 }}>Net: ₹{fmt(netBiz)}</div>
            </div>
            {bizExpense.length===0 && <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:10 }}>No business expense records.</div>}
            {bizExpense.map(r=>(
              <div key={r.id} style={{ background:"#FFF5F5",borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.danger}33` }}>
                <div style={S.btwn}>
                  <span style={S.tag}>{r.subType}</span>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    <span style={{ ...S.red,fontSize:15 }}>₹{fmt(r.amount)}</span>
                    <button onClick={()=>delRecord(r.id)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:16 }}>🗑</button>
                  </div>
                </div>
                {r.description && <div style={{ fontSize:11,color:"#555",marginTop:3 }}>📝 {r.description}</div>}
                <div style={{ fontSize:11,color:C.muted }}>📅 {r.month} {r.year}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Record Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add Finance Record">
        <label style={S.label}>Category</label>
        <select style={S.select} value={form.category} onChange={e=>setForm({...form,category:e.target.value,subType:e.target.value==="membership"?MEMBERSHIP_TYPES[0]:e.target.value==="biz_income"?BUSINESS_IN[0]:BUSINESS_EXP[0]})}>
          <option value="membership">💳 Membership Fee</option>
          <option value="biz_income">📈 Business Income</option>
          <option value="biz_expense">📉 Business Expense</option>
        </select>
        <label style={S.label}>Sub Type</label>
        <select style={S.select} value={form.subType} onChange={e=>setForm({...form,subType:e.target.value})}>
          {(form.category==="membership"?MEMBERSHIP_TYPES:form.category==="biz_income"?BUSINESS_IN:BUSINESS_EXP).map(t=><option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Amount (₹) *</label>
        <input style={S.input} type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" />
        <label style={S.label}>Month</label>
        <select style={S.select} value={form.month} onChange={e=>setForm({...form,month:e.target.value})}>
          <option value="">-- Select Month --</option>
          {MONTHS.map(m=><option key={m}>{m}</option>)}
        </select>
        <label style={S.label}>Year</label>
        <input style={S.input} value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="2026" />
        {form.category==="membership" && (
          <>
            <label style={S.label}>Paid By (Member Name)</label>
            <input style={S.input} value={form.paidBy} onChange={e=>setForm({...form,paidBy:e.target.value})} placeholder="Member name..." />
          </>
        )}
        <label style={S.label}>Description / Notes</label>
        <textarea style={S.textarea} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Any additional details..." />
        <button style={S.btnPrimary} onClick={addRecord} disabled={saving}>{saving?"Saving...":"💾 Save Record"}</button>
      </Modal>
    </div>
  );
}

// ─── STUB PAGES ───────────────────────────────────────────────────────────────
function StubPage({ icon, en, bn, desc }) {
  return (
    <div style={{ ...S.page,...S.stub }}>
      <div style={{ fontSize:58 }}>{icon}</div>
      <div style={{ fontWeight:800,color:C.deepRed,fontSize:18,marginTop:12 }}>{en}</div>
      <div style={{ fontFamily:"'Hind Siliguri',sans-serif",color:C.muted,fontSize:14,marginTop:4 }}>{bn}</div>
      <p style={{ fontSize:13,color:"#888",maxWidth:260,margin:"14px auto 0",lineHeight:1.6 }}>{desc}</p>
      <span style={{ ...S.badge(C.saffron),marginTop:18,display:"inline-block" }}>🚧 Coming Soon</span>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("home");
  const [subPage,setSubPage]=useState(null);
  const [adminUser,setAdminUser]=useState(null);
  const [toastMsg,setToastMsg]=useState("");
  const [ready,setReady]=useState(false);

  const toast=useCallback((msg)=>{setToastMsg(msg);setTimeout(()=>setToastMsg(""),3500);},[]);

  useEffect(()=>{
    initSheets().then(()=>setReady(true)).catch(()=>{toast("⚠️ Connection issue.");setReady(true);});
  },[]);

  function handleNav(key){setPage(key);setSubPage(null);}

  const navItems=[
    {key:"home",     icon:"🏠",label:"Home"},
    {key:"events",   icon:"🎉",label:"Events"},
    {key:"members",  icon:"👥",label:"Members"},
    {key:"meetings", icon:"📋",label:"Meetings"},
    {key:"finance",  icon:"💰",label:"Finance"},
    {key:"admin",    icon:"🔐",label:"Admin"},
  ];

  const titles={
    home:     {en:"One Uday Sangha",bn:"উদয় সংঘ"},
    events:   {en:"Events",         bn:"উৎসব"},
    members:  {en:"Members",        bn:"সদস্য"},
    meetings: {en:"Meetings",       bn:"সভা"},
    finance:  {en:"General Finance",bn:"সাধারণ অর্থ"},
    activities:{en:"Activities",    bn:"কার্যক্রম"},
    admin:    {en:"Admin Portal",   bn:"অ্যাডমিন"},
  };
  const title=titles[page]||titles.home;

  function renderPage(){
    if(!ready) return <div style={S.page}><Spinner text="Connecting to Google Sheets..." /></div>;
    if(page==="home") return <HomePage isAdmin={!!adminUser} setPage={handleNav} toast={toast} />;
    if(page==="events"){
      if(subPage==="durga2026") return <DurgaPujaPage isAdmin={!!adminUser} onBack={()=>setSubPage(null)} toast={toast} />;
      return <EventsPage isAdmin={!!adminUser} setSubPage={setSubPage} toast={toast} />;
    }
    if(page==="members")   return <MembersPage isAdmin={!!adminUser} toast={toast} />;
    if(page==="meetings")  return <MeetingsPage isAdmin={!!adminUser} toast={toast} />;
    if(page==="finance")   return <GeneralFinancePage isAdmin={!!adminUser} toast={toast} />;
    if(page==="activities") return <StubPage icon="🎭" en="Club Activities" bn="ক্লাব কার্যক্রম" desc="Sports, cultural programs & community activities. Coming soon." />;
    if(page==="admin"){
      if(!adminUser) return <AdminLogin onLogin={setAdminUser} toast={toast} />;
      return <AdminPortal admin={adminUser} onLogout={()=>setAdminUser(null)} toast={toast} setPage={handleNav} setSubPage={setSubPage} />;
    }
  }

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={{ fontFamily:"'Hind Siliguri',sans-serif",fontSize:17,fontWeight:700,color:C.gold }}>{title.bn}</div>
          <div style={{ fontSize:11,opacity:0.75,marginTop:1 }}>{title.en}</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {adminUser ? (
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10,color:C.gold,fontWeight:700,lineHeight:1 }}>ADMIN</div>
                <div style={{ fontSize:11,color:"#fff",opacity:0.85,lineHeight:1.4 }}>{adminUser.name||adminUser.username}</div>
              </div>
              <button onClick={()=>setAdminUser(null)}
                style={{ background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap" }}>
                ↩️ Logout
              </button>
            </div>
          ) : (
            /* HEADER ICON — change the emoji below or replace with <img src="..." style={{width:28,height:28}} /> */
            <span style={{ fontSize:24 }}> <img 
            src={OUS_Logo}
            alt="OUS Logo"
            style={{
              width: 20,
              height: 20,
              objectFit: "contain",
              verticalAlign: "middle",
              marginRight: 6,
            }}
            /></span>
          )}
        </div>
      </div>
      <div style={{ height:"calc(100vh - 58px)",overflowY:"auto" }}>{renderPage()}</div>
      <nav style={S.nav}>
        {navItems.map(item=>(
          <button key={item.key} style={S.navBtn(page===item.key)} onClick={()=>handleNav(item.key)}>
            <span style={{ fontSize:19 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <Toast msg={toastMsg} />
    </div>
  );
}
