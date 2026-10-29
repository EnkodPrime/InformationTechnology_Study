/* Раздел 3 — планиране: FCFS, SJF, SRTF, RR, приоритети; диаграма на Гант; RTOS. */
(function () {
  const S = window.Study, h = S.h;
  const POL = { fcfs: 0, sjf: 1, srtf: 2, rr: 3, prio: 4, pprio: 5 };
  const PNAME = { fcfs: "FCFS", sjf: "SJF", srtf: "SRTF (изпреварващ SJF)", rr: "Round Robin", prio: "Приоритет", pprio: "Приоритет с изпреварване" };
  const L = (i) => String.fromCharCode(65 + i);
  const COLORS = ["#4f7fd0", "#d08a2a", "#3f9a64", "#b0504a", "#8a62c8", "#2a9aa8", "#a07a3a", "#c05a9a", "#6a8a2a", "#5a6aa0"];

  /* "0:8 0:4 0:2" или "0:7:3 2:4:1" (пристигане:продължителност[:приоритет]) */
  function parseJobs(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне един процес във вида пристигане:продължителност[:приоритет].");
    if (parts.length > 8) throw new Error("Най-много 8 процеса.");
    return parts.map((p) => {
      const m = /^(\d+):(\d+)(?::(\d+))?$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е процес. Формат: пристигане:продължителност[:приоритет], напр. 0:8 или 2:4:1.`);
      const arr = +m[1], burst = +m[2], prio = m[3] == null ? 1 : +m[3];
      if (arr > 40) throw new Error("Пристигането трябва да е от 0 до 40.");
      if (burst < 1 || burst > 20) throw new Error("Продължителността трябва да е от 1 до 20.");
      if (prio > 9) throw new Error("Приоритетът трябва да е от 0 до 9.");
      return { arr, burst, prio };
    });
  }

  function better(pol, j, rem, a, b) {
    if (b < 0) return true;
    let ka = 0, kb = 0;
    if (pol === 1) { ka = j[a].burst; kb = j[b].burst; }
    if (pol === 2) { ka = rem[a]; kb = rem[b]; }
    if (pol === 4 || pol === 5) { ka = j[a].prio; kb = j[b].prio; }
    if (ka !== kb) return ka < kb;
    if (j[a].arr !== j[b].arr) return j[a].arr < j[b].arr;
    return a < b;
  }

  function gantt(tl) {
    const out = [];
    for (let t = 0; t < tl.length;) {
      const c = tl[t], s = t;
      while (t < tl.length && tl[t] === c) t++;
      out.push(`${c < 0 ? "-" : L(c)}${s}-${t}`);
    }
    return out.join(" ");
  }

  const algos = {
    parseJobs, gantt,
    /* Огледало на schedule() от c/03_planirane.c */
    sched({ jobs, policy, q }) {
      const j = parseJobs(jobs);
      const pol = POL[policy];
      if (pol == null) throw new Error("Непозната политика.");
      q = S.int(q, 1, 10, "Квантът");
      const n = j.length;
      const rem = j.map((x) => x.burst), start = Array(n).fill(-1), finish = Array(n).fill(0);
      let queue = [], cur = -1, slice = 0, done = 0, t = 0, prev = -1, switches = 0;
      const tl = [], F = [];
      const snap = (o) => ({ j, tl: tl.slice(), queue: queue.slice(), cur, rem: rem.slice(), t, stats: { време: t, превключвания: switches, завършили: done }, ...o });
      F.push(snap({ vars: { политика: PNAME[policy], q: pol === 3 ? q : "—" }, msg: `Политика <b>${PNAME[policy]}</b>${pol === 3 ? `, квант ${q}` : ""}. ${n} процеса. Разход за превключване не се отчита.` }));
      while (done < n && t < 400) {
        const arrived = [];
        for (let i = 0; i < n; i++) if (j[i].arr === t) { queue.push(i); arrived.push(i); }
        if (arrived.length) F.push(snap({ at: "arrive", vars: { t, пристигат: arrived.map(L).join(", ") }, msg: `t = ${t}: пристига ${arrived.map(L).join(", ")} → опашка на готовите.` }));
        if (pol === 3 && cur >= 0 && slice === q) {
          queue.push(cur);
          F.push(snap({ at: "quantum", vars: { t, изпреварен: L(cur) }, msg: `t = ${t}: квантът на ${L(cur)} (${q}) изтече — ${L(cur)} отива в <b>края</b> на опашката (след новопристигналите).`, log: `t=${t}: ${L(cur)} — край на кванта` }));
          cur = -1;
        }
        const preempt = pol === 2 || pol === 5;
        if (cur < 0 || preempt) {
          let best = cur, bi = -1;
          for (let k = 0; k < queue.length; k++) {
            const c = queue[k];
            if (pol === 0 || pol === 3) { if (bi < 0) { best = c; bi = k; } }
            else if (better(pol, j, rem, c, best)) { best = c; bi = k; }
          }
          const crit = pol === 1 ? "най-кратка продължителност" : pol === 2 ? "най-малко оставащо време" : pol === 4 || pol === 5 ? "най-висок приоритет (най-малко число)" : "първи в опашката";
          if (bi >= 0) {
            const was = cur;
            if (cur >= 0) queue.push(cur);
            queue.splice(bi, 1);
            cur = best; slice = 0;
            const first = start[cur] < 0;
            if (first) start[cur] = t;
            F.push(snap({ at: was >= 0 ? ["preempt", "cmp"] : pol === 0 || pol === 3 ? "pick" : ["cmp", "pick"], pick: cur, vars: { t, избран: L(cur), критерий: crit }, msg: was >= 0 ? `t = ${t}: <b>${L(cur)}</b> изпреварва ${L(was)} (${crit}: ${pol === 2 ? `${rem[cur]} &lt; ${rem[was]}` : `${j[cur].prio} &lt; ${j[was].prio}`}). ${L(was)} се връща в опашката.` : `t = ${t}: процесорът е свободен — избираме <b>${L(cur)}</b> (${crit}).${first ? ` Първи отговор на ${L(cur)} след ${t - j[cur].arr} единици чакане.` : ""}`, log: `t=${t}: → ${L(cur)}${was >= 0 ? ` (изпреварва ${L(was)})` : ""}` }));
          } else if (cur < 0) {
            F.push(snap({ at: "pick", vars: { t }, msg: `t = ${t}: опашката е празна — процесорът е <b>свободен</b>.` }));
          }
        }
        tl.push(cur);
        if (cur >= 0) {
          if (prev >= 0 && prev !== cur) switches++;
          prev = cur;
          rem[cur]--; slice++;
          if (rem[cur] === 0) {
            finish[cur] = t + 1; done++;
            F.push(snap({ at: "finish", t: t + 1, fin: cur, vars: { t: t + 1, завършва: L(cur) }, msg: `t = ${t + 1}: ${L(cur)} <b>завършва</b>. Обръщане = ${t + 1} − ${j[cur].arr} = ${t + 1 - j[cur].arr}; чакане = ${t + 1 - j[cur].arr} − ${j[cur].burst} = ${t + 1 - j[cur].arr - j[cur].burst}.`, log: `t=${t + 1}: ${L(cur)} завършва` }));
            cur = -1;
          } else F.push(snap({ at: "run", t: t + 1, vars: { t: t + 1, [`оставащо ${L(cur)}`]: rem[cur] }, msg: `[${t}, ${t + 1}): изпълнява се ${L(cur)}; остават ${rem[cur]}.` }));
        } else F.push(snap({ at: "run", t: t + 1, vars: { t: t + 1 }, msg: `[${t}, ${t + 1}): празен процесор.` }));
        t++;
      }
      let wait = 0, tat = 0, resp = 0;
      const rows = j.map((x, i) => { const ta = finish[i] - x.arr, w = ta - x.burst, r = start[i] - x.arr; wait += w; tat += ta; resp += r; return { i, ...x, finish: finish[i], tat: ta, wait: w, resp: r }; });
      F.push(snap({ at: "metrics", done: true, rows, vars: { "Σ чакане": wait, "Σ обръщане": tat, "Σ отговор": resp }, msg: `Средно чакане = ${wait}/${n} = <b>${(wait / n).toFixed(2)}</b>; средно обръщане = ${tat}/${n} = <b>${(tat / n).toFixed(2)}</b>; средно време за първи отговор = ${resp}/${n} = ${(resp / n).toFixed(2)}.` }));
      return { frames: F, gantt: gantt(tl), wait, tat, resp, switches, rows, T: t };
    },
  };

  function drawGantt(st, f, j, finalT) {
    const T = Math.max(finalT || f.tl.length, 1);
    const maxT = Math.max(T, ...j.map((x) => x.arr + 1));
    const W = Math.max(360, Math.min(900, 40 + maxT * 30)), u = (W - 40) / maxT;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 92`, width: W, role: "img", "aria-label": "Диаграма на Гант" });
    for (let t = 0; t < f.tl.length;) {
      const c = f.tl[t], s = t;
      while (t < f.tl.length && f.tl[t] === c) t++;
      const x = 20 + s * u, w = (t - s) * u;
      svg.append(S.svg("rect", { x, y: 20, width: w, height: 34, fill: c < 0 ? "transparent" : COLORS[c % 10], stroke: "var(--line)", "stroke-dasharray": c < 0 ? "4 3" : null, opacity: 0.9 }));
      if (c >= 0) svg.append(S.svg("text", { x: x + w / 2, y: 42, "text-anchor": "middle", style: "fill:#fff;font-weight:700", text: L(c) }));
    }
    for (let t = 0; t <= maxT; t++) if (maxT <= 30 || t % 2 === 0) svg.append(S.svg("text", { x: 20 + t * u, y: 72, "text-anchor": "middle", class: "wt", style: "font-size:10.5px", text: t }));
    j.forEach((x, i) => svg.append(S.svg("text", { x: 20 + x.arr * u, y: 14, "text-anchor": "middle", style: `font-size:10px;fill:${COLORS[i % 10]};font-weight:700`, text: "↓" + L(i) })));
    if (f.t != null) svg.append(S.svg("line", { x1: 20 + f.t * u, y1: 16, x2: 20 + f.t * u, y2: 60, stroke: "var(--st-swap)", "stroke-width": 2 }));
    st.append(h("div", { class: "tbl-wrap" }, svg));
  }

  const html = `
<div class="prose">
  <p>Планировчикът избира кой <dfn data-g="готов процес">готов</dfn> процес или нишка да се изпълнява. Целите включват <b>пропускателна способност</b>, <b>време за отговор</b>, <b>време до завършване</b> и <b>справедливост</b>. Те могат да си противоречат: големи <dfn data-g="квант">кванти</dfn> намаляват разхода за превключване, но могат да влошат интерактивния отговор.</p>
  <p><dfn data-g="fcfs">FCFS</dfn> обслужва по реда на пристигане и може да задържи кратки задачи зад дълга. <dfn data-g="sjf">SJF</dfn> избира най-кратката следваща процесорна работа, но изисква нейна оценка. <dfn data-g="rr">Round Robin</dfn> редува готовите задачи с ограничен времеви квант. Приоритетното планиране избира по приоритет и без допълнителна политика може да доведе до <dfn data-g="гладуване">гладуване</dfn> на ниските приоритети.</p>
  <p><dfn data-g="изпреварване">Изпреварващото</dfn> планиране допуска ОС да отнеме процесора преди задачата доброволно да го освободи. Неизпреварващото изчаква блокиране или завършване.</p>
</div>

<div class="block">
  <h3>Схема 9 · Симулатор на планиране с диаграма на Гант</h3>
  <p class="muted">Процеси: <code>пристигане:продължителност[:приоритет]</code>, буквите A, B, C… следват реда. По-малко число = по-висок приоритет. SRTF и „приоритет с изпреварване“ <span class="extra-tag">разширение</span> са изпреварващите варианти.</p>
  <div id="v-sched"></div>
  <div class="key">
    <p><b>Определения</b> (един процесор, без разход за превключване):</p>
    <p class="formula">обръщане = завършване − пристигане</p>
    <p class="formula">чакане = обръщане − продължителност</p>
    <p class="formula">първи отговор = първо получаване на CPU − пристигане</p>
    <p>Пример от ръководството: A=8, B=4, C=2 в момент 0. FCFS: чакания 0, 8, 12 → средно <b>20/3</b>. SJF: 0, 2, 6 → средно <b>8/3</b>.</p>
  </div>
  <details class="hint"><summary>Хинт: защо SJF дава по-малко средно чакане</summary><div>
    <p>Всяка задача чака сумата от продължителностите на задачите преди нея. Ако кратката е първа, тя „натоварва“ чакането на всички следващи с малко число. При FCFS с A=8 отпред и B, и C плащат по 8. Сравнението предполага известни продължителности и нулев разход за превключване — при реални интерактивни задачи продължителността на следващия CPU интервал често е само прогноза.</p>
  </div></details>
  <details class="hint"><summary>Хинт: какво показва RR в примера</summary><div>
    <p>С квант 2 средното чакане е 16/3 — между FCFS и SJF, но средното време за първи отговор пада до 6/3 = 2: всяка задача получава процесора рано. Затова RR е подходящ за интерактивни системи. Пусни с квант 1 и с квант 20: при квант ≥ най-дългата задача RR съвпада с FCFS.</p>
  </div></details>
  <details class="trap"><summary>Капан: пропускателна способност ≠ време на отделна задача</summary><div>
    <p>Пропускателната способност измерва колко работа завършва за интервал. Времето за първи отговор е важно за интерактивна програма, дори когато общото завършване остава същото. Една политика може да подобри едната мярка и да влоши другата.</p>
  </div></details>
</div>

<div class="block">
  <h3>Сравнение на политиките върху един набор</h3>
  <p class="muted">Таблицата се пресмята от същия симулатор за процесите и кванта по-горе (натисни „Изпълни“ там, за да се обнови).</p>
  <div class="tbl-wrap" id="cmp-tbl"></div>
</div>

<div class="block">
  <h3>Реално време и RTOS</h3>
  <p class="prose">При системите за реално време съществено е спазването на срокове. Реално време не означава просто бърза ОС, а предвидимо поведение спрямо зададените времеви изисквания. <dfn data-g="rtos">RTOS</dfn> (Real Time Operating System) е категория. Примери: FreeRTOS, Zephyr, QNX Neutrino и VxWorks.</p>
  <div class="split">
    <div class="card"><h4>Твърдо реално време</h4><p>Пропуснат срок нарушава изискваната коректност.</p></div>
    <div class="card"><h4>Меко реално време</h4><p>Пропуснат срок допуска влошено качество.</p></div>
  </div>
  <details class="trap"><summary>Капан: „RTOS“ = гаранция за срок; приоритет = срок</summary><div>
    <p>Името RTOS не е гаранция за спазен краен срок при произволно приложение. Приоритетът задава предпочитание, но не е доказателство за спазен срок. „Бърза ОС“ и „ОС за реално време“ не са взаимозаменяеми определения.</p>
  </div></details>
</div>`;

  function mount(root) {
    const cmpBox = root.querySelector("#cmp-tbl");
    function renderCmp(inp) {
      cmpBox.innerHTML = "";
      let rows;
      try { rows = Object.keys(POL).map((p) => [p, algos.sched({ jobs: inp.jobs, policy: p, q: inp.q })]); } catch (e) { cmpBox.append(h("p", { class: "warn", text: e.message })); return; }
      const n = parseJobs(inp.jobs).length;
      const best = Math.min(...rows.map((r) => r[1].wait));
      const tb = h("table", { class: "t" }, h("tr", null, ...["Политика", "Гант", "ср. чакане", "ср. обръщане", "ср. отговор", "превключвания"].map((x) => h("th", { text: x }))));
      rows.forEach(([p, r]) => tb.append(h("tr", null, h("td", { text: PNAME[p] + (p === "rr" ? ` (q=${inp.q})` : "") }), h("td", { class: "mono", style: { fontSize: ".8rem" }, text: r.gantt }),
        h("td", { class: "mono " + (r.wait === best ? "s-done" : ""), style: r.wait === best ? { background: "var(--cb)" } : null, text: `${r.wait}/${n} = ${(r.wait / n).toFixed(2)}` }), h("td", { class: "mono", text: (r.tat / n).toFixed(2) }), h("td", { class: "mono", text: (r.resp / n).toFixed(2) }), h("td", { class: "mono", text: r.switches }))));
      cmpBox.append(tb);
    }
    let lastJ = null;
    S.viz(root.querySelector("#v-sched"), {
      id: "sched", title: "Планиране на един процесор", sub: "Червената линия е текущото време. ↓X — пристигане на X.",
      code: "s03_sched",
      inputs: [{ id: "jobs", label: "Процеси (пристигане:прод.[:приор.])", value: "0:8 0:4 0:2", width: "18em" },
        { id: "policy", label: "Политика", type: "select", value: "fcfs", options: Object.keys(POL).map((k) => [k, PNAME[k]]) },
        { id: "q", label: "Квант (RR)", type: "number", value: 2, width: "5em" }],
      presets: [{ label: "Пример от ръководството", values: { jobs: "0:8 0:4 0:2" } }, { label: "Различни пристигания", values: { jobs: "0:7:3 2:4:1 4:1:4 5:4:2", q: 3 } },
        { label: "Гладуване (приоритет)", values: { jobs: "0:3:1 0:6:9 2:3:1 4:3:1 6:3:1 8:3:1", policy: "pprio" }, title: "Нископриоритетният B чака, докато идват нови с висок приоритет" },
        { label: "Празен процесор", values: { jobs: "0:2 5:3", policy: "rr", q: 1 } }],
      random: () => ({ jobs: Array.from({ length: S.randInt(3, 5) }, () => `${S.randInt(0, 6)}:${S.randInt(1, 8)}:${S.randInt(0, 5)}`).join(" ") }),
      build(inp) { const r = algos.sched(inp); renderCmp(inp); lastJ = parseJobs(inp.jobs); return r; },
      draw(st, f, ctx) {
        st.innerHTML = "";
        drawGantt(st, f, f.j, ctx.res && ctx.res.T);
        const q = h("div", { class: "row", style: { margin: "8px 0" } }, h("span", { class: "muted", text: "опашка:" }), ...(f.queue.length ? f.queue.map((i) => h("span", { class: "pill s-cmp", text: L(i) })) : [h("span", { class: "muted", text: "празна" })]),
          h("span", { class: "muted", style: { marginLeft: "10px" }, text: "CPU:" }), h("span", { class: "pill " + (f.cur >= 0 ? "s-act" : ""), text: f.cur >= 0 ? L(f.cur) : "—" }));
        st.append(q);
        const tb = h("table", { class: "t grid" }, h("tr", null, ...["", "пристига", "прод.", "приор.", "остава", "завършва", "обръщане", "чакане", "отговор"].map((x) => h("th", { text: x }))));
        f.j.forEach((x, i) => {
          const r = f.rows && f.rows[i];
          tb.append(h("tr", null, h("th", { style: { color: COLORS[i % 10] }, text: L(i) }), h("td", { text: x.arr }), h("td", { text: x.burst }), h("td", { text: x.prio }),
            h("td", { class: f.cur === i ? "s-act" : f.rem[i] === 0 ? "s-done" : "", text: f.rem[i] }),
            h("td", { text: r ? r.finish : "" }), h("td", { text: r ? r.tat : "" }), h("td", { class: r ? "s-cmp" : "", text: r ? r.wait : "" }), h("td", { text: r ? r.resp : "" })));
        });
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });
    void lastJ;
  }

  S.chapter({ id: "planirane", order: 3, num: "3", group: "Процеси", title: "Планиране на процесорното време", lead: "Цели на планировчика, FCFS, SJF, Round Robin, приоритети, изпреварване, диаграма на Гант, средно чакане; реално време.", html, mount, algos });
})();
