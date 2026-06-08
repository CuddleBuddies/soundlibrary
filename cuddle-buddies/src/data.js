export const CATEGORIES = ["Transitions", "Impacts", "Meme", "Ambient", "Whoosh", "UI"];

export function makeWave(seed, bars = 44) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < bars; i++) {
    const env = Math.sin((i / bars) * Math.PI);
    const v = (0.25 + rnd() * 0.75) * (0.4 + env * 0.6);
    out.push(Math.max(0.12, Math.min(1, v)));
  }
  return out;
}

const RAW_SOUNDS = [
  { name: "Capy Boing Bounce",   type: "Cartoonish", category: "Impacts",     duration: 1.2,  tags: ["boing","bounce","funny","spring"] },
  { name: "Retro Coin Pickup",   type: "Cartoonish", category: "UI",          duration: 0.8,  tags: ["coin","retro","8bit","reward"] },
  { name: "Soft Page Swipe",     type: "Realistic",  category: "Transitions", duration: 0.6,  tags: ["swipe","page","subtle","ui"] },
  { name: "Cartoon Jump Hop",    type: "Cartoonish", category: "Transitions", duration: 0.9,  tags: ["jump","hop","cartoon","spring"] },
  { name: "Thunder Crack Hit",   type: "Realistic",  category: "Impacts",     duration: 2.4,  tags: ["thunder","impact","boom","storm"] },
  { name: "Bubble Pop Combo",    type: "Cartoonish", category: "UI",          duration: 0.5,  tags: ["pop","bubble","click","cute"] },
  { name: "Cozy Rain Loop",      type: "Realistic",  category: "Ambient",     duration: 12.0, tags: ["rain","ambient","loop","calm"] },
  { name: "Vinyl Scratch Stop",  type: "Realistic",  category: "Transitions", duration: 1.1,  tags: ["vinyl","scratch","dj","record"] },
  { name: "Sad Trombone Meme",   type: "Cartoonish", category: "Meme",        duration: 1.8,  tags: ["fail","trombone","meme","funny"] },
  { name: "Airy Riser Whoosh",   type: "Realistic",  category: "Whoosh",      duration: 2.0,  tags: ["whoosh","riser","transition","air"] },
  { name: "Squeaky Toy Honk",    type: "Cartoonish", category: "Meme",        duration: 0.7,  tags: ["squeak","honk","toy","funny"] },
  { name: "Glass Ding Confirm",  type: "Realistic",  category: "UI",          duration: 0.6,  tags: ["ding","confirm","ui","bell"] },
  { name: "Cuddle Purr Ambient", type: "Realistic",  category: "Ambient",     duration: 9.5,  tags: ["purr","warm","ambient","cozy"] },
  { name: "Boomy Impact Slam",   type: "Cartoonish", category: "Impacts",     duration: 1.4,  tags: ["boom","slam","impact","heavy"] },
  { name: "Laser Zap Swoosh",    type: "Cartoonish", category: "Whoosh",      duration: 0.9,  tags: ["laser","zap","scifi","whoosh"] },
  { name: "Wholesome Chime Up",  type: "Cartoonish", category: "Transitions", duration: 1.0,  tags: ["chime","level up","sparkle","reward"] },
];

let _id = 0;
export const SOUNDS = RAW_SOUNDS.map((s) => ({
  id: `snd_${(++_id).toString().padStart(3, "0")}`,
  ...s,
  wave: makeWave(s.name),
  addedAt: "2026-06-08",
}));
