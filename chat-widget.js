/* Summit Wing chat widget
 * Add to any page:  <script src="chat-widget.js" data-api="https://YOUR-WORKER.workers.dev/chat" defer></script>
 */
(function () {
  "use strict";
  if (window.__swChatLoaded) return;
  window.__swChatLoaded = true;

  var script = document.currentScript;
  var API = (script && script.getAttribute("data-api")) || "";
  var BASE = API.replace(/\/chat\/?$/, "");
  var EMAIL = "kylen@summitwing.com";
  var PHONE = "(760) 450-7294";
  var BOOKING = "https://cal.com/summitwing";
  var MAX_CHARS = 600;
  var MAX_TURNS = 12;
  var IDLE_CHECK_MS = 5 * 60 * 1000;   // quiet this long → "still there?"
  var CLOSE_AFTER_MS = 60 * 1000;      // then this long → chat closes
  var STORE_KEY = "sw-chat-v2";
  var GREETING = "Hi! I'm the Summit Wing assistant. Ask me anything about what we build, how it works, or getting started.";
  var CHECK_IN = "Are you still there? I'm happy to keep helping.";
  var ENDED = "This chat has ended. Thanks for stopping by!";
  var NOTE_SHARE = "Chats may be shared with Summit Wing for a follow-up.";
  var NOTE_WARN = "Please don't share payment, ID, or password info in this chat. It isn't a secure channel.";
  var SUGGESTIONS = ["What does Summit Wing do?", "How much does it cost?", "Is this only for real estate?"];

  // ── What counts as personal / sensitive while typing ─────
  var SENSITIVE = [
    /(?:\d[ -]?){12,18}\d/,                                   // card-length number
    /\b\d{3}[- ]\d{2}[- ]\d{4}\b/,                            // SSN format
    /\b(password|passcode|pin number|ssn|social security|routing (?:number|no|#)|account (?:number|no|#)|acct\.? ?(?:number|no|#)|credit card|debit card|card number|cvv|cvc|security code|driver'?s? licen[cs]e|passport)\b/i,
  ];
  var NAME_STOP = /^(looking|interested|just|not|curious|here|trying|wondering|thinking|ready|sure|good|fine|in|from|based|a|an|the|also|so|still|very|really|currently|with|new|getting|asking|on|at|back|done|confused|sorry|glad|happy|okay|ok)$/i;
  function looksPersonal(t) {
    if (/[\w.+-]+@[\w-]+\.?\w*/.test(t) && /@\w/.test(t)) return true;                       // email
    if (/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2,4}\b/.test(t)) return true;                       // phone
    if (/\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z0-9.'-]+\s+){0,3}(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|cir|circle|hwy|highway|pkwy|parkway|ter|terrace|trl|trail|loop|sq|square)\b/i.test(t)) return true; // street address
    if (/(?:,\s*|\b[A-Z]{2}\s+)\d{5}(?:-\d{4})?\b/.test(t) || /\bzip(?:\s*code)?\D{0,4}\d{5}\b/i.test(t)) return true; // ZIP
    if (/\b(my (?:name|email|phone|number|cell|address) is|call me at|text me at|reach me at|email me at|i live (?:at|on))\b/i.test(t)) return true;
    var m = t.match(/\b(?:i'?m|i am)\s+([A-Z][a-z]+)\b/);
    if (m && !NAME_STOP.test(m[1])) return true;                                                  // "I'm Sarah"
    return false;
  }
  function looksSensitive(t) { return SENSITIVE.some(function (r) { return r.test(t); }); }

  // ── Styles ───────────────────────────────────────────────
  var css = `
  .sw-chat, .sw-chat *{box-sizing:border-box;margin:0;padding:0;font-family:Inter,system-ui,-apple-system,sans-serif}
  .sw-launch{position:fixed;right:22px;bottom:22px;z-index:9999;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;
    background:#0E2A47;color:#fff;display:grid;place-items:center;box-shadow:0 14px 34px -10px rgba(14,42,71,.65);transition:transform .18s,background .2s}
  .sw-launch:hover{transform:translateY(-2px);background:#1B4470}
  .sw-launch:focus-visible{outline:3px solid #8EC5F5;outline-offset:3px}
  .sw-launch svg{width:26px;height:26px;transition:transform .2s,opacity .2s}
  .sw-launch .sw-x{position:absolute;opacity:0;transform:rotate(-90deg)}
  .sw-open .sw-launch .sw-bubble{opacity:0;transform:rotate(90deg)}
  .sw-open .sw-launch .sw-x{opacity:1;transform:none}
  .sw-dot{position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:#F28C38;border:2px solid #fff}
  .sw-open .sw-dot,.sw-seen .sw-dot{display:none}

  .sw-panel{position:fixed;right:22px;bottom:94px;z-index:9999;width:380px;height:min(580px,calc(100vh - 120px));
    background:#fff;border-radius:20px;border:1px solid #DCE6F2;box-shadow:0 30px 70px -24px rgba(14,42,71,.45);
    display:flex;flex-direction:column;overflow:hidden;transform-origin:bottom right;
    opacity:0;transform:translateY(12px) scale(.96);pointer-events:none;transition:opacity .2s,transform .22s cubic-bezier(.2,.8,.2,1)}
  .sw-open .sw-panel{opacity:1;transform:none;pointer-events:auto}

  .sw-head{background:#0E2A47;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}
  .sw-head .sw-av{width:40px;height:40px;border-radius:12px;background:#1B4470;display:grid;place-items:center;flex:0 0 auto}
  .sw-head b{display:block;font-size:15.5px;font-weight:700;letter-spacing:.2px}
  .sw-head span{font-size:12.5px;color:#A9C2DE;display:flex;align-items:center;gap:6px}
  .sw-head span i{width:7px;height:7px;border-radius:50%;background:#22C55E}
  .sw-head .sw-min{margin-left:auto;background:none;border:0;color:#C5D6EA;cursor:pointer;width:32px;height:32px;border-radius:8px;display:grid;place-items:center}
  .sw-head .sw-min:hover{background:rgba(255,255,255,.1);color:#fff}

  .sw-log{flex:1;overflow-y:auto;padding:18px 16px 8px;background:#F6F9FD;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
  .sw-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
  .sw-bot{background:#fff;color:#0B1B2E;border:1px solid #DCE6F2;border-bottom-left-radius:6px;align-self:flex-start}
  .sw-user{background:#2B7BD6;color:#fff;border-bottom-right-radius:6px;align-self:flex-end}
  .sw-msg a{color:#2B7BD6;font-weight:600;text-decoration:underline;text-underline-offset:2px}
  .sw-user a{color:#fff}
  .sw-typing{display:inline-flex;gap:4px;padding:4px 0}
  .sw-typing i{width:7px;height:7px;border-radius:50%;background:#8EC5F5;animation:swb 1s infinite ease-in-out}
  .sw-typing i:nth-child(2){animation-delay:.15s}.sw-typing i:nth-child(3){animation-delay:.3s}
  @keyframes swb{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
  .sw-ended{align-self:center;text-align:center;font-size:13px;color:#56677D;padding:10px 0 4px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .sw-new{border:0;background:#2B7BD6;color:#fff;font-size:13.5px;font-weight:600;border-radius:999px;padding:9px 16px;cursor:pointer}
  .sw-new:hover{background:#226CC0}

  .sw-chips{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 6px}
  .sw-chip{border:1px solid #B9D3EF;background:#fff;color:#1B4470;font-size:13px;font-weight:500;border-radius:999px;padding:7px 12px;cursor:pointer;transition:background .15s}
  .sw-chip:hover{background:#EEF4FB}

  .sw-note{font-size:12px;line-height:1.4;color:#7A8899;background:#fff;padding:0 14px;max-height:0;opacity:0;overflow:hidden;
    transition:max-height .2s,opacity .2s,padding .2s;border-top:1px solid transparent}
  .sw-note.sw-show{max-height:60px;opacity:1;padding:8px 14px 0}
  .sw-note.sw-warn{color:#B42318;font-weight:600;background:#FEF3F2;padding-bottom:8px;border-top-color:#FDD8D3}

  .sw-form{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;background:#fff;border-top:1px solid #DCE6F2}
  .sw-note.sw-show + .sw-form{border-top-color:transparent}
  .sw-form textarea{flex:1;resize:none;border:1px solid #DCE6F2;border-radius:12px;padding:10px 12px;font-size:16px;line-height:1.35;
    max-height:110px;min-height:44px;color:#0B1B2E;outline:none;transition:border-color .15s;-webkit-text-size-adjust:100%}
  .sw-form textarea:focus{border-color:#2B7BD6}
  .sw-form button{width:44px;height:44px;flex:0 0 auto;border:0;border-radius:12px;background:#2B7BD6;color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .15s}
  .sw-form button:hover{background:#226CC0}
  .sw-form button:disabled,.sw-form textarea:disabled{opacity:.5;cursor:not-allowed}
  .sw-foot{font-size:11.5px;color:#7A8899;text-align:center;padding:0 12px 10px;background:#fff}

  @media (max-width:520px){
    .sw-panel{right:0;left:0;bottom:0;top:0;width:100%;height:100%;max-height:100dvh;border-radius:0;border:0}
    .sw-open .sw-launch{display:none}
    .sw-launch{right:16px;bottom:16px}
  }
  @media (prefers-reduced-motion:reduce){.sw-panel,.sw-launch,.sw-launch svg,.sw-note{transition:none}.sw-typing i{animation:none}}
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ── Markup ───────────────────────────────────────────────
  var logo = '<svg width="28" viewBox="0 0 100 90" aria-hidden="true"><path d="M44 62 C30 50 14 36 2 22 C12 22 24 28 32 34 C24 26 16 18 12 10 C24 14 36 26 46 44Z" fill="#2B7BD6"/><path d="M56 62 C70 50 86 36 98 22 C88 22 76 28 68 34 C76 26 84 18 88 10 C76 14 64 26 54 44Z" fill="#2B7BD6"/><polygon points="22,86 50,22 78,86" fill="#4A86C5"/><polygon points="50,22 78,86 52,86" fill="#2F659E"/><polygon points="43,38 50,22 57,38 53,44 50,39 47,44" fill="#E4EFFA"/></svg>';

  var root = document.createElement("div");
  root.className = "sw-chat";
  root.innerHTML =
    '<div class="sw-panel" role="dialog" aria-label="Summit Wing chat" aria-modal="false">' +
      '<div class="sw-head"><div class="sw-av">' + logo + '</div>' +
        '<div><b>Summit Wing</b><span><i></i>AI assistant · replies instantly</span></div>' +
        '<button class="sw-min" type="button" aria-label="Close chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '</div>' +
      '<div class="sw-log" aria-live="polite"></div>' +
      '<div class="sw-note" role="status"></div>' +
      '<form class="sw-form">' +
        '<textarea rows="1" maxlength="' + MAX_CHARS + '" placeholder="Ask a question…" aria-label="Your message"></textarea>' +
        '<button type="submit" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '</form>' +
      '<div class="sw-foot">AI assistant · can make mistakes</div>' +
    '</div>' +
    '<button class="sw-launch" type="button" aria-label="Open chat" aria-expanded="false">' +
      '<svg class="sw-bubble" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
      '<svg class="sw-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '<span class="sw-dot"></span>' +
    '</button>';
  document.body.appendChild(root);

  var log = root.querySelector(".sw-log");
  var note = root.querySelector(".sw-note");
  var form = root.querySelector(".sw-form");
  var input = form.querySelector("textarea");
  var sendBtn = form.querySelector("button");
  var launch = root.querySelector(".sw-launch");
  var minBtn = root.querySelector(".sw-min");

  // ── State ────────────────────────────────────────────────
  function newId() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  function freshState() {
    return { sessionId: newId(), messages: [], checkIns: [], shareNotice: false,
             lastActivity: 0, checkAt: 0, ended: false };
  }
  var S;
  try { S = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); } catch (e) { S = null; }
  if (!S || !S.sessionId || !Array.isArray(S.messages)) S = freshState();
  var busy = false;
  var lastTyping = 0;
  var lastPing = 0;
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

  // ── Rendering ────────────────────────────────────────────
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function linkify(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, "$1");
    safe = safe.replace(/(https?:\/\/[^\s<)]+[^\s<).,!?;:])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    safe = safe.replace(/(^|[^\/\w@])(cal\.com\/summitwing)\b/g, '$1<a href="https://$2" target="_blank" rel="noopener">$2</a>');
    safe = safe.replace(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '<a href="mailto:$1">$1</a>');
    safe = safe.replace(/\(760\) 450-7294|760[-. ]450[-. ]7294/g, function (m) { return '<a href="tel:+17604507294">' + m + "</a>"; });
    return safe;
  }
  function addBubble(role, text) {
    var el = document.createElement("div");
    el.className = "sw-msg " + (role === "user" ? "sw-user" : "sw-bot");
    el.innerHTML = linkify(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function renderChips() {
    var wrap = document.createElement("div");
    wrap.className = "sw-chips";
    SUGGESTIONS.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sw-chip"; b.textContent = q;
      b.onclick = function () { wrap.remove(); send(q); };
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
  }
  function renderEnded() {
    var box = document.createElement("div");
    box.className = "sw-ended";
    box.innerHTML = "<span>" + ENDED + "</span>";
    var b = document.createElement("button");
    b.type = "button"; b.className = "sw-new"; b.textContent = "Start a new chat";
    b.onclick = function () { S = freshState(); save(); renderAll(); input.focus(); };
    box.appendChild(b);
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }
  function renderAll() {
    log.innerHTML = "";
    addBubble("assistant", GREETING);
    S.messages.forEach(function (m, i) {
      addBubble(m.role, m.content);
      if (S.checkIns.indexOf(i + 1) !== -1) addBubble("assistant", CHECK_IN);
    });
    if (!S.messages.length) renderChips();
    if (S.ended) renderEnded();
    input.value = "";
    updateNote();
    refreshInput();
  }
  function userTurns() { return S.messages.filter(function (m) { return m.role === "user"; }).length; }
  function refreshInput() {
    var limit = userTurns() >= MAX_TURNS;
    var off = S.ended || busy || limit;
    input.disabled = off;
    sendBtn.disabled = off;
    input.placeholder = S.ended ? "This chat has ended." : limit ? "Message limit reached." : "Ask a question…";
  }

  // ── Privacy notices ──────────────────────────────────────
  function updateNote() {
    var t = input.value;
    if (t && looksSensitive(t)) {
      note.textContent = NOTE_WARN;
      note.className = "sw-note sw-show sw-warn";
      return;
    }
    if (t && looksPersonal(t) && !S.shareNotice) { S.shareNotice = true; save(); }
    if (S.shareNotice && !S.ended) {
      note.textContent = NOTE_SHARE;
      note.className = "sw-note sw-show";
    } else {
      note.className = "sw-note";
    }
  }

  // ── Server calls ─────────────────────────────────────────
  function post(path, data) {
    if (!BASE) return Promise.reject(new Error("no api"));
    return fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: path !== "/chat",
    });
  }

  // ── Sending ──────────────────────────────────────────────
  function send(text) {
    text = (text || "").trim().slice(0, MAX_CHARS);
    if (!text || busy || S.ended || userTurns() >= MAX_TURNS) return;
    var chips = log.querySelector(".sw-chips"); if (chips) chips.remove();

    S.messages.push({ role: "user", content: text });
    S.checkAt = 0;
    save();
    addBubble("user", text);
    input.value = ""; autoSize(); updateNote();
    busy = true; refreshInput();

    var bubble = addBubble("assistant", "");
    bubble.innerHTML = '<span class="sw-typing"><i></i><i></i><i></i></span>';
    var reply = "";
    var fallback = "Sorry, I couldn't connect just now. You can email " + EMAIL + ", call or text " + PHONE + ", or book a call at " + BOOKING + ".";

    post("/chat", { sessionId: S.sessionId, messages: S.messages, page: location.pathname })
      .then(function (res) {
        if (!res.body || !res.body.getReader) {
          return res.text().then(function (t) { finish(t || fallback, res.ok); });
        }
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finish(reply || fallback, res.ok && !!reply); return; }
            reply += dec.decode(r.value, { stream: true });
            bubble.innerHTML = linkify(reply);
            log.scrollTop = log.scrollHeight;
            return pump();
          });
        }
        return pump();
      })
      .catch(function () { finish(reply || fallback, !!reply); });

    function finish(t, keep) {
      bubble.innerHTML = linkify(t);
      log.scrollTop = log.scrollHeight;
      if (keep) S.messages.push({ role: "assistant", content: t });
      else S.messages.pop(); // drop the unanswered question so history stays valid
      S.lastActivity = Date.now();
      save();
      busy = false; refreshInput();
      if (!input.disabled) input.focus();
    }
  }

  // ── Inactivity: 5 min → "still there?", +1 min → close ──
  function endChat(reason) {
    if (S.ended) return;
    S.ended = true;
    S.checkAt = 0;
    save();
    post("/end", { sessionId: S.sessionId, reason: reason }).catch(function () {});
    note.className = "sw-note";
    renderEnded();
    refreshInput();
  }
  function tick() {
    if (S.ended || busy || !S.lastActivity || !userTurns()) return;
    var now = Date.now();
    if (!S.checkAt) {
      var idle = now - S.lastActivity;
      if (idle >= IDLE_CHECK_MS + CLOSE_AFTER_MS) { endChat("Visitor left the page"); return; }
      if (idle >= IDLE_CHECK_MS) {
        S.checkAt = now;
        S.checkIns.push(S.messages.length);
        save();
        addBubble("assistant", CHECK_IN);
      }
    } else if (now - Math.max(S.checkAt, lastTyping) >= CLOSE_AFTER_MS) {
      endChat("No reply after the \"still there?\" check-in");
    }
  }
  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });

  // ── Events ───────────────────────────────────────────────
  function autoSize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }
  function setOpen(open) {
    root.classList.toggle("sw-open", open);
    root.classList.add("sw-seen");
    launch.setAttribute("aria-expanded", String(open));
    launch.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) { tick(); setTimeout(function () { if (!input.disabled) input.focus(); }, 150); }
  }
  launch.addEventListener("click", function () { setOpen(!root.classList.contains("sw-open")); });
  minBtn.addEventListener("click", function () { setOpen(false); launch.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("sw-open")) { setOpen(false); launch.focus(); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener("input", function () {
    autoSize();
    updateNote();
    var now = Date.now();
    lastTyping = now;
    if (!S.checkAt && S.lastActivity) { S.lastActivity = now; save(); }
    if (userTurns() && now - lastPing > 60000) {
      lastPing = now;
      post("/ping", { sessionId: S.sessionId }).catch(function () {});
    }
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });

  renderAll();
})();
