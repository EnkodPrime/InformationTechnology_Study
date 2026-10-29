/* Раздел 7 — Лаборатория за сортиране: шест алгоритъма, еднакви броячи с C, състезание, стабилност. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "сортиране чрез пряк избор": { cat: "Методи", t: "Сортиране чрез пряк избор", en: "Selection sort", d: "На позиция i се поставя минимумът на a[i..n−1].", more: "Винаги n(n−1)/2 сравнения ⇒ Θ(n²) във всеки случай; най-много n−1 размени. Не е стабилно (размяната прескача равни)." },
    "метод на мехурчето": { cat: "Методи", t: "Метод на мехурчето", en: "Bubble sort", d: "Съседни двойки в грешен ред се разменят; след всеки проход най-големият елемент е в края.", more: "С ранно спиране (проход без размени) най-добрият случай е Θ(n); най-лошият Θ(n²). Стабилно." },
    "сортиране чрез вмъкване": { cat: "Методи", t: "Сортиране чрез вмъкване", en: "Insertion sort", d: "Подредените първи n−1 елемента се допълват чрез вмъкване на последния на правилното място.", more: "Намаляване на размера (една подзадача). Θ(n) при сортиран вход, Θ(n²) в най-лошия; бързо при почти сортиран вход. Стабилно, на място." },
    "пирамидално сортиране": { cat: "Методи", t: "Пирамидално сортиране", en: "Heap sort", d: "Строи се max-пирамида, после n−1 пъти максимумът се разменя с последния елемент и пирамидата се възстановява.", more: "Разширение. O(n log n) във всеки случай (Θ(n log n) в най-лошия; при всички равни ключове — Θ(n)), на място, не е стабилно." },
    "сортиране на място": { cat: "Методи", t: "Сортиране на място", en: "In-place sort", d: "Използва O(1) (или O(log n) за стека) допълнителна памет освен входния масив.", more: "Merge Sort върху масив не е на място — нужен е буфер Θ(n)." },
    "долна граница за сортиране": { cat: "Сложност", t: "Долна граница Ω(n log n)", en: "Comparison-sort lower bound", d: "Всеки алгоритъм, който сортира само чрез сравнения, прави Ω(n log n) сравнения в най-лошия случай.", more: "Дървото на решенията трябва да различи n! наредби ⇒ височина ≥ log₂ n! = Θ(n log n). Не забранява counting sort при допълнителни предпоставки за ключовете." },
    "counting sort": { cat: "Методи", t: "Сортиране чрез броене", en: "Counting sort", d: "Брои срещанията на всеки ключ от малък целочислен диапазон [0, k) и възстановява реда без сравнения.", more: "Разширение. Θ(n + k) — не противоречи на Ω(n log n), защото не сортира чрез сравнения." },
  });

  /* ---------- общи данни ---------- */
  const ALG = ["selection", "bubble", "insertion", "merge", "quick", "heap"];
  const NAME = { selection: "пряк избор", bubble: "мехурче", insertion: "вмъкване", merge: "сливане", quick: "бързо", heap: "пирамидално" };
  const PROPS = {
    selection: { stable: false, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n²)", g: "сортиране чрез пряк избор" },
    bubble: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "метод на мехурчето" },
    insertion: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "сортиране чрез вмъкване", tag: "намаляване на размера" },
    merge: { stable: true, inplace: "не — Θ(n) буфер", worst: "Θ(n log n)", avg: "Θ(n log n)", best: "Θ(n log n)", g: "merge sort", tag: "разделяй и владей" },
    quick: { stable: false, inplace: "да (+ стек)", worst: "Θ(n²)", avg: "Θ(n log n)", best: "Θ(n log n)", g: "quick sort", tag: "разделяй и владей" },
    heap: { stable: false, inplace: "да", worst: "Θ(n log n)", avg: "Θ(n log n)", best: "Θ(n log n) (Θ(n) при всички равни ключове)", g: "пирамидално сортиране", extra: true },
  };
  const TYPES = [["0", "случаен"], ["1", "сортиран"], ["2", "обратно сортиран"], ["3", "почти сортиран"], ["4", "много повторения"], ["5", "собствен"]];

  /** генератор на входове — същият LCG като в C */
  function gen(n, type, seed) {
    let s = seed >>> 0;
    const rnd = (m) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s & 0x7fffffff) % m; };
    const a = [];
    for (let i = 0; i < n; i++) {
      let v;
      if (type === 1 || type === 3) v = i + 1;
      else if (type === 2) v = n - i;
      else if (type === 4) v = 1 + rnd(5);
      else v = 1 + rnd(n * 3);
      a.push({ key: v, id: i });
    }
    if (type === 3) for (let t = 0; t < Math.max(Math.floor(n / 10), 1); t++) { const x = rnd(n), y = rnd(n); const tt = a[x]; a[x] = a[y]; a[y] = tt; }
    return a;
  }

  /* ---------- алгоритмите: един код за стъпки и за състезание ---------- */
  // c: {cmp, swp, wr, less(x,y), swap(i,j), fr(at, o)}
  const SORT = {
    selection(a, c) {
      const n = a.length;
      for (let i = 0; i < n - 1; i++) {
        c.fr("outer", { act: [i], done: [0, i], vars: { i }, msg: `Проход i = ${i}: търсим минимума в a[${i}..${n - 1}] и го поставяме на позиция ${i}.` });
        let m = i;
        c.fr("minit", { act: [i], piv: [m], done: [0, i], vars: { i, m } });
        for (let j = i + 1; j < n; j++) {
          const l = c.less(a[j], a[m]);
          c.fr("cmp", { cmp: [j, m], piv: [m], done: [0, i], vars: { i, j, m }, msg: `a[${j}] = ${a[j].key} &lt; a[m] = ${a[m].key}? <b>${l}</b>` });
          if (l) { m = j; c.fr("newmin", { piv: [m], done: [0, i], vars: { i, j, m }, msg: `Нов минимум: m = ${m} (стойност ${a[m].key}).` }); }
        }
        c.fr("test", { act: [i], piv: [m], done: [0, i], vars: { i, m }, msg: m !== i ? `Минимумът ${a[m].key} е на позиция ${m} ≠ ${i} → размяна.` : `Минимумът вече е на позиция ${i} — без размяна.` });
        if (m !== i) { c.swap(i, m); c.fr("swap", { sw: [i, m], done: [0, i + 1], vars: { i, m }, log: `swap(a[${i}], a[${m}])` }); }
      }
      c.fr("outer", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    bubble(a, c) {
      const n = a.length;
      let end = n - 1;
      for (; end > 0; end--) {
        c.fr("outer", { done: [end + 1, n], vars: { end }, msg: `Проход до позиция ${end}: най-големият от a[0..${end}] ще „изплува“ в a[${end}].` });
        let swapped = 0;
        c.fr("flag", { done: [end + 1, n], vars: { end, swapped } });
        for (let j = 0; j < end; j++) {
          const l = c.less(a[j + 1], a[j]);
          c.fr("cmp", { cmp: [j, j + 1], done: [end + 1, n], vars: { end, j, swapped }, msg: `a[${j + 1}] = ${a[j + 1].key} &lt; a[${j}] = ${a[j].key}? <b>${l}</b>${l ? "" : " (равните НЕ се разменят — стабилност)"}` });
          if (l) { c.swap(j, j + 1); swapped = 1; c.fr("swap", { sw: [j, j + 1], done: [end + 1, n], vars: { end, j, swapped } }); }
        }
        c.fr("early", { done: [end, n], vars: { end, swapped }, msg: swapped ? `Имаше размени — продължаваме.` : `<b>Нито една размяна</b> в прохода ⇒ масивът е сортиран, спираме рано.`, log: `проход ${n - 1 - end + 1}: ${swapped ? "с размени" : "без размени"}` });
        if (!swapped) { c.fr("stop", { done: [0, n], vars: { end }, msg: `Ранно спиране след ${n - end} прохода.`, fin: true }); return; }
      }
      c.fr("outer", { done: [0, n], vars: { end }, msg: "Готово.", fin: true });
    },
    insertion(a, c) {
      const n = a.length;
      for (let i = 1; i < n; i++) {
        c.fr("outer", { sorted: [0, i], act: [i], vars: { i }, msg: `a[0..${i - 1}] е подредено (по-малката задача). Вмъкваме a[${i}] = ${a[i].key} — <dfn data-g="намаляване на размера">намаляване на размера</dfn>.` });
        const x = a[i];
        let j = i - 1;
        c.fr("take", { sorted: [0, i], hole: i, vars: { i, x: x.key, j } });
        while (true) {
          if (!(j >= 0)) break;
          const l = c.less(x, a[j]);
          c.fr("cmp", { sorted: [0, i + 1], hole: j + 1, cmp: [j], vars: { i, x: x.key, j }, msg: `x = ${x.key} &lt; a[${j}] = ${a[j].key}? <b>${l}</b>${l ? " → изместваме a[" + j + "] надясно." : " → мястото е намерено."}` });
          if (!l) break;
          a[j + 1] = a[j]; c.wr++;
          c.fr("shift", { sorted: [0, i + 1], hole: j, sw: [j + 1], vars: { i, x: x.key, j } });
          j--;
        }
        a[j + 1] = x; c.wr++;
        c.fr("put", { sorted: [0, i + 1], act: [j + 1], vars: { i, x: x.key, j }, msg: `Поставяме x = ${x.key} на позиция ${j + 1}.`, log: `вмъкнат ${x.key} на поз. ${j + 1}` });
      }
      c.fr("outer", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    merge(a, c) {
      const n = a.length, tmp = new Array(n);
      const rec = (lo, hi) => {
        if (hi - lo < 2) { c.fr("base", { rng: [lo, hi], vars: { lo, hi } }); return; }
        const mid = lo + ((hi - lo) >> 1);
        c.fr("split", { rng: [lo, hi], vars: { lo, mid, hi }, msg: `Разделяне [${lo}, ${hi}) → [${lo}, ${mid}) и [${mid}, ${hi}).` });
        rec(lo, mid); rec(mid, hi);
        let i = lo, j = mid, k = lo;
        c.fr("minit", { rng: [lo, hi], gap: mid, vars: { lo, mid, hi, i, j, k }, msg: `Сливане на [${lo}, ${mid}) и [${mid}, ${hi}).` });
        while (i < mid && j < hi) {
          const takeL = !c.less(a[j], a[i]);
          c.fr("cmp", { rng: [lo, hi], gap: mid, cmp: [i, j], vars: { lo, mid, hi, i, j, k }, msg: `a[${i}] = ${a[i].key} ≤ a[${j}] = ${a[j].key}? <b>${takeL}</b>${a[i].key === a[j].key ? " — при равенство взимаме от ЛЯВАТА: стабилност." : ""}` });
          if (takeL) tmp[k++] = a[i++]; else tmp[k++] = a[j++];
          c.wr++;
          c.fr(takeL ? "takeL" : "takeR", { rng: [lo, hi], gap: mid, vars: { lo, mid, hi, i, j, k }, log: `tmp[${k - 1}] = ${tmp[k - 1].key}` });
        }
        while (i < mid) { tmp[k++] = a[i++]; c.wr++; }
        while (j < hi) { tmp[k++] = a[j++]; c.wr++; }
        c.fr("rest", { rng: [lo, hi], gap: mid, vars: { lo, mid, hi, i, j, k }, msg: `Копираме остатъка в tmp.` });
        for (k = lo; k < hi; k++) { a[k] = tmp[k]; c.wr++; }
        c.fr("back", { rng: [lo, hi], sortedR: [lo, hi], vars: { lo, hi }, msg: `tmp[${lo}..${hi}) → a: подмасивът е сортиран.` });
      };
      rec(0, n);
      c.fr("back", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    quick(a, c) {
      const fixed = [];
      const rec = (lo, hi) => {
        if (lo >= hi) { if (lo === hi) { fixed.push(lo); c.fr("base", { fixed: fixed.slice(), rng: [lo, hi + 1], vars: { lo, hi } }); } return; }
        const mid = lo + ((hi - lo) >> 1);
        c.swap(mid, hi);
        c.fr("pivot", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], sw: [mid, hi], vars: { lo, hi, mid }, msg: `Опорен — средният a[${mid}] = ${a[hi].key}, преместен в края (a[${hi}]).` });
        let i = lo;
        for (let j = lo; j < hi; j++) {
          const le = !c.less(a[hi], a[j]);
          c.fr("cmp", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], cmp: [j], ptr: { i, j }, vars: { lo, hi, i, j }, msg: `a[${j}] = ${a[j].key} ≤ pivot = ${a[hi].key}? <b>${le}</b>` });
          if (le) { c.swap(i, j); c.fr("swap", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], sw: [i, j], ptr: { i, j }, vars: { lo, hi, i, j } }); i++; }
        }
        c.swap(i, hi);
        fixed.push(i);
        c.fr("place", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [i], vars: { lo, hi, p: i }, msg: `Опорният ${a[i].key} е на окончателното си място ${i} (${i - lo} : ${hi - i}).`, log: `[${lo}..${hi}] → pivot на ${i}` });
        rec(lo, i - 1); rec(i + 1, hi);
      };
      rec(0, a.length - 1);
      c.fr("place", { done: [0, a.length], vars: {}, msg: "Готово.", fin: true });
    },
    heap(a, c) {
      const n = a.length;
      const sift = (k, m, phase) => {
        for (;;) {
          let ch = 2 * k + 1;
          c.fr("child", { heap: m, act: [k], cmp: ch < m ? [ch] : [], vars: { k, c: ch, n: m }, msg: `${phase}: sift_down от ${k}; ляво дете ${ch}${ch >= m ? " — извън пирамидата, край." : "."}` });
          if (ch >= m) return;
          if (ch + 1 < m) {
            const l = c.less(a[ch], a[ch + 1]);
            if (l) ch++;
            c.fr("cmp2", { heap: m, act: [k], cmp: [ch], vars: { k, c: ch, n: m }, msg: `По-голямото дете: a[${ch}] = ${a[ch].key}.` });
          }
          const ok = !c.less(a[k], a[ch]);
          c.fr("cmp", { heap: m, act: [k], cmp: [ch], vars: { k, c: ch, n: m }, msg: `a[${k}] = ${a[k].key} ≥ a[${ch}] = ${a[ch].key}? <b>${ok}</b>${ok ? " — свойството на пирамидата е възстановено." : ""}` });
          if (ok) return;
          c.swap(k, ch);
          c.fr("swap", { heap: m, sw: [k, ch], vars: { k, c: ch, n: m } });
          k = ch;
        }
      };
      for (let k = (n >> 1) - 1; k >= 0; k--) { c.fr("build", { heap: n, act: [k], vars: { k }, msg: `Изграждане на max-пирамида: възел ${k}.` }); sift(k, n, "изграждане"); }
      for (let end = n - 1; end > 0; end--) {
        c.fr("extract", { heap: end + 1, vars: { end }, msg: `Максимумът a[0] = ${a[0].key} отива в края a[${end}].` });
        c.swap(0, end);
        c.fr("top", { heap: end, sw: [0, end], vars: { end }, log: `max ${a[end].key} → поз. ${end}` });
        sift(0, end, "възстановяване");
      }
      c.fr("extract", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
  };

  function run(name, items, rec, maxFrames = 6000) {
    const a = items.map((o) => ({ key: o.key, id: o.id }));
    const F = [];
    const c = { cmp: 0, swp: 0, wr: 0 };
    c.less = (x, y) => { c.cmp++; return x.key < y.key; };
    c.swap = (i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; c.swp++; c.wr += 2; };
    c.fr = rec ? (at, o) => {
      if (F.length >= maxFrames) throw new Error(`Твърде много стъпки (> ${maxFrames}). Намали n.`);
      F.push(Object.assign({ at, keys: a.map((x) => x.key), ids: a.map((x) => x.id), stats: { сравнения: c.cmp, размени: c.swp, записи: c.wr } }, o));
    } : () => {};
    SORT[name](a, c);
    return { frames: F, a, cmp: c.cmp, swp: c.swp, wr: c.wr, keys: a.map((x) => x.key).join(" "), ids: a.map((x) => x.id).join(" ") };
  }

  function makeInput({ type, n, seed, arr }, maxN) {
    const t = S.int(type, 0, 5, "Тип");
    if (t === 5) {
      const v = S.parseNums(arr, { min: -999, max: 999, minLen: 1, maxLen: maxN });
      return v.map((k, i) => ({ key: k, id: i }));
    }
    n = S.int(n, 1, maxN, "n");
    seed = S.int(seed, 0, 2 ** 31 - 1, "seed");
    return gen(n, t, seed);
  }

  const algos = {
    gen, run,
    /** a) стъпков визуализатор */
    sort_steps(inp) {
      const name = ALG.includes(inp.algo) ? inp.algo : "selection";
      const items = makeInput(inp, 40);
      const r = run(name, items, true);
      r.result = r.keys;
      r.input = items.map((x) => x.key);
      if (r.frames.length) r.frames[0].log = r.frames[0].log || `вход: ${r.input.join(" ")}`;
      const last = r.frames[r.frames.length - 1];
      if (last) last.msg = `Готово: сравнения <b>${r.cmp}</b>, размени <b>${r.swp}</b>, записи <b>${r.wr}</b> за n = ${items.length}.`;
      if (!r.frames.length) r.frames.push({ at: null, keys: r.a.map((x) => x.key), ids: [], done: [0, 1], stats: {}, msg: "n = 1 — няма какво да се сортира." });
      return r;
    },
    /** b) състезание: всички алгоритми, без кадри */
    race(inp) {
      const items = makeInput(inp, 2000);
      const rows = ALG.map((name) => { const r = run(name, items, false); return { name, cmp: r.cmp, swp: r.swp, wr: r.wr, ok: r.a.every((x, k) => k === 0 || r.a[k - 1].key <= x.key) }; });
      return { n: items.length, rows };
    },
    /** b2) крива сравнения/n */
    curve({ type, seed }) {
      const t = S.int(type, 0, 4, "Тип"), sd = S.int(seed, 0, 2 ** 31 - 1, "seed");
      const ns = [10, 20, 50, 100, 200, 500, 1000, 2000];
      const series = {};
      ALG.forEach((name) => (series[name] = ns.map((n) => run(name, gen(n, t, sd), false).cmp / n)));
      return { ns, series };
    },
    /** c) стабилност: „5a 3 5b“ */
    stability({ arr }) {
      const toks = String(arr).split(/[\s,;]+/).filter(Boolean);
      if (!toks.length) throw new Error("Въведи поне един елемент, напр. 5a 3 5b.");
      if (toks.length > 20) throw new Error("Най-много 20 елемента.");
      const items = toks.map((tk, i) => {
        const m = /^(-?\d+)([a-zа-я]?)$/i.exec(tk);
        if (!m) throw new Error(`„${tk}“: очаква се число с незадължителна буква (напр. 5a).`);
        return { key: +m[1], id: i, lab: tk };
      });
      const res = ALG.map((name) => {
        const r = run(name, items, false);
        let stable = true;
        for (let k = 1; k < r.a.length; k++) if (r.a[k - 1].key === r.a[k].key && r.a[k - 1].id > r.a[k].id) stable = false;
        return { name, out: r.a.map((x) => items[x.id].lab), ids: r.a.map((x) => x.id), stable };
      });
      return { items, res };
    },
  };

  /* ---------- рисуване ---------- */
  function clsFor(f, n) {
    const cls = {};
    const inR = (k, r) => r && k >= r[0] && k < r[1];
    for (let k = 0; k < n; k++) {
      if (f.rng && !inR(k, f.rng)) cls[k] = "s-dim";
      if (f.heap != null && k >= f.heap) cls[k] = "s-done";
      if (inR(k, f.done)) cls[k] = "s-done";
    }
    (f.fixed || []).forEach((k) => (cls[k] = "s-done"));
    (f.sorted ? Array.from({ length: Math.max(0, f.sorted[1] - f.sorted[0]) }, (_, q) => f.sorted[0] + q) : []).forEach((k) => { if (!cls[k]) cls[k] = "s-act"; });
    (f.act || []).forEach((k) => (cls[k] = "s-act"));
    (f.piv || []).forEach((k) => (cls[k] = "s-piv"));
    (f.cmp || []).forEach((k) => (cls[k] = "s-cmp"));
    (f.sw || []).forEach((k) => (cls[k] = "s-swap"));
    if (f.hole != null && !(f.sw || []).length) cls[f.hole] = "s-swap";
    return cls;
  }
  function propPills(name) {
    const P = PROPS[name];
    const box = h("div", { class: "row", style: { gap: "6px" } });
    box.append(h("span", { class: "pill " + (P.stable ? "s-done" : "s-swap"), text: P.stable ? "стабилен" : "не е стабилен" }));
    box.append(h("span", { class: "pill " + (P.inplace.startsWith("да") ? "s-done" : "s-cmp"), text: "на място: " + P.inplace }));
    box.append(h("span", { class: "pill", text: "най-лош " + P.worst }), h("span", { class: "pill", text: "среден " + P.avg }), h("span", { class: "pill", text: "най-добър " + P.best }));
    if (P.tag) box.append(h("span", { class: "pill s-piv", text: P.tag }));
    if (P.extra) box.append(h("span", { class: "extra-tag", text: "разширение" }));
    return box;
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Сортирането е сквозният пример на темата: тук то илюстрира <a href="#razdelyai">„разделяй и владей“</a> (Merge Sort, Quick Sort) и <dfn data-g="намаляване на размера">намаляване на размера</dfn> (Insertion Sort: подредените първи n − 1 елемента се допълват чрез вмъкване на последния — <b>една</b> по-малка подзадача). Тук всички методи работят върху <b>един и същ вход</b> с <b>едни и същи броячи</b>, точно като C кода.</p>
  <p class="muted">Броячи: <b>сравнения</b> на ключове; <b>размени</b>; <b>записи</b> на елемент в масив (a[] или tmp[]; една размяна = 2 записа).</p>
</div>

<div class="block">
  <h3>Визуализатор</h3>
  <div id="v7-main"></div>
  <details class="hint"><summary>Хинт: какво да гледаш при различните входове</summary><div>
    <p><b>Сортиран вход:</b> мехурчето с ранно спиране и вмъкването правят n − 1 сравнения — Θ(n). Прекият избор пак прави n(n − 1)/2 — той не „забелязва“ подредеността.</p>
    <p><b>Обратно сортиран:</b> вмъкването и мехурчето стигат най-лошия си случай n(n − 1)/2. Merge Sort остава Θ(n log n) (при обратно сортиран вход ≈ ½·n log₂ n сравнения).</p>
    <p><b>Почти сортиран:</b> вмъкването е близо до линейно — затова практическите хибриди (Timsort, introsort) го използват за малки/подредени части.</p>
  </div></details>
  <details class="trap"><summary>Капан: „пряк избор и мехурче са еднакви, щом и двете са Θ(n²)“</summary><div>
    <p>Еднакъв асимптотичен клас в най-лошия случай, но различни функции: прекият избор прави винаги n(n−1)/2 сравнения и ≤ n − 1 размени; мехурчето с ранно спиране има най-добър случай Θ(n), но може да направи Θ(n²) размени. Винаги казвай <b>кой случай</b> оценяваш.</p>
  </div></details>
</div>

<div class="block">
  <h3>Състезание: еднакъв вход, всички алгоритми</h3>
  <div class="viz"><div class="viz-head"><h4>Сравнения и записи</h4><span class="sub">Без стъпки — n до 2000. Лентата е пропорционална на броя сравнения.</span></div>
    <div class="viz-inputs" id="r7-in"></div>
    <div class="viz-stage" id="r7-out"></div>
  </div>
  <div class="viz"><div class="viz-head"><h4>Сравнения / n при растящо n</h4><span class="sub">Логаритмична ос y. n² алгоритмите растат като права линия (∝ n), n log n — почти хоризонтално (∝ log n).</span></div>
    <div class="viz-stage"><canvas class="chart" id="c7-curve" aria-label="Графика сравнения на елемент"></canvas><div class="legend" id="c7-leg" style="margin-top:8px"></div></div>
  </div>
  <div class="key"><span class="formula">пряк избор, мехурче, вмъкване: Θ(n²) (най-лош)   ·   сливане: Θ(n log n) винаги</span><br>
    <span class="formula"><dfn data-g="долна граница за сортиране">Ω(n log n)</dfn> — долна граница за сортиране ЧРЕЗ СРАВНЕНИЯ (най-лош случай)</span></div>
  <details class="hint"><summary>Хинт: защо Ω(n log n) и защо counting sort не я нарушава <span class="extra-tag">разширение</span></summary><div>
    <p>Алгоритъм, който само сравнява, трябва да различи всичките n! възможни наредби; всяко сравнение има 2 изхода ⇒ нужни са поне log₂(n!) ≈ n log₂ n сравнения в най-лошия случай.</p>
    <p><dfn data-g="counting sort">Counting sort</dfn> не сравнява — използва, че ключовете са малки цели числа в [0, k). Затова е Θ(n + k). Долната граница не го забранява: тя е за друг модел (с допълнителни предпоставки за ключовете).</p>
  </div></details>
</div>

<div class="block">
  <h3>Стабилност</h3>
  <p class="prose"><dfn data-g="стабилно сортиране">Стабилно сортиране</dfn>: равните ключове запазват взаимния си ред от входа. Буквата е само етикет — сортира се по числото. Важно е при многостепенно сортиране (напр. първо по име, после стабилно по град).</p>
  <div class="viz"><div class="viz-head"><h4>Кой алгоритъм запазва реда на равните?</h4><span class="sub">Червено — двойка равни ключове в обърнат ред.</span></div>
    <div class="viz-inputs" id="s7-in"></div>
    <div class="viz-stage" id="s7-out"></div>
  </div>
  <div id="s7-code" style="min-width:0"></div>
  <details class="hint"><summary>Хинт: един знак решава стабилността</summary><div>
    <p>В сливането условието е <code>a[i] &lt;= a[j]</code> (подсветено горе): при равенство се взима от <b>лявата</b> половина — елементът, който е бил по-рано. С <code>&lt;</code> алгоритъмът остава коректен, но губи стабилността. Мехурчето разменя само при строго <code>&lt;</code>, вмъкването спира при равенство — затова и те са стабилни.</p>
    <p>Прекият избор, бързото и пирамидалното разменят елементи на далечни позиции и така могат да прескочат равен елемент.</p>
  </div></details>
  <details class="trap"><summary>Капан: „на този вход редът се запази, значи е стабилно“</summary><div>
    <p>Стабилността е гаранция за <b>всеки</b> вход. Нестабилен алгоритъм може случайно да запази реда на конкретен пример. C++ <code>std::stable_sort</code> е стабилно, <code>std::sort</code> <b>не гарантира</b> стабилност; Python <code>sorted</code> е стабилно.</p>
  </div></details>
</div>`;

  function mount(root) {
    // a) основен визуализатор
    const pillsBox = h("div", { class: "sec" }, h("span", { class: "eyebrow", text: "Свойства" }), h("div"));
    S.viz(root.querySelector("#v7-main"), {
      id: "c7main", title: "Сортиране — стъпка по стъпка", sub: "Ленти = ключове. Броячите съвпадат с изхода на 07_sorting.c за същия вход.",
      code: (i) => "ch07_" + (ALG.includes(i.algo) ? i.algo : "selection"),
      inputs: [
        { id: "algo", label: "алгоритъм", type: "select", value: "insertion", options: ALG.map((a) => [a, NAME[a] + (a === "insertion" ? " (намаляване на размера)" : a === "bubble" ? " (ранно спиране)" : a === "heap" ? " ⁺" : "")]) },
        { id: "type", label: "вход", type: "select", value: "0", options: TYPES },
        { id: "n", label: "n (≤ 40)", type: "number", value: 16, width: "5em" },
        { id: "seed", label: "seed", type: "number", value: 777, width: "6em" },
        { id: "arr", label: "собствен вход", value: "8 3 6 2 9 1 5", width: "14em" },
      ],
      presets: [{ label: "почти сортиран + вмъкване", values: { algo: "insertion", type: "3", n: 30 } }, { label: "сортиран + пряк избор", values: { algo: "selection", type: "1", n: 12 } }, { label: "обратно + мехурче", values: { algo: "bubble", type: "2", n: 12 } }],
      random: () => ({ seed: S.randInt(1, 99999), type: "0" }),
      legend: [["s-cmp", "сравнение"], ["s-swap", "размяна / запис"], ["s-act", "текущ / подредена част"], ["s-piv", "опорен / минимум"], ["s-done", "на мястото си"], ["s-dim", "извън подмасива"]],
      sideExtra: pillsBox, speed: 2,
      build: algos.sort_steps,
      draw(st, f, { inputs }) {
        const name = ALG.includes(inputs.algo) ? inputs.algo : "selection";
        pillsBox.lastChild.replaceWith(propPills(name));
        S.drawBars(st, f.keys, { cls: clsFor(f, f.keys.length), height: 180, labelsUpTo: 40 });
        if (f.gap != null || f.ptr) st.append(h("div", { class: "muted", style: { font: "12px var(--f-mono)", marginTop: "4px" }, text: f.ptr ? `i = ${f.ptr.i}, j = ${f.ptr.j}` : `граница на половините: ${f.gap}` }));
      },
    });

    // b) състезание
    const rin = root.querySelector("#r7-in"), rout = root.querySelector("#r7-out");
    const fN = h("input", { type: "number", value: 500, min: 1, max: 2000, style: { width: "6em" }, id: "r7-n" });
    const fT = h("select", { id: "r7-t" }, ...TYPES.slice(0, 5).map(([v, t]) => h("option", { value: v, text: t })));
    const fS = h("input", { type: "number", value: 777, style: { width: "6em" }, id: "r7-s" });
    const go = () => {
      rout.innerHTML = "";
      let R;
      try { R = algos.race({ type: fT.value, n: fN.value, seed: fS.value }); } catch (e) { rout.append(h("p", { class: "warn", text: "Грешка във входа: " + e.message })); return; }
      const max = Math.max(...R.rows.map((r) => r.cmp), 1);
      const n = R.n, nlog = Math.round(n * Math.log2(n)), n2 = n * (n - 1) / 2;
      const tb = h("table", { class: "t" }, h("tr", null, ...["алгоритъм", "сравнения", "записи", "размени", "сравнения (лента)"].map((x) => h("th", { text: x }))));
      R.rows.forEach((r) => {
        const quad = r.cmp > 4 * nlog;
        tb.append(h("tr", null, h("td", { text: NAME[r.name] }), h("td", { class: "mono", text: r.cmp.toLocaleString("bg") }), h("td", { class: "mono", text: r.wr.toLocaleString("bg") }), h("td", { class: "mono", text: r.swp.toLocaleString("bg") }),
          h("td", { style: { minWidth: "140px", width: "40%" } }, h("div", { class: quad ? "s-swap" : "s-done", style: { height: "12px", width: Math.max(0.5, (r.cmp / max) * 100) + "%", background: "var(--c)", borderRadius: "2px" } }))));
      });
      rout.append(h("div", { class: "tbl-wrap" }, tb), h("p", { class: "muted", style: { marginTop: "8px", fontSize: ".85rem" }, html: `За сравнение: n(n−1)/2 = <b>${n2.toLocaleString("bg")}</b>, n·log₂n ≈ <b>${nlog.toLocaleString("bg")}</b>. Червено: над 4·n·log₂n.` }));
    };
    [fN, fT, fS].forEach((el) => el.addEventListener("change", go));
    rin.append(h("label", { class: "field", for: "r7-n" }, h("span", { text: "n (≤ 2000)" }), fN), h("label", { class: "field", for: "r7-t" }, h("span", { text: "вход" }), fT),
      h("label", { class: "field", for: "r7-s" }, h("span", { text: "seed" }), fS), h("button", { class: "btn primary", text: "Изпълни", onclick: go }),
      h("button", { class: "btn", text: "Случайни", onclick: () => { fS.value = S.randInt(1, 99999); go(); } }));
    go();

    // b2) крива
    const cv = root.querySelector("#c7-curve"), leg = root.querySelector("#c7-leg");
    const COL = { selection: "--st-swap", bubble: "--st-cmp", insertion: "--st-piv", merge: "--st-done", quick: "--st-act", heap: "--muted" };
    const DASH = { selection: [], bubble: [6, 4], insertion: [2, 3], merge: [], quick: [6, 4], heap: [2, 3] };
    ALG.forEach((a) => { const sp = h("span", null, h("i"), NAME[a]); sp.style.setProperty("--c", `var(${COL[a]})`); sp.style.setProperty("--cb", `var(${COL[a]})`); leg.append(sp); });
    const C = algos.curve({ type: 0, seed: 777 });
    function drawCurve() {
      const cs = getComputedStyle(document.documentElement), col = (v) => cs.getPropertyValue(v).trim();
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 320;
      cv.width = W * dpr; cv.height = H * dpr;
      const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const L = 48, R = 24, T = 12, B = 34;
      const ymin = 0.5, ymax = 1200, ly = (v) => T + (H - T - B) * (1 - (Math.log10(v) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin)));
      const lx = (k) => L + (W - L - R) * k / (C.ns.length - 1);
      g.font = "11px " + (col("--f-mono") || "monospace"); g.fillStyle = col("--muted"); g.strokeStyle = col("--line"); g.lineWidth = 1;
      [1, 10, 100, 1000].forEach((v) => { g.beginPath(); g.moveTo(L, ly(v)); g.lineTo(W - R, ly(v)); g.stroke(); g.fillText(String(v), 6, ly(v) + 4); });
      g.textAlign = "center"; C.ns.forEach((n, k) => { g.fillText(String(n), lx(k), H - 14); }); g.textAlign = "left";
      g.fillText("n", W - R - 8, H - 2);
      ALG.forEach((a) => {
        g.strokeStyle = col(COL[a]); g.lineWidth = 2.2; g.setLineDash(DASH[a]); g.beginPath();
        C.series[a].forEach((v, k) => { const x = lx(k), y = ly(Math.max(ymin, v)); k ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
      });
      g.setLineDash([]);
    }
    requestAnimationFrame(drawCurve);
    window.addEventListener("resize", drawCurve);

    // c) стабилност
    const sin = root.querySelector("#s7-in"), sout = root.querySelector("#s7-out");
    const fA = h("input", { type: "text", value: "5a 3a 5b 1a 3b 9 2 5c 7 1b", style: { width: "22em" }, id: "s7-a", spellcheck: "false" });
    const sgo = () => {
      sout.innerHTML = "";
      let R;
      try { R = algos.stability({ arr: fA.value }); } catch (e) { sout.append(h("p", { class: "warn", text: "Грешка във входа: " + e.message })); return; }
      const tb = h("table", { class: "t grid" });
      tb.append(h("tr", null, h("th", { text: "вход" }), ...R.items.map((x) => h("td", { text: x.lab })), h("th", { text: "" })));
      R.res.forEach((r) => {
        const bad = new Set();
        for (let k = 1; k < r.ids.length; k++) if (R.items[r.ids[k - 1]].key === R.items[r.ids[k]].key && r.ids[k - 1] > r.ids[k]) { bad.add(k - 1); bad.add(k); }
        tb.append(h("tr", null, h("th", { text: NAME[r.name] }), ...r.out.map((lab, k) => h("td", { class: bad.has(k) ? "s-swap" : "", text: lab })),
          h("td", null, h("span", { class: "pill " + (r.stable ? "s-done" : "s-swap"), text: r.stable ? "редът запазен" : "редът нарушен" }))));
      });
      sout.append(h("div", { class: "tbl-wrap" }, tb), h("p", { class: "muted", style: { marginTop: "8px", fontSize: ".85rem" }, text: "„Редът запазен“ се отнася само за този вход; гаранцията (стабилен / не) е в пилюлите на визуализатора горе." }));
    };
    fA.addEventListener("keydown", (e) => { if (e.key === "Enter") sgo(); });
    sin.append(h("label", { class: "field", for: "s7-a" }, h("span", { text: "ключове с етикет (5a 5b …)" }), fA), h("button", { class: "btn primary", text: "Изпълни", onclick: sgo }),
      h("button", { class: "btn ghost", text: "много равни", onclick: () => { fA.value = "2a 1a 2b 1b 2c 1c 2d 1d"; sgo(); } }));
    sgo();
    root.querySelector("#s7-code").append(h("p", { class: "muted", style: { marginBottom: "6px" }, html: "Сливането — подсветен е редът, от който зависи стабилността:" }));
    S.codeView(root.querySelector("#s7-code"), "ch07_merge", "cmp");

  }

  S.chapter({ id: "sortirovki", order: 7, num: "7", group: "Задължителни парадигми", title: "Лаборатория за сортиране", lead: "Шест метода върху един и същ вход: пряк избор, мехурче, вмъкване (намаляване на размера), сливане и бързо (разделяй и владей), пирамидално. Броячи, които съвпадат с C, състезание n² срещу n log n и стабилност.", html, mount, algos });
})();
