/* Раздел 2 — Цели, модели на атака и ключове. Атака с известен открит текст. */
(function () {
  const S = window.Study, h = S.h;

  const algos = {
    /** разширен Евклид — като modinv в c/02_known_plain.c */
    modinv({ a, m }) {
      a = S.int(a, -999, 999, "a"); m = S.int(m, 2, 999, "m");
      const F = [], rows = [];
      let r0 = m, r1 = T10.mod(a, m), x0 = 0, x1 = 1, it = 0;
      F.push({ at: "init", vars: { r0, r1, x0, x1 }, rows: [], msg: `Начало: r₀ = m = ${m}, r₁ = a mod m = ${r1}, x₀ = 0, x₁ = 1. Инвариант: x·a ≡ r (mod m) за двете двойки.` });
      while (true) {
        F.push({ at: "loop", vars: { r0, r1, x0, x1 }, rows: rows.slice(), msg: `<code>r1 != 0</code>? ${r1} → <b>${r1 !== 0}</b>.`, stats: { итерации: it } });
        if (r1 === 0) break;
        const q = Math.trunc(r0 / r1);
        F.push({ at: "q", vars: { r0, r1, x0, x1, q }, rows: rows.slice(), msg: `q = ⌊${r0} / ${r1}⌋ = <b>${q}</b>.`, stats: { итерации: it } });
        const nr = r0 - q * r1, nx = x0 - q * x1;
        rows.push({ r0, r1, q, nr, x0, x1, nx });
        [r0, r1] = [r1, nr]; [x0, x1] = [x1, nx]; it++;
        F.push({ at: "step", vars: { r0, r1, x0, x1, q }, rows: rows.slice(), msg: `(r₀, r₁) ← (r₁, r₀ − q·r₁) = (${r0}, ${r1}); (x₀, x₁) ← (x₁, x₀ − q·x₁) = (${x0}, ${x1}).`, stats: { итерации: it }, log: `q=${q}: r=(${r0},${r1}) x=(${x0},${x1})` });
      }
      if (r0 !== 1) {
        F.push({ at: "nogcd", vars: { r0, return: -1 }, rows, bad: true, done: true, msg: `НОД(${a}, ${m}) = ${r0} ≠ 1 ⇒ <b>няма обратен елемент</b>. Връщаме −1. Като множител на афинен шифър a = ${a} е недопустимо.`, stats: { итерации: it }, log: "return -1" });
        return { frames: F, result: -1 };
      }
      const inv = T10.mod(x0, m);
      F.push({ at: "ret", vars: { r0, x0, return: inv }, rows, done: true, msg: `НОД = 1 ⇒ a⁻¹ = x₀ mod m = ${x0} mod ${m} = <b>${inv}</b>. Проверка: ${T10.mod(a, m)}·${inv} = ${T10.mod(a, m) * inv} ≡ ${T10.mod(T10.mod(a, m) * inv, m)} (mod ${m}).`, stats: { итерации: it }, log: `return ${inv}` });
      return { frames: F, result: inv };
    },

    /** две известни двойки → (a, b); като affine_from_pairs */
    affine_kp({ alpha, p1, c1, p2, c2 }) {
      const al = T10.get(alpha), m = al.m;
      const one = (s, w) => { const x = T10.encode(al, s, { maxLen: 1, minLen: 1, what: w }); return x[0]; };
      const P1 = one(p1, "p₁"), C1 = one(c1, "c₁"), P2 = one(p2, "p₂"), C2 = one(c2, "c₂");
      const F = [], L = al.L;
      const dp = T10.mod(P1 - P2, m), dc = T10.mod(C1 - C2, m);
      const base = { P1, C1, P2, C2, m, al: alpha };
      F.push({ ...base, at: "diff", vars: { dp, dc }, msg: `Двойки: ${L[P1]}(${P1}) → ${L[C1]}(${C1}) и ${L[P2]}(${P2}) → ${L[C2]}(${C2}). Изваждаме: c₁ − c₂ ≡ a·(p₁ − p₂), т.е. ${dc} ≡ a·${dp} (mod ${m}). b изчезва.` });
      const inv = algos.modinv({ a: dp, m }).result;
      F.push({ ...base, at: "inv", vars: { dp, dc, inv }, msg: inv < 0 ? `(p₁ − p₂) = ${dp} няма обратен по модул ${m} (НОД = ${T10.gcd(dp, m)}).` : `(p₁ − p₂)⁻¹ = ${dp}⁻¹ ≡ <b>${inv}</b> (mod ${m}).` });
      if (inv < 0) {
        F.push({ ...base, at: "fail", vars: { dp, inv }, bad: true, done: true, msg: `Двойките <b>не определят a еднозначно</b>: уравнението ${dc} ≡ a·${dp} има или няколко решения, или нито едно. Нужна е друга двойка (с разлика, взаимно проста с ${m}).` });
        return { frames: F, ok: 0 };
      }
      const a = T10.mod(dc * inv, m), b = T10.mod(C1 - a * P1, m);
      F.push({ ...base, at: "a", vars: { dp, dc, inv, a }, msg: `a = ${dc}·${inv} mod ${m} = <b>${a}</b>.` });
      F.push({ ...base, at: "b", vars: { a, b }, msg: `b = c₁ − a·p₁ = ${C1} − ${a}·${P1} mod ${m} = <b>${b}</b>.` });
      if (T10.gcd(a, m) !== 1) {
        F.push({ ...base, at: "fail", vars: { a, b }, bad: true, done: true, msg: `Полученото a = ${a} не е взаимно просто с ${m} — двойките не идват от валиден афинен ключ.` });
        return { frames: F, ok: 0 };
      }
      F.push({ ...base, at: "ok", vars: { a, b }, a, b, done: true, msg: `Ключът е <b>(a, b) = (${a}, ${b})</b> — възстановен от <b>две</b> букви. 12 (или ${m === 30 ? 8 : 12}) възможни a × ${m} възможни b не помагат: в този <dfn data-g="модел на атака">модел</dfn> ключът се изчислява, не се търси.` });
      return { frames: F, ok: 1, a, b };
    },

    /** Виженер, известна двойка → ключова последователност и период */
    vig_kp({ alpha, p, c }) {
      const al = T10.get(alpha), m = al.m;
      const P = T10.encode(al, p, { maxLen: 40, minLen: 1, what: "Откритият текст" });
      const C = T10.encode(al, c, { maxLen: 40, minLen: 1, what: "Шифротекстът" });
      if (P.length !== C.length) throw new Error(`Различна дължина: ${P.length} и ${C.length} букви.`);
      const n = P.length, K = [], F = [];
      for (let i = 0; i < n; i++) {
        F.push({ at: "loop", P, C, K: K.slice(), i, vars: { i }, msg: `Позиция ${i}.` });
        K.push(T10.mod(C[i] - P[i], m));
        F.push({ at: "sub", P, C, K: K.slice(), i, vars: { i, "c[i]": C[i], "p[i]": P[i], "k[i]": K[i] }, msg: `k<sub>${i}</sub> = c − p = ${C[i]} − ${P[i]} ≡ <b>${K[i]}</b> → „${al.L[K[i]]}“.`, log: `${al.L[C[i]]}−${al.L[P[i]]} = ${al.L[K[i]]}` });
      }
      let per = n;
      for (let L = 1; L < n; L++) {
        let ok = true, bad = -1;
        for (let i = L; i < n; i++) if (K[i] !== K[i - L]) { ok = false; bad = i; break; }
        F.push({ at: ok ? ["tryL", "found"] : ["tryL", "cmp"], P, C, K, i: -1, L, bad, vars: { L, ok }, msg: ok ? `Период <b>L = ${L}</b>: k[i] = k[i−${L}] навсякъде. Ключовата дума е „<b>${T10.decode(al, K.slice(0, L))}</b>“.` : `L = ${L}: k[${bad}] = ${al.L[K[bad]]} ≠ k[${bad - L}] = ${al.L[K[bad - L]]}.` });
        if (ok) { per = L; break; }
      }
      if (per === n) F.push({ at: "whole", P, C, K, i: -1, vars: { L: n }, msg: `Няма по-къс период в тези ${n} букви — ключът може да е по-дълъг от известния фрагмент.` });
      F[F.length - 1].done = true;
      return { frames: F, ks: T10.decode(al, K), period: per };
    },
  };

  const MODELS = [
    { k: "Само шифротекст", en: "ciphertext-only", has: ["C₁, C₂, …"], can: "наблюдава", ex: "Честотен анализ на Цезар / моноазбучна замяна (раздел 7); Касиски при Виженер (раздел 6)." },
    { k: "Известен открит текст", en: "known-plaintext", has: ["C", "двойки (M, C)"], can: "наблюдава", ex: "Афинен шифър: 2 двойки букви дават ключа (визуализацията отдолу). Виженер: c − p дава ключа направо." },
    { k: "Избран открит текст", en: "chosen-plaintext", has: ["C", "E(M) за избрани M"], can: "шифрова по свой избор", ex: "Изпращаме „AAAA…“ на Виженер — шифротекстът е самият ключ. В учебния модел това е непосредствено." },
    { k: "Избран шифротекст", en: "chosen-ciphertext", has: ["C", "D(C′) за избрани C′ (с ограничения)"], can: "получава дешифриране", ex: "Най-силният от четирите. Защита в по-слаб модел не доказва защита тук." },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="конфиденциалност">Конфиденциалността</dfn> скрива съдържанието. <dfn data-g="цялост">Целостта</dfn> позволява да се откриват определени изменения, а <dfn data-g="удостоверяване">удостоверяването</dfn> проверява произход или идентичност. Самостоятелното шифроване не гарантира непременно целостта: някои схеми позволяват контролирано изменение на шифротекста с предвидим ефект върху открития текст (виж XOR в <a href="#chestoti">раздел 7</a>).</p>
  <p>При <dfn data-g="симетрична криптография">симетричната криптография</dfn> участниците използват обща тайна или лесно свързани тайни ключове. При <dfn data-g="асиметрична криптография">асиметричната</dfn> има публичен и частен ключ с различни роли; публичният трябва да е автентичен. Начинът на разпределяне на ключовете е част от системата.</p>
</div>

<div class="block">
  <h3>Защо описваме какво знае нападателят: четири модела на атака</h3>
  <p class="muted">Подредени от най-слаб към най-силен нападател. Щракни върху модел.</p>
  <div class="cards" id="mods"></div>
  <div class="key" id="mod-detail"></div>
  <div class="key"><b>Правилото</b><p>Твърдението за сигурност трябва да посочи <dfn data-g="модел на атака">модел</dfn>. По-силният модел дава повече възможности, затова устойчивост в по-слаб модел <b>не</b> доказва устойчивост в по-силен.</p></div>
</div>

<div class="block">
  <h3>Атака с известен открит текст срещу афинния шифър</h3>
  <p class="prose">Афинният шифър (<a href="#cezar">раздел 5</a>) e c ≡ a·p + b. Ако нападателят знае две двойки буква → буква, изваждането премахва b, а <dfn data-g="обратен елемент">обратният елемент</dfn> дава a. Първо — как се намира обратният елемент: разширеният алгоритъм на Евклид.</p>
  <div id="v-inv"></div>
  <div id="v-akp"></div>
  <details class="hint"><summary>Хинт: защо разликата p₁ − p₂ трябва да е взаимно проста с m</summary><div>
    <p>Уравнението d<sub>c</sub> ≡ a·d<sub>p</sub> (mod m) има единствено решение за a точно когато d<sub>p</sub> има <dfn data-g="обратен елемент">обратен</dfn>. Пример: C → S и A → I дават d<sub>p</sub> = 2; по модул 26 и a = 5, и a = 18 удовлетворяват 10 ≡ 2a — двойките не стигат.</p>
  </div></details>
</div>

<div class="block">
  <h3>Атака с известен открит текст срещу Виженер</h3>
  <p class="prose">При <dfn data-g="виженер">Виженер</dfn> всяка позиция е отделно изместване, затова k<sub>i</sub> = c<sub>i</sub> − p<sub>i</sub> (mod m) направо. Повтарящият се ключ издава и периода си.</p>
  <div id="v-vkp"></div>
</div>

<div class="block">
  <h3>Брой ключове, битове и ентропия</h3>
  <div class="split">
    <div class="key"><b>Равномерен k-битов ключ</b><p class="formula">|K| = 2<sup>k</sup></p><p>Грубото изчерпване пробва средно половината.</p></div>
    <div class="card" id="kspace"></div>
  </div>
  <details class="trap"><summary>Капан: „парола от 12 знака има 12·8 бита ентропия“</summary><div>
    <p>Не. За равномерно избран k-битов ключ има 2<sup>k</sup> възможни ключа, но това не означава, че парола с k печатни символа има k бита ентропия или че човек избира равномерно измежду всички низове. Дължината на записа, броят възможности и неопределеността на конкретния източник са различни величини.</p>
  </div></details>
  <details class="trap"><summary>Капан: „голямото ключово пространство прави шифъра сигурен“</summary><div>
    <p><dfn data-g="грубо изчерпване">Грубото изчерпване</dfn> пробва ключове; голямото пространство затруднява само него. Моноазбучната замяна има 26! ≈ 4·10<sup>26</sup> ключа (≈ 88 бита), но <dfn data-g="честотен анализ">честотният анализ</dfn> използва неравномерността на езика и не търси ключове един по един. Качеството на ключа, случайността и повторната употреба също са съществени.</p>
  </div></details>
</div>`;

  function mount(root) {
    const mods = root.querySelector("#mods"), md = root.querySelector("#mod-detail");
    const btns = MODELS.map((M, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: `${i + 1} · ${M.en}` }), h("h4", { text: M.k }), h("p", { text: "има: " + M.has.join(", ") })));
    mods.append(...btns);
    function pick(i) {
      btns.forEach((b, j) => { b.setAttribute("aria-pressed", i === j ? "true" : "false"); b.style.opacity = j <= i ? "1" : ".6"; });
      const M = MODELS[i];
      md.innerHTML = `<p><b>${M.k}</b> (${M.en}) — нападателят ${M.can}.</p><p>Пример от темата: ${M.ex}</p><p class="muted">Всеки по-горен модел включва възможностите на предходните.</p>`;
    }
    pick(0);

    S.viz(root.querySelector("#v-inv"), {
      id: "inv", title: "Обратен елемент a⁻¹ mod m — разширен Евклид", sub: "Таблицата пази r (остатъците) и x (коефициентите): x·a ≡ r (mod m).",
      code: "ch02_modinv",
      inputs: [{ id: "a", label: "a", type: "number", value: 5, width: "6em" }, { id: "m", label: "m", type: "number", value: 26, width: "6em" }],
      presets: [{ label: "2 mod 26 (няма)", values: { a: 2, m: 26 } }, { label: "7 mod 30", values: { a: 7, m: 30 } }, { label: "5 mod 30 (няма)", values: { a: 5, m: 30 } }],
      legend: [["s-act", "текущи r, x"], ["s-done", "обратен елемент"], ["s-swap", "НОД ≠ 1"]],
      build: algos.modinv,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, ...["r₀", "r₁", "q", "x₀", "x₁"].map((x) => h("th", { text: x }))));
        f.rows.forEach((r) => tb.append(h("tr", null, h("td", { text: r.r0 }), h("td", { text: r.r1 }), h("td", { text: r.q }), h("td", { text: r.x0 }), h("td", { text: r.x1 }))));
        const v = f.vars;
        const fin = f.done ? (f.bad ? "s-swap" : "s-done") : "s-act";
        tb.append(h("tr", null, h("td", { class: fin, text: v.r0 }), h("td", { class: "s-act", text: v.r1 ?? "" }), h("td", { text: v.q ?? "" }), h("td", { class: fin, text: v.x0 ?? "" }), h("td", { class: "s-act", text: v.x1 ?? "" })));
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    S.viz(root.querySelector("#v-akp"), {
      id: "akp", title: "Две двойки → ключ (a, b) на афинния шифър", sub: "Пример от ръководството: a = 5, b = 8 дава C → S. Добави втора двойка.",
      code: "ch02_affine_kp",
      inputs: [T10.alphaField(), { id: "p1", label: "p₁", value: "C", width: "3em" }, { id: "c1", label: "c₁", value: "S", width: "3em" }, { id: "p2", label: "p₂", value: "D", width: "3em" }, { id: "c2", label: "c₂", value: "X", width: "3em" }],
      presets: [{ label: "C→S, A→I (недостатъчни)", values: { alpha: "lat", p1: "C", c1: "S", p2: "A", c2: "I" } }, { label: "бълг.: Б→К, В→С", values: { alpha: "bg", p1: "Б", c1: "К", p2: "В", c2: "С" }, title: "a = 7, b = 3 по модул 30" }],
      legend: [["s-act", "известни двойки"], ["s-done", "възстановен ключ"], ["s-swap", "не стига"]],
      build: algos.affine_kp,
      draw(st, f) {
        st.innerHTML = "";
        const al = T10.get(f.al);
        const L = al.L;
        const row = h("div", { class: "row" });
        const pair = (p, c) => h("div", { class: "card", style: { minWidth: "120px" } }, h("span", { class: "mono", text: `${L[p]} (${p}) → ${L[c]} (${c})` }));
        row.append(pair(f.P1, f.C1), pair(f.P2, f.C2));
        st.append(row);
        if (f.a != null) {
          const cls = {}; [f.P1, f.P2].forEach((x) => (cls[x] = "s-act"));
          T10.strip(st, L.map((_, x) => L[T10.mod(f.a * x + f.b, al.m)]), { append: true, title: `цялата заместваща азбука при a=${f.a}, b=${f.b} (отдолу — откритата буква)`, sub: (x) => L[x], cls, small: true });
        }
        if (f.bad) st.append(h("p", { class: "warn", text: "Нужна е друга известна двойка." }));
      },
    });

    S.viz(root.querySelector("#v-vkp"), {
      id: "vkp", title: "Виженер: c − p = ключова последователност", sub: "Пример от ръководството: ATTACKATDAWN / LXFOPVEFRNHR.",
      code: "ch02_vig_kp",
      inputs: [T10.alphaField(), { id: "p", label: "открит текст", value: "ATTACKATDAWN", width: "14em" }, { id: "c", label: "шифротекст", value: "LXFOPVEFRNHR", width: "14em" }],
      presets: [{ label: "бълг.: КЛЮЧ", values: { alpha: "bg", p: "ДОНЕСИКАРТАТА", c: "ОЩЛЮЬУИЧЪЯЮЛК" } }],
      legend: [["s-act", "текуща позиция"], ["s-cmp", "сравнение за период"], ["s-swap", "несъвпадение"], ["s-done", "период"]],
      build: algos.vig_kp,
      draw(st, f, { inputs }) {
        st.innerHTML = "";
        const al = T10.get(inputs.alpha);
        const n = f.P.length, cp = {}, ck = {};
        if (f.i >= 0) { cp[f.i] = "s-act"; ck[f.i] = "s-act"; }
        if (f.L) {
          for (let i = 0; i < f.K.length; i++) ck[i] = i < f.L ? "s-done" : f.bad === i || f.bad - f.L === i ? "s-swap" : f.at.includes("found") ? "s-cmp" : "";
        }
        T10.strip(st, f.P.map((x) => al.L[x]), { title: "открит текст p", cls: cp, small: n > 16 });
        T10.strip(st, f.C.map((x) => al.L[x]), { append: true, title: "шифротекст c", cls: cp, small: n > 16 });
        T10.strip(st, f.K.map((x) => al.L[x]), { append: true, title: "k = c − p", cls: ck, small: n > 16 });
      },
    });

    // ключово пространство
    const ks = root.querySelector("#kspace");
    const rows = [["Цезар (m = 26)", 26], ["Цезар (m = 30)", 30], ["Афинен (m = 26)", 12 * 26], ["Афинен (m = 30)", 8 * 30], ["Моноазбучна (26!)", 4.0329146e26], ["Моноазбучна (30!)", 2.6525286e32]];
    const t = h("table", { class: "t" }, h("tr", null, h("th", { text: "шифър" }), h("th", { text: "ключове" }), h("th", { text: "≈ бита" })));
    rows.forEach(([n, k]) => t.append(h("tr", null, h("td", { text: n }), h("td", { class: "mono", text: k < 1e6 ? String(k) : k.toExponential(2) }), h("td", { class: "mono", text: Math.log2(k).toFixed(1) }))));
    ks.append(h("h4", { text: "Размер на ключовото пространство" }), h("div", { class: "tbl-wrap" }, t), h("p", { class: "muted", text: "Броят a: φ(26) = 12, φ(30) = 8 множителя, взаимно прости с m. Голямото число не спира честотния анализ." }));
  }

  S.chapter({ id: "ataki", order: 2, num: "2", group: "Основи", title: "Цели, модели на атака и ключове", lead: "Конфиденциалност, цялост и удостоверяване; какво знае нападателят; защо броят на ключовете не е достатъчен.", html, mount, algos });
})();
