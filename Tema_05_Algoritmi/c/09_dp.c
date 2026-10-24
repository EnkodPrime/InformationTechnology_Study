/* Тема 5, раздел 9 — динамично програмиране.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 09_dp.c -o 09_dp && ./09_dp
 *
 * 1) Фибоначи: наивна рекурсия, мемоизация, таблица, две променливи.
 * 2) Раница 0/1: двумерна таблица D(i, c) с обратно проследяване.
 * 3) Раница с едномерен масив: c надолу (0/1) и c нагоре (неограничена).
 */
#include <stdio.h>
#include <string.h>

/* ------------------------------------------------------------------ */
/* 1. Фибоначи                                                         */
/* ------------------------------------------------------------------ */
static long long calls;   /* брояч на извикванията */

//#viz ch09_fib_naive
/* Наивна рекурсия: Θ(φ^n) извиквания — едни и същи
   подзадачи се пресмятат отново и отново. */
long long fib_naive(int n)
{
    calls++;                                        //@enter
    if (n < 2)                                      //@base
        return n;                                   //@base
    long long a = fib_naive(n - 1);                 //@left
    long long b = fib_naive(n - 2);                 //@right
    return a + b;                                   //@ret
}
//#end

//#viz ch09_fib_memo
/* Мемоизация (отгоре надолу): memo[k] == -1 означава
   „още не е пресметнато“. Θ(n) време и Θ(n) памет. */
long long fib_memo(int n, long long memo[])
{
    calls++;                                        //@enter
    if (memo[n] != -1)                              //@hit
        return memo[n];      /* от кеша */          //@hit
    if (n < 2)                                      //@base
        return memo[n] = n;                         //@base
    long long a = fib_memo(n - 1, memo);            //@left
    long long b = fib_memo(n - 2, memo);            //@right
    memo[n] = a + b;                                //@ret
    return memo[n];                                 //@ret
}

long long fib_memo_start(int n)
{
    long long memo[100];
    for (int k = 0; k <= n; k++) memo[k] = -1;      //@init
    return fib_memo(n, memo);
}
//#end

//#viz ch09_fib_table
/* Таблично (отдолу нагоре): редът 0, 1, 2, ... гарантира,
   че F[i-1] и F[i-2] са готови. Θ(n) време, Θ(n) памет. */
long long fib_table(int n)
{
    long long F[100];
    F[0] = 0;                                       //@init
    if (n > 0) F[1] = 1;                            //@init
    for (int i = 2; i <= n; i++)                    //@loop
        F[i] = F[i - 1] + F[i - 2];                 //@step
    return F[n];                                    //@ret
}
//#end

//#viz ch09_fib_two
/* Пазим само последните две стойности: Θ(1) допълнителна памет. */
long long fib_two(int n)
{
    long long prev = 0, cur = 1;     /* F(0), F(1) */ //@init
    if (n == 0) return 0;                           //@zero
    for (int i = 2; i <= n; i++) {                  //@loop
        long long next = prev + cur;                //@step
        prev = cur;                                 //@shift
        cur = next;                                 //@shift
    }
    return cur;                                     //@ret
}
//#end

/* ------------------------------------------------------------------ */
/* 2. Раница 0/1                                                       */
/* ------------------------------------------------------------------ */
#define MAXN 8
#define MAXW 20

static int D[MAXN + 1][MAXW + 1];

//#viz ch09_knap2d
/* D[i][c] — максимална стойност от първите i предмета
   при вместимост c. Всеки предмет — най-много веднъж. */
int knapsack(const int w[], const int v[], int n, int W)
{
    for (int c = 0; c <= W; c++)
        D[0][c] = 0;                                //@base
    for (int i = 1; i <= n; i++)                    //@row
        for (int c = 0; c <= W; c++) {              //@cell
            D[i][c] = D[i - 1][c];      /* не взимаме i */ //@skip
            if (w[i - 1] <= c) {                    //@fits
                int take = v[i - 1] + D[i - 1][c - w[i - 1]];  //@take
                if (take > D[i][c])                 //@cmp
                    D[i][c] = take;                 //@upd
            }
        }
    return D[n][W];                                 //@ret
}

/* Обратно проследяване: кои предмети са взети */
int knapsack_items(const int w[], int n, int W, int taken[])
{
    int m = 0, c = W;
    for (int i = n; i >= 1; i--)                    //@tb
        if (D[i][c] != D[i - 1][c]) {   /* i е взет */ //@tbcmp
            taken[m++] = i;                         //@tbtake
            c -= w[i - 1];                          //@tbtake
        }
    return m;
}
//#end

//#viz ch09_knap1d
/* Едномерен масив: dp[c] е редът D(i, c) „на място“.
   down = 1: c надолу — всеки предмет най-много веднъж (0/1);
   down = 0: c нагоре — dp[c - w] вече съдържа предмет i,
             т.е. той се ползва многократно (неограничена раница). */
int knapsack_1d(const int w[], const int v[], int n, int W, int down)
{
    int dp[MAXW + 1];
    for (int c = 0; c <= W; c++) dp[c] = 0;         //@init
    for (int i = 0; i < n; i++) {                   //@item
        if (down) {
            for (int c = W; c >= w[i]; c--)         //@down
                if (v[i] + dp[c - w[i]] > dp[c])    //@cmp
                    dp[c] = v[i] + dp[c - w[i]];    //@upd
        } else {
            for (int c = w[i]; c <= W; c++)         //@up
                if (v[i] + dp[c - w[i]] > dp[c])    //@cmp
                    dp[c] = v[i] + dp[c - w[i]];    //@upd
        }
    }
    return dp[W];                                   //@ret
}
//#end

/* "2:3 3:4" -> тегла и стойности */
static int parse_items(const char *s, int w[], int v[])
{
    int n = 0, a, b, used;
    while (n < MAXN && sscanf(s, " %d:%d%n", &a, &b, &used) == 2) {
        w[n] = a; v[n] = b; n++; s += used;
    }
    return n;
}

#ifndef NO_MAIN
int main(void)
{
    static const int ns[] = { 0, 1, 2, 5, 7, 10, 20, 25, 30 };
    for (size_t k = 0; k < sizeof ns / sizeof ns[0]; k++) {
        int n = ns[k];
        calls = 0; long long r = fib_naive(n);
        printf("fib_naive(%d) = %lld\n", n, r);
        printf("fib_naive_calls(%d) = %lld\n", n, calls);
        calls = 0; r = fib_memo_start(n);
        printf("fib_memo(%d) = %lld\n", n, r);
        printf("fib_memo_calls(%d) = %lld\n", n, calls);
        printf("fib_table(%d) = %lld\n", n, fib_table(n));
        printf("fib_two(%d) = %lld\n", n, fib_two(n));
    }
    printf("fib_table(60) = %lld\n", fib_table(60));

    static const struct { const char *items; int W; } ks[] = {
        { "2:3 3:4", 5 },
        { "2:3 3:4 4:5 5:6", 5 },
        { "2:3 3:4 4:5 5:6", 6 },
        { "1:1 3:4 4:5 5:7", 7 },
        { "5:10 4:40 6:30 3:50", 10 },
        { "4:5 3:4", 2 },
    };
    for (size_t k = 0; k < sizeof ks / sizeof ks[0]; k++) {
        int w[MAXN], v[MAXN], taken[MAXN];
        int n = parse_items(ks[k].items, w, v), W = ks[k].W;
        printf("knap[%s;%d] = %d\n", ks[k].items, W, knapsack(w, v, n, W));
        int m = knapsack_items(w, n, W, taken);
        printf("knap_items[%s;%d] =", ks[k].items, W);
        for (int j = m - 1; j >= 0; j--) printf(" %d", taken[j]);
        printf(m ? "\n" : " -\n");
        printf("knap_table[%s;%d] =", ks[k].items, W);
        for (int i = 0; i <= n; i++) for (int c = 0; c <= W; c++) printf(" %d", D[i][c]);
        printf("\n");
        printf("knap1d_down[%s;%d] = %d\n", ks[k].items, W, knapsack_1d(w, v, n, W, 1));
        printf("knap1d_up[%s;%d] = %d\n", ks[k].items, W, knapsack_1d(w, v, n, W, 0));
    }
    return 0;
}
#endif
