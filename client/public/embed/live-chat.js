/**
 * Sringeri Live Chat — website embed.
 *
 * Paste one script tag on any page of sringeri.net:
 *
 *   <script src="https://<this-app>/embed/live-chat.js" defer
 *           data-position="bottom-right" data-accent="#B45309"></script>
 *
 * Everything renders inside a shadow root, so the host page's CSS cannot reach
 * the widget and the widget cannot restyle the host page. All behaviour — the
 * bot, agent presence, the queue — is served by the Sringeri app; the website
 * only loads this file.
 */
(function () {
  "use strict";

  if (window.__sringeriLiveChatLoaded) return;
  window.__sringeriLiveChatLoaded = true;

  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("/embed/live-chat.js") !== -1) return all[i];
    }
    return null;
  })();

  // Keep this in sync with shared/public-origin.ts. The embed is a static
  // script and cannot import the TypeScript helper from the app bundle.
  function normalizePublicOrigin(origin) {
    var url = new URL(origin);
    var hostname = url.hostname.toLowerCase();
    var isReplitHost = hostname.endsWith(".replit.dev") ||
      hostname.endsWith(".replit.app") ||
      hostname.endsWith(".repl.co");
    if (isReplitHost && url.port === "5000") url.port = "";
    return url.origin;
  }

  var API = normalizePublicOrigin(script
    ? new URL(script.src, location.href).origin
    : location.origin);
  var VISITOR_KEY = "sringeri_chat_visitor_id";
  var CONVO_KEY = "sringeri_chat_conversation_id";
  var OPEN_POLL_MS = 3000;
  var IDLE_POLL_MS = 30000;

  function attr(name, fallback) {
    var v = script && script.getAttribute("data-" + name);
    return v === null || v === undefined || v === "" ? fallback : v;
  }

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
      return value;
    } catch (e) {
      return null;
    }
  }

  function visitorId() {
    var id = store(VISITOR_KEY);
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "w" + Date.now() + Math.random().toString(36).slice(2);
      store(VISITOR_KEY, id);
    }
    return id;
  }

  function api(path, body) {
    return fetch(API + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Bold, bullets and links only — everything else is escaped text. */
  function markup(text) {
    return esc(text)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  var CSS = [
    ":host { all: initial; }",
    "*, *::before, *::after { box-sizing: border-box; }",
    ".root { position: fixed; z-index: 2147483000; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }",
    ".launcher { width: 56px; height: 56px; border-radius: 50%; border: 0; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; position: relative; }",
    ".launcher svg { width: 26px; height: 26px; fill: #fff; }",
    ".dot { position: absolute; right: 4px; bottom: 4px; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; border: 2px solid #fff; }",
    ".badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: #dc2626; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }",
    ".panel { width: 350px; max-width: calc(100vw - 24px); height: 500px; max-height: calc(100vh - 40px); background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,.28); display: flex; flex-direction: column; overflow: hidden; }",
    ".head { padding: 12px 14px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
    ".head h3 { margin: 0; font-size: 14px; font-weight: 600; }",
    ".head p { margin: 2px 0 0; font-size: 11px; opacity: .85; }",
    ".head button { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; padding: 2px 6px; border-radius: 6px; }",
    ".head button:hover { background: rgba(255,255,255,.2); }",
    ".body { flex: 1; overflow-y: auto; padding: 14px; background: #faf8f5; }",
    ".msg { max-width: 85%; padding: 9px 13px; border-radius: 16px; font-size: 13.5px; line-height: 1.5; margin-bottom: 10px; white-space: normal; word-wrap: break-word; }",
    ".msg.them { background: #fff; border: 1px solid #ece6df; color: #1f2937; border-top-left-radius: 4px; }",
    ".msg.me { margin-left: auto; color: #fff; border-top-right-radius: 4px; }",
    ".msg a { color: inherit; text-decoration: underline; }",
    ".msg.them a { color: #b45309; }",
    ".sys { text-align: center; margin-bottom: 10px; }",
    ".sys span { display: inline-block; font-size: 11px; color: #6b7280; background: #efeae4; border-radius: 999px; padding: 4px 11px; }",
    ".who { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #9ca3af; margin-bottom: 3px; }",
    ".foot { border-top: 1px solid #ece6df; padding: 10px; background: #fff; }",
    ".row { display: flex; gap: 8px; }",
    "input, textarea { width: 100%; font: inherit; font-size: 13px; padding: 9px 11px; border: 1px solid #ddd5cc; border-radius: 10px; outline: none; background: #fff; color: #1f2937; }",
    "input:focus, textarea:focus { border-color: #b98f56; }",
    "textarea { resize: none; }",
    ".send { border: 0; border-radius: 10px; color: #fff; padding: 0 14px; cursor: pointer; font-size: 13px; font-weight: 600; }",
    ".send:disabled { opacity: .5; cursor: default; }",
    ".link { background: none; border: 0; padding: 6px 0 0; font-size: 12px; cursor: pointer; text-decoration: underline; }",
    ".form { display: grid; gap: 7px; }",
    ".form p { margin: 0 0 2px; font-size: 12px; color: #4b5563; }",
    ".err { color: #b91c1c; font-size: 12px; margin: 6px 0 0; }",
    ".hint { font-size: 11px; color: #6b7280; margin: 7px 0 0; text-align: center; }",
    ".full { display: block; width: 100%; text-align: center; padding-top: 8px; }",
  ].join("\n");

  var ICON = '<svg viewBox="0 0 24 24"><path d="M12 3C6.99 3 3 6.36 3 10.5c0 2.3 1.24 4.35 3.2 5.72-.13 1.2-.6 2.36-1.4 3.3a.5.5 0 0 0 .46.82c2-.3 3.6-1.1 4.72-1.9.96.23 1.98.36 3.02.36 5.01 0 9-3.36 9-7.5S17.01 3 12 3z"/></svg>';

  var host = document.createElement("div");
  host.id = "sringeri-live-chat";
  var shadow = host.attachShadow({ mode: "open" });
  var style = document.createElement("style");
  style.textContent = CSS;
  var root = document.createElement("div");
  root.className = "root";
  shadow.appendChild(style);
  shadow.appendChild(root);

  var state = {
    config: null,
    open: false,
    convo: null,
    lines: [],
    lastId: 0,
    unread: 0,
    agentOnline: false,
    sending: false,
    showForm: false,
    // Team is offline and no thread exists yet: visitor must pick bot or email.
    needsChoice: false,
    preEmailMode: false,
    error: "",
    timer: null,
  };

  function accent() { return (state.config && state.config.accent) || "#B45309"; }

  function place() {
    var pos = (state.config && state.config.position) || "bottom-right";
    root.style.bottom = "20px";
    if (pos === "bottom-left") { root.style.left = "20px"; root.style.right = "auto"; }
    else { root.style.right = "20px"; root.style.left = "auto"; }
  }

  function statusLine() {
    if (!state.convo && state.needsChoice) return "Our team is offline right now";
    var s = state.convo ? state.convo.status : "bot";
    if (s === "live") return "You are chatting with our team";
    if (s === "waiting") return "Connecting you to our team…";
    if (s === "offline_pending") return "We will reply within 2–4 hours";
    if (s === "closed") return "This chat has been closed";
    return state.agentOnline ? "AI assistant · team available" : "AI assistant · team offline";
  }

  function render() {
    place();
    if (!state.open) {
      root.innerHTML =
        '<button class="launcher" part="launcher" aria-label="Open Sringeri Live Chat" style="background:' + esc(accent()) + '">' +
        ICON +
        (state.agentOnline ? '<span class="dot"></span>' : "") +
        (state.unread > 0 ? '<span class="badge">' + (state.unread > 9 ? "9+" : state.unread) + "</span>" : "") +
        "</button>";
      root.querySelector(".launcher").addEventListener("click", openPanel);
      return;
    }

    var offerChoice = !state.convo && state.needsChoice;
    var title = offerChoice
      ? "Sringeri Team"
      : (state.convo && state.convo.status === "live" && state.convo.assignedAgentName) || "Sringeri Sahayak";
    var canTalk = state.convo && state.convo.status !== "closed";
    var showTalk = canTalk && state.convo.status !== "live" && state.convo.status !== "waiting" && !state.showForm;

    var bodyHtml;
    if (offerChoice) {
      bodyHtml = '<div class="choice">' +
        '<p style="font-size:12px;color:#4b5563;text-align:center;margin:0 0 10px">Our team is offline right now. Choose how you\'d like to continue:</p>' +
        (!state.preEmailMode
          ? '<div style="display:grid;gap:8px">' +
            '<button class="send" id="chooseBot" style="background:' + esc(accent()) + ';width:100%;padding:9px">Chat with AI assistant</button>' +
            '<button class="send" id="chooseEmail" style="background:#fff;border:1px solid #ddd5cc;color:#1f2937;width:100%;padding:9px">Email us instead</button>' +
            "</div>"
          : '<form class="form" id="prechatEmail">' +
            '<input name="name" placeholder="Your name" autocomplete="name">' +
            '<input name="email" type="email" required placeholder="Email address" autocomplete="email">' +
            '<input name="phone" placeholder="Phone (optional)" autocomplete="tel">' +
            '<textarea name="concern" rows="3" required placeholder="How can we help?"></textarea>' +
            '<div class="row"><button class="send" type="submit" style="background:' + esc(accent()) + ';flex:1;padding:9px">Send to our team</button></div>' +
            '<button class="link" type="button" id="cancelPrechat" style="color:' + esc(accent()) + '">Back</button>' +
            "</form>") +
        (state.error ? '<p class="err">' + esc(state.error) + "</p>" : "") +
        "</div>";
    } else {
      bodyHtml = state.lines.map(function (l) {
        if (l.author === "system") return '<div class="sys"><span>' + markup(l.content) + "</span></div>";
        if (l.author === "user") return '<div class="msg me" style="background:' + esc(accent()) + '">' + markup(l.content) + "</div>";
        var who = l.author === "agent" ? (l.authorName || "Sringeri Team") : "Sringeri Sahayak";
        return '<div class="who">' + esc(who) + '</div><div class="msg them">' + markup(l.content) + "</div>";
      }).join("");
    }

    var footHtml;
    if (offerChoice) {
      footHtml = "";
    } else if (state.showForm) {
      footHtml =
        '<form class="form" id="handoff">' +
        "<p>Our team is offline. Leave your details and we will reply within 2–4 hours.</p>" +
        '<input name="name" placeholder="Your name" autocomplete="name">' +
        '<input name="email" type="email" required placeholder="Email address" autocomplete="email">' +
        '<input name="phone" placeholder="Phone (optional)" autocomplete="tel">' +
        '<textarea name="concern" rows="3" required placeholder="How can we help?"></textarea>' +
        '<div class="row"><button class="send" type="submit" style="background:' + esc(accent()) + ';flex:1;padding:9px">Send to our team</button></div>' +
        '<button class="link" type="button" id="cancelForm" style="color:' + esc(accent()) + '">Back to chat</button>' +
        "</form>";
    } else if (canTalk) {
      footHtml =
        '<div class="row"><input id="msg" placeholder="Type your message…" autocomplete="off">' +
        '<button class="send" id="send" style="background:' + esc(accent()) + '"' + (state.sending ? " disabled" : "") + ">Send</button></div>" +
        (showTalk ? '<button class="link" id="talk" style="color:' + esc(accent()) + '">Talk to a person</button>' : "");
    } else if (state.convo) {
      footHtml = '<button class="link" id="restart" style="color:' + esc(accent()) + '">Start a new chat</button>';
    } else {
      footHtml = "";
    }

    root.innerHTML =
      '<div class="panel">' +
      '<div class="head" style="background:' + esc(accent()) + '"><div><h3>' + esc(title) + "</h3><p>" + esc(statusLine()) + "</p></div>" +
      '<button id="close" aria-label="Close chat">&times;</button></div>' +
      '<div class="body" id="body">' + bodyHtml + "</div>" +
      '<div class="foot">' + footHtml +
      (state.error ? '<p class="err">' + esc(state.error) + "</p>" : "") +
      '<button class="link full" id="fullchat" style="color:' + esc(accent()) + '">View all my conversations</button>' +
      '<p class="hint">Powered by Sri Sringeri Sharada Peetham</p>' +
      "</div></div>";

    var body = root.querySelector("#body");
    if (body) body.scrollTop = body.scrollHeight;

    root.querySelector("#close").addEventListener("click", closePanel);

    var input = root.querySelector("#msg");
    var sendBtn = root.querySelector("#send");
    if (input && sendBtn) {
      var submit = function () { send(input.value); };
      sendBtn.addEventListener("click", submit);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submit(); } });
      input.focus();
    }

    var talk = root.querySelector("#talk");
    if (talk) talk.addEventListener("click", requestAgent);

    var cancel = root.querySelector("#cancelForm");
    if (cancel) cancel.addEventListener("click", function () { state.showForm = false; state.error = ""; render(); });

    var form = root.querySelector("#handoff");
    if (form) form.addEventListener("submit", submitHandoff);

    var restart = root.querySelector("#restart");
    if (restart) restart.addEventListener("click", function () {
      store(CONVO_KEY, "");
      state.convo = null; state.lines = []; state.lastId = 0;
      render();
      startSession("team");
    });

    var chooseBot = root.querySelector("#chooseBot");
    if (chooseBot) chooseBot.addEventListener("click", function () { startSession("bot"); });

    var chooseEmail = root.querySelector("#chooseEmail");
    if (chooseEmail) chooseEmail.addEventListener("click", function () { state.preEmailMode = true; state.error = ""; render(); });

    var cancelPrechat = root.querySelector("#cancelPrechat");
    if (cancelPrechat) cancelPrechat.addEventListener("click", function () { state.preEmailMode = false; state.error = ""; render(); });

    var prechatForm = root.querySelector("#prechatEmail");
    if (prechatForm) prechatForm.addEventListener("submit", submitPrechatEmail);

    var fullChat = root.querySelector("#fullchat");
    if (fullChat) fullChat.addEventListener("click", openFullChat);
  }

  function mergeLines(incoming) {
    if (!incoming || !incoming.length) return 0;
    var seen = {};
    state.lines.forEach(function (l) { seen[l.id] = true; });
    var added = incoming.filter(function (l) { return !seen[l.id]; });
    if (!added.length) return 0;
    state.lines = state.lines.concat(added).sort(function (a, b) { return a.id - b.id; });
    state.lastId = state.lines[state.lines.length - 1].id;
    return added.length;
  }

  /** Returns the current page path (no query string or fragment). */
  function pagePath() {
    try { return location.pathname || "/"; } catch (e) { return "/"; }
  }

  /** Returns the current page title, truncated to 200 chars. */
  function pageTitle() {
    try { return (document.title || "").slice(0, 200); } catch (e) { return ""; }
  }

  function startSession(mode, extra) {
    var payload = {
      visitorId: visitorId(),
      source: "website",
      pagePath: pagePath(),
      pageTitle: pageTitle(),
      mode: mode || "team",
    };
    if (extra) {
      for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k]; }
    }
    return api("/api/live-chat/session", payload)
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          state.error = (res.data && (res.data.error === "email_required" || res.data.error === "concern_required"))
            ? "Please share a valid email and a short note about your concern."
            : "We could not open the chat just now. Please try again.";
          render();
          return;
        }
        var data = res.data;
        if (data.needsChoice) {
          state.needsChoice = true;
          state.convo = null;
          state.error = "";
          render();
          return;
        }
        state.needsChoice = false;
        state.preEmailMode = false;
        state.convo = data.conversation;
        store(CONVO_KEY, String(data.conversation.id));
        state.lines = []; state.lastId = 0;
        mergeLines(data.messages);
        state.agentOnline = !!data.agentOnline;
        state.unread = 0;
        state.error = "";
        render();
      })
      .catch(function () {
        state.error = "We could not open the chat just now. Please try again.";
        render();
      });
  }

  function submitPrechatEmail(e) {
    e.preventDefault();
    var f = e.target.elements;
    var val = function (n) { return (f.namedItem(n) && f.namedItem(n).value || "").trim(); };
    var payload = { name: val("name"), email: val("email"), phone: val("phone"), concern: val("concern") };
    if (!payload.email || !payload.concern) return;
    startSession("email", payload);
  }

  function poll(markRead) {
    if (!state.convo) return Promise.resolve();
    return api("/api/live-chat/poll", {
      visitorId: visitorId(),
      conversationId: state.convo.id,
      sinceId: state.lastId,
      markRead: !!markRead,
      pagePath: pagePath(),
      pageTitle: pageTitle(),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        var fresh = (data.messages || []).filter(function (m) { return m.author !== "user"; }).length;
        var added = mergeLines(data.messages);
        state.agentOnline = !!data.agentOnline;
        if (data.conversation) state.convo = data.conversation;
        if (!state.open && fresh) state.unread += fresh;
        if (added || !state.open) render();
      })
      .catch(function () { /* transient blips are ignored */ });
  }

  function schedule() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () { poll(state.open); }, state.open ? OPEN_POLL_MS : IDLE_POLL_MS);
  }

  function openPanel() {
    state.open = true;
    state.unread = 0;
    render();
    (state.convo ? poll(true) : startSession("team")).then(schedule);
  }

  function closePanel() {
    state.open = false;
    state.showForm = false;
    if (!state.convo) { state.needsChoice = false; state.preEmailMode = false; }
    render();
    schedule();
  }

  function send(text) {
    var body = (text || "").trim();
    if (!body || state.sending || !state.convo) return;
    state.sending = true;
    state.error = "";
    render();
    api("/api/live-chat/message", { visitorId: visitorId(), conversationId: state.convo.id, content: body })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        mergeLines(data.messages);
        state.agentOnline = !!data.agentOnline;
        if (data.conversation) state.convo = data.conversation;
      })
      .catch(function () { state.error = "Message not sent. Please check your connection."; })
      .then(function () { state.sending = false; render(); });
  }

  function requestAgent() {
    if (!state.convo) return;
    if (!state.agentOnline) { state.showForm = true; state.error = ""; render(); return; }
    api("/api/live-chat/request-agent", { visitorId: visitorId(), conversationId: state.convo.id })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) { if (data.conversation) state.convo = data.conversation; return poll(true); })
      .catch(function () { state.showForm = true; render(); });
  }

  function submitHandoff(e) {
    e.preventDefault();
    // `form.name` is the form's own name property, so read fields through
    // `elements` instead.
    var f = e.target.elements;
    var val = function (n) { return (f.namedItem(n) && f.namedItem(n).value || "").trim(); };
    var payload = {
      visitorId: visitorId(),
      conversationId: state.convo.id,
      name: val("name"),
      email: val("email"),
      phone: val("phone"),
      concern: val("concern"),
    };
    if (!payload.email || !payload.concern) return;
    state.error = "";
    api("/api/live-chat/request-agent", payload)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        if (data.conversation) state.convo = data.conversation;
        state.showForm = false;
        return poll(true);
      })
      .catch(function () { state.error = "We could not record your concern. Please try again."; render(); });
  }

  /**
   * Opens the hosted chat page — the full conversation list, tickets and image
   * attachments — carrying this visitor's identity across in a one-shot ticket
   * so their existing thread follows them instead of starting over.
   */
  function openFullChat() {
    // Open synchronously: a tab opened later, inside the fetch callback, is
    // treated as a popup and blocked.
    var tab = window.open("", "_blank");
    api("/api/live-chat/handoff", { visitorId: visitorId() })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        var url = API + "/chat" + (data.token ? "#handoff=" + encodeURIComponent(data.token) : "");
        if (tab) tab.location.href = url;
        else window.open(url, "_blank");
      })
      .catch(function () {
        if (tab) tab.location.href = API + "/chat";
        state.error = "";
      });
  }

  function boot() {
    fetch(API + "/api/live-chat/embed-config")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (cfg) {
        if (!cfg.enabled) return;
        state.config = {
          accent: attr("accent", cfg.accent),
          position: attr("position", cfg.position),
        };
        state.agentOnline = !!cfg.agentOnline;
        document.body.appendChild(host);
        render();
        // A returning visitor picks their earlier thread back up on this device.
        if (store(CONVO_KEY)) {
          state.convo = { id: parseInt(store(CONVO_KEY), 10), status: "bot", assignedAgentName: null };
          poll(false).then(function () {
            if (!state.lines.length) { state.convo = null; store(CONVO_KEY, ""); }
            render();
            schedule();
          });
        } else {
          schedule();
        }
      })
      .catch(function () { /* the website must never break because chat is down */ });
  }

  // For single-page apps: fire a poll immediately whenever the visitor
  // navigates so the team sees the latest page without waiting for the timer.
  function onNavigate() {
    if (state.convo) poll(state.open);
  }
  window.addEventListener("popstate", onNavigate);
  // Patch pushState / replaceState so hash-free SPA routers are also covered.
  (function () {
    function wrap(orig) {
      return function () {
        var ret = orig.apply(this, arguments);
        onNavigate();
        return ret;
      };
    }
    try {
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
    } catch (e) { /* CSP may block this on some hosts; silently skip */ }
  })();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
