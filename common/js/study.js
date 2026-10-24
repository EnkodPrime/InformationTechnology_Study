/* InformationTechnology_Study — обща рамка за интерактивните теми.
 *
 * Study.chapter(def)        регистрира глава {id, num, title, group, lead, html, mount(root)}
 * Study.viz(el, cfg)        стъпков визуализатор, синхронизиран с C код (виж README)
 * Study.quiz(el, items)     кратък тест с обяснения
 * Study.drawArray / drawBars помощници за масиви
 * Study.boot({...})         стартира страницата
 *
 * Работи от file:// без сървър — само класически <script> файлове.
 */
(function () {
  "use strict";
  const S = (window.Study = {});

  /* ---------------- помощници ---------------- */
  S.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  S.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const h = S.h;
  const SVGNS = "http://www.w3.org/2000/svg";
  S.svg = function (tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "class") el.setAttribute("class", attrs[k]);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (const c of kids.flat()) if (c) el.append(c);
    return el;
  };
  /** "7 3, 9" -> [7,3,9]; хвърля грешка при невалидно число */
  S.parseNums = function (str, { min = -1e9, max = 1e9, maxLen = 64, minLen = 0, int = true } = {}) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    const out = parts.map((p) => {
      const v = Number(p);
      if (!Number.isFinite(v) || (int && !Number.isInteger(v))) throw new Error(`„${p}“ не е ${int ? "цяло " : ""}число.`);
      if (v < min || v > max) throw new Error(`Стойностите трябва да са между ${min} и ${max}.`);
      return v;
    });
    if (out.length > maxLen) throw new Error(`Най-много ${maxLen} елемента.`);
    if (out.length < minLen) throw new Error(`Нужни са поне ${minLen} елемента.`);
    return out;
  };
  S.int = function (v, lo, hi, name) {
    const n = Number(v);
    if (!Number.isInteger(n)) throw new Error(`${name || "Стойността"} трябва да е цяло число.`);
    if (n < lo || n > hi) throw new Error(`${name || "Стойността"} трябва да е между ${lo} и ${hi}.`);
    return n;
  };
  S.randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  S.randArray = (n, lo = 1, hi = 99) => Array.from({ length: n }, () => S.randInt(lo, hi));
  S.store = {
    get(k, d) { try { const v = localStorage.getItem("its:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("its:" + k, JSON.stringify(v)); } catch (e) { /* няма памет — без запис */ } },
  };

  /* ---------------- оцветяване на C ---------------- */
  const KW = new Set("if else for while do return break continue switch case default goto sizeof struct union enum typedef static const extern volatile register inline new delete class public private protected template typename namespace using true false nullptr NULL".split(" "));
  const TY = new Set("int long short char unsigned signed float double void bool size_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t FILE auto std vector string".split(" "));
  S.highlightC = function (code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^[ \t]*#[^\n]*)|(\b\d+(?:\.\d+)?[uUlLfF]*\b)|([A-Za-z_]\w*)(\s*\()?|([\s\S])/gm;
    let out = "", m;
    while ((m = re.exec(code))) {
      if (m[1]) out += `<span class="tk-com">${S.esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tk-str">${S.esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tk-pp">${S.esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="tk-num">${m[4]}</span>`;
      else if (m[5]) {
        const w = m[5];
        if (KW.has(w)) out += `<span class="tk-kw">${w}</span>`;
        else if (TY.has(w)) out += `<span class="tk-type">${w}</span>`;
        else if (m[6]) out += `<span class="tk-fn">${w}</span>`;
        else out += w;
        if (m[6]) out += S.esc(m[6]);
      } else out += S.esc(m[7]);
    }
    // разделяне на редове, като коментарите /* */ на няколко реда се затварят коректно
    const lines = out.split("\n");
    let open = null;
    return lines.map((ln) => {
      let pre = open ? open : "";
      const opens = [...ln.matchAll(/<span class="([^"]+)">/g)].length;
      const closes = (ln.match(/<\/span>/g) || []).length;
      let post = "";
      if (opens > closes) { const last = [...ln.matchAll(/<span class="([^"]+)">/g)].pop(); open = `<span class="${last[1]}">`; post = "</span>"; }
      else if (closes > opens) { open = null; }
      return pre + ln + post;
    });
  };

  /* ---------------- речник / подсказки ---------------- */
  let tipEl = null, tipFor = null;
  function glossLookup(key) {
    const G = window.GLOSSARY || {};
    if (G[key]) return G[key];
    const k = key.toLowerCase().trim();
    for (const g in G) if (g.toLowerCase() === k) return G[g];
    return null;
  }
  S.glossLookup = glossLookup;
  function showTip(target) {
    const g = glossLookup(target.dataset.g);
    if (!g) { console.warn("Липсва в речника:", target.dataset.g); return; }
    hideTip();
    tipEl = h("div", { class: "gtip", role: "tooltip" },
      h("b", { text: g.t }),
      g.en ? h("span", { class: "en", text: g.en }) : null,
      h("span", { html: g.d }),
      g.more ? h("span", { class: "more", html: g.more }) : null);
    document.body.append(tipEl);
    tipFor = target;
    const r = target.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
    let x = Math.min(Math.max(8, r.left), window.innerWidth - tr.width - 8);
    let y = r.bottom + 6;
    if (y + tr.height > window.innerHeight - 8) y = r.top - tr.height - 6;
    tipEl.style.left = x + "px"; tipEl.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { if (tipEl) tipEl.remove(); tipEl = null; tipFor = null; }
  function bindGlossary() {
    document.addEventListener("mouseover", (e) => { const d = e.target.closest("dfn[data-g]"); if (d && d !== tipFor) showTip(d); });
    document.addEventListener("mouseout", (e) => { const d = e.target.closest("dfn[data-g]"); if (d && !d.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener("focusin", (e) => { const d = e.target.closest("dfn[data-g]"); if (d) showTip(d); });
    document.addEventListener("focusout", (e) => { if (e.target.closest("dfn[data-g]")) hideTip(); });
    document.addEventListener("click", (e) => {
      const d = e.target.closest("dfn[data-g]");
      if (d) { e.preventDefault(); if (tipFor === d) hideTip(); else showTip(d); } else if (!e.target.closest(".gtip")) hideTip();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideTip(); closeDrawer(); } });
    window.addEventListener("scroll", hideTip, { passive: true });
  }
  // направи всички dfn фокусируеми (клавиатура / таб)
  function prepDfn(root) { root.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0")); }

  let drawer = null;
  function closeDrawer() { if (drawer) drawer.remove(); drawer = null; }
  S.openGlossary = function (q = "") {
    closeDrawer();
    const G = window.GLOSSARY || {};
    const list = h("div", { class: "dl" });
    const inp = h("input", { type: "search", id: "gloss-q", placeholder: "Търси понятие…", value: q, "aria-label": "Търси понятие" });
    function render() {
      const s = inp.value.toLowerCase().trim();
      list.innerHTML = "";
      Object.values(G).filter((g) => !s || (g.t + " " + (g.en || "") + " " + g.d).toLowerCase().includes(s))
        .sort((a, b) => a.t.localeCompare(b.t, "bg"))
        .forEach((g) => list.append(h("div", { class: "gi" },
          g.cat ? h("span", { class: "cat", text: g.cat }) : null,
          h("b", { text: g.t }), g.en ? h("span", { class: "en", text: g.en }) : null,
          h("span", { html: g.d }), g.more ? h("span", { class: "muted", html: g.more }) : null)));
      if (!list.children.length) list.append(h("p", { class: "muted", text: "Няма съвпадения." }));
    }
    inp.addEventListener("input", render);
    drawer = h("aside", { class: "drawer", "aria-label": "Речник" },
      h("div", { class: "dh" }, h("h3", { text: "Речник на понятията" }), h("button", { class: "btn", onclick: closeDrawer, text: "Затвори" })),
      inp, list);
    document.body.append(drawer);
    render();
    inp.focus();
  };

  /* ---------------- визуализатор ---------------- */
  const SPEEDS = [["бавно", 1300], ["нормално", 650], ["бързо", 260], ["много бързо", 80], ["турбо", 15]];

  S.viz = function (host, cfg) {
    const id = cfg.id || "v" + Math.random().toString(36).slice(2, 8);
    const root = h("div", { class: "viz", id: "viz-" + id, tabindex: "-1" });
    const head = h("div", { class: "viz-head" }, h("h4", { text: cfg.title || "" }), cfg.sub ? h("span", { class: "sub", html: cfg.sub }) : null);
    root.append(head);

    // входове
    const inputs = {};
    let inBox = null;
    if (cfg.inputs && cfg.inputs.length) {
      inBox = h("div", { class: "viz-inputs" });
      for (const f of cfg.inputs) {
        let el;
        const fid = `${id}-${f.id}`;
        if (f.type === "select") {
          el = h("select", { id: fid }, ...f.options.map((o) => {
            const [v, t] = Array.isArray(o) ? o : [o, o];
            return h("option", { value: v, text: t, selected: String(v) === String(f.value) ? true : null });
          }));
        } else if (f.type === "checkbox") {
          el = h("input", { type: "checkbox", id: fid, checked: f.value ? true : null });
        } else {
          el = h("input", { id: fid, type: f.type === "number" ? "number" : "text", value: f.value, min: f.min, max: f.max, step: f.step, spellcheck: "false", autocomplete: "off" });
          if (f.width) el.style.width = f.width;
        }
        inputs[f.id] = el;
        const lab = h("label", { class: "field", for: fid }, h("span", { html: f.label }), el);
        if (f.type === "checkbox") { lab.style.display = "flex"; lab.style.gap = "6px"; lab.style.alignItems = "center"; lab.prepend(el); }
        inBox.append(lab);
        el.addEventListener("keydown", (e) => { if (e.key === "Enter") apply(); });
        if (f.type === "select" || f.type === "checkbox" || f.live) el.addEventListener("change", () => apply());
      }
      inBox.append(h("button", { class: "btn primary", onclick: () => apply(), text: "Изпълни" }));
      if (cfg.random) inBox.append(h("button", { class: "btn", onclick: () => { setValues(cfg.random()); apply(); }, text: "Случайни" }));
      if (cfg.presets) for (const p of cfg.presets) inBox.append(h("button", { class: "btn ghost", onclick: () => { setValues(p.values); apply(); }, text: p.label, title: p.title || "" }));
      root.append(inBox);
    }
    function setValues(vals) {
      for (const k in vals) if (inputs[k]) { if (inputs[k].type === "checkbox") inputs[k].checked = !!vals[k]; else inputs[k].value = vals[k]; }
    }
    function readValues() {
      const o = {};
      for (const k in inputs) o[k] = inputs[k].type === "checkbox" ? inputs[k].checked : inputs[k].value;
      return o;
    }

    const stage = h("div", { class: "viz-stage" });
    if (cfg.stageHeight) stage.style.minHeight = cfg.stageHeight + "px";
    root.append(stage);

    const msg = h("div", { class: "viz-msg", "aria-live": "polite" });
    // контроли
    const bFirst = h("button", { class: "btn icon", title: "Начало (Home)", "aria-label": "Начало", text: "⏮" });
    const bPrev = h("button", { class: "btn icon", title: "Стъпка назад (←)", "aria-label": "Стъпка назад", text: "◀" });
    const bPlay = h("button", { class: "btn primary", title: "Пусни / пауза (интервал)", text: "▶ Пусни" });
    const bNext = h("button", { class: "btn icon", title: "Стъпка напред (→)", "aria-label": "Стъпка напред", text: "▶" });
    const bLast = h("button", { class: "btn icon", title: "Край (End)", "aria-label": "Край", text: "⏭" });
    const scrub = h("input", { type: "range", class: "scrub", min: 0, max: 0, value: 0, "aria-label": "Позиция", id: id + "-scrub" });
    const pos = h("span", { class: "pos" });
    const speed = h("select", { id: id + "-speed", "aria-label": "Скорост" }, ...SPEEDS.map(([t, ms], i) => h("option", { value: ms, text: t, selected: i === (cfg.speed ?? 1) ? true : null })));
    const ctrl = h("div", { class: "viz-ctrl" }, bFirst, bPrev, bPlay, bNext, bLast, scrub, pos, h("label", null, "скорост", speed));
    root.append(ctrl, msg);

    // код + странично
    const body = h("div", { class: "viz-body" });
    const codeBox = h("div", { class: "viz-code" });
    const side = h("div", { class: "viz-side" });
    body.append(codeBox, side);
    if (cfg.code !== false) root.append(body);
    const varsSec = h("div", { class: "sec" }, h("span", { class: "eyebrow", text: "Променливи" }), h("dl", { class: "vars" }));
    const statSec = h("div", { class: "sec" }, h("span", { class: "eyebrow", text: "Броячи" }), h("div", { class: "stats" }));
    const logSec = h("div", { class: "sec" }, h("span", { class: "eyebrow", text: "Ход на изпълнението" }), h("div", { class: "log" }));
    const legSec = cfg.legend ? h("div", { class: "sec" }, h("span", { class: "eyebrow", text: "Легенда" }),
      h("div", { class: "legend" }, ...cfg.legend.map(([cls, t]) => h("span", { class: cls }, h("i"), t)))) : null;
    side.append(varsSec, statSec, logSec);
    if (legSec) side.append(legSec);
    if (cfg.sideExtra) side.append(cfg.sideExtra);

    host.append(root);

    let frames = [], i = 0, timer = null, codeKey = null, codeLines = [], tags = {}, inp = {}, extra = null, logIdx = [];

    function loadCode(key) {
      if (cfg.code === false || key === codeKey) return;
      codeKey = key;
      const src = (window.CSRC || {})[key];
      codeBox.innerHTML = "";
      if (!src) { codeBox.append(h("p", { class: "warn", style: { padding: "10px" }, text: "Липсва C код: " + key })); console.warn("Липсва C регион", key); return; }
      tags = src.tags;
      const copy = h("button", { class: "btn ghost", text: "Копирай", onclick: () => {
        const done = () => { copy.textContent = "Копирано"; setTimeout(() => (copy.textContent = "Копирай"), 1200); };
        if (navigator.clipboard) navigator.clipboard.writeText(src.code).then(done, () => selectCode());
        else selectCode();
      } });
      const pre = h("pre", { class: "c" });
      function selectCode() { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      codeLines = S.highlightC(src.code).map((l) => h("span", { class: "l", html: l || " " }));
      pre.append(...codeLines);
      codeBox.append(h("div", { class: "ch" }, h("span", { class: "mono", text: "C · " + src.file }), h("span", { class: "sp" }),
        h("a", { href: (cfg.cPath || S.cBase || "c/") + src.file, target: "_blank", rel: "noopener", text: "целият файл" }), copy), pre);
    }

    function apply() {
      stop();
      inp = readValues();
      let res;
      try {
        res = cfg.build(inp);
      } catch (e) {
        frames = [];
        stage.innerHTML = "";
        msg.innerHTML = "";
        msg.append(h("span", { class: "warn", text: "Грешка във входа: " + e.message }));
        updateCtrl();
        return;
      }
      if (Array.isArray(res)) res = { frames: res };
      frames = res.frames || [];
      extra = res;
      if (frames.length > 20000) frames = frames.slice(0, 20000);
      logIdx = [];
      frames.forEach((f, k) => { if (f.log) logIdx.push(k); });
      loadCode(typeof cfg.code === "function" ? cfg.code(inp) : cfg.code);
      scrub.max = Math.max(0, frames.length - 1);
      go(cfg.startAtEnd ? frames.length - 1 : 0);
    }

    let prevVars = {};
    function go(k) {
      if (!frames.length) return;
      i = Math.max(0, Math.min(frames.length - 1, k));
      const f = frames[i];
      // сцена
      try { cfg.draw(stage, f, { inputs: inp, frames, i, res: extra }); }
      catch (e) { console.error(e); stage.textContent = "Грешка при рисуване: " + e.message; }
      // съобщение
      msg.innerHTML = "";
      msg.append(h("div", { html: f.msg || "" }));
      if (f.inv) msg.append(h("span", { class: "inv " + (f.inv.ok === false ? "bad" : "ok"), html: (f.inv.ok === false ? "✗ " : "✓ ") + f.inv.text }));
      // код
      codeLines.forEach((l) => l.classList.remove("hl", "hl2"));
      const at = f.at == null ? [] : [].concat(f.at);
      let first = null;
      at.forEach((t, ti) => {
        const ls = tags[t];
        if (!ls) { if (codeKey) console.warn(`Етикет @${t} липсва в ${codeKey}`); return; }
        ls.forEach((n) => { const el = codeLines[n - 1]; if (el) { el.classList.add(ti === 0 ? "hl" : "hl2"); first = first || el; } });
      });
      if (first) {
        const top = first.offsetTop, bh = codeBox.clientHeight;
        if (top < codeBox.scrollTop + 30 || top > codeBox.scrollTop + bh - 40) codeBox.scrollTop = top - bh / 3;
      }
      // променливи
      const dl = varsSec.querySelector("dl");
      dl.innerHTML = "";
      const vars = f.vars || {};
      const vk = Object.keys(vars);
      varsSec.hidden = !vk.length;
      const pv = i > 0 ? frames[i - 1].vars || {} : {};
      vk.forEach((k2) => {
        const val = fmtVal(vars[k2]);
        const changed = i > 0 && k2 in pv && fmtVal(pv[k2]) !== val;
        dl.append(h("dt", { text: k2 }), h("dd", { class: changed ? "chg" : "", text: val }));
      });
      // броячи
      const st = f.stats || {};
      const sk = Object.keys(st);
      statSec.hidden = !sk.length;
      const sb = statSec.querySelector(".stats");
      sb.innerHTML = "";
      sk.forEach((k2) => sb.append(h("span", null, k2 + ": ", h("b", { text: String(st[k2]) }))));
      // лог
      const lb = logSec.querySelector(".log");
      lb.innerHTML = "";
      const upto = logIdx.filter((x) => x <= i);
      logSec.hidden = !logIdx.length;
      upto.slice(-60).forEach((x) => lb.append(h("div", { class: x === upto[upto.length - 1] ? "cur" : "", html: frames[x].log })));
      lb.scrollTop = lb.scrollHeight;
      updateCtrl();
      if (cfg.onFrame) cfg.onFrame(f, i, frames);
    }
    function fmtVal(v) {
      if (Array.isArray(v)) return "[" + v.map((x) => (x === null || x === undefined ? "·" : Array.isArray(x) ? fmtVal(x) : x)).join(", ") + "]";
      if (v === null || v === undefined) return "—";
      if (typeof v === "boolean") return v ? "true" : "false";
      return String(v);
    }
    function updateCtrl() {
      const n = frames.length;
      scrub.value = i;
      pos.textContent = n ? `стъпка ${i + 1}/${n}` : "—";
      bFirst.disabled = bPrev.disabled = !n || i === 0;
      bNext.disabled = bLast.disabled = !n || i >= n - 1;
      bPlay.disabled = !n;
      bPlay.textContent = timer ? "❚❚ Пауза" : i >= n - 1 && n > 1 ? "↺ Отначало" : "▶ Пусни";
    }
    function play() {
      if (timer) return stop();
      if (i >= frames.length - 1) go(0);
      timer = setInterval(() => { if (i >= frames.length - 1) stop(); else go(i + 1); }, +speed.value);
      updateCtrl();
    }
    function stop() { if (timer) clearInterval(timer); timer = null; updateCtrl(); }
    speed.addEventListener("change", () => { if (timer) { stop(); play(); } });
    bFirst.onclick = () => { stop(); go(0); };
    bPrev.onclick = () => { stop(); go(i - 1); };
    bNext.onclick = () => { stop(); go(i + 1); };
    bLast.onclick = () => { stop(); go(frames.length - 1); };
    bPlay.onclick = play;
    scrub.addEventListener("input", () => { stop(); go(+scrub.value); });
    root.addEventListener("keydown", (e) => {
      if (e.target.closest("input:not([type=range]),select,textarea")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(i - 1); }
      else if (e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "Home") { e.preventDefault(); stop(); go(0); }
      else if (e.key === "End") { e.preventDefault(); stop(); go(frames.length - 1); }
    });

    const api = { apply, go, stop, setValues, get frames() { return frames; }, get index() { return i; }, root, stage };
    if (cfg.initial) setValues(cfg.initial);
    apply();
    return api;
  };

  /** Статичен изглед на C регион (без стъпки). hl: етикет(и) за подсветка. */
  S.codeView = function (host, key, hl, cPath) {
    const src = (window.CSRC || {})[key];
    const box = h("div", { class: "viz-code", style: { borderRight: "none", border: "1px solid var(--line)", borderRadius: "6px", maxHeight: "none" } });
    if (!src) { box.append(h("p", { class: "warn", text: "Липсва C код: " + key })); host.append(box); return box; }
    const lines = S.highlightC(src.code).map((l) => h("span", { class: "l", html: l || " " }));
    [].concat(hl || []).forEach((t) => (src.tags[t] || []).forEach((n) => lines[n - 1] && lines[n - 1].classList.add("hl")));
    box.append(h("div", { class: "ch" }, h("span", { class: "mono", text: "C · " + src.file }), h("span", { class: "sp" }),
      h("a", { href: (cPath || S.cBase || "c/") + src.file, target: "_blank", rel: "noopener", text: "целият файл" })), h("pre", { class: "c" }, ...lines));
    host.append(box);
    return box;
  };

  /* ---------------- рисуване на масиви ---------------- */
  /** opts: {cls:{i:'s-cmp'}, ptr:{i:'i'}, dim:[from,to] | fn, gapAfter:k, label:i=>txt} */
  S.drawArray = function (el, arr, opts = {}) {
    const box = h("div", { class: "arr" });
    const ptrs = {};
    for (const name in opts.ptr || {}) { const k = opts.ptr[name]; if (k == null || k < 0 || k >= arr.length) continue; (ptrs[k] = ptrs[k] || []).push(name); }
    arr.forEach((v, k) => {
      let cls = (opts.cls && opts.cls[k]) || "";
      if (opts.dim && (typeof opts.dim === "function" ? opts.dim(k) : k < opts.dim[0] || k > opts.dim[1])) cls = cls || "s-dim";
      const c = h("div", { class: "cell " + cls + (opts.gapAt && opts.gapAt.includes(k) ? " gap" : "") },
        v === null || v === undefined ? "" : String(v),
        h("span", { class: "ix", text: opts.index === false ? "" : (opts.label ? opts.label(k) : k) }),
        ptrs[k] ? h("span", { class: "ptr", text: ptrs[k].join(",") }) : null);
      box.append(c);
    });
    if (opts.append) el.append(box); else { el.innerHTML = ""; el.append(box); }
    return box;
  };
  S.drawBars = function (el, arr, opts = {}) {
    const max = Math.max(1, ...arr.map((x) => Math.abs(x)));
    const box = h("div", { class: "bars" });
    if (opts.height) box.style.height = opts.height + "px";
    const showV = arr.length <= (opts.labelsUpTo ?? 32);
    arr.forEach((v, k) => {
      const b = h("div", { class: "bar " + ((opts.cls && opts.cls[k]) || "") });
      b.style.height = Math.max(3, (Math.abs(v) / max) * 100) + "%";
      if (showV) { b.append(h("span", { class: "bv", text: opts.fmt ? opts.fmt(v, k) : v })); b.append(h("span", { class: "bi", text: k })); }
      if (opts.title) b.title = opts.title(v, k);
      box.append(b);
    });
    if (opts.append) el.append(box); else { el.innerHTML = ""; el.append(box); }
    return box;
  };

  /* ---------------- тест ---------------- */
  S.quiz = function (host, items, title = "Провери се") {
    const box = h("div", { class: "quiz" }, h("span", { class: "eyebrow", text: title }));
    items.forEach((it, qi) => {
      const why = h("div", { class: "why", html: it.why || "", hidden: true });
      const opts = h("div", { class: "opts" });
      it.options.forEach((o, oi) => {
        const b = h("button", { class: "btn opt", html: o, onclick: () => {
          opts.querySelectorAll("button").forEach((x, xi) => { x.classList.remove("right", "wrong"); if (xi === it.correct) x.classList.add("right"); });
          if (oi !== it.correct) b.classList.add("wrong");
          why.hidden = false;
          why.innerHTML = (oi === it.correct ? "<b>Вярно.</b> " : "<b>Не точно.</b> ") + (it.why || "");
        } });
        opts.append(b);
      });
      box.append(h("div", { class: "q" }, h("p", { html: `${qi + 1}. ${it.q}` }), opts, why));
    });
    host.append(box);
    return box;
  };

  /* ---------------- глави и навигация ---------------- */
  const chapters = [];
  S.chapter = (def) => chapters.push(def);
  S.chapters = chapters;

  S.boot = function (opt) {
    const theme = S.store.get("theme", null);
    if (theme) document.documentElement.dataset.theme = theme;
    chapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const nav = document.getElementById("sidenav");
    const sel = document.getElementById("navselect");
    const main = document.getElementById("content");
    const seen = S.store.get(opt.topic + ":seen", {});
    const ol = h("ol");
    let lastGroup = null;
    const links = {};
    chapters.forEach((c) => {
      if (c.group && c.group !== lastGroup) { ol.append(h("li", { class: "group eyebrow", text: c.group })); lastGroup = c.group; }
      const a = h("a", { href: "#" + c.id, class: seen[c.id] ? "seen" : "" }, h("span", { class: "n", text: c.num || "" }), h("span", { text: c.title }));
      links[c.id] = a;
      ol.append(h("li", null, a));
      sel.append(h("option", { value: c.id, text: (c.num ? c.num + " · " : "") + c.title }));
    });
    nav.append(ol);
    sel.addEventListener("change", () => (location.hash = sel.value));
    const mounted = {};
    function show() {
      const id = (location.hash || "").slice(1);
      const c = chapters.find((x) => x.id === id) || chapters[0];
      chapters.forEach((x) => { if (mounted[x.id]) mounted[x.id].hidden = x !== c; });
      Object.values(links).forEach((a) => a.classList.remove("on"));
      links[c.id].classList.add("on");
      sel.value = c.id;
      if (!mounted[c.id]) {
        const idx = chapters.indexOf(c);
        const prev = chapters[idx - 1], next = chapters[idx + 1];
        const sec = h("section", { class: "chapter", id: "ch-" + c.id },
          h("header", null, h("span", { class: "eyebrow", text: (c.group ? c.group + " · " : "") + (c.num ? "Раздел " + c.num : "") }),
            h("h1", { text: c.title }), c.lead ? h("p", { class: "lead", html: c.lead }) : null));
        const body = h("div", { class: "chapter-body", style: { display: "grid", gap: "22px", minWidth: "0" } });
        if (c.html) body.innerHTML = c.html;
        sec.append(body);
        sec.append(h("nav", { class: "chapnav" },
          prev ? h("a", { class: "btn", href: "#" + prev.id, text: "← " + prev.title }) : h("span"),
          next ? h("a", { class: "btn primary", href: "#" + next.id, text: next.title + " →" }) : h("span")));
        main.append(sec);
        mounted[c.id] = sec;
        try { if (c.mount) c.mount(body); } catch (e) { console.error(e); body.prepend(h("p", { class: "warn", text: "Грешка в главата: " + e.message })); }
        prepDfn(sec);
      }
      seen[c.id] = 1; S.store.set(opt.topic + ":seen", seen); links[c.id].classList.add("seen");
      if (S._booted) window.scrollTo(0, 0);
      S._booted = true;
      document.title = c.title + " · " + opt.title;
    }
    window.addEventListener("hashchange", show);
    document.getElementById("btn-gloss").onclick = () => S.openGlossary();
    const tb = document.getElementById("btn-theme");
    const curDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const lab = () => (tb.textContent = curDark() ? "Светла тема" : "Тъмна тема");
    tb.onclick = () => { const t = curDark() ? "light" : "dark"; document.documentElement.dataset.theme = t; S.store.set("theme", t); lab(); };
    lab();
    bindGlossary();
    show();
  };
})();
