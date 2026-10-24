/* Тема 2, раздел 3 — планиране на процесорното време.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 03_planirane.c -o 03_planirane && ./03_planirane
 *
 * Симулатор по единици време. Един процесор, без разход за превключване.
 * Политики: FCFS, SJF (неизпреварващ), SRTF (изпреварващ SJF), RR (квант q),
 *           PRIO (неизпреварващ; по-малко число = по-висок приоритет),
 *           PPRIO (изпреварващ по приоритет).
 * Равенства се решават по по-ранно пристигане, после по по-малък индекс.
 * RR: новопристигналите в даден момент влизат в опашката ПРЕДИ
 *     процеса, чийто квант изтича в същия момент.
 */
#include <stdio.h>
#include <string.h>

#define MAXN 10
#define MAXT 400

enum { FCFS, SJF, SRTF, RR, PRIO, PPRIO };

typedef struct { int arr, burst, prio; } Job;

typedef struct {
    int finish[MAXN], start[MAXN];
    int timeline[MAXT];        /* -1 = празен процесор */
    int T;
    int wait_sum, tat_sum, resp_sum, switches;
} Result;

/* по-добър ли е кандидат a от b за дадената политика */
static int better(int pol, const Job *j, const int *rem, int a, int b)
{
    if (b < 0) return 1;
    int ka = 0, kb = 0;
    if (pol == SJF)  { ka = j[a].burst; kb = j[b].burst; }
    if (pol == SRTF) { ka = rem[a];     kb = rem[b]; }
    if (pol == PRIO || pol == PPRIO) { ka = j[a].prio; kb = j[b].prio; }
    if (ka != kb) return ka < kb;
    if (j[a].arr != j[b].arr) return j[a].arr < j[b].arr;
    return a < b;
}

//#viz s03_sched
static void schedule(int pol, int q, const Job *j, int n, Result *R)
{
    int rem[MAXN], queue[MAXT + MAXN], qh = 0, qt = 0;   /* qt <= пристигания + 1 добавяне на единица време */
    int cur = -1, slice = 0, done = 0, t = 0, prev = -1;
    memset(R, 0, sizeof *R);
    for (int i = 0; i < n; i++) { rem[i] = j[i].burst; R->start[i] = -1; }
    while (done < n && t < MAXT) {
        for (int i = 0; i < n; i++)                     /* пристигания */
            if (j[i].arr == t) queue[qt++] = i;         //@arrive
        if (pol == RR && cur >= 0 && slice == q) {      /* изтекъл квант */
            queue[qt++] = cur;                          //@quantum
            cur = -1;
        }
        int preempt = (pol == SRTF || pol == PPRIO);
        if (cur < 0 || preempt) {                       //@pick
            int best = cur, bi = -1;
            for (int k = qh; k < qt; k++) {
                int c = queue[k];
                if (pol == FCFS || pol == RR) { if (bi < 0) { best = c; bi = k; } }
                else if (better(pol, j, rem, c, best)) { best = c; bi = k; }  //@cmp
            }
            if (bi >= 0) {
                if (cur >= 0) queue[qt++] = cur;        /* изпреварен */ //@preempt
                for (int k = bi; k > qh; k--) queue[k] = queue[k - 1];
                qh++;
                cur = best;
                slice = 0;
                if (R->start[cur] < 0) R->start[cur] = t;   //@first
            }
        }
        R->timeline[t] = cur;                           //@run
        if (cur >= 0) {
            if (prev >= 0 && prev != cur) R->switches++;
            prev = cur;
            rem[cur]--; slice++;
            if (rem[cur] == 0) {                        //@finish
                R->finish[cur] = t + 1;
                done++;
                cur = -1;
            }
        }
        t++;
    }
    R->T = t;
    for (int i = 0; i < n; i++) {
        int tat = R->finish[i] - j[i].arr;              //@metrics
        R->tat_sum  += tat;                             /* обръщане */
        R->wait_sum += tat - j[i].burst;                /* чакане   */
        R->resp_sum += R->start[i] - j[i].arr;          /* отговор  */
    }
}
//#end

/* Диаграма на Гант като низ: "A0-8 B8-12 C12-14" (празен процесор: "-"). */
static void gantt(const Result *R, char *out, size_t cap)
{
    size_t len = 0;
    out[0] = '\0';
    for (int t = 0; t < R->T;) {
        int c = R->timeline[t], s = t;
        while (t < R->T && R->timeline[t] == c) t++;
        int w = snprintf(out + len, cap - len, "%s%c%d-%d", len ? " " : "", c < 0 ? '-' : 'A' + c, s, t);
        if (w < 0 || (size_t)w >= cap - len) break;
        len += (size_t)w;
    }
}

static void report(const char *name, int pol, int q, const Job *j, int n)
{
    Result R;
    char g[1024];
    schedule(pol, q, j, n, &R);
    gantt(&R, g, sizeof g);
    printf("%s.gantt = %s\n", name, g);
    printf("%s.wait = %d\n", name, R.wait_sum);
    printf("%s.tat = %d\n", name, R.tat_sum);
    printf("%s.resp = %d\n", name, R.resp_sum);
    printf("%s.switches = %d\n", name, R.switches);
}

#ifndef NO_MAIN
int main(void)
{
    /* примерът от ръководството: A=8, B=4, C=2, всички в момент 0 */
    Job m[] = {{0, 8, 1}, {0, 4, 1}, {0, 2, 1}};
    report("m.fcfs", FCFS, 2, m, 3);
    report("m.sjf", SJF, 2, m, 3);
    report("m.rr2", RR, 2, m, 3);
    /* различни пристигания и приоритети */
    Job x[] = {{0, 7, 3}, {2, 4, 1}, {4, 1, 4}, {5, 4, 2}};
    const char *pn[] = {"fcfs", "sjf", "srtf", "rr", "prio", "pprio"};
    for (int p = FCFS; p <= PPRIO; p++) {
        char nm[32];
        snprintf(nm, sizeof nm, "x.%s", pn[p]);
        report(nm, p, 3, x, 4);
    }
    /* празен процесор в средата */
    Job g[] = {{0, 2, 1}, {5, 3, 1}};
    report("g.rr", RR, 1, g, 2);
    return 0;
}
#endif
