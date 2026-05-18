// Wordle: Endgame — game logic and UI.
// Loads after words.js, which provides ANSWERS, VALID_GUESSES, SEED_POOL.

// =============================================================================
// Constants
// =============================================================================

const ROWS = 6;
const COLS = 5;
const GREEN = "green";
const YELLOW = "yellow";
const GRAY = "gray";

// Defaults; the seed count can be overridden via URL params during practice.
const DEFAULT_SEED_COUNT = 2;

// =============================================================================
// Color logic
// =============================================================================
// Wordle's coloring is two-pass and the duplicate-letter case is the entire
// reason this function deserves tests. First pass: mark every position where
// guess[i] === target[i] as GREEN and remove that letter from the target's
// available pool. Second pass: walk the remaining positions and consume from
// the pool to assign YELLOW; anything else is GRAY.

function computeColors(guess, target) {
  if (guess.length !== COLS || target.length !== COLS) {
    throw new Error(`computeColors: 5-letter words required, got "${guess}" vs "${target}"`);
  }
  const colors = new Array(COLS).fill(GRAY);
  const pool = target.split("");

  // Pass 1: greens.
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === target[i]) {
      colors[i] = GREEN;
      pool[i] = null; // consume this position from the pool
    }
  }
  // Pass 2: yellows.
  for (let i = 0; i < COLS; i++) {
    if (colors[i] === GREEN) continue;
    const letter = guess[i];
    const idx = pool.indexOf(letter);
    if (idx !== -1) {
      colors[i] = YELLOW;
      pool[idx] = null; // consume one instance
    }
  }
  return colors;
}

// =============================================================================
// Inline tests — run at load time and console-error on any failure.
// =============================================================================

function runColorTests() {
  const cases = [
    // [guess, target, expected, label]
    ["HELLO", "HELLO", [GREEN, GREEN, GREEN, GREEN, GREEN], "identical"],
    ["ABCDE", "FGHIJ", [GRAY, GRAY, GRAY, GRAY, GRAY], "no overlap"],
    // The canonical dupe case from the spec.
    ["ERROR", "BERRY", [YELLOW, YELLOW, GREEN, GRAY, GRAY], "spec: ERROR/BERRY"],
    // Guess has one of a letter, target has two.
    ["SPEED", "ERASE", [YELLOW, GRAY, YELLOW, YELLOW, GRAY], "SPEED/ERASE"],
    // Multiple greens and yellows of same letter family.
    ["ALLAY", "LLAMA", [YELLOW, GREEN, YELLOW, YELLOW, GRAY], "ALLAY/LLAMA"],
    // Two greens for same letter, no more available.
    ["SHEET", "SLEEK", [GREEN, GRAY, GREEN, GREEN, GRAY], "SHEET/SLEEK"],
    // Symmetric case: same letters, different positions.
    ["LLAMA", "ALLAY", [YELLOW, GREEN, YELLOW, GRAY, YELLOW], "LLAMA/ALLAY"],
    // Guess has three of a letter, target has one — only first match colors.
    ["EERIE", "HAVEN", [YELLOW, GRAY, GRAY, GRAY, GRAY], "EERIE/HAVEN"],
  ];
  let failed = 0;
  for (const [guess, target, expected, label] of cases) {
    const got = computeColors(guess, target);
    const ok = got.length === expected.length && got.every((c, i) => c === expected[i]);
    if (!ok) {
      failed++;
      console.error(`[color test] FAIL ${label}: ${guess} vs ${target}\n  expected: ${expected.join(",")}\n  got:      ${got.join(",")}`);
    }
  }
  if (failed === 0) {
    console.log(`[color tests] ${cases.length} passed`);
  }
  return failed === 0;
}

// Run tests immediately. They're cheap and catch regressions during edits.
runColorTests();

// =============================================================================
// Candidate filter
// =============================================================================
// Given a target and a list of seed words, a candidate answer W is consistent
// with the seeds iff for every seed S, computeColors(S, W) === computeColors(S, target).
// In other words: if W were the answer, the seed rows would look exactly the
// same to the player as they do with the real target.

// Encode a color array as a 5-char string for fast cache-key equality.
function colorsToKey(colors) {
  let s = "";
  for (let i = 0; i < colors.length; i++) {
    s += colors[i] === GREEN ? "G" : colors[i] === YELLOW ? "Y" : "N";
  }
  return s;
}

// Lazy cache. Filled on demand by colorKeyFor.
const COLOR_KEY_CACHE = new Map(); // seed -> Map<answer, colorKey>

function colorKeyFor(seed, answer) {
  let inner = COLOR_KEY_CACHE.get(seed);
  if (!inner) {
    inner = new Map();
    COLOR_KEY_CACHE.set(seed, inner);
  }
  let cached = inner.get(answer);
  if (cached === undefined) {
    cached = colorsToKey(computeColors(seed, answer));
    inner.set(answer, cached);
  }
  return cached;
}

// Returns the array of answers (from answerPool) consistent with the seed
// colorings produced by the target.
function getCandidates(seeds, target, answerPool) {
  const targetKeys = seeds.map(s => colorKeyFor(s, target));
  return answerPool.filter(answer => {
    for (let i = 0; i < seeds.length; i++) {
      if (colorKeyFor(seeds[i], answer) !== targetKeys[i]) return false;
    }
    return true;
  });
}

// =============================================================================
// Candidate-filter sanity tests
// =============================================================================

function runCandidateTests() {
  let failed = 0;
  // The target itself is always in its own candidate set.
  for (const t of ["MIGHT", "BERRY", "AROSE", "SLATE"]) {
    const cands = getCandidates(["CRANE", "SLOPE"], t, ANSWERS);
    if (!cands.includes(t)) {
      failed++;
      console.error(`[candidate test] target ${t} not in own candidate set`);
    }
  }
  // Sanity: no seeds → every answer is a candidate.
  if (getCandidates([], "MIGHT", ANSWERS).length !== ANSWERS.length) {
    failed++;
    console.error(`[candidate test] empty seeds should return all answers`);
  }
  if (failed === 0) {
    console.log(`[candidate tests] passed`);
  }
}

runCandidateTests();

// =============================================================================
// Deterministic RNG (mulberry32)
// =============================================================================
// Daily puzzles need to be the same for everyone on the same date. Mulberry32
// is small, fast, and deterministic given a 32-bit integer seed.

function strToSeed(str) {
  let h = 0x811c9dc5; // FNV-1a basis, plenty good for seeding an RNG
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =============================================================================
// Seed selection — the actual game
// =============================================================================
// The plan: enumerate C(SEED_POOL.length, N) combinations, score each on the
// rubric from the spec, pick the highest. Deterministic tiebreak by sorted
// seed words so the same target + N always picks the same seeds.

const LETTER_FREQ = {
  // Rough English-letter-in-Wordle-answers frequency. Used for the trap bonus.
  E: 12, A: 11, R: 10, O: 9, T: 8, L: 8, I: 8, S: 7, N: 7, U: 6,
  C: 5, Y: 5, H: 5, D: 5, P: 4, M: 4, G: 4, B: 4, K: 3, F: 3,
  W: 3, V: 2, X: 1, Z: 1, J: 1, Q: 1,
};

function combinations(arr, k) {
  const out = [];
  const n = arr.length;
  if (k > n) return out;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push(idx.map(i => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

// --- individual scoring components ---

function scoreCandidateCount(count, n) {
  // Sweet spot shifts with N because the player has fewer guesses left.
  // N=1: 5 guesses left, broad zone (8–15)
  // N=2: 4 guesses left, mid zone (4–10), peak at 6–8
  // N=3: 3 guesses left, narrow zone (3–6), peak at 3–4
  if (count <= 0) return -10000; // bug guard — target should always be a candidate
  if (n === 1) {
    if (count <= 2) return 0;
    if (count <= 4) return 30;
    if (count <= 7) return 60;
    if (count <= 15) return 100;
    if (count <= 25) return 70;
    return 30;
  }
  if (n === 2) {
    if (count <= 1) return -100;
    if (count === 2) return 10;
    if (count === 3) return 40;
    if (count <= 5) return 85;
    if (count <= 8) return 100;
    if (count <= 10) return 85;
    if (count <= 15) return 45;
    if (count <= 25) return 20;
    return 5;
  }
  // n === 3
  if (count <= 1) return -100;
  if (count === 2) return 30;
  if (count <= 4) return 100;
  if (count <= 6) return 85;
  if (count <= 10) return 40;
  return 10;
}

function scoreInfoMix(colorKeys) {
  // Sweet spot: 1–3 greens, 1–4 yellows, rest grays.
  let greens = 0, yellows = 0, grays = 0;
  for (const key of colorKeys) {
    for (const c of key) {
      if (c === "G") greens++;
      else if (c === "Y") yellows++;
      else grays++;
    }
  }
  // No info at all is the worst.
  if (greens === 0 && yellows === 0) return -10;
  // Too many greens means the puzzle is half-solved.
  if (greens >= 7) return 20;
  // The 1–3 greens, 1–4 yellows window.
  let score = 0;
  if (greens >= 1 && greens <= 4) score += 40;
  else if (greens >= 5 && greens <= 6) score += 20;
  if (yellows >= 1 && yellows <= 5) score += 40;
  else if (yellows >= 6 && yellows <= 8) score += 20;
  // Reward having both colors.
  if (greens >= 1 && yellows >= 1) score += 20;
  return score;
}

function hasCluster(candidates) {
  // Cluster: ≥3 candidates share the same 4 letters in the same 4 positions.
  // For each candidate, generate 5 "leave-one-out" patterns (one per position
  // excluded). If any pattern is shared by ≥3 candidates, it's a cluster.
  if (candidates.length < 3) return false;
  const masks = new Map();
  for (const w of candidates) {
    for (let p = 0; p < COLS; p++) {
      const mask = w.slice(0, p) + "_" + w.slice(p + 1);
      masks.set(mask, (masks.get(mask) || 0) + 1);
    }
  }
  for (const c of masks.values()) if (c >= 3) return true;
  return false;
}

function hasDoubleLetter(word) {
  const seen = new Set();
  for (const c of word) {
    if (seen.has(c)) return true;
    seen.add(c);
  }
  return false;
}

function anagramKey(word) {
  return word.split("").sort().join("");
}

function hasAnagrams(candidates) {
  const keys = new Map();
  for (const w of candidates) {
    const k = anagramKey(w);
    keys.set(k, (keys.get(k) || 0) + 1);
  }
  for (const c of keys.values()) if (c >= 2) return true;
  return false;
}

function letterFrequencyScore(word) {
  // Reward unique letters only — that's how a human reads "obviousness".
  let s = 0;
  const seen = new Set();
  for (const c of word) {
    if (seen.has(c)) continue;
    seen.add(c);
    s += LETTER_FREQ[c] || 0;
  }
  return s;
}

function frequencyTopIsNotTarget(candidates, target) {
  if (candidates.length < 2) return false;
  const sorted = [...candidates].sort((a, b) => {
    const d = letterFrequencyScore(b) - letterFrequencyScore(a);
    if (d !== 0) return d;
    return a < b ? -1 : 1;
  });
  return sorted[0] !== target;
}

function seedRedundancyPenalty(seedCombo) {
  // Each pair of seeds that shares ≥3 letters loses points.
  let pen = 0;
  for (let i = 0; i < seedCombo.length; i++) {
    for (let j = i + 1; j < seedCombo.length; j++) {
      const a = new Set(seedCombo[i]);
      let shared = 0;
      for (const c of seedCombo[j]) if (a.has(c)) shared++;
      if (shared >= 4) pen += 20;
      else if (shared === 3) pen += 8;
    }
  }
  return pen;
}

// Hard-mode reachability: in hard mode, every player guess must honor revealed
// greens and yellows from all rows (including seeds). Some candidates may be
// "unreachable" because no valid guess satisfies the constraints AND lands on
// that candidate. Penalize seed combos that orphan many candidates this way.
//
// Cheap approximation: for each candidate, check whether the candidate itself
// satisfies the seed constraints. In hard mode, the safest guess is to type a
// candidate directly — if the candidate doesn't honor the constraints, the
// player can't even submit it. (This is a necessary, not sufficient, check —
// the player might still be able to fish with another constrained word.)

function hardModeReachable(candidate, seeds, colorKeys) {
  // For each seed/color, verify the candidate satisfies the constraint.
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const key = colorKeys[i];
    for (let p = 0; p < COLS; p++) {
      if (key[p] === "G" && candidate[p] !== seed[p]) return false;
      if (key[p] === "Y" && !candidate.includes(seed[p])) return false;
    }
  }
  return true;
}

function hardModeReachabilityPenalty(candidates, seeds, colorKeys) {
  // In practice this almost never fires once the candidate filter has done
  // its work — a "candidate" is by construction consistent with the seeds.
  // But if hard mode somehow forbids it (e.g., player has typed an
  // additional constraint that isn't yet in the seed rows), penalize.
  let orphans = 0;
  for (const c of candidates) {
    if (!hardModeReachable(c, seeds, colorKeys)) orphans++;
  }
  return orphans * 5;
}

// --- the composite scorer ---

function scoreSeedCombo(seedCombo, target, n) {
  // Hard disqualifiers.
  for (const s of seedCombo) if (s === target) return { score: -Infinity, candidates: [] };

  const colorKeys = seedCombo.map(s => colorKeyFor(s, target));
  const candidates = getCandidates(seedCombo, target, ANSWERS);
  if (candidates.length === 0) return { score: -Infinity, candidates: [] };

  let score = 0;
  score += 1.0 * scoreCandidateCount(candidates.length, n);
  score += 0.5 * scoreInfoMix(colorKeys);
  if (hasCluster(candidates)) score += 20;
  if (hasDoubleLetter(target)) score += 5;
  if (hasAnagrams(candidates)) score += 6;
  if (frequencyTopIsNotTarget(candidates, target)) score += 8;
  score -= seedRedundancyPenalty(seedCombo);
  score -= hardModeReachabilityPenalty(candidates, seedCombo, colorKeys);

  // Solvability: candidates must be discoverable within remaining guesses.
  const guessesLeft = ROWS - n;
  if (candidates.length > Math.pow(2, guessesLeft) * 1.5) score -= 30;

  return { score, candidates, colorKeys };
}

// Returns { seeds, colorKeys, candidates, score } for the best-scoring combo.
function pickSeeds(target, n) {
  const combos = combinations(SEED_POOL, n);
  let best = null;
  for (const combo of combos) {
    const r = scoreSeedCombo(combo, target, n);
    if (best === null || r.score > best.score) {
      best = { seeds: combo, ...r };
    } else if (r.score === best.score) {
      // Deterministic tiebreak: lexicographic on sorted seed string.
      const a = [...combo].sort().join(",");
      const b = [...best.seeds].sort().join(",");
      if (a < b) best = { seeds: combo, ...r };
    }
  }
  return best;
}

// =============================================================================
// Puzzle generation
// =============================================================================

function dailySeed() {
  // Use the user's local date (matches Wordle's local-midnight behavior).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `daily-${y}-${m}-${day}`;
}

function generatePuzzle(puzzleId, n) {
  const rng = mulberry32(strToSeed(puzzleId));
  const target = ANSWERS[Math.floor(rng() * ANSWERS.length)];
  const best = pickSeeds(target, n);
  return {
    id: puzzleId,
    target,
    n,
    seeds: best.seeds,
    seedColors: best.colorKeys.map(keyToColors),
    candidateCount: best.candidates.length,
    score: best.score,
  };
}

function keyToColors(key) {
  return key.split("").map(c => c === "G" ? GREEN : c === "Y" ? YELLOW : GRAY);
}

// =============================================================================
// URL parameters
// =============================================================================

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {
    mode: "daily",          // daily | id | random | override
    puzzleId: null,         // for mode=id
    overrideTarget: null,   // for mode=override
    overrideSeeds: null,    // for mode=override
    debug: params.has("debug"),
  };
  if (params.has("target")) {
    result.mode = "override";
    result.overrideTarget = (params.get("target") || "").toUpperCase();
    const seedsCsv = params.get("seeds") || "";
    result.overrideSeeds = seedsCsv.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  } else if (params.has("random")) {
    result.mode = "random";
  } else if (params.has("puzzle")) {
    result.mode = "id";
    result.puzzleId = params.get("puzzle");
  }
  return result;
}

function mintRandomId() {
  // 6-char base36 from a 32-bit int.
  const n = Math.floor(Math.random() * 0xFFFFFFFF);
  return n.toString(36).padStart(6, "0").slice(0, 6);
}

function buildPuzzleFromUrl(urlParams) {
  // Returns { puzzle, isPractice, error? }.
  const n = DEFAULT_SEED_COUNT;
  if (urlParams.mode === "override") {
    const t = urlParams.overrideTarget;
    const seeds = urlParams.overrideSeeds;
    const ansSet = new Set(ANSWERS);
    const guessSet = new Set(VALID_GUESSES);
    if (!t || !ansSet.has(t)) {
      return { error: `Invalid target "${t}" — must be a 5-letter word in the answer list.` };
    }
    if (!seeds || seeds.length === 0) {
      return { error: "No seeds supplied. Pass ?seeds=WORD1,WORD2." };
    }
    for (const s of seeds) {
      if (!guessSet.has(s)) return { error: `Invalid seed "${s}" — not a valid 5-letter guess.` };
      if (s === t) return { error: `Seed "${s}" equals the target.` };
    }
    const colorKeys = seeds.map(s => colorKeyFor(s, t));
    const cands = getCandidates(seeds, t, ANSWERS);
    return {
      isPractice: true,
      puzzle: {
        id: `override-${t}-${seeds.join("-")}`,
        target: t,
        n: seeds.length,
        seeds,
        seedColors: colorKeys.map(keyToColors),
        candidateCount: cands.length,
      },
    };
  }
  if (urlParams.mode === "random") {
    const id = mintRandomId();
    // Rewrite the URL so this puzzle is bookmarkable.
    const newSearch = `?puzzle=${id}` + (urlParams.debug ? "&debug" : "");
    history.replaceState(null, "", window.location.pathname + newSearch);
    return { isPractice: true, puzzle: generatePuzzle(`practice-${id}`, n) };
  }
  if (urlParams.mode === "id") {
    return { isPractice: true, puzzle: generatePuzzle(`practice-${urlParams.puzzleId}`, n) };
  }
  // Daily.
  return { isPractice: false, puzzle: generatePuzzle(dailySeed(), n) };
}

// =============================================================================
// State + persistence
// =============================================================================

const STORAGE_PREFIX = "wordle-endgame:";
const SETTINGS_KEY = STORAGE_PREFIX + "settings";

function storageKey(puzzleId) {
  return STORAGE_PREFIX + puzzleId;
}

function loadSaved(puzzleId) {
  try {
    const raw = localStorage.getItem(storageKey(puzzleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveState(puzzleId, data) {
  try {
    localStorage.setItem(storageKey(puzzleId), JSON.stringify(data));
  } catch (e) {
    // Quota or disabled storage — fine, just don't persist.
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveSettings(data) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

// =============================================================================
// UI / App
// =============================================================================

const App = {
  puzzle: null,
  isPractice: false,
  debug: false,
  hardMode: false,
  currentGuess: "",
  guesses: [],          // array of strings (player-submitted only)
  guessColors: [],      // array of color arrays (parallel to guesses)
  status: "in-progress",
  toastTimer: null,
  acceptInput: true,
  pendingReveal: null,  // row index whose colors are being unveiled by the flip animation

  init() {
    const urlParams = parseUrlParams();
    this.debug = urlParams.debug;

    const built = buildPuzzleFromUrl(urlParams);
    if (built.error) {
      this.showBannerError(built.error);
      const fallback = buildPuzzleFromUrl({ mode: "random", debug: urlParams.debug });
      this.puzzle = fallback.puzzle;
      this.isPractice = true;
    } else {
      this.puzzle = built.puzzle;
      this.isPractice = built.isPractice;
    }

    // Hard mode is a global preference. Per-puzzle save records the mode the
    // puzzle was started in, so a resumed in-progress game stays consistent
    // even if the global preference has since changed.
    const settings = loadSettings();
    this.hardMode = !!settings.hardMode;

    const saved = loadSaved(this.puzzle.id);
    if (saved) {
      this.guesses = saved.guesses || [];
      this.guessColors = saved.guessColors || [];
      this.status = saved.status || "in-progress";
      if (this.status === "in-progress" && this.guesses.length > 0 && "hardMode" in saved) {
        // Lock the puzzle to the mode it was being played in.
        this.hardMode = !!saved.hardMode;
      }
    }

    this.setupPracticeBanner();
    this.setupDebugLine();
    this.setupHardModeToggle();
    this.setupInput();
    this.renderGrid();
    this.renderKeyboard();
    if (this.status !== "in-progress") this.showEndModal();
  },

  // ---- Setup ----

  setupPracticeBanner() {
    const banner = document.getElementById("practice-banner");
    if (this.isPractice) {
      banner.classList.remove("hidden");
      document.getElementById("new-random-btn").onclick = () => {
        window.location.href = window.location.pathname + "?random" + (this.debug ? "&debug" : "");
      };
      document.getElementById("copy-link-btn").onclick = async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          this.showToast("Link copied");
        } catch (e) {
          this.showToast("Copy failed");
        }
      };
    } else {
      banner.classList.add("hidden");
    }
  },

  showBannerError(msg) {
    const banner = document.getElementById("practice-banner");
    banner.classList.remove("hidden");
    banner.classList.add("error");
    document.getElementById("practice-text").textContent = msg + " Falling back to a random puzzle.";
    document.getElementById("new-random-btn").style.display = "none";
    document.getElementById("copy-link-btn").style.display = "none";
  },

  setupDebugLine() {
    const el = document.getElementById("debug-line");
    if (!this.debug) return;
    el.classList.remove("hidden");
    el.innerHTML = "";

    const text = document.createElement("span");
    text.textContent = this.debugString();
    el.appendChild(text);

    const reset = document.createElement("a");
    reset.href = "#";
    reset.textContent = "[reset]";
    reset.className = "debug-link";
    reset.title = "Clear this puzzle's saved guesses and start over";
    reset.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem(storageKey(this.puzzle.id));
      window.location.reload();
    };
    el.appendChild(document.createTextNode("  "));
    el.appendChild(reset);

    const random = document.createElement("a");
    random.href = "?random&debug";
    random.textContent = "[new random]";
    random.className = "debug-link";
    random.title = "Generate a fresh random puzzle";
    el.appendChild(document.createTextNode("  "));
    el.appendChild(random);
  },

  debugString() {
    return `[debug] candidates=${this.puzzle.candidateCount}  target=${this.puzzle.target}  seeds=${this.puzzle.seeds.join(",")}`;
  },

  setupHardModeToggle() {
    const cb = document.getElementById("hard-mode-toggle");
    const label = cb.parentElement;
    cb.checked = this.hardMode;
    // Standard Wordle rule: you can't switch hard mode mid-game. So lock the
    // toggle only when there's a guess on the current in-progress puzzle.
    // Finished puzzles re-enable the toggle so the next puzzle inherits the
    // preference the player wants.
    const lockMidGame = this.status === "in-progress" && this.guesses.length > 0;
    cb.disabled = lockMidGame;
    label.title = lockMidGame ? "Hard mode locks after the first guess on a puzzle" : "";
    cb.onchange = () => {
      this.hardMode = cb.checked;
      saveSettings({ hardMode: this.hardMode });
      this.persist();
    };
  },

  setupInput() {
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "Enter") { e.preventDefault(); this.handleKey("ENTER"); }
      else if (k === "Backspace") { e.preventDefault(); this.handleKey("BACK"); }
      else if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); this.handleKey(k.toUpperCase()); }
    });
  },

  // ---- Render ----

  renderGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const n = this.puzzle.n;
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.row = r;
      if (r < n) row.classList.add("seed");

      for (let c = 0; c < COLS; c++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        let letter = "", color = null;
        if (r < n) {
          letter = this.puzzle.seeds[r][c];
          color = this.puzzle.seedColors[r][c];
        } else {
          const playerRowIdx = r - n;
          if (playerRowIdx < this.guesses.length) {
            letter = this.guesses[playerRowIdx][c];
            // Suppress colors for the row currently mid-flip; animateRowReveal
            // applies them at the midpoint of each tile's rotation.
            if (r !== this.pendingReveal) color = this.guessColors[playerRowIdx][c];
          } else if (playerRowIdx === this.guesses.length && this.status === "in-progress") {
            letter = this.currentGuess[c] || "";
          }
        }
        if (letter) { tile.textContent = letter; tile.classList.add("filled"); }
        if (color) tile.classList.add(color);
        row.appendChild(tile);
      }

      if (r < n) {
        // Lock icon (Heroicon outline lock-closed, dark stroke)
        const lock = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        lock.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        lock.setAttribute("viewBox", "0 0 24 24");
        lock.setAttribute("fill", "none");
        lock.setAttribute("stroke", "currentColor");
        lock.setAttribute("stroke-width", "2");
        lock.classList.add("lock");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("d", "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z");
        lock.appendChild(path);
        row.appendChild(lock);
      }

      grid.appendChild(row);
    }
  },

  renderKeyboard() {
    const layout = [
      ["Q","W","E","R","T","Y","U","I","O","P"],
      ["A","S","D","F","G","H","J","K","L"],
      ["ENTER","Z","X","C","V","B","N","M","BACK"],
    ];
    const state = this.computeKeyState();
    const kb = document.getElementById("keyboard");
    kb.innerHTML = "";
    for (const row of layout) {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      for (const k of row) {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.dataset.key = k;
        if (k === "ENTER" || k === "BACK") btn.classList.add("wide");
        if (k === "BACK") btn.innerHTML = "&#9003;";
        else btn.textContent = k;
        const col = state[k];
        if (col) btn.classList.add(col);
        btn.onclick = () => this.handleKey(k);
        rowEl.appendChild(btn);
      }
      kb.appendChild(rowEl);
    }
  },

  computeKeyState() {
    // Green > Yellow > Gray precedence. Seeds count as revealed.
    const state = {};
    const upgrade = (k, color) => {
      const rank = { gray: 1, yellow: 2, green: 3 };
      if (!state[k] || rank[color] > rank[state[k]]) state[k] = color;
    };
    const apply = (word, colors) => {
      for (let i = 0; i < word.length; i++) upgrade(word[i], colors[i]);
    };
    for (let i = 0; i < this.puzzle.seeds.length; i++) apply(this.puzzle.seeds[i], this.puzzle.seedColors[i]);
    for (let i = 0; i < this.guesses.length; i++) apply(this.guesses[i], this.guessColors[i]);
    return state;
  },

  // ---- Input handling ----

  handleKey(k) {
    if (!this.acceptInput || this.status !== "in-progress") return;
    if (k === "ENTER") this.submitGuess();
    else if (k === "BACK") {
      if (this.currentGuess.length > 0) {
        this.currentGuess = this.currentGuess.slice(0, -1);
        this.renderGrid();
      }
    } else if (/^[A-Z]$/.test(k)) {
      if (this.currentGuess.length < COLS) {
        this.currentGuess += k;
        this.renderGrid();
      }
    }
  },

  submitGuess() {
    const guess = this.currentGuess;
    if (guess.length !== COLS) { this.shakeCurrentRow(); this.showToast("Not enough letters"); return; }
    if (!VALID_GUESSES.includes(guess)) { this.shakeCurrentRow(); this.showToast("Not in word list"); return; }
    if (this.hardMode) {
      const violation = this.checkHardModeViolation(guess);
      if (violation) { this.shakeCurrentRow(); this.showToast(violation); return; }
    }

    const colors = computeColors(guess, this.puzzle.target);
    this.guesses.push(guess);
    this.guessColors.push(colors);
    this.currentGuess = "";
    this.pendingReveal = this.puzzle.n + this.guesses.length - 1;

    // Disable hard-mode toggle once a guess has been submitted.
    document.getElementById("hard-mode-toggle").disabled = true;

    this.renderGrid();
    this.animateRowReveal(this.pendingReveal, colors, () => {
      this.pendingReveal = null;
      this.renderKeyboard();
      const won = colors.every(c => c === GREEN);
      const remainingRows = ROWS - this.puzzle.n - this.guesses.length;
      if (won) { this.status = "won"; this.persist(); this.showEndModal(); }
      else if (remainingRows === 0) { this.status = "lost"; this.persist(); this.showEndModal(); }
      else { this.persist(); }
    });
  },

  // Hard mode: every revealed green/yellow from earlier rows (seeds + guesses)
  // must be honored. Returns a human-readable violation string, or null.
  checkHardModeViolation(guess) {
    const previousRows = [];
    for (let i = 0; i < this.puzzle.seeds.length; i++) {
      previousRows.push({ word: this.puzzle.seeds[i], colors: this.puzzle.seedColors[i] });
    }
    for (let i = 0; i < this.guesses.length; i++) {
      previousRows.push({ word: this.guesses[i], colors: this.guessColors[i] });
    }
    for (const { word, colors } of previousRows) {
      for (let p = 0; p < COLS; p++) {
        if (colors[p] === GREEN && guess[p] !== word[p]) {
          return `Position ${p + 1} must be ${word[p]}`;
        }
        if (colors[p] === YELLOW && !guess.includes(word[p])) {
          return `Guess must contain ${word[p]}`;
        }
      }
    }
    return null;
  },

  shakeCurrentRow() {
    const r = this.puzzle.n + this.guesses.length;
    const row = document.querySelector(`.row[data-row="${r}"]`);
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth; // restart animation
    row.classList.add("shake");
  },

  animateRowReveal(rowIdx, colors, done) {
    const row = document.querySelector(`.row[data-row="${rowIdx}"]`);
    if (!row) { done(); return; }
    const tiles = row.querySelectorAll(".tile");
    this.acceptInput = false;
    let i = 0;
    const reveal = () => {
      if (i >= COLS) {
        this.acceptInput = true;
        done();
        return;
      }
      tiles[i].classList.add("revealing");
      setTimeout(() => {
        tiles[i].classList.remove("green", "yellow", "gray");
        tiles[i].classList.add(colors[i]);
        i++;
        setTimeout(reveal, 80);
      }, 250);
    };
    reveal();
  },

  // ---- Feedback ----

  showToast(msg) {
    const el = document.getElementById("message");
    el.textContent = msg;
    el.classList.add("toast");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.textContent = "";
      el.classList.remove("toast");
    }, 1500);
  },

  showEndModal() {
    const backdrop = document.getElementById("modal-backdrop");
    const modal = document.getElementById("modal");
    const title = document.getElementById("modal-title");
    const target = document.getElementById("modal-target");
    const msg = document.getElementById("modal-message");
    const newBtn = document.getElementById("modal-new-btn");
    const closeBtn = document.getElementById("modal-close-btn");

    modal.classList.toggle("lose", this.status === "lost");
    if (this.status === "won") {
      title.textContent = "Solved";
      msg.textContent = `Cleared in ${this.guesses.length} ${this.guesses.length === 1 ? "guess" : "guesses"}.`;
    } else {
      title.textContent = "Out of guesses";
      msg.textContent = "Better luck on the next one.";
    }
    target.textContent = this.puzzle.target;

    newBtn.onclick = () => {
      window.location.href = window.location.pathname + "?random" + (this.debug ? "&debug" : "");
    };
    closeBtn.onclick = () => backdrop.classList.add("hidden");
    backdrop.classList.remove("hidden");
  },

  persist() {
    saveState(this.puzzle.id, {
      guesses: this.guesses,
      guessColors: this.guessColors,
      status: this.status,
      hardMode: this.hardMode,
    });
  },
};

// Boot when the DOM is ready and we're in a browser.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.init());
  } else {
    App.init();
  }
}
