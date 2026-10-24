/* Тема 4, раздел 3 — опашка: кръгов буфер (head + size), вариант с head/tail и празна клетка,
 * свързана опашка с front/rear, дек върху кръгов буфер.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 03_queue.c -o queue && ./queue
 */
#include <stdio.h>
#include <stdlib.h>
#include "ops.h"

#define QMAX 16

//#viz ch03_ring
/* Кръгов буфер: капацитет C, начало head, брой size.
   Празно: size == 0.  Пълно: size == C.  Следващ запис: (head + size) mod C. */
typedef struct { int a[QMAX]; int C, head, size; int overwrite; } Ring;

int ring_enqueue(Ring *q, int x)
{
    if (q->size == q->C) {                                   //@full
        if (!q->overwrite) return -1;          /* политика: отказ */  //@reject
        q->head = (q->head + 1) % q->C;        /* политика: изтриваме най-стария */  //@drop
        q->size--;
    }
    int tail = (q->head + q->size) % q->C;                   //@tail
    q->a[tail] = x;                                          //@write
    q->size++;
    return 0;
}
int ring_dequeue(Ring *q, int *out)
{
    if (q->size == 0) return -1;                             //@empty
    *out = q->a[q->head];                                    //@read
    q->head = (q->head + 1) % q->C;                          //@advance
    q->size--;
    return 0;
}
int ring_front(const Ring *q, int *out)
{
    if (q->size == 0) return -1;                             //@empty
    *out = q->a[q->head];                                    //@front
    return 0;
}
//#end

//#viz ch03_ring2
/* Вариант само с два индекса: head (първи) и tail (следващ запис).
   head == tail би значело и „празно“, и „пълно“ — затова една клетка
   остава винаги неизползвана: полезният капацитет е C - 1. */
typedef struct { int a[QMAX]; int C, head, tail; } Ring2;

int ring2_empty(const Ring2 *q) { return q->head == q->tail; }               //@isempty
int ring2_full(const Ring2 *q)  { return (q->tail + 1) % q->C == q->head; }  //@isfull

int ring2_enqueue(Ring2 *q, int x)
{
    if (ring2_full(q)) return -1;                            //@full
    q->a[q->tail] = x;                                       //@write
    q->tail = (q->tail + 1) % q->C;                          //@advt
    return 0;
}
int ring2_dequeue(Ring2 *q, int *out)
{
    if (ring2_empty(q)) return -1;                           //@empty
    *out = q->a[q->head];                                    //@read
    q->head = (q->head + 1) % q->C;                          //@advh
    return 0;
}
//#end

//#viz ch03_linked
/* Свързана опашка: указатели към първия (front) и последния (rear) възел. */
typedef struct QNode { int v; struct QNode *next; } QNode;
typedef struct { QNode *front, *rear; } LQueue;

void lq_enqueue(LQueue *q, int x)
{
    QNode *n = malloc(sizeof *n);                            //@new
    n->v = x;
    n->next = NULL;
    if (q->rear == NULL)                                     //@isempty
        q->front = n;                  /* първи елемент */    //@first
    else
        q->rear->next = n;             /* закачаме в края */  //@link
    q->rear = n;                                             //@rear
}
int lq_dequeue(LQueue *q, int *out)
{
    QNode *n = q->front;
    if (n == NULL) return -1;                                //@empty
    *out = n->v;                                             //@read
    q->front = n->next;                                      //@unlink
    if (q->front == NULL)              /* опашката стана празна */
        q->rear = NULL;                                      //@clearrear
    free(n);                                                 //@free
    return 0;
}
//#end

//#viz ch03_deque
/* Дек (double-ended queue) върху кръгов буфер: добавяне и премахване в двата края. */
typedef struct { int a[QMAX]; int C, head, size; } Deque;

int dq_push_back(Deque *d, int x)
{
    if (d->size == d->C) return -1;                          //@full
    d->a[(d->head + d->size) % d->C] = x;                    //@pb
    d->size++;
    return 0;
}
int dq_push_front(Deque *d, int x)
{
    if (d->size == d->C) return -1;                          //@full
    d->head = (d->head - 1 + d->C) % d->C;   /* назад с прехвърляне */  //@pf
    d->a[d->head] = x;
    d->size++;
    return 0;
}
int dq_pop_front(Deque *d, int *out)
{
    if (d->size == 0) return -1;                             //@empty
    *out = d->a[d->head];                                    //@popf
    d->head = (d->head + 1) % d->C;
    d->size--;
    return 0;
}
int dq_pop_back(Deque *d, int *out)
{
    if (d->size == 0) return -1;                             //@empty
    *out = d->a[(d->head + d->size - 1) % d->C];             //@popb
    d->size--;
    return 0;
}
//#end

static void run_ring(const char *key, const char *prog, int C, int head0, int ow)
{
    Ring q = { {0}, C, head0, 0, ow };
    Out o = { "" };
    Op op;
    const char *p = prog;
    int v;
    while (op_next(&p, &op)) {
        if (op_is(&op, "enq")) { if (ring_enqueue(&q, op_int(&op, 0))) out_add(&o, "full"); }
        else if (op_is(&op, "deq")) { if (ring_dequeue(&q, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
        else if (op_is(&op, "front")) { if (ring_front(&q, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s head = %d\n", key, q.head);
    printf("%s size = %d\n", key, q.size);
}
static void run_ring2(const char *key, const char *prog, int C)
{
    Ring2 q = { {0}, C, 0, 0 };
    Out o = { "" };
    Op op;
    const char *p = prog;
    int v;
    while (op_next(&p, &op)) {
        if (op_is(&op, "enq")) { if (ring2_enqueue(&q, op_int(&op, 0))) out_add(&o, "full"); }
        else if (op_is(&op, "deq")) { if (ring2_dequeue(&q, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s head = %d\n", key, q.head);
    printf("%s tail = %d\n", key, q.tail);
}
static void run_lq(const char *key, const char *prog)
{
    LQueue q = { NULL, NULL };
    Out o = { "" };
    Op op;
    const char *p = prog;
    int v, n = 0;
    while (op_next(&p, &op)) {
        if (op_is(&op, "enq")) lq_enqueue(&q, op_int(&op, 0));
        else if (op_is(&op, "deq")) { if (lq_dequeue(&q, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    for (QNode *x = q.front; x; x = x->next) n++;
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s len = %d\n", key, n);
    printf("%s rear_null = %d\n", key, q.rear == NULL);
    while (lq_dequeue(&q, &v) == 0) { }
}
static void run_dq(const char *key, const char *prog, int C)
{
    Deque d = { {0}, C, 0, 0 };
    Out o = { "" };
    Op op;
    const char *p = prog;
    int v;
    while (op_next(&p, &op)) {
        if (op_is(&op, "pushb")) { if (dq_push_back(&d, op_int(&op, 0))) out_add(&o, "full"); }
        else if (op_is(&op, "pushf")) { if (dq_push_front(&d, op_int(&op, 0))) out_add(&o, "full"); }
        else if (op_is(&op, "popf")) { if (dq_pop_front(&d, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
        else if (op_is(&op, "popb")) { if (dq_pop_back(&d, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s head = %d\n", key, d.head);
    printf("%s size = %d\n", key, d.size);
}

#ifndef NO_MAIN
int main(void)
{
    run_ring("r1", "enq 4, enq 7, enq 2, deq, front", 6, 0, 0);
    run_ring("r2", "enq 1, enq 2, enq 3, enq 4, deq, deq, deq, enq 5, enq 6, enq 7, enq 8, enq 9", 6, 3, 0);
    run_ring("r3", "enq 1, enq 2, enq 3, enq 4, enq 5, deq, deq", 4, 0, 1);
    run_ring("r4", "deq, front, enq 9, deq, deq", 3, 2, 0);
    run_ring2("q1", "enq 1, enq 2, enq 3, enq 4, deq, enq 5, enq 6", 4);
    run_ring2("q2", "deq, enq 7, deq, deq", 5);
    run_lq("l1", "enq 4, enq 7, enq 2, deq, deq");
    run_lq("l2", "enq 1, deq, deq, enq 5");
    run_dq("d1", "pushb 1, pushb 2, pushf 0, pushf 9, popb, popf, popf", 5);
    run_dq("d2", "pushf 1, pushf 2, pushf 3, pushf 4, pushb 5, popb, popb", 4);
    return 0;
}
#endif
