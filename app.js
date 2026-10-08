'use strict';

// Стан гри
const state = {
  boardSize: 3, // 3 або 4
  board: Array(9).fill(null),
  currentPlayer: 'X',
  gameMode: 'pvp', // 'pvp' | 'ai' | 'online'
  aiDifficulty: 'hard', // 'easy' | 'hard'
  isGameOver: false,
  soundEnabled: true,
  score: { X: 0, O: 0, ties: 0 },
  
  // Онлайн стан (P2P WebRTC)
  online: {
    peer: null,
    conn: null,
    isHost: false,
    mySymbol: 'X',
    roomCode: null,
    connected: false
  }
};

// ==========================================
// ДИНАМІЧНІ СТИЛІ (Верстка, Онлайн-панель, Підказка)
// ==========================================
const customStyleTag = document.createElement('style');
customStyleTag.id = 'pro-game-multiplayer-styles';
customStyleTag.textContent = `
  /* Фікс панелі керування */
  .controls-bar {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    width: 100% !important;
  }
  .controls-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    width: 100% !important;
  }
  .mode-selector {
    flex: 1 !important;
    display: flex !important;
  }
  .mode-btn {
    flex: 1 !important;
    padding: 7px 6px !important;
    font-size: 0.78rem !important;
    white-space: nowrap !important;
    text-align: center !important;
  }
  .select-difficulty {
    flex: 1 !important;
    padding: 7px 8px !important;
    font-size: 0.82rem !important;
    min-width: 0 !important;
  }
  .icon-btn {
    width: 36px !important;
    height: 36px !important;
    flex-shrink: 0 !important;
    padding: 0 !important;
  }

  /* Яскрава золота пульсація підказки (Hint) */
  @keyframes hintGlowAnim {
    0% {
      transform: scale(0.96);
      box-shadow: 0 0 8px #f59e0b, inset 0 0 6px rgba(245, 158, 11, 0.4);
      border-color: #f59e0b !important;
    }
    50% {
      transform: scale(1.04);
      box-shadow: 0 0 25px #fbbf24, 0 0 35px rgba(245, 158, 11, 0.7), inset 0 0 12px rgba(251, 191, 36, 0.6);
      border-color: #fbbf24 !important;
    }
    100% {
      transform: scale(0.96);
      box-shadow: 0 0 8px #f59e0b, inset 0 0 6px rgba(245, 158, 11, 0.4);
      border-color: #f59e0b !important;
    }
  }
  .cell.hint-highlight {
    animation: hintGlowAnim 0.7s ease-in-out infinite !important;
    z-index: 5 !important;
  }

  /* Стилі онлайн модального вікна */
  .online-dialog {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(13, 17, 23, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }
  .online-card {
    background: #161b22;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-lg, 20px);
    padding: 24px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  .online-tabs {
    display: flex;
    gap: 6px;
    background: rgba(255,255,255,0.05);
    padding: 4px;
    border-radius: 12px;
  }
  .online-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 8px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
  }
  .online-tab-btn.active {
    background: rgba(255,255,255,0.12);
    color: #fff;
  }
  .room-id-box {
    background: rgba(0, 240, 255, 0.08);
    border: 1px dashed var(--color-x);
    padding: 12px;
    border-radius: 12px;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 3px;
    color: var(--color-x);
    user-select: all;
  }
  .online-input {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    font-size: 1.1rem;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 2px;
    padding: 10px;
    border-radius: 10px;
    outline: none;
  }
  .online-status-bar {
    font-size: 0.85rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 20px;
  }
  .online-role-badge {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 0.8rem;
    color: #f0f6fc;
    margin-bottom: 4px;
    display: none;
  }

  /* Підсвічування ходу при наведенні */
  .cell:not(.taken):hover svg {
    opacity: 0.3 !important;
  }
`;
document.head.appendChild(customStyleTag);

// Елементи DOM
const boardEl = document.getElementById('board');
let cells = document.querySelectorAll('.cell');
const winLineEl = document.getElementById('winLine');
const cardX = document.getElementById('cardX');
const cardTie = document.getElementById('cardTie');
const scoreXEl = document.getElementById('scoreX');
const scoreTiesEl = document.getElementById('scoreTies');
const labelXEl = document.getElementById('labelX');
const modePvpBtn = document.getElementById('modePvp');
const modeAiBtn = document.getElementById('modeAi');
const aiDifficultySelect = document.getElementById('aiDifficulty');
const soundToggleBtn = document.getElementById('soundToggle');
const resetRoundBtn = document.getElementById('resetRoundBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalEmoji = document.getElementById('modalEmoji');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalNextBtn = document.getElementById('modalNextBtn');
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

// Динамічна картка гравця O
let cardO = document.getElementById('cardO');
if (!cardO) {
  const scoreBoard = document.querySelector('.score-board');
  if (scoreBoard) {
    cardO = document.createElement('div');
    cardO.className = 'score-card player-o';
    cardO.id = 'cardO';
    cardO.innerHTML = `
      <span class="player-icon">◯</span>
      <div class="score-info">
        <span class="player-label" id="labelO">Гравець O</span>
        <span class="score-num" id="scoreO">0</span>
      </div>
    `;
    if (cardTie) scoreBoard.insertBefore(cardO, cardTie);
    else scoreBoard.appendChild(cardO);
  }
}
const scoreOEl = document.getElementById('scoreO');
const labelOEl = document.getElementById('labelO');

// ==========================================
// ПЕРЕБУДОВА ПАНЕЛІ КЕРУВАННЯ
// ==========================================
const controlsBar = document.querySelector('.controls-bar');
const modeSelector = document.querySelector('.mode-selector');

// Додаємо кнопку Онлайн-режиму
const modeOnlineBtn = document.createElement('button');
modeOnlineBtn.id = 'modeOnline';
modeOnlineBtn.className = 'mode-btn';
modeOnlineBtn.title = 'Грати онлайн по коду кімнати з другом';
modeOnlineBtn.textContent = '🌐 Онлайн';
if (modeSelector) {
  modeSelector.appendChild(modeOnlineBtn);
}

// Селектор розміру поля
const boardSizeSelect = document.createElement('select');
boardSizeSelect.id = 'boardSizeSelect';
boardSizeSelect.className = 'select-difficulty';
boardSizeSelect.innerHTML = `
  <option value="3" selected>3×3</option>
  <option value="4">4×4</option>
`;

// Кнопка підказки (Hint)
const hintBtn = document.createElement('button');
hintBtn.id = 'hintBtn';
hintBtn.className = 'icon-btn';
hintBtn.title = 'Отримати підказку кращого ходу';
hintBtn.textContent = '💡';

// Нове 2-рядне компонування
const controlsRowTop = document.createElement('div');
controlsRowTop.className = 'controls-row';
const controlsRowBottom = document.createElement('div');
controlsRowBottom.className = 'controls-row';

if (controlsBar && modeSelector) {
  controlsBar.innerHTML = '';
  controlsRowTop.appendChild(modeSelector);
  controlsRowTop.appendChild(boardSizeSelect);

  controlsRowBottom.appendChild(aiDifficultySelect);
  controlsRowBottom.appendChild(hintBtn);
  controlsRowBottom.appendChild(soundToggleBtn);

  controlsBar.appendChild(controlsRowTop);
  controlsBar.appendChild(controlsRowBottom);
}

// Бейдж ролі в онлайн-грі
const onlineRoleBadge = document.createElement('div');
onlineRoleBadge.className = 'online-role-badge';
onlineRoleBadge.id = 'onlineRoleBadge';
if (controlsBar) {
  controlsBar.parentNode.insertBefore(onlineRoleBadge, controlsBar.nextSibling);
}

// ==========================================
// МОДАЛЬНЕ ВІКНО ДЛЯ ОНЛАЙН-КІМНАТИ
// ==========================================
const onlineDialog = document.createElement('div');
onlineDialog.className = 'online-dialog hidden';
onlineDialog.id = 'onlineDialog';
onlineDialog.innerHTML = `
  <div class="online-card">
    <h3 style="font-size:1.4rem;">🌐 Гра по мережі з другом</h3>
    
    <div class="online-tabs">
      <button class="online-tab-btn active" id="tabCreate">Створити кімнату</button>
      <button class="online-tab-btn" id="tabJoin">Приєднатися</button>
    </div>

    <!-- Вкладка створення -->
    <div id="viewCreate" style="display: flex; flex-direction: column; gap: 12px;">
      <p style="font-size: 0.85rem; color: var(--text-muted);">Надішліть цей код або посилання другові:</p>
      <div class="room-id-box" id="displayRoomCode">------</div>
      <button class="action-btn primary" id="copyLinkBtn">📋 Скопіювати посилання</button>
    </div>

    <!-- Вкладка приєднання -->
    <div id="viewJoin" style="display: none; flex-direction: column; gap: 12px;">
      <p style="font-size: 0.85rem; color: var(--text-muted);">Введіть код кімнати від друга:</p>
      <input type="text" maxlength="6" class="online-input" id="inputRoomCode" placeholder="ABC12" />
      <button class="action-btn primary" id="connectRoomBtn">Увійти в гру</button>
    </div>

    <div class="online-status-bar" id="onlineStatus">Очікування...</div>
    <button class="action-btn secondary" id="closeOnlineModalBtn">Закрити</button>
  </div>
`;
document.body.appendChild(onlineDialog);

// ==========================================
// ЗВУК ТА ПЕРЕМОЖНІ КОМБІНАЦІЇ
// ==========================================
function getWinCombinations(size) {
  const combos = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push(r * size + c);
    combos.push(row);
  }
  for (let c = 0; c < size; c++) {
    const col = [];
    for (let r = 0; r < size; r++) col.push(r * size + c);
    combos.push(col);
  }
  const diag1 = [], diag2 = [];
  for (let i = 0; i < size; i++) {
    diag1.push(i * size + i);
    diag2.push(i * size + (size - 1 - i));
  }
  combos.push(diag1, diag2);
  return combos;
}

let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!state.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === 'click') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(state.currentPlayer === 'X' ? 440 : 330, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === 'hint') {
    // Звуковий сигнал підказки (подвійний мелодійний тон)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  } else if (type === 'win') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  } else if (type === 'tie') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// ==========================================
// КОНФЕТІ (Canvas)
// ==========================================
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfettiCanvas() {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
}

function launchConfetti() {
  if (!confettiCanvas || !ctx) return;
  resizeConfettiCanvas();
  confettiParticles = [];
  const colors = ['#00f0ff', '#ff3366', '#f59e0b', '#7928ca', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      w: Math.random() * 8 + 4,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      angle: Math.random() * 360,
      angularSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.35,
      opacity: 1
    });
  }
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();
}

function animateConfetti() {
  if (!ctx || !confettiCanvas) return;
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let active = 0;
  confettiParticles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.angle += p.angularSpeed;
    p.opacity -= 0.008;
    if (p.opacity > 0) {
      active++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  });
  if (active > 0) confettiAnimationId = requestAnimationFrame(animateConfetti);
}

// ==========================================
// РЕНДЕРИНГ ТА ЛОГІКА ХОДІВ
// ==========================================
function renderBoard() {
  const size = state.boardSize;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  boardEl.style.gap = size === 4 ? '8px' : '12px';

  for (let i = 0; i < size * size; i++) {
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('data-index', i);
    btn.setAttribute('aria-label', `Клітинка ${i + 1}`);

    btn.addEventListener('click', handleCellClick);
    btn.addEventListener('mouseenter', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      if (state.board[idx] || state.isGameOver) return;
      if (state.gameMode === 'online' && state.currentPlayer !== state.online.mySymbol) return;
      if (state.gameMode === 'ai' && state.currentPlayer === 'O') return;
      e.currentTarget.innerHTML = getSymbolSvg(state.currentPlayer);
    });
    btn.addEventListener('mouseleave', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      if (!state.board[idx]) e.currentTarget.innerHTML = '';
    });

    boardEl.appendChild(btn);
  }
  cells = document.querySelectorAll('.cell');
}

function getSymbolSvg(symbol) {
  if (symbol === 'X') {
    return `<svg class="symbol-x" viewBox="0 0 100 100"><path d="M 24,24 L 76,76" /><path d="M 76,24 L 24,76" /></svg>`;
  }
  return `<svg class="symbol-o" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" /></svg>`;
}

function checkWinnerOnBoard(board, size) {
  const combos = getWinCombinations(size);
  for (const combo of combos) {
    const first = board[combo[0]];
    if (first && combo.every(idx => board[idx] === first)) {
      return { winner: first, combo };
    }
  }
  return null;
}

function checkWinner(board) {
  return checkWinnerOnBoard(board, state.boardSize);
}

function updateTurnDisplay() {
  if (state.currentPlayer === 'X') {
    if (cardX) cardX.classList.add('active-glow');
    if (cardO) cardO.classList.remove('active-glow');
  } else {
    if (cardO) cardO.classList.add('active-glow');
    if (cardX) cardX.classList.remove('active-glow');
  }
}

function updateScoreDisplay() {
  if (scoreXEl) scoreXEl.textContent = state.score.X;
  if (scoreOEl) scoreOEl.textContent = state.score.O;
  if (scoreTiesEl) scoreTiesEl.textContent = state.score.ties;
}

function updatePlayerLabels() {
  if (state.gameMode === 'online') {
    if (labelXEl) labelXEl.textContent = state.online.mySymbol === 'X' ? 'Ви (X)' : 'Друг (X)';
    if (labelOEl) labelOEl.textContent = state.online.mySymbol === 'O' ? 'Ви (O)' : 'Друг (O)';
  } else if (state.gameMode === 'ai') {
    if (labelXEl) labelXEl.textContent = 'Гравець X';
    if (labelOEl) labelOEl.textContent = 'ШІ (Бот)';
  } else {
    if (labelXEl) labelXEl.textContent = 'Гравець X';
    if (labelOEl) labelOEl.textContent = 'Гравець O';
  }
}

function drawWinLine(combo, winner) {
  if (!winLineEl) return;
  const startCell = cells[combo[0]];
  const endCell = cells[combo[combo.length - 1]];
  const wrapper = document.querySelector('.board-wrapper');
  if (!wrapper || !startCell || !endCell) return;

  const wRect = wrapper.getBoundingClientRect();
  const sRect = startCell.getBoundingClientRect();
  const eRect = endCell.getBoundingClientRect();

  const x1 = (sRect.left + sRect.width / 2) - wRect.left;
  const y1 = (sRect.top + sRect.height / 2) - wRect.top;
  const x2 = (eRect.left + eRect.width / 2) - wRect.left;
  const y2 = (eRect.top + eRect.height / 2) - wRect.top;

  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  const extend = state.boardSize === 4 ? 18 : 24;

  winLineEl.style.width = `${length + extend * 2}px`;
  winLineEl.style.left = `${x1 - Math.cos(Math.atan2(dy, dx)) * extend}px`;
  winLineEl.style.top = `${y1 - Math.sin(Math.atan2(dy, dx)) * extend}px`;
  winLineEl.style.transformOrigin = 'left center';
  winLineEl.className = `win-line ${winner === 'X' ? 'x-win' : 'o-win'}`;
  winLineEl.style.transform = `rotate(${angleDeg}deg) scaleX(0)`;

  void winLineEl.offsetWidth;
  winLineEl.style.transform = `rotate(${angleDeg}deg) scaleX(1)`;
}

function handleWin(winData) {
  state.isGameOver = true;
  state.score[winData.winner]++;
  updateScoreDisplay();
  drawWinLine(winData.combo, winData.winner);
  playSound('win');
  launchConfetti();

  setTimeout(() => {
    let winnerName = winData.winner === 'X' ? 'Гравець X' : 'Гравець O';
    if (state.gameMode === 'online') {
      winnerName = winData.winner === state.online.mySymbol ? 'Ви перемогли!' : 'Друг переміг!';
    } else if (state.gameMode === 'ai') {
      winnerName = winData.winner === 'X' ? 'Гравець X' : 'ШІ';
    }

    if (modalEmoji) modalEmoji.textContent = '🏆';
    if (modalTitle) modalTitle.textContent = winnerName;
    if (modalSubtitle) modalSubtitle.textContent = 'Чудова партія! Готові до реваншу?';
    if (modalOverlay) modalOverlay.classList.remove('hidden');
  }, 700);
}

function handleTie() {
  state.isGameOver = true;
  state.score.ties++;
  updateScoreDisplay();
  playSound('tie');

  setTimeout(() => {
    if (modalEmoji) modalEmoji.textContent = '🤝';
    if (modalTitle) modalTitle.textContent = 'Нічия!';
    if (modalSubtitle) modalSubtitle.textContent = 'Рівна боротьба. Ніхто не поступився!';
    if (modalOverlay) modalOverlay.classList.remove('hidden');
  }, 500);
}

function clearHintHighlight() {
  cells.forEach(c => c.classList.remove('hint-highlight'));
}

function makeMove(index, player, isRemote = false) {
  state.board[index] = player;
  clearHintHighlight();

  const targetCell = cells[index];
  if (targetCell) {
    targetCell.innerHTML = getSymbolSvg(player);
    targetCell.classList.add('taken');
  }

  playSound('click');

  if (!isRemote && state.gameMode === 'online' && state.online.conn) {
    state.online.conn.send({ type: 'move', index, player });
  }

  const winData = checkWinner(state.board);
  if (winData) {
    handleWin(winData);
  } else if (state.board.every(cell => cell !== null)) {
    handleTie();
  } else {
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    updateTurnDisplay();
  }
}

function handleCellClick(e) {
  const cell = e.currentTarget;
  const index = parseInt(cell.getAttribute('data-index'), 10);

  if (state.board[index] || state.isGameOver) return;

  if (state.gameMode === 'online') {
    if (!state.online.connected) return;
    if (state.currentPlayer !== state.online.mySymbol) return;
  }

  if (state.gameMode === 'ai' && state.currentPlayer === 'O') return;

  makeMove(index, state.currentPlayer);

  if (!state.isGameOver && state.gameMode === 'ai' && state.currentPlayer === 'O') {
    setTimeout(handleAiTurn, 350);
  }
}

// ==========================================
// ШТУЧНИЙ ІНТЕЛЕКТ (ШІ) ТА ПІДКАЗКА (HINT)
// ==========================================
function getAvailableMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

// Пошук найкращого ходу для підказки та бота
function getBestMove(board, size, player) {
  const available = getAvailableMoves(board);
  if (available.length === 0) return -1;

  const opponent = player === 'X' ? 'O' : 'X';
  const total = size * size;

  // Центр поля на старті
  if (available.length === total) {
    return size === 3 ? 4 : (Math.random() < 0.5 ? 5 : 10);
  }

  // 1. Пріоритет: чи можу я виграти цим ходом?
  for (const m of available) {
    board[m] = player;
    if (checkWinnerOnBoard(board, size)) {
      board[m] = null;
      return m;
    }
    board[m] = null;
  }

  // 2. Пріоритет: заблокувати перемогу супротивника
  for (const m of available) {
    board[m] = opponent;
    if (checkWinnerOnBoard(board, size)) {
      board[m] = null;
      return m;
    }
    board[m] = null;
  }

  // 3. Евристичний підрахунок ліній
  const combos = getWinCombinations(size);
  let bestScore = -Infinity;
  let bestMove = available[0];

  for (const m of available) {
    board[m] = player;
    let score = 0;

    for (const combo of combos) {
      if (!combo.includes(m)) continue;
      let myCount = 0;
      let oppCount = 0;

      for (const idx of combo) {
        if (board[idx] === player) myCount++;
        else if (board[idx] === opponent) oppCount++;
      }

      if (oppCount === 0) {
        score += Math.pow(6, myCount);
      }
    }

    board[m] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}

function handleAiTurn() {
  if (state.isGameOver || state.currentPlayer !== 'O') return;

  const available = getAvailableMoves(state.board);
  if (available.length === 0) return;

  let move;
  if (state.aiDifficulty === 'easy') {
    move = available[Math.floor(Math.random() * available.length)];
  } else {
    move = getBestMove(state.board, state.boardSize, 'O');
  }

  if (move !== undefined && move !== -1) {
    makeMove(move, 'O');
  }
}

// Розумна підказка (💡 Hint)
function showHint() {
  if (state.isGameOver) return;
  if (state.gameMode === 'ai' && state.currentPlayer !== 'X') return;

  clearHintHighlight();

  // Визначаємо найкращий хід для гравця, чия зараз черга
  const bestMove = getBestMove(state.board, state.boardSize, state.currentPlayer);
  if (bestMove === undefined || bestMove === -1) return;

  playSound('hint');

  const targetCell = cells[bestMove];
  if (targetCell) {
    targetCell.classList.add('hint-highlight');
    // Знімаємо підсвічування автоматично через 2.5 секунди, якщо гравець ще не походив
    setTimeout(() => {
      targetCell.classList.remove('hint-highlight');
    }, 2500);
  }
}

// ==========================================
// СКИДАННЯ ТА КЕРУВАННЯ
// ==========================================
function resetRound(sync = true) {
  state.board = Array(state.boardSize * state.boardSize).fill(null);
  state.currentPlayer = 'X';
  state.isGameOver = false;

  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.classList.remove('taken', 'hint-highlight');
  });

  if (winLineEl) {
    winLineEl.style.width = '0px';
    winLineEl.style.transform = 'scaleX(0)';
    winLineEl.className = 'win-line';
  }

  if (modalOverlay) modalOverlay.classList.add('hidden');
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  if (ctx && confettiCanvas) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  updateTurnDisplay();

  if (sync && state.gameMode === 'online' && state.online.conn) {
    state.online.conn.send({ type: 'resetRound' });
  }
}

function setBoardSize(size, sync = true) {
  if (state.boardSize === size) return;
  state.boardSize = size;
  boardSizeSelect.value = size.toString();
  renderBoard();
  resetRound(false);

  if (sync && state.gameMode === 'online' && state.online.conn) {
    state.online.conn.send({ type: 'setBoardSize', size });
  }
}

function setGameMode(mode) {
  state.gameMode = mode;
  [modePvpBtn, modeAiBtn, modeOnlineBtn].forEach(b => b?.classList.remove('active'));

  if (mode === 'pvp') {
    modePvpBtn?.classList.add('active');
    aiDifficultySelect?.classList.add('hidden');
    hintBtn.style.display = 'inline-flex';
    onlineRoleBadge.style.display = 'none';
  } else if (mode === 'ai') {
    modeAiBtn?.classList.add('active');
    aiDifficultySelect?.classList.remove('hidden');
    hintBtn.style.display = 'inline-flex';
    onlineRoleBadge.style.display = 'none';
  } else if (mode === 'online') {
    modeOnlineBtn?.classList.add('active');
    aiDifficultySelect?.classList.add('hidden');
    hintBtn.style.display = 'none';
    onlineRoleBadge.style.display = 'inline-block';
    openOnlineModal();
  }

  updatePlayerLabels();
  resetRound(false);
}

// ==========================================
// P2P ОНЛАЙН МУЛЬТИПЛЕЄР (PeerJS)
// ==========================================
function loadPeerScript(callback) {
  if (window.Peer) return callback();
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function openOnlineModal() {
  onlineDialog.classList.remove('hidden');
  loadPeerScript(initOnlineHost);
}

function initOnlineHost() {
  if (state.online.peer) return;

  const statusEl = document.getElementById('onlineStatus');
  statusEl.textContent = 'Підключення до мережі...';

  const code = generateRoomCode();
  state.online.roomCode = code;
  const peerId = `ttt-room-${code}`;

  state.online.peer = new window.Peer(peerId);

  state.online.peer.on('open', () => {
    document.getElementById('displayRoomCode').textContent = code;
    statusEl.textContent = '🟢 Очікування другого гравця...';
  });

  state.online.peer.on('connection', (conn) => {
    setupConnection(conn, true);
  });

  state.online.peer.on('error', (err) => {
    console.warn('Peer error:', err);
    statusEl.textContent = '⚠️ Помилка з’єднання. Спробуйте ще раз.';
  });
}

function setupConnection(conn, isHost) {
  state.online.conn = conn;
  state.online.isHost = isHost;
  state.online.mySymbol = isHost ? 'X' : 'O';
  state.online.connected = true;

  const statusEl = document.getElementById('onlineStatus');
  statusEl.textContent = '🎉 Підключено! Починаємо гру...';

  onlineRoleBadge.textContent = `Ви граєте за: ${state.online.mySymbol}`;

  conn.on('data', (data) => {
    if (data.type === 'move') {
      makeMove(data.index, data.player, true);
    } else if (data.type === 'resetRound') {
      resetRound(false);
    } else if (data.type === 'setBoardSize') {
      setBoardSize(data.size, false);
    }
  });

  conn.on('close', () => {
    alert('Суперник відключився від гри.');
    state.online.connected = false;
    setGameMode('pvp');
  });

  setTimeout(() => {
    onlineDialog.classList.add('hidden');
    updatePlayerLabels();
    resetRound(false);
  }, 900);
}

function joinRoomByCode(code) {
  const statusEl = document.getElementById('onlineStatus');
  statusEl.textContent = `Підключення до кімнати ${code}...`;

  loadPeerScript(() => {
    if (!state.online.peer) {
      state.online.peer = new window.Peer();
      state.online.peer.on('open', () => connectToHost(code));
    } else {
      connectToHost(code);
    }
  });
}

function connectToHost(code) {
  const statusEl = document.getElementById('onlineStatus');
  const peerId = `ttt-room-${code.toUpperCase()}`;
  const conn = state.online.peer.connect(peerId);

  conn.on('open', () => {
    setupConnection(conn, false);
  });

  conn.on('error', () => {
    statusEl.textContent = '❌ Не вдалося знайти таку кімнату.';
  });
}

// ==========================================
// ОБРОБНИКИ ПОДІЙ
// ==========================================
function initEvents() {
  modePvpBtn?.addEventListener('click', () => setGameMode('pvp'));
  modeAiBtn?.addEventListener('click', () => setGameMode('ai'));
  modeOnlineBtn?.addEventListener('click', () => setGameMode('online'));

  boardSizeSelect.addEventListener('change', (e) => {
    setBoardSize(parseInt(e.target.value, 10), true);
  });

  aiDifficultySelect?.addEventListener('change', (e) => {
    state.aiDifficulty = e.target.value;
  });

  // Підключаємо обробник підказки 💡
  hintBtn.addEventListener('click', showHint);

  soundToggleBtn?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundToggleBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
  });

  resetRoundBtn?.addEventListener('click', () => resetRound(true));
  resetScoreBtn?.addEventListener('click', () => {
    state.score = { X: 0, O: 0, ties: 0 };
    updateScoreDisplay();
    resetRound(true);
  });
  modalNextBtn?.addEventListener('click', () => resetRound(true));

  // Події онлайн модалки
  const tabCreate = document.getElementById('tabCreate');
  const tabJoin = document.getElementById('tabJoin');
  const viewCreate = document.getElementById('viewCreate');
  const viewJoin = document.getElementById('viewJoin');

  tabCreate?.addEventListener('click', () => {
    tabCreate.classList.add('active');
    tabJoin.classList.remove('active');
    viewCreate.style.display = 'flex';
    viewJoin.style.display = 'none';
  });

  tabJoin?.addEventListener('click', () => {
    tabJoin.classList.add('active');
    tabCreate.classList.remove('active');
    viewJoin.style.display = 'flex';
    viewCreate.style.display = 'none';
  });

  document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${state.online.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      document.getElementById('onlineStatus').textContent = '✅ Посилання скопійовано!';
    });
  });

  document.getElementById('connectRoomBtn')?.addEventListener('click', () => {
    const val = document.getElementById('inputRoomCode').value.trim();
    if (val) joinRoomByCode(val);
  });

  document.getElementById('closeOnlineModalBtn')?.addEventListener('click', () => {
    onlineDialog.classList.add('hidden');
    if (!state.online.connected) setGameMode('pvp');
  });

  window.addEventListener('resize', resizeConfettiCanvas);

  // Авто-вхід за посиланням ?room=ABC12
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    setGameMode('online');
    tabJoin?.click();
    document.getElementById('inputRoomCode').value = roomParam;
    setTimeout(() => joinRoomByCode(roomParam), 400);
  }
}

// Старт
function init() {
  renderBoard();
  initEvents();
  updateScoreDisplay();
  updatePlayerLabels();
  updateTurnDisplay();
}

init();