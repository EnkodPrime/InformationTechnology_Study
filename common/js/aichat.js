/* AI помощ — панел отдолу за въпроси по текущата глава.
   Два пътя за един и същ въпрос с контекст:
   1) „ChatGPT ↗“ / „Claude ↗“ — нов таб chatgpt.com или claude.ai с попълнен въпрос (без ключ; ползва абонамента).
      Бързият път е директно от маркиран текст или от подсказката на понятие — без да се отваря панелът.
   2) Отговор в панела — OpenAI Chat Completions API с личен ключ. Ключът се пази само в този браузър
      (localStorage) и се праща само към api.openai.com. Не се записва в репото.
   Контекстът е: тема, глава, термин от речника (по избор) и маркиран текст (по избор). */
(function () {
  const S = window.Study, h = S.h;
  const API = "https://api.openai.com/v1/chat/completions";
  const SITES = { chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/?q=" }, claude: { name: "Claude", url: "https://claude.ai/new?q=" } };
  const DEF_MODEL = "gpt-5-mini";
  const MAX_SEL = 4000;        // знака маркиран текст в контекста
  const MAX_URL_PROMPT = 3000; // знака въпрос в адреса към chatgpt.com

  const st = { open: false, ctxTerm: null, ctxSel: "", msgs: [], busy: false, ctrl: null, settings: false };
  const getKey = () => S.store.get("ai:key", "");
  const getModel = () => S.store.get("ai:model", DEF_MODEL) || DEF_MODEL;

  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent.replace(/\s+/g, " ").trim(); };

  /* ---------- контекст ---------- */
  function contextText(ctx) {
    ctx = ctx || { term: st.ctxTerm, sel: st.ctxSel };
    const cur = S.current || {}, c = cur.chapter || {}, t = cur.topic || {};
    const lines = [];
    if (t.title) lines.push("Тема: " + t.title);
    if (c.title) lines.push("Глава: " + (c.num ? c.num + ". " : "") + c.title + (c.lead ? " — " + strip(c.lead) : ""));
    if (ctx.term) {
      const g = ctx.term;
      lines.push("Понятие: " + g.t + (g.en ? " (" + g.en + ")" : "") + " — " + strip(g.d) + (g.more ? " " + strip(g.more) : ""));
    }
    if (ctx.sel) lines.push("Маркиран текст от страницата:\n\"\"\"\n" + ctx.sel + "\n\"\"\"");
    return lines.join("\n");
  }
  function systemPrompt() {
    return "Ти помагаш при подготовка за кандидат-докторантски изпит по докторска програма „Информатика“ " +
      "(Шуменски университет „Епископ Константин Преславски“). Отговаряй на български, точно и кратко. " +
      "Когато твърдението е валидно само при условие, кажи условието. Ако не си сигурен, кажи го изрично. " +
      "Примерите с код да са на C или C++.\n\nКонтекст от учебния материал:\n" + contextText();
  }

  /* ---------- минимален markdown (след екраниране) ---------- */
  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function md(src) {
    const parts = String(src).split(/```/);
    return parts.map((p, i) => {
      if (i % 2) { const nl = p.indexOf("\n"); const code = nl >= 0 && /^[\w+#-]*$/.test(p.slice(0, nl).trim()) ? p.slice(nl + 1) : p; return "<pre class=\"ai-code\"><code>" + esc(code.replace(/\n$/, "")) + "</code></pre>"; }
      let t = esc(p);
      t = t.replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
        .replace(/^#{1,4}\s+(.+)$/gm, "<b>$1</b>").replace(/^\s*[-*]\s+(.+)$/gm, "• $1");
      return t.split(/\n{2,}/).map((x) => x.trim() ? "<p>" + x.replace(/\n/g, "<br>") + "</p>" : "").join("");
    }).join("");
  }

  /* ---------- DOM ---------- */
  let dock, list, input, chip, sendBtn, setBox, keyInp, modelInp, keyState, topBtn, selBtn;

  function build() {
    chip = h("div", { class: "ai-ctx" });
    list = h("div", { class: "ai-list", "aria-live": "polite" });
    input = h("textarea", { class: "ai-in", rows: "2", placeholder: "Въпрос по главата… (Enter изпраща, Shift+Enter — нов ред)", "aria-label": "Въпрос" });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    sendBtn = h("button", { class: "btn primary", type: "button", onclick: () => (st.busy ? stop() : send()), text: "Изпрати" });

    keyInp = h("input", { type: "password", placeholder: "sk-…", autocomplete: "off", spellcheck: "false", "aria-label": "OpenAI API ключ" });
    modelInp = h("input", { type: "text", value: getModel(), spellcheck: "false", "aria-label": "Модел" });
    keyState = h("span", { class: "muted" });
    setBox = h("div", { class: "ai-set", hidden: true },
      h("label", null, h("span", { text: "OpenAI API ключ" }), keyInp),
      h("label", null, h("span", { text: "Модел" }), modelInp),
      h("div", { class: "ai-set-row" },
        h("button", { class: "btn primary", type: "button", text: "Запази", onclick: saveSettings }),
        h("button", { class: "btn", type: "button", text: "Изтрий ключа", onclick: () => { S.store.set("ai:key", ""); keyInp.value = ""; refreshKey(); } }),
        keyState),
      h("p", { class: "muted", html: "Ключът остава само в този браузър и се праща само към <code>api.openai.com</code>. " +
        "API се таксува отделно от абонамента за ChatGPT. Ключ: <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener noreferrer\">platform.openai.com/api-keys</a>." }));

    dock = h("aside", { class: "ai-dock", "aria-label": "AI помощ", hidden: true },
      h("div", { class: "ai-grip", title: "Влачи за височина", onpointerdown: grip }),
      h("div", { class: "ai-head" },
        h("b", { text: "AI помощ" }), chip, h("span", { class: "sp" }),
        h("button", { class: "btn", type: "button", text: "ChatGPT ↗", title: "Нов таб chatgpt.com с въпроса и контекста", onclick: () => openSite("chatgpt") }),
        h("button", { class: "btn", type: "button", text: "Claude ↗", title: "Нов таб claude.ai с въпроса и контекста", onclick: () => openSite("claude") }),
        h("button", { class: "btn ghost", type: "button", text: "Нов разговор", onclick: reset }),
        h("button", { class: "btn ghost", type: "button", text: "Настройки", onclick: () => { st.settings = !st.settings; setBox.hidden = !st.settings; } }),
        h("button", { class: "btn ghost icon", type: "button", text: "✕", "aria-label": "Затвори", onclick: () => toggle(false) })),
      setBox, list,
      h("div", { class: "ai-foot" }, input, sendBtn));
    document.body.append(dock);

    topBtn = h("button", { class: "btn", id: "btn-ai", type: "button", text: "AI помощ", "aria-pressed": "false", onclick: () => toggle() });
    const gl = document.getElementById("btn-gloss");
    if (gl) gl.before(topBtn);

    selBtn = askButtons(() => ({ sel: pendingSel }), () => { st.ctxSel = pendingSel; selBtn.hidden = true; toggle(true); renderChip(); input.focus(); }, "ai-selbtn");
    selBtn.hidden = true;
    document.body.append(selBtn);

    const hh = S.store.get("ai:h", 0); if (hh) dock.style.height = hh + "px";
    refreshKey(); renderChip(); renderList();
  }

  function refreshKey() { keyState.textContent = getKey() ? "ключът е записан" : "няма записан ключ"; }
  function saveSettings() {
    const k = keyInp.value.trim(); if (k) S.store.set("ai:key", k);
    S.store.set("ai:model", modelInp.value.trim() || DEF_MODEL); modelInp.value = getModel();
    keyInp.value = ""; refreshKey(); st.settings = false; setBox.hidden = true;
  }

  function renderChip() {
    if (!chip) return;
    chip.innerHTML = "";
    const c = S.current && S.current.chapter;
    if (c) chip.append(h("span", { class: "ai-tag", text: (c.num ? c.num + " · " : "") + c.title }));
    if (st.ctxTerm) chip.append(h("span", { class: "ai-tag" }, "понятие: " + st.ctxTerm.t, h("button", { type: "button", "aria-label": "Махни понятието", text: "×", onclick: () => { st.ctxTerm = null; renderChip(); } })));
    if (st.ctxSel) chip.append(h("span", { class: "ai-tag", title: st.ctxSel.slice(0, 300) }, "маркиран текст: " + st.ctxSel.length + " зн.", h("button", { type: "button", "aria-label": "Махни маркирания текст", text: "×", onclick: () => { st.ctxSel = ""; renderChip(); } })));
  }

  function bubble(m) {
    const el = h("div", { class: "ai-msg " + (m.role === "user" ? "me" : m.role === "error" ? "err" : "bot") });
    if (m.role === "user") el.textContent = m.content; else el.innerHTML = m.html || md(m.content || "…");
    return el;
  }
  function renderList() {
    list.innerHTML = "";
    if (!st.msgs.length) {
      list.append(h("div", { class: "ai-empty muted", html: "Питай за текущата глава. Маркирай текст на страницата или посочи понятие → „Панел“, за да го добавиш в контекста. Бутоните ChatGPT ↗ / Claude ↗ там отварят въпроса направо в нов таб." +
        (getKey() ? "" : "<br>Без API ключ отговорът се отваря в ChatGPT. Ключ се добавя от „Настройки“.") }));
      return;
    }
    st.msgs.forEach((m) => list.append(bubble(m)));
    list.scrollTop = list.scrollHeight;
  }

  /* ---------- действия ---------- */
  function toggle(force) {
    st.open = force == null ? !st.open : force;
    dock.hidden = !st.open;
    topBtn.setAttribute("aria-pressed", String(st.open));
    syncPad();
    if (st.open) { renderChip(); input.focus(); }
  }
  function syncPad() {
    const px = st.open ? dock.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--dock-h", px + "px");
  }
  function grip(e) {
    e.preventDefault();
    const y0 = e.clientY, h0 = dock.getBoundingClientRect().height;
    const mv = (ev) => { const v = Math.max(180, Math.min(window.innerHeight - 80, h0 + (y0 - ev.clientY))); dock.style.height = v + "px"; syncPad(); };
    const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); S.store.set("ai:h", Math.round(dock.getBoundingClientRect().height)); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
  }
  function reset() { stop(); st.msgs = []; renderList(); }

  function siteUrl(site, q, ctx) {
    let p = contextText(ctx) + "\n\nВъпрос: " + (q || "Обясни накратко.") + "\n\nОтговори на български.";
    if (p.length > MAX_URL_PROMPT) p = p.slice(0, MAX_URL_PROMPT) + "…";
    return SITES[site].url + encodeURIComponent(p);
  }
  const chatgptUrl = (q) => siteUrl("chatgpt", q);
  function openSite(site) {
    const q = input.value.trim() || (st.msgs.filter((m) => m.role === "user").pop() || {}).content || "";
    window.open(siteUrl(site, q), "_blank", "noopener");
  }
  // Бърз път: директно в нов таб, без панела; контекстът е само за този въпрос.
  function quick(site, ctx) {
    const q = ctx.term && !ctx.sel ? "Обясни „" + ctx.term.t + "“ с пример." : "Обясни маркирания текст.";
    window.open(siteUrl(site, q, ctx), "_blank", "noopener");
  }
  function askButtons(ctx, onPanel, cls) {
    const b = (text, title, fn, prim) => h("button", { class: "btn" + (prim ? " primary" : ""), type: "button", text, title,
      onmousedown: (e) => e.preventDefault(), onclick: (e) => { e.stopPropagation(); fn(); } });
    return h("span", { class: "ai-ask " + (cls || "") },
      h("span", { class: "ai-ask-l", text: "Попитай:" }),
      b("ChatGPT ↗", "Нов таб chatgpt.com с въпроса", () => quick("chatgpt", ctx()), true),
      b("Claude ↗", "Нов таб claude.ai с въпроса", () => quick("claude", ctx()), true),
      b("Панел", "В панела „AI помощ“ отдолу", onPanel));
  }

  function stop() { if (st.ctrl) st.ctrl.abort(); }
  async function send() {
    const q = input.value.trim();
    if (!q || st.busy) return;
    const key = getKey();
    st.msgs.push({ role: "user", content: q });
    input.value = "";
    if (!key) {
      st.msgs.push({ role: "error", html: "Няма API ключ. <a href=\"" + esc(chatgptUrl(q)) + "\" target=\"_blank\" rel=\"noopener\">Отвори въпроса в ChatGPT ↗</a> или добави ключ от „Настройки“." });
      renderList(); return;
    }
    const bot = { role: "assistant", content: "" };
    st.msgs.push(bot); renderList();
    const el = list.lastElementChild;
    const history = st.msgs.filter((m) => m !== bot && (m.role === "user" || m.role === "assistant") && m.content).slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    st.busy = true; sendBtn.textContent = "Спри"; st.ctrl = new AbortController();
    try {
      const r = await fetch(API, {
        method: "POST", signal: st.ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: getModel(), stream: true, messages: [{ role: "system", content: systemPrompt() }, ...history] }),
      });
      if (!r.ok) {
        let msg = r.status + " " + r.statusText;
        try { const j = await r.json(); if (j.error && j.error.message) msg += " — " + j.error.message; } catch (e) { /* няма тяло */ }
        throw new Error(msg);
      }
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try { const d = JSON.parse(data).choices?.[0]?.delta?.content; if (d) { bot.content += d; el.innerHTML = md(bot.content); list.scrollTop = list.scrollHeight; } } catch (e) { /* непълен ред */ }
        }
      }
      if (!bot.content) bot.content = "(празен отговор)";
    } catch (e) {
      if (e.name === "AbortError") bot.content += "\n\n_(спряно)_";
      else { st.msgs.splice(st.msgs.indexOf(bot), 1); st.msgs.push({ role: "error", html: "Грешка: " + esc(e.message) + (e.message === "Failed to fetch" ? " (мрежа или CORS)" : "") + ". <a href=\"" + esc(chatgptUrl(q)) + "\" target=\"_blank\" rel=\"noopener\">Отвори в ChatGPT ↗</a>" }); }
    } finally {
      st.busy = false; st.ctrl = null; sendBtn.textContent = "Изпрати"; renderList();
    }
  }

  /* ---------- маркиран текст ---------- */
  let pendingSel = "";
  function onSelect() {
    const s = window.getSelection();
    const txt = s && !s.isCollapsed ? s.toString().trim() : "";
    const inContent = txt && s.anchorNode && document.getElementById("content")?.contains(s.anchorNode);
    if (!inContent || txt.length < 3) { selBtn.hidden = true; return; }
    pendingSel = txt.slice(0, MAX_SEL);
    const r = s.getRangeAt(0).getBoundingClientRect();
    selBtn.hidden = false;
    const bw = selBtn.offsetWidth || 300;
    selBtn.style.left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + "px";
    selBtn.style.top = (r.top > 48 ? r.top - 42 : r.bottom + 8) + "px";
  }

  /* ---------- закачане ---------- */
  S.onTip = function (tipEl, g) {
    tipEl.append(askButtons(() => ({ term: g }), () => { st.ctxTerm = g; S.hideTip(); toggle(true); renderChip(); if (!input.value) input.value = "Обясни „" + g.t + "“ с пример."; input.focus(); }, "ai-tipbtn"));
  };

  function init() {
    build();
    document.addEventListener("study:chapter", () => { st.ctxTerm = null; st.ctxSel = ""; renderChip(); });
    document.addEventListener("mouseup", () => setTimeout(onSelect, 0));
    document.addEventListener("keyup", (e) => { if (e.shiftKey || e.key === "Shift") onSelect(); });
    window.addEventListener("scroll", () => { selBtn.hidden = true; }, { passive: true });
    window.addEventListener("resize", syncPad);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
