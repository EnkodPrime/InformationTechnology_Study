/* Тема 1, раздел 4 — система от инструкции: асемблер и интерпретатор на учебна ISA.
 *
 * Учебната ISA (не е реален процесор; синтаксисът следва примерите от ръководството):
 *   8 регистъра R0..R7 (32 бита, със знак); R0 винаги е 0 (както x0 в RISC-V).
 *   Данни: 32 думи mem[0..31], адресирани по ДУМИ (адрес = номер на дума).
 *   Програмата е в отделна памет за инструкции; PC е номер на инструкция и при
 *   последователно изпълнение нараства с 1 (в RV32I PC е байтов адрес и расте с 4).
 *
 *   LI   Rd, #imm          непосредствен операнд           Rd <- imm
 *   MOV  Rd, Rs            регистров операнд                Rd <- Rs
 *   ADD  Rd, Rs, Rt        регистров                        Rd <- Rs + Rt
 *   SUB  Rd, Rs, Rt                                         Rd <- Rs - Rt
 *   SLT  Rd, Rs, Rt        сравнение                        Rd <- (Rs < Rt) ? 1 : 0
 *   ADDI Rd, Rs, #imm      регистров + непосредствен        Rd <- Rs + imm
 *   LOAD Rd, [addr]        пряко (абсолютно)                Rd <- mem[addr]
 *   LOAD Rd, [Rs]          непряко (регистрово-косвено)     Rd <- mem[Rs]
 *   LOAD Rd, [Rs+off]      базово с отместване              Rd <- mem[Rs + off]
 *   STORE [...], Rd        същите режими                    mem[EA] <- Rd
 *   BEQ / BNE Rs, Rt, етикет   условно разклонение          if (...) PC <- етикет
 *   JMP  етикет            безусловен преход                PC <- етикет
 *   NOP, HALT
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 04_isa.c -o isa && ./isa
 */
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

enum { OP_LI, OP_MOV, OP_ADD, OP_SUB, OP_SLT, OP_ADDI, OP_LOAD, OP_STORE,
       OP_BEQ, OP_BNE, OP_JMP, OP_NOP, OP_HALT, OP_COUNT };
static const char *const MN[OP_COUNT] = {"LI", "MOV", "ADD", "SUB", "SLT", "ADDI", "LOAD",
                                         "STORE", "BEQ", "BNE", "JMP", "NOP", "HALT"};
#define NREG 8
#define NMEM 32
#define NPROG 64
#define NO_BASE (-1)

//#viz ch04_cpu
typedef struct { int op, rd, rs, rt, imm; } instr_t;  /* rs == NO_BASE: пряк адрес */
typedef struct { int pc; int r[NREG]; int mem[NMEM]; const instr_t *imem; int n; } cpu_t;

static void wr(cpu_t *c, int rd, int v) { if (rd != 0) c->r[rd] = v; } /* R0 = 0 */

/* Изпълнява една инструкция. Връща 1 — продължава, 0 — HALT, -1 — грешка. */
int step(cpu_t *c)
{
    if (c->pc < 0 || c->pc >= c->n) return -1;          /* PC извън програмата */
    instr_t ir = c->imem[c->pc];                        //@fetch
    c->pc = c->pc + 1;                  /* следваща по ред */ //@fetch
    int ea;
    switch (ir.op) {                                    //@decode
    case OP_LI:   wr(c, ir.rd, ir.imm); break;          //@li
    case OP_MOV:  wr(c, ir.rd, c->r[ir.rs]); break;     //@mov
    case OP_ADD:  wr(c, ir.rd, c->r[ir.rs] + c->r[ir.rt]); break;  //@add
    case OP_SUB:  wr(c, ir.rd, c->r[ir.rs] - c->r[ir.rt]); break;  //@sub
    case OP_SLT:  wr(c, ir.rd, c->r[ir.rs] < c->r[ir.rt]); break;  //@slt
    case OP_ADDI: wr(c, ir.rd, c->r[ir.rs] + ir.imm); break;       //@addi
    case OP_LOAD:
    case OP_STORE:
        ea = (ir.rs == NO_BASE ? 0 : c->r[ir.rs]) + ir.imm;  /* ефективен адрес */ //@ea
        if (ea < 0 || ea >= NMEM) return -1;                 //@ea
        if (ir.op == OP_LOAD) wr(c, ir.rd, c->mem[ea]);      //@load
        else                  c->mem[ea] = c->r[ir.rd];      //@store
        break;
    case OP_BEQ:  if (c->r[ir.rs] == c->r[ir.rt]) c->pc = ir.imm; break; //@beq
    case OP_BNE:  if (c->r[ir.rs] != c->r[ir.rt]) c->pc = ir.imm; break; //@bne
    case OP_JMP:  c->pc = ir.imm; break;                //@jmp
    case OP_NOP:  break;                                //@nop
    case OP_HALT: return 0;                             //@halt
    }
    return 1;                                           //@next
}
//#end

/* ---------------- асемблер (не се показва във визуализацията) ---------------- */
typedef struct { char name[16]; int addr; } label_t;

static char *trim(char *s)
{
    while (isspace((unsigned char)*s)) s++;
    char *e = s + strlen(s);
    while (e > s && isspace((unsigned char)e[-1])) *--e = 0;
    return s;
}

static int parse_reg(const char *s)
{
    if ((s[0] == 'R' || s[0] == 'r') && s[1] >= '0' && s[1] < '0' + NREG && s[2] == 0) return s[1] - '0';
    return -1;
}

/* [n] [Rs] [Rs+n] [Rs-n] -> rs, off */
static int parse_mem(const char *s, int *rs, int *off)
{
    char buf[32];
    size_t n = strlen(s);
    if (n < 3 || s[0] != '[' || s[n - 1] != ']' || n - 2 >= sizeof buf) return 0;
    memcpy(buf, s + 1, n - 2); buf[n - 2] = 0;
    char *p = trim(buf);
    if (p[0] == 'R' || p[0] == 'r') {
        char reg[3] = {p[0], p[1], 0};
        *rs = parse_reg(reg);
        if (*rs < 0) return 0;
        p = trim(p + 2);
        *off = 0;
        if (*p == 0) return 1;
        if (*p != '+' && *p != '-') return 0;
        int sign = *p == '-' ? -1 : 1;
        char *e; long v = strtol(trim(p + 1), &e, 10);
        if (*e) return 0;
        *off = sign * (int)v;
        return 1;
    }
    char *e; long v = strtol(p, &e, 10);
    if (*e || e == p) return 0;
    *rs = NO_BASE; *off = (int)v;
    return 1;
}

static int find_label(const label_t *L, int nl, const char *s)
{
    for (int i = 0; i < nl; i++) if (strcmp(L[i].name, s) == 0) return L[i].addr;
    return -1;
}

/* Връща броя инструкции или -1 при грешка. Редовете са разделени с '\n' или '|'. */
int assemble(const char *src, instr_t *out)
{
    char text[2048], *lines[NPROG * 2];
    label_t L[NPROG]; int nl = 0, nlines = 0, n = 0;
    if (strlen(src) >= sizeof text) return -1;
    strcpy(text, src);
    for (char *p = strtok(text, "\n|"); p && nlines < NPROG * 2; p = strtok(NULL, "\n|")) lines[nlines++] = p;
    /* проход 1: етикети */
    for (int pass = 0; pass < 2; pass++) {
        n = 0;
        for (int li = 0; li < nlines; li++) {
            char line[128];
            strncpy(line, lines[li], sizeof line - 1); line[sizeof line - 1] = 0;
            char *c = strchr(line, ';'); if (c) *c = 0;
            char *s = trim(line);
            char *colon = strchr(s, ':');
            if (colon) {
                *colon = 0;
                if (pass == 0) { if (nl >= NPROG) return -1; snprintf(L[nl].name, sizeof L[nl].name, "%s", trim(s)); L[nl++].addr = n; }
                s = trim(colon + 1);
            }
            if (!*s) continue;
            if (n >= NPROG) return -1;
            if (pass == 0) { n++; continue; }
            char mn[8] = {0}; int k = 0;
            while (*s && !isspace((unsigned char)*s) && k < 7) mn[k++] = (char)toupper((unsigned char)*s++);
            char *ops[3] = {0}; int no = 0;
            for (char *t = strtok(trim(s), ","); t && no < 3; t = strtok(NULL, ",")) ops[no++] = trim(t);
            instr_t I = {-1, 0, 0, 0, 0};
            for (int o = 0; o < OP_COUNT; o++) if (strcmp(mn, MN[o]) == 0) I.op = o;
            int bad = 0;
            switch (I.op) {
            case OP_LI:
                bad = no != 2 || ops[1][0] != '#';
                if (!bad) { I.rd = parse_reg(ops[0]); I.imm = atoi(ops[1] + 1); }
                break;
            case OP_MOV:
                bad = no != 2;
                if (!bad) { I.rd = parse_reg(ops[0]); I.rs = parse_reg(ops[1]); bad = I.rs < 0; }
                break;
            case OP_ADD: case OP_SUB: case OP_SLT:
                bad = no != 3;
                if (!bad) {
                    I.rd = parse_reg(ops[0]); I.rs = parse_reg(ops[1]); I.rt = parse_reg(ops[2]);
                    bad = I.rs < 0 || I.rt < 0;
                }
                break;
            case OP_ADDI:
                bad = no != 3 || ops[2][0] != '#';
                if (!bad) { I.rd = parse_reg(ops[0]); I.rs = parse_reg(ops[1]); I.imm = atoi(ops[2] + 1); bad = I.rs < 0; }
                break;
            case OP_LOAD:
                bad = no != 2;
                if (!bad) { I.rd = parse_reg(ops[0]); bad = !parse_mem(ops[1], &I.rs, &I.imm); }
                break;
            case OP_STORE:
                bad = no != 2;
                if (!bad) { I.rd = parse_reg(ops[1]); bad = !parse_mem(ops[0], &I.rs, &I.imm); }
                break;
            case OP_BEQ: case OP_BNE:
                bad = no != 3;
                if (!bad) {
                    I.rs = parse_reg(ops[0]); I.rt = parse_reg(ops[1]); I.imm = find_label(L, nl, ops[2]);
                    bad = I.rs < 0 || I.rt < 0 || I.imm < 0;
                }
                break;
            case OP_JMP:
                bad = no != 1;
                if (!bad) { I.imm = find_label(L, nl, ops[0]); bad = I.imm < 0; }
                break;
            case OP_NOP: case OP_HALT: break;
            default: bad = 1;
            }
            if (bad) return -1;
            if (I.rd < 0) return -1;
            out[n++] = I;
        }
    }
    return n;
}

#ifndef NO_MAIN
static void report(const char *name, const char *src, const char *meminit)
{
    instr_t prog[NPROG];
    cpu_t c = {0};
    int n = assemble(src, prog);
    if (n < 0) { printf("%s = asm-error\n", name); return; }
    c.imem = prog; c.n = n;
    char buf[256]; snprintf(buf, sizeof buf, "%s", meminit);
    for (char *t = strtok(buf, " "); t; t = strtok(NULL, " ")) {
        int a, v;
        if (sscanf(t, "%d:%d", &a, &v) == 2 && a >= 0 && a < NMEM) c.mem[a] = v;
    }
    int steps = 0, s;
    do { s = step(&c); steps++; } while (s == 1 && steps < 500);
    printf("%s = %d %d pc=%d |", name, s, steps, c.pc);
    for (int i = 0; i < NREG; i++) printf(" %d", c.r[i]);
    printf(" |");
    for (int i = 0; i < NMEM; i++) printf(" %d", c.mem[i]);
    printf("\n");
}

/* Същите програми като бутоните във визуализацията (виж tests/ch04.test.js). */
int main(void)
{
    report("isa_sum", "LOAD R1, [0]|LOAD R2, [1]|ADD R3, R1, R2|STORE [2], R3|HALT", "0:7 1:5");
    report("isa_modes", "LI R2, #10|MOV R3, R2|LOAD R4, [R2]|LOAD R5, [R2+4]|LOAD R6, [10]|ADDI R7, R2, #5|HALT", "10:7 14:3");
    report("isa_lms", "LI R4, #0|LOAD R5, [R4+1]|ADDI R5, R5, #1|STORE [R4+1], R5|HALT", "1:42");
    report("isa_array", "LI R1, #0|LI R2, #0|LI R3, #5|loop: LOAD R4, [R1]|ADD R2, R2, R4|ADDI R1, R1, #1|BNE R1, R3, loop|STORE [8], R2|HALT",
           "0:4 1:8 2:15 3:16 4:23");
    report("isa_max", "LOAD R2, [0]|LI R1, #1|LI R6, #6|loop: BEQ R1, R6, end|LOAD R3, [R1]|SLT R4, R2, R3|BEQ R4, R0, skip|MOV R2, R3|skip: ADDI R1, R1, #1|JMP loop|end: STORE [9], R2|HALT",
           "0:3 1:9 2:4 3:12 4:1 5:6");
    report("isa_r0", "LI R0, #5|ADDI R1, R0, #2|HALT", "");
    report("isa_bad", "LI R1, #40|LOAD R2, [R1]|HALT", "");
    report("isa_inf", "top: JMP top", "");
    return 0;
}
#endif
