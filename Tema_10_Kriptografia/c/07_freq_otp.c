/* Тема 10, раздел 7 — честотен анализ и еднократна лента (OTP).
 *  а) честотен анализ на моноазбучна замяна: първо предположение чрез подреждане
 *     на буквите по честота и съпоставяне с подредбата в езика (статистика, не доказателство);
 *  б) еднократна лента върху байтове: C = M XOR K, M = C XOR K;
 *     повторен ключ: C1 XOR C2 = M1 XOR M2; изменение на бит в C сменя същия бит в M.
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 07_freq_otp.c -o fo && ./fo
 */
#include "alpha.h"

//#viz ch07_rank
/* ord[r] = буквата с r-та най-голяма честота (при равенство — по-малкият код) */
void rank_letters(const int *cnt, int m, int *ord)
{
    for (int j = 0; j < m; j++) ord[j] = j;          //@init
    for (int i = 1; i < m; i++) {                    /* сортиране чрез вмъкване */ //@ins
        int v = ord[i], j = i - 1;
        while (j >= 0 && (cnt[ord[j]] < cnt[v] ||
               (cnt[ord[j]] == cnt[v] && ord[j] > v))) { //@cmp
            ord[j + 1] = ord[j]; j--;                //@shift
        }
        ord[j + 1] = v;                              //@put
    }
}
/* guess[c] = открита буква, предполагана за шифросимвола c */
void freq_guess(const int *ccnt, const int *lang_ord, int m, int *guess)
{
    int cord[30];
    rank_letters(ccnt, m, cord);                     //@rankc
    for (int r = 0; r < m; r++)                      //@match
        guess[cord[r]] = lang_ord[r];                //@map
}
//#end

//#viz ch07_otp
void xor_bytes(const unsigned char *a, const unsigned char *b, int n, unsigned char *out)
{
    for (int i = 0; i < n; i++)                      //@loop
        out[i] = a[i] ^ b[i];                        //@xor
}
//#end

#ifndef NO_MAIN
static void ref_ord(const alphabet *A, const char *ref, int *ord)
{
    int x[4096], cnt[30] = { 0 };
    int n = alpha_encode(A, ref, x, 4096);
    for (int i = 0; i < n; i++) cnt[x[i]]++;
    rank_letters(cnt, A->m, ord);
}
static void run_freq(const char *name, int bg, const char *text, const char *keyalpha)
{
    const alphabet *A = alpha_get(bg);
    int p[4096], c[4096], key[30], g[30], lo[30], cnt[30] = { 0 }, d[4096];
    int n = alpha_encode(A, text, p, 4096);
    alpha_encode(A, keyalpha, key, 30);
    for (int i = 0; i < n; i++) c[i] = key[p[i]];
    for (int i = 0; i < n; i++) cnt[c[i]]++;
    ref_ord(A, bg ? BG_REF : EN_REF, lo);
    freq_guess(cnt, lo, A->m, g);
    int right = 0;
    for (int i = 0; i < n; i++) { d[i] = g[c[i]]; right += d[i] == p[i]; }
    char lab[100];
    snprintf(lab, sizeof lab, "langord(%s)", name); print_codes(lab, A, lo, A->m);
    snprintf(lab, sizeof lab, "freqguess(%s)", name); print_codes(lab, A, d, n);
    printf("freqright(%s) = %d\n", name, right);
}
static void hex(const char *name, const unsigned char *x, int n)
{
    printf("%s = ", name);
    for (int i = 0; i < n; i++) printf("%02X", x[i]);
    printf("\n");
}
int main(void)
{
    run_freq("EN", 0, EN_SAMPLE, "QWERTYUIOPASDFGHJKLZXCVBNM");
    run_freq("BG", 1, BG_SAMPLE, "ЯВЕРТЪУИОПЮЩШАСДФГХЙКЛЗЬЦЖБНМЧ");

    /* учебният пример с 4 бита: M1=1100, M2=0011, K=1010 */
    unsigned char m1 = 0xC, m2 = 0x3, k = 0xA, c1, c2, x;
    xor_bytes(&m1, &k, 1, &c1); xor_bytes(&m2, &k, 1, &c2); xor_bytes(&c1, &c2, 1, &x);
    printf("c1 = %X\nc2 = %X\nc1^c2 = %X\nm1^m2 = %X\n", c1, c2, x, m1 ^ m2);

    const unsigned char M[] = "ATTACK AT DAWN", K[] = { 0x5B, 0x1F, 0xC2, 0x07, 0x9E, 0x33, 0x60, 0xA4, 0x11, 0xD8, 0x4E, 0x02, 0xB7, 0x6D };
    unsigned char C[14], D[14];
    xor_bytes(M, K, 14, C); xor_bytes(C, K, 14, D);
    hex("otpC", C, 14);
    printf("otpD = %.14s\n", (const char *)D);
    /* изменение: XOR на първия байт с 'A'^'R' прави от ATTACK -> RTTACK, без да знаем K */
    C[0] ^= 'A' ^ 'R';
    xor_bytes(C, K, 14, D);
    printf("otpFlip = %.14s\n", (const char *)D);
    return 0;
}
#endif
