/* Тема 1, раздел 8 — производителност и ограничения на паралелизма.
 *   a) T = брой инструкции * среден CPI * период на такта (= IC * CPI / f).
 *   b) Закон на Амдал: S(p) = 1 / ((1 - f) + f / p) при фиксиран размер на задачата.
 *   c) Същото с добавен разход за синхронизация c*(p-1) (учебно допускане, не е
 *      част от формулата на Амдал) — показва, че ускорението може да намалее.
 *   d) Ред на байтовете (little / big endian) — допълнение извън конспекта.
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 08_perf.c -o perf -lm && ./perf
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

//#viz ch08_cpu_time
/* ic — брой инструкции; cpi — среден брой тактове; f_hz — тактова честота */
double cpu_time(double ic, double cpi, double f_hz)
{
    double cycles = ic * cpi;            /* общо тактове */      //@cycles
    double period = 1.0 / f_hz;          /* период на такта, s */ //@period
    return cycles * period;                                      //@time
}
//#end

//#viz ch08_amdahl
/* f — паралелизируемата част от времето (0..1), p — брой еднакви изпълнители,
   c — допълнителен разход на изпълнител (дял от T1); c = 0 -> чист Амдал. */
double amdahl(double f, int p, double c)
{
    double serial = 1.0 - f;                                     //@serial
    double par = f / p;                                          //@par
    double over = c * (p - 1);                                   //@over
    return 1.0 / (serial + par + over);                          //@speed
}
//#end

//#viz ch08_endian
/* Байтовете на 32-битова стойност по нарастващи адреси. */
void to_bytes(uint32_t v, int big, uint8_t out[4])
{
    for (int i = 0; i < 4; i++) {                                //@loop
        int shift = big ? 8 * (3 - i) : 8 * i;                   //@shift
        out[i] = (uint8_t)(v >> shift);                          //@byte
    }
}

/* Как подрежда байтовете тази машина: копираме паметта на uint32_t. */
int host_is_little(void)
{
    uint32_t x = 0x01020304u;
    uint8_t b[4];
    memcpy(b, &x, 4);                                            //@host
    return b[0] == 0x04;                                         //@host
}
//#end

#ifndef NO_MAIN
int main(void)
{
    printf("cpu_time(1e9,2,2e9) = %.4f\n", cpu_time(1e9, 2, 2e9));
    printf("cpu_time(5e8,5,2e9) = %.4f\n", cpu_time(5e8, 5, 2e9));
    printf("cpu_time(2e9,1.2,3e9) = %.4f\n", cpu_time(2e9, 1.2, 3e9));
    const double F[] = {0.5, 0.8, 0.9, 0.95, 0.99};
    const int P[] = {1, 2, 4, 8, 16, 64, 1024};
    for (int i = 0; i < 5; i++)
        for (int j = 0; j < 7; j++)
            printf("amdahl(%.2f,%d) = %.4f\n", F[i], P[j], amdahl(F[i], P[j], 0));
    for (int j = 0; j < 7; j++) printf("amdahl_c(0.90,%d,0.01) = %.4f\n", P[j], amdahl(0.9, P[j], 0.01));
    const uint32_t V[] = {0x12345678u, 0xDEADBEEFu, 1u};
    for (int k = 0; k < 3; k++)
        for (int big = 0; big <= 1; big++) {
            uint8_t b[4];
            to_bytes(V[k], big, b);
            printf("bytes(%08X,%s) = %02X %02X %02X %02X\n", (unsigned)V[k], big ? "big" : "little", b[0], b[1], b[2], b[3]);
        }
    printf("host_little = %d\n", host_is_little());
    return 0;
}
#endif
