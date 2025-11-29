const ROWS = 6;
const COLS = 7;
const PLAYER_RED = 'red';
const PLAYER_YELLOW = 'yellow';

// Difficulty settings
const DIFFICULTY_SETTINGS = {
    easy: {
        depth: 2,
        wrapBonus: 1.0,  // No wrap bonus - doesn't try to trick
        randomness: 0.15  // 15% chance to pick suboptimal move
    },
    medium: {
        depth: 4,
        wrapBonus: 1.1,
        randomness: 0.05  // 5% chance to pick suboptimal move
    },
    hard: {
        depth: 7,
        wrapBonus: 1.2,
        randomness: 0  // Always optimal
    }
};

let currentPlayer = PLAYER_RED;
let board = [];
let gameOver = false;
let isAIMode = false;
let aiDifficulty = 'hard';
let humanPlayer = PLAYER_RED;
let aiPlayer = PLAYER_YELLOW;
let lastMove = null; // Stores {row, col, player} for undo
let canUndo = false;
let aiExplanation = []; // Stores reasoning for AI's last move

const boardElement = document.getElementById('board');
const playerDisplay = document.getElementById('player-display');
const messageElement = document.getElementById('message');
const twoPlayerBtn = document.getElementById('two-player-btn');
const aiButtons = document.querySelectorAll('.ai-btn');
const undoBtn = document.getElementById('undo-btn');
const explainBtn = document.getElementById('explain-btn');
const explanationModal = document.getElementById('explanation-modal');
const explanationText = document.getElementById('explanation-text');

function initBoard(aiMode = false, difficulty = 'hard') {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    gameOver = false;
    isAIMode = aiMode;
    aiDifficulty = difficulty;

    if (isAIMode) {
        const aiGoesFirst = Math.random() < 0.5;

        if (aiGoesFirst) {
            aiPlayer = PLAYER_RED;
            humanPlayer = PLAYER_YELLOW;
            currentPlayer = PLAYER_RED;
        } else {
            humanPlayer = PLAYER_RED;
            aiPlayer = PLAYER_YELLOW;
            currentPlayer = PLAYER_RED;
        }
    } else {
        currentPlayer = PLAYER_RED;
    }

    // Reset undo state
    lastMove = null;
    canUndo = false;
    updateUndoButton();

    // Reset explanation state
    aiExplanation = [];
    updateExplainButton();

    messageElement.textContent = '';
    updatePlayerDisplay();
    renderBoard();

    if (isAIMode && currentPlayer === aiPlayer) {
        setTimeout(makeAIMove, 500);
    }
}

function updateUndoButton() {
    if (isAIMode) {
        undoBtn.classList.add('hidden');
    } else {
        undoBtn.classList.remove('hidden');
        undoBtn.disabled = !canUndo;
    }
}

function updateExplainButton() {
    if (!isAIMode) {
        explainBtn.classList.add('hidden');
    } else {
        explainBtn.classList.remove('hidden');
        explainBtn.disabled = aiExplanation.length === 0;
    }
}

function renderBoard() {
    renderSingleBoard('board', 0, ROWS, 0, COLS, true);

    renderMirrorBoard('board-tl', 3, 6, 4, 7);
    renderMirrorBoard('board-t', 3, 6, 0, 7);
    renderMirrorBoard('board-tr', 3, 6, 0, 3);
    renderMirrorBoard('board-l', 0, 6, 4, 7);
    renderMirrorBoard('board-r', 0, 6, 0, 3);
    renderMirrorBoard('board-bl', 0, 3, 4, 7);
    renderMirrorBoard('board-b', 0, 3, 0, 7);
    renderMirrorBoard('board-br', 0, 3, 0, 3);
}

function renderSingleBoard(boardId, startRow, endRow, startCol, endCol, isMain) {
    const boardEl = document.getElementById(boardId);
    boardEl.innerHTML = '';

    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (board[row][col]) {
                cell.classList.add('filled', board[row][col]);
            }

            if (isMain) {
                cell.addEventListener('click', () => handleCellClick(col));
                cell.addEventListener('mouseenter', () => highlightColumn(col, true));
                cell.addEventListener('mouseleave', () => highlightColumn(col, false));
            }

            boardEl.appendChild(cell);
        }
    }
}

function renderMirrorBoard(boardId, startRow, endRow, startCol, endCol) {
    const boardEl = document.getElementById(boardId);
    boardEl.innerHTML = '';

    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            const wrappedRow = row % ROWS;
            const wrappedCol = col % COLS;

            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.boardRow = wrappedRow;
            cell.dataset.boardCol = wrappedCol;

            if (board[wrappedRow][wrappedCol]) {
                cell.classList.add('filled', board[wrappedRow][wrappedCol]);
            }

            boardEl.appendChild(cell);
        }
    }
}

function highlightColumn(col, highlight) {
    if (gameOver) return;

    const turnClass = currentPlayer === PLAYER_RED ? 'red-turn' : 'yellow-turn';
    const landingRow = getLowestEmptyRow(col);

    if (landingRow === -1) return;

    if (highlight) {
        const mainCell = document.querySelector(`#board [data-row="${landingRow}"][data-col="${col}"]`);
        if (mainCell) {
            mainCell.classList.add('column-hover', turnClass);
        }

        highlightMirrorHover(landingRow, col, turnClass);
    } else {
        const mainCell = document.querySelector(`#board [data-row="${landingRow}"][data-col="${col}"]`);
        if (mainCell) {
            mainCell.classList.remove('column-hover', 'red-turn', 'yellow-turn');
        }

        clearMirrorHover();
    }
}

function highlightMirrorHover(row, col, turnClass) {
    const mirrorBoardIds = ['board-tl', 'board-t', 'board-tr', 'board-l', 'board-r', 'board-bl', 'board-b', 'board-br'];

    mirrorBoardIds.forEach(boardId => {
        const boardEl = document.getElementById(boardId);
        if (!boardEl) return;

        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            const cellRow = parseInt(cell.dataset.boardRow);
            const cellCol = parseInt(cell.dataset.boardCol);

            if (cellRow === row && cellCol === col && !cell.classList.contains('filled')) {
                cell.classList.add('column-hover', turnClass);
            }
        });
    });
}

function clearMirrorHover() {
    const mirrorBoardIds = ['board-tl', 'board-t', 'board-tr', 'board-l', 'board-r', 'board-bl', 'board-b', 'board-br'];

    mirrorBoardIds.forEach(boardId => {
        const boardEl = document.getElementById(boardId);
        if (!boardEl) return;

        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('column-hover', 'red-turn', 'yellow-turn');
        });
    });
}

function handleCellClick(col) {
    if (gameOver) return;
    if (isAIMode && currentPlayer === aiPlayer) return;

    makeMove(col);
}

function makeMove(col) {
    const row = getLowestEmptyRow(col);
    if (row === -1) return;

    // Store move for undo (only in 2-player mode)
    if (!isAIMode) {
        lastMove = { row, col, player: currentPlayer };
        canUndo = true;
        updateUndoButton();
    }

    board[row][col] = currentPlayer;
    renderBoard();

    const droppedCell = document.querySelector(`#board [data-row="${row}"][data-col="${col}"]`);
    if (droppedCell) {
        droppedCell.classList.add('drop-animation');
    }

    if (checkWin(row, col)) {
        gameOver = true;
        highlightWinningCells();
        messageElement.textContent = `${currentPlayer.toUpperCase()} WINS!`;
        messageElement.style.color = currentPlayer === PLAYER_RED ? '#e74c3c' : '#f39c12';
        celebrate();
        // Disable undo after game ends
        canUndo = false;
        updateUndoButton();
        return;
    }

    if (isBoardFull()) {
        gameOver = true;
        messageElement.textContent = "IT'S A DRAW!";
        messageElement.style.color = 'white';
        // Disable undo after game ends
        canUndo = false;
        updateUndoButton();
        return;
    }

    currentPlayer = currentPlayer === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED;
    updatePlayerDisplay();

    if (isAIMode && currentPlayer === aiPlayer && !gameOver) {
        setTimeout(makeAIMove, 500);
    }
}

function undoMove() {
    if (!canUndo || !lastMove || isAIMode || gameOver) return;

    // Remove the piece from the board
    board[lastMove.row][lastMove.col] = null;

    // Revert to the previous player
    currentPlayer = lastMove.player;

    // Clear undo state
    lastMove = null;
    canUndo = false;
    updateUndoButton();

    // Clear any messages
    messageElement.textContent = '';

    // Re-render and update display
    renderBoard();
    updatePlayerDisplay();
}

// AI Constants
const SCORE_WIN = 100000;
const SCORE_FORK = 5000;
const SCORE_OPEN_THREE = 500;
const SCORE_CLOSED_THREE = 100;
const SCORE_TWO = 10;
const SCORE_CENTER_BONUS = 3;
const SCORE_VERTICAL_CONTROL = 5;
const SCORE_DANGEROUS_MOVE = -10000;

const thinkingSpinner = document.getElementById('thinking-spinner');

function getAISettings() {
    return DIFFICULTY_SETTINGS[aiDifficulty];
}

function makeAIMove() {
    if (gameOver) return;

    thinkingSpinner.classList.remove('hidden');

    // Use setTimeout to allow spinner to render before heavy computation
    setTimeout(() => {
        const bestCol = findBestMove();
        thinkingSpinner.classList.add('hidden');
        makeMove(bestCol);
    }, 10);
}

function findBestMove() {
    // Clear previous explanation
    aiExplanation = [];
    const settings = getAISettings();

    aiExplanation.push(`🤖 BenBot AI - Difficulty: ${aiDifficulty.toUpperCase()} (lookahead depth: ${settings.depth} moves)`);

    // Count pieces for context
    let aiPieces = 0, humanPieces = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === aiPlayer) aiPieces++;
            if (board[r][c] === humanPlayer) humanPieces++;
        }
    }
    aiExplanation.push(`Board state: BenBot has ${aiPieces} pieces, Human has ${humanPieces} pieces`);
    aiExplanation.push(''); // Empty line

    // STEP 1: Check for immediate wins
    const immediateWin = findWinningMove(aiPlayer);
    if (immediateWin !== -1) {
        aiExplanation.push(`🎯 STEP 1: Found immediate winning move in column ${immediateWin + 1}!`);
        aiExplanation.push('Taking the win.');
        updateExplainButton();
        return immediateWin;
    }
    aiExplanation.push(`✓ STEP 1: No immediate winning moves available.`);

    // STEP 2: Check for immediate blocks
    const immediateBlock = findWinningMove(humanPlayer);
    if (immediateBlock !== -1) {
        aiExplanation.push(`🛡️ STEP 2: Detected winning threat in column ${immediateBlock + 1}.`);
        aiExplanation.push('Must block immediately to prevent loss.');
        updateExplainButton();
        return immediateBlock;
    }
    aiExplanation.push(`✓ STEP 2: No immediate threats to block.`);

    // STEP 3: Check for fork opportunities (creating multiple threats)
    aiExplanation.push(`🔍 STEP 3: Checking for fork opportunities...`);
    const forkMove = findForkMove(aiPlayer);
    if (forkMove !== -1) {
        aiExplanation.push(`⚡ Found fork opportunity in column ${forkMove + 1}! This creates multiple winning threats.`);
        aiExplanation.push('✓ Final decision: Taking the fork (nearly unstoppable).');
        updateExplainButton();
        return forkMove;
    }
    aiExplanation.push(`No fork opportunities found.`);

    // STEP 4: Check if opponent can create a fork
    aiExplanation.push(`🛡️ STEP 4: Checking if opponent can create a fork...`);
    const blockFork = findForkMove(humanPlayer);
    if (blockFork !== -1) {
        aiExplanation.push(`⚠️ Opponent can create fork in column ${blockFork + 1}. Blocking it.`);
        updateExplainButton();
        return blockFork;
    }
    aiExplanation.push(`Opponent cannot create a fork on their next move.`);

    // Randomness factor - occasionally pick a random valid move (for easier difficulties)
    if (settings.randomness > 0 && Math.random() < settings.randomness) {
        const validCols = [];
        for (let col = 0; col < COLS; col++) {
            if (getLowestEmptyRow(col) !== -1) validCols.push(col);
        }
        const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
        aiExplanation.push(`🎲 Playing randomly (easier difficulty) - chose column ${randomCol + 1}.`);
        updateExplainButton();
        return randomCol;
    }

    // STEP 5: Deep analysis with improved evaluation
    aiExplanation.push(`📊 STEP 5: Deep strategic analysis (minimax with alpha-beta pruning)...`);
    aiExplanation.push(''); // Empty line

    // Quick heuristic evaluation for move ordering
    let movesWithHeuristic = [];
    for (let col = 0; col < COLS; col++) {
        const row = getLowestEmptyRow(col);
        if (row === -1) continue;

        board[row][col] = aiPlayer;
        const quickScore = quickEvaluate(row, col);
        board[row][col] = null;

        movesWithHeuristic.push({ col, row, quickScore });
    }

    // Sort by quick score (best first) for better pruning
    movesWithHeuristic.sort((a, b) => b.quickScore - a.quickScore);
    aiExplanation.push(`Move ordering (by quick heuristic): ${movesWithHeuristic.map(m => `Col ${m.col + 1}`).join(' > ')}`);

    let bestScore = -Infinity;
    let bestCols = [];
    let colAnalysis = [];

    // Evaluate with full minimax
    for (const moveData of movesWithHeuristic) {
        const { col, row } = moveData;

        // Make move
        board[row][col] = aiPlayer;

        // Detailed position analysis
        const positionAnalysis = analyzePositionDetailed(row, col, aiPlayer);

        // Check if this move gives opponent a winning response
        const givesOpponentWin = checkOpponentResponse(row, col);

        // Evaluate with minimax using difficulty-based depth
        const score = givesOpponentWin ? SCORE_DANGEROUS_MOVE : minimax(settings.depth - 1, -Infinity, Infinity, false);

        // Undo move
        board[row][col] = null;

        // Build reasoning
        let reasoning = [];
        if (givesOpponentWin) {
            reasoning.push('❌ DANGEROUS - gives opponent winning response');
        } else {
            if (positionAnalysis.createsFork) reasoning.push('🍴 sets up future fork');
            if (positionAnalysis.openThree) reasoning.push('⚡ open 3-in-a-row (both ends available)');
            if (positionAnalysis.closedThree) reasoning.push('creates 3-in-a-row');
            if (positionAnalysis.creates2InRow) reasoning.push('builds toward 4');
            if (positionAnalysis.blocksOpponent) reasoning.push('🛡️ blocks opponent threat');
            if (positionAnalysis.hasWrapThreat) reasoning.push('🔄 wrap-around threat');
            if (positionAnalysis.verticalControl) reasoning.push('controls column');
            if (positionAnalysis.centerControl) reasoning.push('center position');
            if (reasoning.length === 0) reasoning.push('neutral move');
        }

        colAnalysis.push({
            col: col + 1,
            score: score.toFixed(0),
            reason: reasoning.join(', ')
        });

        if (score > bestScore) {
            bestScore = score;
            bestCols = [col];
        } else if (score === bestScore) {
            bestCols.push(col);
        }
    }

    // Add detailed analysis
    aiExplanation.push(''); // Empty line for readability
    aiExplanation.push('📋 Detailed column evaluation:');
    colAnalysis.forEach(analysis => {
        aiExplanation.push(`  Column ${analysis.col}: Score ${analysis.score} - ${analysis.reason}`);
    });

    aiExplanation.push(''); // Empty line
    aiExplanation.push(`🏆 Best score: ${bestScore.toFixed(0)}`);

    // Explain what the best score means
    if (bestScore > 5000) {
        aiExplanation.push('💪 This creates a fork or leads to certain victory!');
    } else if (bestScore > 500) {
        aiExplanation.push('⚔️ Strong offensive position with serious threats.');
    } else if (bestScore > 100) {
        aiExplanation.push('📈 Solid move with tactical advantages.');
    } else if (bestScore > 0) {
        aiExplanation.push('➕ Slight advantage - building position.');
    } else if (bestScore > -100) {
        aiExplanation.push('⚖️ Neutral position - maintaining balance.');
    } else if (bestScore > -5000) {
        aiExplanation.push('🛡️ Defensive position - limiting opponent opportunities.');
    } else {
        aiExplanation.push('😓 All moves look bad - trying to minimize damage.');
    }

    // Randomize among equal best moves to avoid predictability
    if (bestCols.length > 1) {
        aiExplanation.push(`🎲 Multiple equally good moves (columns ${bestCols.map(c => c + 1).join(', ')}). Randomly selecting one.`);
    }
    const chosenCol = bestCols[Math.floor(Math.random() * bestCols.length)];
    aiExplanation.push(''); // Empty line
    aiExplanation.push(`✅ Final decision: Column ${chosenCol + 1}`);

    updateExplainButton();
    return chosenCol;
}

function analyzePosition(row, col, player) {
    const analysis = {
        creates3InRow: false,
        creates2InRow: false,
        blocksOpponent: false,
        hasWrapThreat: false,
        centerControl: false
    };

    // Check if center column
    if (col === 3) analysis.centerControl = true;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dRow, dCol] of directions) {
        // Count our pieces in this direction
        let ourCount = 1; // The piece we just placed
        let hasWrap = false;

        // Check both directions
        for (const multiplier of [1, -1]) {
            for (let i = 1; i < 4; i++) {
                let checkRow = row + (dRow * i * multiplier);
                let checkCol = col + (dCol * i * multiplier);

                // Check for wrapping
                if (checkRow < 0 || checkRow >= ROWS || checkCol < 0 || checkCol >= COLS) {
                    hasWrap = true;
                    checkRow = ((checkRow % ROWS) + ROWS) % ROWS;
                    checkCol = ((checkCol % COLS) + COLS) % COLS;
                }

                if (board[checkRow][checkCol] === player) {
                    ourCount++;
                } else {
                    break;
                }
            }
        }

        if (hasWrap && ourCount >= 2) analysis.hasWrapThreat = true;
        if (ourCount >= 3) analysis.creates3InRow = true;
        else if (ourCount >= 2) analysis.creates2InRow = true;
    }

    // Check if it blocks opponent
    const opponent = player === aiPlayer ? humanPlayer : aiPlayer;
    const savedPiece = board[row][col];
    board[row][col] = opponent; // Temporarily place opponent piece

    for (const [dRow, dCol] of directions) {
        let oppCount = 1;
        for (const multiplier of [1, -1]) {
            for (let i = 1; i < 4; i++) {
                let checkRow = ((row + (dRow * i * multiplier)) % ROWS + ROWS) % ROWS;
                let checkCol = ((col + (dCol * i * multiplier)) % COLS + COLS) % COLS;
                if (board[checkRow][checkCol] === opponent) {
                    oppCount++;
                } else {
                    break;
                }
            }
        }
        if (oppCount >= 3) analysis.blocksOpponent = true;
    }
    board[row][col] = savedPiece; // Restore original piece

    return analysis;
}

function analyzePositionDetailed(row, col, player) {
    const analysis = {
        createsFork: false,
        openThree: false,
        closedThree: false,
        creates2InRow: false,
        blocksOpponent: false,
        hasWrapThreat: false,
        centerControl: false,
        verticalControl: false
    };

    // Check if center column
    if (col === 3) analysis.centerControl = true;

    // Check vertical control (3+ pieces in this column)
    let verticalCount = 0;
    for (let r = 0; r < ROWS; r++) {
        if (board[r][col] === player) verticalCount++;
    }
    if (verticalCount >= 2) analysis.verticalControl = true;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let threeInRowCount = 0;

    for (const [dRow, dCol] of directions) {
        let ourCount = 1;
        let hasWrap = false;
        let emptyBefore = false;
        let emptyAfter = false;

        // Check forward direction
        for (let i = 1; i < 4; i++) {
            let checkRow = row + (dRow * i);
            let checkCol = col + (dCol * i);

            if (checkRow < 0 || checkRow >= ROWS || checkCol < 0 || checkCol >= COLS) {
                hasWrap = true;
                checkRow = ((checkRow % ROWS) + ROWS) % ROWS;
                checkCol = ((checkCol % COLS) + COLS) % COLS;
            }

            if (board[checkRow][checkCol] === player) {
                ourCount++;
            } else if (i === 1 && board[checkRow][checkCol] === null) {
                emptyAfter = true;
                break;
            } else {
                break;
            }
        }

        // Check backward direction
        for (let i = 1; i < 4; i++) {
            let checkRow = row - (dRow * i);
            let checkCol = col - (dCol * i);

            if (checkRow < 0 || checkRow >= ROWS || checkCol < 0 || checkCol >= COLS) {
                hasWrap = true;
                checkRow = ((checkRow % ROWS) + ROWS) % ROWS;
                checkCol = ((checkCol % COLS) + COLS) % COLS;
            }

            if (board[checkRow][checkCol] === player) {
                ourCount++;
            } else if (i === 1 && board[checkRow][checkCol] === null) {
                emptyBefore = true;
                break;
            } else {
                break;
            }
        }

        if (hasWrap && ourCount >= 2) analysis.hasWrapThreat = true;

        if (ourCount >= 3) {
            threeInRowCount++;
            if (emptyBefore && emptyAfter) {
                analysis.openThree = true;
            } else {
                analysis.closedThree = true;
            }
        } else if (ourCount >= 2) {
            analysis.creates2InRow = true;
        }
    }

    // Fork = 2 or more three-in-a-rows
    if (threeInRowCount >= 2) {
        analysis.createsFork = true;
    }

    // Check if it blocks opponent
    const opponent = player === aiPlayer ? humanPlayer : aiPlayer;
    const savedPiece = board[row][col];
    board[row][col] = opponent;

    for (const [dRow, dCol] of directions) {
        let oppCount = 1;
        for (const multiplier of [1, -1]) {
            for (let i = 1; i < 4; i++) {
                let checkRow = ((row + (dRow * i * multiplier)) % ROWS + ROWS) % ROWS;
                let checkCol = ((col + (dCol * i * multiplier)) % COLS + COLS) % COLS;
                if (board[checkRow][checkCol] === opponent) {
                    oppCount++;
                } else {
                    break;
                }
            }
        }
        if (oppCount >= 3) analysis.blocksOpponent = true;
    }
    board[row][col] = savedPiece;

    return analysis;
}

function findForkMove(player) {
    // A fork creates 2+ simultaneous three-in-a-rows
    for (let col = 0; col < COLS; col++) {
        const row = getLowestEmptyRow(col);
        if (row === -1) continue;

        board[row][col] = player;

        // Count how many 3-in-a-rows this creates
        let threeCount = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dRow, dCol] of directions) {
            let count = 1;
            count += countInDirection(row, col, dRow, dCol, player);
            count += countInDirection(row, col, -dRow, -dCol, player);

            if (count >= 3) threeCount++;
        }

        board[row][col] = null;

        if (threeCount >= 2) {
            return col;
        }
    }
    return -1;
}

function checkOpponentResponse(row, col) {
    // After we play here, can opponent win on their next turn?
    const opponent = aiPlayer === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED;

    for (let opCol = 0; opCol < COLS; opCol++) {
        const opRow = getLowestEmptyRow(opCol);
        if (opRow === -1) continue;

        board[opRow][opCol] = opponent;
        const opponentWins = checkWin(opRow, opCol);
        board[opRow][opCol] = null;

        if (opponentWins) {
            return true;
        }
    }
    return false;
}

function quickEvaluate(row, col) {
    // Fast heuristic for move ordering
    let score = 0;

    // Center column bonus
    if (col === 3) score += 20;
    else if (col === 2 || col === 4) score += 10;

    // Count immediate connections
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
        let count = 1;
        count += countInDirection(row, col, dRow, dCol, aiPlayer);
        count += countInDirection(row, col, -dRow, -dCol, aiPlayer);

        if (count >= 3) score += 100;
        else if (count >= 2) score += 20;
    }

    return score;
}

function minimax(depth, alpha, beta, isMaximizing) {
    // Check terminal states
    const winner = checkBoardWinner();
    if (winner === aiPlayer) return SCORE_WIN + depth; // Prefer faster wins
    if (winner === humanPlayer) return -SCORE_WIN - depth; // Prefer slower losses
    if (isBoardFull()) return 0; // Draw
    if (depth === 0) return evaluateBoard();

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;

            board[row][col] = aiPlayer;
            const score = minimax(depth - 1, alpha, beta, false);
            board[row][col] = null;

            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Alpha-beta pruning
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;

            board[row][col] = humanPlayer;
            const score = minimax(depth - 1, alpha, beta, true);
            board[row][col] = null;

            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha-beta pruning
        }
        return minScore;
    }
}

function findWinningMove(player) {
    for (let col = 0; col < COLS; col++) {
        const row = getLowestEmptyRow(col);
        if (row === -1) continue;

        board[row][col] = player;
        const wins = checkWin(row, col);
        board[row][col] = null;

        if (wins) return col;
    }
    return -1;
}

function checkBoardWinner() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] && checkWin(row, col)) {
                return board[row][col];
            }
        }
    }
    return null;
}

function evaluateBoard() {
    let score = 0;

    // Check for forks (multiple 3-in-a-rows)
    score += evaluateForks(aiPlayer) * SCORE_FORK;
    score -= evaluateForks(humanPlayer) * SCORE_FORK;

    // Evaluate all possible 4-in-a-row windows with threat analysis
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal down-right
        [1, -1]  // Diagonal down-left
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            for (const [dRow, dCol] of directions) {
                score += evaluateWindowAdvanced(row, col, dRow, dCol);
            }
        }
    }

    // Center column bonus
    for (let row = 0; row < ROWS; row++) {
        if (board[row][3] === aiPlayer) score += SCORE_CENTER_BONUS;
        if (board[row][3] === humanPlayer) score -= SCORE_CENTER_BONUS;
    }

    // Vertical control bonus
    for (let col = 0; col < COLS; col++) {
        let aiCount = 0, humanCount = 0;
        for (let row = 0; row < ROWS; row++) {
            if (board[row][col] === aiPlayer) aiCount++;
            if (board[row][col] === humanPlayer) humanCount++;
        }
        if (aiCount >= 3) score += SCORE_VERTICAL_CONTROL;
        if (humanCount >= 3) score -= SCORE_VERTICAL_CONTROL;
    }

    // Odd/even strategy bonus (pieces on even vs odd rows)
    for (let col = 0; col < COLS; col++) {
        const nextRow = getLowestEmptyRow(col);
        if (nextRow !== -1 && nextRow % 2 === 0) {
            // Even rows slightly preferred (gives more control)
            if (board[nextRow + 1] && board[nextRow + 1][col] === aiPlayer) {
                score += 2;
            }
        }
    }

    return score;
}

function evaluateForks(player) {
    let forkCount = 0;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] !== player) continue;

            // Count how many 3-in-a-rows this piece participates in
            let threeCount = 0;
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

            for (const [dRow, dCol] of directions) {
                let count = 1;
                count += countInDirection(row, col, dRow, dCol, player);
                count += countInDirection(row, col, -dRow, -dCol, player);

                if (count >= 3) threeCount++;
            }

            if (threeCount >= 2) forkCount++;
        }
    }

    return forkCount;
}

function evaluateWindowAdvanced(startRow, startCol, dRow, dCol) {
    let aiCount = 0;
    let humanCount = 0;
    let emptyCount = 0;
    let wraps = false;
    let emptyPositions = [];

    for (let i = 0; i < 4; i++) {
        let row = startRow + i * dRow;
        let col = startCol + i * dCol;

        // Check if we wrapped
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
            wraps = true;
        }

        // Apply wrapping
        row = ((row % ROWS) + ROWS) % ROWS;
        col = ((col % COLS) + COLS) % COLS;

        const cell = board[row][col];
        if (cell === aiPlayer) aiCount++;
        else if (cell === humanPlayer) humanCount++;
        else {
            emptyCount++;
            emptyPositions.push({ row, col });
        }
    }

    // If both players have pieces in this window, it's blocked - no value
    if (aiCount > 0 && humanCount > 0) return 0;

    let score = 0;
    let isOpenThreat = false;

    // Check if threat is "open" (empty on both ends)
    if (emptyCount >= 2 && emptyPositions.length >= 2) {
        const firstEmpty = emptyPositions[0];
        const lastEmpty = emptyPositions[emptyPositions.length - 1];

        // Check if both empties are playable (have support below)
        const firstPlayable = firstEmpty.row === ROWS - 1 || board[firstEmpty.row + 1][firstEmpty.col] !== null;
        const lastPlayable = lastEmpty.row === ROWS - 1 || board[lastEmpty.row + 1][lastEmpty.col] !== null;

        if (firstPlayable || lastPlayable) {
            isOpenThreat = true;
        }
    }

    // Score for AI pieces
    if (aiCount > 0) {
        if (aiCount === 4) {
            score = SCORE_WIN;
        } else if (aiCount === 3 && emptyCount === 1) {
            // Check if the empty spot is immediately playable
            const empty = emptyPositions[0];
            const isPlayable = empty.row === ROWS - 1 || board[empty.row + 1][empty.col] !== null;
            score = isPlayable ? (isOpenThreat ? SCORE_OPEN_THREE : SCORE_CLOSED_THREE) : SCORE_CLOSED_THREE / 2;
        } else if (aiCount === 2 && emptyCount === 2) {
            score = SCORE_TWO;
        }
    }

    // Score for blocking human pieces
    if (humanCount > 0) {
        if (humanCount === 4) {
            score = -SCORE_WIN;
        } else if (humanCount === 3 && emptyCount === 1) {
            const empty = emptyPositions[0];
            const isPlayable = empty.row === ROWS - 1 || board[empty.row + 1][empty.col] !== null;
            score = isPlayable ? (isOpenThreat ? -SCORE_OPEN_THREE : -SCORE_CLOSED_THREE) : -SCORE_CLOSED_THREE / 2;
        } else if (humanCount === 2 && emptyCount === 2) {
            score = -SCORE_TWO;
        }
    }

    // Bonus for wrap-based threats (harder for humans to spot)
    if (wraps && score !== 0) {
        const settings = getAISettings();
        score *= settings.wrapBonus;
    }

    return score;
}

function getLowestEmptyRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (!board[row][col]) {
            return row;
        }
    }
    return -1;
}

function updatePlayerDisplay() {
    let playerLabel = '';

    if (isAIMode) {
        if (currentPlayer === humanPlayer) {
            playerLabel = 'Human';
        } else {
            playerLabel = 'BenBot';
        }
    } else {
        if (currentPlayer === PLAYER_RED) {
            playerLabel = 'Player 1';
        } else {
            playerLabel = 'Player 2';
        }
    }

    playerDisplay.textContent = playerLabel;
    playerDisplay.className = currentPlayer === PLAYER_RED ? 'player-red' : 'player-yellow';
}

function checkWin(row, col) {
    return (
        checkDirection(row, col, 0, 1) ||
        checkDirection(row, col, 1, 0) ||
        checkDirection(row, col, 1, 1) ||
        checkDirection(row, col, 1, -1)
    );
}

function checkDirection(row, col, deltaRow, deltaCol) {
    let count = 1;
    const player = board[row][col];

    count += countInDirection(row, col, deltaRow, deltaCol, player);
    count += countInDirection(row, col, -deltaRow, -deltaCol, player);

    return count >= 4;
}

function countInDirection(row, col, deltaRow, deltaCol, player) {
    let count = 0;
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;

    for (let step = 0; step < 3; step++) {
        currentRow = ((currentRow % ROWS) + ROWS) % ROWS;
        currentCol = ((currentCol % COLS) + COLS) % COLS;

        if (board[currentRow][currentCol] === player) {
            count++;
            currentRow += deltaRow;
            currentCol += deltaCol;
        } else {
            break;
        }
    }

    return count;
}

function highlightWinningCells() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] === currentPlayer) {
                if (isPartOfWinningSequence(row, col)) {
                    const mainCell = document.querySelector(`#board [data-row="${row}"][data-col="${col}"]`);
                    if (mainCell) {
                        mainCell.classList.add('winning');
                    }
                    highlightMirrorCells(row, col);
                }
            }
        }
    }
}

function highlightMirrorCells(row, col) {
    const mirrorBoards = [
        { id: 'board-tl', rowOffset: -3, colOffset: -4 },
        { id: 'board-t', rowOffset: -3, colOffset: 0 },
        { id: 'board-tr', rowOffset: -3, colOffset: 0 },
        { id: 'board-l', rowOffset: 0, colOffset: -4 },
        { id: 'board-r', rowOffset: 0, colOffset: 0 },
        { id: 'board-bl', rowOffset: 0, colOffset: -4 },
        { id: 'board-b', rowOffset: 0, colOffset: 0 },
        { id: 'board-br', rowOffset: 0, colOffset: 0 }
    ];

    mirrorBoards.forEach(mirror => {
        const boardEl = document.getElementById(mirror.id);
        if (!boardEl) return;

        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            const cellRow = parseInt(cell.dataset.boardRow || '0');
            const cellCol = parseInt(cell.dataset.boardCol || '0');

            if (cellRow === row && cellCol === col) {
                cell.classList.add('winning');
            }
        });
    });
}

function isPartOfWinningSequence(row, col) {
    const directions = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
    ];

    for (const [deltaRow, deltaCol] of directions) {
        let count = 1;
        count += countInDirection(row, col, deltaRow, deltaCol, currentPlayer);
        count += countInDirection(row, col, -deltaRow, -deltaCol, currentPlayer);

        if (count >= 4) {
            return true;
        }
    }

    return false;
}

function isBoardFull() {
    return board[0].every(cell => cell !== null);
}

function celebrate() {
    createConfetti();
    createFireworks();
    animateWinMessage();
}

function createConfetti() {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#a29bfe', '#fd79a8'];
    const confettiCount = 150;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.animationDelay = (Math.random() * 0.5) + 's';
            confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }, i * 20);
    }
}

function createFireworks() {
    const positions = [
        { x: 20, y: 30 },
        { x: 50, y: 20 },
        { x: 80, y: 30 },
        { x: 35, y: 50 },
        { x: 65, y: 50 }
    ];

    positions.forEach((pos, index) => {
        setTimeout(() => {
            createFirework(pos.x, pos.y);
        }, index * 400);
    });
}

function createFirework(x, y) {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#a29bfe', '#fd79a8'];
    const particleCount = 30;
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('firework');
        particle.style.left = x + 'vw';
        particle.style.top = y + 'vh';
        particle.style.backgroundColor = color;

        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.animation = `fireworkExplode ${0.8 + Math.random() * 0.4}s ease-out forwards`;

        document.body.appendChild(particle);

        setTimeout(() => particle.remove(), 1500);
    }
}

function animateWinMessage() {
    messageElement.style.animation = 'none';
    setTimeout(() => {
        messageElement.style.animation = 'messageScale 0.5s ease-out';
    }, 10);
}

twoPlayerBtn.addEventListener('click', () => initBoard(false));
aiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const difficulty = btn.dataset.difficulty;
        initBoard(true, difficulty);
    });
});
undoBtn.addEventListener('click', undoMove);

// Explain button - show modal with AI reasoning
explainBtn.addEventListener('click', () => {
    if (aiExplanation.length > 0) {
        explanationText.innerHTML = aiExplanation.map(line => `<p>${line}</p>`).join('');
        explanationModal.classList.remove('hidden');
    }
});

// Click outside modal to close
explanationModal.addEventListener('click', (e) => {
    if (e.target === explanationModal) {
        explanationModal.classList.add('hidden');
    }
});

initBoard();
