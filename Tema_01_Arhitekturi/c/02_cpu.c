/* Тема 1, раздел 2 — вътрешността на CPU.
 *   a) АЛУ: 8-битово събиране бит по бит (ripple carry) и флаговете C, V, Z, N;
 *      побитови операции, избирани с управляващ код.
 *   b) Учебен едноцикличен датапът за пет RV32I инструкции: ADD, ADDI, LW, SW, BEQ.
 *      Управляващото устройство (control) превръща opcode в управляващи сигнали.
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 02_cpu.c -o cpu && ./cpu
 *
 * Флаговете C/V/Z/N са УЧЕБЕН модел (както в ръководството). RV32I няма регистър
 * с такива флагове — там условията се проверяват със сравнения и разклонения.
 */
#include <stdio.h>
#include <stdint.h>

//#viz ch02_alu_add
/* 8-битово събиране "бит по бит" и флагове. */
typedef struct { uint8_t r; int c, v, z, n; } alu8_t;

alu8_t alu8_add(uint8_t a, uint8_t b)
{
    alu8_t o = {0, 0, 0, 0, 0};
    unsigned carry = 0, c_into_msb = 0;                 //@init
    for (int i = 0; i < 8; i++) {                       //@loop
        unsigned ai = (a >> i) & 1u, bi = (b >> i) & 1u;  //@bits
        unsigned s = ai ^ bi ^ carry;                   //@sum
        if (i == 7) c_into_msb = carry;                 //@msb
        carry = (ai & bi) | (ai & carry) | (bi & carry); //@carry
        o.r |= (uint8_t)(s << i);                       //@store
    }
    o.c = (int)carry;               /* пренос извън 8-те бита */   //@flagc
    o.v = (int)(c_into_msb ^ carry); /* знаково препълване     */  //@flagv
    o.z = (o.r == 0);                                   //@flagz
    o.n = (o.r >> 7) & 1;                               //@flagn
    return o;
}
//#end

//#viz ch02_alu_logic
/* Същите входове, друг управляващ код -> друг резултат. */
uint8_t alu8_logic(uint8_t a, uint8_t b, char op)
{
    switch (op) {                                       //@sel
    case '&': return (uint8_t)(a & b);                  //@and
    case '|': return (uint8_t)(a | b);                  //@or
    case '^': return (uint8_t)(a ^ b);                  //@xor
    default:  return 0;
    }
}
//#end

//#viz ch02_datapath
/* Управляващи сигнали на учебния едноцикличен датапът. */
typedef struct {
    int reg_write, alu_src, mem_read, mem_write, mem_to_reg, branch;
    char alu_op;                 /* '+' събиране, '-' изваждане (BEQ) */
} ctrl_t;

typedef struct { uint32_t pc, x[32]; uint8_t dmem[64]; } cpu_t;
#define DBASE 0x2000u            /* данните: 0x2000 .. 0x203F */
#define IBASE 0x1000u            /* инструкциите: от 0x1000 */

static ctrl_t control(uint32_t opcode)                 /* УУ */
{
    ctrl_t k = {0, 0, 0, 0, 0, 0, '+'};
    switch (opcode) {                                   //@dec
    case 0x33: k.reg_write = 1; break;                  /* ADD  */ //@c_r
    case 0x13: k.reg_write = 1; k.alu_src = 1; break;   /* ADDI */ //@c_i
    case 0x03: k.reg_write = 1; k.alu_src = 1;          /* LW   */ //@c_lw
               k.mem_read = 1; k.mem_to_reg = 1; break;            //@c_lw
    case 0x23: k.alu_src = 1; k.mem_write = 1; break;   /* SW   */ //@c_sw
    case 0x63: k.branch = 1; k.alu_op = '-'; break;     /* BEQ  */ //@c_b
    }
    return k;
}

static int32_t sext(uint32_t x, int bits)              /* знаково разширение */
{
    uint32_t m = 1u << (bits - 1);
    x &= (m << 1) - 1u;
    return (int32_t)((x ^ m) - m);
}

static int32_t imm_of(uint32_t ir)                      /* генератор на константата */
{
    switch (ir & 0x7f) {
    case 0x13: case 0x03: return sext(ir >> 20, 12);
    case 0x23: return sext(((ir >> 25) << 5) | ((ir >> 7) & 0x1f), 12);
    case 0x63: return sext(((ir >> 31) << 12) | (((ir >> 7) & 1u) << 11) |
                           (((ir >> 25) & 0x3f) << 5) | (((ir >> 8) & 0xf) << 1), 13);
    default:   return 0;
    }
}

static uint32_t mem_rd(const cpu_t *c, uint32_t a)      /* 32 бита, little endian */
{
    if (a < DBASE || a - DBASE > 64 - 4 || (a & 3)) return 0;
    const uint8_t *p = &c->dmem[a - DBASE];
    return p[0] | (uint32_t)p[1] << 8 | (uint32_t)p[2] << 16 | (uint32_t)p[3] << 24;
}

static void mem_wr(cpu_t *c, uint32_t a, uint32_t v)
{
    if (a < DBASE || a - DBASE > 64 - 4 || (a & 3)) return;
    for (int i = 0; i < 4; i++) c->dmem[a - DBASE + i] = (uint8_t)(v >> (8 * i));
}

/* Един такт на едноцикличния датапът = една инструкция. */
void cycle(cpu_t *c, const uint32_t *imem)
{
    uint32_t ir = imem[(c->pc - IBASE) / 4];            //@if
    ctrl_t k = control(ir & 0x7f);                      //@id
    uint32_t rd = (ir >> 7) & 31, rs1 = (ir >> 15) & 31, rs2 = (ir >> 20) & 31; //@id
    int32_t imm = imm_of(ir);                           //@imm
    uint32_t a = c->x[rs1], b = c->x[rs2];              //@rf
    uint32_t opb = k.alu_src ? (uint32_t)imm : b;       //@mux
    uint32_t y = k.alu_op == '+' ? a + opb : a - opb;   //@alu
    int zero = (y == 0);                                //@alu
    uint32_t mdata = 0;
    if (k.mem_read)  mdata = mem_rd(c, y);              //@mem
    if (k.mem_write) mem_wr(c, y, b);                   //@mem
    if (k.reg_write && rd != 0)                         //@wb
        c->x[rd] = k.mem_to_reg ? mdata : y;            //@wb
    c->pc = (k.branch && zero) ? c->pc + (uint32_t)imm : c->pc + 4; //@pc
}
//#end

#ifndef NO_MAIN
static void dp_run(const char *name, uint32_t ir, int32_t x1, int32_t x2, int32_t x5, int32_t m)
{
    cpu_t c = {0};
    c.pc = IBASE;
    c.x[1] = (uint32_t)x1; c.x[2] = (uint32_t)x2; c.x[4] = DBASE; c.x[5] = (uint32_t)x5;
    mem_wr(&c, DBASE + 4, (uint32_t)m);
    uint32_t imem[1] = {ir};
    cycle(&c, imem);
    printf("dp_%s(%d,%d,%d,%d) = pc=0x%X x3=%d x5=%d m=%d\n", name, x1, x2, x5, m,
           (unsigned)c.pc, (int32_t)c.x[3], (int32_t)c.x[5], (int32_t)mem_rd(&c, DBASE + 4));
}

int main(void)
{
    const int P[][2] = {{5, 3}, {255, 1}, {127, 1}, {200, 100}, {128, 128}, {0, 0}, {100, 27}};
    for (unsigned i = 0; i < sizeof P / sizeof P[0]; i++) {
        alu8_t o = alu8_add((uint8_t)P[i][0], (uint8_t)P[i][1]);
        printf("add(%d,%d) = %u C=%d V=%d Z=%d N=%d\n", P[i][0], P[i][1], o.r, o.c, o.v, o.z, o.n);
        printf("and(%d,%d) = %u\n", P[i][0], P[i][1], alu8_logic((uint8_t)P[i][0], (uint8_t)P[i][1], '&'));
        printf("or(%d,%d) = %u\n", P[i][0], P[i][1], alu8_logic((uint8_t)P[i][0], (uint8_t)P[i][1], '|'));
        printf("xor(%d,%d) = %u\n", P[i][0], P[i][1], alu8_logic((uint8_t)P[i][0], (uint8_t)P[i][1], '^'));
    }
    const struct { const char *n; uint32_t ir; } I[] = {
        {"add", 0x002081B3u},   /* ADD  x3, x1, x2  */
        {"addi", 0x00128293u},  /* ADDI x5, x5, 1   */
        {"lw", 0x00422283u},    /* LW   x5, 4(x4)   */
        {"sw", 0x00522223u},    /* SW   x5, 4(x4)   */
        {"beq", 0x00208863u},   /* BEQ  x1, x2, +16 */
    };
    const int32_t ST[][4] = {{5, 3, 43, 42}, {7, 7, -1, 100}, {-5, 2147483647, 0, -8}};
    for (unsigned s = 0; s < 3; s++)
        for (unsigned i = 0; i < 5; i++) dp_run(I[i].n, I[i].ir, ST[s][0], ST[s][1], ST[s][2], ST[s][3]);
    return 0;
}
#endif
