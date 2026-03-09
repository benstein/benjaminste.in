// ============================================================
// Strands Game - NYT-style word search
// ============================================================
// To configure a puzzle, edit the PUZZLE_DATA object below.
// The grid is 6 columns x 8 rows (48 letters).
// Each theme word and spangram is defined by an array of
// [row, col] coordinates tracing the path through the grid.
// ============================================================

const PUZZLES = {
  easy: {
    theme: "Mazel Tov, Zeke!",
    grid: [
      ["B", "A", "S", "K", "E", "T"],
      ["A", "B", "L", "L", "A", "B"],
      ["R", "M", "I", "T", "Z", "V"],
      ["M", "A", "T", "E", "H", "A"],
      ["E", "I", "T", "L", "T", "U"],
      ["E", "Z", "E", "S", "U", "O"],
      ["T", "I", "N", "K", "C", "L"],
      ["F", "O", "R", "T", "I", "E"],
    ],
    spangram: {
      word: "EZEKIEL",
      path: [[4,0],[5,1],[5,2],[6,3],[7,4],[7,5],[6,5]],
    },
    themeWords: [
      { word: "BASKETBALL", path: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[1,2]] },
      { word: "BARMITZVAH", path: [[1,1],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[3,4]] },
      { word: "FORTNITE",   path: [[7,0],[7,1],[7,2],[7,3],[6,2],[6,1],[6,0],[5,0]] },
      { word: "SCOUT",      path: [[5,3],[6,4],[5,5],[4,5],[4,4]] },
      { word: "ULTIMATE",   path: [[5,4],[4,3],[4,2],[4,1],[3,0],[3,1],[3,2],[3,3]] },
    ],
  },
  hard: {
    theme: "Mazel Tov, Zeke!",
    grid: [
      ["E", "K", "S", "A", "T", "I"],
      ["T", "B", "H", "B", "L", "M"],
      ["A", "V", "A", "I", "U", "A"],
      ["L", "Z", "T", "M", "R", "T"],
      ["L", "E", "K", "I", "A", "E"],
      ["Z", "I", "T", "E", "E", "B"],
      ["E", "T", "N", "T", "U", "L"],
      ["R", "O", "F", "S", "C", "O"],
    ],
    spangram: {
      word: "EZEKIEL",
      path: [[6,0],[5,0],[4,1],[4,2],[4,3],[5,4],[6,5]],
    },
    themeWords: [
      { word: "BASKETBALL", path: [[1,3],[0,3],[0,2],[0,1],[0,0],[1,0],[1,1],[2,0],[3,0],[4,0]] },
      { word: "BARMITZVAH", path: [[5,5],[4,4],[3,4],[3,3],[2,3],[3,2],[3,1],[2,1],[2,2],[1,2]] },
      { word: "FORTNITE",   path: [[7,2],[7,1],[7,0],[6,1],[6,2],[5,1],[5,2],[5,3]] },
      { word: "SCOUT",      path: [[7,3],[7,4],[7,5],[6,4],[6,3]] },
      { word: "ULTIMATE",   path: [[2,4],[1,4],[0,4],[0,5],[1,5],[2,5],[3,5],[4,5]] },
    ],
  },
};

// Read mode from URL, default to hard
const urlParams = new URLSearchParams(window.location.search);
const currentMode = urlParams.get("mode") === "easy" ? "easy" : "hard";
const PUZZLE_DATA = PUZZLES[currentMode];

// ============================================================
// State
// ============================================================
const ROWS = 8;
const COLS = 6;

const state = {
  // Which cells are permanently claimed: "theme" | "spangram" | null
  claimed: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
  // Current drag path as [{row, col}, ...]
  currentPath: [],
  isDragging: false,
  foundThemeWords: [],
  foundSpangram: false,
  hintMeter: 0, // 0-3, resets after hint used
  hintsUsed: 0,
  hintAvailable: false,
  // Track order of guesses for results: {type: "theme"|"spangram"|"hint"}
  guessOrder: [],
  gameComplete: false,
  // Persistent found-word paths for drawing lines
  foundPaths: [], // { path: [{row,col},...], color: string }
};

// ============================================================
// DOM refs
// ============================================================
const gridEl = document.getElementById("grid");
const canvasEl = document.getElementById("line-canvas");
const ctx = canvasEl.getContext("2d");
const foundCanvasEl = document.getElementById("found-canvas");
const foundCtx = foundCanvasEl.getContext("2d");
const themeTextEl = document.getElementById("theme-text");
const foundCountEl = document.getElementById("found-count");
const totalCountEl = document.getElementById("total-count");
const hintBtn = document.getElementById("hint-btn");
const hintMeterFill = document.getElementById("hint-meter-fill");
const messageBar = document.getElementById("message-bar");
const resultsOverlay = document.getElementById("results-overlay");
const helpOverlay = document.getElementById("help-overlay");

// ============================================================
// Init
// ============================================================
function init() {
  themeTextEl.textContent = PUZZLE_DATA.theme;
  const totalTheme = PUZZLE_DATA.themeWords.length + (PUZZLE_DATA.spangram.path.length ? 1 : 0);
  totalCountEl.textContent = totalTheme;
  foundCountEl.textContent = "0";

  // Highlight active mode toggle
  document.getElementById("mode-" + currentMode).classList.add("active");

  buildGrid();
  resizeCanvas();
  bindEvents();
}

function buildGrid() {
  gridEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = PUZZLE_DATA.grid[r][c];
      gridEl.appendChild(cell);
    }
  }
}

function resizeCanvas() {
  const containerRect = gridEl.parentElement.getBoundingClientRect();
  const gridRect = gridEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  const offsetX = gridRect.left - containerRect.left;
  const offsetY = gridRect.top - containerRect.top;

  for (const canvas of [canvasEl, foundCanvasEl]) {
    canvas.width = gridRect.width * dpr;
    canvas.height = gridRect.height * dpr;
    canvas.style.width = gridRect.width + "px";
    canvas.style.height = gridRect.height + "px";
    canvas.style.left = offsetX + "px";
    canvas.style.top = offsetY + "px";
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  foundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawFoundPaths();
}

// ============================================================
// Grid helpers
// ============================================================
function getCell(row, col) {
  return gridEl.children[row * COLS + col];
}

function getCellCenter(row, col) {
  const cell = getCell(row, col);
  const gridRect = gridEl.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    x: cellRect.left - gridRect.left + cellRect.width / 2,
    y: cellRect.top - gridRect.top + cellRect.height / 2,
  };
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1 && !(a.row === b.row && a.col === b.col);
}

function cellFromEvent(e) {
  const touch = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (el && el.classList.contains("cell")) {
    return { row: parseInt(el.dataset.row), col: parseInt(el.dataset.col) };
  }
  return null;
}

function pathContains(path, row, col) {
  return path.some((p) => p.row === row && p.col === col);
}

function getWordFromPath(path) {
  return path.map((p) => PUZZLE_DATA.grid[p.row][p.col]).join("");
}

// ============================================================
// Drawing
// ============================================================
const DRAG_COLOR = "#d4cfc4";

function drawConnectors(activePath = []) {
  const w = foundCanvasEl.width / window.devicePixelRatio;
  const h = foundCanvasEl.height / window.devicePixelRatio;
  foundCtx.clearRect(0, 0, w, h);

  const cellDiameter = getCell(0, 0).getBoundingClientRect().width;
  const barWidth = cellDiameter * 0.28;
  foundCtx.lineCap = "round";
  foundCtx.lineWidth = barWidth;

  // Draw found word connectors
  for (const fp of state.foundPaths) {
    if (fp.path.length < 2) continue;
    foundCtx.strokeStyle = fp.color;
    for (let i = 0; i < fp.path.length - 1; i++) {
      const from = getCellCenter(fp.path[i].row, fp.path[i].col);
      const to = getCellCenter(fp.path[i + 1].row, fp.path[i + 1].col);
      foundCtx.beginPath();
      foundCtx.moveTo(from.x, from.y);
      foundCtx.lineTo(to.x, to.y);
      foundCtx.stroke();
    }
  }

  // Draw active drag connectors
  if (activePath.length >= 2) {
    foundCtx.strokeStyle = DRAG_COLOR;
    for (let i = 0; i < activePath.length - 1; i++) {
      const from = getCellCenter(activePath[i].row, activePath[i].col);
      const to = getCellCenter(activePath[i + 1].row, activePath[i + 1].col);
      foundCtx.beginPath();
      foundCtx.moveTo(from.x, from.y);
      foundCtx.lineTo(to.x, to.y);
      foundCtx.stroke();
    }
  }
}

// Legacy aliases
function drawFoundPaths() { drawConnectors(); }
function clearCanvas() { drawConnectors(); }

// ============================================================
// Selection highlighting
// ============================================================
function updateSelectionHighlight() {
  // Clear all selecting classes
  document.querySelectorAll(".cell.selecting").forEach((c) => c.classList.remove("selecting"));
  // Highlight current path
  for (const p of state.currentPath) {
    getCell(p.row, p.col).classList.add("selecting");
  }
}

// ============================================================
// Drag & tap handling
// ============================================================
let _dragStartPos = null;
let _didDragMove = false;

function onDragStart(e) {
  if (state.gameComplete) return;
  e.preventDefault();
  const pos = cellFromEvent(e);
  if (!pos) return;
  if (state.claimed[pos.row][pos.col]) return;

  _dragStartPos = pos;
  _didDragMove = false;
  state.isDragging = true;

  // No active path → start fresh
  if (state.currentPath.length === 0) {
    state.currentPath = [pos];
    updateSelectionHighlight();
    drawConnectors(state.currentPath);
  }
  // Active tap path exists — don't modify it here, handle in onDragEnd
}

function onDragMove(e) {
  if (!state.isDragging) return;
  e.preventDefault();
  const pos = cellFromEvent(e);
  if (!pos) return;

  // Detect that the user actually dragged (moved to a different cell)
  if (_dragStartPos && (pos.row !== _dragStartPos.row || pos.col !== _dragStartPos.col)) {
    _didDragMove = true;
  }

  if (!state.claimed[pos.row][pos.col]) {
    const last = state.currentPath[state.currentPath.length - 1];

    // If going back to the previous cell, undo
    if (state.currentPath.length >= 2) {
      const prev = state.currentPath[state.currentPath.length - 2];
      if (pos.row === prev.row && pos.col === prev.col) {
        state.currentPath.pop();
        updateSelectionHighlight();
        drawConnectors(state.currentPath);
        return;
      }
    }

    // Add if adjacent and not already in path
    if (isAdjacent(last, pos) && !pathContains(state.currentPath, pos.row, pos.col)) {
      state.currentPath.push(pos);
      updateSelectionHighlight();
    }
  }

  drawConnectors(state.currentPath);
}

function onDragEnd(e) {
  if (!state.isDragging) return;
  e.preventDefault();
  state.isDragging = false;

  const pos = _dragStartPos;
  _dragStartPos = null;

  // If user dragged across multiple cells, submit immediately (drag mode)
  if (_didDragMove) {
    submitCurrentPath();
    return;
  }

  // Tap mode: user tapped a single cell
  if (!pos) return;

  const last = state.currentPath[state.currentPath.length - 1];

  // Tap on the last cell again → submit
  if (state.currentPath.length >= 2 && pos.row === last.row && pos.col === last.col) {
    submitCurrentPath();
    return;
  }

  // Tap on the second-to-last cell → undo last
  if (state.currentPath.length >= 2) {
    const prev = state.currentPath[state.currentPath.length - 2];
    if (pos.row === prev.row && pos.col === prev.col) {
      state.currentPath.pop();
      updateSelectionHighlight();
      drawConnectors(state.currentPath);
      return;
    }
  }

  // Tap on a non-adjacent or already-in-path cell → ignore (path stays)
  // The cell was already added in onDragStart if it was the first cell,
  // or we need to try adding it if adjacent
  if (state.currentPath.length >= 1 && !(pos.row === last.row && pos.col === last.col)) {
    if (!state.claimed[pos.row][pos.col] && isAdjacent(last, pos) && !pathContains(state.currentPath, pos.row, pos.col)) {
      state.currentPath.push(pos);
      updateSelectionHighlight();
      drawConnectors(state.currentPath);
    }
  }
}

function submitCurrentPath() {
  const word = getWordFromPath(state.currentPath);
  const path = [...state.currentPath];
  state.currentPath = [];
  evaluateWord(word, path);
}

function cancelTapPath() {
  document.querySelectorAll(".cell.selecting").forEach(c => c.classList.remove("selecting"));
  state.currentPath = [];
  drawConnectors();
}

// ============================================================
// Word evaluation
// ============================================================
async function evaluateWord(word, path) {
  if (word.length < 4) {
    showMessage("Too short");
    shakeAndClear(path);
    return;
  }

  // Check spangram
  if (PUZZLE_DATA.spangram.path.length > 0 && !state.foundSpangram) {
    if (pathMatchesWord(path, PUZZLE_DATA.spangram)) {
      foundSpangram(path);
      return;
    }
  }

  // Check theme words
  for (const tw of PUZZLE_DATA.themeWords) {
    if (state.foundThemeWords.includes(tw.word)) continue;
    if (pathMatchesWord(path, tw)) {
      foundThemeWord(tw, path);
      return;
    }
  }

  // Not a theme word — check dictionary for hint meter credit
  const isValid = await checkWordInDictionary(word);
  if (isValid) {
    handleNonThemeWord(word, path);
  } else {
    showMessage("Not a word");
    shakeAndClear(path);
  }
}

function shakeAndClear(path) {
  animateCells(path, "invalid-shake");
  // Keep circles visible during shake, clear after animation
  setTimeout(() => {
    clearSelection(path);
  }, 400);
}

function clearSelection(path) {
  for (const p of path) {
    getCell(p.row, p.col).classList.remove("selecting");
  }
  drawConnectors();
}

function pathMatchesWord(path, wordObj) {
  if (path.length !== wordObj.path.length) return false;
  // Check forward
  const fwd = path.every((p, i) => p.row === wordObj.path[i][0] && p.col === wordObj.path[i][1]);
  if (fwd) return true;
  // Check reverse
  const rev = path.every((p, i) => {
    const ri = wordObj.path.length - 1 - i;
    return p.row === wordObj.path[ri][0] && p.col === wordObj.path[ri][1];
  });
  return rev;
}

// Non-theme word validation using dictionary API
const _checkedWords = new Map(); // word -> true/false cache
const _pendingChecks = new Map(); // word -> Promise

async function checkWordInDictionary(word) {
  const lower = word.toLowerCase();
  if (_checkedWords.has(lower)) return _checkedWords.get(lower);
  if (_pendingChecks.has(lower)) return _pendingChecks.get(lower);

  const promise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lower}`)
    .then((res) => {
      const valid = res.ok;
      _checkedWords.set(lower, valid);
      _pendingChecks.delete(lower);
      return valid;
    })
    .catch(() => {
      // On network error, accept the word
      _checkedWords.set(lower, true);
      _pendingChecks.delete(lower);
      return true;
    });

  _pendingChecks.set(lower, promise);
  return promise;
}

// ============================================================
// Found word handlers
// ============================================================
function foundThemeWord(tw, path) {
  state.foundThemeWords.push(tw.word);
  state.guessOrder.push({ type: "theme" });

  // Clear selection and claim cells
  document.querySelectorAll(".cell.selecting").forEach(c => c.classList.remove("selecting"));
  for (const [r, c] of tw.path) {
    state.claimed[r][c] = "theme";
    getCell(r, c).classList.add("found-theme");
  }

  // Store path for persistent connector
  state.foundPaths.push({
    path: tw.path.map(([r, c]) => ({ row: r, col: c })),
    color: "#b8e4f9",
  });
  drawFoundPaths();

  animateCells(tw.path.map(([r, c]) => ({ row: r, col: c })), "valid-bounce");
  showMessage(tw.word);
  updateProgress();
  checkGameComplete();
}

function foundSpangram(path) {
  state.foundSpangram = true;
  state.guessOrder.push({ type: "spangram" });

  document.querySelectorAll(".cell.selecting").forEach(c => c.classList.remove("selecting"));
  for (const [r, c] of PUZZLE_DATA.spangram.path) {
    state.claimed[r][c] = "spangram";
    getCell(r, c).classList.add("found-spangram");
  }

  // Store path for persistent connector
  state.foundPaths.push({
    path: PUZZLE_DATA.spangram.path.map(([r, c]) => ({ row: r, col: c })),
    color: "#f5d547",
  });
  drawFoundPaths();

  animateCells(PUZZLE_DATA.spangram.path.map(([r, c]) => ({ row: r, col: c })), "valid-bounce");
  showMessage(PUZZLE_DATA.spangram.word + "!");
  updateProgress();
  checkGameComplete();
}

function handleNonThemeWord(word, path) {
  showMessage(word);
  animateCells(path, "valid-bounce");
  clearSelection(path);

  if (!state.hintAvailable) {
    state.hintMeter++;
    if (state.hintMeter >= 3) {
      state.hintAvailable = true;
      hintBtn.disabled = false;
      hintBtn.classList.add("ready");
    }
    updateHintMeter();
  }
}

// ============================================================
// Hint system
// ============================================================
function useHint() {
  if (!state.hintAvailable) return;

  state.hintAvailable = false;
  state.hintMeter = 0;
  state.hintsUsed++;
  state.guessOrder.push({ type: "hint" });
  hintBtn.disabled = true;
  hintBtn.classList.remove("ready");
  updateHintMeter();

  // Find an unfound theme word to reveal
  let target = null;

  // Check theme words first
  for (const tw of PUZZLE_DATA.themeWords) {
    if (!state.foundThemeWords.includes(tw.word)) {
      target = tw;
      break;
    }
  }

  // If all theme words found, reveal spangram
  if (!target && !state.foundSpangram && PUZZLE_DATA.spangram.path.length > 0) {
    target = PUZZLE_DATA.spangram;
  }

  if (target) {
    // Animate hint reveal — highlight the letters sequentially
    const path = target.path;
    path.forEach(([r, c], i) => {
      setTimeout(() => {
        const cell = getCell(r, c);
        cell.classList.add("hint-reveal");
        setTimeout(() => cell.classList.remove("hint-reveal"), 1800);
      }, i * 150);
    });
  }
}

function updateHintMeter() {
  const pct = state.hintAvailable ? 100 : (state.hintMeter / 3) * 100;
  hintMeterFill.style.width = pct + "%";
}

// ============================================================
// Progress & completion
// ============================================================
function updateProgress() {
  const found = state.foundThemeWords.length + (state.foundSpangram ? 1 : 0);
  foundCountEl.textContent = found;
}

function checkGameComplete() {
  const totalTheme = PUZZLE_DATA.themeWords.length + (PUZZLE_DATA.spangram.path.length ? 1 : 0);
  const found = state.foundThemeWords.length + (state.foundSpangram ? 1 : 0);
  if (found >= totalTheme) {
    state.gameComplete = true;
    setTimeout(showResults, 1200);
  }
}

// ============================================================
// Results
// ============================================================
function showResults() {
  const resultsTheme = document.getElementById("results-theme");
  const resultsGrid = document.getElementById("results-grid");
  const resultsPerfect = document.getElementById("results-perfect");

  resultsTheme.textContent = PUZZLE_DATA.theme;
  resultsGrid.innerHTML = "";

  for (const guess of state.guessOrder) {
    const dot = document.createElement("div");
    dot.className = "results-dot";
    if (guess.type === "theme") {
      dot.classList.add("theme");
    } else if (guess.type === "spangram") {
      dot.classList.add("spangram");
    } else if (guess.type === "hint") {
      dot.classList.add("hint-used");
      dot.textContent = "\u{1F4A1}";
    }
    resultsGrid.appendChild(dot);
  }

  if (state.hintsUsed === 0) {
    resultsPerfect.classList.remove("hidden");
  } else {
    resultsPerfect.classList.add("hidden");
  }

  resultsOverlay.classList.remove("hidden");
}

// ============================================================
// UI helpers
// ============================================================
function showMessage(msg) {
  messageBar.textContent = msg;
  messageBar.classList.remove("hidden");
  messageBar.classList.add("show");
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => {
    messageBar.classList.remove("show");
    messageBar.classList.add("hidden");
  }, 1500);
}

function animateCells(path, className) {
  for (const p of path) {
    const r = p.row !== undefined ? p.row : p[0];
    const c = p.col !== undefined ? p.col : p[1];
    const cell = getCell(r, c);
    cell.classList.add(className);
    cell.addEventListener("animationend", () => cell.classList.remove(className), { once: true });
  }
}

// ============================================================
// Event binding
// ============================================================
function bindEvents() {
  // Mouse events on grid
  gridEl.addEventListener("mousedown", onDragStart);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);

  // Touch events on grid
  gridEl.addEventListener("touchstart", onDragStart, { passive: false });
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd, { passive: false });

  // Cancel tap path when clicking outside the grid
  document.addEventListener("mousedown", (e) => {
    if (state.currentPath.length > 0 && !state.isDragging && !gridEl.contains(e.target)) {
      cancelTapPath();
    }
  });
  document.addEventListener("touchstart", (e) => {
    if (state.currentPath.length > 0 && !state.isDragging && !gridEl.contains(e.target)) {
      cancelTapPath();
    }
  });

  // Hint button
  hintBtn.addEventListener("click", useHint);

  // Results close
  document.getElementById("results-close").addEventListener("click", () => {
    resultsOverlay.classList.add("hidden");
  });

  // Help
  document.getElementById("help-btn").addEventListener("click", () => {
    helpOverlay.classList.remove("hidden");
  });
  document.getElementById("help-close").addEventListener("click", () => {
    helpOverlay.classList.add("hidden");
  });
  document.getElementById("help-ok").addEventListener("click", () => {
    helpOverlay.classList.add("hidden");
  });
  helpOverlay.addEventListener("click", (e) => {
    if (e.target === helpOverlay) helpOverlay.classList.add("hidden");
  });

  // Resize
  window.addEventListener("resize", resizeCanvas);
}

// ============================================================
// Boot
// ============================================================
init();
