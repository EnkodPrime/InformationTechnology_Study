/* Тема 1, раздел 3 — последователна и паралелна обработка.
 *   a) SISD срещу SIMD: колко инструкции за събиране са нужни за c = a + b.
 *   b) Конкурентност и паралелност: кръгово разпределение (round robin) на задачи
 *      върху 1..4 ядра; по избор задача може да чака друга (зависимост).
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 03_parallel.c -o par && ./par
 */
#include <stdio.h>
#include <string.h>

//#viz ch03_simd
/* SISD: една скаларна инструкция за всеки елемент. */
int vec_add_sisd(const int *a, const int *b, int *c, int n)
{
    int ops = 0;
    for (int i = 0; i < n; i++) {               //@s_loop
        c[i] = a[i] + b[i];                     //@s_add
        ops++;
    }
    return ops;                                 //@s_ret
}

/* SIMD с W ленти. Вътрешният цикъл по ленти ИЗОБРАЗЯВА една векторна
   инструкция (в реален код: напр. vaddq_s32 от Arm NEON за W = 4 x int32).
   Опашката n mod W се довършва скаларно. */
int vec_add_simd(const int *a, const int *b, int *c, int n, int W)
{
    int ops = 0, i = 0;
    for (; i + W <= n; i += W) {                //@v_loop
        for (int l = 0; l < W; l++)             /* ленти: една инструкция */
            c[i + l] = a[i + l] + b[i + l];     //@v_add
        ops++;                                  //@v_cnt
    }
    for (; i < n; i++) {                        //@t_loop
        c[i] = a[i] + b[i];                     //@t_add
        ops++;
    }
    return ops;                                 //@v_ret
}
//#end

//#viz ch03_rr
#define MAXT 6
#define MAXC 4
#define TMAX 200
/* len[i] — продължителност на задача i; dep[i] — задача, която i чака (-1 няма);
   q — квант (0 = без отнемане: задачата работи до край). */
int round_robin(int n, const int *len, const int *dep, int cores, int q,
                int tl[MAXC][TMAX], int *finish)
{
    int rem[MAXT], queued[MAXT] = {0}, queue[MAXT], qh = 0, qn = 0; /* кръгова опашка: в нея има най-много n задачи */
    int cur[MAXC], used[MAXC], done = 0, t = 0;
    for (int i = 0; i < n; i++) { rem[i] = len[i]; finish[i] = -1; }
    for (int k = 0; k < cores; k++) cur[k] = -1;
    while (done < n && t < TMAX) {                              //@loop
        for (int i = 0; i < n; i++)                             /* готови задачи */
            if (!queued[i] && (dep[i] < 0 || finish[dep[i]] >= 0)) { //@ready
                queue[(qh + qn++) % MAXT] = i; queued[i] = 1;
            }
        for (int k = 0; k < cores; k++)                         /* изтекъл квант */
            if (cur[k] >= 0 && q > 0 && used[k] == q) {         //@preempt
                queue[(qh + qn++) % MAXT] = cur[k]; cur[k] = -1;
            }
        for (int k = 0; k < cores; k++)                         /* свободно ядро */
            if (cur[k] < 0 && qn > 0) {                        //@pick
                cur[k] = queue[qh]; qh = (qh + 1) % MAXT; qn--; used[k] = 0;
            }
        for (int k = 0; k < cores; k++) {                       /* една единица време */
            tl[k][t] = cur[k];                                  //@run
            if (cur[k] < 0) continue;
            rem[cur[k]]--; used[k]++;
            if (rem[cur[k]] == 0) {                             //@finish
                finish[cur[k]] = t + 1; done++; cur[k] = -1;
            }
        }
        t++;
    }
    return t;                                                   //@ret
}
//#end

#ifndef NO_MAIN
static void rr_case(const char *name, int n, const int *len, const int *dep, int cores, int q)
{
    int tl[MAXC][TMAX], fin[MAXT];
    int T = round_robin(n, len, dep, cores, q, tl, fin);
    printf("rr_%s = %d |", name, T);
    for (int i = 0; i < n; i++) printf(" %d", fin[i]);
    printf(" |");
    for (int k = 0; k < cores; k++) {
        printf(" ");
        for (int t = 0; t < T; t++) printf("%c", tl[k][t] < 0 ? '.' : 'A' + tl[k][t]);
    }
    printf("\n");
}

int main(void)
{
    int a[19], b[19], c[19];
    for (int i = 0; i < 19; i++) { a[i] = i + 1; b[i] = 10 * (i + 1); }
    for (int n = 0; n <= 19; n += 1) {
        int s = vec_add_sisd(a, b, c, n);
        printf("sisd(%d) = %d\n", n, s);
        for (int W = 2; W <= 8; W *= 2) {
            int v = vec_add_simd(a, b, c, n, W);
            int sum = 0;
            for (int i = 0; i < n; i++) sum += c[i];
            printf("simd(%d,%d) = %d %d\n", n, W, v, sum);
        }
    }
    const int L1[] = {4, 3, 2}, D0[] = {-1, -1, -1, -1, -1, -1};
    const int L2[] = {3, 3, 3, 3}, D2[] = {-1, 0, -1, 2};
    const int L3[] = {5, 1, 4, 2, 3, 2}, D3[] = {-1, -1, 0, -1, 1, 3};
    rr_case("a1q0", 3, L1, D0, 1, 0);
    rr_case("a1q1", 3, L1, D0, 1, 1);
    rr_case("a1q2", 3, L1, D0, 1, 2);
    rr_case("a2q1", 3, L1, D0, 2, 1);
    rr_case("a3q2", 3, L1, D0, 3, 2);
    rr_case("b2q1", 4, L2, D2, 2, 1);
    rr_case("b4q0", 4, L2, D2, 4, 0);
    rr_case("c2q2", 6, L3, D3, 2, 2);
    rr_case("c3q1", 6, L3, D3, 3, 1);
    rr_case("c1q3", 6, L3, D3, 1, 3);
    const int L4[] = {9, 9, 9, 9, 9, 9};                   /* дълга опашка: 54 връщания в опашката */
    rr_case("d1q1", 6, L4, D0, 1, 1);
    return 0;
}
#endif
