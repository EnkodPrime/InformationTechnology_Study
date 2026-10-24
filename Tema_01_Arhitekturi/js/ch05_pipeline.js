/* Раздел 5 — конвейерна обработка: петстепенен конвейер такт по такт,
   зависимости по данни, препращане, изчакване, конфликт по управление, структурен конфликт. */
(function () {
  const S = window.Study, h = S.h;

  const STG = ["IF", "ID", "EX", "MEM", "WB"], EMPTY = -1, WRONG = -2, MAXI = 16, MAXCYC = 128;

  /* Кратък запис: A rd,rs,rt · L rd,rs · S rs,rt · B rs,rt,T|N · N */
  function parseProg(str) {
    const toks = String(str).trim().split(/\s+/).filter(Boolean);
    if (!toks.length) throw new Error("Въведи поне една инструкция.");
    if (toks.length > 12) throw new Error("Най-много 12 инструкции.");
    return toks.map((t, k) => {
      const reg = (x) => { const v = Number(x); if (!Number.isInteger(v) || v < 0 || v > 9) throw new Error(`I${k + 1} „${t}“: регистрите са 0..9 (0 = няма/не пише).`); return v; };
      let m;
      if ((m = /^A(\d),(\d),(\d)$/i.exec(t))) return { kind: "ALU", rd: reg(m[1]), rs: reg(m[2]), rt: reg(m[3]), taken: 0, t, asm: `ADD R${m[1]}, R${m[2]}, R${m[3]}` };
      if ((m = /^L(\d),(\d)$/i.exec(t))) return { kind: "LOAD", rd: reg(m[1]), rs: reg(m[2]), rt: 0, taken: 0, t, asm: `LOAD R${m[1]}, [R${m[2]}]` };
      if ((m = /^S(\d),(\d)$/i.exec(t))) return { kind: "STORE", rd: 0, rs: reg(m[1]), rt: reg(m[2]), taken: 0, t, asm: `STORE [R${m[1]}], R${m[2]}` };
      if ((m = /^B(\d),(\d),([TN])$/i.exec(t))) return { kind: "BR", rd: 0, rs: reg(m[1]), rt: reg(m[2]), taken: m[3].toUpperCase() === "T" ? 1 : 0, t, asm: `BEQ R${m[1]}, R${m[2]} (${m[3].toUpperCase() === "T" ? "взето" : "не"})` };
      if (/^N$/i.test(t)) return { kind: "NOP", rd: 0, rs: 0, rt: 0, taken: 0, t, asm: "NOP" };
      throw new Error(`„${t}“ не е инструкция. Форми: A3,1,2 · L1,2 · S2,1 · B1,2,T · N.`);
    });
  }

  const writes = (p, x, r) => x >= 0 && r !== 0 && p[x].rd === r && p[x].kind !== "STORE" && p[x].kind !== "BR";
  /** Връща {stall, tag, why} — същото като hazard() в C */
  function hazard(p, st, fwd) {
    const i = st[1];
    if (i < 0) return { stall: false };
    for (const r of [p[i].rs, p[i].rt]) {
      if (r === 0) continue;
      if (writes(p, st[2], r)) {
        if (!fwd || p[st[2]].kind === "LOAD") return { stall: true, tag: "haz_ex", why: `I${i + 1} чете R${r}, който I${st[2] + 1} (в EX) още ${p[st[2]].kind === "LOAD" ? "зарежда от паметта — стойността идва чак в края на MEM, препращането не помага" : "изчислява — без препращане чакаме WB"}` };
      } else if (writes(p, st[3], r) && !fwd) {
        return { stall: true, tag: "haz_mem", why: `I${i + 1} чете R${r}, който I${st[3] + 1} (в MEM) ще запише чак в WB` };
      }
    }
    return { stall: false };
  }

  const algos = {
    parseProg,
    /** Същият алгоритъм като pipeline() в c/05_pipeline.c */
    pipeline({ prog, fwd, predict, unified }) {
      const p = parseProg(prog), n = p.length;
      fwd = !!fwd && fwd !== "false"; predict = !!predict && predict !== "false"; unified = !!unified && unified !== "false";
      let st = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], next = 0, retired = 0, cyc = 0;
      const s = { cycles: 0, data_stalls: 0, struct_stalls: 0, branch_stalls: 0, flushed: 0 };
      const hist = [], events = [], F = [];
      const statsOf = () => ({ такта: cyc, "изч. данни": s.data_stalls, структурни: s.struct_stalls, "изч. преход": s.branch_stalls, отхвърлени: s.flushed, завършени: retired });
      F.push({ p, hist: [], events: [], at: null, stats: statsOf(), vars: {}, msg: `${n} инструкции, k = 5 етапа. Идеално: k + n − 1 = ${5 + n - 1} такта (без конвейер: k·n = ${5 * n}). Препращане: ${fwd ? "да" : "не"}; преходи: ${predict ? "предсказване „не е взет“" : "изчакване"}; ${unified ? "една обща памет (структурен конфликт)" : "отделни памети I/D"}.` });
      while (retired < n && cyc < MAXCYC) {
        const nx = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
        nx[4] = st[3]; nx[3] = st[2];
        const flush = st[2] >= 0 && p[st[2]].kind === "BR" && p[st[2]].taken && predict;
        const hz = flush ? { stall: false } : hazard(p, st, fwd);
        let hold = false;
        const ev = { c: cyc + 1, kinds: [], notes: [] };
        const tags = ["adv"];
        if (flush) {
          const k = (st[1] === WRONG ? 1 : 0) + (st[0] === WRONG ? 1 : 0);
          s.flushed += k;
          next = st[2] + 1;
          ev.kinds.push("flush"); ev.notes.push(`I${st[2] + 1} (преход) е решен в края на EX: <b>взет</b> — предсказанието „не е взет“ е грешно, ${k} инструкции от погрешния път се отхвърлят.`);
          tags.unshift("flush");
        } else if (hz.stall) {
          s.data_stalls++; hold = true;
          nx[1] = st[1]; nx[0] = st[0];
          ev.kinds.push("stall"); ev.notes.push(`<b>Изчакване:</b> ${hz.why}. В EX влиза мехурче; IF и ID остават.`);
          tags.unshift("stall", hz.tag);
        } else {
          nx[2] = st[1]; nx[1] = st[0];
          tags.push("move");
          if (fwd && st[1] >= 0) {
            const i = st[1];
            for (const r of [p[i].rs, p[i].rt]) {
              if (r === 0) continue;
              if (writes(p, st[2], r)) { ev.notes.push(`Препращане: R${r} от I${st[2] + 1} (изход на EX) към входа на EX за I${i + 1}.`); ev.kinds.push("fwd"); break; }
              if (writes(p, st[3], r)) { ev.notes.push(`Препращане: R${r} от I${st[3] + 1} (изход на MEM) към входа на EX за I${i + 1}.`); ev.kinds.push("fwd"); break; }
            }
          }
        }
        if (!hold) {
          const last = next - 1;
          let br_open = false;
          for (let k = 1; k <= 2; k++) if (nx[k] >= 0 && p[nx[k]].kind === "BR") br_open = true;
          const port = unified && nx[3] >= 0 && (p[nx[3]].kind === "LOAD" || p[nx[3]].kind === "STORE");
          const lastTaken = predict && last >= 0 && p[last].kind === "BR" && p[last].taken && br_open;
          if (!predict && br_open) {
            s.branch_stalls++; ev.kinds.push("brstall"); ev.notes.push("Преходът още не е решен — извличането чака (няма предсказване)."); tags.push("brstall");
          } else if (port && (next < n || lastTaken)) {
            s.struct_stalls++; ev.kinds.push("struct"); ev.notes.push(`<b>Структурен конфликт:</b> I${nx[3] + 1} е в MEM и заема единствения порт към паметта — IF чака.`); tags.push("struct");
          } else if (lastTaken) {
            nx[0] = WRONG; ev.kinds.push("wrong"); ev.notes.push("Извлича се следващата по ред инструкция (предсказано „не е взет“) — може да е погрешен път."); tags.push("wrong");
          } else if (next < n) {
            nx[0] = next++; tags.push("fetch");
          }
        }
        if (nx[4] >= 0) retired++;
        st = nx; cyc++;
        hist.push(st.slice()); events.push(ev);
        const wb = st[4] >= 0 ? ` I${st[4] + 1} завършва (WB).` : "";
        F.push({ p, hist: hist.map((x) => x.slice()), events: events.slice(), cyc, at: tags, ev, stats: statsOf(),
          vars: Object.fromEntries(STG.map((g, k) => [g, st[k] >= 0 ? "I" + (st[k] + 1) : st[k] === WRONG ? "✗" : "—"])),
          msg: `Такт <b>${cyc}</b>.${wb} ${ev.notes.join(" ")}`, log: `т${cyc}: ${st.map((x) => (x >= 0 ? "I" + (x + 1) : x === WRONG ? "✗" : "·")).join(" ")}` });
      }
      s.cycles = cyc;
      const ideal = 5 + n - 1, seq = 5 * n;
      F.push(Object.assign({}, F[F.length - 1], { at: "ret", done: true, log: null,
        msg: `Край: <b>${cyc}</b> такта. Идеален конвейер: ${ideal}; загуби: ${cyc - ideal}. Без конвейер: ${seq} такта → ускорение ${seq}/${cyc} = <b>${(seq / cyc).toFixed(2)}</b> (граница при n → ∞: 5).` }));
      const wbCycle = Array.from({ length: n }, (_, i) => { let w = -1; hist.forEach((x, c) => { if (x[4] === i) w = c + 1; }); return w; });
      return { frames: F, s, wbCycle, result: `${s.cycles} ${s.data_stalls} ${s.struct_stalls} ${s.branch_stalls} ${s.flushed} | ${wbCycle.join(" ")}` };
    },

    /** Идеализираната формула (k + n − 1) и ускорението */
    ideal({ k, n }) {
      k = S.int(k, 1, 20, "k"); n = S.int(n, 1, 1000, "n");
      return { pipe: k + n - 1, seq: k * n, speed: (k * n) / (k + n - 1) };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="конвейер">Конвейерът</dfn> разделя обработката на инструкция на етапи. Учебният петстепенен модел включва <dfn data-g="if">извличане</dfn>, <dfn data-g="id">декодиране</dfn>, <dfn data-g="ex">изпълнение</dfn>, <dfn data-g="mem">достъп до паметта</dfn> и <dfn data-g="wb">запис на резултата</dfn>. В един такт различни инструкции могат да се намират в различни етапи. Основният ефект е увеличаване на <dfn data-g="пропускателна способност">пропускателната способност</dfn>, а не непременно намаляване на <dfn data-g="латентност">времето за една отделна инструкция</dfn>.</p>
</div>

<div class="block">
  <h3>Идеалният случай: k + n − 1 такта</h3>
  <p class="prose">При k еднакво дълги етапа и n инструкции идеализираното време е (k+n−1) такта вместо kn без припокриване: първата инструкция излиза след k такта, а всяка следваща — един такт по-късно. Плъзни n.</p>
  <div id="ideal"></div>
  <div class="key"><span class="formula">T<sub>конв</sub> = k + n − 1 &nbsp;·&nbsp; T<sub>посл</sub> = k·n &nbsp;·&nbsp; S = k·n / (k + n − 1) → k при n → ∞</span><br>k = 5, n = 10: 14 вместо 50 такта. k = 5, n = 3: 7 вместо 15 (I1 завършва в такт 5, I3 — в такт 7).</div>
  <details class="trap"><summary>Капан: какво изключва формулата</summary><div>
    <p>Зависимости, пропуски в кеша, разходи за междинни регистри и неравни времена на етапите. Една инструкция преминава през всичките пет етапа — не получава резултат за един такт. Конвейерът разделя латентността на една операция от броя завършени операции за интервал.</p>
  </div></details>
</div>

<div class="block">
  <h3>Симулатор на конвейера</h3>
  <p class="prose">Списъкът е <b>динамичната</b> последователност — реално изпълнените инструкции; за разклонение казваш дали е взето. Запис: <code>A3,1,2</code> = ADD R3,R1,R2 · <code>L1,2</code> = LOAD R1,[R2] · <code>S2,1</code> = STORE [R2],R1 · <code>B1,2,T</code> = BEQ R1,R2 взет (<code>N</code> — невзет) · <code>N</code> = NOP. Регистър 0 означава „няма“.</p>
  <details class="hint"><summary>Условия на модела (важно за точността)</summary><div>
    <p>Етап = 1 такт; изпълнение в ред, по една инструкция на такт. Регистровият файл се записва в първата половина на такта и се чете във втората — WB и ID на зависима инструкция могат да са в един такт. Всички операнди (вкл. данните на STORE) са нужни в началото на EX. Разклонението се решава в края на EX. Препращане: от EX/MEM и MEM/WB към входа на EX. „Обща памет“ означава един порт за извличане и данни: такт с LOAD/STORE в MEM не допуска IF.</p>
    <p>Това е учебен модел, а не конкретен процесор; при Ibex и други ядра границите и броят на етапите са различни.</p>
  </div></details>
  <div id="v-pipe"></div>
  <div class="split">
    <details class="hint"><summary>Хинт: защо LOAD → ADD чака дори с препращане</summary><div>
      <p>LOAD R1,[x], последвана от ADD R2,R1,1, създава <dfn data-g="зависимост по данни">зависимост по данни</dfn>. ALU резултатът е готов в края на EX и може да се <dfn data-g="препращане">препрати</dfn> веднага. Стойността на LOAD е готова чак в края на MEM — един такт по-късно. <b>Препращането не премахва физическото време за получаване на данните</b>, затова остава едно <dfn data-g="изчакване">изчакване</dfn>. Без препращане чакането е 2 такта (до WB).</p>
    </div></details>
    <details class="hint"><summary>Хинт: три вида конфликти, три различни лека</summary><div>
      <p><dfn data-g="структурен конфликт">Структурен</dfn> — конкуренция за устройство (тук: един порт към паметта); лек: дублиране на ресурса (отделни I/D пътища) или изчакване. <b>По данни</b> — нужен е още неполучен резултат; лек: препращане, изчакване. <dfn data-g="конфликт по управление">По управление</dfn> — не се знае следващият адрес; лек: изчакване, <dfn data-g="предсказване на преходи">предсказване</dfn>, спекулативно изпълнение. Грешното предсказване налага отхвърляне на част от работата.</p>
    </div></details>
  </div>
  <details class="trap"><summary>Капан: суперскаларен, извън ред, SIMD — синоними на конвейер?</summary><div>
    <p>Не. <dfn data-g="суперскаларен">Суперскаларният</dfn> процесор може да започва повече от една инструкция на такт. <dfn data-g="извън ред">Изпълнението извън програмния ред</dfn> използва независими операции, но запазва архитектурно наблюдаемото поведение. Това са техники върху конвейерна организация. SIMD разширява данните на една операция и описва друга ос на паралелизма.</p>
  </div></details>
  <details class="trap"><summary>Капан: един такт = една завършена инструкция?</summary><div>
    <p>Не като общ закон. Инструкция може да отнема много тактове; няколко могат да завършват в един такт (суперскаларно); изчакванията оставят такт без завършена инструкция — виж тактовете с мехурче в WB.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Конвейерът увеличава пропускателната способност, не намалява латентността. Идеално: k + n − 1. Три конфликта: структурен (ресурс), по данни (резултат), по управление (следващ адрес). Препращането скъсява чакането, но не премахва чакането след LOAD.</div>`;

  let mk = 0;
  function mount(root) {
    // идеален случай — интерактивна диаграма
    const box = root.querySelector("#ideal");
    const nIn = h("input", { type: "range", min: 1, max: 12, value: 3, "aria-label": "n", style: { width: "200px" } });
    const lab = h("span", { class: "mono" });
    const out = h("div", { class: "tbl-wrap" });
    box.append(h("div", { class: "row" }, h("label", null, "n = ", nIn), lab), out);
    function drawIdeal() {
      const n = +nIn.value, r = algos.ideal({ k: 5, n });
      lab.innerHTML = `конвейер: <b>${r.pipe}</b> такта · без: ${r.seq} · ускорение ${r.speed.toFixed(2)}`;
      const tb = h("table", { class: "t grid" });
      tb.append(h("tr", null, h("th", { text: "" }), ...Array.from({ length: r.pipe }, (_, c) => h("th", { text: c + 1 }))));
      for (let i = 0; i < n; i++) {
        const tr = h("tr", null, h("th", { text: "I" + (i + 1) }));
        for (let c = 0; c < r.pipe; c++) { const s = c - i; tr.append(h("td", { class: s === 4 ? "s-done" : s >= 0 && s < 4 ? "s-act" : "", text: s >= 0 && s < 5 ? STG[s] : "" })); }
        tb.append(tr);
      }
      out.innerHTML = ""; out.append(tb);
    }
    nIn.addEventListener("input", drawIdeal); drawIdeal();

    // симулатор
    S.viz(root.querySelector("#v-pipe"), {
      id: "pipe", title: "Петстепенен конвейер — такт по такт", sub: "Горе: инструкции × тактове. Долу: етапи × тактове (вижда мехурчетата и погрешния път).",
      code: "ch05_pipe",
      inputs: [{ id: "prog", label: "Инструкции", value: "L1,2 A3,1,4 A5,3,1 S6,5", width: "20em" },
        { id: "fwd", label: "препращане", type: "checkbox", value: true },
        { id: "predict", label: "предсказване „не е взет“", type: "checkbox", value: false },
        { id: "unified", label: "обща памет I/D", type: "checkbox", value: false }],
      presets: [
        { label: "Без зависимости", values: { prog: "A1,2,3 A4,5,6 A7,8,9" } },
        { label: "LOAD → ADD", values: { prog: "L1,2 A3,1,4" } },
        { label: "ALU верига", values: { prog: "A1,2,3 A4,1,5 A6,1,7 A8,1,9" } },
        { label: "Взет преход", values: { prog: "A1,2,3 B1,4,T A5,6,7 A8,5,9" } },
        { label: "Невзет преход", values: { prog: "A1,2,3 B1,4,N A5,6,7 A8,5,9" } },
        { label: "Структурен", values: { prog: "L1,2 L3,4 A5,1,3 S6,5 A7,8,9", unified: true } },
        { label: "n = 10 (14 такта)", values: { prog: "A1,0,0 A2,0,0 A3,0,0 A4,0,0 A5,0,0 A6,0,0 A7,0,0 A1,0,0 A2,0,0 A3,0,0" } },
      ],
      legend: [["s-act", "в етап"], ["s-done", "WB (завършва)"], ["s-swap", "изчакване / мехурче"], ["s-dim", "отхвърлена"], ["s-piv", "препращане"]],
      build: algos.pipeline,
      draw(st, f) {
        st.innerHTML = "";
        const C = f.hist.length, n = f.p.length;
        // 1) инструкции × тактове
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "" }), ...Array.from({ length: Math.max(C, 1) }, (_, c) => h("th", { class: c === C - 1 ? "s-act" : "", text: c + 1 }))));
        for (let i = 0; i < n; i++) {
          const tr = h("tr", null, h("th", { class: "mono", style: { textAlign: "left", whiteSpace: "nowrap" }, text: `I${i + 1} ${f.p[i].asm}` }));
          for (let c = 0; c < Math.max(C, 1); c++) {
            const s = f.hist[c] ? f.hist[c].indexOf(i) : -1;
            const prev = c > 0 && f.hist[c - 1] ? f.hist[c - 1].indexOf(i) : -2;
            const stalled = s >= 0 && s === prev;
            const ev = f.events[c] || { kinds: [] };
            const fw = s === 2 && ev.kinds.includes("fwd") && f.hist[c - 1] && f.hist[c - 1][1] === i;
            tr.append(h("td", { class: s < 0 ? "" : stalled ? "s-swap" : fw ? "s-piv" : s === 4 ? "s-done" : "", text: s >= 0 ? STG[s] : "" }));
          }
          tb.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, tb));
        // 2) етапи × тактове
        const t2 = h("table", { class: "t grid", style: { marginTop: "10px" } });
        t2.append(h("tr", null, h("th", { text: "етап" }), ...Array.from({ length: Math.max(C, 1) }, (_, c) => h("th", { text: c + 1 }))));
        STG.forEach((g, k) => {
          const tr = h("tr", null, h("th", { text: g }));
          for (let c = 0; c < Math.max(C, 1); c++) {
            const x = f.hist[c] ? f.hist[c][k] : null;
            tr.append(h("td", { class: x === WRONG ? "s-dim" : x === EMPTY && f.events[c] && ((k === 2 && f.events[c].kinds.includes("stall")) || (k === 0 && ["struct", "brstall"].some((q) => f.events[c].kinds.includes(q))) || (k <= 2 && f.events[c].kinds.includes("flush"))) ? "s-swap" : x >= 0 ? (k === 4 ? "s-done" : "") : "", text: x == null ? "" : x >= 0 ? "I" + (x + 1) : x === WRONG ? "✗" : "·" }));
          }
          t2.append(tr);
        });
        st.append(h("div", { class: "tbl-wrap" }, t2));
      },
    });
  }

  S.chapter({ id: "konveier", order: 5, num: "5", group: "Изпълнение на инструкции", title: "Конвейерна обработка",
    lead: "Петстепенният конвейер такт по такт: k + n − 1, зависимости, препращане, изчакване и преходи.", html, mount, algos });
})();
