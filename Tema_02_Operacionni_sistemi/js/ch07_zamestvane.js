/* Раздел 7 — разпределяне и заместване: фрагментация, first/best/worst fit, FIFO/LRU/OPT/Clock, Белади, работно множество. */
(function () {
  const S = window.Study, h = S.h;
  const FIT = { first: 0, best: 1, worst: 2 };
  const FITN = { first: "first fit", best: "best fit", worst: "worst fit" };
  const REP = { fifo: 0, lru: 1, opt: 2, clock: 3 };
  const REPN = { fifo: "FIFO", lru: "LRU", opt: "OPT (оптимална)", clock: "Clock" };
  const COLORS = ["#4f7fd0", "#d08a2a", "#3f9a64", "#b0504a", "#8a62c8", "#2a9aa8", "#a07a3a", "#c05a9a", "#6a8a2a", "#5a6aa0"];

  function parseOps(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне една операция: +N (заяви N) или -K (освободи процес K).");
    if (parts.length > 20) throw new Error("Най-много 20 операции.");
    return parts.map((p) => {
      const m = /^([+-])(\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е операция. Формат: +12 (заявка за 12) или -3 (освобождава процес 3).`);
      const v = +m[2];
      if (m[1] === "+" && (v < 1 || v > 100)) throw new Error("Размерът на заявка трябва да е от 1 до 100.");
      return { op: m[1], v };
    });
  }
  function parseRefs(str) {
    return S.parseNums(str, { min: 0, max: 9, minLen: 1, maxLen: 40 });
  }

  const algos = {
    /* Огледало на choose()/alloc()/release() */
    fit({ total, ops, policy }) {
      total = S.int(total, 4, 100, "Общата памет");
      const O = parseOps(ops), pol = FIT[policy];
      if (pol == null) throw new Error("Непозната политика.");
      let B = [{ start: 0, size: total, owner: 0 }], next = 0, failed = 0;
      const F = [];
      const snap = (o) => {
        const holes = B.filter((b) => !b.owner);
        return { B: B.map((b) => ({ ...b })), total, stats: { "свободно общо": holes.reduce((s, b) => s + b.size, 0), "най-голяма дупка": Math.max(0, ...holes.map((b) => b.size)), дупки: holes.length, неуспешни: failed }, ...o };
      };
      F.push(snap({ vars: { политика: FITN[policy] }, msg: `Памет ${total} единици, една дупка. Политика <b>${FITN[policy]}</b>.` }));
      for (const { op, v } of O) {
        if (op === "+") {
          let pick = -1;
          const cand = [];
          for (let i = 0; i < B.length; i++) {
            if (B[i].owner || B[i].size < v) continue;
            cand.push(i);
            if (pick < 0) { pick = i; if (pol === 0) break; continue; }
            if (pol === 1 && B[i].size < B[pick].size) pick = i;
            if (pol === 2 && B[i].size > B[pick].size) pick = i;
          }
          F.push(snap({ at: ["scan", ["first", "best", "worst"][pol]], cand, pick, req: v, vars: { заявка: v, кандидати: cand.map((i) => B[i].size).join(", ") || "—" }, msg: `Заявка за <b>${v}</b>. Дупки, които стигат: ${cand.length ? cand.map((i) => `[${B[i].start}, размер ${B[i].size}]`).join(", ") : "няма"}. ${pick >= 0 ? `${FITN[policy]} избира дупката с размер ${B[pick].size}${pol === 0 ? " (първата)" : pol === 1 ? " (най-малката достатъчна)" : " (най-голямата)"}.` : ""}` }));
          if (pick < 0) {
            failed++;
            const free = B.filter((b) => !b.owner).reduce((s, b) => s + b.size, 0);
            F.push(snap({ at: "fail", req: v, bad: true, vars: {}, msg: `<b class="warn">Отказ.</b> Свободни са общо ${free} единици${free >= v ? `, повече от ${v} — но не в <b>една непрекъсната</b> дупка. Това е външна фрагментация.` : "."}`, log: `+${v} ✗` }));
            continue;
          }
          const id = ++next;
          if (B[pick].size > v) B.splice(pick + 1, 0, { start: B[pick].start + v, size: B[pick].size - v, owner: 0 });
          B[pick].size = v; B[pick].owner = id;
          F.push(snap({ at: ["take", "split"], hi: pick, vars: { процес: id, начало: B[pick].start }, msg: `Процес <b>${id}</b> получава [${B[pick].start}, ${B[pick].start + v}). Остатъкът от дупката остава свободен.`, log: `+${v} → П${id} @${B[pick].start}` }));
        } else {
          const i = B.findIndex((b) => b.owner === v);
          if (i < 0) { F.push(snap({ at: "free", bad: true, vars: {}, msg: `Процес ${v} няма разпределена памет — пропускаме.` })); continue; }
          B[i].owner = 0;
          let merged = 0, k = i;
          if (k + 1 < B.length && !B[k + 1].owner) { B[k].size += B[k + 1].size; B.splice(k + 1, 1); merged++; }
          if (k > 0 && !B[k - 1].owner) { B[k - 1].size += B[k].size; B.splice(k, 1); k--; merged++; }
          F.push(snap({ at: merged ? ["free", "merge"] : "free", hi: k, vars: { освободен: v }, msg: `Процес ${v} освобождава паметта си.${merged ? ` Съседните дупки се <b>сливат</b> (${merged}).` : " Получава се нова дупка между заети блокове."}`, log: `-${v}` }));
        }
      }
      const holes = B.filter((b) => !b.owner);
      F.push(snap({ done: true, vars: {}, msg: `Край. Свободни ${holes.reduce((s, b) => s + b.size, 0)} единици в ${holes.length} дупки; най-голямата е ${Math.max(0, ...holes.map((b) => b.size))}.` }));
      return { frames: F, failed, free: holes.reduce((s, b) => s + b.size, 0), largest: Math.max(0, ...holes.map((b) => b.size)), holes: holes.length, layout: B.map((b) => `${b.owner}:${b.size}`).join(" ") };
    },

    /* Огледало на replace() */
    replace({ refs, nf, policy }) {
      const R = parseRefs(refs);
      nf = S.int(nf, 1, 8, "Броят рамки");
      const pol = REP[policy];
      if (pol == null) throw new Error("Непозната политика.");
      const n = R.length;
      const frame = [], loaded = [], used = [], refbit = [];
      let hand = 0, faults = 0;
      const victims = [], F = [], cols = [];
      const snap = (o) => ({ frame: frame.slice(), refbit: refbit.slice(), hand, nf, R, pol, cols: cols.map((c) => ({ ...c, f: c.f.slice() })), loaded: loaded.slice(), used: used.slice(), stats: { "page faults": faults, попадения: cols.filter((c) => c.hit).length }, ...o });
      F.push(snap({ t: -1, vars: { рамки: nf, политика: REPN[policy] }, msg: `${nf} рамки, политика <b>${REPN[policy]}</b>, ${n} обръщения.` }));
      for (let t = 0; t < n; t++) {
        const p = R[t];
        const hit = frame.indexOf(p);
        if (hit >= 0) {
          used[hit] = t; refbit[hit] = 1;
          cols.push({ p, f: frame.slice(), hit: true, slot: hit });
          F.push(snap({ at: ["hit", "look"], t, slot: hit, vars: { t, страница: p }, msg: `t=${t}: страница ${p} е в рамка ${hit} — <b>попадение</b>.${pol === 1 ? ` LRU обновява времето на последен достъп.` : pol === 3 ? " Clock слага бит за достъп = 1." : pol === 0 ? " FIFO <b>не</b> променя нищо — важи моментът на зареждане." : ""}` }));
          victims.push(-1);
          continue;
        }
        faults++;
        let v, why = "", evict = true, scan = null;
        if (frame.length < nf) { v = frame.length; evict = false; why = "има свободна рамка"; }
        else if (pol === 0) { v = 0; for (let i = 1; i < nf; i++) if (loaded[i] < loaded[v]) v = i; why = `заредена най-рано (t=${loaded[v]})`; }
        else if (pol === 1) { v = 0; for (let i = 1; i < nf; i++) if (used[i] < used[v]) v = i; why = `използвана най-отдавна (t=${used[v]})`; }
        else if (pol === 2) {
          let far = -1; v = 0; const nx = [];
          for (let i = 0; i < nf; i++) { let x = n; for (let k = t + 1; k < n; k++) if (R[k] === frame[i]) { x = k; break; } nx.push(x); if (x > far) { far = x; v = i; } }
          why = nx[v] === n ? "няма да се ползва повече" : `следващо ползване най-далеч (t=${nx[v]})`;
          scan = nx;
        } else {
          const cleared = [];
          while (refbit[hand]) { refbit[hand] = 0; cleared.push(hand); hand = (hand + 1) % nf; }
          v = hand; hand = (hand + 1) % nf;
          why = cleared.length ? `стрелката нулира бита на ${cleared.map((c) => "рамка " + c).join(", ")} (втори шанс) и спира на рамка ${v}` : `стрелката сочи рамка ${v} с бит 0`;
        }
        const old = frame[v];
        victims.push(evict ? old : -1);
        const tagMap = ["fifo", "lru", "opt", "clock"];
        F.push(snap({ at: evict ? ["fault", tagMap[pol]] : ["fault", "freeframe"], t, slot: v, victim: evict ? old : null, scan, vars: { t, страница: p, жертва: evict ? old : "—" }, msg: `t=${t}: страница ${p} липсва — <b>page fault</b>. ${evict ? `Жертва: страница ${old} в рамка ${v} — ${why}.` : `Зареждаме в рамка ${v} (${why}).`}` }));
        frame[v] = p; loaded[v] = t; used[v] = t; refbit[v] = 1;
        cols.push({ p, f: frame.slice(), hit: false, slot: v, victim: evict ? old : null });
        F.push(snap({ at: "load", t, slot: v, vars: { t, [`рамка ${v}`]: p }, msg: `Страница ${p} е заредена в рамка ${v}.`, log: `t=${t}: ${p} ✗${evict ? ` (изх. ${old})` : ""}` }));
      }
      F.push(snap({ t: n, done: true, vars: { "page faults": faults }, msg: `Общо <b>${faults}</b> page faults от ${n} обръщения (${((faults / n) * 100).toFixed(0)}%).` }));
      return { frames: F, faults, victims: victims.filter((x) => x >= 0).join(",") || "-" };
    },
  };

  function drawMem(st, f) {
    st.innerHTML = "";
    const W = 640, Hh = 74, u = (W - 20) / f.total;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${Hh}`, width: W, role: "img", "aria-label": "Карта на паметта" });
    f.B.forEach((b, i) => {
      const x = 10 + b.start * u, w = b.size * u;
      let stroke = "var(--line)", sw = 1;
      if (f.hi === i) { stroke = "var(--st-act)"; sw = 3; }
      if (f.cand && f.cand.includes(i)) { stroke = f.pick === i ? "var(--st-done)" : "var(--st-cmp)"; sw = 3; }
      svg.append(S.svg("rect", { x, y: 10, width: Math.max(1, w), height: 36, fill: b.owner ? COLORS[(b.owner - 1) % 10] : "var(--panel-2)", stroke, "stroke-width": sw, "stroke-dasharray": b.owner ? null : "4 3" }));
      if (w > 18) svg.append(S.svg("text", { x: x + w / 2, y: 33, "text-anchor": "middle", style: b.owner ? "fill:#fff;font-weight:700;font-size:11px" : "font-size:11px", class: b.owner ? "" : "wt", text: b.owner ? `П${b.owner}·${b.size}` : b.size }));
      svg.append(S.svg("text", { x, y: 64, class: "wt", style: "font-size:10px", text: b.start }));
    });
    svg.append(S.svg("text", { x: W - 10, y: 64, "text-anchor": "end", class: "wt", style: "font-size:10px", text: f.total }));
    st.append(h("div", { class: "tbl-wrap" }, svg));
    if (f.bad) st.append(h("p", { class: "warn", text: "Заявката не може да се удовлетвори с непрекъснат блок." }));
  }

  function drawRep(st, f) {
    st.innerHTML = "";
    const tb = h("table", { class: "t grid" });
    tb.append(h("tr", null, h("th", { text: "t" }), ...f.R.map((_, t) => h("th", { class: t === f.t ? "s-act" : "", text: t }))));
    tb.append(h("tr", null, h("th", { text: "обръщение" }), ...f.R.map((p, t) => h("td", { class: t === f.t ? "s-act" : t > f.t ? "s-dim" : "", style: { fontWeight: 700 }, text: p }))));
    for (let r = 0; r < f.nf; r++) {
      tb.append(h("tr", null, h("th", { text: "рамка " + r + (f.pol === 3 && r === f.hand ? " ◄" : "") }), ...f.R.map((_, t) => {
        const c = f.cols[t];
        if (!c) return h("td", { text: "" });
        const v = c.f[r];
        let cls = "";
        if (c.slot === r) cls = c.hit ? "s-done" : "s-swap";
        return h("td", { class: cls, text: v == null ? "" : v });
      })));
    }
    tb.append(h("tr", null, h("th", { text: "fault" }), ...f.R.map((_, t) => { const c = f.cols[t]; return h("td", { class: c && !c.hit ? "s-swap" : "", text: c ? (c.hit ? "" : "✗") : "" }); })));
    st.append(h("div", { class: "tbl-wrap" }, tb));
    // текущо състояние на рамките
    const box = h("div", { class: "row", style: { marginTop: "10px" } });
    for (let r = 0; r < f.nf; r++) {
      const p = f.frame[r];
      const meta = p == null ? "свободна" : f.pol === 0 ? `заредена t=${f.loaded[r]}` : f.pol === 1 ? `ползвана t=${f.used[r]}` : f.pol === 3 ? `бит=${f.refbit[r]}` : f.scan ? `следв. t=${f.scan[r] === f.R.length ? "∞" : f.scan[r]}` : "";
      box.append(h("div", { class: "card " + (f.slot === r ? (f.victim != null ? "s-swap" : "s-act") : ""), style: { minWidth: "110px", borderColor: f.slot === r ? "var(--c)" : null } },
        h("span", { class: "eyebrow", text: "рамка " + r + (f.pol === 3 && r === f.hand ? " ◄ стрелка" : "") }), h("h4", { class: "mono", text: p == null ? "—" : "стр. " + p }), h("p", { class: "mono", style: { fontSize: ".78rem" }, text: meta })));
    }
    st.append(box);
  }

  const html = `
<div class="prose">
  <p>При непрекъснато разпределяне свободното пространство може да се разпадне на отделни области — <b>външна</b> <dfn data-g="фрагментация">фрагментация</dfn>. <b>Вътрешната</b> фрагментация е неизползвана част вътре във вече разпределен блок. Страницирането премахва нуждата всяко адресно пространство да е физически непрекъснато, но не премахва всички видове фрагментация.</p>
</div>

<div class="block">
  <h3>Схема 17 · Непрекъснато разпределение и външна фрагментация</h3>
  <p class="muted">Операции: <code>+N</code> — нов процес иска N единици; <code>-K</code> — процес K освобождава паметта си. Съседните дупки се сливат. Политиките first/best/worst fit са класическите стратегии за избор на дупка <span class="extra-tag">разширение</span>.</p>
  <div id="v-fit"></div>
  <details class="hint"><summary>Хинт: примерът „дупки 2 и 3“ от ръководството</summary><div>
    <p>Дупки 2 и 3 KiB не удовлетворяват искане за един непрекъснат блок от 4 KiB, въпреки че сборът е 5 KiB. Пусни „Дупки 2 и 3“: свободни са 5 единици, най-голямата дупка е 3, заявката за 4 е отказана.</p>
  </div></details>
  <details class="trap"><summary>Капан: страницирането премахва фрагментацията</summary><div>
    <p>Премахва нуждата целият процес да е физически непрекъснат — значи външната фрагментация на ниво процес изчезва. Но последната частично заета страница пак може да губи място (вътрешна фрагментация), а таблиците имат собствена цена.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 18 · Заместване на страници</h3>
  <p class="prose">Когато трябва да се освободи рамка, политиката за заместване избира страница. <dfn data-g="fifo">FIFO</dfn> избира най-рано заредената; <dfn data-g="lru">LRU</dfn> се основава на най-отдавнашното използване; <b>Clock</b> приближава идеята чрез битове за достъп. Оптималната теоретична политика (OPT) избира страницата с най-далечно следващо използване, но изисква знание за бъдещето.</p>
  <div id="v-rep"></div>
  <details class="hint"><summary>Хинт: 1, 2, 3, 1, 4 — еднакво съдържание, различна история</summary><div>
    <p>След 1, 2, 3, 1 трите рамки съдържат {1, 2, 3} и при FIFO, и при LRU. При 4 FIFO изхвърля <b>1</b> (заредена първа), LRU изхвърля <b>2</b> (последен достъп най-отдавна, защото 1 току-що е използвана). Еднаквото текущо съдържание не означава еднаква история. Изборът на жертва не е едно и също с избора на свободна рамка.</p>
  </div></details>
  <details class="hint"><summary>Хинт: как работи Clock <span class="extra-tag">разширение</span></summary><div>
    <p>Рамките са в кръг; при всяко обръщение битът за достъп на страницата става 1. При нужда от жертва стрелката обикаля: страница с бит 1 получава „втори шанс“ (битът се нулира, стрелката продължава), страница с бит 0 се изхвърля. Така се приближава LRU без пазене на точно време за всеки достъп.</p>
  </div></details>
</div>

<div class="block">
  <h3>Аномалия на Белади <span class="extra-tag">разширение</span></h3>
  <p class="prose">При FIFO повече рамки понякога дават <b>повече</b> page faults. LRU и OPT нямат това свойство. Таблицата пресмята същия симулатор за 1…6 рамки върху низа на обръщения по-горе.</p>
  <div class="tbl-wrap" id="belady"></div>
</div>

<div class="block">
  <h3>Работно множество и thrashing</h3>
  <p class="prose"><dfn data-g="работно множество">Работното множество</dfn> съдържа активно използваните страници за определен интервал. Ако наличната памет е недостатъчна за работните множества, системата може да прекарва голяма част от времето в прехвърляне на страници — <dfn data-g="thrashing">thrashing</dfn>. Решението е свързано с общото натоварване, разпределението и политиката за памет, а не само със скоростта на носителя.</p>
  <p class="muted">Плъзгачът задава броя рамки; низът на обръщения е от симулатора по-горе. Δ е прозорецът на работното множество.</p>
  <div class="row"><label class="field"><span>рамки</span><input type="range" id="ws-f" min="1" max="8" value="3"></label><label class="field"><span>Δ (прозорец)</span><input type="range" id="ws-d" min="1" max="10" value="4"></label><span class="mono" id="ws-lbl"></span></div>
  <div class="tbl-wrap" id="ws"></div>
  <details class="trap"><summary>Капан: „по-добър алгоритъм за заместване оправя thrashing“</summary><div>
    <p>Алгоритъмът за заместване не създава липсващ физически капацитет. Намаляване на едновременно активните процеси може да е по-смислено от още по-често превключване между тях.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Вътрешна фрагментация — в блока; външна — между блоковете. FIFO — време на зареждане; LRU — време на последен достъп; OPT — бъдеще (недостижим еталон); Clock — бит за достъп, приближава LRU. Thrashing = работните множества не се побират.</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-fit"), {
      id: "fit", title: "Карта на паметта", sub: "Оранжев контур — дупка, която стига; зелен — избраната.",
      code: "s07_fit",
      inputs: [{ id: "total", label: "Памет", type: "number", value: 40, width: "5em" }, { id: "ops", label: "Операции (+N / -K)", value: "+12 +6 +10 +8 -1 -3 +5 +9 +4", width: "18em" },
        { id: "policy", label: "Политика", type: "select", value: "first", options: Object.keys(FIT).map((k) => [k, FITN[k]]) }],
      presets: [{ label: "Дупки 2 и 3", values: { total: 10, ops: "+2 +3 +3 +2 -1 -3 +4", policy: "first" } }, { label: "Смесен", values: { total: 40, ops: "+12 +6 +10 +8 -1 -3 +5 +9 +4" } }],
      legend: [["s-cmp", "стига"], ["s-done", "избрана"], ["s-act", "променен блок"]],
      build: algos.fit, draw: drawMem,
    });

    const bel = root.querySelector("#belady"), ws = root.querySelector("#ws");
    let lastRefs = "1 2 3 4 1 2 5 1 2 3 4 5";
    function renderBelady() {
      bel.innerHTML = "";
      let R;
      try { R = parseRefs(lastRefs); } catch (e) { bel.append(h("p", { class: "warn", text: e.message })); return; }
      const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "рамки" }), ...[1, 2, 3, 4, 5, 6].map((k) => h("th", { text: k }))));
      Object.keys(REP).forEach((p) => {
        const v = [1, 2, 3, 4, 5, 6].map((k) => algos.replace({ refs: lastRefs, nf: k, policy: p }).faults);
        tb.append(h("tr", null, h("th", { text: REPN[p] }), ...v.map((x, i) => h("td", { class: i > 0 && x > v[i - 1] ? "s-swap" : "", text: x }))));
      });
      bel.append(tb, h("p", { class: "muted", style: { fontSize: ".85rem" }, text: `Низ: ${R.join(" ")}. Червено = повече faults при повече рамки (аномалия). Пример: 1 2 3 4 1 2 5 1 2 3 4 5 — FIFO с 3 рамки 9, с 4 рамки 10.` }));
    }
    const fIn = root.querySelector("#ws-f"), dIn = root.querySelector("#ws-d"), lbl = root.querySelector("#ws-lbl");
    function renderWS() {
      ws.innerHTML = "";
      let R; try { R = parseRefs(lastRefs); } catch (e) { return; }
      const nf = +fIn.value, D = +dIn.value;
      lbl.textContent = `рамки = ${nf}, Δ = ${D}`;
      const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "t" }), ...R.map((_, t) => h("th", { text: t }))),
        h("tr", null, h("th", { text: "стр." }), ...R.map((p) => h("td", { text: p }))));
      const wsz = R.map((_, t) => new Set(R.slice(Math.max(0, t - D + 1), t + 1)).size);
      tb.append(h("tr", null, h("th", { text: "|WS(t, Δ)|" }), ...wsz.map((x) => h("td", { class: x > nf ? "s-swap" : "s-done", text: x }))));
      const fl = algos.replace({ refs: lastRefs, nf, policy: "lru" });
      ws.append(tb, h("p", { class: "mono", text: `LRU page faults при ${nf} рамки: ${fl.faults}/${R.length}. Червено: работното множество не се побира в рамките.` }));
    }
    fIn.addEventListener("input", renderWS); dIn.addEventListener("input", renderWS);
    fIn.addEventListener("change", renderWS); dIn.addEventListener("change", renderWS);

    S.viz(root.querySelector("#v-rep"), {
      id: "rep", title: "Заместване на страници", sub: "Червено — page fault (заредената страница); зелено — попадение.",
      code: "s07_replace",
      inputs: [{ id: "refs", label: "Обръщения (страници 0–9)", value: "1 2 3 1 4", width: "20em" }, { id: "nf", label: "Рамки", type: "number", value: 3, width: "5em" },
        { id: "policy", label: "Политика", type: "select", value: "fifo", options: Object.keys(REP).map((k) => [k, REPN[k]]) }],
      presets: [{ label: "Схема 18: 1 2 3 1 4", values: { refs: "1 2 3 1 4", nf: 3 } }, { label: "Класически низ", values: { refs: "7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1", nf: 3 } },
        { label: "Белади, 3 рамки", values: { refs: "1 2 3 4 1 2 5 1 2 3 4 5", nf: 3, policy: "fifo" } }, { label: "Белади, 4 рамки", values: { refs: "1 2 3 4 1 2 5 1 2 3 4 5", nf: 4, policy: "fifo" } }],
      random: () => ({ refs: Array.from({ length: 14 }, () => S.randInt(0, 6)).join(" ") }),
      legend: [["s-swap", "fault / жертва"], ["s-done", "попадение"], ["s-act", "текущо обръщение"]],
      build(inp) { const r = algos.replace(inp); lastRefs = inp.refs; renderBelady(); renderWS(); return r; },
      draw: drawRep,
    });
  }

  S.chapter({ id: "zamestvane", order: 7, num: "7", group: "Памет", title: "Разпределяне и заместване на паметта", lead: "Вътрешна и външна фрагментация, first/best/worst fit, FIFO, LRU, OPT, Clock, аномалия на Белади, работно множество и thrashing.", html, mount, algos });
})();
