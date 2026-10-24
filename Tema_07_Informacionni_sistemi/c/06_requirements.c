/* Тема 7, раздел 6 — изисквания и проследимост.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 06_requirements.c -o req && ./req
 *
 * 1) nfr_check: проверка на измеримо нефункционално изискване
 *    „p% от заявките отговарят до limit ms“, измерено от зададена точка
 *    (offset — добавка, ако се мери от клиента, а не от сървъра).
 * 2) impact: анализ на въздействието по връзките на проследимостта —
 *    обхождане в ширина от променения елемент към всички зависими.
 *
 * Регионите //#viz ... //#end се показват във визуализацията;
 * маркерите //@етикет казват кой ред да се подсвети на дадена стъпка.
 */
#include <stdio.h>

//#viz ch06_nfr
/* Изискване: pct% от заявките да отговарят до limit_ms.
   offset_ms — добавка според точката на измерване
   (0 = от сървъра; > 0 = от клиента, с мрежата).   */
int nfr_check(const int t_ms[], int n, int offset_ms,
              int limit_ms, int pct, int *ok_out)
{                                                   //@enter
    int ok = 0;
    for (int i = 0; i < n; i++) {                   //@loop
        int measured = t_ms[i] + offset_ms;         //@measure
        if (measured <= limit_ms)                   //@cmp
            ok++;                                   //@ok
    }
    *ok_out = ok;
    /* ok/n >= pct/100, без деление с плаваща запетая */
    return n > 0 && ok * 100 >= pct * n;            //@verdict
}
//#end

/* Елементи на проследимостта за едно записване на студент в дисциплина.
   Ребро u -> v: „v е изведено от u / зависи от u“. */
enum { N_NEED, R_UNIQ, R_TIME, D_UNIQ, D_TX, D_SCREEN, C_ENROLL, C_TABLE,
       T_CONC, T_SEQ, T_LOAD, N_EL };
static const char *const EL_NAME[N_EL] = {
    "N1", "R1", "R2", "D1", "D2", "D3", "C1", "C2", "T1", "T2", "T3" };
static const int EDGES[][2] = {
    {N_NEED, R_UNIQ}, {N_NEED, R_TIME},
    {R_UNIQ, D_UNIQ}, {R_UNIQ, D_TX}, {R_UNIQ, D_SCREEN}, {R_TIME, D_TX},
    {D_UNIQ, C_TABLE}, {D_TX, C_ENROLL}, {D_SCREEN, C_ENROLL},
    {C_ENROLL, T_CONC}, {C_TABLE, T_CONC}, {C_ENROLL, T_SEQ},
    {C_ENROLL, T_LOAD}, {R_TIME, T_LOAD},
};
#define N_EDGES ((int)(sizeof EDGES / sizeof EDGES[0]))

//#viz ch06_impact
/* Обхождане в ширина: кои елементи засяга промяната на start.
   Записва ги в out[] в реда на откриване; връща броя им.     */
int impact(int start, int out[])
{                                                   //@enter
    int queue[N_EL], head = 0, tail = 0, cnt = 0;
    int seen[N_EL] = {0};
    seen[start] = 1;
    queue[tail++] = start;                          //@push
    while (head < tail) {                           //@loop
        int u = queue[head++];                      //@pop
        out[cnt++] = u;
        for (int e = 0; e < N_EDGES; e++) {         //@edge
            if (EDGES[e][0] != u) continue;
            int v = EDGES[e][1];
            if (!seen[v]) {                         //@check
                seen[v] = 1;                        //@mark
                queue[tail++] = v;                  //@push
            }
        }
    }
    return cnt;                                     //@ret
}
//#end

static void print_impact(int start)
{
    int out[N_EL];
    int c = impact(start, out);
    printf("impact(%s) = ", EL_NAME[start]);
    for (int i = 0; i < c; i++) printf("%s%s", i ? " " : "", EL_NAME[out[i]]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    const int t[] = {420, 380, 1900, 650, 2400, 510, 880, 1200, 700, 1750,
                     300, 950, 610, 1490, 2050, 560, 830, 1020, 400, 1300};
    const int n = (int)(sizeof t / sizeof t[0]);
    int ok;
    int pass = nfr_check(t, n, 0, 2000, 95, &ok);
    printf("nfr(server) = %d/%d %d\n", ok, n, pass);
    pass = nfr_check(t, n, 0, 2000, 90, &ok);
    printf("nfr(server,90) = %d/%d %d\n", ok, n, pass);
    pass = nfr_check(t, n, 300, 2000, 90, &ok);
    printf("nfr(client,90) = %d/%d %d\n", ok, n, pass);
    pass = nfr_check(t, n, 0, 2500, 95, &ok);
    printf("nfr(limit2500) = %d/%d %d\n", ok, n, pass);

    for (int s = 0; s < N_EL; s++) print_impact(s);
    return 0;
}
#endif
