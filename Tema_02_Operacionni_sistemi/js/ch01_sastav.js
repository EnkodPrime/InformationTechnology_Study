/* Раздел 1 — предназначение и състав на ОС; ядро, режими, системно извикване. */
(function () {
  const S = window.Study, h = S.h;

  function parseText(t) {
    const s = String(t).replace(/\\n/g, "\n");
    if (!s.length) throw new Error("Въведи поне един символ (\\n означава нов ред).");
    if (s.length > 48) throw new Error("Най-много 48 символа.");
    return s;
  }
  const show = (c) => (c === "\n" ? "\\n" : c);

  const algos = {
    /* Модел на буфериран изход: out_putc е библиотечна функция; системно извикване има само при flush. */
    bufio({ text, mode, cap }) {
      const s = parseText(text);
      const M = { none: 0, line: 1, full: 2 }[mode];
      if (M == null) throw new Error("Непознат режим на буфериране.");
      cap = S.int(cap, 1, 64, "Размерът на буфера");
      const F = [];
      let buf = [], sink = "", sys = 0, calls = 0;
      const snap = (o) => ({ buf: buf.slice(), sink, cap, stats: { "библиотечни извиквания": calls, "системни извиквания": sys }, ...o });
      const flush = (why, at) => {
        F.push(snap({ at: at ? ["flush", at] : "flush", vars: { len: buf.length }, msg: `${why} → <code>out_flush</code>: в буфера има ${buf.length} байта.` }));
        sink += buf.join(""); sys++;
        F.push(snap({ at: "sys", kernel: true, sent: buf.slice(), vars: { len: buf.length, syscalls: sys }, msg: `<b>Системно извикване №${sys}</b>: преминаване в привилегирован режим, ядрото приема ${buf.length} байта. В реалната библиотека тук е <code>write(fd, …)</code>.`, log: `write(${JSON.stringify(buf.join("")).replace(/</g, "&lt;")}) — syscall №${sys}` }));
        buf = [];
      };
      F.push(snap({ vars: { mode, cap }, msg: `Режим <b>${mode === "none" ? "без буфер" : mode === "line" ? "по редове" : "пълен буфер"}</b>, буфер ${cap} байта. Приложението вика <code>out_putc</code> за всеки символ.` }));
      for (const c of s) {
        calls++;
        buf.push(c);
        F.push(snap({ at: "put", ch: c, vars: { c: show(c), len: buf.length }, msg: `<code>out_putc('${show(c)}')</code> — записва в буфера в <b>потребителското пространство</b>. Ядрото не участва.` }));
        if (M === 0) { flush("Режим без буфер", "none"); continue; }
        if (M === 1 && c === "\n") { flush("Символ за нов ред в режим по редове", "line"); continue; }
        if (buf.length === cap) { flush(`Буферът е пълен (${cap} байта)`, "full"); continue; }
      }
      if (buf.length) flush("Край на програмата (fclose / exit)", null);
      F.push(snap({ done: true, vars: { syscalls: sys }, msg: `Готово: ${calls} библиотечни извиквания, <b>${sys}</b> системни. Изходът е един и същ при всеки режим — различава се броят преходи към ядрото.` }));
      return { frames: F, result: sys, calls };
    },
  };

  /* ---------- схема 1: слоеве ---------- */
  const LAYERS = [
    { k: "app", t: "Приложения", d: "Програмите на потребителя. Работят с абстракции: процес, виртуален адрес, файл. Не управляват сами устройствата.", side: "user" },
    { k: "lib", t: "Системни библиотеки · API", d: "Програмният договор (<dfn data-g=\"api\">API</dfn>). Библиотечната функция може да не влиза в ядрото (strlen) или да буферира и по-късно да поиска услуга (запис). <dfn data-g=\"abi\">ABI</dfn> определя двоичните правила.", side: "user" },
    { k: "svc", t: "Системни служби · интерфейс", d: "Служби, команден интерпретатор, графична среда. Допълват системата, но не са ядро: приложение може да работи и без графична среда.", side: "user" },
    { k: "sys", t: "Граница: системно извикване", d: "Контролиран вход към услуга на ядрото — смяна на режим. Не изисква непременно избор на друга нишка.", side: "edge" },
    { k: "kern", t: "Ядро", d: "Привилегирована част: планиране, адресни пространства, прекъсвания, драйвери, защита.", side: "kernel" },
    { k: "hw", t: "Хардуер", d: "Процесор, памет, устройства. Прекъсванията от устройства и изключенията също предизвикват обработка от системата.", side: "hw" },
  ];

  /* ---------- схема 3: монолит / микроядро ---------- */
  const SERVICES = ["планиране", "IPC", "памет", "файлова система", "драйвер на диск", "мрежов стек"];
  const MICRO_IN = new Set(["планиране", "IPC", "памет"]);

  const html = `
<div class="prose">
  <p><dfn data-g="операционна система">Операционната система</dfn> е системен софтуер, който управлява хардуерните ресурси и предоставя услуги за изпълнение на приложения. Тя изгражда абстракции като <dfn data-g="процес">процес</dfn>, <dfn data-g="виртуален адрес">виртуална памет</dfn> и файл. Така програмата работи с логически обекти, без сама да управлява всички особености на устройствата.</p>
  <p>Абстракцията скрива механизъм, но има <b>наблюдаем договор, права и цена</b>: процес вместо „част от процесорно време“, виртуален адрес вместо пряк произволен физически достъп, файл вместо команди към конкретен диск.</p>
</div>

<div class="block">
  <h3>Схема 1 · ОС посредничи между приложения и хардуер</h3>
  <p class="muted">Щракни слой. Отляво е потребителското пространство, долу — привилегированото.</p>
  <div class="split">
    <div id="layers"></div>
    <div class="key" id="layer-detail"></div>
  </div>
</div>

<div class="block">
  <h3>Ядро, режими и системно извикване</h3>
  <p class="prose"><dfn data-g="ядро">Ядрото</dfn> изпълнява привилегированите операции. Процесорът различава <dfn data-g="привилегирован режим">привилегирован и потребителски режим</dfn>. <dfn data-g="системно извикване">Системното извикване</dfn> е контролиран вход към услуга на ядрото. То се различава от обикновено извикване на библиотечна функция, макар библиотечната функция да може да го използва.</p>
  <div id="v-bufio"></div>
  <details class="hint"><summary>Хинт: защо буферираният изход прави по-малко системни извиквания</summary><div>
    <p>Всяко системно извикване е преминаване през контролираната граница — смяна на режим, проверки, връщане. Библиотеката събира байтовете в буфер в потребителското пространство и иска услуга от ядрото рядко. Режим „по редове“ е компромис за интерактивен изход: редът се вижда веднага щом завърши.</p>
    <p>Затова „извиках функция за запис“ не означава „данните са в ядрото“. А „ядрото прие данните“ не означава „данните са на носителя“ — това е <a href="#fs">раздел 8</a>.</p>
  </div></details>
  <details class="trap"><summary>Капан: системно извикване = превключване на процес</summary><div>
    <p>Не. Преминаването в ядро е смяна на <b>режим</b> и контрол. То не изисква задължително планировчикът да избере друга нишка — след обслужването управлението може да се върне към същата нишка (Схема 4 от ръководството).</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 3 · Монолитно ядро и микроядро</h3>
  <p class="prose">При <dfn data-g="монолитно ядро">монолитно ядро</dfn> много услуги са в привилегированото пространство. <dfn data-g="микроядро">Микроядрото</dfn> оставя по-малко механизми в ядрото и премества услуги в отделни процеси. Реалните ОС често използват смесени решения.</p>
  <div class="row"><span class="muted">Модел:</span><button class="btn" id="mk-mono" aria-pressed="true">монолитно</button><button class="btn" id="mk-micro" aria-pressed="false">микроядро</button>
    <span class="muted">Пример: приложението чете файл.</span></div>
  <div id="kernel-svg" class="tbl-wrap"></div>
  <p id="kernel-note" class="muted"></p>
  <details class="trap"><summary>Капан: „по-малкото ядро е по-надеждно/по-бързо“</summary><div>
    <p>Разликата е в <b>границите на привилегиите и разполагането на услугите</b>. Сравнението включва производителност, изолация и сложност на комуникацията, а не само размера на кода. Размерът на ядрото сам по себе си не доказва надеждност или производителност.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 2 · Вид система и реална реализация</h3>
  <p class="muted">Различни оси на описание; категориите не са непременно взаимно изключващи се. Щракни ред.</p>
  <div class="tbl-wrap"><table class="t" id="real-tbl"></table></div>
  <div class="key" id="real-note">Linux е ядро; Ubuntu и Debian са дистрибуции. <dfn data-g="rtos">RTOS</dfn> е категория, не име на един продукт.</div>
  <details class="trap"><summary>Капан: разгъване на имена и смесване на равнища</summary><div>
    <p>Android и iOS са продуктови имена. UNIX е историческо име и марка, а не акроним; Unix-like описва сходство. <dfn data-g="posix">POSIX</dfn> означава Portable Operating System Interface и описва стандартизирани интерфейси. Android използва Linux ядро, но не е просто настолна GNU/Linux дистрибуция с друг екран.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> ОС = управление на ресурси + услуги чрез абстракции. Ядро ≠ графична среда. Системно извикване = контролирана смяна на режим; библиотечна функция ≠ системно извикване; смяна на режим ≠ смяна на процес.</div>`;

  const REAL = [
    ["Microsoft Windows", "операционна система", "настолна / сървърна"],
    ["Linux", "ядро", "използва се в дистрибуции и в Android"],
    ["Ubuntu, Debian", "GNU/Linux дистрибуции", "Linux ядро + други компоненти"],
    ["IBM AIX", "UNIX система", "UNIX — историческо семейство и марка"],
    ["Android", "мобилна система", "Linux ядро + собствена платформа над него"],
    ["Apple iOS", "мобилна система", "продуктово име"],
    ["FreeRTOS, Zephyr, QNX Neutrino, VxWorks", "RTOS (категория)", "предвидимост на реакцията — виж раздел 3"],
  ];

  function mount(root) {
    // слоеве
    const box = root.querySelector("#layers"), det = root.querySelector("#layer-detail");
    const colors = { user: "s-act", edge: "s-cmp", kernel: "s-piv", hw: "s-dim" };
    const btns = LAYERS.map((L, i) => h("button", { class: "card " + colors[L.side], style: { width: "100%", borderColor: "var(--c)", background: "var(--cb)", opacity: 1 }, "aria-pressed": "false", onclick: () => pick(i) },
      h("span", { class: "eyebrow", text: L.side === "user" ? "потребителски режим" : L.side === "edge" ? "граница" : L.side === "kernel" ? "привилегирован режим" : "хардуер" }), h("h4", { text: L.t })));
    box.append(h("div", { style: { display: "grid", gap: "4px" } }, ...btns));
    function pick(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      det.innerHTML = `<p><b>${LAYERS[i].t}</b></p><p>${LAYERS[i].d}</p>`;
      det.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0"));
    }
    pick(3);

    // буфериран изход
    S.viz(root.querySelector("#v-bufio"), {
      id: "bufio", title: "Библиотечна функция срещу системно извикване", sub: "out_putc() е в потребителското пространство; само flush преминава границата към ядрото.",
      code: "s01_bufio",
      inputs: [{ id: "text", label: "Текст (\\n = нов ред)", value: "Hello\\nOS\\n", width: "14em" },
        { id: "mode", label: "Буфериране", type: "select", value: "line", options: [["none", "без буфер"], ["line", "по редове"], ["full", "пълен буфер"]] },
        { id: "cap", label: "Размер на буфера", type: "number", value: 8, width: "5em" }],
      presets: [{ label: "26 букви, пълен 8", values: { text: "abcdefghijklmnopqrstuvwxyz", mode: "full", cap: 8 } }, { label: "без буфер", values: { mode: "none" } }],
      legend: [["s-act", "в буфера (потребителско пр.)"], ["s-piv", "предадено на ядрото"]],
      build: algos.bufio,
      draw(st, f) {
        st.innerHTML = "";
        const user = h("div", { class: "card" }, h("span", { class: "eyebrow", text: "потребителски режим · буфер" }));
        const cells = Array.from({ length: f.cap }, (_, k) => (k < f.buf.length ? show(f.buf[k]) : ""));
        const wrap = h("div", { style: { overflowX: "auto" } });
        user.append(wrap);
        S.drawArray(wrap, cells, { cls: Object.fromEntries(f.buf.map((_, k) => [k, f.kernel ? "s-piv" : k === f.buf.length - 1 && f.ch != null ? "s-cmp" : "s-act"])) });
        const kern = h("div", { class: "card s-piv", style: { borderColor: "var(--c)", opacity: 1 } }, h("span", { class: "eyebrow", text: "ядро · прието досега" }),
          h("pre", { class: "mono", style: { margin: 0, whiteSpace: "pre-wrap", minHeight: "2.5em" }, text: f.sink.replace(/\n/g, "↵\n") || "—" }));
        st.append(h("div", { class: "split" }, user, kern));
        if (f.kernel) st.append(h("p", { class: "pill s-piv", style: { marginTop: "8px" }, text: "↓ смяна на режим: системно извикване" }));
      },
    });

    // монолит / микро
    const kb = root.querySelector("#kernel-svg"), kn = root.querySelector("#kernel-note");
    const bm = root.querySelector("#mk-mono"), bu = root.querySelector("#mk-micro");
    function drawKernel(micro) {
      bm.setAttribute("aria-pressed", micro ? "false" : "true"); bu.setAttribute("aria-pressed", micro ? "true" : "false");
      const W = 720, H = 230, ky = 140;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Монолитно ядро и микроядро" });
      svg.append(S.svg("line", { x1: 10, y1: ky - 12, x2: W - 10, y2: ky - 12, class: "edge", "stroke-dasharray": "6 4" }));
      svg.append(S.svg("text", { x: W - 12, y: ky - 18, "text-anchor": "end", class: "wt", text: "потребителско пространство ↑   привилегировано ↓" }));
      const userSvc = micro ? SERVICES.filter((s) => !MICRO_IN.has(s)) : [];
      const kernSvc = micro ? SERVICES.filter((s) => MICRO_IN.has(s)) : SERVICES;
      const boxAt = (x, y, w, t, cls) => S.svg("g", { class: "node " + cls }, S.svg("rect", { x, y, width: w, height: 30, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }), S.svg("text", { x: x + w / 2, y: y + 19, "text-anchor": "middle", style: "font-size:10.5px", text: t }));
      svg.append(boxAt(20, 20, 110, "приложение", "s-act"));
      userSvc.forEach((s, i) => svg.append(boxAt(160 + i * 185, 70, 175, s + " (сървър)", "s-cmp")));
      svg.append(S.svg("rect", { x: 10, y: ky, width: W - 20, height: 80, rx: 6, fill: "none", stroke: "var(--st-piv)", "stroke-width": 2 }));
      svg.append(S.svg("text", { x: 20, y: ky + 16, class: "wt", text: micro ? "микроядро" : "монолитно ядро" }));
      const kw = (W - 40) / kernSvc.length;
      kernSvc.forEach((s, i) => svg.append(boxAt(20 + i * kw, ky + 30, kw - 8, s, "s-piv")));
      // път на заявката
      const path = micro
        ? "приложение → (syscall/IPC) ядро → сървър „файлова система“ → (IPC) ядро → сървър „драйвер на диск“ → … → отговор обратно по същия път"
        : "приложение → (syscall) ядро: файлова система → драйвер на диск → връщане";
      kb.innerHTML = ""; kb.append(svg);
      kn.innerHTML = `<b>Път на заявката:</b> ${path}. ${micro ? "Повече преминавания и съобщения между процеси, но отказ в сървър не е отказ в привилегирования код." : "Едно преминаване към ядро; услугите се извикват директно в привилегированото пространство, но грешка в драйвер е грешка в ядрото."} <span class="muted">Схемата е учебен модел; реалните ОС комбинират идеи.</span>`;
    }
    bm.onclick = () => drawKernel(false); bu.onclick = () => drawKernel(true);
    drawKernel(false);

    // реални
    const tb = root.querySelector("#real-tbl"), rn = root.querySelector("#real-note");
    tb.append(h("tr", null, h("th", { text: "Име" }), h("th", { text: "Какво е" }), h("th", { text: "Уточнение" })));
    REAL.forEach((r) => {
      const tr = h("tr", { style: { cursor: "pointer" }, tabindex: "0", onclick: () => { rn.innerHTML = `<b>${r[0]}</b> — ${r[1]}. ${r[2]}.`; } }, ...r.map((x) => h("td", { text: x })));
      tb.append(tr);
    });
  }

  S.chapter({ id: "sastav", order: 1, num: "1", group: "Основа", title: "Предназначение и състав на ОС", lead: "Абстракции, ядро и режими, системно извикване срещу библиотечна функция, монолитно ядро и микроядро, реални системи.", html, mount, algos });
})();
