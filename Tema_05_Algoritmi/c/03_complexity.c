/* Тема 5, раздел 3 — изчислителна сложност.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 03_complexity.c -o 03 && ./03
 *
 * Всеки фрагмент брои „елементарните операции“ с count++ —
 * визуализацията изпълнява същите цикли със същия брояч.
 */
#include <stdio.h>
#include <stdint.h>

static long count;   /* брояч на елементарните операции */

//#viz ch03_single
/* Единичен цикъл: count = n  ->  Θ(n) */
void single(int n)
{
    for (int i = 0; i < n; i++)              //@loop
        count++;                             //@op
}
//#end

//#viz ch03_nested
/* Два вложени цикъла: count = n·n  ->  Θ(n²) */
void nested(int n)
{
    for (int i = 0; i < n; i++)              //@outer
        for (int j = 0; j < n; j++)          //@inner
            count++;                         //@op
}
//#end

//#viz ch03_tri
/* Триъгълен цикъл: j тръгва от i.
   count = n + (n-1) + ... + 1 = n(n+1)/2  ->  Θ(n²) */
void triangle(int n)
{
    for (int i = 0; i < n; i++)              //@outer
        for (int j = i; j < n; j++)          //@inner
            count++;                         //@op
}
//#end

//#viz ch03_double
/* Удвояване: i = 1, 2, 4, 8, ... <= n
   count = ⌊log₂ n⌋ + 1  ->  Θ(log n) */
void doubling(int n)
{
    for (int i = 1; i <= n; i *= 2)          //@loop
        count++;                             //@op
}
//#end

//#viz ch03_rec
/* T(n) = 2T(n/2) + n: n операции на ниво, ~log₂ n нива.
   За n = 2^k: count = n·log₂ n  ->  Θ(n log n) */
void rec(int n)
{                                            //@enter
    if (n <= 1) return;                      //@base
    for (int i = 0; i < n; i++)              //@loop
        count++;                             //@op
    rec(n / 2);                              //@left
    rec(n - n / 2);                          //@right
}
//#end

//#viz ch03_lsearch
/* Линейно търсене, брои сравненията на ключове.
   Най-добър случай: 1 · Най-лош: n · Среден (ключът е на
   равномерно случайна позиция): (n+1)/2 */
int lsearch(const int a[], int n, int key, long *cmp)
{
    *cmp = 0;
    for (int i = 0; i < n; i++) {            //@loop
        ++*cmp;                              //@cmp
        if (a[i] == key) return i;           //@cmp
    }
    return -1;                               //@miss
}
//#end

//#viz ch03_theta
/* T(n) = 3n² + 5n + 7.  Θ(n²) значи: има c1, c2 > 0 и n0,
   така че c1·n² <= T(n) <= c2·n² за всяко n >= n0.
   Числена проверка за n = 1..nmax: последното нарушение. */
double T(long n) { return 3.0 * n * n + 5.0 * n + 7.0; }

long min_n0(double c1, double c2, long nmax)
{
    long last_bad = 0;
    for (long n = 1; n <= nmax; n++) {                   //@loop
        double t = T(n), lo = c1 * n * n, hi = c2 * n * n; //@eval
        if (lo > t || t > hi)                            //@test
            last_bad = n;      /* нарушено при това n */  //@bad
    }
    return last_bad < nmax ? last_bad + 1 : -1;          //@ret
}
//#end

//#viz ch03_pseudo
/* Брой битове на W >= 1: ⌊log₂ W⌋ + 1 — това е РАЗМЕРЪТ на входа */
unsigned bits(uint64_t W)
{
    unsigned b = 0;
    do { b++; W >>= 1; } while (W);                      //@bits
    return b;
}

/* Цикъл до W: W стъпки — полиномиално спрямо СТОЙНОСТТА W,
   но ~2^bits(W) спрямо ДЪЛЖИНАТА на входа (псевдополиномиално) */
uint64_t count_to(uint64_t W)
{
    uint64_t steps = 0;
    for (uint64_t i = 1; i <= W; i++)                    //@loop
        steps++;                                         //@loop
    return steps;
}
//#end

static void run(const char *name, void (*f)(int), int n)
{
    count = 0;
    f(n);
    printf("%s(%d) = %ld\n", name, n, count);
}

#ifndef NO_MAIN
int main(void)
{
    int ns[] = { 0, 1, 2, 5, 8, 10, 13, 16, 31, 60 };
    for (size_t k = 0; k < sizeof ns / sizeof ns[0]; k++) {
        int n = ns[k];
        run("single", single, n);
        run("nested", nested, n);
        run("triangle", triangle, n);
        run("doubling", doubling, n);
        run("rec", rec, n);
    }
    int a[20];
    for (int i = 0; i < 20; i++) a[i] = 10 * (i + 1);
    long c;
    int ks[] = { 10, 50, 200, 7 };
    for (int k = 0; k < 4; k++) {
        int r = lsearch(a, 20, ks[k], &c);
        printf("lsearch(%d) = %d %ld\n", ks[k], r, c);
    }
    printf("min_n0(3,4) = %ld\n", min_n0(3, 4, 40));
    printf("min_n0(2,5) = %ld\n", min_n0(2, 5, 40));
    printf("min_n0(3,3.5) = %ld\n", min_n0(3, 3.5, 40));
    printf("min_n0(1,10) = %ld\n", min_n0(1, 10, 40));
    printf("min_n0(4,5) = %ld\n", min_n0(4, 5, 40));
    printf("min_n0(3,3) = %ld\n", min_n0(3, 3, 40));
    uint64_t ws[] = { 1, 2, 1000, 1024, 1000000, 1099511627776ULL };
    for (int k = 0; k < 6; k++)
        printf("bits(%llu) = %u\n", (unsigned long long)ws[k], bits(ws[k]));
    printf("count_to(1000) = %llu\n", (unsigned long long)count_to(1000));
    return 0;
}
#endif
