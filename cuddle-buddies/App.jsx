import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  SearchIcon, PlayIcon, PauseIcon, DownloadIcon, UploadIcon,
  MusicIcon, XIcon, HeadphonesIcon, SlidersIcon, ClockIcon,
  CheckIcon, SparklesIcon, FileIcon, ChevronDownIcon,
} from "./icons";
import { SOUNDS, CATEGORIES, makeWave } from "./data";
import logoSrc from "/assets/logo.png";

/* ─── Вставте сюди посилання після деплою Apps Script ─── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWZ2ed33oXTpAEJFh0gfC-tJoK-K4pEHGZKdUf1qHOrRPFczuskeifQDHxg3M5bQCH/exec";

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
      background: "radial-gradient(1200px 800px at 12% -5%, #2a2456 0%, rgba(42,36,86,0) 55%), radial-gradient(1000px 700px at 100% 10%, #14384a 0%, rgba(20,56,74,0) 50%), linear-gradient(160deg, #0f1226 0%, #14132e 45%, #0c1822 100%)",
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

const TYPE_META = {
  Cartoonish: { dot: "#F7CB07",  label: "Cartoonish" },
  Realistic:  { dot: "#84CEE0", label: "Realistic"  },
};

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

const normalizeRemoteSound = (s) => ({
  ...s,
  duration: parseFloat(s.duration) || 1,
  tags: typeof s.tags === "string"
    ? s.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : (s.tags || []),
  wave: makeWave(s.name),
});

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

function SoundCard({ sound, isPlaying, progress, onPlay, onDownload }) {
  const tm = TYPE_META[sound.type] ?? TYPE_META.Cartoonish;
  return (
    <div
      className="sound-card"
      style={{
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
            <span className="type-badge">
              <span className="type-dot" style={{ background: tm.dot, boxShadow: `0 0 6px ${tm.dot}` }} />
              {tm.label}
            </span>
          </div>
          <div className="wave-wrap">
            <Waveform wave={sound.wave} progress={progress} active={isPlaying} />
          </div>
          <div className="sound-meta-row">
            <span className="dur-label">
              <ClockIcon size={13} /> {fmtDur(sound.duration)}
            </span>
            {sound.tags.slice(0, 4).map((t) => (
              <span key={t} className="tag-chip">#{t}</span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onDownload(sound)}
          className="dl-btn"
          aria-label={`Download ${sound.name} metadata`}
          title="Download metadata"
        >
          <DownloadIcon size={18} />
        </button>
      </div>
    </div>
  );
}

/* ─── UploadPanel ─── */

function UploadPanel({ onAdd, onClose }) {
  const [fileObj,    setFileObj]    = useState(null);
  const [fileName,   setFileName]   = useState(null);
  const [name,       setName]       = useState("");
  const [tags,       setTags]       = useState("");
  const [type,       setType]       = useState("Cartoonish");
  const [category,   setCategory]   = useState(CATEGORIES[0]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState(null);
  const fileRef = useRef(null);

  const canSubmit = name.trim().length > 0 && !uploading;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setUploading(true);
    setUploadErr(null);

    try {
      const parsedTags = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

      let fileBase64 = null;
      let mimeType   = null;
      if (fileObj) {
        fileBase64 = await fileToBase64(fileObj);
        mimeType   = fileObj.type || "audio/mpeg";
      }

      await onAdd({
        name:     name.trim(),
        type,     category,
        duration: 1 + Math.random() * 3,
        tags:     parsedTags.length ? parsedTags : ["uploaded"],
        wave:     makeWave(name + Date.now()),
        fileBase64, fileName, mimeType,
      });

      setName(""); setTags(""); setFileObj(null); setFileName(null);
      setType("Cartoonish"); setCategory(CATEGORIES[0]);
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
        <div className="upload-icon-wrap">
          <UploadIcon size={18} />
        </div>
        <div>
          <h2 className="upload-title">Drop a new sound</h2>
          <p className="upload-subtitle">Saves the file to Google Drive and adds it to the library.</p>
        </div>
      </div>

      <form onSubmit={submit} className="upload-form">
        <div>
          <label className="form-label">Audio file</label>
          <button type="button" onClick={() => fileRef.current?.click()} className="file-pick-btn">
            <span className="file-pick-icon"><FileIcon size={18} /></span>
            <span className="file-pick-text">
              <span className="file-pick-name">{fileName ?? "Choose an audio file"}</span>
              <span className="file-pick-hint">{fileName ? "Ready to upload" : "WAV, MP3, OGG"}</span>
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

        <div className="form-grid2">
          <div>
            <label className="form-label">Sound name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wobbly Jelly Drop" />
          </div>
          <div>
            <label className="form-label">Category</label>
            <div className="select-wrap">
              <select className="form-input form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: "#1c1b3a" }}>{c}</option>)}
              </select>
              <ChevronDownIcon size={16} className="select-chevron" />
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">Tags</label>
          <input className="form-input" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="funny, jump, retro" />
        </div>

        <div>
          <label className="form-label">Type</label>
          <div className="type-toggle">
            {["Realistic", "Cartoonish"].map((t) => {
              const on = type === t;
              return (
                <button key={t} type="button" onClick={() => setType(t)} className="type-toggle-btn"
                  style={{
                    background: on ? "#F7CB07" : "transparent",
                    color: on ? "#1a1730" : "rgba(255,255,255,0.7)",
                    boxShadow: on ? "0 4px 14px -4px rgba(247,203,7,0.6)" : "none",
                  }}>
                  <span className="type-toggle-dot" style={{ background: on ? "#1a1730" : TYPE_META[t].dot }} />
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {uploadErr && (
          <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0, textAlign: "center" }}>{uploadErr}</p>
        )}

        <button type="submit" disabled={!canSubmit} className="submit-btn"
          style={{ background: "#F7CB07", color: "#1a1730", boxShadow: "0 10px 30px -10px rgba(247,203,7,0.6)" }}>
          {uploading
            ? <><span style={{ opacity: 0.7 }}>Uploading…</span></>
            : <><UploadIcon size={17} strokeWidth={2.4} /> Add to library</>}
        </button>
      </form>
    </div>
  );
}

/* ─── App ─── */

export default function App() {
  const [sounds,      setSounds]      = useState(SOUNDS);
  const [loadingData, setLoadingData] = useState(true);
  const [query,       setQuery]       = useState("");
  const [typeFilter,  setTypeFilter]  = useState("All");
  const [activeCat,   setActiveCat]   = useState(null);
  const [playingId,   setPlayingId]   = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [toast,       setToast]       = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);
  const rafRef = useRef(null);

  /* Load sounds from Google Sheets on mount */
  useEffect(() => {
    if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") {
      setLoadingData(false);
      return;
    }
    fetch(APPS_SCRIPT_URL)
      .then((r) => r.json())
      .then((data) => {
        if (data.sounds && data.sounds.length > 0) {
          setSounds(data.sounds.map(normalizeRemoteSound));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  /* Escape closes modal */
  useEffect(() => {
    if (!showUpload) return;
    const onKey = (e) => { if (e.key === "Escape") setShowUpload(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showUpload]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2600);
  }, []);

  /* playback simulation */
  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPlayingId(null); setProgress(0);
  }, []);

  const playSound = useCallback((id) => {
    cancelAnimationFrame(rafRef.current);
    if (playingId === id) { stopPlayback(); return; }
    const snd = sounds.find((s) => s.id === id);
    if (!snd) return;
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

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* addSound — optimistic UI + POST to Apps Script */
  const addSound = useCallback(async (data) => {
    const tempId = `tmp_${Date.now().toString(36)}`;
    const entry  = { id: tempId, addedAt: new Date().toISOString().split("T")[0], ...data };
    setSounds((prev) => [entry, ...prev]);

    if (APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
      const res = await fetch(APPS_SCRIPT_URL, {
        method:  "POST",
        headers: { "Content-Type": "text/plain" },
        body:    JSON.stringify({
          name:       data.name,
          type:       data.type,
          category:   data.category,
          duration:   data.duration,
          tags:       data.tags,
          fileBase64: data.fileBase64 ?? null,
          fileName:   data.fileName  ?? null,
          mimeType:   data.mimeType  ?? null,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Server error");

      if (result.sound) {
        setSounds((prev) =>
          prev.map((s) => s.id === tempId
            ? { ...s, id: result.sound.id, fileUrl: result.sound.fileUrl }
            : s
          )
        );
      }
    }

    showToast(`Added "${data.name}" — try searching for it`);
  }, [showToast]);

  const downloadSound = useCallback((snd) => {
    const meta = {
      id: snd.id, name: snd.name, type: snd.type, category: snd.category,
      duration_s: Math.round(snd.duration * 100) / 100,
      tags: snd.tags, fileUrl: snd.fileUrl ?? null, addedAt: snd.addedAt,
    };
    downloadBlob(`${snd.name.replace(/[^\w]+/g, "_").toLowerCase()}.json`, JSON.stringify(meta, null, 2));
    showToast(`Downloaded metadata for "${snd.name}"`);
  }, [showToast]);

  /* filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sounds.filter((s) => {
      if (typeFilter !== "All" && s.type !== typeFilter) return false;
      if (activeCat && s.category !== activeCat) return false;
      if (q) {
        const hay = `${s.name} ${s.tags.join(" ")} ${s.category} ${s.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sounds, query, typeFilter, activeCat]);

  const catCounts = useMemo(() => {
    const m = {}; CATEGORIES.forEach((c) => (m[c] = 0));
    sounds.forEach((s) => { if (m[s.category] != null) m[s.category]++; });
    return m;
  }, [sounds]);

  const typeTabs = ["All", "Cartoonish", "Realistic"];

  return (
    <PasswordGate>
    <div className="app-root">
      <div className="orbs-container">
        <div className="orb orb-blue"  />
        <div className="orb orb-green" />
        <div className="orb orb-teal"  />
      </div>

      <div className="page-content">

        <header className="header">
          <div className="header-card">
            <img src={logoSrc} alt="Cuddle Buddies DJ" className="header-logo" />
            <div className="header-text">
              <div className="header-eyebrow">
                <HeadphonesIcon size={14} /> Internal Sound Library
              </div>
              <h1 className="header-title">
                <span className="header-title-gradient">The Great Cuddle Buddies</span>
                <br className="header-title-break" />
                <span className="header-title-plain"> Library of Sounds</span>
              </h1>
            </div>
            <div className="header-actions">
              <div className="sound-count">
                {loadingData
                  ? <div className="sound-count-num" style={{ fontSize: 18, opacity: 0.5 }}>…</div>
                  : <div className="sound-count-num">{sounds.length}</div>}
                <div className="sound-count-label">sounds in DB</div>
              </div>
              <button onClick={() => setShowUpload(true)} className="upload-trigger-btn"
                title="Add a new sound to the library">
                <UploadIcon size={16} strokeWidth={2.4} />
                <span className="upload-trigger-label">Drop a new sound</span>
                <span className="upload-trigger-short">Add</span>
              </button>
            </div>
          </div>
        </header>

        <section className="filters-section">
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

          <div className="type-tabs">
            {typeTabs.map((t) => {
              const on = typeFilter === t;
              return (
                <button key={t} onClick={() => setTypeFilter(t)} className="type-tab"
                  style={{
                    background: on ? "#F7CB07" : "transparent",
                    color: on ? "#1a1730" : "rgba(255,255,255,0.72)",
                    boxShadow: on ? "0 6px 18px -6px rgba(247,203,7,0.6)" : "none",
                  }}>
                  {t}
                </button>
              );
            })}
          </div>

          <div className="cat-chips">
            <button onClick={() => setActiveCat(null)} className="cat-chip"
              style={{
                borderColor: !activeCat ? "rgba(122,224,191,0.6)"  : "rgba(255,255,255,0.14)",
                background:  !activeCat ? "rgba(122,224,191,0.16)" : "rgba(255,255,255,0.04)",
                color:       !activeCat ? "#7AE0BF" : "rgba(255,255,255,0.7)",
              }}>
              <SparklesIcon size={13} /> All categories
            </button>
            {CATEGORIES.map((c) => {
              const on = activeCat === c;
              return (
                <button key={c} onClick={() => setActiveCat(on ? null : c)} className="cat-chip"
                  style={{
                    borderColor: on ? "rgba(166,181,233,0.65)" : "rgba(255,255,255,0.14)",
                    background:  on ? "rgba(166,181,233,0.18)" : "rgba(255,255,255,0.04)",
                    color:       on ? "#A6B5E9" : "rgba(255,255,255,0.72)",
                  }}>
                  {c} <span className="cat-count">{catCounts[c]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="results">
          <div className="results-header">
            <span className="results-meta">
              <SlidersIcon size={15} />
              <span>
                <span className="results-count">{filtered.length}</span>
                {" "}{filtered.length === 1 ? "result" : "results"}
                {query && <> for "<span className="results-query">{query}</span>"</>}
              </span>
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><MusicIcon size={26} /></div>
              <p className="empty-title">No sounds match that.</p>
              <p className="empty-sub">Try a different word, clear a filter, or drop it in yourself.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {filtered.map((s) => (
                <SoundCard
                  key={s.id} sound={s}
                  isPlaying={playingId === s.id}
                  progress={playingId === s.id ? progress : 0}
                  onPlay={playSound} onDownload={downloadSound}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="modal-overlay">
          <div className="modal-backdrop anim-fade" onClick={() => setShowUpload(false)} />
          <div className="modal-positioner">
            <div className="modal-box anim-pop" role="dialog" aria-modal="true" aria-label="Drop a new sound">
              <UploadPanel onAdd={addSound} onClose={() => setShowUpload(false)} />
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
