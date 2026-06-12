// =========================================================
// GEMINI API
// =========================================================
const PRESET_PROMPTS = {
  cuddle:  "Make this picture as a youtube thumbnail, without text, improve lighting.",
  enhance: "Improve image quality, keep original details.",
  expand:  "Expand image to a 16:9 widescreen aspect ratio. Naturally extend the background and sides to fit 1280x720, keeping the original central subject unchanged.",
  cutify:  "Make an animal cuter, a little bit enlarge its eyes, keep it looking natural, do not add pink cheeks.",
  unblur:  "Remove blur and motion from this image.",
  combine: "Blend these two images into one, keep original animal appearance and details.",
  remove:  "Remove the specific object I have selected or described.",
};


const PRESET_GENERATING = {
  cuddle:    "Making it extra cuddly…",
  enhance:   "Polishing every pixel…",
  expand:    "Expanding the scene…",
  cutify:    "Making those eyes bigger…",
  unblur:    "Recovering lost details…",
  combine:   "Blending two worlds…",
  remove:    "Making it disappear…",
  freestyle: "Following your vision…",
};

const resizeForUpload = (url) => new Promise((resolve) => {
  const img = new window.Image();
  img.onload = () => {
    const MAX = 1280;
    const scale = Math.min(1, MAX / img.width, MAX / img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    resolve({ base64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mimeType: "image/jpeg" });
  };
  img.src = url;
});

const callGemini = async (imageUrl, prompt) => {
  const { base64, mimeType } = await resizeForUpload(imageUrl);
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, prompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Generation failed");
  return `data:${data.mimeType};base64,${data.imageData}`;
};

const callGeminiTwo = async (imageUrlA, imageUrlB, prompt) => {
  const [a, b] = await Promise.all([resizeForUpload(imageUrlA), resizeForUpload(imageUrlB)]);
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: a.base64, mimeType: a.mimeType, imageBase64B: b.base64, mimeTypeB: b.mimeType, prompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Generation failed");
  return `data:${data.mimeType};base64,${data.imageData}`;
};

// =========================================================
// PIXEL ENGINE — professional ImageData processing
// =========================================================

// ─── Exposure (EV) + S-Curve Contrast LUT ────────────────────────────────────
// exposure: internal -30..30 → real EV -3.0..+3.0
// Multiplicative 2^EV scaling anchors absolute blacks and lifts midtones/highlights naturally
const buildBCLut = (exposure, contrast) => {
  const lut    = new Uint8ClampedArray(256);
  const evMul  = Math.pow(2, exposure / 10); // EV stops: +1 EV = 2×, -1 EV = 0.5×
  const c      = contrast / 100;
  for (let i = 0; i < 256; i++) {
    let v = i * evMul;                        // multiply — black (0) stays black
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    if (c !== 0) {
      const x = v / 255;
      if (c > 0) {
        const s = x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
        v = (x * (1 - c) + s * c) * 255;
      } else {
        v = (x + c * (x - 0.5)) * 255;
      }
    }
    lut[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  return lut;
};

const applyColorAndTone = (srcData, w, h, adj) => {
  const len = srcData.length;
  const out = new Uint8ClampedArray(len);

  // LUT replaces per-pixel exposure + contrast math (4× faster)
  const lut = buildBCLut(adj.exposure ?? 0, adj.contrast);

  // Temperature: direct R/B channel scaling — warm = +R −B, cool = −R +B (−25%)
  const tempR = adj.temperature * 0.675;
  const tempB = -adj.temperature * 0.675;
  // Tint: G channel — +tint = magenta (−G), −tint = green (+G) (−25%)
  const tintG = -adj.tint * 0.3;
  const satF  = 1 + adj.saturation / 200; // ±100 → ±50%
  const shadA = adj.shadows    * 0.75;
  const highA = adj.highlights * 0.75;

  for (let i = 0; i < len; i += 4) {
    let r = srcData[i], g = srcData[i + 1], b = srcData[i + 2];

    // 1. Temperature & Tint (white balance — direct RGB channel manipulation)
    r += tempR; b += tempB; g += tintG;
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;

    // 2. Luminance mask from post-WB pixel (used for Shadows/Highlights)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // 3. Brightness + S-Curve Contrast via LUT
    r = lut[r | 0]; g = lut[g | 0]; b = lut[b | 0];

    // 4. Saturation (luminosity-preserving)
    if (satF !== 1) {
      const gr = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gr + (r - gr) * satF;
      g = gr + (g - gr) * satF;
      b = gr + (b - gr) * satF;
    }

    // 5. Shadows — cubic smooth-step mask, peaks at black, zero at midtones
    if (shadA !== 0 && lum < 128) {
      const t = 1 - lum / 128;
      const sw = t * t * (3 - 2 * t); // smooth-step: no flat-gray fog
      r += shadA * sw; g += shadA * sw; b += shadA * sw;
    }

    // 6. Highlights — cubic smooth-step mask, peaks at white, zero at midtones
    if (highA !== 0 && lum > 128) {
      const t = (lum - 128) / 127;
      const hw = t * t * (3 - 2 * t);
      r += highA * hw; g += highA * hw; b += highA * hw;
    }

    out[i]     = r < 0 ? 0 : r > 255 ? 255 : r;
    out[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    out[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    out[i + 3] = srcData[i + 3];
  }
  return out;
};

// Separable Gaussian unsharp mask (2 × 1D passes = 4× faster than 8-neighbor box)
// Focuses on micro-contrast (fur, texture) with smooth rolloff
const applyUnsharpMask = (data, width, height, amount) => {
  if (amount === 0) return data;
  const strength = (amount / 100) * 3.1875;

  // Horizontal blur pass: kernel [¼, ½, ¼]
  const hBlur = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const l   = x > 0           ? (y * width + x - 1) * 4 : idx;
      const r   = x < width  - 1  ? (y * width + x + 1) * 4 : idx;
      for (let c = 0; c < 3; c++)
        hBlur[idx + c] = (data[l + c] + (data[idx + c] << 1) + data[r + c]) >> 2;
      hBlur[idx + 3] = data[idx + 3];
    }
  }

  // Vertical blur pass + unsharp mask in one sweep
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const u   = y > 0           ? ((y - 1) * width + x) * 4 : idx;
      const d   = y < height - 1  ? ((y + 1) * width + x) * 4 : idx;
      for (let c = 0; c < 3; c++) {
        const blurred = (hBlur[u + c] + (hBlur[idx + c] << 1) + hBlur[d + c]) >> 2;
        const sharp   = data[idx + c] + strength * (data[idx + c] - blurred);
        out[idx + c]  = sharp < 0 ? 0 : sharp > 255 ? 255 : sharp;
      }
    }
  }
  return out;
};

const processPixelsData = (imageData, adj) => {
  let data = applyColorAndTone(imageData.data, imageData.width, imageData.height, adj);
  if ((adj.sharpness || 0) > 0)
    data = applyUnsharpMask(data, imageData.width, imageData.height, adj.sharpness);
  return data;
};

// =========================================================
// APP
// =========================================================
const App = () => {
  const [image, setImage] = React.useState(null);
  const [image2, setImage2] = React.useState(null);
  const [originalImage, setOriginalImage] = React.useState(null);
  const [comparing, setComparing] = React.useState(false);
  const [cropping, setCropping] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState(null);
  const [removeText, setRemoveText] = React.useState("");
  const [freestyleText, setFreestyleText] = React.useState("");
  const [selecting, setSelecting] = React.useState(false);
  const [brushSize, setBrushSize] = React.useState(28);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError] = React.useState(null);
  const [genCount, setGenCount] = React.useState(() => Number(localStorage.getItem("gen-count") || 0));
  const dragCounter = React.useRef(0);

  // Brush strokes (lifted from ImageCanvas so App can use them for Remove)
  const [strokes, setStrokes] = React.useState([]);
  const imageContainerRef = React.useRef(null);

  // ── Canvas pixel adjustments ──────────────────────────────────────────────
  const [adjustments, setAdjustments] = React.useState({ ...window.DEFAULT_ADJUSTMENTS });
  const [displayUrl,  setDisplayUrl]  = React.useState(null);
  const sourcePixelsRef = React.useRef(null);
  const adjRafRef       = React.useRef(null);
  const adjustmentsRef  = React.useRef({ ...window.DEFAULT_ADJUSTMENTS });

  // ── Locked canvas size (captured before AI gen to prevent layout jump) ──────
  const [lockedSize, setLockedSize] = React.useState(null);

  // ── Blend (post-generation opacity mix) ───────────────────────────────────
  const [showBlend,    setShowBlend]    = React.useState(false);
  const [blendOpen,    setBlendOpen]    = React.useState(false);
  const [blendOpacity, setBlendOpacity] = React.useState(100);
  const preGenPixelsRef  = React.useRef(null);
  const postGenPixelsRef = React.useRef(null);
  const blendRafRef      = React.useRef(null);

  const decodePixels = (url) => new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / img.naturalWidth, MAX / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      cvs.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(cvs.getContext("2d").getImageData(0, 0, w, h));
    };
    img.onerror = reject;
    img.src = url;
  });

  const runBlend = (opacity) => {
    if (blendRafRef.current) cancelAnimationFrame(blendRafRef.current);
    blendRafRef.current = requestAnimationFrame(() => {
      const pre  = preGenPixelsRef.current;
      const post = postGenPixelsRef.current;
      if (!pre || !post) return;
      if (opacity >= 100) { setDisplayUrl(null); return; }
      const t = opacity / 100;
      const len = post.data.length;
      const out = new Uint8ClampedArray(len);
      for (let i = 0; i < len; i += 4) {
        out[i]   = pre.data[i]   + (post.data[i]   - pre.data[i])   * t;
        out[i+1] = pre.data[i+1] + (post.data[i+1] - pre.data[i+1]) * t;
        out[i+2] = pre.data[i+2] + (post.data[i+2] - pre.data[i+2]) * t;
        out[i+3] = post.data[i+3];
      }
      const cvs = document.createElement("canvas");
      cvs.width = post.width; cvs.height = post.height;
      cvs.getContext("2d").putImageData(new ImageData(out, post.width, post.height), 0, 0);
      setDisplayUrl(cvs.toDataURL("image/jpeg", 0.92));
    });
  };

  const handleBlendChange = (opacity) => {
    setBlendOpacity(opacity);
    runBlend(opacity);
  };

  const handleBlendApply = () => {
    const url = displayUrl || image.url;
    commitImage({ ...image, url });
    setShowBlend(false);
    setBlendOpen(false);
    setBlendOpacity(100);
    setLockedSize(null);
    setDisplayUrl(null);
    preGenPixelsRef.current  = null;
    postGenPixelsRef.current = null;
  };

  const runProcess = (adj) => {
    if (adjRafRef.current) cancelAnimationFrame(adjRafRef.current);
    adjRafRef.current = requestAnimationFrame(() => {
      const src = sourcePixelsRef.current;
      if (!src) return;
      const isDefault = Object.keys(window.DEFAULT_ADJUSTMENTS).every(k => adj[k] === window.DEFAULT_ADJUSTMENTS[k]);
      if (isDefault) { setDisplayUrl(null); return; }
      const processed = processPixelsData(src, adj);
      const out = document.createElement("canvas");
      out.width = src.width; out.height = src.height;
      out.getContext("2d").putImageData(new ImageData(processed, src.width, src.height), 0, 0);
      setDisplayUrl(out.toDataURL("image/jpeg", 0.92));
    });
  };

  // Reload source pixels (scaled to max 1280px) when image changes
  React.useEffect(() => {
    if (!image?.url) { setDisplayUrl(null); sourcePixelsRef.current = null; return; }
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / img.naturalWidth, MAX / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      cvs.getContext("2d").drawImage(img, 0, 0, w, h);
      sourcePixelsRef.current = cvs.getContext("2d").getImageData(0, 0, w, h);
      runProcess(adjustmentsRef.current);
    };
    img.src = image.url;
  }, [image]);

  // Re-process whenever sliders change
  React.useEffect(() => {
    runProcess(adjustments);
  }, [adjustments]);

  const handleAdjustChange = (key, val) => {
    const next = { ...adjustmentsRef.current, [key]: val };
    adjustmentsRef.current = next;
    setAdjustments(next);
  };

  const handleAdjustReset = () => {
    const def = { ...window.DEFAULT_ADJUSTMENTS };
    adjustmentsRef.current = def;
    setAdjustments(def);
  };

  // Apply bakes adjustments at full original resolution
  const handleAdjustApply = () => {
    if (!image) return;
    const adj = adjustments;
    const isDefault = Object.keys(window.DEFAULT_ADJUSTMENTS).every(k => adj[k] === window.DEFAULT_ADJUSTMENTS[k]);
    if (isDefault) return;
    const img = new window.Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = img.naturalWidth; cvs.height = img.naturalHeight;
      const ctx = cvs.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const processed = processPixelsData(imageData, adj);
      ctx.putImageData(new ImageData(processed, cvs.width, cvs.height), 0, 0);
      commitImage({ ...image, url: cvs.toDataURL("image/png") });
      const def = { ...window.DEFAULT_ADJUSTMENTS };
      adjustmentsRef.current = def;
      setAdjustments(def);
    };
    img.src = image.url;
  };

  // Undo/Redo
  const [undoStack, setUndoStack] = React.useState([]);
  const [redoStack, setRedoStack] = React.useState([]);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const commitImage = (newImg) => {
    setUndoStack(prev => [...prev, image]);
    setRedoStack([]);
    setImage(newImg);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(s => [...s, image]);
    setUndoStack(s => s.slice(0, -1));
    setImage(prev);
    setComparing(false);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(s => [...s, image]);
    setRedoStack(s => s.slice(0, -1));
    setImage(next);
    setComparing(false);
  };

  const handleRemoveWithBrush = async () => {
    if (!image || strokes.length === 0) return;
    const container = imageContainerRef.current;
    if (!container) return;
    const imgEl = container.querySelector("img");
    if (!imgEl) return;
    setGenerating(true);
    setGenError(null);
    setGenCount(c => { const n = c + 1; localStorage.setItem("gen-count", n); return n; });
    try {
      const displayW = container.offsetWidth;
      const displayH = container.offsetHeight;
      const scaleX = imgEl.naturalWidth / displayW;
      const scaleY = imgEl.naturalHeight / displayH;
      const canvas = document.createElement("canvas");
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgEl, 0, 0);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      strokes.forEach(s => {
        ctx.strokeStyle = "rgba(255,80,0,0.92)";
        ctx.lineWidth = s.size * scaleX;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * scaleX, p.y * scaleY);
          else ctx.lineTo(p.x * scaleX, p.y * scaleY);
        });
        ctx.stroke();
      });
      const maskedUrl = canvas.toDataURL("image/png");
      const prompt = "Remove the areas painted in bright orange from this image seamlessly, filling the background naturally.";
      const resultUrl = await callGemini(maskedUrl, prompt);
      setOriginalImage(image);
      setComparing(false);
      setCropping(false);
      commitImage({ name: image.name, url: resultUrl });
      setStrokes([]);
      setSelecting(false);
    } catch (e) {
      console.error("[RemoveWithBrush] failed:", e);
      setGenError(e.message);
      setTimeout(() => setGenError(null), 8000);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = (img) => {
    setImage(img);
    setOriginalImage(null);
    setComparing(false);
    setCropping(false);
    setSelecting(false);
    setStrokes([]);
    const def = { ...window.DEFAULT_ADJUSTMENTS };
    adjustmentsRef.current = def;
    setAdjustments(def);
    setDisplayUrl(null);
    setUndoStack([]);
    setRedoStack([]);
    setShowBlend(false);
    setBlendOpen(false);
    setBlendOpacity(100);
    setLockedSize(null);
    preGenPixelsRef.current  = null;
    postGenPixelsRef.current = null;
  };

  const handleCropApply = (url) => {
    const newImg = { ...image, url };
    commitImage(newImg);
    setCropping(false);
  };

  const handleAddLogo = (type) => {
    if (!image) return;
    const logoSrc = type === "cb" ? "assets/logo-cb.png" : "assets/logo-cb-tv.png";
    const mainImg = new window.Image();
    mainImg.onload = () => {
      const logoImg = new window.Image();
      logoImg.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(mainImg, 0, 0, 1280, 720);
        ctx.drawImage(logoImg, 0, 0, 1280, 720);
        commitImage({ ...image, url: canvas.toDataURL("image/png") });
      };
      logoImg.src = logoSrc;
    };
    mainImg.src = image.url;
  };

  const handleExport = () => {
    if (!image) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280; canvas.height = 720;
      canvas.getContext("2d").drawImage(img, 0, 0, 1280, 720);
      const jpeg = canvas.toDataURL("image/jpeg", 0.98);
      // Download
      const a = document.createElement("a");
      a.href = jpeg;
      a.download = (image.name || "cuddle-buddies").replace(/\.[^.]+$/, "") + "-1280x720.jpg";
      a.click();
      // Save to library
      const base64 = jpeg.split(",")[1];
      window.saveLibraryItem({ preset: activePreset || "enhance", imageData: base64 }).catch(() => {});
    };
    img.src = image.url;
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (!image) { setGenError("Upload an image first."); setTimeout(() => setGenError(null), 4000); return; }
    if (!activePreset) { setGenError("Select a preset first."); setTimeout(() => setGenError(null), 4000); return; }
    if (activePreset === "combine" && !image2) { setGenError("Upload both images first."); setTimeout(() => setGenError(null), 4000); return; }
    if (activePreset === "freestyle" && !freestyleText.trim()) { setGenError("Enter a prompt first."); setTimeout(() => setGenError(null), 4000); return; }
    setGenerating(true);
    setGenError(null);
    setShowBlend(false);
    setBlendOpacity(100);
    setGenCount(c => { const n = c + 1; localStorage.setItem("gen-count", n); return n; });
    try {
      let prompt = PRESET_PROMPTS[activePreset] || "Enhance this image.";
      if (activePreset === "remove" && removeText.trim()) {
        prompt = `Remove "${removeText}" from this image seamlessly, filling removed area naturally.`;
      }
      if (activePreset === "freestyle") {
        prompt = freestyleText.trim();
      }
      console.log("[Generate] preset:", activePreset, "| prompt:", prompt.substring(0, 60));
      const isCombine = activePreset === "combine";
      // Lock display size to current container dimensions before image swap
      if (!isCombine && imageContainerRef.current) {
        const el = imageContainerRef.current;
        setLockedSize({ w: el.offsetWidth, h: el.offsetHeight });
      }
      // Cache pre-gen pixels (deep copy — sourcePixelsRef will be overwritten after commitImage)
      if (!isCombine && sourcePixelsRef.current) {
        const src = sourcePixelsRef.current;
        preGenPixelsRef.current = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
      }
      const resultUrl = isCombine
        ? await callGeminiTwo(image.url, image2.url, prompt)
        : await callGemini(image.url, prompt);
      setOriginalImage(isCombine ? null : image);
      setComparing(false);
      setCropping(false);
      if (isCombine) { setActivePreset(null); setImage2(null); }
      commitImage({ name: image.name, url: resultUrl });
      setLockedSize(null);
      // Enable blend button immediately, cache post-gen pixels in background
      if (!isCombine) {
        setShowBlend(true);
        setBlendOpacity(100);
        decodePixels(resultUrl).then(pixels => {
          postGenPixelsRef.current = pixels;
        }).catch(e => console.warn("[Blend] post decode failed:", e));
      }
    } catch (e) {
      console.error("[Generate] failed:", e);
      setGenError(e.message);
      setTimeout(() => setGenError(null), 8000);
    } finally {
      setGenerating(false);
    }
  };

  // Global drag and drop
  React.useEffect(() => {
    const hasFiles = (e) => {
      const dt = e.dataTransfer;
      if (!dt) return false;
      if (dt.types) for (let i = 0; i < dt.types.length; i++) if (dt.types[i] === "Files") return true;
      return false;
    };
    const onDragEnter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter.current += 1; setDragOver(true); };
    const onDragOver  = (e) => { if (!hasFiles(e)) return; e.preventDefault(); };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); }
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter.current = 0;
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleUpload({ name: file.name, url: URL.createObjectURL(file) });
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover",  onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop",      onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover",  onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop",      onDrop);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1d1d1d] text-white overflow-hidden relative">
      <Workspace
        image={image}
        image2={image2}
        setImage2={setImage2}
        originalImage={originalImage}
        comparing={comparing}
        cropping={cropping}
        activePreset={activePreset}
        selecting={selecting}
        removeText={removeText}
        brushSize={brushSize}
        strokes={strokes}
        setStrokes={setStrokes}
        imageContainerRef={imageContainerRef}
        adjustments={adjustments}
        displayUrl={displayUrl}
        onAdjustChange={handleAdjustChange}
        onAdjustApply={handleAdjustApply}
        onAdjustReset={handleAdjustReset}
        onToggleCrop={() => { setCropping(c => !c); setComparing(false); }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenLibrary={() => setLibraryOpen(true)}
        onUpload={handleUpload}
        onGenerate={handleGenerate}
        onExport={handleExport}
        generating={generating}
        onAddLogo={handleAddLogo}
        onCropApply={handleCropApply}
        onRemoveImage={() => { setImage(null); setOriginalImage(null); setLockedSize(null); setComparing(false); setCropping(false); setStrokes([]); }}
        onPreset={(id) => { setActivePreset(id === activePreset ? null : id); setSelecting(false); setStrokes([]); }}
        freestyleText={freestyleText}
        setFreestyleText={setFreestyleText}
        setRemoveText={setRemoveText}
        toggleSelecting={() => setSelecting((s) => !s)}
        setBrushSize={setBrushSize}
        onRemoveBrush={handleRemoveWithBrush}
        showBlend={showBlend}
        blendOpen={blendOpen}
        setBlendOpen={setBlendOpen}
        blendOpacity={blendOpacity}
        onBlendChange={handleBlendChange}
        onBlendApply={handleBlendApply}
        lockedSize={lockedSize}
      />
      <LibraryOverlay open={libraryOpen} onClose={() => setLibraryOpen(false)} />

      {/* Error toast */}
      {genError && (
        <div
          onClick={() => setGenError(null)}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] px-7 py-5 rounded-2xl border border-red-400/40 text-white shadow-2xl cursor-pointer text-center"
          style={{ fontFamily: "Readex Pro", background: "rgba(100,20,20,0.96)", backdropFilter: "blur(16px)", maxWidth: "480px", minWidth: "300px", animation: "popIn 0.2s ease-out" }}>
          <div className="text-[22px] mb-2">⚠</div>
          <div className="font-semibold text-[15px] mb-1">Generation failed</div>
          <div className="text-white/70 text-[13px]">{genError}</div>
          <div className="text-white/35 text-[11px] mt-3">Click to dismiss</div>
        </div>
      )}

      {/* Generating overlay */}
      {generating && (() => {
        const preset = window.PRESETS?.find(p => p.id === activePreset);
        const genText = PRESET_GENERATING[activePreset] || "Generating…";
        const Icon = preset?.Icon || IconSparkle;
        const accent = preset?.accent || "#7AE0BF";
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center"
            style={{ background: "rgba(13,13,13,0.60)", backdropFilter: "blur(6px)", pointerEvents: "none" }}>
            <div className="flex flex-col items-center gap-4">
              <div style={{
                width: 64, height: 64, borderRadius: "18px",
                background: `${accent}28`, border: `1px solid ${accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: accent, animation: "overlayPulse 1.2s ease-in-out infinite",
                boxShadow: `0 0 32px 8px ${accent}28`,
              }}>
                <Icon size={30} />
              </div>
              <div className="text-white font-semibold text-[18px]" style={{ fontFamily: "Readex Pro" }}>{genText}</div>
            </div>
          </div>
        );
      })()}

      {/* Generation counter */}
      <div style={{
        position: "fixed", bottom: "18px", left: "18px", zIndex: 40,
        background: "rgba(14,14,14,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px",
        padding: "7px 12px", display: "flex", alignItems: "center", gap: "7px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#7AE0BF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1v14M1 8h14" opacity=".4"/><circle cx="8" cy="8" r="3" fill="#7AE0BF" stroke="none"/>
          <path d="M4.5 2.5l7 11M11.5 2.5l-7 11" opacity=".3"/>
        </svg>
        <span style={{ fontFamily: "Readex Pro", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>Generations</span>
        <span style={{ fontFamily: "Readex Pro", fontSize: "13px", fontWeight: 700, color: "#7AE0BF", minWidth: "20px", textAlign: "right" }}>{genCount}</span>
      </div>

      {/* Global drop overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(13,13,13,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", animation: "overlayFadeIn 0.22s ease-out both" }}>
          <div className="flex flex-col items-center justify-center text-center"
            style={{ width: "calc(100% - 48px)", height: "calc(100% - 48px)", border: "3px dashed rgba(102,204,204,0.65)", borderRadius: "28px", background: "rgba(102,204,204,0.05)", animation: "overlayPulse 2.2s ease-in-out infinite" }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "#66CCCC", color: "#0a3838", boxShadow: "0 10px 0 0 #4a9999" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
                <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <div className="text-white" style={{ fontFamily: "Readex Pro", fontWeight: 600, fontSize: "44px", letterSpacing: "-0.02em" }}>Drop to start</div>
            <div className="text-white/60 mt-2" style={{ fontFamily: "Readex Pro", fontSize: "16px" }}>Release anywhere to upload your image</div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
