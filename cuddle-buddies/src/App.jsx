import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  SearchIcon, PlayIcon, PauseIcon, DownloadIcon, UploadIcon,
  MusicIcon, XIcon, ClockIcon,
  CheckIcon, FileIcon, ChevronDownIcon, PencilIcon, FilmIcon,
} from "./icons";
import { SOUNDS, CATEGORIES, CATEGORY_TREE, MAIN_CATEGORIES, makeWave } from "./data";
import logoSrc from "/assets/logo.png";

const isCEP = window.parent !== window;

const sendCEP = (type, payload) => {
  if (!isCEP) return;
  window.parent.postMessage({ type, ...payload }, "*");
};

/* Import any asset into Premiere Pro Project Panel with 3-step cache:
   1. CEP host checks app.project.rootItem.children for fileName → skip if found
   2. CEP host checks local cache dir via fs.existsSync → import from disk if found
   3. CEP host downloads from fileUrl → saves to cache → imports to project panel */
const importToProject = (name, fileUrl, fileName) => {
  if (!isCEP) return false;
  sendCEP("CB_IMPORT_TO_PROJECT", { name, fileUrl, fileName });
  return true;
};

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzW5gnkIO6zlHFs7BHPhlj6q8hdHhppHBESula9YpMspMBX-D8_6aH0Gbd1FSz_DtFd/exec";

/* ─── PasswordGate ─── */

const CORRECT_PASSWORD = "BuddleCuddies123RyanGosling7minutes";
const STORAGE_KEY = "cb_auth";

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [input, setInput]       = useState("");
  const [error, setError]       = useState(false);
  const [shake, setShake]       = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true); setShake(true); setInput("");
      setTimeout(() => setShake(false), 500);
    }
  };

  if (unlocked) return children;

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", background:"#050814" }}>
      <div style={{
        width:"100%", maxWidth:"380px",
        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
        borderRadius:"24px", backdropFilter:"blur(24px)", padding:"36px 28px",
        boxShadow:"0 30px 80px -20px rgba(0,0,0,0.8)",
        animation: shake ? "cbShake 0.45s ease" : "cbPop 0.22s cubic-bezier(.16,1,.3,1)",
      }}>
        <img src={logoSrc} alt="Cuddle Buddies" style={{ height:72, display:"block", margin:"0 auto 20px", filter:"drop-shadow(0 6px 18px rgba(0,0,0,0.45))" }} />
        <h1 style={{ color:"#fff", fontWeight:800, fontSize:20, textAlign:"center", margin:"0 0 6px", letterSpacing:"-0.02em" }}>Cuddle Buddies</h1>
        <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, textAlign:"center", margin:"0 0 24px" }}>
          Enter the password to access the sound library
        </p>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            type="password" value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password" autoFocus
            style={{
              width:"100%", boxSizing:"border-box",
              background: error ? "rgba(255,80,80,0.08)" : "rgba(255,255,255,0.06)",
              border:`1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(255,255,255,0.15)"}`,
              borderRadius:12, padding:"12px 16px", fontSize:15,
              color:"#fff", outline:"none", fontFamily:"inherit",
            }}
          />
          {error && <p style={{ color:"#ff6b6b", fontSize:12, margin:0, textAlign:"center" }}>Wrong password — try again</p>}
          <button type="submit" style={{ background:"#F7CB07", color:"#1a1730", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 10px 30px -10px rgba(247,203,7,0.6)" }}>
            Enter
          </button>
        </form>
      </div>
      <style>{`@keyframes cbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

/* ─── helpers ─── */

const fmtDur = (s) => {
  if (s >= 60) { const m = Math.floor(s/60), r = Math.round(s%60); return `${m}:${String(r).padStart(2,"0")}`; }
  return `0:${String(Math.round(s)).padStart(2,"0")}`;
};

const CAT_COLORS = { "Animal Sounds":"#7AE0BF", "Ambience":"#84CEE0", "SFX":"#F7CB07" };

const LEGACY_CAT_MAP = {
  "Ambient":"Ambience","Meme":"Cartoonish","Whoosh":"SFX","UI":"UI sounds",
  "Cartoon sounds":"Cartoonish","Cats":"Cat","Dogs":"Dog","Parrots":"Parrot",
  "Raccoons":"Raccoon","Pigs":"Pig","Donkeys":"Donkey","Horses":"Horse",
  "Goats":"Goat","Ducks":"Duck","Geese":"Goose","Other animals":"Other animal",
};

const findMainCat = (cat) => {
  for (const [main, subs] of Object.entries(CATEGORY_TREE)) { if (subs.includes(cat)) return main; }
  return MAIN_CATEGORIES.includes(cat) ? cat : null;
};

/* ─── VFX helpers ─── */

const VFX_PLACEHOLDERS = [
  "Smoke Burst Alpha","Light Leak Warm","Glitch Static","Bokeh Float","Rain Overlay",
  "Film Grain Texture","Lens Flare Gold","Dust Particles","Color Bleed",
].map((title, i) => ({ id:`vfx-p-${i}`, title, previewUrl:null, rawUrl:null }));

const normalizeVfxItem = (v) => ({
  id:         String(v.ID || v.id || Math.random()),
  title:      String(v.Title || v.title || "Untitled"),
  previewUrl: v.Preview_URL || v.previewUrl || null,
  rawUrl:     v.Raw_URL     || v.rawUrl     || null,
});

/* ─── TXT helpers ─── */

const TXT_PLACEHOLDERS = [
  "Bold Italic Pack","Minimal Sans","Retro Script","Modern Serif","Display Grotesk","Handwritten Clean",
].map((title, i) => ({ id:`txt-p-${i}`, title, previewUrl:null, rawUrl:null }));

const normalizeFontItem = (f) => ({
  id:         String(f.ID || f.id || Math.random()),
  title:      String(f.Title || f.title || "Untitled"),
  previewUrl: f.Preview_URL || f.previewUrl || null,
  rawUrl:     f.Raw_URL || f.rawUrl || null,
});

/* ─── misc helpers ─── */

const downloadBlob = (filename, text, mime = "application/json") => {
  const blob = new Blob([text], { type:mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const getFileDuration = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const audio = new Audio();
  audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration); };
  audio.onerror          = () => { URL.revokeObjectURL(url); resolve(null); };
  audio.src = url;
});

const normalizeRemoteSound = (s) => {
  try {
    const rawCat = String(s.category || "SFX");
    const category = LEGACY_CAT_MAP[rawCat] ?? rawCat;
    return { ...s, name:String(s.name||"Unknown Sound"), category, duration:parseFloat(s.duration)||1, wave:makeWave(String(s.name||"sound")) };
  } catch { return null; }
};

/* ─── Waveform ─── */

function Waveform({ wave, progress = 0, active = false }) {
  return (
    <div className="waveform" aria-hidden="true">
      {wave.map((h, i) => {
        const played = active && i / wave.length <= progress;
        return (
          <div key={i} className="wave-bar" style={{
            height:`${Math.round(h*100)}%`,
            background: played ? "#F7CB07" : "rgba(255,255,255,0.28)",
            boxShadow: played ? "0 0 6px rgba(247,203,7,0.6)" : "none",
          }} />
        );
      })}
    </div>
  );
}

/* ─── SoundCard ─── */

function SoundCard({ sound, isPlaying, progress, onPlay, onDownload, onEdit, onSeek, onFilterMain, onFilterSub, onDurationLoad }) {
  const mainCat  = findMainCat(sound.category);
  const catColor = CAT_COLORS[mainCat] ?? "rgba(255,255,255,.4)";
  const isSubcat = mainCat && CATEGORY_TREE[mainCat]?.includes(sound.category);

  useEffect(() => {
    if (!sound.fileUrl || sound._meta) return;
    const audio = new Audio();
    audio.onloadedmetadata = () => { if (!isNaN(audio.duration) && isFinite(audio.duration)) onDurationLoad?.(sound.id, audio.duration); };
    audio.src = sound.fileUrl;
    return () => { audio.pause(); audio.src = ""; };
  }, [sound.id, sound.fileUrl, sound._meta]); // eslint-disable-line

  const handleWaveClick = (e) => {
    if (!isPlaying || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(sound.id, Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const handleAction = (snd) => {
    if (snd.fileUrl) {
      const ext = snd.fileUrl.split(".").pop().split("?")[0] || "mp3";
      const safeName = snd.name.replace(/[^\w\s-]/g, "_");
      if (importToProject(snd.name, snd.fileUrl, `${safeName}.${ext}`)) return;
    }
    onDownload(snd);
  };

  return (
    <div
      className="sound-card"
      draggable={isCEP && !!sound.fileUrl}
      onDragStart={isCEP && sound.fileUrl ? (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ name:sound.name, fileUrl:sound.fileUrl }));
        sendCEP("CB_DRAG_START_PROJECT", { name:sound.name, fileUrl:sound.fileUrl });
      } : undefined}
      onDragEnd={isCEP ? () => sendCEP("CB_DRAG_END") : undefined}
      onDoubleClick={(e) => { if (e.target.closest("button")) return; handleAction(sound); }}
      style={{
        position:"relative",
        cursor: isCEP && sound.fileUrl ? "grab" : "default",
        boxShadow: isPlaying
          ? "0 0 0 1px rgba(247,203,7,0.5), 0 12px 40px -12px rgba(247,203,7,0.35)"
          : "0 8px 30px -16px rgba(0,0,0,0.6)",
      }}
    >
      <div className="sound-card-row">
        <button
          onClick={() => onPlay(sound.id)}
          className="play-btn"
          style={{
            background: isPlaying ? "#F7CB07" : "rgba(247,203,7,0.16)",
            border: "1px solid rgba(247,203,7,0.55)",
            color: isPlaying ? "#1a1730" : "#F7CB07",
          }}
          aria-label={isPlaying ? `Pause ${sound.name}` : `Play ${sound.name}`}
        >
          {isPlaying ? <PauseIcon size={20} strokeWidth={2.4} /> : <PlayIcon size={20} strokeWidth={2.4} style={{ marginLeft:2 }} />}
        </button>
        <div className="sound-body">
          <div className="sound-title-row"><h3 className="sound-name">{sound.name}</h3></div>
          <div className="wave-wrap" onClick={handleWaveClick} style={{ cursor: isPlaying ? "pointer" : "default" }}>
            <Waveform wave={sound.wave} progress={progress} active={isPlaying} />
          </div>
          <div className="sound-meta-row">
            <span className="dur-label"><ClockIcon size={13} /> {fmtDur(sound.duration)}</span>
            <div style={{ display:"flex", gap:4, flexWrap:"nowrap", flexShrink:0 }}>
              <button className="type-badge cat-filter-btn" onClick={() => onFilterMain?.(mainCat ?? sound.category)}>
                <span className="type-dot" style={{ background:catColor, boxShadow:`0 0 6px ${catColor}` }} />
                {mainCat ?? sound.category}
              </button>
              {isSubcat && (
                <button className="type-badge cat-filter-btn" onClick={() => onFilterSub?.(sound.category)}>
                  {sound.category}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <button className="card-edit-btn" onClick={() => onEdit(sound.id)} aria-label="Edit sound" title="Edit">
        <PencilIcon size={14} />
      </button>
      <button onClick={() => handleAction(sound)} className="dl-btn"
        aria-label={isCEP ? `Import ${sound.name} to Project` : `Download ${sound.name}`}
        title={isCEP ? "Import to Project" : "Download"}>
        <DownloadIcon size={18} />
      </button>
    </div>
  );
}

/* ─── VFXCard ─── */

function VFXCard({ item, onDownload, onEdit }) {
  const isVideoPreview = item.previewUrl && /\.webm(\?|$)/i.test(item.previewUrl);

  const handleAction = () => {
    if (item.rawUrl) {
      const ext = item.rawUrl.split(".").pop().split("?")[0] || "mp4";
      const safeName = item.title.replace(/[^\w\s-]/g, "_");
      if (importToProject(item.title, item.rawUrl, `${safeName}.${ext}`)) return;
    }
    onDownload(item);
  };

  return (
    <div
      className="vfx-card"
      draggable={isCEP && !!item.rawUrl}
      onDragStart={isCEP && item.rawUrl ? (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ name:item.title, fileUrl:item.rawUrl }));
        sendCEP("CB_DRAG_START_PROJECT", { name:item.title, fileUrl:item.rawUrl });
      } : undefined}
      onDragEnd={isCEP ? () => sendCEP("CB_DRAG_END") : undefined}
      onDoubleClick={(e) => { if (e.target.closest?.("button")) return; handleAction(); }}
    >
      <div className="vfx-thumb">
        {item.previewUrl
          ? isVideoPreview
            ? <video src={item.previewUrl} autoPlay muted loop playsInline className="vfx-thumb-img" />
            : <img src={item.previewUrl} alt={item.title} className="vfx-thumb-img" />
          : <div className="vfx-thumb-empty"><FilmIcon size={24} style={{ opacity:0.3 }} /><span>No preview</span></div>
        }
      </div>
      <div className="vfx-footer">
        <button className="vfx-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Edit">
          <PencilIcon size={13} />
        </button>
        <span className="vfx-title">{item.title}</span>
        <button className="vfx-dl-btn" onClick={() => handleAction()} title={isCEP ? "Import to Project" : "Download"} disabled={!item.rawUrl}>
          <DownloadIcon size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── FontCard ─── */

const FONT_WEIGHTS = [100, 400, 700, 900];
const FONT_SIZES   = [16, 20, 24, 28, 32, 36];
const DEMO_WORD    = "Cuddle";
const DEMO_LETTERS = DEMO_WORD.split("");

function FontCard({ item, onDownload, onEdit }) {
  const defaultStyles = DEMO_LETTERS.map(() => ({ fw:700, fs:24 }));
  const [styles, setStyles] = useState(defaultStyles);
  const timerRef = useRef(null);

  const isVideoPreview = item.previewUrl && /\.webm(\?|$)/i.test(item.previewUrl);
  const hasPreview     = !!item.previewUrl;

  const randomize = () => {
    const perLetter = Math.random() > 0.5;
    const sharedFw  = FONT_WEIGHTS[Math.floor(Math.random() * FONT_WEIGHTS.length)];
    const sharedFs  = FONT_SIZES[Math.floor(Math.random() * FONT_SIZES.length)];
    setStyles(DEMO_LETTERS.map(() => ({
      fw: perLetter ? FONT_WEIGHTS[Math.floor(Math.random() * FONT_WEIGHTS.length)] : sharedFw,
      fs: perLetter ? FONT_SIZES[Math.floor(Math.random() * FONT_SIZES.length)]     : sharedFs,
    })));
  };

  const onEnter = () => { if (hasPreview) return; randomize(); timerRef.current = setInterval(randomize, 500); };
  const onLeave = () => { clearInterval(timerRef.current); setStyles(defaultStyles); };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleAction = () => {
    if (item.rawUrl) {
      const ext = item.rawUrl.split(".").pop().split("?")[0] || "prtextstyle";
      const safeName = item.title.replace(/[^\w\s-]/g, "_");
      if (importToProject(item.title, item.rawUrl, `${safeName}.${ext}`)) return;
    }
    onDownload(item);
  };

  return (
    <div
      className="txt-card"
      draggable={isCEP && !!item.rawUrl}
      onDragStart={isCEP && item.rawUrl ? (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ name:item.title, fileUrl:item.rawUrl }));
        sendCEP("CB_DRAG_START_PROJECT", { name:item.title, fileUrl:item.rawUrl });
      } : undefined}
      onDragEnd={isCEP ? () => sendCEP("CB_DRAG_END") : undefined}
      onDoubleClick={(e) => { if (e.target.closest?.("button")) return; handleAction(); }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="txt-thumb">
        {hasPreview ? (
          isVideoPreview
            ? <video src={item.previewUrl} autoPlay muted loop playsInline className="txt-thumb-img" />
            : <img src={item.previewUrl} alt={item.title} className="txt-thumb-img" />
        ) : (
          <div className="txt-thumb-placeholder">
            <div className="txt-demo-word" aria-hidden="true">
              {DEMO_LETTERS.map((l, i) => (
                <span key={i} style={{
                  fontWeight: styles[i].fw,
                  fontSize:   `${styles[i].fs}px`,
                  transition: "font-weight 0.12s ease, font-size 0.18s ease",
                  display:    "inline-block",
                  lineHeight: 1,
                }}>{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="txt-footer">
        <button className="txt-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Edit">
          <PencilIcon size={13} />
        </button>
        <span className="txt-title">{item.title}</span>
        <button className="txt-dl-btn" onClick={() => handleAction()} title={isCEP ? "Import to Project" : "Download"} disabled={!item.rawUrl}>
          <DownloadIcon size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── EditPanel (SFX) ─── */

function EditPanel({ sound, onSave, onDelete, onClose }) {
  const initMain = findMainCat(sound.category) ?? MAIN_CATEGORIES[0];
  const initSub  = CATEGORY_TREE[initMain]?.includes(sound.category) ? sound.category : "";
  const [name,       setName]       = useState(sound.name);
  const [mainCat,    setMainCat]    = useState(initMain);
  const [subCat,     setSubCat]     = useState(initSub);
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mainCat) return;
    setSaving(true);
    try { await onSave(sound.id, { name:name.trim(), category:subCat||mainCat }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background:"rgba(166,181,233,.15)", border:"1px solid rgba(166,181,233,.35)", color:"#A6B5E9" }}>
          <PencilIcon size={18} />
        </div>
        <div><h2 className="upload-title">Edit sound</h2><p className="upload-subtitle">{sound.name}</p></div>
      </div>
      <form onSubmit={handleSave} className="upload-form">
        <div>
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-grid2">
          <div>
            <label className="form-label">Category <span style={{ color:"#ff6b6b" }}>*</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={mainCat} onChange={(e) => { setMainCat(e.target.value); setSubCat(""); }}>
                {MAIN_CATEGORIES.map((m) => <option key={m} value={m} style={{ background:"#1c1b3a" }}>{m}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
          <div>
            <label className="form-label">Subcategory <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(optional)</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={subCat} onChange={(e) => setSubCat(e.target.value)}>
                <option value="" style={{ background:"#1c1b3a" }}>None</option>
                {CATEGORY_TREE[mainCat]?.map((sc) => <option key={sc} value={sc} style={{ background:"#1c1b3a" }}>{sc}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="submit-btn"
          style={{ background:"#A6B5E9", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(166,181,233,0.5)" }}>
          {saving ? "Saving…" : <><CheckIcon size={17} strokeWidth={2.4} /> Save changes</>}
        </button>
        <div style={{ borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:12 }}>
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ width:"100%", padding:"9px", borderRadius:10, border:"1px solid rgba(255,80,80,.3)", background:"rgba(255,80,80,.08)", color:"#ff6b6b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Delete sound
            </button>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => setConfirmDel(false)} className="del-cancel-btn" style={{ flex:1 }}>Cancel</button>
              <button type="button" onClick={() => { onDelete(sound.id); onClose(); }} className="del-confirm-btn" style={{ flex:1 }}>Confirm delete</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── UploadPanel (SFX) ─── */

function UploadPanel({ onAdd, onClose }) {
  const [fileObj,   setFileObj]   = useState(null);
  const [fileName,  setFileName]  = useState(null);
  const [name,      setName]      = useState("");
  const [mainCat,   setMainCat]   = useState("");
  const [subCat,    setSubCat]    = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const fileRef = useRef(null);
  const canSubmit = name.trim().length > 0 && mainCat && !uploading;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setUploading(true); setUploadErr(null);
    try {
      let fileBase64 = null, mimeType = null;
      if (fileObj) { fileBase64 = await fileToBase64(fileObj); mimeType = fileObj.type || "audio/mpeg"; }
      const duration = fileObj ? ((await getFileDuration(fileObj)) ?? 1) : 1;
      await onAdd({ name:name.trim(), type:"Realistic", category:subCat||mainCat, duration, _meta:!!fileObj, wave:makeWave(name+Date.now()), fileBase64, fileName, mimeType });
      setName(""); setFileObj(null); setFileName(null); setMainCat(""); setSubCat("");
      if (fileRef.current) fileRef.current.value = "";
      onClose?.();
    } catch (err) { setUploadErr("Error: "+(err?.message||String(err))); }
    finally { setUploading(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap"><UploadIcon size={18} /></div>
        <div><h2 className="upload-title">Drop a new sound</h2><p className="upload-subtitle">Upload to Cloudinary and add to the library.</p></div>
      </div>
      <form onSubmit={submit} className="upload-form">
        <div>
          <label className="form-label">Audio file</label>
          <button type="button" onClick={() => fileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon"><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{fileName ?? "Choose an audio file"}</span>
              <span className="file-pick-hint">{fileName ? "Ready to upload" : "WAV, MP3, M4A, OGG"}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="audio/*" className="sr-only"
            onChange={(e) => { const f=e.target.files?.[0]??null; setFileObj(f); setFileName(f?.name??null); }} />
        </div>
        <div>
          <label className="form-label">Sound name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wobbly Jelly Drop" />
        </div>
        <div className="form-grid2">
          <div>
            <label className="form-label">Category <span style={{ color:"#ff6b6b" }}>*</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={mainCat} onChange={(e) => { setMainCat(e.target.value); setSubCat(""); }}>
                <option value="" style={{ background:"#1c1b3a" }}>Select category…</option>
                {MAIN_CATEGORIES.map((m) => <option key={m} value={m} style={{ background:"#1c1b3a" }}>{m}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
          <div>
            <label className="form-label">Subcategory <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(optional)</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={subCat} onChange={(e) => setSubCat(e.target.value)} disabled={!mainCat} style={{ opacity:mainCat?1:0.4 }}>
                <option value="" style={{ background:"#1c1b3a" }}>No subcategory</option>
                {mainCat && CATEGORY_TREE[mainCat].map((sc) => <option key={sc} value={sc} style={{ background:"#1c1b3a" }}>{sc}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>
        {uploadErr && <p style={{ color:"#ff6b6b", fontSize:12, margin:0, textAlign:"center" }}>{uploadErr}</p>}
        <button type="submit" disabled={!canSubmit} className={`submit-btn${uploading?" uploading":""}`}
          style={uploading ? { color:"#1a1730" } : { background:"#F7CB07", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(247,203,7,0.6)" }}>
          {uploading ? <span style={{ opacity:0.7 }}>Uploading…</span> : <><UploadIcon size={17} strokeWidth={2.4} /> Add to library</>}
        </button>
      </form>
    </div>
  );
}

/* ─── VFXEditPanel ─── */

function VFXEditPanel({ item, onSave, onDelete, onClose }) {
  const [title,          setTitle]          = useState(item.title);
  const [previewFileObj, setPreviewFileObj] = useState(null);
  const [previewName,    setPreviewName]    = useState(null);
  const [previewLocal,   setPreviewLocal]   = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [confirmDel,     setConfirmDel]     = useState(false);
  const previewFileRef = useRef(null);
  const cropRef        = useRef(null);

  const onPreviewChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setPreviewFileObj(f); setPreviewName(f?.name ?? null);
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(f ? URL.createObjectURL(f) : null);
  };

  const isNewVideo = previewLocal && /\.webm$/i.test(previewName || "");
  const isNewGif   = previewLocal && /\.gif$/i.test(previewName || "");
  const canCrop    = !!previewLocal && !isNewVideo && !isNewGif;
  const displayPreview  = previewLocal || item.previewUrl;
  const isVideoPreview  = displayPreview && /\.webm(\?|$)/i.test(displayPreview);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let previewBase64 = null, previewMimeType = null;
      if (previewFileObj) {
        if (canCrop) { const cropped = await cropRef.current?.getJpeg(); previewBase64 = cropped ?? await fileToBase64(previewFileObj); previewMimeType = "image/jpeg"; }
        else { previewBase64 = await fileToBase64(previewFileObj); previewMimeType = previewFileObj.type || "image/jpeg"; }
      }
      await onSave(item.id, { title:title.trim(), previewBase64, previewFileName:previewName, previewMimeType });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background:"rgba(166,181,233,.15)", border:"1px solid rgba(166,181,233,.35)", color:"#A6B5E9" }}>
          <PencilIcon size={18} />
        </div>
        <div><h2 className="upload-title">Edit visual</h2><p className="upload-subtitle">{item.title}</p></div>
      </div>
      <form onSubmit={handleSave} className="upload-form">
        <div>
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Preview <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(replaces current)</span></label>
          {displayPreview && (
            <div style={{ marginBottom:8 }}>
              {canCrop
                ? <CropPreview src={previewLocal} isVideo={false} cropRef={cropRef} />
                : <div style={{ borderRadius:10, overflow:"hidden", aspectRatio:"16/9", background:"#04111e" }}>
                    {isVideoPreview
                      ? <video src={displayPreview} autoPlay muted loop playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      : <img src={displayPreview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    }
                  </div>
              }
            </div>
          )}
          <button type="button" onClick={() => previewFileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon" style={{ color:"#84CEE0" }}><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{previewName ?? "Choose a preview file"}</span>
              <span className="file-pick-hint">JPEG, PNG, GIF, WebM</span>
            </span>
          </button>
          <input ref={previewFileRef} type="file" accept="image/jpeg,image/png,image/gif,video/webm" className="sr-only" onChange={onPreviewChange} />
        </div>
        <button type="submit" disabled={saving} className="submit-btn"
          style={{ background:"#A6B5E9", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(166,181,233,0.5)" }}>
          {saving ? "Saving…" : <><CheckIcon size={17} strokeWidth={2.4} /> Save changes</>}
        </button>
        <div style={{ borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:12 }}>
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ width:"100%", padding:"9px", borderRadius:10, border:"1px solid rgba(255,80,80,.3)", background:"rgba(255,80,80,.08)", color:"#ff6b6b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Delete visual
            </button>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => setConfirmDel(false)} className="del-cancel-btn" style={{ flex:1 }}>Cancel</button>
              <button type="button" onClick={() => { onDelete(item.id); onClose(); }} className="del-confirm-btn" style={{ flex:1 }}>Confirm delete</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── TXTEditPanel ─── */

function TXTEditPanel({ item, onSave, onDelete, onClose }) {
  const [title,          setTitle]          = useState(item.title);
  const [previewFileObj, setPreviewFileObj] = useState(null);
  const [previewName,    setPreviewName]    = useState(null);
  const [previewLocal,   setPreviewLocal]   = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [confirmDel,     setConfirmDel]     = useState(false);
  const previewFileRef = useRef(null);
  const cropRef        = useRef(null);

  const onPreviewChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setPreviewFileObj(f); setPreviewName(f?.name ?? null);
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(f ? URL.createObjectURL(f) : null);
  };

  const isNewVideo     = previewLocal && /\.webm$/i.test(previewName || "");
  const isNewGif       = previewLocal && /\.gif$/i.test(previewName || "");
  const canCrop        = !!previewLocal && !isNewVideo && !isNewGif;
  const displayPreview = previewLocal || item.previewUrl;
  const isVideoPreview = displayPreview && /\.webm(\?|$)/i.test(displayPreview);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let previewBase64 = null, previewMimeType = null;
      if (previewFileObj) {
        if (canCrop) { const cropped = await cropRef.current?.getJpeg(); previewBase64 = cropped ?? await fileToBase64(previewFileObj); previewMimeType = "image/jpeg"; }
        else { previewBase64 = await fileToBase64(previewFileObj); previewMimeType = previewFileObj.type || "image/jpeg"; }
      }
      await onSave(item.id, { title:title.trim(), previewBase64, previewFileName:previewName, previewMimeType });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background:"rgba(132,206,224,.15)", border:"1px solid rgba(132,206,224,.35)", color:"#84CEE0" }}>
          <PencilIcon size={18} />
        </div>
        <div><h2 className="upload-title">Edit preset</h2><p className="upload-subtitle">{item.title}</p></div>
      </div>
      <form onSubmit={handleSave} className="upload-form">
        <div>
          <label className="form-label">Preset title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Preview <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(replaces current)</span></label>
          {displayPreview && (
            <div style={{ marginBottom:8 }}>
              {canCrop
                ? <CropPreview src={previewLocal} isVideo={false} cropRef={cropRef} />
                : <div style={{ borderRadius:10, overflow:"hidden", aspectRatio:"16/9", background:"#04111e" }}>
                    {isVideoPreview
                      ? <video src={displayPreview} autoPlay muted loop playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      : <img src={displayPreview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    }
                  </div>
              }
            </div>
          )}
          <button type="button" onClick={() => previewFileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon" style={{ color:"#84CEE0" }}><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{previewName ?? "Choose a preview file"}</span>
              <span className="file-pick-hint">JPEG, PNG, GIF, WebM</span>
            </span>
          </button>
          <input ref={previewFileRef} type="file" accept="image/jpeg,image/png,image/gif,video/webm" className="sr-only" onChange={onPreviewChange} />
        </div>
        <button type="submit" disabled={saving} className="submit-btn"
          style={{ background:"#84CEE0", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(132,206,224,0.5)" }}>
          {saving ? "Saving…" : <><CheckIcon size={17} strokeWidth={2.4} /> Save changes</>}
        </button>
        <div style={{ borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:12 }}>
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ width:"100%", padding:"9px", borderRadius:10, border:"1px solid rgba(255,80,80,.3)", background:"rgba(255,80,80,.08)", color:"#ff6b6b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Delete preset
            </button>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => setConfirmDel(false)} className="del-cancel-btn" style={{ flex:1 }}>Cancel</button>
              <button type="button" onClick={() => { onDelete(item.id); onClose(); }} className="del-confirm-btn" style={{ flex:1 }}>Confirm delete</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── CropPreview ─── */

function CropPreview({ src, isVideo, cropRef }) {
  const [zoom,     setZoom]     = useState(1);
  const [pan,      setPan]      = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const dragRef      = useRef(null);
  const containerRef = useRef(null);
  const imgRef       = useRef(null);

  useEffect(() => { setZoom(1); setPan({ x:0, y:0 }); }, [src]);

  const clamp = (z, p) => {
    const el = containerRef.current, img = imgRef.current;
    if (!el) return p;
    const cW = el.offsetWidth, cH = el.offsetHeight;
    const nW = img?.naturalWidth||cW, nH = img?.naturalHeight||cH;
    const bs = Math.max(400/nW, 225/nH), sc = 400/cW;
    const mx = Math.max(0, (nW*bs*z-400)/(2*sc)), my = Math.max(0, (nH*bs*z-225)/(2*sc));
    return { x:Math.max(-mx, Math.min(mx, p.x)), y:Math.max(-my, Math.min(my, p.y)) };
  };

  useEffect(() => {
    if (!cropRef) return;
    cropRef.current = {
      getJpeg: async () => {
        if (isVideo || !src) return null;
        const img = new Image(); img.src = src;
        await new Promise(r => { img.onload=r; img.onerror=r; });
        const CW=400, CH=225;
        const canvas = document.createElement("canvas"); canvas.width=CW; canvas.height=CH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle="#04111e"; ctx.fillRect(0,0,CW,CH);
        const cW = containerRef.current?.offsetWidth||CW, sc=CW/cW;
        const bs = Math.max(CW/img.naturalWidth, CH/img.naturalHeight), ts=bs*zoom;
        const iW=img.naturalWidth*ts, iH=img.naturalHeight*ts;
        const ix=CW/2+pan.x*sc-iW/2, iy=CH/2+pan.y*sc-iH/2;
        ctx.save(); ctx.beginPath(); ctx.rect(0,0,CW,CH); ctx.clip();
        ctx.drawImage(img,ix,iy,iW,iH); ctx.restore();
        return canvas.toDataURL("image/jpeg",0.92).split(",")[1];
      },
    };
  });

  const onMouseDown = (e) => { if (isVideo||e.button!==0) return; e.preventDefault(); dragRef.current={mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y}; setDragging(true); };
  const onMouseMove = (e) => { if (!dragRef.current) return; setPan(clamp(zoom, { x:dragRef.current.px+(e.clientX-dragRef.current.mx), y:dragRef.current.py+(e.clientY-dragRef.current.my) })); };
  const onMouseUp   = () => { dragRef.current=null; setDragging(false); };
  const handleZoom  = (z) => { setZoom(z); setPan(p => clamp(z, p)); };
  const isDirty = zoom>1.01||Math.abs(pan.x)>0.5||Math.abs(pan.y)>0.5;

  return (
    <>
      <div ref={containerRef}
        style={{ position:"relative", overflow:"hidden", aspectRatio:"16/9", background:"#04111e", borderRadius:10, cursor:isVideo?"default":dragging?"grabbing":"grab" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {isVideo
          ? <video src={src} autoPlay muted loop playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          : <img ref={imgRef} src={src} alt="preview" draggable={false}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:"center center", userSelect:"none", pointerEvents:"none" }}
            />
        }
      </div>
      {!isVideo && cropRef && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", flexShrink:0 }}>Zoom</span>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => handleZoom(Number(e.target.value))} style={{ flex:1, accentColor:"#7AE0BF", cursor:"pointer" }} />
          <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", minWidth:28, textAlign:"right", flexShrink:0 }}>{zoom.toFixed(1)}×</span>
          {isDirty && <button type="button" onClick={() => { setZoom(1); setPan({x:0,y:0}); }} style={{ fontSize:11, background:"none", border:"none", color:"rgba(255,255,255,.35)", cursor:"pointer", padding:"1px 6px", borderRadius:4, flexShrink:0 }}>Reset</button>}
        </div>
      )}
    </>
  );
}

/* ─── VFXUploadPanel ─── */

function VFXUploadPanel({ onAdd, onClose }) {
  const [fileObj,        setFileObj]        = useState(null);
  const [fileName,       setFileName]       = useState(null);
  const [previewFileObj, setPreviewFileObj] = useState(null);
  const [previewName,    setPreviewName]    = useState(null);
  const [previewLocal,   setPreviewLocal]   = useState(null);
  const [title,          setTitle]          = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [uploadErr,      setUploadErr]      = useState(null);
  const fileRef        = useRef(null);
  const previewFileRef = useRef(null);
  const cropRef        = useRef(null);

  const canSubmit = title.trim().length > 0 && fileObj && !uploading;
  const isVideoPreview = previewLocal && /\.webm$/i.test(previewName || "");
  const isGifPreview   = previewLocal && /\.gif$/i.test(previewName || "");
  const canCrop        = !!previewLocal && !isVideoPreview && !isGifPreview;

  const onFileChange    = (e) => { const f=e.target.files?.[0]??null; setFileObj(f); setFileName(f?.name??null); };
  const onPreviewChange = (e) => {
    const f=e.target.files?.[0]??null; setPreviewFileObj(f); setPreviewName(f?.name??null);
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(f?URL.createObjectURL(f):null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setUploading(true); setUploadErr(null);
    try {
      const fileBase64=await fileToBase64(fileObj), mimeType=fileObj.type||"video/mp4";
      let previewBase64=null, previewMimeType=null;
      if (previewFileObj) {
        if (canCrop) { const cropped=await cropRef.current?.getJpeg(); previewBase64=cropped??await fileToBase64(previewFileObj); previewMimeType="image/jpeg"; }
        else { previewBase64=await fileToBase64(previewFileObj); previewMimeType=previewFileObj.type||"image/jpeg"; }
      }
      await onAdd({ title:title.trim(), fileBase64, fileName, mimeType, previewBase64, previewFileName:previewName, previewMimeType });
      setTitle(""); setFileObj(null); setFileName(null); setPreviewFileObj(null); setPreviewName(null); setPreviewLocal(null);
      if (fileRef.current) fileRef.current.value="";
      if (previewFileRef.current) previewFileRef.current.value="";
      onClose?.();
    } catch (err) { setUploadErr("Error: "+(err?.message||String(err))); }
    finally { setUploading(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background:"rgba(122,224,191,.15)", border:"1px solid rgba(122,224,191,.35)", color:"#7AE0BF" }}>
          <FilmIcon size={18} />
        </div>
        <div><h2 className="upload-title">Drop a new visual</h2><p className="upload-subtitle">Upload to Cloudinary and add to VFX library.</p></div>
      </div>
      <form onSubmit={submit} className="upload-form">
        <div>
          <label className="form-label">Video file</label>
          <button type="button" onClick={() => fileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon"><FilmIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{fileName ?? "Choose a video file"}</span>
              <span className="file-pick-hint">{fileName ? "Ready to upload" : "MP4, MOV, WEBM"}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="sr-only" onChange={onFileChange} />
        </div>
        <div>
          <label className="form-label">Preview <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(optional — JPEG, PNG, GIF, WebM)</span></label>
          <button type="button" onClick={() => previewFileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon" style={{ color:"#84CEE0" }}><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{previewName ?? "Choose a preview file"}</span>
              <span className="file-pick-hint">{previewName ? "Ready to upload" : "Still or animated image"}</span>
            </span>
          </button>
          <input ref={previewFileRef} type="file" accept="image/jpeg,image/png,image/gif,video/webm" className="sr-only" onChange={onPreviewChange} />
          {previewLocal && <div style={{ marginTop:8 }}><CropPreview src={previewLocal} isVideo={isVideoPreview} cropRef={canCrop?cropRef:null} /></div>}
        </div>
        <div>
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Smoke Burst Alpha" />
        </div>
        {uploadErr && <p style={{ color:"#ff6b6b", fontSize:12, margin:0, textAlign:"center" }}>{uploadErr}</p>}
        <button type="submit" disabled={!canSubmit} className={`submit-btn${uploading?" uploading":""}`}
          style={uploading ? { color:"#1a1730" } : { background:"#7AE0BF", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(122,224,191,0.6)" }}>
          {uploading ? <span style={{ opacity:0.7 }}>Uploading…</span> : <><FilmIcon size={17} strokeWidth={2.4} /> Add to VFX library</>}
        </button>
      </form>
    </div>
  );
}

/* ─── TXTUploadPanel ─── */

function TXTUploadPanel({ onAdd, onClose }) {
  const [fileObj,        setFileObj]        = useState(null);
  const [fileName,       setFileName]       = useState(null);
  const [previewFileObj, setPreviewFileObj] = useState(null);
  const [previewName,    setPreviewName]    = useState(null);
  const [previewLocal,   setPreviewLocal]   = useState(null);
  const [title,          setTitle]          = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [uploadErr,      setUploadErr]      = useState(null);
  const fileRef        = useRef(null);
  const previewFileRef = useRef(null);
  const cropRef        = useRef(null);

  const canSubmit = title.trim().length > 0 && fileObj && !uploading;
  const isVideoPreview = previewLocal && /\.webm$/i.test(previewName || "");
  const isGifPreview   = previewLocal && /\.gif$/i.test(previewName || "");
  const canCrop        = !!previewLocal && !isVideoPreview && !isGifPreview;

  const onPreviewChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setPreviewFileObj(f); setPreviewName(f?.name ?? null);
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setUploading(true); setUploadErr(null);
    try {
      const fileBase64 = await fileToBase64(fileObj);
      const mimeType   = fileObj.type || "application/octet-stream";
      let previewBase64 = null, previewMimeType = null;
      if (previewFileObj) {
        if (canCrop) { const cropped = await cropRef.current?.getJpeg(); previewBase64 = cropped ?? await fileToBase64(previewFileObj); previewMimeType = "image/jpeg"; }
        else { previewBase64 = await fileToBase64(previewFileObj); previewMimeType = previewFileObj.type || "image/jpeg"; }
      }
      await onAdd({ title:title.trim(), fileBase64, fileName, mimeType, previewBase64, previewFileName:previewName, previewMimeType });
      setTitle(""); setFileObj(null); setFileName(null);
      setPreviewFileObj(null); setPreviewName(null); setPreviewLocal(null);
      if (fileRef.current) fileRef.current.value = "";
      if (previewFileRef.current) previewFileRef.current.value = "";
      onClose?.();
    } catch (err) { setUploadErr("Error: "+(err?.message||String(err))); }
    finally { setUploading(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn"><XIcon size={17} /></button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background:"rgba(132,206,224,.15)", border:"1px solid rgba(132,206,224,.35)", color:"#84CEE0" }}>
          <FileIcon size={18} />
        </div>
        <div><h2 className="upload-title">Drop a new preset</h2><p className="upload-subtitle">Upload a Premiere text style to the TXT library.</p></div>
      </div>
      <form onSubmit={submit} className="upload-form">
        <div>
          <label className="form-label">Premiere text style file</label>
          <button type="button" onClick={() => fileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon" style={{ color:"#84CEE0" }}><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{fileName ?? "Choose a preset file"}</span>
              <span className="file-pick-hint">{fileName ? "Ready to upload" : ".prtextstyle"}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept=".prtextstyle" className="sr-only"
            onChange={(e) => { const f=e.target.files?.[0]??null; setFileObj(f); setFileName(f?.name??null); }} />
        </div>
        <div>
          <label className="form-label">Preview <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>(optional — JPEG, PNG, GIF, WebM)</span></label>
          <button type="button" onClick={() => previewFileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon" style={{ color:"#84CEE0" }}><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{previewName ?? "Choose a preview file"}</span>
              <span className="file-pick-hint">{previewName ? "Ready to upload" : "Still or animated image"}</span>
            </span>
          </button>
          <input ref={previewFileRef} type="file" accept="image/jpeg,image/png,image/gif,video/webm" className="sr-only" onChange={onPreviewChange} />
          {previewLocal && <div style={{ marginTop:8 }}><CropPreview src={previewLocal} isVideo={isVideoPreview} cropRef={canCrop?cropRef:null} /></div>}
        </div>
        <div>
          <label className="form-label">Preset title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bold Italic Pack" />
        </div>
        {uploadErr && <p style={{ color:"#ff6b6b", fontSize:12, margin:0, textAlign:"center" }}>{uploadErr}</p>}
        <button type="submit" disabled={!canSubmit} className={`submit-btn${uploading?" uploading":""}`}
          style={uploading ? { color:"#1a1730" } : { background:"#84CEE0", color:"#1a1730", boxShadow:"0 10px 30px -10px rgba(132,206,224,0.6)" }}>
          {uploading ? <span style={{ opacity:0.7 }}>Uploading…</span> : <><FileIcon size={17} strokeWidth={2.4} /> Add to TXT library</>}
        </button>
      </form>
    </div>
  );
}

/* ─── App ─── */

export default function App() {
  const [activeTab, setActiveTab] = useState("sfx");

  /* VFX */
  const [vfxItems,   setVfxItems]   = useState(VFX_PLACEHOLDERS);
  const [loadingVfx, setLoadingVfx] = useState(false);
  const [editingVfx, setEditingVfx] = useState(null);
  const [vfxQuery,   setVfxQuery]   = useState("");
  const vfxLoadedRef = useRef(false);

  /* TXT */
  const [txtItems,   setTxtItems]   = useState(TXT_PLACEHOLDERS);
  const [loadingTxt, setLoadingTxt] = useState(false);
  const [editingTxt, setEditingTxt] = useState(null);
  const [txtQuery,   setTxtQuery]   = useState("");
  const txtLoadedRef = useRef(false);

  /* SFX */
  const [sounds,        setSounds]        = useState([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [query,         setQuery]         = useState("");
  const [activeMainCat, setActiveMainCat] = useState(null);
  const [activeSubCat,  setActiveSubCat]  = useState(null);
  const [playingId,     setPlayingId]     = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [toast,         setToast]         = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [editingSound,  setEditingSound]  = useState(null);
  const [isUploading,   setIsUploading]   = useState(false);
  const [showTypeDrop,  setShowTypeDrop]  = useState(false);
  const [subCatHiding,  setSubCatHiding]  = useState(false);
  const [shownSounds,   setShownSounds]   = useState([]);
  const [gridFading,    setGridFading]    = useState(false);

  const prevMainCatRef = useRef(null);
  const typeDropRef    = useRef(null);
  const rafRef         = useRef(null);
  const fadeRef        = useRef(null);
  const gridInitRef    = useRef(true);
  const toastTimerRef  = useRef(null);
  const audioRef       = useRef(null);

  /* Body theme */
  useEffect(() => {
    document.body.classList.toggle("theme-vfx", activeTab === "vfx");
    document.body.classList.toggle("theme-txt", activeTab === "txt");
    return () => { document.body.classList.remove("theme-vfx"); document.body.classList.remove("theme-txt"); };
  }, [activeTab]);

  /* Load VFX */
  useEffect(() => {
    if (activeTab !== "vfx" || vfxLoadedRef.current) return;
    vfxLoadedRef.current = true;
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") return;
    try {
      const c = JSON.parse(localStorage.getItem("cb_vfx_v1") || "null");
      if (c?.data?.length && Date.now()-c.ts < 5*60*1000) setVfxItems(c.data.map(normalizeVfxItem));
    } catch {}
    setLoadingVfx(true);
    fetch(`${APPS_SCRIPT_URL}?sheet=VFX_Data`)
      .then(r => r.json())
      .then(data => {
        if (data.vfx?.length) {
          setVfxItems(data.vfx.map(normalizeVfxItem));
          localStorage.setItem("cb_vfx_v1", JSON.stringify({ data:data.vfx, ts:Date.now() }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVfx(false));
  }, [activeTab]);

  /* Load TXT */
  useEffect(() => {
    if (activeTab !== "txt" || txtLoadedRef.current) return;
    txtLoadedRef.current = true;
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") return;
    try {
      const c = JSON.parse(localStorage.getItem("cb_txt_v1") || "null");
      if (c?.data?.length && Date.now()-c.ts < 5*60*1000) setTxtItems(c.data.map(normalizeFontItem));
    } catch {}
    setLoadingTxt(true);
    fetch(`${APPS_SCRIPT_URL}?sheet=Fonts_Data`)
      .then(r => r.json())
      .then(data => {
        if (data.fonts?.length) {
          setTxtItems(data.fonts.map(normalizeFontItem));
          localStorage.setItem("cb_txt_v1", JSON.stringify({ data:data.fonts, ts:Date.now() }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTxt(false));
  }, [activeTab]);

  useEffect(() => {
    let t;
    if (activeMainCat) { prevMainCatRef.current=activeMainCat; setSubCatHiding(false); }
    else if (prevMainCatRef.current) {
      setSubCatHiding(true);
      t = setTimeout(() => { setSubCatHiding(false); prevMainCatRef.current=null; }, 200);
    }
    return () => clearTimeout(t);
  }, [activeMainCat]);

  useEffect(() => {
    if (!showTypeDrop) return;
    const handler = (e) => { if (typeDropRef.current && !typeDropRef.current.contains(e.target)) setShowTypeDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypeDrop]);

  /* Load SFX */
  useEffect(() => {
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") { setLoadingData(false); return; }
    try {
      const c = JSON.parse(localStorage.getItem("cb_sounds_v1") || "null");
      if (c?.data?.length && Date.now()-c.ts < 5*60*1000) {
        const cached = c.data.map(normalizeRemoteSound).filter(Boolean);
        if (cached.length) { setSounds(cached); setLoadingData(false); }
      }
    } catch {}
    fetch(APPS_SCRIPT_URL)
      .then(r => r.json())
      .then(data => {
        if (data.sounds?.length) {
          const remote = data.sounds.map(normalizeRemoteSound).filter(Boolean);
          if (remote.length) { setSounds(remote); localStorage.setItem("cb_sounds_v1", JSON.stringify({ data:data.sounds, ts:Date.now() })); return; }
        }
        setSounds(SOUNDS);
      })
      .catch(() => setSounds(SOUNDS))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => { if (!loadingData) { setShownSounds(filtered); gridInitRef.current=false; } }, [loadingData]); // eslint-disable-line
  useEffect(() => { if (gridInitRef.current) return; clearTimeout(fadeRef.current); const snap=filtered; setGridFading(true); fadeRef.current=setTimeout(()=>{setShownSounds(snap);setGridFading(false);},150); return ()=>clearTimeout(fadeRef.current); }, [activeMainCat, activeSubCat]); // eslint-disable-line
  useEffect(() => { if (gridInitRef.current) return; setShownSounds(filtered); }, [query]); // eslint-disable-line
  useEffect(() => { if (gridInitRef.current) return; setShownSounds(filtered); }, [sounds]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowUpload(false); setEditingSound(null); setEditingVfx(null); setEditingTxt(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg); clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current=null; }
    setPlayingId(null); setProgress(0);
  }, []);

  const seekSound = useCallback((id, fraction) => {
    if (!audioRef.current || playingId!==id) return;
    const audio = audioRef.current;
    if (audio.duration && !isNaN(audio.duration)) { audio.currentTime=audio.duration*fraction; setProgress(fraction); }
  }, [playingId]);

  const playSound = useCallback((id) => {
    cancelAnimationFrame(rafRef.current);
    if (playingId === id) { stopPlayback(); return; }
    const snd = sounds.find(s => s.id===id);
    if (!snd) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current=null; }
    if (snd.fileUrl) {
      const audio = new Audio(snd.fileUrl); audio.volume=0.3; audioRef.current=audio;
      setPlayingId(id); setProgress(0);
      audio.onloadedmetadata = () => { if (audio.duration&&!isNaN(audio.duration)) setSounds(prev=>prev.map(s=>s.id===id?{...s,duration:audio.duration}:s)); };
      audio.ontimeupdate = () => { if (audio.duration) setProgress(audio.currentTime/audio.duration); };
      audio.onended = () => { setPlayingId(null); setProgress(0); };
      audio.play().catch(() => { setPlayingId(null); setProgress(0); showToast("Не вдалось відтворити файл"); });
      return;
    }
    setPlayingId(id); setProgress(0);
    const dur=Math.min(Math.max(snd.duration,0.8),6)*1000, start=performance.now();
    const tick = (now) => {
      const p=(now-start)/dur;
      if (p>=1) { setProgress(1); setTimeout(()=>{setPlayingId(cur=>cur===id?null:cur);setProgress(0);},120); return; }
      setProgress(p); rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [playingId, sounds, stopPlayback, showToast]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); if (audioRef.current) audioRef.current.pause(); }, []);

  /* SFX CRUD */
  const addSound = useCallback(async (data) => {
    setIsUploading(true);
    const tempId=`tmp_${Date.now().toString(36)}`;
    setSounds(prev => [{ id:tempId, addedAt:new Date().toISOString().split("T")[0], ...data }, ...prev]);
    try {
      if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
        const res=await fetch(APPS_SCRIPT_URL,{ method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ name:data.name, type:data.type, category:data.category, duration:data.duration, fileBase64:data.fileBase64??null, fileName:data.fileName??null, mimeType:data.mimeType??null }) });
        const text=await res.text();
        try { const result=JSON.parse(text); if (result.sound) setSounds(prev=>prev.map(s=>s.id===tempId?{...s,id:result.sound.id,fileUrl:result.sound.fileUrl}:s)); } catch {}
      }
      showToast(`Added "${data.name}" — try searching for it`);
    } finally { setIsUploading(false); }
  }, [showToast]);

  const handleDurationLoad = useCallback((id, duration) => {
    setSounds(prev => prev.map(s => s.id===id ? {...s, duration, _meta:true} : s));
  }, []);

  const editSound = useCallback(async (id, updates) => {
    setSounds(prev => prev.map(s => s.id===id ? {...s,...updates} : s));
    showToast(`Updated "${updates.name}"`);
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try { await fetch(APPS_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"update", id, ...updates }) }); } catch {}
    }
  }, [showToast]);

  const deleteSound = useCallback(async (id) => {
    if (playingId===id) stopPlayback();
    setSounds(prev => prev.filter(s => s.id!==id));
    showToast("Sound deleted");
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try { await fetch(APPS_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"delete", id }) }); } catch {}
    }
  }, [playingId, stopPlayback, showToast]);

  const downloadSound = useCallback(async (snd) => {
    if (snd.fileUrl) {
      try {
        showToast(`Downloading "${snd.name}"…`);
        const res=await fetch(snd.fileUrl), blob=await res.blob();
        const ext=snd.fileUrl.split(".").pop().split("?")[0].toLowerCase()||"mp3";
        const url=URL.createObjectURL(blob), a=document.createElement("a");
        a.href=url; a.download=`${snd.name.replace(/[\\/:*?"<>|]/g,"_")}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
      } catch { window.open(snd.fileUrl,"_blank"); }
      return;
    }
    const meta={ id:snd.id, name:snd.name, category:snd.category, duration_s:Math.round(snd.duration*100)/100, addedAt:snd.addedAt };
    downloadBlob(`${snd.name.replace(/[^\w]+/g,"_").toLowerCase()}.json`, JSON.stringify(meta,null,2));
    showToast(`Downloaded "${snd.name}"`);
  }, [showToast]);

  /* VFX CRUD */
  const editVfx = useCallback(async (id, updates) => {
    setVfxItems(prev => prev.map(v => v.id!==id ? v : {...v, title:updates.title}));
    showToast(`Updated "${updates.title}"`);
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        const res=await fetch(APPS_SCRIPT_URL,{ method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"updateVfx", id, ...updates }) });
        const text=await res.text();
        try { const result=JSON.parse(text); if (result.previewUrl) setVfxItems(prev=>prev.map(v=>v.id===id?{...v,previewUrl:result.previewUrl}:v)); } catch {}
      } catch {}
    }
  }, [showToast]);

  const deleteVfx = useCallback(async (id) => {
    setVfxItems(prev => prev.filter(v => v.id!==id));
    showToast("Visual deleted");
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try { await fetch(APPS_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"deleteVfx", id }) }); } catch {}
    }
  }, [showToast]);

  const addVfx = useCallback(async (data) => {
    setIsUploading(true);
    const tempId=`vtmp_${Date.now().toString(36)}`;
    setVfxItems(prev => [{ id:tempId, title:data.title, previewUrl:null, rawUrl:null }, ...prev]);
    try {
      if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
        const res=await fetch(APPS_SCRIPT_URL,{ method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"addVfx", ...data }) });
        const text=await res.text();
        try { const result=JSON.parse(text); if (result.vfx) setVfxItems(prev=>prev.map(v=>v.id===tempId?normalizeVfxItem(result.vfx):v)); } catch {}
      }
      showToast(`Added "${data.title}" to VFX library`);
    } finally { setIsUploading(false); }
  }, [showToast]);

  const downloadVfx = useCallback(async (item) => {
    if (!item.rawUrl) { showToast("No file yet — coming soon!"); return; }
    try {
      showToast(`Downloading "${item.title}"…`);
      const res=await fetch(item.rawUrl), blob=await res.blob();
      const ext=item.rawUrl.split(".").pop().split("?")[0].toLowerCase()||"mp4";
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=`${item.title.replace(/[\\/:*?"<>|]/g,"_")}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    } catch { if (item.rawUrl) window.open(item.rawUrl,"_blank"); }
  }, [showToast]);

  /* TXT CRUD */
  const addTxt = useCallback(async (data) => {
    setIsUploading(true);
    const tempId=`ttmp_${Date.now().toString(36)}`;
    setTxtItems(prev => [{ id:tempId, title:data.title, fontName:data.fontName, rawUrl:null }, ...prev]);
    try {
      if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
        const res=await fetch(APPS_SCRIPT_URL,{ method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"addFont", ...data }) });
        const text=await res.text();
        try { const result=JSON.parse(text); if (result.font) setTxtItems(prev=>prev.map(f=>f.id===tempId?normalizeFontItem(result.font):f)); } catch {}
      }
      showToast(`Added "${data.title}" to TXT library`);
    } finally { setIsUploading(false); }
  }, [showToast]);

  const editTxt = useCallback(async (id, updates) => {
    setTxtItems(prev => prev.map(f => f.id!==id ? f : {...f, title:updates.title}));
    showToast(`Updated "${updates.title}"`);
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        const res  = await fetch(APPS_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"updateFont", id, ...updates }) });
        const text = await res.text();
        try {
          const result = JSON.parse(text);
          if (result.previewUrl) setTxtItems(prev => prev.map(f => f.id===id ? {...f, previewUrl:result.previewUrl} : f));
        } catch {}
      } catch {}
    }
  }, [showToast]);

  const deleteTxt = useCallback(async (id) => {
    setTxtItems(prev => prev.filter(f => f.id!==id));
    showToast("Font deleted");
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try { await fetch(APPS_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({ action:"deleteFont", id }) }); } catch {}
    }
  }, [showToast]);

  const downloadTxt = useCallback(async (item) => {
    if (!item.rawUrl) { showToast("No file yet — coming soon!"); return; }
    try {
      showToast(`Downloading "${item.title}"…`);
      const res=await fetch(item.rawUrl), blob=await res.blob();
      const ext=item.rawUrl.split(".").pop().split("?")[0].toLowerCase()||"ttf";
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=`${item.title.replace(/[\\/:*?"<>|]/g,"_")}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    } catch { if (item.rawUrl) window.open(item.rawUrl,"_blank"); }
  }, [showToast]);

  /* Filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sounds
      .filter(s => {
        if (activeSubCat) { if (s.category!==activeSubCat) return false; }
        else if (activeMainCat) { const subs=CATEGORY_TREE[activeMainCat]; if (s.category!==activeMainCat&&!subs.includes(s.category)) return false; }
        if (q) { const hay=`${s.name} ${s.category}`.toLowerCase(); if (!hay.includes(q)) return false; }
        return true;
      })
      .sort((a,b) => { if (!a.addedAt&&!b.addedAt) return 0; if (!a.addedAt) return 1; if (!b.addedAt) return -1; return b.addedAt.localeCompare(a.addedAt); });
  }, [sounds, query, activeMainCat, activeSubCat]);

  const filteredVfx = useMemo(() => {
    const q = vfxQuery.trim().toLowerCase();
    if (!q) return vfxItems;
    return vfxItems.filter(v => v.title.toLowerCase().includes(q));
  }, [vfxItems, vfxQuery]);

  const filteredTxt = useMemo(() => {
    const q = txtQuery.trim().toLowerCase();
    if (!q) return txtItems;
    return txtItems.filter(f => f.title.toLowerCase().includes(q) || f.fontName.toLowerCase().includes(q));
  }, [txtItems, txtQuery]);

  const catCounts = useMemo(() => {
    const sub = {}; CATEGORIES.forEach(c => (sub[c]=0));
    sounds.forEach(s => { if (sub[s.category]!=null) sub[s.category]++; });
    return sub;
  }, [sounds]);

  /* Header derived */
  const headerCount = activeTab==="sfx" ? sounds.length : activeTab==="vfx" ? vfxItems.length : txtItems.length;
  const headerLoading = activeTab==="sfx" ? loadingData : activeTab==="vfx" ? loadingVfx : loadingTxt;
  const headerCountLabel = activeTab==="sfx" ? "sounds in Cuddle" : activeTab==="vfx" ? "clips in Cuddle" : "fonts in Cuddle";
  const uploadBtnLabel = isUploading ? "Uploading…" : activeTab==="txt" ? "Drop a new preset" : activeTab==="vfx" ? "Drop a new visual" : "Drop a new sound";

  return (
    <PasswordGate>
    <div className={`app-root${activeTab==="vfx"?" theme-vfx":activeTab==="txt"?" theme-txt":""}`}>
      <div className="orbs-container">
        <div className="orb orb-blue" /><div className="orb orb-green" />
        <div className="orb orb-teal" /><div className="orb orb-deep" />
        <div className="aurora-overlay" />
      </div>

      <div className="page-content">

        {/* ── Header with tabs inside ── */}
        <header className="header">
          <div className="header-card">
            <button className="header-refresh-btn" onClick={() => window.location.reload()} aria-label="Refresh page">
              <img src={logoSrc} alt="Cuddle Buddies DJ" className="header-logo" />
            </button>

            <div className="header-center">
              <div className="header-text" onClick={() => window.location.reload()} style={{ cursor:"pointer" }}>
                <h1 className="header-title">
                  <span className="header-title-gradient">The Great Library of Cuddles</span>
                </h1>
              </div>
              <div className="tab-switcher">
                <button className={`tab-btn${activeTab==="sfx"?" tab-active":""}`} onClick={() => setActiveTab("sfx")}>SFX</button>
                <button className={`tab-btn${activeTab==="vfx"?" tab-active":""}`} onClick={() => setActiveTab("vfx")}>VFX</button>
                <button className={`tab-btn${activeTab==="txt"?" tab-active":""}`} onClick={() => setActiveTab("txt")}>TXT</button>
              </div>
            </div>

            <div className="header-actions">
              <div className="sound-count">
                {headerLoading
                  ? <div className="sound-count-num" style={{ fontSize:18, opacity:0.5 }}>…</div>
                  : <div className="sound-count-num">{headerCount}</div>}
                <div className="sound-count-label">{headerCountLabel}</div>
              </div>
              <button
                onClick={() => !isUploading && setShowUpload(true)}
                className={`upload-trigger-btn${isUploading?" uploading":""}${activeTab==="txt"?" upload-trigger-txt":activeTab==="vfx"?" upload-trigger-vfx":""}`}
                disabled={isUploading}
              >
                <UploadIcon size={16} strokeWidth={2.4} />
                <span className="upload-trigger-label">{uploadBtnLabel}</span>
                <span className="upload-trigger-short">{isUploading?"…":"Add"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── VFX Section ── */}
        {activeTab === "vfx" && (
          <div className="vfx-section">
            <div className="section-search">
              <div className="search-wrap">
                <SearchIcon size={18} className="search-icon" />
                <input value={vfxQuery} onChange={e=>setVfxQuery(e.target.value)}
                  placeholder='Search visuals…' className="search-input search-input-sm" />
                {vfxQuery && <button onClick={()=>setVfxQuery("")} className="search-clear"><XIcon size={16}/></button>}
              </div>
            </div>
            {loadingVfx ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ opacity:0.4, animation:"spin 1s linear infinite" }}><FilmIcon size={26}/></div>
                <p className="empty-title" style={{ opacity:0.5 }}>Loading VFX…</p>
              </div>
            ) : filteredVfx.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FilmIcon size={26}/></div>
                <p className="empty-title">No visuals match that.</p>
              </div>
            ) : (
              <div className="vfx-grid">
                {filteredVfx.map(item => <VFXCard key={item.id} item={item} onDownload={downloadVfx} onEdit={setEditingVfx} />)}
              </div>
            )}
          </div>
        )}

        {/* ── TXT Section ── */}
        {activeTab === "txt" && (
          <div className="txt-section">
            <div className="section-search">
              <div className="search-wrap">
                <SearchIcon size={18} className="search-icon" />
                <input value={txtQuery} onChange={e=>setTxtQuery(e.target.value)}
                  placeholder='Search fonts…' className="search-input search-input-sm" />
                {txtQuery && <button onClick={()=>setTxtQuery("")} className="search-clear"><XIcon size={16}/></button>}
              </div>
            </div>
            {loadingTxt ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ opacity:0.4, animation:"spin 1s linear infinite" }}><FileIcon size={26}/></div>
                <p className="empty-title" style={{ opacity:0.5 }}>Loading fonts…</p>
              </div>
            ) : filteredTxt.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FileIcon size={26}/></div>
                <p className="empty-title">No fonts match that.</p>
              </div>
            ) : (
              <div className="txt-grid">
                {filteredTxt.map(item => <FontCard key={item.id} item={item} onDownload={downloadTxt} onEdit={setEditingTxt} />)}
              </div>
            )}
          </div>
        )}

        {/* ── SFX Section ── */}
        {activeTab === "sfx" && (
          <>
            <section className="filters-section">
              <div className="search-row">
                <div className="search-wrap">
                  <SearchIcon size={20} className="search-icon" />
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder='Search "cartoon jump sound", a tag, or a vibe…' className="search-input" />
                  {query && <button onClick={()=>setQuery("")} className="search-clear" aria-label="Clear search"><XIcon size={18}/></button>}
                </div>
                <div className="type-dropdown" ref={typeDropRef}>
                  <button className="type-dropdown-btn" onClick={()=>setShowTypeDrop(v=>!v)}
                    style={{ background:activeMainCat?"#F7CB07":undefined, color:activeMainCat?"#1a1730":undefined }}>
                    {activeMainCat??"All"}
                    <ChevronDownIcon size={14} style={{ transition:"transform .2s", transform:showTypeDrop?"rotate(180deg)":"none" }} />
                  </button>
                  {showTypeDrop && (
                    <div className="type-dropdown-menu anim-pop">
                      <button className="type-dropdown-item"
                        style={{ color:!activeMainCat?"#F7CB07":undefined, fontWeight:!activeMainCat?600:undefined }}
                        onClick={()=>{ setActiveMainCat(null); setActiveSubCat(null); setShowTypeDrop(false); }}>All</button>
                      {MAIN_CATEGORIES.map(m => (
                        <button key={m} className="type-dropdown-item"
                          style={{ color:activeMainCat===m?"#F7CB07":undefined, fontWeight:activeMainCat===m?600:undefined }}
                          onClick={()=>{ setActiveMainCat(m); setActiveSubCat(null); setShowTypeDrop(false); }}>{m}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(activeMainCat||subCatHiding) && (
                <div className={`subcat-chips${subCatHiding?" subcat-out":" subcat-in"}`}>
                  {CATEGORY_TREE[activeMainCat||prevMainCatRef.current]?.map(sc => {
                    const on = activeSubCat===sc;
                    return (
                      <button key={sc} onClick={()=>setActiveSubCat(on?null:sc)} className="cat-chip subcat-chip"
                        style={{ borderColor:on?"rgba(247,203,7,0.55)":"rgba(255,255,255,0.22)", background:on?"rgba(247,203,7,0.12)":"rgba(255,255,255,0.10)", color:on?"#F7CB07":"rgba(255,255,255,0.9)", fontSize:11.5 }}>
                        {sc} <span className="cat-count">{catCounts[sc]??0}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="results">
              {(loadingData||(shownSounds.length===0&&filtered.length>0)) ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ opacity:0.4, animation:"spin 1s linear infinite" }}><MusicIcon size={26}/></div>
                  <p className="empty-title" style={{ opacity:0.5 }}>Loading sounds…</p>
                </div>
              ) : (
                <div style={{ opacity:gridFading?0:1, transform:gridFading?"translateY(6px)":"translateY(0)", transition:"opacity 0.15s ease, transform 0.15s ease" }}>
                  {shownSounds.length===0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><MusicIcon size={26}/></div>
                      <p className="empty-title">No sounds match that.</p>
                      <p className="empty-sub">Try a different word, clear a filter, or drop it in yourself.</p>
                    </div>
                  ) : (
                    <div className="cards-grid">
                      {shownSounds.map(s => (
                        <SoundCard key={s.id} sound={s}
                          isPlaying={playingId===s.id}
                          progress={playingId===s.id?progress:0}
                          onPlay={playSound} onDownload={downloadSound} onSeek={seekSound}
                          onEdit={id=>setEditingSound(sounds.find(s=>s.id===id))}
                          onFilterMain={main=>{setActiveMainCat(main);setActiveSubCat(null);}}
                          onFilterSub={sub=>{setActiveMainCat(findMainCat(sub));setActiveSubCat(sub);}}
                          onDurationLoad={handleDurationLoad}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* ── Upload modal ── */}
      {showUpload && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={()=>setShowUpload(false)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true">
              {activeTab==="vfx" ? <VFXUploadPanel onAdd={addVfx} onClose={()=>setShowUpload(false)} />
              : activeTab==="txt" ? <TXTUploadPanel onAdd={addTxt} onClose={()=>setShowUpload(false)} />
              : <UploadPanel onAdd={addSound} onClose={()=>setShowUpload(false)} />}
            </div>
          </div>
        </div>
      )}

      {/* ── VFX edit modal ── */}
      {editingVfx && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={()=>setEditingVfx(null)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true">
              <VFXEditPanel item={editingVfx} onSave={editVfx} onDelete={deleteVfx} onClose={()=>setEditingVfx(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── TXT edit modal ── */}
      {editingTxt && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={()=>setEditingTxt(null)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true">
              <TXTEditPanel item={editingTxt} onSave={editTxt} onDelete={deleteTxt} onClose={()=>setEditingTxt(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── SFX edit modal ── */}
      {editingSound && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={()=>setEditingSound(null)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true" aria-label="Edit sound">
              <EditPanel sound={editingSound} onSave={editSound} onDelete={deleteSound} onClose={()=>setEditingSound(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div className="toast-wrap" style={{ opacity:toast?1:0, transform:`translate(-50%,${toast?0:12}px)` }}>
        {toast && (
          <div className="toast">
            <span className="toast-icon"><CheckIcon size={15} strokeWidth={3}/></span>
            <span className="toast-text">{toast}</span>
          </div>
        )}
      </div>
    </div>
    </PasswordGate>
  );
}
