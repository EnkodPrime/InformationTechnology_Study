/* Раздел 3 — последователна и паралелна обработка: Флин, SISD срещу SIMD,
   конкурентност срещу паралелност (кръгово разпределение), споделена и разпределена памет. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Същото като vec_add_sisd / vec_add_simd в c/03_parallel.c */
    vec_add({ n, W, mode }) {
      n = S.int(n, 0, 19, "n"); W = S.int(W, 2, 8, "Ширина W");
      if (![2, 4, 8].includes(W)) throw new Error("Ширината трябва да е 2, 4 или 8 ленти.");
      const a = Array.from({ length: n }, (_, i) => i + 1), b = a.map((x) => 10 * x), c = Array(n).fill(null);
      const F = [];
      let ops = 0;
      const snap = (o) => F.push(Object.assign({ a, b, c: c.slice(), W, mode, stats: { инструкции: ops } }, o));
      if (mode === "sisd") {
        snap({ at: "s_loop", lanes: [], vars: { n, i: 0 }, msg: `SISD: ${n} елемента → очакваме ${n} скаларни събирания.` });
        for (let i = 0; i < n; i++) {
          c[i] = a[i] + b[i]; ops++;
          snap({ at: "s_add", lanes: [i], vars: { i, "c[i]": c[i] }, msg: `Една скаларна инструкция: c[${i}] = ${a[i]} + ${b[i]} = ${c[i]}.`, log: `ADD #${ops}: c[${i}]` });
        }
        snap({ at: "s_ret", lanes: [], done: true, vars: { ops }, msg: `Общо <b>${ops}</b> инструкции за събиране.` });
      } else {
        let i = 0;
        snap({ at: "v_loop", lanes: [], vars: { n, W, i }, msg: `SIMD с ${W} ленти: ⌊${n}/${W}⌋ = ${Math.floor(n / W)} векторни + ${n % W} скаларни за опашката.` });
        for (; i + W <= n; i += W) {
          const lanes = [];
          for (let l = 0; l < W; l++) { c[i + l] = a[i + l] + b[i + l]; lanes.push(i + l); }
          ops++;
          snap({ at: ["v_add", "v_cnt"], lanes, vec: true, vars: { i, W }, msg: `<b>Една</b> векторна инструкция събира ${W} ленти: ${lanes.map((k) => `${a[k]}+${b[k]}`).join(", ")}.`, log: `VADD #${ops}: c[${i}..${i + W - 1}]` });
        }
        for (; i < n; i++) {
          c[i] = a[i] + b[i]; ops++;
          snap({ at: ["t_add", "t_loop"], lanes: [i], vars: { i }, msg: `Опашка: остават по-малко от ${W} елемента — скаларно c[${i}] = ${c[i]}.`, log: `ADD #${ops}: c[${i}] (опашка)` });
        }
        snap({ at: "v_ret", lanes: [], done: true, vars: { ops }, msg: `Общо <b>${ops}</b> инструкции (срещу ${n} при SISD). Операцията е една и съща за всички ленти — данните са различни.` });
      }
      return { frames: F, result: ops, sum: c.reduce((s, x) => s + (x || 0), 0) };
    },

    /** Същото като round_robin() в c/03_parallel.c */
    round_robin({ lens, deps, cores, q }) {
      const len = S.parseNums(lens, { min: 1, max: 9, minLen: 1, maxLen: 6 });
      const n = len.length;
      cores = S.int(cores, 1, 4, "Брой ядра"); q = S.int(q, 0, 9, "Квант");
      const dep = Array(n).fill(-1);
      const dstr = String(deps).trim();
      if (dstr) for (const part of dstr.split(/[\s,;]+/).filter(Boolean)) {
        const m = /^([A-F])<([A-F])$/i.exec(part);
        if (!m) throw new Error(`„${part}“: зависимост се пише като B<A („B чака A“).`);
        const x = m[1].toUpperCase().charCodeAt(0) - 65, y = m[2].toUpperCase().charCodeAt(0) - 65;
        if (x >= n || y >= n) throw new Error(`Задача ${m[x >= n ? 1 : 2].toUpperCase()} не съществува.`);
        if (x === y) throw new Error("Задача не може да чака себе си.");
        dep[x] = y;
      }
      // цикли в зависимостите
      for (let i = 0; i < n; i++) { let k = i, s = 0; while (k >= 0 && s <= n) { k = dep[k]; s++; } if (s > n) throw new Error("Зависимостите образуват цикъл — никоя задача не може да започне."); }
      const L = (i) => String.fromCharCode(65 + i);
      const rem = len.slice(), queued = Array(n).fill(0), fin = Array(n).fill(-1), queue = [];
      const cur = Array(cores).fill(-1), used = Array(cores).fill(0), tl = Array.from({ length: cores }, () => []);
      let done = 0, t = 0;
      const F = [];
      const snap = (o) => F.push(Object.assign({ n, len, rem: rem.slice(), fin: fin.slice(), cores, tl: tl.map((r) => r.slice()), queue: queue.slice(), cur: cur.slice(), t, stats: { време: t, завършени: done } }, o));
      snap({ at: "loop", vars: { cores, q }, msg: `${n} задачи (${len.map((x, i) => L(i) + "=" + x).join(", ")}) върху ${cores} ${cores === 1 ? "ядро" : "ядра"}, квант ${q || "∞ (без отнемане)"}.` });
      while (done < n && t < 200) {
        const add = [];
        for (let i = 0; i < n; i++) if (!queued[i] && (dep[i] < 0 || fin[dep[i]] >= 0)) { queue.push(i); queued[i] = 1; add.push(L(i)); }
        const pre = [];
        for (let k = 0; k < cores; k++) if (cur[k] >= 0 && q > 0 && used[k] === q) { queue.push(cur[k]); pre.push(L(cur[k])); cur[k] = -1; }
        const pick = [];
        for (let k = 0; k < cores; k++) if (cur[k] < 0 && queue.length) { cur[k] = queue.shift(); used[k] = 0; pick.push(`ядро ${k}←${L(cur[k])}`); }
        snap({ at: pre.length ? ["pick", "preempt"] : add.length ? ["pick", "ready"] : "pick", vars: { t }, msg: `Момент ${t}.${add.length ? ` Готови: ${add.join(", ")}.` : ""}${pre.length ? ` Изтекъл квант: ${pre.join(", ")} обратно в опашката.` : ""}${pick.length ? ` Избор: ${pick.join(", ")}.` : ""}` });
        const fn = [];
        for (let k = 0; k < cores; k++) {
          tl[k][t] = cur[k];
          if (cur[k] < 0) continue;
          rem[cur[k]]--; used[k]++;
          if (rem[cur[k]] === 0) { fin[cur[k]] = t + 1; done++; fn.push(L(cur[k])); cur[k] = -1; }
        }
        t++;
        const run = tl.map((r, k) => r[t - 1] >= 0 ? `ядро ${k}: ${L(r[t - 1])}` : `ядро ${k}: празно`).join("; ");
        snap({ at: fn.length ? ["finish", "run"] : "run", vars: { t }, msg: `Единица ${t - 1}→${t}: ${run}.${fn.length ? ` Завършва ${fn.join(", ")}.` : ""}`, log: `t=${t}: ${tl.map((r) => (r[t - 1] >= 0 ? L(r[t - 1]) : "·")).join(" ")}` });
      }
      const busy = tl.reduce((s, r) => s + r.filter((x) => x >= 0).length, 0);
      snap({ at: "ret", done: true, vars: { T: t }, msg: `Край в момент <b>${t}</b>. Сумата от работата е ${len.reduce((a, b) => a + b, 0)}; заетост ${busy}/${t * cores} = ${Math.round((100 * busy) / (t * cores))}%.${cores === 1 ? " На едно ядро задачите са <b>конкурентни</b> (редуват се), но не паралелни." : " Задачи на различни ядра в един момент са <b>паралелни</b>."}` });
      const lines = tl.map((r) => Array.from({ length: t }, (_, k) => (r[k] >= 0 ? L(r[k]) : ".")).join(""));
      return { frames: F, T: t, fin, result: `${t} | ${fin.join(" ")} | ${lines.join(" ")}` };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>При последователното решаване действията се изпълняват едно след друго. Паралелната обработка изпълнява едновременно части от работата чрез повече изчислителни ресурси. <dfn data-g="конкурентност">Конкурентността</dfn> означава съвместно напредване на задачи и е възможна дори върху едно ядро чрез превключване; <dfn data-g="паралелност">паралелността</dfn> предполага действително едновременно изпълнение.</p>
</div>

<div class="block">
  <h3>Класификацията на Флин — две оси</h3>
  <p class="prose"><dfn data-g="флин">Класификацията на Флин</dfn> разглежда броя потоци от инструкции и данни. <dfn data-g="sisd">SISD</dfn>, <dfn data-g="simd">SIMD</dfn>, <dfn data-g="misd">MISD</dfn> и <dfn data-g="mimd">MIMD</dfn> са четирите клетки. Поток инструкции е последователност от управляващи операции, а поток данни — последователност от обработвани стойности. Щракни клетка.</p>
  <div id="flynn"></div>
  <div class="key" id="flynn-d"></div>
  <details class="trap"><summary>Капан: MISD = конвейер?</summary><div>
    <p>Не. <dfn data-g="misd">MISD</dfn> е рядка формална категория с различни потоци инструкции върху един поток данни. Не трябва да се използва като общо название на конвейера — конвейерът припокрива етапи на <i>последователни</i> инструкции от един поток.</p>
  </div></details>
  <details class="trap"><summary>Капан: CUDA — пети клас?</summary><div>
    <p><dfn data-g="gpu">GPU</dfn> често се програмира чрез <dfn data-g="simt">SIMT</dfn> — нишките в група споделят изпълнение на инструкции, но програмният модел и поведението при разклонения изискват отделно обяснение. CUDA е програмна платформа, а не отделен клас по Флин.</p>
  </div></details>
</div>

<div class="block">
  <h3>SISD срещу SIMD: една инструкция върху няколко ленти</h3>
  <p class="prose"><dfn data-g="simd">SIMD</dfn> прилага една инструкция върху множество елементи и е подходящ за векторни операции. При векторно събиране [1,2,3]+[10,20,30] резултатът е [11,22,33]: позициите са различни данни, действието е общо. Конкретната ширина и типовете зависят от ISA; пример е векторно събиране с Arm NEON.</p>
  <div id="v-simd"></div>
  <details class="hint"><summary>Хинт: защо C кодът има вътрешен цикъл по лентите</summary><div>
    <p>Преносимият C11 няма векторни типове. Вътрешният цикъл <i>изобразява</i> една векторна инструкция — в реален код на Arm това би било например <code>vaddq_s32</code> от NEON (4 × int32). Броячът <code>ops</code> брои тези „инструкции“, а не итерациите на вътрешния цикъл. Компилаторът често сам векторизира такъв цикъл при <code>-O2/-O3</code>.</p>
    <p>Формулата за брой инструкции: ⌊n/W⌋ + (n mod W).</p>
  </div></details>
</div>

<div class="block">
  <h3>MIMD: независими потоци инструкции</h3>
  <p class="prose">При <dfn data-g="mimd">MIMD</dfn> отделни изпълнители могат да напредват по различни инструкции: едно ядро декодира аудио, друго обработва мрежови пакети. Дори ако двете ядра в даден момент случайно изпълняват ADD, организацията не става SIMD — класификацията описва възможността за независимо управление, а не съвпадението на конкретен такт. Многоядрените Intel Core и AMD Ryzen са примери за MIMD на равнище ядра.</p>
  <div id="mimd"></div>
  <details class="hint"><summary>Хинт: може ли процесор да е едновременно MIMD и SIMD?</summary><div>
    <p>Да, когато описваме различни равнища. Независимите ядра са MIMD; векторната операция във всяко ядро е SIMD. Не са дадени две противоположни оценки за едно и също равнище.</p>
  </div></details>
</div>

<div class="block">
  <h3>Конкурентност и паралелност</h3>
  <p class="prose">Две задачи са конкурентни, ако напредъкът им се организира в припокриващи се интервали. На едно ядро това става чрез редуване; паралелността изисква едновременна работа на различни ресурси. Симулаторът разпределя задачи (A–F) кръгово (round robin) върху 1–4 ядра. <b>Квантът</b> е колко единици задачата работи, преди да бъде върната в опашката (0 = до край). Зависимост <code>B&lt;A</code> означава „B чака да завърши A“.</p>
  <div id="v-rr"></div>
  <details class="hint"><summary>Хинт: зависимостите ограничават паралелизма</summary><div>
    <p>Ако B използва резултата на A, произволното им едновременно стартиране не премахва зависимостта. Пусни „Верига“ с 4 ядра: две от ядрата остават празни. Паралелизируемостта е свойство на работата и нейните зависимости; наличните ядра са само ресурс за използването ѝ.</p>
    <p>Времевата скала е условна и пренебрегва разходите за превключване.</p>
  </div></details>
</div>

<div class="block">
  <h3>Споделена и разпределена памет</h3>
  <div class="row" id="mem-btns"></div>
  <div id="mem-svg"></div>
  <div class="key" id="mem-d"></div>
  <p class="prose">Многоядрен процесор, клъстер и графичен ускорител представляват различни организации, а не просто различен брой еднакви ядра. <span class="extra-tag">извън конспекта</span> OpenMP е модел и набор от интерфейси за паралелно програмиране със <dfn data-g="споделена памет">споделена памет</dfn>; MPI е стандарт за обмен на съобщения (<dfn data-g="разпределена памет">разпределена памет</dfn>). Те не са процесорни архитектури.</p>
</div>

<div class="key"><b>За запомняне.</b> Флин: две оси — потоци инструкции × потоци данни. SIMD = една операция, много ленти. MIMD = независимо управление. Конкурентност = редуване; паралелност = едновременност. Зависимостите, не ядрата, определят колко паралелизъм има.</div>`;

  const FLYNN = {
    SISD: { g: "sisd", d: "Един поток инструкции върху един поток данни. Класически последователен процесор.", ex: "Скаларно събиране в цикъл; простото учебно CPU от раздел 2." },
    SIMD: { g: "simd", d: "Една инструкция задава еднаква операция върху няколко позиции.", ex: "Arm NEON: векторно събиране [1,2,3]+[10,20,30] = [11,22,33]." },
    MISD: { g: "misd", d: "Различни потоци инструкции върху един поток данни. Рядка формална категория.", ex: "Не е синоним на конвейер. Ръководството не дава масов пример." },
    MIMD: { g: "mimd", d: "Различни процесори изпълняват различни инструкции върху различни данни.", ex: "Многоядрени Intel Core и AMD Ryzen; клъстер от възли." },
  };

  let mk = 0;
  function mount(root) {
    // Флин
    const fl = root.querySelector("#flynn"), fd = root.querySelector("#flynn-d");
    const tbl = h("table", { class: "t grid" });
    tbl.append(h("tr", null, h("th", { text: "" }), h("th", { text: "един поток данни" }), h("th", { text: "много потоци данни" })));
    const cells = {};
    [["един поток инструкции", "SISD", "SIMD"], ["много потоци инструкции", "MISD", "MIMD"]].forEach(([r, x, y]) => {
      const tr = h("tr", null, h("th", { text: r }));
      [x, y].forEach((k) => { const b = h("button", { class: "btn", style: { width: "100%" }, text: k, onclick: () => pickF(k) }); cells[k] = b; tr.append(h("td", null, b)); });
      tbl.append(tr);
    });
    fl.append(h("div", { class: "tbl-wrap" }, tbl));
    function pickF(k) {
      Object.keys(cells).forEach((x) => cells[x].setAttribute("aria-pressed", x === k ? "true" : "false"));
      fd.innerHTML = `<p><b>${k}</b> — ${FLYNN[k].d}</p><p class="muted">Пример: ${FLYNN[k].ex}</p>`;
    }
    pickF("SIMD");

    // SIMD
    S.viz(root.querySelector("#v-simd"), {
      id: "simd", title: "c[i] = a[i] + b[i] — колко инструкции?", sub: "a = 1, 2, 3, …; b = 10, 20, 30, …",
      code: "ch03_simd",
      inputs: [{ id: "n", label: "n (0..19)", type: "number", value: 10, width: "6em" }, { id: "W", label: "ленти W", type: "select", value: 4, options: [2, 4, 8] },
        { id: "mode", label: "Режим", type: "select", value: "simd", options: [["sisd", "SISD (скаларно)"], ["simd", "SIMD (векторно)"]] }],
      presets: [{ label: "n = 3 (ръководството)", values: { n: 3, W: 4 } }, { label: "n = 16, W = 8", values: { n: 16, W: 8 } }],
      legend: [["s-act", "текуща инструкция"], ["s-done", "изчислено"]],
      build: algos.vec_add,
      draw(st, f) {
        st.innerHTML = "";
        if (!f.a.length) { st.append(h("p", { class: "muted", text: "n = 0: няма елементи, няма инструкции." })); return; }
        const cls = {}; f.lanes.forEach((k) => (cls[k] = "s-act"));
        const done = {}; f.c.forEach((v, k) => { if (v != null && !cls[k]) done[k] = "s-done"; });
        const gap = f.mode === "simd" ? Array.from({ length: Math.floor((f.a.length - 1) / f.W) }, (_, k) => (k + 1) * f.W) : [];
        st.append(h("span", { class: "eyebrow", text: "a" })); S.drawArray(st, f.a, { cls, gapAt: gap, append: true, index: false });
        st.append(h("span", { class: "eyebrow", text: "b" })); S.drawArray(st, f.b, { cls, gapAt: gap, append: true, index: false });
        st.append(h("span", { class: "eyebrow", text: "c = a + b" })); S.drawArray(st, f.c, { cls: Object.assign({}, done, cls), gapAt: gap, append: true });
      },
    });

    // MIMD
    {
      const W = 560, H = 150;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const cores = [["Ядро 0", "декодира аудио", ["LOAD", "MUL", "ADD", "STORE"]], ["Ядро 1", "мрежови пакети", ["LOAD", "CMP", "BEQ", "ADD"]], ["Ядро 2", "VADD (SIMD) ×4", ["VLD", "VADD", "VADD", "VST"]]];
      cores.forEach(([n, d, ins], k) => {
        const y = 10 + k * 46;
        svg.append(S.svg("text", { x: 10, y: y + 22, "font-weight": 600, text: n }));
        svg.append(S.svg("text", { x: 70, y: y + 22, class: "wt", text: d }));
        ins.forEach((s, j) => {
          const g = S.svg("g", { class: "node " + (j === 2 && s === "ADD" ? "s-cmp" : k === 2 ? "s-piv" : "") });
          g.append(S.svg("rect", { x: 220 + j * 82, y, width: 76, height: 34, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 1.5 }));
          g.append(S.svg("text", { x: 258 + j * 82, y: y + 22, "text-anchor": "middle", text: s }));
          svg.append(g);
        });
      });
      const box = root.querySelector("#mimd");
      box.append(svg, h("p", { class: "muted", html: "Всеки ред е независим поток инструкции. Оранжевите ADD случайно съвпадат — това не прави системата SIMD. Ядро 2 използва SIMD инструкции <i>вътре</i> в MIMD системата." }));
    }

    // round robin
    S.viz(root.querySelector("#v-rr"), {
      id: "rr", title: "Разпределение на задачи по ядра", sub: "Всеки ред е ядро; всяка клетка — една единица време",
      code: "ch03_rr",
      inputs: [{ id: "lens", label: "Продължителности A B C …", value: "4 3 2", width: "10em" }, { id: "deps", label: "Зависимости (B<A …)", value: "", width: "9em" },
        { id: "cores", label: "Ядра", type: "select", value: 1, options: [1, 2, 3, 4] }, { id: "q", label: "Квант (0 = ∞)", type: "number", value: 1, width: "5em" }],
      presets: [{ label: "1 ядро: конкурентност", values: { lens: "4 3 2", deps: "", cores: 1, q: 1 } }, { label: "3 ядра: паралелност", values: { lens: "4 3 2", deps: "", cores: 3, q: 2 } },
        { label: "Верига", values: { lens: "3 3 3 3", deps: "B<A D<C", cores: 4, q: 0 } }, { label: "Сложен граф", values: { lens: "5 1 4 2 3 2", deps: "C<A E<B F<D", cores: 2, q: 2 } }],
      legend: [["s-act", "работи"], ["s-done", "завършена"], ["s-dim", "празно ядро"]],
      build: algos.round_robin,
      draw(st, f) {
        st.innerHTML = "";
        const L = (i) => String.fromCharCode(65 + i);
        const T = Math.max(f.t, 1);
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "" }), ...Array.from({ length: T }, (_, k) => h("th", { text: k }))));
        for (let c = 0; c < f.cores; c++) {
          const tr = h("tr", null, h("th", { text: "ядро " + c }));
          for (let k = 0; k < T; k++) {
            const v = f.tl[c][k];
            tr.append(h("td", { class: v == null ? "" : v < 0 ? "s-dim" : k === f.t - 1 ? "s-act" : "", style: v >= 0 ? { background: `hsl(${(v * 57) % 360} 55% 50% / .22)` } : null, text: v == null ? "" : v < 0 ? "·" : L(v) }));
          }
          tb.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, tb));
        const info = h("div", { class: "row", style: { marginTop: "8px" } });
        for (let i = 0; i < f.n; i++) info.append(h("span", { class: "pill " + (f.fin[i] >= 0 ? "s-done" : f.cur.includes(i) ? "s-act" : ""), text: `${L(i)}: ${f.len[i] - f.rem[i]}/${f.len[i]}${f.fin[i] >= 0 ? " ✓ t=" + f.fin[i] : ""}` }));
        st.append(info);
        st.append(h("p", { class: "muted", text: "Опашка: " + (f.queue.length ? f.queue.map(L).join(" ") : "празна") }));
      },
    });

    // памет
    const MEM = {
      sh: { t: "Споделена памет", d: "Участниците обменят данни чрез общи адреси: ядро 1 записва x, ядро 2 го чете от същия адрес. Нужна е синхронизация, за да се знае кога стойността е готова." },
      di: { t: "Разпределена памет", d: "Всеки възел има собствена памет; обменът е чрез съобщения по мрежа. Адрес в паметта на възел 1 не означава нищо за възел 2." },
      cl: { t: "Клъстер (смесено)", d: "Един клъстер може да комбинира и двете организации: вътре във възела ядрата споделят памет, между възлите — съобщения." },
    };
    const mb = root.querySelector("#mem-btns"), ms = root.querySelector("#mem-svg"), md = root.querySelector("#mem-d");
    const btn = Object.keys(MEM).map((k) => h("button", { class: "btn", text: MEM[k].t, onclick: () => drawMem(k) }));
    mb.append(...btn);
    function drawMem(k) {
      btn.forEach((b, i) => b.setAttribute("aria-pressed", Object.keys(MEM)[i] === k ? "true" : "false"));
      const W = 560, H = 200, id = "mm" + (mk++);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const d = S.svg("defs"); d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))); svg.append(d);
      const R = (x, y, w, hh, t, cls) => { const g = S.svg("g", { class: "node " + (cls || "") }); g.append(S.svg("rect", { x, y, width: w, height: hh, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 })); g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + 5, "text-anchor": "middle", text: t })); svg.append(g); };
      const A = (x1, y1, x2, y2, cls, both) => { const l = S.svg("line", { x1, y1, x2, y2, class: "edge " + (cls || ""), "marker-end": `url(#${id})`, "marker-start": both ? `url(#${id})` : null }); l.style.color = cls ? "var(--c)" : "var(--ink-2)"; svg.append(l); };
      if (k === "sh") {
        [0, 1, 2, 3].forEach((i) => { R(30 + i * 130, 20, 100, 40, "ядро " + i, i === 1 || i === 2 ? "s-act" : ""); A(80 + i * 130, 60, 80 + i * 130, 128, i === 1 || i === 2 ? "s-act" : "", true); });
        R(30, 130, 490, 50, "обща памет · адрес на x", "s-piv");
      } else if (k === "di") {
        [0, 1, 2].forEach((i) => { R(30 + i * 180, 20, 120, 40, "възел " + i, i < 2 ? "s-act" : ""); R(30 + i * 180, 90, 120, 40, "памет " + i, ""); A(90 + i * 180, 60, 90 + i * 180, 88, "", true); });
        A(150, 40, 208, 40, "s-piv", true); A(330, 40, 388, 40, "s-piv", true);
        svg.append(S.svg("text", { x: 280, y: 175, "text-anchor": "middle", class: "wt", text: "съобщения по мрежа (send / receive)" }));
      } else {
        [0, 1].forEach((n) => {
          const x0 = 20 + n * 280;
          R(x0, 10, 240, 175, "", "");
          [0, 1].forEach((i) => { R(x0 + 15 + i * 115, 30, 95, 36, "ядро " + i, "s-act"); A(x0 + 62 + i * 115, 66, x0 + 62 + i * 115, 108, "s-act", true); });
          R(x0 + 15, 110, 210, 36, "обща памет на възела", "s-piv");
          svg.append(S.svg("text", { x: x0 + 120, y: 172, "text-anchor": "middle", class: "wt", text: "възел " + n }));
        });
        A(260, 128, 298, 128, "s-cmp", true);
      }
      ms.innerHTML = ""; ms.append(svg);
      md.innerHTML = `<p><b>${MEM[k].t}.</b> ${MEM[k].d}</p>`;
    }
    drawMem("sh");
  }

  S.chapter({ id: "paralelna", order: 3, num: "3", group: "Паралелизъм", title: "Последователна и паралелна обработка",
    lead: "Флин като две оси, SIMD срещу SISD в брой инструкции, конкурентност срещу паралелност и организации на паметта.", html, mount, algos });
})();
