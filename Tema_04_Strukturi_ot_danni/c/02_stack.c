/* Тема 4, раздел 2 — стек: динамичен масив с удвояване, проверка на скоби, постфиксен израз.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 02_stack.c -o stack && ./stack
 *
 * g_copies, g_grows са броячи за визуализацията — не са част от структурата.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ops.h"

static long g_copies, g_grows;

//#viz ch02_dyn
/* Стек върху динамичен масив. Инвариант: 0 <= size <= cap,
   елементите са в a[0..size-1], върхът е a[size-1]. */
typedef struct { int *a; int size, cap; } DStack;

static void ds_grow(DStack *s)
{
    int ncap = s->cap * 2;                       /* геометричен растеж */  //@grow
    int *b = malloc((size_t)ncap * sizeof *b);
    for (int i = 0; i < s->size; i++) {          /* Θ(size) копирания */
        b[i] = s->a[i];                                                    //@copy
        g_copies++;
    }
    free(s->a);
    s->a = b;                                                              //@swapbuf
    s->cap = ncap;
    g_grows++;
}
void ds_push(DStack *s, int x)
{
    if (s->size == s->cap)                                                 //@full
        ds_grow(s);
    s->a[s->size++] = x;                         /* Θ(1), ако има място */  //@push
}
int ds_pop(DStack *s, int *out)
{
    if (s->size == 0) return -1;                 /* договор: -1 при празен */  //@empty
    *out = s->a[--s->size];                                                //@pop
    return 0;
}
int ds_top(const DStack *s, int *out)
{
    if (s->size == 0) return -1;                                           //@empty
    *out = s->a[s->size - 1];                                              //@top
    return 0;
}
//#end

//#viz ch02_brackets
/* Проверка на скоби ( ) [ ] { }. Връща -1 при коректен низ,
   иначе позицията на първата грешка (len — незатворена отваряща). */
int check_brackets(const char *s)
{
    char st[256];
    int top = 0;                                 /* празен стек */  //@init
    int i;
    for (i = 0; s[i]; i++) {                                         //@loop
        char c = s[i];
        if (c == '(' || c == '[' || c == '{') {
            if (top == (int)sizeof st) return i; /* препълване на стека: отказ, не запис извън масива */
            st[top++] = c;                       /* push */          //@push
        } else if (c == ')' || c == ']' || c == '}') {
            char want = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (top == 0) return i;              /* няма отваряща */ //@underflow
            if (st[top - 1] != want) return i;   /* не съвпада с върха */  //@mismatch
            top--;                               /* pop */           //@pop
        }
    }
    return top == 0 ? -1 : i;                    /* в края стекът трябва да е празен */  //@end
}
//#end

//#viz ch02_postfix
/* Изчисляване на постфиксен израз, напр. "3 4 + 2 *". Цели числа.
   Връща 0 при успех; -1 при грешка (липсващ операнд, излишни, деление на 0). */
int eval_postfix(const Op *toks, long *res)
{
    long st[64];
    int top = 0;                                                     //@init
    for (int i = 0; i < toks->n; i++) {                              //@loop
        const char *t = toks->arg[i];
        if (strchr("+-*/", t[0]) && t[1] == 0) {
            if (top < 2) return -1;              /* липсва операнд */ //@underflow
            long b = st[--top];                  /* десният е отгоре */  //@popb
            long a = st[--top];                                      //@popa
            long r;
            if (t[0] == '+') r = a + b;
            else if (t[0] == '-') r = a - b;
            else if (t[0] == '*') r = a * b;
            else { if (b == 0) return -1; r = a / b; }               //@apply
            st[top++] = r;                                           //@pushr
        } else {
            st[top++] = atol(t);                 /* операнд: push */ //@push
        }
    }
    if (top != 1) return -1;                     /* точно една стойност */  //@end
    *res = st[0];                                                    //@ret
    return 0;
}
//#end

static void run_dyn(const char *key, const char *prog, int cap0)
{
    DStack s = { malloc((size_t)cap0 * sizeof(int)), 0, cap0 };
    Out o = { "" };
    Op op;
    const char *p = prog;
    g_copies = g_grows = 0;
    while (op_next(&p, &op)) {
        int v;
        if (op_is(&op, "push")) ds_push(&s, op_int(&op, 0));
        else if (op_is(&op, "pop")) { if (ds_pop(&s, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
        else if (op_is(&op, "top")) { if (ds_top(&s, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s size = %d\n", key, s.size);
    printf("%s cap = %d\n", key, s.cap);
    printf("%s copies = %ld\n", key, g_copies);
    printf("%s grows = %ld\n", key, g_grows);
    free(s.a);
}

static void run_pf(const char *key, const char *expr)
{
    Op op;
    char buf[256];
    snprintf(buf, sizeof buf, "x %s", expr);   /* всички токени като аргументи */
    const char *p = buf;
    op_next(&p, &op);
    long r = 0;
    if (eval_postfix(&op, &r) == 0) printf("%s = %ld\n", key, r);
    else printf("%s = E\n", key);
}

#ifndef NO_MAIN
int main(void)
{
    run_dyn("dyn1", "push 4, push 7, push 2, top, pop, pop", 1);
    run_dyn("dyn2", "push 1, push 2, push 3, push 4, push 5, push 6, push 7, push 8, push 9", 1);
    run_dyn("dyn3", "pop, push 5, pop, pop", 2);
    {   /* m добавяния при начален капацитет 1: копиранията са < 2m */
        DStack s = { malloc(sizeof(int)), 0, 1 };
        g_copies = g_grows = 0;
        for (int i = 0; i < 1000; i++) ds_push(&s, i);
        printf("dyn1000 copies = %ld\n", g_copies);
        printf("dyn1000 grows = %ld\n", g_grows);
        free(s.a);
    }
    const char *br[] = { "([])", "([)]", "(()", "())", "{[()()]}", "", "a(b[c]d)e" };
    for (int i = 0; i < 7; i++) printf("br(%s) = %d\n", br[i], check_brackets(br[i]));
    run_pf("pf(3 4 + 2 *)", "3 4 + 2 *");
    run_pf("pf(5 1 2 + 4 * + 3 -)", "5 1 2 + 4 * + 3 -");
    run_pf("pf(2 3 4 * +)", "2 3 4 * +");
    run_pf("pf(1 +)", "1 +");
    run_pf("pf(1 2)", "1 2");
    run_pf("pf(8 0 /)", "8 0 /");
    run_pf("pf(9 3 - 2 /)", "9 3 - 2 /");
    return 0;
}
#endif
