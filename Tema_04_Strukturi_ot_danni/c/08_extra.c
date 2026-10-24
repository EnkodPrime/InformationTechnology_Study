/* Тема 4, раздел 8 (извън основния обхват) — двоична min-пирамида в масив и AVL вмъкване с ротации.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 08_extra.c -o extra && ./extra
 *
 * g_swaps, g_rot — броячи за визуализацията.
 */
#include <stdio.h>
#include <stdlib.h>
#include "ops.h"

static long g_swaps, g_rot;

//#viz ch08_heap
/* Min-heap в масив, индексиране от 0: деца на i са 2i+1 и 2i+2, родител (i-1)/2.
   Форма: complete. Правило: a[родител] <= a[дете]. */
typedef struct { int a[64]; int n; } Heap;

static void hswap(int *x, int *y) { int t = *x; *x = *y; *y = t; g_swaps++; }

int heap_push(Heap *h, int x)                                /* O(log n) */
{
    if (h->n == 64) return -1;
    int i = h->n++;
    h->a[i] = x;                           /* следващата свободна позиция */  //@put
    while (i > 0) {                                          //@up
        int p = (i - 1) / 2;
        if (h->a[p] <= h->a[i]) break;     /* редът е възстановен */  //@upok
        hswap(&h->a[p], &h->a[i]);         /* изкачване */   //@upswap
        i = p;
    }
    return 0;
}
int heap_pop(Heap *h, int *out)                              /* O(log n) */
{
    if (h->n == 0) return -1;                                //@empty
    *out = h->a[0];                        /* минимумът е в корена */  //@min
    h->a[0] = h->a[--h->n];                /* последният заема корена */  //@last
    int i = 0;
    for (;;) {                                               //@down
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < h->n && h->a[l] < h->a[m]) m = l;            //@pick
        if (r < h->n && h->a[r] < h->a[m]) m = r;
        if (m == i) break;                                   //@downok
        hswap(&h->a[i], &h->a[m]);         /* спускане */    //@downswap
        i = m;
    }
    return 0;
}
//#end

//#viz ch08_avl
/* AVL: BST + |h(left) - h(right)| <= 1 във всеки възел. Височина в ребра, празно = -1. */
typedef struct A { int key, h; struct A *l, *r; } A;

static int ht(const A *t) { return t ? t->h : -1; }
static void upd(A *t) { int a = ht(t->l), b = ht(t->r); t->h = 1 + (a > b ? a : b); }
static int bf(const A *t) { return ht(t->l) - ht(t->r); }    /* balance factor */

static A *rot_right(A *y)                  /* ляво дете x се издига */
{
    A *x = y->l;                                             //@rr
    y->l = x->r;
    x->r = y;
    upd(y); upd(x); g_rot++;
    return x;
}
static A *rot_left(A *x)                   /* дясно дете y се издига */
{
    A *y = x->r;                                             //@rl
    x->r = y->l;
    y->l = x;
    upd(x); upd(y); g_rot++;
    return y;
}
A *avl_insert(A *t, int key)
{
    if (t == NULL) {                                         //@new
        A *n = malloc(sizeof *n);
        n->key = key; n->h = 0; n->l = n->r = NULL;
        return n;
    }
    if (key < t->key)      t->l = avl_insert(t->l, key);     //@goleft
    else if (key > t->key) t->r = avl_insert(t->r, key);     //@goright
    else return t;                         /* дубликат: без промяна */  //@dup
    upd(t);                                                  //@upd
    int b = bf(t);
    if (b > 1 && key < t->l->key)  return rot_right(t);                 /* ляво-ляво */  //@LL
    if (b < -1 && key > t->r->key) return rot_left(t);                  /* дясно-дясно */  //@RR
    if (b > 1)  { t->l = rot_left(t->l);  return rot_right(t); }        /* ляво-дясно */  //@LR
    if (b < -1) { t->r = rot_right(t->r); return rot_left(t); }         /* дясно-ляво */  //@RL
    return t;                                                //@ok
}
//#end

static void pre(const A *t, Out *o) { if (!t) return; out_int(o, t->key); pre(t->l, o); pre(t->r, o); }
static void ino(const A *t, Out *o) { if (!t) return; ino(t->l, o); out_int(o, t->key); ino(t->r, o); }
static void afree(A *t) { if (!t) return; afree(t->l); afree(t->r); free(t); }

static void run_heap(const char *key, const char *prog)
{
    Heap h = { {0}, 0 };
    Out o = { "" }, arr = { "" };
    Op op;
    const char *p = prog;
    int v;
    g_swaps = 0;
    while (op_next(&p, &op)) {
        if (op_is(&op, "push")) for (int i = 0; i < op.n; i++) heap_push(&h, op_int(&op, i));
        else if (op_is(&op, "pop")) { if (heap_pop(&h, &v) == 0) out_int(&o, v); else out_add(&o, "E"); }
    }
    for (int i = 0; i < h.n; i++) out_int(&arr, h.a[i]);
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s arr = %s\n", key, arr.s[0] ? arr.s : "-");
    printf("%s swaps = %ld\n", key, g_swaps);
}
static void run_avl(const char *key, const char *keys)
{
    A *t = NULL;
    Op op;
    char buf[256];
    snprintf(buf, sizeof buf, "x %s", keys);
    const char *p = buf;
    op_next(&p, &op);
    g_rot = 0;
    for (int i = 0; i < op.n; i++) t = avl_insert(t, op_int(&op, i));
    Out a = { "" }, b = { "" };
    pre(t, &a); ino(t, &b);
    printf("%s pre = %s\n", key, a.s);
    printf("%s in = %s\n", key, b.s);
    printf("%s height = %d\n", key, ht(t));
    printf("%s rot = %ld\n", key, g_rot);
    afree(t);
}

#ifndef NO_MAIN
int main(void)
{
    run_heap("h1", "push 2 7 4 10 9 8, push 1");
    run_heap("h2", "push 5 3 8 1 9 2, pop, pop, pop");
    run_heap("h3", "pop, push 4, pop, pop");
    run_heap("h4", "push 9 8 7 6 5 4 3 2 1, pop, pop, pop, pop, pop, pop, pop, pop, pop");
    run_avl("a1", "30 20 10");
    run_avl("a2", "30 10 20");
    run_avl("a3", "10 20 30");
    run_avl("a4", "10 30 20");
    run_avl("a5", "1 2 3 4 5 6 7");
    run_avl("a6", "50 20 70 10 30 25 5 1");
    return 0;
}
#endif
