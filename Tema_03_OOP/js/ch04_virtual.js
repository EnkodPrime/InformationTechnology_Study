/* Раздел 4 — Полиморфизъм и виртуални методи: vtable, статично/динамично свързване,
   претоварване / предефиниране / скриване, виртуално извикване в конструктор. */
(function () {
  const S = window.Study, h = S.h;

  /* модел на класовете от 04_virtual.cpp */
  const VT = {
    Sensor: [["read", "Sensor::read", 0], ["unit", "Sensor::unit", "?"]],
    Temp: [["read", "Temp::read", 21], ["unit", "Temp::unit", "C"]],
    Press: [["read", "Press::read", 1013], ["unit", "Sensor::unit", "?"]],
  };
  const KIND = { Sensor: "Sensor::kind", Temp: "Temp::kind", Press: "Sensor::kind" };   // невиртуален: в израза решава статичният тип Sensor
  const NAMES = { S: "Sensor", T: "Temp", P: "Press" };
  const ADDR = { Sensor: "0x4000", Temp: "0x4010", Press: "0x4020" };
  const VTADDR = { Sensor: "vtable·Sensor", Temp: "vtable·Temp", Press: "vtable·Press" };

  const algos = {
    /** poll(): извиква метод m през const Sensor* за всеки обект; връща реда, който печата C++. */
    dispatch({ seq, method, lang }) {
      const q = String(seq).toUpperCase().replace(/[\s,]/g, "");
      if (!/^[STP]{1,8}$/.test(q)) throw new Error("Редицата е от букви S (Sensor), T (Temp), P (Press) — от 1 до 8.");
      const m = S.int(method, 0, 2, "Методът");
      const c = lang === "c";
      if (c && m === 2) throw new Error("В C версията няма невиртуален kind() — избери read или unit.");
      const objs = [...q].map((ch) => NAMES[ch]);
      const F = [], out = [];
      let vcalls = 0, scalls = 0;
      const tg = (cpp, cc) => (c ? cc : cpp);
      F.push({ at: tg("loop", "loop"), objs, k: -1, vars: { n: objs.length }, msg: `Масив от указатели <code>const Sensor*</code>. <dfn data-g="статичен тип">Статичният тип</dfn> на всеки елемент е Sensor; <dfn data-g="динамичен тип">динамичните</dfn> типове са: ${objs.join(", ")}.`, log: "poll(" + q + ")" });
      objs.forEach((o, i) => {
        F.push({ at: tg("load", "load"), objs, k: i, step: "load", vars: { i, s: ADDR[o], "статичен тип": "const Sensor*" }, stats: { "динамични": vcalls, "статични": scalls }, msg: `<code>s = p[${i}]</code> → адрес ${ADDR[o]}. Компилаторът знае само, че това е Sensor.` });
        if (m === 2) {
          scalls++;
          out.push("Sensor");
          F.push({ at: ["call_kind", "s_kind"], objs, k: i, step: "static", vars: { i, "извиква се": "Sensor::kind" }, stats: { "динамични": vcalls, "статични": scalls }, msg: `<code>s->kind()</code> не е виртуален → <dfn data-g="статично свързване">статично свързване</dfn>: адресът на <code>Sensor::kind</code> е вграден в кода при компилация. Динамичният тип (${o}) не се гледа${o === "Temp" ? " — <code>Temp::kind</code> само <dfn data-g=\"скриване на име\">скрива</dfn> името, не го предефинира" : ""}.`, log: `kind → Sensor` });
          return;
        }
        const [mn, impl, val] = VT[o][m];
        vcalls++;
        F.push({ at: tg(m ? "call_unit" : "call_read", "call"), objs, k: i, step: "vptr", vars: { i, "s->vptr": VTADDR[o] }, stats: { "динамични": vcalls, "статични": scalls }, msg: `<dfn data-g="динамично свързване">Динамично свързване</dfn>, стъпка 1: прочита се скритият указател <b>vptr</b> от началото на обекта → ${VTADDR[o]}.` });
        F.push({ at: tg(m ? "call_unit" : "call_read", "call"), objs, k: i, step: "slot", slot: m, vars: { i, слот: m, "vtable[слот]": impl }, stats: { "динамични": vcalls, "статични": scalls }, msg: `Стъпка 2: от таблицата се взема слот ${m} (<code>${mn}</code>) → <code>${impl}</code>${o === "Press" && m === 1 ? " — Press не предефинира unit(), затова слотът е наследен от Sensor" : ""}.` });
        const implTag = c ? null : { "Sensor::read": "s_read", "Sensor::unit": "s_unit", "Temp::read": "t_read", "Temp::unit": "t_unit", "Press::read": "p_read" }[impl];
        const cTag = c ? { "Sensor::read": "vt_s", "Sensor::unit": "vt_s", "Temp::read": "vt_t", "Temp::unit": "vt_t", "Press::read": "vt_p" }[impl] : null;
        out.push(String(val));
        F.push({ at: c ? ["call", cTag] : [implTag, m ? "call_unit" : "call_read"], objs, k: i, step: "jump", slot: m, vars: { i, return: val }, stats: { "динамични": vcalls, "статични": scalls }, msg: `Стъпка 3: непряк скок към <code>${impl}</code> → връща <b>${val}</b>.`, log: `${o}: ${impl} → ${val}` });
      });
      F.push({ at: tg("ret", "ret"), objs, k: -1, done: true, vars: { резултат: out.join(" ") }, stats: { "динамични": vcalls, "статични": scalls }, msg: `Резултат: <code>${out.join(" ")}</code>. Един и същ ред код (<code>s->${["read()", "unit()", "kind()"][m]}</code>) — ${m === 2 ? "една и съща функция за всички обекти." : "различни реализации според динамичния тип. Това е полиморфизъм."}` });
      return { frames: F, result: out.join(" ") };
    },

    /** Търсене на име и избор на функция: обект (b, d, e, rbd, rbe) × извикване. Модел на правилата, използвани от g++ в 04_virtual.cpp. */
    names({ obj, call }) {
      const O = {
        b: { st: "B", dyn: "B" }, d: { st: "D", dyn: "D" }, e: { st: "E", dyn: "E" },
        rbd: { st: "B", dyn: "D", ref: true }, rbe: { st: "B", dyn: "E", ref: true },
      }[obj];
      if (!O) throw new Error("Непознат обект.");
      const C = { "f()": ["f", []], "f(1)": ["f", ["int"]], "g(2.5)": ["g", ["double"]], "g(2)": ["g", ["int"]], "h()": ["h", []] }[call];
      if (!C) throw new Error("Непознато извикване.");
      const [nm, args] = C;
      /* декларации по клас: [име, параметри, virtual?, таг] */
      const DECL = {
        B: [["f", [], true, "b_f"], ["f", ["int"], false, "b_fi"], ["g", ["double"], true, "b_g"], ["h", [], false, "b_h"]],
        D: [["f", [], true, "d_f"], ["g", ["int"], false, "d_g"], ["h", [], false, "d_h"]],
        E: [["f", [], true, "e_f"], ["f", ["int"], false, "e_using", "B"]],   // using B::f внася B::f(int)
      };
      const PARENT = { D: "B", E: "B", B: null };
      const F = [];
      const who = O.ref ? `B&amp; ${obj} (сочи ${O.dyn})` : `${O.st} ${obj}`;
      F.push({ at: null, phase: 0, vars: { израз: `${obj}.${call}`, "статичен тип": O.st, "динамичен тип": O.dyn }, msg: `<code>${obj}.${call}</code> — ${who}. Компилаторът минава три фази: <b>търсене на името</b> → <b>избор между претоварванията</b> → <b>вид на извикването</b>.`, log: `${obj}.${call}` });
      // 1) търсене на името: от статичния тип нагоре, спира при първия клас, който декларира името
      let cls = O.st, found = null;
      while (cls) {
        const here = DECL[cls].filter((d) => d[0] === nm);
        F.push({ at: here.length ? here.map((d) => d[3]) : null, phase: 1, cls, cand: here.map((d) => `${d[4] || cls}::${nm}(${d[1].join(", ")})`), vars: { "търсим в": cls, "намерени": here.length }, msg: here.length ? `Фаза 1: в <code>${cls}</code> има ${here.length} декларации на <code>${nm}</code> → търсенето <b>спира тук</b>. ${cls !== "B" && O.st !== "B" ? "Базовите версии с това име са <b>скрити</b> (освен внесените с using)." : ""}` : `Фаза 1: в <code>${cls}</code> няма <code>${nm}</code> → търсим в базовия клас.` });
        if (here.length) { found = here.map((d) => ({ cls: d[4] || cls, params: d[1], tag: d[3] })); break; }
        cls = PARENT[cls];
      }
      // 2) избор между претоварванията: точно съвпадение или стандартно преобразуване int<->double
      const conv = (a, p) => (a === p ? 2 : (a === "int" && p === "double") || (a === "double" && p === "int") ? 1 : 0);
      const scored = found.map((c) => {
        if (c.params.length !== args.length) return { c, s: -1 };
        let s = 2; args.forEach((a, k) => (s = Math.min(s, conv(a, c.params[k])))); return { c, s: s === 0 ? -1 : s };
      });
      const viable = scored.filter((x) => x.s >= 0).sort((a, b) => b.s - a.s);
      if (!viable.length) {
        F.push({ at: found.map((c) => c.tag), phase: 2, err: true, vars: { резултат: "ERR" }, done: true, msg: `Фаза 2: никой от кандидатите не приема (${args.join(", ") || "без аргументи"}). <b>Грешка при компилация</b> — версията от базовия клас е скрита и не участва.`, inv: { text: "скриване на име", ok: false }, log: "→ грешка" });
        return { frames: F, result: "ERR" };
      }
      const best = viable[0].c;
      F.push({ at: best.tag, phase: 2, vars: { избрана: `${best.cls}::${nm}(${best.params.join(", ")})`, преобразуване: viable[0].s === 2 ? "няма" : args[0] + " → " + best.params[0] }, msg: `Фаза 2 (<dfn data-g="претоварване">претоварване</dfn>): избрана е <code>${best.cls}::${nm}(${best.params.join(", ")})</code>${viable[0].s === 1 ? ` с преобразуване ${args[0]} → ${best.params[0]}` : " — точно съвпадение"}.` });
      // 3) виртуално ли е? ако да — крайната предефинираща реализация по динамичния тип
      let res = `${best.cls}::${nm}(${best.params.join(", ")})`;
      const isVirt = (nm === "f" && !best.params.length) || (nm === "g" && best.params[0] === "double");   // virtual в B
      if (isVirt) {
        // финален предефиниращ: D/E предефинират f(); никой не предефинира g(double)
        const fin = nm === "f" && (O.dyn === "D" || O.dyn === "E") ? O.dyn : "B";
        res = `${fin}::${nm}(${best.params.join(", ")})`;
        const tag = fin === "D" ? "d_f" : fin === "E" ? "e_f" : best.tag;
        F.push({ at: tag, phase: 3, vars: { "крайна реализация": res }, done: true, msg: `Фаза 3: функцията е <dfn data-g="виртуален метод">виртуална</dfn> → изпълнява се крайното <dfn data-g="предефиниране на метод">предефиниране</dfn> за динамичния тип ${O.dyn}: <code>${res}</code>.${nm === "g" && O.dyn === "D" ? " <code>D::g(int)</code> НЕ предефинира <code>g(double)</code> — сигнатурите са различни." : ""}`, log: "→ " + res });
      } else {
        F.push({ at: best.tag, phase: 3, vars: { "извиква се": res }, done: true, msg: `Фаза 3: функцията не е виртуална → статично свързване: <code>${res}</code>, независимо от динамичния тип.`, log: "→ " + res });
      }
      return { frames: F, result: res };
    },

    /** Виртуално извикване в конструктор/деструктор. */
    ctor() {
      const F = [], ev = [];
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice() })); };
      add({ at: "bc", phase: "Base0", ev: "Base0() calls Base0::who", msg: "Изгражда се базовата част. По време на <code>Base0()</code> обектът е <b>Base0</b> — vptr сочи vtable на Base0. <code>who()</code> → <code>Base0::who</code>, макар крайният обект да е Der0.", log: "Base0(): Base0::who" });
      add({ at: ["dc", "dw"], phase: "Der0", ev: "Der0() calls Der0::who", msg: "В <code>Der0()</code> vptr вече сочи vtable на Der0 → <code>Der0::who</code>.", log: "Der0(): Der0::who" });
      add({ at: "dw", phase: "Der0", ev: "use: Der0::who", msg: "Напълно изграден обект: обичайното динамично извикване.", log: "use: Der0::who" });
      add({ at: ["dd", "dw"], phase: "Der0", ev: "~Der0() calls Der0::who", msg: "Разрушаване: в <code>~Der0()</code> обектът още е Der0.", log: "~Der0(): Der0::who" });
      add({ at: ["bd", "bw"], phase: "Base0", ev: "~Base0() calls Base0::who", done: true, msg: "В <code>~Base0()</code> производната част вече е разрушена; обектът отново се държи като Base0 → <code>Base0::who</code>.", log: "~Base0(): Base0::who" });
      return { frames: F, result: ev.join("|") + "|" };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="полиморфизъм">Полиморфизмът</dfn> позволява общ интерфейс да се използва с различни типове или поведения. В C++ динамичният полиморфизъм обикновено използва <dfn data-g="виртуален метод">виртуални методи</dfn> и обръщение през указател или референция към базов тип. Изборът на реализация зависи от <dfn data-g="динамичен тип">динамичния тип</dfn> на обекта.</p>
  <p><dfn data-g="статично свързване">Статичното свързване</dfn> определя извикваната операция при компилация. <dfn data-g="динамично свързване">Динамичното свързване</dfn> избира крайната предефинираща реализация по време на изпълнение. <dfn data-g="виртуална таблица">Виртуалните таблици</dfn> са разпространена техника за реализация, но конкретният им формат не е част от езиковия договор.</p>
</div>

<div class="block">
  <h3>Едно извикване, различни реализации — през vtable</h3>
  <p class="prose">Избери редица от обекти и метод. Всяко виртуално извикване минава три стъпки: vptr → слот → непряк скок. <code>kind()</code> не е виртуален и показва статичното свързване. Превключи на <b>C</b>, за да видиш същото, написано на ръка със структура от указатели към функции (<code>04_vtable.c</code>) — изходът е идентичен.</p>
  <div id="v-dispatch"></div>
  <details class="hint"><summary>Хинт: какво точно струва виртуалното извикване</summary><div>
    <p>Едно четене (vptr), второ четене (слот), непряк скок. Основната цена обикновено е, че компилаторът не може да вгради (inline) функция, която не знае при компилация. Ръководството изрично казва: няма общо правило „виртуалните методи са бавни“ — зависи от честотата на извикванията и нуждата от избор след компилация.</p>
    <p>Всички обекти от един клас споделят една таблица (<code>04_virtual.cpp</code> печата <code>same_vptr = 1 0</code>: два Temp — един vptr; Temp и Press — различни). Указателят добавя 8 байта към всеки обект (<code>sizeof(Sensor) = 8</code> при нула полета).</p>
  </div></details>
</div>

<div class="block">
  <h3>Претоварване, предефиниране, скриване</h3>
  <p class="prose"><dfn data-g="претоварване">Претоварването</dfn> допуска няколко функции с едно име и различни списъци параметри; изборът е при компилация. <dfn data-g="предефиниране на метод">Предефинирането</dfn> (overriding) предоставя реализация на виртуален метод в производен клас, която участва в динамичното извикване. <dfn data-g="скриване на име">Скриването на име</dfn> е трети механизъм: ако Base има <code>virtual f()</code> и Derived декларира <code>f(int)</code>, новото име скрива базовото, без да го предефинира. <code>using Base::f</code> връща базовите претоварвания във видимите имена.</p>
  <p class="muted">Таблицата е резултатът на g++ за всяка двойка (обект, извикване); „ERR“ = изразът не се компилира. Щракни клетка, за да видиш трите фази на решението.</p>
  <div class="tbl-wrap"><table class="t mx" id="names-mx"></table></div>
  <div id="v-names"></div>
  <details class="hint"><summary>Хинт: override и final</summary><div><p><dfn data-g="override">override</dfn> указва намерение за предефиниране — компилаторът отхвърля декларация, която не съответства на виртуален базов метод (напр. <code>D::g(int) override</code> би било грешка). Не създава различен вид изпълнение. <dfn data-g="final">final</dfn> забранява по-нататъшно предефиниране или наследяване (виж <code>Square final</code> в <a href="#abstraktni">раздел 5</a>).</p></div></details>
  <details class="trap"><summary>Капан: „еднакво име в наследника = предефиниране“</summary><div><p>Не. Възможни са ново претоварване и скриване на име. Само различен връщан тип не е достатъчен за обикновено претоварване. Виж <code>d.g(2.5)</code>: извиква се <code>D::g(int)</code> с отрязване 2.5 → 2, защото <code>B::g(double)</code> е скрит.</p></div></details>
</div>

<div class="block">
  <h3>Виртуално извикване в конструктор и деструктор</h3>
  <p class="prose">По време на изграждане и разрушаване са в сила специални правила за действащия клас: виртуално извикване от конструктора на базата не достига производната реализация. Затова инициализацията на инварианта не трябва да зависи от „вече работещ“ производен обект.</p>
  <div id="v-ctor"></div>
  <p class="prose">Реални езици: C++ използва <code>virtual</code> и предефиниране в производен клас; Java има интерфейси и динамично извикване на подходящите методи; C# има <code>interface</code> и <code>virtual/override</code>. Еднаквата идея за полиморфизъм има различни правила в отделните езици.</p>
  <div class="key">Статичният тип определя <b>кои имена</b> са достъпни; динамичният тип определя <b>коя реализация</b> на виртуалната функция се изпълнява. Еднакво име не доказва предефиниране.</div>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-dispatch"), {
      id: "dispatch", title: "Динамично свързване стъпка по стъпка", sub: "Същите класове като в 04_virtual.cpp.",
      code: (i) => (i.lang === "c" ? "ch04_cvtable" : "ch04_dispatch"),
      inputs: [{ id: "seq", label: "обекти (S/T/P)", value: "TPS", width: "8em" },
        { id: "method", label: "метод", type: "select", value: "0", options: [["0", "read() — виртуален"], ["1", "unit() — виртуален"], ["2", "kind() — НЕ е виртуален"]] },
        { id: "lang", label: "език", type: "select", value: "cpp", options: [["cpp", "C++ (virtual)"], ["c", "C (ръчна vtable)"]] }],
      presets: [{ label: "PPTS", values: { seq: "PPTS" } }, { label: "STTP", values: { seq: "STTP" } }],
      legend: [["s-act", "текущ обект"], ["s-piv", "vptr / vtable"], ["s-done", "изпълнена функция"]],
      build: algos.dispatch,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "objs" });
        f.objs.forEach((o, i) => {
          const cur = i === f.k;
          row.append(h("div", { class: "obj " + (cur ? "s-act" : "") }, h("div", { class: "oh" }, h("span", { text: "p[" + i + "]" }), h("span", { class: "ad", text: o })),
            h("div", { class: "orow " + (cur && f.step === "vptr" ? "s-piv" : "") }, h("span", { text: "vptr" }), h("span", { text: "→ " + o }))));
        });
        st.append(h("div", { class: "lane" }, h("span", { class: "lbl", text: "обекти (статичен тип const Sensor*)" }), row));
        const tabs = h("div", { class: "objs", style: { marginTop: "12px" } });
        ["Sensor", "Temp", "Press"].forEach((c) => {
          const on = f.k >= 0 && f.objs[f.k] === c && (f.step === "slot" || f.step === "jump" || f.step === "vptr");
          const t = h("div", { class: "vt", style: on ? { borderColor: "var(--st-act)" } : {} }, h("div", { class: "oh", text: "vtable " + c }));
          VT[c].forEach(([mn, impl], s) => t.append(h("div", { class: "orow " + (on && f.slot === s && f.step !== "vptr" ? "s-act" : "") }, h("span", { class: "k", text: "[" + s + "] " + mn }), h("span", { text: impl }))));
          t.append(h("div", { class: "orow" }, h("span", { class: "k", text: "kind:" }), h("span", { class: f.step === "static" ? "" : "muted", text: "не е в таблицата" })));
          tabs.append(t);
        });
        st.append(h("div", { class: "lane" }, h("span", { class: "lbl", text: "виртуални таблици (по една на клас)" }), tabs));
        if (f.step === "static") st.append(h("p", { class: "mono", style: { marginTop: "8px" }, text: "call Sensor::kind   ← адресът е известен при компилация" }));
      },
    });

    // таблица на имената
    const OBJS = [["b", "B b"], ["d", "D d"], ["e", "E e"], ["rbd", "B& → D"], ["rbe", "B& → E"]];
    const CALLS = ["f()", "f(1)", "g(2.5)", "g(2)", "h()"];
    const mx = root.querySelector("#names-mx");
    let vNames;
    const cells = {};
    mx.append(h("tr", null, h("th", { text: "обект \\ извикване" }), ...CALLS.map((c) => h("th", null, h("code", { text: c })))));
    OBJS.forEach(([o, t]) => {
      const tr = h("tr", null, h("th", { text: t }));
      CALLS.forEach((c) => {
        const r = algos.names({ obj: o, call: c }).result;
        const td = h("td", { class: r === "ERR" ? "no" : "" }, h("button", { class: "cellbtn mono", text: r, "aria-label": `${o}.${c}`, onclick: () => { vNames.setValues({ obj: o, call: c }); vNames.apply(); } }));
        cells[o + c] = td; tr.append(td);
      });
      mx.append(tr);
    });
    vNames = S.viz(root.querySelector("#v-names"), {
      id: "names", title: "Как компилаторът избира функцията", sub: "Фаза 1: търсене на името · Фаза 2: претоварване · Фаза 3: виртуално или не.",
      code: "ch04_names",
      inputs: [{ id: "obj", label: "обект", type: "select", value: "d", options: OBJS }, { id: "call", label: "извикване", type: "select", value: "g(2.5)", options: CALLS }],
      legend: [["s-act", "разглеждан клас"], ["s-swap", "грешка"]],
      build: algos.names,
      draw(st, f, { inputs }) {
        Object.values(cells).forEach((c) => c.classList.remove("cur"));
        if (cells[inputs.obj + inputs.call]) cells[inputs.obj + inputs.call].classList.add("cur");
        st.innerHTML = "";
        const ph = ["", "търсене на името", "претоварване", "вид на извикването"];
        const tl = h("div", { class: "tl" });
        [1, 2, 3].forEach((p) => tl.append(h("span", { class: "ev " + (p === f.phase ? (f.err ? "s-swap" : "s-act") : p < f.phase ? "s-done" : "fut"), text: p + ". " + ph[p] })));
        st.append(tl);
        if (f.cand) st.append(h("div", { class: "objs", style: { marginTop: "10px" } }, h("div", { class: "obj s-act" }, h("div", { class: "oh", text: "клас " + f.cls }), ...(f.cand.length ? f.cand.map((c) => h("div", { class: "orow", text: c })) : [h("div", { class: "orow muted", text: "няма такова име" })]))));
      },
    });

    S.viz(root.querySelector("#v-ctor"), {
      id: "ctor", title: "who() по време на изграждане и разрушаване", code: "ch04_ctor",
      build: () => algos.ctor(),
      draw(st, f, { frames }) {
        st.innerHTML = "";
        st.append(h("div", { class: "objs" }, h("div", { class: "obj " + (f.phase === "Base0" ? "s-cmp" : "s-act") }, h("div", { class: "oh", text: "Der0 x" }), h("div", { class: "orow s-piv" }, h("span", { text: "vptr" }), h("span", { text: "→ vtable " + f.phase })))));
        const tl = h("div", { class: "tl", style: { marginTop: "10px" } });
        frames[frames.length - 1].ev.forEach((e, i) => tl.append(h("span", { class: "ev " + (i < f.ev.length ? (i === f.ev.length - 1 ? "s-act" : "") : "fut"), text: e })));
        st.append(tl);
      },
    });
  }

  S.chapter({ id: "virtualni", order: 4, num: "4", group: "Полиморфизъм", title: "Полиморфизъм и виртуални методи", lead: "Статично и динамично свързване, виртуална таблица, претоварване срещу предефиниране срещу скриване.", html, mount, algos });
})();
