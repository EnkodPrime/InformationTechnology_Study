/* Тема 2, раздел 5 — взаимно блокиране: граф на изчакване и алгоритъм на банкера.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 05_deadlock.c -o 05_deadlock && ./05_deadlock
 */
#include <stdio.h>
#include <string.h>

#define MAXP 6
#define MAXR 4

/* ---------------- 1. граф „ресурси–процеси“ с единични ресурси ----------------
 * hold[r] = процес, който държи ресурс r (-1 = свободен)
 * want[p] = ресурс, който процес p чака (-1 = нищо)
 * Ребро p -> q в графа на изчакване: p чака ресурс, държан от q.
 * При единични екземпляри цикъл <=> взаимно блокиране.
 */
//#viz s05_cycle
static int waits_for(const int *hold, const int *want, int p)
{
    return want[p] >= 0 ? hold[want[p]] : -1;          //@edge
}

/* Връща дължината на цикъла, намерен от p, или 0. */
static int find_cycle(const int *hold, const int *want, int n, int p, int *cyc)
{
    int seen[MAXP];
    memset(seen, -1, sizeof seen);
    int len = 0;
    while (p >= 0 && seen[p] < 0) {                    //@walk
        seen[p] = len;
        cyc[len++] = p;
        p = waits_for(hold, want, p);                   //@next
    }
    if (p < 0) return 0;                                //@nocycle
    int start = seen[p];                                //@cycle
    memmove(cyc, cyc + start, (size_t)(len - start) * sizeof *cyc);
    (void)n;
    return len - start;
}
//#end

/* ---------------- 2. алгоритъм на банкера ---------------- */
typedef struct {
    int n, m;
    int avail[MAXR];
    int max[MAXP][MAXR];
    int alloc[MAXP][MAXR];
} Bank;

//#viz s05_banker
/* Безопасно ли е състоянието? order[] получава безопасната последователност. */
static int is_safe(const Bank *b, int *order)
{
    int work[MAXR], finish[MAXP] = {0}, k = 0;
    memcpy(work, b->avail, sizeof work);                 //@init
    for (int found = 1; found;) {
        found = 0;
        for (int i = 0; i < b->n; i++) {
            if (finish[i]) continue;
            int ok = 1;
            for (int j = 0; j < b->m; j++)               //@need
                if (b->max[i][j] - b->alloc[i][j] > work[j]) { ok = 0; break; }
            if (!ok) continue;                           //@skip
            for (int j = 0; j < b->m; j++)
                work[j] += b->alloc[i][j];               //@release
            finish[i] = 1;
            order[k++] = i;
            found = 1;
        }
    }
    return k == b->n;                                    //@verdict
}

/* Заявка от процес p: 1 = удовлетворена, 0 = трябва да чака, -1 = грешка */
static int request(Bank *b, int p, const int *req)
{
    int order[MAXP];
    for (int j = 0; j < b->m; j++)
        if (req[j] > b->max[p][j] - b->alloc[p][j]) return -1;   //@rq_err
    for (int j = 0; j < b->m; j++)
        if (req[j] > b->avail[j]) return 0;                      //@rq_avail
    Bank t = *b;                                  /* пробно разпределение */
    for (int j = 0; j < b->m; j++) {
        t.avail[j] -= req[j];                                    //@rq_try
        t.alloc[p][j] += req[j];
    }
    if (!is_safe(&t, order)) return 0;                           //@rq_unsafe
    *b = t;                                                      //@rq_grant
    return 1;
}
//#end

static void print_cycle(const char *name, const int *hold, const int *want, int n)
{
    int best = 0, cyc[MAXP], out[MAXP];
    for (int p = 0; p < n && !best; p++) {
        int l = find_cycle(hold, want, n, p, cyc);
        if (l) { best = l; memcpy(out, cyc, sizeof cyc); }
    }
    printf("%s.cycle = ", name);
    if (!best) printf("-");
    for (int i = 0; i < best; i++) printf("%sP%d", i ? "," : "", out[i] + 1);
    printf("\n");
}

static void print_safe(const char *name, const Bank *b)
{
    int order[MAXP];
    int s = is_safe(b, order);
    printf("%s.safe = %d\n", name, s);
    printf("%s.order = ", name);
    if (!s) printf("-");
    else for (int i = 0; i < b->n; i++) printf("%sP%d", i ? "," : "", order[i]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    /* Схема 11: A държи R1 и чака R2; B държи R2 и чака R1 */
    int h1[] = {0, 1}, w1[] = {1, 0};
    print_cycle("g1", h1, w1, 2);
    /* верига без цикъл: P1 чака R2 (държан от P2), P2 чака R3 (свободен) */
    int h2[] = {0, 1, -1}, w2[] = {1, 2, -1};
    print_cycle("g2", h2, w2, 3);
    /* цикъл от трима: P1->P2->P3->P1, P4 чака P1 (не е в цикъла) */
    int h3[] = {0, 1, 2, 3}, w3[] = {1, 2, 0, 0};
    print_cycle("g3", h3, w3, 4);

    /* класически пример: 5 процеса, 3 вида ресурси (общо 10 5 7) */
    Bank b = {5, 3, {3, 3, 2},
              {{7, 5, 3}, {3, 2, 2}, {9, 0, 2}, {2, 2, 2}, {4, 3, 3}},
              {{0, 1, 0}, {2, 0, 0}, {3, 0, 2}, {2, 1, 1}, {0, 0, 2}}};
    print_safe("b0", &b);
    int r1[] = {1, 0, 2};
    Bank b1 = b;
    printf("b1.req = %d\n", request(&b1, 1, r1));
    print_safe("b1", &b1);
    int r2[] = {0, 2, 0};
    Bank b2 = b1;
    printf("b2.req = %d\n", request(&b2, 0, r2));
    int r3[] = {3, 3, 0};
    Bank b3 = b1;
    printf("b3.req = %d\n", request(&b3, 4, r3));
    int r4[] = {8, 0, 0};
    Bank b4 = b;
    printf("b4.req = %d\n", request(&b4, 0, r4));
    return 0;
}
#endif
