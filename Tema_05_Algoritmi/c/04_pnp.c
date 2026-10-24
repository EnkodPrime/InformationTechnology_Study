/* Тема 5, раздел 4 — класове P и NP, сводимост, NP-пълнота.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 04_pnp.c -o 04 && ./04
 *
 * Проверката на сертификат е полиномиална; изчерпателното търсене — не.
 */
#include <stdio.h>
#include <string.h>

#define MAXN 8

//#viz ch04_ham_verify
/* Проверител на сертификат за Хамилтонов цикъл.
   cyc[0..k-1] е предложената последователност от върхове.
   Време: O(n²) с матрица на съседство — полиномиално. */
int verify_ham(int n, const int adj[][MAXN], const int cyc[], int k)
{
    int seen[MAXN] = { 0 };
    if (k != n) return 0;                       /* точно n върха */  //@len
    for (int i = 0; i < k; i++) {                                    //@loop
        int v = cyc[i];
        if (v < 0 || v >= n || seen[v]) return 0; /* повторение */   //@dup
        seen[v] = 1;                                                 //@mark
    }
    for (int i = 0; i < k; i++) {                                    //@eloop
        int a = cyc[i], b = cyc[(i + 1) % k];   /* вкл. последен→първи */ //@pair
        if (!adj[a][b]) return 0;               /* няма ребро */     //@noedge
    }
    return 1;                                   /* сертификатът е валиден */ //@ok
}
//#end

//#viz ch04_ham_search
/* Изчерпателно търсене: фиксираме връх 0 и пробваме всички
   (n-1)! наредби на останалите. tried брои проверените пермутации. */
static long tried;

static int next_perm(int a[], int m)  /* следваща лексикографска пермутация */
{
    int i = m - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;
    if (i < 0) return 0;
    int j = m - 1;
    while (a[j] <= a[i]) j--;
    int t = a[i]; a[i] = a[j]; a[j] = t;
    for (int l = i + 1, r = m - 1; l < r; l++, r--) { t = a[l]; a[l] = a[r]; a[r] = t; }
    return 1;
}

int search_ham(int n, const int adj[][MAXN], int cyc[])
{
    tried = 0;
    for (int i = 0; i < n; i++) cyc[i] = i;                          //@init
    do {
        tried++;                                                     //@try
        if (verify_ham(n, adj, cyc, n))                              //@verify
            return 1;                                                //@found
    } while (next_perm(cyc + 1, n - 1));  /* върхът 0 остава първи */ //@next
    return 0;   /* всички (n-1)! са проверени: НЯМА цикъл (доказано) */ //@none
}
//#end

#define MAXV 6
#define MAXC 8

//#viz ch04_sat_eval
/* КНФ: клауза = масив литерали; +i е x_i, -i е ¬x_i, 0 завършва клаузата.
   Проверка на присвояване (сертификат): O(дължина на формулата). */
int eval_cnf(const int f[][4], int m, const int x[])
{
    for (int c = 0; c < m; c++) {                                    //@clause
        int sat = 0;
        for (int k = 0; k < 4 && f[c][k] != 0; k++) {                //@lit
            int v = f[c][k] > 0 ? f[c][k] : -f[c][k];
            int val = f[c][k] > 0 ? x[v] : !x[v];                    //@lit
            if (val) { sat = 1; break; }                             //@true
        }
        if (!sat) return 0;      /* клауза c е невярна */            //@false
    }
    return 1;                    /* всички клаузи са верни */        //@ok
}
//#end

//#viz ch04_sat_brute
/* Изчерпателно: всички 2^n присвоявания, x[1..n] = битовете на mask. */
int sat_brute(const int f[][4], int m, int n, long *tried_out)
{
    int x[MAXV + 1] = { 0 };
    *tried_out = 0;
    for (long mask = 0; mask < (1L << n); mask++) {                  //@loop
        for (int i = 1; i <= n; i++) x[i] = (mask >> (i - 1)) & 1;   //@assign
        ++*tried_out;                                                //@assign
        if (eval_cnf(f, m, x))                                       //@check
            return 1;            /* изпълнима: x е сертификат */     //@sat
    }
    return 0;                    /* 2^n проверки: неизпълнима */     //@unsat
}
//#end

//#viz ch04_reduce
/* Свеждане Хамилтонов цикъл ≤p TSP (решаваща):
   d(u,v) = 1, ако (u,v) е ребро, иначе 2; K = n.
   G има Хамилтонов цикъл  <=>  има обиколка с дължина <= n.
   Време: O(n²) — полиномиално преобразуване на входа. */
int ham_to_tsp(int n, const int adj[][MAXN], int d[][MAXN])
{
    for (int u = 0; u < n; u++)                                      //@loop
        for (int v = 0; v < n; v++)
            d[u][v] = (u == v) ? 0 : (adj[u][v] ? 1 : 2);            //@w
    return n;                    /* K = n */                         //@k
}

/* Решаващ TSP чрез изчерпване (само за малки n, за проверка) */
int tsp_le_k(int n, const int d[][MAXN], int K, int tour[])
{
    int p[MAXN];
    for (int i = 0; i < n; i++) p[i] = i;
    do {
        int len = 0;
        for (int i = 0; i < n; i++) len += d[p[i]][p[(i + 1) % n]];
        if (len <= K) { memcpy(tour, p, sizeof p); return 1; }
    } while (next_perm(p + 1, n - 1));
    return 0;
}
//#end

/* ---- примерни графи (същите като във визуализацията) ---- */
static void graph(const char *edges, int n, int adj[][MAXN])
{
    memset(adj, 0, sizeof(int) * MAXN * MAXN);
    for (const char *p = edges; *p; ) {           /* "01 12 ..." */
        int a = p[0] - '0', b = p[1] - '0';
        if (a < n && b < n) adj[a][b] = adj[b][a] = 1;
        p += 2;
        while (*p == ' ') p++;
    }
}

static int parse_cnf(const char *s, int f[][4])   /* "1 -2 | 2 3 | -1 -3" */
{
    int m = 0, k = 0, v, used;
    memset(f, 0, sizeof(int) * MAXC * 4);
    while (*s) {
        if (*s == '|') { m++; k = 0; s++; continue; }
        if (*s == ' ') { s++; continue; }
        if (sscanf(s, "%d%n", &v, &used) == 1) { f[m][k++] = v; s += used; } else s++;
    }
    return m + 1;
}

static void ham(const char *name, const char *edges, int n, const char *cert)
{
    int adj[MAXN][MAXN], cyc[MAXN], k = 0;
    graph(edges, n, adj);
    for (const char *p = cert; *p; p++) if (*p != ' ') cyc[k++] = *p - '0';
    printf("verify %s [%s] = %d\n", name, cert, verify_ham(n, adj, cyc, k));
}

static void hsearch(const char *name, const char *edges, int n)
{
    int adj[MAXN][MAXN], cyc[MAXN];
    graph(edges, n, adj);
    int r = search_ham(n, adj, cyc);
    printf("search %s = %d %ld", name, r, tried);
    if (r) { printf(" "); for (int i = 0; i < n; i++) printf("%d", cyc[i]); }
    printf("\n");
}

static void sat(const char *s, int n, const char *xs)
{
    int f[MAXC][4], x[MAXV + 1] = { 0 };
    int m = parse_cnf(s, f);
    for (int i = 0; xs[i]; i++) x[i + 1] = xs[i] - '0';
    long t;
    printf("eval [%s] %s = %d\n", s, xs, eval_cnf(f, m, x));
    int r = sat_brute(f, m, n, &t);
    printf("brute [%s] = %d %ld\n", s, r, t);
}

static void reduce(const char *name, const char *edges, int n)
{
    int adj[MAXN][MAXN], d[MAXN][MAXN], tour[MAXN], cyc[MAXN];
    graph(edges, n, adj);
    int K = ham_to_tsp(n, adj, d);
    int sum = 0;
    for (int u = 0; u < n; u++) for (int v = 0; v < n; v++) sum += d[u][v];
    int h = search_ham(n, adj, cyc), t = tsp_le_k(n, d, K, tour);
    printf("reduce %s = K%d sum%d ham%d tsp%d\n", name, K, sum, h, t);
}

#define G_HOUSE  "02 24 41 13 30 21"
#define G_PETAL  "01 02 03 04 12 34"
#define G_HEX    "03 31 15 52 24 40 01 45"
#define G_SEPT   "04 41 15 52 26 63 30 12 56"
#define G_STAR   "01 02 03 04 05 12"
#define G_K4     "01 02 03 12 13 23"

#ifndef NO_MAIN
int main(void)
{
    ham("house", G_HOUSE, 5, "0 2 4 1 3");
    ham("house", G_HOUSE, 5, "0 2 1 4 3");
    ham("house", G_HOUSE, 5, "0 2 4 1");
    ham("house", G_HOUSE, 5, "0 2 2 1 3");
    ham("house", G_HOUSE, 5, "0 1 2 3 4");
    ham("hex", G_HEX, 6, "0 3 1 5 2 4");
    ham("hex", G_HEX, 6, "0 1 5 2 4 3");
    ham("sept", G_SEPT, 7, "0 4 1 5 2 6 3");
    hsearch("house", G_HOUSE, 5);
    hsearch("petal", G_PETAL, 5);
    hsearch("hex", G_HEX, 6);
    hsearch("star", G_STAR, 6);
    hsearch("sept", G_SEPT, 7);
    hsearch("k4", G_K4, 4);
    sat("1 -2 | 2 3 | -1 -3", 3, "110");
    sat("1 -2 | 2 3 | -1 -3", 3, "111");
    sat("1 2 | -1 2 | 1 -2 | -1 -2", 2, "11");
    sat("1 2 3 | -1 -2 | -2 -3 | -1 -3 | 2", 3, "010");
    sat("1 | -1 2 | -2 3 | -3 4 | -4 5 | -5 -1", 5, "11111");
    reduce("house", G_HOUSE, 5);
    reduce("petal", G_PETAL, 5);
    reduce("hex", G_HEX, 6);
    reduce("star", G_STAR, 6);
    reduce("sept", G_SEPT, 7);
    return 0;
}
#endif
