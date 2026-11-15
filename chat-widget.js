/* Summit Wing chat widget
 * Add to any page:  <script src="chat-widget.js" data-api="https://YOUR-WORKER.workers.dev/chat" defer></script>
 */
(function () {
  "use strict";
  if (window.__swChatLoaded) return;
  window.__swChatLoaded = true;

  var script = document.currentScript;
  var API = (script && script.getAttribute("data-api")) || "";
  var EMAIL = "kylen@summitwing.com";
  var BOOKING = "https://cal.com/summitwing";
  var MAX_CHARS = 600;
  var MAX_TURNS = 12;
  var STORE_KEY = "sw-chat-v1";
  var GREETING = "Hi! I'm the Summit Wing assistant. Ask me anything about what we build, how it works, or getting started.";
  var SUGGESTIONS = ["What does Summit Wing do?", "How much does it cost?", "Is this only for real estate?"];

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

  .sw-chips{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 6px}
  .sw-chip{border:1px solid #B9D3EF;background:#fff;color:#1B4470;font-size:13px;font-weight:500;border-radius:999px;padding:7px 12px;cursor:pointer;transition:background .15s}
  .sw-chip:hover{background:#EEF4FB}

  .sw-form{display:flex;align-items:flex-end;gap:8px;padding:12px;border-top:1px solid #DCE6F2;background:#fff}
  .sw-form textarea{flex:1;resize:none;border:1px solid #DCE6F2;border-radius:12px;padding:10px 12px;font-size:14.5px;line-height:1.4;
    max-height:110px;min-height:42px;color:#0B1B2E;outline:none;transition:border-color .15s}
  .sw-form textarea:focus{border-color:#2B7BD6}
  .sw-form button{width:42px;height:42px;flex:0 0 auto;border:0;border-radius:12px;background:#2B7BD6;color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .15s}
  .sw-form button:hover{background:#226CC0}
  .sw-form button:disabled,.sw-form textarea:disabled{opacity:.5;cursor:not-allowed}
  .sw-foot{font-size:11.5px;color:#56677D;text-align:center;padding:0 12px 10px;background:#fff}
  .sw-foot a{color:#1B4470}

  @media (max-width:520px){
    .sw-panel{right:0;left:0;bottom:0;width:100%;height:100%;max-height:100dvh;border-radius:0;border:0}
    .sw-open .sw-launch{display:none}
    .sw-launch{right:16px;bottom:16px}
  }
  @media (prefers-reduced-motion:reduce){.sw-panel,.sw-launch,.sw-launch svg{transition:none}.sw-typing i{animation:none}}
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
      '<form class="sw-form">' +
        '<textarea rows="1" maxlength="' + MAX_CHARS + '" placeholder="Ask a question…" aria-label="Your message"></textarea>' +
        '<button type="submit" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '</form>' +
      '<div class="sw-foot">AI can make mistakes. Need a person? <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div>' +
    '</div>' +
    '<button class="sw-launch" type="button" aria-label="Open chat" aria-expanded="false">' +
      '<svg class="sw-bubble" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
      '<svg class="sw-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '<span class="sw-dot"></span>' +
    '</button>';
  document.body.appendChild(root);

  var panel = root.querySelector(".sw-panel");
  var log = root.querySelector(".sw-log");
  var form = root.querySelector(".sw-form");
  var input = form.querySelector("textarea");
  var sendBtn = form.querySelector("button");
  var launch = root.querySelector(".sw-launch");
  var minBtn = root.querySelector(".sw-min");

  // ── State ────────────────────────────────────────────────
  var messages = [];
  var busy = false;
  try { messages = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]") || []; } catch (e) { messages = []; }
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages)); } catch (e) {} }

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
    safe = safe.replace(/(^|[^\/\w@])((?:cal\.com\/summitwing|demo\.summitwing\.com)\b)/g, '$1<a href="https://$2" target="_blank" rel="noopener">$2</a>');
    safe = safe.replace(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '<a href="mailto:$1">$1</a>');
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
  function renderAll() {
    log.innerHTML = "";
    addBubble("assistant", GREETING);
    messages.forEach(function (m) { addBubble(m.role, m.content); });
    if (!messages.length) renderChips();
    checkLimit();
  }
  function userTurns() { return messages.filter(function (m) { return m.role === "user"; }).length; }
  function checkLimit() {
    var done = userTurns() >= MAX_TURNS;
    input.disabled = done || busy;
    sendBtn.disabled = done || busy;
    input.placeholder = done ? "Message limit reached. Email us for more help." : "Ask a question…";
  }

  // ── Sending ──────────────────────────────────────────────
  function send(text) {
    text = (text || "").trim().slice(0, MAX_CHARS);
    if (!text || busy || userTurns() >= MAX_TURNS) return;
    var chips = log.querySelector(".sw-chips"); if (chips) chips.remove();

    messages.push({ role: "user", content: text });
    save();
    addBubble("user", text);
    input.value = ""; autoSize();
    busy = true; checkLimit();

    var bubble = addBubble("assistant", "");
    bubble.innerHTML = '<span class="sw-typing"><i></i><i></i><i></i></span>';
    var reply = "";
    var fallback = "Sorry, I couldn't connect just now. You can reach Kylen at " + EMAIL + " or book a call at " + BOOKING + ".";

    if (!API) { finish(fallback, false); return; }

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    }).then(function (res) {
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
    }).catch(function () { finish(reply || fallback, !!reply); });

    function finish(text, keep) {
      bubble.innerHTML = linkify(text);
      log.scrollTop = log.scrollHeight;
      if (keep) { messages.push({ role: "assistant", content: text }); }
      else { messages.pop(); } // drop the unanswered question so history stays valid
      save();
      busy = false; checkLimit();
      if (!input.disabled) input.focus();
    }
  }

  // ── Events ───────────────────────────────────────────────
  function autoSize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }
  function setOpen(open) {
    root.classList.toggle("sw-open", open);
    root.classList.add("sw-seen");
    launch.setAttribute("aria-expanded", String(open));
    launch.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) setTimeout(function () { if (!input.disabled) input.focus(); }, 150);
  }
  launch.addEventListener("click", function () { setOpen(!root.classList.contains("sw-open")); });
  minBtn.addEventListener("click", function () { setOpen(false); launch.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("sw-open")) { setOpen(false); launch.focus(); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener("input", autoSize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });

  renderAll();
})();
