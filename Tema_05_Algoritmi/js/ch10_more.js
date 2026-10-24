/* Раздел 10 — Допълнителни парадигми и техники (разширение на конспекта). */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "задача за n дами": { cat: "Допълнителни подходи", t: "Задача за N дами", en: "N-Queens", d: "Да се поставят N дами на дъска N×N така, че никои две да не се атакуват (ред, колона, диагонал).", more: "Класически пример за търсене с връщане назад." },
    "оптимистична граница": { cat: "Допълнителни подходи", t: "Оптимистична граница", en: "Optimistic bound", d: "Оценка, която никога не е по-лоша от най-доброто решение в клона: при минимизация — долна граница, при максимизация — горна.", more: "Ако долната граница е ≥ вече намерения минимум, клонът не може да го подобри и се отрязва." },
    "сума на подмножество": { cat: "Допълнителни подходи", t: "Сума на подмножество", en: "Subset Sum", d: "Има ли подмножество от дадени числа със сума точно T.", more: "Изчерпателно: 2ⁿ подмножества. Среща по средата: ≈2·2^(n/2) суми плюс сортиране." },
    "модулно степенуване": { cat: "Допълнителни подходи", t: "Модулно степенуване", en: "Modular exponentiation", d: "Изчисляване на aᵉ mod m чрез повдигане на квадрат и умножение — O(log e) умножения.", more: "Основа на тестовете на Ферма и Милър–Рабин." },
    "тест на ферма": { cat: "Допълнителни подходи", t: "Тест на Ферма за простота", en: "Fermat primality test", d: "Ако aⁿ⁻¹ mod n ≠ 1, n е сигурно съставно; ако = 1 за избраните a, n е „вероятно просто“.", more: "Monte Carlo с едностранна грешка. Числата на Кармайкъл го заблуждават за всички взаимно прости основи." },
    "число на кармайкъл": { cat: "Допълнителни подходи", t: "Число на Кармайкъл", en: "Carmichael number", d: "Съставно n, за което aⁿ⁻¹ ≡ 1 (mod n) за всяко a, взаимно просто с n. Най-малкото е 561 = 3·11·17." },
    "милър–рабин": { cat: "Допълнителни подходи", t: "Тест на Милър–Рабин", en: "Miller–Rabin test", d: "Вероятностен тест за простота: n−1 = d·2ˢ; проверява се редицата a^d, a^(2d), … за −1. Хваща и числата на Кармайкъл.", more: "За съставно n поне 3/4 от основите са свидетели ⇒ при k случайни основи грешка ≤ 4⁻ᵏ." },
    "свидетел": { cat: "Допълнителни подходи", t: "Свидетел за съставност", en: "Witness", d: "Основа a, която доказва, че n е съставно. Отговорът „съставно“ при намерен свидетел е сигурен." },
    "най-близък съсед": { cat: "Допълнителни подходи", t: "Евристика „най-близък съсед“", en: "Nearest neighbour", d: "Алчно правило за TSP: от текущия град отиди в най-близкия непосетен.", more: "Бързо, но без гаранция за близост до оптимума в общия случай." },
    "върхово покритие": { cat: "Допълнителни подходи", t: "Върхово покритие", en: "Vertex cover", d: "Множество върхове, което съдържа поне един край на всяко ребро. Търси се минимално.", more: "Оптимизационната задача е NP-трудна; има просто 2-приближение." },
  });

  /* ======================= чисти функции ======================= */
  const fact = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; };
  const fmt = (x) => Number(x).toLocaleString("bg-BG");

  // xorshift32 — същият генератор като в C
  function rng(seed) {
    let rs = (Math.imul(seed >>> 0, 2654435761 | 0) + 1) >>> 0;
    if (!rs) rs = 1;
    return () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs; };
  }

  function parseMatrix(str) {
    const rows = String(str).split(/[;\n]+/).map((r) => r.trim()).filter(Boolean);
    const m = rows.map((r) => S.parseNums(r, { min: 0, max: 999, maxLen: 6 }));
    const n = m.length;
    if (n < 3 || n > 6) throw new Error("Нужни са от 3 до 6 града (редове, разделени с „;“).");
    m.forEach((r, i) => {
      if (r.length !== n) throw new Error(`Ред ${i} има ${r.length} числа, а трябва ${n} (квадратна матрица).`);
      if (r[i] !== 0) throw new Error(`d[${i}][${i}] трябва да е 0.`);
    });
    return m;
  }

  function parseEdges(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне едно ребро, напр. „0-1 1-2“.");
    if (parts.length > 20) throw new Error("Най-много 20 ребра.");
    const E = parts.map((p) => {
      const m = /^(\d+)-(\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е ребро във вида u-v.`);
      const u = +m[1], v = +m[2];
      if (u > 9 || v > 9) throw new Error("Върховете са от 0 до 9.");
      if (u === v) throw new Error(`Примката ${p} не е позволена.`);
      return [u, v];
    });
    return E;
  }

  const algos = {
    /* ---------- a) N дами ---------- */
    queens({ n, mode }) {
      n = S.int(n, 4, 8, "n");
      const first = mode === "first";
      const col = Array(n).fill(-1);
      let placed = 0, pruned = 0, solutions = 0, stop = false, truncated = false;
      const F = [], CAP = 2500, sols = [];
      const tree = [{ id: "", parent: null, row: -1, c: -1, pr: 0, born: 0, sol: false }];
      const byId = { "": tree[0] };
      const st = () => ({ поставяния: placed, отрязани: pruned, решения: solutions });
      const push = (f) => { if (F.length < CAP) F.push(Object.assign({ col: col.slice(), stats: st() }, f)); else truncated = true; };
      const attacker = (row, c) => { for (let r = 0; r < row; r++) if (col[r] === c || Math.abs(col[r] - c) === row - r) return r; return -1; };
      const pid = (row) => col.slice(0, row).join("");
      push({ at: "enter", row: 0, vars: { N: n, row: 0 }, msg: `Празна дъска ${n}×${n}. <code>place(0)</code> опитва колоните на ред 0 една по една.`, log: `place(0)` });
      function place(row) {
        if (row === n) {
          solutions++;
          sols.push(col.slice());
          byId[pid(n)].sol = true;
          push({ at: "sol", row, sol: true, vars: { row, col: col.slice() }, msg: `Ред ${n} е достигнат — всички ${n} дами са поставени без конфликт: <b>решение №${solutions}</b>.${first ? " Режим „първо решение“ — спираме." : " Продължаваме за следващо решение."}`, log: `<b>решение ${solutions}</b>: [${col.join(",")}]`, stats: st() });
          if (first) stop = true;
          return;
        }
        for (let c = 0; c < n && !stop; c++) {
          push({ at: "try", row, c, vars: { row, c }, msg: `Ред ${row}: опитваме колона ${c}.` });
          const r = attacker(row, c);
          if (r >= 0) {
            pruned++;
            byId[pid(row)].pr++;
            const how = col[r] === c ? "същата колона" : "общ диагонал";
            push({ at: "conflict", row, c, att: r, vars: { row, c, атакуващ: `ред ${r}` }, msg: `Клетка (${row}, ${c}) е атакувана от дамата в ред ${r} (${how}). Частичното решение не може да се допълни — клонът се <b>отрязва</b>, без да се строи нищо под него.`, log: `(${row},${c}) ✗ ред ${r}` });
            continue;
          }
          col[row] = c; placed++;
          const nid = pid(row + 1);
          const node = { id: nid, parent: pid(row), row, c, pr: 0, born: F.length, sol: false };
          tree.push(node); byId[nid] = node;
          push({ at: ["place", "recurse"], row: row + 1, c, placedNow: [row, c], vars: { row, c, col: col.slice(0, row + 1) }, msg: `Безопасно: поставяме дама в (${row}, ${c}) и слизаме към ред ${row + 1}.`, log: `дама (${row},${c})` });
          place(row + 1);
          col[row] = -1;
          if (!stop) push({ at: "back", row, c, vars: { row, c }, msg: `Връщане назад: махаме дамата от (${row}, ${c}) и опитваме следващата колона на ред ${row}.`, log: `← махаме (${row},${c})` });
        }
      }
      place(0);
      const last = { at: null, row: n, done: true, sol: solutions > 0, col: sols.length ? sols[sols.length - 1] : col.slice(), stats: st(),
        msg: `Край. Поставяния: <b>${placed}</b>, отрязани клонове: <b>${pruned}</b>, решения: <b>${solutions}</b>.${truncated ? ` Показани са първите ${CAP} стъпки; броячите са за цялото търсене.` : ""}`, log: "край" };
      F.push(last);
      return { frames: F, result: solutions, placed, pruned, solutions, sols, tree, n, truncated };
    },

    /* ---------- b) Разклоняване и ограничаване ---------- */
    tsp_bb({ mat }) {
      const d = parseMatrix(mat), n = d.length;
      const minOut = d.map((r, i) => Math.min(...r.filter((_, j) => j !== i)));
      const used = Array(n).fill(false), path = Array(n).fill(0);
      let best = Infinity, bestPath = null, bestNode = -1, nodes = 0, cut = 0, tours = 0;
      const F = [], T = [];
      used[0] = true; path[0] = 0;
      const st = () => ({ "разгледани възли": nodes, отрязани: cut, "пълни обиколки": tours, best: best === Infinity ? "∞" : best });
      const push = (f) => F.push(Object.assign({ seen: T.length, best, bestNode, stats: st() }, f));
      function bound(depth, cost) {
        let b = cost + minOut[path[depth - 1]];
        for (let v = 0; v < n; v++) if (!used[v]) b += minOut[v];
        return b;
      }
      function bb(depth, cost, parent) {
        nodes++;
        const p = path.slice(0, depth);
        const node = { k: T.length, parent, city: path[depth - 1], depth, cost, bound: null, total: null, pruned: false, kids: [] };
        T.push(node); if (parent >= 0) T[parent].kids.push(node.k);
        push({ at: "enter", cur: node.k, path: p, vars: { depth, cost, path: p.join("→") }, msg: `Възел ${p.join("→")}: изминато ${cost}.`, log: `${p.join("→")} (cost ${cost})` });
        if (depth === n) {
          const total = cost + d[path[n - 1]][0];
          tours++; node.total = total;
          const better = total < best;
          push({ at: "leaf", cur: node.k, path: p, vars: { depth, cost, total }, msg: `Пълна обиколка ${p.join("→")}→0 = ${cost} + ${d[path[n - 1]][0]} = <b>${total}</b>. ${better ? `По-добра от досегашната (${best === Infinity ? "∞" : best}).` : `Не е по-добра от ${best}.`}`, log: `обиколка = ${total}` });
          if (better) {
            best = total; bestPath = p.concat(0); bestNode = node.k;
            push({ at: "best", cur: node.k, path: p, vars: { best }, msg: `Нов най-добър резултат: <b>${best}</b>. Оттук нататък всеки клон с граница ≥ ${best} ще бъде отрязан.`, log: `<b>best = ${best}</b>` });
          }
          return;
        }
        const b = bound(depth, cost);
        node.bound = b;
        const unv = []; for (let v = 0; v < n; v++) if (!used[v]) unv.push(v);
        const terms = [`${cost}`, `min(${path[depth - 1]})=${minOut[path[depth - 1]]}`].concat(unv.map((v) => `min(${v})=${minOut[v]}`));
        push({ at: "bound", cur: node.k, path: p, vars: { depth, cost, граница: b, best: best === Infinity ? "∞" : best }, msg: `Долна граница = ${terms.join(" + ")} = <b>${b}</b>. Всяко довършване излиза по веднъж от ${path[depth - 1]} и от всеки непосетен град, а всяко излизане струва поне минималното му изходящо ребро.` });
        if (b >= best) {
          cut++; node.pruned = true;
          push({ at: "prune", cur: node.k, path: p, vars: { граница: b, best }, msg: `Граница ${b} ≥ best ${best}: никоя обиколка в този клон не може да е по-къса от ${best}. Клонът се <b>отрязва</b> по оценка на целевата функция, не по недопустимост.`, log: `✗ граница ${b} ≥ ${best}` });
          return;
        }
        for (let v = 1; v < n; v++) if (!used[v]) {
          used[v] = true; path[depth] = v;
          push({ at: "branch", cur: node.k, path: p, vars: { depth, v, ребро: `${path[depth - 1]}→${v} = ${d[path[depth - 1]][v]}` }, msg: `Разклоняване: следващ град ${v} (ребро ${path[depth - 1]}→${v} = ${d[path[depth - 1]][v]}).` });
          bb(depth + 1, cost + d[path[depth - 1]][v], node.k);
          used[v] = false;
        }
      }
      bb(1, 0, -1);
      F.push({ at: null, cur: bestNode, path: bestPath ? bestPath.slice(0, n) : [0], done: true, seen: T.length, best, bestNode, stats: st(),
        msg: `Оптимум: <b>${best}</b>, обиколка ${bestPath.join("→")}. Разгледани ${nodes} възела, отрязани ${cut}; изчерпателното търсене проверява (n−1)! = ${fact(n - 1)} пълни обиколки.`, log: "край" });
      return { frames: F, result: best, best, bestPath, nodes, cut, tours, tree: T, d, n, minOut };
    },

    /* ---------- f) най-близък съсед ---------- */
    nn_tour({ mat }) {
      const d = parseMatrix(mat), n = d.length;
      const seen = Array(n).fill(false), tour = [0], F = [];
      let cur = 0, cost = 0;
      seen[0] = true;
      F.push({ at: "step", tour: tour.slice(), cur, vars: { cur, cost }, msg: "Започваме от град 0.", log: "старт 0" });
      for (let k = 1; k < n; k++) {
        let nx = -1;
        for (let j = 0; j < n; j++) if (!seen[j]) {
          const take = nx < 0 || d[cur][j] < d[cur][nx];
          F.push({ at: "scan", tour: tour.slice(), cur, scan: j, nx: take ? j : nx, vars: { cur, j, "d[cur][j]": d[cur][j], nx: take ? j : nx }, msg: `От ${cur}: град ${j} е на ${d[cur][j]}.${take ? " Засега най-близкият." : ""}` });
          if (take) nx = j;
        }
        seen[nx] = true; tour.push(nx); cost += d[cur][nx];
        F.push({ at: "take", tour: tour.slice(), cur: nx, vars: { cur: nx, cost }, msg: `Алчно отиваме в ${nx} (+${d[cur][nx]}). Изборът не се преразглежда.`, log: `→ ${nx} (+${d[cur][nx]})` });
        cur = nx;
      }
      const total = cost + d[cur][0];
      const opt = algos.tsp_bb({ mat }).best;
      F.push({ at: "back", tour: tour.concat(0), cur: 0, done: true, total, opt, vars: { cost: total, OPT: opt, "цена/OPT": (total / opt).toFixed(3) }, msg: `Връщане в 0 (+${d[cur][0]}): обиколка ${tour.concat(0).join("→")} = <b>${total}</b>. Оптимумът от разклоняване и ограничаване е ${opt}; отношение ${(total / opt).toFixed(3)}.`, log: `= ${total}` });
      return { frames: F, result: total, opt, tour, d, n };
    },

    /* ---------- c-i) Las Vegas ---------- */
    rqs_runs({ n, runs, pivot, input }) {
      n = S.int(n, 5, 300, "n");
      runs = S.int(runs, 1, 300, "Брой изпълнения");
      const sorted = input === "sorted", rand = pivot !== "last";
      const res = [];
      for (let k = 1; k <= runs; k++) res.push(algos.rqs_once(n, sorted, rand, k));
      const lo = Math.min(...res.map((r) => r.cmps)), hi = Math.max(...res.map((r) => r.cmps));
      const F = res.map((r, k) => ({ at: ["pivot", "cmp"], k, vars: { изпълнение: k + 1, seed: k + 1, сравнения: r.cmps, сортиран: r.ok }, stats: { изпълнения: k + 1, мин: Math.min(...res.slice(0, k + 1).map((x) => x.cmps)), макс: Math.max(...res.slice(0, k + 1).map((x) => x.cmps)), средно: Math.round(res.slice(0, k + 1).reduce((s, x) => s + x.cmps, 0) / (k + 1)), "всички сортирани": res.slice(0, k + 1).every((x) => x.ok) ? "да" : "НЕ" },
        msg: `Изпълнение ${k + 1}: <b>${r.cmps}</b> сравнения, резултатът е ${r.ok ? "сортиран" : "НЕсортиран"}.`, log: `#${k + 1}: ${r.cmps}` }));
      return { frames: F, results: res.map((r) => r.cmps), lo, hi, n, worst: n * (n - 1) / 2, rand, sorted };
    },
    rqs_once(n, sorted, randomized, seed) {
      const a = Array.from({ length: n }, (_, i) => i + 1);
      if (!sorted) { const r = rng(12345); for (let i = n - 1; i > 0; i--) { const j = r() % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } }
      const rnd = rng(seed);
      let cmps = 0;
      (function rqs(lo, hi) {
        if (lo >= hi) return;
        const p = randomized ? lo + (rnd() % (hi - lo + 1)) : hi;
        [a[p], a[hi]] = [a[hi], a[p]];
        const x = a[hi]; let i = lo;
        for (let j = lo; j < hi; j++) { cmps++; if (a[j] < x) { [a[i], a[j]] = [a[j], a[i]]; i++; } }
        [a[i], a[hi]] = [a[hi], a[i]];
        rqs(lo, i - 1); rqs(i + 1, hi);
      })(0, n - 1);
      let ok = true; for (let i = 1; i < n; i++) if (a[i - 1] > a[i]) ok = false;
      return { cmps, ok };
    },

    /* ---------- c-ii) Monte Carlo: Ферма / Милър–Рабин ---------- */
    powmod(a, e, m) { let r = 1 % m; a %= m; while (e > 0) { if (e % 2) r = (r * a) % m; a = (a * a) % m; e = Math.floor(e / 2); } return r; },
    isPrime(n) { if (n < 2) return false; for (let p = 2; p * p <= n; p++) if (n % p === 0) return false; return true; },
    primality({ n, bases, test }) {
      n = S.int(n, 5, 67108863, "n");
      const B = S.parseNums(bases, { min: 2, max: 67108863, minLen: 1, maxLen: 6 });
      B.forEach((a) => { if (a > n - 2) throw new Error(`Основата ${a} трябва да е ≤ n − 2 = ${n - 2}.`); });
      const mr = test === "mr";
      if (mr && n % 2 === 0) throw new Error("Милър–Рабин тук изисква нечетно n (четно n > 2 е очевидно съставно).");
      const F = [], rows = [];
      const truth = algos.isPrime(n);
      let verdict = 1;
      const pm = algos.powmod;
      if (!mr) {
        for (let i = 0; i < B.length; i++) {
          const a0 = B[i];
          F.push({ at: "pick", rows: rows.slice(), cur: i, vars: { n, a: a0 }, msg: `Основа a = ${a0}. По малката теорема на Ферма: ако n е просто, a<sup>n−1</sup> ≡ 1 (mod n).`, log: `a = ${a0}` });
          let r = 1 % n, a = a0 % n, e = n - 1, it = 0;
          while (e > 0) {
            F.push({ at: "loop", rows: rows.slice(), cur: i, vars: { e, "бит": e % 2, r, a }, msg: `e = ${e} (${e.toString(2)}₂): ${e % 2 ? "последният бит е 1 ⇒ r = r·a mod n" : "последният бит е 0"}; после a = a² mod n.`, stats: { "умножения за a": it } });
            if (e % 2) { r = (r * a) % n; it++; F.push({ at: "mul", rows: rows.slice(), cur: i, vars: { e, r, a }, msg: `r = r·a mod n = ${r}.`, stats: { "умножения за a": it } }); }
            a = (a * a) % n; it++; e = Math.floor(e / 2);
            F.push({ at: "sq", rows: rows.slice(), cur: i, vars: { e, r, a }, msg: `a = a² mod n = ${a}; e = ${e}.`, stats: { "умножения за a": it } });
          }
          const ok = r === 1;
          rows.push({ a: a0, val: r, w: !ok });
          F.push({ at: ["test", "ret"], rows: rows.slice(), cur: i, vars: { a: a0, "a^(n−1) mod n": r }, msg: `${a0}<sup>${n - 1}</sup> mod ${n} = <b>${r}</b>. ${ok ? "Равно на 1 — тази основа не доказва нищо." : "≠ 1 ⇒ a е свидетел."}`, log: `${a0}^(n−1) ≡ ${r}` });
          if (!ok) { verdict = 0; F.push({ at: "witness", rows: rows.slice(), done: true, verdict, truth, vars: { return: 0 }, msg: `<b>Сигурно съставно.</b> Отговорът „съставно“ при намерен свидетел е без грешка.`, log: "return 0 (съставно)" }); break; }
        }
      } else {
        let d = n - 1, s = 0;
        while (d % 2 === 0) { d /= 2; s++; }
        F.push({ at: "split", rows: [], vars: { n, d, s }, msg: `n − 1 = ${n - 1} = ${d}·2<sup>${s}</sup>.`, log: `n−1 = ${d}·2^${s}` });
        for (let i = 0; i < B.length; i++) {
          let x = pm(B[i], d, n);
          const seq = [x];
          F.push({ at: "pick", rows: rows.slice(), cur: i, vars: { a: B[i], x }, msg: `x = ${B[i]}<sup>${d}</sup> mod ${n} = ${x} (с powmod).`, log: `a = ${B[i]}: x = ${x}` });
          if (x === 1 || x === n - 1) {
            rows.push({ a: B[i], val: seq.join(", "), w: false });
            F.push({ at: "pass", rows: rows.slice(), cur: i, vars: { a: B[i], x }, msg: `x = ${x === 1 ? "1" : "n−1"} — основата не е свидетел, следващата.` });
            continue;
          }
          let r, hit = false;
          for (r = 1; r < s; r++) {
            x = (x * x) % n; seq.push(x);
            F.push({ at: "sq", rows: rows.slice(), cur: i, vars: { a: B[i], r, x }, msg: `x = x² mod n = ${x}${x === n - 1 ? " = n − 1 — не е свидетел." : "."}` });
            if (x === n - 1) { hit = true; break; }
          }
          rows.push({ a: B[i], val: seq.join(", "), w: !hit });
          if (!hit) { verdict = 0; F.push({ at: "witness", rows: rows.slice(), done: true, verdict, truth, vars: { return: 0 }, msg: `Редицата не стигна до n − 1 ⇒ ${B[i]} е свидетел: <b>сигурно съставно</b>.`, log: "return 0 (съставно)" }); break; }
        }
      }
      if (verdict === 1) {
        F.push({ at: "prob", rows: rows.slice(), done: true, verdict, truth, vars: { return: 1 }, msg: `Няма свидетел сред ${B.length} основи ⇒ „<b>вероятно просто</b>“. ${truth ? "Наистина е просто." : `<span class="warn">ГРЕШКА: ${n} е съставно — всички избрани основи са „лъжесвидетели“.</span>`}`, log: "return 1 (вероятно просто)" });
      }
      return { frames: F, result: verdict, truth, rows };
    },

    /* ---------- d) дубликати ---------- */
    msortCount(a) {
      let cmp = 0;
      const tmp = a.slice();
      (function rec(lo, hi) {
        if (hi - lo < 2) return;
        const mid = (lo + hi) >> 1;
        rec(lo, mid); rec(mid, hi);
        let i = lo, j = mid, k = lo;
        while (i < mid && j < hi) { cmp++; tmp[k++] = a[j] < a[i] ? a[j++] : a[i++]; }
        while (i < mid) tmp[k++] = a[i++];
        while (j < hi) tmp[k++] = a[j++];
        for (k = lo; k < hi; k++) a[k] = tmp[k];
      })(0, a.length);
      return cmp;
    },
    dups({ arr, method }) {
      const a0 = S.parseNums(arr, { minLen: 2, maxLen: 16, min: -999, max: 999 });
      const n = a0.length, F = [];
      let cmp = 0;
      if (method === "naive") {
        for (let i = 0; i < n; i++) {
          F.push({ at: "outer", a: a0, i, j: -1, vars: { i }, stats: { сравнения: cmp } });
          for (let j = i + 1; j < n; j++) {
            cmp++;
            const eq = a0[i] === a0[j];
            F.push({ at: eq ? ["cmp", "found"] : "cmp", a: a0, i, j, hit: eq, vars: { i, j, "a[i]": a0[i], "a[j]": a0[j] }, stats: { сравнения: cmp }, msg: `a[${i}] == a[${j}]? ${a0[i]} == ${a0[j]} → <b>${eq}</b>${eq ? ". Има дубликат." : ""}`, log: eq ? `a[${i}] = a[${j}] = ${a0[i]}` : null });
            if (eq) return { frames: F, result: 1, cmp };
          }
        }
        F.push({ at: "none", a: a0, i: -1, j: -1, done: true, vars: { return: 0 }, stats: { сравнения: cmp }, msg: `Няма дубликати. Сравнения: ${cmp} = n(n−1)/2 = ${n * (n - 1) / 2}.`, log: "return 0" });
        return { frames: F, result: 0, cmp };
      }
      const a = a0.slice();
      cmp = algos.msortCount(a);
      F.push({ at: "sort", a, i: -1, sorted: true, vars: { n }, stats: { сравнения: cmp }, msg: `Сортиране (Merge Sort): <b>${cmp}</b> сравнения. Цената на преобразуването се брои — тя е O(n log n). Сега равните стойности са съседни.`, log: `сортиране: ${cmp}` });
      for (let i = 0; i + 1 < n; i++) {
        cmp++;
        const eq = a[i] === a[i + 1];
        F.push({ at: eq ? ["cmp", "found"] : "cmp", a, i, j: i + 1, hit: eq, sorted: true, vars: { i, "a[i]": a[i], "a[i+1]": a[i + 1] }, stats: { сравнения: cmp }, msg: `Съседи a[${i}], a[${i + 1}]: ${a[i]} == ${a[i + 1]} → <b>${eq}</b>.`, log: eq ? `съседи ${a[i]} = ${a[i + 1]}` : null });
        if (eq) return { frames: F, result: 1, cmp };
      }
      F.push({ at: "none", a, i: -1, j: -1, sorted: true, done: true, vars: { return: 0 }, stats: { сравнения: cmp }, msg: `Няма дубликати. Общо ${cmp} сравнения: сортиране + n−1 = ${n - 1} за обхождането.`, log: "return 0" });
      return { frames: F, result: 0, cmp };
    },

    /* ---------- e) среща по средата ---------- */
    mitm({ xs, T }) {
      const x = S.parseNums(xs, { minLen: 2, maxLen: 12, min: 0, max: 9999 });
      T = S.int(T, 0, 1e6, "T");
      const n = x.length, hh = n >> 1, m = n - hh, na = 1 << hh, nb = 1 << m;
      const A = [], B = [], F = [];
      let probes = 0, ok = 0, ma = 0, mb = 0;
      const st = () => ({ "суми A": A.length, "суми B": B.length, "проби": probes, "изчерпателно 2ⁿ": 1 << n });
      for (let s = 0; s < na; s++) {
        let sum = 0; for (let i = 0; i < hh; i++) if ((s >> i) & 1) sum += x[i];
        A.push({ sum, mask: s });
        F.push({ at: "enumA", A: A.slice(), B: [], curA: s, ph: "A", vars: { mask: s, sum }, stats: st(), msg: `Лява половина, подмножество ${s.toString(2).padStart(hh, "0")}₂ → сума ${sum}.` });
      }
      for (let s = 0; s < nb; s++) {
        let sum = 0; for (let i = 0; i < m; i++) if ((s >> i) & 1) sum += x[hh + i];
        B.push({ sum, mask: s });
        F.push({ at: "enumB", A, B: B.slice(), curB: s, ph: "B", vars: { mask: s, sum }, stats: st(), msg: `Дясна половина, подмножество ${s.toString(2).padStart(m, "0")}₂ → сума ${sum}.` });
      }
      B.sort((p, q) => p.sum - q.sum || p.mask - q.mask);
      F.push({ at: "sort", A, B: B.slice(), ph: "S", sorted: true, stats: st(), msg: `Сортираме сумите на дясната половина (${nb} числа, O(2^(n/2)·log)). Сега за всяка лява сума търсим T − сума двоично.`, log: `сортиране на ${nb} суми` });
      for (let s = 0; s < na && !ok; s++) {
        const need = T - A[s].sum;
        F.push({ at: "need", A, B, sorted: true, curA: s, ph: "Q", vars: { "A[s]": A[s].sum, need }, stats: st(), msg: `Лява сума ${A[s].sum} ⇒ трябва дясна сума ${need}.` });
        let lo = 0, hi = nb;
        while (lo < hi) {
          const mid = (lo + hi) >> 1; probes++;
          F.push({ at: "probe", A, B, sorted: true, curA: s, mid, lo, hi, ph: "Q", vars: { need, lo, hi, mid, "B[mid]": B[mid].sum }, stats: st(), msg: `Двоично търсене: B[${mid}] = ${B[mid].sum} ${B[mid].sum < need ? "&lt;" : "≥"} ${need}.` });
          if (B[mid].sum < need) lo = mid + 1; else hi = mid;
        }
        const hit = lo < nb && B[lo].sum === need;
        if (hit) { ok = 1; ma = A[s].mask; mb = B[lo].mask; }
        F.push({ at: hit ? ["check", "found"] : "check", A, B, sorted: true, curA: s, hitB: hit ? lo : -1, ph: "Q", vars: { need, lo }, stats: st(), msg: hit ? `B[${lo}] = ${need} — <b>намерено</b>: ${A[s].sum} + ${need} = ${T}.` : `Няма дясна сума ${need}.`, log: hit ? `<b>${A[s].sum} + ${need} = ${T}</b>` : `${A[s].sum}: няма ${need}` });
      }
      const pick = [];
      for (let i = 0; i < hh; i++) if ((ma >> i) & 1) pick.push(i);
      for (let i = 0; i < m; i++) if ((mb >> i) & 1) pick.push(hh + i);
      F.push({ at: "ret", A, B, sorted: true, ph: "E", done: true, pick: ok ? pick : [], vars: { return: ok }, stats: st(), msg: ok ? `Подмножество {${pick.map((i) => x[i]).join(", ")}} има сума ${T}. Изчислени ${na + nb} суми вместо ${1 << n} подмножества.` : `Няма подмножество със сума ${T}. Изчислени ${na + nb} суми вместо ${1 << n} подмножества.`, log: `return ${ok}` });
      return { frames: F, result: ok, ma, mb, probes, x, hh, m };
    },

    /* ---------- f) 2-приближение за върхово покритие ---------- */
    vc({ edges }) {
      const E = parseEdges(edges);
      const nv = Math.max(...E.flat()) + 1;
      const inC = Array(nv).fill(false), F = [], M = [];
      let size = 0;
      for (let e = 0; e < E.length; e++) {
        const [u, v] = E[e];
        const unc = !inC[u] && !inC[v];
        F.push({ at: ["edge", "uncov"], e, inC: inC.slice(), M: M.slice(), vars: { e, u, v, непокрито: unc }, stats: { "|C|": size }, msg: `Ребро ${u}–${v}: ${unc ? "<b>непокрито</b> — нито u, нито v е в C." : "вече покрито."}` });
        if (unc) {
          inC[u] = inC[v] = true; size += 2; M.push(e);
          F.push({ at: "take", e, inC: inC.slice(), M: M.slice(), vars: { e, u, v }, stats: { "|C|": size }, msg: `Вземаме и двата края: C ∪= {${u}, ${v}}.`, log: `+{${u}, ${v}}` });
        }
      }
      // оптимум с изчерпване (≤ 10 върха)
      let opt = nv;
      for (let s = 0; s < 1 << nv; s++) {
        if (!E.every(([u, v]) => (s >> u) & 1 || (s >> v) & 1)) continue;
        let c = 0; for (let i = 0; i < nv; i++) c += (s >> i) & 1;
        opt = Math.min(opt, c);
      }
      F.push({ at: "ret", e: -1, inC: inC.slice(), M: M.slice(), done: true, vars: { "|C|": size, OPT: opt, "|C|/OPT": (size / opt).toFixed(2) }, stats: { "|C|": size }, msg: `Покритие с ${size} върха; оптимумът (изчерпателно) е ${opt}. ${size} ≤ 2·${opt} — гаранцията е спазена.`, log: `|C| = ${size}, OPT = ${opt}` });
      return { frames: F, result: size, opt, E, nv };
    },

    /* ---------- f) поточна статистика ---------- */
    stream({ xs }) {
      const x = S.parseNums(xs, { minLen: 1, maxLen: 30, min: -1e6, max: 1e6 });
      const F = [];
      let count = 0, sum = 0, max = -Infinity;
      const mem = () => ({ count, sum, max: max === -Infinity ? "INT_MIN" : max });
      for (let k = 0; k < x.length; k++) {
        F.push({ at: "push", k, x, vars: Object.assign({ x: x[k] }, mem()), msg: `Пристига x = ${x[k]}. Предишните стойности вече не са в паметта.` });
        count++;
        F.push({ at: "count", k, x, vars: Object.assign({ x: x[k] }, mem()), msg: `count = ${count}.` });
        sum += x[k];
        F.push({ at: "sum", k, x, vars: Object.assign({ x: x[k] }, mem()), msg: `sum = ${sum}.` });
        const nm = x[k] > max;
        if (nm) max = x[k];
        F.push({ at: "max", k, x, vars: Object.assign({ x: x[k] }, mem()), mean: sum / count, msg: `${nm ? `Нов максимум ${max}.` : `max остава ${max}.`} Средна стойност досега: ${(sum / count).toFixed(4)}.`, log: `x=${x[k]} → mean ${(sum / count).toFixed(2)}, max ${max}` });
      }
      F.push({ at: "mean", k: x.length, x, done: true, vars: Object.assign({ mean: (sum / count).toFixed(4) }, mem()), mean: sum / count, msg: `Потокът свърши: ${count} стойности, средно ${(sum / count).toFixed(4)}, максимум ${max} — с 3 променливи, независимо от дължината.` });
      return { frames: F, count, max, mean: sum / count };
    },
  };

  /* ======================= съдържание ======================= */
  const html = `
<div class="prose">
  <p>Този раздел е <b>изцяло допълнение към конспекта</b> <span class="extra-tag">извън конспекта</span>. Конспектът назовава рекурсия, разделяй и владей, алчен подход и динамично програмиране; тук са останалите често срещани методи от разработката.</p>
  <p>Методите <b>не са една взаимно изключваща класификация</b>: едни описват как се търси (връщане назад, разклоняване и ограничаване), други — каква гаранция има резултатът (приближен, евристичен) или откъде идва случайността (вероятностен).</p>
</div>

<div class="block">
  <h3>Изчерпателно търсене — отправната точка</h3>
  <p class="prose"><dfn data-g="изчерпателно търсене">Изчерпателното търсене</dfn> проверява всички кандидати. То е отправна точка за сравнение, но често е експоненциално или факториално: 2ⁿ подмножества, n! пермутации. Всички методи по-долу са начини да <b>не</b> проверим всичко.</p>
  <div class="tbl-wrap" style="min-width:0"><table class="t grid" id="t-growth"></table></div>
</div>

<div class="block" id="b-bt">
  <h3>a) Търсене с връщане назад: N дами</h3>
  <p class="prose"><dfn data-g="търсене с връщане назад">Връщането назад</dfn> строи решението последователно. Когато частичното решение нарушава условията и не може да бъде допълнено до допустимо, клонът се изоставя. Приложения: <dfn data-g="задача за n дами">N дами</dfn>, судоку, оцветяване на графи, задачи с ограничения. В най-лошия случай пак може да е експоненциално.</p>
  <div id="v-queens"></div>
  <details class="hint"><summary>Хинт: защо проверката е само колона и диагонал</summary><div>
    <p>Представянето <code>col[r]</code> вече гарантира една дама на ред — редовете не се проверяват. Две дами (r₁, c₁) и (r₂, c₂) са на общ диагонал точно когато |c₁ − c₂| = |r₁ − r₂|. Затова <code>attacker()</code> има само две условия.</p>
    <p>Самото представяне е намаляване на пространството: C(n², n) избора на n полета (за n = 8: ≈ 4,4·10⁹) → n<sup>n</sup> (по една на ред; за n = 8: ≈ 1,7·10⁷). Връщането назад отрязва още повече, защото спира при първия конфликт, без да попълва останалите редове.</p>
  </div></details>
  <details class="trap"><summary>Капан: връщането назад не е гаранция за полиномиално време</summary><div>
    <p>Отрязването помага на практика, но в най-лошия случай търсенето пак може да е експоненциално. То е стратегия за търсене, не доказателство за принадлежност към P.</p>
  </div></details>
</div>

<div class="block" id="b-bb">
  <h3>b) Разклоняване и ограничаване: минимална обиколка (TSP)</h3>
  <p class="prose"><dfn data-g="разклоняване и ограничаване">Разклоняването и ограничаването</dfn> е за точни оптимизационни задачи. Пространството се разделя на подмножества (разклоняване); за всяко се изчислява граница на най-добрия възможен резултат; подмножества, които не могат да подобрят вече намереното, се изключват. За разлика от връщането назад, отрязването може да се основава на <b>оценка на целевата функция</b>, а не само на недопустимост. Приложения: целочислено оптимиране, точни варианти на <dfn data-g="tsp">TSP</dfn>.</p>
  <div class="key"><b>Пример от материала.</b> При минимизация вече е намерен минимум 10. Клон с долна граница 12 съдържа само решения с цена ≥ 12 ⇒ не може да подобри 10 и се изключва. Границата трябва да е доказано <dfn data-g="оптимистична граница">оптимистична</dfn> за клона; при максимизация се използва горна граница.</div>
  <div id="v-bb"></div>
  <details class="hint"><summary>Хинт: защо границата тук е валидна (оптимистична)</summary><div>
    <p>Всяко довършване на частичния път трябва да излезе точно по веднъж от последния град и от всеки непосетен град (последното излизане е връщането в 0). Всяко такова излизане струва поне <code>minOut[v]</code> — най-евтиното изходящо ребро на v. Значи цената на всяка пълна обиколка в клона е ≥ изминатото + сумата от тези минимуми. Границата никога не надценява ⇒ отрязването не може да изхвърли оптимума.</p>
    <p>Ако границата беше „песимистична“ (по-голяма от истинския минимум на клона), отрязването би могло да изхвърли оптималното решение — алгоритъмът вече няма да е точен.</p>
  </div></details>
  <details class="trap"><summary>Капан: отрязване по недопустимост срещу отрязване по граница</summary><div>
    <p>Връщане назад: „този частичен избор нарушава условие“. Разклоняване и ограничаване: „този клон е допустим, но е доказано, че няма да е по-добър от намереното“. И двата метода в най-лошия случай пак могат да разгледат експоненциално много възли.</p>
  </div></details>
</div>

<div class="block" id="b-rand">
  <h3>c) Вероятностни алгоритми: Las Vegas и Monte Carlo</h3>
  <p class="prose"><dfn data-g="вероятностен алгоритъм">Вероятностният алгоритъм</dfn> използва случайни избори. <dfn data-g="las vegas">Las Vegas</dfn>: резултатът е винаги верен, а времето е случайна величина. <dfn data-g="monte carlo">Monte Carlo</dfn>: времето е ограничено, но има контролирана вероятност за грешка.</p>
  <div class="split">
    <div class="key"><b>Las Vegas</b><p>Верен винаги · време случайно.</p><p class="formula">Quick Sort със случаен опорен елемент: очаквано O(n log n)</p></div>
    <div class="key"><b>Monte Carlo</b><p>Време ограничено · грешка с контролирана вероятност.</p><p class="formula">тест за простота: „съставно“ е сигурно, „просто“ е вероятно</p></div>
  </div>
  <div id="v-rqs"></div>
  <details class="hint"><summary>Хинт: какво точно е случайно</summary><div>
    <p>Входът е фиксиран (една и съща разбъркана пермутация); случаен е само изборът на опорен елемент. Затова броят сравнения варира между изпълненията, а резултатът — не. Детерминираният избор „последният елемент“ върху <b>сортиран</b> вход дава всеки път n(n−1)/2 сравнения: най-лошият случай е предизвикан от входа. При случаен опорен елемент нито един конкретен вход не е систематично лош.</p>
  </div></details>
  <div id="v-prime"></div>
  <details class="hint"><summary>Хинт: защо грешката е само в едната посока</summary><div>
    <p>Ако n е просто, a<sup>n−1</sup> ≡ 1 (mod n) за всяко a, взаимно просто с n (малка теорема на Ферма). Значи намерен <dfn data-g="свидетел">свидетел</dfn> доказва „съставно“. Обратното не е вярно: съставно число може да мине теста за всички избрани основи. <dfn data-g="число на кармайкъл">Числата на Кармайкъл</dfn> (561, 1105, 1729, …) минават теста на Ферма за <b>всички</b> взаимно прости основи — тогава повече опити не помагат.</p>
    <p><dfn data-g="милър–рабин">Милър–Рабин</dfn> проверява и квадратните корени на 1 по пътя; за всяко съставно нечетно n поне 3/4 от основите са свидетели, така че при k независими случайни основи вероятността за грешка е ≤ 4<sup>−k</sup>. Това е „контролираната вероятност за грешка“.</p>
  </div></details>
  <details class="trap"><summary>Капан: „вероятностен“ ≠ „недетерминиран“</summary><div>
    <p>Вероятностният алгоритъм прави реални случайни избори и се анализира с вероятности. Недетерминираната машина от дефиницията на NP е математически модел, който приема, ако <i>съществува</i> приемащ клон — тя не „хвърля зар“.</p>
  </div></details>
</div>

<div class="block" id="b-dec">
  <h3>d) Намаляване на размера и предварително преобразуване</h3>
  <div class="split">
    <div class="prose" style="grid-template-columns:minmax(0,1fr)">
      <p><dfn data-g="намаляване на размера">Намаляване на размера</dfn>: решава се <b>една</b> по-малка задача и решението се разширява. Пример: Insertion Sort — a[0..i−1] вече е сортиран, вмъкваме a[i]. Различно от <dfn data-g="разделяй и владей">разделяй и владей</dfn>, където се решават няколко подзадачи. Стъпкова визуализация на Insertion Sort има в <a href="#sortirovki">лабораторията по сортиране</a>.</p>
      <div id="c-ins"></div>
    </div>
    <div class="prose">
      <p><dfn data-g="предварително преобразуване">Предварително преобразуване</dfn>: задачата се преобразува в по-удобна форма — предварително сортиране, подходяща структура от данни. <b>Цената на преобразуването влиза в анализа.</b></p>
      <p>Пример: има ли дубликати? Наивно — всички двойки, O(n²). След сортиране равните стойности са съседни — O(n log n) + O(n).</p>
    </div>
  </div>
  <div id="v-dup"></div>
  <div class="viz" style="padding:12px 16px;display:grid;gap:10px">
    <div class="row"><label class="field" for="dup-n"><span>n за сравнение</span><input id="dup-n" type="number" value="1000" min="2" max="200000" style="width:9em"></label><span class="muted" style="font-size:.85rem">Брои сравненията без дубликати (най-лошият случай за наивния вариант). Merge Sort се изпълнява реално върху случайна пермутация.</span></div>
    <div id="dup-cmp"></div>
  </div>
</div>

<div class="block" id="b-mitm">
  <h3>e) Среща по средата: сума на подмножество</h3>
  <p class="prose"><dfn data-g="среща по средата">Среща по средата</dfn>: задачата се разделя на две части; възможностите за всяка част се изчисляват поотделно и се комбинират. За <dfn data-g="сума на подмножество">сума на подмножество</dfn> ≈2ⁿ кандидата се заменят с ≈2^(n/2) за всяка половина — за сметка на памет.</p>
  <div class="viz" style="padding:12px 16px;display:grid;gap:10px">
    <div class="row"><label class="field" for="mitm-n"><span>n (брой числа)</span><input id="mitm-n" type="range" min="2" max="40" value="20" style="width:14em"></label><b id="mitm-nv" class="mono"></b></div>
    <div class="tbl-wrap" style="min-width:0"><table class="t" id="mitm-cnt"></table></div>
  </div>
  <div id="v-mitm"></div>
  <details class="hint"><summary>Хинт: защо сортираме само едната половина</summary><div>
    <p>За всяка лява сума a търсим дясна сума T − a. Ако дясната половина е сортирана, всяко търсене е двоично — O(log 2^(n/2)) = O(n/2). Общо O(2^(n/2)·n) време и O(2^(n/2)) памет срещу O(2ⁿ) време при изчерпване. Пак е експоненциално, но с наполовина по-малък показател: за n = 40 това е разликата между ≈10¹² и ≈10⁶.</p>
  </div></details>
</div>

<div class="block" id="b-approx">
  <h3>f) Приближени алгоритми, евристики, онлайн и поточни</h3>
  <div class="cards" id="cards-f"></div>
  <div id="v-nn"></div>
  <div id="v-vc"></div>
  <details class="hint"><summary>Хинт: защо „вземи двата края“ дава 2-приближение</summary><div>
    <p>Избраните ребра нямат общи върхове (всяко ново е било непокрито). Всяко покритие, включително оптималното, трябва да съдържа поне един край на всяко от тях ⇒ OPT ≥ (брой избрани ребра). Алгоритъмът взема по 2 върха на избрано ребро ⇒ |C| = 2·(брой ребра) ≤ 2·OPT. Това е доказана граница — разликата с евристиката.</p>
  </div></details>
  <details class="trap"><summary>Капан: евристика ≠ приближен алгоритъм</summary><div>
    <p><dfn data-g="приближен алгоритъм">Приближеният алгоритъм</dfn> има <b>доказуема</b> граница: при минимизация цена ≤ α·OPT, α ≥ 1. <dfn data-g="евристика">Евристиката</dfn> е практическо правило без задължителна гаранция; качеството ѝ се оценява емпирично. „Най-близък съсед“ понякога уцелва оптимума, но това не е гаранция.</p>
  </div></details>
  <div id="v-stream"></div>
  <details class="trap"><summary>Капан: „онлайн“ не означава интернет</summary><div>
    <p><dfn data-g="онлайн алгоритъм">Онлайн алгоритъмът</dfn> взема решения, преди да е известен целият бъдещ вход. <dfn data-g="поточен алгоритъм">Поточният</dfn> обработва последователност с ограничена памет и малко преминавания — например статистика за постъпващи измервания.</p>
  </div></details>
</div>`;

  /* ======================= рисуване ======================= */
  function layoutTree(nodes, kidsOf, rootKey) {
    // x по броя листа, y по дълбочина
    const pos = {}; let leaf = 0, maxD = 0;
    (function walk(k, dpt) {
      const ks = kidsOf(k);
      maxD = Math.max(maxD, dpt);
      if (!ks.length) { pos[k] = { x: leaf++, y: dpt }; return; }
      ks.forEach((c) => walk(c, dpt + 1));
      pos[k] = { x: (pos[ks[0]].x + pos[ks[ks.length - 1]].x) / 2, y: dpt };
    })(rootKey, 0);
    return { pos, leaves: Math.max(1, leaf), depth: maxD };
  }

  function drawQueens(st, f, res) {
    st.innerHTML = "";
    const n = res.n;
    const wrap = h("div", { class: "split", style: { alignItems: "start" } });
    const tb = h("table", { class: "t grid", style: { borderCollapse: "collapse" } });
    const attacked = new Set();
    if (f.at === "conflict") {
      const r = f.att, c0 = f.col[r];
      const dr = f.row - r, dc = Math.sign(f.c - c0);
      for (let k = 1; k < dr; k++) attacked.add((r + k) + "," + (c0 + dc * k));
    }
    for (let r = 0; r < n; r++) {
      const tr = h("tr");
      for (let c = 0; c < n; c++) {
        let cls = "", txt = "";
        if (f.col[r] === c) { txt = "♛"; cls = f.done || f.sol ? "s-done" : "s-act"; }
        if (f.at === "conflict" && r === f.att && f.col[r] === c) cls = "s-swap";
        if (attacked.has(r + "," + c)) cls = "s-swap";
        if ((f.at === "try" || f.at === "conflict") && r === f.row && c === f.c) { cls = f.at === "conflict" ? "s-swap" : "s-cmp"; txt = "?"; }
        if (f.at === "back" && r === f.row && c === f.c) { cls = "s-dim"; txt = "♛"; }
        const td = h("td", { class: cls, text: txt, style: { width: "36px", height: "36px", fontSize: "18px", background: cls ? null : ((r + c) % 2 ? "var(--panel-2)" : "var(--panel)") } });
        tr.append(td);
      }
      tb.append(tr);
    }
    const left = h("div", { style: { display: "grid", gap: "8px" } }, h("div", { class: "tbl-wrap" }, tb));
    const nn = Math.pow(n, n), nf = fact(n);
    left.append(h("p", { class: "muted", style: { fontSize: ".84rem" }, html: `Изчерпателно: n<sup>n</sup> = ${fmt(nn)} разположения (по една на ред) или n! = ${fmt(nf)} (и по една на колона). Връщането назад разглежда ${fmt(res.placed + res.pruned)} опита общо.` }));
    wrap.append(left);
    if (n <= 5) {
      const T = res.tree, kids = {};
      T.forEach((t) => { if (t.parent !== null) (kids[t.parent] = kids[t.parent] || []).push(t.id); });
      const L = layoutTree(T, (k) => kids[k] || [], "");
      const DX = 30, DY = 50, W = L.leaves * DX + 30, H = (n + 1) * DY + 10;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 560), role: "img", "aria-label": "Дърво на търсенето" });
      const X = (k) => 20 + L.pos[k].x * DX, Y = (k) => 18 + L.pos[k].y * DY;
      const path = new Set(); for (let r = 0; r <= Math.min(f.row, n); r++) if (f.col.slice(0, r).every((v) => v >= 0)) path.add(f.col.slice(0, r).join(""));
      const vis = T.filter((t) => t.born <= (f._i ?? 1e9));
      vis.forEach((t) => { if (t.parent !== null) svg.append(S.svg("line", { x1: X(t.parent), y1: Y(t.parent), x2: X(t.id), y2: Y(t.id), class: "edge" + (path.has(t.id) ? " s-act" : "") })); });
      vis.forEach((t) => {
        const cls = t.sol ? "s-done" : path.has(t.id) ? "s-act" : "";
        svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: X(t.id), cy: Y(t.id), r: 10 })));
        svg.append(S.svg("text", { x: X(t.id), y: Y(t.id) + 4, "text-anchor": "middle", style: "font-size:11px", text: t.id === "" ? "·" : t.c }));
        if (t.pr) svg.append(S.svg("text", { x: X(t.id), y: Y(t.id) + 24, "text-anchor": "middle", style: "font-size:10px;fill:var(--st-swap)", text: "✗" + t.pr }));
      });
      const box = h("div", { style: { display: "grid", gap: "4px", minWidth: "0" } }, h("span", { class: "eyebrow", text: "Дърво на търсенето (число = колона; ✗k = отрязани деца)" }), h("div", { style: { overflowX: "auto" } }, svg));
      wrap.append(box);
    }
    st.append(wrap);
  }

  function drawBB(st, f, res) {
    st.innerHTML = "";
    const T = res.tree, n = res.n;
    const L = layoutTree(T, (k) => T[k].kids, 0);
    const DX = 44, DY = 66, W = Math.max(L.leaves * DX + 40, 200), H = n * DY + 20;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Дърво на разклоняване и ограничаване" });
    const X = (k) => 24 + L.pos[k].x * DX, Y = (k) => 20 + L.pos[k].y * DY;
    const onPath = new Set(); for (let k = f.cur; k >= 0 && k < T.length; k = T[k].parent) onPath.add(k);
    const vis = T.filter((t) => t.k < f.seen);
    vis.forEach((t) => { if (t.parent >= 0) svg.append(S.svg("line", { x1: X(t.parent), y1: Y(t.parent), x2: X(t.k), y2: Y(t.k), class: "edge" + (onPath.has(t.k) ? " s-act" : "") })); });
    vis.forEach((t) => {
      const knownBound = t.bound !== null && F_has(f, t);
      let cls = "";
      if (t.k === f.bestNode) cls = "s-done";
      else if (t.pruned && t.k < f.seen && (t.k !== f.cur || f.at === "prune" || f.done)) cls = "s-swap";
      else if (t.k === f.cur) cls = "s-act";
      else if (t.total !== null) cls = "s-dim";
      svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: X(t.k), cy: Y(t.k), r: 13 })));
      svg.append(S.svg("text", { x: X(t.k), y: Y(t.k) + 4, "text-anchor": "middle", text: t.city }));
      let lab = "";
      if (t.total !== null) lab = "Σ" + t.total;
      else if (knownBound) lab = (t.pruned ? "✗" : "g") + t.bound;
      if (lab) svg.append(S.svg("text", { x: X(t.k), y: Y(t.k) + 28, "text-anchor": "middle", class: "wt", text: lab }));
    });
    function F_has(fr, t) { return t.k < fr.cur || (t.k === fr.cur && fr.at !== "enter") || fr.done; }
    // матрица
    const d = res.d, pe = new Set();
    for (let i = 0; i + 1 < (f.path || []).length; i++) pe.add(f.path[i] + "," + f.path[i + 1]);
    const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "d" }), ...d.map((_, j) => h("th", { text: j })), h("th", { text: "min" })));
    d.forEach((r, i) => tb.append(h("tr", null, h("th", { text: i }), ...r.map((v, j) => h("td", { class: pe.has(i + "," + j) ? "s-act" : i === j ? "s-dim" : "", text: i === j ? "–" : v })), h("td", { class: "s-piv", text: res.minOut[i] }))));
    st.append(h("div", { class: "split", style: { alignItems: "start", gridTemplateColumns: "minmax(0,auto) minmax(0,1fr)" } },
      h("div", { style: { display: "grid", gap: "6px" } }, h("div", { class: "tbl-wrap" }, tb), h("p", { class: "muted", style: { fontSize: ".8rem" }, html: `(n−1)! = ${fact(n - 1)} обиколки при изчерпване<br>g = долна граница, ✗ = отрязан, Σ = пълна обиколка` })),
      h("div", { style: { overflowX: "auto", minWidth: "0" } }, svg)));
  }

  function histogram(el, values, upto, lo, hi, marks) {
    el.innerHTML = "";
    const bins = Math.max(1, Math.min(16, hi - lo + 1));
    const w = (hi - lo + 1) / bins;
    const cnt = Array(bins).fill(0);
    values.slice(0, upto).forEach((v) => cnt[Math.min(bins - 1, Math.floor((v - lo) / w))]++);
    const mx = Math.max(1, ...cnt);
    const W = 600, H = 200, pad = 30, bw = (W - 2 * pad) / bins;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H + 40}`, width: W, role: "img", "aria-label": "Хистограма на броя сравнения" });
    cnt.forEach((c, b) => {
      const hh = (c / mx) * H;
      svg.append(S.svg("rect", { x: pad + b * bw + 1, y: 10 + H - hh, width: bw - 2, height: hh, style: "fill:var(--st-act-bg);stroke:var(--st-act);stroke-width:1.5" }));
      if (c) svg.append(S.svg("text", { x: pad + b * bw + bw / 2, y: 6 + H - hh, "text-anchor": "middle", class: "wt", text: c }));
    });
    svg.append(S.svg("line", { x1: pad, y1: 10 + H, x2: W - pad, y2: 10 + H, class: "edge" }));
    svg.append(S.svg("text", { x: pad, y: H + 28, class: "wt", text: lo }));
    svg.append(S.svg("text", { x: W - pad, y: H + 28, "text-anchor": "end", class: "wt", text: hi }));
    svg.append(S.svg("text", { x: W / 2, y: H + 28, "text-anchor": "middle", class: "wt", text: "брой сравнения" }));
    el.append(svg);
    if (marks) el.append(h("p", { class: "muted", style: { fontSize: ".84rem" }, html: marks }));
  }

  function drawGraph(st, f, res) {
    st.innerHTML = "";
    const nv = res.nv, R = 90, cx = 130, cy = 115;
    const P = Array.from({ length: nv }, (_, i) => [cx + R * Math.cos((2 * Math.PI * i) / nv - Math.PI / 2), cy + R * Math.sin((2 * Math.PI * i) / nv - Math.PI / 2)]);
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 260 230", width: 300, role: "img", "aria-label": "Граф" });
    res.E.forEach(([u, v], e) => {
      let cls = "";
      if (f.M.includes(e)) cls = "s-piv";
      else if (f.inC[u] || f.inC[v]) cls = "s-done";
      if (e === f.e) cls = "s-cmp";
      svg.append(S.svg("line", { x1: P[u][0], y1: P[u][1], x2: P[v][0], y2: P[v][1], class: "edge " + cls }));
    });
    P.forEach((p, i) => {
      svg.append(S.svg("g", { class: "node " + (f.inC[i] ? "s-done" : "") }, S.svg("circle", { cx: p[0], cy: p[1], r: 14 })));
      svg.append(S.svg("text", { x: p[0], y: p[1] + 4, "text-anchor": "middle", text: i }));
    });
    st.append(svg);
  }

  /* ======================= mount ======================= */
  // разбърква опциите детерминирано (верният отговор не е винаги на едно място)
  function mount(root) {
    // таблица на растежа
    const tg = root.querySelector("#t-growth");
    tg.append(h("tr", null, h("th", { text: "n" }), h("th", { text: "2ⁿ (подмножества)" }), h("th", { text: "n! (пермутации)" }), h("th", { text: "2^(n/2) (половина)" })));
    [5, 10, 15, 20, 30].forEach((n) => tg.append(h("tr", null, h("td", { text: n }), h("td", { text: fmt(2 ** n) }), h("td", { text: n <= 20 ? fmt(fact(n)) : "≈" + fact(n).toExponential(2) }), h("td", { text: fmt(Math.round(2 ** (n / 2))) }))));

    // a) N дами
    S.viz(root.querySelector("#v-queens"), {
      id: "queens", title: "N дами — търсене с връщане назад", sub: "Червено: атакувана клетка и атакуващата дама. Дървото (n ≤ 5) показва поставянията и броя отрязани деца.",
      code: "ch10_queens",
      inputs: [{ id: "n", label: "n (4…8)", type: "number", value: 4, width: "5em" }, { id: "mode", label: "режим", type: "select", value: "all", options: [["all", "всички решения"], ["first", "първо решение"]] }],
      presets: [{ label: "n = 5", values: { n: 5 } }, { label: "n = 8, първо", values: { n: 8, mode: "first" } }, { label: "n = 8, всички", values: { n: 8, mode: "all" } }],
      legend: [["s-act", "поставена дама"], ["s-cmp", "опит"], ["s-swap", "конфликт"], ["s-done", "решение"]],
      startAtEnd: true,
      build: (inp) => { const r = algos.queens(inp); r.frames.forEach((f, i) => (f._i = i)); return r; },
      draw: (st, f, ctx) => drawQueens(st, f, ctx.res),
    });

    // b) B&B
    const M5 = "0 3 4 2 7; 3 0 4 6 3; 4 4 0 5 8; 2 6 5 0 6; 7 3 8 6 0";
    S.viz(root.querySelector("#v-bb"), {
      id: "bb", title: "Разклоняване и ограничаване — TSP от град 0", sub: "Редактирай матрицата: редове с „;“, d[i][i] = 0, до 6 града.",
      code: "ch10_bb",
      inputs: [{ id: "mat", label: "матрица d[i][j]", value: M5, width: "min(30em, 80vw)" }],
      presets: [{ label: "4 града", values: { mat: "0 10 15 20; 10 0 35 25; 15 35 0 30; 20 25 30 0" } }, { label: "Цикъл 0→1→…→4", values: { mat: "0 1 9 9 9; 9 0 1 9 9; 9 9 0 1 9; 9 9 9 0 1; 1 9 9 9 0" }, title: "Добра първа обиколка ⇒ много отрязване" }, { label: "6 града", values: { mat: "0 12 10 19 8 14; 12 0 3 7 2 11; 10 3 0 6 20 4; 19 7 6 0 4 9; 8 2 20 4 0 5; 14 11 4 9 5 0" } }],
      random: () => { const n = S.randInt(4, 6), m = Array.from({ length: n }, () => Array(n).fill(0)); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m[i][j] = m[j][i] = S.randInt(1, 20); return { mat: m.map((r) => r.join(" ")).join("; ") }; },
      legend: [["s-act", "текущ път"], ["s-swap", "отрязан по граница"], ["s-done", "най-добра обиколка"], ["s-piv", "minOut"]],
      startAtEnd: true,
      build: algos.tsp_bb,
      draw: (st, f, ctx) => drawBB(st, f, ctx.res),
    });

    // c-i) Las Vegas
    S.viz(root.querySelector("#v-rqs"), {
      id: "rqs", title: "Las Vegas — рандомизиран Quick Sort, многократно върху един и същ вход", sub: "Всяка стъпка = едно пълно сортиране с ново семе. Хистограмата е разпределението на броя сравнения.",
      code: "ch10_rqs",
      inputs: [{ id: "n", label: "n", type: "number", value: 50, width: "5em" }, { id: "runs", label: "изпълнения", type: "number", value: 100, width: "5em" },
        { id: "pivot", label: "опорен елемент", type: "select", value: "rand", options: [["rand", "случаен"], ["last", "последният (детерм.)"]] },
        { id: "input", label: "вход", type: "select", value: "shuf", options: [["shuf", "разбъркан"], ["sorted", "сортиран"]] }],
      presets: [{ label: "100 изпълнения", values: { runs: 100, pivot: "rand" } }, { label: "Детерм. + сортиран", values: { pivot: "last", input: "sorted" } }, { label: "Случаен + сортиран", values: { pivot: "rand", input: "sorted" } }],
      speed: 3, startAtEnd: true,
      build: algos.rqs_runs,
      draw(st, f, ctx) {
        const r = ctx.res;
        const avg = Math.round(r.results.slice(0, f.k + 1).reduce((s, x) => s + x, 0) / (f.k + 1));
        histogram(st, r.results, f.k + 1, r.lo, r.hi, `Средно ${avg} сравнения; най-лошият случай n(n−1)/2 = ${r.worst}. ${r.lo === r.hi ? "<b>Всички изпълнения са еднакви</b> — няма случайност." : "Разпределението е на случайната величина „време“; резултатът е сортиран всеки път."}`);
      },
    });

    // c-ii) Monte Carlo
    S.viz(root.querySelector("#v-prime"), {
      id: "prime", title: "Monte Carlo — тест за простота", sub: "„Съставно“ е сигурно (има свидетел); „вероятно просто“ може да е грешка.",
      code: (inp) => (inp.test === "mr" ? "ch10_mr" : "ch10_fermat"),
      inputs: [{ id: "n", label: "n", type: "number", value: 561, width: "9em" }, { id: "bases", label: "основи a", value: "2 5 7 10", width: "9em" },
        { id: "test", label: "тест", type: "select", value: "fermat", options: [["fermat", "Ферма"], ["mr", "Милър–Рабин"]] }],
      presets: [{ label: "561 (Кармайкъл)", values: { n: 561, test: "fermat" } }, { label: "561 с Милър–Рабин", values: { n: 561, test: "mr" } }, { label: "1000003 (просто)", values: { n: 1000003 } }, { label: "1729", values: { n: 1729, bases: "2 5 11" } }, { label: "91 = 7·13", values: { n: 91, bases: "3 2" } }],
      legend: [["s-swap", "свидетел"], ["s-done", "не е свидетел"]],
      build: algos.primality,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "a" }), h("th", { text: "стойност(и)" }), h("th", { text: "свидетел?" })));
        f.rows.forEach((r) => tb.append(h("tr", null, h("td", { text: r.a }), h("td", { text: r.val }), h("td", { class: r.w ? "s-swap" : "s-done", text: r.w ? "да" : "не" }))));
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.done) {
          const wrong = f.verdict === 1 && !f.truth;
          st.append(h("p", { style: { marginTop: "10px" } }, h("span", { class: "pill " + (f.verdict ? (wrong ? "s-swap" : "s-done") : "s-piv"), text: f.verdict ? "вероятно просто" : "съставно (сигурно)" }), " ",
            h("span", { class: "pill", text: "истина: " + (f.truth ? "просто" : "съставно") }), wrong ? h("span", { class: "warn", text: "  ← грешка на Monte Carlo" }) : null));
        }
      },
    });

    // d) Insertion Sort — статичен код
    S.codeView(root.querySelector("#c-ins"), "ch10_insertion", ["grow", "insert"]);

    // d) дубликати
    S.viz(root.querySelector("#v-dup"), {
      id: "dup", title: "Дубликати: наивно O(n²) срещу предварително сортиране", sub: "Броячът сравнения е същият като в C.",
      code: (inp) => (inp.method === "naive" ? "ch10_dup_naive" : "ch10_dup_presort"),
      inputs: [{ id: "arr", label: "масив", value: "9 4 7 1 8 3 6 2 5 0", width: "16em" }, { id: "method", label: "метод", type: "select", value: "naive", options: [["naive", "наивно (всички двойки)"], ["presort", "сортиране + съседи"]] }],
      presets: [{ label: "С дубликат 7", values: { arr: "9 4 7 1 8 3 6 2 7 0" } }, { label: "Без дубликати", values: { arr: "9 4 7 1 8 3 6 2 5 0" } }],
      random: () => ({ arr: S.randArray(12, 1, 40).join(" ") }),
      legend: [["s-cmp", "сравнява се"], ["s-swap", "равни"], ["s-done", "сортиран"]],
      build: algos.dups,
      draw(st, f) {
        const cls = {};
        if (f.i >= 0) cls[f.i] = f.hit ? "s-swap" : "s-cmp";
        if (f.j >= 0) cls[f.j] = f.hit ? "s-swap" : "s-cmp";
        S.drawArray(st, f.a, { cls, ptr: Object.assign({}, f.i >= 0 ? { i: f.i } : {}, f.j >= 0 && f.j !== f.i + 1 || (f.j >= 0 && !f.sorted) ? { j: f.j } : {}), dim: f.sorted && f.i < 0 && !f.done ? () => false : null });
        if (f.sorted) st.append(h("p", { class: "muted", style: { fontSize: ".84rem" }, text: "Масивът е сортиран — равните стойности са съседни." }));
      },
    });
    const dn = root.querySelector("#dup-n"), dc = root.querySelector("#dup-cmp");
    function dupCmp() {
      let n; try { n = S.int(dn.value, 2, 200000, "n"); } catch (e) { dc.innerHTML = `<p class="warn">${e.message}</p>`; return; }
      const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      const ms = algos.msortCount(a), naive = n * (n - 1) / 2, pre = ms + n - 1;
      dc.innerHTML = "";
      const tb = h("table", { class: "t" }, h("tr", null, h("th", { text: "метод" }), h("th", { text: "сравнения" }), h("th", { text: "ред" })),
        h("tr", null, h("td", { text: "наивно" }), h("td", { class: "mono", text: fmt(naive) }), h("td", { text: "n(n−1)/2 = Θ(n²)" })),
        h("tr", null, h("td", { text: "сортиране + обхождане" }), h("td", { class: "mono", text: `${fmt(ms)} + ${fmt(n - 1)} = ${fmt(pre)}` }), h("td", { text: "O(n log n) + O(n)" })));
      dc.append(h("div", { class: "tbl-wrap" }, tb), h("p", { class: "muted", style: { fontSize: ".84rem" }, text: `Отношение ≈ ${(naive / pre).toFixed(1)}×.` }));
    }
    dn.addEventListener("input", dupCmp); dupCmp();

    // e) брой кандидати
    const mn = root.querySelector("#mitm-n"), mv = root.querySelector("#mitm-nv"), mt = root.querySelector("#mitm-cnt");
    function mitmCnt() {
      const n = +mn.value, a = Math.floor(n / 2), b = n - a, half = 2 ** a + 2 ** b;
      mv.textContent = "n = " + n;
      mt.innerHTML = "";
      mt.append(h("tr", null, h("th", { text: "" }), h("th", { text: "изчерпателно" }), h("th", { text: "среща по средата" })),
        h("tr", null, h("td", { text: "кандидати / суми" }), h("td", { class: "mono", text: "2ⁿ = " + fmt(2 ** n) }), h("td", { class: "mono", text: `2^${a} + 2^${b} = ${fmt(half)}` })),
        h("tr", null, h("td", { text: "сортиране" }), h("td", { text: "—" }), h("td", { class: "mono", text: `2^${b}·log₂ ≈ ${fmt(Math.round(2 ** b * b))}` })),
        h("tr", null, h("td", { text: "памет" }), h("td", { text: "O(n)" }), h("td", { class: "mono", text: `O(2^(n/2)) ≈ ${fmt(half)} суми` })));
    }
    mn.addEventListener("input", mitmCnt); mitmCnt();

    S.viz(root.querySelector("#v-mitm"), {
      id: "mitm", title: "Среща по средата — стъпково", sub: "До 12 числа ≥ 0. Лявата половина се изброява, дясната се сортира, после двоично търсене на T − сума.",
      code: "ch10_mitm",
      inputs: [{ id: "xs", label: "числа", value: "3 34 4 12 5 2", width: "14em" }, { id: "T", label: "T", type: "number", value: 9, width: "6em" }],
      presets: [{ label: "T = 30 (няма)", values: { T: 30 } }, { label: "8 числа", values: { xs: "8 6 7 5 3 10 9 4", T: 25 } }],
      random: () => { const a = S.randArray(8, 1, 30); return { xs: a.join(" "), T: S.randInt(10, 80) }; },
      legend: [["s-act", "текущо"], ["s-cmp", "проба (mid)"], ["s-done", "намерено"]],
      build: algos.mitm,
      draw(st, f, ctx) {
        st.innerHTML = "";
        const r = ctx.res, x = r.x;
        S.drawArray(st, x, { gapAt: [r.hh], cls: Object.fromEntries((f.pick || []).map((i) => [i, "s-done"])), label: (k) => (k < r.hh ? "L" : "R") + k });
        const sub = (mask, off, len) => { const s = []; for (let i = 0; i < len; i++) if ((mask >> i) & 1) s.push(x[off + i]); return "{" + s.join(",") + "}"; };
        const mk = (title, list, off, len, clsOf) => {
          const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "#" }), h("th", { text: "подмн." }), h("th", { text: "сума" })));
          list.forEach((it, k) => tb.append(h("tr", null, h("td", { text: k }), h("td", { text: sub(it.mask, off, len) }), h("td", { class: clsOf(k), text: it.sum }))));
          return h("div", { style: { display: "grid", gap: "4px", minWidth: "0" } }, h("span", { class: "eyebrow", text: title }), h("div", { class: "tbl-wrap", style: { maxHeight: "280px", overflowY: "auto" } }, tb));
        };
        const A = f.A, B = f.B;
        st.append(h("div", { style: { display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "start" } },
          mk("A — суми на лявата половина", A, 0, r.hh, (k) => (k === f.curA ? (f.done ? "s-done" : "s-act") : "")),
          mk(f.sorted ? "B — сортирани суми на дясната" : "B — суми на дясната половина", B, r.hh, r.m, (k) => (k === f.hitB ? "s-done" : k === f.mid ? "s-cmp" : k === f.curB ? "s-act" : f.lo != null && (k < f.lo || k >= f.hi) ? "s-dim" : ""))));
      },
    });

    // f) карти
    const CF = [
      { t: "Приближен алгоритъм", g: "приближен алгоритъм", d: "Връща допустимо решение с доказуема граница. α-приближение при минимизация: цена ≤ α·OPT, α ≥ 1. За метричния TSP има полиномиални алгоритми с доказани коефициенти." },
      { t: "Евристика", g: "евристика", d: "Практически правила за търсене без задължителна гаранция за оптималност. Качеството се оценява емпирично." },
      { t: "Метаевристики", g: "метаевристика", d: "Обща стратегия за насочване на търсенето: Simulated Annealing, генетични алгоритми, табу-търсене." },
      { t: "Онлайн алгоритъм", g: "онлайн алгоритъм", d: "Решения се вземат преди да е известен целият бъдещ вход. „Онлайн“ ≠ интернет." },
      { t: "Поточен алгоритъм", g: "поточен алгоритъм", d: "Последователност от данни при ограничена памет и малко преминавания; статистика за постъпващи измервания." },
    ];
    const cf = root.querySelector("#cards-f");
    CF.forEach((c) => cf.append(h("div", { class: "card" }, h("h4", null, h("dfn", { "data-g": c.g, text: c.t })), h("p", { text: c.d }))));

    S.viz(root.querySelector("#v-nn"), {
      id: "nn", title: "Евристика „най-близък съсед“ срещу оптимума от (b)", sub: "Същата матрица като в разклоняване и ограничаване. Отношението цена/OPT показва качеството — без гаранция.",
      code: "ch10_nn",
      inputs: [{ id: "mat", label: "матрица d[i][j]", value: M5, width: "min(30em, 80vw)" }],
      presets: [{ label: "Капан за алчния", values: { mat: "0 1 2 9; 1 0 2 3; 2 2 0 1; 9 3 1 0" }, title: "Най-близкият съсед е на 1, но накрая е принуден да се върне по ребро 9 (13 срещу OPT 7)" }, { label: "6 града", values: { mat: "0 12 10 19 8 14; 12 0 3 7 2 11; 10 3 0 6 20 4; 19 7 6 0 4 9; 8 2 20 4 0 5; 14 11 4 9 5 0" } }],
      legend: [["s-act", "текущ град"], ["s-cmp", "проверява се"], ["s-done", "посетен"]],
      build: algos.nn_tour,
      draw(st, f, ctx) {
        st.innerHTML = "";
        const d = ctx.res.d, n = d.length;
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "d" }), ...d.map((_, j) => h("th", { class: f.tour.includes(j) ? "s-done" : "", text: j }))));
        d.forEach((r, i) => tb.append(h("tr", null, h("th", { class: i === f.cur ? "s-act" : "", text: i }), ...r.map((v, j) => {
          let c = i === j ? "s-dim" : "";
          if (i === f.cur && j === f.scan) c = "s-cmp";
          if (i === f.cur && j === f.nx && f.at === "scan") c = c || "s-piv";
          for (let k = 0; k + 1 < f.tour.length; k++) if (f.tour[k] === i && f.tour[k + 1] === j) c = "s-done";
          return h("td", { class: c, text: i === j ? "–" : v });
        }))));
        st.append(h("div", { class: "tbl-wrap" }, tb), h("p", { class: "mono", style: { marginTop: "8px" }, text: "обиколка: " + f.tour.join(" → ") + (f.done ? `   = ${f.total};  OPT = ${f.opt};  цена/OPT = ${(f.total / f.opt).toFixed(3)}` : "") }));
        void n;
      },
    });

    S.viz(root.querySelector("#v-vc"), {
      id: "vc", title: "2-приближение за върхово покритие", sub: "Ребра „u-v“, върхове 0…9. Лилаво: избрано ребро (и двата края влизат в C).",
      code: "ch10_vc",
      inputs: [{ id: "edges", label: "ребра", value: "0-1 0-2 1-3 2-3 3-4 3-5", width: "18em" }],
      presets: [{ label: "Звезда", values: { edges: "0-1 0-2 0-3 0-4 0-5" }, title: "OPT = 1, алгоритъмът взема 2" }, { label: "Път 0…5", values: { edges: "0-1 1-2 2-3 3-4 4-5" } }, { label: "Пълен K4", values: { edges: "0-1 0-2 0-3 1-2 1-3 2-3" } }],
      legend: [["s-cmp", "текущо ребро"], ["s-piv", "избрано ребро"], ["s-done", "в покритието / покрито"]],
      build: algos.vc,
      draw: (st, f, ctx) => drawGraph(st, f, ctx.res),
    });

    S.viz(root.querySelector("#v-stream"), {
      id: "stream", title: "Поточна средна стойност и максимум — O(1) памет", sub: "Стойностите пристигат една по една; бъдещите са неизвестни („?“), миналите са забравени.",
      code: "ch10_stream",
      inputs: [{ id: "xs", label: "поток", value: "12 7 19 3 25 8 14", width: "18em" }],
      random: () => ({ xs: S.randArray(10, -20, 60).join(" ") }),
      legend: [["s-act", "текущо измерване"], ["s-dim", "забравено"]],
      build: algos.stream,
      draw(st, f) {
        st.innerHTML = "";
        const view = f.x.map((v, k) => (k <= f.k ? v : "?"));
        S.drawArray(st, view, { cls: Object.fromEntries(f.x.map((_, k) => [k, k === f.k ? "s-act" : k < f.k ? "s-dim" : ""])) });
        const v = f.vars;
        st.append(h("div", { class: "row" }, h("span", { class: "eyebrow", text: "Паметта на алгоритъма:" }),
          ...["count", "sum", "max"].map((k) => h("span", { class: "pill s-piv", text: `${k} = ${v[k]}` })),
          f.mean != null ? h("span", { class: "pill s-done", text: "mean = " + f.mean.toFixed(4) }) : null));
      },
    });

  }

  S.chapter({ id: "dopalnitelni", order: 10, num: "10", group: "Разширение", title: "Допълнителни парадигми и техники",
    lead: 'Целият раздел е допълнение към конспекта <span class="extra-tag">извън конспекта</span>: връщане назад, разклоняване и ограничаване, вероятностни, приближени и евристични методи, среща по средата, онлайн и поточни алгоритми.',
    html, mount, algos });
})();
