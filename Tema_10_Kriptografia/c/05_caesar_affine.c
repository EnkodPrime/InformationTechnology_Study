/* Тема 10, раздел 5 — Цезарово, моноазбучно и афинно заместване.
 *   Цезар:    E_k(x) = (x + k) mod m,     D_k(y) = (y - k) mod m
 *   Моноазбучно: ключът е пермутация на азбуката (m! ключа)
 *   Афинен:   E(x) = (a x + b) mod m,     D(y) = a^-1 (y - b) mod m, НОД(a, m) = 1
 * m = 26 (латиница) или 30 (българска азбука).
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 05_caesar_affine.c -o sub && ./sub
 */
#include "alpha.h"

//#viz ch05_caesar
void caesar_encrypt(const int *p, int n, int k, int m, int *c)
{
    for (int i = 0; i < n; i++)                      //@loop
        c[i] = mod(p[i] + k, m);                     //@enc
}
void caesar_decrypt(const int *c, int n, int k, int m, int *p)
{
    for (int i = 0; i < n; i++)                      //@dloop
        p[i] = mod(c[i] - k, m);                     //@dec
}
//#end

//#viz ch05_brute
/* Грубо изчерпване: пробваме всички m измествания и оценяваме кандидата
   с хи-квадрат спрямо очакваните честоти exp[] (по-малко = по-близо до езика) */
double chi2(const int *x, int n, int m, const double *exp)
{
    int cnt[30] = { 0 };
    for (int i = 0; i < n; i++) cnt[x[i]]++;         //@hist
    double s = 0;
    for (int j = 0; j < m; j++) {
        double e = exp[j] * n;
        if (e > 0) s += (cnt[j] - e) * (cnt[j] - e) / e; //@chi
    }
    return s;
}
int caesar_bruteforce(const int *c, int n, int m, const double *exp, int *tmp)
{
    int best = 0; double bestS = 1e300;
    for (int k = 0; k < m; k++) {                    //@try
        caesar_decrypt(c, n, k, m, tmp);             //@cand
        double s = chi2(tmp, n, m, exp);             //@score
        if (s < bestS) { bestS = s; best = k; }      //@best
    }
    return best;                                     //@ret
}
//#end

//#viz ch05_mono
/* key[x] = кодът, в който се превръща буквата x; inv е обратната пермутация */
int mono_invert(const int *key, int m, int *inv)
{
    for (int j = 0; j < m; j++) inv[j] = -1;
    for (int x = 0; x < m; x++) {                    //@inv
        if (inv[key[x]] >= 0) return 0;  /* не е пермутация */ //@bad
        inv[key[x]] = x;                             //@inv
    }
    return 1;
}
void mono_apply(const int *tab, const int *in, int n, int *out)
{
    for (int i = 0; i < n; i++)                      //@loop
        out[i] = tab[in[i]];                         //@map
}
//#end

//#viz ch05_affine
int affine_encrypt(const int *p, int n, int a, int b, int m, int *c)
{
    if (gcd_int(a, m) != 1) return 0;                //@check
    for (int i = 0; i < n; i++)                      //@loop
        c[i] = mod(a * p[i] + b, m);                 //@enc
    return 1;
}
int affine_decrypt(const int *c, int n, int a, int b, int m, int *p)
{
    int ai = -1;
    for (int t = 1; t < m; t++)                      //@search
        if (mod(a * t, m) == 1) { ai = t; break; }   //@found
    if (ai < 0) return 0;  /* няма обратен елемент */ //@noinv
    for (int i = 0; i < n; i++)                      //@dloop
        p[i] = mod(ai * (c[i] - b), m);              //@dec
    return 1;
}
//#end

#ifndef NO_MAIN
/* честоти от референтния текст (същото правят JS функциите) */
static void ref_freq(const alphabet *A, const char *ref, double *f)
{
    int x[4096], cnt[30] = { 0 };
    int n = alpha_encode(A, ref, x, 4096);
    for (int i = 0; i < n; i++) cnt[x[i]]++;
    for (int j = 0; j < A->m; j++) f[j] = (double)cnt[j] / n;
}
static void run_caesar(const char *name, int bg, const char *text, int k)
{
    const alphabet *A = alpha_get(bg);
    int p[4096], c[4096], d[4096]; char lab[200];
    int n = alpha_encode(A, text, p, 4096);
    caesar_encrypt(p, n, k, A->m, c);
    caesar_decrypt(c, n, k, A->m, d);
    snprintf(lab, sizeof lab, "caesar%d(%s)", k, name); print_codes(lab, A, c, n);
    snprintf(lab, sizeof lab, "caesardec%d(%s)", k, name); print_codes(lab, A, d, n);
}
static void run_brute(const char *name, int bg, const char *text, int k)
{
    const alphabet *A = alpha_get(bg);
    int p[4096], c[4096], t[4096]; double f[30];
    ref_freq(A, bg ? BG_REF : EN_REF, f);
    int n = alpha_encode(A, text, p, 4096);
    caesar_encrypt(p, n, k, A->m, c);
    printf("brute%d(%s) = %d\n", k, name, caesar_bruteforce(c, n, A->m, f, t));
    caesar_decrypt(c, n, k, A->m, t);
    printf("chi2true%d(%s) = %.3f\n", k, name, chi2(t, n, A->m, f));
}
static void run_affine(const char *name, int bg, const char *text, int a, int b)
{
    const alphabet *A = alpha_get(bg);
    int p[4096], c[4096], d[4096]; char lab[200];
    int n = alpha_encode(A, text, p, 4096);
    int ok = affine_encrypt(p, n, a, b, A->m, c);
    snprintf(lab, sizeof lab, "affine%d_%d(%s)", a, b, name);
    if (!ok) { printf("%s = invalid\n", lab); return; }
    print_codes(lab, A, c, n);
    affine_decrypt(c, n, a, b, A->m, d);
    snprintf(lab, sizeof lab, "affinedec%d_%d(%s)", a, b, name); print_codes(lab, A, d, n);
}
int main(void)
{
    run_caesar("ATTACK", 0, "ATTACK", 3);
    run_caesar("XYZ", 0, "XYZ", 3);
    run_caesar("ATTACKATDAWN", 0, "ATTACKATDAWN", 25);
    run_caesar("BG", 1, "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 3);
    run_caesar("BGYA", 1, "ЮЯ", 3);

    run_brute("EN", 0, EN_SAMPLE, 7);
    run_brute("EN", 0, EN_SAMPLE, 19);
    run_brute("BG", 1, BG_SAMPLE, 11);
    run_brute("SHORT", 0, "ATTACK", 3);

    const alphabet *A = alpha_get(0);
    /* ключ = азбука, записана от ключова дума: ZEBRAS... (класически пример) */
    int key[26] = { 0 }, inv[26] = { 0 }, p[64] = { 0 }, c[64] = { 0 }, d[64] = { 0 };
    int kn = alpha_encode(A, "ZEBRASCDFGHIJKLMNOPQTUVWXY", key, 26);
    printf("monovalid = %d\n", kn == 26 && mono_invert(key, 26, inv));
    int n = alpha_encode(A, "ATTACKATDAWN", p, 64);
    mono_apply(key, p, n, c); print_codes("mono(ATTACKATDAWN)", A, c, n);
    mono_apply(inv, c, n, d); print_codes("monodec(ATTACKATDAWN)", A, d, n);
    alpha_encode(A, "ZEBRASCDFGHIJKLMNOPQTUVWXZ", key, 26);
    printf("monobad = %d\n", mono_invert(key, 26, inv));

    run_affine("C", 0, "C", 5, 8);
    run_affine("ATTACKATDAWN", 0, "ATTACKATDAWN", 5, 8);
    run_affine("ATTACKATDAWN", 0, "ATTACKATDAWN", 2, 3);
    run_affine("BG", 1, "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 7, 3);
    run_affine("BG", 1, "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 5, 1);
    return 0;
}
#endif
