function __decoInit() {
  const API_URL = '/api/chat';
  const SESSION_ID = 'deco-' + Math.random().toString(36).slice(2, 10);
  let open = false;
  let messages = [];
  let loading = false;

  const css = document.createElement('style');
  css.textContent = `
    .deco-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9998;opacity:0;pointer-events:none;transition:opacity .3s}
    .deco-overlay.open{opacity:1;pointer-events:auto}
    .deco-panel{position:fixed;bottom:0;right:0;width:420px;height:100vh;max-width:100vw;background:#fff;z-index:9999;
      display:flex;flex-direction:column;transform:translateX(100%);transition:transform .35s cubic-bezier(.16,.84,.44,1);
      box-shadow:-4px 0 24px rgba(0,0,0,.15);font-family:'Inter',system-ui,sans-serif}
    .deco-panel.open{transform:translateX(0)}
    .deco-head{background:linear-gradient(118deg,#7E5BC4 0%,#9B6FC9 42%,#D8BE8C 100%);padding:20px 22px;display:flex;align-items:center;gap:14px;flex:none}
    .deco-head-icon{width:42px;height:42px;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center}
    .deco-head-info{flex:1;color:#fff}
    .deco-head-title{font-family:'Comfortaa',sans-serif;font-weight:700;font-size:17px;letter-spacing:.02em}
    .deco-head-sub{font-size:12px;opacity:.85;margin-top:2px}
    .deco-close{background:none;border:none;color:#fff;cursor:pointer;padding:6px;opacity:.8;transition:opacity .15s}
    .deco-close:hover{opacity:1}
    .deco-msgs{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:14px;
      scrollbar-width:thin;scrollbar-color:#e0e0e0 transparent}
    .deco-msgs::-webkit-scrollbar{width:5px}
    .deco-msgs::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px}
    .deco-bubble{max-width:85%;padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap}
    .deco-bubble.bot{align-self:flex-start;background:#F2F0F7;color:#40403E;border-bottom-left-radius:4px}
    .deco-bubble.user{align-self:flex-end;background:#7E5BC4;color:#fff;border-bottom-right-radius:4px}
    .deco-bubble.bot strong{color:#7E5BC4}
    .deco-typing{align-self:flex-start;padding:12px 20px;background:#F2F0F7;border-radius:18px;border-bottom-left-radius:4px;display:flex;gap:5px;align-items:center}
    .deco-dot{width:7px;height:7px;background:#9B6FC9;border-radius:50%;animation:decoBounce 1.2s infinite}
    .deco-dot:nth-child(2){animation-delay:.15s}
    .deco-dot:nth-child(3){animation-delay:.3s}
    @keyframes decoBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    .deco-input-area{padding:14px 18px;border-top:1px solid #eee;display:flex;gap:10px;flex:none;background:#fff}
    .deco-input{flex:1;border:1px solid #ddd;border-radius:24px;padding:11px 18px;font-size:14px;font-family:inherit;
      outline:none;resize:none;max-height:100px;line-height:1.4;transition:border-color .15s}
    .deco-input:focus{border-color:#9B6FC9}
    .deco-send{width:42px;height:42px;border-radius:50%;border:none;
      background:linear-gradient(118deg,#7E5BC4,#D8BE8C);color:#fff;cursor:pointer;
      display:flex;align-items:center;justify-content:center;flex:none;transition:transform .12s,opacity .15s}
    .deco-send:hover{transform:scale(1.06)}
    .deco-send:disabled{opacity:.4;cursor:default;transform:none}
    .deco-welcome{text-align:center;padding:30px 20px;color:#737373}
    .deco-welcome-icon{margin:0 auto 16px;width:64px;height:64px;background:linear-gradient(118deg,#7E5BC4 0%,#9B6FC9 42%,#D8BE8C 100%);
      border-radius:50%;display:flex;align-items:center;justify-content:center}
    .deco-welcome h3{font-family:'Comfortaa',sans-serif;color:#40403E;font-size:18px;margin-bottom:8px}
    .deco-welcome p{font-size:13px;line-height:1.6;max-width:280px;margin:0 auto}
    .deco-suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
    .deco-sug{background:#F2F0F7;border:1px solid #e0dce8;border-radius:20px;padding:8px 14px;font-size:12px;color:#7E5BC4;
      cursor:pointer;transition:all .15s;font-family:inherit}
    .deco-sug:hover{background:#7E5BC4;color:#fff;border-color:#7E5BC4}
    @media(max-width:480px){.deco-panel{width:100vw}}
  `;
  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.className = 'deco-overlay';
  overlay.addEventListener('click', toggle);

  const panel = document.createElement('div');
  panel.className = 'deco-panel';
  panel.innerHTML = `
    <div class="deco-head">
      <div class="deco-head-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.4a8 8 0 0 1-11.5 7.2L4 20l1.4-4.8A8 8 0 1 1 21 11.4z"/>
          <path d="M12.4 6.6l1.05 3.05 3.05 1.05-3.05 1.05-1.05 3.05-1.05-3.05-3.05-1.05 3.05-1.05z" fill="#fff" stroke="#fff" stroke-width="0.5"/>
        </svg>
      </div>
      <div class="deco-head-info">
        <div class="deco-head-title">Deco IA</div>
        <div class="deco-head-sub">Tu asistente de decoración</div>
      </div>
      <button class="deco-close" title="Cerrar">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="deco-msgs" id="deco-msgs"></div>
    <div class="deco-input-area">
      <textarea class="deco-input" id="deco-input" placeholder="Escribe tu mensaje..." rows="1"></textarea>
      <button class="deco-send" id="deco-send" title="Enviar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(panel);

  const msgsEl = panel.querySelector('#deco-msgs');
  const inputEl = panel.querySelector('#deco-input');
  const sendBtn = panel.querySelector('#deco-send');
  panel.querySelector('.deco-close').addEventListener('click', toggle);

  showWelcome();

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });
  sendBtn.addEventListener('click', send);

  function toggle() {
    open = !open;
    panel.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    if (open) {
      inputEl.focus();
      if (messages.length === 0) {
        sendInitial();
      }
    }
  }

  function showWelcome() {
    msgsEl.innerHTML = `
      <div class="deco-welcome">
        <div class="deco-welcome-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.4a8 8 0 0 1-11.5 7.2L4 20l1.4-4.8A8 8 0 1 1 21 11.4z"/>
            <path d="M12.4 6.6l1.05 3.05 3.05 1.05-3.05 1.05-1.05 3.05-1.05-3.05-3.05-1.05 3.05-1.05z" fill="#fff" stroke="#fff" stroke-width="0.5"/>
          </svg>
        </div>
        <h3>¡Hola! Soy Deco IA</h3>
        <p>Tu asistente personal de decoración. Te ayudo a encontrar el mueble perfecto para tu hogar.</p>
        <div class="deco-suggestions">
          <button class="deco-sug" data-msg="Busco una cama para mi dormitorio">🛏️ Busco una cama</button>
          <button class="deco-sug" data-msg="Necesito amueblar mi sala">🛋️ Amueblar mi sala</button>
          <button class="deco-sug" data-msg="Quiero renovar mi comedor">🍽️ Renovar comedor</button>
          <button class="deco-sug" data-msg="¿Qué opciones tienen en ofertas?">🏷️ Ver ofertas</button>
        </div>
      </div>
    `;
    msgsEl.querySelectorAll('.deco-sug').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        inputEl.value = msg;
        send();
      });
    });
  }

  async function sendInitial() {
    // no-op: wait for user to pick a suggestion or type
  }

  async function send() {
    const text = inputEl.value.trim();
    if (!text || loading) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    if (messages.length === 0) {
      msgsEl.innerHTML = '';
    }

    addBubble(text, 'user');
    messages.push({ role: 'user', content: text });

    loading = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
      });

      removeTyping();

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      addBubble(data.reply, 'bot');
      messages.push({ role: 'assistant', content: data.reply });
    } catch {
      removeTyping();
      addBubble('Lo siento, hubo un error de conexión. Por favor intenta de nuevo.', 'bot');
    }

    loading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  function addBubble(text, type) {
    const div = document.createElement('div');
    div.className = 'deco-bubble ' + type;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'deco-typing';
    div.id = 'deco-typing';
    div.innerHTML = '<span class="deco-dot"></span><span class="deco-dot"></span><span class="deco-dot"></span>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('deco-typing');
    if (el) el.remove();
  }

  // Floating action button
  const fab = document.createElement('button');
  fab.className = 'deco-fab';
  fab.title = 'Abrir Deco IA';
  fab.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.4a8 8 0 0 1-11.5 7.2L4 20l1.4-4.8A8 8 0 1 1 21 11.4z"/>
    <path d="M12.4 6.6l1.05 3.05 3.05 1.05-3.05 1.05-1.05 3.05-1.05-3.05-3.05-1.05 3.05-1.05z" fill="#fff" stroke="#fff" stroke-width="0.5"/>
  </svg>`;
  fab.onclick = function() { toggle(); };
  document.documentElement.appendChild(fab);

  const fabCss = document.createElement('style');
  fabCss.textContent = `
    .deco-fab{position:fixed;bottom:28px;right:28px;z-index:2147483647;width:60px;height:60px;border-radius:50%;border:none;
      background:linear-gradient(118deg,#7E5BC4 0%,#9B6FC9 42%,#D8BE8C 100%);
      box-shadow:0 4px 16px rgba(126,91,196,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:transform .2s,box-shadow .2s;animation:decoFabPulse 2.5s infinite}
    .deco-fab:hover{transform:scale(1.08);box-shadow:0 6px 22px rgba(126,91,196,.5)}
    .deco-panel.open~.deco-fab,.deco-overlay.open~.deco-fab{display:none}
    @keyframes decoFabPulse{0%{box-shadow:0 4px 16px rgba(126,91,196,.4)}50%{box-shadow:0 4px 16px rgba(126,91,196,.4),0 0 0 10px rgba(126,91,196,.12)}100%{box-shadow:0 4px 16px rgba(126,91,196,.4)}}
  `;
  document.head.appendChild(fabCss);

  // Expose toggle for the existing "Deco IA" buttons in the page
  window.__decoToggle = toggle;

  // Hook into existing toggleDeco calls from dc-runtime templates
  const origInterval = setInterval(() => {
    const btns = document.querySelectorAll('[title*="Deco"]');
    btns.forEach((btn) => {
      if (btn._decoHooked) return;
      btn._decoHooked = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
    });
  }, 500);

  setTimeout(() => clearInterval(origInterval), 10000);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __decoInit);
} else {
  __decoInit();
}
