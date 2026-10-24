/* Раздел 2 — стек: динамичен масив с удвояване, амортизация, скоби, постфиксен израз. */
(function () {
  const S = window.Study, h = S.h;

  function parseProg(str, spec, maxOps = 40) {
    const parts = String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > maxOps) throw new Error(`Най-много ${maxOps} операции.`);
    return parts.map((p) => {
      const t = p.replace(/[()]/g, " ").trim().split(/\s+/);
      const nm = t[0].toLowerCase();
      const key = Object.keys(spec).find((k) => k === nm || (spec[k].alias || []).includes(nm));
      if (!key) throw new Error(`Непозната операция „${t[0]}“. Допустими: ${Object.keys(spec).join(", ")}.`);
      const args = t.slice(1).map((x) => { const v = Number(x); if (!Number.isInteger(v) || Math.abs(v) > 9999) throw new Error(`„${x}“ в „${p}“ не е цяло число между −9999 и 9999.`); return v; });
      if (args.length !== spec[key].args) throw new Error(`„${key}“ очаква ${spec[key].args ? spec[key].args + " аргумент" : "без аргументи"}: „${p}“.`);
      return { name: key, args, text: p };
    });
  }

  const algos = {
    /** Стек върху динамичен масив с удвояване — стъпка по стъпка, включително копирането. */
    dyn({ prog, cap0 }) {
      const ops = parseProg(prog, { push: { args: 1 }, pop: { args: 0 }, top: { args: 0, alias: ["peek"] } });
      cap0 = S.int(cap0, 1, 8, "Начален капацитет");
      let a = new Array(cap0).fill(null), size = 0, cap = cap0, copies = 0, grows = 0;
      const out = [], F = [];
      const st = () => ({ size, cap, копирания: copies, удвоявания: grows });
      const snap = (o) => F.push(Object.assign({ a: a.slice(), size, cap, out: out.slice(), vars: { size, cap }, stats: st() }, o));
      snap({ msg: `Празен стек: size = 0, cap = ${cap0}.` });
      ops.forEach((op, k) => {
        if (op.name === "push") {
          const x = op.args[0];
          snap({ at: "full", hi: { [size]: "s-cmp" }, msg: `push(${x}): size == cap? ${size} == ${cap} → <b>${size === cap}</b>.`, log: `${k + 1}. ${op.text}` });
          if (size === cap) {
            const ncap = cap * 2, b = new Array(ncap).fill(null);
            snap({ at: "grow", b: b.slice(), msg: `Няма място: заделяме нов масив с ncap = 2·cap = ${ncap}. Това е <b>геометричен</b> растеж.` });
            for (let i = 0; i < size; i++) {
              b[i] = a[i]; copies++;
              snap({ at: "copy", b: b.slice(), hi: { [i]: "s-cmp" }, bhi: { [i]: "s-done" }, vars: { size, cap, ncap, i }, msg: `Копиране b[${i}] = a[${i}] = ${a[i]}. (Всяко копиране е Θ(1); общо Θ(size) за това push.)` });
            }
            a = b; cap = ncap; grows++;
            snap({ at: "swapbuf", msg: `free(стария); a = b; cap = ${cap}. Цената на това единично push е ${size} копирания + 1 запис.` });
          }
          a[size] = x; size++;
          snap({ at: "push", hi: { [size - 1]: "s-done" }, msg: `a[${size - 1}] = ${x}; size = ${size}.` });
        } else {
          snap({ at: "empty", msg: `${op.name}(): size == 0? → <b>${size === 0}</b>.`, log: `${k + 1}. ${op.text}` });
          if (size === 0) { out.push("E"); snap({ at: "empty", hi: {}, msg: `Празен стек: по договора връщаме <b>-1</b> (грешка), не произволна стойност.` }); return; }
          if (op.name === "pop") {
            size--; const v = a[size]; out.push(String(v));
            snap({ at: "pop", hi: { [size]: "s-swap" }, ghost: size, msg: `*out = a[--size] = <b>${v}</b>. Капацитетът не намалява.` });
          } else {
            out.push(String(a[size - 1]));
            snap({ at: "top", hi: { [size - 1]: "s-cmp" }, msg: `top: a[size−1] = <b>${a[size - 1]}</b>, без премахване.` });
          }
        }
      });
      snap({ done: true, msg: `Край. Изход: <b>${out.join(" ") || "—"}</b>. size = ${size}, cap = ${cap}, копирания = ${copies}, удвоявания = ${grows}.` });
      return { frames: F, out: out.join(" ") || "-", size, cap, copies, grows };
    },

    /** Амортизация: m последователни push при начален капацитет 1. */
    amort({ m }) {
      m = S.int(m, 1, 1024, "m");
      let cap = 1, size = 0, copies = 0, grows = 0;
      const cost = [], F = [];
      for (let i = 0; i < m; i++) {
        let c = 1, grew = false;
        if (size === cap) { c += size; copies += size; cap *= 2; grows++; grew = true; }
        size++; cost.push(c);
        F.push({ at: grew ? ["grow", "push"] : "push", cost: cost.slice(), stats: { "push-а": i + 1, копирания: copies, "общо (запис+копиране)": copies + size, "граница 3m": 3 * size, "средно за push": ((copies + size) / size).toFixed(2) }, vars: { size, cap }, msg: grew ? `push №${i + 1}: пълно → копираме ${c - 1} елемента; единичната цена е ${c}. Средната цена до момента е ${((copies + size) / size).toFixed(2)}.` : `push №${i + 1}: има място → цена 1.`, log: grew ? `push ${i + 1}: удвояване до ${cap}, ${c - 1} копирания` : null });
      }
      F[F.length - 1].msg += ` Общо копирания ${copies} &lt; 2m = ${2 * m}: геометричната сума 1 + 2 + 4 + … е по-малка от удвоения последен член.`;
      return { frames: F, copies, grows };
    },

    /** Проверка на скоби. */
    brackets({ s }) {
      s = String(s);
      if (s.length > 60) throw new Error("Най-много 60 символа.");
      const F = [], st = [], OPEN = "([{", CLOSE = ")]}";
      const snap = (o) => F.push(Object.assign({ s, st: st.slice(), vars: { top: st.length } }, o));
      snap({ at: "init", i: -1, msg: "Празен стек: top = 0." });
      let i;
      for (i = 0; i < s.length; i++) {
        const c = s[i];
        if (OPEN.includes(c)) {
          st.push(c);
          snap({ at: ["loop", "push"], i, cls: "s-done", msg: `„${c}“ е отваряща → push. Стекът пази незатворените отварящи скоби.`, log: `${i}: ${c} push` });
        } else if (CLOSE.includes(c)) {
          const want = OPEN[CLOSE.indexOf(c)];
          if (!st.length) { snap({ at: ["loop", "underflow"], i, cls: "s-swap", bad: true, msg: `„${c}“ е затваряща, но стекът е празен → <b>грешка на позиция ${i}</b>: няма отваряща.`, log: `${i}: ${c} — празен стек` }); return { frames: F, result: i }; }
          if (st[st.length - 1] !== want) { snap({ at: ["loop", "mismatch"], i, cls: "s-swap", bad: true, topBad: true, msg: `„${c}“ трябва да затвори „${want}“, но върхът е „${st[st.length - 1]}“ → <b>грешка на позиция ${i}</b>. Броят може да е еднакъв, но редът е грешен.`, log: `${i}: ${c} ≠ връх ${st[st.length - 1]}` }); return { frames: F, result: i }; }
          snap({ at: ["loop", "mismatch"], i, cls: "s-cmp", topHi: true, msg: `„${c}“ съвпада с върха „${want}“.` });
          st.pop();
          snap({ at: ["loop", "pop"], i, cls: "s-done", msg: `pop — „${want}“ е затворена.`, log: `${i}: ${c} pop` });
        } else snap({ at: "loop", i, cls: "s-dim", msg: `„${c}“ не е скоба — пропускаме.` });
      }
      const ok = st.length === 0;
      snap({ at: "end", i: s.length, bad: !ok, msg: ok ? "Край на низа и стекът е празен → <b>коректно</b> (-1). Θ(n) време, O(n) допълнителна памет." : `Край на низа, но в стека остават ${st.length} незатворени → <b>грешка</b> (позиция ${s.length} = дължината).` });
      return { frames: F, result: ok ? -1 : s.length };
    },

    /** Постфиксен израз. */
    postfix({ expr }) {
      const toks = String(expr).trim().split(/\s+/).filter(Boolean);
      if (!toks.length) throw new Error("Въведи израз, напр. 3 4 + 2 *");
      if (toks.length > 40) throw new Error("Най-много 40 лексеми.");
      toks.forEach((t) => { if (!/^[-+*/]$/.test(t) && !/^-?\d{1,6}$/.test(t)) throw new Error(`„${t}“ не е цяло число или операция + − * /. Лексемите се разделят с интервал.`); });
      const F = [], st = [];
      const snap = (o) => F.push(Object.assign({ toks, st: st.slice(), vars: { top: st.length } }, o));
      snap({ at: "init", i: -1, msg: "Чете се отляво надясно. Операндите отиват в стека; операцията взема двата горни." });
      const T = (x) => Math.trunc(x);
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if ("+-*/".includes(t) && t.length === 1) {
          if (st.length < 2) { snap({ at: ["loop", "underflow"], i, bad: true, msg: `Операция „${t}“ изисква два операнда, а в стека има ${st.length} → <b>грешка</b>.` }); return { frames: F, result: "E" }; }
          const b = st.pop();
          snap({ at: ["loop", "popb"], i, b, msg: `pop → b = ${b} (десният операнд е отгоре!).` });
          const a = st.pop();
          snap({ at: ["loop", "popa"], i, a, b, msg: `pop → a = ${a}.` });
          if (t === "/" && b === 0) { snap({ at: ["loop", "apply"], i, bad: true, msg: "Деление на 0 → <b>грешка</b>." }); return { frames: F, result: "E" }; }
          const r = t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : T(a / b);
          snap({ at: ["loop", "apply"], i, a, b, msg: `r = a ${t} b = ${a} ${t} ${b} = <b>${r}</b>.${t === "/" ? " (Целочислено деление, отрязване към 0 — както в C.)" : ""}` });
          st.push(r);
          snap({ at: ["loop", "pushr"], i, hiTop: true, msg: `push(${r}).`, log: `${a} ${t} ${b} = ${r}` });
        } else {
          st.push(Number(t));
          snap({ at: ["loop", "push"], i, hiTop: true, msg: `${t} е операнд → push.`, log: `push ${t}` });
        }
      }
      if (st.length !== 1) { snap({ at: "end", i: toks.length, bad: true, msg: `В края в стека има ${st.length} стойности вместо 1 → <b>грешка</b> (излишни операнди).` }); return { frames: F, result: "E" }; }
      snap({ at: ["end", "ret"], i: toks.length, done: true, msg: `В стека остава точно една стойност: резултат <b>${st[0]}</b>.` });
      return { frames: F, result: st[0] };
    },
  };

  /* ---------- рисуване ---------- */
  function stackCol(items, o = {}) {
    const col = h("div", { class: "t4stack" });
    items.forEach((v, i) => {
      const top = i === items.length - 1;
      const c = h("div", { class: "cell " + ((top && o.topCls) || ""), style: { width: o.w || "64px", height: "32px" } }, String(v));
      if (top) c.append(h("span", { class: "ix", style: { bottom: "auto", top: "8px", left: "calc(100% + 6px)" }, text: "← връх" }));
      col.append(c);
    });
    if (!items.length) col.append(h("div", { class: "muted", style: { fontSize: ".8rem" }, text: "(празен)" }));
    return h("div", { class: "t4col" }, h("span", { class: "t4cap", text: o.cap || "стек" }), h("div", { style: { borderLeft: "2px solid var(--line)", borderRight: "2px solid var(--line)", borderBottom: "2px solid var(--line)", padding: "4px", width: "max-content", paddingRight: "70px" } }, col));
  }

  function drawDyn(st, f) {
    st.innerHTML = "";
    const cls = {};
    f.a.forEach((v, i) => { if (i >= f.size) cls[i] = "s-dim"; });
    Object.assign(cls, f.hi || {});
    const row = h("div", { class: "t4col" }, h("span", { class: "t4cap", text: `a[] · cap = ${f.cap}` }));
    const show = f.a.map((v, i) => (i < f.size || i === f.ghost ? v : null));
    S.drawArray(row, show, { cls, append: true, ptr: f.size ? { "връх": f.size - 1 } : {} });
    st.append(row);
    if (f.b) {
      const r2 = h("div", { class: "t4col" }, h("span", { class: "t4cap", text: `нов b[] · ncap = ${f.b.length}` }));
      const bc = {}; f.b.forEach((v, i) => { if (v == null) bc[i] = "s-dim"; }); Object.assign(bc, f.bhi || {});
      S.drawArray(r2, f.b, { cls: bc, append: true });
      st.append(r2);
    }
    st.append(h("div", { class: "t4out" }, h("span", { class: "muted", text: "изход:" }), ...(f.out.length ? f.out.map((x) => h("span", { class: "pill " + (x === "E" ? "s-swap" : ""), text: x })) : [h("span", { class: "muted", text: "—" })])));
  }

  function drawAmort(st, f) {
    st.innerHTML = "";
    const cls = {}; cls[f.cost.length - 1] = f.cost[f.cost.length - 1] > 1 ? "s-swap" : "s-act";
    f.cost.forEach((c, i) => { if (i < f.cost.length - 1 && c > 1) cls[i] = "s-cmp"; });
    st.append(h("span", { class: "t4cap", text: "цена на всяко push (1 запис + копирания)" }));
    S.drawBars(st, f.cost, { cls, height: 150, labelsUpTo: 20, append: true, title: (v, k) => `push ${k + 1}: ${v}` });
  }

  function drawBr(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const cells = f.s.length ? f.s.split("") : [""];
    const cls = {};
    for (let k = 0; k < f.i && k < f.s.length; k++) cls[k] = "s-dim";
    if (f.i >= 0 && f.i < f.s.length) cls[f.i] = f.cls || "s-act";
    const left = h("div", { class: "t4col t4scroll" }, h("span", { class: "t4cap", text: "низ" }));
    S.drawArray(left, cells, { cls, append: true, ptr: f.i >= 0 && f.i < f.s.length ? { i: f.i } : {} });
    row.append(left, stackCol(f.st, { cap: "стек от отварящи", topCls: f.topBad ? "s-swap" : f.topHi ? "s-cmp" : "", w: "44px" }));
    st.append(row);
    if (f.at === "end" || (Array.isArray(f.at) && f.bad)) st.append(h("p", { class: f.bad ? "warn" : "", style: { fontWeight: 600, color: f.bad ? "" : "var(--st-done)" }, text: f.bad ? "Некоректно" : "Коректно" }));
  }

  function drawPf(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const cls = {};
    for (let k = 0; k < f.i; k++) cls[k] = "s-dim";
    if (f.i >= 0 && f.i < f.toks.length) cls[f.i] = f.bad ? "s-swap" : "s-act";
    const left = h("div", { class: "t4col t4scroll" }, h("span", { class: "t4cap", text: "лексеми" }));
    S.drawArray(left, f.toks, { cls, append: true, ptr: f.i >= 0 && f.i < f.toks.length ? { i: f.i } : {} });
    if (f.a != null || f.b != null) left.append(h("div", { class: "t4out" }, h("span", { class: "pill s-cmp", text: "a = " + (f.a ?? "?") }), h("span", { class: "pill s-cmp", text: "b = " + (f.b ?? "?") })));
    row.append(left, stackCol(f.st, { cap: "стек от стойности", topCls: f.done ? "s-done" : f.hiTop ? "s-act" : "" }));
    st.append(row);
  }

  const html = `
<div class="prose">
  <p><dfn data-g="стек">Стекът</dfn> поддържа дисциплина <dfn data-g="lifo">LIFO</dfn>: последният добавен елемент е първият изваден. Основните операции са <dfn data-g="push">push</dfn> за добавяне, <dfn data-g="pop">pop</dfn> за премахване на върха, top или peek за прочитане без премахване и empty за проверка. Поведението при празен стек трябва да е определено: грешка, изключение или друг изричен резултат.</p>
  <p>LIFO описва реда, не задължителна посока на растеж на адресите. Машинният стек може да расте към по-ниски адреси; абстрактният стек няма такова изискване.</p>
</div>

<div class="block">
  <h3>Масивна реализация с удвояване (схеми 3 и 5)</h3>
  <p class="prose">При масивна реализация броячът size определя броя елементи, а върхът е на позиция size−1. Ако има <dfn data-g="капацитет">капацитет</dfn>, добавянето и премахването са Θ(1). При динамично увеличаване единично добавяне може да струва Θ(n) за прехвърляне на елементите, но при геометричен растеж амортизираната цена е Θ(1). Въведи своя програма — напр. <code>push 3, push 5, pop</code> — и гледай копирането при удвояване.</p>
  <div id="v2-dyn"></div>
  <details class="hint"><summary>Хинт: свързаният вариант</summary><div>
    <p>При свързана реализация върхът сочи първия възел. Нов възел се свързва пред стария първи; при pop първият се откача и освобождава. Структурните промени са Θ(1), но всяка алокация носи допълнителни разходи. Инвариантът изисква последователността от връзки да съвпада с реда за изваждане. Стъпките се виждат в <a href="#atd">раздел 1</a> (избери „свързаната реализация“).</p>
  </div></details>
</div>

<div class="block">
  <h3>Амортизирана цена: отделното push срещу цялата последователност</h3>
  <p class="prose">Ако капацитетът се удвоява, общият брой копирани елементи за m добавяния е ограничен от геометрична сума и е O(m). <dfn data-g="амортизиран анализ">Амортизирана</dfn> O(1) цена означава O(1) на операция в цяла последователност; не означава гарантирана константна латентност на всяко отделно push.</p>
  <div id="v2-am"></div>
  <div class="key"><span class="formula">копирания при m push = 1 + 2 + 4 + … + 2^k &lt; 2m  ⇒  общо &lt; 3m  ⇒  амортизирано Θ(1)</span></div>
  <details class="trap"><summary>Капан: „push е O(1)“ в система за реално време</summary><div>
    <p>Амортизираната оценка е <b>последователностна</b>, не индивидуална времева гаранция. Отделно push, което удвоява от 512 на 1024, копира 512 елемента — високите ленти горе. Ако едно закъснение е недопустимо (прекъсване, RTOS задача), се използва фиксиран капацитет или предварително заделяне.</p>
    <p>Ако растежът е <b>аритметичен</b> (cap += k), сумата на копиранията е Θ(m²/k) и амортизираната цена вече не е константа.</p>
  </div></details>
</div>

<div class="block">
  <h3>Приложение: проверка на скоби (схема 4)</h3>
  <p class="prose">Стекът се използва за обработка на скоби, обход в дълбочина (<dfn data-g="dfs">DFS</dfn>) и история с връщане назад. При проверка на скоби отварящата се поставя в стека, а затварящата трябва да съвпада с върха. В края стекът трябва да е празен. Сложността е Θ(n) време и O(n) допълнителна памет.</p>
  <div id="v2-br"></div>
  <details class="trap"><summary>Капан: „броят отварящи и затварящи е еднакъв, значи е коректно“</summary><div>
    <p>При „([)]“ броят е еднакъв, но затварящата „)“ не съответства на върха „[“. Брояч не стига — стекът съхранява <b>вложеността</b>. Пробвай бутона „([)]“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Приложение: изчисляване на постфиксен израз</h3>
  <p class="prose">В постфиксния запис операцията стои след операндите си: (3 + 4) × 2 се записва <code>3 4 + 2 *</code>. Не са нужни скоби и приоритети: всеки операнд отива в стека, всяка операция сваля двата горни и връща резултата. Същият запис дава следредният обход на дърво за израз — виж <a href="#darvo">раздел 5</a>.</p>
  <div id="v2-pf"></div>
  <details class="hint"><summary>Хинт: защо първият pop е <i>десният</i> операнд</summary><div>
    <p>При <code>9 3 -</code> първо се добавя 9, после 3. LIFO връща първо 3 — затова b = 3, a = 9 и резултатът е a − b = 6. Ако се разменят, изваждането и делението дават грешен резултат; събирането и умножението не издават грешката, защото са комутативни.</p>
  </div></details>
</div>

<div class="block">
  <h3>Реални стекове</h3>
  <p class="prose">C++ <code>std::stack</code> е адаптер с операции push, pop и top; Python <code>list</code> може да се използва като стек чрез append и pop от края. И в двата случая дисциплината е LIFO. При <code>std::stack</code> <code>pop()</code> не връща стойност — стойността се чете с <code>top()</code> преди това; „pop връща или премахва“ зависи от API договора.</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v2-dyn"), {
      id: "c2dyn", title: "Стек върху динамичен масив", sub: "операции: <code>push x</code>, <code>pop</code>, <code>top</code>",
      code: "ch02_dyn",
      inputs: [{ id: "prog", label: "Програма", value: "push 4, push 7, push 2, top, pop, pop", width: "24em" }, { id: "cap0", label: "начален cap", type: "number", value: 1, width: "5em" }],
      presets: [
        { label: "push 3, push 5, pop", values: { prog: "push 3, push 5, pop", cap0: 2 } },
        { label: "9 × push", values: { prog: "push 1, push 2, push 3, push 4, push 5, push 6, push 7, push 8, push 9", cap0: 1 } },
        { label: "pop от празен", values: { prog: "pop, push 5, pop, pop", cap0: 2 } },
      ],
      random: () => { const a = []; let sz = 0; for (let i = 0; i < S.randInt(5, 10); i++) { if (sz && Math.random() < 0.35) { a.push("pop"); sz--; } else { a.push("push " + S.randInt(1, 99)); sz++; } } return { prog: a.join(", ") }; },
      legend: [["s-done", "записан"], ["s-cmp", "проверява се / копира се"], ["s-swap", "изваден"], ["s-dim", "свободна клетка"]],
      build: algos.dyn, draw: drawDyn,
    });
    S.viz(root.querySelector("#v2-am"), {
      id: "c2am", title: "m последователни push при начален капацитет 1", sub: "Червено — текущото push, оранжево — предишни удвоявания.",
      code: "ch02_dyn",
      inputs: [{ id: "m", label: "m (до 1024)", type: "number", value: 17, width: "6em" }],
      presets: [{ label: "m = 33", values: { m: 33 } }, { label: "m = 1000", values: { m: 1000 } }],
      build: algos.amort, draw: drawAmort, startAtEnd: true, speed: 2,
    });
    S.viz(root.querySelector("#v2-br"), {
      id: "c2br", title: "Проверка на скоби ( ) [ ] { }", sub: "Друг текст се пропуска.",
      code: "ch02_brackets",
      inputs: [{ id: "s", label: "Низ", value: "([])", width: "18em" }],
      presets: ["([)]", "(()", "())", "{[()()]}", "a(b[c]d)e"].map((x) => ({ label: x, values: { s: x } })),
      legend: [["s-act", "текущ символ"], ["s-done", "push / pop"], ["s-cmp", "сравнение с върха"], ["s-swap", "грешка"]],
      build: algos.brackets, draw: drawBr,
    });
    S.viz(root.querySelector("#v2-pf"), {
      id: "c2pf", title: "Постфиксен израз", sub: "Цели числа и + − * / , разделени с интервал.",
      code: "ch02_postfix",
      inputs: [{ id: "expr", label: "Израз", value: "3 4 + 2 *", width: "20em" }],
      presets: [{ label: "5 1 2 + 4 * + 3 −", values: { expr: "5 1 2 + 4 * + 3 -" } }, { label: "9 3 − 2 /", values: { expr: "9 3 - 2 /" } }, { label: "липсващ операнд", values: { expr: "1 +" } }, { label: "излишен операнд", values: { expr: "1 2" } }, { label: "деление на 0", values: { expr: "8 0 /" } }],
      legend: [["s-act", "текуща лексема"], ["s-cmp", "операнди a, b"], ["s-swap", "грешка"]],
      build: algos.postfix, draw: drawPf,
    });
  }

  S.chapter({ id: "stek", order: 2, num: "2", group: "Линейни структури", title: "Стек", lead: "LIFO. Масив с удвояване и амортизирана цена, проверка на скоби и изчисляване на постфиксен израз — стъпка по стъпка.", html, mount, algos });
})();
