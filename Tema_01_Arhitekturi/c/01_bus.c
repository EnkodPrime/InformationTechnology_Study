/* Тема 1, раздел 1 — фон Нойман и Харвард: колко такта отнемат достъпите до паметта.
 *
 * Учебен модел (условията, при които сметката е валидна):
 *   - всяка инструкция се извлича с ЕДНА транзакция по шина (F);
 *   - LOAD/STORE правят още ЕДНА транзакция за данни (D) в такта след извличането си;
 *   - една транзакция заема шината точно 1 такт; изпълнението в АЛУ не се брои отделно;
 *   - фон Нойман: една обща шина -> F и D не могат да са в един такт;
 *   - Харвард: отделни шини за инструкции и данни -> F на следващата и D на текущата
 *     могат да се случат в един и същи такт.
 * Реален процесор има кешове, конвейер и чакания — моделът показва само конфликта за пътя.
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 01_bus.c -o bus && ./bus
 */
#include <stdio.h>
#include <string.h>

//#viz ch01_bus
/* prog[i] == 'L' или 'S' -> инструкцията има достъп до данни; 'A' -> няма. */
typedef struct { int cycles, fetches, data, conflicts; } bus_stats_t;

bus_stats_t run_bus(const char *prog, int harvard)
{
    bus_stats_t st = {0, 0, 0, 0};
    int n = (int)strlen(prog), next = 0;   /* следваща за извличане */  //@init
    int pending = -1;                       /* чакащ достъп до данни */
    while (next < n || pending >= 0) {                        //@loop
        st.cycles++;                                          //@tick
        int data_bus_busy = 0;
        if (pending >= 0) {                                   //@dchk
            st.data++;                 /* D: транзакция за данни */ //@data
            data_bus_busy = 1;
            pending = -1;
        }
        int fetch_bus_busy = harvard ? 0 : data_bus_busy;     //@share
        if (next < n && !fetch_bus_busy) {                    //@fchk
            st.fetches++;              /* F: извличане на инструкция */ //@fetch
            if (prog[next] == 'L' || prog[next] == 'S')
                pending = next;                               //@needd
            next++;
        } else if (next < n) {
            st.conflicts++;            /* F чака: шината е заета */  //@conf
        }
    }
    return st;                                                //@ret
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const char *P[] = {"LAAS", "AAAA", "LLLL", "LASALASA", "L", "SALSAL"};
    for (unsigned i = 0; i < sizeof P / sizeof P[0]; i++)
        for (int hv = 0; hv <= 1; hv++) {
            bus_stats_t s = run_bus(P[i], hv);
            printf("%s(%s) = %d %d %d %d\n", hv ? "harvard" : "vonneumann", P[i],
                   s.cycles, s.fetches, s.data, s.conflicts);
        }
    return 0;
}
#endif
