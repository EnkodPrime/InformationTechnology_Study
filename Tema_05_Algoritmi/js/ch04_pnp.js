/* Раздел 4 — Класове P и NP, сводимост, NP-пълнота. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "кнф": { cat: "Класове", t: "Конюнктивна нормална форма (КНФ)", en: "Conjunctive normal form", d: "Булева формула, записана като „И“ на клаузи, всяка от които е „ИЛИ“ на литерали (x или ¬x).", more: "Пример: (x1 ∨ ¬x2) ∧ (x2 ∨ x3). 3-SAT: всяка клауза има най-много 3 литерала." },
    "проверител": { cat: "Класове", t: "Проверител (верификатор)", en: "Verifier", d: "Детерминиран алгоритъм V(x, c), който за вход x и сертификат c проверява дали c доказва положителния отговор.", more: "В дефиницията на NP проверителят работи за полиномиално време спрямо |x|." },
    "теорема на кук–левин": { cat: "Класове", t: "Теорема на Кук–Левин", en: "Cook–Levin theorem", d: "SAT е NP-пълна — първата задача, за която това е доказано.", more: "След нея NP-пълнотата на други задачи се доказва чрез свеждане от вече известна NP-пълна задача." },
    "2-sat": { cat: "Класове", t: "2-SAT", d: "SAT, в която всяка клауза има най-много 2 литерала.", more: "Има полиномиален алгоритъм — близкото име с 3-SAT не определя еднаква сложност." },
  });

  /* ---------- графи ---------- */
  const GRAPHS = {
    house: { t: "Къща (5)", n: 5, e: "02 24 41 13 30 21" },
    petal: { t: "Папийонка (5, няма цикъл)", n: 5, e: "01 02 03 04 12 34" },
    hex: { t: "Шестоъгълник (6)", n: 6, e: "03 31 15 52 24 40 01 45" },
    star: { t: "Звезда (6, няма цикъл)", n: 6, e: "01 02 03 04 05 12" },
    sept: { t: "Седем върха (7)", n: 7, e: "04 41 15 52 26 63 30 12 56" },
  };
  function parseGraph(n, edges) {
    n = S.int(n, 3, 7, "Броят върхове");
    const adj = Array.from({ length: n }, () => Array(n).fill(0)), list = [];
    for (const p of String(edges).split(/[\s,;]+/).filter(Boolean)) {
      if (!/^\d\d$/.test(p)) throw new Error(`„${p}“ не е ребро — пиши две цифри, напр. 02.`);
      const a = +p[0], b = +p[1];
      if (a >= n || b >= n) throw new Error(`Ребро ${p}: върховете са 0…${n - 1}.`);
      if (a === b) throw new Error(`Ребро ${p}: примки не се допускат.`);
      if (!adj[a][b]) list.push([a, b]);
      adj[a][b] = adj[b][a] = 1;
    }
    return { n, adj, list };
  }
  const parseCert = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map((p) => {
    if (!/^\d$/.test(p)) throw new Error(`„${p}“ не е връх (една цифра).`);
    return +p;
  });
  function nextPerm(a, from) { // лексикографски, върху a[from..]
    const m = a.length;
    let i = m - 2;
    while (i >= from && a[i] >= a[i + 1]) i--;
    if (i < from) return false;
    let j = m - 1;
    while (a[j] <= a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
    for (let l = i + 1, r = m - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
    return true;
  }
  function verifyPlain(n, adj, cyc) {
    if (cyc.length !== n) return false;
    const seen = Array(n).fill(0);
    for (const v of cyc) { if (v < 0 || v >= n || seen[v]) return false; seen[v] = 1; }
    for (let i = 0; i < n; i++) if (!adj[cyc[i]][cyc[(i + 1) % n]]) return false;
    return true;
  }
  const fact = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; };

  /* ---------- SAT ---------- */
  const FORMULAS = {
    f1: { t: "(x1∨¬x2)∧(x2∨x3)∧(¬x1∨¬x3)", s: "1 -2 | 2 3 | -1 -3" },
    f2: { t: "неизпълнима, 2 променливи", s: "1 2 | -1 2 | 1 -2 | -1 -2" },
    f3: { t: "„точно x2“", s: "1 2 3 | -1 -2 | -2 -3 | -1 -3 | 2" },
    f4: { t: "верига, неизпълнима (5)", s: "1 | -1 2 | -2 3 | -3 4 | -4 5 | -5 -1" },
  };
  function parseCNF(str) {
    const cl = String(str).split("|").map((c) => c.trim()).filter(Boolean);
    if (!cl.length) throw new Error("Празна формула.");
    if (cl.length > 8) throw new Error("Най-много 8 клаузи.");
    let n = 0;
    const f = cl.map((c) => {
      const lits = c.split(/[\s,]+/).filter(Boolean).map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v) || v === 0) throw new Error(`„${p}“ не е литерал (пиши 3 за x3, −3 за ¬x3).`);
        if (Math.abs(v) > 6) throw new Error("Най-много 6 променливи (x1…x6).");
        n = Math.max(n, Math.abs(v));
        return v;
      });
      if (lits.length > 4) throw new Error("Най-много 4 литерала в клауза.");
      return lits;
    });
    return { f, n };
  }
  const litTxt = (l) => (l > 0 ? "x" + l : "¬x" + -l);
  const clauseTxt = (c) => "(" + c.map(litTxt).join(" ∨ ") + ")";
  function parseX(xs, n) {
    const s = String(xs).replace(/\s/g, "");
    if (!/^[01]*$/.test(s)) throw new Error("Присвояването е низ от 0 и 1 (x1 x2 …).");
    if (s.length !== n) throw new Error(`Нужни са ${n} бита — по един за x1…x${n}.`);
    return [0, ...s.split("").map(Number)];
  }
  const evalPlain = (f, x) => f.every((c) => c.some((l) => (l > 0 ? x[l] : !x[-l])));

  /* ---------- чисти функции ---------- */
  const algos = {
    ham_verify({ n, edges, cert }) {
      const G = parseGraph(n, edges);
      const cyc = parseCert(cert);
      for (const v of cyc) if (v >= G.n) throw new Error(`Връх ${v} не съществува.`);
      const F = [], seen = Array(G.n).fill(0), k = cyc.length;
      const base = () => ({ G, cyc, seen: seen.slice() });
      const fail = (o, why) => { F.push(Object.assign(base(), o, { verdict: false, final: true, msg: `<b>Невалиден сертификат</b>: ${why} Това НЕ доказва, че графът няма Хамилтонов цикъл — само че <i>този</i> кандидат не е такъв.`, log: "return 0" })); return { frames: F, result: 0 }; };
      F.push(Object.assign(base(), { at: "len", vars: { n: G.n, k }, msg: `k == n? ${k} == ${G.n} → <b>${k === G.n}</b>.` }));
      if (k !== G.n) return fail({ at: "len" }, `сертификатът има ${k} върха, а трябва точно ${G.n}.`);
      for (let i = 0; i < k; i++) {
        const v = cyc[i];
        F.push(Object.assign(base(), { at: "loop", cur: v, idx: i, vars: { i, v }, msg: `Позиция ${i}: връх ${v}. Виждан ли е?` }));
        if (seen[v]) return fail({ at: "dup", cur: v, idx: i, bad: v }, `връх ${v} се повтаря.`);
        seen[v] = 1;
        F.push(Object.assign(base(), { at: "mark", cur: v, idx: i, vars: { i, v }, msg: `Нов — маркираме ${v}.` }));
      }
      for (let i = 0; i < k; i++) {
        const a = cyc[i], b = cyc[(i + 1) % k];
        const ok = !!G.adj[a][b];
        F.push(Object.assign(base(), { at: "pair", pair: [a, b], pairIdx: i, pairOk: ok, vars: { i, a, b }, msg: `Двойка ${a}→${b}${i === k - 1 ? " (последен→първи)" : ""}: ребро ли е? <b>${ok ? "да" : "не"}</b>.` }));
        if (!ok) return fail({ at: "noedge", pair: [a, b], pairIdx: i, pairOk: false }, `между ${a} и ${b} няма ребро.`);
      }
      F.push(Object.assign(base(), { at: "ok", verdict: true, final: true, pairIdx: k, vars: { return: 1 }, msg: `<b>Валиден сертификат</b>: всеки връх точно веднъж и всички ${k} съседни двойки (вкл. последен→първи) са ребра. Проверката е O(n²) — полиномиална.`, log: "return 1" }));
      return { frames: F, result: 1 };
    },

    ham_search({ n, edges }) {
      const G = parseGraph(n, edges);
      const F = [], cyc = Array.from({ length: G.n }, (_, i) => i);
      let tried = 0;
      F.push({ G, cyc: cyc.slice(), at: "init", search: true, vars: { n: G.n, "(n−1)!": fact(G.n - 1) }, stats: { пробвани: 0 }, msg: `Връх 0 е фиксиран; остават (n−1)! = ${fact(G.n - 1)} наредби.` });
      do {
        tried++;
        const ok = verifyPlain(G.n, G.adj, cyc);
        F.push({ G, cyc: cyc.slice(), at: ["verify", "try"], search: true, verdict: ok, vars: { cyc: cyc.join(" ") }, stats: { пробвани: tried }, msg: `Кандидат №${tried}: ${cyc.join(" → ")} → 0 — ${ok ? "<b>валиден</b>" : "не е цикъл"}.`, log: `${cyc.join("")} ${ok ? "✓" : "✗"}` });
        if (ok) {
          F.push({ G, cyc: cyc.slice(), at: "found", search: true, verdict: true, final: true, vars: { return: 1 }, stats: { пробвани: tried }, msg: `Намерен след <b>${tried}</b> от ${fact(G.n - 1)} кандидата. Намерената наредба е сертификат.` });
          return { frames: F, result: 1, tried, cyc: cyc.join("") };
        }
      } while (nextPerm(cyc, 1));
      F.push({ G, cyc: null, at: "none", search: true, verdict: false, final: true, vars: { return: 0 }, stats: { пробвани: tried }, msg: `Всички ${tried} = (n−1)! наредби са проверени ⇒ <b>няма</b> Хамилтонов цикъл (доказано чрез изчерпване). Растежът (n−1)! прави това непрактично за голямо n.` });
      return { frames: F, result: 0, tried, cyc: "" };
    },

    sat_eval({ formula, x }) {
      const { f, n } = parseCNF(formula);
      const X = parseX(x, n), F = [], st = Array(f.length).fill(null);
      let ops = 0;
      for (let c = 0; c < f.length; c++) {
        F.push({ at: "clause", f, X, st: st.slice(), c, vars: { c, клауза: clauseTxt(f[c]) }, stats: { литерали: ops }, msg: `Клауза ${c}: ${clauseTxt(f[c])}.` });
        let sat = false;
        for (let k = 0; k < f[c].length; k++) {
          const l = f[c][k], v = Math.abs(l), val = l > 0 ? X[v] : 1 - X[v];
          ops++;
          F.push({ at: "lit", f, X, st: st.slice(), c, k, vars: { c, k, литерал: litTxt(l), [`x${v}`]: X[v], стойност: val }, stats: { литерали: ops }, msg: `${litTxt(l)} при x${v} = ${X[v]} → <b>${val ? "вярно" : "невярно"}</b>.` });
          if (val) { sat = true; break; }
        }
        st[c] = sat;
        if (!sat) {
          F.push({ at: "false", f, X, st: st.slice(), c, final: true, verdict: false, vars: { return: 0 }, stats: { литерали: ops }, msg: `Клауза ${c} е <b>невярна</b> ⇒ присвояването НЕ изпълнява формулата. Това не значи, че формулата е неизпълнима — може да има друг сертификат.`, log: `C${c} ✗ → 0` });
          return { frames: F, result: 0, ops };
        }
        F.push({ at: "true", f, X, st: st.slice(), c, vars: { c }, stats: { литерали: ops }, msg: `Клауза ${c} е вярна.`, log: `C${c} ✓` });
      }
      F.push({ at: "ok", f, X, st: st.slice(), final: true, verdict: true, vars: { return: 1 }, stats: { литерали: ops }, msg: `Всички клаузи са верни ⇒ присвояването е <b>валиден сертификат</b>. Проверени ${ops} литерала — O(дължина на формулата).`, log: "return 1" });
      return { frames: F, result: 1, ops };
    },

    sat_brute({ formula }) {
      const { f, n } = parseCNF(formula);
      const F = [], hist = [];
      let tried = 0;
      for (let mask = 0; mask < 1 << n; mask++) {
        const X = [0];
        for (let i = 1; i <= n; i++) X[i] = (mask >> (i - 1)) & 1;
        tried++;
        const st = f.map((c) => c.some((l) => (l > 0 ? X[l] : !X[-l])));
        const ok = st.every(Boolean);
        hist.push([X.slice(1).join(""), ok]);
        F.push({ at: ["check", "assign"], f, X, st, brute: true, hist: hist.slice(), vars: { mask, x: X.slice(1).join("") }, stats: { пробвани: tried, "2ⁿ": 1 << n }, msg: `Присвояване №${tried}: x = ${X.slice(1).join("")} → ${ok ? "<b>изпълнява</b>" : "не изпълнява"} (${st.filter(Boolean).length}/${f.length} клаузи верни).`, log: `${X.slice(1).join("")} ${ok ? "✓" : "✗"}` });
        if (ok) {
          F.push({ at: "sat", f, X, st, brute: true, hist: hist.slice(), final: true, verdict: true, vars: { return: 1 }, stats: { пробвани: tried, "2ⁿ": 1 << n }, msg: `<b>Изпълнима</b>. x = ${X.slice(1).join("")} е сертификат — всеки може да го провери бързо.` });
          return { frames: F, result: 1, tried };
        }
      }
      F.push({ at: "unsat", f, X: null, st: null, brute: true, hist: hist.slice(), final: true, verdict: false, vars: { return: 0 }, stats: { пробвани: tried, "2ⁿ": 1 << n }, msg: `Всички 2<sup>${n}</sup> = ${tried} присвоявания са проверени ⇒ <b>неизпълнима</b>. Кратък сертификат за „не“ стандартната дефиниция не обещава (<dfn data-g="conp">coNP</dfn>, разширение).` });
      return { frames: F, result: 0, tried };
    },

    reduce({ n, edges }) {
      const G = parseGraph(n, edges);
      const N = G.n, d = Array.from({ length: N }, () => Array(N).fill(null)), F = [];
      F.push({ G, d: d.map((r) => r.slice()), at: "loop", vars: { n: N }, msg: `Вход за A (Хамилтонов цикъл): граф с ${N} върха. Строим вход за B (TSP): пълна матрица на разстояния.` });
      for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
        d[u][v] = u === v ? 0 : G.adj[u][v] ? 1 : 2;
        if (u < v) F.push({ G, d: d.map((r) => r.slice()), cell: [u, v], at: "w", vars: { u, v, "d[u][v]": d[u][v] }, msg: `${u}–${v}: ${G.adj[u][v] ? "ребро ⇒ разстояние 1" : "не е ребро ⇒ разстояние 2"}.` });
      }
      let sum = 0;
      d.forEach((r) => r.forEach((x) => (sum += x)));
      F.push({ G, d, at: "k", K: N, vars: { K: N }, msg: `K = n = ${N}. Обиколка на всички ${N} града има ${N} отсечки, всяка ≥ 1 ⇒ дължина ≤ ${N} е възможна само ако всички отсечки са 1, т.е. ребра на G.` });
      // отговорите на двете задачи
      const p = Array.from({ length: N }, (_, i) => i);
      let tour = null;
      do { let len = 0; for (let i = 0; i < N; i++) len += d[p[i]][p[(i + 1) % N]]; if (len <= N) { tour = p.slice(); break; } } while (nextPerm(p, 1));
      const c = Array.from({ length: N }, (_, i) => i);
      let ham = 0;
      do { if (verifyPlain(N, G.adj, c)) { ham = 1; break; } } while (nextPerm(c, 1));
      const tsp = tour ? 1 : 0;
      F.push({ G, d, at: "k", K: N, tour, final: true, vars: { "A: Хам. цикъл": ham ? "да" : "не", "B: TSP ≤ K": tsp ? "да" : "не" }, msg: `Отговорът се запазва: x е „да“ за A ⇔ f(x) е „да“ за B. Тук: ${ham ? "да" : "не"} ⇔ ${tsp ? "да" : "не"}.${tour ? ` Обиколка ${tour.join("→")}→${tour[0]} с дължина ${N}.` : ` Всяка обиколка има дължина > ${N}.`}`, inv: { text: "отговорът на A = отговорът на B", ok: ham === tsp } });
      return { frames: F, result: `K${N} sum${sum} ham${ham} tsp${tsp}` };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="p">P</dfn> (Polynomial Time) — <dfn data-g="задача за разпознаване">задачи за разпознаване</dfn>, разрешими от детерминирана машина на Тюринг за <dfn data-g="полиномиално време">полиномиално време</dfn> (≤ p(n) стъпки). Примери: достижимост на връх, свързаност на граф, четност.</p>
  <p><dfn data-g="np">NP</dfn> (Nondeterministic Polynomial Time) — разрешими от <dfn data-g="недетерминирана машина">недетерминирана</dfn> МТ за полиномиално време. Еквивалентно: за всеки положителен екземпляр има <dfn data-g="сертификат">сертификат</dfn> с полиномиална дължина, който се проверява детерминирано за полиномиално време (<dfn data-g="проверител">проверител</dfn>).</p>
  <p>P ⊆ NP: ако можеш да решиш задачата, можеш и да я „провериш“, като игнорираш сертификата.</p>
</div>

<div class="block">
  <h3>Сертификат: Хамилтонов цикъл</h3>
  <p class="prose"><dfn data-g="хамилтонов цикъл">Хамилтонов цикъл</dfn>: предложената последователност от върхове е сертификат; проверката е полиномиална; за <i>намирането</i> не е известен полиномиален алгоритъм в общия случай. <b>Щракни върховете</b> в реда на цикъла, после „Изпълни“.</p>
  <div id="v-ham"></div>
  <details class="hint"><summary>Хинт: какво точно проверява проверителят</summary><div>
    <p>(1) точно n върха; (2) всеки връх точно веднъж; (3) всяка съседна двойка, <b>включително последен→първи</b>, е ребро. С матрица на съседство това е O(n) + O(n) = O(n) проверки след O(n²) представяне — полиномиално.</p>
    <p>Изчерпателното търсене пробва до (n−1)! наредби: 6 върха → 120, 10 → 362 880, 20 → ~1,2·10¹⁷.</p>
  </div></details>
  <details class="trap"><summary>Капан: „сертификатът е отхвърлен ⇒ няма цикъл“</summary><div>
    <p>Отхвърлянето на един сертификат не доказва, че няма друг. Дефиницията на NP обещава кратко свидетелство само за <b>положителните</b> входове.</p>
  </div></details>
</div>

<div class="block">
  <h3>SAT</h3>
  <p class="prose"><dfn data-g="sat">SAT</dfn>: изпълнима ли е булевата формула? Формулата е в <dfn data-g="кнф">КНФ</dfn>. Превключвателите задават присвояване (сертификат); клаузите се оцветяват веднага. Стъпковият визуализатор показва C проверката — O(дължина на формулата) — или изчерпването на 2ⁿ присвоявания.</p>
  <div id="sat-live"></div>
  <div id="v-sat"></div>
  <details class="trap"><summary>Капан: „невалиден сертификат ⇒ неизпълнима формула“</summary><div>
    <p>За формулата (x1∨¬x2)∧(x2∨x3)∧(¬x1∨¬x3): x = 110 е валиден сертификат, x = 111 — невалиден (третата клауза е невярна). Формулата е изпълнима, въпреки че вторият сертификат се отхвърля. Бутоните „сертификат 110“ и „сертификат 111“ показват точно това.</p>
  </div></details>
  <details class="trap"><summary>Капан: 3-SAT и 2-SAT</summary><div>
    <p>3-SAT е NP-пълна; <dfn data-g="2-sat">2-SAT</dfn> има полиномиален алгоритъм. Близкото име не определя еднаква сложност.</p>
  </div></details>
</div>

<div class="block">
  <h3>Полиномиална сводимост и посоката ѝ</h3>
  <p class="prose"><dfn data-g="полиномиална сводимост">A ≤ₚ B</dfn>: има полиномиална функция f, такава че x е „да“ за A ⇔ f(x) е „да“ за B. Тогава полиномиален алгоритъм за B дава полиномиален алгоритъм за A: преобразувай с f, реши B.</p>
  <div class="cards" id="dir"></div>
  <div class="key" id="dir-info"></div>
  <p class="prose">Пример: <b>Хамилтонов цикъл ≤ₚ <dfn data-g="tsp">TSP</dfn> (решаваща)</b> — тегло 1 за ребро, 2 за не-ребро, K = n.</p>
  <div id="v-red"></div>
  <details class="hint"><summary>Хинт: защо отговорът се запазва</summary><div>
    <p>(⇒) Ако G има Хамилтонов цикъл, същата обиколка минава само по ребра: дължина n·1 = n ≤ K.</p>
    <p>(⇐) Обиколката има n отсечки с тегло ≥ 1. Дължина ≤ n е възможна само ако всяка е 1, т.е. всяка отсечка е ребро на G ⇒ това е Хамилтонов цикъл.</p>
    <p>f строи n² числа — полиномиално.</p>
  </div></details>
</div>

<div class="block">
  <h3>NP-трудни и NP-пълни</h3>
  <div class="split">
    <div class="key"><b><dfn data-g="np-трудна">NP-трудна</dfn></b><p>Всяка задача от NP се свежда полиномиално до нея. Може да не е в NP (и дори да е неразрешима).</p></div>
    <div class="key"><b><dfn data-g="np-пълна">NP-пълна</dfn></b><p>NP-трудна <b>и</b> в NP. Примери: SAT (първата — <dfn data-g="теорема на кук–левин">Кук–Левин</dfn>), 3-SAT, Хамилтонов цикъл, TSP с обиколка ≤ K (при двоично кодирани цели тегла).</p></div>
  </div>
  <p class="muted">Превключи хипотетичния свят и щракни пример. P ⊆ NP е доказано; P = NP или P ≠ NP — не е (към 17.10.2026 въпросът е нерешен).</p>
  <div id="world" class="row"></div>
  <div id="classes" style="min-width:0;overflow-x:auto"></div><div class="key" id="cls-info"></div>
  <details class="trap"><summary>Капан: „NP = неполиномиално“ и „тази задача е NP, следователно не е P“</summary><div>
    <p>NP <b>не</b> означава „неполиномиално“. Всяка задача от P е в NP. „Задачата е в NP, значи не е в P“ е грешен извод.</p>
    <p>Не рисуваме NP-пълните като доказано извън P без изричното условие P ≠ NP.</p>
  </div></details>
  <details class="trap"><summary>Капан: „работи бързо на моите примери“</summary><div>
    <p>Отделни лесни входове и успешни евристики не установяват полиномиална граница за най-лошия случай. CP-SAT (Google OR-Tools) решава задачи с ограничения; използването му не прави NP-пълните задачи полиномиални <span class="extra-tag">разширение</span>.</p>
  </div></details>
  <div class="key"><p class="formula">P ⊆ NP · NP-пълна = NP ∩ NP-трудна</p><p>Полиномиален алгоритъм за една NP-пълна задача ⇒ P = NP. Ако P ≠ NP, никоя NP-пълна задача не е в P.</p></div>
</div>

<div class="block">
  <h3>Три различни въпроса</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th></th><th>Изчислимост</th><th>Сложност на алгоритъм</th><th>Клас на задача</th></tr>
    <tr><th>Въпрос</th><td>Съществува ли алгоритъм изобщо?</td><td>Колко расте времето/паметта на този алгоритъм?</td><td>Има ли полиномиален алгоритъм / проверка за задачата?</td></tr>
    <tr><th>Обект</th><td>задача</td><td>алгоритъм</td><td>задача</td></tr>
    <tr><th>Пример</th><td>Проблемът за спирането е неразрешим</td><td>Merge Sort е Θ(n log n)</td><td>Достижимостта е в P</td></tr>
    <tr><th>Раздел</th><td><a href="#izchislimost">2</a></td><td><a href="#slozhnost">3</a></td><td>4</td></tr>
  </table></div>
</div>`;

  /* ---------- рисуване на граф ---------- */
  function pos(n, k, W, H) {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return [W / 2 + Math.cos(a) * (H / 2 - 34), H / 2 + Math.sin(a) * (H / 2 - 34)];
  }
  function drawGraph(G, o = {}) {
    const W = 360, H = 290;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
    const P = Array.from({ length: G.n }, (_, k) => pos(G.n, k, W, H));
    const ek = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
    for (const [a, b] of G.list) {
      const cls = (o.edgeCls && o.edgeCls[ek(a, b)]) || "";
      svg.append(S.svg("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: "edge " + cls }));
    }
    if (o.missing) svg.append(S.svg("line", { x1: P[o.missing[0]][0], y1: P[o.missing[0]][1], x2: P[o.missing[1]][0], y2: P[o.missing[1]][1], class: "edge s-swap", "stroke-dasharray": "6 5" }));
    for (let k = 0; k < G.n; k++) {
      const g = S.svg("g", { class: "node " + ((o.nodeCls && o.nodeCls[k]) || ""), style: o.onNode ? "cursor:pointer" : null, onclick: o.onNode ? () => o.onNode(k) : null },
        S.svg("circle", { cx: P[k][0], cy: P[k][1], r: 18 }), S.svg("text", { x: P[k][0], y: P[k][1] + 5, "text-anchor": "middle", "font-weight": 700, text: k }));
      if (o.onNode) g.append(S.svg("title", { text: "Добави връх " + k + " към сертификата" }));
      svg.append(g);
      if (o.order && o.order[k] != null) svg.append(S.svg("text", { x: P[k][0] + 20, y: P[k][1] - 16, class: "wt", text: "#" + o.order[k] }));
    }
    return svg;
  }

  function mount(root) {
    /* (а) Хамилтонов цикъл */
    let hApi = null;
    hApi = S.viz(root.querySelector("#v-ham"), {
      id: "ham", title: "Проверка на сертификат срещу изчерпателно търсене", sub: "Щракни върхове, за да построиш сертификата.",
      code: (inp) => (inp.mode === "search" ? "ch04_ham_search" : "ch04_ham_verify"),
      inputs: [
        { id: "mode", label: "Режим", type: "select", value: "verify", options: [["verify", "Провери сертификата"], ["search", "Търси изчерпателно"]] },
        { id: "graph", label: "Граф", type: "select", value: "house", options: Object.keys(GRAPHS).map((k) => [k, GRAPHS[k].t]).concat([["custom", "свой / случаен"]]) },
        { id: "n", label: "n", type: "number", value: 5, width: "4em" },
        { id: "edges", label: "Ребра", value: GRAPHS.house.e, width: "15em" },
        { id: "cert", label: "Сертификат", value: "0 2 4 1 3", width: "9em" },
      ],
      presets: [{ label: "Изчисти сертификата", values: { cert: "", mode: "verify" } }, { label: "Грешен: 0 1 2 3 4", values: { cert: "0 1 2 3 4", mode: "verify" } }],
      random: () => {
        const n = S.randInt(5, 7), es = [];
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (Math.random() < 0.45) es.push("" + a + b);
        return { graph: "custom", n, edges: es.join(" "), cert: "" };
      },
      speed: 2,
      legend: [["s-act", "текущ"], ["s-done", "проверено / валидно"], ["s-swap", "нарушение"], ["s-cmp", "в сертификата"]],
      build: (inp) => (inp.mode === "search" ? algos.ham_search(inp) : algos.ham_verify(inp)),
      draw(st, f, { inputs }) {
        st.innerHTML = "";
        const G = f.G, nodeCls = {}, edgeCls = {}, order = {};
        const ek = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
        let missing = null;
        if (f.search) {
          if (f.cyc) { f.cyc.forEach((v, i) => (order[v] = i)); for (let i = 0; i < G.n; i++) { const a = f.cyc[i], b = f.cyc[(i + 1) % G.n]; if (G.adj[a][b]) edgeCls[ek(a, b)] = f.verdict ? "s-done" : "s-cmp"; else if (!missing) missing = [a, b]; } }
          for (let k = 0; k < G.n; k++) nodeCls[k] = f.verdict ? "s-done" : f.final ? "s-swap" : "s-cmp";
        } else {
          f.cyc = f.cyc || [];
          f.cyc.forEach((v, i) => { if (order[v] == null) order[v] = i; nodeCls[v] = f.seen && f.seen[v] ? "s-done" : "s-cmp"; });
          if (f.cur != null) nodeCls[f.cur] = "s-act";
          if (f.bad != null) nodeCls[f.bad] = "s-swap";
          if (f.pairIdx != null) for (let i = 0; i < Math.min(f.pairIdx, f.cyc.length); i++) { const a = f.cyc[i], b = f.cyc[(i + 1) % f.cyc.length]; edgeCls[ek(a, b)] = "s-done"; }
          if (f.pair) { if (f.pairOk) edgeCls[ek(f.pair[0], f.pair[1])] = "s-act"; else missing = f.pair; }
        }
        const svg = drawGraph(G, { nodeCls, edgeCls, order, missing, onNode: (k) => { const c = (inputs.cert || "").trim(); hApi.setValues({ cert: (c ? c + " " : "") + k, mode: "verify" }); hApi.apply(); } });
        const side = h("div", { style: { display: "grid", gap: "8px", alignContent: "start" } });
        if (f.search) {
          side.append(h("p", null, h("b", { text: "Кандидат: " }), h("span", { class: "mono", text: f.cyc ? f.cyc.join(" → ") + " → " + f.cyc[0] : "—" })));
          const n = G.n, rows = h("table", { class: "t" }, h("tr", null, h("th", { text: "n" }), h("th", { text: "(n−1)! кандидата" })));
          [n, 10, 15, 20].forEach((k) => rows.append(h("tr", { class: k === n ? "" : "muted" }, h("td", { class: "mono", text: k }), h("td", { class: "mono", text: fact(k - 1).toLocaleString("bg") }))));
          side.append(h("div", { class: "tbl-wrap" }, rows));
        } else {
          side.append(h("div", { class: "row" }, h("span", { class: "eyebrow", text: "Сертификат" })));
          const box = h("div");
          if (f.cyc.length) S.drawArray(box, f.cyc, { cls: Object.fromEntries(f.cyc.map((v, i) => [i, f.idx === i ? (f.bad != null ? "s-swap" : "s-act") : f.pairIdx != null && (i === f.pairIdx || i === (f.pairIdx + 1) % f.cyc.length) && f.pair ? (f.pairOk ? "s-act" : "s-swap") : ""])) });
          else box.append(h("p", { class: "muted", text: "празен — щракни върхове в графа" }));
          side.append(box);
        }
        if (f.final) side.append(h("span", { class: "pill " + (f.verdict ? "s-done" : "s-swap"), style: { justifySelf: "start" }, text: f.search ? (f.verdict ? "намерен цикъл" : "няма цикъл (изчерпано)") : f.verdict ? "сертификатът е валиден" : "сертификатът е отхвърлен" }));
        st.append(h("div", { class: "split" }, h("div", null, svg), side));
      },
    });
    hApi.root.querySelector("#ham-graph").addEventListener("change", (e) => {
      const g = GRAPHS[e.target.value];
      if (g) { hApi.setValues({ n: g.n, edges: g.e, cert: "" }); hApi.apply(); }
    });

    /* (б) SAT */
    let sApi = null;
    const live = root.querySelector("#sat-live");
    const liveBox = h("div", { class: "viz" }, h("div", { class: "viz-head" }, h("h4", { text: "Присвояване на живо" }), h("span", { class: "sub", text: "Щракни xᵢ, за да го смениш." })));
    const toggles = h("div", { class: "viz-inputs" }), clauses = h("div", { class: "viz-stage", style: { minHeight: "0" } });
    liveBox.append(toggles, clauses);
    live.append(liveBox);
    function renderLive() {
      const fe = root.querySelector("#sat-formula"), xe = root.querySelector("#sat-x");
      if (!fe || !xe) return;
      const inp = { formula: fe.value, x: xe.value };
      toggles.innerHTML = ""; clauses.innerHTML = "";
      let P;
      try { P = parseCNF(inp.formula); } catch (e) { clauses.append(h("p", { class: "warn", text: e.message })); return; }
      let xs = String(inp.x).replace(/\s/g, "");
      if (!/^[01]*$/.test(xs)) xs = "";
      xs = (xs + "0".repeat(P.n)).slice(0, P.n);
      const X = [0, ...xs.split("").map(Number)];
      for (let i = 1; i <= P.n; i++) toggles.append(h("button", { class: "btn", "aria-pressed": X[i] ? "true" : "false", text: `x${i} = ${X[i]}`, onclick: () => { X[i] = 1 - X[i]; sApi.setValues({ x: X.slice(1).join(""), mode: "eval" }); sApi.apply(); sApi.go(sApi.frames.length - 1); } }));
      const row = h("div", { class: "row" });
      P.f.forEach((c, k) => { const ok = c.some((l) => (l > 0 ? X[l] : !X[-l])); row.append(h("span", { class: "pill " + (ok ? "s-done" : "s-swap"), text: `C${k} ${clauseTxt(c)} ${ok ? "✓" : "✗"}` })); });
      const all = evalPlain(P.f, X);
      clauses.append(row, h("p", { style: { marginTop: "8px" }, html: all ? `<b>Формулата е вярна</b> при x = ${xs} — това присвояване е сертификат.` : `<b>Невярна</b> при x = ${xs}. Това не казва дали друго присвояване би я изпълнило.` }));
    }
    sApi = S.viz(root.querySelector("#v-sat"), {
      id: "sat", title: "SAT: проверка O(дължина) срещу изчерпване 2ⁿ", sub: "Литерал: 3 = x3, −3 = ¬x3; клаузите се разделят с |.",
      code: (inp) => (inp.mode === "brute" ? "ch04_sat_brute" : "ch04_sat_eval"),
      inputs: [
        { id: "mode", label: "Режим", type: "select", value: "eval", options: [["eval", "Провери присвояването"], ["brute", "Изчерпателно 2ⁿ"]] },
        { id: "formula", label: "Формула (КНФ)", value: FORMULAS.f1.s, width: "17em" },
        { id: "x", label: "x1…xn", value: "110", width: "6em" },
      ],
      presets: [
        { label: "сертификат 110", values: { formula: FORMULAS.f1.s, x: "110", mode: "eval" } },
        { label: "сертификат 111", values: { formula: FORMULAS.f1.s, x: "111", mode: "eval" } },
        { label: "неизпълнима", values: { formula: FORMULAS.f2.s, x: "11", mode: "brute" } },
        { label: "„точно x2“", values: { formula: FORMULAS.f3.s, x: "000", mode: "brute" } },
        { label: "верига (5)", values: { formula: FORMULAS.f4.s, x: "11111", mode: "brute" } },
      ],
      legend: [["s-act", "текущ литерал"], ["s-done", "вярна клауза"], ["s-swap", "невярна клауза"]],
      build: (inp) => (inp.mode === "brute" ? algos.sat_brute(inp) : algos.sat_eval(inp)),
      onFrame: () => { if (sApi) renderLive(); },
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "row" });
        f.f.forEach((c, k) => {
          let cls = "";
          if (f.st && f.st[k] === true) cls = "s-done";
          else if (f.st && f.st[k] === false) cls = "s-swap";
          else if (f.c === k) cls = "s-cmp";
          const lits = c.map((l, j) => {
            const active = f.c === k && f.k === j && !f.brute;
            return h("span", { class: active ? "pill s-act" : "", style: { padding: active ? "2px 6px" : "0" }, text: litTxt(l) });
          });
          const parts = [];
          lits.forEach((x, j) => { if (j) parts.push(" ∨ "); parts.push(x); });
          row.append(h("span", { class: "pill " + cls, style: { fontFamily: "var(--f-mono)", fontWeight: 500 } }, `C${k}: (`, ...parts, ")"));
        });
        st.append(row);
        if (f.X) st.append(h("p", { class: "mono", style: { marginTop: "10px" }, text: "x = " + f.X.slice(1).map((v, i) => `x${i + 1}=${v}`).join("  ") }));
        if (f.brute) {
          const tb = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "10px" } });
          f.hist.forEach(([x, ok]) => tb.append(h("span", { class: "pill " + (ok ? "s-done" : "s-dim"), text: x })));
          st.append(tb);
        }
      },
    });
    sApi.root.querySelector("#sat-formula").addEventListener("input", renderLive);
    renderLive();

    /* (в) посока на сводимостта */
    const DIRS = [
      { t: "известна трудна A → нова B", d: "A ≤ₚ B, където A е известна NP-пълна (напр. Хамилтонов цикъл), B е новата задача (TSP).", ok: "<b>Доказва:</b> B е поне толкова трудна, колкото A ⇒ B е NP-трудна. Ако освен това B ∈ NP ⇒ B е NP-пълна.", no: "<b>Не доказва:</b> че B няма полиномиален алгоритъм (това би изисквало P ≠ NP)." },
      { t: "нова B → известна трудна A", d: "B ≤ₚ A: новата задача се свежда до известна трудна.", ok: "<b>Доказва само:</b> B не е по-трудна от A (ако A има полиномиален алгоритъм, и B има).", no: "<b>Не доказва</b> нищо за трудността на B — и лесна задача се свежда до SAT." },
    ];
    const dBox = root.querySelector("#dir"), dInfo = root.querySelector("#dir-info");
    const dBtns = DIRS.map((D, i) => h("button", { class: "card", "aria-pressed": i ? "false" : "true", onclick: () => pickDir(i) }, h("span", { class: "eyebrow", text: "посока " + (i + 1) }), h("h4", { text: D.t }), h("p", { text: D.d })));
    dBox.append(...dBtns);
    function pickDir(i) {
      dBtns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const W = 520, Hh = 70;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${Hh}`, width: W });
      const [L, R] = i === 0 ? ["A: Хам. цикъл (известна)", "B: TSP (нова)"] : ["B: нова задача", "A: SAT (известна)"];
      svg.append(S.svg("g", { class: "node s-piv" }, S.svg("rect", { x: 4, y: 14, width: 200, height: 40, rx: 6, style: "fill:var(--cb);stroke:var(--c);stroke-width:2" })), S.svg("text", { x: 104, y: 39, "text-anchor": "middle", text: L }));
      svg.append(S.svg("g", { class: "node s-act" }, S.svg("rect", { x: 316, y: 14, width: 200, height: 40, rx: 6, style: "fill:var(--cb);stroke:var(--c);stroke-width:2" })), S.svg("text", { x: 416, y: 39, "text-anchor": "middle", text: R }));
      svg.append(S.svg("line", { x1: 208, y1: 34, x2: 304, y2: 34, class: "edge s-act" }), S.svg("path", { d: "M304 27 L314 34 L304 41 Z", style: "fill:var(--st-act)" }), S.svg("text", { x: 258, y: 26, "text-anchor": "middle", text: "f, ≤ₚ" }));
      dInfo.innerHTML = "";
      dInfo.append(svg, h("p", { html: DIRS[i].ok }), h("p", { html: DIRS[i].no }));
    }
    pickDir(0);

    S.viz(root.querySelector("#v-red"), {
      id: "red", title: "f: граф → матрица на разстояния, K = n", sub: "Отговорът „да/не“ се запазва.",
      code: "ch04_reduce",
      inputs: [{ id: "graph", label: "Граф", type: "select", value: "house", options: Object.keys(GRAPHS).map((k) => [k, GRAPHS[k].t]) }],
      speed: 2,
      legend: [["s-act", "текуща клетка"], ["s-done", "тегло 1 (ребро) / обиколка"], ["s-cmp", "тегло 2"]],
      build: (inp) => { const g = GRAPHS[inp.graph] || GRAPHS.house; return algos.reduce({ n: g.n, edges: g.e }); },
      startAtEnd: false,
      draw(st, f) {
        st.innerHTML = "";
        const N = f.G.n, inTour = new Set();
        if (f.tour) for (let i = 0; i < N; i++) { const a = f.tour[i], b = f.tour[(i + 1) % N]; inTour.add(a + "," + b); inTour.add(b + "," + a); }
        const edgeCls = {};
        if (f.tour) for (let i = 0; i < N; i++) { const a = f.tour[i], b = f.tour[(i + 1) % N]; edgeCls[a < b ? a + "-" + b : b + "-" + a] = "s-done"; }
        if (f.cell && f.G.adj[f.cell[0]][f.cell[1]]) edgeCls[f.cell[0] + "-" + f.cell[1]] = "s-act";
        const nodeCls = {};
        if (f.cell) { nodeCls[f.cell[0]] = "s-act"; nodeCls[f.cell[1]] = "s-act"; }
        const svg = drawGraph(f.G, { edgeCls, nodeCls });
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "d" }), ...Array.from({ length: N }, (_, j) => h("th", { text: j }))));
        for (let u = 0; u < N; u++) {
          const tr = h("tr", null, h("th", { text: u }));
          for (let v = 0; v < N; v++) {
            const x = f.d[u][v];
            let cls = x == null || u === v ? "" : inTour.has(u + "," + v) ? "s-done" : "";
            if (f.cell && ((f.cell[0] === u && f.cell[1] === v) || (f.cell[0] === v && f.cell[1] === u))) cls = "s-act";
            else if (x === 2 && !cls) cls = "s-cmp";
            tr.append(h("td", { class: cls, text: x == null ? "" : x }));
          }
          tb.append(tr);
        }
        const right = h("div", null, h("div", { class: "tbl-wrap" }, tb));
        if (f.K) right.append(h("p", { class: "mono", style: { marginTop: "8px" }, text: `K = ${f.K}` }));
        st.append(h("div", { class: "split" }, h("div", null, h("span", { class: "eyebrow", text: "вход за A: граф G" }), svg), h("div", null, h("span", { class: "eyebrow", text: "вход за B: f(G)" }), right)));
      },
    });

    /* (г) класове */
    const EX = {
      reach: { t: "достижимост в граф", cls: "P", d: "В P — BFS/DFS за линейно време (<a href=\"#izchislimost\">раздел 2</a>)." },
      par: { t: "четност", cls: "P", d: "В P — един остатък по модул 2." },
      sat2: { t: "2-SAT", cls: "P", d: "В P — има полиномиален алгоритъм, въпреки близкото име с 3-SAT." },
      sat: { t: "SAT / 3-SAT", cls: "NPC", d: "NP-пълни. SAT е първата доказано NP-пълна задача (Кук–Левин)." },
      ham: { t: "Хамилтонов цикъл", cls: "NPC", d: "NP-пълна: сертификатът е самият цикъл; трудността — чрез свеждане от известна NP-пълна задача." },
      tspd: { t: "TSP решаваща (≤ K)", cls: "NPC", d: "NP-пълна (при двоично кодирани цели тегла). Хамилтонов цикъл ≤ₚ TSP — виж по-горе." },
      tspo: { t: "TSP оптимизационна", cls: "NPH", d: "NP-трудна, но <b>не е в NP</b>: не е задача за разпознаване (търси минимална обиколка, не отговор да/не)." },
      halt: { t: "проблем за спирането", cls: "NPH", d: "NP-трудна и <b>неразрешима</b> <span class=\"extra-tag\">разширение</span> — всяка задача от NP се свежда до нея, но тя не е в NP." },
    };
    let world = "neq", sel = "sat";
    const wBox = root.querySelector("#world"), cBox = root.querySelector("#classes"), cInfo = root.querySelector("#cls-info");
    const wb = [["neq", "свят „P ≠ NP“ (условно)"], ["eq", "свят „P = NP“ (условно)"]].map(([k, t]) => h("button", { class: "btn", "aria-pressed": k === world ? "true" : "false", text: t, onclick: () => { world = k; wb.forEach((b) => b.setAttribute("aria-pressed", b.textContent === t ? "true" : "false")); drawCls(); } }));
    wBox.append(...wb);
    function drawCls() {
      cBox.innerHTML = "";
      const W = 640, H = 300;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, style: "min-width:540px" });
      const el = (cls, cx, cy, rx, ry, dash) => S.svg("g", { class: "node " + cls }, S.svg("ellipse", { cx, cy, rx, ry, style: `fill:var(--cb);fill-opacity:.55;stroke:var(--c);stroke-width:2${dash ? ";stroke-dasharray:6 4" : ""}` }));
      const T = (x, y, t, a = "middle") => S.svg("text", { x, y, "text-anchor": a, "font-weight": 600, text: t });
      svg.append(S.svg("text", { x: W / 2, y: 18, "text-anchor": "middle", class: "muted", text: world === "neq" ? "АКО P ≠ NP (недоказано; P ⊆ NP е доказано)" : "АКО P = NP (недоказано)" }));
      svg.append(el("s-swap", 450, 165, 180, 120, true), T(560, 70, "NP-трудни"));
      if (world === "neq") {
        svg.append(el("s-act", 195, 165, 180, 120), T(70, 70, "NP"));
        svg.append(el("s-done", 135, 175, 100, 75), T(135, 128, "P"));
      } else {
        svg.append(el("s-done", 195, 165, 180, 120), T(85, 70, "P = NP"));
      }
      svg.append(S.svg("text", { x: 322, y: 102, "text-anchor": "middle", class: "wt", text: "NP-пълни" }));
      const SH = { reach: "достижимост", par: "четност", sat2: "2-SAT", sat: "SAT, 3-SAT", ham: "Хам. цикъл", tspd: "TSP ≤ K", tspo: "TSP оптим.", halt: "спиране" };
      const place = { reach: [70, 168], par: [70, 193], sat2: [70, 218], sat: [282, 140], ham: [282, 170], tspd: [282, 200], tspo: [470, 160], halt: [470, 195] };
      for (const k in EX) {
        const [x, y] = place[k];
        const g = S.svg("g", { style: "cursor:pointer", tabindex: 0, role: "button", onclick: () => { sel = k; drawCls(); }, onmouseenter: () => showEx(k), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sel = k; drawCls(); } } },
          S.svg("circle", { cx: x - 8, cy: y - 4, r: 4, style: "fill:var(--ink)" }), S.svg("text", { x: x, y: y, "font-weight": k === sel ? 700 : 400, "text-decoration": k === sel ? "underline" : null, text: SH[k] }),
          S.svg("title", { text: EX[k].t }));
        svg.append(g);
      }
      cBox.append(svg);
      showEx(sel);
    }
    function showEx(k) {
      const E = EX[k];
      const where = { P: "P (следователно и NP)", NPC: "NP-пълни = NP ∩ NP-трудни", NPH: "NP-трудни, извън NP" }[E.cls];
      cInfo.innerHTML = `<p><b>${E.t}</b> — ${where}</p><p>${E.d}</p>` + (E.cls === "NPC" ? `<p class="muted">${world === "neq" ? "Ако P ≠ NP — не е в P. Това е условно." : "Ако P = NP — щеше да е в P. Също условно."}</p>` : "");
    }
    drawCls();

  }

  S.chapter({ id: "pnp", order: 4, num: "4", group: "Изчислимост и сложност", title: "Класове P и NP, сводимост, NP-пълнота", lead: "Бързо решаване срещу бърза проверка. Сертификати, свеждане между задачи и защо P = NP? е открит въпрос.", html, mount, algos });
})();
