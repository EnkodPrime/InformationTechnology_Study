/* Раздел 5 — взаимно блокиране: условия, граф на ресурсите, предотвратяване/избягване/откриване, банкер. */
(function () {
  const S = window.Study, h = S.h;

  /* hold: за всеки ресурс номер на процес или "-"; want: за всеки процес номер на ресурс или "-" */
  function parseList(str, name, maxLen, maxVal) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error(`Полето „${name}“ е празно.`);
    if (parts.length > maxLen) throw new Error(`„${name}“: най-много ${maxLen} стойности.`);
    return parts.map((p) => {
      if (p === "-") return -1;
      const v = Number(p);
      if (!Number.isInteger(v) || v < 1 || v > maxVal) throw new Error(`„${name}“: „${p}“ трябва да е число от 1 до ${maxVal} или „-“.`);
      return v - 1;
    });
  }
  function parseMatrix(str, rows, cols, name) {
    const r = String(str).split(/[;|\n]+/).map((x) => x.trim()).filter(Boolean);
    if (r.length !== rows) throw new Error(`„${name}“: нужни са ${rows} реда, разделени с „;“.`);
    return r.map((row, i) => {
      const v = S.parseNums(row, { min: 0, max: 20, minLen: cols, maxLen: cols });
      if (v.length !== cols) throw new Error(`„${name}“, ред ${i}: нужни са ${cols} числа.`);
      return v;
    });
  }

  const algos = {
    parseList,
    /* Огледало на find_cycle() — от всеки процес поред, до първия цикъл */
    cycle({ hold, want }) {
      const W = parseList(want, "чака", 6, 4), n = W.length;
      const H = parseList(hold, "държи", 4, n), m = H.length;
      W.forEach((r, p) => { if (r >= m) throw new Error(`P${p + 1} чака R${r + 1}, но има само ${m} ресурса.`); if (r >= 0 && H[r] === p) throw new Error(`P${p + 1} не може да чака ресурс, който сам държи.`); });
      const F = [];
      const base = { H, W, n, m };
      F.push({ ...base, vars: { процеси: n, ресурси: m }, msg: "Строим графа на изчакване: P → Q, ако P чака ресурс, държан от Q. При единични ресурси <b>цикъл ⇔ взаимно блокиране</b>." });
      let found = [];
      for (let s = 0; s < n && !found.length; s++) {
        const seen = Array(n).fill(-1), path = [];
        let p = s;
        F.push({ ...base, at: "walk", path: [], cur: s, vars: { старт: "P" + (s + 1) }, msg: `Тръгваме от P${s + 1}.` });
        while (p >= 0 && seen[p] < 0) {
          seen[p] = path.length; path.push(p);
          const r = W[p], q = r >= 0 ? H[r] : -1;
          F.push({ ...base, at: ["next", "edge"], path: path.slice(), cur: p, edgeR: r, vars: { p: "P" + (p + 1), чака: r >= 0 ? "R" + (r + 1) : "—", държател: q >= 0 ? "P" + (q + 1) : "—" }, msg: r < 0 ? `P${p + 1} не чака нищо — може да напредва.` : q < 0 ? `P${p + 1} чака R${r + 1}, който е <b>свободен</b> — заявката може да се удовлетвори.` : `P${p + 1} чака R${r + 1}, държан от P${q + 1} → ребро P${p + 1} → P${q + 1}.`, log: r >= 0 && q >= 0 ? `P${p + 1} → P${q + 1}` : null });
          p = q;
        }
        if (p < 0) F.push({ ...base, at: "nocycle", path: path.slice(), vars: {}, msg: `Веригата от P${s + 1} свършва — без цикъл.` });
        else { found = path.slice(seen[p]); F.push({ ...base, at: "cycle", path: path.slice(), cyc: found.slice(), vars: { цикъл: found.map((x) => "P" + (x + 1)).join(" → ") }, msg: `Стигнахме отново P${p + 1}: <b>цикъл</b> ${found.map((x) => "P" + (x + 1)).join(" → ")} → P${p + 1}. Тези процеси са във взаимно блокиране.`, log: "цикъл!" }); }
      }
      if (!found.length) F.push({ ...base, done: true, vars: {}, msg: "Няма цикъл — няма взаимно блокиране (може да има чакане, но то ще свърши)." });
      return { frames: F, cycle: found.length ? found.map((x) => "P" + (x + 1)).join(",") : "-" };
    },

    /* Огледало на is_safe() и request() */
    banker({ avail, max, alloc, req }) {
      const av = S.parseNums(avail, { min: 0, max: 20, minLen: 1, maxLen: 4 }), m = av.length;
      const rowsMax = String(max).split(/[;|\n]+/).filter((x) => x.trim()).length;
      if (rowsMax < 1 || rowsMax > 6) throw new Error("Между 1 и 6 процеса (редове в Max).");
      const MX = parseMatrix(max, rowsMax, m, "Max"), AL = parseMatrix(alloc, rowsMax, m, "Allocation"), n = rowsMax;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (AL[i][j] > MX[i][j]) throw new Error(`P${i}: Allocation > Max за ресурс ${j}.`);
      let R = null, rp = -1;
      const rq = String(req || "").trim();
      if (rq) {
        const mm = /^P?(\d)\s*[:=]\s*(.+)$/i.exec(rq);
        if (!mm) throw new Error("Заявка: формат P1: 1 0 2 (празно = само проверка).");
        rp = +mm[1]; if (rp >= n) throw new Error(`Няма процес P${rp}.`);
        R = S.parseNums(mm[2], { min: 0, max: 20, minLen: m, maxLen: m });
      }
      const F = [];
      const NEED = (A) => MX.map((r, i) => r.map((x, j) => x - A[i][j]));
      let A = AL.map((r) => r.slice()), V = av.slice();
      const snap = (o) => ({ n, m, MX, A: A.map((r) => r.slice()), V: V.slice(), need: NEED(A), R, rp, ...o });
      let reqRes = null;
      if (R) {
        const need = NEED(A);
        F.push(snap({ at: "rq_err", rowHi: rp, vars: { заявка: `P${rp}: [${R}]`, need: `[${need[rp]}]` }, msg: `Заявка от P${rp}: [${R.join(" ")}]. Първо: не надвишава ли обявената остатъчна потребност Need = Max − Allocation = [${need[rp].join(" ")}]?` }));
        if (R.some((x, j) => x > need[rp][j])) {
          F.push(snap({ at: "rq_err", rowHi: rp, done: true, verdict: "err", vars: {}, msg: "<b class=\"warn\">Грешка</b>: процесът иска повече от обявения максимум. Заявката се отхвърля." }));
          return { frames: F, req: -1, safe: null, order: "-" };
        }
        F.push(snap({ at: "rq_avail", rowHi: rp, vars: { available: `[${V}]` }, msg: `Има ли толкова свободни сега? Available = [${V.join(" ")}].` }));
        if (R.some((x, j) => x > V[j])) {
          F.push(snap({ at: "rq_avail", rowHi: rp, done: true, verdict: "wait", vars: {}, msg: "Няма достатъчно свободни ресурси — <b>P" + rp + " трябва да чака</b>." }));
          return { frames: F, req: 0, safe: null, order: "-" };
        }
        A[rp] = A[rp].map((x, j) => x + R[j]); V = V.map((x, j) => x - R[j]);
        F.push(snap({ at: "rq_try", rowHi: rp, vars: { available: `[${V}]` }, msg: `<b>Пробно</b> разпределение: Allocation[P${rp}] += заявката, Available = [${V.join(" ")}]. Сега проверяваме дали полученото състояние е безопасно.` }));
      }
      // is_safe
      const work = V.slice(), fin = Array(n).fill(false), order = [];
      F.push(snap({ at: "init", work: work.slice(), fin: fin.slice(), order: [], vars: { Work: `[${work}]` }, msg: `Work = Available = [${work.join(" ")}]. Търсим процес, чиято Need ≤ Work.` }));
      for (let found = true; found;) {
        found = false;
        for (let i = 0; i < n; i++) {
          if (fin[i]) continue;
          const need = NEED(A)[i];
          const ok = need.every((x, j) => x <= work[j]);
          F.push(snap({ at: ok ? "need" : ["skip", "need"], work: work.slice(), fin: fin.slice(), order: order.slice(), rowHi: i, ok, vars: { i: "P" + i, Need: `[${need}]`, Work: `[${work}]` }, msg: `P${i}: Need [${need.join(" ")}] ${ok ? "≤" : "≰"} Work [${work.join(" ")}] — ${ok ? "може да получи всичко и да завърши." : "сега не може да завърши; пропускаме."}` }));
          if (!ok) continue;
          for (let j = 0; j < m; j++) work[j] += A[i][j];
          fin[i] = true; order.push(i); found = true;
          F.push(snap({ at: "release", work: work.slice(), fin: fin.slice(), order: order.slice(), rowHi: i, vars: { Work: `[${work}]` }, msg: `P${i} завършва и освобождава Allocation [${A[i].join(" ")}] → Work = [${work.join(" ")}].`, log: `P${i} ✓ Work=[${work}]` }));
        }
      }
      const safe = order.length === n;
      const ord = safe ? order.map((x) => "P" + x).join(",") : "-";
      let verdict;
      if (R) { reqRes = safe ? 1 : 0; verdict = safe ? "grant" : "unsafe"; }
      F.push(snap({ at: R ? (safe ? "rq_grant" : ["rq_unsafe", "verdict"]) : "verdict", done: true, verdict, work: work.slice(), fin: fin.slice(), order: order.slice(), vars: { безопасно: safe }, inv: { text: safe ? `безопасна последователност: ${order.map((x) => "P" + x).join(" → ")}` : `несигурно: ${fin.map((f, i) => (f ? null : "P" + i)).filter(Boolean).join(", ")} не могат да завършат гарантирано`, ok: safe },
        msg: R ? (safe ? `Състоянието след заявката е <b>безопасно</b> — заявката се удовлетворява.` : `Състоянието след заявката е <b>небезопасно</b> — пробното разпределение се отменя и P${rp} чака.`) : (safe ? "Състоянието е <b>безопасно</b>." : "Състоянието е <b>небезопасно</b> (не е непременно deadlock, но няма гаранция).") }));
      return { frames: F, req: reqRes, safe: safe ? 1 : 0, order: ord };
    },
  };

  function drawGraph(st, f) {
    st.innerHTML = "";
    const n = f.n, m = f.m;
    const Wd = 560, Hd = 240;
    const px = (p) => 60 + p * ((Wd - 120) / Math.max(1, n - 1)), py = 50;
    const rx = (r) => 80 + r * ((Wd - 160) / Math.max(1, m - 1)), ry = 190;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${Wd} ${Hd}`, width: Wd, role: "img", "aria-label": "Граф на ресурсите" });
    svg.append(S.svg("defs", null, S.svg("marker", { id: "arr5", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--muted)" }))));
    const inCyc = (p) => f.cyc && f.cyc.includes(p);
    const line = (x1, y1, x2, y2, cls, dash) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      svg.append(S.svg("line", { x1: x1 + dx / L * 20, y1: y1 + dy / L * 20, x2: x2 - dx / L * 22, y2: y2 - dy / L * 22, class: "edge " + cls, "marker-end": "url(#arr5)", "stroke-dasharray": dash ? "6 4" : null }));
    };
    f.H.forEach((p, r) => { if (p >= 0) line(rx(r), ry, px(p), py, inCyc(p) ? "s-swap" : "s-done", false); });
    f.W.forEach((r, p) => { if (r >= 0) line(px(p), py, rx(r), ry, inCyc(p) ? "s-swap" : f.cur === p ? "s-act" : "s-cmp", true); });
    for (let p = 0; p < n; p++) {
      const cls = inCyc(p) ? "s-swap" : f.cur === p ? "s-act" : f.path && f.path.includes(p) ? "s-cmp" : "";
      svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: px(p), cy: py, r: 19 }), S.svg("text", { x: px(p), y: py + 5, "text-anchor": "middle", style: "font-weight:700", text: "P" + (p + 1) })));
    }
    for (let r = 0; r < m; r++) {
      svg.append(S.svg("g", { class: "node " + (f.edgeR === r ? "s-act" : "") }, S.svg("rect", { x: rx(r) - 20, y: ry - 18, width: 40, height: 36, rx: 3, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }),
        S.svg("text", { x: rx(r), y: ry + 5, "text-anchor": "middle", text: "R" + (r + 1) })));
    }
    st.append(h("div", { class: "tbl-wrap" }, svg), h("p", { class: "muted", style: { fontSize: ".82rem" }, text: "плътна стрелка R → P: ресурсът е разпределен на P · пунктир P → R: P чака R" }));
  }

  function drawBank(st, f) {
    st.innerHTML = "";
    const tb = h("table", { class: "t grid" });
    const hdr = (t) => h("th", { colspan: f.m, text: t });
    tb.append(h("tr", null, h("th", { text: "" }), hdr("Allocation"), hdr("Max"), hdr("Need"), h("th", { text: "завършва" })));
    for (let i = 0; i < f.n; i++) {
      const hi = f.rowHi === i;
      const cell = (v, extra) => h("td", { class: extra || "", text: v });
      const ord = f.order ? f.order.indexOf(i) : -1;
      tb.append(h("tr", null, h("th", { class: hi ? "s-act" : "", text: "P" + i }),
        ...f.A[i].map((v) => cell(v, hi && f.at === "release" ? "s-done" : "")),
        ...f.MX[i].map((v) => cell(v, "")),
        ...f.need[i].map((v, j) => cell(v, hi && f.work ? (v <= f.work[j] ? "s-done" : "s-swap") : "")),
        h("td", { class: ord >= 0 ? "s-done" : "", text: ord >= 0 ? `${ord + 1}.` : "" })));
    }
    st.append(h("div", { class: "tbl-wrap" }, tb));
    st.append(h("p", { class: "mono", style: { marginTop: "8px" }, html: `Available = [${f.V.join(" ")}]` + (f.work ? ` &nbsp; Work = [${f.work.join(" ")}]` : "") + (f.R ? ` &nbsp; заявка P${f.rp} = [${f.R.join(" ")}]` : "") }));
    if (f.verdict) st.append(h("p", { class: "pill " + (f.verdict === "grant" ? "s-done" : f.verdict === "wait" ? "s-cmp" : "s-swap"), text: { grant: "удовлетворена", wait: "чака", unsafe: "отказ: небезопасно", err: "грешка" }[f.verdict] }));
  }

  const COND = [
    { t: "Взаимно изключване", d: "Ресурсът може да се ползва само от един участник.", prev: "Да се направи ресурсът споделим (напр. само за четене) — не винаги е възможно." },
    { t: "Задържане с изчакване", d: "Участник държи ресурс и чака друг.", prev: "Заявка на всички ресурси наведнъж или освобождаване преди нова заявка." },
    { t: "Липса на принудително отнемане", d: "Ресурсът не може да се отнеме принудително.", prev: "Позволяване на отнемане (напр. при отказана заявка участникът освобождава задържаното)." },
    { t: "Кръгово изчакване", d: "Съществува цикъл от чакащи участници.", prev: "Общ ред за придобиване на заключвания: всички искат R1 преди R2. Трябва да се спазва от <b>всички</b> участници." },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="взаимно блокиране">Взаимното блокиране</dfn>, deadlock, възниква, когато участници чакат ресурси един от друг и не могат да напредват. Класическите необходими условия са четири. Щракни условие — какво значи да бъде премахнато.</p>
</div>
<div class="cards" id="conds"></div>
<div class="key" id="cond-note">Четирите условия са <b>необходими</b>: ако едно от тях липсва, взаимно блокиране не може да възникне.</div>

<div class="block">
  <h3>Схема 11 · Граф на ресурсите и цикъл</h3>
  <p class="muted">Поле „държи“: за R1, R2, … номер на процеса, който държи ресурса („-“ = свободен). Поле „чака“: за P1, P2, … номер на ресурса, който процесът чака („-“ = нищо). Ресурсите са с по един екземпляр.</p>
  <div id="v-cycle"></div>
  <details class="trap"><summary>Капан: deadlock ≠ гладуване</summary><div>
    <p>При Схема 11 — A държи R1 и чака R2, B държи R2 и чака R1 — при липса на механизъм за отнемане или прекъсване на цикъла никой не напредва. Това е различно от <dfn data-g="гладуване">гладуване</dfn>, при което други участници продължават. Гладуването е неопределено отлагане и не е тъждествено на deadlock.</p>
  </div></details>
  <details class="hint"><summary>Хинт: защо цикълът е достатъчен само при единични ресурси</summary><div>
    <p>Ако от ресурс има няколко еднакви екземпляра, процес в цикъла може да получи друг екземпляр, освободен от процес извън цикъла. Тогава цикълът е необходим, но не достатъчен — затова за многоекземплярни ресурси се използва алгоритъм от типа на банкера по-долу. <span class="extra-tag">разширение</span></p>
  </div></details>
</div>

<div class="block">
  <h3>Три стратегии</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Стратегия</th><th>Идея</th><th>Цена</th></tr>
    <tr><td>Предотвратяване</td><td>премахва възможност за някое необходимо условие (напр. общ ред на заключванията)</td><td>ограничава програмирането</td></tr>
    <tr><td>Избягване</td><td>допуска заявка само ако се запазва <dfn data-g="безопасно състояние">безопасно състояние</dfn>; алгоритъм на банкера</td><td>изисква предварителни оценки за максималните потребности</td></tr>
    <tr><td>Откриване и възстановяване</td><td>допуска възникване и после прекъсва цикъла</td><td>прекъснат участник губи работа</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>Алгоритъм на банкера</h3>
  <p class="prose">Ръководството назовава алгоритъма на банкера като пример за избягване. Стъпките по-долу са класическата му формулировка <span class="extra-tag">разширение</span>: Need = Max − Allocation; състоянието е безопасно, ако съществува ред, в който всеки процес може да получи остатъчната си потребност от Work и после да освободи всичко. Процесите са номерирани P0, P1, … — редовете на матриците се разделят с „;“.</p>
  <div id="v-bank"></div>
  <details class="trap"><summary>Капан: небезопасно ≠ взаимно блокиране</summary><div>
    <p>Небезопасното състояние означава, че няма <b>гаранция</b>: при най-лошото поведение (всички поискат максимума си) може да се стигне до блокиране. Процесите може и да не поискат максимума. Банкерът е консервативен — отказва заявки, които биха могли да минат.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Четири необходими условия: взаимно изключване, задържане с изчакване, без принудително отнемане, кръгово изчакване. Предотвратяване — премахни условие; избягване — пази безопасно състояние (банкер, изисква Max); откриване — цикъл в графа, после прекъсване. Deadlock ≠ starvation ≠ livelock.</div>`;

  function mount(root) {
    const cb = root.querySelector("#conds"), cn = root.querySelector("#cond-note");
    const btns = COND.map((C, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      cn.innerHTML = `<p><b>${i + 1}. ${C.t}</b> — ${C.d}</p><p>Предотвратяване чрез премахване: ${C.prev}</p>`;
    } }, h("span", { class: "eyebrow", text: "условие " + (i + 1) }), h("h4", { text: C.t }), h("p", { text: C.d })));
    cb.append(...btns);

    S.viz(root.querySelector("#v-cycle"), {
      id: "cycle", title: "Търсене на цикъл в графа на изчакване", sub: "Червено = процеси във взаимно блокиране.",
      code: "s05_cycle",
      inputs: [{ id: "hold", label: "държи (R1 R2 …)", value: "1 2", width: "10em" }, { id: "want", label: "чака (P1 P2 …)", value: "2 1", width: "10em" }],
      presets: [{ label: "Схема 11", values: { hold: "1 2", want: "2 1" } }, { label: "Верига без цикъл", values: { hold: "1 2 -", want: "2 3 -" } }, { label: "Цикъл от трима", values: { hold: "1 2 3 4", want: "2 3 1 1" } },
        { label: "Общ ред R1→R2", values: { hold: "1 -", want: "2 1" }, title: "P2 спазва реда: първо иска R1, затова не държи R2" }],
      legend: [["s-act", "текущ"], ["s-cmp", "посетен / чака"], ["s-done", "разпределен"], ["s-swap", "цикъл"]],
      build: algos.cycle, draw: drawGraph,
    });

    S.viz(root.querySelector("#v-bank"), {
      id: "bank", title: "Безопасно състояние и заявка", sub: "Зелено в Need = покрито от Work; червено = не стига.",
      code: "s05_banker",
      inputs: [{ id: "avail", label: "Available", value: "3 3 2", width: "7em" },
        { id: "max", label: "Max (редове с ;)", value: "7 5 3; 3 2 2; 9 0 2; 2 2 2; 4 3 3", width: "17em" },
        { id: "alloc", label: "Allocation", value: "0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2", width: "17em" },
        { id: "req", label: "Заявка (P1: 1 0 2)", value: "", width: "9em" }],
      presets: [{ label: "Само проверка", values: { avail: "3 3 2", alloc: "0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2", req: "" } }, { label: "P1: 1 0 2 → да", values: { avail: "3 3 2", alloc: "0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2", req: "P1: 1 0 2" } },
        { label: "след това P4: 3 3 0 → чака", values: { avail: "2 3 0", alloc: "0 1 0; 3 0 2; 3 0 2; 2 1 1; 0 0 2", req: "P4: 3 3 0" } }, { label: "P0: 8 0 0 → грешка", values: { avail: "3 3 2", alloc: "0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2", req: "P0: 8 0 0" } },
        { label: "след това P0: 0 2 0 → небезопасно", values: { avail: "2 3 0", alloc: "0 1 0; 3 0 2; 3 0 2; 2 1 1; 0 0 2", req: "P0: 0 2 0" } }],
      build: algos.banker, draw: drawBank,
    });
  }

  S.chapter({ id: "deadlock", order: 5, num: "5", group: "Ресурси", title: "Взаимно блокиране", lead: "Четирите необходими условия, граф на ресурсите и цикъл, предотвратяване, избягване (алгоритъм на банкера), откриване.", html, mount, algos });
})();
