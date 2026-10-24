/* Раздел 8 — продукционни правила: прав и обратен извод върху редактируема база (същият механизъм като 08_rules.c). */
(function () {
  const S = window.Study, h = S.h;
  const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const bytes = (s) => (enc ? enc.encode(s).length : s.length * 2);
  const OPS = [">=", "<=", ">", "<", "="];

  /* ---------- разбор (същите правила като parse_rules / parse_facts в C) ---------- */
  function parseRules(text) {
    const R = [];
    String(text).split(/[;\n]+/).forEach((ln) => {
      const a = ln.indexOf("->");
      if (a < 0) { if (ln.trim()) throw new Error(`„${ln.trim()}“: липсва „->“.`); return; }
      let lhs = ln.slice(0, a), name;
      const c = lhs.indexOf(":");
      if (c >= 0) { name = lhs.slice(0, c).trim(); lhs = lhs.slice(c + 1); } else name = "R" + (R.length + 1);
      const concl = ln.slice(a + 2).trim();
      const cond = lhs.split("&").map((x) => x.trim()).filter(Boolean);
      if (!concl) throw new Error(`Правило ${name}: празно заключение.`);
      if (!cond.length) throw new Error(`Правило ${name}: няма условия.`);
      if (cond.length > 6) throw new Error(`Правило ${name}: най-много 6 условия.`);
      if (bytes(name) > 15) throw new Error(`Името „${name}“ е твърде дълго.`);
      for (const s of [concl, ...cond]) if (bytes(s) > 47 || /\s/.test(s)) throw new Error(`„${s}“: символът трябва да е без интервали и до ~22 букви.`);
      if (/[<>=]/.test(concl)) throw new Error(`Правило ${name}: заключението е символ, не сравнение.`);
      R.push({ name, cond, concl });
    });
    if (!R.length) throw new Error("Няма правила. Формат: R1: A & B -> C (по едно на ред или разделени с ;).");
    if (R.length > 24) throw new Error("Най-много 24 правила.");
    return R;
  }
  function parseFacts(text) {
    const W = [];
    String(text).split(/[\s,]+/).filter(Boolean).forEach((t) => {
      const e = t.indexOf("=");
      if (bytes(t) > 47) throw new Error(`„${t}“ е твърде дълъг.`);
      if (e >= 0) { const n = Number(t.slice(e + 1)); if (!Number.isInteger(n)) throw new Error(`„${t}“: стойността трябва да е цяло число.`); W.push({ sym: t.slice(0, e), num: n, hasNum: true, by: -1 }); }
      else W.push({ sym: t, hasNum: false, by: -1 });
    });
    if (W.length > 20) throw new Error("Най-много 20 начални факта.");
    return W;
  }

  /* ---------- машина за извод ---------- */
  function engine(rules, facts) {
    const R = parseRules(rules), W = parseFacts(facts);
    const E = { R, W, tests: 0, fired: [] };
    E.find = (s) => W.findIndex((f) => f.sym === s);
    E.holds = (c) => {
      E.tests++;
      for (const op of OPS) {
        const p = c.indexOf(op);
        if (p < 0) continue;
        const f = E.find(c.slice(0, p));
        if (f < 0 || !W[f].hasNum) return false;
        const x = W[f].num, n = parseInt(c.slice(p + op.length), 10) || 0;
        return op === ">=" ? x >= n : op === "<=" ? x <= n : op === ">" ? x > n : op === "<" ? x < n : x === n;
      }
      return E.find(c) >= 0;
    };
    E.assert = (s, by) => { if (W.length >= 48) throw new Error("Работната памет е пълна (48 факта)."); W.push({ sym: s, hasNum: false, by }); };
    E.wm = () => W.filter((f) => !f.hasNum).map((f) => f.sym).join(" ") || "-";
    E.firedNames = () => E.fired.map((r) => R[r].name).join(" ") || "-";
    return E;
  }

  /** „как“-обяснение: дърво от факта назад до входните факти */
  function explain(E, sym, seen = new Set()) {
    const i = E.find(sym);
    if (i < 0) return { sym, kind: "missing" };
    const f = E.W[i];
    if (f.by < 0) return { sym: f.hasNum ? `${f.sym}=${f.num}` : sym, kind: "input" };
    if (seen.has(sym)) return { sym, kind: "loop" };
    seen.add(sym);
    const r = E.R[f.by];
    return { sym, kind: "rule", rule: r.name, kids: r.cond.map((c) => {
      const op = OPS.find((o) => c.includes(o));
      if (op) { const v = c.slice(0, c.indexOf(op)), j = E.find(v); return { sym: c, kind: "test", val: j >= 0 ? `${v}=${E.W[j].num}` : "?" }; }
      return explain(E, c, seen);
    }) };
  }

  /* ---------- чисти функции ---------- */
  const algos = {
    parseRules, parseFacts, engine, explain,

    /** forward(strategy, refraction, limit) от 08_rules.c */
    forward({ rules, facts, strategy, refraction, limit }) {
      const E = engine(rules, facts);
      const strat = +strategy === 1 ? 1 : 0, refr = !(refraction === false || refraction === "0");
      const LIM = limit == null ? 12 : S.int(limit, 1, 40, "Лимитът на цикли");
      const { R, W } = E;
      let cycles = 0, result;
      const F = [];
      const snap = () => W.map((f) => Object.assign({}, f));
      const st = () => ({ цикли: cycles, "проверки на условия": E.tests, задействания: E.fired.length });
      const push = (o) => F.push(Object.assign({ R, W: snap(), fired: E.fired.slice(), stats: st() }, o));
      push({ at: "cycle", ruleSt: {}, vars: {}, msg: "Начална работна памет: " + W.map((f) => (f.hasNum ? `${f.sym}=${f.num}` : f.sym)).join(", ") + ". Стратегия: " + (strat ? "по специфичност" : "по реда на правилата") + (refr ? ", с рефракция." : ", <b>без</b> рефракция."), log: "старт" });
      for (;;) {
        if (++cycles > LIM) { push({ at: "limit", ruleSt: {}, vars: { цикъл: cycles }, msg: `<span class="warn">Прекъснато след ${LIM} цикъла</span> — едно и също правило се задейства отново и отново без нова информация. Това е причината за <b>рефракцията</b>.`, inv: { text: "безкраен цикъл без нова информация", ok: false }, log: "✗ лимит" }); result = -1; break; }
        const ruleSt = {};
        let chosen = -1;
        push({ at: "cycle", ruleSt: {}, vars: { цикъл: cycles }, msg: `<b>Цикъл ${cycles}</b>: съпоставяне — проверяваме всяко правило спрямо работната памет.` });
        for (let r = 0; r < R.length; r++) {
          if (refr && E.find(R[r].concl) >= 0) { ruleSt[r] = "refr"; push({ at: "refr", ruleSt: Object.assign({}, ruleSt), rcur: r, vars: { правило: R[r].name }, msg: `${R[r].name}: заключението „${R[r].concl}“ вече е в паметта — рефракция, не се разглежда.` }); continue; }
          let ok = true;
          const cs = [];
          for (let c = 0; c < R[r].cond.length && ok; c++) { ok = E.holds(R[r].cond[c]); cs.push(ok); }
          ruleSt[r] = ok ? "cs" : "no";
          push({ at: "cond", ruleSt: Object.assign({}, ruleSt), rcur: r, conds: cs, vars: { правило: R[r].name }, msg: `${R[r].name}: ${R[r].cond.map((c, k) => (k < cs.length ? `${c} ${cs[k] ? "✓" : "✗"}` : `<span class="muted">${c} (не се проверява)</span>`)).join(", ")} ⇒ ${ok ? "<b>в конфликтното множество</b>" : "не е приложимо"}.` });
          if (!ok) continue;
          if (chosen < 0 || (strat === 1 && R[r].cond.length > R[chosen].cond.length)) chosen = r;
        }
        const cset = Object.keys(ruleSt).filter((k) => ruleSt[k] === "cs").map(Number);
        if (chosen < 0) { push({ at: "stop", ruleSt, vars: {}, msg: "Конфликтното множество е празно — няма какво повече да се изведе. Изводът спира.", log: "край" }); result = E.fired.length; break; }
        push({ at: "conflict", ruleSt, chosen, vars: { "конфликтно множество": cset.map((k) => R[k].name).join(", "), избрано: R[chosen].name }, msg: `<dfn data-g="конфликтно множество">Конфликтно множество</dfn>: {${cset.map((k) => R[k].name).join(", ")}}. Избираме <b>${R[chosen].name}</b> ${strat ? `(най-много условия: ${R[chosen].cond.length})` : "(първо по ред)"}.` });
        const isNew = E.find(R[chosen].concl) < 0;
        if (isNew) E.assert(R[chosen].concl, chosen);
        E.fired.push(chosen);
        push({ at: isNew ? ["fire", "act"] : "act", ruleSt, chosen, newFact: isNew ? R[chosen].concl : null, vars: { задейства: R[chosen].name }, msg: isNew ? `${R[chosen].name} се задейства: добавяме <b>${R[chosen].concl}</b> в работната памет.` : `${R[chosen].name} се задейства отново, но „${R[chosen].concl}“ вече е там — <b>няма нова информация</b>.`, log: `${R[chosen].name} ⇒ ${R[chosen].concl}${isNew ? "" : " (повторно)"}` });
      }
      const last = F[F.length - 1];
      last.done = true;
      return { frames: F, result, wm: E.wm(), fired: E.firedNames(), cycles, tests: E.tests, E };
    },

    /** prove(goal) от 08_rules.c */
    backward({ rules, facts, goal }) {
      const E = engine(rules, facts);
      const G = String(goal).trim();
      if (!G) throw new Error("Въведи цел.");
      const { R, W } = E;
      let calls = 0;
      const STACK = [], F = [], tree = [];
      const snap = () => W.map((f) => Object.assign({}, f));
      const st = () => ({ "извиквания prove": calls, "проверки": E.tests, "дълбочина": STACK.length });
      const push = (o) => F.push(Object.assign({ R, W: snap(), stack: STACK.slice(), tree: tree.map((n) => Object.assign({}, n)), stats: st() }, o));
      function prove(goal, parent) {
        calls++;
        const id = tree.length;
        tree.push({ id, goal, parent, st: "open", rule: null, d: STACK.length });
        push({ at: "call", cur: id, vars: { цел: goal }, msg: `prove(<b>${goal}</b>) — ${STACK.length ? "подцел" : "основна цел"}.` });
        if (E.holds(goal)) { tree[id].st = "fact"; push({ at: "known", cur: id, vars: { цел: goal }, msg: `„${goal}“ е в работната памет (или сравнението е вярно) — <b>доказано</b>.`, log: `${"· ".repeat(STACK.length)}${goal}: факт` }); return true; }
        if (STACK.includes(goal)) { tree[id].st = "loop"; push({ at: "loopchk", cur: id, vars: { цел: goal }, msg: `„${goal}“ вече се доказва по-горе в стека — цикъл, отхвърляме този път.`, log: `${"· ".repeat(STACK.length)}${goal}: цикъл` }); return false; }
        if (STACK.length >= 16) { tree[id].st = "fail"; return false; }
        STACK.push(goal);
        let any = false;
        for (let r = 0; r < R.length; r++) {
          if (R[r].concl !== goal) continue;
          any = true;
          tree[id].rule = R[r].name;
          push({ at: ["try", "rules"], cur: id, rcur: r, vars: { цел: goal, правило: R[r].name }, msg: `Правило ${R[r].name} извежда „${goal}“. Подцели: ${R[r].cond.join(", ")}.` });
          let ok = true;
          for (let c = 0; c < R[r].cond.length && ok; c++) {
            push({ at: "sub", cur: id, rcur: r, vars: { цел: goal, подцел: R[r].cond[c] }, msg: `Подцел ${c + 1}/${R[r].cond.length}: <b>${R[r].cond[c]}</b>.` });
            ok = prove(R[r].cond[c], id);
          }
          if (ok) {
            E.assert(goal, r); E.fired.push(r);
            tree[id].st = "proved";
            STACK.pop();
            push({ at: "proved", cur: id, rcur: r, vars: { цел: goal }, msg: `Всички подцели на ${R[r].name} са доказани ⇒ „${goal}“ е <b>доказано</b> и се добавя в паметта.`, log: `${"· ".repeat(STACK.length)}${goal}: ✓ чрез ${R[r].name}` });
            return true;
          }
          push({ at: "try", cur: id, rcur: r, vars: { цел: goal }, msg: `${R[r].name} не успя. ${R.slice(r + 1).some((x) => x.concl === goal) ? "Пробваме следващо правило със същото заключение." : ""}` });
        }
        STACK.pop();
        tree[id].st = "fail";
        push({ at: "fail", cur: id, vars: { цел: goal }, msg: any ? `Нито едно правило не доказа „${goal}“ — <b>неуспех</b>.` : `„${goal}“ не е факт и няма правило, което да го извежда — <b>неуспех</b>.`, log: `${"· ".repeat(STACK.length)}${goal}: ✗` });
        return false;
      }
      const ok = prove(G, -1);
      const last = F[F.length - 1];
      last.done = true;
      last.inv = { text: ok ? `целта „${G}“ е доказана` : `целта „${G}“ не може да се докаже от наличните факти и правила`, ok };
      return { frames: F, proved: ok ? 1 : 0, wm: E.wm(), fired: E.firedNames(), calls, tests: E.tests, E };
    },
  };

  /* ---------- рисуване ---------- */
  function wmBox(f, extra) {
    const box = h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Работна памет" }));
    const p = h("div", { class: "row", style: { gap: "4px" } });
    f.W.forEach((w) => p.append(h("span", { class: "pill " + (w.by < 0 ? "s-piv" : w.sym === (extra && extra.newFact) ? "s-act" : "s-done"), title: w.by < 0 ? "входен факт" : "изведен от " + f.R[w.by].name, text: w.hasNum ? `${w.sym}=${w.num}` : w.sym })));
    box.append(p, h("p", { class: "muted", style: { fontSize: ".72rem", margin: "6px 0 0" }, text: "виолетово — вход; зелено — изведено" }));
    return box;
  }
  function rulesTable(f, stmap, opts = {}) {
    const LBL = { refr: ["s-dim", "рефракция"], cs: ["s-cmp", "приложимо"], no: ["", "не"] };
    const t = h("table", { class: "t" }, h("tr", null, h("th", { text: "" }), h("th", { text: "АКО" }), h("th", { text: "ТО" }), h("th", { text: "състояние" })));
    f.R.forEach((r, k) => {
      let cls = "", lab = "";
      if (stmap && stmap[k]) { [cls, lab] = LBL[stmap[k]]; }
      if (opts.chosen === k) { cls = "s-done"; lab = "избрано"; }
      if (opts.rcur === k) { cls = "s-act"; lab = lab || "проверява се"; }
      t.append(h("tr", { class: cls }, h("td", { class: "mono", style: { color: "var(--c, inherit)", fontWeight: 600 }, text: r.name }),
        h("td", null, ...r.cond.map((c, i) => h("span", { class: "pill " + (opts.rcur === k && f.conds ? (i < f.conds.length ? (f.conds[i] ? "s-done" : "s-swap") : "s-dim") : ""), style: { margin: "1px" }, text: c }))),
        h("td", { class: "mono", text: r.concl }), h("td", { text: lab })));
    });
    return h("div", { class: "tbl-wrap" }, t);
  }
  function drawForward(st, f) {
    st.innerHTML = "";
    st.append(h("div", { class: "split", style: { alignItems: "start" } }, rulesTable(f, f.ruleSt, { chosen: f.chosen, rcur: f.rcur }), wmBox(f, f)));
  }
  function drawBackward(st, f) {
    st.innerHTML = "";
    const T = f.tree, kids = T.map(() => []);
    T.forEach((n) => { if (n.parent >= 0) kids[n.parent].push(n.id); });
    const ul = (id) => {
      const n = T[id];
      const C = { open: "s-cmp", fact: "s-piv", proved: "s-done", fail: "s-swap", loop: "s-swap" }[n.st];
      const L = { open: "доказва се…", fact: "факт", proved: "доказано чрез " + n.rule, fail: "неуспех", loop: "цикъл" }[n.st];
      return h("li", null, h("span", { class: "pill " + (id === f.cur ? "s-act" : C), text: n.goal }), " ", h("span", { class: "muted", style: { fontSize: ".75rem" }, text: L }),
        kids[id].length ? h("ul", { style: { margin: "4px 0 4px 6px", paddingLeft: "14px", borderLeft: "1px dashed var(--line)" } }, ...kids[id].map(ul)) : null);
    };
    const tree = h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Дърво на доказателството (цел → подцели)" }), T.length ? h("ul", { style: { listStyle: "none", paddingLeft: "0", margin: "6px 0" } }, ul(0)) : null);
    st.append(h("div", { class: "split", style: { alignItems: "start" } }, tree, h("div", { style: { display: "grid", gap: "10px", minWidth: 0 } }, wmBox(f), rulesTable(f, null, { rcur: f.rcur }))));
  }

  /* ---------- съдържание ---------- */
  const KB1 = "R1: T>80 -> прегряване; R2: липсва_захранване -> провери_захранващия_път; R3: има_захранване & не_отговаря -> провери_връзката; R4: не_отговаря -> рестартирай; R5: прегряване & провери_връзката -> спри_и_охлади";
  const KB2 = "R1: A & B -> C; R2: C -> D; R3: D & E -> G; R4: F -> G; R5: G -> H";
  const KB3 = "R1: P -> Q; R2: Q -> P; R3: S -> P";

  const html = `
<div class="prose">
  <p><dfn data-g="продукционно правило">Продукционното правило</dfn> има вид <b>АКО</b> условие <b>ТО</b> заключение или действие. Едни и същи правила могат да се използват в две посоки: <dfn data-g="прав извод">прав извод</dfn> започва от известните факти и извежда следствия; <dfn data-g="обратен извод">обратен извод</dfn> започва от цел и търси подкрепящи факти и подцели. Това са <b>посоки на работа</b>, а не различни степени на логическа надеждност.</p>
  <p>Базата от правила е <b>редактируема</b>: правилата се разделят с „;“, всяко във вид „Име: условие & условие -> заключение“. Условие е символ (факт) или сравнение с числов факт: <code>T&gt;80</code>, <code>T&lt;=5</code>, <code>P=1</code>. Фактите се въвеждат с интервал: <code>T=90 има_захранване</code>.</p>
</div>

<div class="block">
  <h3>Прав извод: съпоставяне → конфликтно множество → избор → изпълнение</h3>
  <div id="v8-fw"></div>
  <div class="key">Цикълът на правия извод: (1) <b>съпоставяне</b> на условията с работната памет; (2) <b>конфликтно множество</b> — всички приложими правила; (3) <b>избор</b> по стратегия (приоритет, специфичност, новост); (4) <b>изпълнение</b> — ново заключение в паметта. Край — когато множеството е празно.</div>
  <details class="hint"><summary>Хинт: стратегията променя реда, не резултата (тук)</summary><div>
    <p>Сравни „по реда“ и „по специфичност“ върху диагностичната база: редът на задействане се сменя (R1 R3 R4 R5 срещу R3 R1 R5 R4), но крайната работна памет е същата. При правила с действия (изтриване на факт, команда към устройство) редът вече може да промени резултата.</p>
  </div></details>
  <details class="trap"><summary>Капан: правило, което се задейства безкрайно</summary><div>
    <p>Махни отметката „рефракция“. R1 остава приложимо (T = 90 не се променя) и стратегията „първо по ред“ го избира отново и отново — без нова информация. Необходимо е да се предотврати безкрайно повтаряне на правило: тук чрез опростен вариант на <b>рефракцията</b> — правило, чието заключение вече е в паметта, не влиза в конфликтното множество. Класическата рефракция (OPS5, CLIPS) забранява повторното задействане на една и съща <b>инстанциация</b> (правило + същите съпоставени факти).</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 15 — обратен извод върху същите правила</h3>
  <p class="prose">Целта се доказва, ако е факт или ако има правило с това заключение, чиито условия (подцели) могат да се докажат. Правилата се пробват по ред; при неуспех — следващото със същото заключение. Пробвай „алтернативно правило“ (G се доказва през R4, след като R3 не успява) и „цикъл“.</p>
  <div id="v8-bw"></div>
  <details class="hint"><summary>Хинт: кога коя посока</summary><div>
    <p>Правият извод извежда <b>всичко</b>, което следва от фактите — полезно при наблюдение и мониторинг (дойде ново измерване — какво следва?). Обратният докосва само правилата, свързани с целта — полезно при диагностика „дали е X?“ и когато фактите се питат от потребителя при нужда. Сравни броя проверки на условия: b1 прави 6, правият извод върху същото — 20.</p>
  </div></details>
  <details class="trap"><summary>Капан: неуспех на доказването = доказано отрицание</summary><div>
    <p>„Не можах да докажа спри_и_охлади“ при T = 70 означава само, че от <b>тези</b> факти и правила не следва. Дали е невярно зависи от предположението за <a href="#logika">отворен или затворен свят</a>. Възможни са алтернативни правила и неуспех на доказването.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v8-fw"), {
      id: "c8f", title: "Прав извод (forward chaining)", sub: "Синьо — проверявано правило; оранжево — в конфликтното множество; зелено — избрано; сиво — рефракция.",
      code: "ch08_forward",
      inputs: [
        { id: "rules", label: "Правила (разделени с ;)", value: KB1, width: "min(46em, 78vw)" },
        { id: "facts", label: "Факти", value: "T=90 има_захранване не_отговаря", width: "20em" },
        { id: "strategy", label: "избор", type: "select", value: "0", options: [["0", "по реда на правилата"], ["1", "по специфичност"]] },
        { id: "refraction", label: "рефракция", type: "checkbox", value: true },
      ],
      presets: [
        { label: "диагностика T=90", values: { rules: KB1, facts: "T=90 има_захранване не_отговаря", strategy: "0", refraction: true } },
        { label: "без захранване", values: { rules: KB1, facts: "T=70 липсва_захранване", strategy: "0", refraction: true } },
        { label: "без рефракция", values: { rules: KB1, facts: "T=90 има_захранване не_отговаря", strategy: "0", refraction: false } },
        { label: "A B E → H", values: { rules: KB2, facts: "A B E", strategy: "0", refraction: true } },
      ],
      legend: [["s-act", "проверява се / ново"], ["s-cmp", "конфликтно множество"], ["s-done", "избрано"], ["s-dim", "рефракция"]],
      build: algos.forward, draw: drawForward, speed: 1,
    });
    S.viz(root.querySelector("#v8-bw"), {
      id: "c8b", title: "Обратен извод (backward chaining)", sub: "Дърво на подцелите: оранжево — доказва се; зелено — доказано; виолетово — факт; червено — неуспех/цикъл.",
      code: "ch08_backward",
      inputs: [
        { id: "rules", label: "Правила (разделени с ;)", value: KB1, width: "min(46em, 78vw)" },
        { id: "facts", label: "Факти", value: "T=90 има_захранване не_отговаря", width: "20em" },
        { id: "goal", label: "Цел", value: "спри_и_охлади", width: "12em" },
      ],
      presets: [
        { label: "спри_и_охлади, T=90", values: { rules: KB1, facts: "T=90 има_захранване не_отговаря", goal: "спри_и_охлади" } },
        { label: "същото, T=70", values: { rules: KB1, facts: "T=70 има_захранване не_отговаря", goal: "спри_и_охлади" } },
        { label: "алтернативно правило", values: { rules: KB2, facts: "F", goal: "H" } },
        { label: "цикъл P↔Q", values: { rules: KB3, facts: "", goal: "Q" } },
        { label: "цикъл с изход", values: { rules: KB3, facts: "S", goal: "Q" } },
      ],
      legend: [["s-act", "текуща цел"], ["s-cmp", "доказва се"], ["s-done", "доказано"], ["s-swap", "неуспех"]],
      build: algos.backward, draw: drawBackward, speed: 1,
    });
  }

  S.Tema08 = Object.assign(S.Tema08 || {}, { rules: { engine, explain, forward: algos.forward, KB1 } });
  S.chapter({ id: "pravila", order: 8, num: "8", group: "Експертни системи", title: "Продукционни правила: прав и обратен извод",
    lead: "Едни и същи правила АКО–ТО в две посоки. Прав извод с конфликтно множество и рефракция; обратен извод с дърво на подцелите, алтернативни правила и защита от цикли.", html, mount, algos });
})();
