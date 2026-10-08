/**
 * chat.js — Модуль онлайн-чату для гри "Хрестики-Нулики Pro"
 * Працює в реальному часі через WebRTC (PeerJS)
 */
'use strict';

(function () {
  // ==========================================
  // СТИЛІ ЧАТУ (Розміщення точно зліва від дошки)
  // ==========================================
  const chatStyles = document.createElement('style');
  chatStyles.id = 'tictactoe-chat-styles';
  chatStyles.textContent = `
    /* Контейнер чату зліва від головної картки */
    .chat-widget {
      position: fixed;
      top: 50%;
      /* Розміщуємо ліворуч від центрованої гри 460px */
      left: max(20px, calc(50% - 230px - 340px));
      transform: translateY(-50%);
      width: 310px;
      height: 480px;
      max-height: 85vh;
      background: var(--surface-color, rgba(22, 27, 34, 0.85));
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius-lg, 20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      z-index: 90;
      overflow: hidden;
      font-family: inherit;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Шапка чату */
    .chat-header {
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chat-title {
      font-size: 0.95rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f0f6fc;
    }
    .chat-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8b949e;
      box-shadow: 0 0 8px currentColor;
    }
    .chat-status-dot.online {
      background: #10b981;
    }

    /* Швидкі реакції емодзі */
    .chat-quick-emojis {
      display: flex;
      justify-content: space-around;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .chat-emoji-btn {
      background: transparent;
      border: none;
      font-size: 1.15rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: transform 0.15s ease;
    }
    .chat-emoji-btn:hover {
      transform: scale(1.35);
    }

    /* Список повідомлень */
    .chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    /* Повідомлення */
    .chat-msg {
      max-width: 82%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      line-height: 1.35;
      word-break: break-word;
      animation: msgPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .chat-msg.me {
      align-self: flex-end;
      background: rgba(0, 240, 255, 0.18);
      border: 1px solid rgba(0, 240, 255, 0.35);
      color: #f0f6fc;
      border-bottom-right-radius: 2px;
    }
    .chat-msg.other {
      align-self: flex-start;
      background: rgba(255, 51, 102, 0.18);
      border: 1px solid rgba(255, 51, 102, 0.35);
      color: #f0f6fc;
      border-bottom-left-radius: 2px;
    }
    .chat-msg.system {
      align-self: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #8b949e;
      font-size: 0.75rem;
      text-align: center;
      border-radius: 20px;
      padding: 4px 10px;
    }
    .chat-msg-time {
      font-size: 0.65rem;
      opacity: 0.6;
      margin-top: 3px;
      text-align: right;
    }

    /* Форма вводу */
    .chat-input-bar {
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 8px;
    }
    .chat-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .chat-input:focus {
      border-color: var(--color-x, #00f0ff);
    }
    .chat-send-btn {
      background: var(--text-main, #f0f6fc);
      color: #0d1117;
      border: none;
      border-radius: 10px;
      padding: 0 14px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s, background 0.15s;
    }
    .chat-send-btn:hover {
      background: #ffffff;
      transform: scale(1.04);
    }

    /* Кнопка відкриття чату на вузьких екранах */
    .chat-toggle-btn {
      display: none;
      position: fixed;
      left: 20px;
      top: 20px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--surface-color, #161b22);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 1.2rem;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 95;
    }

    @keyframes msgPop {
      0% { opacity: 0; transform: translateY(6px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Адаптивність для екранів менше 1140px */
    @media (max-width: 1140px) {
      .chat-toggle-btn {
        display: flex;
      }
      .chat-widget {
        left: 20px;
        top: 75px;
        transform: none;
        height: 420px;
        opacity: 0;
        pointer-events: none;
        transform: translateY(-10px);
      }
      .chat-widget.active {
        opacity: 1;
        pointer-events: all;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(chatStyles);

  // ==========================================
  // СТВОРЕННЯ HTML РОЗМІТКИ ЧАТУ
  // ==========================================
  const chatToggleBtn = document.createElement('button');
  chatToggleBtn.className = 'chat-toggle-btn';
  chatToggleBtn.id = 'chatToggleBtn';
  chatToggleBtn.title = 'Відкрити онлайн-чат';
  chatToggleBtn.innerHTML = '💬';

  const chatWidget = document.createElement('aside');
  chatWidget.className = 'chat-widget';
  chatWidget.id = 'chatWidget';
  chatWidget.innerHTML = `
    <div class="chat-header">
      <div class="chat-title">
        <span class="chat-status-dot" id="chatStatusDot"></span>
        <span>Онлайн-чат</span>
      </div>
      <span style="font-size: 0.72rem; color: #8b949e;" id="chatStatusText">Офлайн</span>
    </div>

    <!-- Панель швидких реакцій -->
    <div class="chat-quick-emojis">
      <button class="chat-emoji-btn" data-emoji="🔥">🔥</button>
      <button class="chat-emoji-btn" data-emoji="😂">😂</button>
      <button class="chat-emoji-btn" data-emoji="👏">👏</button>
      <button class="chat-emoji-btn" data-emoji="🤯">🤯</button>
      <button class="chat-emoji-btn" data-emoji="GG">🤝</button>
    </div>

    <!-- Вікно з повідомленнями -->
    <div class="chat-messages" id="chatMessages">
      <div class="chat-msg system">
        Увійдіть у режим «🌐 Онлайн», щоб листуватися з другом!
      </div>
    </div>

    <!-- Поле вводу -->
    <form class="chat-input-bar" id="chatForm">
      <input type="text" class="chat-input" id="chatInput" placeholder="Напишіть повідомлення..." maxlength="120" autocomplete="off" />
      <button type="submit" class="chat-send-btn">➤</button>
    </form>
  `;

  document.body.appendChild(chatToggleBtn);
  document.body.appendChild(chatWidget);

  // ==========================================
  // ЛОГІКА ТА ВІДПРАВКА ПОВІДОМЛЕНЬ
  // ==========================================
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatStatusDot = document.getElementById('chatStatusDot');
  const chatStatusText = document.getElementById('chatStatusText');

  // Звук повідомлення
  function playChatChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  function addMessage(text, type = 'system') {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (type === 'system') {
      msg.textContent = text;
    } else {
      msg.innerHTML = `
        <div>${text}</div>
        <div class="chat-msg-time">${time}</div>
      `;
    }

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (type === 'other') playChatChime();
  }

  function sendMessage(text) {
    if (!text.trim()) return;

    // Перевіряємо чи є підключення в онлайн режимі
    const isOnline = window.state && window.state.gameMode === 'online' && window.state.online.connected;

    if (!isOnline) {
      addMessage(text, 'me');
      setTimeout(() => {
        addMessage('Повідомлення не надіслано: ви не підключені до друга в режимі «🌐 Онлайн».', 'system');
      }, 300);
      return;
    }

    // Надсилаємо по WebRTC через PeerJS
    if (window.state.online.conn) {
      window.state.online.conn.send({
        type: 'chat',
        text: text.trim()
      });
      addMessage(text.trim(), 'me');
    }
  }

  // Обробка форми
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInput.value.trim();
    if (val) {
      sendMessage(val);
      chatInput.value = '';
    }
  });

  // Кнопки емодзі
  document.querySelectorAll('.chat-emoji-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      sendMessage(emoji);
    });
  });

  // Мобільна кнопка
  chatToggleBtn.addEventListener('click', () => {
    chatWidget.classList.toggle('active');
  });

  // Інтерфейс для прийому повідомлень від app.js
  window.handleIncomingChatMessage = function (data) {
    if (data && data.text) {
      addMessage(data.text, 'other');
    }
  };

  // Оновлення статусу підключення
  setInterval(() => {
    const isConnected = window.state && window.state.gameMode === 'online' && window.state.online.connected;
    if (isConnected) {
      chatStatusDot.classList.add('online');
      chatStatusText.textContent = 'З’єднано';
    } else {
      chatStatusDot.classList.remove('online');
      chatStatusText.textContent = window.state && window.state.gameMode === 'online' ? 'Очікування...' : 'Офлайн';
    }
  }, 1000);
})();