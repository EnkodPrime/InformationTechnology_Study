/* Раздел 4 — система от инструкции: ISA като договор, адресни режими, RISC/CISC,
   стъпков симулатор на учебна ISA (fetch–decode–execute), синхронен с c/04_isa.c. */
(function () {
  const S = window.Study, h = S.h;

  const NREG = 8, NMEM = 32, MAXSTEP = 300;
  const OPS = ["LI", "MOV", "ADD", "SUB", "SLT", "ADDI", "LOAD", "STORE", "BEQ", "BNE", "JMP", "NOP", "HALT"];

  /* ---------- асемблер (същият синтаксис като assemble() в C) ---------- */
  function parseReg(s, ln) {
    const m = /^R([0-7])$/i.exec(s || "");
    if (!m) throw new Error(`ред ${ln}: „${s || ""}“ не е регистър (R0..R7).`);
    return +m[1];
  }
  function parseImm(s, ln) {
    const m = /^#(-?\d+)$/.exec(s || "");
    if (!m) throw new Error(`ред ${ln}: „${s || ""}“ — непосредственият операнд се пише с #, напр. #5.`);
    return +m[1];
  }
  function parseMem(s, ln) {
    const m = /^\[\s*(?:(R[0-7])\s*(?:([+-])\s*(\d+))?|(\d+))\s*\]$/i.exec(s || "");
    if (!m) throw new Error(`ред ${ln}: „${s || ""}“ не е паметен операнд. Форми: [5], [R2], [R2+4].`);
    if (m[4] != null) return { rs: -1, imm: +m[4], mode: "пряк" };
    const off = m[3] ? (m[2] === "-" ? -1 : 1) * +m[3] : 0;
    return { rs: +m[1][1], imm: off, mode: m[3] ? "базов с отместване" : "непряк" };
  }
  function assemble(src) {
    const lines = String(src).split(/\n|\|/);
    const labels = {}, raw = [];
    lines.forEach((l, i) => {
      let s = l.replace(/;.*/, "").trim();
      const c = s.indexOf(":");
      if (c >= 0) {
        const name = s.slice(0, c).trim();
        if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error(`ред ${i + 1}: „${name}“ не е валиден етикет.`);
        if (name in labels) throw new Error(`ред ${i + 1}: етикетът „${name}“ е дефиниран два пъти.`);
        labels[name] = raw.length;
        s = s.slice(c + 1).trim();
      }
      if (s) raw.push({ s, ln: i + 1 });
    });
    if (!raw.length) throw new Error("Програмата е празна.");
    if (raw.length > 64) throw new Error("Най-много 64 инструкции.");
    return raw.map(({ s, ln }) => {
      const sp = s.search(/\s/);
      const mn = (sp < 0 ? s : s.slice(0, sp)).toUpperCase();
      const ops = sp < 0 ? [] : s.slice(sp).split(",").map((x) => x.trim()).filter((x) => x.length);
      const I = { op: mn, rd: 0, rs: 0, rt: 0, imm: 0, text: s, mode: null };
      const need = (k) => { if (ops.length !== k) throw new Error(`ред ${ln}: ${mn} очаква ${k} операнда, а има ${ops.length}.`); };
      const lab = (x) => { if (!(x in labels)) throw new Error(`ред ${ln}: няма етикет „${x}“.`); return labels[x]; };
      switch (mn) {
        case "LI": need(2); I.rd = parseReg(ops[0], ln); I.imm = parseImm(ops[1], ln); I.mode = "непосредствен"; break;
        case "MOV": need(2); I.rd = parseReg(ops[0], ln); I.rs = parseReg(ops[1], ln); I.mode = "регистров"; break;
        case "ADD": case "SUB": case "SLT": need(3); I.rd = parseReg(ops[0], ln); I.rs = parseReg(ops[1], ln); I.rt = parseReg(ops[2], ln); I.mode = "регистров"; break;
        case "ADDI": need(3); I.rd = parseReg(ops[0], ln); I.rs = parseReg(ops[1], ln); I.imm = parseImm(ops[2], ln); I.mode = "регистров + непосредствен"; break;
        case "LOAD": { need(2); I.rd = parseReg(ops[0], ln); const m = parseMem(ops[1], ln); I.rs = m.rs; I.imm = m.imm; I.mode = m.mode; break; }
        case "STORE": { need(2); I.rd = parseReg(ops[1], ln); const m = parseMem(ops[0], ln); I.rs = m.rs; I.imm = m.imm; I.mode = m.mode; break; }
        case "BEQ": case "BNE": need(3); I.rs = parseReg(ops[0], ln); I.rt = parseReg(ops[1], ln); I.imm = lab(ops[2]); break;
        case "JMP": need(1); I.imm = lab(ops[0]); break;
        case "NOP": case "HALT": need(0); break;
        default: throw new Error(`ред ${ln}: непозната инструкция „${mn}“. Позволени: ${OPS.join(", ")}.`);
      }
      return I;
    });
  }
  function parseMemInit(str) {
    const mem = Array(NMEM).fill(0);
    for (const t of String(str).split(/[\s,;]+/).filter(Boolean)) {
      const m = /^(\d+):(-?\d+)$/.exec(t);
      if (!m) throw new Error(`„${t}“: паметта се задава като адрес:стойност, напр. 0:7.`);
      if (+m[1] >= NMEM) throw new Error(`Адрес ${m[1]} е извън паметта (0..${NMEM - 1}).`);
      mem[+m[1]] = +m[2];
    }
    return mem;
  }

  const algos = {
    assemble, parseMemInit,
    /** Стъпково изпълнение — същото като step() в c/04_isa.c */
    run_isa({ prog, mem: meminit }) {
      const P = assemble(prog);
      const mem = parseMemInit(meminit), r = Array(NREG).fill(0);
      let pc = 0, steps = 0, status = 1;
      const F = [];
      const wr = (rd, v) => { if (rd !== 0) r[rd] = v | 0; };
      const snap = (o) => F.push(Object.assign({ P, r: r.slice(), mem: mem.slice(), pc, stats: { инструкции: steps } }, o));
      snap({ at: null, phase: "start", vars: { PC: pc }, msg: `Програма от ${P.length} инструкции. PC = 0. Всички регистри са 0; R0 е винаги 0.` });
      while (status === 1) {
        if (pc < 0 || pc >= P.length) { status = -1; snap({ at: null, err: true, msg: `PC = ${pc} е извън програмата — грешка.` }); break; }
        if (steps >= MAXSTEP) { snap({ at: "next", err: true, msg: `Спираме след ${MAXSTEP} инструкции — вероятно безкраен цикъл (C версията спира при 500).` }); status = 2; break; }
        const I = P[pc], at = pc;
        pc = pc + 1; steps++;
        snap({ at: "fetch", phase: "fetch", cur: at, vars: { PC: pc, IR: I.text }, msg: `<b>Извличане:</b> IR ← imem[${at}] = <code>${I.text}</code>; PC ← ${at} + 1 = ${pc}.` });
        const tag = { LI: "li", MOV: "mov", ADD: "add", SUB: "sub", SLT: "slt", ADDI: "addi", LOAD: "load", STORE: "store", BEQ: "beq", BNE: "bne", JMP: "jmp", NOP: "nop", HALT: "halt" }[I.op];
        snap({ at: "decode", phase: "decode", cur: at, vars: { PC: pc, op: I.op, режим: I.mode || "—" }, msg: `<b>Декодиране:</b> операция ${I.op}${I.mode ? `, адресен режим: <b>${I.mode}</b>` : ""}.` });
        let msg = "", ea = null, rw = [], mw = null, rr = [];
        switch (I.op) {
          case "LI": wr(I.rd, I.imm); rw = [I.rd]; msg = `R${I.rd} ← ${I.imm}. Стойността е <b>част от инструкцията</b>.`; break;
          case "MOV": rr = [I.rs]; wr(I.rd, r[I.rs]); rw = [I.rd]; msg = `R${I.rd} ← R${I.rs} = ${r[I.rs]}.`; break;
          case "ADD": rr = [I.rs, I.rt]; wr(I.rd, r[I.rs] + r[I.rt]); rw = [I.rd]; msg = `R${I.rd} ← ${r[I.rs]} + ${r[I.rt]} = ${(r[I.rs] + r[I.rt]) | 0}.`; break;
          case "SUB": rr = [I.rs, I.rt]; wr(I.rd, r[I.rs] - r[I.rt]); rw = [I.rd]; msg = `R${I.rd} ← ${r[I.rs]} − ${r[I.rt]}.`; break;
          case "SLT": rr = [I.rs, I.rt]; { const v = r[I.rs] < r[I.rt] ? 1 : 0; msg = `R${I.rd} ← (${r[I.rs]} < ${r[I.rt]}) = ${v}.`; wr(I.rd, v); } rw = [I.rd]; break;
          case "ADDI": rr = [I.rs]; msg = `R${I.rd} ← ${r[I.rs]} + ${I.imm} = ${(r[I.rs] + I.imm) | 0}.`; wr(I.rd, r[I.rs] + I.imm); rw = [I.rd]; break;
          case "LOAD": case "STORE":
            ea = (I.rs < 0 ? 0 : r[I.rs]) + I.imm;
            if (I.rs >= 0) rr = [I.rs];
            snap({ at: "ea", phase: "exec", cur: at, ea, rr, vars: { PC: pc, EA: ea }, msg: `Ефективен адрес = ${I.rs < 0 ? `${I.imm} (пряк)` : `R${I.rs} (${r[I.rs]})${I.imm ? ` + ${I.imm}` : ""}`} = <b>${ea}</b>. Това е <i>адрес</i>, не стойност.` });
            if (ea < 0 || ea >= NMEM) { status = -1; snap({ at: "ea", err: true, cur: at, msg: `Адрес ${ea} е извън паметта (0..${NMEM - 1}) — изключение; изпълнението спира.` }); break; }
            if (I.op === "LOAD") { wr(I.rd, mem[ea]); rw = [I.rd]; msg = `R${I.rd} ← mem[${ea}] = <b>${mem[ea]}</b>.`; }
            else { mem[ea] = r[I.rd]; mw = ea; rr = [I.rd]; msg = `mem[${ea}] ← R${I.rd} = <b>${r[I.rd]}</b>.`; }
            break;
          case "BEQ": case "BNE": {
            rr = [I.rs, I.rt];
            const eq = r[I.rs] === r[I.rt], take = I.op === "BEQ" ? eq : !eq;
            if (take) pc = I.imm;
            msg = `${r[I.rs]} ${eq ? "=" : "≠"} ${r[I.rt]} → ${take ? `<b>преход</b>: PC ← ${I.imm}` : "без преход, PC остава " + pc}.`;
            break;
          }
          case "JMP": pc = I.imm; msg = `Безусловен преход: PC ← ${I.imm}.`; break;
          case "NOP": msg = "Нищо не се променя (освен PC)."; break;
          case "HALT": status = 0; msg = "HALT — изпълнението спира."; break;
        }
        if (status === -1) break;
        if (I.rd === 0 && rw.length && ["LI", "MOV", "ADD", "SUB", "SLT", "ADDI", "LOAD"].includes(I.op)) msg += " <b>Записът в R0 се игнорира</b> — R0 е винаги 0.";
        snap({ at: status === 0 ? "halt" : [tag, "decode"], phase: "exec", cur: at, ea, rr, rw, mw, done: status === 0, vars: { PC: pc }, msg: `<b>Изпълнение:</b> ${msg}`, log: `${String(at).padStart(2)}: ${I.text}` });
      }
      return { frames: F, status: status === 2 ? 1 : status, steps, r, mem, pc,
        result: `${status === 2 ? 1 : status} ${steps} pc=${pc} | ${r.join(" ")} | ${mem.join(" ")}` };
    },
  };

  /* ---------- програми (същите като в main() на C) ---------- */
  const PROGS = {
    sum: { t: "z = x + y", prog: "LOAD R1, [0]    ; x\nLOAD R2, [1]    ; y\nADD R3, R1, R2\nSTORE [2], R3   ; z\nHALT", mem: "0:7 1:5" },
    modes: { t: "Адресни режими", prog: "LI R2, #10        ; непосредствен\nMOV R3, R2        ; регистров: 10\nLOAD R4, [R2]     ; непряк: mem[10]\nLOAD R5, [R2+4]   ; база+отместване: mem[14]\nLOAD R6, [10]     ; пряк: mem[10]\nADDI R7, R2, #5\nHALT", mem: "10:7 14:3" },
    lms: { t: "Зареди-промени-запиши", prog: "LI R4, #0\nLOAD R5, [R4+1]\nADDI R5, R5, #1\nSTORE [R4+1], R5\nHALT", mem: "1:42" },
    array: { t: "Сума на масив", prog: "LI R1, #0        ; i\nLI R2, #0        ; s\nLI R3, #5        ; n\nloop: LOAD R4, [R1]\nADD R2, R2, R4\nADDI R1, R1, #1\nBNE R1, R3, loop\nSTORE [8], R2\nHALT", mem: "0:4 1:8 2:15 3:16 4:23" },
    max: { t: "Максимум (преходи)", prog: "LOAD R2, [0]      ; max\nLI R1, #1\nLI R6, #6\nloop: BEQ R1, R6, end\nLOAD R3, [R1]\nSLT R4, R2, R3    ; max < a[i]?\nBEQ R4, R0, skip\nMOV R2, R3\nskip: ADDI R1, R1, #1\nJMP loop\nend: STORE [9], R2\nHALT", mem: "0:3 1:9 2:4 3:12 4:1 5:6" },
    r0: { t: "R0 = 0", prog: "LI R0, #5\nADDI R1, R0, #2\nHALT", mem: "" },
    bad: { t: "Адрес извън паметта", prog: "LI R1, #40\nLOAD R2, [R1]\nHALT", mem: "" },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Системата от инструкции, <dfn data-g="isa">ISA</dfn>, е договорът между машинния код и процесора. Тя определя допустимите операции, видимите регистри, формата на инструкциите, <dfn data-g="адресен режим">адресните режими</dfn> и поведението при изключения. Типични групи са пренос на данни, аритметични и логически операции, сравнения, преходи и системни инструкции.</p>
  <p>Инструкцията съдържа код на операцията (<dfn data-g="opcode">opcode</dfn>) и описание на <dfn data-g="операнд">операндите</dfn>. Реални архитектури: Intel 64 и AMD64 са реализации на x86-64; Arm Cortex-M изпълнява инструкции от съответната Arm M архитектура; RISC-V е отворена ISA. Името на архитектурата не определя еднозначно микроархитектурата.</p>
</div>

<div class="block">
  <h3>Адресни режими: стойност и адрес не са едно и също</h3>
  <p class="prose">Нека R2 = 100, mem[100] = 7 и mem[104] = 3. Една и съща операция „зареди в R1“ дава различен резултат според начина на намиране на операнда. Щракни режим.</p>
  <div class="cards" id="modes"></div>
  <div id="mode-svg"></div>
  <div class="key" id="mode-d"></div>
  <details class="trap"><summary>Капан: числото 100 адрес ли е?</summary><div>
    <p>Числото 100 само по себе си не носи етикет „адрес“; значението зависи от операцията. „Използвай R2“ дава 100, „използвай [R2]“ дава 7. Адресът на x и съдържанието на x са различни неща.</p>
  </div></details>
</div>

<div class="block">
  <h3>Стъпков симулатор на учебна ISA</h3>
  <p class="prose">Учебна load/store машина: 8 регистъра (R0 винаги 0, както x0 в RISC-V), 32 думи памет за данни, отделна памет за програмата. PC е номер на инструкция и расте с 1 (в RV32I PC е байтов адрес и расте с 4). Програмата е редактируема; паметта се задава като <code>адрес:стойност</code>. Всяка инструкция минава през три кадъра: извличане, декодиране, изпълнение — също като функцията <code>step()</code> вдясно.</p>
  <details class="hint"><summary>Справка: инструкциите на учебната ISA</summary><div>
    <div class="tbl-wrap"><table class="t" id="isa-ref"></table></div>
  </div></details>
  <div id="v-isa"></div>
  <details class="hint"><summary>Хинт: от израз до машинна операция</summary><div>
    <p>За z = x + y при <dfn data-g="load/store">load/store</dfn> организация са нужни LOAD R1,[x], LOAD R2,[y], ADD R3,R1,R2 и STORE [z],R3. ADD събира стойности в регистри; LOAD намира стойност в памет. Това е учебен запис, не синтаксис на конкретен асемблер.</p>
  </div></details>
  <details class="hint"><summary>Хинт: защо LOAD → ADD е важна двойка</summary><div>
    <p>Примерът LOAD R1, [R2+4]; ADD R3, R1, R4 изразява прочитане от адрес и събиране. Ако ADD се изпълни преди да е получена стойността за R1, възниква <dfn data-g="зависимост по данни">зависимост по данни</dfn>. В този последователен симулатор всяка инструкция завършва преди следващата, затова проблемът не се вижда — в <a href="#konveier">конвейера</a> вече се вижда.</p>
  </div></details>
  <details class="trap"><summary>Капан: LOAD и ADD четат ли едни и същи източници?</summary><div>
    <p>Не като общо правило. RV32I ADD използва регистрови операнди; LOAD зарежда данни от изчислен паметен адрес. Извличането на самата инструкция е отделен паметен достъп.</p>
  </div></details>
</div>

<div class="block">
  <h3>Цикъл на изпълнение</h3>
  <div id="cycle"></div>
  <p class="prose muted">Броячът на командите участва при извличането; декодирането определя операцията и операндите. Преходите и изключенията могат да променят следващата инструкция. Това е логически цикъл, а не задължително един такт на етап.</p>
</div>

<div class="block">
  <h3>RISC и CISC на равнище система от инструкции</h3>
  <div class="tbl-wrap"><table class="t" id="rc"></table></div>
  <details class="trap"><summary>Капан: „RISC е по-бърз“ / „по-малко инструкции е по-бързо“</summary><div>
    <p>Съпоставката показва типични принципи, а не универсални ограничения. От нея не следва, че RISC винаги е по-бърз от CISC. Съвременният x86 процесор може вътрешно да превежда инструкции в микрооперации — това не променя външния му ISA договор в RISC-V. Броят инструкции, средният <dfn data-g="cpi">CPI</dfn> и честотата действат заедно: по-малко инструкции не е достатъчно условие за по-кратко време (виж <a href="#proizvoditelnost">раздел 8</a>).</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> ISA = договор (операции, регистри, формат, адресни режими, изключения). Адресният режим отговаря на въпроса „откъде е операндът“. Ефективен адрес ≠ стойност. RISC/CISC е ос на сложността на ISA, не гаранция за скорост.</div>`;

  const MODES = [
    { k: "Непосредствен", asm: "LI R1, #100", d: "Стойността е част от инструкцията: R1 = 100. Не се чете памет.", path: ["instr"], res: 100 },
    { k: "Регистров", asm: "MOV R1, R2", d: "Операндът е в регистър: R1 = R2 = 100.", path: ["instr", "reg"], res: 100 },
    { k: "Непряк", asm: "LOAD R1, [R2]", d: "Регистърът съдържа адрес: EA = 100, R1 = mem[100] = 7.", path: ["instr", "reg", "m100"], res: 7 },
    { k: "Базов с отместване", asm: "LOAD R1, [R2+4]", d: "EA = R2 + 4 = 104, R1 = mem[104] = 3. Удобно за масиви, полета на записи и стекови кадри.", path: ["instr", "reg", "add", "m104"], res: 3 },
    { k: "Пряк", asm: "LOAD R1, [100]", d: "Адресът е в инструкцията: R1 = mem[100] = 7.", path: ["instr", "m100"], res: 7 },
  ];
  const RC = [
    ["Инструкции", "по-регулярен формат, често фиксирана дължина", "по-сложни инструкции, често променлива дължина"],
    ["Достъп до паметта", "отделни LOAD/STORE; аритметиката е върху регистри", "исторически допуска операнд в паметта в аритметична инструкция"],
    ["Адресни режими", "малко на брой", "повече и по-сложни"],
    ["Пример", "RISC-V, Arm", "x86-64 (Intel 64, AMD64)"],
    ["Не следва", "че винаги е по-бърз", "че вътрешно не използва микрооперации"],
  ];
  const REF = [
    ["LI Rd, #imm", "Rd ← imm", "непосредствен"], ["MOV Rd, Rs", "Rd ← Rs", "регистров"], ["ADD / SUB Rd, Rs, Rt", "Rd ← Rs ± Rt", "регистров"],
    ["SLT Rd, Rs, Rt", "Rd ← (Rs < Rt)", "сравнение"], ["ADDI Rd, Rs, #imm", "Rd ← Rs + imm", "рег. + непоср."],
    ["LOAD Rd, [a] · [Rs] · [Rs+k]", "Rd ← mem[EA]", "пряк · непряк · база+отм."], ["STORE [EA], Rd", "mem[EA] ← Rd", "същите"],
    ["BEQ / BNE Rs, Rt, етикет", "ако Rs =/≠ Rt: PC ← етикет", "условен преход"], ["JMP етикет", "PC ← етикет", "безусловен преход"], ["NOP · HALT", "— · спиране", ""],
  ];

  let mk = 0;
  function mount(root) {
    // адресни режими
    const mc = root.querySelector("#modes"), ms = root.querySelector("#mode-svg"), md = root.querySelector("#mode-d");
    const btn = MODES.map((M, i) => h("button", { class: "card", onclick: () => pickM(i) }, h("h4", { text: M.k }), h("p", { class: "mono", text: M.asm })));
    mc.append(...btn);
    function pickM(i) {
      btn.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const M = MODES[i], on = new Set(M.path), W = 600, H = 170, id = "am" + (mk++);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const d = S.svg("defs"); d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))); svg.append(d);
      const B = (k, x, y, w, t, sub) => { const g = S.svg("g", { class: "node " + (on.has(k) ? (k.startsWith("m") ? "s-piv" : "s-act") : "s-dim") }); g.append(S.svg("rect", { x, y, width: w, height: 44, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 })); g.append(S.svg("text", { x: x + w / 2, y: y + 19, "text-anchor": "middle", "font-weight": 600, text: t })); if (sub) g.append(S.svg("text", { x: x + w / 2, y: y + 36, "text-anchor": "middle", class: "wt", text: sub })); svg.append(g); };
      const A = (pts, k) => { const p = S.svg("polyline", { points: pts, class: "edge " + (on.has(k) ? "s-act" : ""), "marker-end": `url(#${id})` }); p.style.color = on.has(k) ? "var(--c)" : "var(--line)"; svg.append(p); };
      B("instr", 10, 60, 150, M.asm.split(" ")[0], M.asm.slice(M.asm.indexOf(" ") + 1));
      B("reg", 200, 10, 90, "R2", "= 100");
      B("add", 330, 10, 70, "+ 4", "");
      B("m100", 450, 70, 130, "mem[100]", "= 7");
      B("m104", 450, 120, 130, "mem[104]", "= 3");
      A("160,70 198,32", "reg");
      if (on.has("add")) { A("290,32 328,32", "add"); A("400,32 430,32 430,142 448,142", "m104"); }
      else if (on.has("m100") && on.has("reg")) A("290,32 430,32 430,92 448,92", "m100");
      else if (on.has("m100")) A("160,92 448,92", "m100");
      svg.append(S.svg("text", { x: 10, y: 160, "font-weight": 600, text: `R1 ← ${M.res}` }));
      ms.innerHTML = ""; ms.append(svg);
      md.innerHTML = `<p><b>${M.k}.</b> ${M.d}</p>`;
    }
    pickM(2);

    // справка
    const rf = root.querySelector("#isa-ref");
    rf.append(h("tr", null, h("th", { text: "Запис" }), h("th", { text: "Действие" }), h("th", { text: "Адресен режим" })));
    REF.forEach((r) => rf.append(h("tr", null, h("td", { class: "mono", text: r[0] }), h("td", { class: "mono", text: r[1] }), h("td", { text: r[2] }))));

    // симулатор
    const holder = root.querySelector("#v-isa");
    S.viz(holder, {
      id: "isa", title: "CPU на учебната ISA: регистри, PC, памет", sub: "Кадри: извличане → декодиране → изпълнение",
      code: "ch04_cpu",
      inputs: [{ id: "prog", label: "Програма (редове или „|“)", value: PROGS.array.prog.replace(/\n/g, " | "), width: "34em" }, { id: "mem", label: "Памет (адрес:стойност)", value: PROGS.array.mem, width: "16em" }],
      presets: Object.keys(PROGS).map((k) => ({ label: PROGS[k].t, values: { prog: PROGS[k].prog.replace(/\n/g, " | "), mem: PROGS[k].mem } })),
      legend: [["s-act", "текуща инструкция / записан регистър"], ["s-cmp", "прочетен регистър"], ["s-piv", "клетка на ефективния адрес"], ["s-swap", "грешка"]],
      build: (inp) => algos.run_isa(inp),
      draw(st, f) {
        st.innerHTML = "";
        const wrap = h("div", { class: "split" });
        // програма
        const pl = h("table", { class: "t" });
        f.P.forEach((I, k) => pl.append(h("tr", null, h("td", { class: "mono " + (k === f.cur ? (f.err ? "s-swap" : "s-act") : ""), style: k === f.cur ? { outline: "2px solid var(--c)", outlineOffset: "-2px", background: "var(--cb)" } : null, text: (k === f.pc ? "▸" : " ") + String(k).padStart(2) }), h("td", { class: "mono", style: { whiteSpace: "pre" }, text: I.text }))));
        // регистри
        const rg = h("table", { class: "t grid" });
        rg.append(h("tr", null, h("th", { text: "PC" }), h("td", { class: f.phase === "fetch" || (f.cur != null && f.P[f.cur] && ["BEQ", "BNE", "JMP"].includes(f.P[f.cur].op) && f.phase === "exec") ? "s-act" : "", text: f.pc })));
        for (let i = 0; i < NREG; i++) {
          const c = (f.rw || []).includes(i) ? "s-act" : (f.rr || []).includes(i) ? "s-cmp" : "";
          rg.append(h("tr", null, h("th", { text: "R" + i }), h("td", { class: c, text: f.r[i] })));
        }
        wrap.append(h("div", { class: "tbl-wrap" }, h("span", { class: "eyebrow", text: "Памет за инструкции" }), pl), h("div", null, h("span", { class: "eyebrow", text: "Регистри" }), rg));
        st.append(wrap);
        // памет
        st.append(h("span", { class: "eyebrow", text: "Памет за данни (32 думи)" }));
        const cls = {};
        if (f.ea != null && f.ea >= 0 && f.ea < NMEM) cls[f.ea] = "s-piv";
        if (f.mw != null) cls[f.mw] = "s-act";
        const memBox = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "0 4px" } });
        for (let r0 = 0; r0 < NMEM; r0 += 8) { const sub = h("div"); S.drawArray(sub, f.mem.slice(r0, r0 + 8), { cls: Object.fromEntries(Object.entries(cls).filter(([k]) => k >= r0 && k < r0 + 8).map(([k, v]) => [k - r0, v])), label: (k) => r0 + k }); memBox.append(sub); }
        st.append(memBox);
      },
    });

    // цикъл
    {
      const W = 600, H = 120, id = "cy" + (mk++);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const d = S.svg("defs"); d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))); svg.append(d);
      const st = [["Извличане", "IR ← mem[PC]"], ["PC ← PC + 1", "или +4 в RV32I"], ["Декодиране", "opcode, операнди"], ["Изпълнение", "АЛУ / памет / преход"]];
      st.forEach(([a, b], i) => { const g = S.svg("g", { class: "node " + (i === 0 ? "s-act" : "") }); g.append(S.svg("rect", { x: 10 + i * 148, y: 20, width: 128, height: 50, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 })); g.append(S.svg("text", { x: 74 + i * 148, y: 42, "text-anchor": "middle", "font-weight": 600, text: a })); g.append(S.svg("text", { x: 74 + i * 148, y: 60, "text-anchor": "middle", class: "wt", "font-size": 10.5, text: b })); svg.append(g); if (i < 3) { const l = S.svg("line", { x1: 138 + i * 148, y1: 45, x2: 156 + i * 148, y2: 45, class: "edge", "marker-end": `url(#${id})` }); l.style.color = "var(--ink-2)"; svg.append(l); } });
      const back = S.svg("polyline", { points: "512,70 512,100 74,100 74,72", class: "edge", "marker-end": `url(#${id})` }); back.style.color = "var(--ink-2)"; svg.append(back);
      svg.append(S.svg("text", { x: 293, y: 115, "text-anchor": "middle", class: "wt", text: "преход или изключение може да промени PC" }));
      root.querySelector("#cycle").append(svg);
    }

    // RISC/CISC
    const rc = root.querySelector("#rc");
    rc.append(h("tr", null, h("th", { text: "" }), h("th", null, h("dfn", { "data-g": "risc", text: "RISC" })), h("th", null, h("dfn", { "data-g": "cisc", text: "CISC" }))));
    RC.forEach((r) => rc.append(h("tr", null, ...r.map((x, i) => h(i ? "td" : "th", { text: x })))));
  }

  algos.PROGS = PROGS;
  S.chapter({ id: "isa", order: 4, num: "4", group: "Изпълнение на инструкции", title: "Система от инструкции",
    lead: "ISA като договор, адресни режими и стъпков CPU — извличане, декодиране, изпълнение — синхронно с интерпретатор на C.", html, mount, algos });
})();
