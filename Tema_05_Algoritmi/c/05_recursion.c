/* Тема 5, раздел 5 — рекурсия: базов случай, стек на извикванията,
 * недостижим базов случай, брой извиквания при двоична рекурсия.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 05_recursion.c -o 05 && ./05
 *
 * g_calls е само брояч за визуализацията — не е част от алгоритъма.
 */
#include <stdio.h>

static long g_calls;

//#viz ch05_fact_rec
/* n! рекурсивно.  Предусловие: n >= 0.
   0! = 1;  n! = n * (n-1)!  за n > 0          */
unsigned long long fact(int n)
{
    g_calls++;                                   //@enter
    if (n == 0)                                  //@base_test
        return 1;                                //@base
    unsigned long long r = fact(n - 1);          //@call
    return (unsigned long long)n * r;            //@mul
}
//#end

//#viz ch05_fact_iter
/* n! итеративно: една променлива r — Θ(1) допълнителна памет */
unsigned long long fact_iter(int n)
{
    unsigned long long r = 1;                    //@init
    for (int i = 2; i <= n; i++)                 //@loop
        r *= (unsigned long long)i;              //@mul
    return r;                                    //@ret
}
//#end

//#viz ch05_dfact_bad
/* "Двоен факториел" n*(n-2)*(n-4)*...
   Базовият случай е САМО n == 0: при нечетно n
   аргументът прескача 0 и тръгва към -безкрайност. */
long long dfact_bad(int n)
{
    g_calls++;                                   //@enter
    if (n == 0)                                  //@base_test
        return 1;                                //@base
    return n * dfact_bad(n - 2);                 //@call @mul
}
//#end

//#viz ch05_dfact_ok
/* Поправено: базовият случай покрива и 1, и всички n <= 0.
   Мярката n намалява с 2 и неизбежно стига до n <= 1. */
long long dfact_ok(int n)
{
    g_calls++;                                   //@enter
    if (n <= 1)                                  //@base_test
        return 1;                                //@base
    return n * dfact_ok(n - 2);                  //@call @mul
}
//#end

/* Само за проверка (не се показва): същата рекурсия като dfact_bad / fact,
   но с изкуствен лимит на стека — моделира "stack overflow" без да срива програмата.
   Връща дълбочината, на която е спряла (лимит+1 = препълване). */
static int depth_until_base(int n, int step, int depth, int limit)
{
    if (depth > limit) return depth;             /* препълване */
    if (n == 0) return depth;                    /* базов случай */
    return depth_until_base(n - step, step, depth + 1, limit);
}

//#viz ch05_pow_lin
/* x^n линейно: x^n = x * x^(n-1).  n+1 извиквания — Θ(n) */
long long pow_lin(long long x, int n)
{
    g_calls++;                                   //@enter
    if (n == 0)                                  //@base_test
        return 1;                                //@base
    long long r = pow_lin(x, n - 1);             //@call
    return x * r;                                //@comb
}
//#end

//#viz ch05_pow_twice
/* x^n чрез ДВЕ еднакви извиквания за n/2.
   Изглежда "разделяй и владей", но C(n) = 2C(n/2) + 1 = Θ(n) извиквания. */
long long pow_twice(long long x, int n)
{
    g_calls++;                                   //@enter
    if (n == 0)                                  //@base_test
        return 1;                                //@base
    long long a = pow_twice(x, n / 2);           //@call @call1
    long long b = pow_twice(x, n / 2);           //@call2
    return (n % 2) ? a * b * x : a * b;          //@comb
}
//#end

//#viz ch05_pow_fast
/* Бързо степенуване: x^n = (x^(n/2))^2  [* x при нечетно n].
   Едно извикване за n/2:  C(n) = C(n/2) + 1 = Θ(log n) */
long long pow_fast(long long x, int n)
{
    g_calls++;                                   //@enter
    if (n == 0)                                  //@base_test
        return 1;                                //@base
    long long h = pow_fast(x, n / 2);            //@call
    return (n % 2) ? h * h * x : h * h;          //@comb
}
//#end

#ifndef NO_MAIN
int main(void)
{
    int fs[] = {0, 1, 4, 10, 20};
    for (int k = 0; k < 5; k++) {
        g_calls = 0;
        unsigned long long v = fact(fs[k]);
        printf("fact(%d) = %llu\n", fs[k], v);
        printf("fact(%d) calls = %ld\n", fs[k], g_calls);
        printf("fact_iter(%d) = %llu\n", fs[k], fact_iter(fs[k]));
    }
    int ds[] = {0, 6, 8};
    for (int k = 0; k < 3; k++) {
        g_calls = 0;
        long long v = dfact_bad(ds[k]);
        printf("dfact_bad(%d) = %lld\n", ds[k], v);
        printf("dfact_bad(%d) calls = %ld\n", ds[k], g_calls);
    }
    int os[] = {1, 7, 9};
    for (int k = 0; k < 3; k++) {
        g_calls = 0;
        long long v = dfact_ok(os[k]);
        printf("dfact_ok(%d) = %lld\n", os[k], v);
        printf("dfact_ok(%d) calls = %ld\n", os[k], g_calls);
    }
    /* недостижим базов случай при лимит 40 рамки */
    printf("dfact_bad(7) stop depth = %d\n", depth_until_base(7, 2, 1, 40));
    printf("dfact_bad(8) stop depth = %d\n", depth_until_base(8, 2, 1, 40));
    printf("fact(-3) stop depth = %d\n", depth_until_base(-3, 1, 1, 40));

    struct { long long x; int n; } ps[] = {{2, 10}, {3, 13}, {2, 16}, {-3, 7}, {5, 24}, {7, 0}};
    for (int k = 0; k < 6; k++) {
        long long x = ps[k].x; int n = ps[k].n;
        g_calls = 0; long long v1 = pow_lin(x, n);   long c1 = g_calls;
        g_calls = 0; long long v2 = pow_twice(x, n); long c2 = g_calls;
        g_calls = 0; long long v3 = pow_fast(x, n);  long c3 = g_calls;
        printf("pow_lin(%lld,%d) = %lld\n", x, n, v1);
        printf("pow_lin(%lld,%d) calls = %ld\n", x, n, c1);
        printf("pow_twice(%lld,%d) = %lld\n", x, n, v2);
        printf("pow_twice(%lld,%d) calls = %ld\n", x, n, c2);
        printf("pow_fast(%lld,%d) = %lld\n", x, n, v3);
        printf("pow_fast(%lld,%d) calls = %ld\n", x, n, c3);
    }
    return 0;
}
#endif
