/* Раздел 6 — Предефиниране (претоварване) на операции: Complex. */
(function () {
  const S = window.Study, h = S.h;
  /* като printf("%g") / ostream по подразбиране: 6 значещи цифри, експоненциален запис при X < -4 или X >= 6 */
  const g6 = (v) => { if (v === 0) return Object.is(v, -0) ? "-0" : "0"; const [m, ex] = v.toExponential(5).split("e"), X = Number(ex);
    if (X < -4 || X >= 6) return m.replace(/\.?0+$/, "") + "e" + (X < 0 ? "-" : "+") + String(Math.abs(X)).padStart(2, "0");
    const f = v.toFixed(5 - X); return f.includes(".") ? f.replace(/\.?0+$/, "") : f; };
  const g = g6;
  const cs = (z) => `${g(z[0])}${z[1] < 0 ? "-" : "+"}${g(z[1] < 0 ? -z[1] : z[1])}i`;  // същото като operator<< (вкл. −0 → "+-0")

  /* Парсер с приоритета и асоциативността на C++: * преди + и -, всички — лявоасоциативни. */
  function parse(src, env) {
    const toks = String(src).match(/\s*([a-d]|[-+*()])\s*/g);
    if (!toks || toks.join("").replace(/\s/g, "") !== String(src).replace(/\s/g, "")) throw new Error("Допустими са променливите a, b, c, d, операциите + - * и скоби.");
    const tk = toks.map((x) => x.trim());
    let i = 0, nid = 0;
    const peek = () => tk[i], eat = (x) => { if (tk[i] !== x) throw new Error(`Очаква се „${x}“.`); i++; };
    function prim() {
      const t = tk[i++];
      if (t === "(") { const e = add(); eat(")"); e.paren = true; return e; }
      if (/^[a-d]$/.test(t)) return { id: nid++, v: t, val: env[t] };
      throw new Error(`Неочакван символ „${t == null ? "край" : t}“.`);
    }
    function mul() { let l = prim(); while (peek() === "*") { i++; l = { id: nid++, op: "*", l, r: prim() }; } return l; }
    function add() { let l = mul(); while (peek() === "+" || peek() === "-") { const op = tk[i++]; l = { id: nid++, op, l, r: mul() }; } return l; }
    const e = add();
    if (i !== tk.length) throw new Error(`Излишен символ „${tk[i]}“.`);
    return e;
  }

  const algos = {
    /** Изчислява израз от Complex стойности; кадър за всеки извикан оператор (ред: ляво поддърво, дясно, операцията). */
    complex({ a, b, c, d, expr }) {
      const pz = (s, n) => { try { return S.parseNums(s, { int: false, min: -999, max: 999, minLen: 2, maxLen: 2 }); } catch (e) { throw new Error(`${n}: въведи две числа „re im“ (${e.message})`); } };
      const env = { a: pz(a, "a"), b: pz(b, "b"), c: pz(c, "c"), d: pz(d, "d") };
      const tree = parse(expr, env);
      const F = [], order = [];
      let calls = 0;
      const vals = {};
      const TAG = { "+": ["plus", "plus_ret"], "-": ["minus", "minus"], "*": ["mul", "mul_ret"] };
      function ev(n) {
        if (n.v) { vals[n.id] = n.val; return n.val; }
        const L = ev(n.l), R = ev(n.r);
        let z;
        if (n.op === "+") z = [L[0] + R[0], L[1] + R[1]];
        else if (n.op === "-") z = [L[0] - R[0], L[1] - R[1]];
        else z = [L[0] * R[0] - L[1] * R[1], L[0] * R[1] + L[1] * R[0]];
        calls++; order.push(n.op); vals[n.id] = z;
        F.push({ at: TAG[n.op], tree, vals: Object.assign({}, vals), cur: n.id, vars: { "левият": cs(L), "десният": cs(R), [`operator${n.op}`]: cs(z) }, stats: { "извикани оператори": calls },
          msg: `<code>operator${n.op}(${cs(L)}, ${cs(R)})</code>${n.op === "*" ? ` = (${g(L[0])}·${g(R[0])} − ${g(L[1])}·${g(R[1])}) + (${g(L[0])}·${g(R[1])} + ${g(L[1])}·${g(R[0])})i` : ""} → <b>${cs(z)}</b>. Връща <b>нов</b> обект; операндите не се променят.`, log: `${n.op}: ${cs(z)}` });
        return z;
      }
      F.push({ at: null, tree, vals: {}, cur: null, msg: "Компилаторът разбира израза по <b>вградените</b> приоритет и асоциативност: <code>*</code> преди <code>+</code>/<code>-</code>, лявоасоциативни. Претоварването не ги променя — дървото е същото като за int." });
      const z = ev(tree);
      F.push({ at: ["out", "out_ret"], tree, vals: Object.assign({}, vals), cur: tree.id, done: true, vars: { резултат: cs(z) }, stats: { "извикани оператори": calls }, msg: `<code>std::cout &lt;&lt; r</code> → <code>operator&lt;&lt;</code> печата <b>${cs(z)}</b> и връща потока, за да може <code>cout &lt;&lt; a &lt;&lt; b</code>.`, log: "<< " + cs(z) });
      return { frames: F, result: cs(z), order: order.join("|"), single: tree.v != null };
    },
  };

  const html = `
<div class="prose">
  <p>В конспекта „предефиниране на операции“ се отнася до задаване на смисъл на оператори за потребителски типове — често наричано <dfn data-g="претоварване на оператор">претоварване на оператори</dfn>. Например <code>+</code> за комплексни числа връща число със сумирани реални и имагинерни части: (2+3i)+(4+i) = 6+4i.</p>
</div>

<div class="block">
  <h3>Израз от комплексни числа — дърво и извиквания</h3>
  <p class="prose">Въведи стойности и израз. Дървото се строи по приоритета на вградените оператори; всеки възел е едно извикване на <code>operator+</code>, <code>operator-</code> или <code>operator*</code>, подсветено в кода.</p>
  <div id="v-complex"></div>
  <details class="hint"><summary>Хинт: защо + е свободна функция, а += е член</summary><div>
    <p>Сборът е симетрична операция: свободната функция третира двата операнда еднакво (и позволява неявни преобразувания на <b>левия</b> операнд, ако типът има такива). Това е проектен избор. <code>+=</code> променя левия операнд, затова естествено е член и връща <code>*this</code>. Присвояването (<code>operator=</code>) задължително е член-функция.</p>
    <p><code>operator&lt;&lt;</code> е свободна функция, защото левият операнд е <code>std::ostream</code>, а не Complex; връща потока, за да работи веригата <code>cout &lt;&lt; a &lt;&lt; b</code> (програмата печата <code>chain = 2+3i 1-1i</code>).</p>
  </div></details>
</div>

<div class="block">
  <h3>Какво претоварването не може да промени</h3>
  <div class="split">
    <div class="card"><h4>Приоритет и асоциативност</h4><p><code>a + b * c</code> винаги е <code>a + (b * c)</code>; <code>a - b - c</code> винаги е <code>(a - b) - c</code>.</p></div>
    <div class="card"><h4>Арност и нови знаци</h4><p>Не могат да се създават произволни нови операторни знаци (напр. <code>**</code>) или да се променя броят операнди.</p></div>
    <div class="card"><h4>Вградените типове</h4><p>За обичайните претоварени бинарни оператори трябва да участва потребителски тип. Не всички оператори подлежат на претоварване.</p></div>
    <div class="card"><h4>Математическите свойства</h4><p>Езикът не доказва комутативност, асоциативност или неутрален елемент. Програмата печата <code>comm = 1 0</code>: a+b == b+a, но a−b ≠ b−a — свойството идва от реализацията.</p></div>
  </div>
  <details class="trap"><summary>Капан: + с поведение на +=</summary><div><p>Ако <code>+</code> тайно променя единия аргумент, синтаксисът подвежда клиента, дори кодът да е напълно допустим. Семантиката трябва да е съгласувана с очакванията: <code>+</code> не променя операндите, <code>+=</code> променя левия (опитът <code>r = a; r += b; r += c;</code> в програмата оставя <code>a</code> = 2+3i).</p></div></details>
  <details class="hint"><summary>Хинт: правилото на трите / петте <span class="extra-tag">извън конспекта</span></summary><div><p>Операторът за присвояване е и една от специалните операции на класа. Ако класът сам управлява ресурс, той дефинира копиращ конструктор, копиращо присвояване и деструктор (+ двете преместващи) заедно — проследено стъпка по стъпка в <a href="#zhivot">раздел 2</a>. Complex не притежава ресурс и следва правилото на нулата.</p></div></details>
  <div class="key">Предефинирането придава смисъл на съществуващ оператор за потребителски тип. Приоритет, асоциативност и арност остават същите; математическите свойства не следват автоматично.</div>
</div>`;

  function drawTree(st, f) {
    st.innerHTML = "";
    // позиция: инфиксно обхождане дава x
    const pos = {}; let k = 0;
    (function io(n, d) { if (n.op) io(n.l, d + 1); pos[n.id] = { x: k++, d }; if (n.op) io(n.r, d + 1); })(f.tree, 0);
    const maxD = Math.max(...Object.values(pos).map((p) => p.d));
    const W = Math.max(320, k * 92), H = (maxD + 1) * 74 + 10;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%" });
    const P = (id) => ({ x: 46 + pos[id].x * ((W - 92) / Math.max(1, k - 1)), y: 28 + pos[id].d * 74 });
    (function edges(n) { if (!n.op) return; [n.l, n.r].forEach((c) => { const a = P(n.id), b = P(c.id); svg.append(S.svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "edge" })); edges(c); }); })(f.tree);
    (function draw(n) {
      const p = P(n.id), v = f.vals[n.id] || (n.v ? n.val : null);
      const cls = n.id === f.cur ? "s-act" : v ? "s-done" : "";
      svg.append(S.svg("g", { class: "node " + cls }, S.svg("rect", { x: p.x - 42, y: p.y - 22, width: 84, height: 44, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }),
        S.svg("text", { x: p.x, y: p.y - 4, "text-anchor": "middle", text: n.op ? "operator" + n.op : n.v }),
        S.svg("text", { x: p.x, y: p.y + 14, "text-anchor": "middle", class: "wt", text: v ? cs(v) : "?" })));
      if (n.op) { draw(n.l); draw(n.r); }
    })(f.tree);
    st.append(svg);
  }

  function mount(root) {
    S.viz(root.querySelector("#v-complex"), {
      id: "complex", title: "Complex: дърво на израза и извиквания на оператори", sub: "Стойностите: „re im“.",
      code: "ch06_complex",
      inputs: [{ id: "a", label: "a", value: "2 3", width: "5.5em" }, { id: "b", label: "b", value: "4 1", width: "5.5em" }, { id: "c", label: "c", value: "1 -1", width: "5.5em" }, { id: "d", label: "d", value: "0 2", width: "5.5em" },
        { id: "expr", label: "израз", value: "a + b * c", width: "11em" }],
      presets: [{ label: "a + b (ръководството)", values: { a: "2 3", b: "4 1", expr: "a + b" } }, { label: "(a + b) * c", values: { expr: "(a + b) * c" } }, { label: "a - b - c", values: { expr: "a - b - c" } }, { label: "a * a * a", values: { expr: "a * a * a" } }],
      legend: [["s-act", "текущо извикване"], ["s-done", "изчислен"]],
      build: algos.complex, draw: drawTree,
    });
  }

  S.chapter({ id: "operacii", order: 6, num: "6", group: "Обобщаване", title: "Предефиниране на операции", lead: "operator+ за комплексни числа, свободна функция или член, какво претоварването не може да промени.", html, mount, algos });
})();
