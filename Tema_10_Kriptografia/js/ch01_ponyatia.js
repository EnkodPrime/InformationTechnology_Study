/* Раздел 1 — Предмет и основни понятия. Схема на канала с противник; кодиране ≠ шифроване (Base64). */
(function () {
  const S = window.Study, h = S.h;
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  const algos = {
    /** Base64 — същото като b64_encode / b64_decode в c/01_base64.c */
    b64({ text, mode }) {
      const F = [];
      if (mode === "dec") {
        const s = String(text).trim();
        if (s.length > 80) throw new Error("Най-много 80 знака Base64.");
        if (s.length % 4) {
          F.push({ at: "check", vars: { n: s.length }, msg: `Дължината ${s.length} не е кратна на 4 — това не е валиден Base64 низ. Функцията връща −1.`, groups: [], out: [], bad: true });
          return { frames: F, result: -1 };
        }
        const out = [], groups = [];
        for (let i = 0; i < s.length; i += 4) {
          let v = 0, pad = 0;
          const six = [];
          for (let k = 0; k < 4; k++) {
            const ch = s[i + k];
            let d;
            if (ch === "=") { pad++; d = 0; } else d = B64.indexOf(ch);
            if (d < 0) {
              F.push({ at: "check", vars: { i: i + k, c: ch }, msg: `Знакът „${S.esc(ch)}“ не е от Base64 азбуката — връщаме −1.`, groups, out: out.slice(), bad: true });
              return { frames: F, result: -1 };
            }
            if (ch === "=" ? (k < 2 || i + 4 !== s.length) : pad > 0) {
              F.push({ at: "check", vars: { i: i + k, c: ch }, msg: `„=“ е допустим само на последните две позиции на последната група и след него не може да има друг знак — връщаме −1.`, groups, out: out.slice(), bad: true });
              return { frames: F, result: -1 };
            }
            v = (v << 6) | d; six.push(d);
            F.push({ at: "six", vars: { i, k, c: ch, d, v: v.toString(2).padStart(6 * (k + 1), "0") }, groups, cur: { chars: s.slice(i, i + 4), six: six.slice(), k }, out: out.slice(), msg: `„${S.esc(ch)}“ → ${ch === "=" ? "допълване (0)" : "индекс " + d} = <code>${d.toString(2).padStart(6, "0")}</code>. Добавяме 6 бита.` });
          }
          const bytes = [v >> 16 & 255];
          if (pad < 2) bytes.push(v >> 8 & 255);
          if (pad < 1) bytes.push(v & 255);
          out.push(...bytes);
          groups.push({ chars: s.slice(i, i + 4), bytes });
          F.push({ at: "unpack", vars: { i, pad, bytes: bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")) }, groups: groups.slice(), out: out.slice(), msg: `24 бита → ${bytes.length} байт${bytes.length > 1 ? "а" : ""} (${pad} знака „=“). Ключ не участва никъде.`, log: `${s.slice(i, i + 4)} → ${bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")}` });
        }
        let txt;
        try { txt = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(out)); } catch (e) { txt = null; }
        F.push({ at: "done", vars: { bytes: out.length }, groups, out, done: true, msg: `Декодирани ${out.length} байта${txt != null ? `: „<b>${S.esc(txt)}</b>“` : " (не са валиден UTF-8 текст)"}. Всеки, който знае публичното правило, получава същото.` });
        return { frames: F, result: txt != null ? txt : out.join(" "), bytes: out };
      }
      const bytes = [...new TextEncoder().encode(String(text))];
      if (bytes.length > 48) throw new Error("Най-много 48 байта (UTF-8): кирилските букви са по 2 байта.");
      let res = "";
      const groups = [];
      F.push({ at: "group", vars: { n: bytes.length }, bytes, groups: [], res, msg: `Входът е ${bytes.length} байта (UTF-8). Base64 ги взема по 3 (24 бита) и ги разделя на 4 части по 6 бита.` });
      for (let i = 0; i < bytes.length; i += 3) {
        let v = bytes[i] << 16;
        if (i + 1 < bytes.length) v |= bytes[i + 1] << 8;
        if (i + 2 < bytes.length) v |= bytes[i + 2];
        const take = Math.min(3, bytes.length - i);
        F.push({ at: "pack", vars: { i, v: v.toString(2).padStart(24, "0") }, bytes, gi: i, take, groups: groups.slice(), res, msg: `Байтове ${i}…${i + take - 1} → 24-битово число <code>${v.toString(2).padStart(24, "0").replace(/(.{8})/g, "$1 ").trim()}</code>${take < 3 ? " (липсващите байтове са нули)" : ""}.` });
        const out = [];
        for (let k = 0; k < 4; k++) {
          const six = (v >> (18 - 6 * k)) & 63;
          const padded = (k === 2 && take < 2) || (k === 3 && take < 3);
          const ch = padded ? "=" : B64[six];
          out.push(ch); res += ch;
          F.push({ at: padded ? ["six", "pad"] : "six", vars: { i, k, six, c: ch }, bytes, gi: i, take, k, groups: groups.slice(), res, msg: padded ? `Част ${k}: няма данни — пишем „=“.` : `Част ${k}: <code>${six.toString(2).padStart(6, "0")}</code> = ${six} → „<b>${ch}</b>“.` });
        }
        groups.push({ i, take, out: out.join("") });
        F[F.length - 1].log = `${bytes.slice(i, i + take).map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")} → ${out.join("")}`;
      }
      F.push({ at: "done", vars: { len: res.length }, bytes, groups, res, done: true, msg: `Резултат: <b>${S.esc(res) || "(празен низ)"}</b>. Изглежда „нечетим“, но няма <dfn data-g="ключ">ключ</dfn> — това е <dfn data-g="кодиране">кодиране</dfn>, не <dfn data-g="шифроване">шифроване</dfn>.` });
      return { frames: F, result: res };
    },
  };

  /* схема на канала — възли и обяснения */
  const NODES = {
    alice: { t: "Изпращач", g: "открит текст", d: "Притежава <dfn data-g=\"открит текст\">открития текст</dfn> M. „Текстът“ може да е всяка последователност от байтове." },
    enc: { t: "E<sub>K</sub> — шифроване", g: "шифроване", d: "<dfn data-g=\"шифроване\">Шифроването</dfn> преобразува M в C чрез публичен алгоритъм и таен <dfn data-g=\"ключ\">ключ</dfn>." },
    ch: { t: "Канал", g: "шифротекст", d: "По канала минава само <dfn data-g=\"шифротекст\">шифротекстът</dfn> C. Каналът се счита за наблюдаван." },
    eve: { t: "Противник", g: "криптоанализ", d: "Вижда C и знае алгоритъма (<dfn data-g=\"принцип на керкхофс\">принцип на Керкхофс</dfn>). Какво още може — зависи от <a href=\"#ataki\">модела на атака</a>. С <dfn data-g=\"криптоанализ\">криптоанализ</dfn> търси открития текст или ключа." },
    dec: { t: "D<sub>K</sub> — дешифриране", g: "дешифриране", d: "<dfn data-g=\"дешифриране\">Дешифрирането</dfn> възстановява M. <dfn data-g=\"коректност\">Коректност</dfn>: D<sub>K</sub>(E<sub>K</sub>(M)) = M." },
    bob: { t: "Получател", g: "открит текст", d: "Получава M. За асиметрична схема той притежава частния ключ, а изпращачът ползва неговия публичен." },
    key: { t: "Ключ K", g: "ключ", d: "При <dfn data-g=\"симетрична криптография\">симетричния</dfn> модел двамата споделят K — разпределянето му е част от системата. Множеството от възможни K е <dfn data-g=\"ключово пространство\">ключовото пространство</dfn>." },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="криптография">Криптографията</dfn> изследва математически методи за защита на информацията. <dfn data-g="криптоанализ">Криптоанализът</dfn> изучава възможности за нарушаване на заявените защитни свойства, а <dfn data-g="криптология">криптологията</dfn> обединява двете направления.</p>
  <p><dfn data-g="шифроване">Шифроването</dfn> преобразува <dfn data-g="открит текст">открит текст</dfn> (plaintext) в <dfn data-g="шифротекст">шифротекст</dfn> (ciphertext) чрез алгоритъм и <dfn data-g="ключ">ключ</dfn>; <dfn data-g="дешифриране">дешифрирането</dfn> възстановява текста. За ключ k пишем E<sub>k</sub> и D<sub>k</sub>. Множеството допустими ключове е <dfn data-g="ключово пространство">ключовото пространство</dfn>.</p>
</div>

<div class="block">
  <h3>Схема 1. Шифроване и дешифриране с ключ — канал с противник</h3>
  <p class="muted">Щракни върху елемент от схемата. Превключвателите отдолу сменят модела.</p>
  <div class="row" id="ch-ctl"></div>
  <div id="ch-svg" style="overflow-x:auto"></div>
  <div class="key" id="ch-detail"></div>
</div>

<div class="split">
  <div class="key"><b>Коректност</b><p class="formula">D<sub>k</sub>(E<sub>k</sub>(m)) = m</p><p>за всяко допустимо съобщение m (симетричен учебен модел).</p></div>
  <div class="key"><b>Коректност ≠ сигурност</b><p>Изместване с нула е обратимо и не скрива нищо. Устойчивостта се формулира спрямо противник, наблюдавана информация и цел.</p></div>
</div>

<details class="hint"><summary>Хинт: какво казва принципът на Керкхофс и какво не казва</summary><div>
  <p><dfn data-g="принцип на керкхофс">Принципът на Керкхофс</dfn> поставя сигурността върху тайната на ключа, а не върху скриването на алгоритъма. Публичното описание позволява независим анализ.</p>
  <p>Той <b>не</b> твърди, че тайният алгоритъм е автоматично несигурен — само че неговата неизвестност не е достатъчно основание за доказана защита. И обратно: публичното описание само по себе си не доказва устойчивост.</p>
</div></details>
<details class="trap"><summary>Капан: „невъзможно е да се отгатне ключът, значи е сигурно“</summary><div>
  <p>Не е достатъчно. Ако от шифротекста лесно се извлича значима част от съобщението, шифърът е слаб, дори ключът да остане неизвестен. Пример: моноазбучната замяна има 26! ключа, но честотният анализ (<a href="#chestoti">раздел 7</a>) я разбива, без да изпробва ключовете един по един.</p>
</div></details>

<div class="block">
  <h3>Кодиране, компресиране, хеширане, шифроване, стеганография</h3>
  <p class="muted">Пет различни преобразувания. Щракни върху карта: кой е въпросът, на който отговаря, и има ли таен ключ.</p>
  <div class="cards" id="xf"></div>
  <div class="key" id="xf-detail"></div>
  <p class="prose">Base64 е най-честото объркване: изходът изглежда „нечетим“, но правилото е публично и няма ключ. Визуализацията показва, че и двете посоки се изпълняват без никаква тайна.</p>
  <div id="v-b64"></div>
  <details class="trap"><summary>Капан: „хешът е по-кратко шифровано съобщение“</summary><div>
    <p>Не. Фиксираният отпечатък обикновено съответства на много възможни входове. Няма общ ключ за дешифриране обратно до единствен оригинал (Изяснени въпроси от ръководството).</p>
  </div></details>
  <p class="prose muted">Една система може да комбинира тези операции (напр. компресира, после шифрова), без те да стават едно понятие.</p>
</div>`;

  const XF = [
    { k: "Кодиране", g: "кодиране", q: "В каква азбука/формат са данните?", key: "няма", rev: "да, от всеки", d: "Base64 представлява данни в друга азбука и няма таен ключ. Не дава конфиденциалност." },
    { k: "Компресиране", g: "компресиране", q: "Може ли да е по-кратко?", key: "няма", rev: "да, от всеки (без загуба)", d: "Намалява определена излишност. Не скрива съдържанието." },
    { k: "Хеширане", g: "криптографски хеш", q: "Какъв е отпечатъкът?", key: "няма (HMAC добавя таен ключ)", rev: "не — няма общо дешифриране", d: "Дава отпечатък с фиксирана дължина. Съвпадение на хешове само по себе си не удостоверява изпращача." },
    { k: "Шифроване", g: "шифроване", q: "Кой може да прочете съдържанието?", key: "да", rev: "да, само с ключа", d: "Защита на съдържанието при видимо съобщение. Самостоятелно не гарантира непременно целостта." },
    { k: "Стеганография", g: "стеганография", q: "Има ли изобщо съобщение?", key: "зависи от метода", rev: "—", d: "Цели да прикрие наличието на съобщение. Криптографията защитава неговите свойства." },
  ];

  function mount(root) {
    /* ---- схема на канала ---- */
    const state = { asym: false, k0: false, sel: "enc" };
    const ctl = root.querySelector("#ch-ctl");
    const bA = h("button", { class: "btn", "aria-pressed": "false", text: "асиметричен модел" });
    const bK = h("button", { class: "btn", "aria-pressed": "false", text: "ключ K = 0 (Цезар)" });
    bA.onclick = () => { state.asym = !state.asym; bA.setAttribute("aria-pressed", state.asym); draw(); };
    bK.onclick = () => { state.k0 = !state.k0; bK.setAttribute("aria-pressed", state.k0); draw(); };
    ctl.append(bA, bK);
    const box = root.querySelector("#ch-svg"), det = root.querySelector("#ch-detail");
    function draw() {
      box.innerHTML = "";
      const W = 760, H = 285, sv = S.svg;
      const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Схема на канала" });
      const M = state.k0 ? "ATTACK" : "ATTACK", C = state.k0 ? "ATTACK" : "DWWDFN";
      const node = (id, x, y, w, lab, sub) => {
        const cls = "node " + (state.sel === id ? "s-act" : id === "eve" ? "s-swap" : id === "key" ? "s-cmp" : "");
        const gg = sv("g", { class: cls, style: "cursor:pointer", tabindex: "0", role: "button", "aria-label": lab, onclick: () => { state.sel = id; draw(); }, onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.sel = id; draw(); } } });
        gg.append(sv("rect", { x, y, width: w, height: 46, rx: 6, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }));
        gg.append(sv("text", { x: x + w / 2, y: y + 20, "text-anchor": "middle", style: "font-weight:700", text: lab }));
        if (sub) gg.append(sv("text", { x: x + w / 2, y: y + 37, "text-anchor": "middle", class: "wt", text: sub }));
        g.append(gg);
      };
      const arrow = (x1, y1, x2, y2, lab, cls) => {
        g.append(sv("line", { x1, y1, x2, y2, class: "edge " + (cls || ""), "marker-end": "url(#t10a)" }));
        if (lab) g.append(sv("text", { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 6, "text-anchor": "middle", class: "wt", text: lab }));
      };
      g.append(sv("defs", null, sv("marker", { id: "t10a", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, sv("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--muted)" }))));
      node("alice", 10, 30, 110, "Изпращач", "M = " + M);
      node("enc", 160, 30, 110, "E_K", "шифроване");
      node("ch", 310, 30, 140, "канал", "C = " + C);
      node("dec", 490, 30, 110, "D_K", "дешифриране");
      node("bob", 640, 30, 110, "Получател", "M = " + M);
      node("eve", 310, 150, 140, "Противник", "вижда C");
      node("key", state.asym ? 490 : 310, 215, state.asym ? 260 : 140, state.asym ? "ключова двойка" : "Ключ K", state.asym ? "публичен → E, частен → D" : (state.k0 ? "K = 0" : "K = 3, общ таен"));
      arrow(120, 53, 158, 53, "M");
      arrow(270, 53, 308, 53, "C");
      arrow(450, 53, 488, 53, "C");
      arrow(600, 53, 638, 53, "M");
      arrow(380, 76, 380, 148, "", "s-swap");
      if (state.asym) {
        arrow(560, 215, 545, 78, ""); g.append(sv("text", { x: 562, y: 150, class: "wt", text: "частен" }));
        g.append(sv("path", { d: "M 490 240 C 300 275, 220 220, 215 78", class: "edge", "marker-end": "url(#t10a)" }));
        g.append(sv("text", { x: 250, y: 278, class: "wt", text: "публичен ключ на получателя" }));
      } else {
        g.append(sv("path", { d: "M 310 238 C 230 238, 215 150, 215 78", class: "edge s-cmp", "marker-end": "url(#t10a)" }));
        g.append(sv("path", { d: "M 450 238 C 530 238, 545 150, 545 78", class: "edge s-cmp", "marker-end": "url(#t10a)" }));
      }
      box.append(g);
      const N = NODES[state.sel];
      let extra = "";
      if (state.k0 && (state.sel === "enc" || state.sel === "ch" || state.sel === "eve")) extra = `<p class="warn">При K = 0 C = M = ATTACK: схемата е коректна (D(E(M)) = M), но не скрива нищо. Коректността не доказва сигурност.</p>`;
      if (state.asym && state.sel === "key") extra = `<p>При <dfn data-g="асиметрична криптография">асиметричната</dfn> схема ролите на ключовете се различават: изпращачът използва публичния ключ на получателя, частният позволява дешифриране. Публичният ключ трябва да е <b>автентичен</b> — иначе противникът подменя самия получател. <span class="extra-tag">разширение</span> виж <a href="#savremenna">раздел 8</a>.</p>`;
      det.innerHTML = `<p><b>${N.t}</b></p><p>${N.d}</p>${extra}`;
      det.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0"));
    }
    draw();

    /* ---- карти с преобразувания ---- */
    const xf = root.querySelector("#xf"), xd = root.querySelector("#xf-detail");
    const btns = XF.map((X, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: "таен ключ: " + X.key }), h("h4", null, h("dfn", { "data-g": X.g, text: X.k })), h("p", { text: X.q })));
    xf.append(...btns);
    function pick(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const X = XF[i];
      xd.innerHTML = `<p><b>${X.k}</b> — ${X.q}</p><p>${X.d}</p><p class="muted">Таен ключ: ${X.key}. Обратимо: ${X.rev}.</p>`;
    }
    pick(0);

    /* ---- Base64 ---- */
    S.viz(root.querySelector("#v-b64"), {
      id: "b64", title: "Base64 — кодиране без ключ", sub: "Байтове по 3 → 4 знака по 6 бита. Превключи на „декодирай“ и постави резултата: никаква тайна не е нужна.",
      code: (i) => (i.mode === "dec" ? "ch01_b64dec" : "ch01_b64enc"),
      inputs: [{ id: "text", label: "Текст / Base64", value: "ATTACK", width: "16em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "кодирай"], ["dec", "декодирай"]] }],
      presets: [{ label: "AT DAWN (с „==“)", values: { text: "AT DAWN", mode: "enc" } }, { label: "Ключ (кирилица)", values: { text: "Ключ", mode: "enc" } }, { label: "декодирай QVRUQUNL", values: { text: "QVRUQUNL", mode: "dec" } }, { label: "невалиден QUJ", values: { text: "QUJ", mode: "dec" } }],
      legend: [["s-act", "текуща група"], ["s-cmp", "текущи 6 бита"], ["s-piv", "допълване „=“"], ["s-done", "готово"]],
      build: algos.b64,
      draw(st, f, { inputs }) {
        st.innerHTML = "";
        if (inputs.mode === "dec") {
          if (f.bad) { st.append(h("p", { class: "warn", text: "Невалиден вход — няма какво да се декодира." })); return; }
          if (f.cur) {
            const c = f.cur;
            T10.strip(st, [...c.chars], { cls: { [c.k]: "s-cmp" }, sub: (k) => (c.six[k] != null ? c.six[k].toString(2).padStart(6, "0") : "") });
          }
          if (f.out.length) T10.strip(st, f.out.map((b) => b.toString(16).toUpperCase().padStart(2, "0")), { append: true, title: "байтове", cls: f.done ? Object.fromEntries(f.out.map((_, k) => [k, "s-done"])) : {} });
          return;
        }
        const cls = {};
        if (f.gi != null) for (let k = f.gi; k < f.gi + f.take; k++) cls[k] = "s-act";
        if (f.done) f.bytes.forEach((_, k) => (cls[k] = "s-done"));
        T10.strip(st, f.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")), { cls, title: "байтове (hex)", small: f.bytes.length > 18 });
        if (f.gi != null && !f.done) {
          let v = f.bytes[f.gi] << 16 | (f.bytes[f.gi + 1] ?? 0) << 8 | (f.bytes[f.gi + 2] ?? 0);
          if (f.take < 3) v &= f.take === 1 ? 0xff0000 : 0xffff00;
          const bits = v.toString(2).padStart(24, "0");
          const parts = [0, 1, 2, 3].map((k) => bits.slice(6 * k, 6 * k + 6));
          T10.strip(st, parts, { append: true, title: "24 бита → 4 × 6", cls: f.k != null ? { [f.k]: f.at.includes && f.at.includes("pad") ? "s-piv" : "s-cmp" } : {}, sub: (k) => B64[parseInt(parts[k], 2)] });
          st.querySelectorAll(".arr:last-child .cell").forEach((c) => { c.style.width = "auto"; c.style.padding = "0 6px"; });
        }
        const rc = {};
        [...f.res].forEach((c, k) => (rc[k] = c === "=" ? "s-piv" : f.done ? "s-done" : ""));
        if (f.res.length) T10.strip(st, [...f.res], { append: true, title: "Base64 изход", cls: rc, small: f.res.length > 18 });
      },
    });
  }

  S.chapter({ id: "ponyatia", order: 1, num: "1", group: "Основи", title: "Предмет и основни понятия", lead: "Открит текст, шифротекст, ключ, шифроване и дешифриране; коректност срещу сигурност; принципът на Керкхофс; кодиране ≠ шифроване.", html, mount, algos });
})();
