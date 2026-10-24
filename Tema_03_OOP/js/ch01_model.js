/* Раздел 1 — Обектният модел: клас и обект, разположение в паметта, капсулиране, инвариант, достъп. */
(function () {
  const S = window.Study, h = S.h;

  /* размер и подравняване за x86-64 (System V / Itanium C++ ABI) — същите като в 01_model.cpp */
  const TY = { char: [1, 1], bool: [1, 1], short: [2, 2], int: [4, 4], float: [4, 4], long: [8, 8], "long long": [8, 8], double: [8, 8], "void*": [8, 8], vptr: [8, 8] };
  const STRUCTS = {
    P1: { f: [["char", "a"], ["double", "b"], ["int", "c"]] },
    P2: { f: [["double", "b"], ["int", "c"], ["char", "a"]] },
    P3: { f: [["char", "a"], ["char", "b"], ["short", "s"], ["int", "i"]] },
    P4: { f: [["vptr", "vptr"], ["char", "a"], ["int", "c"]], poly: true },
    P5: { f: [["bool", "f"], ["long long", "x"], ["char", "z"], ["short", "w"]] },
    P6: { f: [] },
  };

  const algos = {
    /** Разполагане на полетата: отместване = следващото кратно на подравняването; размер = кратно на най-голямото подравняване. */
    layout({ which, fields, poly }) {
      let def, name = which, custom = which === "custom";
      if (custom) {
        const parts = String(fields).split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
        if (parts.length > 10) throw new Error("Най-много 10 полета.");
        const f = parts.map((p, k) => {
          const t = p.replace(/\s+/g, " ");
          if (!TY[t] || t === "vptr") throw new Error(`Непознат тип „${p}“. Допустими: char, bool, short, int, float, long, long long, double, void*.`);
          return [t, String.fromCharCode(97 + k)];
        });
        def = { f: poly ? [["vptr", "vptr"]].concat(f) : f, poly: !!poly };
        name = "Mine";
      } else {
        def = STRUCTS[which];
        if (!def) throw new Error("Непозната структура.");
      }
      const F = [], bytes = [];   // bytes[i] = {f: име, t: тип} или {pad:true}
      let off = 0, maxA = 1, pads = 0;
      const tag = (s) => (custom ? null : `${which}${s}`);
      const snap = () => bytes.map((b) => Object.assign({}, b));
      F.push({ at: tag(""), bytes: [], cur: null, vars: { offset: 0, "max align": 1 }, stats: { padding: 0 },
        msg: `Започваме <code>struct ${name}</code> от отместване 0.${def.poly ? " Класът има виртуален метод — компилаторът добавя скрит указател <b>vptr</b> към <dfn data-g=\"виртуална таблица\">виртуалната таблица</dfn> като първо поле." : ""}${def.f.length ? "" : " Няма полета."}`, log: `struct ${name}` });
      def.f.forEach(([t, n]) => {
        const [sz, al] = TY[t];
        const pad = (al - (off % al)) % al;
        for (let k = 0; k < pad; k++) bytes.push({ pad: true });
        if (pad) pads += pad;
        const at = off + pad;
        for (let k = 0; k < sz; k++) bytes.push({ f: n, t, first: k === 0 });
        maxA = Math.max(maxA, al);
        F.push({ at: tag("_" + n), bytes: snap(), cur: n, vars: { поле: n, тип: t === "vptr" ? "скрит указател" : t, sizeof: sz, alignof: al, offset: at, "max align": maxA }, stats: { padding: pads },
          msg: pad ? `<code>${n}</code> (${t}) изисква адрес, кратен на ${al}. Текущото отместване ${off} не е — вмъкваме <b>${pad} байта padding</b>; <code>${n}</code> е на отместване <b>${at}</b>.`
            : `<code>${n}</code> (${t === "vptr" ? "vptr, 8 байта" : t}) — отместване ${off} е кратно на ${al}, поставяме го директно на <b>${at}</b>.`,
          log: `${n}: offset ${at}${pad ? ` (+${pad} padding)` : ""}` });
        off = at + sz;
      });
      let size = off;
      const tail = (maxA - (size % maxA)) % maxA;
      for (let k = 0; k < tail; k++) bytes.push({ pad: true });
      size += tail; pads += tail;
      let msg = tail ? `Краят е на ${off}, но размерът трябва да е кратен на най-голямото подравняване (${maxA}), за да е подравнен и всеки елемент на масив <code>${name}[n]</code> — добавяме <b>${tail} байта</b> в края. ` : "";
      if (size === 0) { size = 1; bytes.push({ pad: true, empty: true }); msg = "Празен клас: <code>sizeof</code> е поне 1, за да имат различните обекти различни адреси (различна идентичност). "; }
      const offs = {};
      let o = 0; bytes.forEach((b, k) => { if (b.first) offs[b.f] = k; o++; });
      F.push({ at: tag("_end"), bytes: snap(), cur: null, done: true, vars: { sizeof: size, "полезни байта": size - pads, padding: pads }, stats: { padding: pads },
        msg: msg + `<b>sizeof(${name}) = ${size}</b>, от които ${pads} байта padding.`, log: `sizeof = ${size}` });
      return { frames: F, size, offs, fields: def.f.map((x) => x[1]).filter((x) => x !== "vptr"), pads };
    },

    /** Сценарий с две сметки и указател p — същите проверки като Account в 01_model.cpp. */
    account({ script }) {
      const st = String(script).split(";").map((x) => x.trim()).filter(Boolean);
      if (st.length > 30) throw new Error("Най-много 30 операции.");
      const bal = { a: 0, b: 0 }, ADDR = { a: "0x1000", b: "0x1008" };
      let p = "a", rej = 0, eqval = null, same = null;
      const F = [];
      const snap = (o) => Object.assign({ bal: Object.assign({}, bal), p, stats: { отказани: rej } }, o);
      F.push(snap({ at: "decl", vars: { "a.balance": 0, "b.balance": 0, p: "&a" }, msg: "Два обекта от един <dfn data-g=\"клас\">клас</dfn> <code>Account</code>: всеки има <b>собствено</b> поле <code>balance</code>. <code>p</code> сочи <code>a</code>.", log: "Account a, b; p = &a" }));
      const V = () => ({ "a.balance": bal.a, "b.balance": bal.b, p: "&" + p });
      for (const s of st) {
        let m;
        const who = (x) => (x === "p" ? p : x);
        if ((m = s.match(/^(a|b|p)\s*(?:\.|->)\s*(deposit|withdraw)\s*\(\s*(-?\d+)\s*\)$/))) {
          if ((m[1] === "p") !== /->/.test(s)) throw new Error(`„${s}“: за p се пише p->, за a и b — точка.`);
          const o = who(m[1]), amt = Number(m[3]);
          if (Math.abs(amt) > 1e9) throw new Error("Сумата е твърде голяма.");
          const pre = m[2] === "deposit" ? "dep" : "wd";
          const via = m[1] === "p" ? ` (през <code>p</code> → <code>${o}</code>)` : "";
          F.push(snap({ at: pre, obj: o, vars: Object.assign(V(), { amount: amt, this: "&" + o }), msg: `<code>${s}</code>${via}: извиква се публичната операция върху обекта <code>${o}</code>. <code>this</code> = &amp;${o}.`, log: s }));
          const bad = m[2] === "deposit" ? amt <= 0 : amt <= 0 || amt > bal[o];
          F.push(snap({ at: pre + "_chk", obj: o, chk: true, vars: Object.assign(V(), { amount: amt }), msg: m[2] === "deposit" ? `Проверка на договора: <code>amount &lt;= 0</code>? ${amt} &lt;= 0 → <b>${amt <= 0}</b>.` : `Проверка: <code>amount &lt;= 0 || amount &gt; balance</code>? ${amt} &lt;= 0 или ${amt} &gt; ${bal[o]} → <b>${bad}</b>.` }));
          if (bad) {
            rej++;
            F.push(snap({ at: pre + "_rej", obj: o, rejd: true, vars: V(), msg: `Отказ — връща <code>false</code>. Състоянието не се променя, <dfn data-g="инвариант">инвариантът</dfn> balance ≥ 0 е запазен.`, inv: { text: `${o}.balance = ${bal[o]} ≥ 0`, ok: true }, log: "  → false (отказ)" }));
          } else {
            bal[o] += m[2] === "deposit" ? amt : -amt;
            F.push(snap({ at: pre + "_do", obj: o, chg: true, vars: V(), msg: `<code>balance ${m[2] === "deposit" ? "+=" : "-="} ${amt}</code> → ${o}.balance = <b>${bal[o]}</b>. Другият обект не е засегнат.`, inv: { text: `${o}.balance = ${bal[o]} ≥ 0`, ok: true }, log: `  ${o}.balance = ${bal[o]}` }));
          }
        } else if ((m = s.match(/^p\s*=\s*&\s*(a|b)$/))) {
          p = m[1];
          F.push(snap({ at: "decl", vars: V(), msg: `<code>p</code> вече сочи <code>${p}</code>. Копира се <b>адресът</b> (${ADDR[p]}), не обектът.`, log: s }));
        } else if ((m = s.match(/^(a|b)\s*==\s*(a|b)$/))) {
          eqval = bal[m[1]] === bal[m[2]] ? 1 : 0;
          F.push(snap({ at: "eqval", cmpv: [m[1], m[2]], vars: Object.assign(V(), { "равни стойности": !!eqval }), msg: `Равенство на <b>стойности</b>: ${m[1]}.get() == ${m[2]}.get() → ${bal[m[1]]} == ${bal[m[2]]} → <b>${!!eqval}</b>. Смисълът на „равни“ се дефинира от класа.`, log: `${s} → ${!!eqval}` }));
        } else if ((m = s.match(/^(&\s*a|&\s*b|p)\s*==\s*(&\s*a|&\s*b|p)$/))) {
          const r = (x) => (x === "p" ? p : x.replace(/[&\s]/g, ""));
          same = r(m[1]) === r(m[2]) ? 1 : 0;
          F.push(snap({ at: "eqid", cmpi: [r(m[1]), r(m[2])], vars: Object.assign(V(), { "същият обект": !!same }), msg: `<b>Идентичност</b>: сравняват се адреси ${ADDR[r(m[1])]} и ${ADDR[r(m[2])]} → <b>${!!same}</b>. ${same ? "Това е един и същ обект." : "Два различни обекта — дори стойностите им да са равни."}`, log: `${s} → ${!!same}` }));
        } else if ((m = s.match(/^(a|b)\s*\.\s*balance\s*=\s*(-?\d+)$/))) {
          F.push(snap({ at: "priv", err: true, vars: V(), msg: `<code>${s}</code> — <b>грешка при компилация</b>: <code>balance</code> е private. Затова класът може да гарантира инварианта. (С <code>struct OpenAccount</code> с публично поле това се компилира и дава −100.)`, inv: { text: "клиентът не може да заобиколи договора", ok: true }, log: `${s} → не се компилира` }));
        } else if ((m = s.match(/^(a|b|p)\s*(?:\.|->)\s*get\s*\(\s*\)$/))) {
          const o = who(m[1]);
          F.push(snap({ at: "get", obj: o, vars: Object.assign(V(), { return: bal[o] }), msg: `<code>get()</code> е <code>const</code> метод — чете, без да променя обекта. Връща ${bal[o]}.`, log: `${s} → ${bal[o]}` }));
        } else throw new Error(`Неразпозната операция „${s}“. Примери: a.deposit(100); p->withdraw(30); p = &b; a == b; &a == &b; a.balance = -5; b.get()`);
      }
      const last = F[F.length - 1]; last.done = true;
      return { frames: F, result: `a=${bal.a} b=${bal.b} rej=${rej} eqval=${eqval} same=${same}`, a: bal.a, b: bal.b, rej, eqval, same };
    },

    /** Матрица на достъпа: кой код вижда кой член (по правилата на C++). */
    access() {
      const MEM = [["pub", 1], ["prot", 2], ["priv", 3]];
      const PL = [
        { k: "self", t: "метод на Base", ok: [1, 1, 1], why: ["свой член", "свой член", "свой член — private е достъпен вътре в класа"] },
        { k: "fr", t: "friend на Base", ok: [1, 1, 1], why: ["public е достъпен навсякъде", "приятелят има достъпа на класа", "приятелят има достъпа на класа"] },
        { k: "der", t: "метод на Derived", ok: [1, 1, 0], why: ["наследен public", "protected е достъпен от производен клас", "private на Base НЕ е достъпен в Derived — само поради наследяването"] },
        { k: "out", t: "външен код", ok: [1, 0, 0], why: ["public е договорът с клиента", "protected не е за клиента", "private не е за клиента"] },
      ];
      const F = [], sums = {};
      PL.forEach((P, pi) => {
        let sum = 0;
        MEM.forEach(([m, v], mi) => {
          const ok = P.ok[mi];
          if (ok) sum += v;
          const tg = { self: "self_", fr: "fr_", der: "der_", out: "out_" }[P.k] + m;
          F.push({ at: [tg, "m_" + m], pi, mi, vars: { код: P.t, член: m, достъп: ok ? "да" : "НЕ" }, stats: { "сума на достъпните": sum },
            msg: `${P.t} → <code>${m}</code>: <b>${ok ? "разрешен" : "грешка при компилация"}</b> — ${P.why[mi]}.`, log: `${P.t}: ${m} ${ok ? "✓" : "✗"}` });
        });
        sums[P.k] = sum;
      });
      F.push({ at: ["def_struct", "def_class"], pi: -1, mi: -1, done: true, vars: { "struct": "public по подразбиране", "class": "private по подразбиране" }, msg: "Единствената разлика между <code>struct</code> и <code>class</code> е достъпът по подразбиране (за членове и за наследяване). И двете могат да имат методи, конструктори и наследяване." });
      return { frames: F, result: `${sums.self} ${sums.fr} ${sums.der} ${sums.out}`, PL, MEM };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="oop">Обектно ориентираното програмиране</dfn> организира програмата чрез обекти, които съчетават състояние и поведение. <dfn data-g="клас">Класът</dfn> определя тип, неговите данни и допустимите операции. <dfn data-g="обект">Обектът</dfn> е конкретен екземпляр с живот и идентичност. Два обекта могат да съдържат равни стойности, без да са един и същ обект.</p>
  <p>Класовете и обектното моделиране имат исторически корени в Simula и в симулацията на взаимодействащи обекти. C++ развива тези идеи заедно с контрол върху ресурси и съвместимост с C. Затова „обект“ първо е модел на участник със състояние и поведение, а не задължителна кутия около всяка функция.</p>
</div>

<div class="block">
  <h3>Класът е тип, обектът заема памет</h3>
  <p class="prose">Класът сам по себе си не заема памет за данни — той описва <b>как</b> изглежда всеки обект. Обектът е конкретна област с размер <code>sizeof</code>. Компилаторът подравнява всяко поле и може да вмъква празни байтове (padding). При полиморфен клас добавя и скрит указател към <dfn data-g="виртуална таблица">виртуалната таблица</dfn>. <dfn data-g="статичен член">Статичните членове</dfn> не са в обекта.</p>
  <div id="v-layout"></div>
  <details class="hint"><summary>Хинт: защо P1 е 24, а P2 със същите полета е 16</summary><div>
    <p>В P1 <code>char a</code> е на 0, но <code>double b</code> изисква кратно на 8 → 7 байта padding; <code>int c</code> е на 16; краят 20 се закръгля до 24 (кратно на 8). В P2 полетата са подредени от голямо към малко: 8 + 4 + 1 = 13 → закръглено 16. Редът на полетата е част от проекта на класа, особено за firmware, където обектите се пазят в масиви или се предават по шина.</p>
    <p>Размерите тук са <b>измерени</b> от <code>01_model.cpp</code> (g++, x86-64). Друг ABI може да дава други числа.</p>
  </div></details>
  <details class="trap"><summary>Капан: „празният клас е с размер 0“</summary><div><p>Не — <code>sizeof(P6) = 1</code>. Два различни обекта трябва да имат различни адреси, т.е. различна идентичност.</p></div></details>
</div>

<div class="block">
  <h3>Абстракция, капсулиране, скриване на реализацията</h3>
  <div class="split">
    <div class="card"><h4><dfn data-g="абстракция">Абстракция</dfn></h4><p>Избира кои свойства са съществени за дадена употреба. За сметка — баланс и операции, не цвят на картата.</p></div>
    <div class="card"><h4><dfn data-g="капсулиране">Капсулиране</dfn></h4><p>Обединява данни и операции и контролира достъпа до вътрешното представяне.</p></div>
    <div class="card"><h4>Скриване на реализацията</h4><p>Позволява вътрешният механизъм да се смени при запазен публичен договор.</p></div>
  </div>
  <p class="prose">Трите понятия са свързани, но не са синоними: интерфейсът може да е абстрактен, без да разкрива как изобщо се съхраняват данните.</p>
</div>

<div class="block">
  <h3>Инвариант и капсулиране: Account</h3>
  <p class="prose"><dfn data-g="инвариант">Инвариантът</dfn> на класа е условие, изпълнено във всички допустими наблюдаеми състояния — тук <code>balance ≥ 0</code>. Публичните операции проверяват правилата и едва тогава променят частното състояние. Ако полето се променя свободно отвън (<code>OpenAccount</code>), класът не може да гарантира инварианта.</p>
  <div id="v-account"></div>
  <details class="hint"><summary>Хинт: равенство срещу идентичност</summary><div>
    <p><code>a == b</code> пита дали <b>стойностите</b> са равни — смисълът се дефинира от класа. <code>&amp;a == &amp;b</code> пита дали е <b>същият обект</b>. Копие на адрес не е копие на обекта: ако два указателя сочат един обект, промяната през единия е видима през другия (опитай <code>p = &amp;b; p-&gt;deposit(20); b.get()</code>).</p>
  </div></details>
  <details class="trap"><summary>Капан: „private защитава данните“</summary><div><p>private е правило за допустим достъп в езика. То не обещава шифроване, процесна изолация или защита срещу четене на паметта по друг начин (указател, дебъгер, memcpy). Капсулирането не е шифроване.</p></div></details>
</div>

<div class="block">
  <h3>public, protected, private — кой какво вижда</h3>
  <p class="prose">public определя публично достъпните членове; private ограничава достъпа до класа и неговите приятели; protected допуска достъп и от производни класове. При <code>class</code> достъпът по подразбиране е private, при <code>struct</code> — public. Щракни клетка от матрицата — визуализаторът прескача на нея и подсвечва реда.</p>
  <div class="tbl-wrap"><table class="t mx" id="acc-mx"></table></div>
  <div id="v-access"></div>
  <details class="trap"><summary>Капан: „struct не може да има методи или наследяване“</summary><div><p>Не е вярно. В C++ <code>struct</code> и <code>class</code> се различават само по достъпа по подразбиране.</p></div></details>
</div>

<div class="block">
  <h3>Статичен и динамичен тип</h3>
  <p class="prose">При <code>Base&amp; b = derived</code> <dfn data-g="статичен тип">статичният тип</dfn> на израза <code>b</code> е Base, а <dfn data-g="динамичен тип">динамичният тип</dfn> на обекта може да е Derived. Компилаторът проверява кои имена са достъпни през Base; при виртуално извикване динамичният тип определя крайната реализация, при невиртуално обикновено решава статичният контекст. Механизмът е показан стъпка по стъпка в <a href="#virtualni">раздел 4</a>.</p>
  <div class="key">Класът описва тип; обектите имат собствено състояние и идентичност. Промяна на <code>a.balance</code> не е промяна на <code>b.balance</code>. Статичните членове са отделен случай.</div>
</div>`;

  function drawMem(st, f) {
    st.innerHTML = "";
    if (!f.bytes.length) { st.append(h("p", { class: "muted", text: "Още няма байтове." })); return; }
    const box = h("div", { class: "mem" });
    f.bytes.forEach((b, k) => {
      let cls = "b ";
      if (b.pad) cls += "pad s-swap" + (b.empty ? " empty" : "");
      else if (b.f === "vptr") cls += "s-piv";
      else if (b.f === f.cur) cls += "s-act";
      else cls += f.done ? "s-done" : "";
      box.append(h("div", { class: cls, title: b.pad ? "padding" : `${b.f} (${b.t})` }, h("span", { class: "o", text: k % 4 === 0 ? k : "" }), b.pad ? "·" : b.first ? b.f : ""));
    });
    st.append(box, h("p", { class: "muted", style: { fontSize: ".8rem" }, text: "Всяка клетка е 1 байт; ред = 8 байта. Щриховано — padding." }));
  }

  function mount(root) {
    S.viz(root.querySelector("#v-layout"), {
      id: "layout", title: "Разположение на обекта в паметта", sub: "Измерено с g++ на x86-64 — не е езиков договор.",
      code: "ch01_layout",
      inputs: [{ id: "which", label: "структура", type: "select", value: "P1", options: [["P1", "P1: char, double, int"], ["P2", "P2: double, int, char"], ["P3", "P3: char, char, short, int"], ["P4", "P4: virtual + char, int"], ["P5", "P5: bool, long long, char, short"], ["P6", "P6: празна"], ["custom", "своя (полетата вдясно)"]] },
        { id: "fields", label: "свои полета (при „своя“)", value: "char, int, char, double", width: "17em" }, { id: "poly", label: "има virtual", type: "checkbox", value: false }],
      presets: [{ label: "Своя: лош ред", values: { which: "custom", fields: "char, double, char, double, char" } }, { label: "Своя: добър ред", values: { which: "custom", fields: "double, double, char, char, char" } }],
      legend: [["s-act", "текущо поле"], ["s-done", "поставено"], ["s-swap", "padding"], ["s-piv", "vptr"]],
      build: algos.layout, draw: drawMem,
    });

    S.viz(root.querySelector("#v-account"), {
      id: "account", title: "Две сметки, един клас", sub: "Операции, разделени с „;“. Публичните операции пазят инварианта balance ≥ 0.",
      code: "ch01_account",
      inputs: [{ id: "script", label: "сценарий", value: "a.deposit(100); b.deposit(100); a == b; &a == &b; p->withdraw(30); a.withdraw(500); b.deposit(-5)", width: "min(38em, 100%)" }],
      presets: [{ label: "Указател към b", values: { script: "a.deposit(50); p = &b; p->deposit(20); p->withdraw(20); a == b; p == &b" } },
        { label: "Опит за пряк достъп", values: { script: "a.deposit(10); a.balance = -100; a.get()" } }],
      legend: [["s-act", "обект на операцията"], ["s-cmp", "проверка"], ["s-done", "промяна"], ["s-swap", "отказ / грешка"]],
      build: algos.account,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "objs" });
        ["a", "b"].forEach((o) => {
          let cls = "";
          if (f.obj === o) cls = f.rejd ? "s-swap" : f.chg ? "s-done" : f.chk ? "s-cmp" : "s-act";
          if ((f.cmpv && f.cmpv.includes(o)) || (f.cmpi && f.cmpi.includes(o))) cls = "s-cmp";
          row.append(h("div", { class: "obj " + cls },
            h("div", { class: "oh" }, h("span", { text: "Account " + o }), h("span", { class: "ad", text: o === "a" ? "0x1000" : "0x1008" })),
            h("div", { class: "orow" + (f.err ? " s-swap" : "") }, h("span", { text: "private balance" }), h("b", { text: String(f.bal[o]) })),
            f.p === o ? h("div", { class: "orow s-piv" }, h("span", { text: "← p сочи тук" })) : null));
        });
        st.append(row);
        if (f.err) st.append(h("p", { class: "warn", text: "error: 'long Account::balance' is private within this context" }));
      },
    });

    const A = algos.access();
    const mx = root.querySelector("#acc-mx");
    let vAcc;
    mx.append(h("tr", null, h("th", { text: "код \\ член" }), ...A.MEM.map(([m]) => h("th", null, h("code", { text: m })))));
    const cells = [];
    A.PL.forEach((P, pi) => {
      const tr = h("tr", null, h("th", { text: P.t }));
      A.MEM.forEach((_, mi) => {
        const k = pi * 3 + mi;
        const td = h("td", { class: P.ok[mi] ? "ok" : "no" }, h("button", { class: "cellbtn", "aria-label": `${P.t}, ${A.MEM[mi][0]}`, text: P.ok[mi] ? "✓" : "✗", onclick: () => { vAcc.go(k); } }));
        cells.push(td); tr.append(td);
      });
      mx.append(tr);
    });
    vAcc = S.viz(root.querySelector("#v-access"), {
      id: "access", title: "Проверка на достъпа клетка по клетка", sub: "Всяка стъпка е един опит за достъп от <code>01_model.cpp</code>.",
      code: "ch01_access", build: () => algos.access(),
      draw(st, f) {
        cells.forEach((c, k) => c.classList.toggle("cur", k === f.pi * 3 + f.mi));
        st.innerHTML = "";
        if (f.pi < 0) { st.append(h("p", { html: "<code>struct S { int x; }</code> → x е public; <code>class K { int x; }</code> → x е private." })); return; }
        const P = A.PL[f.pi], ok = P.ok[f.mi];
        st.append(h("div", { class: "objs" },
          h("div", { class: "obj s-act" }, h("div", { class: "oh", text: P.t })),
          h("div", { class: "ar", style: { alignSelf: "center", font: "700 18px var(--f-mono)" }, text: "→" }),
          h("div", { class: "obj " + (ok ? "s-done" : "s-swap") }, h("div", { class: "oh", text: "Base::" + A.MEM[f.mi][0] }), h("div", { class: "orow", text: ok ? "достъпен" : "грешка при компилация" }))));
      },
    });
  }

  S.chapter({ id: "model", order: 1, num: "1", group: "Основа", title: "Обектният модел", lead: "Клас и обект, разположение на обекта в паметта, капсулиране и инвариант, правила за достъп.", html, mount, algos });
})();
