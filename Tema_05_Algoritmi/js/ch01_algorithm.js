/* Раздел 1 — Понятие за алгоритъм, свойства, коректност. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции: генерират стъпките (тестват се и в node) ---------- */
  const algos = {
    linear_search({ arr, key }) {
      const a = S.parseNums(arr, { minLen: 0, maxLen: 20 });
      key = S.int(key, -1e6, 1e6, "Търсеното");
      const n = a.length, F = [];
      let cmp = 0;
      const inv = (i) => ({ text: i === 0 ? `key=${key} не е в a[0..−1] (празно — вярно тривиално)` : `key=${key} не е в a[0..${i - 1}]`, ok: !a.slice(0, i).includes(key) });
      F.push({ at: "enter", vars: { n, key }, msg: `Влизаме в <code>linear_search</code> с n = ${n}.`, a, i: -1, log: `вход n=${n}, key=${key}` });
      for (let i = 0; i < n; i++) {
        F.push({ at: "loop", vars: { n, key, i }, a, i, msg: `Проверка на условието <code>i &lt; n</code>: ${i} &lt; ${n} — вярно, продължаваме.`, inv: inv(i), stats: { сравнения: cmp } });
        cmp++;
        const hit = a[i] === key;
        F.push({ at: "cmp", vars: { n, key, i, "a[i]": a[i] }, a, i, cmp: true, hit, msg: `Сравняваме <code>a[${i}] == key</code>: ${a[i]} == ${key} → <b>${hit}</b>.`, inv: inv(i), stats: { сравнения: cmp }, log: `a[${i}]=${a[i]} ${hit ? "==" : "≠"} ${key}` });
        if (hit) {
          F.push({ at: "found", vars: { n, key, i, return: i }, a, i, hit: true, done: true, msg: `Намерено на индекс <b>${i}</b>. Връщаме ${i}. Направени са ${cmp} сравнения.`, stats: { сравнения: cmp }, log: `return ${i}` , result: i});
          return { frames: F, result: i, cmp };
        }
      }
      F.push({ at: "loop", vars: { n, key, i: n }, a, i: n, msg: `Условието <code>i &lt; n</code> е невярно (${n} &lt; ${n}). Цикълът свършва.`, inv: inv(n), stats: { сравнения: cmp } });
      F.push({ at: "notfound", vars: { n, key, return: -1 }, a, i: n, done: true, msg: `Инвариантът при i = n гласи: key не е в целия масив. Затова <b>−1</b> е правилен отговор — отрицателният отговор също е резултат.`, inv: inv(n), stats: { сравнения: cmp }, log: "return -1", result: -1 });
      return { frames: F, result: -1, cmp };
    },

    gcd_euclid({ a, b }) {
      a = S.int(a, 0, 1e9, "a"); b = S.int(b, 0, 1e9, "b");
      const g = (x, y) => { while (y) [x, y] = [y, x % y]; return x; };
      const G = g(a, b), F = [], rows = [];
      let it = 0;
      const inv = (x, y) => ({ text: `НОД(${x}, ${y}) = ${g(x, y)} = НОД(a₀, b₀)`, ok: g(x, y) === G });
      F.push({ at: "enter", vars: { a, b }, rows: [], cur: [a, b], msg: `Начално състояние (a, b) = (${a}, ${b}).`, inv: inv(a, b), log: `(${a}, ${b})` });
      while (true) {
        F.push({ at: "cond", vars: { a, b }, rows: rows.slice(), cur: [a, b], msg: `<code>b != 0</code>? ${b} != 0 → <b>${b !== 0}</b>.${b ? "" : " Цикълът свършва."}`, inv: inv(a, b), stats: { итерации: it } });
        if (b === 0) break;
        const r = a % b;
        F.push({ at: "mod", vars: { a, b, r }, rows: rows.slice(), cur: [a, b], r, msg: `r = a mod b = ${a} mod ${b} = <b>${r}</b>. Остатъкът е строго по-малък от b — рангът намалява.`, inv: inv(a, b), stats: { итерации: it } });
        rows.push([a, b, r]);
        a = b; b = r; it++;
        F.push({ at: "shift", vars: { a, b, r }, rows: rows.slice(), cur: [a, b], msg: `Ново състояние (a, b) = (${a}, ${b}). Общите делители са същите, защото всеки общ делител на a и b дели и a − q·b.`, inv: inv(a, b), stats: { итерации: it }, log: `(${a}, ${b})` });
      }
      F.push({ at: "ret", vars: { a, b, return: a }, rows: rows.slice(), cur: [a, b], done: true, msg: `b = 0, следователно НОД = a = <b>${a}</b>. Инвариантът + b = 0 дават резултата: НОД(a, 0) = a.`, inv: inv(a, b), stats: { итерации: it }, log: `return ${a}` });
      return { frames: F, result: a, it };
    },

    is_even_partial({ x, cap }) {
      let v = S.int(x, -50, 50, "x");
      cap = S.int(cap, 5, 200, "Лимит");
      const x0 = v, F = [];
      F.push({ at: "enter", vars: { x: v }, x: v, x0, msg: `Вход x = ${v}.`, log: `x = ${v}` });
      let k = 0;
      while (true) {
        F.push({ at: "cond", vars: { x: v }, x: v, x0, msg: `<code>x != 0</code>? ${v} != 0 → <b>${v !== 0}</b>.`, stats: { стъпки: k } });
        if (v === 0) break;
        if (k >= cap) {
          F.push({ at: "cond", vars: { x: v }, x: v, x0, stuck: true, msg: `Лимитът от ${cap} стъпки е изчерпан. x вече е ${v} и само намалява — <b>никога</b> няма да стане 0. Програмата не завършва ⇒ няма <dfn data-g="пълна коректност">пълна коректност</dfn>.`, stats: { стъпки: k }, inv: { text: "Частична коректност: ако беше спряла, отговорът „четно“ щеше да е верен", ok: true } });
          return { frames: F, halted: false };
        }
        v -= 2; k++;
        F.push({ at: "step", vars: { x: v }, x: v, x0, msg: `x = x − 2 → ${v}.`, stats: { стъпки: k }, log: `x = ${v}` });
      }
      F.push({ at: "ret", vars: { x: v, return: 1 }, x: v, x0, done: true, msg: `Спря след ${k} стъпки и върна „четно“ — вярно за x = ${x0}.`, stats: { стъпки: k }, inv: { text: "Спряла ⇒ резултатът е верен (частична коректност)", ok: true } });
      return { frames: F, halted: true };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="алгоритъм">Алгоритъмът</dfn> е крайно, точно зададено описание на ефективно изпълними операции, чрез които от допустими входни данни се получава резултат. Той е абстрактен метод; <dfn data-g="програма">програмата</dfn> е конкретна реализация на метода.</p>
</div>

<div class="block" id="b-levels">
  <h3>Четири равнища на описание</h3>
  <p class="muted">Щракни върху равнище. Всяко отговаря на различен въпрос — объркването им е най-честата грешка на изпита.</p>
  <div class="cards" id="levels"></div>
  <div class="key" id="level-detail"></div>
</div>

<div class="block">
  <h3>Шестте класически свойства</h3>
  <p class="muted">Всяка карта показва свойството. „Покажи нарушение“ дава C код, в който то не е изпълнено.</p>
  <div class="cards" id="props"></div>
  <div id="prop-code"></div>
</div>

<div class="block">
  <h3>Коректност: частична и пълна</h3>
  <div class="split">
    <div class="key"><b>Частична коректност</b><p>Ако алгоритъмът завърши, резултатът е правилен.</p></div>
    <div class="key"><b>Пълна коректност</b><p>Частична коректност + завършване за всеки допустим вход.</p></div>
  </div>
  <p class="prose">Доказателствата използват <dfn data-g="инвариант на цикъл">инвариант на цикъла</dfn> (за верността) и <dfn data-g="рангова функция">рангова функция</dfn> (за завършването). Трите стъпки за инвариант: <b>инициализация</b> (вярно преди първата итерация), <b>запазване</b> (ако е вярно преди итерация, остава вярно след нея), <b>завършване</b> (при излизане от цикъла инвариантът + условието за изход дават резултата).</p>
  <div id="v-linear"></div>
  <details class="hint"><summary>Хинт: как да кажеш инварианта на линейното търсене на изпита</summary><div>
    <p>„Преди проверката на позиция i търсеният елемент не е открит сред позициите 0..i−1.“ При i = 0 това е празно множество — тривиално вярно (инициализация). Ако a[i] ≠ key, преминаваме към i+1 и твърдението остава вярно (запазване). При i = n: елементът не е в целия масив ⇒ връщаме −1 (завършване).</p>
    <p>Завършването на цикъла: ранговата функция n − i е неотрицателна и намалява с 1 на всяка итерация.</p>
  </div></details>
  <div id="v-gcd"></div>
  <details class="hint"><summary>Хинт: защо НОД(a, b) = НОД(b, a mod b)</summary><div>
    <p>a mod b = a − q·b. Всяко d, което дели a и b, дели и a − q·b. Обратно, всяко d, което дели b и a − q·b, дели и a = (a − q·b) + q·b. Значи двете двойки имат <b>едни и същи</b> общи делители, следователно и същия най-голям.</p>
    <p>Завършване: 0 ≤ a mod b &lt; b, така че b строго намалява и е неотрицателно ⇒ след краен брой стъпки b = 0.</p>
  </div></details>
  <div id="v-partial"></div>
  <details class="trap"><summary>Капан: „никога не връща грешен резултат“ ≠ „решава задачата“</summary><div>
    <p>Програма, която никога не спира, никога не връща грешен отговор — и въпреки това не решава задачата. Затова пълната коректност изисква и завършване.</p>
  </div></details>
</div>

<div class="block">
  <h3>Евклидов алгоритъм като преходи на състояние</h3>
  <p class="prose">Свойството <dfn data-g="дискретност">дискретност</dfn> се вижда най-ясно, ако алгоритъмът се гледа като машина на състояния: всяка итерация е преход (a, b) → (b, a mod b). Визуализацията по-горе показва точно тази последователност в таблицата.</p>
</div>`;

  const LEVELS = [
    { k: "Задача", q: "Какво се търси?", ex: "„Подреди n числа в ненамаляващ ред.“ Спецификация: изходът е пермутация на входа и a[i] ≤ a[i+1].", note: "Задачата има много алгоритми. Класовете P и NP се отнасят до задачи." },
    { k: "Алгоритъм", q: "Как се намира?", ex: "Merge Sort: раздели наполовина, сортирай всяка половина, слей. Θ(n log n).", note: "Един алгоритъм има много програми. Сложността O/Ω/Θ се изследва за алгоритми." },
    { k: "Програма", q: "Как е реализиран?", ex: "Функция <code>merge_sort(int *a, int n)</code> на C, компилирана с gcc за ARM Cortex-M.", note: "Езикът и платформата са ниво на реализация — не променят класа на задачата." },
    { k: "Изпълнение", q: "Какво стана този път?", ex: "Изпълнение върху конкретен масив от 10 000 елемента: 1.8 ms, 120 412 сравнения.", note: "Едно измерване не доказва асимптотична граница." },
  ];
  const PROPS = [
    { g: "дискретност", t: "Дискретност", d: "Процесът е последователност от отделни стъпки или преходи между състояния.", code: null },
    { g: "определеност", t: "Определеност", d: "В детерминиран алгоритъм всяко действие е еднозначно. Не е универсално — има вероятностни и недетерминирани модели.", code: "prop_definiteness" },
    { g: "масовост", t: "Масовост", d: "Прилага се към клас от допустими входове, не към един пример.", code: "prop_mass" },
    { g: "крайност", t: "Крайност", d: "Описанието е крайно; за решаващ алгоритъм — завършване за всеки допустим вход.", code: "prop_finiteness" },
    { g: "резултатност", t: "Резултатност", d: "При завършване резултатът отговаря на спецификацията. „Няма такъв“ също е резултат.", code: "prop_result" },
    { g: "изпълнимост", t: "Изпълнимост", d: "Всяка операция е точно дефинирана и изпълнима в модела.", code: "prop_exec" },
  ];

  function mount(root) {
    // равнища
    const lv = root.querySelector("#levels"), det = root.querySelector("#level-detail");
    const btns = LEVELS.map((L, i) => h("button", { class: "card", "aria-pressed": i === 0 ? "true" : "false", onclick: () => pick(i) },
      h("span", { class: "eyebrow", text: `Равнище ${i + 1}` }), h("h4", { text: L.k }), h("p", { text: L.q })));
    lv.append(...btns);
    function pick(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const L = LEVELS[i];
      det.innerHTML = `<p><b>${L.k}</b> — ${L.q}</p><p>Пример: ${L.ex}</p><p class="muted">${L.note}</p>`;
    }
    pick(0);

    // свойства
    const pc = root.querySelector("#props"), pcode = root.querySelector("#prop-code");
    PROPS.forEach((P) => {
      const c = h("div", { class: "card" }, h("h4", null, h("dfn", { "data-g": P.g, text: P.t })), h("p", { text: P.d }));
      if (P.code) c.append(h("button", { class: "btn", style: { justifySelf: "start" }, text: "Покажи нарушение", onclick: () => {
        pcode.innerHTML = "";
        pcode.append(h("p", { class: "muted", style: { marginBottom: "6px" }, html: `Нарушено свойство: <b>${P.t}</b>. Подсветеният ред е проблемът.` }));
        S.codeView(pcode, P.code, "bug");
      } }));
      else c.append(h("p", { class: "muted", text: "Виж стъпките в демонстрациите по-долу — всяка стъпка е отделен преход." }));
      pc.append(c);
    });

    // линейно търсене
    S.viz(root.querySelector("#v-linear"), {
      id: "linear", title: "Линейно търсене с инвариант", sub: "Сивите клетки вече са проверени — инвариантът твърди, че key не е сред тях.",
      code: "linear_search",
      inputs: [{ id: "arr", label: "Масив a[]", value: "7 3 9 4 1 8", width: "16em" }, { id: "key", label: "key", type: "number", value: 4, width: "6em" }],
      presets: [{ label: "Липсващ ключ", values: { key: 5 } }, { label: "Първи елемент", values: { key: 7 } }, { label: "Празен масив", values: { arr: "", key: 3 } }],
      random: () => { const a = S.randArray(8, 1, 20); return { arr: a.join(" "), key: Math.random() < .7 ? a[S.randInt(0, 7)] : 21 }; },
      legend: [["s-dim", "проверено (инвариант)"], ["s-cmp", "сравнява се"], ["s-done", "намерено"]],
      build: algos.linear_search,
      draw(st, f) {
        const cls = {};
        if (f.i >= 0 && f.i < f.a.length) cls[f.i] = f.hit ? "s-done" : f.cmp ? "s-cmp" : "s-act";
        if (!f.a.length) { st.innerHTML = '<p class="muted">Празен масив: n = 0, цикълът не се изпълнява нито веднъж.</p>'; return; }
        S.drawArray(st, f.a, { cls, ptr: f.i >= 0 && f.i < f.a.length ? { i: f.i } : {}, dim: (k) => k < f.i && !cls[k] });
      },
    });

    // НОД
    S.viz(root.querySelector("#v-gcd"), {
      id: "gcd", title: "Алгоритъм на Евклид — преходи (a, b) → (b, a mod b)", sub: "Лентите показват b: строго намалява до 0 (рангова функция).",
      code: "gcd_euclid",
      inputs: [{ id: "a", label: "a", type: "number", value: 84, width: "7em" }, { id: "b", label: "b", type: "number", value: 18, width: "7em" }],
      presets: [{ label: "1071, 462", values: { a: 1071, b: 462 } }, { label: "Фибоначи 89, 55", values: { a: 89, b: 55 }, title: "Най-лошият случай: съседни числа на Фибоначи" }, { label: "a < b", values: { a: 18, b: 84 } }],
      random: () => ({ a: S.randInt(20, 999), b: S.randInt(5, 500) }),
      build: algos.gcd_euclid,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "стъпка" }), h("th", { text: "a" }), h("th", { text: "b" }), h("th", { text: "a mod b" })));
        f.rows.forEach((r, k) => tb.append(h("tr", null, h("td", { text: k }), h("td", { text: r[0] }), h("td", { text: r[1] }), h("td", { text: r[2] }))));
        tb.append(h("tr", null, h("td", { class: "s-act", text: f.rows.length }), h("td", { class: f.done ? "s-done" : "s-act", text: f.cur[0] }), h("td", { class: "s-act", text: f.cur[1] }), h("td", { class: f.r != null ? "s-cmp" : "", text: f.r != null ? f.r : "" })));
        const wrap = h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, tb), h("div"));
        st.append(wrap);
        const bs = f.rows.map((r) => r[1]).concat([f.cur[1]]);
        S.drawBars(wrap.lastChild, bs, { height: 150, cls: { [bs.length - 1]: f.done ? "s-done" : "s-act" }, fmt: (v) => "b=" + v });
      },
    });

    // частична коректност
    S.viz(root.querySelector("#v-partial"), {
      id: "partial", title: "Частично, но не пълно коректна програма", sub: "is_even(x) връща „четно“, когато спре. За нечетно x никога не спира.",
      code: "is_even_partial",
      inputs: [{ id: "x", label: "x", type: "number", value: 6, width: "6em" }, { id: "cap", label: "лимит стъпки", type: "number", value: 12, width: "6em" }],
      presets: [{ label: "x = 7 (нечетно)", values: { x: 7 } }, { label: "x = −4", values: { x: -4 } }],
      build: algos.is_even_partial,
      draw(st, f) {
        st.innerHTML = "";
        const lo = Math.min(f.x0, f.x, -12), hi = Math.max(f.x0, 2);
        const W = 640, H = 70, sx = (v) => 20 + ((v - lo) / (hi - lo || 1)) * (W - 40);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        svg.append(S.svg("line", { x1: 20, y1: 35, x2: W - 20, y2: 35, class: "edge" }));
        for (let v = Math.ceil(lo); v <= hi; v++) if (v % 2 === 0 || hi - lo < 30) svg.append(S.svg("text", { x: sx(v), y: 62, "text-anchor": "middle", class: "wt", text: v }));
        svg.append(S.svg("g", { class: "node s-done" }, S.svg("circle", { cx: sx(0), cy: 35, r: 7 })));
        svg.append(S.svg("text", { x: sx(0), y: 18, "text-anchor": "middle", text: "цел: 0" }));
        svg.append(S.svg("g", { class: "node " + (f.stuck ? "s-swap" : f.done ? "s-done" : "s-act") }, S.svg("circle", { cx: sx(f.x), cy: 35, r: 11 })));
        st.append(svg);
        if (f.stuck) st.append(h("p", { class: "warn", text: "x прескочи 0 и продължава към −∞: условието x != 0 никога няма да стане невярно." }));
      },
    });

  }

  S.chapter({ id: "algoritam", order: 1, num: "1", group: "Основа", title: "Алгоритъм, свойства и коректност", lead: "Какво е алгоритъм, кои са шестте свойства и как се доказва, че е правилен и че спира.", html, mount, algos });
})();
