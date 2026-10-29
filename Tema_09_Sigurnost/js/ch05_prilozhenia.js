/* Раздел 5 — атаки срещу приложения и акаунти: какво са, признаци, защита. Кодът е само защитен. */
(function () {
  const S = window.Study, h = S.h;
  const VRES = ["V_OK", "V_EMPTY", "V_LONG", "V_CHAR"];
  const COMMON = ["123456", "password", "qwerty", "111111", "letmein", "parola", "admin"];
  const isAlpha = (c) => /[A-Za-z]/.test(c), isLower = (c) => /[a-z]/.test(c), isUpper = (c) => /[A-Z]/.test(c), isDigit = (c) => /[0-9]/.test(c);

  function checkAscii(s, name) {
    if (/[^\x20-\x7e]/.test(s)) throw new Error(`${name}: само латински символи (ASCII), както в C модела.`);
  }
  function fnv(salt, pw) {
    let hh = 2166136261 >>> 0;
    for (const c of salt + pw) { hh ^= c.charCodeAt(0); hh = Math.imul(hh, 16777619) >>> 0; }
    return hh >>> 0;
  }
  const hex8 = (x) => x.toString(16).padStart(8, "0");

  const algos = {
    validate({ s, maxlen }) {
      s = String(s ?? "");
      checkAscii(s, "Входът");
      maxlen = S.int(maxlen, 1, 40, "Максималната дължина");
      if (s.length > 60) throw new Error("Най-много 60 символа за визуализацията.");
      const F = [], chars = s.split("");
      const fr = (o) => ({ chars, ...o });
      if (!s.length) { F.push(fr({ at: "empty", res: 1, vars: { n: 0 }, msg: "Празен вход — отхвърля се: <b>V_EMPTY</b>." })); return { frames: F, result: 1, bad: -1 }; }
      F.push(fr({ at: "empty", vars: { n: s.length }, msg: `Дължина ${s.length} — не е празно.` }));
      if (s.length > maxlen) { F.push(fr({ at: "long", res: 2, vars: { n: s.length, maxlen }, msg: `${s.length} &gt; ${maxlen} — твърде дълго: <b>V_LONG</b>. Проверката на дължината е преди обхождането.` })); return { frames: F, result: 2, bad: -1 }; }
      F.push(fr({ at: "long", vars: { n: s.length, maxlen }, msg: `${s.length} ≤ ${maxlen}.` }));
      for (let i = 0; i < s.length; i++) {
        const c = s[i], ok = isAlpha(c) || c === " " || c === "-" || c === "'";
        F.push(fr({ at: ["loop", "check"], i, ok, vars: { i, c: JSON.stringify(c), ok: ok ? 1 : 0 }, msg: `s[${i}] = <code>${S.esc(c)}</code> — ${ok ? "в списъка на разрешените" : "<b>не е разрешен</b>"}.` }));
        if (!ok) { F.push(fr({ at: "reject", i, ok: false, res: 3, vars: { bad_pos: i }, msg: `Отхвърля се на позиция ${i}: <b>V_CHAR</b>. Списъкът казва какво е позволено, не какво е забранено.`, log: `reject @${i}` })); return { frames: F, result: 3, bad: i }; }
      }
      F.push(fr({ at: "accept", res: 0, done: true, vars: { result: "V_OK" }, msg: "Всички символи са разрешени: <b>V_OK</b>. Стойността отива в заявката като <b>параметър</b>, не като текст на заявката.", log: "accept" }));
      return { frames: F, result: 0, bad: -1 };
    },

    copy({ src, cap }) {
      src = String(src ?? "");
      checkAscii(src, "Входът");
      cap = S.int(cap, 2, 16, "Вместимостта");
      if (src.length > 30) throw new Error("Най-много 30 символа.");
      const buf = Array(cap).fill(null), F = [];
      const fr = (o) => ({ buf: buf.slice(), cap, src, ...o });
      let i = 0;
      while (true) {
        const more = i < src.length, room = i < cap - 1;
        F.push(fr({ at: "c_loop", i, vars: { i, "src[i]": more ? src[i] : "\\0", "i < cap-1": room ? 1 : 0 }, msg: more ? (room ? `Има вход и място (i = ${i} &lt; ${cap - 1}).` : `Има още вход, но <b>няма място</b>: i = ${i} = cap − 1. Спираме — последното място е за нулата.`) : "Входът свърши." }));
        if (!(more && room)) break;
        buf[i] = src[i];
        F.push(fr({ at: "c_write", i, w: i, vars: { i, "dst[i]": src[i] }, msg: `dst[${i}] = '${S.esc(src[i])}'.` }));
        i++;
      }
      buf[i] = "\\0";
      F.push(fr({ at: "c_term", i, w: i, vars: { i }, msg: `dst[${i}] = '\\0' — завършваща нула, винаги вътре в буфера.` }));
      const r = i < src.length ? -1 : i;
      F.push(fr({ at: "c_ret", done: true, cut: r < 0, vars: { return: r }, msg: r < 0 ? `Връщаме <b>−1</b>: входът е отрязан и извикващият <b>знае</b> това. Нито един байт не е записан извън буфера.` : `Връщаме ${r} — копирано изцяло.`, log: `return ${r}` }));
      return { frames: F, result: r, out: buf.slice(0, i).join("") };
    },

    pw({ p, salt }) {
      p = String(p ?? ""); salt = String(salt ?? "");
      checkAscii(p, "Паролата"); checkAscii(salt, "Солта");
      if (p.length > 40 || salt.length > 16) throw new Error("Паролата е до 40, солта до 16 символа.");
      const F = [];
      F.push({ at: "common", vars: { p_len: p.length }, msg: "Първо: дали паролата е в списъка с най-чести пароли?" });
      if (COMMON.includes(p)) {
        F.push({ at: "common", pool: 0, bits: 0, weak: true, vars: { pool: 0, bits: 0 }, msg: "<b>В списъка е</b> — 0 бита. Такива пароли се пробват първи; дължината и символите нямат значение.", log: "честа парола" });
      } else {
        let lo = 0, up = 0, di = 0, ot = 0;
        for (const c of p) { if (isLower(c)) lo = 1; else if (isUpper(c)) up = 1; else if (isDigit(c)) di = 1; else ot = 1; }
        F.push({ at: "classes", cls: { lo, up, di, ot }, vars: { малки: lo, главни: up, цифри: di, други: ot }, msg: "Кои класове символи се срещат." });
        const pool = 26 * lo + 26 * up + 10 * di + 33 * ot;
        F.push({ at: "pool", cls: { lo, up, di, ot }, pool, vars: { pool }, msg: `Размер на азбуката: ${pool}.` });
        const bits = pool ? p.length * Math.log2(pool) : 0;
        F.push({ at: "bits", cls: { lo, up, di, ot }, pool, bits, vars: { pool, bits: bits.toFixed(1) }, msg: `${p.length} × log₂(${pool}) ≈ <b>${bits.toFixed(1)}</b> бита (горна оценка в модела; за пароли, избрани от хора, е по-малко).`, log: `${bits.toFixed(1)} бита` });
      }
      const last = F[F.length - 1];
      const hs = fnv(salt, p), h0 = fnv("", p);
      F.push({ ...last, at: ["h_init", "h_salt", "h_pw", "h_ret"], hs, h0, salt, done: true, vars: { ...last.vars, "h(сол||парола)": hex8(hs) }, msg: `Съхранява се h(сол || парола) = <code>${hex8(hs)}</code>${salt ? `, без сол щеше да е <code>${hex8(h0)}</code>` : ""}. Различна сол ⇒ еднаквите пароли имат различни записи.` });
      return { frames: F, bits: last.bits ?? 0, pool: last.pool ?? 0, hash: hex8(hs) };
    },
  };

  const FACT = [
    ["Парола", "знание"], ["ПИН код", "знание"], ["Отговор на таен въпрос", "знание"],
    ["Телефон с приложение за кодове", "притежание"], ["Хардуерен ключ", "притежание"], ["Пръстов отпечатък", "биометрично"],
  ];

  const html = `
<div class="prose">
  <p>Общото за тази глава: <b>недоверени данни се третират като код или като чуждо намерение</b>. Защитата е да се разделят код и данни и да се проверява всяко действие.</p>
</div>

<div class="block">
  <h3>Схема 11. SQL инжекция: код срещу данни</h3>
  <p class="prose"><dfn data-g="sql инжекция">SQL инжекцията</dfn> възниква, когато недоверен вход участва в изграждането на <dfn data-g="sql">SQL</dfn> синтаксис. <dfn data-g="параметризирана заявка">Параметризираният интерфейс</dfn> разделя структурата на командата от стойностите. Реалните драйвери — на PostgreSQL, <dfn data-g="jdbc">JDBC</dfn>, ADO.NET — правят точно това.</p>
  <div class="row" id="sql-btn"></div>
  <div id="sql-svg"></div>
  <div class="key" id="sql-detail"></div>
  <details class="trap"><summary>Капан: „екранирахме кавичките — значи сме защитени“</summary><div>
    <p>Екранирането на няколко символа не е универсална защита във всички контексти: например числова стойност в заявката не е в кавички. Също: произволно име на таблица или колона не може винаги да се подаде като стойност на параметър — динамичните части на структурата изискват отделен ограничен договор (напр. избор от фиксиран списък).</p>
  </div></details>
</div>

<div class="block">
  <h3>Валидиране на входа (допълваща мярка)</h3>
  <p class="prose">Проверка по списък от разрешени символи и дължина. Тя ограничава формата, но <b>не замества</b> параметризирането: името „O'Brien“ е законно и трябва да мине.</p>
  <div id="v-validate"></div>
</div>

<div class="block">
  <h3>Граница на буфера <span class="extra-tag">разширение</span></h3>
  <p class="prose">Същият принцип на ниво памет: ако копирането не знае размера на буфера, данните излизат извън него и повреждат съседни данни (<dfn data-g="препълване на буфер">препълване на буфер</dfn>). Защитата е проверка на границите при <b>всяко</b> писане и явно съобщаване на отрязването.</p>
  <div id="stack-svg"></div>
  <div id="v-copy"></div>
</div>

<div class="block">
  <h3>Схеми 12 и 14. XSS и CSRF — различен механизъм</h3>
  <p class="prose"><dfn data-g="xss">XSS</dfn> изпълнява недоверено съдържание като код в контекста на сайт. <dfn data-g="csrf">CSRF</dfn> предизвиква действие чрез браузъра на вече удостоверен потребител. При XSS проблемът е доверие в <b>съдържание</b>; при CSRF — доверие в <b>произход и намерение</b> на заявката.</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th></th><th>XSS</th><th>CSRF</th></tr>
    <tr><td>На какво се доверява системата погрешно</td><td>на съдържание</td><td>на произхода и намерението на заявката</td></tr>
    <tr><td>Какво се случва</td><td>недоверен код се изпълнява в браузърния контекст на сайта</td><td>браузърът изпраща нежелана заявка с наличните удостоверителни данни</td></tr>
    <tr><td>Защита</td><td>контекстно кодиране на изхода, безопасни <dfn data-g="dom">DOM</dfn> операции, ограничения на изпълнението</td><td>проверка на заявката, CSRF токени, правила за cookies</td></tr>
  </table></div>
  <details class="trap"><summary>Капан: мерките не са взаимозаменяеми</summary><div><p>Контекстното кодиране не решава CSRF, а CSRF токенът не решава XSS. Двата проблема могат да се съчетават — затова са нужни и двете мерки.</p></div></details>
</div>

<div class="block">
  <h3>Схема 13. Парола, сесия и права</h3>
  <p class="prose">Паролата е дългосрочно доказателство; <dfn data-g="сесиен идентификатор">сесийният токен</dfn> представлява вече установен достъп — кражбата му може да позволи действия без повторно въвеждане на паролата. Правата са трето, отделно нещо. Сесията изисква ограничен срок, правилна защита на cookies и прекратяване при съответни събития.</p>
  <div id="sess-svg"></div>
</div>

<div class="block">
  <h3>Атаки срещу пароли: признаци</h3>
  <p class="prose">Пробване на много кандидати, повторна употреба на изтекли комбинации и пръскане на малко чести пароли срещу много акаунти се различават по <b>организация</b> — и по признака в <dfn data-g="дневник">дневника</dfn>.</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Вид</th><th>Признак в дневника</th><th>Мярка</th></tr>
    <tr><td>Много кандидати срещу един акаунт</td><td>много неуспешни опити за един акаунт</td><td>забавяне/заключване, MFA</td></tr>
    <tr><td>Повторна употреба на изтекли комбинации</td><td>успешни входове от необичайни места</td><td>уникални пароли, MFA, проверка срещу изтекли списъци</td></tr>
    <tr><td>Малко чести пароли срещу много акаунти</td><td>по един-два неуспеха в много акаунти</td><td>забрана на честите пароли, наблюдение по източник</td></tr>
  </table></div>
  <div id="v-pw"></div>
  <details class="hint"><summary>Хинт: какво постига солта</summary><div><p><dfn data-g="сол">Солта</dfn> е случайна и уникална за всеки запис. Две еднакви пароли получават различни съхранени стойности, затова изтекла база не показва кои потребители са с еднаква парола и предварително изчислени таблици не работят. Солта не прави слабата парола силна. Реалните схеми използват специални бавни функции — тема 10.</p></div></details>
</div>

<div class="block">
  <h3>Многофакторно удостоверяване: независими категории</h3>
  <p class="prose"><dfn data-g="mfa">MFA</dfn> съчетава независими категории — знание, притежание, биометрично свойство. Избери два „фактора“ и виж дали са наистина два.</p>
  <div class="row" id="mfa-btn"></div>
  <div class="key" id="mfa-detail"></div>
  <details class="trap"><summary>Капан: две пароли = два фактора?</summary><div><p>Не — две различни пароли остават един вид фактор (знание). И още: многофакторността не е общо доказателство срещу всеки вид фишинг.</p></div></details>
</div>`;

  function mount(root) {
    // SQL диаграма — концептуална
    const sb = root.querySelector("#sql-btn"), ss = root.querySelector("#sql-svg"), sd = root.querySelector("#sql-detail");
    const MODES = [
      ["Конкатенация (проблем)", "Входът се залепя в текста на заявката. Анализаторът на SQL получава <b>един текст</b> и не знае коя част е от програмиста и коя от потребителя — входът може да промени структурата."],
      ["Параметризиране (защита)", "Структурата е фиксирана с <code>?</code>; стойността се подава <b>отделно</b> от нея — при сървърна подготовка в отделно поле на протокола, а при емулация драйверът я вмъква като коректно екраниран литерал — и не може да промени синтаксиса. Каквото и да съдържа входът, той остава една стойност."],
    ];
    const sbs = MODES.map((m, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => psql(i), text: m[0] }));
    sb.append(...sbs);
    function psql(i) {
      sbs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      ss.innerHTML = "";
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 680 170", width: 680 });
      const box = (x, y, w, t, c) => { svg.append(S.svg("g", { class: "node " + c }, S.svg("rect", { x, y, width: w, height: 40, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }))); svg.append(S.svg("text", { x: x + w / 2, y: y + 25, "text-anchor": "middle", text: t })); };
      const arr = (x1, y1, x2, y2, c) => svg.append(S.svg("line", { class: "edge " + (c || ""), x1, y1, x2, y2 }));
      box(10, 20, 170, "код на програмиста", "s-done");
      box(10, 110, 170, "вход на потребителя", "s-swap");
      if (i === 0) {
        box(250, 65, 170, "един SQL текст", "s-cmp");
        arr(180, 40, 250, 80); arr(180, 130, 250, 95, "s-swap");
        box(490, 65, 180, "анализатор на SQL", "s-act");
        arr(420, 85, 490, 85);
        svg.append(S.svg("text", { x: 335, y: 135, "text-anchor": "middle", class: "wt", text: "границата код/данни е изгубена" }));
      } else {
        box(250, 20, 170, "структура с ?", "s-done");
        box(250, 110, 170, "стойност (параметър)", "s-piv");
        arr(180, 40, 250, 40); arr(180, 130, 250, 130, "s-piv");
        box(490, 20, 180, "анализатор на SQL", "s-act");
        box(490, 110, 180, "само като стойност", "s-piv");
        arr(420, 40, 490, 40); arr(420, 130, 490, 130, "s-piv");
      }
      ss.append(h("div", { class: "tbl-wrap" }, svg));
      sd.innerHTML = `<p>${MODES[i][1]}</p>`;
      if (i === 1) S.codeView(sd, "ch05_validate", "bind");
    }
    psql(1);

    S.viz(root.querySelector("#v-validate"), {
      id: "validate", title: "Валидиране по списък от разрешени символи", sub: "Разрешени: латински букви, интервал, тире, апостроф.",
      code: "ch05_validate",
      inputs: [{ id: "s", label: "име", value: "O'Brien", width: "16em" }, { id: "maxlen", label: "макс. дължина", type: "number", value: 20, width: "5em" }],
      presets: [{ label: "Ivan", values: { s: "Ivan" } }, { label: "Anna-Maria", values: { s: "Anna-Maria" } }, { label: "с цифра", values: { s: "Ivan2" } }, { label: "с ;", values: { s: "Ivan;" } }, { label: "празно", values: { s: "" } }, { label: "дълго", values: { s: "Petar Petrov Ivanov Georgiev" } }],
      legend: [["s-act", "проверява се"], ["s-done", "разрешен"], ["s-swap", "отхвърлен"]],
      build: algos.validate,
      draw(st, f) {
        if (!f.chars.length) { st.innerHTML = '<p class="muted">Празен вход.</p>'; return; }
        const cls = {};
        f.chars.forEach((_, k) => { if (f.i != null && k < f.i) cls[k] = "s-done"; });
        if (f.i != null) cls[f.i] = f.ok === false ? "s-swap" : f.ok ? "s-done" : "s-act";
        if (f.res === 0) f.chars.forEach((_, k) => (cls[k] = "s-done"));
        S.drawArray(st, f.chars.map((c) => (c === " " ? "␣" : c)), { cls, ptr: f.i != null ? { i: f.i } : {} });
        if (f.res != null) st.append(h("p", null, h("span", { class: "pill " + (f.res ? "s-swap" : "s-done"), text: VRES[f.res] })));
      },
    });

    // стек — концептуална диаграма
    const sk = root.querySelector("#stack-svg");
    const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 640 110", width: 640 });
    for (let k = 0; k < 12; k++) {
      const x = 20 + k * 50, nb = k >= 8;
      svg.append(S.svg("g", { class: "node " + (nb ? "s-piv" : "") }, S.svg("rect", { x, y: 30, width: 46, height: 40, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 1.5 })));
      svg.append(S.svg("text", { x: x + 23, y: 90, "text-anchor": "middle", class: "wt", text: k }));
    }
    svg.append(S.svg("text", { x: 220, y: 20, "text-anchor": "middle", text: "буфер dst[8]" }), S.svg("text", { x: 518, y: 20, "text-anchor": "middle", text: "съседни данни" }));
    svg.append(S.svg("line", { x1: 418, y1: 25, x2: 418, y2: 78, stroke: "var(--st-swap)", "stroke-width": 3 }));
    svg.append(S.svg("text", { x: 418, y: 106, "text-anchor": "middle", class: "wt", text: "граница: не се пише отвъд" }));
    sk.append(h("div", { class: "tbl-wrap" }, svg));

    S.viz(root.querySelector("#v-copy"), {
      id: "copy", title: "copy_checked: копиране с проверка на границите", sub: "Последната клетка е запазена за завършващата нула.",
      code: "ch05_copy",
      inputs: [{ id: "src", label: "вход", value: "Ivanov_Petrov", width: "14em" }, { id: "cap", label: "вместимост cap", type: "number", value: 8, width: "5em" }],
      presets: [{ label: "Ivan", values: { src: "Ivan" } }, { label: "Petrova (точно)", values: { src: "Petrova" } }, { label: "дълъг вход", values: { src: "AAAAAAAAAAAA" } }],
      legend: [["s-act", "текуща позиция"], ["s-done", "записано"], ["s-piv", "нула"], ["s-swap", "отрязано (не е записано)"]],
      build: algos.copy,
      draw(st, f) {
        const cls = {};
        f.buf.forEach((v, k) => { if (v != null) cls[k] = v === "\\0" ? "s-piv" : "s-done"; });
        if (f.w != null) cls[f.w] = f.buf[f.w] === "\\0" ? "s-piv" : "s-act";
        S.drawArray(st, f.buf.map((v) => (v == null ? "" : v)), { cls, ptr: f.i != null && f.i < f.cap ? { i: f.i } : {} });
        const rest = f.src.slice(f.cap - 1);
        if (f.done && f.cut) st.append(h("p", { class: "warn", text: `Не е записано: „${rest}“ — извикващият получава −1.` }));
      },
    });

    // сесия
    const ses = root.querySelector("#sess-svg");
    const g = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 660 110", width: 660 });
    [["парола", "дългосрочна тайна", 10, "s-act"], ["сесиен токен", "текущ достъп", 240, "s-cmp"], ["права", "разрешени действия", 470, "s-done"]].forEach(([t, s2, x, c], k) => {
      g.append(S.svg("g", { class: "node " + c }, S.svg("rect", { x, y: 20, width: 180, height: 50, rx: 6, fill: "var(--cb)", stroke: "var(--c)", "stroke-width": 2 })));
      g.append(S.svg("text", { x: x + 90, y: 42, "text-anchor": "middle", text: t }), S.svg("text", { x: x + 90, y: 60, "text-anchor": "middle", class: "wt", text: s2 }));
      if (k) g.append(S.svg("line", { class: "edge", x1: x - 50, y1: 45, x2: x, y2: 45 }));
    });
    g.append(S.svg("text", { x: 330, y: 100, "text-anchor": "middle", class: "wt", text: "три различни части: кражба на токена заобикаля паролата, но не и проверката на правата" }));
    ses.append(h("div", { class: "tbl-wrap" }, g));

    S.viz(root.querySelector("#v-pw"), {
      id: "pw", title: "Груба оценка на парола и сол (концепция)", sub: "Учебен хеш FNV-1a — не е за реални пароли.",
      code: "ch05_pw",
      inputs: [{ id: "p", label: "парола", value: "Tr0ub4dor&3", width: "14em" }, { id: "salt", label: "сол", value: "q7Z1", width: "6em" }],
      presets: [{ label: "честа", values: { p: "parola" } }, { label: "кратка", values: { p: "abc" } }, { label: "дълга фраза", values: { p: "correct horse battery" } }, { label: "друга сол", values: { p: "parola", salt: "Lm40" } }, { label: "без сол", values: { p: "parola", salt: "" } }],
      legend: [["s-done", "наличен клас"], ["s-dim", "липсващ клас"], ["s-swap", "честа парола"]],
      build: algos.pw,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "row" });
        if (f.weak) row.append(h("span", { class: "pill s-swap", text: "в списъка с чести пароли" }));
        if (f.cls) [["lo", "a–z (26)"], ["up", "A–Z (26)"], ["di", "0–9 (10)"], ["ot", "други (33)"]].forEach(([k, t]) => row.append(h("span", { class: "pill " + (f.cls[k] ? "s-done" : "s-dim"), text: t })));
        st.append(row);
        if (f.bits != null) {
          const pc = Math.min(100, (f.bits / 100) * 100);
          st.append(h("div", { style: { marginTop: "10px", height: "14px", background: "var(--panel-2)", borderRadius: "7px", overflow: "hidden", maxWidth: "480px" } },
            h("div", { style: { width: pc + "%", height: "100%", background: f.bits < 40 ? "var(--st-swap)" : f.bits < 70 ? "var(--st-cmp)" : "var(--st-done)" } })));
          st.append(h("p", { class: "mono", text: `≈ ${f.bits.toFixed(1)} бита` }));
        }
        if (f.hs != null) st.append(h("p", { class: "mono", text: `запис = ${f.salt ? f.salt + ":" : ""}${hex8(f.hs)}` }));
      },
    });

    // MFA
    const mb = root.querySelector("#mfa-btn"), md = root.querySelector("#mfa-detail");
    let sel = [0, 1];
    const mbs = FACT.map((f, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => { sel = [sel[1], i]; upd(); }, text: f[0] }));
    mb.append(...mbs);
    function upd() {
      mbs.forEach((b, j) => b.setAttribute("aria-pressed", sel.includes(j) ? "true" : "false"));
      const [a, b] = sel.map((k) => FACT[k]);
      const same = a[1] === b[1];
      md.innerHTML = sel[0] === sel[1] ? "<p>Избери два различни елемента.</p>" : `<p>${a[0]} (<b>${a[1]}</b>) + ${b[0]} (<b>${b[1]}</b>) → ${same ? "<span class='pill s-swap'>една категория — не е многофакторно</span>" : "<span class='pill s-done'>две независими категории</span>"}</p>`;
    }
    upd();
  }

  S.chapter({ id: "prilozhenia", order: 5, num: "5", group: "Приложения и хора", title: "Атаки срещу приложения и акаунти", lead: "Код срещу данни (SQL инжекция и параметри), граници на буфера, XSS срещу CSRF, парола–сесия–права и независимите фактори.", html, mount, algos });
})();
