/* Раздел 3 — опашка: кръгов буфер, пълно/празно, свързана опашка, дек. */
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
  const QSPEC = { enq: { args: 1, alias: ["enqueue", "push"] }, deq: { args: 0, alias: ["dequeue", "pop"] }, front: { args: 0, alias: ["peek"] } };

  const algos = {
    /** Стек срещу опашка върху една и съща поредица (схема 6). */
    order({ vals }) {
      const a = S.parseNums(vals, { minLen: 1, maxLen: 10, min: -999, max: 999 });
      const F = [], st = [], q = [], os = [], oq = [];
      const snap = (o) => F.push(Object.assign({ st: st.slice(), q: q.slice(), os: os.slice(), oq: oq.slice() }, o));
      snap({ msg: "Едни и същи стойности влизат в стек и в опашка." });
      a.forEach((v) => { st.push(v); q.push(v); snap({ msg: `push(${v}) / enqueue(${v}).`, log: `добавено ${v}` }); });
      while (st.length) { os.push(st.pop()); oq.push(q.shift()); snap({ msg: `pop → <b>${os[os.length - 1]}</b> (последният добавен) · dequeue → <b>${oq[oq.length - 1]}</b> (най-дълго чакалият).`, log: `${os[os.length - 1]} | ${oq[oq.length - 1]}` }); }
      snap({ done: true, msg: `Стекът изважда в обратен ред (<b>LIFO</b>), опашката — в реда на пристигане (<b>FIFO</b>). Физическата реализация може да е различна.` });
      return { frames: F, stack: os.join(" "), queue: oq.join(" ") };
    },

    /** Кръгов буфер с head и size. */
    ring({ prog, C, head0, ow }) {
      const ops = parseProg(prog, QSPEC);
      C = S.int(C, 2, 12, "Капацитет C");
      head0 = S.int(head0, 0, C - 1, "Начален head");
      const over = ow === true || ow === "true" || ow === "1";
      const a = new Array(C).fill(null);
      let head = head0, size = 0;
      const out = [], F = [];
      const tail = () => (head + size) % C;
      const snap = (o) => F.push(Object.assign({ a: a.slice(), head, size, C, out: out.slice(), vars: { head, size, "tail=(head+size)%C": tail() }, stats: { size, свободни: C - size } }, o));
      snap({ msg: `Празна опашка: head = ${head}, size = 0. Празно ⇔ size == 0; пълно ⇔ size == C = ${C}.` });
      ops.forEach((op, k) => {
        if (op.name === "enq") {
          const x = op.args[0];
          snap({ at: "full", msg: `enqueue(${x}): size == C? ${size} == ${C} → <b>${size === C}</b>.`, log: `${k + 1}. ${op.text}` });
          if (size === C) {
            if (!over) { out.push("full"); snap({ at: "reject", bad: true, msg: "Пълно. Политика „отказ“: връщаме <b>-1</b>, данните не се променят." }); return; }
            const old = a[head];
            a[head] = null; head = (head + 1) % C; size--;
            snap({ at: "drop", hi: { [(head - 1 + C) % C]: "s-swap" }, msg: `Пълно. Политика „презаписване“: най-старият (${old}) се губи — head = ${head}.` });
          }
          const t = tail();
          snap({ at: "tail", hi: { [t]: "s-cmp" }, msg: `tail = (head + size) mod C = (${head} + ${size}) mod ${C} = <b>${t}</b>.${head + size >= C ? " Прехвърляне през края — без преместване на елементи." : ""}` });
          a[t] = x; size++;
          snap({ at: "write", hi: { [t]: "s-done" }, msg: `a[${t}] = ${x}; size = ${size}.` });
        } else {
          snap({ at: "empty", msg: `${op.name === "deq" ? "dequeue" : "front"}(): size == 0? → <b>${size === 0}</b>.`, log: `${k + 1}. ${op.text}` });
          if (!size) { out.push("E"); snap({ at: "empty", bad: true, msg: "Празна опашка → <b>-1</b>." }); return; }
          if (op.name === "front") { out.push(String(a[head])); snap({ at: "front", hi: { [head]: "s-cmp" }, msg: `front = a[head] = a[${head}] = <b>${a[head]}</b>.` }); return; }
          const v = a[head];
          snap({ at: "read", hi: { [head]: "s-cmp" }, msg: `*out = a[head] = a[${head}] = <b>${v}</b>.` });
          out.push(String(v)); a[head] = null;
          const oh = head; head = (head + 1) % C; size--;
          snap({ at: "advance", hi: { [oh]: "s-swap" }, msg: `head = (head + 1) mod C = <b>${head}</b>; size = ${size}. Нищо не се мести.` });
        }
      });
      snap({ done: true, msg: `Край. Изход: <b>${out.join(" ") || "—"}</b>. head = ${head}, size = ${size}.` });
      return { frames: F, out: out.join(" ") || "-", head, size };
    },

    /** Вариант само с head и tail, една неизползвана клетка. */
    ring2({ prog, C }) {
      const ops = parseProg(prog, { enq: QSPEC.enq, deq: QSPEC.deq });
      C = S.int(C, 2, 12, "Капацитет C");
      const a = new Array(C).fill(null);
      let head = 0, tail = 0;
      const out = [], F = [];
      const full = () => (tail + 1) % C === head, empty = () => head === tail;
      const snap = (o) => F.push(Object.assign({ a: a.slice(), head, tail, C, out: out.slice(), vars: { head, tail, "(tail+1)%C": (tail + 1) % C }, stats: { "полезен капацитет": C - 1, елементи: (tail - head + C) % C } }, o));
      snap({ msg: `head == tail == 0 → празно. Полезният капацитет е C − 1 = ${C - 1}: една клетка винаги остава празна.` });
      ops.forEach((op, k) => {
        if (op.name === "enq") {
          snap({ at: ["full", "isfull"], hi: { [(tail + 1) % C]: "s-cmp" }, msg: `enqueue(${op.args[0]}): (tail + 1) mod C == head? (${tail} + 1) mod ${C} = ${(tail + 1) % C} vs ${head} → <b>${full()}</b>.`, log: `${k + 1}. ${op.text}` });
          if (full()) { out.push("full"); snap({ at: "full", bad: true, msg: `Пълно, въпреки че клетка ${tail} е свободна: ако я запишем, tail ще стане == head и няма да различим пълно от празно.` }); return; }
          a[tail] = op.args[0];
          snap({ at: "write", hi: { [tail]: "s-done" }, msg: `a[tail] = a[${tail}] = ${op.args[0]}.` });
          tail = (tail + 1) % C;
          snap({ at: "advt", msg: `tail = ${tail}.` });
        } else {
          snap({ at: ["empty", "isempty"], msg: `dequeue(): head == tail? ${head} == ${tail} → <b>${empty()}</b>.`, log: `${k + 1}. ${op.text}` });
          if (empty()) { out.push("E"); snap({ at: "empty", bad: true, msg: "Празно → -1." }); return; }
          const v = a[head]; out.push(String(v));
          snap({ at: "read", hi: { [head]: "s-cmp" }, msg: `*out = a[${head}] = <b>${v}</b>.` });
          a[head] = null; head = (head + 1) % C;
          snap({ at: "advh", msg: `head = ${head}.` });
        }
      });
      snap({ done: true, msg: `Край. Изход: <b>${out.join(" ") || "—"}</b>. head = ${head}, tail = ${tail}.` });
      return { frames: F, out: out.join(" ") || "-", head, tail };
    },

    /** Свързана опашка с front и rear. */
    linked({ prog }) {
      const ops = parseProg(prog, { enq: QSPEC.enq, deq: QSPEC.deq });
      const nodes = {}; let front = null, rear = null, nid = 1;
      const out = [], F = [];
      const snap = (o) => F.push(Object.assign({ list: { nodes: JSON.parse(JSON.stringify(nodes)), head: front }, front, rear, out: out.slice(), vars: { front: front == null ? "NULL" : "→" + nodes[front].v, rear: rear == null ? "NULL" : "→" + nodes[rear].v } }, o));
      snap({ msg: "Празна опашка: front = rear = NULL." });
      ops.forEach((op, k) => {
        if (op.name === "enq") {
          const id = nid++; nodes[id] = { v: op.args[0], next: null };
          snap({ at: "new", lcls: { [id]: "s-done" }, msg: `Нов възел ${op.args[0]}, next = NULL.`, log: `${k + 1}. ${op.text}` });
          snap({ at: "isempty", lcls: { [id]: "s-done" }, msg: `rear == NULL? → <b>${rear == null}</b>.` });
          if (rear == null) { front = id; snap({ at: "first", lcls: { [id]: "s-done" }, msg: "Първи елемент: front = n." }); }
          else { nodes[rear].next = id; snap({ at: "link", lcls: { [id]: "s-done", [rear]: "s-cmp" }, msg: "rear->next = n — закачаме в края за Θ(1), без обхождане." }); }
          rear = id;
          snap({ at: "rear", lcls: { [id]: "s-done" }, msg: "rear = n." });
        } else {
          snap({ at: "empty", msg: `dequeue(): front == NULL? → <b>${front == null}</b>.`, log: `${k + 1}. ${op.text}` });
          if (front == null) { out.push("E"); snap({ at: "empty", bad: true, msg: "Празна → -1." }); return; }
          const id = front; out.push(String(nodes[id].v));
          snap({ at: "read", lcls: { [id]: "s-cmp" }, msg: `*out = front->v = <b>${nodes[id].v}</b>.` });
          front = nodes[id].next;
          snap({ at: "unlink", lcls: { [id]: "s-swap" }, msg: "front = n->next." });
          if (front == null) { rear = null; snap({ at: "clearrear", lcls: { [id]: "s-swap" }, msg: "Опашката стана празна → и <b>rear = NULL</b>. Иначе rear би сочил освободен възел." }); }
          nodes[id].freed = true;
          snap({ at: "free", lcls: { [id]: "s-dim" }, msg: "free(n)." });
          delete nodes[id];
        }
      });
      let len = 0; for (let c = front; c != null; c = nodes[c].next) len++;
      snap({ done: true, msg: `Край. Изход: <b>${out.join(" ") || "—"}</b>; в опашката: ${len}.` });
      return { frames: F, out: out.join(" ") || "-", len, rearNull: rear == null ? 1 : 0 };
    },

    /** Дек върху кръгов буфер. */
    deque({ prog, C }) {
      const ops = parseProg(prog, { pushb: { args: 1 }, pushf: { args: 1 }, popf: { args: 0 }, popb: { args: 0 } });
      C = S.int(C, 2, 12, "Капацитет C");
      const a = new Array(C).fill(null);
      let head = 0, size = 0;
      const out = [], F = [];
      const snap = (o) => F.push(Object.assign({ a: a.slice(), head, size, C, out: out.slice(), vars: { head, size, back: (head + size - 1 + C) % C } }, o));
      snap({ msg: "Празен дек: head = 0, size = 0." });
      ops.forEach((op, k) => {
        const log = `${k + 1}. ${op.text}`;
        if (op.name === "pushb" || op.name === "pushf") {
          if (size === C) { out.push("full"); snap({ at: "full", bad: true, msg: `${op.name}(${op.args[0]}): пълен → -1.`, log }); return; }
          if (op.name === "pushb") { const t = (head + size) % C; a[t] = op.args[0]; size++; snap({ at: "pb", hi: { [t]: "s-done" }, msg: `push_back(${op.args[0]}): a[(head+size) mod C] = a[${t}].`, log }); }
          else { head = (head - 1 + C) % C; a[head] = op.args[0]; size++; snap({ at: "pf", hi: { [head]: "s-done" }, msg: `push_front(${op.args[0]}): head = (head − 1 + C) mod C = ${head}. „+ C“ пази остатъка неотрицателен (в C % на отрицателно число е отрицателен).`, log }); }
        } else {
          if (!size) { out.push("E"); snap({ at: "empty", bad: true, msg: `${op.name}(): празен → -1.`, log }); return; }
          if (op.name === "popf") { const v = a[head]; out.push(String(v)); a[head] = null; const o = head; head = (head + 1) % C; size--; snap({ at: "popf", hi: { [o]: "s-swap" }, msg: `pop_front → <b>${v}</b>; head = ${head}.`, log }); }
          else { const t = (head + size - 1) % C; const v = a[t]; out.push(String(v)); a[t] = null; size--; snap({ at: "popb", hi: { [t]: "s-swap" }, msg: `pop_back → a[${t}] = <b>${v}</b>.`, log }); }
        }
      });
      snap({ done: true, msg: `Край. Изход: <b>${out.join(" ") || "—"}</b>.` });
      return { frames: F, out: out.join(" ") || "-", head, size };
    },
  };

  /* ---------- рисуване ---------- */
  const pills = (lab, arr) => h("div", { class: "t4out" }, h("span", { class: "muted", text: lab }), ...(arr.length ? arr.map((x) => h("span", { class: "pill " + (x === "full" || x === "E" ? "s-swap" : ""), text: x })) : [h("span", { class: "muted", text: "—" })]));

  function drawRing(st, f, two) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const cls = {}; f.a.forEach((v, i) => { if (v == null) cls[i] = "s-dim"; });
    Object.assign(cls, f.hi || {});
    if (f.bad) f.a.forEach((v, i) => { if (v != null) cls[i] = "s-swap"; });
    const t = two ? f.tail : (f.head + f.size) % f.C;
    T4.ring(row, f.a, { head: f.head, tail: t, cls, tn: "tail", center: two ? `${(f.tail - f.head + f.C) % f.C}/${f.C - 1}` : `size ${f.size}/${f.C}` });
    const lin = h("div", { class: "t4col", style: { minWidth: "0" } }, h("span", { class: "t4cap", text: "същият масив, разгънат" }));
    const box = h("div", { class: "t4scroll" });
    const ptr = { head: f.head }; if (t !== f.head) ptr.tail = t; else ptr["head=tail"] = t;
    S.drawArray(box, f.a, { cls, ptr: t === f.head ? { "h=t": t } : ptr });
    lin.append(box);
    // логически ред
    const ord = []; const n = two ? (f.tail - f.head + f.C) % f.C : f.size;
    for (let k = 0; k < n; k++) ord.push(`${f.a[(f.head + k) % f.C]}@${(f.head + k) % f.C}`);
    lin.append(h("div", { class: "t4out" }, h("span", { class: "muted", text: "логически ред (стойност@индекс):" }), ...(ord.length ? ord.map((x) => h("span", { class: "pill", text: x })) : [h("span", { class: "muted", text: "празно" })])));
    lin.append(pills("изход:", f.out));
    row.append(lin);
    st.append(row);
  }

  function drawLinked(st, f) {
    st.innerHTML = "";
    const ptr = {};
    if (f.front != null) (ptr[f.front] = ptr[f.front] || []).push("front");
    if (f.rear != null) (ptr[f.rear] = ptr[f.rear] || []).push("rear");
    const box = h("div", { class: "t4scroll" });
    T4.list(box, f.list, { ptr, cls: f.lcls, headName: "front" });
    st.append(box, pills("изход:", f.out));
  }

  function drawOrder(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4mini" });
    const sc = h("div", { class: "t4col" }, h("span", { class: "t4cap", text: "стек (връх вдясно)" }));
    S.drawArray(sc, f.st.length ? f.st : [null], { append: true, cls: f.st.length ? { [f.st.length - 1]: "s-act" } : { 0: "s-dim" }, index: false });
    sc.append(pills("изважда:", f.os.map(String)));
    const qc = h("div", { class: "t4col" }, h("span", { class: "t4cap", text: "опашка (начало вляво)" }));
    S.drawArray(qc, f.q.length ? f.q : [null], { append: true, cls: f.q.length ? { 0: "s-act" } : { 0: "s-dim" }, index: false });
    qc.append(pills("изважда:", f.oq.map(String)));
    row.append(sc, qc);
    st.append(row);
  }

  const html = `
<div class="prose">
  <p><dfn data-g="опашка">Опашката</dfn> поддържа дисциплина <dfn data-g="fifo">FIFO</dfn>: първият добавен е първият изваден. <dfn data-g="enqueue">enqueue</dfn> добавя в края, <dfn data-g="dequeue">dequeue</dfn> премахва отпред, front прочита първия. <dfn data-g="приоритетна опашка">Приоритетната опашка</dfn> е различен АТД: редът се определя от приоритет, а не просто от пристигането.</p>
</div>

<div class="block">
  <h3>Стекът и опашката имат различен ред на изваждане (схема 6)</h3>
  <div id="v3-ord"></div>
</div>

<div class="block">
  <h3>Кръгов буфер с head и size (схема 7)</h3>
  <p class="prose"><dfn data-g="кръгов буфер">Кръговият буфер</dfn> използва масив с фиксиран капацитет C, начало head и брой size. Следващата позиция за запис е (head+size) mod C. При премахване head става (head+1) mod C, а size намалява. Така не се преместват всички елементи. Празно означава size=0, а пълно — size=C. При capacity=6, head=3 и size=4 редът е 3,4,5,0; следващата позиция за запис е 1 — бутонът „схема 7“ стига до точно това състояние.</p>
  <div class="key"><span class="formula">tail = (head + size) mod C</span><br><span class="formula">head ← (head + 1) mod C</span><br><span class="formula">празно: size = 0;  пълно: size = C</span></div>
  <div id="v3-ring"></div>
  <details class="hint"><summary>Хинт: политиката при препълване</summary><div>
    <p>Ако буферът е пълен, трябва да е ясно дали записът <b>отказва</b>, <b>изчаква</b> или <b>презаписва</b> най-старите данни. Това е семантика, която не следва от самата кръгова форма. Отметката „презаписване“ показва третия вариант — удобен за лог на последните N измервания, недопустим за опашка от команди. Изчакването изисква синхронизация (виж FreeRTOS Queue по-долу).</p>
  </div></details>
</div>

<div class="block">
  <h3>Само head и tail: как се различават пълно и празно</h3>
  <p class="prose">При реализация само с два индекса трябва да се реши как се различават пълно и празно състояние. Самите head и tail могат да дадат еднакви индекси и при празно, и при пълно. Варианти са отделен брояч, флаг или оставяне на една неизползвана позиция. Последният вариант намалява полезния капацитет — виж го тук.</p>
  <div id="v3-ring2"></div>
  <details class="trap"><summary>Капан: „head == tail значи празно“</summary><div>
    <p>Само ако договорът гарантира, че буферът никога не се запълва докрай (празна клетка) или ако има брояч/флаг. Без такова правило след C записа tail се връща точно на head и състоянието е неразличимо от празното. Сравни горния визуализатор (с size — използва всички C клетки) с този (без size — C − 1 клетки).</p>
  </div></details>
</div>

<div class="block">
  <h3>Свързана опашка</h3>
  <p class="prose">Свързаната опашка пази указатели към първия и последния възел. Добавянето в края и премахването отпред са Θ(1). При премахване на последния елемент и двата указателя трябва да отразяват празното състояние. Ако се пази само първият възел, намирането на края може да изисква Θ(n).</p>
  <div id="v3-lq"></div>
  <details class="trap"><summary>Капан: забравеното rear = NULL</summary><div>
    <p>След dequeue на последния елемент front става NULL, но ако rear не се нулира, той сочи освободен възел. Следващото enqueue ще запише <code>rear-&gt;next = n</code> в освободена памет. Пробвай бутона „изпразване“ — стъпката <code>rear = NULL</code> е изрично показана.</p>
  </div></details>
</div>

<div class="block">
  <h3>Дек и приоритетна опашка</h3>
  <p class="prose"><dfn data-g="дек">Deque</dfn>, double-ended queue, допуска добавяне и премахване в двата края. В кръгов буфер това е естествено: push_front мести head назад с прехвърляне. Приоритетната опашка избира по приоритет, а не непременно по време на пристигане; честа нейна реализация е двоичната пирамида — виж <a href="#dopalnenie">раздел 8</a> <span class="extra-tag">разширение</span>.</p>
  <div id="v3-dq"></div>
  <p class="muted">Кръговият масив и кръговият свързан списък (схема 8) са и двете логически кръгови, но достъпът и представянето им са различни: първият е индексен с mod, вторият — по указатели. Виж <a href="#spisak">раздел 4</a>.</p>
</div>

<div class="block">
  <h3>Приложения и реални опашки</h3>
  <p class="prose">Опашки се използват при обслужване на заявки и обход в ширина (<dfn data-g="bfs">BFS</dfn>). При граф всеки новооткрит връх се маркира и поставя в опашката; така се обработват последователни слоеве. За граф със списъци на съседство обходът е O(V+E). Обходът на дърво по нива в <a href="#darvo">раздел 5</a> е същият механизъм.</p>
  <p class="prose">Реални опашки: C++ <code>std::queue</code>; Python <code>collections.deque</code> с append и popleft; FreeRTOS Queue за обмен между задачи. Последната добавя и синхронизация, копиране на елементи и правила за изчакване. Тя не е просто масив с индекси, защото договорът включва конкурентен достъп и изчакване (<dfn data-g="rtos">RTOS</dfn>).</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v3-ord"), {
      id: "c3ord", title: "Една поредица — стек и опашка", sub: "Въведи стойности; първо всички се добавят, после всички се изваждат.", code: false,
      inputs: [{ id: "vals", label: "Стойности", value: "4 7 2", width: "14em" }],
      random: () => ({ vals: S.randArray(S.randInt(3, 7), 1, 50).join(" ") }),
      build: algos.order, draw: drawOrder,
    });
    S.viz(root.querySelector("#v3-ring"), {
      id: "c3ring", title: "Кръгов буфер (head + size)", sub: "операции: <code>enq x</code>, <code>deq</code>, <code>front</code>",
      code: "ch03_ring",
      inputs: [
        { id: "prog", label: "Програма", value: "enq 4, enq 7, enq 2, deq, front", width: "22em" },
        { id: "C", label: "C", type: "number", value: 6, width: "4em" },
        { id: "head0", label: "начален head", type: "number", value: 0, width: "4em" },
        { id: "ow", label: "презаписване при пълно", type: "checkbox", value: false },
      ],
      presets: [
        { label: "схема 7: head 3, ред 3,4,5,0", values: { prog: "enq 10, enq 11, enq 12, enq 13", C: 6, head0: 3, ow: false } },
        { label: "прехвърляне и пълно", values: { prog: "enq 1, enq 2, enq 3, enq 4, deq, deq, deq, enq 5, enq 6, enq 7, enq 8, enq 9", C: 6, head0: 3, ow: false } },
        { label: "презаписване", values: { prog: "enq 1, enq 2, enq 3, enq 4, enq 5, deq, deq", C: 4, head0: 0, ow: true } },
      ],
      legend: [["s-cmp", "tail / чете се"], ["s-done", "записан"], ["s-swap", "изваден / отказ"], ["s-dim", "свободна"]],
      build: algos.ring, draw: (st, f) => drawRing(st, f, false),
    });
    S.viz(root.querySelector("#v3-ring2"), {
      id: "c3ring2", title: "Кръгов буфер само с head и tail", sub: "операции: <code>enq x</code>, <code>deq</code>",
      code: "ch03_ring2",
      inputs: [{ id: "prog", label: "Програма", value: "enq 1, enq 2, enq 3, enq 4, deq, enq 5, enq 6", width: "22em" }, { id: "C", label: "C", type: "number", value: 4, width: "4em" }],
      presets: [{ label: "празно", values: { prog: "deq, enq 7, deq, deq", C: 5 } }],
      legend: [["s-cmp", "(tail+1)%C / чете се"], ["s-done", "записан"], ["s-swap", "отказ"]],
      build: algos.ring2, draw: (st, f) => drawRing(st, f, true),
    });
    S.viz(root.querySelector("#v3-lq"), {
      id: "c3lq", title: "Свързана опашка (front, rear)", sub: "операции: <code>enq x</code>, <code>deq</code>",
      code: "ch03_linked",
      inputs: [{ id: "prog", label: "Програма", value: "enq 4, enq 7, enq 2, deq, deq", width: "22em" }],
      presets: [{ label: "изпразване", values: { prog: "enq 1, deq, deq, enq 5" } }],
      legend: [["s-done", "нов"], ["s-cmp", "чете се / rear"], ["s-swap", "откачен"], ["s-dim", "освободен"]],
      build: algos.linked, draw: drawLinked,
    });
    S.viz(root.querySelector("#v3-dq"), {
      id: "c3dq", title: "Дек върху кръгов буфер", sub: "операции: <code>pushb x</code>, <code>pushf x</code>, <code>popf</code>, <code>popb</code>",
      code: "ch03_deque",
      inputs: [{ id: "prog", label: "Програма", value: "pushb 1, pushb 2, pushf 0, pushf 9, popb, popf, popf", width: "24em" }, { id: "C", label: "C", type: "number", value: 5, width: "4em" }],
      presets: [{ label: "пълен", values: { prog: "pushf 1, pushf 2, pushf 3, pushf 4, pushb 5, popb, popb", C: 4 } }],
      legend: [["s-done", "добавен"], ["s-swap", "изваден / отказ"], ["s-dim", "свободна"]],
      build: algos.deque, draw: (st, f) => drawRing(st, Object.assign({}, f), false),
    });
  }

  S.chapter({ id: "opashka", order: 3, num: "3", group: "Линейни структури", title: "Опашка", lead: "FIFO. Кръгов буфер с формулите за head/tail, разграничаване на пълно и празно, свързана опашка и дек.", html, mount, algos });
})();
