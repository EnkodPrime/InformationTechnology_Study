/* Тема 10, раздел 6 — полиазбучна замяна: шифър на Виженер и анализът му.
 *   c_i = (p_i + k_{i mod L}) mod m,   p_i = (c_i - k_{i mod L}) mod m
 * Анализ: метод на Касиски (разстояния между повторени тройки), индекс на съвпадение
 * по колони за всеки кандидат-период L и после Цезаров хи-квадрат по всяка колона.
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 06_vigenere.c -o vig && ./vig
 */
#include "alpha.h"

//#viz ch06_vig
void vig_encrypt(const int *p, int n, const int *k, int L, int m, int *c)
{
    for (int i = 0; i < n; i++)                      //@loop
        c[i] = mod(p[i] + k[i % L], m);              //@enc
}
void vig_decrypt(const int *c, int n, const int *k, int L, int m, int *p)
{
    for (int i = 0; i < n; i++)                      //@dloop
        p[i] = mod(c[i] - k[i % L], m);              //@dec
}
//#end

//#viz ch06_kasiski
/* Касиски: за всяка тройка, която се повтаря, записваме разстоянието до
   предишната ѝ поява; периодът обикновено дели повечето разстояния */
int kasiski(const int *c, int n, int *dist, int cap)
{
    int nd = 0;
    for (int i = 0; i + 2 < n; i++)                  //@outer
        for (int j = i + 1; j + 2 < n; j++)          //@inner
            if (c[i] == c[j] && c[i + 1] == c[j + 1] && c[i + 2] == c[j + 2]) { //@match
                if (nd < cap) dist[nd++] = j - i;    //@rec
                break;  /* само най-близкото повторение */
            }
    return nd;
}
/* за всеки делител d = 2..maxL: колко от разстоянията дели */
void kasiski_votes(const int *dist, int nd, int maxL, int *votes)
{
    for (int d = 2; d <= maxL; d++) {                //@vote
        votes[d] = 0;
        for (int t = 0; t < nd; t++)
            if (dist[t] % d == 0) votes[d]++;        //@div
    }
}
//#end

//#viz ch06_ic
/* Индекс на съвпадение: вероятност два случайно избрани символа да са еднакви */
double ic(const int *x, int n, int step, int start, int m)
{
    int cnt[30] = { 0 }, len = 0;
    for (int i = start; i < n; i += step) { cnt[x[i]]++; len++; } //@count
    if (len < 2) return 0;
    double s = 0;
    for (int j = 0; j < m; j++) s += (double)cnt[j] * (cnt[j] - 1); //@sum
    return s / ((double)len * (len - 1));            //@ret
}
/* среден IC по колоните при период L */
double ic_period(const int *c, int n, int L, int m)
{
    double s = 0;
    for (int r = 0; r < L; r++) s += ic(c, n, L, r, m); //@col
    return s / L;                                    //@avg
}
//#end

//#viz ch06_crack
/* При известен период L всяка колона е Цезар: избираме изместването с
   най-малък хи-квадрат спрямо очакваните честоти exp[] */
void vig_crack(const int *c, int n, int L, int m, const double *exp, int *key)
{
    for (int r = 0; r < L; r++) {                    //@col
        int cnt[30] = { 0 }, len = 0;
        for (int i = r; i < n; i += L) { cnt[c[i]]++; len++; } //@hist
        double best = 1e300;
        for (int k = 0; k < m; k++) {                //@shift
            double s = 0;
            for (int j = 0; j < m; j++) {
                double e = exp[j] * len;
                int o = cnt[mod(j + k, m)];          /* буква j се вижда като j+k */
                if (e > 0) s += (o - e) * (o - e) / e; //@chi
            }
            if (s < best) { best = s; key[r] = k; }  //@best
        }
    }
}
//#end

#ifndef NO_MAIN
static void ref_freq(const alphabet *A, const char *ref, double *f)
{
    int x[4096], cnt[30] = { 0 };
    int n = alpha_encode(A, ref, x, 4096);
    for (int i = 0; i < n; i++) cnt[x[i]]++;
    for (int j = 0; j < A->m; j++) f[j] = (double)cnt[j] / n;
}
static void run(const char *name, int bg, const char *text, const char *keyw, int analyse)
{
    const alphabet *A = alpha_get(bg);
    int p[4096], c[4096], d[4096], k[64]; char lab[200];
    int n = alpha_encode(A, text, p, 4096), L = alpha_encode(A, keyw, k, 64);
    vig_encrypt(p, n, k, L, A->m, c);
    vig_decrypt(c, n, k, L, A->m, d);
    snprintf(lab, sizeof lab, "vig(%s)", name); print_codes(lab, A, c, n);
    snprintf(lab, sizeof lab, "vigdec(%s)", name); print_codes(lab, A, d, n);
    if (!analyse) return;
    int dist[512], votes[21];
    int nd = kasiski(c, n, dist, 512);
    printf("kasN(%s) = %d\n", name, nd);
    printf("kas(%s) =", name);
    for (int t = 0; t < nd && t < 12; t++) printf(" %d", dist[t]);
    printf("\n");
    kasiski_votes(dist, nd, 20, votes);
    printf("votes(%s) =", name);
    for (int dd = 2; dd <= 12; dd++) printf(" %d", votes[dd]);
    printf("\n");
    printf("ic(%s) =", name);
    for (int LL = 1; LL <= 10; LL++) printf(" %.4f", ic_period(c, n, LL, A->m));
    printf("\n");
    double f[30]; int key[64];
    ref_freq(A, bg ? BG_REF : EN_REF, f);
    vig_crack(c, n, L, A->m, f, key);
    snprintf(lab, sizeof lab, "crack(%s)", name); print_codes(lab, A, key, L);
}
int main(void)
{
    run("ATTACKATDAWN", 0, "ATTACKATDAWN", "LEMON", 0);
    run("EN", 0, EN_SAMPLE, "LEMON", 1);
    run("EN7", 0, EN_SAMPLE, "FIRMWARE", 1);
    run("BG", 1, BG_SAMPLE, "КЛЮЧ", 1);
    return 0;
}
#endif
