/* Тема 2, раздел 2 — състояния на процеса, PCB, превключване на контекст.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 02_procesi.c -o 02_procesi && ./02_procesi
 *
 * Учебен модел на ядро с един процесор: всеки процес има PCB, готовите
 * чакат в FIFO опашка. Събитията идват като низ:
 *   t   — изтича квантът на изпълняващия се       (изпреварване)
 *   w   — изпълняващият се чака вход/изход         (блокира)
 *   dK  — входно-изходната операция на процес K завършва (прекъсване)
 *   x   — изпълняващият се завършва
 * Всяко събитие е влизане в ядрото (смяна на режим). Превключване на
 * контекст има само когато процесорът се дава на друг процес.
 */
#include <stdio.h>
#include <string.h>

#define MAXP 8

typedef enum { READY, RUNNING, BLOCKED, DONE } State;
static const char *SN[] = {"готов", "изпълнява се", "блокиран", "завършил"};

typedef struct {
    int pid;
    State state;
    int pc;              /* условен "брояч на инструкции" — пази се при превключване */
} PCB;

typedef struct {
    PCB p[MAXP];
    int n, running;      /* индекс или -1 */
    int rq[MAXP], rq_len;
    int kernel_entries, ctx_switches;
    int clock;           /* условно време: всяко събитие = 1 */
} Kernel;

static void rq_push(Kernel *k, int i) { k->rq[k->rq_len++] = i; }
static int rq_pop(Kernel *k)
{
    int i = k->rq[0];
    memmove(k->rq, k->rq + 1, (size_t)(k->rq_len - 1) * sizeof k->rq[0]);
    k->rq_len--;
    return i;
}

//#viz s02_states
/* Избира следващия готов процес (FIFO) — само ако процесорът е свободен. */
static void dispatch(Kernel *k)
{
    if (k->running >= 0 || k->rq_len == 0)               //@disp
        return;
    int i = rq_pop(k);
    k->p[i].state = RUNNING;                              //@run
    k->running = i;
    k->ctx_switches++;           /* възстановяваме контекста на i */ //@ctx
}

/* Обработка на едно събитие. Връща -1 при недопустимо събитие. */
static int on_event(Kernel *k, char ev, int target)
{
    k->kernel_entries++;         /* смяна на режим: влизаме в ядрото */ //@enter
    int r = k->running;
    if (r >= 0) k->p[r].pc = k->clock;   /* запазваме контекста */
    switch (ev) {
    case 't':                                             //@tmo
        if (r < 0) return -1;
        k->p[r].state = READY;   /* изпреварване: обратно в опашката */
        rq_push(k, r);
        k->running = -1;
        break;
    case 'w':                                             //@wait
        if (r < 0) return -1;
        k->p[r].state = BLOCKED; /* чака събитие — не е в опашката */
        k->running = -1;
        break;
    case 'd':                                             //@io
        if (target < 0 || target >= k->n || k->p[target].state != BLOCKED)
            return -1;
        k->p[target].state = READY;   /* ГОТОВ, не веднага изпълняващ се */ //@wake
        rq_push(k, target);
        break;
    case 'x':                                             //@exit
        if (r < 0) return -1;
        k->p[r].state = DONE;
        k->running = -1;
        break;
    default:
        return -1;
    }
    dispatch(k);                                          //@sched
    k->clock++;
    return 0;                    /* връщане в потребителски режим */ //@ret
}
//#end

static void init(Kernel *k, int n)
{
    memset(k, 0, sizeof *k);
    k->n = n;
    k->running = -1;
    for (int i = 0; i < n; i++) {
        k->p[i].pid = i + 1;
        k->p[i].state = READY;
        rq_push(k, i);
    }
    dispatch(k);                 /* първият процес получава процесора */
}

/* Изпълнява сценарий; връща брой недопустими събития. */
static int run(Kernel *k, int n, const char *script)
{
    init(k, n);
    int bad = 0;
    for (const char *s = script; *s; s++) {
        if (*s == ' ') continue;
        int target = -1;
        char ev = *s;
        if (ev == 'd' && s[1] >= '1' && s[1] <= '9') target = *++s - '1';
        if (on_event(k, ev, target) < 0) bad++;
    }
    return bad;
}

static void report(const char *name, int n, const char *script)
{
    Kernel k;
    int bad = run(&k, n, script);
    char st[64] = "";
    for (int i = 0; i < k.n; i++) {
        char c = "RXBD"[k.p[i].state];
        st[i] = c;
    }
    st[k.n] = '\0';
    printf("%s.kernel = %d\n", name, k.kernel_entries);
    printf("%s.ctx = %d\n", name, k.ctx_switches);
    printf("%s.bad = %d\n", name, bad);
    printf("%s.states = %s\n", name, st);
    printf("%s.running = %d\n", name, k.running >= 0 ? k.p[k.running].pid : 0);
    (void)SN;
}

#ifndef NO_MAIN
int main(void)
{
    report("s1", 3, "t w t d1 x t x x");
    report("s2", 2, "w d1 w d2 x x");
    report("s3", 3, "w w w d2 d1");
    report("s4", 2, "x x t");
    return 0;
}
#endif
