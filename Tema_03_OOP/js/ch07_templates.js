/* Раздел 7 — Шаблони и статичен полиморфизъм. */
(function () {
  const S = window.Study, h = S.h;
  const PF = { int: "int", double: "double", char: "char", long: "long int", "const char*": "const char*" };   // както ги печата g++ в __PRETTY_FUNCTION__
  const SZ = { char: [1, 1], short: [2, 2], int: [4, 4], double: [8, 8], Big: [24, 1] };

  /* литерал → тип, както го извежда C++ */
  function lit(s) {
    s = s.trim();
    if (/^'.'$/.test(s)) return { t: "char", v: s[1], show: s };
    if (/^"[^"]*"$/.test(s)) return { t: "const char*", v: s.slice(1, -1), show: s };
    if (/^-?\d+L$/.test(s)) return { t: "long", v: Number(s.slice(0, -1)), show: s };
    if (/^-?\d+$/.test(s)) return { t: "int", v: Number(s), show: s };
    if (/^-?\d*\.\d+$|^-?\d+\.\d*$/.test(s)) return { t: "double", v: Number(s), show: s };
    throw new Error(`„${s}“ не е литерал (int, 2.5, 'c', 5L или "текст").`);
  }
  /* като printf("%g") / ostream по подразбиране: 6 значещи цифри, експоненциален запис при X < -4 или X >= 6 */
  const g6 = (v) => { if (v === 0) return Object.is(v, -0) ? "-0" : "0"; const [m, ex] = v.toExponential(5).split("e"), X = Number(ex);
    if (X < -4 || X >= 6) return m.replace(/\.?0+$/, "") + "e" + (X < 0 ? "-" : "+") + String(Math.abs(X)).padStart(2, "0");
    const f = v.toFixed(5 - X); return f.includes(".") ? f.replace(/\.?0+$/, "") : f; };
  const fmt = (t, v) => (t === "double" ? g6(v) : String(v));

  const algos = {
    /** Скрипт от извиквания на larger(...) → кои специализации се генерират и в какъв ред. */
    larger({ script }) {
      const calls = String(script).split(";").map((x) => x.trim()).filter(Boolean);
      if (!calls.length || calls.length > 10) throw new Error("Между 1 и 10 извиквания.");
      const F = [], inst = [], res = [];
      F.push({ at: "tpl", inst: [], msg: "<code>template&lt;class T&gt; T larger(T a, T b)</code> — само <b>описание</b> на семейство функции. Докато никой не я извика, не се генерира нито една функция.", log: "template larger<T>" });
      calls.forEach((c) => {
        const m = c.match(/^larger\s*(?:<\s*(int|double|char|long|const char\s*\*)\s*>)?\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
        if (!m) throw new Error(`„${c}“: пиши larger(x, y) или larger<тип>(x, y).`);
        const ex = m[1] ? m[1].replace(/\s*\*/, "*").replace("const char*", "const char*") : null;
        const A = lit(m[2]), B = lit(m[3]);
        let T, how;
        if (ex) {
          T = ex;
          const ok = (x) => x.t === T || (["int", "double", "char", "long"].includes(x.t) && ["int", "double", "char", "long"].includes(T));
          if (!ok(A) || !ok(B)) throw new Error(`„${c}“: ${A.t}/${B.t} не се преобразува към ${T}.`);
          how = `T е зададен явно = <b>${T}</b>${A.t !== T || B.t !== T ? "; аргументите се преобразуват" : ""}`;
        } else {
          if (A.t !== B.t) {
            F.push({ at: "conflict", inst: inst.slice(), err: true, call: c, msg: `<code>${c}</code>: от първия аргумент T = ${A.t}, от втория T = ${B.t} — <b>противоречиво извеждане, грешка при компилация</b>. Шаблонът не прави неявни преобразувания при извеждането. Решение: <code>larger&lt;double&gt;(…)</code>.`, inv: { text: "изведеният T трябва да е еднозначен", ok: false }, log: `${c} → грешка` });
            res.push("ERR");
            return;
          }
          T = A.t;
          how = `T се <b>извежда</b> от аргументите: ${A.show} и ${B.show} са ${T}`;
        }
        const isSpec = T === "const char*";
        const sig = isSpec ? "T larger(T, T) [with T = const char*]" : `T larger(T, T) [with T = ${PF[T]}]`;
        const fresh = !inst.includes(sig);
        const num = (x) => (x.t === "char" ? x.v.charCodeAt(0) : Number(x.v));   // 'a' -> 97 (стандартно преобразуване)
        const cv = (x) => {
          if (T === "int" || T === "long") return Math.trunc(num(x));
          if (T === "double") return num(x);
          if (T === "char") { if (x.t === "char") return x.v; const k = Math.trunc(num(x)); if (k < 32 || k > 126) throw new Error(`„${c}“: ${x.show} → char извън печатния ASCII не се демонстрира.`); return String.fromCharCode(k); }
          return x.v;
        };
        const a = cv(A), b = cv(B);
        const less = T === "const char*" ? a < b : a < b;
        const r = less ? b : a;
        F.push({ at: isSpec ? "spec" : "tpl", inst: inst.slice(), call: c, T, msg: `<code>${c}</code>: ${how}.` });
        if (fresh) inst.push(sig);
        F.push({ at: isSpec ? "spec" : "inst", inst: inst.slice(), call: c, T, fresh, cur: inst.indexOf(sig), vars: { T }, stats: { специализации: inst.length },
          msg: isSpec ? `Има <b>явна (пълна) специализация</b> за <code>const char*</code> — тя се използва вместо общия шаблон, защото <code>a &lt; b</code> би сравнило <b>адресите</b>, не текста.${fresh ? "" : " Вече е използвана — нищо ново."}` : fresh ? `<dfn data-g="инстанциране">Инстанциране</dfn>: компилаторът генерира <b>нова</b> функция <code>larger&lt;${T}&gt;</code>.` : `<code>larger&lt;${T}&gt;</code> вече е генерирана — използва се същата функция, нова не се създава.`,
          log: `${c} → larger<${T}>${fresh ? " (нова)" : ""}` });
        F.push({ at: isSpec ? "spec_cmp" : "cmp", inst: inst.slice(), call: c, T, cur: inst.indexOf(sig), vars: { T, a: String(a), b: String(b), return: fmt(T, r) }, stats: { специализации: inst.length },
          msg: isSpec ? `<code>strcmp("${a}", "${b}") &lt; 0</code> → ${less} → връща <b>"${r}"</b>.` : `<code>a &lt; b ? b : a</code> → ${T === "char" ? `'${a}' &lt; '${b}'` : `${fmt(T, a)} &lt; ${fmt(T, b)}`} → ${less} → връща <b>${T === "char" ? r : fmt(T, r)}</b>. Изискване към T: операция <code>&lt;</code> и копиране.` });
        res.push(T === "char" ? r : fmt(T, r));
      });
      F[F.length - 1].done = true;
      return { frames: F, inst, res };
    },

    /** Размер на Stack<T, N> — по същите правила за подравняване като в раздел 1. */
    stack({ T, N }) {
      if (!SZ[T]) throw new Error("Тип: char, short, int, double или Big.");
      const n = S.int(N, 1, 16, "N");
      const [sz, al] = SZ[T];
      const A = Math.max(al, 4);
      const dataEnd = sz * n, topOff = Math.ceil(dataEnd / 4) * 4, end = topOff + 4, size = Math.ceil(end / A) * A;
      const F = [];
      F.push({ at: "three", vars: { T, N: n }, msg: `<code>Stack&lt;${T}, ${n}&gt;</code> — нов, отделен клас. Параметърът N е <b>стойност</b>, известна при компилация.`, size: null });
      F.push({ at: "data", vars: { "sizeof(T)": sz, "data[N]": dataEnd }, msg: `<code>T data[${n}]</code> заема ${n} × ${sz} = ${dataEnd} байта (отместване 0).`, dataEnd, size: null });
      F.push({ at: "top", vars: { "offset(top)": topOff, padding: topOff - dataEnd }, msg: `<code>int top</code> изисква кратно на 4 → отместване ${topOff}${topOff > dataEnd ? ` (${topOff - dataEnd} байта padding)` : ""}.`, dataEnd, topOff, size: null });
      F.push({ at: "three", done: true, vars: { sizeof: size }, msg: `Подравняване на целия клас = ${A} → <b>sizeof = ${size}</b>.`, dataEnd, topOff, size, sz, n });
      return { frames: F, size };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="шаблон">Шаблонът</dfn> описва семейство функции или класове, параметризирани с типове или други допустими параметри. <dfn data-g="инстанциране">Инстанцирането</dfn> формира конкретна <dfn data-g="специализация">специализация</dfn>. Един алгоритъм може да се използва за различни типове, ако те поддържат нужните операции — това е основа на <dfn data-g="обобщено програмиране">обобщеното програмиране</dfn>.</p>
</div>

<div class="block">
  <h3>larger&lt;T&gt;: кои функции се генерират</h3>
  <p class="prose"><code>larger(3, 7)</code> използва T=int; <code>larger(2.5, 1.0)</code> — T=double. Опиши поредица от извиквания: вдясно се трупат специализациите в реда на първото им използване. Списъкът е същият, който програмата отпечатва чрез <code>__PRETTY_FUNCTION__</code> (разширение на g++).</p>
  <div id="v-larger"></div>
  <details class="hint"><summary>Хинт: шаблонът не е текстов макрос</summary><div><p>Макросът <code>#define LARGER(a,b) ((a)&lt;(b)?(b):(a))</code> изчислява един от аргументите (по-големия) два пъти и не знае типове. Шаблонът участва в типизирането: T се извежда, проверява се, че <code>&lt;</code> съществува за T, връщаният тип е T. Грешката „противоречиво извеждане“ е именно типова проверка.</p></div></details>
</div>

<div class="block">
  <h3>Шаблон на клас: Stack&lt;T, N&gt;</h3>
  <p class="prose">Шаблоните на класове параметризират цяла структура. <code>vector&lt;int&gt;</code> и <code>vector&lt;double&gt;</code> са различни специализации с различни елементи. Различните специализации могат да имат различен размер на елементите и различно генериран код.</p>
  <div id="v-stack"></div>
</div>

<div class="block">
  <h3>Статичен и динамичен полиморфизъм</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th></th><th>Шаблони</th><th>Виртуални методи</th></tr>
    <tr><td>Кога се избира реализацията</td><td>при компилация (статичен полиморфизъм)</td><td>при изпълнение, по динамичния тип</td></tr>
    <tr><td>Изискване към типа</td><td>да поддържа нужните операции (напр. <code>&lt;</code>)</td><td>да наследява базовия клас и да предефинира методите</td></tr>
    <tr><td>Цена</td><td>може да увеличи генерирания код (по една функция за тип)</td><td>vptr в обекта, непряко извикване, по-трудно вграждане</td></tr>
    <tr><td>Нов тип след компилация</td><td>не</td><td>да (напр. от друга библиотека)</td></tr>
  </table></div>
  <p class="prose">Няма общо правило „шаблоните са бързи, виртуалните методи са бавни“. Имат значение размерът на кода, възможността за вграждане, честотата на извикванията и нуждата от избор след компилация. Двата подхода могат да се съчетават в една библиотека (напр. шаблон на контейнер от <code>unique_ptr&lt;Shape&gt;</code>).</p>
  <details class="trap"><summary>Капан: „шаблонът е вид наследяване“</summary><div><p>Не. Шаблонът генерира семейство специализации според параметри; наследяването задава отношение между класове. Могат да участват в една конструкция, но не определят едно и също отношение.</p></div></details>
  <details class="trap"><summary>Капан: Java generics = C++ templates</summary><div><p>Не са взаимозаменяеми — имат различен модел. Реални шаблони: <code>std::vector&lt;int&gt;</code> и <code>std::vector&lt;double&gt;</code> са специализации на шаблон; <code>std::sort</code> е алгоритъм от стандартната библиотека, който изисква подходящо сравнение и достъп, а не наследяване от общ базов клас.</p></div></details>
  <div class="key">Шаблон = схема; инстанциране = конкретна функция/клас за конкретни параметри; едно и също T се генерира веднъж. Изборът е при компилация.</div>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-larger"), {
      id: "larger", title: "Инстанциране стъпка по стъпка", sub: "Извиквания, разделени с „;“.",
      code: "ch07_larger",
      inputs: [{ id: "script", label: "извиквания", value: "larger(3, 7); larger(2.5, 1.0)", width: "min(34em, 100%)" }],
      presets: [{ label: "Пет типа", values: { script: "larger('a', 'z'); larger(10, -4); larger<double>(3, 2.5); larger<const char*>(\"abc\", \"abd\"); larger(5L, 9L)" } },
        { label: "Повторно int", values: { script: "larger(3, 7); larger(1, 2); larger(9, 8)" } }, { label: "Конфликт", values: { script: "larger(3, 7); larger(3, 2.5)" } }],
      legend: [["s-act", "нова/използвана специализация"], ["s-swap", "грешка при компилация"]],
      build: algos.larger,
      draw(st, f) {
        st.innerHTML = "";
        const box = h("div", { class: "objs" });
        box.append(h("div", { class: "obj s-piv" }, h("div", { class: "oh", text: "template<class T> larger" }), h("div", { class: "orow muted", text: "описание, не код" })));
        const gen = h("div", { class: "obj" }, h("div", { class: "oh", text: "генерирани функции" }));
        if (!f.inst.length) gen.append(h("div", { class: "orow muted", text: "няма" }));
        f.inst.forEach((s, i) => gen.append(h("div", { class: "orow " + (i === f.cur ? (f.fresh ? "s-act" : "s-done") : "") }, h("span", { class: "mono", text: s }))));
        box.append(gen);
        if (f.err) box.append(h("div", { class: "obj s-swap" }, h("div", { class: "oh", text: f.call }), h("div", { class: "orow", text: "противоречиво извеждане на T" })));
        st.append(box);
      },
    });

    S.viz(root.querySelector("#v-stack"), {
      id: "stack", title: "sizeof на специализациите", sub: "x86-64; Big = struct от 24 char.",
      code: "ch07_stack",
      inputs: [{ id: "T", label: "T", type: "select", value: "int", options: ["char", "short", "int", "double", "Big"] }, { id: "N", label: "N", type: "number", value: 4, width: "5em" }],
      presets: [{ label: "Stack<char,10>", values: { T: "char", N: 10 } }, { label: "Stack<double,1>", values: { T: "double", N: 1 } }, { label: "Stack<Big,2>", values: { T: "Big", N: 2 } }],
      legend: [["s-act", "data[N]"], ["s-done", "top"], ["s-swap", "padding"]],
      build: algos.stack,
      draw(st, f) {
        st.innerHTML = "";
        if (f.dataEnd == null) { st.append(h("p", { class: "muted", text: "Нов клас за всяка двойка (T, N)." })); return; }
        const total = f.size || (f.topOff != null ? f.topOff + 4 : f.dataEnd);
        const box = h("div", { class: "mem" });
        for (let b = 0; b < total; b++) {
          let cls = "b ", t = "";
          if (b < f.dataEnd) cls += "s-act";
          else if (f.topOff != null && b >= f.topOff && b < f.topOff + 4) { cls += "s-done"; t = b === f.topOff ? "top" : ""; }
          else cls += "pad s-swap";
          box.append(h("div", { class: cls }, h("span", { class: "o", text: b % 8 === 0 ? b : "" }), t));
        }
        st.append(box);
      },
    });
  }

  S.chapter({ id: "shabloni", order: 7, num: "7", group: "Обобщаване", title: "Шаблони и статичен полиморфизъм", lead: "Инстанциране, извеждане на T, явна специализация, шаблон на клас и сравнение с виртуалните методи.", html, mount, algos });
})();
