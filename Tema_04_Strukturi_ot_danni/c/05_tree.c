/* Тема 4, раздел 5 — двоично дърво: обхождания, дълбочина/височина, форми, дърво за израз.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 05_tree.c -o tree && ./tree
 *
 * Дървото се задава по нива, "-" е липсващо дете: "4 2 6 1 3" е примерът от ръководството.
 * Височина и дълбочина се броят в РЕБРА; празно дърво има височина -1.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ops.h"

typedef struct TNode { int key; struct TNode *left, *right; } TNode;

static TNode *node(int k) { TNode *n = malloc(sizeof *n); n->key = k; n->left = n->right = NULL; return n; }

/* Построяване по нива (като представянето в масив, но с пропуски "-"). */
static TNode *build_level(const Op *t)
{
    if (t->n == 0 || t->arg[0][0] == '-') return NULL;
    TNode *q[64];
    int qh = 0, qt = 0, i = 1;
    TNode *root = node(atoi(t->arg[0]));
    q[qt++] = root;
    while (qh < qt && i < t->n) {
        TNode *p = q[qh++];
        if (i < t->n) { if (t->arg[i][0] != '-') q[qt++] = p->left = node(atoi(t->arg[i])); i++; }
        if (i < t->n) { if (t->arg[i][0] != '-') q[qt++] = p->right = node(atoi(t->arg[i])); i++; }
    }
    return root;
}
static void free_tree(TNode *r) { if (!r) return; free_tree(r->left); free_tree(r->right); free(r); }

//#viz ch05_pre
/* Предреден обход: корен, ляво, дясно. Стекова памет O(h). */
void preorder(const TNode *r, Out *o)
{
    if (r == NULL) return;                                   //@null
    out_int(o, r->key);                    /* посещение */   //@visit
    preorder(r->left, o);                                    //@left
    preorder(r->right, o);                                   //@right
}
//#end

//#viz ch05_in
/* Симетричен обход: ляво, корен, дясно. */
void inorder(const TNode *r, Out *o)
{
    if (r == NULL) return;                                   //@null
    inorder(r->left, o);                                     //@left
    out_int(o, r->key);                    /* посещение */   //@visit
    inorder(r->right, o);                                    //@right
}
//#end

//#viz ch05_post
/* Следреден обход: ляво, дясно, корен. */
void postorder(const TNode *r, Out *o)
{
    if (r == NULL) return;                                   //@null
    postorder(r->left, o);                                   //@left
    postorder(r->right, o);                                  //@right
    out_int(o, r->key);                    /* посещение */   //@visit
}
//#end

//#viz ch05_level
/* Обход по нива: опашка (FIFO). Памет — според максималната ширина. */
void levelorder(TNode *r, Out *o)
{
    TNode *q[64];
    int head = 0, tail = 0;
    if (r) q[tail++] = r;                  /* enqueue(корен) */  //@init
    while (head < tail) {                                    //@loop
        TNode *p = q[head++];              /* dequeue */     //@deq
        out_int(o, p->key);                                  //@visit
        if (p->left)  q[tail++] = p->left;                   //@enql
        if (p->right) q[tail++] = p->right;                  //@enqr
    }
}
//#end

//#viz ch05_height
/* Височина в ребра: празно = -1, лист = 0. */
int height(const TNode *r)
{
    if (r == NULL) return -1;                                //@null
    int hl = height(r->left);                                //@left
    int hr = height(r->right);                               //@right
    return 1 + (hl > hr ? hl : hr);                          //@ret
}
//#end

int count(const TNode *r) { return r ? 1 + count(r->left) + count(r->right) : 0; }

//#viz ch05_shape
/* full (proper): всеки възел има 0 или 2 деца */
int is_full(const TNode *r)
{
    if (r == NULL) return 1;
    if ((r->left == NULL) != (r->right == NULL)) return 0;   //@full
    return is_full(r->left) && is_full(r->right);
}
/* complete: при обход по нива след първата празна позиция няма възли */
int is_complete(TNode *r)
{
    TNode *q[128];
    int head = 0, tail = 0, gap = 0;
    q[tail++] = r;
    while (head < tail) {
        TNode *p = q[head++];
        if (p == NULL) { gap = 1; continue; }                //@gap
        if (gap) return 0;                 /* възел след празнина */  //@complete
        q[tail++] = p->left;
        q[tail++] = p->right;
    }
    return 1;
}
/* perfect: n == 2^(h+1) - 1 */
int is_perfect(const TNode *r)
{
    int h = height(r);
    return count(r) == (1 << (h + 1)) - 1;                   //@perfect
}
//#end

//#viz ch05_expr
/* Дърво за израз от постфиксен запис: операндите са листа, операциите — вътрешни възли.
   Построяването използва стек от указатели; изчисляването е следреден обход. */
typedef struct ENode { char tok[12]; struct ENode *l, *r; } ENode;
void expr_free(ENode *e);

ENode *expr_build(const Op *t)
{
    ENode *st[64];
    int top = 0, bad = 0;
    for (int i = 0; i < t->n && !bad; i++) {
        ENode *n = calloc(1, sizeof *n);
        strncpy(n->tok, t->arg[i], sizeof n->tok - 1);
        if (strchr("+-*/", n->tok[0]) && n->tok[1] == 0) {
            if (top < 2) { free(n); bad = 1; break; }   /* липсва операнд */
            n->r = st[--top];                                //@b_r
            n->l = st[--top];                                //@b_l
        }
        st[top++] = n;                                       //@b_push
    }
    if (!bad && top == 1) return st[0];
    while (top) expr_free(st[--top]);      /* грешен запис: освобождаваме */
    return NULL;
}
long expr_eval(const ENode *e)
{
    if (e->l == NULL) return atol(e->tok);  /* лист: операнд */  //@e_leaf
    long a = expr_eval(e->l);               /* първо лявото */   //@e_left
    long b = expr_eval(e->r);               /* после дясното */  //@e_right
    switch (e->tok[0]) {                    /* накрая корена */  //@e_op
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    default:  return b ? a / b : 0;
    }
}
//#end

void expr_free(ENode *e) { if (!e) return; expr_free(e->l); expr_free(e->r); free(e); }
static void expr_pre(const ENode *e, Out *o) { if (!e) return; out_add(o, e->tok); expr_pre(e->l, o); expr_pre(e->r, o); }
static void expr_in(const ENode *e, Out *o)
{
    if (!e) return;
    if (e->l) out_add(o, "(");
    expr_in(e->l, o); out_add(o, e->tok); expr_in(e->r, o);
    if (e->l) out_add(o, ")");
}

static void run_tree(const char *key, const char *spec)
{
    char buf[512];
    snprintf(buf, sizeof buf, "t %s", spec);
    const char *p = buf;
    Op op;
    op_next(&p, &op);
    TNode *r = build_level(&op);
    Out a = { "" }, b = { "" }, c = { "" }, d = { "" };
    preorder(r, &a); inorder(r, &b); postorder(r, &c); levelorder(r, &d);
    printf("%s pre = %s\n", key, a.s[0] ? a.s : "-");
    printf("%s in = %s\n", key, b.s[0] ? b.s : "-");
    printf("%s post = %s\n", key, c.s[0] ? c.s : "-");
    printf("%s level = %s\n", key, d.s[0] ? d.s : "-");
    printf("%s height = %d\n", key, height(r));
    printf("%s n = %d\n", key, count(r));
    printf("%s full = %d\n", key, is_full(r));
    printf("%s complete = %d\n", key, is_complete(r));
    printf("%s perfect = %d\n", key, is_perfect(r));
    free_tree(r);
}
static void run_expr(const char *key, const char *postfix)
{
    char buf[256];
    snprintf(buf, sizeof buf, "e %s", postfix);
    const char *p = buf;
    Op op;
    op_next(&p, &op);
    ENode *e = expr_build(&op);
    if (!e) { printf("%s = E\n", key); return; }
    Out a = { "" }, b = { "" };
    expr_pre(e, &a); expr_in(e, &b);
    printf("%s = %ld\n", key, expr_eval(e));
    printf("%s prefix = %s\n", key, a.s);
    printf("%s infix = %s\n", key, b.s);
    expr_free(e);
}

#ifndef NO_MAIN
int main(void)
{
    run_tree("t1", "4 2 6 1 3");
    run_tree("t2", "1 2 3 4 5 6 7");
    run_tree("t3", "1 2 3 - - 4 5");            /* full, не complete */
    run_tree("t4", "1 2 3 4 5 6");              /* complete, не full */
    run_tree("t5", "1 - 2 - 3 - 4");            /* дясна верига */
    run_tree("t6", "-");                        /* празно */
    run_tree("t7", "8 3 10 1 6 - 14 - - 4 7 13");
    run_expr("ex1", "a b + c *");
    run_expr("ex2", "2 3 + 4 *");
    run_expr("ex3", "5 1 2 + 4 * + 3 -");
    run_expr("ex4", "1 +");
    return 0;
}
#endif
