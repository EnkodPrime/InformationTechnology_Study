/* Тема 2, раздел 4 — състезание за данни, мютекс, семафори, производител–потребител.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 04_sinhronizacia.c -o 04_sinhronizacia && ./04_sinhronizacia
 *
 * Първата част е ДЕТЕРМИНИРАН модел на две нишки: редът на микростъпките
 * се задава с низ ("ABAB…"), за да може загубеното увеличение да се
 * възпроизведе и проследи. Последната част използва истински pthread мютекс.
 */
#include <pthread.h>
#include <stdio.h>
#include <string.h>

/* ---------------- 1. counter++ като три микростъпки ---------------- */
typedef struct {
    int pc;      /* 0 lock, 1 load, 2 add, 3 store, 4 unlock */
    int r;       /* регистър на нишката */
    int left;    /* оставащи увеличения */
} Thr;

typedef struct {
    int counter;
    int owner;   /* притежател на мютекса: -1 свободен, 0 = A, 1 = B */
    int use_mutex;
    int blocked_steps;
} Shared;

//#viz s04_race
/* Една микростъпка на нишка id. Без мютекс стъпките lock/unlock се прескачат. */
static void step(Shared *s, Thr *t, int id)
{
    switch (t->pc) {
    case 0:                                   /* lock(&m) */
        if (!s->use_mutex) { t->pc = 1; step(s, t, id); return; }
        if (s->owner >= 0) { s->blocked_steps++; return; }  //@blocked
        s->owner = id;                                       //@lock
        t->pc = 1;
        return;
    case 1: t->r = s->counter; t->pc = 2; return;            //@load
    case 2: t->r = t->r + 1;   t->pc = 3; return;            //@add
    case 3:
        s->counter = t->r;                                   //@store
        t->pc = s->use_mutex ? 4 : 0;
        if (!s->use_mutex) t->left--;
        return;
    case 4:
        s->owner = -1;                                       //@unlock
        t->pc = 0;
        t->left--;
        return;
    }
}
//#end

/* Изпълнява разписание; след края му довършва нишките, като ги редува. */
static int race(int k, int use_mutex, const char *sched, int *blocked)
{
    Shared s = {0, -1, use_mutex, 0};
    Thr t[2] = {{0, 0, k}, {0, 0, k}};
    for (const char *p = sched; *p; p++) {
        int id = (*p == 'A') ? 0 : (*p == 'B') ? 1 : -1;
        if (id < 0 || t[id].left == 0) continue;
        step(&s, &t[id], id);
    }
    /* довършване: редуваме A и B, докато и двете приключат */
    for (int guard = 0; (t[0].left > 0 || t[1].left > 0) && guard < 10000; guard++)
        for (int id = 0; id < 2; id++)
            if (t[id].left > 0) step(&s, &t[id], id);
    *blocked = s.blocked_steps;
    return s.counter;
}

/* ---------------- 2. производител–потребител ---------------- */
#define CAP_MAX 8

typedef struct {
    int buf[CAP_MAX], cap, in, out, count;
    int empty, full, mutex;      /* семафори: брояч на разрешения */
    int ppc, cpc;                /* микростъпка на P и на C */
    int next_item, produced, consumed, sum_consumed, p_blocked, c_blocked;
    int item;                    /* елемент в ръцете на P / C */
    int citem;
} PC;

//#viz s04_pc
/* wait(S): ако S == 0 — нишката е блокирана и ще опита отново. */
static int sem_wait_m(int *s)  { if (*s == 0) return 0; (*s)--; return 1; }
static void sem_signal_m(int *s) { (*s)++; }

static void producer_step(PC *q)
{
    switch (q->ppc) {
    case 0: q->item = ++q->next_item; q->ppc = 1; break;              //@pmake
    case 1: if (sem_wait_m(&q->empty)) q->ppc = 2; else q->p_blocked++; break; //@pempty
    case 2: if (sem_wait_m(&q->mutex)) q->ppc = 3; else q->p_blocked++; break; //@plock
    case 3: q->buf[q->in] = q->item;                                  //@pput
            q->in = (q->in + 1) % q->cap; q->count++; q->ppc = 4; break;
    case 4: sem_signal_m(&q->mutex); q->ppc = 5; break;               //@punlock
    case 5: sem_signal_m(&q->full); q->produced++; q->ppc = 0; break; //@pfull
    }
}

static void consumer_step(PC *q)
{
    switch (q->cpc) {
    case 0: if (sem_wait_m(&q->full)) q->cpc = 1; else q->c_blocked++; break;  //@cfull
    case 1: if (sem_wait_m(&q->mutex)) q->cpc = 2; else q->c_blocked++; break; //@clock
    case 2: q->citem = q->buf[q->out];                                //@cget
            q->out = (q->out + 1) % q->cap; q->count--; q->cpc = 3; break;
    case 3: sem_signal_m(&q->mutex); q->cpc = 4; break;               //@cunlock
    case 4: sem_signal_m(&q->empty); q->cpc = 5; break;               //@cempty
    case 5: q->consumed++; q->sum_consumed += q->citem; q->cpc = 0; break; //@cuse
    }
}
//#end

static void pc_run(int cap, const char *sched, PC *q)
{
    memset(q, 0, sizeof *q);
    q->cap = cap;
    q->empty = cap;
    q->full = 0;
    q->mutex = 1;
    for (const char *p = sched; *p; p++) {
        if (*p == 'P') producer_step(q);
        else if (*p == 'C') consumer_step(q);
    }
}

/* ---------------- 3. истински pthread мютекс ---------------- */
//#viz s04_pthread
static long counter = 0;
static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

static void *worker(void *arg)
{
    long n = *(const long *)arg;
    for (long i = 0; i < n; i++) {
        pthread_mutex_lock(&m);       /* вход в критичния участък */
        counter++;                    /* четене–изменение–запис  */
        pthread_mutex_unlock(&m);     /* изход                    */
    }
    return NULL;
}
//#end

#ifndef NO_MAIN
int main(void)
{
    int bl;
    printf("race(1,0,ABABAB) = %d\n", race(1, 0, "ABABAB", &bl));
    printf("race(1,0,AAABBB) = %d\n", race(1, 0, "AAABBB", &bl));
    printf("race(3,0,AABBAABBAB) = %d\n", race(3, 0, "AABBAABBAB", &bl));
    printf("race(1,1,ABABABABAB) = %d\n", race(1, 1, "ABABABABAB", &bl));
    printf("race(1,1,ABABABABAB).blocked = %d\n", bl);
    printf("race(3,1,AABBAABBAB) = %d\n", race(3, 1, "AABBAABBAB", &bl));
    printf("race(3,1,AABBAABBAB).blocked = %d\n", bl);

    const char *sc[] = {"PPPPPPCCCCCC", "CCPPPPPPPPPPPPPPPPPPCCCCCC", "PPPPPPPPPPPPPPPPPPPPPPPPPPPP", "PCPCPCPCPCPCPCPCPCPCPC"};
    int caps[] = {2, 2, 3, 1};
    for (int i = 0; i < 4; i++) {
        PC q;
        pc_run(caps[i], sc[i], &q);
        printf("pc%d.produced = %d\n", i, q.produced);
        printf("pc%d.consumed = %d\n", i, q.consumed);
        printf("pc%d.count = %d\n", i, q.count);
        printf("pc%d.pblocked = %d\n", i, q.p_blocked);
        printf("pc%d.cblocked = %d\n", i, q.c_blocked);
        printf("pc%d.sum = %d\n", i, q.sum_consumed);
    }

    long n = 100000;
    pthread_t a, b;
    pthread_create(&a, NULL, worker, &n);
    pthread_create(&b, NULL, worker, &n);
    pthread_join(a, NULL);
    pthread_join(b, NULL);
    printf("pthread_mutex.counter = %ld\n", counter);
    return 0;
}
#endif
