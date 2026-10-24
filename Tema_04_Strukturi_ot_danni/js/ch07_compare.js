/* Раздел 7 — съпоставка на реализации: таблица на сложностите и броене на стъпки за една операция. */
(function () {
  const S = window.Study, h = S.h;

  /** Брои стъпките точно както 07_compare.c (масив 0..n-1, списък 0..n-1, BST балансирано и изродено). */
  function counts(n, k, x) {
    const r = {};
    r.arrGet = 1;
    r.lstGet = k + 1;
    const fa = x >= 0 && x < n ? x + 1 : n;
    r.arrFind = fa; r.lstFind = fa;
    // балансирано BST: средата първа
    let lo = 0, hi = n - 1, c = 0;
    while (lo <= hi) { const m = lo + ((hi - lo) >> 1); c++; if (x === m) break; if (x < m) hi = m - 1; else lo = m + 1; }
    r.balFind = c;
    r.degFind = x >= 0 && x < n ? x + 1 : (x < 0 ? 1 : n);
    r.arrIns = n - k + 1;
    r.lstIns = k === 0 ? 2 : (k - 1) + 2;
    return r;
  }

  const algos = {
    counts,
    /** Анимира една операция върху избраната структура. */
    run({ n, op, k, x, ds }) {
      n = S.int(n, 1, 24, "n");
      k = S.int(k, 0, n - 1, "k");
      x = S.int(x, -99, 99, "x");
      const a = Array.from({ length: n }, (_, i) => i);
      const F = [];
      let steps = 0;
      const snap = (o) => F.push(Object.assign({ ds, n, stats: { стъпки: steps } }, o));
      if (ds === "array") {
        if (op === "get") { steps++; snap({ at: "get", arr: a, cls: { [k]: "s-done" }, msg: `a[${k}] = ${a[k]}: адресът се изчислява (база + k·размер) — <b>1 стъпка</b> за всяко k.` }); }
        else if (op === "find") {
          snap({ arr: a, msg: `Търсим ${x} в несортиран масив отляво надясно.` });
          for (let i = 0; i < n; i++) { steps++; const eq = a[i] === x; snap({ at: "find", arr: a, cls: { [i]: eq ? "s-done" : "s-cmp" }, dim: i, msg: `a[${i}] == ${x}? ${eq}.` }); if (eq) break; }
        } else {
          const b = a.concat([null]);
          snap({ arr: b.slice(), msg: `Вмъкване на позиция ${k}: всичко от k нататък се измества надясно.` });
          for (let i = n; i > k; i--) { b[i] = b[i - 1]; steps++; snap({ at: "shift", arr: b.slice(), cls: { [i]: "s-swap", [i - 1]: "s-cmp" }, msg: `a[${i}] = a[${i - 1}].` }); }
          b[k] = "X"; steps++; snap({ at: "put", arr: b.slice(), cls: { [k]: "s-done" }, msg: `a[${k}] = X. Измествания: ${n - k}.` });
        }
      } else if (ds === "list") {
        const N = {}; a.forEach((v, i) => (N[i] = { v, next: i + 1 < n ? i + 1 : null }));
        const st = () => ({ nodes: JSON.parse(JSON.stringify(N)), head: 0 });
        if (op === "get" || op === "ins") {
          const target = op === "get" ? k : k - 1;
          if (op === "ins" && k === 0) {
            N.X = { v: "X", next: 0 }; steps++;
            snap({ at: "head", st: { nodes: JSON.parse(JSON.stringify(N)), head: 0 }, cls: { X: "s-done" }, msg: "k = 0: X.next = head." });
            steps++; snap({ at: "head", st: { nodes: JSON.parse(JSON.stringify(N)), head: "X" }, cls: { X: "s-done" }, msg: "head = X. 2 стъпки — без обхождане." });
          } else {
            let p = 0;
            snap({ st: st(), ptr: { 0: ["p"] }, msg: op === "get" ? `Елемент №${k}: няма адресна аритметика — вървим по next.` : `Вмъкване на позиция ${k}: първо стигаме възел ${k - 1}.` });
            for (let i = 0; i < target; i++) { p = N[p].next; steps++; snap({ at: "walk", st: st(), ptr: { [p]: ["p"] }, cls: { [p]: "s-cmp" }, msg: `p = p->next (${i + 1}).` }); }
            if (op === "get") { steps++; snap({ at: "get", st: st(), ptr: { [p]: ["p"] }, cls: { [p]: "s-done" }, msg: `Стигнахме: ${N[p].v}. Стъпки: ${steps} = k + 1.` }); }
            else {
              N.X = { v: "X", next: N[p].next }; steps++;
              snap({ at: "link1", st: st(), ptr: { [p]: ["p"], X: ["X"] }, cls: { X: "s-done" }, msg: "X.next = p.next." });
              N[p].next = "X"; steps++;
              snap({ at: "link2", st: st(), ptr: { [p]: ["p"], X: ["X"] }, cls: { X: "s-done" }, msg: `p.next = X. Обхождане ${k - 1} + свързване 2. Без изместване на данни.` });
            }
          }
        } else {
          snap({ st: st(), msg: `Търсим ${x} по веригата.` });
          for (let p = 0; p != null; p = N[p].next) { steps++; const eq = N[p].v === x; snap({ at: "find", st: st(), ptr: { [p]: ["p"] }, cls: { [p]: eq ? "s-done" : "s-cmp" }, msg: `p->v == ${x}? ${eq}.` }); if (eq) break; }
        }
      } else {
        const bal = ds === "bal";
        const ins = (t, kk, id) => { if (!t) return { id, key: kk, l: null, r: null }; if (kk < t.key) t.l = ins(t.l, kk, id); else t.r = ins(t.r, kk, id); return t; };
        let T = null;
        if (bal) (function b(lo, hi) { if (lo > hi) return; const m = lo + ((hi - lo) >> 1); T = ins(T, m, m); b(lo, m - 1); b(m + 1, hi); })(0, n - 1);
        else for (let i = 0; i < n; i++) T = ins(T, i, i);
        if (op !== "find") { snap({ tree: T, msg: "За BST операциите по позиция (индекс) не са основни — BST се търси по ключ. Избери „търсене“." }); return { frames: F, steps: null }; }
        const path = [];
        let t = T;
        snap({ tree: T, path: [], msg: `Търсим ${x}: ${bal ? "балансирано дърво" : "изродено дърво (вмъкнато нарастващо)"}.` });
        while (t) { steps++; path.push(t.id); const eq = x === t.key; snap({ at: eq ? "eq" : "go", tree: T, path: path.slice(), found: eq ? t.id : null, msg: `${x} vs ${t.key}: ${eq ? "намерено" : x < t.key ? "наляво" : "надясно"}.` }); if (eq) break; t = x < t.key ? t.l : t.r; }
      }
      const c = counts(n, k, x);
      F[F.length - 1].done = true;
      F[F.length - 1].msg += ` <span class="muted">(Общо ${steps} стъпки.)</span>`;
      return { frames: F, steps, c };
    },
  };

  const CODE = { array: "ch07_array", list: "ch07_list", bal: "ch07_bst", deg: "ch07_bst" };

  function draw(st, f) {
    st.innerHTML = "";
    const box = h("div", { class: "t4scroll" });
    if (f.arr) { const cls = Object.assign({}, f.cls || {}); if (f.dim != null) for (let i = 0; i < f.dim; i++) cls[i] = cls[i] || "s-dim"; S.drawArray(box, f.arr, { cls }); }
    else if (f.st) T4.list(box, f.st, { ptr: f.ptr, cls: f.cls });
    else if (f.tree) { const cls = {}, edge = {}; (f.path || []).forEach((id) => { cls[id] = "s-cmp"; edge[id] = "s-cmp"; }); if (f.found != null) cls[f.found] = "s-done"; T4.tree(box, f.tree, { cls, edge, dx: 32, dy: f.ds === "deg" ? 26 : 46, r: 13 }); }
    st.append(box);
  }

  function table(host, n, k, x) {
    const c = counts(n, k, x);
    host.innerHTML = "";
    const t = h("table", { class: "t grid" });
    t.append(h("tr", null, ...["Операция", "Масив", "Свързан списък", "BST баланс.", "BST изродено"].map((s) => h("th", { text: s }))));
    const row = (name, ...v) => t.append(h("tr", null, h("th", { style: { textAlign: "left" }, text: name }), ...v.map((x2) => h("td", { text: x2 == null ? "—" : x2 }))));
    row(`достъп по индекс k = ${k}`, c.arrGet, c.lstGet, null, null);
    row(`търсене на x = ${x}`, c.arrFind, c.lstFind, c.balFind, c.degFind);
    row(`вмъкване на позиция k = ${k}`, c.arrIns, c.lstIns, null, null);
    host.append(h("div", { class: "tbl-wrap" }, t));
  }

  const html = `
<div class="block">
  <h3>Сравнителна таблица (схема 24)</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Операция</th><th>Динамичен масив</th><th>Свързан списък</th><th><dfn data-g="bst">BST</dfn></th></tr>
    <tr><td>Достъп по индекс</td><td class="mono">Θ(1)</td><td class="mono">O(n)</td><td>Не е основна операция</td></tr>
    <tr><td>Търсене в общия случай</td><td class="mono">O(n) несортиран</td><td class="mono">O(n)</td><td class="mono">O(h)</td></tr>
    <tr><td>Добавяне след известна позиция</td><td class="mono">O(n) с изместване</td><td class="mono">Θ(1) свързване</td><td class="mono">O(h) по ключ</td></tr>
    <tr><td>Добавяне в края</td><td class="mono">амортизирано Θ(1)</td><td class="mono">Θ(1) с tail; Θ(n) без</td><td>—</td></tr>
    <tr><td>Памет</td><td class="mono">Θ(n) плюс капацитет</td><td class="mono">Θ(n) плюс връзки</td><td class="mono">Θ(n) плюс връзки</td></tr>
  </table></div>
  <p class="prose">Таблицата не включва специализирани оптимизации и приема обичайните реализации. При масива <dfn data-g="капацитет">капацитетът</dfn> може да е по-голям от броя елементи. При списъка известната позиция трябва да е достъпна чрез подходящ указател. При BST оценката O(h) не означава гарантирано O(log n). Редът „добавяне в края“ е обобщение на разделите <a href="#stek">2</a> и <a href="#spisak">4</a>.</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>АТД</th><th>Операция</th><th>Масив / кръгов буфер</th><th>Свързани възли</th></tr>
    <tr><td><dfn data-g="стек">Стек</dfn></td><td>push / pop / top</td><td class="mono">Θ(1) (push амортизирано при растеж)</td><td class="mono">Θ(1) + алокация</td></tr>
    <tr><td><dfn data-g="опашка">Опашка</dfn></td><td>enqueue / dequeue</td><td class="mono">Θ(1) с head + size</td><td class="mono">Θ(1) с front + rear</td></tr>
    <tr><td><dfn data-g="двоично дърво">Двоично дърво</dfn></td><td>обход</td><td class="mono">Θ(n)</td><td class="mono">Θ(n), стек O(h) / опашка O(ширина)</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>Броене на стъпки: една операция върху различни структури</h3>
  <p class="prose">Числата 0…n−1 са записани в масив, в едносвързан списък, в балансирано BST и в BST, получено от нарастващо вмъкване (верига). Стъпка = една елементарна операция: достъп до клетка, преход по указател, сравнение в дървото, изместване или присвояване на връзка. Таблицата се преизчислява при всяко „Изпълни“; визуализаторът показва стъпките на избраната структура.</p>
  <div id="v7-tbl"></div>
  <div id="v7"></div>
  <details class="hint"><summary>Хинт: кога списъкът печели и кога губи</summary><div>
    <p>Вмъкване на позиция 0: масивът измества всичките n елемента, списъкът прави 2 присвоявания. Вмъкване на позиция n−1: масивът измества 1, списъкът обхожда n−2 възела, за да стигне мястото. „Θ(1) свързване“ е вярно само ако указателят към мястото вече е в ръката ни.</p>
  </div></details>
</div>

<div class="block">
  <h3>Изборът зависи от операциите и модела за памет</h3>
  <div class="prose">
    <p>Масивът дава пряк индексиран достъп и добра пространствена локалност. Вмъкване по средата може да изисква изместване. Свързаният списък дава локална промяна на връзки при известно място, но изисква обход за индекс и допълнителна памет за връзки. BST поддържа ред по ключ, а не непременно достъп по числов индекс. Така въпросът „коя структура е най-бърза“ няма един отговор без набор операции. Стекът и опашката описват ред на обслужване, а не една задължителна физическа структура.</p>
    <p>Сложността брои операции в избран модел. Реалното време включва кеш пропуски, алокации и пренасяне на данни. Малък масив с линейно търсене може да е по-бърз от сложна структура за малък конкретен набор, без да опровергава асимптотичната оценка. Практическият резултат и математическият растеж са различни твърдения и могат едновременно да са верни.</p>
  </div>
  <details class="trap"><summary>Капан: „O на едно и също n означава еднакво време“</summary><div>
    <p>Не. O(n) ограничава асимптотичния растеж. Константите, паметният достъп и цената на сравнение остават различни. Линейното търсене в масив и в свързан списък има еднакъв брой стъпки горе, но в масива съседните елементи са в един и същ кеш ред, а всеки преход по next може да е кеш пропуск (тема 1).</p>
  </div></details>
</div>`;

  function mount(root) {
    const tb = root.querySelector("#v7-tbl");
    S.viz(root.querySelector("#v7"), {
      id: "c7", title: "Една операция, стъпка по стъпка", sub: "Масивът и списъкът съдържат 0, 1, …, n−1.",
      code: (inp) => CODE[inp.ds],
      inputs: [
        { id: "n", label: "n (до 24)", type: "number", value: 8, width: "5em" },
        { id: "op", label: "операция", type: "select", value: "ins", options: [["get", "достъп по индекс k"], ["find", "търсене на x"], ["ins", "вмъкване на позиция k"]] },
        { id: "k", label: "k", type: "number", value: 0, width: "4em" },
        { id: "x", label: "x", type: "number", value: 7, width: "4em" },
        { id: "ds", label: "структура", type: "select", value: "array", options: [["array", "масив"], ["list", "свързан списък"], ["bal", "BST балансирано"], ["deg", "BST изродено"]] },
      ],
      presets: [
        { label: "вмъкване в началото: масив", values: { op: "ins", k: 0, ds: "array" } },
        { label: "… списък", values: { op: "ins", k: 0, ds: "list" } },
        { label: "вмъкване в края: списък", values: { op: "ins", k: 7, ds: "list" } },
        { label: "търсене 15 от 16: BST", values: { n: 16, op: "find", x: 15, ds: "bal" } },
      ],
      legend: [["s-cmp", "проверява се / път"], ["s-swap", "изместване"], ["s-done", "резултат"]],
      build: (inp) => { const r = algos.run(inp); table(tb, +inp.n, +inp.k, +inp.x); return r; }, draw,
    });
  }

  S.chapter({ id: "sapostavka", order: 7, num: "7", group: "Сравнение", title: "Съпоставка на реализации", lead: "Таблица на сложностите с условията ѝ и броене на стъпки за една и съща операция върху масив, списък и BST.", html, mount, algos });
})();
