/* Раздел 7 — Лаборатория за сортиране: 14 алгоритъма, еднакви броячи с C, дърво на рекурсията/пирамидата, състезание, стабилност. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "сортиране чрез пряк избор": { cat: "Методи", t: "Сортиране чрез пряк избор", en: "Selection sort", d: "На позиция i се поставя минимумът на a[i..n−1].", more: "Винаги n(n−1)/2 сравнения ⇒ Θ(n²) във всеки случай; най-много n−1 размени. Не е стабилно (размяната прескача равни)." },
    "метод на мехурчето": { cat: "Методи", t: "Метод на мехурчето", en: "Bubble sort", d: "Съседни двойки в грешен ред се разменят; след всеки проход най-големият елемент е в края.", more: "С ранно спиране (проход без размени) най-добрият случай е Θ(n); най-лошият Θ(n²). Стабилно." },
    "сортиране чрез вмъкване": { cat: "Методи", t: "Сортиране чрез вмъкване", en: "Insertion sort", d: "Подредените първи n−1 елемента се допълват чрез вмъкване на последния на правилното място.", more: "Намаляване на размера (една подзадача). Θ(n) при сортиран вход, Θ(n²) в най-лошия; бързо при почти сортиран вход. Стабилно, на място." },
    "пирамидално сортиране": { cat: "Методи", t: "Пирамидално сортиране", en: "Heap sort", d: "Строи се max-пирамида, после n−1 пъти максимумът се разменя с последния елемент и пирамидата се възстановява.", more: "Разширение. O(n log n) във всеки случай (Θ(n log n) в най-лошия; при всички равни ключове — Θ(n)), на място, не е стабилно." },
    "сортиране на място": { cat: "Методи", t: "Сортиране на място", en: "In-place sort", d: "Използва O(1) (или O(log n) за стека) допълнителна памет освен входния масив.", more: "Merge Sort върху масив не е на място — нужен е буфер Θ(n)." },
    "долна граница за сортиране": { cat: "Сложност", t: "Долна граница Ω(n log n)", en: "Comparison-sort lower bound", d: "Всеки алгоритъм, който сортира само чрез сравнения, прави Ω(n log n) сравнения в най-лошия случай.", more: "Дървото на решенията трябва да различи n! наредби ⇒ височина ≥ log₂ n! = Θ(n log n). Не забранява counting sort при допълнителни предпоставки за ключовете." },
    "counting sort": { cat: "Методи", t: "Сортиране чрез броене", en: "Counting sort", d: "Брои срещанията на всеки ключ от малък целочислен диапазон [0, k) и възстановява реда без сравнения.", more: "Разширение. Θ(n + k) — не противоречи на Ω(n log n), защото не сортира чрез сравнения. Изгодно при k = O(n); при k ≫ n паметта и времето за k доминират." },
    "поразредно сортиране": { cat: "Методи", t: "Поразредно сортиране (LSD)", en: "Radix sort (LSD)", d: "Стабилно сортиране по цифрите на ключа, от младшата към старшата.", more: "Разширение. Θ(d·(n + b)) за d цифри в основа b. Коректно само ако сортирането по всяка цифра е стабилно — то пази реда, постигнат от по-младшите цифри." },
    "shell sort": { cat: "Методи", t: "Сортиране на Shell", en: "Shell sort", d: "Поредица от вмъквания между елементи на разстояние h с намаляващо h; последното h = 1.", more: "Разширение. Сложността зависи от редицата стъпки: при 1, 4, 13, 40, … (Кнут) най-лошият случай е Θ(n^1.5). Не е стабилно — далечните премествания прескачат равни." },
    "шейкър сортиране": { cat: "Методи", t: "Шейкър (двупосочно мехурче)", en: "Cocktail shaker sort", d: "Редува проход напред (максимумът вдясно) и назад (минимумът вляво).", more: "Разширение. Същият асимптотичен клас като мехурчето; помага при малки стойности в края („костенурки“), които мехурчето мести с по една позиция на проход." },
    "comb sort": { cat: "Методи", t: "Сортиране с гребен", en: "Comb sort", d: "Мехурче със сравнения на разстояние gap; gap намалява с фактор 1,3 до 1.", more: "Разширение. Далечните размени махат „костенурките“ рано. Не е стабилно." },
    "gnome sort": { cat: "Методи", t: "Gnome sort", en: "Gnome sort", d: "Една позиция pos: ако a[pos−1] ≤ a[pos] — напред, иначе размяна и назад.", more: "Разширение. По брой размени е като вмъкването, но мести елемента чрез съседни размени. Стабилно, Θ(n²)." },
    "трипосочно разделяне": { cat: "Методи", t: "Трипосочно разделяне", en: "3-way partitioning (Dijkstra)", d: "Разделя на &lt; p, = p и &gt; p с три указателя lt, i, gt.", more: "Разширение. Равните на опорния не влизат в рекурсията; при много повторения бързото сортиране става почти линейно." },
  });

  /* ---------- общи данни ---------- */
  const ALG = ["selection", "bubble", "insertion", "merge", "quick", "heap", "shell", "cocktail", "comb", "gnome", "counting", "radix", "merge_bu", "quick3"];
  const NAME = { selection: "пряк избор", bubble: "мехурче", insertion: "вмъкване", merge: "сливане", quick: "бързо", heap: "пирамидално",
    shell: "Shell", cocktail: "шейкър", comb: "гребен (comb)", gnome: "gnome", counting: "броене", radix: "поразредно (LSD)", merge_bu: "сливане отдолу нагоре", quick3: "бързо 3-посочно" };
  /** алгоритми с дърво: интервално дърво на рекурсията или пирамида */
  const TREE = { merge: "rec", quick: "rec", merge_bu: "rec", quick3: "rec", heap: "heap" };
  const PROPS = {
    selection: { stable: false, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n²)", g: "сортиране чрез пряк избор" },
    bubble: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "метод на мехурчето" },
    insertion: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "сортиране чрез вмъкване", tag: "намаляване на размера" },
    merge: { stable: true, inplace: "не — Θ(n) буфер", worst: "Θ(n log n)", avg: "Θ(n log n)", best: "Θ(n log n)", g: "merge sort", tag: "разделяй и владей" },
    quick: { stable: false, inplace: "да (+ стек)", worst: "Θ(n²)", avg: "Θ(n log n)", best: "Θ(n log n)", g: "quick sort", tag: "разделяй и владей" },
    heap: { stable: false, inplace: "да", worst: "Θ(n log n)", avg: "Θ(n log n)", best: "Θ(n log n) (Θ(n) при всички равни ключове)", g: "пирамидално сортиране", extra: true },
    shell: { stable: false, inplace: "да", worst: "Θ(n^1.5) (стъпки на Кнут)", avg: "емпирично ≈ n^1.25", best: "Θ(n log n)", g: "shell sort", tag: "намаляване на размера", extra: true },
    cocktail: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "шейкър сортиране", extra: true },
    comb: { stable: false, inplace: "да", worst: "Θ(n²)", avg: "емпирично близо до n log n", best: "Θ(n log n)", g: "comb sort", extra: true },
    gnome: { stable: true, inplace: "да", worst: "Θ(n²)", avg: "Θ(n²)", best: "Θ(n)", g: "gnome sort", extra: true },
    counting: { stable: true, inplace: "не — Θ(n + k)", worst: "Θ(n + k)", avg: "Θ(n + k)", best: "Θ(n + k)", g: "counting sort", tag: "без сравнения", extra: true },
    radix: { stable: true, inplace: "не — Θ(n + 10)", worst: "Θ(d·n)", avg: "Θ(d·n)", best: "Θ(d·n)", g: "поразредно сортиране", tag: "без сравнения", extra: true },
    merge_bu: { stable: true, inplace: "не — Θ(n) буфер", worst: "Θ(n log n)", avg: "Θ(n log n)", best: "Θ(n log n)", g: "merge sort", tag: "итеративно, без рекурсия", extra: true },
    quick3: { stable: false, inplace: "да (+ стек)", worst: "Θ(n²)", avg: "Θ(n log n)", best: "Θ(n) (всички равни)", g: "трипосочно разделяне", tag: "разделяй и владей", extra: true },
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
      const rec = (lo, hi, d) => {
        if (hi - lo < 2) { c.fr("base", { rng: [lo, hi], vars: { lo, hi }, t: [{ lo, hi, d, ev: "done" }] }); return; }
        const mid = lo + ((hi - lo) >> 1);
        c.fr("split", { rng: [lo, hi], vars: { lo, mid, hi }, t: [{ lo, hi, d, ev: "open" }], msg: `Разделяне [${lo}, ${hi}) → [${lo}, ${mid}) и [${mid}, ${hi}).` });
        rec(lo, mid, d + 1); rec(mid, hi, d + 1);
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
        c.fr("back", { rng: [lo, hi], vars: { lo, hi }, t: [{ lo, hi, d, ev: "done" }], msg: `tmp[${lo}..${hi}) → a: подмасивът е сортиран.` });
      };
      rec(0, n, 0);
      c.fr("back", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    quick(a, c) {
      const fixed = [];
      const rec = (lo, hi, d) => {
        if (lo >= hi) { if (lo === hi) { fixed.push(lo); c.fr("base", { fixed: fixed.slice(), rng: [lo, hi + 1], vars: { lo, hi }, t: [{ lo, hi: hi + 1, d, ev: "done" }] }); } return; }
        const mid = lo + ((hi - lo) >> 1);
        c.swap(mid, hi);
        c.fr("pivot", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], sw: [mid, hi], vars: { lo, hi, mid }, t: [{ lo, hi: hi + 1, d, ev: "open" }], msg: `Опорен — средният a[${mid}] = ${a[hi].key}, преместен в края (a[${hi}]).` });
        let i = lo;
        for (let j = lo; j < hi; j++) {
          const le = !c.less(a[hi], a[j]);
          c.fr("cmp", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], cmp: [j], ptr: { i, j }, vars: { lo, hi, i, j }, msg: `a[${j}] = ${a[j].key} ≤ pivot = ${a[hi].key}? <b>${le}</b>` });
          if (le) { c.swap(i, j); c.fr("swap", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [hi], sw: [i, j], ptr: { i, j }, vars: { lo, hi, i, j } }); i++; }
        }
        c.swap(i, hi);
        fixed.push(i);
        c.fr("place", { fixed: fixed.slice(), rng: [lo, hi + 1], piv: [i], vars: { lo, hi, p: i }, t: [{ lo, hi: hi + 1, d, ev: "part", eq: [i, i + 1] }], msg: `Опорният ${a[i].key} е на окончателното си място ${i} (${i - lo} : ${hi - i}).`, log: `[${lo}..${hi}] → pivot на ${i}` });
        rec(lo, i - 1, d + 1); rec(i + 1, hi, d + 1);
      };
      rec(0, a.length - 1, 0);
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

    /* ---------- разширение ---------- */
    shell(a, c) {
      const n = a.length;
      let h = 1;
      while (h < Math.floor(n / 3)) h = 3 * h + 1;
      for (; h >= 1; h = Math.floor(h / 3)) {
        c.fr("gap", { vars: { h }, msg: `Стъпка h = ${h}: вмъкване между елементи на разстояние ${h}${h === 1 ? " — обикновено вмъкване върху почти подреден масив." : "."}`, log: `h = ${h}` });
        for (let i = h; i < n; i++) {
          const x = a[i];
          let j = i;
          c.fr("take", { act: [i], hole: i, vars: { h, i, x: x.key } });
          for (;;) {
            if (!(j >= h)) break;
            const l = c.less(x, a[j - h]);
            c.fr("cmp", { hole: j, cmp: [j - h], vars: { h, i, j, x: x.key }, msg: `x = ${x.key} &lt; a[${j - h}] = ${a[j - h].key}? <b>${l}</b>${l ? ` → a[${j - h}] отива на ${j} (скок ${h}).` : " → мястото е намерено."}` });
            if (!l) break;
            a[j] = a[j - h]; c.wr++;
            c.fr("shift", { hole: j - h, sw: [j], vars: { h, i, j, x: x.key } });
            j -= h;
          }
          a[j] = x; c.wr++;
          c.fr("put", { act: [j], vars: { h, i, j } });
        }
      }
      c.fr("gap", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    cocktail(a, c) {
      const n = a.length;
      let lo = 0, hi = n - 1;
      for (;;) {
        let swapped = 0;
        const dn = () => [[0, lo], [hi + 1, n]];
        c.fr("fwd", { dn: dn(), vars: { lo, hi, swapped }, msg: `Проход напред в [${lo}, ${hi}]: най-големият отива в a[${hi}].` });
        for (let j = lo; j < hi; j++) {
          const l = c.less(a[j + 1], a[j]);
          c.fr("cmp", { dn: dn(), cmp: [j, j + 1], vars: { lo, hi, j, swapped }, msg: `a[${j + 1}] = ${a[j + 1].key} &lt; a[${j}] = ${a[j].key}? <b>${l}</b>` });
          if (l) { c.swap(j, j + 1); swapped = 1; c.fr("swap", { dn: dn(), sw: [j, j + 1], vars: { lo, hi, j, swapped } }); }
        }
        hi--;
        if (!swapped) { c.fr("stop", { done: [0, n], vars: { lo, hi }, msg: "Проход без размени ⇒ сортирано.", fin: true }); return; }
        swapped = 0;
        c.fr("back", { dn: dn(), vars: { lo, hi, swapped }, msg: `Проход назад в [${lo}, ${hi}]: най-малкият отива в a[${lo}].`, log: `проход напред до ${hi + 1}` });
        for (let j = hi; j > lo; j--) {
          const l = c.less(a[j], a[j - 1]);
          c.fr("cmpb", { dn: dn(), cmp: [j - 1, j], vars: { lo, hi, j, swapped }, msg: `a[${j}] = ${a[j].key} &lt; a[${j - 1}] = ${a[j - 1].key}? <b>${l}</b>` });
          if (l) { c.swap(j - 1, j); swapped = 1; c.fr("swapb", { dn: dn(), sw: [j - 1, j], vars: { lo, hi, j, swapped } }); }
        }
        lo++;
        if (!swapped) { c.fr("stopb", { done: [0, n], vars: { lo, hi }, msg: "Проход без размени ⇒ сортирано.", fin: true }); return; }
      }
    },
    comb(a, c) {
      const n = a.length;
      let gap = n, sorted = 0;
      while (!sorted) {
        gap = Math.floor(gap * 10 / 13);
        if (gap <= 1) { gap = 1; sorted = 1; }
        c.fr("gap", { vars: { gap, sorted }, msg: `gap = ${gap}${gap === 1 ? " — обикновен проход на мехурчето; ако няма размяна, край." : " (предишното × 10/13)."}`, log: `gap = ${gap}` });
        for (let i = 0; i + gap < n; i++) {
          const l = c.less(a[i + gap], a[i]);
          c.fr("cmp", { cmp: [i, i + gap], vars: { gap, i, sorted }, msg: `a[${i + gap}] = ${a[i + gap].key} &lt; a[${i}] = ${a[i].key}? <b>${l}</b>` });
          if (l) { c.swap(i, i + gap); sorted = 0; c.fr("swap", { sw: [i, i + gap], vars: { gap, i, sorted } }); }
        }
      }
      c.fr("gap", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    gnome(a, c) {
      const n = a.length;
      let pos = 0;
      while (pos < n) {
        if (pos === 0) { c.fr("fwd", { sorted: [0, 1], act: [0], vars: { pos }, msg: "pos = 0 — няма с какво да се сравни, напред." }); pos++; continue; }
        const l = c.less(a[pos], a[pos - 1]);
        c.fr("cmp", { sorted: [0, pos], cmp: [pos - 1, pos], vars: { pos }, msg: `a[${pos}] = ${a[pos].key} &lt; a[${pos - 1}] = ${a[pos - 1].key}? <b>${l}</b>${l ? " → размяна и стъпка назад." : " → наред, стъпка напред."}` });
        if (!l) pos++;
        else { c.swap(pos, pos - 1); c.fr("swap", { sorted: [0, pos - 1], sw: [pos - 1, pos], vars: { pos } }); pos--; }
      }
      c.fr("fwd", { done: [0, n], vars: { pos }, msg: "Готово.", fin: true });
    },
    counting(a, c) {
      const n = a.length;
      const [mn, mx] = keyRange(a, c);
      const k = mx - mn + 1;
      c.fr("range", { vars: { min: mn, max: mx, k }, msg: `min = ${mn}, max = ${mx} ⇒ k = ${k} брояча. Сравненията дотук (${c.cmp}) са само за min и max — подреждането е без сравнения.` });
      const cnt = new Array(k).fill(0), tmp = new Array(n).fill(null);
      const B = (o) => Object.assign({ cnt: cnt.slice(), cntOff: mn }, o);
      for (let i = 0; i < n; i++) { cnt[a[i].key - mn]++; c.fr("count", B({ act: [i], cntHi: a[i].key - mn, vars: { i } })); }
      for (let v = 1; v < k; v++) cnt[v] += cnt[v - 1];
      c.fr("prefix", B({ msg: "Префиксни суми: cnt[v] = брой ключове ≤ v, т.е. краят на блока за v в изхода." }));
      for (let i = n - 1; i >= 0; i--) {
        const p = --cnt[a[i].key - mn];
        tmp[p] = a[i]; c.wr++;
        c.fr("place", B({ act: [i], cntHi: a[i].key - mn, out: tmp.map((x) => (x ? x.key : null)), outHi: p, vars: { i, pos: p }, msg: `a[${i}] = ${a[i].key} → tmp[${p}]. Обхождането е отзад напред, затова равните запазват реда си.` }));
      }
      for (let i = 0; i < n; i++) { a[i] = tmp[i]; c.wr++; }
      c.fr("back", { done: [0, n], vars: {}, msg: "tmp → a. Готово.", fin: true });
    },
    radix(a, c) {
      const n = a.length;
      const [mn, mx] = keyRange(a, c);
      const range = mx - mn;
      c.fr("range", { vars: { min: mn, max: mx }, msg: `min = ${mn}, max = ${mx}: сортира се key − ${mn} ∈ [0, ${range}] по десетични цифри, от младшата.` });
      const tmp = new Array(n).fill(null);
      for (let e = 1; ; e *= 10) {
        const dig = (x) => Math.floor((x.key - mn) / e) % 10;
        const cnt = new Array(10).fill(0);
        tmp.fill(null);
        const B = (o) => Object.assign({ cnt: cnt.slice(), cntOff: 0, digs: a.map(dig), dLab: e }, o);
        c.fr("digit", B({ vars: { e }, msg: `Разряд ×${e}: стабилно броене по цифрата ⌊(key − ${mn}) / ${e}⌋ mod 10.`, log: `разряд ×${e}` }));
        for (let i = 0; i < n; i++) cnt[dig(a[i])]++;
        c.fr("count", B({ vars: { e } }));
        for (let d = 1; d < 10; d++) cnt[d] += cnt[d - 1];
        for (let i = n - 1; i >= 0; i--) {
          const d = dig(a[i]), p = --cnt[d];
          tmp[p] = a[i]; c.wr++;
          c.fr("place", B({ act: [i], cntHi: d, out: tmp.map((x) => (x ? x.key : null)), outHi: p, vars: { e, i, pos: p }, msg: `a[${i}] = ${a[i].key}, цифра ${d} → tmp[${p}].` }));
        }
        for (let i = 0; i < n; i++) { a[i] = tmp[i]; c.wr++; }
        c.fr("back", { digs: a.map(dig), dLab: e, vars: { e }, msg: `След прохода редът е подреден по последните ${String(e).length} цифри.` });
        if (Math.floor(range / e) < 10) break;
      }
      c.fr("last", { done: [0, n], vars: {}, msg: "Няма по-старши цифри. Готово.", fin: true });
    },
    merge_bu(a, c) {
      const n = a.length, tmp = new Array(n);
      let L = 0;
      for (let w = 1; w < n; w *= 2) L++;
      c.fr("width", { vars: {}, t: Array.from({ length: n }, (_, i) => ({ lo: i, hi: i + 1, d: L, ev: "done" })), msg: `Начало: ${n} серии с дължина 1 — всяка е сортирана.` });
      let lev = 0;
      for (let w = 1; w < n; w *= 2) {
        const d = L - ++lev, carry = [];
        for (let lo = 0; lo < n; lo += 2 * w) if (lo >= n - w) carry.push({ lo, hi: n, d, ev: "done" });
        c.fr("width", { vars: { w }, t: carry, msg: `Серии с дължина ${w} се сливат по двойки в серии с дължина ${2 * w}.${carry.length ? ` Последната серия няма двойка и се пренася.` : ""}`, log: `w = ${w}` });
        for (let lo = 0; lo < n - w; lo += 2 * w) {
          const mid = lo + w, hi = Math.min(lo + 2 * w, n);
          let i = lo, j = mid, k = lo;
          c.fr("minit", { rng: [lo, hi], gap: mid, vars: { w, lo, mid, hi, i, j, k }, t: [{ lo, hi, d, ev: "open" }], msg: `Сливане на [${lo}, ${mid}) и [${mid}, ${hi}).` });
          while (i < mid && j < hi) {
            const takeL = !c.less(a[j], a[i]);
            c.fr("cmp", { rng: [lo, hi], gap: mid, cmp: [i, j], vars: { w, lo, mid, hi, i, j, k }, msg: `a[${i}] = ${a[i].key} ≤ a[${j}] = ${a[j].key}? <b>${takeL}</b>` });
            if (takeL) tmp[k++] = a[i++]; else tmp[k++] = a[j++];
            c.wr++;
            c.fr(takeL ? "takeL" : "takeR", { rng: [lo, hi], gap: mid, vars: { w, lo, mid, hi, i, j, k } });
          }
          while (i < mid) { tmp[k++] = a[i++]; c.wr++; }
          while (j < hi) { tmp[k++] = a[j++]; c.wr++; }
          c.fr("rest", { rng: [lo, hi], gap: mid, vars: { w, lo, mid, hi, i, j, k } });
          for (k = lo; k < hi; k++) { a[k] = tmp[k]; c.wr++; }
          c.fr("back", { rng: [lo, hi], vars: { w, lo, hi }, t: [{ lo, hi, d, ev: "done" }], msg: `[${lo}, ${hi}) е сортирана серия.` });
        }
      }
      c.fr("width", { done: [0, n], vars: {}, msg: "Готово.", fin: true });
    },
    quick3(a, c) {
      const dn = [];
      const rec = (lo, hi, d) => {
        if (lo >= hi) { if (lo === hi) { dn.push([lo, lo + 1]); c.fr("base", { dn: dn.slice(), rng: [lo, hi + 1], vars: { lo, hi }, t: [{ lo, hi: hi + 1, d, ev: "done" }] }); } return; }
        const pi = lo + ((hi - lo) >> 1);
        const p = { key: a[pi].key, id: a[pi].id };
        const R = [lo, hi + 1];
        c.fr("pivot", { dn: dn.slice(), rng: R, piv: [pi], vars: { lo, hi, p: p.key }, t: [{ lo, hi: hi + 1, d, ev: "open" }], msg: `Опорна стойност p = ${p.key} (копие на a[${pi}]). Зони: [lo, lt) &lt; p, [lt, i) = p, (gt, hi] &gt; p.` });
        let lt = lo, i = lo, gt = hi;
        const Z = () => [[lo, lt], [lt, i], [gt + 1, hi + 1]];
        while (i <= gt) {
          const l1 = c.less(a[i], p);
          c.fr("cmp", { dn: dn.slice(), rng: R, cmp: [i], z3: Z(), vars: { lt, i, gt, p: p.key }, msg: `a[${i}] = ${a[i].key} &lt; p = ${p.key}? <b>${l1}</b>` });
          if (l1) { c.swap(lt, i); c.fr("swl", { dn: dn.slice(), rng: R, sw: [lt, i], z3: Z(), vars: { lt, i, gt, p: p.key } }); lt++; i++; continue; }
          const l2 = c.less(p, a[i]);
          c.fr("cmp2", { dn: dn.slice(), rng: R, cmp: [i], z3: Z(), vars: { lt, i, gt, p: p.key }, msg: `a[${i}] = ${a[i].key} &gt; p? <b>${l2}</b>${l2 ? " → към края (gt)." : " → равен на p, остава в средата."}` });
          if (l2) { c.swap(i, gt); c.fr("swg", { dn: dn.slice(), rng: R, sw: [i, gt], z3: Z(), vars: { lt, i, gt, p: p.key } }); gt--; }
          else i++;
        }
        dn.push([lt, gt + 1]);
        c.fr("rec", { dn: dn.slice(), rng: R, vars: { lo, hi, lt, gt }, t: [{ lo, hi: hi + 1, d, ev: "part", eq: [lt, gt + 1] }], msg: `[${lo}..${lt - 1}] &lt; ${p.key} | [${lt}..${gt}] = ${p.key} | [${gt + 1}..${hi}] &gt; ${p.key}. Средният блок е на мястото си и не влиза в рекурсията.`, log: `[${lo}..${hi}] → = блок [${lt}..${gt}]` });
        rec(lo, lt - 1, d + 1); rec(gt + 1, hi, d + 1);
      };
      rec(0, a.length - 1, 0);
      c.fr("rec", { done: [0, a.length], vars: {}, msg: "Готово.", fin: true });
    },
  };

  /** min и max — същият ред на сравненията като key_range в C */
  function keyRange(a, c) {
    let imin = 0, imax = 0;
    for (let i = 1; i < a.length; i++) {
      if (c.less(a[i], a[imin])) imin = i;
      else if (c.less(a[imax], a[i])) imax = i;
    }
    return [a[imin].key, a[imax].key];
  }

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
    (f.dn || []).forEach(([x, y]) => { for (let k = x; k < y; k++) cls[k] = "s-done"; });
    if (f.z3) { const [L, E, G] = f.z3; for (let k = L[0]; k < L[1]; k++) cls[k] = "s-act"; for (let k = E[0]; k < E[1]; k++) cls[k] = "s-piv"; for (let k = G[0]; k < G[1]; k++) cls[k] = "s-act"; }
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

  /* ---------- дърво на рекурсията (интервали) ---------- */
  const TM = new WeakMap();
  /** възлите от събитията f.t във всички кадри: ключ lo:hi:d → {lo, hi, d, ev: [[кадър, вид, eq, снимка]]} */
  function treeModel(frames) {
    if (TM.has(frames)) return TM.get(frames);
    const map = new Map();
    frames.forEach((f, i) => (f.t || []).forEach((e) => {
      const key = `${e.lo}:${e.hi}:${e.d}`;
      if (!map.has(key)) map.set(key, { lo: e.lo, hi: e.hi, d: e.d, ev: [] });
      map.get(key).ev.push([i, e.ev, e.eq || null, f.keys.slice(e.lo, e.hi)]);
    }));
    const nodes = [...map.values()].sort((x, y) => x.d - y.d || x.lo - y.lo);
    nodes.forEach((v) => (v.parent = nodes.find((u) => u.d === v.d - 1 && u.lo <= v.lo && v.hi <= u.hi) || null));
    const m = { nodes, maxD: Math.max(0, ...nodes.map((v) => v.d)) };
    TM.set(frames, m);
    return m;
  }
  function drawRecTree(host, f, frames, i, name) {
    const M = treeModel(frames), n = f.keys.length;
    if (!M.nodes.length) return;
    const hideFuture = name === "quick" || name === "quick3";
    const fin = new Set();
    const st = M.nodes.map((v) => {
      let last = null;
      for (const e of v.ev) if (e[0] <= i) last = e;
      if (last && last[1] === "done") for (let k = v.lo; k < v.hi; k++) fin.add(k);
      if (last && last[2]) for (let k = last[2][0]; k < last[2][1]; k++) fin.add(k);
      return last;
    });
    const W = 720, cw = W / n, rowH = M.maxD > 12 ? 20 : 30, H = (M.maxD + 1) * rowH + 6;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Дърво на рекурсията", style: "min-width:540px" });
    const cx = (v) => ((v.lo + v.hi) / 2) * cw, top = (v) => v.d * rowH + 4;
    const vis = M.nodes.map((v, k) => !(hideFuture && !st[k]));
    M.nodes.forEach((v, k) => { if (vis[k] && v.parent) svg.append(S.svg("line", { class: "edge", x1: cx(v.parent), y1: top(v.parent) + rowH - 8, x2: cx(v), y2: top(v) })); });
    M.nodes.forEach((v, k) => {
      if (!vis[k]) return;
      const last = st[k];
      // бързо: възелът е готов, когато всичките му позиции са окончателни; сливане: само по собственото събитие „done“
      let all = !!last && last[1] === "done";
      if (hideFuture && last) { all = true; for (let q = v.lo; q < v.hi; q++) if (!fin.has(q)) { all = false; break; } }
      const cur = f.rng && f.rng[0] === v.lo && f.rng[1] === v.hi && !f.fin;
      const cls = !last ? "s-dim" : all ? "s-done" : cur ? "s-act" : "";
      const g = S.svg("g", { class: "node " + cls });
      g.append(S.svg("rect", { x: v.lo * cw + 1.5, y: top(v), width: Math.max(2, (v.hi - v.lo) * cw - 3), height: rowH - 8, rx: 3, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--line));stroke-width:1.5" }));
      if (last && last[2]) {
        const [x, y] = last[2];
        g.append(S.svg("rect", { class: "s-piv", x: x * cw + 3, y: top(v) + 2, width: Math.max(2, (y - x) * cw - 6), height: rowH - 12, rx: 2, style: "fill:var(--cb);stroke:var(--c);stroke-width:1.5" }));
      }
      const keys = !last ? null : last[1] === "open" ? f.keys.slice(v.lo, v.hi) : last[3];
      const fs = cw >= 26 ? 12 : 10, fits = keys && keys.every((kv) => String(kv).length * fs * 0.62 + 3 <= cw);
      if (fits) keys.forEach((kv, q) => g.append(S.svg("text", { x: (v.lo + q + 0.5) * cw, y: top(v) + rowH / 2 + 0.5, "text-anchor": "middle", style: `font-size:${fs}px`, text: kv })));
      g.append(S.svg("title", { text: `[${v.lo}, ${v.hi}) · ниво ${v.d}${keys ? " · " + keys.join(" ") : ""}` }));
      svg.append(g);
    });
    const note = { merge: "Корен — целият масив; всяко ниво разделя на две половини. Цвят „на мястото си“ — сортиран подмасив (след сливането); „текущ“ — текущото извикване; бледо — още непосетено.",
      merge_bu: "Същото дърво, но се обхожда отдолу нагоре: листата (серии от 1) са сортирани от началото, всяко ниво слива по двойки. Последната серия без двойка се пренася на по-горното ниво.",
      quick: "Възлите се появяват при извикването. В цвета на опорния — опорният на окончателното си място; двете деца са частите вляво и вдясно от него.",
      quick3: "В цвета на опорния — блокът от равни; той не влиза в рекурсията, затова при много повторения дървото е плитко." }[name];
    host.append(h("div", { class: "sec", style: { marginTop: "10px" } }, h("span", { class: "eyebrow", text: "Дърво на рекурсията" }), h("div", { style: { overflowX: "auto" } }, svg), h("p", { class: "muted", style: { fontSize: ".82rem" }, text: note })));
  }

  /* ---------- пирамида като двоично дърво ---------- */
  function drawHeapTree(host, f, cls) {
    const n = f.keys.length, m = f.heap != null ? f.heap : f.fin ? 0 : n;
    if (n < 2) return;
    const D = Math.floor(Math.log2(n)), W = 720, rowH = 46, H = (D + 1) * rowH + 8;
    const r = Math.max(7, Math.min(15, W / Math.pow(2, D + 1) - 2));
    const pos = (k) => { const d = Math.floor(Math.log2(k + 1)), q = k + 1 - Math.pow(2, d); return [((q + 0.5) / Math.pow(2, d)) * W, d * rowH + r + 4]; };
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Пирамида", style: "min-width:540px" });
    for (let k = 1; k < n; k++) {
      const p = (k - 1) >> 1, [x1, y1] = pos(p), [x2, y2] = pos(k);
      const inHeap = k < m;
      const hot = inHeap && (cls[k] === "s-swap" || cls[k] === "s-cmp") && (cls[p] === "s-swap" || cls[p] === "s-act" || cls[p] === "s-cmp");
      svg.append(S.svg("line", { class: "edge " + (hot ? cls[k] : ""), x1, y1, x2, y2, style: inHeap ? null : "stroke-dasharray:3 4;opacity:.45" }));
    }
    for (let k = 0; k < n; k++) {
      const [x, y] = pos(k);
      const g = S.svg("g", { class: "node " + (cls[k] || "") }, S.svg("circle", { cx: x, cy: y, r }));
      if (r >= 9) g.append(S.svg("text", { x, y: y + 4, "text-anchor": "middle", style: `font-size:${r >= 13 ? 12 : 9}px`, text: f.keys[k] }));
      g.append(S.svg("title", { text: `a[${k}] = ${f.keys[k]}${k < m ? "" : " — извън пирамидата"}` }));
      svg.append(g);
    }
    host.append(h("div", { class: "sec", style: { marginTop: "10px" } }, h("span", { class: "eyebrow", text: `Пирамидата като дърво (размер ${m})` }), h("div", { style: { overflowX: "auto" } }, svg),
      h("p", { class: "muted", style: { fontSize: ".82rem" }, text: "Масивът е дървото: децата на a[k] са a[2k+1] и a[2k+2]. Пунктир — позиции извън пирамидата, вече на окончателното си място." })));
  }

  /* ---------- броячи и изходен масив (броене, поразредно) ---------- */
  function drawCounts(host, f, name) {
    const box = h("div", { class: "sec", style: { marginTop: "10px", display: "grid", gap: "8px" } });
    if (f.digs) {
      const w = h("div", { style: { overflowX: "auto" } });
      box.append(h("span", { class: "eyebrow", text: `цифра в разряд ×${f.dLab} на key − min` }), w);
      S.drawArray(w, f.digs, { cls: f.act ? { [f.act[0]]: "s-act" } : {} });
    }
    if (f.cnt) {
      const w = h("div", { style: { overflowX: "auto" } });
      if (f.cnt.length <= 64) {
        box.append(h("span", { class: "eyebrow", text: name === "radix" ? "cnt[цифра]" : "cnt[ключ] (индекс = ключ)" }), w);
        S.drawArray(w, f.cnt, { cls: f.cntHi != null ? { [f.cntHi]: "s-cmp" } : {}, label: (k) => k + f.cntOff });
      } else box.append(h("p", { class: "muted", text: `k = ${f.cnt.length} брояча — твърде много за показване; цената Θ(k) идва от тях.` }));
    }
    if (f.out) {
      const w = h("div", { style: { overflowX: "auto" } });
      box.append(h("span", { class: "eyebrow", text: "tmp (изход)" }), w);
      S.drawArray(w, f.out, { cls: f.outHi != null ? { [f.outHi]: "s-swap" } : {} });
    }
    if (box.childNodes.length) host.append(box);
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
  <details class="hint"><summary>Хинт: дървото под лентите <span class="extra-tag">разширение</span></summary><div>
    <p><b>Сливане</b> (и отдолу нагоре): дървото на интервалите е едно и също за всеки вход с дължина n — височина ⌈log₂ n⌉, на всяко ниво се сливат общо ≤ n елемента ⇒ Θ(n log n). Рекурсивната версия го обхожда отгоре надолу (в дълбочина), итеративната — ниво по ниво отдолу нагоре.</p>
    <p><b>Бързо</b>: дървото зависи от входа — опорният решава къде се разделя интервалът. Небалансирано дърво (дълбочина ≈ n) е най-лошият случай Θ(n²). При <b>трипосочното</b> блокът от равни излиза от рекурсията; пробвай вход „много повторения“ и сравни дълбочината с обикновеното бързо.</p>
    <p><b>Пирамидално</b>: тук дървото не е на рекурсията, а е самият масив — a[k] има деца a[2k+1] и a[2k+2]. Пирамидата се смалява отзад, докато максимумите се трупат вдясно.</p>
  </div></details>
  <details class="trap"><summary>Капан: „пряк избор и мехурче са еднакви, щом и двете са Θ(n²)“</summary><div>
    <p>Еднакъв асимптотичен клас в най-лошия случай, но различни функции: прекият избор прави винаги n(n−1)/2 сравнения и ≤ n − 1 размени; мехурчето с ранно спиране има най-добър случай Θ(n), но може да направи Θ(n²) размени. Винаги казвай <b>кой случай</b> оценяваш.</p>
  </div></details>
</div>

<div class="block">
  <h3>Още методи <span class="extra-tag">разширение</span></h3>
  <div class="prose">
    <p><b>Вариации на вмъкването и мехурчето.</b> <dfn data-g="shell sort">Shell</dfn> прави вмъкване между далечни елементи (стъпки 13, 4, 1 при n = 40) — последният проход с h = 1 е обикновено вмъкване, но върху почти подреден масив. <dfn data-g="шейкър сортиране">Шейкърът</dfn> редува посоките, <dfn data-g="comb sort">гребенът</dfn> сравнява на разстояние gap, което намалява ×10/13, а <dfn data-g="gnome sort">gnome</dfn> мести един елемент назад със съседни размени, докато застане на мястото си.</p>
    <p><b>Без сравнения.</b> <dfn data-g="counting sort">Броенето</dfn> и <dfn data-g="поразредно сортиране">поразредното</dfn> не сравняват елементи помежду им — затова броячът „сравнения“ при тях показва само намирането на min и max (≤ 2(n − 1)). Цената им зависи от диапазона на ключовете (k) или броя цифри (d), а не от n log n.</p>
    <p><b>Други реализации на познати идеи.</b> Сливането <b>отдолу нагоре</b> е същото сливане без рекурсия: серии 1, 2, 4, … Бързото с <dfn data-g="трипосочно разделяне">трипосочно разделяне</dfn> отделя равните на опорния — при вход „много повторения“ сравненията падат многократно спрямо обикновеното бързо.</p>
  </div>
  <details class="trap"><summary>Капан: „поразредното е Θ(n), значи винаги е по-бързо от n log n“</summary><div>
    <p>Θ(d·(n + b)) е линейно в n само при фиксиран брой цифри d. За n различни ключа са нужни поне log_b n цифри, т.е. d·n = Ω(n log n / log b). Изгодата е реална, когато ключовете са цели числа в ограничен диапазон — предпоставка, която сравнителните методи не изискват.</p>
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
        { id: "algo", label: "алгоритъм", type: "select", value: "insertion", options: ALG.map((a) => [a, NAME[a] + (a === "insertion" ? " (намаляване на размера)" : a === "bubble" ? " (ранно спиране)" : PROPS[a].extra ? " ⁺" : "") + (TREE[a] ? " · дърво" : "")]) },
        { id: "type", label: "вход", type: "select", value: "0", options: TYPES },
        { id: "n", label: "n (≤ 40)", type: "number", value: 16, width: "5em" },
        { id: "seed", label: "seed", type: "number", value: 777, width: "6em" },
        { id: "arr", label: "собствен вход", value: "8 3 6 2 9 1 5", width: "14em" },
      ],
      presets: [{ label: "почти сортиран + вмъкване", values: { algo: "insertion", type: "3", n: 30 } }, { label: "сортиран + пряк избор", values: { algo: "selection", type: "1", n: 12 } }, { label: "обратно + мехурче", values: { algo: "bubble", type: "2", n: 12 } },
        { label: "дърво: сливане", values: { algo: "merge", type: "0", n: 16 } }, { label: "пирамида", values: { algo: "heap", type: "0", n: 15 } }, { label: "повторения + 3-посочно", values: { algo: "quick3", type: "4", n: 24 } }, { label: "поразредно", values: { algo: "radix", type: "5", arr: "170 45 75 90 802 24 2 66" } }],
      random: () => ({ seed: S.randInt(1, 99999), type: "0" }),
      legend: [["s-cmp", "сравнение"], ["s-swap", "размяна / запис"], ["s-act", "текущ / подредена част"], ["s-piv", "опорен / минимум"], ["s-done", "на мястото си"], ["s-dim", "извън подмасива"]],
      sideExtra: pillsBox, speed: 2,
      build: algos.sort_steps,
      draw(st, f, { inputs, frames, i }) {
        const name = ALG.includes(inputs.algo) ? inputs.algo : "selection";
        pillsBox.lastChild.replaceWith(propPills(name));
        const cls = clsFor(f, f.keys.length);
        S.drawBars(st, f.keys, { cls, height: 180, labelsUpTo: 40 });
        if (f.gap != null || f.ptr) st.append(h("div", { class: "muted", style: { font: "12px var(--f-mono)", marginTop: "4px" }, text: f.ptr ? `i = ${f.ptr.i}, j = ${f.ptr.j}` : `граница на половините: ${f.gap}` }));
        if (name === "counting" || name === "radix") drawCounts(st, f, name);
        if (TREE[name] === "heap") drawHeapTree(st, f, cls);
        else if (TREE[name] === "rec") drawRecTree(st, f, frames, i, name);
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
    const COL = { selection: "--st-swap", bubble: "--st-cmp", insertion: "--st-piv", merge: "--st-done", quick: "--st-act", heap: "--muted",
      shell: "--st-piv", cocktail: "--st-cmp", comb: "--accent", gnome: "--st-swap", counting: "--ink-2", radix: "--accent", merge_bu: "--st-done", quick3: "--st-act" };
    const DASH = { selection: [], bubble: [6, 4], insertion: [2, 3], merge: [], quick: [6, 4], heap: [2, 3],
      shell: [10, 3, 2, 3], cocktail: [1, 3], comb: [], gnome: [10, 3, 2, 3], counting: [], radix: [6, 4], merge_bu: [1, 3], quick3: [10, 3, 2, 3] };
    const hidden = new Set();
    ALG.forEach((a) => {
      const sw = S.svg("svg", { width: 26, height: 10, viewBox: "0 0 26 10", "aria-hidden": "true", style: "vertical-align:middle;margin-right:4px" },
        S.svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, style: `stroke:var(${COL[a]});stroke-width:2.4;stroke-dasharray:${DASH[a].join(" ") || "none"}` }));
      const bt = h("button", { class: "btn ghost", type: "button", style: { padding: "2px 8px", fontSize: ".8rem" }, "aria-pressed": "true", title: "Скрий / покажи" }, sw, NAME[a]);
      bt.onclick = () => { if (hidden.has(a)) hidden.delete(a); else hidden.add(a); bt.setAttribute("aria-pressed", String(!hidden.has(a))); bt.style.opacity = hidden.has(a) ? ".4" : ""; drawCurve(); };
      leg.append(bt);
    });
    leg.style.display = "flex"; leg.style.flexWrap = "wrap"; leg.style.gap = "4px";
    leg.append(h("span", { class: "muted", style: { fontSize: ".8rem", alignSelf: "center" }, text: "щракни за скриване / показване" }));
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
        if (hidden.has(a)) return;
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

  S.chapter({ id: "sortirovki", order: 7, num: "7", group: "Задължителни парадигми", title: "Лаборатория за сортиране", lead: "Четиринадесет метода върху един и същ вход: пряк избор, мехурче, вмъкване, сливане, бързо, пирамидално, Shell, шейкър, гребен, gnome, броене, поразредно, сливане отдолу нагоре и трипосочно бързо. Броячи, които съвпадат с C, дърво на рекурсията и пирамидата, състезание n² срещу n log n и стабилност.", html, mount, algos });
})();
