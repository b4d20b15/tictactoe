'use strict';

// Стан гри
const state = {
  boardSize: 3, // 3 або 4
  board: Array(9).fill(null),
  currentPlayer: 'X',
  gameMode: 'trio', // 'pvp' | 'ai' | 'trio' | 'online'
  aiDifficulty: 'hard', // 'easy' | 'hard'
  isGameOver: false,
  soundEnabled: true,
  score: { X: 0, O: 0, AI: 0, ties: 0 },
  
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

// Робимо стан доступним для chat.js
window.state = state;

// Автопідключення chat.js, якщо його ще не підключили
if (!document.querySelector('script[src="chat.js"]')) {
  const chatScript = document.createElement('script');
  chatScript.src = 'chat.js';
  chatScript.defer = true;
  document.head.appendChild(chatScript);
}

// ==========================================
// ДИНАМІЧНІ СТИЛІ (Верстка, 4 картки та ШІ)
// ==========================================
const customStyleTag = document.createElement('style');
customStyleTag.id = 'pro-game-clean-styles';
customStyleTag.textContent = `
  .controls-bar {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    width: 100% !important;
  }

  .modes-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    background: var(--card-bg, rgba(255, 255, 255, 0.04)) !important;
    border: 1px solid var(--card-border, rgba(255, 255, 255, 0.07)) !important;
    padding: 6px !important;
    border-radius: var(--radius-sm, 12px) !important;
  }

  .mode-btn {
    background: transparent !important;
    border: none !important;
    color: var(--text-muted) !important;
    padding: 10px 8px !important;
    font-size: 0.88rem !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    transition: var(--transition) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    white-space: nowrap !important;
  }

  .mode-btn.active {
    background: rgba(255, 255, 255, 0.12) !important;
    color: var(--text-main) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
  }

  .sub-controls-row {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
  }

  .select-difficulty {
    flex: 1 !important;
    padding: 9px 10px !important;
    font-size: 0.85rem !important;
    min-width: 0 !important;
    border-radius: var(--radius-sm, 10px) !important;
  }

  .icon-btn {
    width: 40px !important;
    height: 40px !important;
    flex-shrink: 0 !important;
    border-radius: var(--radius-sm, 10px) !important;
  }

  .score-board.four-cards {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 6px !important;
  }
  .score-board.four-cards .score-card {
    padding: 8px 4px !important;
  }
  .score-board.four-cards .player-label {
    font-size: 0.68rem !important;
    white-space: nowrap !important;
  }
  .score-board.four-cards .score-num {
    font-size: 1.15rem !important;
  }

  .score-card.player-ai .player-icon {
    color: #f59e0b !important;
    font-size: 1.2rem !important;
    font-weight: 800 !important;
  }
  .score-card.active-glow.player-ai {
    border-color: #f59e0b !important;
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.45) !important;
  }
  .symbol-ai polygon {
    stroke: #f59e0b;
    stroke-width: 9;
    stroke-linejoin: round;
    fill: none;
    filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
    stroke-dasharray: 260;
    stroke-dashoffset: 260;
    animation: drawStroke 0.45s cubic-bezier(0.65, 0, 0.35, 1) forwards;
  }
  .win-line.ai-win {
    background: #f59e0b;
    box-shadow: 0 0 20px #f59e0b;
  }

  @keyframes hintGlowAnim {
    0% { transform: scale(0.96); box-shadow: 0 0 8px #f59e0b; border-color: #f59e0b !important; }
    50% { transform: scale(1.04); box-shadow: 0 0 25px #fbbf24, 0 0 35px rgba(245, 158, 11, 0.7); border-color: #fbbf24 !important; }
    100% { transform: scale(0.96); box-shadow: 0 0 8px #f59e0b; border-color: #f59e0b !important; }
  }
  .cell.hint-highlight {
    animation: hintGlowAnim 0.7s ease-in-out infinite !important;
    z-index: 5 !important;
  }

  .online-dialog {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(13, 17, 23, 0.85); backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px;
  }
  .online-card {
    background: #161b22; border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-lg, 20px); padding: 24px; max-width: 400px; width: 100%;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 16px; text-align: center;
  }
  .online-tabs { display: flex; gap: 6px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; }
  .online-tab-btn { flex: 1; background: transparent; border: none; color: var(--text-muted); padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .online-tab-btn.active { background: rgba(255,255,255,0.12); color: #fff; }
  .room-id-box { background: rgba(0, 240, 255, 0.08); border: 1px dashed var(--color-x); padding: 12px; border-radius: 12px; font-size: 1.5rem; font-weight: 800; letter-spacing: 3px; color: var(--color-x); }
  .online-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 1.1rem; text-transform: uppercase; text-align: center; letter-spacing: 2px; padding: 10px; border-radius: 10px; outline: none; }
  .online-status-bar { font-size: 0.85rem; color: var(--text-muted); }
  .cell:not(.taken):hover svg { opacity: 0.3 !important; }
`;
document.head.appendChild(customStyleTag);

// Елементи DOM
const boardEl = document.getElementById('board');
let cells = document.querySelectorAll('.cell');
const winLineEl = document.getElementById('winLine');
const scoreBoardEl = document.querySelector('.score-board');
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

// Картка гравця O
let cardO = document.getElementById('cardO');
if (!cardO && scoreBoardEl) {
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
  if (cardTie) scoreBoardEl.insertBefore(cardO, cardTie);
  else scoreBoardEl.appendChild(cardO);
}
const scoreOEl = document.getElementById('scoreO');
const labelOEl = document.getElementById('labelO');

// Картка ШІ (▲)
let cardAI = document.getElementById('cardAI');
if (!cardAI && scoreBoardEl) {
  cardAI = document.createElement('div');
  cardAI.className = 'score-card player-ai';
  cardAI.id = 'cardAI';
  cardAI.innerHTML = `
    <span class="player-icon">▲</span>
    <div class="score-info">
      <span class="player-label" id="labelAI">ШІ (▲)</span>
      <span class="score-num" id="scoreAI">0</span>
    </div>
  `;
  if (cardTie) scoreBoardEl.insertBefore(cardAI, cardTie);
  else scoreBoardEl.appendChild(cardAI);
}
const scoreAIEl = document.getElementById('scoreAI');
const labelAIEl = document.getElementById('labelAI');

// Панель керування
const controlsBar = document.querySelector('.controls-bar');
const modesGrid = document.createElement('div');
modesGrid.className = 'modes-grid';

modePvpBtn.textContent = '👥 2 Гравці';
modeAiBtn.textContent = '🤖 Проти ШІ';

const modeTrioBtn = document.createElement('button');
modeTrioBtn.id = 'modeTrio';
modeTrioBtn.className = 'mode-btn active';
modeTrioBtn.title = '2 Гравці проти ШІ (Бій на трьох)';
modeTrioBtn.textContent = '⚔️ 2 + ШІ';

const modeOnlineBtn = document.createElement('button');
modeOnlineBtn.id = 'modeOnline';
modeOnlineBtn.className = 'mode-btn';
modeOnlineBtn.title = 'Грати онлайн по коду кімнати з другом';
modeOnlineBtn.textContent = '🌐 Онлайн';

modesGrid.appendChild(modePvpBtn);
modesGrid.appendChild(modeAiBtn);
modesGrid.appendChild(modeTrioBtn);
modesGrid.appendChild(modeOnlineBtn);

const subControlsRow = document.createElement('div');
subControlsRow.className = 'sub-controls-row';

const boardSizeSelect = document.createElement('select');
boardSizeSelect.id = 'boardSizeSelect';
boardSizeSelect.className = 'select-difficulty';
boardSizeSelect.innerHTML = `
  <option value="3" selected>Поле 3×3</option>
  <option value="4">Поле 4×4</option>
`;

const hintBtn = document.createElement('button');
hintBtn.id = 'hintBtn';
hintBtn.className = 'icon-btn';
hintBtn.title = 'Отримати підказку кращого ходу';
hintBtn.textContent = '💡';

subControlsRow.appendChild(boardSizeSelect);
subControlsRow.appendChild(aiDifficultySelect);
subControlsRow.appendChild(hintBtn);
subControlsRow.appendChild(soundToggleBtn);

if (controlsBar) {
  controlsBar.innerHTML = '';
  controlsBar.appendChild(modesGrid);
  controlsBar.appendChild(subControlsRow);
}

// Онлайн модалка
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
    <div id="viewCreate" style="display: flex; flex-direction: column; gap: 12px;">
      <p style="font-size: 0.85rem; color: var(--text-muted);">Надішліть цей код або посилання другові:</p>
      <div class="room-id-box" id="displayRoomCode">------</div>
      <button class="action-btn primary" id="copyLinkBtn">📋 Скопіювати посилання</button>
    </div>
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

// Переможні комбінації
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

// Звук
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
    const freq = state.currentPlayer === 'X' ? 440 : (state.currentPlayer === 'O' ? 330 : 550);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === 'hint') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.1);
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

// Конфеті
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
      x: window.innerWidth / 2, y: window.innerHeight / 2,
      w: Math.random() * 8 + 4, h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.7) * 16,
      angle: Math.random() * 360, angularSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.35, opacity: 1
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
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
    p.angle += p.angularSpeed; p.opacity -= 0.008;
    if (p.opacity > 0) {
      active++;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  });
  if (active > 0) confettiAnimationId = requestAnimationFrame(animateConfetti);
}

// Рендеринг
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
      if (state.gameMode === 'trio' && state.currentPlayer === '▲') return;
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
  } else if (symbol === 'O') {
    return `<svg class="symbol-o" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" /></svg>`;
  } else if (symbol === '▲') {
    return `<svg class="symbol-ai" viewBox="0 0 100 100"><polygon points="50,18 84,82 16,82" /></svg>`;
  }
  return '';
}

function checkWinner(board) {
  const combos = getWinCombinations(state.boardSize);
  for (const combo of combos) {
    const first = board[combo[0]];
    if (first && combo.every(idx => board[idx] === first)) {
      return { winner: first, combo };
    }
  }
  return null;
}

function updateTurnDisplay() {
  [cardX, cardO, cardAI, cardTie].forEach(c => c?.classList.remove('active-glow'));

  if (state.currentPlayer === 'X') cardX?.classList.add('active-glow');
  else if (state.currentPlayer === 'O') cardO?.classList.add('active-glow');
  else if (state.currentPlayer === '▲') cardAI?.classList.add('active-glow');
}

function updateScoreDisplay() {
  if (scoreXEl) scoreXEl.textContent = state.score.X;
  if (scoreOEl) scoreOEl.textContent = state.score.O;
  if (scoreAIEl) scoreAIEl.textContent = state.score.AI;
  if (scoreTiesEl) scoreTiesEl.textContent = state.score.ties;
}

function updatePlayerLabels() {
  const tieLabel = cardTie?.querySelector('.player-label');
  const tieIcon = cardTie?.querySelector('.player-icon');
  if (tieLabel) tieLabel.textContent = 'Нічиї';
  if (tieIcon) tieIcon.textContent = '🤝';

  if (state.gameMode === 'trio') {
    if (scoreBoardEl) scoreBoardEl.classList.add('four-cards');
    if (cardAI) cardAI.style.display = 'flex';

    if (labelXEl) labelXEl.textContent = 'Гравець 1 (X)';
    if (labelOEl) labelOEl.textContent = 'Гравець 2 (O)';
    if (labelAIEl) labelAIEl.textContent = 'ШІ (▲)';
  } else {
    if (scoreBoardEl) scoreBoardEl.classList.remove('four-cards');
    if (cardAI) cardAI.style.display = 'none';

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

  const winClass = winner === 'X' ? 'x-win' : (winner === 'O' ? 'o-win' : 'ai-win');
  winLineEl.className = `win-line ${winClass}`;
  winLineEl.style.transform = `rotate(${angleDeg}deg) scaleX(0)`;

  void winLineEl.offsetWidth;
  winLineEl.style.transform = `rotate(${angleDeg}deg) scaleX(1)`;
}

function handleWin(winData) {
  state.isGameOver = true;
  if (winData.winner === 'X') state.score.X++;
  else if (winData.winner === 'O') state.score.O++;
  else if (winData.winner === '▲') state.score.AI++;

  updateScoreDisplay();
  drawWinLine(winData.combo, winData.winner);
  playSound('win');
  launchConfetti();

  setTimeout(() => {
    let winnerName = 'Гравець X';
    if (state.gameMode === 'trio') {
      winnerName = winData.winner === 'X' ? 'Гравець 1 (✕)' : (winData.winner === 'O' ? 'Гравець 2 (◯)' : 'ШІ Бот (▲)');
    } else if (state.gameMode === 'online') {
      winnerName = winData.winner === state.online.mySymbol ? 'Ви перемогли!' : 'Друг переміг!';
    } else if (state.gameMode === 'ai') {
      winnerName = winData.winner === 'X' ? 'Гравець X' : 'ШІ Бот';
    }

    if (modalEmoji) modalEmoji.textContent = winData.winner === '▲' ? '🤖' : '🏆';
    if (modalTitle) modalTitle.textContent = `${winnerName} переміг!`;
    if (modalSubtitle) modalSubtitle.textContent = winData.winner === '▲' ? 'Штучний інтелект перехитрив обох гравців!' : 'Чудова партія!';
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
    if (state.gameMode === 'trio') {
      if (state.currentPlayer === 'X') state.currentPlayer = 'O';
      else if (state.currentPlayer === 'O') state.currentPlayer = '▲';
      else state.currentPlayer = 'X';
    } else {
      state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    }
    updateTurnDisplay();
  }
}

function handleCellClick(e) {
  const cell = e.currentTarget;
  const index = parseInt(cell.getAttribute('data-index'), 10);

  if (state.board[index] || state.isGameOver) return;

  if (state.gameMode === 'online') {
    if (!state.online.connected || state.currentPlayer !== state.online.mySymbol) return;
  }

  if (state.gameMode === 'ai' && state.currentPlayer === 'O') return;
  if (state.gameMode === 'trio' && state.currentPlayer === '▲') return;

  makeMove(index, state.currentPlayer);

  if (!state.isGameOver) {
    if (state.gameMode === 'ai' && state.currentPlayer === 'O') {
      setTimeout(handleAiTurn, 350);
    } else if (state.gameMode === 'trio' && state.currentPlayer === '▲') {
      setTimeout(handleTrioAiTurn, 400);
    }
  }
}

// ШІ логіка
function getAvailableMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

function handleTrioAiTurn() {
  if (state.isGameOver || state.currentPlayer !== '▲') return;
  const available = getAvailableMoves(state.board);
  if (available.length === 0) return;

  if (state.aiDifficulty === 'easy' && Math.random() < 0.65) {
    const randomMove = available[Math.floor(Math.random() * available.length)];
    makeMove(randomMove, '▲');
    return;
  }

  let chosenMove = -1;
  for (const m of available) {
    state.board[m] = '▲';
    if (checkWinner(state.board)) { chosenMove = m; state.board[m] = null; break; }
    state.board[m] = null;
  }

  if (chosenMove === -1) {
    for (const m of available) {
      state.board[m] = 'X';
      if (checkWinner(state.board)) { chosenMove = m; state.board[m] = null; break; }
      state.board[m] = null;
    }
  }

  if (chosenMove === -1) {
    for (const m of available) {
      state.board[m] = 'O';
      if (checkWinner(state.board)) { chosenMove = m; state.board[m] = null; break; }
      state.board[m] = null;
    }
  }

  if (chosenMove === -1) {
    const center = state.boardSize === 3 ? 4 : 5;
    if (state.board[center] === null) chosenMove = center;
    else chosenMove = available[Math.floor(Math.random() * available.length)];
  }

  makeMove(chosenMove, '▲');
}

function handleAiTurn() {
  if (state.isGameOver || state.currentPlayer !== 'O') return;
  const available = getAvailableMoves(state.board);
  if (available.length === 0) return;

  if (state.aiDifficulty === 'easy' && Math.random() < 0.65) {
    const randomMove = available[Math.floor(Math.random() * available.length)];
    makeMove(randomMove, 'O');
    return;
  }

  let move = available[0];
  for (const m of available) {
    state.board[m] = 'O';
    if (checkWinner(state.board)) { move = m; state.board[m] = null; makeMove(move, 'O'); return; }
    state.board[m] = null;
  }
  for (const m of available) {
    state.board[m] = 'X';
    if (checkWinner(state.board)) { move = m; state.board[m] = null; makeMove(move, 'O'); return; }
    state.board[m] = null;
  }

  move = available[Math.floor(Math.random() * available.length)];
  makeMove(move, 'O');
}

// Підказка
function showHint() {
  if (state.isGameOver) return;
  if (state.gameMode === 'ai' && state.currentPlayer !== 'X') return;
  if (state.gameMode === 'trio' && state.currentPlayer === '▲') return;

  clearHintHighlight();
  const available = getAvailableMoves(state.board);
  if (available.length === 0) return;

  const player = state.currentPlayer;
  let bestMove = available[0];

  for (const m of available) {
    state.board[m] = player;
    if (checkWinner(state.board)) { bestMove = m; state.board[m] = null; break; }
    state.board[m] = null;
  }

  playSound('hint');
  const targetCell = cells[bestMove];
  if (targetCell) {
    targetCell.classList.add('hint-highlight');
    setTimeout(() => targetCell.classList.remove('hint-highlight'), 2200);
  }
}

// Скидання
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
  [modePvpBtn, modeAiBtn, modeTrioBtn, modeOnlineBtn].forEach(b => b?.classList.remove('active'));

  if (mode === 'pvp') {
    modePvpBtn?.classList.add('active');
    aiDifficultySelect?.classList.add('hidden');
    hintBtn.style.display = 'inline-flex';
  } else if (mode === 'ai') {
    modeAiBtn?.classList.add('active');
    aiDifficultySelect?.classList.remove('hidden');
    hintBtn.style.display = 'inline-flex';
  } else if (mode === 'trio') {
    modeTrioBtn?.classList.add('active');
    aiDifficultySelect?.classList.remove('hidden'); // Видимо для 2 + ШІ!
    hintBtn.style.display = 'inline-flex';
  } else if (mode === 'online') {
    modeOnlineBtn?.classList.add('active');
    aiDifficultySelect?.classList.add('hidden');
    hintBtn.style.display = 'none';
    openOnlineModal();
  }

  updatePlayerLabels();
  updateScoreDisplay();
  resetRound(false);
}

// Онлайн зв'язок (PeerJS)
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
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
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
  state.online.peer = new window.Peer(`ttt-room-${code}`);

  state.online.peer.on('open', () => {
    document.getElementById('displayRoomCode').textContent = code;
    statusEl.textContent = '🟢 Очікування другого гравця...';
  });

  state.online.peer.on('connection', (conn) => {
    setupConnection(conn, true);
  });
}

function setupConnection(conn, isHost) {
  state.online.conn = conn;
  state.online.isHost = isHost;
  state.online.mySymbol = isHost ? 'X' : 'O';
  state.online.connected = true;

  document.getElementById('onlineStatus').textContent = '🎉 Підключено!';

  conn.on('data', (data) => {
    if (data.type === 'move') {
      makeMove(data.index, data.player, true);
    } else if (data.type === 'resetRound') {
      resetRound(false);
    } else if (data.type === 'setBoardSize') {
      setBoardSize(data.size, false);
    } else if (data.type === 'chat') {
      // Передаємо в модуль chat.js
      if (typeof window.handleIncomingChatMessage === 'function') {
        window.handleIncomingChatMessage(data);
      }
    }
  });

  setTimeout(() => {
    onlineDialog.classList.add('hidden');
    updatePlayerLabels();
    resetRound(false);
  }, 900);
}

function joinRoomByCode(code) {
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
  const conn = state.online.peer.connect(`ttt-room-${code.toUpperCase()}`);
  conn.on('open', () => setupConnection(conn, false));
}

// Ініціалізація подій
function initEvents() {
  modePvpBtn?.addEventListener('click', () => setGameMode('pvp'));
  modeAiBtn?.addEventListener('click', () => setGameMode('ai'));
  modeTrioBtn?.addEventListener('click', () => setGameMode('trio'));
  modeOnlineBtn?.addEventListener('click', () => setGameMode('online'));

  boardSizeSelect.addEventListener('change', (e) => {
    setBoardSize(parseInt(e.target.value, 10), true);
  });

  aiDifficultySelect?.addEventListener('change', (e) => {
    state.aiDifficulty = e.target.value;
  });

  hintBtn.addEventListener('click', showHint);

  soundToggleBtn?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundToggleBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
  });

  resetRoundBtn?.addEventListener('click', () => resetRound(true));
  resetScoreBtn?.addEventListener('click', () => {
    state.score = { X: 0, O: 0, AI: 0, ties: 0 };
    updateScoreDisplay();
    resetRound(true);
  });
  modalNextBtn?.addEventListener('click', () => resetRound(true));

  document.getElementById('tabCreate')?.addEventListener('click', () => {
    document.getElementById('tabCreate').classList.add('active');
    document.getElementById('tabJoin').classList.remove('active');
    document.getElementById('viewCreate').style.display = 'flex';
    document.getElementById('viewJoin').style.display = 'none';
  });

  document.getElementById('tabJoin')?.addEventListener('click', () => {
    document.getElementById('tabJoin').classList.add('active');
    document.getElementById('tabCreate').classList.remove('active');
    document.getElementById('viewJoin').style.display = 'flex';
    document.getElementById('viewCreate').style.display = 'none';
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
    if (!state.online.connected) setGameMode('trio');
  });

  window.addEventListener('resize', resizeConfettiCanvas);
}

function init() {
  renderBoard();
  initEvents();
  setGameMode('trio');
}

init();
