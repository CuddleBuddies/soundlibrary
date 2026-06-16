import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  SearchIcon, PlayIcon, PauseIcon, DownloadIcon, UploadIcon,
  MusicIcon, XIcon, ClockIcon,
  CheckIcon, FileIcon, ChevronDownIcon, PencilIcon, FilmIcon,
} from "./icons";
import { SOUNDS, CATEGORIES, CATEGORY_TREE, MAIN_CATEGORIES, makeWave } from "./data";
import logoSrc from "/assets/logo.png";

/* Визначаємо чи відкрито сайт всередині CEP-панелі Premiere Pro */
const isCEP = window.parent !== window;

/* Надсилає команду в CEP-панель (якщо ми всередині неї) */
const sendCEP = (type, payload) => {
  if (!isCEP) return;
  window.parent.postMessage({ type, ...payload }, "*");
};

/* ─── Вставте сюди посилання після деплою Apps Script ─── */
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
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  };

  if (unlocked) return children;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      background: "#050814",
    }}>
      <div style={{
        width: "100%", maxWidth: "380px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "24px", backdropFilter: "blur(24px)", padding: "36px 28px",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8)",
        animation: shake ? "cbShake 0.45s ease" : "cbPop 0.22s cubic-bezier(.16,1,.3,1)",
      }}>
        <img src={logoSrc} alt="Cuddle Buddies" style={{ height: 72, display: "block", margin: "0 auto 20px", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))" }} />
        <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, textAlign: "center", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Cuddle Buddies
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", margin: "0 0 24px" }}>
          Enter the password to access the sound library
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: error ? "rgba(255,80,80,0.08)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 12, padding: "12px 16px", fontSize: 15,
              color: "#fff", outline: "none", fontFamily: "inherit",
              transition: "border-color 0.2s, background 0.2s",
            }}
          />
          {error && (
            <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0, textAlign: "center" }}>
              Wrong password — try again
            </p>
          )}
          <button type="submit" style={{
            background: "#F7CB07", color: "#1a1730", border: "none",
            borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 10px 30px -10px rgba(247,203,7,0.6)",
          }}>
            Enter
          </button>
        </form>
      </div>
      <style>{`
        @keyframes cbShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/* ─── helpers ─── */

const fmtDur = (s) => {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  }
  return `0:${String(Math.round(s)).padStart(2, "0")}`;
};

const CAT_COLORS = {
  "Animal Sounds": "#7AE0BF",
  "Ambience":      "#84CEE0",
  "SFX":           "#F7CB07",
};

/* maps old/legacy category values to new ones */
const LEGACY_CAT_MAP = {
  "Ambient": "Ambience", "Meme": "Cartoonish", "Whoosh": "SFX",
  "UI": "UI sounds", "Cartoon sounds": "Cartoonish",
  "Cats": "Cat", "Dogs": "Dog", "Parrots": "Parrot",
  "Raccoons": "Raccoon", "Pigs": "Pig", "Donkeys": "Donkey",
  "Horses": "Horse", "Goats": "Goat", "Ducks": "Duck",
  "Geese": "Goose", "Other animals": "Other animal",
};

const findMainCat = (cat) => {
  for (const [main, subs] of Object.entries(CATEGORY_TREE)) {
    if (subs.includes(cat)) return main;
  }
  return MAIN_CATEGORIES.includes(cat) ? cat : null;
};

/* ─── VFX helpers ─── */

const VFX_PLACEHOLDERS = [
  "Smoke Burst Alpha", "Light Leak Warm", "Glitch Static",
  "Bokeh Float", "Rain Overlay", "Film Grain Texture",
  "Lens Flare Gold", "Dust Particles", "Color Bleed",
].map((title, i) => ({ id: `vfx-p-${i}`, title, previewUrl: null, rawUrl: null }));

const getPreviewUrl = (url, offset = 0, crop = "fill", gravity = "auto") => {
  if (!url) return null;
  const so = offset > 0 ? `so_${offset},` : "";
  return url.replace("/upload/", `/upload/${so}c_${crop},ar_16:9,g_${gravity},w_400,q_auto,f_webm,vc_vp9/`);
};

const getThumbnailUrl = (url, offset = 0, crop = "fill", gravity = "auto") => {
  if (!url) return null;
  const so = offset > 0 ? `so_${offset},` : "so_auto,";
  return url.replace("/upload/", `/upload/${so}c_${crop},ar_16:9,g_${gravity},f_jpg,q_auto,w_400/`);
};

const normalizeVfxItem = (v) => ({
  id:             String(v.ID || v.id || Math.random()),
  title:          String(v.Title || v.title || "Untitled"),
  previewUrl:     v.Preview_URL     || v.previewUrl     || null,
  rawUrl:         v.Raw_URL         || v.rawUrl         || null,
  webmUrl:        v.Webm_URL        || v.webmUrl        || null,
  previewOffset:  Number(v.Preview_Offset  || v.previewOffset  || 0),
  previewCrop:    String(v.Preview_Crop    || v.previewCrop    || "fill"),
  previewGravity: String(v.Preview_Gravity || v.previewGravity || "auto"),
});

const downloadBlob = (filename, text, mime = "application/json") => {
  const blob = new Blob([text], { type: mime });
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
  const url   = URL.createObjectURL(file);
  const audio = new Audio();
  audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration); };
  audio.onerror          = () => { URL.revokeObjectURL(url); resolve(null); };
  audio.src = url;
});

const normalizeRemoteSound = (s) => {
  try {
    const rawCat  = String(s.category || "SFX");
    const category = LEGACY_CAT_MAP[rawCat] ?? rawCat;
    return {
      ...s,
      name:     String(s.name || "Unknown Sound"),
      category,
      duration: parseFloat(s.duration) || 1,
      wave: makeWave(String(s.name || "sound")),
    };
  } catch { return null; }
};

/* ─── Waveform ─── */

function Waveform({ wave, progress = 0, active = false }) {
  return (
    <div className="waveform" aria-hidden="true">
      {wave.map((h, i) => {
        const played = active && i / wave.length <= progress;
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              height: `${Math.round(h * 100)}%`,
              background: played ? "#F7CB07" : "rgba(255,255,255,0.28)",
              boxShadow: played ? "0 0 6px rgba(247,203,7,0.6)" : "none",
            }}
          />
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
    audio.onloadedmetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration))
        onDurationLoad?.(sound.id, audio.duration);
    };
    audio.src = sound.fileUrl;
    return () => { audio.pause(); audio.src = ""; };
  }, [sound.id, sound.fileUrl, sound._meta]); // eslint-disable-line

  const handleWaveClick = (e) => {
    if (!isPlaying || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(sound.id, Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const handleAction = (sound) => {
    if (isCEP && sound.fileUrl) {
      sendCEP("CB_ADD_TO_TIMELINE", { sound: { name: sound.name, fileUrl: sound.fileUrl } });
    } else {
      onDownload(sound);
    }
  };

  return (
    <div
      className="sound-card"
      draggable={isCEP && !!sound.fileUrl}
      onDragStart={isCEP && sound.fileUrl ? (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({
          name: sound.name, fileUrl: sound.fileUrl,
        }));
        sendCEP("CB_DRAG_START", { sound: { name: sound.name, fileUrl: sound.fileUrl } });
      } : undefined}
      onDragEnd={isCEP ? () => sendCEP("CB_DRAG_END") : undefined}
      onDoubleClick={(e) => { if (e.target.closest("button")) return; handleAction(sound); }}
      style={{
        position: "relative",
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
          {isPlaying
            ? <PauseIcon size={20} strokeWidth={2.4} />
            : <PlayIcon  size={20} strokeWidth={2.4} style={{ marginLeft: 2 }} />}
        </button>

        <div className="sound-body">
          <div className="sound-title-row">
            <h3 className="sound-name">{sound.name}</h3>
          </div>
          <div
            className="wave-wrap"
            onClick={handleWaveClick}
            style={{ cursor: isPlaying ? "pointer" : "default" }}
            title={isPlaying ? "Click to seek" : ""}
          >
            <Waveform wave={sound.wave} progress={progress} active={isPlaying} />
          </div>
          <div className="sound-meta-row">
            <span className="dur-label">
              <ClockIcon size={13} /> {fmtDur(sound.duration)}
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", flexShrink: 0 }}>
              <button className="type-badge cat-filter-btn" onClick={() => onFilterMain?.(mainCat ?? sound.category)}>
                <span className="type-dot" style={{ background: catColor, boxShadow: `0 0 6px ${catColor}` }} />
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

      <button
        className="card-edit-btn"
        onClick={() => onEdit(sound.id)}
        aria-label="Edit sound"
        title="Edit"
      >
        <PencilIcon size={14} />
      </button>

      <button
        onClick={() => handleAction(sound)}
        className="dl-btn"
        aria-label={isCEP ? `Add ${sound.name} to Timeline` : `Download ${sound.name}`}
        title={isCEP ? "Add to Timeline" : "Download"}
      >
        <DownloadIcon size={18} />
      </button>
    </div>
  );
}

/* ─── VFXCard ─── */

function VFXCard({ item, onDownload, onEdit }) {
  const videoRef = useRef(null);
  const thumbnailUrl = (item.previewUrl && item.previewUrl !== item.rawUrl)
    ? item.previewUrl
    : getThumbnailUrl(item.rawUrl, item.previewOffset, item.previewCrop, item.previewGravity);
  const videoSrc = item.webmUrl || getPreviewUrl(item.rawUrl, item.previewOffset, item.previewCrop, item.previewGravity);

  const handleEnter = () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (!v.src) {
      v.addEventListener("canplay", () => {
        if (!videoRef.current) return;
        videoRef.current.classList.add("vfx-video-ready");
        videoRef.current.play().catch(() => {});
      }, { once: true });
      v.src = videoSrc;
    } else if (v.readyState >= 3) {
      v.classList.add("vfx-video-ready");
      v.play().catch(() => {});
    } else {
      v.play().catch(() => {});
    }
  };
  const handleLeave = () => {
    const v = videoRef.current;
    if (!v) return;
    v.classList.remove("vfx-video-ready");
    v.pause();
    v.currentTime = 0;
  };
  const handleVideoError = () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    v._r = (v._r || 0) + 1;
    if (v._r > 10) return;
    setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.addEventListener("canplay", () => {
        if (videoRef.current) videoRef.current.classList.add("vfx-video-ready");
      }, { once: true });
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }, 3000);
  };

  return (
    <div
      className="vfx-card"
      draggable={isCEP && !!item.rawUrl}
      onDragStart={isCEP && item.rawUrl ? (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ name: item.title, fileUrl: item.rawUrl }));
        sendCEP("CB_DRAG_START", { sound: { name: item.title, fileUrl: item.rawUrl } });
      } : undefined}
      onDragEnd={isCEP ? () => sendCEP("CB_DRAG_END") : undefined}
      onDoubleClick={() => {
        if (isCEP && item.rawUrl) sendCEP("CB_ADD_TO_TIMELINE", { sound: { name: item.title, fileUrl: item.rawUrl } });
        else onDownload(item);
      }}
    >
      <div className="vfx-thumb" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt={item.title} className="vfx-thumb-img" />
          : <div className="vfx-thumb-empty"><FilmIcon size={28} style={{ opacity: 0.3 }} /><span>Coming soon</span></div>
        }
        {videoSrc && <video ref={videoRef} muted loop playsInline className="vfx-video" onError={handleVideoError} />}
      </div>
      <div className="vfx-footer">
        <button className="vfx-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Edit">
          <PencilIcon size={13} />
        </button>
        <span className="vfx-title">{item.title}</span>
        <button className="vfx-dl-btn" onClick={() => onDownload(item)} title="Download" disabled={!item.rawUrl}>
          <DownloadIcon size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── EditPanel ─── */

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
    try {
      await onSave(sound.id, { name: name.trim(), category: subCat || mainCat });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn">
        <XIcon size={17} />
      </button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background: "rgba(166,181,233,.15)", border: "1px solid rgba(166,181,233,.35)", color: "#A6B5E9" }}>
          <PencilIcon size={18} />
        </div>
        <div>
          <h2 className="upload-title">Edit sound</h2>
          <p className="upload-subtitle">{sound.name}</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="upload-form">
        <div>
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-grid2">
          <div>
            <label className="form-label">Category <span style={{ color: "#ff6b6b" }}>*</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={mainCat}
                onChange={(e) => { setMainCat(e.target.value); setSubCat(""); }}>
                {MAIN_CATEGORIES.map((m) => <option key={m} value={m} style={{ background: "#1c1b3a" }}>{m}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
          <div>
            <label className="form-label">Subcategory <span style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>(optional)</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={subCat} onChange={(e) => setSubCat(e.target.value)}>
                <option value="" style={{ background: "#1c1b3a" }}>None</option>
                {CATEGORY_TREE[mainCat]?.map((sc) => <option key={sc} value={sc} style={{ background: "#1c1b3a" }}>{sc}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="submit-btn"
          style={{ background: "#A6B5E9", color: "#1a1730", boxShadow: "0 10px 30px -10px rgba(166,181,233,0.5)" }}>
          {saving ? "Saving…" : <><CheckIcon size={17} strokeWidth={2.4} /> Save changes</>}
        </button>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 12 }}>
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid rgba(255,80,80,.3)", background: "rgba(255,80,80,.08)", color: "#ff6b6b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Delete sound
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmDel(false)} className="del-cancel-btn" style={{ flex: 1 }}>Cancel</button>
              <button type="button" onClick={() => { onDelete(sound.id); onClose(); }} className="del-confirm-btn" style={{ flex: 1 }}>Confirm delete</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── UploadPanel ─── */

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

    setUploading(true);
    setUploadErr(null);

    try {
      let fileBase64 = null;
      let mimeType   = null;
      if (fileObj) {
        fileBase64 = await fileToBase64(fileObj);
        mimeType   = fileObj.type || "audio/mpeg";
      }

      const duration = fileObj ? ((await getFileDuration(fileObj)) ?? 1) : 1;
      await onAdd({
        name:     name.trim(),
        type:     "Realistic",
        category: subCat || mainCat,
        duration,
        _meta:    !!fileObj,
        wave:     makeWave(name + Date.now()),
        fileBase64, fileName, mimeType,
      });

      setName(""); setFileObj(null); setFileName(null);
      setMainCat(""); setSubCat("");
      if (fileRef.current) fileRef.current.value = "";
      onClose?.();
    } catch (err) {
      console.error("[Upload] Error:", err);
      setUploadErr("Помилка: " + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn">
        <XIcon size={17} />
      </button>

      <div className="upload-heading">
        <div className="upload-icon-wrap">
          <UploadIcon size={18} />
        </div>
        <div>
          <h2 className="upload-title">Drop a new sound</h2>
          <p className="upload-subtitle">Upload to Cloudinary and add to the library.</p>
        </div>
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
          <input
            ref={fileRef} type="file" accept="audio/*" className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFileObj(f);
              setFileName(f?.name ?? null);
            }}
          />
        </div>

        <div>
          <label className="form-label">Sound name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wobbly Jelly Drop" />
        </div>

        <div className="form-grid2">
          <div>
            <label className="form-label">Category <span style={{ color: "#ff6b6b" }}>*</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={mainCat}
                onChange={(e) => { setMainCat(e.target.value); setSubCat(""); }}>
                <option value="" style={{ background: "#1c1b3a" }}>Select category…</option>
                {MAIN_CATEGORIES.map((m) => <option key={m} value={m} style={{ background: "#1c1b3a" }}>{m}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
          <div>
            <label className="form-label">Subcategory <span style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>(optional)</span></label>
            <div className="select-wrap">
              <select className="form-input form-select" value={subCat} onChange={(e) => setSubCat(e.target.value)}
                disabled={!mainCat} style={{ opacity: mainCat ? 1 : 0.4 }}>
                <option value="" style={{ background: "#1c1b3a" }}>No subcategory</option>
                {mainCat && CATEGORY_TREE[mainCat].map((sc) =>
                  <option key={sc} value={sc} style={{ background: "#1c1b3a" }}>{sc}</option>
                )}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>

        {uploadErr && (
          <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0, textAlign: "center" }}>{uploadErr}</p>
        )}

        <button type="submit" disabled={!canSubmit} className={`submit-btn${uploading ? " uploading" : ""}`}
          style={uploading
            ? { color: "#1a1730" }
            : { background: "#F7CB07", color: "#1a1730", boxShadow: "0 10px 30px -10px rgba(247,203,7,0.6)" }
          }>
          {uploading
            ? <><span style={{ opacity: 0.7 }}>Uploading…</span></>
            : <><UploadIcon size={17} strokeWidth={2.4} /> Add to library</>}
        </button>
      </form>
    </div>
  );
}

const GRAVITY_GRID = [
  ["north_west","north","north_east"],
  ["west",      "center","east"],
  ["south_west","south","south_east"],
];

/* ─── VFXEditPanel ─── */

function VFXEditPanel({ item, onSave, onDelete, onClose }) {
  const [title,          setTitle]          = useState(item.title);
  const [previewOffset,  setPreviewOffset]  = useState(item.previewOffset  || 0);
  const [previewCrop,    setPreviewCrop]    = useState(item.previewCrop    || "fill");
  const [previewGravity, setPreviewGravity] = useState(item.previewGravity || "auto");
  const [videoDur,       setVideoDur]       = useState(0);
  const [saving,         setSaving]         = useState(false);
  const [confirmDel,     setConfirmDel]     = useState(false);
  const editVidRef = useRef(null);

  const liveThumbnail = getThumbnailUrl(item.rawUrl, previewOffset, previewCrop, previewGravity);

  const handleSeek = (e) => {
    const t = Number(e.target.value);
    setPreviewOffset(t);
    if (editVidRef.current) editVidRef.current.currentTime = t;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(item.id, { title: title.trim(), previewOffset: Number(previewOffset), previewCrop, previewGravity });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn">
        <XIcon size={17} />
      </button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background: "rgba(166,181,233,.15)", border: "1px solid rgba(166,181,233,.35)", color: "#A6B5E9" }}>
          <PencilIcon size={18} />
        </div>
        <div>
          <h2 className="upload-title">Edit visual</h2>
          <p className="upload-subtitle">{item.title}</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="upload-form">
        <div>
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {/* Video frame picker */}
        <div>
          <label className="form-label">
            Thumbnail frame
            {videoDur > 0 && <span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, marginLeft: 6 }}>
              {Math.round(previewOffset)}s / {Math.round(videoDur)}s
            </span>}
          </label>
          <div style={{ borderRadius: 10, overflow: "hidden", background: "#04111e", aspectRatio: "16/9", position: "relative" }}>
            {liveThumbnail && !videoDur
              ? <img src={liveThumbnail} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
              : null}
            {item.rawUrl && (
              <video ref={editVidRef} src={item.rawUrl} muted preload="metadata"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: videoDur ? "block" : "none", position: "absolute", inset: 0 }}
                onLoadedMetadata={() => {
                  const dur = editVidRef.current?.duration || 0;
                  setVideoDur(dur);
                  if (editVidRef.current) editVidRef.current.currentTime = previewOffset;
                }}
              />
            )}
          </div>
          {videoDur > 0 && (
            <input type="range" min="0" max={Math.floor(videoDur)} step="0.5"
              value={previewOffset} onChange={handleSeek} className="vfx-frame-slider" />
          )}
        </div>

        {/* Crop position + mode */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div>
            <label className="form-label">Crop position</label>
            <div className="gravity-picker">
              {GRAVITY_GRID.flat().map((g) => (
                <button key={g} type="button"
                  className={`gravity-btn${previewGravity === g || (g === "center" && previewGravity === "auto") ? " active" : ""}`}
                  onClick={() => setPreviewGravity(g)} title={g.replace(/_/g, " ")} />
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Crop mode</label>
            <div className="select-wrap">
              <select className="form-input form-select" value={previewCrop} onChange={(e) => setPreviewCrop(e.target.value)}>
                <option value="fill" style={{ background: "#1c1b3a" }}>Fill (crop to fit)</option>
                <option value="fit"  style={{ background: "#1c1b3a" }}>Fit (full frame)</option>
                <option value="pad"  style={{ background: "#1c1b3a" }}>Pad (dark border)</option>
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="submit-btn"
          style={{ background: "#A6B5E9", color: "#1a1730", boxShadow: "0 10px 30px -10px rgba(166,181,233,0.5)" }}>
          {saving ? "Saving…" : <><CheckIcon size={17} strokeWidth={2.4} /> Save changes</>}
        </button>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 12 }}>
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid rgba(255,80,80,.3)", background: "rgba(255,80,80,.08)", color: "#ff6b6b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Delete visual
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmDel(false)} className="del-cancel-btn" style={{ flex: 1 }}>Cancel</button>
              <button type="button" onClick={() => { onDelete(item.id); onClose(); }} className="del-confirm-btn" style={{ flex: 1 }}>Confirm delete</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── VFXUploadPanel ─── */

function VFXUploadPanel({ onAdd, onClose }) {
  const [fileObj,       setFileObj]       = useState(null);
  const [fileName,      setFileName]      = useState(null);
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [duration,      setDuration]      = useState(0);
  const [posterOffset,  setPosterOffset]  = useState(0);
  const [title,         setTitle]         = useState("");
  const [uploading,     setUploading]     = useState(false);
  const [uploadErr,     setUploadErr]     = useState(null);
  const [frameDark,     setFrameDark]     = useState(false);
  const fileRef     = useRef(null);
  const localVidRef = useRef(null);

  const canSubmit = title.trim().length > 0 && fileObj && !uploading;

  const onFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFileObj(f);
    setFileName(f?.name ?? null);
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    if (f) {
      setLocalVideoUrl(URL.createObjectURL(f));
      setPosterOffset(0);
      setDuration(0);
    } else {
      setLocalVideoUrl(null);
    }
  };

  const handleMetadata = () => {
    const v = localVidRef.current;
    if (!v) return;
    const dur = v.duration || 0;
    setDuration(dur);
    const mid = Math.floor(dur / 2);
    setPosterOffset(mid);
    v.currentTime = mid;
  };

  const handleSeeked = () => {
    const v = localVidRef.current;
    if (!v) return;
    v.play().then(() => { v.pause(); setFrameDark(false); }).catch(() => setFrameDark(true));
  };

  const handleSlider = (e) => {
    const t = Number(e.target.value);
    setPosterOffset(t);
    if (localVidRef.current) localVidRef.current.currentTime = t;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fileBase64 = await fileToBase64(fileObj);
      const mimeType   = fileObj.type || "video/mp4";
      await onAdd({ title: title.trim(), fileBase64, fileName, mimeType, previewOffset: posterOffset });
      setTitle(""); setFileObj(null); setFileName(null); setLocalVideoUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      onClose?.();
    } catch (err) {
      setUploadErr("Помилка: " + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-panel">
      <button type="button" onClick={onClose} aria-label="Close" className="upload-close-btn">
        <XIcon size={17} />
      </button>
      <div className="upload-heading">
        <div className="upload-icon-wrap" style={{ background: "rgba(122,224,191,.15)", border: "1px solid rgba(122,224,191,.35)", color: "#7AE0BF" }}>
          <FilmIcon size={18} />
        </div>
        <div>
          <h2 className="upload-title">Drop a new visual</h2>
          <p className="upload-subtitle">Upload to Cloudinary and add to VFX library.</p>
        </div>
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

        {localVideoUrl && (
          <div>
            <label className="form-label">
              Thumbnail frame
              {duration > 0 && <span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, marginLeft: 6 }}>
                {Math.round(posterOffset)}s / {Math.round(duration)}s
              </span>}
            </label>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#04111e", aspectRatio: "16/9" }}>
              <video
                ref={localVidRef}
                src={localVideoUrl}
                muted playsInline preload="auto"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onLoadedMetadata={handleMetadata}
                onSeeked={handleSeeked}
              />
              {frameDark && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", fontSize: 11, color: "rgba(255,255,255,.6)", textAlign: "center", padding: 12 }}>
                  Browser can't preview this format.<br />Frame offset will be extracted by Cloudinary.
                </div>
              )}
            </div>
            {duration > 0 && (
              <input
                type="range" min="0" max={Math.floor(duration)} step="0.5"
                value={posterOffset} onChange={handleSlider}
                className="vfx-frame-slider"
              />
            )}
          </div>
        )}

        <div>
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Smoke Burst Alpha" />
        </div>
        {uploadErr && (
          <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0, textAlign: "center" }}>{uploadErr}</p>
        )}
        <button type="submit" disabled={!canSubmit} className={`submit-btn${uploading ? " uploading" : ""}`}
          style={uploading
            ? { color: "#1a1730" }
            : { background: "#7AE0BF", color: "#1a1730", boxShadow: "0 10px 30px -10px rgba(122,224,191,0.6)" }
          }>
          {uploading
            ? <span style={{ opacity: 0.7 }}>Uploading…</span>
            : <><FilmIcon size={17} strokeWidth={2.4} /> Add to VFX library</>}
        </button>
      </form>
    </div>
  );
}

/* ─── App ─── */

export default function App() {
  const [activeTab,     setActiveTab]     = useState("sfx");
  const [vfxItems,      setVfxItems]      = useState(VFX_PLACEHOLDERS);
  const [loadingVfx,    setLoadingVfx]    = useState(false);
  const [editingVfx,    setEditingVfx]    = useState(null);
  const vfxLoadedRef = useRef(false);

  const [sounds,        setSounds]        = useState([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [query,         setQuery]         = useState("");
  const [activeMainCat, setActiveMainCat] = useState(null);
  const [activeSubCat,  setActiveSubCat]  = useState(null);
  const [playingId,   setPlayingId]   = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [toast,       setToast]       = useState(null);
  const [showUpload,      setShowUpload]      = useState(false);
  const [editingSound,    setEditingSound]    = useState(null);
  const [isUploading,     setIsUploading]     = useState(false);
  const [showTypeDrop,    setShowTypeDrop]    = useState(false);
  const [subCatHiding,    setSubCatHiding]    = useState(false);
  const [shownSounds,     setShownSounds]     = useState([]);
  const [gridFading,      setGridFading]      = useState(false);
  const prevMainCatRef = useRef(null);
  const typeDropRef    = useRef(null);
  const rafRef         = useRef(null);
  const fadeRef        = useRef(null);
  const gridInitRef    = useRef(true);
  const toastTimerRef  = useRef(null);

  /* Body VFX theme class */
  useEffect(() => {
    document.body.classList.toggle("theme-vfx", activeTab === "vfx");
    return () => document.body.classList.remove("theme-vfx");
  }, [activeTab]);

  /* Load VFX data on first tab switch — with localStorage cache */
  useEffect(() => {
    if (activeTab !== "vfx" || vfxLoadedRef.current) return;
    vfxLoadedRef.current = true;
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") return;
    try {
      const c = JSON.parse(localStorage.getItem("cb_vfx_v1") || "null");
      if (c?.data?.length && Date.now() - c.ts < 5 * 60 * 1000) {
        setVfxItems(c.data.map(normalizeVfxItem));
      }
    } catch {}
    setLoadingVfx(true);
    fetch(`${APPS_SCRIPT_URL}?sheet=VFX_Data`)
      .then((r) => r.json())
      .then((data) => {
        if (data.vfx?.length) {
          setVfxItems(data.vfx.map(normalizeVfxItem));
          localStorage.setItem("cb_vfx_v1", JSON.stringify({ data: data.vfx, ts: Date.now() }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVfx(false));
  }, [activeTab]);

  useEffect(() => {
    let t;
    if (activeMainCat) {
      prevMainCatRef.current = activeMainCat;
      setSubCatHiding(false);
    } else if (prevMainCatRef.current) {
      setSubCatHiding(true);
      t = setTimeout(() => { setSubCatHiding(false); prevMainCatRef.current = null; }, 200);
    }
    return () => clearTimeout(t);
  }, [activeMainCat]);

  useEffect(() => {
    if (!showTypeDrop) return;
    const handler = (e) => {
      if (typeDropRef.current && !typeDropRef.current.contains(e.target)) setShowTypeDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypeDrop]);

  /* Load sounds from Google Sheets — with localStorage cache */
  useEffect(() => {
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") { setLoadingData(false); return; }
    try {
      const c = JSON.parse(localStorage.getItem("cb_sounds_v1") || "null");
      if (c?.data?.length && Date.now() - c.ts < 5 * 60 * 1000) {
        const cached = c.data.map(normalizeRemoteSound).filter(Boolean);
        if (cached.length) { setSounds(cached); setLoadingData(false); }
      }
    } catch {}
    fetch(APPS_SCRIPT_URL)
      .then((r) => r.json())
      .then((data) => {
        if (data.sounds?.length) {
          const remote = data.sounds.map(normalizeRemoteSound).filter(Boolean);
          if (remote.length) {
            setSounds(remote);
            localStorage.setItem("cb_sounds_v1", JSON.stringify({ data: data.sounds, ts: Date.now() }));
            return;
          }
        }
        setSounds(SOUNDS);
      })
      .catch(() => { setSounds(SOUNDS); })
      .finally(() => setLoadingData(false));
  }, []);

  /* Cards display: initial load */
  useEffect(() => {
    if (!loadingData) {
      setShownSounds(filtered);
      gridInitRef.current = false;
    }
  }, [loadingData]); // eslint-disable-line

  /* Cards display: category filter — fade out → swap → fade in */
  useEffect(() => {
    if (gridInitRef.current) return;
    clearTimeout(fadeRef.current);
    const snap = filtered;
    setGridFading(true);
    fadeRef.current = setTimeout(() => { setShownSounds(snap); setGridFading(false); }, 150);
    return () => clearTimeout(fadeRef.current);
  }, [activeMainCat, activeSubCat]); // eslint-disable-line

  /* Cards display: search — instant, no fade */
  useEffect(() => {
    if (gridInitRef.current) return;
    setShownSounds(filtered);
  }, [query]); // eslint-disable-line

  /* Cards display: sounds array changed (add / delete) — instant update */
  useEffect(() => {
    if (gridInitRef.current) return;
    setShownSounds(filtered);
  }, [sounds]); // eslint-disable-line

  /* Escape closes modals */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowUpload(false); setEditingSound(null); setEditingVfx(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* playback */
  const audioRef = useRef(null);

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null); setProgress(0);
  }, []);

  const seekSound = useCallback((id, fraction) => {
    if (!audioRef.current || playingId !== id) return;
    const audio = audioRef.current;
    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = audio.duration * fraction;
      setProgress(fraction);
    }
  }, [playingId]);

  const playSound = useCallback((id) => {
    cancelAnimationFrame(rafRef.current);
    if (playingId === id) { stopPlayback(); return; }
    const snd = sounds.find((s) => s.id === id);
    if (!snd) return;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    if (snd.fileUrl) {
      const audio = new Audio(snd.fileUrl);
      audio.volume = 0.3;
      audioRef.current = audio;
      setPlayingId(id); setProgress(0);
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setSounds(prev => prev.map(s => s.id === id ? { ...s, duration: audio.duration } : s));
        }
      };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };
      audio.onended = () => { setPlayingId(null); setProgress(0); };
      audio.play().catch(() => {
        setPlayingId(null); setProgress(0);
        showToast("Не вдалось відтворити файл");
      });
      return;
    }

    /* fallback simulation for demo sounds */
    setPlayingId(id); setProgress(0);
    const dur   = Math.min(Math.max(snd.duration, 0.8), 6) * 1000;
    const start = performance.now();
    const tick  = (now) => {
      const p = (now - start) / dur;
      if (p >= 1) {
        setProgress(1);
        setTimeout(() => { setPlayingId((cur) => cur === id ? null : cur); setProgress(0); }, 120);
        return;
      }
      setProgress(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [playingId, sounds, stopPlayback]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) audioRef.current.pause();
  }, []);

  /* addSound — optimistic UI + POST to Apps Script */
  const addSound = useCallback(async (data) => {
    setIsUploading(true);
    const tempId = `tmp_${Date.now().toString(36)}`;
    const entry  = { id: tempId, addedAt: new Date().toISOString().split("T")[0], ...data };
    setSounds((prev) => [entry, ...prev]);

    try {
      if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
        try {
          const body = JSON.stringify({
            name:       data.name,
            type:       data.type,
            category:   data.category,
            duration:   data.duration,
            fileBase64: data.fileBase64 ?? null,
            fileName:   data.fileName  ?? null,
            mimeType:   data.mimeType  ?? null,
          });
          const res  = await fetch(APPS_SCRIPT_URL, {
            method:  "POST",
            headers: { "Content-Type": "text/plain" },
            body,
          });
          const text = await res.text();
          try {
            const result = JSON.parse(text);
            if (result.sound) {
              setSounds((prev) =>
                prev.map((s) => s.id === tempId
                  ? { ...s, id: result.sound.id, fileUrl: result.sound.fileUrl, fileId: result.sound.fileId }
                  : s
                )
              );
            }
          } catch {
            /* відповідь не JSON — але дані вже збережено в Drive+Sheets */
          }
        } catch (networkErr) {
          throw new Error("Мережева помилка: " + networkErr.message);
        }
      }
      showToast(`Added "${data.name}" — try searching for it`);
    } finally {
      setIsUploading(false);
    }
  }, [showToast]);

  const handleDurationLoad = useCallback((id, duration) => {
    setSounds((prev) => prev.map((s) => s.id === id ? { ...s, duration, _meta: true } : s));
  }, []);

  const editSound = useCallback(async (id, updates) => {
    setSounds((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    showToast(`Updated "${updates.name}"`);
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "update", id, ...updates }),
        });
      } catch { /* silent */ }
    }
  }, [showToast]);

  const deleteSound = useCallback(async (id) => {
    if (playingId === id) stopPlayback();
    setSounds((prev) => prev.filter((s) => s.id !== id));
    showToast("Sound deleted");
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "delete", id }),
        });
      } catch { /* silent */ }
    }
  }, [playingId, stopPlayback, showToast]);

  const downloadSound = useCallback(async (snd) => {
    if (snd.fileUrl) {
      try {
        showToast(`Downloading "${snd.name}"…`);
        const res  = await fetch(snd.fileUrl);
        const blob = await res.blob();
        const ext  = snd.fileUrl.split(".").pop().split("?")[0].toLowerCase() || "mp3";
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `${snd.name.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch {
        window.open(snd.fileUrl, "_blank");
      }
      return;
    }
    const meta = {
      id: snd.id, name: snd.name, category: snd.category,
      duration_s: Math.round(snd.duration * 100) / 100,
      addedAt: snd.addedAt,
    };
    downloadBlob(`${snd.name.replace(/[^\w]+/g, "_").toLowerCase()}.json`, JSON.stringify(meta, null, 2));
    showToast(`Downloaded "${snd.name}"`);
  }, [showToast]);

  const editVfx = useCallback(async (id, updates) => {
    setVfxItems((prev) => prev.map((v) => {
      if (v.id !== id) return v;
      const merged = { ...v, ...updates };
      return {
        ...merged,
        previewUrl: getThumbnailUrl(v.rawUrl, merged.previewOffset, merged.previewCrop, merged.previewGravity),
      };
    }));
    showToast(`Updated "${updates.title}"`);
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "updateVfx", id, ...updates }),
        });
      } catch { /* silent */ }
    }
  }, [showToast]);

  const deleteVfx = useCallback(async (id) => {
    setVfxItems((prev) => prev.filter((v) => v.id !== id));
    showToast("Visual deleted");
    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "deleteVfx", id }),
        });
      } catch { /* silent */ }
    }
  }, [showToast]);

  const addVfx = useCallback(async (data) => {
    setIsUploading(true);
    const tempId = `vtmp_${Date.now().toString(36)}`;
    const entry  = { id: tempId, title: data.title, previewUrl: null, rawUrl: null, webmUrl: null, previewOffset: data.previewOffset || 0, previewCrop: "fill", previewGravity: "auto" };
    setVfxItems((prev) => [entry, ...prev]);
    try {
      if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
        const res  = await fetch(APPS_SCRIPT_URL, {
          method:  "POST",
          headers: { "Content-Type": "text/plain" },
          body:    JSON.stringify({ action: "addVfx", ...data }),
        });
        const text = await res.text();
        try {
          const result = JSON.parse(text);
          if (result.vfx) {
            setVfxItems((prev) =>
              prev.map((v) => v.id === tempId ? normalizeVfxItem(result.vfx) : v)
            );
          }
        } catch { /* відповідь не JSON */ }
      }
      showToast(`Added "${data.title}" to VFX library`);
    } finally {
      setIsUploading(false);
    }
  }, [showToast]);

  const downloadVfx = useCallback(async (item) => {
    if (!item.rawUrl) { showToast("No file yet — coming soon!"); return; }
    try {
      showToast(`Downloading "${item.title}"…`);
      const res  = await fetch(item.rawUrl);
      const blob = await res.blob();
      const ext  = item.rawUrl.split(".").pop().split("?")[0].toLowerCase() || "mp4";
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${item.title.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { if (item.rawUrl) window.open(item.rawUrl, "_blank"); }
  }, [showToast]);

  /* filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sounds
      .filter((s) => {
        if (activeSubCat) {
          if (s.category !== activeSubCat) return false;
        } else if (activeMainCat) {
          const subs = CATEGORY_TREE[activeMainCat];
          if (s.category !== activeMainCat && !subs.includes(s.category)) return false;
        }
        if (q) {
          const hay = `${s.name} ${s.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!a.addedAt && !b.addedAt) return 0;
        if (!a.addedAt) return 1;
        if (!b.addedAt) return -1;
        return b.addedAt.localeCompare(a.addedAt);
      });
  }, [sounds, query, activeMainCat, activeSubCat]);

  const catCounts = useMemo(() => {
    const sub = {}; CATEGORIES.forEach((c) => (sub[c] = 0));
    sounds.forEach((s) => { if (sub[s.category] != null) sub[s.category]++; });
    return sub;
  }, [sounds]);

  return (
    <PasswordGate>
    <div className={`app-root${activeTab === "vfx" ? " theme-vfx" : ""}`}>
      <div className="orbs-container">
        <div className="orb orb-blue"  />
        <div className="orb orb-green" />
        <div className="orb orb-teal"  />
        <div className="orb orb-deep"  />
        <div className="aurora-overlay" />
      </div>

      <div className="page-content">

        <header className="header">
          <div className="header-card">
            <button className="header-refresh-btn" onClick={() => window.location.reload()} aria-label="Refresh page">
              <img src={logoSrc} alt="Cuddle Buddies DJ" className="header-logo" />
            </button>
            <div className="header-text" onClick={() => window.location.reload()} style={{ cursor: "pointer" }}>
              <h1 className="header-title">
                <span className="header-title-gradient">The Great Library of Cuddles</span>
              </h1>
            </div>
            <div className="header-actions">
              <div className="sound-count">
                {activeTab === "sfx" ? (
                  <>
                    {loadingData
                      ? <div className="sound-count-num" style={{ fontSize: 18, opacity: 0.5 }}>…</div>
                      : <div className="sound-count-num">{sounds.length}</div>}
                    <div className="sound-count-label">sounds in Cuddle</div>
                  </>
                ) : (
                  <>
                    {loadingVfx
                      ? <div className="sound-count-num" style={{ fontSize: 18, opacity: 0.5 }}>…</div>
                      : <div className="sound-count-num">{vfxItems.length}</div>}
                    <div className="sound-count-label">clips in Cuddle</div>
                  </>
                )}
              </div>
              <button
                onClick={() => !isUploading && setShowUpload(true)}
                className={`upload-trigger-btn${isUploading ? " uploading" : ""}`}
                disabled={isUploading}
                title="Add a new sound to the library"
              >
                <UploadIcon size={16} strokeWidth={2.4} />
                <span className="upload-trigger-label">{isUploading ? "Uploading…" : activeTab === "vfx" ? "Drop a new visual" : "Drop a new sound"}</span>
                <span className="upload-trigger-short">{isUploading ? "…" : "Add"}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="tab-switcher-wrap">
          <div className="tab-switcher">
            <button className={`tab-btn${activeTab === "sfx" ? " tab-active" : ""}`} onClick={() => setActiveTab("sfx")}>SFX</button>
            <button className={`tab-btn${activeTab === "vfx" ? " tab-active" : ""}`} onClick={() => setActiveTab("vfx")}>VFX</button>
          </div>
        </div>

        {activeTab === "vfx" && (
          <div className="vfx-section">
            {loadingVfx ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ opacity: 0.4, animation: "spin 1s linear infinite" }}><FilmIcon size={26} /></div>
                <p className="empty-title" style={{ opacity: 0.5 }}>Loading VFX…</p>
              </div>
            ) : (
              <div className="vfx-grid">
                {vfxItems.map((item) => (
                  <VFXCard key={item.id} item={item} onDownload={downloadVfx} onEdit={setEditingVfx} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "sfx" && <><section className="filters-section">
          <div className="search-row">
            <div className="search-wrap">
              <SearchIcon size={20} className="search-icon" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder='Search "cartoon jump sound", a tag, or a vibe…'
                className="search-input"
              />
              {query && (
                <button onClick={() => setQuery("")} className="search-clear" aria-label="Clear search">
                  <XIcon size={18} />
                </button>
              )}
            </div>

            <div className="type-dropdown" ref={typeDropRef}>
              <button
                className="type-dropdown-btn"
                onClick={() => setShowTypeDrop((v) => !v)}
                style={{ background: activeMainCat ? "#F7CB07" : undefined, color: activeMainCat ? "#1a1730" : undefined }}
              >
                {activeMainCat ?? "All"}
                <ChevronDownIcon size={14} style={{ transition: "transform .2s", transform: showTypeDrop ? "rotate(180deg)" : "none" }} />
              </button>
              {showTypeDrop && (
                <div className="type-dropdown-menu anim-pop">
                  <button className="type-dropdown-item"
                    style={{ color: !activeMainCat ? "#F7CB07" : undefined, fontWeight: !activeMainCat ? 600 : undefined }}
                    onClick={() => { setActiveMainCat(null); setActiveSubCat(null); setShowTypeDrop(false); }}>
                    All
                  </button>
                  {MAIN_CATEGORIES.map((m) => {
                    const on = activeMainCat === m;
                    return (
                      <button key={m} className="type-dropdown-item"
                        style={{ color: on ? "#F7CB07" : undefined, fontWeight: on ? 600 : undefined }}
                        onClick={() => { setActiveMainCat(m); setActiveSubCat(null); setShowTypeDrop(false); }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {(activeMainCat || subCatHiding) && (
            <div className={`subcat-chips${subCatHiding ? " subcat-out" : " subcat-in"}`}>
              {CATEGORY_TREE[activeMainCat || prevMainCatRef.current]?.map((sc) => {
                const on = activeSubCat === sc;
                return (
                  <button key={sc} onClick={() => setActiveSubCat(on ? null : sc)} className="cat-chip subcat-chip"
                    style={{
                      borderColor: on ? "rgba(247,203,7,0.55)" : "rgba(255,255,255,0.22)",
                      background:  on ? "rgba(247,203,7,0.12)" : "rgba(255,255,255,0.10)",
                      color:       on ? "#F7CB07" : "rgba(255,255,255,0.9)",
                      fontSize: 11.5,
                    }}>
                    {sc} <span className="cat-count">{catCounts[sc] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="results">
          {(loadingData || (shownSounds.length === 0 && filtered.length > 0)) ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ opacity: 0.4, animation: "spin 1s linear infinite" }}><MusicIcon size={26} /></div>
              <p className="empty-title" style={{ opacity: 0.5 }}>Loading sounds…</p>
            </div>
          ) : (
            <div style={{ opacity: gridFading ? 0 : 1, transform: gridFading ? "translateY(6px)" : "translateY(0)", transition: "opacity 0.15s ease, transform 0.15s ease" }}>
            {shownSounds.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><MusicIcon size={26} /></div>
                <p className="empty-title">No sounds match that.</p>
                <p className="empty-sub">Try a different word, clear a filter, or drop it in yourself.</p>
              </div>
            ) : (
            <div className="cards-grid">
              {shownSounds.map((s) => (
                <SoundCard
                  key={s.id} sound={s}
                  isPlaying={playingId === s.id}
                  progress={playingId === s.id ? progress : 0}
                  onPlay={playSound} onDownload={downloadSound} onSeek={seekSound}
                  onEdit={(id) => setEditingSound(sounds.find((s) => s.id === id))}
                  onFilterMain={(main) => { setActiveMainCat(main); setActiveSubCat(null); }}
                  onFilterSub={(sub) => { setActiveMainCat(findMainCat(sub)); setActiveSubCat(sub); }}
                  onDurationLoad={handleDurationLoad}
                />
              ))}
            </div>
            )}
            </div>
          )}
        </div>
        </>}
      </div>

      {showUpload && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={() => setShowUpload(false)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true">
              {activeTab === "vfx"
                ? <VFXUploadPanel onAdd={addVfx} onClose={() => setShowUpload(false)} />
                : <UploadPanel    onAdd={addSound} onClose={() => setShowUpload(false)} />}
            </div>
          </div>
        </div>
      )}

      {editingVfx && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={() => setEditingVfx(null)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true">
              <VFXEditPanel
                item={editingVfx}
                onSave={editVfx}
                onDelete={deleteVfx}
                onClose={() => setEditingVfx(null)}
              />
            </div>
          </div>
        </div>
      )}

      {editingSound && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={() => setEditingSound(null)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true" aria-label="Edit sound">
              <EditPanel
                sound={editingSound}
                onSave={editSound}
                onDelete={deleteSound}
                onClose={() => setEditingSound(null)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="toast-wrap" style={{ opacity: toast ? 1 : 0, transform: `translate(-50%, ${toast ? 0 : 12}px)` }}>
        {toast && (
          <div className="toast">
            <span className="toast-icon"><CheckIcon size={15} strokeWidth={3} /></span>
            <span className="toast-text">{toast}</span>
          </div>
        )}
      </div>
    </div>
    </PasswordGate>
  );
}
