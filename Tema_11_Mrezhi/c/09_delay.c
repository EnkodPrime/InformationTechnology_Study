/* Тема 11, раздел 9 — оценки: време за предаване L/R, разпространение, RTT,
 * ефективна скорост при ограничен обем непотвърдени данни.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 09_delay.c -o 09_delay && ./09_delay
 *
 * Модел без служебни разходи, опашки и загуби. Скоростта на сигнала в средата
 * се задава (за оптика и мед обичайно се приема около 2·10^8 m/s).
 */
#include <stdio.h>

//#viz ch09_delay
typedef struct { double tx, prop, rtt, bdp, eff, util; } Est;

/* L — байтове в пакета, R — bit/s, d — метри, v — m/s,
   W — байтове, които могат да са изпратени без потвърждение. */
Est estimate(double L, double R, double d, double v, double W)
{
    Est e;
    e.tx   = L * 8 / R;                    /* време за предаване L/R */          //@tx
    e.prop = d / v;                        /* време за разпространение */       //@prop
    e.rtt  = 2 * e.prop + e.tx;            /* RTT за пакет + кратко потвърждение */  //@rtt
    e.bdp  = R * e.rtt / 8;                /* байтове „в движение“ при пълен канал */ //@bdp
    double per_rtt = W * 8 / e.rtt;        /* най-много W байта на един RTT */   //@eff
    e.eff  = per_rtt < R ? per_rtt : R;    /* не повече от капацитета */        //@eff
    e.util = e.eff / R;                                                         //@util
    return e;                                                                   //@ret
}
//#end

static void show(const char *name, double L, double R, double d, double v, double W)
{
    Est e = estimate(L, R, d, v, W);
    printf("%s = tx=%.3fus prop=%.3fus rtt=%.3fus bdp=%.1fB eff=%.3fMbit/s util=%.4f\n",
           name, e.tx * 1e6, e.prop * 1e6, e.rtt * 1e6, e.bdp, e.eff / 1e6, e.util);
}

#ifndef NO_MAIN
int main(void)
{
    show("lan", 1500, 100e6, 100, 2e8, 1500);              /* пример от ръководството: 120 us */
    show("wan", 1500, 100e6, 3000e3, 2e8, 65535);          /* 3000 km, прозорец 64 KiB */
    show("wan_small", 1500, 100e6, 3000e3, 2e8, 1500);     /* „изпрати и чакай“ */
    show("gbit", 1500, 1e9, 10000e3, 2e8, 4e6);
    show("slow", 1500, 1e6, 10, 2e8, 1500);
    return 0;
}
#endif
