/* Тема 10, раздел 2 — модели на атака. Атака с известен открит текст (known-plaintext).
 *  а) афинен шифър: две двойки (p1,c1), (p2,c2) дават a и b чрез модулна обратност;
 *  б) Виженер: c - p по модул m разкрива ключовата последователност направо.
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 02_known_plain.c -o kp && ./kp
 */
#include "alpha.h"

//#viz ch02_modinv
/* Разширен алгоритъм на Евклид: a*x ≡ 1 (mod m). Връща -1, ако НОД(a,m) != 1 */
int modinv(int a, int m)
{
    int r0 = m, r1 = mod(a, m), x0 = 0, x1 = 1;     //@init
    while (r1 != 0) {                                //@loop
        int q = r0 / r1;                             //@q
        int t = r0 - q * r1; r0 = r1; r1 = t;        //@step
        t = x0 - q * x1; x0 = x1; x1 = t;            //@step
    }
    if (r0 != 1) return -1;                          //@nogcd
    return mod(x0, m);                               //@ret
}
//#end

//#viz ch02_affine_kp
/* Две известни двойки открит/шифротекст -> ключ (a, b) на афинния шифър.
   c1 - c2 ≡ a (p1 - p2)  =>  a = (c1 - c2) * (p1 - p2)^-1,  b = c1 - a p1 */
int affine_from_pairs(int p1, int c1, int p2, int c2, int m, int *a, int *b)
{
    int dp = mod(p1 - p2, m), dc = mod(c1 - c2, m); //@diff
    int inv = modinv(dp, m);                         //@inv
    if (inv < 0) return 0;  /* двойките не определят a еднозначно */ //@fail
    *a = mod(dc * inv, m);                           //@a
    *b = mod(c1 - *a * p1, m);                       //@b
    if (gcd_int(*a, m) != 1) return 0;  /* не е валиден ключ */ //@fail
    return 1;                                        //@ok
}
//#end

//#viz ch02_vig_kp
/* Виженер: при известна двойка ключовата последователност е k_i = c_i - p_i */
void vig_keystream(const int *p, const int *c, int n, int m, int *k)
{
    for (int i = 0; i < n; i++)                      //@loop
        k[i] = mod(c[i] - p[i], m);                  //@sub
}
/* най-малкият период L, при който k[i] == k[i-L] за всички i */
int keystream_period(const int *k, int n)
{
    for (int L = 1; L < n; L++) {                    //@tryL
        int ok = 1;
        for (int i = L; i < n && ok; i++)
            if (k[i] != k[i - L]) ok = 0;            //@cmp
        if (ok) return L;                            //@found
    }
    return n;                                        //@whole
}
//#end

#ifndef NO_MAIN
int main(void)
{
    printf("modinv(5,26) = %d\n", modinv(5, 26));
    printf("modinv(2,26) = %d\n", modinv(2, 26));
    printf("modinv(7,30) = %d\n", modinv(7, 30));
    printf("modinv(9,26) = %d\n", modinv(9, 26));

    int a = 0, b = 0;
    /* E(x)=5x+8: C(2)->S(18), D(3)->X(23) */
    int ok = affine_from_pairs(2, 18, 3, 23, 26, &a, &b);
    printf("affine(C>S,D>X) = %d %d %d\n", ok, a, b);
    /* C(2)->S(18), A(0)->I(8): разликата 2 не е обратима по модул 26 */
    ok = affine_from_pairs(2, 18, 0, 8, 26, &a, &b);
    printf("affine(C>S,A>I) = %d\n", ok);
    /* p1-p2 = 13 не е обратимо по модул 26 */
    ok = affine_from_pairs(13, 7, 0, 8, 26, &a, &b);
    printf("affine(N>H,A>I) = %d\n", ok);
    /* m = 30, a = 7, b = 3: x=1 -> 10, x=2 -> 17 */
    ok = affine_from_pairs(1, 10, 2, 17, 30, &a, &b);
    printf("affine30(1>10,2>17) = %d %d %d\n", ok, a, b);

    const alphabet *A = alpha_get(0);
    int p[64], c[64], k[64];
    int n = alpha_encode(A, "ATTACKATDAWN", p, 64);
    alpha_encode(A, "LXFOPVEFRNHR", c, 64);
    vig_keystream(p, c, n, 26, k);
    print_codes("vigks(ATTACKATDAWN)", A, k, n);
    printf("period(ATTACKATDAWN) = %d\n", keystream_period(k, n));
    return 0;
}
#endif
