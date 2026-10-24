/* Раздел 6 — Разделяй и владей: Merge Sort, рекурентно дърво, двоично търсене, Quick Sort. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "merge sort": { cat: "Методи", t: "Сортиране чрез сливане (Merge Sort)", en: "Merge Sort", d: "Масивът се дели на две приблизително равни части, те се сортират рекурсивно и се сливат.", more: "T(n) = 2T(n/2) + Θ(n) = Θ(n log n) във всеки случай; стандартната реализация изисква Θ(n) допълнителна памет." },
    "сливане": { cat: "Методи", t: "Сливане (merge)", en: "Merge", d: "Обединяване на две сортирани последователности в една чрез многократно сравняване на текущите им първи елементи.", more: "Θ(n) за общо n елемента. Това е стъпката, която реално подрежда — самото разделяне не сортира." },
    "двоично търсене": { cat: "Методи", t: "Двоично търсене", en: "Binary search", d: "Търсене в сортиран масив: сравнява се със средния елемент и се продължава само в едната половина.", more: "T(n) = T(n/2) + Θ(1) = Θ(log n). Предусловие: масивът е сортиран — иначе отговорът може да е грешен." },
    "quick sort": { cat: "Методи", t: "Бързо сортиране (Quick Sort)", en: "Quick Sort", d: "Разделя масива спрямо опорен елемент на „по-малки или равни“ и „по-големи“ и сортира двете части рекурсивно.", more: "Времето зависи от баланса на разделянията: Θ(n log n) при добър баланс, Θ(n²) в най-лошия случай. Не е стабилно." },
    "опорен елемент": { cat: "Методи", t: "Опорен елемент", en: "Pivot", d: "Елементът, спрямо който Quick Sort разделя подмасива.", more: "Последен елемент върху вече сортиран масив дава най-лошия случай Θ(n²). Случаен избор ⇒ очаквано O(n log n) (Las Vegas)." },
    "разделяне на lomuto": { cat: "Методи", t: "Разделяне на Lomuto", en: "Lomuto partition", d: "Опорният е в a[hi]; индекс i пази границата на зоната ≤ pivot, j обхожда; накрая опорният се разменя с a[i].", more: "Прави точно hi − lo сравнения на разделяне. Алтернатива: схемата на Hoare (по-малко размени)." },
    "основна теорема": { cat: "Методи", t: "Основна теорема (Master theorem)", en: "Master theorem", d: "Готово решение за T(n) = a·T(n/b) + f(n), като се сравнява f(n) с n^(log_b a).", more: "Извън конспекта. 2T(n/2)+n ⇒ n log n; T(n/2)+1 ⇒ log n; 2T(n/2)+1 ⇒ n." },
    "предусловие": { cat: "Алгоритми и коректност", t: "Предусловие", en: "Precondition", d: "Условие върху входа, при което алгоритъмът гарантира верен резултат.", more: "За двоичното търсене: сортиран масив. При нарушено предусловие коректността не е обещана." },
  });

  /* ---------- чисти функции ---------- */
  const A = (s, o) => S.parseNums(s, Object.assign({ min: -999, max: 999 }, o));

  const algos = {
    /** a) Merge Sort top-down с буфер tmp — същите броячи като C */
    merge_sort({ arr }) {
      const a = A(arr, { minLen: 1, maxLen: 16 });
      const n = a.length, tmp = new Array(n).fill(null), F = [];
      let cmp = 0, copy = 0;
      // всички подмасиви [lo,hi) — за неподвижна схема на нивата
      const segs = {};
      (function pre(lo, hi, d) { segs[lo + "," + hi] = { lo, hi, d, st: "wait", vals: null }; if (hi - lo < 2) return; const m = lo + ((hi - lo) >> 1); pre(lo, m, d + 1); pre(m, hi, d + 1); })(0, n, 0);
      const snapSegs = () => { const o = {}; for (const k in segs) o[k] = { st: segs[k].st, vals: segs[k].vals ? segs[k].vals.slice() : null }; return o; };
      const st = () => ({ сравнения: cmp, копирания: copy });
      const push = (o) => F.push(Object.assign({ a: a.slice(), tmp: tmp.slice(), segs: snapSegs(), stats: st() }, o));
      function merge(lo, mid, hi) {
        const key = lo + "," + hi;
        for (let q = lo; q < hi; q++) tmp[q] = null;
        let i = lo, j = mid, k = lo;
        const P = () => ({ i: i < mid ? i : null, j: j < hi ? j : null, k: k < hi ? k : null });
        const V = () => ({ lo, mid, hi, i, j, k });
        push({ at: "m_init", seg: key, m: { lo, mid, hi }, ptr: P(), vars: V(), msg: `<dfn data-g="сливане">Сливане</dfn> на a[${lo}..${mid}) = [${a.slice(lo, mid).join(", ")}] и a[${mid}..${hi}) = [${a.slice(mid, hi).join(", ")}]. Двете половини вече са сортирани.` });
        while (i < mid && j < hi) {
          cmp++;
          const le = a[i] <= a[j];
          push({ at: "m_cmp", seg: key, m: { lo, mid, hi }, ptr: P(), cmpIJ: true, vars: V(), msg: `Сравняваме текущите първи елементи: a[${i}] = ${a[i]} ${le ? "≤" : ">"} a[${j}] = ${a[j]} → взимаме от <b>${le ? "лявата" : "дясната"}</b> половина.` });
          if (le) tmp[k++] = a[i++]; else tmp[k++] = a[j++];
          copy++;
          push({ at: le ? "m_left" : "m_right", seg: key, m: { lo, mid, hi }, ptr: P(), wrote: k - 1, vars: V(), log: `tmp[${k - 1}] = ${tmp[k - 1]}` });
        }
        while (i < mid) { tmp[k++] = a[i++]; copy++; push({ at: "m_restL", seg: key, m: { lo, mid, hi }, ptr: P(), wrote: k - 1, vars: V(), msg: `Дясната половина е изчерпана — копираме остатъка от лявата.`, log: `tmp[${k - 1}] = ${tmp[k - 1]} (остатък)` }); }
        while (j < hi) { tmp[k++] = a[j++]; copy++; push({ at: "m_restR", seg: key, m: { lo, mid, hi }, ptr: P(), wrote: k - 1, vars: V(), msg: `Лявата половина е изчерпана — копираме остатъка от дясната.`, log: `tmp[${k - 1}] = ${tmp[k - 1]} (остатък)` }); }
        for (k = lo; k < hi; k++) { a[k] = tmp[k]; copy++; }
        segs[key].st = "done"; segs[key].vals = a.slice(lo, hi);
        push({ at: "m_back", seg: key, m: { lo, mid, hi }, ptr: {}, back: true, vars: { lo, mid, hi }, msg: `Копираме tmp[${lo}..${hi}) обратно в a: [${a.slice(lo, hi).join(", ")}] — подмасивът е сортиран.`, log: `a[${lo}..${hi}) = [${a.slice(lo, hi).join(", ")}]` });
      }
      function rec(lo, hi) {
        const key = lo + "," + hi;
        segs[key].st = "act";
        push({ at: "enter", seg: key, vars: { lo, hi }, msg: `merge_sort_rec(a, ${lo}, ${hi}) — подмасив a[${lo}..${hi}) с ${hi - lo} елемента.`, log: `${"· ".repeat(segs[key].d)}[${lo}, ${hi})` });
        if (hi - lo < 2) {
          segs[key].st = "done"; segs[key].vals = a.slice(lo, hi);
          push({ at: "base", seg: key, vars: { lo, hi }, msg: `${hi - lo} елемент${hi - lo === 1 ? "" : "а"} — вече е сортиран (базов случай).` });
          return;
        }
        const mid = lo + ((hi - lo) >> 1);
        segs[key].st = "split";
        push({ at: "split", seg: key, vars: { lo, hi, mid }, msg: `<b>Разделяне</b>: mid = ${lo} + (${hi} − ${lo})/2 = ${mid} → [${lo}, ${mid}) и [${mid}, ${hi}).` });
        push({ at: "left", seg: key, vars: { lo, hi, mid }, msg: `Рекурсивно сортираме лявата половина [${lo}, ${mid}).` });
        rec(lo, mid);
        push({ at: "right", seg: key, vars: { lo, hi, mid }, msg: `Рекурсивно сортираме дясната половина [${mid}, ${hi}).` });
        rec(mid, hi);
        segs[key].st = "act";
        push({ at: "merge", seg: key, vars: { lo, hi, mid }, msg: `<b>Обединяване</b>: двете половини са сортирани — сливаме ги.` });
        merge(lo, mid, hi);
      }
      rec(0, n);
      const last = F[F.length - 1];
      last.done = true;
      last.msg = `Сортирано: [${a.join(", ")}]. Сравнения: ${cmp}, копирания: ${copy} (= 2 × сумата от размерите на всички сливания; при n = 2ᵏ точно 2n·log₂ n).`;
      return { frames: F, result: a.join(" "), cmp, copy };
    },

    /** b) дърво на рекурентното уравнение */
    rec_tree({ kind, n }) {
      n = S.int(n, 1, 64, "n");
      if (n & (n - 1)) throw new Error("n трябва да е степен на 2.");
      const L = Math.log2(n), F = [], levels = [];
      let total = 0;
      for (let k = 0; k <= L; k++) {
        const size = n >> k;
        const cnt = kind === "bs" ? 1 : 2 ** k;
        const each = kind === "ms" ? size : 1;
        const work = cnt * each;
        total += work;
        levels.push({ k, size, cnt, each, work });
        F.push({ levels: levels.slice(), total, kind, n, L, msg: `Ниво ${k}: ${cnt} подзадач${cnt === 1 ? "а" : "и"} с размер ${size}, всяка с работа ${kind === "ms" ? "c·" + size : "c"} ⇒ ниво = <b>${kind === "ms" ? "c·" : ""}${work}${kind === "ms" ? "" : "·c"}</b>. Натрупано: ${total}·c.`, stats: { нива: k + 1, "работа общо (·c)": total } });
      }
      const fin = { ms: `${n}·(${L}+1) = n(log₂n + 1) ⇒ <b>Θ(n log n)</b>`, bs: `${L}+1 = log₂n + 1 ⇒ <b>Θ(log n)</b>`, one: `2n − 1 = ${2 * n - 1} ⇒ <b>Θ(n)</b>` }[kind];
      F.push({ levels: levels.slice(), total, kind, n, L, done: true, msg: `Нива: log₂${n} + 1 = ${L + 1}. Общо: ${total}·c = ${fin}.`, stats: { нива: L + 1, "работа общо (·c)": total } });
      return { frames: F, total, levels: L + 1 };
    },

    /** c) двоично търсене */
    binary_search({ arr, key, pre }) {
      let a = A(arr, { minLen: 0, maxLen: 24 });
      key = S.int(key, -999, 999, "key");
      const sorted = a.every((v, k) => k === 0 || a[k - 1] <= v);
      let note = "";
      if (!sorted) {
        if (pre === "sort") { a = a.slice().sort((x, y) => x - y); note = "Входът не беше сортиран — сортиран автоматично. "; }
        else if (pre === "reject") throw new Error("Масивът не е сортиран — нарушено предусловие на двоичното търсене. Избери „сортирай“ или „пусни въпреки това“.");
      }
      const n = a.length, F = [];
      let cmp = 0, lo = 0, hi = n - 1;
      const bad = !sorted && pre === "raw";
      const st = () => ({ сравнения: cmp, "интервал": Math.max(0, hi - lo + 1) });
      F.push({ at: "init", a, lo, hi, mid: null, bad, vars: { n, key, lo, hi }, stats: st(), msg: note + (bad ? `<span class="warn">Внимание: масивът НЕ е сортиран — <dfn data-g="предусловие">предусловието</dfn> е нарушено.</span> ` : "") + `lo = 0, hi = n − 1 = ${n - 1}.`, log: `търсим ${key}` });
      while (true) {
        F.push({ at: "loop", a, lo, hi, mid: null, bad, vars: { key, lo, hi }, stats: st(), msg: `<code>lo &lt;= hi</code>: ${lo} ≤ ${hi} → <b>${lo <= hi}</b>.` });
        if (lo > hi) break;
        const mid = lo + ((hi - lo) >> 1);
        F.push({ at: "mid", a, lo, hi, mid, bad, vars: { key, lo, hi, mid }, stats: st(), msg: `mid = lo + (hi − lo)/2 = ${lo} + ${(hi - lo)}/2 = <b>${mid}</b>.` });
        cmp++;
        const eq = a[mid] === key;
        F.push({ at: "eq", a, lo, hi, mid, cmpk: true, bad, vars: { key, lo, hi, mid, "a[mid]": a[mid] }, stats: st(), msg: `a[${mid}] == key? ${a[mid]} == ${key} → <b>${eq}</b>.`, log: `a[${mid}]=${a[mid]} vs ${key}` });
        if (eq) {
          F.push({ at: "found", a, lo, hi, mid, found: true, done: true, bad, vars: { key, mid, return: mid }, stats: st(), msg: `Намерено на индекс <b>${mid}</b> след ${cmp} сравнения.`, log: `return ${mid}` });
          return { frames: F, result: mid, cmp, a };
        }
        cmp++;
        const less = a[mid] < key;
        F.push({ at: "lt", a, lo, hi, mid, cmpk: true, bad, vars: { key, lo, hi, mid, "a[mid]": a[mid] }, stats: st(), msg: `a[${mid}] &lt; key? ${a[mid]} &lt; ${key} → <b>${less}</b> ⇒ ${less ? "търсим вдясно" : "търсим вляво"}.${bad ? " (При несортиран масив това заключение е необосновано!)" : ""}` });
        if (less) lo = mid + 1; else hi = mid - 1;
        F.push({ at: less ? "right" : "left", a, lo, hi, mid, bad, vars: { key, lo, hi }, stats: st(), msg: less ? `lo = mid + 1 = ${lo}. Лявата половина отпада.` : `hi = mid − 1 = ${hi}. Дясната половина отпада.` });
      }
      const really = a.indexOf(key);
      F.push({ at: "notfound", a, lo, hi, mid: null, done: true, bad, vars: { key, return: -1 }, stats: st(), msg: `Интервалът е празен — връщаме <b>−1</b> след ${cmp} сравнения.` + (really >= 0 ? ` <span class="warn">Грешен отговор: ${key} е на индекс ${really}! Двоичното търсене е коректно само при сортиран вход.</span>` : ""), inv: really >= 0 ? { text: "нарушено предусловие ⇒ няма гаранция за коректност", ok: false } : null, log: "return -1" });
      return { frames: F, result: -1, cmp, a };
    },

    /** d) Quick Sort (Lomuto) с избор на опорен елемент — същите броячи и същият ГПСЧ като C */
    quick_sort({ arr, mode }) {
      const a = A(arr, { minLen: 1, maxLen: 24 });
      mode = S.int(mode, 0, 3, "Режим");
      const n = a.length, F = [], fixed = new Set();
      let cmp = 0, swp = 0, depth = 0, maxd = 0, seed = 12345;
      const rnd = (m) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed & 0x7fffffff) % m; };
      const lt = (x, y) => { cmp++; return x < y; };
      const swap = (x, y) => { const t = a[x]; a[x] = a[y]; a[y] = t; swp++; };
      const stack = [];
      const st = () => ({ сравнения: cmp, размени: swp, дълбочина: depth, "макс. дълбочина": maxd });
      const push = (o) => F.push(Object.assign({ a: a.slice(), fixed: [...fixed], stack: stack.slice(), stats: st() }, o));
      const MN = ["последен", "среден", "случаен", "медиана от три"];
      function choose(lo, hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (mode === 0) return hi;
        if (mode === 1) return mid;
        if (mode === 2) return lo + rnd(hi - lo + 1);
        if (lt(a[lo], a[mid])) return lt(a[mid], a[hi]) ? mid : (lt(a[lo], a[hi]) ? hi : lo);
        return lt(a[lo], a[hi]) ? lo : (lt(a[mid], a[hi]) ? hi : mid);
      }
      function partition(lo, hi) {
        const p = choose(lo, hi);
        push({ at: "choose", lo, hi, piv: p, vars: { lo, hi, p }, msg: `<dfn data-g="опорен елемент">Опорен елемент</dfn> (${MN[mode]}): a[${p}] = <b>${a[p]}</b>.` });
        swap(p, hi);
        push({ at: "tolast", lo, hi, piv: hi, vars: { lo, hi, p }, msg: `Преместваме опорния в края: swap(a[${p}], a[${hi}]).${p === hi ? " (Вече е там — размяна сам със себе си, но се брои.)" : ""}` });
        const pivot = a[hi];
        let i = lo;
        push({ at: "pinit", lo, hi, piv: hi, i, vars: { pivot, i }, msg: `pivot = ${pivot}, i = ${lo}. Зоната a[lo..i) ще съдържа елементите ≤ pivot.` });
        for (let j = lo; j < hi; j++) {
          const le = !lt(pivot, a[j]);
          push({ at: "pcmp", lo, hi, piv: hi, i, j, vars: { pivot, i, j, "a[j]": a[j] }, msg: `a[${j}] = ${a[j]} ${le ? "≤" : ">"} pivot = ${pivot}${le ? " → в лявата зона" : " → остава вдясно"}.` });
          if (le) {
            swap(i, j);
            push({ at: "pswap", lo, hi, piv: hi, i, j, sw: [i, j], vars: { pivot, i, j }, msg: `swap(a[${i}], a[${j}]), i = ${i + 1}.` });
            i++;
          }
        }
        swap(i, hi);
        fixed.add(i);
        push({ at: "pfinal", lo, hi, piv: i, i, vars: { pivot, i, return: i }, msg: `Опорният застава на окончателното си място ${i}: вляво ${i - lo} елемента ≤ ${pivot}, вдясно ${hi - i} &gt; ${pivot}.${Math.min(i - lo, hi - i) === 0 && hi > lo ? " <b>Небалансирано разделяне</b> (0 : " + (hi - lo) + ")." : ""}`, log: `[${lo}..${hi}] pivot ${pivot} → поз. ${i} (${i - lo}:${hi - i})` });
        return i;
      }
      function qs(lo, hi) {
        push({ at: "enter", lo, hi, vars: { lo, hi }, msg: `quick_sort(a, ${lo}, ${hi}).` });
        if (lo >= hi) {
          if (lo === hi) fixed.add(lo);
          push({ at: "base", lo, hi, vars: { lo, hi }, msg: lo === hi ? `Един елемент — на мястото си.` : `Празен подмасив.` });
          return;
        }
        depth++; maxd = Math.max(maxd, depth);
        stack.push([lo, hi]);
        push({ at: "part", lo, hi, vars: { lo, hi }, msg: `Разделяне на a[${lo}..${hi}] — дълбочина на рекурсията ${depth}.` });
        const p = partition(lo, hi);
        push({ at: "left", lo, hi: p - 1, vars: { lo, p }, msg: `Лява част [${lo}..${p - 1}].` });
        qs(lo, p - 1);
        push({ at: "right", lo: p + 1, hi, vars: { p, hi }, msg: `Дясна част [${p + 1}..${hi}].` });
        qs(p + 1, hi);
        depth--; stack.pop();
      }
      qs(0, n - 1);
      for (let k = 0; k < n; k++) fixed.add(k);
      const lg = Math.ceil(Math.log2(n + 1));
      push({ at: "enter", done: true, lo: 0, hi: n - 1, vars: { n }, msg: `Сортирано. Сравнения: <b>${cmp}</b> (n(n−1)/2 = ${n * (n - 1) / 2}), макс. дълбочина <b>${maxd}</b> (⌈log₂(n+1)⌉ = ${lg}).${maxd >= n - 1 && n > 3 ? " Дълбочина ≈ n ⇒ най-лош случай Θ(n²)." : ""}` });
      return { frames: F, result: a.join(" "), cmp, swp, maxd };
    },
  };

  /* ---------- рисуване ---------- */
  function drawMerge(st, f) {
    st.innerHTML = "";
    const n = f.a.length;
    const levels = {};
    for (const k in f.segs) { const [lo, hi] = k.split(",").map(Number); const d = depthOf(k, f); (levels[d] = levels[d] || []).push({ k, lo, hi }); }
    const cw = n > 10 ? 26 : 34;
    const grid = h("div", { style: { display: "grid", gap: "6px", gridTemplateColumns: `repeat(${n}, ${cw}px)`, columnGap: "4px", width: "max-content" } });
    Object.keys(levels).sort((x, y) => x - y).forEach((d) => {
      levels[d].forEach((s) => {
        const ss = f.segs[s.k];
        const vals = ss.vals || f.a.slice(s.lo, s.hi);
        const cls = s.k === f.seg ? "s-act" : ss.st === "done" ? "s-done" : ss.st === "split" ? "s-cmp" : "s-dim";
        const box = h("div", { class: cls, style: { gridColumn: `${s.lo + 1} / ${s.hi + 1}`, gridRow: +d + 1, display: "flex", border: "1.5px solid var(--c)", background: "var(--cb)", borderRadius: "4px", opacity: cls === "s-dim" ? ".5" : "1" } },
          ...vals.map((v) => h("span", { style: { flex: "1", textAlign: "center", font: `600 ${n > 10 ? 11 : 13}px var(--f-mono)`, padding: "3px 0" }, text: v })));
        grid.append(box);
      });
    });
    st.append(h("div", { class: "muted", style: { fontSize: ".75rem", marginBottom: "4px" }, text: "Дърво на рекурсията: ниво 0 горе; надолу — разделяне, нагоре — сливане" }), grid);
    // масив + tmp
    const cls = {};
    if (f.m) {
      for (let q = 0; q < n; q++) if (q < f.m.lo || q >= f.m.hi) cls[q] = "s-dim";
      if (f.ptr && f.ptr.i != null) cls[f.ptr.i] = f.cmpIJ ? "s-cmp" : "s-act";
      if (f.ptr && f.ptr.j != null) cls[f.ptr.j] = f.cmpIJ ? "s-cmp" : "s-piv";
      if (f.back) for (let q = f.m.lo; q < f.m.hi; q++) cls[q] = "s-done";
    }
    const row = h("div", { style: { display: "grid", gap: "0", marginTop: "10px" } });
    row.append(h("span", { class: "eyebrow", text: "a[]" }));
    S.drawArray(row, f.a, { cls, append: true, ptr: f.ptr ? { i: f.ptr.i, j: f.ptr.j } : {}, gapAt: f.m ? [f.m.mid] : [] });
    if (f.m) {
      row.append(h("span", { class: "eyebrow", text: "tmp[]" }));
      const tc = {}; if (f.wrote != null) tc[f.wrote] = "s-swap";
      for (let q = 0; q < n; q++) if (q < f.m.lo || q >= f.m.hi) tc[q] = "s-dim";
      S.drawArray(row, f.tmp, { cls: tc, append: true, ptr: f.ptr && f.ptr.k != null ? { k: f.ptr.k } : {} });
    }
    st.append(row);
  }
  function depthOf(k, f) { // дълбочина: по броя на обхващащите сегменти
    const [lo, hi] = k.split(",").map(Number);
    let d = 0;
    for (const o in f.segs) { if (o === k) continue; const [l2, h2] = o.split(",").map(Number); if (l2 <= lo && hi <= h2 && (h2 - l2) > (hi - lo)) d++; }
    return d;
  }

  function drawRecTree(st, f) {
    st.innerHTML = "";
    const avail = (st.clientWidth || 840) - 32, lab = 130;
    const W = Math.max(200, Math.min(640, avail - lab)), rowH = 34, H = (f.L + 1) * rowH + 10;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W + lab} ${H}`, width: W + lab });
    f.levels.forEach((L, idx) => {
      const y = 6 + idx * rowH, cnt = L.cnt;
      const span = f.kind === "bs" ? W / f.n * L.size : W / cnt;
      const gap = cnt > 32 ? 0.5 : 2;
      for (let q = 0; q < cnt; q++) {
        const x = f.kind === "bs" ? 0 : q * span;
        const last = idx === f.levels.length - 1 && !f.done;
        svg.append(S.svg("rect", { x: x + gap / 2, y, width: Math.max(1, span - gap), height: rowH - 10, rx: 3, class: "", style: `fill:var(${last ? "--st-act-bg" : "--st-done-bg"});stroke:var(${last ? "--st-act" : "--st-done"});stroke-width:1` }));
      }
      if (span > 22) for (let q = 0; q < cnt; q++) svg.append(S.svg("text", { x: (f.kind === "bs" ? 0 : q * span) + span / 2, y: y + 17, "text-anchor": "middle", style: "font-size:11px", text: L.size }));
      svg.append(S.svg("text", { x: W + 12, y: y + 17, style: "font-size:12px", text: `${cnt}×${f.kind === "ms" ? "c·" + L.size : "c"} = ${L.work}c` }));
    });
    st.append(svg);
  }

  function drawBS(st, f) {
    st.innerHTML = "";
    if (!f.a.length) { st.append(h("p", { class: "muted", text: "Празен масив: hi = −1 < lo = 0, цикълът не започва." })); return; }
    const cls = {};
    f.a.forEach((_, k) => { if (k < f.lo || k > f.hi) cls[k] = "s-dim"; });
    if (f.mid != null) cls[f.mid] = f.found ? "s-done" : f.cmpk ? "s-cmp" : "s-act";
    const ptr = {};
    if (f.lo < f.a.length) ptr.lo = f.lo;
    if (f.hi >= 0) ptr.hi = f.hi;
    if (f.mid != null) ptr.mid = f.mid;
    const box = S.drawArray(st, f.a, { cls, ptr });
    if (f.bad) st.append(h("p", { class: "warn", text: "Масивът не е сортиран: изхвърлянето на половина не е обосновано." }));
    return box;
  }

  function drawQS(st, f) {
    st.innerHTML = "";
    const cls = {}, fx = new Set(f.fixed);
    f.a.forEach((_, k) => { if (fx.has(k)) cls[k] = "s-done"; else if (k < f.lo || k > f.hi) cls[k] = "s-dim"; });
    if (f.piv != null) cls[f.piv] = "s-piv";
    if (f.j != null) cls[f.j] = "s-cmp";
    if (f.sw) f.sw.forEach((k) => (cls[k] = "s-swap"));
    if (f.done) f.a.forEach((_, k) => (cls[k] = "s-done"));
    const ptr = {};
    if (f.i != null) ptr.i = f.i;
    if (f.j != null) ptr.j = f.j;
    S.drawBars(st, f.a, { cls, height: 150, labelsUpTo: 24 });
    const pr = h("div", { class: "row", style: { font: "12px var(--f-mono)", gap: "6px", marginTop: "6px" } });
    pr.append(h("span", { class: "muted", text: "указатели:" }), h("span", { text: `i=${f.i ?? "—"}  j=${f.j ?? "—"}  [lo..hi]=[${f.lo}..${f.hi}]` }));
    st.append(pr);
    const sk = h("div", { class: "row", style: { gap: "4px", marginTop: "6px" } }, h("span", { class: "muted", style: { fontSize: ".75rem" }, text: `стек на рекурсията (${f.stack.length}):` }));
    f.stack.forEach((r) => sk.append(h("span", { class: "pill", style: { fontFamily: "var(--f-mono)" }, text: `${r[0]}..${r[1]}` })));
    st.append(sk);
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="разделяй и владей">Разделяй и владей</dfn>: задачата се разделя на по-малки подзадачи, те се решават, а частичните резултати се обединяват. Етапи: <b>разделяне → решаване → обединяване</b>. Подзадачите обикновено са <b>независими</b> (за разлика от <a href="#dp">динамичното програмиране</a>).</p>
</div>

<div class="block">
  <h3>Merge Sort — дърво на рекурсията</h3>
  <p class="prose"><dfn data-g="merge sort">Merge Sort</dfn>: масивът се дели на две приблизително равни части, те се сортират рекурсивно и се сливат. [8, 3, 6, 2] → [8, 3] и [6, 2] → [3, 8] и [2, 6] → [2, 3, 6, 8]. Самото разделяне <b>не сортира</b> — съществена е коректната операция за обединяване: <dfn data-g="сливане">сливане</dfn> чрез сравняване на текущите първи елементи.</p>
  <div id="v6-ms"></div>
  <details class="hint"><summary>Хинт: откъде идва n log n</summary><div>
    <p>На всяко ниво на дървото подмасивите заедно покриват целия масив ⇒ сливанията на едно ниво струват общо Θ(n). Размерът се дели на 2 ⇒ нивата са log₂ n (+1 с листата). Θ(n) на ниво × log n нива = Θ(n log n). Това е вярно за <b>всеки</b> вход — броят нива не зависи от стойностите.</p>
    <p>Броячът „копирания“ е най-много 2·n на ниво (n в tmp и n обратно) — точно 2·n, когато всички подмасиви на нивото се сливат (напр. при n = 2ᵏ) — оттук и Θ(n) допълнителната памет за tmp.</p>
  </div></details>
  <details class="trap"><summary>Капан: „разделянето сортира“ / „Merge Sort е на място“</summary><div>
    <p>Разделянето само намалява размера; подреждането става при сливането. Стандартната реализация изисква <b>Θ(n) допълнителна памет</b> — не е на място.</p>
    <p>Реални библиотеки: C++ <code>std::stable_sort</code> е стабилно; Python <code>list.sort</code>/<code>sorted</code> са стабилни (Timsort). Не всяко библиотечно сортиране е учебният Merge Sort.</p>
  </div></details>
</div>

<div class="block">
  <h3>Рекурентното уравнение като дърво</h3>
  <div class="key"><span class="formula">T(n) = 2T(n/2) + cn  ⇒  Θ(n log n)</span>  — логаритмичен брой нива, линейна обща работа на ниво.</div>
  <div id="v6-rec"></div>
  <details class="hint"><summary>Хинт: три уравнения, три различни отговора <span class="extra-tag">извън конспекта</span></summary><div>
    <p>Решават се с метода на дървото (виж горе) или с <dfn data-g="основна теорема">основната теорема</dfn>. 2T(n/2) + n: работата е еднаква на всяко ниво ⇒ n·log n. T(n/2) + 1: един възел на ниво ⇒ log n. 2T(n/2) + 1: работата се удвоява надолу и листата доминират ⇒ n.</p>
  </div></details>
</div>

<div class="block">
  <h3>Двоично търсене</h3>
  <p class="prose"><dfn data-g="двоично търсене">Двоичното търсене</dfn> продължава само в <b>едната</b> половина: T(n) = T(n/2) + Θ(1) = Θ(log n). Работи само при <dfn data-g="предусловие">предусловие</dfn> — сортиран масив.</p>
  <div id="v6-bs"></div>
  <details class="hint"><summary>Хинт: защо mid = lo + (hi − lo)/2, а не (lo + hi)/2</summary><div>
    <p>При int и големи масиви lo + hi може да надхвърли INT_MAX — препълване на знаково цяло число е недефинирано поведение в C. lo + (hi − lo)/2 дава същия резултат без препълване. Класически бъг, открит в библиотеки след години употреба.</p>
    <p>Инвариант: ако key е в масива, той е в a[lo..hi]. Мярка: hi − lo + 1 намалява поне наполовина ⇒ най-много ⌊log₂ n⌋ + 1 итерации.</p>
  </div></details>
  <details class="trap"><summary>Капан: всяка рекурсия ли е „разделяй и владей“?</summary><div>
    <p>Двоичното търсене има една подзадача и няма обединяване — в литературата често се класифицира и като <dfn data-g="намаляване на размера">намаляване на размера</dfn>. Не всяка рекурсивна програма е „разделяй и владей“ в същия практически смисъл.</p>
  </div></details>
</div>

<div class="block">
  <h3>Quick Sort и изборът на опорен елемент</h3>
  <p class="prose"><dfn data-g="quick sort">Quick Sort</dfn> разделя подмасива спрямо <dfn data-g="опорен елемент">опорен елемент</dfn> (тук — <dfn data-g="разделяне на lomuto">разделяне на Lomuto</dfn>) и сортира двете части рекурсивно. Тук работата е в <b>разделянето</b>, а обединяване няма. Времето зависи от <b>баланса на разделянията</b>.</p>
  <div id="v6-qs"></div>
  <div class="key"><span class="formula">балансирано: T(n) = 2T(n/2) + Θ(n) = Θ(n log n)</span><br><span class="formula">0 : n−1 на всяко ниво: T(n) = T(n−1) + Θ(n) = Θ(n²)</span></div>
  <details class="hint"><summary>Хинт: случаен опорен елемент</summary><div>
    <p>При <dfn data-g="вероятностен алгоритъм">рандомизиран</dfn> избор на опорен елемент очакваното време е O(n log n) за <b>всеки</b> вход — резултатът винаги е верен, случайно е само времето (<dfn data-g="las vegas">Las Vegas</dfn>, виж <a href="#dopalnitelni">допълнителните подходи</a>). Тук ГПСЧ е детерминиран (LCG със seed 12345), за да съвпада с C.</p>
  </div></details>
  <details class="trap"><summary>Капан: „Quick Sort е Θ(n log n)“</summary><div>
    <p>Само при добър баланс. С последен елемент като опорен върху вече сортиран масив всяко разделяне е 0 : n−1 ⇒ n(n−1)/2 сравнения и дълбочина на рекурсията n−1 (рискът е и за стека!). Пробвай бутона „вече сортиран“.</p>
    <p>При много повтарящи се ключове Lomuto също деградира — всички равни отиват вляво.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v6-ms"), {
      id: "c6ms", title: "Merge Sort (top-down, буфер tmp)", sub: "Горе — нивата на рекурсията; долу — сливането с указатели i, j и запис в tmp[k].",
      code: "ch06_merge_sort",
      inputs: [{ id: "arr", label: "Масив (до 16)", value: "8 3 6 2", width: "18em" }],
      presets: [{ label: "[8,3,6,2]", values: { arr: "8 3 6 2" } }, { label: "8 елемента", values: { arr: "5 2 4 7 1 3 2 6" } }, { label: "обратно 11", values: { arr: "9 8 7 6 5 4 3 2 1 0 -1" } }],
      random: () => ({ arr: S.randArray(S.randInt(6, 16), 0, 40).join(" ") }),
      legend: [["s-act", "текущ подмасив"], ["s-cmp", "разделен, чака"], ["s-done", "сортиран"], ["s-swap", "запис в tmp"]],
      build: algos.merge_sort, draw: drawMerge, stageHeight: 260,
    });

    S.viz(root.querySelector("#v6-rec"), {
      id: "c6rec", title: "Дърво на рекурентното уравнение", sub: "Всеки ред е ниво; правоъгълниците са подзадачите (ширина ∝ размер). Вдясно — работата на нивото.",
      code: false,
      inputs: [
        { id: "kind", label: "уравнение", type: "select", value: "ms", options: [["ms", "T(n) = 2T(n/2) + cn  (Merge Sort)"], ["bs", "T(n) = T(n/2) + c  (двоично търсене)"], ["one", "T(n) = 2T(n/2) + c"]] },
        { id: "n", label: "n", type: "select", value: "16", options: ["2", "4", "8", "16", "32", "64"] },
      ],
      build: algos.rec_tree, draw: drawRecTree, startAtEnd: true, speed: 0,
    });

    S.viz(root.querySelector("#v6-bs"), {
      id: "c6bs", title: "Двоично търсене (итеративно)", sub: "Сивото е изключено от интервала [lo, hi].",
      code: "ch06_bsearch",
      inputs: [
        { id: "arr", label: "Масив", value: "2 5 8 12 16 23 38 56 72 91", width: "20em" },
        { id: "key", label: "key", type: "number", value: 23, width: "6em" },
        { id: "pre", label: "ако не е сортиран", type: "select", value: "sort", options: [["sort", "сортирай автоматично"], ["reject", "откажи (грешка)"], ["raw", "пусни въпреки това"]] },
      ],
      presets: [{ label: "липсващ 7", values: { key: 7 } }, { label: "несортиран → грешен отговор", values: { arr: "9 1 7 3 8 2 6", key: 9, pre: "raw" } }],
      random: () => { const a = [...new Set(S.randArray(14, 1, 99))].sort((x, y) => x - y); return { arr: a.join(" "), key: Math.random() < .7 ? a[S.randInt(0, a.length - 1)] : 100 }; },
      legend: [["s-act", "mid"], ["s-cmp", "сравнява се"], ["s-done", "намерено"], ["s-dim", "изключено"]],
      build: algos.binary_search, draw: drawBS,
    });

    S.viz(root.querySelector("#v6-qs"), {
      id: "c6qs", title: "Quick Sort (Lomuto)", sub: "Виолетово — опорният; зелено — елементи на окончателното си място.",
      code: "ch06_quick_sort",
      inputs: [
        { id: "arr", label: "Масив (до 24)", value: "5 2 4 7 1 3 2 6", width: "20em" },
        { id: "mode", label: "опорен елемент", type: "select", value: "0", options: [["0", "последен"], ["1", "среден"], ["2", "случаен"], ["3", "медиана от три"]] },
      ],
      presets: [{ label: "вече сортиран (12)", values: { arr: "1 2 3 4 5 6 7 8 9 10 11 12", mode: "0" } }, { label: "много повторения", values: { arr: "4 4 4 1 4 4 2 4 4 4" } }],
      random: () => ({ arr: S.randArray(S.randInt(8, 20), 1, 50).join(" ") }),
      legend: [["s-piv", "опорен"], ["s-cmp", "j (сравнява се)"], ["s-swap", "размяна"], ["s-done", "на мястото си"]],
      build: algos.quick_sort, draw: drawQS, speed: 2,
    });

  }

  S.chapter({ id: "razdelyai", order: 6, num: "6", group: "Задължителни парадигми", title: "Разделяй и владей", lead: "Разделяне → решаване → обединяване. Merge Sort и неговото дърво, рекурентното уравнение като сума по нива, двоично търсене и защо времето на Quick Sort зависи от баланса.", html, mount, algos });
})();
