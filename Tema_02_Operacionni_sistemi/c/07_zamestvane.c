/* Тема 2, раздел 7 — непрекъснато разпределение и заместване на страници.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 07_zamestvane.c -o 07_zamestvane && ./07_zamestvane
 */
#include <stdio.h>
#include <string.h>

/* ---------------- 1. непрекъснато разпределение ----------------
 * Паметта е списък от блокове {start, size, owner}; owner = 0 — дупка.
 * Заявка "+N" — разпредели N единици на нов процес; "-K" — освободи процес K.
 * Политики: first fit, best fit, worst fit. Съседни дупки се сливат.
 */
#define MAXB 64
enum { FIRST, BEST, WORST };

typedef struct { int start, size, owner; } Block;
typedef struct { Block b[MAXB]; int n, next_id, failed; } Mem;

//#viz s07_fit
static int choose(const Mem *m, int need, int pol)
{
    int pick = -1;
    for (int i = 0; i < m->n; i++) {
        if (m->b[i].owner || m->b[i].size < need) continue;    //@scan
        if (pick < 0) { pick = i; if (pol == FIRST) break; continue; }  //@first
        if (pol == BEST  && m->b[i].size < m->b[pick].size) pick = i;   //@best
        if (pol == WORST && m->b[i].size > m->b[pick].size) pick = i;   //@worst
    }
    return pick;
}

static int alloc(Mem *m, int need, int pol)
{
    int i = choose(m, need, pol);
    if (i < 0) { m->failed++; return -1; }                     //@fail
    int id = ++m->next_id;
    if (m->b[i].size > need) {                                 /* разделяне */
        memmove(&m->b[i + 2], &m->b[i + 1], (size_t)(m->n - i - 1) * sizeof(Block));
        m->b[i + 1] = (Block){m->b[i].start + need, m->b[i].size - need, 0};  //@split
        m->n++;
    }
    m->b[i].size = need;
    m->b[i].owner = id;                                        //@take
    return id;
}

static void release(Mem *m, int id)
{
    for (int i = 0; i < m->n; i++) {
        if (m->b[i].owner != id) continue;
        m->b[i].owner = 0;                                     //@free
        if (i + 1 < m->n && !m->b[i + 1].owner) {              /* сливане надясно */
            m->b[i].size += m->b[i + 1].size;                  //@merge
            memmove(&m->b[i + 1], &m->b[i + 2], (size_t)(m->n - i - 2) * sizeof(Block));
            m->n--;
        }
        if (i > 0 && !m->b[i - 1].owner) {                     /* сливане наляво */
            m->b[i - 1].size += m->b[i].size;                  //@merge
            memmove(&m->b[i], &m->b[i + 1], (size_t)(m->n - i - 1) * sizeof(Block));
            m->n--;
        }
        return;
    }
}
//#end

static void fit_run(const char *name, int total, const char *ops, int pol)
{
    Mem m = {{{0, total, 0}}, 1, 0, 0};
    for (const char *p = ops; *p;) {
        while (*p == ' ') p++;
        if (!*p) break;
        char op = *p++;
        int v = 0;
        while (*p >= '0' && *p <= '9') v = v * 10 + (*p++ - '0');
        if (op == '+') alloc(&m, v, pol);
        else if (op == '-') release(&m, v);
    }
    int free_total = 0, largest = 0, holes = 0;
    for (int i = 0; i < m.n; i++)
        if (!m.b[i].owner) { free_total += m.b[i].size; holes++; if (m.b[i].size > largest) largest = m.b[i].size; }
    printf("%s.failed = %d\n%s.free = %d\n%s.largest = %d\n%s.holes = %d\n", name, m.failed, name, free_total, name, largest, name, holes);
    printf("%s.layout = ", name);
    for (int i = 0; i < m.n; i++) printf("%s%d:%d", i ? " " : "", m.b[i].owner, m.b[i].size);
    printf("\n");
}

/* ---------------- 2. заместване на страници ---------------- */
#define MAXF 8
#define MAXREF 64
enum { R_FIFO, R_LRU, R_OPT, R_CLOCK };

//#viz s07_replace
static int replace(int pol, const int *ref, int n, int nf, int *victims)
{
    int frame[MAXF], loaded[MAXF], used[MAXF], refbit[MAXF];
    int cnt = 0, faults = 0, hand = 0;
    for (int t = 0; t < n; t++) {
        int p = ref[t], hit = -1;
        victims[t] = -1;
        for (int i = 0; i < cnt; i++) if (frame[i] == p) hit = i;  //@look
        if (hit >= 0) {                                       //@hit
            used[hit] = t;
            refbit[hit] = 1;
            continue;
        }
        faults++;                                             //@fault
        int v, evict = 1;
        if (cnt < nf) { v = cnt++; evict = 0; }               //@freeframe
        else if (pol == R_FIFO) {                             /* най-рано заредена */
            v = 0;
            for (int i = 1; i < nf; i++) if (loaded[i] < loaded[v]) v = i;  //@fifo
        } else if (pol == R_LRU) {                            /* най-отдавна ползвана */
            v = 0;
            for (int i = 1; i < nf; i++) if (used[i] < used[v]) v = i;      //@lru
        } else if (pol == R_OPT) {                            /* най-далечно бъдещо ползване */
            int far = -1; v = 0;
            for (int i = 0; i < nf; i++) {
                int nx = n;                                   /* n = никога повече */
                for (int k = t + 1; k < n; k++) if (ref[k] == frame[i]) { nx = k; break; }
                if (nx > far) { far = nx; v = i; }            //@opt
            }
        } else {                                              /* Clock: втори шанс */
            while (refbit[hand]) {                            //@clock
                refbit[hand] = 0;
                hand = (hand + 1) % nf;
            }
            v = hand;
            hand = (hand + 1) % nf;
        }
        if (evict) victims[t] = frame[v];                    /* жертва */
        frame[v] = p;                                         //@load
        loaded[v] = t;
        used[v] = t;
        refbit[v] = 1;
    }
    return faults;
}
//#end

static int parse_refs(const char *s, int *ref)
{
    int n = 0;
    while (*s && n < MAXREF) {
        while (*s == ' ') s++;
        if (!*s) break;
        int v = 0;
        while (*s >= '0' && *s <= '9') v = v * 10 + (*s++ - '0');
        ref[n++] = v;
    }
    return n;
}

static void rep_run(const char *name, const char *refs, int nf, int pol)
{
    int ref[MAXREF], vic[MAXREF];
    int n = parse_refs(refs, ref);
    int f = replace(pol, ref, n, nf, vic);
    printf("%s.faults = %d\n%s.victims = ", name, f, name);
    int first = 1;
    for (int i = 0; i < n; i++) if (vic[i] >= 0) { printf("%s%d", first ? "" : ",", vic[i]); first = 0; }
    if (first) printf("-");
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    const char *ops = "+12 +6 +10 +8 -1 -3 +5 +9 +4";
    fit_run("first", 40, ops, FIRST);
    fit_run("best", 40, ops, BEST);
    fit_run("worst", 40, ops, WORST);
    fit_run("hole", 10, "+2 +3 +3 +2 -1 -3 +4", FIRST);   /* дупки 2 и 3, искане 4 */

    const char *pn[] = {"fifo", "lru", "opt", "clock"};
    for (int p = 0; p < 4; p++) {
        char nm[32];
        snprintf(nm, sizeof nm, "man.%s", pn[p]);
        rep_run(nm, "1 2 3 1 4", 3, p);                   /* Схема 18 */
        snprintf(nm, sizeof nm, "std.%s", pn[p]);
        rep_run(nm, "7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1", 3, p);
    }
    rep_run("belady3", "1 2 3 4 1 2 5 1 2 3 4 5", 3, R_FIFO);
    rep_run("belady4", "1 2 3 4 1 2 5 1 2 3 4 5", 4, R_FIFO);
    rep_run("lru3", "1 2 3 4 1 2 5 1 2 3 4 5", 3, R_LRU);
    rep_run("lru4", "1 2 3 4 1 2 5 1 2 3 4 5", 4, R_LRU);
    rep_run("hits.clock", "1 1 1 2 3 4 1 5", 3, R_CLOCK);
    rep_run("hits.opt", "1 1 1 2 3 4 1 5", 3, R_OPT);
    return 0;
}
#endif
