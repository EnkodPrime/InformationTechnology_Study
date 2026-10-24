/* Раздел 2 — вътрешността на CPU: АЛУ (събиране бит по бит, флагове, логически операции),
   УУ и едноцикличен датапът за ADD, ADDI, LW, SW, BEQ (RV32I). */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  const u8 = (v, name) => S.int(v, 0, 255, name);
  const bin8 = (v) => (v & 255).toString(2).padStart(8, "0");
  const hex = (v) => "0x" + (v >>> 0).toString(16).toUpperCase();

  /* кодиране на RV32I (за показване на машинния код) */
  const INSTR = {
    add: { asm: "ADD x3, x1, x2", ir: 0x002081B3 },
    addi: { asm: "ADDI x5, x5, 1", ir: 0x00128293 },
    lw: { asm: "LW x5, 4(x4)", ir: 0x00422283 },
    sw: { asm: "SW x5, 4(x4)", ir: 0x00522223 },
    beq: { asm: "BEQ x1, x2, +16", ir: 0x00208863 },
  };
  const IBASE = 0x1000, DBASE = 0x2000;
  function sext(x, bits) { const m = 2 ** (bits - 1); x = x % (2 * m); return x >= m ? x - 2 * m : x; }
  function immOf(ir) {
    const op = ir & 0x7f;
    if (op === 0x13 || op === 0x03) return sext(ir >>> 20, 12);
    if (op === 0x23) return sext(((ir >>> 25) << 5) | ((ir >>> 7) & 0x1f), 12);
    if (op === 0x63) return sext(((ir >>> 31) << 12) | (((ir >>> 7) & 1) << 11) | (((ir >>> 25) & 0x3f) << 5) | (((ir >>> 8) & 0xf) << 1), 13);
    return 0;
  }
  function control(opcode) {
    const k = { reg_write: 0, alu_src: 0, mem_read: 0, mem_write: 0, mem_to_reg: 0, branch: 0, alu_op: "+" };
    let tag = null;
    switch (opcode) {
      case 0x33: k.reg_write = 1; tag = "c_r"; break;
      case 0x13: k.reg_write = 1; k.alu_src = 1; tag = "c_i"; break;
      case 0x03: k.reg_write = 1; k.alu_src = 1; k.mem_read = 1; k.mem_to_reg = 1; tag = "c_lw"; break;
      case 0x23: k.alu_src = 1; k.mem_write = 1; tag = "c_sw"; break;
      case 0x63: k.branch = 1; k.alu_op = "-"; tag = "c_b"; break;
    }
    return { k, tag };
  }

  const algos = {
    /** Същото като alu8_add() в c/02_cpu.c */
    alu_add({ a, b }) {
      a = u8(a, "A"); b = u8(b, "B");
      const F = [];
      let carry = 0, cmsb = 0, r = 0;
      const carries = Array(9).fill(null), sums = Array(8).fill(null);
      carries[0] = 0;
      const snap = (o) => F.push(Object.assign({ a, b, r, carries: carries.slice(), sums: sums.slice() }, o));
      snap({ at: "init", vars: { a, b, carry }, msg: `A = ${bin8(a)}₂ = ${a}, B = ${bin8(b)}₂ = ${b}. Събираме бит по бит отдясно наляво; входният пренос е 0.` });
      for (let i = 0; i < 8; i++) {
        const ai = (a >> i) & 1, bi = (b >> i) & 1;
        snap({ at: ["bits", "loop"], col: i, vars: { i, ai, bi, carry }, msg: `Бит ${i}: aᵢ = ${ai}, bᵢ = ${bi}, входящ пренос = ${carry}.` });
        const s = ai ^ bi ^ carry;
        if (i === 7) cmsb = carry;
        const nc = (ai & bi) | (ai & carry) | (bi & carry);
        sums[i] = s; carry = nc; carries[i + 1] = nc;
        r |= s << i;
        snap({ at: i === 7 ? ["sum", "msb"] : ["sum", "carry"], col: i, vars: { i, s, carry, r }, msg: `sᵢ = ${ai} ⊕ ${bi} ⊕ ${carries[i]} = <b>${s}</b>; изходящ пренос = мнозинство(${ai}, ${bi}, ${carries[i]}) = <b>${nc}</b>.${i === 7 ? ` Преносът <i>в</i> старшия бит беше ${cmsb}.` : ""}`, log: `бит ${i}: s=${s} c=${nc}` });
      }
      const C = carry, V = cmsb ^ carry, Z = r === 0 ? 1 : 0, N = (r >> 7) & 1;
      snap({ at: "flagc", done: true, flags: { C }, vars: { r, C }, msg: `<b>C = ${C}</b>: ${C ? "има пренос извън 8-те бита — резултатът без знак не се побира" : "няма пренос извън 8-те бита"}.` });
      snap({ at: "flagv", done: true, flags: { C, V }, vars: { r, C, V }, msg: `<b>V = ${V}</b> = (пренос в старшия бит ${cmsb}) ⊕ (пренос от него ${C}). ${V ? "Знаково препълване: два операнда с еднакъв знак дават резултат с друг знак." : "Няма знаково препълване."}` });
      snap({ at: ["flagz", "flagn"], done: true, flags: { C, V, Z, N }, vars: { r, C, V, Z, N }, msg: `Z = ${Z}, N = ${N}. Резултат: ${bin8(r)}₂ = <b>${r}</b> без знак = <b>${r > 127 ? r - 256 : r}</b> в допълнителен код.`, log: `= ${r} C=${C} V=${V} Z=${Z} N=${N}` });
      return { frames: F, result: `${r} C=${C} V=${V} Z=${Z} N=${N}` };
    },
    alu_logic(a, b, op) { a &= 255; b &= 255; return op === "&" ? a & b : op === "|" ? a | b : op === "^" ? a ^ b : 0; },

    /** Един такт на едноцикличния датапът — същото като cycle() в c/02_cpu.c */
    datapath({ instr, x1, x2, x5, m }) {
      const I = INSTR[instr];
      if (!I) throw new Error("Непозната инструкция.");
      x1 = S.int(x1, -2147483648, 2147483647, "x1"); x2 = S.int(x2, -2147483648, 2147483647, "x2");
      x5 = S.int(x5, -2147483648, 2147483647, "x5"); m = S.int(m, -2147483648, 2147483647, "Думата в 0x2004");
      const x = Array(32).fill(0); x[1] = x1 | 0; x[2] = x2 | 0; x[4] = DBASE; x[5] = x5 | 0;
      const mem = { [DBASE + 4]: m | 0 };
      let pc = IBASE;
      const F = [], ir = I.ir;
      const snap = (o) => F.push(Object.assign({ instr, asm: I.asm, x: x.slice(), mem: { ...mem }, pc }, o));
      snap({ at: "if", act: ["pc", "imem"], vars: { pc: hex(pc) }, msg: `<b>Извличане.</b> PC = ${hex(pc)} → паметта за инструкции връща 32-битовата дума ${hex(ir)} = <code>${I.asm}</code>.` });
      const opcode = ir & 0x7f;
      const { k, tag } = control(opcode);
      const rd = (ir >>> 7) & 31, rs1 = (ir >>> 15) & 31, rs2 = (ir >>> 20) & 31;
      snap({ at: ["dec", tag], act: ["cu"], ctrl: k, vars: { opcode: hex(opcode), rd, rs1, rs2 }, msg: `<b>Декодиране.</b> opcode = ${hex(opcode)} → УУ вдига сигналите: ${Object.entries(k).filter(([n, v]) => n !== "alu_op" && v).map(([n]) => n).join(", ") || "—"}; АЛУ: „${k.alu_op}“.` });
      const imm = immOf(ir);
      const a = x[rs1], b = x[rs2];
      snap({ at: ["rf", "imm"], act: ["rf", "imm"], ctrl: k, vars: { rs1: `x${rs1} = ${a}`, rs2: `x${rs2} = ${b}`, imm }, msg: `<dfn data-g=\"register file\">Регистровият файл</dfn> чете x${rs1} = ${a} и x${rs2} = ${b} (два порта за четене). Генераторът на константа дава imm = ${imm}.` });
      const opb = k.alu_src ? imm : b;
      snap({ at: "mux", act: ["mux"], ctrl: k, vars: { alu_src: k.alu_src, opB: opb }, msg: `<dfn data-g="mux">MUX</dfn> пред вход B на АЛУ: alu_src = ${k.alu_src} → B = ${k.alu_src ? "imm" : "x" + rs2} = <b>${opb}</b>.` });
      const y = k.alu_op === "+" ? (a + opb) | 0 : (a - opb) | 0, zero = y === 0;
      snap({ at: "alu", act: ["alu"], ctrl: k, vars: { y: k.mem_read || k.mem_write ? hex(y) : y, zero }, msg: k.branch ? `АЛУ изважда: ${a} − ${opb} = ${y} → zero = <b>${zero}</b>. Това е сравнението „равни ли са“.` : k.mem_read || k.mem_write ? `АЛУ събира база и отместване: ${hex(a)} + ${opb} = <b>${hex(y)}</b> — това е <dfn data-g="ефективен адрес">ефективният адрес</dfn>, не стойност.` : `АЛУ: ${a} + ${opb} = <b>${y}</b>.` });
      let mdata = 0;
      if (k.mem_read) { mdata = (y >= DBASE && y + 4 <= DBASE + 64 && !(y & 3)) ? (mem[y] || 0) : 0; snap({ at: "mem", act: ["dmem"], ctrl: k, vars: { addr: hex(y), data: mdata }, msg: `<b>Четене</b> на думата от адрес ${hex(y)}: ${mdata}. Адресът избира мястото; ${mdata} е съдържанието.` }); }
      else if (k.mem_write) { if (y >= DBASE && y + 4 <= DBASE + 64 && !(y & 3)) mem[y] = b; snap({ at: "mem", act: ["dmem"], ctrl: k, vars: { addr: hex(y), data: b }, msg: `<b>Запис</b> на x${rs2} = ${b} в адрес ${hex(y)}. Няма запис в целеви регистър.` }); }
      else snap({ at: "mem", act: [], ctrl: k, vars: {}, msg: "Етап памет: mem_read = mem_write = 0 — паметта за данни не се използва." });
      if (k.reg_write && rd !== 0) {
        x[rd] = k.mem_to_reg ? mdata : y;
        snap({ at: "wb", act: ["wbmux", "rf"], ctrl: k, vars: { [`x${rd}`]: x[rd] }, msg: `<b>Обратен запис:</b> mem_to_reg = ${k.mem_to_reg} → x${rd} ← ${k.mem_to_reg ? "данните от паметта" : "резултата на АЛУ"} = <b>${x[rd]}</b>.` });
      } else snap({ at: "wb", act: [], ctrl: k, vars: {}, msg: `reg_write = 0 — ${k.branch ? "разклонението" : "STORE"} не записва регистър.` });
      const npc = k.branch && zero ? (pc + imm) >>> 0 : (pc + 4) >>> 0;
      snap({ at: "pc", act: ["pcmux", "pc"], ctrl: k, done: true, vars: { pc: hex(npc) }, msg: k.branch ? `branch = 1 и zero = ${zero} → PC = ${zero ? `${hex(pc)} + ${imm} = <b>${hex(npc)}</b> (взето)` : `${hex(pc)} + 4 = <b>${hex(npc)}</b> (не е взето)`}.` : `Следващ последователен адрес: PC = ${hex(pc)} + 4 = <b>${hex(npc)}</b>.`, log: `${I.asm}: pc=${hex(npc)}` });
      pc = npc;
      F[F.length - 1].pc = pc;
      return { frames: F, result: `pc=${hex(pc)} x3=${x[3] | 0} x5=${x[5] | 0} m=${(mem[DBASE + 4] ?? 0) | 0}` };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="cpu">CPU</dfn> е централният процесор. За да се разбере изпълнението на програма, трябва да се разграничат три функции: <b>съхраняване</b> на текущи стойности в регистри, <b>преобразуване</b> на стойности от изпълняващи блокове и <b>управление</b> на избора и последователността. Блоковете по-долу показват функции на изрично опростен учебен процесор, а не задължителни физически граници във всеки чип.</p>
</div>

<div class="block" style="min-width:0">
  <h3>АЛУ изпълнява избрана операция</h3>
  <p class="prose"><dfn data-g="алу">АЛУ</dfn> получава <dfn data-g="операнд">операнди</dfn> и код за избор на операция. Резултатът може да е сума, побитова логическа операция, изместване или резултат от сравнение. АЛУ не избира самостоятелно коя инструкция следва: <dfn data-g="уу">УУ</dfn> подава изборите, а регистрите предоставят и приемат стойности.</p>
  <div id="v-alu"></div>
  <div id="logic" style="display:grid;gap:10px;min-width:0"></div>
  <details class="hint"><summary>Хинт: как се смята V</summary><div>
    <p>При събиране в допълнителен код препълване има точно когато двата операнда имат еднакъв знак, а резултатът — различен. Еквивалентно: преносът <i>в</i> старшия бит се различава от преноса <i>от</i> него. Точно това прави редът <code>o.v = c_into_msb ^ carry</code>.</p>
  </div></details>
  <details class="trap"><summary>Капан: carry и signed overflow едно и също ли са?</summary><div>
    <p>Не. <dfn data-g="флаг">Флаговете</dfn> <dfn data-g="carry">C</dfn> и <dfn data-g="signed overflow">V</dfn> описват различни свойства. При 8-битово 255 + 1 има пренос извън осемте бита (C = 1), а резултатът 0 е без знаково препълване. При знаково 127 + 1 битовият шаблон е 10000000₂ = −128: V = 1, но няма пренос (C = 0). Пусни двата бутона в симулатора.</p>
    <p>Наличието и имената на статусни флагове са архитектурно зависими. <b>RV32I няма общ регистър с аритметични флагове</b> — ADD записва ниските 32 бита, а условията се проверяват със сравнения и разклонения. Блоковата схема с флагове обяснява функция, а не обещава еднакъв набор регистри.</p>
  </div></details>
</div>

<div class="block">
  <h3>УУ декодира и координира; регистрите пазят стойности</h3>
  <p class="prose">Декодерът разглежда полета като <dfn data-g="opcode">opcode</dfn> и номерата на регистри. Логиката за управление определя кой вход на <dfn data-g="mux">мултиплексор</dfn> да се използва, каква операция да извърши АЛУ, дали да се чете или записва памет и дали регистър да приеме резултата. <dfn data-g="datapath">Датапътят</dfn> е съвкупността от блоковете и връзките; управлението избира как да бъде използван.</p>
  <p class="prose">Симулаторът е учебен едноцикличен датапът за пет реални RV32I инструкции (машинният код е истинският). Начално състояние: PC = 0x1000, x4 = 0x2000, думата в 0x2004 се задава. Проследи как <b>една</b> инструкция минава през блоковете и кои управляващи сигнали са вдигнати.</p>
  <div id="v-dp"></div>
  <div class="tbl-wrap"><table class="t" id="ctrl-tbl"></table></div>
  <details class="hint"><summary>Хинт: ADD, LOAD и STORE са функционално различни</summary><div>
    <p>За ADD са нужни два регистрови операнда и запис в регистър. За LOAD — адрес, заявка за четене и запис на върнатата стойност. За STORE — адрес и запис към паметта, без запис на прочетен резултат в целеви регистър. Таблицата с управляващите сигнали показва точно тази разлика.</p>
    <p>Последователността LW x5, 4(x4) → ADDI x5, x5, 1 → SW x5, 4(x4) е „зареди, промени, запиши“: при x4 = 0x2000 и дума 42 в 0x2004 се получава 43 обратно в паметта. Пусни трите поред, като въвеждаш резултата от предишната.</p>
    <p>В реално ядро зарежданията и записите обслужва <dfn data-g="lsu">LSU</dfn>: интерфейсът към паметта отчита момента на заявката, готовността и евентуална грешка, а CPU не може да използва заредена стойност, която още не е пристигнала.</p>
  </div></details>
  <details class="trap"><summary>Капан: една инструкция означава ли един такт?</summary><div>
    <p>Не като общ закон. Fetch, decode, execute и write-back са логически действия. Този едноцикличен учебен модел изпълнява всичко за един дълъг такт; при Ibex има конкретен конвейер; инструкция може да чака отговор от паметта или многотактово изпълнение. Тактът не е команда „извърши цяла инструкция“.</p>
  </div></details>
  <details class="trap"><summary>Капан: регистрите адреси в RAM ли са? PC — номер на ред?</summary><div>
    <p>Регистровият номер x3 не е адрес 3 в RAM; регистърът може да <i>съдържа</i> адрес като стойност. PC не е „номер на следващия ред от изходния код“: един ред на език от високо ниво може да стане много инструкции. И PC + 4 не е универсално правило: 16-битова компресирана RISC-V инструкция е с дължина 2 байта.</p>
  </div></details>
</div>

<div class="block">
  <h3>Роли на регистрите</h3>
  <div class="tbl-wrap"><table class="t" id="regs"></table></div>
  <p class="prose muted"><dfn data-g="mar">MAR</dfn> и <dfn data-g="mdr">MDR</dfn> са учебни имена; ролята на SP за x2 в RISC-V идва от програмното споразумение (<dfn data-g="abi">ABI</dfn>), не от самите инструкции. Таблицата различава роли, а не задължителен физически списък. Имената и видимостта зависят от архитектурата и реализацията.</p>
</div>

<div class="block">
  <h3>Ядро, кеш и цял чип</h3>
  <p class="prose"><dfn data-g="ядро">Ядрото</dfn> е изпълняващият процесорен блок; чипът може да съдържа едно или много ядра и други подсистеми. <dfn data-g="mcu">MCU</dfn> обикновено интегрира ядро, памети и периферия; <dfn data-g="soc">SoC</dfn> е по-общо понятие. В реален Cortex-M0 има <dfn data-g="nvic">NVIC</dfn> и <dfn data-g="ahb">AHB</dfn>-Lite интерфейс (от семейството <dfn data-g="amba">AMBA</dfn>) — блоковият чертеж е по-богат от АЛУ плюс УУ. Изпълняващата част може да съдържа <dfn data-g="fpu">FPU</dfn>, множители, делители и SIMD блокове; операция по ISA и физически блок не са едно към едно.</p>
  <details class="hint"><summary>Хинт: комбинационна логика и регистри</summary><div>
    <p>Комбинационната логика формира изходи от текущите входове, а регистрите запазват състояние при определени събития на тактовия сигнал. При конвейер различни инструкции заемат различни етапи едновременно — виж <a href="#konveier">раздел 5</a>.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> АЛУ преобразува; УУ избира; регистрите пазят. Данни, адрес и управляващ сигнал могат да са все битове, но имат различна роля. C ≠ V; адрес ≠ стойност; инструкция ≠ такт.</div>`;

  const REGS = [
    ["GPR", "gpr", "операнди, адреси, междинни резултати", "x1…x31 в RV32I"],
    ["PC", "брояч на командите", "адрес, свързан с текущата инструкция", "0x1000 → 0x1004"],
    ["IR", "ir", "извлечената инструкция (учебно име)", "0x002081B3"],
    ["SP", "sp", "указател към стека", "x2 по програмното споразумение на RISC-V"],
    ["ACC", "acc", "подразбиращ се регистър (не е универсален)", "акумулаторни архитектури"],
    ["MAR / MDR", "mar", "адрес / данни при паметен обмен (учебни имена)", "0x2004 / 42"],
  ];

  /* ---------- рисуване на датапъта ---------- */
  let mk = 0;
  function drawDP(st, f) {
    st.innerHTML = "";
    const W = 720, H = 300, id = "dp" + (mk++);
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
    const d = S.svg("defs");
    d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" })));
    svg.append(d);
    const act = new Set(f.act || []);
    const B = (key, x, y, w, hh, lab, sub) => {
      const g = S.svg("g", { class: "node " + (act.has(key) ? (key === "dmem" ? "s-piv" : key === "cu" ? "s-cmp" : "s-act") : "") });
      g.append(S.svg("rect", { x, y, width: w, height: hh, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
      g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + (sub ? -2 : 5), "text-anchor": "middle", "font-weight": 600, "font-size": 12, text: lab }));
      if (sub) g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + 13, "text-anchor": "middle", class: "wt", "font-size": 11, text: sub }));
      svg.append(g);
    };
    const L = (pts, on, dash) => {
      const p = S.svg("polyline", { points: pts, class: "edge " + (on ? "s-act" : ""), "marker-end": `url(#${id})`, "stroke-dasharray": dash ? "5 4" : null });
      p.style.color = on ? "var(--c)" : "var(--line)";
      svg.append(p);
    };
    const k = f.ctrl || {};
    B("pc", 10, 120, 50, 50, "PC", "0x" + (f.pc >>> 0).toString(16));
    B("imem", 80, 105, 90, 80, "Памет I", "инструкции");
    B("cu", 210, 10, 120, 46, "УУ", "декодер + управл.");
    B("rf", 210, 100, 110, 90, "Рег. файл", "2 чет. / 1 зап.");
    B("imm", 210, 215, 110, 40, "imm ген.");
    B("mux", 350, 150, 40, 60, "MUX");
    B("alu", 420, 100, 80, 90, "АЛУ", k.alu_op ? "„" + k.alu_op + "“" : "");
    B("dmem", 530, 100, 90, 90, "Памет D", "данни");
    B("wbmux", 645, 120, 40, 60, "MUX");
    B("pcmux", 10, 220, 60, 40, "PC+4 / +imm");
    const on = (k2) => act.has(k2);
    L("60,145 78,145", on("imem"));
    L("170,145 208,145", on("rf"));
    L("170,130 190,130 190,33 208,33", on("cu"), true);
    L("170,165 190,165 190,235 208,235", on("imm"));
    L("320,125 418,125", on("alu"));
    L("320,165 348,165", on("mux"));
    L("320,235 340,235 340,195 348,195", on("mux") && k.alu_src);
    L("390,180 418,180", on("alu"));
    L("500,145 528,145", on("dmem"));
    L("500,115 515,115 515,85 635,85 635,135 643,135", on("wbmux") && !k.mem_to_reg);
    L("620,160 643,160", on("wbmux") && k.mem_to_reg);
    L("665,180 665,285 265,285 265,192", on("wbmux"));
    L("320,180 330,180 330,270 515,270 515,190", on("dmem") && k.mem_write);
    L("40,218 40,172", on("pc"));
    // управляващи сигнали
    const sig = ["reg_write", "alu_src", "mem_read", "mem_write", "mem_to_reg", "branch"];
    sig.forEach((s, i) => {
      const v = k[s];
      svg.append(S.svg("text", { x: 345 + (i % 3) * 125, y: 22 + Math.floor(i / 3) * 18, "font-size": 11, fill: v ? "var(--st-cmp)" : "var(--muted)", "font-weight": v ? 700 : 400, text: `${s}=${v == null ? "·" : v}` }));
    });
    st.append(svg);
    // регистри и памет
    const regs = [1, 2, 3, 4, 5].map((r) => `x${r} = ${r === 4 ? "0x" + (f.x[r] >>> 0).toString(16) : f.x[r] | 0}`).join(" · ");
    st.append(h("p", { class: "mono", style: { fontSize: ".85rem" }, text: `${f.asm}   |   ${regs}   |   mem[0x2004] = ${(f.mem[DBASE + 4] ?? 0) | 0}` }));
  }

  /* ---------- mount ---------- */
  function mount(root) {
    // АЛУ
    S.viz(root.querySelector("#v-alu"), {
      id: "alu", title: "8-битово събиране в АЛУ — бит по бит, с флагове", sub: "Учебен 8-битов модел; флаговете C, V, Z, N са учебни",
      code: "ch02_alu_add",
      inputs: [{ id: "a", label: "A (0..255)", type: "number", value: 5, width: "6em" }, { id: "b", label: "B (0..255)", type: "number", value: 3, width: "6em" }],
      presets: [{ label: "255 + 1 (carry)", values: { a: 255, b: 1 } }, { label: "127 + 1 (overflow)", values: { a: 127, b: 1 } }, { label: "128 + 128 (C и V)", values: { a: 128, b: 128 } }, { label: "200 + 100", values: { a: 200, b: 100 } }],
      random: () => ({ a: S.randInt(0, 255), b: S.randInt(0, 255) }),
      legend: [["s-act", "текущ бит"], ["s-cmp", "пренос"], ["s-done", "готов бит"], ["s-swap", "вдигнат флаг"]],
      build: algos.alu_add,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" });
        const hdr = h("tr", null, h("th", { text: "" }));
        for (let i = 7; i >= 0; i--) hdr.append(h("th", { text: "b" + i }));
        hdr.append(h("th", { text: "дес." }));
        tb.append(hdr);
        const cr = h("tr", null, h("th", { text: "пренос" }));
        for (let i = 7; i >= 0; i--) cr.append(h("td", { class: f.carries[i] ? "s-cmp" : "", text: f.carries[i] == null ? "" : f.carries[i] }));
        cr.append(h("td", { class: f.carries[8] ? "s-swap" : "", text: f.carries[8] == null ? "" : "C→" + f.carries[8] }));
        tb.append(cr);
        const row = (name, v) => {
          const tr = h("tr", null, h("th", { text: name }));
          for (let i = 7; i >= 0; i--) tr.append(h("td", { class: f.col === i ? "s-act" : "", text: (v >> i) & 1 }));
          tr.append(h("td", { text: v }));
          return tr;
        };
        tb.append(row("A", f.a), row("B", f.b));
        const sr = h("tr", null, h("th", { text: "A + B" }));
        for (let i = 7; i >= 0; i--) sr.append(h("td", { class: f.sums[i] == null ? "" : f.col === i ? "s-act" : "s-done", text: f.sums[i] == null ? "" : f.sums[i] }));
        sr.append(h("td", { text: f.sums.every((x) => x != null) ? f.r : "" }));
        tb.append(sr);
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.flags) {
          const fl = h("div", { class: "row", style: { marginTop: "10px" } });
          [["C", "пренос"], ["V", "знак. препълване"], ["Z", "нула"], ["N", "отрицателен"]].forEach(([k, t]) => {
            if (f.flags[k] == null) return;
            fl.append(h("span", { class: "pill " + (f.flags[k] ? "s-swap" : "s-done"), text: `${k} = ${f.flags[k]} · ${t}` }));
          });
          st.append(fl);
        }
      },
    });

    // логически операции — статично: едни входове, различен код
    const lg = root.querySelector("#logic");
    const la = h("input", { type: "number", value: 5, min: 0, max: 255, style: { width: "6em" }, "aria-label": "A" });
    const lb = h("input", { type: "number", value: 3, min: 0, max: 255, style: { width: "6em" }, "aria-label": "B" });
    const lout = h("div", { class: "tbl-wrap" });
    const lmsg = h("p", { class: "muted" });
    function renderLogic() {
      let a, b;
      try { a = u8(la.value, "A"); b = u8(lb.value, "B"); lmsg.textContent = "Едни и същи входове дават различни резултати според управляващия код."; }
      catch (e) { lmsg.textContent = e.message; lout.innerHTML = ""; return; }
      const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "код" }), h("th", { text: "двоично" }), h("th", { text: "десетично" })));
      tb.append(h("tr", null, h("th", { text: "A" }), h("td", { text: bin8(a) }), h("td", { text: a })));
      tb.append(h("tr", null, h("th", { text: "B" }), h("td", { text: bin8(b) }), h("td", { text: b })));
      [["ADD", (a + b) & 255], ["AND", algos.alu_logic(a, b, "&")], ["OR", algos.alu_logic(a, b, "|")], ["XOR", algos.alu_logic(a, b, "^")]].forEach(([n, v]) =>
        tb.append(h("tr", null, h("th", { text: n }), h("td", { class: "s-done", text: bin8(v) }), h("td", { text: v }))));
      lout.innerHTML = ""; lout.append(tb);
    }
    la.addEventListener("input", renderLogic); lb.addEventListener("input", renderLogic);
    lg.append(h("div", { class: "row" }, h("label", { class: "field" }, h("span", { text: "A" }), la), h("label", { class: "field" }, h("span", { text: "B" }), lb)), lout, lmsg);
    S.codeView(lg, "ch02_alu_logic", ["sel"]);
    renderLogic();

    // датапът
    S.viz(root.querySelector("#v-dp"), {
      id: "dp", title: "Едноцикличен датапът: една RV32I инструкция през блоковете", sub: "Плътна линия — данни/адрес, пунктир — към УУ; вдигнатите сигнали са оранжеви",
      code: "ch02_datapath",
      inputs: [{ id: "instr", label: "Инструкция", type: "select", value: "add", options: Object.keys(INSTR).map((k) => [k, INSTR[k].asm]) },
        { id: "x1", label: "x1", type: "number", value: 5, width: "7em" }, { id: "x2", label: "x2", type: "number", value: 3, width: "7em" },
        { id: "x5", label: "x5", type: "number", value: 42, width: "7em" }, { id: "m", label: "дума в 0x2004", type: "number", value: 42, width: "7em" }],
      presets: [{ label: "ADD 5 + 3", values: { instr: "add", x1: 5, x2: 3 } }, { label: "LW (42)", values: { instr: "lw", m: 42 } }, { label: "ADDI → 43", values: { instr: "addi", x5: 42 } }, { label: "SW 43", values: { instr: "sw", x5: 43, m: 42 } },
        { label: "BEQ взето", values: { instr: "beq", x1: 7, x2: 7 } }, { label: "BEQ не", values: { instr: "beq", x1: 5, x2: 3 } }],
      legend: [["s-act", "активен блок/път"], ["s-cmp", "УУ"], ["s-piv", "памет за данни"]],
      build: algos.datapath,
      draw: drawDP,
    });

    // таблица на сигналите
    const ct = root.querySelector("#ctrl-tbl");
    const sig = ["reg_write", "alu_src", "mem_read", "mem_write", "mem_to_reg", "branch", "alu_op"];
    ct.append(h("tr", null, h("th", { text: "инструкция" }), ...sig.map((s) => h("th", { class: "mono", text: s }))));
    Object.keys(INSTR).forEach((k) => {
      const c = control(INSTR[k].ir & 0x7f).k;
      ct.append(h("tr", null, h("td", { class: "mono", text: INSTR[k].asm }), ...sig.map((s) => h("td", { class: "mono " + (c[s] === 1 ? "s-cmp" : ""), text: String(c[s]) }))));
    });

    // роли на регистрите
    const rg = root.querySelector("#regs");
    rg.append(h("tr", null, h("th", { text: "Регистър" }), h("th", { text: "Роля" }), h("th", { text: "Пример" })));
    REGS.forEach(([n, g, r, e]) => rg.append(h("tr", null, h("td", null, h("dfn", { "data-g": g, text: n })), h("td", { text: r }), h("td", { class: "mono", text: e }))));
  }

  S.chapter({ id: "cpu", order: 2, num: "2", group: "Основа", title: "CPU: АЛУ, УУ, регистри и пътят на инструкцията",
    lead: "Какво прави всеки блок, защо carry ≠ overflow и как една инструкция минава от PC до записан резултат.", html, mount, algos });
})();
