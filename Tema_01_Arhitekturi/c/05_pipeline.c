/* Тема 1, раздел 5 — учебен петстепенен конвейер IF ID EX MEM WB, такт по такт.
 *
 * Модел (условия, при които сметките са валидни):
 *   - всеки етап отнема 1 такт; конвейерът е в ред (in-order), по една инструкция на такт;
 *   - списъкът с инструкции е ДИНАМИЧНАТА последователност (реално изпълнените);
 *     за разклонение е зададено дали е взето (T) или не (N);
 *   - регистровият файл се записва в първата половина на такта и се чете във втората:
 *     WB и ID на зависима инструкция могат да са в един такт;
 *   - всички операнди (вкл. данните на STORE) са нужни в началото на EX;
 *   - разклонението се решава в края на EX;
 *   - препращане (forwarding): от EX/MEM и MEM/WB към входа на EX.
 *     LOAD дава стойността в края на MEM -> зависимата следваща инструкция чака 1 такт;
 *   - структурен конфликт (по избор): една обща памет за инструкции и данни —
 *     такт, в който LOAD/STORE е в MEM, не допуска извличане (IF).
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 05_pipeline.c -o pipe && ./pipe
 */
#include <stdio.h>
#include <string.h>

enum { K_ALU, K_LOAD, K_STORE, K_BR, K_NOP };
enum { S_IF, S_ID, S_EX, S_MEM, S_WB, NSTAGE };
#define MAXI 16
#define MAXCYC 128
#define WRONG (-2)          /* инструкция от погрешния път (ще бъде отхвърлена) */
#define EMPTY (-1)          /* мехурче (bubble) */

typedef struct { int kind, rd, rs, rt, taken; } pinstr_t;  /* rd = 0: не пише */
typedef struct { int cycles, data_stalls, struct_stalls, flushed, branch_stalls; } pstats_t;

//#viz ch05_pipe
/* Стадиите на текущия такт: индекс на инструкция, EMPTY или WRONG. */
static int writes(const pinstr_t *p, int x, int r)
{
    return x >= 0 && r != 0 && p[x].rd == r && p[x].kind != K_STORE && p[x].kind != K_BR;
}

/* 1, ако инструкцията в ID трябва да чака (зависимост по данни). */
static int hazard(const pinstr_t *p, const int st[NSTAGE], int fwd)
{
    int i = st[S_ID];
    if (i < 0) return 0;
    int src[2] = {p[i].rs, p[i].rt};
    for (int k = 0; k < 2; k++) {
        int r = src[k];
        if (r == 0) continue;
        if (writes(p, st[S_EX], r)) {                   /* най-младият производител */
            if (!fwd || p[st[S_EX]].kind == K_LOAD)     //@haz_ex
                return 1;
        } else if (writes(p, st[S_MEM], r) && !fwd) {   //@haz_mem
            return 1;
        }
    }
    return 0;
}

int pipeline(const pinstr_t *p, int n, int fwd, int predict, int unified,
             int diag[MAXI][MAXCYC], pstats_t *s)
{
    int st[NSTAGE] = {EMPTY, EMPTY, EMPTY, EMPTY, EMPTY};
    int next = 0, retired = 0, cyc = 0;
    memset(s, 0, sizeof *s);
    for (int i = 0; i < n; i++) for (int c = 0; c < MAXCYC; c++) diag[i][c] = -1;
    while (retired < n && cyc < MAXCYC) {
        /* --- преход от такт cyc към cyc+1 (първият такт е 1) --- */
        int nx[NSTAGE];
        nx[S_WB] = st[S_MEM];                                   //@adv
        nx[S_MEM] = st[S_EX];                                   //@adv
        int flush = st[S_EX] >= 0 && p[st[S_EX]].kind == K_BR && p[st[S_EX]].taken && predict; //@flush
        int stall = !flush && hazard(p, st, fwd);               //@hazard
        int hold_if = 0;
        if (flush) {                                            /* погрешният път се отхвърля */
            s->flushed += (st[S_ID] == WRONG) + (st[S_IF] == WRONG); //@flush
            nx[S_EX] = EMPTY; nx[S_ID] = EMPTY; nx[S_IF] = EMPTY;
            next = st[S_EX] + 1;
        } else if (stall) {                                     /* мехурче в EX */
            s->data_stalls++;                                   //@stall
            nx[S_EX] = EMPTY; nx[S_ID] = st[S_ID]; nx[S_IF] = st[S_IF];
            hold_if = 1;
        } else {
            nx[S_EX] = st[S_ID]; nx[S_ID] = st[S_IF]; nx[S_IF] = EMPTY; //@move
        }
        if (!hold_if) {                                         /* извличане (IF) */
            int last = next - 1;                                /* последно извлечената */
            int br_open = 0;
            for (int k = S_ID; k <= S_EX; k++)
                if (nx[k] >= 0 && p[nx[k]].kind == K_BR) br_open = 1;
            int port_busy = unified && nx[S_MEM] >= 0 &&
                            (p[nx[S_MEM]].kind == K_LOAD || p[nx[S_MEM]].kind == K_STORE);
            if (!predict && br_open) {
                s->branch_stalls++;                             //@brstall
            } else if (port_busy && (next < n || (predict && last >= 0 && p[last].kind == K_BR && p[last].taken && br_open))) {
                s->struct_stalls++;                             //@struct
            } else if (predict && last >= 0 && p[last].kind == K_BR && p[last].taken && br_open) {
                nx[S_IF] = WRONG;            /* предсказано "не е взето" */ //@wrong
            } else if (next < n) {
                nx[S_IF] = next++;                              //@fetch
            }
        }
        if (nx[S_WB] >= 0) retired++;
        memcpy(st, nx, sizeof st);
        cyc++;
        for (int k = 0; k < NSTAGE; k++) if (st[k] >= 0) diag[st[k]][cyc] = k; //@diag
    }
    s->cycles = cyc;
    return cyc;                                                 //@ret
}
//#end

#ifndef NO_MAIN
/* Разбор на кратък запис: "L1,2 A3,1,4 S0,3,1 B1,2,T N" —
   A rd,rs,rt (ALU)  L rd,rs (LOAD rd,[rs])  S rs,rt (STORE [rs],rt)  B rs,rt,T|N  N (NOP) */
static int parse(const char *src, pinstr_t *p)
{
    int n = 0;
    char buf[256]; snprintf(buf, sizeof buf, "%s", src);
    for (char *t = strtok(buf, " "); t && n < MAXI; t = strtok(NULL, " ")) {
        pinstr_t I = {K_NOP, 0, 0, 0, 0};
        int a = 0, b = 0, c = 0; char tk = 'N';
        switch (t[0]) {
        case 'A': sscanf(t + 1, "%d,%d,%d", &a, &b, &c); I.kind = K_ALU; I.rd = a; I.rs = b; I.rt = c; break;
        case 'L': sscanf(t + 1, "%d,%d", &a, &b); I.kind = K_LOAD; I.rd = a; I.rs = b; break;
        case 'S': sscanf(t + 1, "%d,%d", &a, &b); I.kind = K_STORE; I.rs = a; I.rt = b; break;
        case 'B': sscanf(t + 1, "%d,%d,%c", &a, &b, &tk); I.kind = K_BR; I.rs = a; I.rt = b; I.taken = tk == 'T'; break;
        default: break;
        }
        p[n++] = I;
    }
    return n;
}

int main(void)
{
    static const char *const PROGS[] = {
        "A1,2,3 A4,5,6 A7,8,9",                          /* без зависимости */
        "L1,2 A3,1,4",                                   /* LOAD -> ADD (ръководството) */
        "A1,2,3 A4,1,5 A6,1,7 A8,1,9",                   /* RAW верига от ALU */
        "L1,2 A3,1,4 A5,3,1 S6,5",                       /* смесено */
        "A1,2,3 B1,4,T A5,6,7 A8,5,9",                   /* взето разклонение */
        "A1,2,3 B1,4,N A5,6,7 A8,5,9",                   /* невзето разклонение */
        "L1,2 L3,4 A5,1,3 S6,5 A7,8,9",                  /* за структурния конфликт */
        "A1,0,0 A2,0,0 A3,0,0 A4,0,0 A5,0,0 A6,0,0 A7,0,0 A1,0,0 A2,0,0 A3,0,0", /* n = 10 */
        "A1,2,3 A4,5,1",                                 /* второ поле зависимо */
    };
    static int diag[MAXI][MAXCYC];
    for (unsigned q = 0; q < sizeof PROGS / sizeof PROGS[0]; q++) {
        pinstr_t p[MAXI];
        int n = parse(PROGS[q], p);
        for (int mode = 0; mode < 8; mode++) {
            int fwd = mode & 1, pred = (mode >> 1) & 1, uni = (mode >> 2) & 1;
            pstats_t s;
            pipeline(p, n, fwd, pred, uni, diag, &s);
            printf("pipe(%u,%d%d%d) = %d %d %d %d %d |", q, fwd, pred, uni,
                   s.cycles, s.data_stalls, s.struct_stalls, s.branch_stalls, s.flushed);
            for (int i = 0; i < n; i++) {           /* такт на WB за всяка инструкция */
                int w = -1;
                for (int c = 0; c < MAXCYC; c++) if (diag[i][c] == S_WB) w = c;
                printf(" %d", w);
            }
            printf("\n");
        }
    }
    return 0;
}
#endif
