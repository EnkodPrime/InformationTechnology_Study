/* Раздел 1 — абстрактен тип и конкретна реализация. */
(function () {
  const S = window.Study, h = S.h;

  /* Разбор на програма от операции: "push 4, push(7), pop" -> [{name, args, text}] */
  function parseProg(str, spec, maxOps = 40) {
    const parts = String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > maxOps) throw new Error(`Най-много ${maxOps} операции.`);
    return parts.map((p) => {
      const t = p.replace(/[()]/g, " ").trim().split(/\s+/);
      const nm = t[0].toLowerCase();
      const key = Object.keys(spec).find((k) => k === nm || (spec[k].alias || []).includes(nm));
      if (!key) throw new Error(`Непозната операция „${t[0]}“. Допустими: ${Object.keys(spec).join(", ")}.`);
      const args = t.slice(1).map((x) => {
        const v = Number(x);
        if (!Number.isInteger(v)) throw new Error(`„${x}“ в „${p}“ не е цяло число.`);
        if (Math.abs(v) > 9999) throw new Error(`Стойностите трябва да са между −9999 и 9999.`);
        return v;
      });
      const n = spec[key].args;
      if (n === "many" ? args.length < 1 : args.length !== n) throw new Error(`„${key}“ очаква ${n === "many" ? "поне 1 аргумент" : n === 0 ? "без аргументи" : n + " аргумент(а)"}: „${p}“.`);
      return { name: key, args, text: p };
    });
  }

  const algos = {
    /** Един и същ клиентски код върху две реализации на стека. impl = "array" | "list" — чии стъпки се показват. */
    adt({ prog, cap, impl }) {
      const ops = parseProg(prog, { push: { args: 1 }, pop: { args: 0 }, top: { args: 0, alias: ["peek"] }, empty: { args: 0 } });
      cap = S.int(cap, 1, 10, "Капацитет");
      const isArr = impl !== "list";
      const F = [], arr = [], outA = [], outL = [];
      let nodes = {}, top = null, nid = 1;
      const snap = (o) => F.push(Object.assign({
        arr: arr.slice(), cap, list: { nodes: JSON.parse(JSON.stringify(nodes)), head: top },
        outA: outA.slice(), outL: outL.slice(), impl: isArr ? "array" : "list",
        stats: { "size (масив)": arr.length, "възли (списък)": Object.keys(nodes).length },
      }, o));
      snap({ msg: `Програма от ${ops.length} операции. Клиентът вижда само договора <code>StackOps</code>; отдолу работят две реализации едновременно.` });
      ops.forEach((op, k) => {
        const cl = { push: "c_push", pop: "c_pop", top: "c_top", empty: "c_empty" }[op.name];
        // кадър на клиента (при масива: преди операцията; при списъка също)
        snap({ cAt: cl, msg: `Клиентът извиква <code>ops-&gt;${op.name}(${op.args.join(", ")})</code> — не знае как е разположен стекът.`, log: `${k + 1}. ${op.text}` });
        // ---- масив: една стъпка
        let aAt, aMsg, aHi = null;
        if (op.name === "push") {
          if (arr.length === cap) { outA.push("full"); aAt = "a_full"; aMsg = `масив: size == cap (${cap}) → <b>-1 „няма място“</b>. Свързаната реализация няма такъв лимит.`; aHi = "full"; }
          else { arr.push(op.args[0]); outA.push("ok"); aAt = "a_push"; aMsg = `масив: a[${arr.length - 1}] = ${op.args[0]}, size = ${arr.length}. Θ(1).`; aHi = arr.length - 1; }
        } else if (op.name === "pop") {
          if (!arr.length) { outA.push("E"); aAt = "a_empty"; aMsg = "масив: size == 0 → <b>-1 „празен“</b>."; }
          else { aHi = arr.length - 1; const v = arr.pop(); outA.push(String(v)); aAt = "a_pop"; aMsg = `масив: --size, върнат a[${aHi}] = ${v}. Клетката не се изтрива — просто е извън [0, size).`; }
        } else if (op.name === "top") {
          if (!arr.length) { outA.push("E"); aAt = "a_empty"; aMsg = "масив: празен → -1."; }
          else { aHi = arr.length - 1; outA.push(String(arr[aHi])); aAt = "a_top"; aMsg = `масив: a[size−1] = ${arr[aHi]} (без премахване).`; }
        } else { outA.push(String(arr.length === 0 ? 1 : 0)); aAt = "a_isempty"; aMsg = `масив: size == 0 → ${arr.length === 0 ? 1 : 0}.`; }
        if (isArr) snap({ at: aAt, cAt: cl, aHi, msg: aMsg });
        // ---- списък: всяка промяна на указател е отделна стъпка
        const L = (o) => { if (!isArr) snap(Object.assign({ cAt: cl }, o)); };
        if (op.name === "push") {
          const id = nid++;
          nodes[id] = { v: op.args[0], next: null };
          L({ at: "l_push", lcls: { [id]: "s-done" }, msg: `списък: malloc на нов възел ${op.args[0]} (още не е свързан).` });
          nodes[id].next = top;
          L({ at: "l_link", lcls: { [id]: "s-done" }, msg: "списък: <code>n-&gt;next = top</code> — новият сочи стария връх." });
          top = id; outL.push("ok");
          L({ at: "l_head", lcls: { [id]: "s-done" }, msg: "списък: <code>top = n</code>. Θ(1) — без преместване, но с алокация." });
        } else if (op.name === "pop") {
          if (top == null) { outL.push("E"); L({ at: "l_empty", msg: "списък: top == NULL → -1." }); }
          else {
            const id = top;
            outL.push(String(nodes[id].v));
            L({ at: "l_pop", lcls: { [id]: "s-cmp" }, msg: `списък: <code>*out = n-&gt;v</code> = ${nodes[id].v}.` });
            top = nodes[id].next;
            L({ at: "l_unlink", lcls: { [id]: "s-swap" }, msg: "списък: <code>top = n-&gt;next</code> — възелът е откачен." });
            nodes[id].freed = true;
            L({ at: "l_free", lcls: { [id]: "s-dim" }, msg: "списък: <code>free(n)</code>. След това n не бива да се чете." });
            delete nodes[id];
          }
        } else if (op.name === "top") {
          if (top == null) { outL.push("E"); L({ at: "l_empty", msg: "списък: празен → -1." }); }
          else { outL.push(String(nodes[top].v)); L({ at: "l_top", lcls: { [top]: "s-cmp" }, msg: `списък: <code>top-&gt;v</code> = ${nodes[top].v}.` }); }
        } else { outL.push(String(top == null ? 1 : 0)); L({ at: "l_isempty", msg: `списък: top == NULL → ${top == null ? 1 : 0}.` }); }
      });
      const A = outA.join(" "), Ls = outL.join(" ");
      snap({ done: true, msg: `Край. Изход на масива: <b>${A || "—"}</b>; изход на списъка: <b>${Ls || "—"}</b>. ${A === Ls ? "Еднакво наблюдаемо поведение — един договор." : "Разликата идва от капацитета: договорът позволява отказ „няма място“, а реализациите го използват различно."}` });
      return { frames: F, outA: A, outL: Ls };
    },
  };

  function draw(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const aBox = h("div", { class: "t4col", style: { opacity: f.impl === "array" ? 1 : 0.55 } }, h("span", { class: "t4cap", text: `Реализация 1 · масив (cap = ${f.cap})` }));
    const cells = Array.from({ length: f.cap }, (_, i) => (i < f.arr.length ? f.arr[i] : null));
    const cls = {};
    cells.forEach((v, i) => { if (v == null) cls[i] = "s-dim"; });
    if (f.impl === "array" && f.aHi === "full") cells.forEach((_, i) => (cls[i] = "s-swap"));
    else if (f.impl === "array" && f.aHi != null) cls[f.aHi] = f.at === "a_push" ? "s-done" : "s-cmp";
    const ab = h("div");
    S.drawArray(ab, cells, { cls, ptr: f.arr.length ? { "връх": f.arr.length - 1 } : {} });
    aBox.append(ab, h("span", { class: "muted mono", style: { fontSize: ".78rem" }, text: `size = ${f.arr.length}; върхът е a[size−1]` }));
    const lBox = h("div", { class: "t4col", style: { opacity: f.impl === "list" ? 1 : 0.55, minWidth: "0" } }, h("span", { class: "t4cap", text: "Реализация 2 · свързани възли" }));
    const lb = h("div", { class: "t4scroll" });
    T4.list(lb, f.list, { headName: "top", cls: f.impl === "list" ? f.lcls : null });
    lBox.append(lb, h("span", { class: "muted mono", style: { fontSize: ".78rem" }, text: "top сочи първия възел = върха" }));
    row.append(aBox, lBox);
    st.append(row);
    const outs = h("div", { class: "t4row", style: { marginTop: "10px" } });
    const pills = (lab, arr) => h("div", { class: "t4out" }, h("span", { class: "muted", text: lab }), ...(arr.length ? arr.map((x) => h("span", { class: "pill " + (x === "full" || x === "E" ? "s-swap" : ""), text: x })) : [h("span", { class: "muted", text: "—" })]));
    outs.append(pills("изход масив:", f.outA), pills("изход списък:", f.outL));
    st.append(outs);
  }

  const html = `
<div class="prose">
  <p><dfn data-g="абстрактен тип данни">Абстрактният тип данни</dfn>, <dfn data-g="атд">АТД</dfn>, се определя чрез допустими стойности, операции и тяхното поведение. Той описва какво може да прави клиентът, без да изисква конкретно разположение в паметта. <dfn data-g="структура от данни">Структурата от данни</dfn> е организацията, чрез която се реализира този договор. Един <dfn data-g="стек">стек</dfn> например може да бъде реализиран чрез масив или свързани <dfn data-g="възел">възли</dfn>.</p>
  <p>При анализа се разглеждат коректност, време на операцията и необходима памет. Трябва да се посочат предпоставките: дали имаме указател към възел, дали масивът има свободен <dfn data-g="капацитет">капацитет</dfn>, дали дървото е балансирано. Твърдение „операцията е O(1)“ без тези условия може да бъде грешно.</p>
</div>

<div class="block">
  <h3>Един договор — две реализации (схеми 1 и 2)</h3>
  <p class="prose">Долу клиентската функция <code>client_step</code> вижда само таблицата от операции <code>StackOps</code>. Същата програма се изпълнява едновременно върху масив с фиксиран капацитет и върху свързани възли. Изборът „код за“ сменя показаната реализация; картината винаги показва и двете.</p>
  <div class="split" style="align-items:start"><div><span class="t4cap">Договорът и клиентът (C) — подсветен е текущият клиентски ред</span><div id="v1-contract" style="margin-top:6px"></div></div></div>
  <div id="v1-adt"></div>
  <details class="hint"><summary>Хинт: какво е еднакво и какво — различно</summary><div>
    <p><b>Еднакво</b> е наблюдаемото поведение: <dfn data-g="lifo">LIFO</dfn>, top връща последния добавен, pop при празен стек връща договорения код за грешка. <b>Различно</b> е разположението и цената: масивът е непрекъснат и използва локалността на паметта, но има капацитет; свързаните възли нямат предварителен лимит, но всяко push е алокация и има указател на всеки елемент.</p>
    <p>Пробвай „препълване“: при cap = 3 масивът отказва четвъртото push, а списъкът го приема. Договорът трябва да позволява отказ, иначе масивната реализация не би била коректна.</p>
  </div></details>
</div>

<div class="block">
  <h3>Абстрактният договор е различен от разполагането</h3>
  <div class="prose">
    <p>Логически линейната последователност не е задължително физически непрекъсната. Масивът пази елементите последователно и позволява индексен достъп; свързаният списък пази връзки между възли. Първият използва локалността на паметта, а вторият улеснява определени изменения без преместване на останалите елементи. Затова диаграма на последователност от елементи още не показва как са разположени във физическата памет.</p>
    <p><dfn data-g="инвариант">Инвариантът</dfn> е условие, което всяка операция трябва да запази. За масивен стек 0 ≤ size ≤ capacity и елементите са в позиции 0…size−1. За свързан списък всяка следваща връзка трябва да води до правилния възел или до края. Крайният резултат на операцията не е достатъчен, ако по пътя е загубен останалият списък или е използвана освободена памет.</p>
  </div>
  <div class="key"><b>АТД = стойности + операции + поведение.</b> Реализацията = разположение + цена. Смяната на реализацията може да запази договора, но променя паметта и времето на операциите.</div>
  <details class="trap"><summary>Капан: думата „списък“ и имената в API</summary><div>
    <p>„Списък“ може да значи абстрактна крайна последователност, свързана структура или конкретен тип с това име. Python <code>list</code> е динамичен масив, а C++ <code>std::list</code> е двусвързан списък. Името на <dfn data-g="api">API</dfn> не е достатъчно доказателство за механизма. Разглеждаме отделно логически ред, начин на достъп и физически връзки.</p>
  </div></details>
  <details class="trap"><summary>Капан: „O(1)“ без условие</summary><div>
    <p>Добавяне в масив с наличен капацитет и добавяне с преоразмеряване нямат еднаква единична цена. „Вмъкване в списък е O(1)“ важи, ако вече имаме указател към мястото. „Търсене в BST е O(log n)“ важи, ако дървото е балансирано. Всяка оценка се казва заедно с условието си.</p>
  </div></details>
</div>`;

  function mount(root) {
    const cbox = S.codeView(root.querySelector("#v1-contract"), "ch01_contract");
    const csrc = (window.CSRC || {}).ch01_contract;
    const clines = cbox.querySelectorAll("pre.c .l");
    function hlClient(tag) {
      clines.forEach((l) => l.classList.remove("hl"));
      if (tag && csrc && csrc.tags[tag]) csrc.tags[tag].forEach((n) => clines[n - 1] && clines[n - 1].classList.add("hl"));
    }
    S.viz(root.querySelector("#v1-adt"), {
      id: "c1adt", title: "Една програма — две реализации на стека", sub: "операции: <code>push x</code>, <code>pop</code>, <code>top</code>, <code>empty</code>",
      code: (inp) => (inp.impl === "list" ? "ch01_list" : "ch01_array"),
      inputs: [
        { id: "prog", label: "Програма", value: "push 4, push 7, push 2, top, pop, pop, empty", width: "24em" },
        { id: "cap", label: "капацитет на масива", type: "number", value: 4, width: "5em" },
        { id: "impl", label: "код за", type: "select", value: "array", options: [["array", "масивната реализация"], ["list", "свързаната реализация"]] },
      ],
      presets: [
        { label: "препълване (cap 3)", values: { prog: "push 1, push 2, push 3, push 4, push 5, pop, empty", cap: 3 } },
        { label: "празен стек", values: { prog: "pop, top, empty, push 9, top, empty", cap: 2 } },
      ],
      random: () => {
        const n = S.randInt(4, 9), a = []; let sz = 0;
        for (let i = 0; i < n; i++) { if (sz && Math.random() < 0.4) { a.push(Math.random() < 0.7 ? "pop" : "top"); if (a[a.length - 1] === "pop") sz--; } else { a.push("push " + S.randInt(1, 99)); sz++; } }
        return { prog: a.join(", ") };
      },
      legend: [["s-done", "нов / добавен"], ["s-cmp", "чете се"], ["s-swap", "откачен / отказ"], ["s-dim", "свободно / освободено"]],
      build: algos.adt, draw, onFrame: (f) => hlClient(f.cAt),
    });
  }

  S.chapter({ id: "atd", order: 1, num: "1", group: "Основа", title: "Абстрактен тип и конкретна реализация", lead: "АТД казва какво се обещава; структурата от данни — как е разположено. Един и същ стек върху масив и върху свързани възли.", html, mount, algos });
})();
