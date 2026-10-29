/* Раздел 2 — Изчислимост и разрешимост. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "bfs": { cat: "Изчислимост", t: "Обхождане в ширина (BFS)", en: "Breadth-first search", d: "Обхождане на граф с опашка: първо всички върхове на 1 ребро, после на 2 и т.н.", more: "Върховете се изваждат по нарастващ брой ребра от началото — затова BFS дава най-кратък път в непретеглен граф." },
    "диагонален аргумент": { cat: "Изчислимост", t: "Диагонален аргумент", en: "Diagonal argument", d: "Строи се обект, който се различава от i-тия елемент на списък в i-тата позиция — следователно не е в списъка.", more: "Тюринг го използва, за да покаже, че няма общ алгоритъм за проблема за спирането." },
    "частично рекурсивни функции": { cat: "Изчислимост", t: "Частично рекурсивни функции", en: "Partial recursive functions", d: "Формален модел на изчислимите функции, построен от базови функции чрез композиция, примитивна рекурсия и минимизация.", more: "„Частично“ — функцията може да не е дефинирана (изчислението да не спира) за някои входове." },
    "ламбда-изчисление": { cat: "Изчислимост", t: "Ламбда-изчисление", en: "Lambda calculus", d: "Формален модел на изчисление чрез дефиниране и прилагане на функции (Чърч).", more: "Изчислява същия клас функции като машината на Тюринг." },
    "допълнение на задача": { cat: "Изчислимост", t: "Допълнение на задача", en: "Complement", d: "Задачата със същите входове и разменени отговори „да“ и „не“.", more: "Ако и задачата, и допълнението ѝ са полуразрешими, задачата е разрешима (пускат се двете процедури паралелно)." },
  });

  /* ---------- граф за раздел (а) ---------- */
  const V = "ABCDEFGH".split("");
  const EDGES = ["AB", "AC", "BD", "CD", "CE", "DF", "EF", "EG", "FG"];
  const POS = { A: [50, 130], B: [170, 50], C: [170, 210], D: [310, 50], E: [310, 210], F: [440, 130], G: [550, 210], H: [550, 50] };
  const norm = (e) => (e[0] < e[1] ? e : e[1] + e[0]);
  function parseCut(cut) {
    const out = new Set();
    for (const p of String(cut).toUpperCase().split(/[\s,;]+/).filter(Boolean)) {
      if (!/^[A-H]{2}$/.test(p)) throw new Error(`„${p}“ не е ребро (пиши две букви, напр. DF).`);
      if (!EDGES.includes(norm(p))) throw new Error(`Ребро ${p} не съществува в графа.`);
      out.add(norm(p));
    }
    return out;
  }

  /* ---------- програми за раздел (б) ---------- */
  const PROGS = {
    collatz: { name: "Колац", key: "ch02_collatz", halted: (s) => s === 1, next: (s) => (s % 2 === 0 ? s / 2 : 3 * s + 1), lo: 0, hi: 100000 },
    is_even: { name: "is_even (x −= 2)", key: "ch02_is_even", halted: (s) => s === 0, next: (s) => s - 2, lo: -1000, hi: 1000 },
    countdown: { name: "брояч надолу", key: "ch02_countdown", halted: (s) => s <= 0, next: (s) => s - 1, lo: -1000, hi: 1000 },
    forever: { name: "while(1)", key: "ch02_forever", halted: () => false, next: (s) => s, lo: -1000, hi: 1000 },
  };

  /* ---------- чисти функции ---------- */
  const algos = {
    /* BFS в три формулировки: mode = dec | search | opt */
    bfs({ s, t, cut, mode }) {
      s = String(s).toUpperCase(); t = String(t).toUpperCase();
      if (!V.includes(s) || !V.includes(t)) throw new Error("Началото и краят са букви A…H.");
      const cutSet = parseCut(cut || "");
      if (!["dec", "search", "opt"].includes(mode)) mode = "dec";
      const n = V.length, adj = V.map(() => V.map(() => 0));
      for (const e of EDGES) if (!cutSet.has(e)) { const a = V.indexOf(e[0]), b = V.indexOf(e[1]); adj[a][b] = adj[b][a] = 1; }
      const S0 = V.indexOf(s), T0 = V.indexOf(t);
      const F = [], dist = Array(n).fill(-1), parent = Array(n).fill(-1), queue = [];
      let head = 0, nb = 0;
      const snap = (extra) => Object.assign({ dist: dist.slice(), parent: parent.slice(), queue: queue.slice(head), done: queue.slice(0, head), cut: [...cutSet], s: S0, t: T0, mode, stats: { "извадени": head, "разгледани ребра": nb } }, extra);
      const qs = () => queue.slice(head).map((x) => V[x]).join(" ") || "∅";
      F.push(snap({ at: "init", vars: { s, t }, msg: `Всички <code>dist[v] = -1</code> (непосетени). Въпрос: ${mode === "dec" ? `<b>има ли</b> път от ${s} до ${t}?` : mode === "search" ? `<b>намери</b> път от ${s} до ${t}.` : `<b>най-краткият</b> път от ${s} до ${t} — колко ребра?`}` }));
      dist[S0] = 0; queue.push(S0);
      F.push(snap({ at: "start", vars: { s, t, queue: qs() }, msg: `dist[${s}] = 0, ${s} влиза в опашката.`, log: `start ${s}` }));
      let found = -1;
      while (true) {
        F.push(snap({ at: "loop", vars: { queue: qs() }, msg: `<code>head &lt; tail</code>? Опашка: ${qs()} → <b>${head < queue.length}</b>.` }));
        if (head >= queue.length) break;
        const u = queue[head++];
        if (u === T0) {
          found = dist[u];
          F.push(snap({ at: "found", u, vars: { u: V[u], "dist[u]": dist[u] }, msg: `Изваден е ${V[u]} = t. Намерен на разстояние <b>${dist[u]}</b> ребра.`, log: `deq ${V[u]} = t` }));
          break;
        }
        F.push(snap({ at: "deq", u, vars: { u: V[u], "dist[u]": dist[u], queue: qs() }, msg: `Изваждаме u = ${V[u]} (разстояние ${dist[u]}). Не е t — разглеждаме съседите му.`, log: `deq ${V[u]} (d=${dist[u]})` }));
        for (let v = 0; v < n; v++) {
          if (!adj[u][v]) continue;
          nb++;
          const fresh = dist[v] < 0;
          F.push(snap({ at: "edge", u, v, vars: { u: V[u], v: V[v], "dist[v]": dist[v] }, msg: `Ребро ${V[u]}–${V[v]}: ${fresh ? `${V[v]} е непосетен.` : `${V[v]} вече е посетен (dist = ${dist[v]}) — пропускаме.`}` }));
          if (fresh) {
            dist[v] = dist[u] + 1; parent[v] = u; queue.push(v);
            F.push(snap({ at: "visit", u, v, vars: { u: V[u], v: V[v], "dist[v]": dist[v], queue: qs() }, msg: `dist[${V[v]}] = ${dist[v]}, parent[${V[v]}] = ${V[u]}, ${V[v]} влиза в опашката.`, log: `${V[v]}: d=${dist[v]}, от ${V[u]}` }));
          }
        }
      }
      const reached = dist.map((d, k) => (d >= 0 ? V[k] : null)).filter(Boolean);
      if (found < 0) {
        F.push(snap({ at: "empty", vars: { return: -1 }, msg: `Опашката е празна. Обходени са <b>всички</b> ${reached.length} върха, достижими от ${s}: {${reached.join(", ")}}. ${t} не е сред тях.`, inv: { text: `„няма път“ е ДОКАЗАНО: графът е краен и BFS го изчерпа`, ok: true }, log: "опашката е празна" }));
      }
      let path = [];
      if (found >= 0) for (let v = T0; v !== -1; v = parent[v]) path.unshift(v);
      const P = path.map((x) => V[x]).join(" ");
      if (mode === "dec") {
        F.push(snap({ at: ["dec", found >= 0 ? "found" : "empty"], path, final: true, vars: { return: found >= 0 ? 1 : 0 }, msg: found >= 0 ? `Разпознаване: отговор <b>ДА</b> — има път от ${s} до ${t}.` : `Разпознаване: отговор <b>НЕ</b>. Тук „не“ е доказано, защото изчерпахме крайно пространство. В общия случай „не намерих“ ≠ „не съществува“.`, log: `reachable = ${found >= 0 ? 1 : 0}` }));
      } else if (mode === "search") {
        if (found >= 0) {
          const acc = [];
          for (let v = T0; v !== -1; v = parent[v]) { acc.unshift(v); F.push(snap({ at: "back", path: acc.slice(), vars: { v: V[v], "parent[v]": parent[v] < 0 ? "-1" : V[parent[v]] }, msg: `Връщаме се по parent[]: ${V[v]}${parent[v] >= 0 ? " ← " + V[parent[v]] : " (начало)"}.` })); }
          F.push(snap({ at: "back", path, final: true, vars: { path: P }, msg: `Търсене: намерен път <b>${path.map((x) => V[x]).join(" → ")}</b>. Обектът-отговор е самият път.`, log: `path = ${P}` }));
        } else F.push(snap({ at: "empty", path: [], final: true, vars: { len: 0 }, msg: `Търсене: няма какво да върнем — няма път (доказано от изчерпания BFS).`, log: "path = —" }));
      } else {
        F.push(snap({ at: ["opt", found >= 0 ? "found" : "empty"], path, final: true, vars: { return: found }, msg: found >= 0 ? `Оптимизация: най-краткият път има <b>${found}</b> ребра (${path.map((x) => V[x]).join(" → ")}). BFS вади върховете по нарастващо разстояние, затова първото изваждане на ${t} е минимално.` : `Оптимизация: няма допустим път ⇒ няма и минимум (връщаме −1).`, log: `shortest = ${found}` }));
      }
      return { frames: F, reach: found >= 0 ? 1 : 0, dist: found, path: P || "-" };
    },

    /* симулация с лимит — полуразрешаваща процедура */
    semi({ prog, x, limit }) {
      const P = PROGS[prog];
      if (!P) throw new Error("Непозната програма.");
      x = S.int(x, P.lo, P.hi, "Входът");
      limit = S.int(limit, 1, 600, "Лимитът");
      const F = [], trace = [x];
      let s = x, steps = 0;
      const mk = (o) => Object.assign({ trace: trace.slice(-40), total: trace.length, state: s, prog, pkey: P.key, stats: { стъпки: steps, лимит: limit } }, o);
      F.push(mk({ at: "enter", pAt: "enter", vars: { x, s }, msg: `Симулираме ${P.name} върху вход ${x}.`, log: `x = ${x}` }));
      while (true) {
        const hd = P.halted(s);
        F.push(mk({ at: "check", pAt: "cond", vars: { s, steps }, msg: `Спряла ли е P в състояние ${s}? → <b>${hd ? "да" : "не"}</b>.` }));
        if (hd) break;
        F.push(mk({ at: "limit", pAt: "cond", vars: { s, steps }, msg: `steps == limit? ${steps} == ${limit} → <b>${steps === limit}</b>.` }));
        if (steps === limit) {
          F.push(mk({ at: "unknown", pAt: "cond", verdict: "unknown", vars: { s, steps, return: 0 }, msg: `Лимитът изтече: <b>„още не“</b>. Не можем да кажем „НЕ, никога не спира“ — може да спре на стъпка ${limit + 1} или по-късно.`, inv: { text: "Краен брой стъпки без спиране не доказва неспиране", ok: false }, log: `лимит ${limit}: още не` }));
          return { frames: F, result: 0, steps };
        }
        s = P.next(s); steps++; trace.push(s);
        F.push(mk({ at: "sim", pAt: "step", vars: { s, steps }, msg: `Една стъпка на P: s = ${s}.`, log: `${steps}: ${s}` }));
      }
      F.push(mk({ at: "yes", pAt: "halt", verdict: "yes", vars: { s, steps, return: 1 }, msg: `P спря след ${steps} стъпки: <b>ДА, спира (потвърдено)</b>. Положителният отговор се потвърждава от завършило изчисление.`, inv: { text: "Спирането е наблюдавано — това е доказателство", ok: true }, log: `спря на стъпка ${steps}` }));
      return { frames: F, result: 1, steps };
    },

    /* диагоналният аргумент: rows = "1010 0110 ..." */
    diag({ rows }) {
      const R = String(rows).trim().split(/[\s,;]+/).filter(Boolean);
      const n = R.length;
      if (n < 2 || n > 6) throw new Error("Нужни са от 2 до 6 реда.");
      for (const r of R) if (!/^[01]+$/.test(r) || r.length !== n) throw new Error(`Всеки ред е низ от ${n} символа 0/1 (таблицата е квадратна).`);
      const H = R.map((r) => r.split("").map(Number));
      const F = [], d = Array(n).fill(null);
      F.push({ at: "loop", H, d: d.slice(), vars: { n }, msg: `Предполагаем решател H: H[i][j] = 1 значи „P${"i"} спира върху вход P${"j"}“. Строим D ред по ред по диагонала.` });
      for (let i = 0; i < n; i++) {
        d[i] = H[i][i] ? 0 : 1;
        F.push({ at: "flip", H, d: d.slice(), cell: [i, i], vars: { i, "H[i][i]": H[i][i], "d[i]": d[i] }, msg: `H[${i}][${i}] = ${H[i][i]} (${H[i][i] ? "спира" : "цикли"}) ⇒ D(P${i}) ${d[i] ? "спира" : "цикли"} — обратното.`, log: `d[${i}] = !${H[i][i]} = ${d[i]}` });
      }
      let eqRow = -1;
      for (let i = 0; i < n; i++) {
        F.push({ at: "row", H, d: d.slice(), row: i, vars: { i }, msg: `Сравняваме D с ред P${i}.` });
        let same = true;
        for (let j = 0; j < n && same; j++) {
          same = H[i][j] === d[j];
          F.push({ at: "cmp", H, d: d.slice(), row: i, cell: [i, j], diff: !same, vars: { i, j, "H[i][j]": H[i][j], "d[j]": d[j] }, msg: same ? `Колона ${j}: съвпадат (${d[j]}).` : `Колона ${j}: <b>различни</b> (H=${H[i][j]}, D=${d[j]}) ⇒ D ≠ P${i}.${j === i ? " Различието е точно на диагонала — така е построено D." : ""}`, log: same ? null : `D ≠ P${i} (колона ${j})` });
        }
        if (same) { eqRow = i; break; }
      }
      F.push({ at: "none", H, d: d.slice(), vars: { return: eqRow }, final: true, msg: `D се различава от всеки ред ⇒ D не е в списъка. Но D е програма, построена от H — ако H съществуваше, D щеше да е в списъка на всички програми. <b>Противоречие ⇒ няма такъв H.</b>`, inv: { text: "Нито един ред не е равен на D", ok: eqRow === -1 }, log: "return -1" });
      return { frames: F, d: d.join(""), result: eqRow };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Основният въпрос на раздела: <b>съществува ли принципно алгоритъм</b> за дадена задача? Теорията на <dfn data-g="изчислимост">изчислимостта</dfn> изследва именно това. Тя е логически различна от теорията на сложността, която пита <i>колко ресурси</i> са нужни (<a href="#slozhnost">раздел 3</a>).</p>
  <p>Формални модели на изчисление: <dfn data-g="машина на тюринг">машина на Тюринг</dfn>, <dfn data-g="частично рекурсивни функции">частично рекурсивни функции</dfn>, <dfn data-g="ламбда-изчисление">ламбда-изчисление</dfn>. <dfn data-g="теза на чърч–тюринг">Тезата на Чърч–Тюринг</dfn> твърди, че ефективно изчислимото съвпада с изчислимото от машина на Тюринг — това е <b>теза, не теорема</b>: „ефективно изчислимо“ е интуитивно понятие и не може да се докаже формално.</p>
</div>

<div class="block">
  <h3>Видове задачи — една задача, три формулировки</h3>
  <div class="cards">
    <div class="card"><span class="eyebrow">да / не</span><h4><dfn data-g="задача за разпознаване">Разпознаване</dfn></h4><p>„Съществува ли път от A до F?“</p></div>
    <div class="card"><span class="eyebrow">обект</span><h4><dfn data-g="задача за търсене">Търсене</dfn></h4><p>„Намерете такъв път.“</p></div>
    <div class="card"><span class="eyebrow">минимум / максимум</span><h4><dfn data-g="оптимизационна задача">Оптимизация</dfn></h4><p>„Намерете най-късия път.“</p></div>
    <div class="card"><span class="eyebrow">стойност</span><h4>Изчисляване на функция</h4><p>„Пресметнете НОД(a, b).“ (<a href="#algoritam">раздел 1</a>)</p></div>
  </div>
  <p class="muted">Избери формулировка, начален и краен връх. Щракни върху ребро в графа, за да го премахнеш (или върнеш). Връх H е изолиран.</p>
  <div class="cards" id="modes"></div>
  <div id="v-bfs"></div>
  <details class="hint"><summary>Хинт: защо тук „не намерих“ е доказателство, а по принцип не е</summary><div>
    <p>Графът е <b>краен</b>. <dfn data-g="bfs">BFS</dfn> посещава всеки връх, достижим от s, и спира, когато опашката се изпразни. Празната опашка означава: всички достижими върхове са изброени. Ако t не е сред тях, пътят не съществува — това е доказателство чрез изчерпване.</p>
    <p>При безкрайно (или неограничено) пространство на търсене изчерпване няма. Процедура, която търси и „още не е намерила“, не доказва нищо за несъществуването. Точно това се случва в следващия визуализатор.</p>
  </div></details>
  <div class="key"><p class="formula">Разпознаване ⟶ да/не · Търсене ⟶ обект · Оптимизация ⟶ най-добър обект</p><p>Отговорът „не намерих“ не е доказателство за „не съществува“ — освен когато пространството е изчерпано.</p></div>
</div>

<div class="block">
  <h3>Разрешима, полуразрешима, неразрешима</h3>
  <div class="split">
    <div class="key"><b><dfn data-g="разрешима задача">Разрешима</dfn></b><p>Съществува алгоритъм, който <b>за всеки вход завършва</b> и отговаря правилно да/не.</p></div>
    <div class="key"><b><dfn data-g="полуразрешима задача">Полуразрешима</dfn></b><p>Положителните случаи се потвърждават чрез завършващо изчисление; при отрицателен процедурата може да не спре.</p></div>
    <div class="key"><b><dfn data-g="неразрешима задача">Неразрешима</dfn></b><p>Няма алгоритъм, който завършва с правилен отговор за <b>всички</b> входове.</p></div>
  </div>
  <p class="prose"><dfn data-g="проблем за спирането">Проблемът за спирането</dfn> („спира ли програмата P върху вход x?“) е <b>неразрешим</b> (Тюринг), но е <b>полуразрешим</b>: симулираме P и потвърждаваме спирането, ако то настъпи. Симулаторът по-долу е точно тази процедура — с лимит, за да можеш да я наблюдаваш.</p>
  <div id="v-semi"></div>
  <details class="hint"><summary>Хинт: защо лимитът не помага</summary><div>
    <p>Каквото и число L да избереш, винаги има програми, които спират на стъпка L + 1. Затова „не спря за L стъпки“ не позволява извод „никога няма да спре“. Колац с n = 27 спира след 111 стъпки — с лимит 100 изглежда като „не спира“.</p>
    <p>Колац за n = 0 наистина не спира (0 → 0 → 0…), но симулаторът не може да го <i>докаже</i>: той вижда само „още не“. Доказателството идва от разсъждение извън симулацията. За n ≥ 1 дали Колац винаги спира е открит въпрос <span class="extra-tag">разширение</span>.</p>
  </div></details>
  <details class="trap"><summary>Капан: „неразрешима“ = „твърде бавна“</summary><div>
    <p>Не. Неразрешимостта е <b>липса на общ алгоритъм</b>, не голямо време. Колкото и бърз да е компютърът, общ алгоритъм за проблема за спирането няма.</p>
  </div></details>
</div>

<div class="block">
  <h3>Диагоналният аргумент на Тюринг</h3>
  <p class="prose">Да допуснем, че има решател H(P, x), който винаги завършва и казва вярно дали P спира върху x. Изреждаме програмите P0, P1, P2, … и попълваме таблицата H(Pi, Pj). Строим D: <b>D(P) зацикля, ако H казва „P спира върху P“, иначе спира</b>. Щракни клетките, за да смениш предсказанията на H — D винаги излиза извън списъка (<dfn data-g="диагонален аргумент">диагонален аргумент</dfn>).</p>
  <div id="v-diag"></div>
  <div id="diag-code" style="min-width:0"></div>
  <details class="hint"><summary>Хинт: краткото доказателство</summary><div>
    <p>Допускаме, че halts съществува. Строим D(p): ако halts(p, p) — зацикли; иначе — спри. Питаме: спира ли D(D)?</p>
    <p>Ако halts(D, D) = 1 („спира“), D(D) зацикля — halts греши. Ако halts(D, D) = 0 („цикли“), D(D) спира — halts пак греши. Противоречие ⇒ halts не съществува.</p>
    <p>Таблицата е същото доказателство, видяно през всички програми едновременно: редът на D се различава от ред i в клетка (i, i).</p>
  </div></details>
  <details class="trap"><summary>Капан: „заглушката halts в C кода доказва нещо“</summary><div>
    <p>Не. Заглушката е само за да се компилира примерът. Тя винаги казва „цикли“ и следователно греши за D. Доказателството е, че <b>всяка</b> функция на мястото на halts греши за някой вход.</p>
  </div></details>
</div>

<div class="block">
  <h3>Вложени класове, не три кутии</h3>
  <p class="muted">Щракни върху пример, за да видиш защо е на това място.</p>
  <div class="split"><div id="venn"></div><div class="key" id="venn-info"></div></div>
  <details class="trap"><summary>Капан: „разрешима, полуразрешима, неразрешима“ са три неприпокриващи се кутии</summary><div>
    <p>Не са. Всяка разрешима задача е и полуразрешима. Проблемът за спирането е едновременно полуразрешим и неразрешим.</p>
  </div></details>
</div>

<div class="block">
  <h3>Недетерминирана машина</h3>
  <p class="prose"><dfn data-g="недетерминирана машина">Недетерминираната машина</dfn> е модел с разклонения: в дадено състояние може да има няколко възможни прехода. Тя <b>приема входа, ако съществува приемащ клон</b>.</p>
  <details class="trap"><summary>Капан: недетерминизъм = случайност = много ядра</summary><div>
    <p>Недетерминираната машина не „избира случайно“ и не е „безкрайно много ядра“. Недетерминизъм, <dfn data-g="вероятностен алгоритъм">вероятностен алгоритъм</dfn> и хардуерна паралелност са <b>три различни понятия</b>. Недетерминизмът е математическа дефиниция за приемане („съществува клон“), не физическо устройство.</p>
  </div></details>
  <div class="key"><p>Изчислимост ≠ сложност. Първо: <b>съществува ли</b> алгоритъм. После (<a href="#slozhnost">раздел 3</a>): <b>колко</b> струва.</p></div>
</div>`;

  const VENN = [
    { k: "par", t: "Четност на число", x: 230, y: 187, cls: "s-done", d: "<b>Разрешима</b> (и следователно полуразрешима). Алгоритъм: x mod 2 — завършва за всеки вход." },
    { k: "reach", t: "Има ли път s→t", x: 230, y: 215, cls: "s-done", d: "<b>Разрешима</b>. BFS върху краен граф винаги завършва и доказва и „да“, и „не“ (виж първия визуализатор)." },
    { k: "halt", t: "Проблем за спирането", x: 230, y: 88, cls: "s-cmp", d: "<b>Полуразрешима, но неразрешима</b>. Симулацията потвърждава „спира“, ако това е вярно; за „не спира“ общ алгоритъм няма." },
    { k: "cohalt", t: "„P НЕ спира върху x“", x: 230, y: 44, cls: "s-swap", d: "Допълнението на проблема за спирането — <b>не е полуразрешимо</b> <span class=\"extra-tag\">разширение</span>. Ако и то, и спирането бяха полуразрешими, щяхме да пуснем двете процедури паралелно и да получим общ алгоритъм за спирането — противоречие." },
  ];

  function mount(root) {
    /* (а) три формулировки */
    let bfsApi = null;
    const MODES = [["dec", "Разпознаване", "Има ли път?"], ["search", "Търсене", "Намери път"], ["opt", "Оптимизация", "Най-кратък път"]];
    const mBox = root.querySelector("#modes");
    const mBtns = MODES.map(([k, t, q]) => h("button", { class: "card", "aria-pressed": k === "dec" ? "true" : "false", onclick: () => { bfsApi.setValues({ mode: k }); bfsApi.apply(); } },
      h("h4", { text: t }), h("p", { text: q })));
    mBox.append(...mBtns);
    bfsApi = S.viz(root.querySelector("#v-bfs"), {
      id: "bfs3", title: "BFS с опашка — разпознаване, търсене, оптимизация", sub: "Числото под върха е dist[v] (брой ребра от s); — = непосетен.",
      code: "ch02_bfs",
      inputs: [
        { id: "mode", label: "Формулировка", type: "select", value: "dec", options: MODES.map(([k, t]) => [k, t]) },
        { id: "s", label: "от", type: "select", value: "A", options: V },
        { id: "t", label: "до", type: "select", value: "F", options: V },
        { id: "cut", label: "Премахнати ребра", value: "", width: "10em" },
      ],
      presets: [{ label: "A→H (изолиран)", values: { s: "A", t: "H", cut: "" } }, { label: "Махни DF, EF", values: { s: "A", t: "F", cut: "DF EF" } }, { label: "Откъсни F", values: { s: "A", t: "F", cut: "DF EF FG" } }, { label: "Всички ребра", values: { cut: "" } }],
      legend: [["s-piv", "начало s"], ["s-act", "текущ u"], ["s-cmp", "в опашката"], ["s-done", "обработен / път"], ["s-dim", "премахнато ребро"]],
      build: algos.bfs,
      onFrame(f) { mBtns.forEach((b, i) => b.setAttribute("aria-pressed", MODES[i][0] === f.mode ? "true" : "false")); },
      draw(st, f) {
        st.innerHTML = "";
        const W = 600, H = 260;
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        const inPath = new Set();
        if (f.path) for (let k = 0; k + 1 < f.path.length; k++) inPath.add(norm(V[f.path[k]] + V[f.path[k + 1]]));
        const cut = new Set(f.cut);
        for (const e of EDGES) {
          const [x1, y1] = POS[e[0]], [x2, y2] = POS[e[1]];
          const a = V.indexOf(e[0]), b = V.indexOf(e[1]);
          let cls = "edge";
          if (cut.has(e)) cls += " s-dim";
          else if (inPath.has(e)) cls += " s-done";
          else if (f.u != null && f.v != null && ((f.u === a && f.v === b) || (f.u === b && f.v === a))) cls += " s-cmp";
          else if (f.parent[b] === a || f.parent[a] === b) cls += " s-act";
          const line = S.svg("line", { x1, y1, x2, y2, class: cls, "stroke-dasharray": cut.has(e) ? "6 5" : null });
          const hit = S.svg("line", { x1, y1, x2, y2, stroke: "transparent", "stroke-width": 16, style: "cursor:pointer", onclick: () => toggleEdge(e) },
            S.svg("title", { text: (cut.has(e) ? "Върни ребро " : "Премахни ребро ") + e }));
          svg.append(line, hit);
        }
        const inQ = new Set(f.queue), done = new Set(f.done);
        V.forEach((name, k) => {
          const [x, y] = POS[name];
          let cls = "node";
          if (f.path && f.path.includes(k) && f.final) cls += " s-done";
          else if (k === f.u) cls += " s-act";
          else if (inQ.has(k)) cls += " s-cmp";
          else if (k === f.s) cls += " s-piv";
          else if (done.has(k)) cls += " s-done";
          const g = S.svg("g", { class: cls }, S.svg("circle", { cx: x, cy: y, r: 19 }));
          svg.append(g, S.svg("text", { x, y: y + 5, "text-anchor": "middle", text: name, "font-weight": 700 }));
          const lab = (k === f.s ? "s " : k === f.t ? "t " : "") + (f.dist[k] >= 0 ? "d=" + f.dist[k] : "—");
          svg.append(S.svg("text", { x, y: y < 130 ? y - 26 : y + 36, "text-anchor": "middle", class: "wt", text: lab }));
        });
        st.append(svg);
        const q = h("div", { class: "row" }, h("span", { class: "eyebrow", text: "Опашка" }));
        st.append(q);
        const qa = h("div");
        st.append(qa);
        if (f.queue.length) S.drawArray(qa, f.queue.map((x) => V[x]), { index: false, cls: { 0: "s-cmp" }, ptr: { head: 0 } });
        else qa.append(h("p", { class: "muted", text: "празна" }));
      },
    });
    function toggleEdge(e) {
      const inp = bfsApi.root.querySelector("#bfs3-cut");
      let cur;
      try { cur = parseCut(inp.value); } catch (err) { cur = new Set(); }
      if (cur.has(e)) cur.delete(e); else cur.add(e);
      bfsApi.setValues({ cut: [...cur].sort().join(" ") });
      bfsApi.apply();
      bfsApi.go(bfsApi.frames.length - 1);
    }

    /* (б) полуразрешимост */
    S.viz(root.querySelector("#v-semi"), {
      id: "semi", title: "Полуразрешимост: симулирай и чакай", sub: "Отгоре: процедурата halts_within. В сцената: симулираната програма P и текущият ѝ ред.",
      code: "ch02_semi",
      inputs: [
        { id: "prog", label: "Програма P", type: "select", value: "collatz", options: Object.keys(PROGS).map((k) => [k, PROGS[k].name]) },
        { id: "x", label: "вход x", type: "number", value: 27, width: "7em" },
        { id: "limit", label: "лимит стъпки", type: "number", value: 100, width: "6em" },
      ],
      presets: [{ label: "Колац 27, лимит 120", values: { prog: "collatz", x: 27, limit: 120 } }, { label: "Колац 0", values: { prog: "collatz", x: 0, limit: 30 } }, { label: "is_even(7)", values: { prog: "is_even", x: 7, limit: 30 } }, { label: "while(1)", values: { prog: "forever", x: 0, limit: 20 } }],
      speed: 2,
      build: algos.semi,
      draw(st, f) {
        st.innerHTML = "";
        const verdict = f.verdict === "yes" ? h("span", { class: "pill s-done", text: "ДА, спира (потвърдено)" })
          : f.verdict === "unknown" ? h("span", { class: "pill s-cmp", text: "още не — не можем да кажем НЕ" }) : h("span", { class: "pill s-act", text: "симулира се…" });
        st.append(h("div", { class: "row", style: { marginBottom: "10px" } }, verdict, h("span", { class: "muted", text: `състояние s = ${f.state}` })));
        const wrap = h("div", { class: "split" });
        const left = h("div"), right = h("div");
        S.codeView(left, f.pkey, f.pAt);
        const tr = f.trace, show = tr.slice(-24);
        S.drawBars(right, show.map((v) => Math.abs(v)), { height: 150, labelsUpTo: 24, fmt: (v, k) => show[k], cls: { [show.length - 1]: f.verdict === "yes" ? "s-done" : f.verdict === "unknown" ? "s-cmp" : "s-act" } });
        right.append(h("p", { class: "muted", style: { marginTop: "6px" }, text: `Последните ${show.length} състояния (общо ${f.total}).` }));
        wrap.append(left, right);
        st.append(wrap);
      },
    });

    /* (в) диагонал */
    let dApi = null;
    dApi = S.viz(root.querySelector("#v-diag"), {
      id: "diag", title: "Таблица H(Pi, Pj) и диагоналната програма D", sub: "1 = „спира“, 0 = „цикли“. Щракни клетка, за да промениш H.",
      code: "ch02_diag",
      inputs: [{ id: "rows", label: "Редове на H", value: "1010 0110 1101 0011", width: "18em" }],
      presets: [{ label: "Всичко „цикли“", values: { rows: "00000 00000 00000 00000 00000" } }, { label: "6×6", values: { rows: "110100 011001 101011 000110 111111 010101" } }],
      random: () => { const n = S.randInt(3, 6); return { rows: Array.from({ length: n }, () => Array.from({ length: n }, () => S.randInt(0, 1)).join("")).join(" ") }; },
      legend: [["s-piv", "диагонал"], ["s-cmp", "сравнява се"], ["s-swap", "различие"], ["s-done", "D"]],
      build: algos.diag,
      draw(st, f) {
        st.innerHTML = "";
        const n = f.H.length;
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "H" }), ...Array.from({ length: n }, (_, j) => h("th", { text: "P" + j }))));
        f.H.forEach((r, i) => {
          const tr = h("tr", null, h("th", { text: "P" + i, class: f.row === i ? "s-act" : "" }));
          r.forEach((v, j) => {
            let cls = i === j ? "s-piv" : "";
            if (f.cell && f.cell[0] === i && f.cell[1] === j) cls = f.diff ? "s-swap" : "s-cmp";
            tr.append(h("td", { class: cls, text: v ? "спира" : "цикли", title: "Щракни за смяна", style: { cursor: "pointer" }, onclick: () => toggle(i, j) }));
          });
          tb.append(tr);
        });
        tb.append(h("tr", null, h("th", { text: "D" }), ...f.d.map((v, j) => h("td", { class: v == null ? "" : f.cell && f.cell[1] === j && f.row != null ? (f.diff ? "s-swap" : "s-cmp") : "s-done", text: v == null ? "?" : v ? "спира" : "цикли" }))));
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.final) st.append(h("p", { class: "warn", style: { marginTop: "8px" }, text: "D ≠ всеки ред (поне по диагонала) ⇒ D не е в списъка ⇒ противоречие ⇒ H не съществува." }));
      },
    });
    function toggle(i, j) {
      const inp = dApi.root.querySelector("#diag-rows");
      const R = inp.value.trim().split(/[\s,;]+/).map((r) => r.split(""));
      R[i][j] = R[i][j] === "1" ? "0" : "1";
      dApi.setValues({ rows: R.map((r) => r.join("")).join(" ") });
      dApi.apply();
      dApi.go(dApi.frames.length - 1);
    }
    const dc = root.querySelector("#diag-code");
    dc.append(h("p", { class: "muted", style: { marginBottom: "6px" }, html: "Същото като C: <code>halts</code> е указател към хипотетична функция. Подсветен е въпросът, който D задава." }));
    S.codeView(dc, "ch02_diag_D", "ask");

    /* (г) Venn */
    const vb = root.querySelector("#venn"), info = root.querySelector("#venn-info");
    const W = 460, H = 262;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
    svg.append(S.svg("rect", { x: 4, y: 4, width: W - 8, height: H - 8, rx: 10, class: "edge" }));
    svg.append(S.svg("text", { x: 16, y: 22, class: "muted", text: "всички задачи за разпознаване" }));
    svg.append(S.svg("g", { class: "node s-cmp" }, S.svg("ellipse", { cx: 230, cy: 160, rx: 200, ry: 95, style: "fill:var(--cb);stroke:var(--c);stroke-width:2" })));
    svg.append(S.svg("text", { x: 230, y: 118, "text-anchor": "middle", class: "muted", text: "полуразрешими" }));
    svg.append(S.svg("g", { class: "node s-done" }, S.svg("ellipse", { cx: 230, cy: 192, rx: 130, ry: 52, style: "fill:var(--cb);stroke:var(--c);stroke-width:2" })));
    svg.append(S.svg("text", { x: 230, y: 158, "text-anchor": "middle", class: "muted", text: "разрешими" }));
    const pts = [];
    VENN.forEach((p, k) => {
      const g = S.svg("g", { style: "cursor:pointer", tabindex: 0, role: "button", onclick: () => pick(k), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(k); } } },
        S.svg("g", { class: "node " + p.cls }, S.svg("circle", { cx: p.x - 85, cy: p.y - 4, r: 6 })),
        S.svg("text", { x: p.x - 72, y: p.y, text: p.t }));
      pts.push(g); svg.append(g);
    });
    vb.append(svg);
    function pick(k) {
      pts.forEach((g, j) => g.setAttribute("font-weight", j === k ? "700" : "400"));
      info.innerHTML = `<p><b>${VENN[k].t}</b></p><p>${VENN[k].d}</p><p class="muted">Разрешими ⊂ полуразрешими. Неразрешими = всичко извън вътрешната елипса.</p>`;
    }
    pick(2);

  }

  S.chapter({ id: "izchislimost", order: 2, num: "2", group: "Изчислимост и сложност", title: "Изчислимост и разрешимост", lead: "Съществува ли принципно алгоритъм? Видове задачи, разрешимост, проблемът за спирането и диагоналният аргумент.", html, mount, algos });
})();
