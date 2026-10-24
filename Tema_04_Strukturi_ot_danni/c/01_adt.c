/* Тема 4, раздел 1 — един абстрактен договор (стек), две реализации.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 01_adt.c -o adt && ./adt
 *
 * Клиентът вижда само таблицата от операции StackOps (договора).
 * Масивната и свързаната реализация изпълняват същите операции по различен начин.
 */
#include <stdio.h>
#include <stdlib.h>
#include "ops.h"

//#viz ch01_contract
/* ---- Договор (АТД): стойности + операции + поведение ---- */
typedef struct Stack Stack;
typedef struct {
    const char *name;
    Stack *(*create)(int capacity);
    int  (*push)(Stack *s, int x);        /* 0 = успех, -1 = няма място  */
    int  (*pop)(Stack *s, int *out);      /* 0 = успех, -1 = празен стек */
    int  (*top)(const Stack *s, int *out);
    int  (*empty)(const Stack *s);
    void (*destroy)(Stack *s);
} StackOps;

/* ---- Клиент: знае само договора, не и разположението в паметта ---- */
void client_step(const StackOps *ops, Stack *s, const Op *op, Out *o)
{
    int v;
    if (op_is(op, "push"))                                  //@c_push
        out_add(o, ops->push(s, op_int(op, 0)) == 0 ? "ok" : "full");
    else if (op_is(op, "pop")) {                            //@c_pop
        if (ops->pop(s, &v) == 0) out_int(o, v); else out_add(o, "E");
    } else if (op_is(op, "top")) {                          //@c_top
        if (ops->top(s, &v) == 0) out_int(o, v); else out_add(o, "E");
    } else if (op_is(op, "empty"))                          //@c_empty
        out_int(o, ops->empty(s));
}
//#end

//#viz ch01_array
/* ---- Реализация 1: масив с фиксиран капацитет ----
   Инвариант: 0 <= size <= cap; елементите са в a[0..size-1]; върхът е a[size-1] */
struct Stack { int *a; int size, cap; void *top_node; };

static Stack *arr_create(int cap)
{
    Stack *s = malloc(sizeof *s);
    s->a = malloc((size_t)cap * sizeof *s->a);
    s->size = 0; s->cap = cap; s->top_node = NULL;
    return s;
}
static int arr_push(Stack *s, int x)
{
    if (s->size == s->cap) return -1;                       //@a_full
    s->a[s->size++] = x;                                    //@a_push
    return 0;
}
static int arr_pop(Stack *s, int *out)
{
    if (s->size == 0) return -1;                            //@a_empty
    *out = s->a[--s->size];                                 //@a_pop
    return 0;
}
static int arr_top(const Stack *s, int *out)
{
    if (s->size == 0) return -1;                            //@a_empty
    *out = s->a[s->size - 1];                               //@a_top
    return 0;
}
static int arr_empty(const Stack *s) { return s->size == 0; }   //@a_isempty
static void arr_destroy(Stack *s) { free(s->a); free(s); }
//#end

//#viz ch01_list
/* ---- Реализация 2: свързани възли; върхът е първият възел ----
   Инвариант: веригата от top_node по next е редът на изваждане */
typedef struct LNode { int v; struct LNode *next; } LNode;

static Stack *lst_create(int cap)
{
    (void)cap;                    /* няма предварителен капацитет */
    Stack *s = malloc(sizeof *s);
    s->a = NULL; s->size = 0; s->cap = 0; s->top_node = NULL;
    return s;
}
static int lst_push(Stack *s, int x)
{
    LNode *n = malloc(sizeof *n);                           //@l_push
    if (!n) return -1;            /* само при изчерпана памет */
    n->v = x;
    n->next = s->top_node;                                  //@l_link
    s->top_node = n;                                        //@l_head
    return 0;
}
static int lst_pop(Stack *s, int *out)
{
    LNode *n = s->top_node;
    if (!n) return -1;                                      //@l_empty
    *out = n->v;                                            //@l_pop
    s->top_node = n->next;                                  //@l_unlink
    free(n);                                                //@l_free
    return 0;
}
static int lst_top(const Stack *s, int *out)
{
    const LNode *n = s->top_node;
    if (!n) return -1;                                      //@l_empty
    *out = n->v;                                            //@l_top
    return 0;
}
static int lst_empty(const Stack *s) { return s->top_node == NULL; }   //@l_isempty
static void lst_destroy(Stack *s)
{
    int v;
    while (lst_pop(s, &v) == 0) { }
    free(s);
}
//#end

static const StackOps ARRAY_STACK = { "array", arr_create, arr_push, arr_pop, arr_top, arr_empty, arr_destroy };
static const StackOps LIST_STACK  = { "list",  lst_create, lst_push, lst_pop, lst_top, lst_empty, lst_destroy };

static void run(const char *key, const char *prog, int cap)
{
    const StackOps *impl[2] = { &ARRAY_STACK, &LIST_STACK };
    for (int i = 0; i < 2; i++) {
        Stack *s = impl[i]->create(cap);
        Out o = { "" };
        Op op;
        const char *p = prog;
        while (op_next(&p, &op)) client_step(impl[i], s, &op, &o);
        printf("%s %s = %s\n", key, impl[i]->name, o.s);
        impl[i]->destroy(s);
    }
}

#ifndef NO_MAIN
int main(void)
{
    run("adt1", "push 4, push 7, push 2, top, pop, pop, empty", 4);
    run("adt2", "push 1, push 2, push 3, push 4, push 5, pop, empty", 3);
    run("adt3", "pop, top, empty, push 9, top, empty", 2);
    return 0;
}
#endif
