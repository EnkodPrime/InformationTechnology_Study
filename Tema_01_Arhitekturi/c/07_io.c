/* Тема 1, раздел 7 — подсистема за вход и изход: запитване, прекъсвания, DMA.
 *
 * Учебен модел с дискретно време (1 единица време = 1 стъпка на модела).
 * Устройство (напр. UART приемник) получава N байта; байт k (от 0) е готов в
 * момент (k+1)*gap и устройството (с достатъчно голям приемен буфер) го задържа, докато не бъде прочетен
 * (реален UART без FIFO би загубил байт, ако следващият пристигне преди това).
 *   - polling:   когато CPU няма друго, чете регистъра за състояние (1 единица);
 *                при готовност копира байта (copy единици). Проверките не спират,
 *                докато не дойдат всички N байта — процесорът не върши полезна работа.
 *   - interrupt: CPU върши полезна работа; при готов байт влиза в обработчик:
 *                isr единици за вход/изход от обработчика + copy за самия байт.
 *   - DMA:       CPU настройва контролера (setup единици: адрес, посока, размер),
 *                после върши полезна работа; контролерът пренася всеки байт, щом е
 *                готов; след последния — едно прекъсване (isr единици).
 * Не моделираме заемането на шината от DMA (cycle stealing), кеша и приоритетите.
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 07_io.c -o io && ./io
 */
#include <stdio.h>
#include <string.h>

#define TMAX 400
enum { C_WORK, C_POLL, C_COPY, C_ISR, C_SETUP };   /* какво прави CPU */
enum { D_NONE, D_READY, D_DMA };                   /* събитие при устройството */
typedef struct { int end, useful, polls, copies, irqs, cpu_io; } io_t;

//#viz ch07_io
io_t simulate(int mode, int N, int gap, int copy, int isr, int setup,
              int H, char *cpu, char *dev)
{
    io_t r = {0, 0, 0, 0, 0, 0};
    int got = 0;               /* байтове в паметта */
    int busy = 0, kind = C_WORK, want_copy = 0, setup_done = 0, irq = 0;
    if (mode == 2) { kind = C_SETUP; busy = setup; }              //@setup
    for (int t = 0; t < H && t < TMAX; t++) {                     //@tick
        int ready = got < N && t >= (got + 1) * gap;              //@ready
        dev[t] = (char)(t > 0 && t % gap == 0 && t / gap <= N ? D_READY : D_NONE); /* пристига байт */
        if (busy == 0) {                                          /* CPU е свободен */
            kind = C_WORK;
            if (mode == 0 && got < N) {
                if (want_copy) { kind = C_COPY; busy = copy; want_copy = 0; } //@pcopy
                else { kind = C_POLL; busy = 1; r.polls++;              //@poll
                       want_copy = ready; }                             //@poll
            } else if (mode == 1 && ready) {
                kind = C_ISR; busy = isr + copy; r.irqs++;               //@irq
            } else if (mode == 2 && irq) {
                kind = C_ISR; busy = isr; irq = 0; r.irqs++;             //@dirq
            }
        }
        if (mode == 2 && setup_done && ready) {                   /* DMA пренася */
            dev[t] = D_DMA; got++; r.copies++;                    //@dma
            if (got == N) irq = 1;          /* прекъсване "готово" */ //@dma
        }
        cpu[t] = (char)kind;
        if (kind == C_WORK) r.useful++; else r.cpu_io++;          //@acct
        if (busy > 0 && --busy == 0) {                            /* край на действие */
            if (kind == C_COPY || (kind == C_ISR && mode == 1)) { got++; r.copies++; } //@got
            if (kind == C_SETUP) setup_done = 1;
            if (r.end == 0 && got == N && (mode != 2 || kind == C_ISR)) r.end = t + 1; //@done
        }
    }
    return r;                                                     //@ret
}
//#end

#ifndef NO_MAIN
int main(void)
{
    char cpu[TMAX], dev[TMAX];
    const int C[][6] = {{4, 6, 2, 3, 4, 40}, {6, 4, 1, 2, 3, 40}, {3, 10, 2, 3, 5, 50}, {8, 3, 1, 2, 4, 40}, {2, 2, 3, 3, 2, 30}};
    for (unsigned k = 0; k < sizeof C / sizeof C[0]; k++)
        for (int m = 0; m < 3; m++) {
            io_t r = simulate(m, C[k][0], C[k][1], C[k][2], C[k][3], C[k][4], C[k][5], cpu, dev);
            printf("io(%d,%d,%d,%d,%d,%d,%d) = %d %d %d %d %d %d ", m, C[k][0], C[k][1], C[k][2], C[k][3],
                   C[k][4], C[k][5], r.end, r.useful, r.polls, r.copies, r.irqs, r.cpu_io);
            for (int t = 0; t < C[k][5]; t++) putchar("WPCIS"[(int)cpu[t]]);
            putchar(' ');
            for (int t = 0; t < C[k][5]; t++) putchar(".RD"[(int)dev[t]]);
            printf("\n");
        }
    return 0;
}
#endif
