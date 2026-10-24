/* Тема 7, раздел 7 — проектиране на решението.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 07_design.c -o design && ./design
 *
 * 1) enroll_*: записване в курс с ограничен капацитет при две или три
 *    едновременни заявки. Последователността на стъпките (график) е зададена
 *    изрично, така че преплитането е детерминирано и възпроизводимо.
 *    - check_then_act: прочитане на свободните места и проверка за дубликат,
 *      после отделен запис — проверката „на екрана“ не защитава правилото.
 *    - atomic: проверката и изменението са една неделима стъпка при запис
 *      (модел на условно изменение + уникално ограничение student/course).
 * 2) client_send / server_handle: повторна заявка след изгубен отговор,
 *    без и с идентификатор на операцията (идемпотентен ефект).
 */
#include <stdio.h>

#define MAX_REQ 3
#define MAX_ENR 8

typedef struct {
    int student;     /* кой студент записва */
    int phase;       /* 0 — още не е чел, 1 — прочел е, 2 — приключила */
    int seen_free;   /* прочетени свободни места (check_then_act) */
    int seen_dup;    /* прочетено „вече е записан“ (check_then_act) */
    int result;      /* 0 — чака, 1 — записан, -1 — няма места, -2 — дубликат */
} Req;

typedef struct {
    int free;              /* свободни места */
    int enrolled[MAX_ENR]; /* записани студенти */
    int n_enrolled;
} Course;

static int is_enrolled(const Course *c, int student)
{
    for (int i = 0; i < c->n_enrolled; i++)
        if (c->enrolled[i] == student) return 1;
    return 0;
}

//#viz ch07_race
/* Една стъпка на заявка r. atomic = 0: две отделни стъпки
   (прочитане, после запис); atomic = 1: една неделима стъпка. */
void enroll_step(Course *c, Req *r, int atomic)
{
    if (!atomic) {
        if (r->phase == 0) {                                 //@read
            r->seen_free = c->free;          /* прочитане */
            r->seen_dup = is_enrolled(c, r->student);
            r->phase = 1;
            return;
        }
        /* решение по ВЕЧЕ ОСТАРЕЛИ прочетени стойности */
        if (r->seen_dup)            r->result = -2;          //@dup
        else if (r->seen_free <= 0) r->result = -1;          //@full
        else {
            c->free = r->seen_free - 1;      /* загубено изменение */ //@write
            c->enrolled[c->n_enrolled++] = r->student;
            r->result = 1;                                   //@ok
        }
        r->phase = 2;
        return;
    }
    /* atomic: проверка и изменение — една операция при запис,
       напр. UPDATE ... SET free = free - 1 WHERE free > 0
       плюс уникално ограничение (student, course, semester) */
    if (is_enrolled(c, r->student))  r->result = -2;         //@adup
    else if (c->free <= 0)           r->result = -1;         //@afull
    else {
        c->free--;                                           //@awrite
        c->enrolled[c->n_enrolled++] = r->student;
        r->result = 1;                                       //@aok
    }
    r->phase = 2;
}
//#end

/* Изпълнява графика sched ("ABAB…"): всяка буква е следваща стъпка
   на съответната заявка; стъпки на приключила заявка се пропускат.
   Накрая незавършените заявки довършват в реда A, B, C.        */
void run_schedule(Course *c, Req r[], int nr, const char *sched, int atomic)
{
    for (const char *p = sched; *p; p++) {
        int k = *p - 'A';
        if (k < 0 || k >= nr || r[k].phase == 2) continue;
        enroll_step(c, &r[k], atomic);
    }
    for (int k = 0; k < nr; k++)
        while (r[k].phase != 2) enroll_step(c, &r[k], atomic);
}

typedef struct {
    int seen_id[16];   /* обработени идентификатори на операции */
    int saved[16];     /* запазен резултат за всеки идентификатор */
    int n_seen;
    int effects;       /* брой бизнес ефекти (записвания / плащания) */
} Server;

//#viz ch07_idem
/* Сървърът: с use_key повторение със същия op_id връща запазения
   резултат, без нов бизнес ефект.                                 */
int server_handle(Server *s, int op_id, int use_key)
{                                                            //@srv
    if (use_key)
        for (int i = 0; i < s->n_seen; i++)
            if (s->seen_id[i] == op_id)                      //@lookup
                return s->saved[i];   /* повторение */       //@replay
    s->effects++;                     /* бизнес ефект */     //@effect
    if (use_key) {
        s->seen_id[s->n_seen] = op_id;                       //@store
        s->saved[s->n_seen++] = s->effects;
    }
    return s->effects;
}

/* Клиентът: при изгубен отговор (lost[a] != 0) повтаря заявката.
   Връща номера на опита, при който е получил отговор, или -1. */
int client_send(Server *s, int op_id, const int lost[], int attempts,
                int use_key)
{
    for (int a = 0; a < attempts; a++) {                     //@send
        int resp = server_handle(s, op_id, use_key);
        if (lost[a]) continue;        /* отговорът се губи */ //@lost
        (void)resp;
        return a + 1;                                        //@got
    }
    return -1;                                               //@giveup
}
//#end

static void race_case(const char *name, int free0, const int st[], int nr,
                      const char *sched, int atomic)
{
    Course c = { .free = free0, .n_enrolled = 0 };
    Req r[MAX_REQ] = {{0}};
    for (int k = 0; k < nr; k++) r[k].student = st[k];
    run_schedule(&c, r, nr, sched, atomic);
    printf("%s = free=%d enrolled=%d res=", name, c.free, c.n_enrolled);
    for (int k = 0; k < nr; k++) printf("%s%d", k ? "," : "", r[k].result);
    printf("\n");
}

static void idem_case(const char *name, const int lost[], int attempts, int use_key)
{
    Server s = {{0}, {0}, 0, 0};
    int got = client_send(&s, 501, lost, attempts, use_key);
    printf("%s = got=%d effects=%d\n", name, got, s.effects);
}

#ifndef NO_MAIN
int main(void)
{
    const int two[] = {101, 102}, same[] = {101, 101}, three[] = {101, 102, 103};
    race_case("race(ABAB,cta)", 1, two, 2, "ABAB", 0);
    race_case("race(ABAB,atomic)", 1, two, 2, "ABAB", 1);
    race_case("race(AABB,cta)", 1, two, 2, "AABB", 0);
    race_case("race(dup,cta)", 2, same, 2, "ABAB", 0);
    race_case("race(dup,atomic)", 2, same, 2, "ABAB", 1);
    race_case("race(3,cta)", 2, three, 3, "ABCABC", 0);
    race_case("race(3,atomic)", 2, three, 3, "ABCABC", 1);

    const int l1[] = {1, 0, 0}, l2[] = {1, 1, 0}, l0[] = {0, 0, 0}, l3[] = {1, 1, 1};
    idem_case("idem(lost1,nokey)", l1, 3, 0);
    idem_case("idem(lost1,key)", l1, 3, 1);
    idem_case("idem(lost2,nokey)", l2, 3, 0);
    idem_case("idem(lost2,key)", l2, 3, 1);
    idem_case("idem(none,nokey)", l0, 3, 0);
    idem_case("idem(all,key)", l3, 3, 1);
    idem_case("idem(all,nokey)", l3, 3, 0);
    return 0;
}
#endif
