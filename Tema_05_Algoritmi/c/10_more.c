/* Тема 5, раздел 10 — допълнителни парадигми и техники (разширение на конспекта).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 10_more.c -o 10_more -lm && ./10_more
 *
 * Регионите //#viz ... //#end се показват във визуализацията;
 * маркерите //@етикет казват кой ред да се подсвети на дадена стъпка.
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <limits.h>

#define MAXN 8   /* N дами */
#define MAXC 6   /* градове за TSP */

/* ================= a) Връщане назад: N дами ================= */
//#viz ch10_queens
/* N дами: col[r] = колоната на дамата в ред r. */
static int N, col[MAXN];
static long placed, pruned, solutions;
static int first_only, stop;

/* Ред на дамата, която атакува клетка (row, c), или -1. */
static int attacker(int row, int c)
{
    for (int r = 0; r < row; r++)
        if (col[r] == c || abs(col[r] - c) == row - r)
            return r;            /* същата колона или диагонал */
    return -1;
}

static void place(int row)
{                                                    //@enter
    if (row == N) {                                  //@sol
        solutions++;                                 //@sol
        if (first_only) stop = 1;
        return;
    }
    for (int c = 0; c < N && !stop; c++) {           //@try
        if (attacker(row, c) >= 0) {                 //@conflict
            pruned++;      /* отрязан клон */        //@conflict
            continue;
        }
        col[row] = c; placed++;                      //@place
        place(row + 1);                              //@recurse
        col[row] = -1;     /* връщане назад */       //@back
    }
}
//#end

static void queens(int n, int first)
{
    N = n; first_only = first; stop = 0;
    placed = pruned = solutions = 0;
    for (int i = 0; i < MAXN; i++) col[i] = -1;
    place(0);
}

/* ================= b) Разклоняване и ограничаване: TSP ================= */
//#viz ch10_bb
/* Минимална обиколка от град 0. d[i][j] >= 0. */
static int n, d[MAXC][MAXC], minOut[MAXC];
static int path[MAXC], used[MAXC], best, bestPath[MAXC];
static long nodes, cut, tours;

/* Оптимистична (долна) граница: изминатото + по едно
   най-евтино изходящо ребро от последния и от всеки непосетен град. */
static int bound(int depth, int cost)
{
    int b = cost + minOut[path[depth - 1]];          //@bound
    for (int v = 0; v < n; v++)
        if (!used[v]) b += minOut[v];                //@bound
    return b;
}

static void bb(int depth, int cost)
{                                                    //@enter
    nodes++;
    if (depth == n) {                                /* пълна обиколка */
        int total = cost + d[path[n - 1]][0];        //@leaf
        tours++;
        if (total < best) {                          //@leaf
            best = total;                            //@best
            for (int i = 0; i < n; i++) bestPath[i] = path[i];
        }
        return;
    }
    if (bound(depth, cost) >= best) {                //@prune
        cut++;            /* клонът не може да подобри best */ //@prune
        return;
    }
    for (int v = 1; v < n; v++)                      //@branch
        if (!used[v]) {
            used[v] = 1; path[depth] = v;
            bb(depth + 1, cost + d[path[depth - 1]][v]);   //@branch
            used[v] = 0;
        }
}
//#end

static int tsp_bb(int cities, int m[][MAXC])
{
    n = cities;
    for (int i = 0; i < n; i++) {
        minOut[i] = INT_MAX;
        for (int j = 0; j < n; j++) {
            d[i][j] = m[i][j];
            if (j != i && m[i][j] < minOut[i]) minOut[i] = m[i][j];
        }
        used[i] = 0;
    }
    best = INT_MAX; nodes = cut = tours = 0;
    used[0] = 1; path[0] = 0;
    bb(1, 0);
    return best;
}

/* ================= c-i) Las Vegas: рандомизиран Quick Sort ================= */
static uint32_t rs = 1;                 /* xorshift32 — същият генератор като в JS */
static uint32_t rnd(void) { rs ^= rs << 13; rs ^= rs >> 17; rs ^= rs << 5; return rs; }
static void seed_rng(uint32_t s) { rs = s * 2654435761u + 1u; if (!rs) rs = 1; }
static void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

//#viz ch10_rqs
static long cmps;            /* брой сравнения — случайна величина */
static int randomized = 1;

static void rqs(int a[], int lo, int hi)
{
    if (lo >= hi) return;
    int p = randomized ? lo + (int)(rnd() % (uint32_t)(hi - lo + 1))  //@pivot
                       : hi;       /* детерминиран: последният */
    swap(&a[p], &a[hi]);
    int x = a[hi], i = lo;
    for (int j = lo; j < hi; j++) {
        cmps++;                                                     //@cmp
        if (a[j] < x) swap(&a[i++], &a[j]);
    }
    swap(&a[i], &a[hi]);
    rqs(a, lo, i - 1);                                              //@rec
    rqs(a, i + 1, hi);                                              //@rec
}
/* Резултатът е ВИНАГИ сортиран (Las Vegas);
   случаен е само броят сравнения (времето). */
//#end

/* Вход: пермутация на 1..n, разбъркана с фиксирано семе (същото като в JS). */
static void make_input(int a[], int len, int sorted)
{
    for (int i = 0; i < len; i++) a[i] = i + 1;
    if (sorted) return;
    seed_rng(12345u);
    for (int i = len - 1; i > 0; i--) { int j = (int)(rnd() % (uint32_t)(i + 1)); swap(&a[i], &a[j]); }
}

static long rqs_run(int len, int sorted, int rand_pivot, uint32_t seed)
{
    int a[512];
    make_input(a, len, sorted);
    seed_rng(seed); randomized = rand_pivot; cmps = 0;
    rqs(a, 0, len - 1);
    for (int i = 1; i < len; i++) if (a[i - 1] > a[i]) return -1;   /* не е сортиран — не се случва */
    return cmps;
}

/* ================= c-ii) Monte Carlo: тестове за простота ================= */
//#viz ch10_fermat
/* Модулно степенуване: a^e mod m за O(log e) умножения. m < 2^32. */
uint64_t powmod(uint64_t a, uint64_t e, uint64_t m)
{
    uint64_t r = 1 % m;
    a %= m;
    while (e > 0) {                                  //@loop
        if (e & 1) r = r * a % m;                    //@mul
        a = a * a % m;                               //@sq
        e >>= 1;
    }
    return r;                                        //@ret
}

/* Тест на Ферма: 0 = сигурно съставно, 1 = "вероятно просто". */
int fermat(uint64_t n, const uint64_t base[], int k)
{
    for (int i = 0; i < k; i++) {
        uint64_t a = base[i];                        //@pick
        if (powmod(a, n - 1, n) != 1)                //@test
            return 0;      /* a е свидетел */        //@witness
    }
    return 1;              /* грешка е възможна */   //@prob
}
//#end

//#viz ch10_mr
/* Милър–Рабин: n - 1 = d * 2^s, d нечетно.  (powmod — виж теста на Ферма) */
int miller_rabin(uint64_t n, const uint64_t base[], int k)
{
    uint64_t d = n - 1; int s = 0;
    while ((d & 1) == 0) { d >>= 1; s++; }           //@split
    for (int i = 0; i < k; i++) {
        uint64_t x = powmod(base[i], d, n);          //@pick
        if (x == 1 || x == n - 1) continue;          //@pass
        int r;
        for (r = 1; r < s; r++) {
            x = x * x % n;                           //@sq
            if (x == n - 1) break;                   //@sq
        }
        if (r == s) return 0;   /* свидетел */       //@witness
    }
    return 1;                   /* вероятно просто */ //@prob
}
//#end

/* ================= d) Намаляване на размера: Insertion Sort ================= */
//#viz ch10_insertion
/* a[0..i-1] вече е сортиран (по-малката задача);
   вмъкваме a[i] — задачата нараства с 1 елемент. */
void insertion_sort(int a[], int len)
{
    for (int i = 1; i < len; i++) {                  //@grow
        int x = a[i], j = i - 1;
        while (j >= 0 && a[j] > x) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = x;                                //@insert
    }
}
//#end

/* ================= d) Предварително преобразуване: дубликати ================= */
static void msort_rec(int a[], int tmp[], int lo, int hi, long *cmp)
{
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2;
    msort_rec(a, tmp, lo, mid, cmp);
    msort_rec(a, tmp, mid, hi, cmp);
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) { ++*cmp; tmp[k++] = (a[j] < a[i]) ? a[j++] : a[i++]; }
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi) tmp[k++] = a[j++];
    for (k = lo; k < hi; k++) a[k] = tmp[k];
}
static void merge_sort(int a[], int len, long *cmp)
{
    int *tmp = malloc((size_t)(len > 0 ? len : 1) * sizeof *tmp);
    if (!tmp) return;
    msort_rec(a, tmp, 0, len, cmp);
    free(tmp);
}

//#viz ch10_dup_naive
/* Наивно: всяка двойка (i, j) — O(n^2) сравнения. */
int has_dup_naive(const int a[], int len, long *cmp)
{
    for (int i = 0; i < len; i++)                    //@outer
        for (int j = i + 1; j < len; j++) {
            ++*cmp;                                  //@cmp
            if (a[i] == a[j]) return 1;              //@found
        }
    return 0;                                        //@none
}
//#end

//#viz ch10_dup_presort
/* Предварително сортиране: O(n log n) + O(n) обхождане.
   Равните елементи стават СЪСЕДНИ. */
int has_dup_presort(int a[], int len, long *cmp)
{
    merge_sort(a, len, cmp);     /* цената влиза в анализа */ //@sort
    for (int i = 0; i + 1 < len; i++) {
        ++*cmp;                                      //@cmp
        if (a[i] == a[i + 1]) return 1;              //@found
    }
    return 0;                                        //@none
}
//#end

/* ================= e) Среща по средата: сума на подмножество ================= */
//#viz ch10_mitm
typedef struct { long sum; unsigned mask; } Item;

static int by_sum(const void *p, const void *q)
{
    const Item *a = p, *b = q;
    if (a->sum != b->sum) return a->sum < b->sum ? -1 : 1;
    return a->mask < b->mask ? -1 : a->mask > b->mask;
}

/* Има ли подмножество на x[0..n-1] със сума T? */
int mitm(const long x[], int n, long T, unsigned *ma, unsigned *mb, long *probes)
{
    int h = n / 2, m = n - h, na = 1 << h, nb = 1 << m, ok = 0;
    Item *A = malloc(sizeof *A * (size_t)na), *B = malloc(sizeof *B * (size_t)nb);
    if (!A || !B) { free(A); free(B); return -1; }
    for (int s = 0; s < na; s++) {                   /* суми на лявата половина */
        A[s].sum = 0; A[s].mask = (unsigned)s;
        for (int i = 0; i < h; i++) if (s >> i & 1) A[s].sum += x[i];      //@enumA
    }
    for (int s = 0; s < nb; s++) {                   /* суми на дясната половина */
        B[s].sum = 0; B[s].mask = (unsigned)s;
        for (int i = 0; i < m; i++) if (s >> i & 1) B[s].sum += x[h + i];  //@enumB
    }
    qsort(B, (size_t)nb, sizeof *B, by_sum);         //@sort
    for (int s = 0; s < na && !ok; s++) {
        long need = T - A[s].sum;                    //@need
        int lo = 0, hi = nb;                         /* двоично търсене */
        while (lo < hi) {
            int mid = (lo + hi) / 2; ++*probes;      //@probe
            if (B[mid].sum < need) lo = mid + 1; else hi = mid;
        }
        if (lo < nb && B[lo].sum == need) {          //@check
            *ma = A[s].mask; *mb = B[lo].mask; ok = 1;   //@found
        }
    }
    free(A); free(B);
    return ok;                                       //@ret
}
//#end

/* ================= f) Евристика, приближение, поток ================= */
//#viz ch10_nn
/* Алчна евристика "най-близък съсед" за TSP — без гаранция. */
int nn_tour(int cities, int m[][MAXC], int tour[])
{
    int seen[MAXC] = {0}, cur = 0, cost = 0;
    seen[0] = 1; tour[0] = 0;
    for (int k = 1; k < cities; k++) {               //@step
        int nx = -1;
        for (int j = 0; j < cities; j++)
            if (!seen[j] && (nx < 0 || m[cur][j] < m[cur][nx]))  //@scan
                nx = j;
        seen[nx] = 1; tour[k] = nx;                  //@take
        cost += m[cur][nx]; cur = nx;
    }
    return cost + m[cur][0];   /* връщане в 0 */     //@back
}
//#end

//#viz ch10_vc
/* 2-приближение за върхово покритие: за всяко непокрито
   ребро (u, v) вземи И ДВАТА края. */
int vc_approx(int m, const int eu[], const int ev[], int inC[])
{
    int size = 0;
    for (int e = 0; e < m; e++) {                    //@edge
        if (!inC[eu[e]] && !inC[ev[e]]) {            //@uncov
            inC[eu[e]] = inC[ev[e]] = 1;             //@take
            size += 2;                               //@take
        }
    }
    return size;                                     //@ret
}
//#end

static int vc_opt(int nv, int m, const int eu[], const int ev[])
{
    int bestc = nv;
    for (unsigned s = 0; s < (1u << nv); s++) {
        int ok = 1, c = 0;
        for (int e = 0; e < m && ok; e++) if (!(s >> eu[e] & 1) && !(s >> ev[e] & 1)) ok = 0;
        if (!ok) continue;
        for (int i = 0; i < nv; i++) c += (int)(s >> i & 1);
        if (c < bestc) bestc = c;
    }
    return bestc;
}

//#viz ch10_stream
/* Поточна статистика: O(1) памет, едно преминаване.
   Минали елементи НЕ се пазят. */
typedef struct { long count; long long sum; int max; } Stream;

void stream_init(Stream *s) { s->count = 0; s->sum = 0; s->max = INT_MIN; }

void stream_push(Stream *s, int x)
{                                                    //@push
    s->count++;                                      //@count
    s->sum += x;                                     //@sum
    if (x > s->max) s->max = x;                      //@max
}

double stream_mean(const Stream *s)
{
    return (double)s->sum / (double)s->count;        //@mean
}
//#end

#ifndef NO_MAIN
int main(void)
{
    /* N дами */
    for (int q = 4; q <= 8; q++) {
        queens(q, 0);
        printf("queens all %d = %ld %ld %ld\n", q, solutions, placed, pruned);
        queens(q, 1);
        printf("queens first %d = %ld %ld %ld\n", q, solutions, placed, pruned);
    }

    /* TSP */
    int m5[MAXC][MAXC] = { {0, 3, 4, 2, 7}, {3, 0, 4, 6, 3}, {4, 4, 0, 5, 8}, {2, 6, 5, 0, 6}, {7, 3, 8, 6, 0} };
    int m4[MAXC][MAXC] = { {0, 10, 15, 20}, {10, 0, 35, 25}, {15, 35, 0, 30}, {20, 25, 30, 0} };
    int ma[MAXC][MAXC] = { {0, 1, 9, 9, 9}, {9, 0, 1, 9, 9}, {9, 9, 0, 1, 9}, {9, 9, 9, 0, 1}, {1, 9, 9, 9, 0} };
    int (*mats[3])[MAXC] = { m5, m4, ma };
    int sizes[3] = {5, 4, 5};
    for (int t = 0; t < 3; t++) {
        int b = tsp_bb(sizes[t], mats[t]);
        printf("bb %d = %d %ld %ld %ld\n", t, b, nodes, cut, tours);
        int tour[MAXC];
        printf("nn %d = %d\n", t, nn_tour(sizes[t], mats[t], tour));
    }

    /* Las Vegas */
    for (int len = 10; len <= 50; len += 40) {
        for (uint32_t s = 1; s <= 3; s++) printf("rqs %d %u = %ld\n", len, s, rqs_run(len, 0, 1, s));
        printf("rqs sorted det %d = %ld\n", len, rqs_run(len, 1, 0, 1));
        printf("rqs sorted rand %d = %ld\n", len, rqs_run(len, 1, 1, 7));
    }

    /* Monte Carlo */
    uint64_t b4[] = {2, 5, 7, 10};
    uint64_t ns[] = {561, 97, 91, 1105, 1000003, 221};
    for (int i = 0; i < 6; i++)
        printf("prime %llu = %d %d\n", (unsigned long long)ns[i], fermat(ns[i], b4, 4), miller_rabin(ns[i], b4, 4));
    printf("powmod(7, 560, 561) = %llu\n", (unsigned long long)powmod(7, 560, 561));
    printf("powmod(3, 200, 1000003) = %llu\n", (unsigned long long)powmod(3, 200, 1000003));

    /* Дубликати */
    int a1[] = {9, 4, 7, 1, 8, 3, 6, 2, 5, 0}, a2[] = {9, 4, 7, 1, 8, 3, 6, 2, 7, 0};
    int c1[10], c2[10];
    for (int i = 0; i < 10; i++) { c1[i] = a1[i]; c2[i] = a2[i]; }
    long k1 = 0, k2 = 0, k3 = 0, k4 = 0;
    int r1 = has_dup_naive(a1, 10, &k1), r2 = has_dup_presort(c1, 10, &k2);
    int r3 = has_dup_naive(a2, 10, &k3), r4 = has_dup_presort(c2, 10, &k4);
    printf("dup a1 = %d %ld %d %ld\n", r1, k1, r2, k2);
    printf("dup a2 = %d %ld %d %ld\n", r3, k3, r4, k4);
    int ia[] = {5, 2, 4, 6, 1, 3};
    insertion_sort(ia, 6);
    printf("insertion = %d %d %d %d %d %d\n", ia[0], ia[1], ia[2], ia[3], ia[4], ia[5]);

    /* Среща по средата */
    long xs[] = {3, 34, 4, 12, 5, 2};
    long ts[] = {9, 30, 100, 0};
    for (int i = 0; i < 4; i++) {
        unsigned A = 0, B = 0; long pr = 0;
        int ok = mitm(xs, 6, ts[i], &A, &B, &pr);
        printf("mitm %ld = %d %u %u %ld\n", ts[i], ok, A, B, pr);
    }
    long x12[] = {41, 67, 34, 0, 69, 24, 78, 58, 62, 64, 5, 45};
    { unsigned A = 0, B = 0; long pr = 0; int ok = mitm(x12, 12, 300, &A, &B, &pr); printf("mitm12 300 = %d %u %u %ld\n", ok, A, B, pr); }
    { unsigned A = 0, B = 0; long pr = 0; int ok = mitm(x12, 12, 1, &A, &B, &pr); printf("mitm12 1 = %d %u %u %ld\n", ok, A, B, pr); }

    /* Върхово покритие */
    int eu[] = {0, 0, 1, 2, 3, 3}, ev[] = {1, 2, 3, 3, 4, 5};
    int inC[8] = {0};
    printf("vc = %d %d\n", vc_approx(6, eu, ev, inC), vc_opt(6, 6, eu, ev));

    /* Поток */
    int xsArr[] = {12, 7, 19, 3, 25, 8, 14};
    Stream st; stream_init(&st);
    for (int i = 0; i < 7; i++) stream_push(&st, xsArr[i]);
    printf("stream = %ld %d %.4f\n", st.count, st.max, stream_mean(&st));
    return 0;
}
#endif
