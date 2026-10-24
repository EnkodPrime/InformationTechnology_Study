/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_bus": {
  "file": "01_bus.c",
  "code": "/* prog[i] == 'L' или 'S' -> инструкцията има достъп до данни; 'A' -> няма. */\ntypedef struct { int cycles, fetches, data, conflicts; } bus_stats_t;\n\nbus_stats_t run_bus(const char *prog, int harvard)\n{\n    bus_stats_t st = {0, 0, 0, 0};\n    int n = (int)strlen(prog), next = 0;   /* следваща за извличане */\n    int pending = -1;                       /* чакащ достъп до данни */\n    while (next < n || pending >= 0) {\n        st.cycles++;\n        int data_bus_busy = 0;\n        if (pending >= 0) {\n            st.data++;                 /* D: транзакция за данни */\n            data_bus_busy = 1;\n            pending = -1;\n        }\n        int fetch_bus_busy = harvard ? 0 : data_bus_busy;\n        if (next < n && !fetch_bus_busy) {\n            st.fetches++;              /* F: извличане на инструкция */\n            if (prog[next] == 'L' || prog[next] == 'S')\n                pending = next;\n            next++;\n        } else if (next < n) {\n            st.conflicts++;            /* F чака: шината е заета */\n        }\n    }\n    return st;\n}",
  "tags": {
   "init": [
    7
   ],
   "loop": [
    9
   ],
   "tick": [
    10
   ],
   "dchk": [
    12
   ],
   "data": [
    13
   ],
   "share": [
    17
   ],
   "fchk": [
    18
   ],
   "fetch": [
    19
   ],
   "needd": [
    21
   ],
   "conf": [
    24
   ],
   "ret": [
    27
   ]
  }
 },
 "ch02_alu_add": {
  "file": "02_cpu.c",
  "code": "/* 8-битово събиране \"бит по бит\" и флагове. */\ntypedef struct { uint8_t r; int c, v, z, n; } alu8_t;\n\nalu8_t alu8_add(uint8_t a, uint8_t b)\n{\n    alu8_t o = {0, 0, 0, 0, 0};\n    unsigned carry = 0, c_into_msb = 0;\n    for (int i = 0; i < 8; i++) {\n        unsigned ai = (a >> i) & 1u, bi = (b >> i) & 1u;\n        unsigned s = ai ^ bi ^ carry;\n        if (i == 7) c_into_msb = carry;\n        carry = (ai & bi) | (ai & carry) | (bi & carry);\n        o.r |= (uint8_t)(s << i);\n    }\n    o.c = (int)carry;               /* пренос извън 8-те бита */\n    o.v = (int)(c_into_msb ^ carry); /* знаково препълване     */\n    o.z = (o.r == 0);\n    o.n = (o.r >> 7) & 1;\n    return o;\n}",
  "tags": {
   "init": [
    7
   ],
   "loop": [
    8
   ],
   "bits": [
    9
   ],
   "sum": [
    10
   ],
   "msb": [
    11
   ],
   "carry": [
    12
   ],
   "store": [
    13
   ],
   "flagc": [
    15
   ],
   "flagv": [
    16
   ],
   "flagz": [
    17
   ],
   "flagn": [
    18
   ]
  }
 },
 "ch02_alu_logic": {
  "file": "02_cpu.c",
  "code": "/* Същите входове, друг управляващ код -> друг резултат. */\nuint8_t alu8_logic(uint8_t a, uint8_t b, char op)\n{\n    switch (op) {\n    case '&': return (uint8_t)(a & b);\n    case '|': return (uint8_t)(a | b);\n    case '^': return (uint8_t)(a ^ b);\n    default:  return 0;\n    }\n}",
  "tags": {
   "sel": [
    4
   ],
   "and": [
    5
   ],
   "or": [
    6
   ],
   "xor": [
    7
   ]
  }
 },
 "ch02_datapath": {
  "file": "02_cpu.c",
  "code": "/* Управляващи сигнали на учебния едноцикличен датапът. */\ntypedef struct {\n    int reg_write, alu_src, mem_read, mem_write, mem_to_reg, branch;\n    char alu_op;                 /* '+' събиране, '-' изваждане (BEQ) */\n} ctrl_t;\n\ntypedef struct { uint32_t pc, x[32]; uint8_t dmem[64]; } cpu_t;\n#define DBASE 0x2000u            /* данните: 0x2000 .. 0x203F */\n#define IBASE 0x1000u            /* инструкциите: от 0x1000 */\n\nstatic ctrl_t control(uint32_t opcode)                 /* УУ */\n{\n    ctrl_t k = {0, 0, 0, 0, 0, 0, '+'};\n    switch (opcode) {\n    case 0x33: k.reg_write = 1; break;                  /* ADD  */\n    case 0x13: k.reg_write = 1; k.alu_src = 1; break;   /* ADDI */\n    case 0x03: k.reg_write = 1; k.alu_src = 1;          /* LW   */\n               k.mem_read = 1; k.mem_to_reg = 1; break;\n    case 0x23: k.alu_src = 1; k.mem_write = 1; break;   /* SW   */\n    case 0x63: k.branch = 1; k.alu_op = '-'; break;     /* BEQ  */\n    }\n    return k;\n}\n\nstatic int32_t sext(uint32_t x, int bits)              /* знаково разширение */\n{\n    uint32_t m = 1u << (bits - 1);\n    x &= (m << 1) - 1u;\n    return (int32_t)((x ^ m) - m);\n}\n\nstatic int32_t imm_of(uint32_t ir)                      /* генератор на константата */\n{\n    switch (ir & 0x7f) {\n    case 0x13: case 0x03: return sext(ir >> 20, 12);\n    case 0x23: return sext(((ir >> 25) << 5) | ((ir >> 7) & 0x1f), 12);\n    case 0x63: return sext(((ir >> 31) << 12) | (((ir >> 7) & 1u) << 11) |\n                           (((ir >> 25) & 0x3f) << 5) | (((ir >> 8) & 0xf) << 1), 13);\n    default:   return 0;\n    }\n}\n\nstatic uint32_t mem_rd(const cpu_t *c, uint32_t a)      /* 32 бита, little endian */\n{\n    if (a < DBASE || a - DBASE > 64 - 4 || (a & 3)) return 0;\n    const uint8_t *p = &c->dmem[a - DBASE];\n    return p[0] | (uint32_t)p[1] << 8 | (uint32_t)p[2] << 16 | (uint32_t)p[3] << 24;\n}\n\nstatic void mem_wr(cpu_t *c, uint32_t a, uint32_t v)\n{\n    if (a < DBASE || a - DBASE > 64 - 4 || (a & 3)) return;\n    for (int i = 0; i < 4; i++) c->dmem[a - DBASE + i] = (uint8_t)(v >> (8 * i));\n}\n\n/* Един такт на едноцикличния датапът = една инструкция. */\nvoid cycle(cpu_t *c, const uint32_t *imem)\n{\n    uint32_t ir = imem[(c->pc - IBASE) / 4];\n    ctrl_t k = control(ir & 0x7f);\n    uint32_t rd = (ir >> 7) & 31, rs1 = (ir >> 15) & 31, rs2 = (ir >> 20) & 31;\n    int32_t imm = imm_of(ir);\n    uint32_t a = c->x[rs1], b = c->x[rs2];\n    uint32_t opb = k.alu_src ? (uint32_t)imm : b;\n    uint32_t y = k.alu_op == '+' ? a + opb : a - opb;\n    int zero = (y == 0);\n    uint32_t mdata = 0;\n    if (k.mem_read)  mdata = mem_rd(c, y);\n    if (k.mem_write) mem_wr(c, y, b);\n    if (k.reg_write && rd != 0)\n        c->x[rd] = k.mem_to_reg ? mdata : y;\n    c->pc = (k.branch && zero) ? c->pc + (uint32_t)imm : c->pc + 4;\n}",
  "tags": {
   "dec": [
    14
   ],
   "c_r": [
    15
   ],
   "c_i": [
    16
   ],
   "c_lw": [
    17,
    18
   ],
   "c_sw": [
    19
   ],
   "c_b": [
    20
   ],
   "if": [
    59
   ],
   "id": [
    60,
    61
   ],
   "imm": [
    62
   ],
   "rf": [
    63
   ],
   "mux": [
    64
   ],
   "alu": [
    65,
    66
   ],
   "mem": [
    68,
    69
   ],
   "wb": [
    70,
    71
   ],
   "pc": [
    72
   ]
  }
 },
 "ch03_simd": {
  "file": "03_parallel.c",
  "code": "/* SISD: една скаларна инструкция за всеки елемент. */\nint vec_add_sisd(const int *a, const int *b, int *c, int n)\n{\n    int ops = 0;\n    for (int i = 0; i < n; i++) {\n        c[i] = a[i] + b[i];\n        ops++;\n    }\n    return ops;\n}\n\n/* SIMD с W ленти. Вътрешният цикъл по ленти ИЗОБРАЗЯВА една векторна\n   инструкция (в реален код: напр. vaddq_s32 от Arm NEON за W = 4 x int32).\n   Опашката n mod W се довършва скаларно. */\nint vec_add_simd(const int *a, const int *b, int *c, int n, int W)\n{\n    int ops = 0, i = 0;\n    for (; i + W <= n; i += W) {\n        for (int l = 0; l < W; l++)             /* ленти: една инструкция */\n            c[i + l] = a[i + l] + b[i + l];\n        ops++;\n    }\n    for (; i < n; i++) {\n        c[i] = a[i] + b[i];\n        ops++;\n    }\n    return ops;\n}",
  "tags": {
   "s_loop": [
    5
   ],
   "s_add": [
    6
   ],
   "s_ret": [
    9
   ],
   "v_loop": [
    18
   ],
   "v_add": [
    20
   ],
   "v_cnt": [
    21
   ],
   "t_loop": [
    23
   ],
   "t_add": [
    24
   ],
   "v_ret": [
    27
   ]
  }
 },
 "ch03_rr": {
  "file": "03_parallel.c",
  "code": "#define MAXT 6\n#define MAXC 4\n#define TMAX 200\n/* len[i] — продължителност на задача i; dep[i] — задача, която i чака (-1 няма);\n   q — квант (0 = без отнемане: задачата работи до край). */\nint round_robin(int n, const int *len, const int *dep, int cores, int q,\n                int tl[MAXC][TMAX], int *finish)\n{\n    int rem[MAXT], queued[MAXT] = {0}, queue[MAXT], qh = 0, qn = 0; /* кръгова опашка: в нея има най-много n задачи */\n    int cur[MAXC], used[MAXC], done = 0, t = 0;\n    for (int i = 0; i < n; i++) { rem[i] = len[i]; finish[i] = -1; }\n    for (int k = 0; k < cores; k++) cur[k] = -1;\n    while (done < n && t < TMAX) {\n        for (int i = 0; i < n; i++)                             /* готови задачи */\n            if (!queued[i] && (dep[i] < 0 || finish[dep[i]] >= 0)) {\n                queue[(qh + qn++) % MAXT] = i; queued[i] = 1;\n            }\n        for (int k = 0; k < cores; k++)                         /* изтекъл квант */\n            if (cur[k] >= 0 && q > 0 && used[k] == q) {\n                queue[(qh + qn++) % MAXT] = cur[k]; cur[k] = -1;\n            }\n        for (int k = 0; k < cores; k++)                         /* свободно ядро */\n            if (cur[k] < 0 && qn > 0) {\n                cur[k] = queue[qh]; qh = (qh + 1) % MAXT; qn--; used[k] = 0;\n            }\n        for (int k = 0; k < cores; k++) {                       /* една единица време */\n            tl[k][t] = cur[k];\n            if (cur[k] < 0) continue;\n            rem[cur[k]]--; used[k]++;\n            if (rem[cur[k]] == 0) {\n                finish[cur[k]] = t + 1; done++; cur[k] = -1;\n            }\n        }\n        t++;\n    }\n    return t;\n}",
  "tags": {
   "loop": [
    13
   ],
   "ready": [
    15
   ],
   "preempt": [
    19
   ],
   "pick": [
    23
   ],
   "run": [
    27
   ],
   "finish": [
    30
   ],
   "ret": [
    36
   ]
  }
 },
 "ch04_cpu": {
  "file": "04_isa.c",
  "code": "typedef struct { int op, rd, rs, rt, imm; } instr_t;  /* rs == NO_BASE: пряк адрес */\ntypedef struct { int pc; int r[NREG]; int mem[NMEM]; const instr_t *imem; int n; } cpu_t;\n\nstatic void wr(cpu_t *c, int rd, int v) { if (rd != 0) c->r[rd] = v; } /* R0 = 0 */\n\n/* Изпълнява една инструкция. Връща 1 — продължава, 0 — HALT, -1 — грешка. */\nint step(cpu_t *c)\n{\n    if (c->pc < 0 || c->pc >= c->n) return -1;          /* PC извън програмата */\n    instr_t ir = c->imem[c->pc];\n    c->pc = c->pc + 1;                  /* следваща по ред */\n    long long ea;                       /* без препълване при Rs + off */\n    switch (ir.op) {\n    case OP_LI:   wr(c, ir.rd, ir.imm); break;\n    case OP_MOV:  wr(c, ir.rd, c->r[ir.rs]); break;\n    case OP_ADD:  wr(c, ir.rd, (int)((unsigned)c->r[ir.rs] + (unsigned)c->r[ir.rt])); break;\n    case OP_SUB:  wr(c, ir.rd, (int)((unsigned)c->r[ir.rs] - (unsigned)c->r[ir.rt])); break;\n    case OP_SLT:  wr(c, ir.rd, c->r[ir.rs] < c->r[ir.rt]); break;\n    case OP_ADDI: wr(c, ir.rd, (int)((unsigned)c->r[ir.rs] + (unsigned)ir.imm)); break;\n    case OP_LOAD:\n    case OP_STORE:\n        ea = (ir.rs == NO_BASE ? 0LL : (long long)c->r[ir.rs]) + ir.imm;  /* ефективен адрес */\n        if (ea < 0 || ea >= NMEM) return -1;\n        if (ir.op == OP_LOAD) wr(c, ir.rd, c->mem[ea]);\n        else                  c->mem[ea] = c->r[ir.rd];\n        break;\n    case OP_BEQ:  if (c->r[ir.rs] == c->r[ir.rt]) c->pc = ir.imm; break;\n    case OP_BNE:  if (c->r[ir.rs] != c->r[ir.rt]) c->pc = ir.imm; break;\n    case OP_JMP:  c->pc = ir.imm; break;\n    case OP_NOP:  break;\n    case OP_HALT: return 0;\n    }\n    return 1;\n}",
  "tags": {
   "fetch": [
    10,
    11
   ],
   "decode": [
    13
   ],
   "li": [
    14
   ],
   "mov": [
    15
   ],
   "add": [
    16
   ],
   "sub": [
    17
   ],
   "slt": [
    18
   ],
   "addi": [
    19
   ],
   "ea": [
    22,
    23
   ],
   "load": [
    24
   ],
   "store": [
    25
   ],
   "beq": [
    27
   ],
   "bne": [
    28
   ],
   "jmp": [
    29
   ],
   "nop": [
    30
   ],
   "halt": [
    31
   ],
   "next": [
    33
   ]
  }
 },
 "ch05_pipe": {
  "file": "05_pipeline.c",
  "code": "/* Стадиите на текущия такт: индекс на инструкция, EMPTY или WRONG. */\nstatic int writes(const pinstr_t *p, int x, int r)\n{\n    return x >= 0 && r != 0 && p[x].rd == r && p[x].kind != K_STORE && p[x].kind != K_BR;\n}\n\n/* 1, ако инструкцията в ID трябва да чака (зависимост по данни). */\nstatic int hazard(const pinstr_t *p, const int st[NSTAGE], int fwd)\n{\n    int i = st[S_ID];\n    if (i < 0) return 0;\n    int src[2] = {p[i].rs, p[i].rt};\n    for (int k = 0; k < 2; k++) {\n        int r = src[k];\n        if (r == 0) continue;\n        if (writes(p, st[S_EX], r)) {                   /* най-младият производител */\n            if (!fwd || p[st[S_EX]].kind == K_LOAD)\n                return 1;\n        } else if (writes(p, st[S_MEM], r) && !fwd) {\n            return 1;\n        }\n    }\n    return 0;\n}\n\nint pipeline(const pinstr_t *p, int n, int fwd, int predict, int unified,\n             int diag[MAXI][MAXCYC], pstats_t *s)\n{\n    int st[NSTAGE] = {EMPTY, EMPTY, EMPTY, EMPTY, EMPTY};\n    int next = 0, retired = 0, cyc = 0;\n    memset(s, 0, sizeof *s);\n    for (int i = 0; i < n; i++) for (int c = 0; c < MAXCYC; c++) diag[i][c] = -1;\n    while (retired < n && cyc < MAXCYC) {\n        /* --- преход от такт cyc към cyc+1 (първият такт е 1) --- */\n        int nx[NSTAGE];\n        nx[S_WB] = st[S_MEM];\n        nx[S_MEM] = st[S_EX];\n        int flush = st[S_EX] >= 0 && p[st[S_EX]].kind == K_BR && p[st[S_EX]].taken && predict;\n        int stall = !flush && hazard(p, st, fwd);\n        int hold_if = 0;\n        if (flush) {                                            /* погрешният път се отхвърля */\n            s->flushed += (st[S_ID] == WRONG) + (st[S_IF] == WRONG);\n            nx[S_EX] = EMPTY; nx[S_ID] = EMPTY; nx[S_IF] = EMPTY;\n            next = st[S_EX] + 1;\n        } else if (stall) {                                     /* мехурче в EX */\n            s->data_stalls++;\n            nx[S_EX] = EMPTY; nx[S_ID] = st[S_ID]; nx[S_IF] = st[S_IF];\n            hold_if = 1;\n        } else {\n            nx[S_EX] = st[S_ID]; nx[S_ID] = st[S_IF]; nx[S_IF] = EMPTY;\n        }\n        if (!hold_if) {                                         /* извличане (IF) */\n            int last = next - 1;                                /* последно извлечената */\n            int br_open = 0;\n            for (int k = S_ID; k <= S_EX; k++)\n                if (nx[k] >= 0 && p[nx[k]].kind == K_BR) br_open = 1;\n            int port_busy = unified && nx[S_MEM] >= 0 &&\n                            (p[nx[S_MEM]].kind == K_LOAD || p[nx[S_MEM]].kind == K_STORE);\n            if (!predict && br_open) {\n                s->branch_stalls++;\n            } else if (port_busy && (next < n || (predict && last >= 0 && p[last].kind == K_BR && p[last].taken && br_open))) {\n                s->struct_stalls++;\n            } else if (predict && last >= 0 && p[last].kind == K_BR && p[last].taken && br_open) {\n                nx[S_IF] = WRONG;            /* предсказано \"не е взето\" */\n            } else if (next < n) {\n                nx[S_IF] = next++;\n            }\n        }\n        if (nx[S_WB] >= 0) retired++;\n        memcpy(st, nx, sizeof st);\n        cyc++;\n        for (int k = 0; k < NSTAGE; k++) if (st[k] >= 0) diag[st[k]][cyc] = k;\n    }\n    s->cycles = cyc;\n    return cyc;\n}",
  "tags": {
   "haz_ex": [
    17
   ],
   "haz_mem": [
    19
   ],
   "adv": [
    36,
    37
   ],
   "flush": [
    38,
    42
   ],
   "hazard": [
    39
   ],
   "stall": [
    46
   ],
   "move": [
    50
   ],
   "brstall": [
    60
   ],
   "struct": [
    62
   ],
   "wrong": [
    64
   ],
   "fetch": [
    66
   ],
   "diag": [
    72
   ],
   "ret": [
    75
   ]
  }
 },
 "ch06_cache": {
  "file": "06_cache.c",
  "code": "typedef struct { int valid, dirty; unsigned tag; long stamp; } line_t;\ntypedef struct {\n    int sets, ways, block;          /* брой набори, линии в набор, байтове в линия */\n    int lru, write_back;            /* 1 = LRU, 0 = FIFO;  1 = write-back, 0 = write-through */\n    line_t L[MAXLINES];\n    long clock;\n    int hits, misses, evictions, writebacks, mem_writes;\n} cache_t;\n\nstatic int log2i(int x) { int k = 0; while ((1 << k) < x) k++; return k; }\n\n/* Връща 1 при попадение, 0 при пропуск. is_write: 0 четене, 1 запис. */\nint cache_access(cache_t *c, unsigned addr, int is_write)\n{\n    int ob = log2i(c->block), ib = log2i(c->sets);\n    unsigned offset = addr & (unsigned)(c->block - 1);\n    unsigned index = (addr >> ob) & (unsigned)(c->sets - 1);\n    unsigned tag = addr >> (ob + ib);\n    (void)offset;\n    line_t *set = &c->L[index * (unsigned)c->ways];\n    c->clock++;\n    for (int w = 0; w < c->ways; w++)\n        if (set[w].valid && set[w].tag == tag) {\n            c->hits++;\n            if (c->lru) set[w].stamp = c->clock;   /* FIFO не обновява */\n            if (is_write) {\n                if (c->write_back) set[w].dirty = 1;\n                else c->mem_writes++;\n            }\n            return 1;\n        }\n    c->misses++;\n    if (is_write && !c->write_back) {                        /* no-write-allocate */\n        c->mem_writes++;\n        return 0;\n    }\n    int victim = -1;\n    for (int w = 0; w < c->ways; w++)                        /* свободна линия? */\n        if (!set[w].valid) { victim = w; break; }\n    if (victim < 0) {                                        /* най-стар печат */\n        victim = 0;\n        for (int w = 1; w < c->ways; w++)\n            if (set[w].stamp < set[victim].stamp) victim = w;\n        c->evictions++;\n        if (set[victim].dirty) { c->writebacks++; c->mem_writes++; }\n    }\n    set[victim].valid = 1; set[victim].tag = tag;\n    set[victim].dirty = is_write;\n    set[victim].stamp = c->clock;\n    return 0;\n}",
  "tags": {
   "split": [
    16,
    17,
    18
   ],
   "search": [
    22
   ],
   "cmp": [
    23
   ],
   "hit": [
    24
   ],
   "touch": [
    25
   ],
   "wdirty": [
    27
   ],
   "wthrough": [
    28
   ],
   "miss": [
    32
   ],
   "wnoalloc": [
    34
   ],
   "free": [
    39
   ],
   "victim": [
    42
   ],
   "evict": [
    44
   ],
   "wb": [
    45
   ],
   "fill": [
    47,
    48,
    49
   ]
  }
 },
 "ch06_locality": {
  "file": "06_cache.c",
  "code": "/* Обхождане на int m[R][C] (4 байта елемент, редово разположение в C).\n   Адресът на m[i][j] е base + (i*C + j)*4. */\nvoid walk(cache_t *c, unsigned base, int R, int C, int by_rows)\n{\n    for (int a = 0; a < (by_rows ? R : C); a++)\n        for (int b = 0; b < (by_rows ? C : R); b++) {\n            int i = by_rows ? a : b, j = by_rows ? b : a;\n            unsigned addr = base + (unsigned)(i * C + j) * 4u;\n            cache_access(c, addr, 0);\n        }\n}",
  "tags": {
   "outer": [
    5
   ],
   "inner": [
    6
   ],
   "addr": [
    8
   ],
   "acc": [
    9
   ]
  }
 },
 "ch06_amat": {
  "file": "06_cache.c",
  "code": "double amat(double t_hit, double miss_rate, double penalty)\n{\n    return t_hit + miss_rate * penalty;\n}\n\n/* Две нива: наказанието на L1 е самото AMAT на L2. */\ndouble amat2(double h1, double m1, double h2, double m2, double mem)\n{\n    double l2 = amat(h2, m2, mem);\n    return amat(h1, m1, l2);\n}",
  "tags": {
   "amat": [
    3
   ],
   "l2": [
    9
   ],
   "l1": [
    10
   ]
  }
 },
 "ch07_io": {
  "file": "07_io.c",
  "code": "io_t simulate(int mode, int N, int gap, int copy, int isr, int setup,\n              int H, char *cpu, char *dev)\n{\n    io_t r = {0, 0, 0, 0, 0, 0};\n    int got = 0;               /* байтове в паметта */\n    int busy = 0, kind = C_WORK, want_copy = 0, setup_done = 0, irq = 0;\n    if (mode == 2) { kind = C_SETUP; busy = setup; }\n    for (int t = 0; t < H && t < TMAX; t++) {\n        int ready = got < N && t >= (got + 1) * gap;\n        dev[t] = (char)(t > 0 && t % gap == 0 && t / gap <= N ? D_READY : D_NONE); /* пристига байт */\n        if (busy == 0) {                                          /* CPU е свободен */\n            kind = C_WORK;\n            if (mode == 0 && got < N) {\n                if (want_copy) { kind = C_COPY; busy = copy; want_copy = 0; }\n                else { kind = C_POLL; busy = 1; r.polls++;\n                       want_copy = ready; }\n            } else if (mode == 1 && ready) {\n                kind = C_ISR; busy = isr + copy; r.irqs++;\n            } else if (mode == 2 && irq) {\n                kind = C_ISR; busy = isr; irq = 0; r.irqs++;\n            }\n        }\n        if (mode == 2 && setup_done && ready) {                   /* DMA пренася */\n            dev[t] = D_DMA; got++; r.copies++;\n            if (got == N) irq = 1;          /* прекъсване \"готово\" */\n        }\n        cpu[t] = (char)kind;\n        if (kind == C_WORK) r.useful++; else r.cpu_io++;\n        if (busy > 0 && --busy == 0) {                            /* край на действие */\n            if (kind == C_COPY || (kind == C_ISR && mode == 1)) { got++; r.copies++; }\n            if (kind == C_SETUP) setup_done = 1;\n            if (r.end == 0 && got == N && (mode != 2 || kind == C_ISR)) r.end = t + 1;\n        }\n    }\n    return r;\n}",
  "tags": {
   "setup": [
    7
   ],
   "tick": [
    8
   ],
   "ready": [
    9
   ],
   "pcopy": [
    14
   ],
   "poll": [
    15,
    16
   ],
   "irq": [
    18
   ],
   "dirq": [
    20
   ],
   "dma": [
    24,
    25
   ],
   "acct": [
    28
   ],
   "got": [
    30
   ],
   "done": [
    32
   ],
   "ret": [
    35
   ]
  }
 },
 "ch08_cpu_time": {
  "file": "08_perf.c",
  "code": "/* ic — брой инструкции; cpi — среден брой тактове; f_hz — тактова честота */\ndouble cpu_time(double ic, double cpi, double f_hz)\n{\n    double cycles = ic * cpi;            /* общо тактове */\n    double period = 1.0 / f_hz;          /* период на такта, s */\n    return cycles * period;\n}",
  "tags": {
   "cycles": [
    4
   ],
   "period": [
    5
   ],
   "time": [
    6
   ]
  }
 },
 "ch08_amdahl": {
  "file": "08_perf.c",
  "code": "/* f — паралелизируемата част от времето (0..1), p — брой еднакви изпълнители,\n   c — допълнителен разход на изпълнител (дял от T1); c = 0 -> чист Амдал. */\ndouble amdahl(double f, int p, double c)\n{\n    double serial = 1.0 - f;\n    double par = f / p;\n    double over = c * (p - 1);\n    return 1.0 / (serial + par + over);\n}",
  "tags": {
   "serial": [
    5
   ],
   "par": [
    6
   ],
   "over": [
    7
   ],
   "speed": [
    8
   ]
  }
 },
 "ch08_endian": {
  "file": "08_perf.c",
  "code": "/* Байтовете на 32-битова стойност по нарастващи адреси. */\nvoid to_bytes(uint32_t v, int big, uint8_t out[4])\n{\n    for (int i = 0; i < 4; i++) {\n        int shift = big ? 8 * (3 - i) : 8 * i;\n        out[i] = (uint8_t)(v >> shift);\n    }\n}\n\n/* Как подрежда байтовете тази машина: копираме паметта на uint32_t. */\nint host_is_little(void)\n{\n    uint32_t x = 0x01020304u;\n    uint8_t b[4];\n    memcpy(b, &x, 4);\n    return b[0] == 0x04;\n}",
  "tags": {
   "loop": [
    4
   ],
   "shift": [
    5
   ],
   "byte": [
    6
   ],
   "host": [
    15,
    16
   ]
  }
 }
};
