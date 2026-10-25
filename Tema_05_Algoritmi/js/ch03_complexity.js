/* Раздел 3 — Изчислителна сложност. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "елементарна операция": { cat: "Сложност", t: "Елементарна операция", en: "Elementary operation", d: "Стъпка, която в избрания изчислителен модел се брои като една единица време (сравнение, присвояване, аритметика с думи с фиксирана дължина).", more: "Операция с произволно голямо цяло число не е винаги един такт — зависи от модела." },
    "изчислителен модел": { cat: "Сложност", t: "Изчислителен модел", en: "Model of computation", d: "Формално описание кои операции са разрешени и колко струва всяка (машина на Тюринг, RAM модел, модел на сравненията).", more: "Долните граници зависят от модела: Ω(n log n) важи за сортиране чрез сравнения." },
    "ред на растеж": { cat: "Сложност", t: "Ред на растеж", en: "Order of growth", d: "Как нараства функцията при n → ∞, без постоянните множители и по-нисшите членове.", more: "1 → log n → n → n log n → n² → 2ⁿ → n!" },
  });

  /* ---------- функции за растеж ---------- */
  const lg = (x) => Math.log2(x);
  const fact = (n) => { let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
  const FN = [
    { k: "1", t: "1", f: () => 1, col: "--muted", dash: [2, 3], ex: "константен" },
    { k: "log", t: "log₂ n", f: (n) => (n < 1 ? 0 : lg(n)), col: "--st-done", dash: [], ex: "логаритмичен" },
    { k: "n", t: "n", f: (n) => n, col: "--st-act", dash: [], ex: "линеен" },
    { k: "nlog", t: "n log₂ n", f: (n) => (n < 1 ? 0 : n * lg(n)), col: "--st-piv", dash: [], ex: "n log n" },
    { k: "n2", t: "n²", f: (n) => n * n, col: "--st-cmp", dash: [], ex: "квадратичен" },
    { k: "n3", t: "n³", f: (n) => n * n * n, col: "--st-cmp", dash: [7, 4], ex: "кубичен" },
    { k: "2n", t: "2ⁿ", f: (n) => Math.pow(2, n), col: "--st-swap", dash: [], ex: "експоненциален" },
    { k: "fact", t: "n!", f: fact, col: "--st-swap", dash: [7, 4], ex: "факториален" },
  ];
  const UNIVERSE_S = 13.8e9 * 365.25 * 86400;
  /** време при 10⁹ операции/сек, в човешки единици */
  function human(ops) {
    const s = ops / 1e9;
    if (s > UNIVERSE_S) return "по-дълго от възрастта на Вселената";
    const Y = 365.25 * 86400;
    const trim = (x) => (x.includes(".") ? x.replace(/\.?0+$/, "") : x);
    const f = (v, u) => (v >= 100 ? Math.round(v).toLocaleString("bg") : trim(v >= 10 ? v.toFixed(1) : v.toFixed(2))) + " " + u;
    if (s < 1e-6) return f(s * 1e9, "ns");
    if (s < 1e-3) return f(s * 1e6, "µs");
    if (s < 1) return f(s * 1e3, "ms");
    if (s < 60) return f(s, "s");
    if (s < 3600) return f(s / 60, "мин");
    if (s < 86400) return f(s / 3600, "часа");
    if (s < Y) return f(s / 86400, "дни");
    if (s < 1e6 * Y) return f(s / Y, "години");
    return (s / Y).toExponential(1).replace("e+", "·10^") + " години";
  }
  const fmtNum = (v) => (v < 1e6 ? (Number.isInteger(v) ? v.toLocaleString("bg") : v.toFixed(2)) : v.toExponential(2).replace("e+", "·10^"));

  /* ---------- фрагменти ---------- */
  const FRAG = {
    single: { key: "ch03_single", t: "единичен цикъл", formula: "n", f: (n) => n },
    nested: { key: "ch03_nested", t: "два вложени цикъла", formula: "n²", f: (n) => n * n },
    tri: { key: "ch03_tri", t: "триъгълен цикъл", formula: "n(n+1)/2", f: (n) => (n * (n + 1)) / 2 },
    double: { key: "ch03_double", t: "удвояване i *= 2", formula: "⌊log₂ n⌋ + 1", f: (n) => (n < 1 ? 0 : Math.floor(lg(n)) + 1) },
    rec: { key: "ch03_rec", t: "рекурсия T(n)=2T(n/2)+n", formula: "n·log₂ n (точно при n = 2ᵏ)", f: (n) => (n < 1 ? 0 : n * lg(n)) },
  };
  const STEP_MAX = 260;

  /* ---------- чисти функции ---------- */
  const algos = {
    frag({ frag, n }) {
      const D = FRAG[frag];
      if (!D) throw new Error("Непознат фрагмент.");
      n = S.int(n, 0, 60, "n");
      let count = 0;
      const F = [];
      // точен брой (същият код като в C)
      const run = {
        single() { for (let i = 0; i < n; i++) count++; },
        nested() { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) count++; },
        tri() { for (let i = 0; i < n; i++) for (let j = i; j < n; j++) count++; },
        double() { for (let i = 1; i <= n; i *= 2) count++; },
        rec() { const r = (m) => { if (m <= 1) return; for (let i = 0; i < m; i++) count++; r(Math.floor(m / 2)); r(m - Math.floor(m / 2)); }; r(n); },
      };
      run[frag]();
      const total = count, fv = D.f(n);
      const step = total <= STEP_MAX;
      count = 0;
      if (step) {
        const ops = []; // за рисуване
        const st = () => ({ count });
        const P = (o) => F.push(Object.assign({ frag, n, step: true, ops: ops.slice(), stats: st() }, o));
        if (frag === "single") {
          for (let i = 0; ; i++) {
            P({ at: "loop", vars: { n, i }, i, msg: `i &lt; n? ${i} &lt; ${n} → <b>${i < n}</b>` });
            if (i >= n) break;
            count++; ops.push([i]);
            P({ at: "op", vars: { n, i }, i, msg: `<code>count++</code> → ${count}`, log: `i=${i}: count=${count}` });
          }
        } else if (frag === "nested" || frag === "tri") {
          for (let i = 0; ; i++) {
            P({ at: "outer", vars: { n, i }, i, msg: `Външен: i &lt; n? ${i} &lt; ${n} → <b>${i < n}</b>` });
            if (i >= n) break;
            for (let j = frag === "tri" ? i : 0; j < n; j++) {
              count++; ops.push([i, j]);
              P({ at: ["op", "inner"], vars: { n, i, j }, i, j, msg: `j = ${j}: <code>count++</code> → ${count}`, log: `(${i},${j}) count=${count}` });
            }
          }
        } else if (frag === "double") {
          for (let i = 1; ; i *= 2) {
            P({ at: "loop", vars: { n, i }, i, msg: `i &lt;= n? ${i} &lt;= ${n} → <b>${i <= n}</b>` });
            if (i > n) break;
            count++; ops.push([i]);
            P({ at: "op", vars: { n, i }, i, msg: `<code>count++</code> → ${count}. После i *= 2.`, log: `i=${i}: count=${count}` });
          }
        } else {
          const calls = [];
          const r = (m, off, d) => {
            const c = { off, m, d, st: "act" }; calls.push(c);
            const snap = () => calls.map((x) => Object.assign({}, x));
            P({ at: "enter", vars: { n: m, depth: d }, calls: snap(), msg: `Извикване rec(${m}) на дълбочина ${d}.` });
            if (m <= 1) { c.st = "done"; P({ at: "base", vars: { n: m }, calls: snap(), msg: `n ≤ 1 — базов случай, 0 операции.` }); return; }
            count += m; ops.push([m]);
            P({ at: "op", vars: { n: m, depth: d }, calls: snap(), msg: `Цикълът прави ${m} пъти <code>count++</code> → ${count}.`, log: `rec(${m}): +${m} → ${count}` });
            P({ at: "left", vars: { n: m }, calls: snap(), msg: `Ляво: rec(${Math.floor(m / 2)}).` });
            r(Math.floor(m / 2), off, d + 1);
            P({ at: "right", vars: { n: m }, calls: calls.map((x) => Object.assign({}, x)), msg: `Дясно: rec(${m - Math.floor(m / 2)}).` });
            r(m - Math.floor(m / 2), off + Math.floor(m / 2), d + 1);
            c.st = "done";
          };
          r(n, 0, 0);
        }
      }
      F.push({ frag, n, step, final: true, at: frag === "rec" ? "op" : "op", stats: { count: total }, vars: { n, count: total }, fv, total,
        msg: `Общо <b>count = ${total}</b>. Формула ${D.formula} = ${Number.isInteger(fv) ? fv : fv.toFixed(2)}.${step ? "" : ` (Стъпковият режим е до ${STEP_MAX} операции — тук е показан само резултатът.)`}`,
        calls: F.length && F[F.length - 1].calls ? F[F.length - 1].calls.map((c) => Object.assign({}, c, { st: "done" })) : null, ops: F.length ? F[F.length - 1].ops : [] });
      return { frames: F, result: total };
    },

    lsearch({ n, pos }) {
      n = S.int(n, 1, 20, "n");
      pos = S.int(pos, -1, n - 1, "Позицията");
      const a = Array.from({ length: n }, (_, i) => 10 * (i + 1));
      const key = pos < 0 ? 7 : a[pos];
      const F = [];
      let cmp = 0;
      const extra = { a, n, key };
      for (let i = 0; i < n; i++) {
        F.push(Object.assign({ at: "loop", i, vars: { i, key }, stats: { сравнения: cmp }, msg: `i = ${i}.` }, extra));
        cmp++;
        const hit = a[i] === key;
        F.push(Object.assign({ at: "cmp", i, hit, vars: { i, "a[i]": a[i], key }, stats: { сравнения: cmp }, msg: `Сравнение №${cmp}: a[${i}] = ${a[i]} ${hit ? "==" : "≠"} ${key}.`, log: `a[${i}] ${hit ? "==" : "≠"} ${key}` }, extra));
        if (hit) { F.push(Object.assign({ at: "cmp", i, hit, final: true, vars: { return: i }, stats: { сравнения: cmp }, msg: `Намерен след <b>${cmp}</b> сравнения.` }, extra)); return { frames: F, result: i, cmp }; }
      }
      F.push(Object.assign({ at: "miss", i: n, final: true, vars: { return: -1 }, stats: { сравнения: cmp }, msg: `Липсва: <b>${cmp} = n</b> сравнения — най-лошият случай.` }, extra));
      return { frames: F, result: -1, cmp };
    },

    theta({ c1, c2, nmax }) {
      c1 = Number(c1); c2 = Number(c2);
      if (!(c1 > 0) || !(c2 > 0)) throw new Error("c₁ и c₂ трябва да са положителни числа.");
      nmax = S.int(nmax ?? 40, 2, 60, "n max");
      const T = (n) => 3 * n * n + 5 * n + 7;
      const F = [];
      let last = 0;
      for (let n = 1; n <= nmax; n++) {
        const t = T(n), lo = c1 * n * n, hi = c2 * n * n;
        F.push({ at: "eval", n, last, vars: { n, "T(n)": t, "c1·n²": lo, "c2·n²": hi }, msg: `n = ${n}: ${lo} ≤ ${t} ≤ ${hi}?` });
        const bad = lo > t || t > hi;
        F.push({ at: "test", n, last, bad, vars: { n, last_bad: last }, msg: bad ? `<b>Нарушено</b> при n = ${n}${lo > t ? " (долната граница е над T)" : " (T е над горната граница)"}.` : `Изпълнено при n = ${n}.` });
        if (bad) { last = n; F.push({ at: "bad", n, last, bad: true, vars: { n, last_bad: last }, msg: `last_bad = ${n}.`, log: `нарушение при n=${n}` }); }
      }
      const res = last < nmax ? last + 1 : -1;
      F.push({ at: "ret", n: nmax, last, final: true, vars: { return: res }, msg: res > 0 ? `Минималното n₀ (проверено до ${nmax}) е <b>${res}</b>: за всяко n ≥ ${res} неравенствата са в сила.` : `Неравенствата се нарушават и при n = ${nmax} — с тези константи n₀ не съществува (в проверения интервал).`, log: `n0 = ${res}` });
      return { frames: F, result: res };
    },

    bits({ W }) {
      let w = Number(W), b = 0;
      if (!Number.isInteger(w) || w < 1) throw new Error("W ≥ 1");
      do { b++; w = Math.floor(w / 2); } while (w);
      return b;
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="времева сложност">Времевата сложност</dfn> е броят <dfn data-g="елементарна операция">елементарни операции</dfn>, а <dfn data-g="пространствена сложност">пространствената</dfn> — използваната памет, като функции от <dfn data-g="размер на входа">размера на входа n</dfn>. Във формалните класове P и NP размерът е <b>дължината на кодирането</b> (обикновено битове).</p>
  <p>За всяка оценка трябва да се посочат три неща: <dfn data-g="изчислителен модел">изчислителният модел</dfn>, размерът на входа и дали случаят е <dfn data-g="най-лош случай">най-лош, среден или най-добър</dfn>.</p>
</div>

<div class="block">
  <h3>Ред на растеж</h3>
  <p class="muted">Включи/изключи функции, смени n и скалата. Таблицата дава стойността и времето при 10⁹ операции в секунда.</p>
  <div id="growth"></div>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Клас</th><th>Запис</th><th>Пример</th></tr>
    <tr><td>константен</td><td>O(1)</td><td>фиксиран брой стъпки</td></tr>
    <tr><td>логаритмичен</td><td>O(log n)</td><td>двоично търсене</td></tr>
    <tr><td>линеен</td><td>O(n)</td><td>обхождане</td></tr>
    <tr><td>n log n</td><td>O(n log n)</td><td>сортиране чрез сливане</td></tr>
    <tr><td>полиномиален</td><td>O(n²), O(n³)</td><td>вложени цикли</td></tr>
    <tr><td>експоненциален</td><td>O(2ⁿ)</td><td>изброяване на подмножества</td></tr>
    <tr><td>факториален</td><td>O(n!)</td><td>пермутации</td></tr>
  </table></div>
  <div class="key"><p class="formula">1 → log n → n → n log n → n² → 2ⁿ → n!</p><p>Сравняват се стойности на функции, не секунди. Постоянните множители имат значение на практика, но експоненциалният растеж е качествено различен.</p></div>
  <details class="trap"><summary>Капан: „полиномиален = практично бърз“</summary><div>
    <p>Не непременно: O(n¹⁰) е <dfn data-g="полиномиално време">полиномиален</dfn>, но при n = 100 дава 10²⁰ операции. И обратно — по-бавна реализация не променя факта, че задачата е в P, ако съществува друг полиномиален алгоритъм.</p>
  </div></details>
</div>

<div class="block">
  <h3>Брой операции на реален код</h3>
  <p class="prose">Броим <code>count++</code> — същият брояч като в C. Това е функцията T(n); асимптотиката е нейният <dfn data-g="ред на растеж">ред на растеж</dfn>.</p>
  <div id="v-frag"></div>
  <details class="hint"><summary>Хинт: откъде идват формулите</summary><div>
    <p><b>Триъгълен:</b> при i = 0 вътрешният прави n стъпки, при i = 1 — n − 1, …, при i = n − 1 — 1. Сумата е n(n+1)/2 = Θ(n²): половината от квадрата, но същият ред на растеж.</p>
    <p><b>Удвояване:</b> i приема 1, 2, 4, …, 2ᵏ ≤ n, т.е. k = ⌊log₂ n⌋, броят итерации е k + 1.</p>
    <p><b>Рекурсия:</b> на всяко ниво на дървото сборът от размерите е n, нивата са ~log₂ n ⇒ n log₂ n. Подробно в <a href="#razdelyai">разделяй и владей</a>.</p>
  </div></details>
</div>

<div id="asym-host" style="display:grid;gap:22px;min-width:0"></div>

<div class="block">
  <h3>Θ стъпка по стъпка: намиране на c₁, c₂ и n₀</h3>
  <p class="prose">Доказателство на живо: T(n) = 3n² + 5n + 7 = Θ(n²). Намери c₁, c₂ и n₀. Опитай c₁ = 3, c₂ = 4 — кое е минималното n₀?</p>
  <div id="theta-box"></div>
  <div id="v-theta"></div>
  <details class="hint"><summary>Хинт: как се избират константите</summary><div>
    <p>Долна: 3n² ≤ 3n² + 5n + 7 винаги ⇒ c₁ = 3, произволно n₀. Горна с c₂ = 4: нужно е n² ≥ 5n + 7, вярно от n = 7 (49 ≥ 42), невярно при n = 6 (36 &lt; 37). Колкото по-голямо е c₂, толкова по-рано започва неравенството (c₂ = 10 → n₀ = 2).</p>
    <p>При c₁ &gt; 3 долната граница се нарушава за всички големи n — водещият коефициент е 3.</p>
  </div></details>
  <details class="trap"><summary>Капан: „O(n²) значи най-лош случай“</summary><div>
    <p>O само по себе си <b>не задава</b> най-лош/среден/най-добър случай. Първо се избира коя функция се ограничава (напр. времето в най-лошия случай), после се дава граница за нея.</p>
  </div></details>
</div>

<div class="block">
  <h3>Най-лош, среден, най-добър случай</h3>
  <p class="prose">Линейното търсене в масив a[i] = 10(i+1). Премести ключа или го направи „липсващ“.</p>
  <div id="ls-ctrl" class="row"></div>
  <div id="v-ls"></div>
  <div class="key"><p class="formula">най-добър: 1 · най-лош: n · среден: (n+1)/2</p><p>Средният е при равномерно разпределена позиция на ключа, който е в масива: (1 + 2 + … + n)/n = (n+1)/2. Най-добрият случай е константен, най-лошият — линеен.</p></div>
  <details class="trap"><summary>Капан: „O(n²) е долна граница за сортирането“</summary><div>
    <p>O(n²) за пряк избор не е доказана долна граница за <i>задачата</i>: сливането е Θ(n log n). Долните граници зависят от модела: Ω(n log n) за сортиране чрез сравнения не забранява други методи при допълнителни предпоставки за ключовете (напр. counting sort). Merge Sort е Θ(n log n), но различни реализации имат различни константи.</p>
  </div></details>
</div>

<div class="block">
  <h3>Числова стойност срещу битова дължина</h3>
  <p class="prose">За едно число W двоичното представяне има ~log₂ W бита. Алгоритъм, който прави W стъпки, е полиномиален спрямо <i>стойността</i>, но може да е експоненциален спрямо <i>битовата дължина</i> — това е <dfn data-g="псевдополиномиален алгоритъм">псевдополиномиалност</dfn> (раницата 0/1 в <a href="#dp">динамичното програмиране</a>).</p>
  <div id="pseudo"></div>
  <details class="trap"><summary>Капан: „операция с число = 1 такт“</summary><div>
    <p>Реална операция с произволно голямо цяло число не е винаги един такт. В RAM модела думата е с фиксирана дължина; числото с b бита струва поне ~b елементарни стъпки.</p>
  </div></details>
  <div class="key"><p>P и NP са класове <b>задачи</b>, не оценки на конкретен алгоритъм — следва в <a href="#pnp">раздел 4</a>.</p></div>
</div>`;

  /* ---------- canvas помощник ---------- */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";
  function setupCanvas(cv, H) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  }
  const redrawers = [];

  function growth(host) {
    const on = new Set(["log", "n", "nlog", "n2", "2n"]);
    let N = 20, logScale = true;
    const nIn = h("input", { type: "range", min: 1, max: 60, value: N, "aria-label": "n", id: "gr-n" });
    const nLab = h("b", { class: "mono", text: "n = " + N });
    const scBtn = h("button", { class: "btn", "aria-pressed": "true", text: "логаритмична скала" });
    const checks = h("div", { class: "legend", style: { gap: "8px 14px" } });
    FN.forEach((F) => {
      const cb = h("input", { type: "checkbox", checked: on.has(F.k) ? true : null, onchange: () => { if (cb.checked) on.add(F.k); else on.delete(F.k); draw(); } });
      const sw = h("canvas", { width: 26, height: 10, style: { verticalAlign: "middle" } });
      F._sw = sw;
      checks.append(h("label", { style: { display: "inline-flex", gap: "5px", alignItems: "center", cursor: "pointer" } }, cb, sw, h("span", { class: "mono", text: F.t })));
    });
    const cv = h("canvas", { class: "chart" });
    const tbl = h("div", { class: "tbl-wrap" });
    const box = h("div", { class: "viz" },
      h("div", { class: "viz-head" }, h("h4", { text: "Графика на растежа" }), h("span", { class: "sub", text: "Етикетът е в края на всяка линия — цветът не е единственият знак." })),
      h("div", { class: "viz-inputs" }, h("label", { class: "field", style: { flex: "1 1 220px" } }, h("span", null, nLab), nIn), scBtn, checks),
      h("div", { class: "viz-stage" }, cv, tbl));
    host.append(box);
    nIn.addEventListener("input", () => { N = +nIn.value; nLab.textContent = "n = " + N; draw(); });
    scBtn.onclick = () => { logScale = !logScale; scBtn.setAttribute("aria-pressed", logScale ? "true" : "false"); scBtn.textContent = logScale ? "логаритмична скала" : "линейна скала"; draw(); };
    function draw() {
      FN.forEach((F) => { const c = F._sw.getContext("2d"); c.clearRect(0, 0, 26, 10); c.strokeStyle = css(F.col); c.lineWidth = 2.5; c.setLineDash(F.dash); c.beginPath(); c.moveTo(1, 5); c.lineTo(25, 5); c.stroke(); });
      const { ctx, W, H } = setupCanvas(cv, 320);
      const L = 56, R = 86, T = 12, B = 30, pw = W - L - R, ph = H - T - B;
      const vis = FN.filter((F) => on.has(F.k));
      const ymaxLin = Math.max(1, ...vis.map((F) => F.f(N)));
      const ymaxLog = Math.max(1, ...vis.map((F) => Math.log10(Math.max(1, F.f(N)))));
      const sx = (n) => L + ((n - 1) / Math.max(1, N - 1)) * pw;
      const sy = (v) => logScale ? T + ph - (Math.log10(Math.max(1, v)) / ymaxLog) * ph : T + ph - (v / ymaxLin) * ph;
      ctx.clearRect(0, 0, W, H);
      ctx.font = "11px " + css("--f-mono"); ctx.fillStyle = css("--muted"); ctx.strokeStyle = css("--line"); ctx.lineWidth = 1;
      // мрежа
      const ticks = logScale ? Array.from({ length: Math.floor(ymaxLog) + 1 }, (_, k) => Math.pow(10, k)).filter((_, k, a) => a.length < 9 || k % Math.ceil(a.length / 8) === 0) : [0, .25, .5, .75, 1].map((q) => q * ymaxLin);
      ticks.forEach((v) => { const y = sy(v); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); ctx.textAlign = "right"; ctx.fillText(logScale ? (v >= 1e4 ? "10^" + Math.round(Math.log10(v)) : String(v)) : fmtNum(v), L - 6, y + 4); });
      ctx.textAlign = "center";
      [1, Math.ceil(N / 2), N].forEach((n) => ctx.fillText("n=" + n, sx(n), H - 10));
      // линии
      const ends = [];
      vis.forEach((F) => {
        ctx.strokeStyle = css(F.col); ctx.lineWidth = 2.2; ctx.setLineDash(F.dash); ctx.beginPath();
        for (let n = 1; n <= N; n++) { const y = Math.max(T - 2, sy(F.f(n))); if (n === 1) ctx.moveTo(sx(n), y); else ctx.lineTo(sx(n), y); }
        ctx.stroke(); ctx.setLineDash([]);
        ends.push({ F, y: Math.max(T + 6, sy(F.f(N))) });
      });
      ends.sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
      ctx.textAlign = "left"; ctx.font = "600 12px " + css("--f-mono");
      ends.forEach((e) => { ctx.fillStyle = css(e.F.col); ctx.fillText(e.F.t, L + pw + 6, Math.min(H - 4, e.y + 4)); });
      // таблица
      tbl.innerHTML = "";
      const t = h("table", { class: "t", style: { marginTop: "12px" } }, h("tr", null, h("th", { text: "функция" }), h("th", { text: `стойност при n = ${N}` }), h("th", { text: "време при 10⁹ оп./с" })));
      FN.forEach((F) => { const v = F.f(N); t.append(h("tr", { class: on.has(F.k) ? "" : "muted" }, h("td", { class: "mono", text: F.t }), h("td", { class: "mono", text: fmtNum(v) }), h("td", { text: human(v) }))); });
      tbl.append(t);
    }
    draw();
    redrawers.push(draw);
  }

  function thetaBox(host, vizApi) {
    let c1 = 3, c2 = 4, n0 = 7;
    const NM = 40;
    const mk = (lab, min, max, step, val, set) => {
      const out = h("b", { class: "mono", text: val });
      const r = h("input", { type: "range", min, max, step, value: val, "aria-label": lab, oninput: () => { set(+r.value); out.textContent = r.value; draw(); } });
      return h("label", { class: "field", style: { flex: "1 1 160px" } }, h("span", null, lab + " = ", out), r);
    };
    const cv = h("canvas", { class: "chart" });
    const info = h("div", { class: "viz-msg" });
    const box = h("div", { class: "viz" },
      h("div", { class: "viz-head" }, h("h4", { text: "c₁n² ≤ 3n² + 5n + 7 ≤ c₂n²" }), h("span", { class: "sub", text: "Червените точки са нарушения при n ≥ n₀." })),
      h("div", { class: "viz-inputs" }, mk("c₁", 0.5, 5, 0.5, c1, (v) => (c1 = v)), mk("c₂", 3, 10, 0.5, c2, (v) => (c2 = v)), mk("n₀", 1, 40, 1, n0, (v) => (n0 = v)),
        h("button", { class: "btn", text: "Провери в C стъпково ↓", onclick: () => { vizApi().setValues({ c1, c2 }); vizApi().apply(); vizApi().root.scrollIntoView({ behavior: "smooth", block: "start" }); } })),
      h("div", { class: "viz-stage" }, cv), info);
    host.append(box);
    const T = (n) => 3 * n * n + 5 * n + 7;
    function draw() {
      const { ctx, W, H } = setupCanvas(cv, 300);
      const L = 60, R = 70, Tp = 10, B = 28, pw = W - L - R, ph = H - Tp - B;
      const ymax = Math.max(T(NM), c2 * NM * NM, c1 * NM * NM);
      const sx = (n) => L + ((n - 1) / (NM - 1)) * pw, sy = (v) => Tp + ph - (v / ymax) * ph;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = css("--panel-2"); ctx.fillRect(sx(n0), Tp, L + pw - sx(n0), ph);
      ctx.font = "11px " + css("--f-mono"); ctx.fillStyle = css("--muted"); ctx.textAlign = "center";
      [1, 10, 20, 30, 40].forEach((n) => ctx.fillText("n=" + n, sx(n), H - 8));
      ctx.fillText("n₀", sx(n0), Tp + 12);
      const labs = [];
      const line = (f, col, dash, lab) => {
        ctx.strokeStyle = css(col); ctx.setLineDash(dash); ctx.lineWidth = 2; ctx.beginPath();
        for (let n = 1; n <= NM; n++) n === 1 ? ctx.moveTo(sx(n), sy(f(n))) : ctx.lineTo(sx(n), sy(f(n)));
        ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = css(col); ctx.textAlign = "left"; ctx.font = "600 12px " + css("--f-mono");
        let y = sy(f(NM)) + 4;
        while (labs.some((q) => Math.abs(q - y) < 13)) y += 13;
        labs.push(y);
        ctx.fillText(lab, L + pw + 6, y);
      };
      line((n) => c2 * n * n, "--st-cmp", [6, 4], "c₂n²");
      line(T, "--ink", [], "T(n)");
      line((n) => c1 * n * n, "--st-act", [6, 4], "c₁n²");
      const bad = [];
      for (let n = 1; n <= NM; n++) {
        const ok = c1 * n * n <= T(n) && T(n) <= c2 * n * n;
        if (n >= n0 && !ok) bad.push(n);
        ctx.fillStyle = css(n < n0 ? "--st-dim" : ok ? "--st-done" : "--st-swap");
        ctx.beginPath(); ctx.arc(sx(n), sy(T(n)), n >= n0 && !ok ? 4.5 : 3, 0, 7); ctx.fill();
      }
      const r = algos.theta({ c1, c2, nmax: NM }).result;
      info.innerHTML = bad.length
        ? `<div><b>Не е доказателство:</b> при n ≥ ${n0} има ${bad.length} нарушения (n = ${bad.slice(0, 8).join(", ")}${bad.length > 8 ? ", …" : ""}).${r > 0 ? ` С тези c₁, c₂ минималното n₀ е <b>${r}</b>.` : " С тези константи n₀ не съществува — смени c₁ или c₂."}</div>`
        : `<div><b>✓ Изпълнено</b> за всички n от ${n0} до ${NM} (числено). Минималното n₀ за c₁ = ${c1}, c₂ = ${c2} е <b>${r}</b>.</div>`;
    }
    draw();
    redrawers.push(draw);
  }

  function pseudo(host) {
    const r = h("input", { type: "range", min: 0, max: 400, value: 100, "aria-label": "log₂ W × 10", style: { width: "100%" } });
    const out = h("div", { class: "cards", style: { marginTop: "10px" } });
    const tb = h("div", { class: "tbl-wrap" });
    const left = h("div", null, h("label", { class: "field" }, h("span", { text: "W (логаритмичен плъзгач, 1 … 2⁴⁰)" }), r), out, tb);
    const right = h("div");
    S.codeView(right, "ch03_pseudo", ["bits", "loop"]);
    host.append(h("div", { class: "viz" }, h("div", { class: "viz-head" }, h("h4", { text: "Стойност W срещу брой битове" })), h("div", { class: "viz-stage" }, h("div", { class: "split" }, left, right))));
    const card = (t, v, sub) => h("div", { class: "card" }, h("span", { class: "eyebrow", text: t }), h("h4", { class: "mono", text: v }), sub ? h("p", { text: sub }) : null);
    function draw() {
      const W = Math.max(1, Math.round(Math.pow(2, +r.value / 10)));
      const b = algos.bits({ W });
      out.innerHTML = "";
      out.append(card("W", fmtNum(W)), card("битове = ⌊log₂ W⌋ + 1", String(b), "това е размерът на входа"),
        card("стъпки на count_to(W)", fmtNum(W), "≈ 2^" + (b - 1) + " … 2^" + b + " спрямо битовете"), card("време при 10⁹ оп./с", human(W)));
      tb.innerHTML = "";
      const t = h("table", { class: "t", style: { marginTop: "10px" } }, h("tr", null, h("th", { text: "битове b" }), h("th", { text: "най-голямо W = 2ᵇ − 1" }), h("th", { text: "време" })));
      [b, b + 1, b + 2, b + 10].forEach((x, k) => { const w = Math.pow(2, x) - 1; t.append(h("tr", { class: k === 0 ? "" : "" }, h("td", { class: "mono", text: (k ? "+" + (x - b) + " → " : "") + x }), h("td", { class: "mono", text: fmtNum(w) }), h("td", { text: human(w) }))); });
      tb.append(t, h("p", { class: "muted", style: { marginTop: "6px" }, text: "+1 бит удвоява W, следователно удвоява и времето. Полином на битовете не може да расте така." }));
    }
    r.addEventListener("input", draw);
    draw();
  }

  function mount(root) {
    new MutationObserver(() => redrawers.forEach((f) => f())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("resize", () => redrawers.forEach((f) => f()));
    growth(root.querySelector("#growth"));

    /* фрагменти */
    const fApi = S.viz(root.querySelector("#v-frag"), {
      id: "frag", title: "count++ на реален код", sub: `Стъпков режим до ${STEP_MAX} операции; над това — само резултатът.`,
      code: (inp) => (FRAG[inp.frag] || FRAG.single).key,
      inputs: [{ id: "frag", label: "Фрагмент", type: "select", value: "tri", options: Object.keys(FRAG).map((k) => [k, FRAG[k].t]) }, { id: "n", label: "n (0…60)", type: "number", value: 6, width: "6em", live: true }],
      presets: [{ label: "рекурсия n = 8", values: { frag: "rec", n: 8 } }, { label: "удвояване n = 60", values: { frag: "double", n: 60 } }],
      speed: 2,
      legend: [["s-act", "текуща операция"], ["s-done", "изпълнена"], ["s-dim", "не се изпълнява"]],
      build: algos.frag,
      draw(st, f) {
        st.innerHTML = "";
        const D = FRAG[f.frag];
        if (f.step || f.final) {
          if ((f.frag === "nested" || f.frag === "tri") && f.n <= 20 && f.n > 0) {
            const done = new Set(f.ops.map((o) => o.join(",")));
            const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "i\\j" }), ...Array.from({ length: f.n }, (_, j) => h("th", { text: j }))));
            for (let i = 0; i < f.n; i++) {
              const tr = h("tr", null, h("th", { text: i }));
              for (let j = 0; j < f.n; j++) {
                const cls = f.i === i && f.j === j && !f.final ? "s-act" : done.has(i + "," + j) ? "s-done" : f.frag === "tri" && j < i ? "s-dim" : "";
                tr.append(h("td", { class: cls, text: cls === "s-done" || cls === "s-act" ? "✓" : "" }));
              }
              tb.append(tr);
            }
            st.append(h("div", { class: "tbl-wrap" }, tb));
          } else if ((f.frag === "single" || f.frag === "double") && f.n > 0) {
            const lab = Array.from({ length: f.n }, (_, k) => k + (f.frag === "double" ? 1 : 0));
            const cls = {};
            f.ops.forEach((o) => (cls[o[0] - (f.frag === "double" ? 1 : 0)] = "s-done"));
            if (!f.final && f.i != null && f.i - (f.frag === "double" ? 1 : 0) < f.n) cls[f.i - (f.frag === "double" ? 1 : 0)] = "s-act";
            const wrap = h("div", { style: { overflowX: "auto" } });
            st.append(wrap);
            S.drawArray(wrap, lab, { cls, index: false, dim: f.frag === "double" ? (k) => !cls[k] : null });
          } else if (f.frag === "rec" && f.calls && f.n > 0) {
            const maxD = Math.max(...f.calls.map((c) => c.d));
            const W = 620, rowH = 30;
            const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${(maxD + 1) * rowH + 10}`, width: W });
            const sx = (x) => 60 + (x / f.n) * (W - 70);
            for (let d = 0; d <= maxD; d++) svg.append(S.svg("text", { x: 4, y: d * rowH + 22, class: "wt", text: "ниво " + d }));
            f.calls.forEach((c, k) => {
              const cur = k === f.calls.length - 1 && !f.final;
              const g = S.svg("g", { class: "node " + (cur ? "s-act" : c.m <= 1 ? "s-dim" : "s-done") }, S.svg("rect", { x: sx(c.off) + 1, y: c.d * rowH + 5, width: Math.max(2, sx(c.off + c.m) - sx(c.off) - 2), height: rowH - 8, rx: 3, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--line));stroke-width:1.5" }));
              svg.append(g);
              if (sx(c.off + c.m) - sx(c.off) > 18) svg.append(S.svg("text", { x: (sx(c.off) + sx(c.off + c.m)) / 2, y: c.d * rowH + 23, "text-anchor": "middle", text: c.m }));
            });
            st.append(svg, h("p", { class: "muted", text: "Всеки ред е ниво на рекурсията; сборът от размерите на всяко пълно ниво е n." }));
          }
        }
        if (f.final) {
          const all = Object.keys(FRAG).map((k) => algos.frag({ frag: k, n: f.n }).result);
          const row = h("div", { class: "split", style: { marginTop: "12px" } });
          row.append(h("div", { class: "key" }, h("p", { class: "formula", text: `count = ${f.total}` }), h("p", { text: `формула ${D.formula} = ${Number.isInteger(f.fv) ? f.fv : f.fv.toFixed(2)}` })));
          const bars = h("div");
          row.append(bars);
          st.append(row);
          S.drawBars(bars, all, { height: 130, cls: { [Object.keys(FRAG).indexOf(f.frag)]: "s-act" }, fmt: (v) => v });
          bars.append(h("p", { class: "muted", style: { marginTop: "4px", fontSize: ".8rem" }, text: "0 единичен · 1 вложени · 2 триъгълен · 3 удвояване · 4 рекурсия (при същото n)" }));
        }
      },
    });
    const nr = h("input", { type: "range", min: 0, max: 60, value: 6, "aria-label": "n", style: { width: "160px" }, oninput: () => { fApi.setValues({ n: nr.value }); fApi.apply(); fApi.go(fApi.frames.length - 1); } });
    fApi.root.querySelector(".viz-inputs").prepend(h("label", { class: "field" }, h("span", { text: "плъзгач за n" }), nr));

    /* линейно търсене */
    const lsApi = S.viz(root.querySelector("#v-ls"), {
      id: "ls", title: "Брой сравнения според позицията на ключа", sub: "pos = −1 означава „липсва“.",
      code: "ch03_lsearch",
      inputs: [{ id: "n", label: "n (1…20)", type: "number", value: 10, width: "6em" }, { id: "pos", label: "позиция на ключа", type: "number", value: 4, width: "6em" }],
      presets: [{ label: "най-добър (0)", values: { pos: 0 } }, { label: "последен", values: { pos: 9, n: 10 } }, { label: "липсва", values: { pos: -1 } }],
      legend: [["s-cmp", "сравнява се"], ["s-done", "намерен"], ["s-dim", "проверен"]],
      build: algos.lsearch,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {};
        if (f.i < f.n) cls[f.i] = f.hit ? "s-done" : "s-cmp";
        S.drawArray(st, f.a, { cls, ptr: f.i < f.n ? { i: f.i } : {}, dim: (k) => k < f.i });
        const n = f.n;
        st.append(h("div", { class: "row" }, h("span", { class: "pill s-done", text: "най-добър: 1" }), h("span", { class: "pill s-swap", text: "най-лош: " + n }), h("span", { class: "pill s-cmp", text: `среден: (n+1)/2 = ${(n + 1) / 2}` }), h("span", { class: "pill s-act", text: "тук: " + f.stats["сравнения"] })));
      },
    });
    const pr = h("input", { type: "range", min: -1, max: 9, value: 4, "aria-label": "позиция", style: { width: "200px" }, oninput: () => { lsApi.setValues({ pos: pr.value }); lsApi.apply(); lsApi.go(lsApi.frames.length - 1); } });
    lsApi.root.querySelector(".viz-inputs").prepend(h("label", { class: "field" }, h("span", { text: "плъзгач: позиция (−1 = липсва)" }), pr));
    lsApi.root.querySelector("#ls-n").addEventListener("change", (e) => { pr.max = Math.max(0, +e.target.value - 1); });

    /* O, Ω, Θ, o, ω — лаборатория (js/ch03_asym.js) */
    if (S.asymLab) S.asymLab(root.querySelector("#asym-host"));

    /* Θ */
    let thApi = null;
    thetaBox(root.querySelector("#theta-box"), () => thApi);
    thApi = S.viz(root.querySelector("#v-theta"), {
      id: "theta", title: "Числена проверка: минималното n₀ (n = 1…40)", sub: "Същото като min_n0() в C.",
      code: "ch03_theta",
      inputs: [{ id: "c1", label: "c₁", type: "number", value: 3, step: 0.5, width: "5em" }, { id: "c2", label: "c₂", type: "number", value: 4, step: 0.5, width: "5em" }],
      presets: [{ label: "c₂ = 10", values: { c1: 1, c2: 10 } }, { label: "c₁ = 4 (твърде голямо)", values: { c1: 4, c2: 5 } }],
      speed: 3,
      legend: [["s-done", "изпълнено"], ["s-swap", "нарушено"], ["s-act", "текущо n"]],
      build: (inp) => algos.theta({ c1: inp.c1, c2: inp.c2, nmax: 40 }),
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const badSet = new Set(frames.filter((x, k) => x.at === "bad" && k <= frames.indexOf(f)).map((x) => x.n));
        const cells = Array.from({ length: 40 }, (_, k) => k + 1);
        const cls = {};
        cells.forEach((n, k) => { if (n < f.n || f.final) cls[k] = badSet.has(n) ? "s-swap" : "s-done"; });
        if (!f.final) cls[f.n - 1] = f.bad ? "s-swap" : "s-act";
        const w = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "3px" } });
        cells.forEach((n, k) => w.append(h("span", { class: "pill " + (cls[k] || ""), text: n, style: { minWidth: "2.4em", textAlign: "center" } })));
        st.append(w);
      },
    });

    pseudo(root.querySelector("#pseudo"));

  }

  S.chapter({ id: "slozhnost", order: 3, num: "3", group: "Изчислимост и сложност", title: "Изчислителна сложност", lead: "Колко ресурси струва алгоритъмът? Растеж на функциите, броене на операции, O/Ω/Θ, случаи и битова дължина.", html, mount, algos });
})();
