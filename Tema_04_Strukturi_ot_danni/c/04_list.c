/* Тема 4, раздел 4 — линеен свързан списък.
 * а) едносвързан списък с начален указател head;
 * б) двусвързан кръгов списък със сентинел (служебен възел).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 04_list.c -o list && ./list
 *
 * g_cmp (сравнения на стойности) и g_hops (преходи p = p->next) са броячи за визуализацията.
 */
#include <stdio.h>
#include <stdlib.h>
#include "ops.h"

static long g_cmp, g_hops;

//#viz ch04_single
typedef struct SNode { int v; struct SNode *next; } SNode;

/* Добавяне в началото: Θ(1) */
void s_push_front(SNode **head, int x)
{
    SNode *n = malloc(sizeof *n);                            //@pf_new
    n->v = x;
    n->next = *head;                                         //@pf_link
    *head = n;                                               //@pf_head
}

/* Добавяне в края без tail: първо се търси последният — Θ(n) */
void s_push_back(SNode **head, int x)
{
    SNode *n = malloc(sizeof *n);                            //@pb_new
    n->v = x;
    n->next = NULL;
    if (*head == NULL) { *head = n; return; }                //@pb_empty
    SNode *p = *head;                                        //@pb_start
    while (p->next != NULL) { p = p->next; g_hops++; }       //@pb_walk
    p->next = n;                                             //@pb_link
}

/* Търсене по стойност: O(n). Връща указател или NULL. */
SNode *s_find(SNode *head, int x, int *index)
{
    int i = 0;
    for (SNode *p = head; p != NULL; p = p->next, i++) {     //@f_loop
        g_cmp++;
        if (p->v == x) { *index = i; return p; }             //@f_cmp
        g_hops++;
    }
    *index = -1;                                             //@f_none
    return NULL;
}

/* Вмъкване на x след първия възел със стойност key.
   Самото свързване е Θ(1); търсенето на P е O(n). */
int s_insert_after(SNode *head, int key, int x)
{
    int i;
    SNode *P = s_find(head, key, &i);                        //@ia_find
    if (P == NULL) return -1;                                //@ia_none
    SNode *X = malloc(sizeof *X);                            //@ia_new
    X->v = x;
    X->next = P->next;          /* 1) запазваме остатъка */  //@ia_1
    P->next = X;                /* 2) едва после пренасочваме P */  //@ia_2
    return 0;
}

/* Изтриване на първия възел със стойност x: нужен е предходният. */
int s_delete(SNode **head, int x)
{
    SNode *prev = NULL, *cur = *head;                        //@d_init
    while (cur != NULL) {                                    //@d_loop
        g_cmp++;
        if (cur->v == x) break;                              //@d_cmp
        prev = cur;                                          //@d_step
        cur = cur->next;
        g_hops++;
    }
    if (cur == NULL) return -1;                              //@d_none
    if (prev == NULL) *head = cur->next;   /* първи възел */ //@d_head
    else prev->next = cur->next;           /* прескачаме cur */  //@d_link
    free(cur);                     /* след free cur не се ползва */  //@d_free
    return 0;
}
//#end

//#viz ch04_wrong
/* ГРЕШЕН ред на присвояванията — само за илюстрация, не се извиква. */
void s_insert_after_WRONG(SNode *P, SNode *X)
{
    P->next = X;               /* старият P->next (Q) е загубен */  //@w_1
    X->next = P->next;         /* = X: X сочи себе си, остатъкът е недостижим */  //@w_2
}
//#end

//#viz ch04_double
/* Двусвързан кръгов списък със сентинел S:
   празен списък: S.next == S.prev == &S. Няма NULL указатели и няма специален
   случай за първи/последен/единствен възел. */
typedef struct DNode { int v; struct DNode *prev, *next; } DNode;

void d_init(DNode *S) { S->next = S->prev = S; }

/* Вмъкване на нов възел след възела a: Θ(1) */
static void d_link_after(DNode *a, int x)
{
    DNode *n = malloc(sizeof *n);                            //@dl_new
    n->v = x;
    n->prev = a;                                             //@dl_1
    n->next = a->next;                                       //@dl_2
    a->next->prev = n;                                       //@dl_3
    a->next = n;                                             //@dl_4
}
void d_push_front(DNode *S, int x) { d_link_after(S, x); }         //@dpf
void d_push_back(DNode *S, int x)  { d_link_after(S->prev, x); }   //@dpb

DNode *d_find(DNode *S, int x, int *index)
{
    int i = 0;
    for (DNode *p = S->next; p != S; p = p->next, i++) {     //@df_loop
        g_cmp++;                    /* край: връщане до S, не NULL */
        if (p->v == x) { *index = i; return p; }             //@df_cmp
        g_hops++;
    }
    *index = -1;                                             //@df_none
    return NULL;
}
int d_insert_after(DNode *S, int key, int x)
{
    int i;
    DNode *P = d_find(S, key, &i);                           //@dia_find
    if (P == NULL) return -1;
    d_link_after(P, x);
    return 0;
}
/* Откачане на известен възел X: две пренасочвания, Θ(1) */
int d_delete(DNode *S, int x)
{
    int i;
    DNode *X = d_find(S, x, &i);                             //@dd_find
    if (X == NULL) return -1;
    X->prev->next = X->next;                                 //@dd_1
    X->next->prev = X->prev;                                 //@dd_2
    free(X);                                                 //@dd_free
    return 0;
}
//#end

static void dump_s(const char *key, SNode *h, Out *o)
{
    Out l = { "" };
    for (SNode *p = h; p; p = p->next) out_int(&l, p->v);
    printf("%s out = %s\n", key, o->s[0] ? o->s : "-");
    printf("%s list = %s\n", key, l.s[0] ? l.s : "-");
    printf("%s cmp = %ld\n", key, g_cmp);
    printf("%s hops = %ld\n", key, g_hops);
}
static void run_s(const char *key, const char *prog)
{
    SNode *h = NULL;
    Out o = { "" };
    Op op;
    const char *p = prog;
    int i;
    g_cmp = g_hops = 0;
    while (op_next(&p, &op)) {
        if (op_is(&op, "pushf")) s_push_front(&h, op_int(&op, 0));
        else if (op_is(&op, "pushb")) s_push_back(&h, op_int(&op, 0));
        else if (op_is(&op, "find")) { s_find(h, op_int(&op, 0), &i); out_int(&o, i); }
        else if (op_is(&op, "ins")) { if (s_insert_after(h, op_int(&op, 0), op_int(&op, 1))) out_add(&o, "nf"); }
        else if (op_is(&op, "del")) { if (s_delete(&h, op_int(&op, 0))) out_add(&o, "nf"); }
    }
    dump_s(key, h, &o);
    while (h) { SNode *n = h->next; free(h); h = n; }
}
static void run_d(const char *key, const char *prog)
{
    DNode S;
    Out o = { "" }, l = { "" }, r = { "" };
    Op op;
    const char *p = prog;
    int i;
    d_init(&S);
    g_cmp = g_hops = 0;
    while (op_next(&p, &op)) {
        if (op_is(&op, "pushf")) d_push_front(&S, op_int(&op, 0));
        else if (op_is(&op, "pushb")) d_push_back(&S, op_int(&op, 0));
        else if (op_is(&op, "find")) { d_find(&S, op_int(&op, 0), &i); out_int(&o, i); }
        else if (op_is(&op, "ins")) { if (d_insert_after(&S, op_int(&op, 0), op_int(&op, 1))) out_add(&o, "nf"); }
        else if (op_is(&op, "del")) { if (d_delete(&S, op_int(&op, 0))) out_add(&o, "nf"); }
    }
    for (DNode *q = S.next; q != &S; q = q->next) out_int(&l, q->v);
    for (DNode *q = S.prev; q != &S; q = q->prev) out_int(&r, q->v);   /* обратна посока */
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s list = %s\n", key, l.s[0] ? l.s : "-");
    printf("%s back = %s\n", key, r.s[0] ? r.s : "-");
    printf("%s cmp = %ld\n", key, g_cmp);
    printf("%s hops = %ld\n", key, g_hops);
    while (S.next != &S) { DNode *n = S.next; S.next = n->next; free(n); }
}

#ifndef NO_MAIN
int main(void)
{
    const char *P[] = {
        "pushb 4, pushb 7, pushb 2, ins 7 5, find 2, del 4",
        "pushf 3, pushf 2, pushf 1, pushb 9, del 9, del 1, find 3",
        "del 5, find 1, pushb 1, del 1, ins 1 2, pushf 8",
        "pushb 1, pushb 2, pushb 3, pushb 4, pushb 5, ins 5 6, ins 1 0, del 3, find 6",
    };
    char k[16];
    for (int i = 0; i < 4; i++) {
        snprintf(k, sizeof k, "s%d", i + 1); run_s(k, P[i]);
        snprintf(k, sizeof k, "d%d", i + 1); run_d(k, P[i]);
    }
    (void)s_insert_after_WRONG;
    return 0;
}
#endif
