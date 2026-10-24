/* Раздел 6 — йерархия на паметта: нива, локалност, кеш симулатор (tag/index/offset,
   директно / по набори / напълно асоциативен, LRU/FIFO, write-back/through), обхождане
   по редове срещу колони, AMAT. */
(function () {
  const S = window.Study, h = S.h;

  const log2 = (x) => { let k = 0; while ((1 << k) < x) k++; return k; };
  const pow2 = (x) => x > 0 && (x & (x - 1)) === 0;

  function mkCache({ sets, ways, block, lru, wb }) {
    sets = S.int(sets, 1, 16, "Брой набори"); ways = S.int(ways, 1, 8, "Линии в набор"); block = S.int(block, 4, 64, "Размер на линията");
    if (!pow2(sets)) throw new Error("Броят набори трябва да е степен на 2.");
    if (!pow2(block)) throw new Error("Размерът на линията трябва да е степен на 2.");
    if (sets * ways > 64) throw new Error("Най-много 64 линии общо.");
    return { sets, ways, block, lru: lru === true || lru === "lru", wb: wb === true || wb === "wb", L: Array.from({ length: sets * ways }, () => ({ valid: 0, dirty: 0, tag: 0, stamp: 0 })), clock: 0, hits: 0, misses: 0, evictions: 0, writebacks: 0, mem_writes: 0 };
  }
  /** Същото като cache_access() в c/06_cache.c; връща подробности за кадъра. */
  function access(c, addr, isW) {
    const ob = log2(c.block), ib = log2(c.sets);
    const offset = addr & (c.block - 1), index = (addr >>> ob) & (c.sets - 1), tag = addr >>> (ob + ib);
    const base = index * c.ways;
    c.clock++;
    const r = { addr, isW, offset, index, tag, ob, ib, way: -1, hit: false, victim: -1, evicted: null, wbk: false, noalloc: false, wthrough: false };
    for (let w = 0; w < c.ways; w++) {
      const L = c.L[base + w];
      if (L.valid && L.tag === tag) {
        c.hits++; r.hit = true; r.way = w;
        if (c.lru) L.stamp = c.clock;
        if (isW) { if (c.wb) L.dirty = 1; else { c.mem_writes++; r.wthrough = true; } }
        return r;
      }
    }
    c.misses++;
    if (isW && !c.wb) { c.mem_writes++; r.noalloc = true; return r; }
    let v = -1;
    for (let w = 0; w < c.ways; w++) if (!c.L[base + w].valid) { v = w; break; }
    if (v < 0) {
      v = 0;
      for (let w = 1; w < c.ways; w++) if (c.L[base + w].stamp < c.L[base + v].stamp) v = w;
      c.evictions++;
      const old = c.L[base + v];
      r.evicted = { tag: old.tag, dirty: old.dirty, addr: ((old.tag << ib) | index) << ob };
      if (old.dirty) { c.writebacks++; c.mem_writes++; r.wbk = true; }
    }
    Object.assign(c.L[base + v], { valid: 1, tag, dirty: isW ? 1 : 0, stamp: c.clock });
    r.way = v; r.victim = v;
    return r;
  }

  function parseTrace(str) {
    const toks = String(str).trim().split(/[\s,;]+/).filter(Boolean);
    if (!toks.length) throw new Error("Въведи поне един адрес.");
    if (toks.length > 40) throw new Error("Най-много 40 достъпа.");
    return toks.map((t) => {
      const m = /^(W)?(0x[0-9a-f]+|\d+)$/i.exec(t);
      if (!m) throw new Error(`„${t}“: адресът е число (десетично или 0x…); W отпред = запис, напр. W64.`);
      const a = Number(m[2]);
      if (a > 0xffff) throw new Error("Адресите са до 0xFFFF (16 бита).");
      return { a, w: m[1] ? 1 : 0 };
    });
  }

  const algos = {
    mkCache, access, parseTrace,
    cache_sim({ trace, sets, ways, block, lru, wb }) {
      const tr = parseTrace(trace), c = mkCache({ sets, ways, block, lru, wb });
      const F = [], hm = [];
      const snapL = () => c.L.map((x) => ({ ...x }));
      const st = () => ({ попадения: c.hits, пропуски: c.misses, изместени: c.evictions, "write-back": c.writebacks, "записи към RAM": c.mem_writes });
      F.push({ L: snapL(), c: { sets: c.sets, ways: c.ways, block: c.block }, hm: [], tr, k: -1, at: null, stats: st(), vars: { "offset бита": log2(c.block), "index бита": log2(c.sets) },
        msg: `Кеш: ${c.sets} ${c.sets === 1 ? "набор" : "набора"} × ${c.ways} ${c.ways === 1 ? "линия" : "линии"} × ${c.block} B = ${c.sets * c.ways * c.block} B. ${c.ways === 1 ? "<b>Директно съответствие</b>" : c.sets === 1 ? "<b>Напълно асоциативен</b>" : `<b>${c.ways}-пътно асоциативен по набори</b>`}; ${c.lru ? "LRU" : "FIFO"}; ${c.wb ? "write-back + write-allocate" : "write-through + no-write-allocate"}. Адрес = tag | index (${log2(c.sets)} б.) | offset (${log2(c.block)} б.).` });
      tr.forEach((x, k) => {
        const r = access(c, x.a, x.w);
        F.push({ L: snapL(), c: { sets: c.sets, ways: c.ways, block: c.block }, hm: hm.slice(), tr, k, r, phase: "split", at: "split", stats: F[F.length - 1].stats,
          vars: { адрес: x.a, tag: r.tag, index: r.index, offset: r.offset }, msg: `${x.w ? "Запис" : "Четене"} на адрес <b>${x.a}</b> = 0x${x.a.toString(16)}: tag = ${r.tag}, index = ${r.index}, offset = ${r.offset}. Търсим в набор ${r.index}.`, Lprev: F[F.length - 1].L });
        hm.push(r.hit ? "H" : "M");
        let msg, at;
        if (r.hit) {
          at = r.isW ? (c.wb ? ["hit", "wdirty"] : ["hit", "wthrough"]) : ["hit", "cmp"];
          msg = `<b>Попадение</b> в набор ${r.index}, линия ${r.way} (tag ${r.tag}).${c.lru ? " LRU обновява печата за последно ползване." : " FIFO не променя реда."}${r.isW ? (c.wb ? " Линията става <b>dirty</b> — RAM ще се обнови при изместване." : " Write-through: записът отива и към RAM.") : ""}`;
        } else if (r.noalloc) {
          at = ["miss", "wnoalloc"];
          msg = `<b>Пропуск</b> при запис; no-write-allocate: записваме направо в RAM, линия не се зарежда.`;
        } else if (r.evicted) {
          at = r.wbk ? ["evict", "wb", "fill"] : ["evict", "victim", "fill"];
          msg = `<b>Пропуск</b>. Наборът е пълен — изместваме линия ${r.victim} (tag ${r.evicted.tag}, блок от адрес ${r.evicted.addr}), избрана по ${c.lru ? "LRU (най-отдавна използвана)" : "FIFO (най-отдавна заредена)"}.${r.wbk ? " Тя е <b>dirty</b> → записва се обратно в RAM." : ""} Зареждаме блока ${x.a - r.offset}…${x.a - r.offset + c.block - 1}.`;
        } else {
          at = ["miss", "free", "fill"];
          msg = `<b>Пропуск</b> (студен). Свободна линия ${r.way} в набор ${r.index}; зареждаме целия блок ${x.a - r.offset}…${x.a - r.offset + c.block - 1} — съседните адреси вече ще попадат.`;
        }
        F.push({ L: snapL(), c: { sets: c.sets, ways: c.ways, block: c.block }, hm: hm.slice(), tr, k, r, phase: "res", at, stats: st(), vars: { адрес: x.a, tag: r.tag, index: r.index, offset: r.offset, резултат: r.hit ? "H" : "M" }, msg, log: `${x.w ? "W" : "R"} ${x.a}: ${r.hit ? "H" : "M"}${r.evicted ? " (изм.)" : ""}` });
      });
      const tot = c.hits + c.misses;
      F.push(Object.assign({}, F[F.length - 1], { done: true, at: null, log: null, k: tr.length, msg: `Край: ${c.hits} попадения, ${c.misses} пропуска; дял на пропуските ${(c.misses / tot * 100).toFixed(1)}%.` }));
      return { frames: F, result: `${hm.join("")} ${c.hits} ${c.misses} ${c.evictions} ${c.writebacks} ${c.mem_writes}` };
    },

    /** Същото като walk() в C */
    walk({ R, C, sets, ways, block, order }) {
      R = S.int(R, 1, 16, "Редове"); C = S.int(C, 1, 16, "Колони");
      const c = mkCache({ sets, ways, block, lru: true, wb: true });
      const rows = order === "rows", F = [];
      const res = Array.from({ length: R }, () => Array(C).fill(null));
      const outer = rows ? R : C, inner = rows ? C : R;
      F.push({ R, C, res: res.map((r) => r.slice()), at: "outer", cur: null, stats: { попадения: 0, пропуски: 0 }, vars: { R, C }, msg: `int m[${R}][${C}] — редово разположение: адрес(i, j) = (i·${C} + j)·4. Един ред заема ${C * 4} B; линията е ${c.block} B = ${c.block / 4} елемента.` });
      for (let a = 0; a < outer; a++) for (let b = 0; b < inner; b++) {
        const i = rows ? a : b, j = rows ? b : a, addr = (i * C + j) * 4;
        const r = access(c, addr, 0);
        res[i][j] = r.hit ? "H" : "M";
        F.push({ R, C, res: res.map((x) => x.slice()), cur: [i, j], at: ["acc", "addr"], stats: { попадения: c.hits, пропуски: c.misses }, vars: { i, j, адрес: addr, линия: Math.floor(addr / c.block) },
          msg: `m[${i}][${j}] → адрес ${addr}, линия ${Math.floor(addr / c.block)}: <b>${r.hit ? "попадение" : "пропуск"}</b>.${!r.hit && r.evicted ? " Изместена е по-стара линия." : ""}` });
      }
      F.push(Object.assign({}, F[F.length - 1], { cur: null, done: true, at: "inner", msg: `Край: ${c.hits} попадения, ${c.misses} пропуска (${((c.misses / (R * C)) * 100).toFixed(0)}% пропуски). ${rows ? "По редове следващият елемент е съседен адрес — пространствена локалност." : `По колони стъпката е ${C * 4} B; ${C * 4 >= c.block ? "всеки достъп е в друга линия, а преди да се върнем към нея, тя често е изместена." : "няколко колони попадат в една линия."}`}` }));
      return { frames: F, result: `${c.hits} ${c.misses}`, hits: c.hits, misses: c.misses };
    },

    amat(t, m, p) { return t + m * p; },
    amat2(h1, m1, h2, m2, mem) { return algos.amat(h1, m1, algos.amat(h2, m2, mem)); },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Паметта се организира като <dfn data-g="йерархия на паметта">йерархия</dfn> с различна скорост, капацитет и цена: регистри, кешове, оперативна памет (<dfn data-g="ram">RAM</dfn>) и вторична памет (<dfn data-g="ssd">SSD</dfn>, <dfn data-g="hdd">HDD</dfn>). По-близките до процесора нива обикновено са по-бързи и по-малки. <dfn data-g="латентност">Латентността</dfn> е време до получаване на резултат, а <dfn data-g="пропускателна способност">пропускателната способност</dfn> е обем данни за единица време.</p>
</div>

<div class="block">
  <h3>Нивата на йерархията</h3>
  <div id="pyr"></div>
  <div class="key" id="pyr-d"></div>
</div>

<div class="block">
  <h3>Локалност и кеш линия</h3>
  <p class="prose">Йерархията използва <dfn data-g="времева локалност">времева</dfn> и <dfn data-g="пространствена локалност">пространствена</dfn> локалност. При времевата наскоро използвана стойност вероятно ще се използва отново; при пространствената вероятно ще се използват близки адреси. <dfn data-g="кеш">Кешът</dfn> пренася блокове, наречени <dfn data-g="кеш линия">кеш линии</dfn>. <dfn data-g="попадение">Попадение</dfn> означава налични данни, а <dfn data-g="пропуск">пропуск</dfn> изисква достъп до следващо ниво.</p>
  <p class="prose">Ако линията е 64 байта, достъпът до един байт може да доведе до пренасяне на целия съдържащ го блок. Съседните елементи в масив често използват вече заредени линии; в свързан списък възлите може да са на далечни адреси и всяка следваща връзка да изисква отделен достъп. Еднаква асимптотична сложност не означава еднакво използване на паметта.</p>
</div>

<div class="block">
  <h3>Кеш симулатор</h3>
  <p class="prose">При <dfn data-g="директно съответствие">директно съответствие</dfn> блокът има едно допустимо място; при <dfn data-g="асоциативен кеш">асоциативна</dfn> организация има избор. Адресът се разбива на <b>offset</b> (байт в линията, log₂(линия) бита), <b>index</b> (набор, log₂(набори) бита) и <b>tag</b> (останалото — кой блок е в линията). Въведи поредица адреси (W отпред = запис) и смени организацията.</p>
  <div id="v-cache"></div>
  <details class="hint"><summary>Хинт: конфликт на разполагането срещу недостиг на капацитет</summary><div>
    <p>При директно съответствие два често използвани блока могат да се изместват взаимно, въпреки че общият им обем е малък. Пусни „Конфликт 0/64“: при 4 набора × 16 B адресите 0 и 64 попадат в набор 0 и се гонят — 8 пропуска от 8. Със същия обем (64 B), но 2-пътен по набори, повторенията попадат. Това е конфликт на разполагането и се различава от недостиг на общ капацитет.</p>
  </div></details>
  <details class="hint"><summary>Хинт: LRU срещу FIFO</summary><div>
    <p><dfn data-g="lru">LRU</dfn> измества най-отдавна <i>използваната</i> линия; <dfn data-g="fifo">FIFO</dfn> — най-отдавна <i>заредената</i>, без значение колко често се ползва. В „LRU vs FIFO“ блокът 0 се ползва постоянно: LRU го пази, FIFO рано или късно го изхвърля. Политиките на замяна не са изброени в ръководството — добавени са като общоизвестни примери за „избор в множество места“.</p>
  </div></details>
  <details class="hint"><summary>Хинт: write-through и write-back</summary><div>
    <p><dfn data-g="write-through">Write-through</dfn> предава записите към следващото ниво; <dfn data-g="write-back">write-back</dfn> може да ги отложи до изместване на изменена (dirty) линия. Брояч „записи към RAM“ показва разликата. В симулатора write-through е съчетан с no-write-allocate, а write-back — с write-allocate (типичните комбинации).</p>
  </div></details>
</div>

<div class="block">
  <h3>Обхождане на матрица: по редове срещу по колони</h3>
  <p class="prose">В C <code>int m[R][C]</code> е разположен по редове: m[i][j] и m[i][j+1] са съседни адреси. Обхождането по редове използва всяка заредена линия докрай; по колони прескача с цял ред. Резултатът е същият, броят пропуски — не. Тема 4 показва същото за разполагането на структури.</p>
  <div id="v-walk"></div>
</div>

<div class="block">
  <h3>AMAT — средно време за достъп</h3>
  <p class="prose">В прост двунивов модел <dfn data-g="amat">AMAT</dfn> = време за попадение + дял на пропуските × наказание при пропуск. Наказанието е <b>допълнителното</b> време след проверката на кеша, за да няма двойно отчитане.</p>
  <div id="amat"></div>
  <div id="amat-code"></div>
  <div class="key"><span class="formula">AMAT = t<sub>hit</sub> + m · t<sub>penalty</sub></span> — 1 ns + 0,05 · 80 ns = <b>5 ns</b>. При две нива наказанието на L1 е самото AMAT на L2.</div>
  <details class="trap"><summary>Капан: наказанието включва ли времето за попадение?</summary><div>
    <p>Не в тази формулировка. Ако наказанието се дефинира като пълното време до следващото ниво (с проверката на кеша), формулата се променя — иначе проверката се брои два пъти. Казвай коя дефиниция използваш.</p>
  </div></details>
</div>

<div class="block">
  <h3>Кохерентност и модел на паметта</h3>
  <p class="prose">При множество ядра <dfn data-g="кеш кохерентност">кеш кохерентността</dfn> съгласува копията на една област; тя не е тъждествена на <dfn data-g="модел на паметта">модела за подредба</dfn> на всички операции към паметта. Кохерентността следи връзката между копия на една паметна област в различни ядра; моделът на паметта определя какъв ред на операции могат да наблюдават участниците. Едното не е пълен заместител на другото.</p>
  <details class="trap"><summary>Капан: виртуална памет = кеш?</summary><div>
    <p>Не. Виртуалната памет (тема 2) преобразува адресни пространства; тя не е синоним на процесорния кеш.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Регистри → кеш → RAM → вторична памет: по-бързо и по-малко нагоре. Кешът работи заради локалността и пренася линии. Адрес = tag | index | offset. AMAT = t<sub>hit</sub> + m·penalty. Кохерентност ≠ модел на паметта.</div>`;

  const LEVELS = [
    { t: "Регистри", d: "Най-близо до АЛУ; част от архитектурното състояние. Регистровият номер не е адрес в RAM.", w: 120 },
    { t: "Кеш L1 (I и D)", d: "Копия на блокове; често разделен на инструкции и данни (смесена организация).", w: 200 },
    { t: "Кеш L2 / L3", d: "По-големи и по-бавни нива; при пропуск в L1 се търси тук.", w: 280 },
    { t: "Оперативна памет (RAM)", d: "Адресируема основна памет на системата.", w: 380 },
    { t: "Вторична памет (SSD / HDD)", d: "Най-голям капацитет, най-висока латентност; достъпът минава през подсистемата за вход и изход.", w: 480 },
  ];

  function mount(root) {
    // пирамида
    {
      const W = 500, H = 230, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const det = root.querySelector("#pyr-d");
      const gs = LEVELS.map((L, i) => {
        const g = S.svg("g", { class: "node", style: "cursor:pointer", tabindex: 0, role: "button", onclick: () => pick(i), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } } });
        g.append(S.svg("rect", { x: (W - L.w) / 2, y: 10 + i * 42, width: L.w, height: 36, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
        g.append(S.svg("text", { x: W / 2, y: 33 + i * 42, "text-anchor": "middle", text: L.t }));
        svg.append(g); return g;
      });
      function pick(i) { gs.forEach((g, j) => g.setAttribute("class", "node " + (i === j ? "s-act" : ""))); det.innerHTML = `<p><b>${LEVELS[i].t}.</b> ${LEVELS[i].d}</p><p class="muted">Нагоре: по-бързо, по-малко, по-скъпо на байт. Стрелките на достъп са логически; реалните пътища зависят от микроархитектурата.</p>`; }
      root.querySelector("#pyr").append(svg); pick(1);
    }

    // кеш
    S.viz(root.querySelector("#v-cache"), {
      id: "cache", title: "Кеш: попадения и пропуски върху поредица адреси", sub: "W отпред = запис; адресите са в байтове",
      code: "ch06_cache",
      inputs: [{ id: "trace", label: "Адреси", value: "0 4 16 64 0 68 128 4 20", width: "18em" },
        { id: "sets", label: "Набори", type: "select", value: 4, options: [1, 2, 4, 8, 16] },
        { id: "ways", label: "Линии в набор", type: "select", value: 1, options: [1, 2, 4, 8] },
        { id: "block", label: "Линия (B)", type: "select", value: 16, options: [4, 8, 16, 32, 64] },
        { id: "lru", label: "Замяна", type: "select", value: "lru", options: [["lru", "LRU"], ["fifo", "FIFO"]] },
        { id: "wb", label: "Запис", type: "select", value: "wb", options: [["wb", "write-back"], ["wt", "write-through"]] }],
      presets: [
        { label: "Конфликт 0/64 (директно)", values: { trace: "0 64 0 64 4 68 128 0", sets: 4, ways: 1, block: 16 } },
        { label: "Същото, 2-пътен", values: { trace: "0 64 0 64 4 68 128 0", sets: 2, ways: 2, block: 16 } },
        { label: "LRU vs FIFO", values: { trace: "0 32 0 64 0 96 32 0", sets: 1, ways: 4, block: 16 } },
        { label: "Записи", values: { trace: "W0 16 W32 0 48 W64 16 W0 80 32", sets: 4, ways: 1, block: 16 } },
        { label: "Последователно (пространств.)", values: { trace: "0 4 8 12 16 20 24 28 32 36 40 44", sets: 4, ways: 1, block: 16 } },
      ],
      legend: [["s-cmp", "проверяван набор"], ["s-done", "попадение"], ["s-swap", "пропуск / изместване"], ["s-piv", "dirty"]],
      build: algos.cache_sim,
      draw(st, f) {
        st.innerHTML = "";
        const { sets, ways, block } = f.c;
        const ob = log2(block), ib = log2(sets);
        // разбиване на адреса
        if (f.r) {
          const bits = 16, a = f.r.addr, tb = bits - ob - ib;
          const row = h("div", { style: { display: "flex", gap: "1px", fontFamily: "var(--f-mono)", fontSize: "12px", flexWrap: "nowrap", overflowX: "auto" } });
          for (let b = bits - 1; b >= 0; b--) {
            const part = b >= ob + ib ? "s-act" : b >= ob ? "s-cmp" : "s-piv";
            row.append(h("span", { class: part, style: { border: "1px solid var(--c)", background: "var(--cb)", padding: "2px 4px", minWidth: "16px", textAlign: "center" }, text: (a >> b) & 1 }));
          }
          st.append(h("div", { class: "row" }, row, h("span", { class: "mono", html: `<span style="color:var(--st-act)">tag ${f.r.tag}</span> · <span style="color:var(--st-cmp)">index ${f.r.index}</span>${ib ? "" : " (0 бита)"} · <span style="color:var(--st-piv)">offset ${f.r.offset}</span> · ${tb}/${ib}/${ob} бита` })));
        }
        // кеш
        const L = f.phase === "split" ? f.Lprev : f.L;
        const tb = h("table", { class: "t grid", style: { marginTop: "8px" } });
        const hr = h("tr", null, h("th", { text: "набор" }));
        for (let w = 0; w < ways; w++) hr.append(h("th", { colspan: 3, text: "линия " + w }));
        tb.append(hr);
        const hr2 = h("tr", null, h("th", { text: "" }));
        for (let w = 0; w < ways; w++) hr2.append(h("th", { class: "muted", text: "V" }), h("th", { class: "muted", text: "tag" }), h("th", { class: "muted", text: "блок" }));
        tb.append(hr2);
        for (let s = 0; s < sets; s++) {
          const tr = h("tr", null, h("th", { class: f.r && f.r.index === s ? "s-cmp" : "", text: s }));
          for (let w = 0; w < ways; w++) {
            const x = L[s * ways + w];
            let cls = "";
            if (f.r && f.r.index === s) cls = f.phase === "split" ? "s-cmp" : w === f.r.way ? (f.r.hit ? "s-done" : "s-swap") : "";
            const blk = x.valid ? ((x.tag << ib) | s) << ob : null;
            tr.append(h("td", { class: cls, text: x.valid ? (x.dirty ? "V·D" : "V") : "—" }), h("td", { class: cls, text: x.valid ? x.tag : "" }),
              h("td", { class: x.dirty ? "s-piv" : cls, text: x.valid ? `${blk}…${blk + block - 1}` : "" }));
          }
          tb.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, tb));
        // поредица
        const cls = {};
        f.hm.forEach((x, k) => (cls[k] = x === "H" ? "s-done" : "s-swap"));
        if (f.k >= 0 && f.k < f.tr.length && f.phase === "split") cls[f.k] = "s-cmp";
        st.append(h("span", { class: "eyebrow", style: { display: "block", marginTop: "8px" }, text: "Поредица (H/M)" }));
        S.drawArray(st, f.tr.map((x) => (x.w ? "W" : "") + x.a), { cls, append: true, label: (k) => f.hm[k] || "" }).style.flexWrap = "wrap";
        if (f.r && f.r.evicted && f.phase === "res") st.append(h("p", { class: "warn", text: `Изместен блок ${f.r.evicted.addr}…${f.r.evicted.addr + block - 1}${f.r.wbk ? " (dirty → записан в RAM)" : ""}.` }));
      },
    });

    // обхождане
    S.viz(root.querySelector("#v-walk"), {
      id: "walk", title: "m[i][j]: попадения (H) и пропуски (M) по клетки", sub: "Кешът е LRU, write-back; само четене",
      code: "ch06_locality",
      inputs: [{ id: "R", label: "Редове", type: "number", value: 8, width: "5em" }, { id: "C", label: "Колони", type: "number", value: 8, width: "5em" },
        { id: "sets", label: "Набори", type: "select", value: 4, options: [1, 2, 4, 8, 16] }, { id: "ways", label: "Линии", type: "select", value: 2, options: [1, 2, 4] },
        { id: "block", label: "Линия (B)", type: "select", value: 16, options: [8, 16, 32, 64] },
        { id: "order", label: "Обхождане", type: "select", value: "rows", options: [["rows", "по редове (i, после j)"], ["cols", "по колони (j, после i)"]] }],
      presets: [{ label: "8×8 по редове", values: { R: 8, C: 8, order: "rows" } }, { label: "8×8 по колони", values: { R: 8, C: 8, order: "cols" } }, { label: "16×4, колоните се побират", values: { R: 16, C: 4, sets: 8, ways: 2, order: "cols" } }],
      legend: [["s-act", "текущ елемент"], ["s-done", "попадение"], ["s-swap", "пропуск"]],
      build: algos.walk,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "i\\j" }), ...Array.from({ length: f.C }, (_, j) => h("th", { text: j }))));
        for (let i = 0; i < f.R; i++) {
          const tr = h("tr", null, h("th", { text: i }));
          for (let j = 0; j < f.C; j++) {
            const v = f.res[i][j], cur = f.cur && f.cur[0] === i && f.cur[1] === j;
            tr.append(h("td", { class: cur ? "s-act" : v === "H" ? "s-done" : v === "M" ? "s-swap" : "", text: v || "" }));
          }
          tb.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    // AMAT
    const am = root.querySelector("#amat");
    const fld = (id, lab, v, step) => { const i = h("input", { type: "number", value: v, step, id: "am-" + id, style: { width: "6em" } }); return [i, h("label", { class: "field", for: "am-" + id }, h("span", { text: lab }), i)]; };
    const [t1, l1] = fld("t", "t_hit L1 (ns)", 1, 0.5), [m1, l2] = fld("m", "дял пропуски L1", 0.05, 0.01), [p1, l3] = fld("p", "наказание (ns)", 80, 5);
    const two = h("input", { type: "checkbox", id: "am-two" });
    const [t2, l4] = fld("t2", "t_hit L2 (ns)", 10, 1), [m2, l5] = fld("m2", "дял пропуски L2", 0.2, 0.05);
    const out = h("div", { class: "key" });
    const bars = h("div");
    am.append(h("div", { class: "row" }, l1, l2, l3, h("label", { class: "field", style: { display: "flex", gap: "6px", alignItems: "center" } }, two, h("span", { text: "две нива (наказанието е към RAM)" })), l4, l5), out, bars);
    function renderA() {
      const T = +t1.value, M = +m1.value, P = +p1.value, T2 = +t2.value, M2 = +m2.value;
      if (![T, M, P, T2, M2].every(Number.isFinite) || M < 0 || M > 1 || M2 < 0 || M2 > 1 || T < 0 || P < 0 || T2 < 0) { out.innerHTML = '<span class="warn">Времената са ≥ 0, дяловете — между 0 и 1.</span>'; return; }
      l4.hidden = l5.hidden = !two.checked;
      let r, txt;
      if (two.checked) { const a2 = algos.amat(T2, M2, P); r = algos.amat(T, M, a2); txt = `AMAT<sub>L2</sub> = ${T2} + ${M2} · ${P} = ${+a2.toFixed(4)} ns;  AMAT = ${T} + ${M} · ${+a2.toFixed(4)} = <b>${+r.toFixed(4)} ns</b>`; }
      else { r = algos.amat(T, M, P); txt = `AMAT = ${T} + ${M} · ${P} = <b>${+r.toFixed(4)} ns</b>`; }
      out.innerHTML = `<span class="formula">${txt}</span><br><span class="muted">Без кеш всеки достъп би струвал ≈ ${+(T + P).toFixed(2)} ns.</span>`;
      const vals = [0, 0.01, 0.02, 0.05, 0.1, 0.2].map((m) => (two.checked ? algos.amat(T, m, algos.amat(T2, M2, P)) : algos.amat(T, m, P)));
      const ms = [0, 1, 2, 5, 10, 20];
      const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "дял пропуски L1" }), ...ms.map((m) => h("th", { text: m + "%" }))),
        h("tr", null, h("th", { text: "AMAT, ns" }), ...vals.map((v, k) => h("td", { class: Math.abs(ms[k] / 100 - M) < 1e-9 ? "s-act" : "", text: +v.toFixed(2) }))));
      bars.innerHTML = ""; bars.append(h("div", { class: "tbl-wrap" }, tb));
    }
    [t1, m1, p1, t2, m2, two].forEach((x) => x.addEventListener("input", renderA));
    two.addEventListener("change", renderA);
    renderA();
    S.codeView(root.querySelector("#amat-code"), "ch06_amat", ["amat"]);
  }

  S.chapter({ id: "pamet", order: 6, num: "6", group: "Памет и вход/изход", title: "Йерархия на паметта",
    lead: "Нива и локалност, кеш симулатор с разбиване на адреса, обхождане по редове срещу колони и AMAT.", html, mount, algos });
})();
