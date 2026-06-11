export const CATEGORY_TREE = {
  "Animal Sounds": ["Cat", "Dog", "Parrot", "Raccoon", "Pig", "Donkey", "Horse", "Goat", "Sheep", "Duck", "Goose", "Chicken", "Other animal"],
  "Ambience":      ["Outdoors", "Indoors", "Street Noises", "Nature / Weather"],
  "SFX":           ["UI sounds", "Transitions", "Impacts", "Cartoonish"],
};

export const MAIN_CATEGORIES = Object.keys(CATEGORY_TREE);
export const CATEGORIES = Object.values(CATEGORY_TREE).flat();

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
  { name: "Capy Boing Bounce",   category: "Impacts",          duration: 1.2  },
  { name: "Retro Coin Pickup",   category: "UI sounds",        duration: 0.8  },
  { name: "Soft Page Swipe",     category: "Transitions",      duration: 0.6  },
  { name: "Cartoon Jump Hop",    category: "Cartoonish",       duration: 0.9  },
  { name: "Thunder Crack Hit",   category: "Impacts",          duration: 2.4  },
  { name: "Bubble Pop Combo",    category: "UI sounds",        duration: 0.5  },
  { name: "Cozy Rain Loop",      category: "Nature / Weather", duration: 12.0 },
  { name: "Vinyl Scratch Stop",  category: "Transitions",      duration: 1.1  },
  { name: "Sad Trombone Meme",   category: "Cartoonish",       duration: 1.8  },
  { name: "Airy Riser Whoosh",   category: "Outdoors",         duration: 2.0  },
  { name: "Squeaky Toy Honk",    category: "Cartoonish",       duration: 0.7  },
  { name: "Glass Ding Confirm",  category: "UI sounds",        duration: 0.6  },
  { name: "Cuddle Purr Ambient", category: "Indoors",          duration: 9.5  },
  { name: "Boomy Impact Slam",   category: "Impacts",          duration: 1.4  },
  { name: "Laser Zap Swoosh",    category: "SFX",              duration: 0.9  },
  { name: "Wholesome Chime Up",  category: "Transitions",      duration: 1.0  },
];

let _id = 0;
export const SOUNDS = RAW_SOUNDS.map((s) => ({
  id: `snd_${(++_id).toString().padStart(3, "0")}`,
  ...s,
  wave: makeWave(s.name),
  addedAt: "2026-06-08",
}));
