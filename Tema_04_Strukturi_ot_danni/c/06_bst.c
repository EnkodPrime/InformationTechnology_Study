/* Тема 4, раздел 6 — двоично дърво за търсене (BST): търсене, вмъкване, изтриване (трите случая),
 * минимум/максимум, височина. Политика за равни ключове: дубликат не се вмъква.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 06_bst.c -o bst && ./bst
 *
 * g_cmp брои сравненията на ключове (key < r->key и key == r->key се броят поотделно)
 * — само за визуализацията.
 */
#include <stdio.h>
#include <stdlib.h>
#include "ops.h"

static long g_cmp;

typedef struct BNode { int key; struct BNode *left, *right; } BNode;

//#viz ch06_bst
/* Търсене: на всяка стъпка инвариантът изключва цяло поддърво. O(h). */
BNode *bst_search(BNode *r, int key, int *depth)
{
    *depth = 0;
    while (r != NULL) {                                      //@s_loop
        g_cmp++;
        if (key == r->key) return r;                         //@s_eq
        g_cmp++;
        if (key < r->key) r = r->left;     /* дясното отпада */  //@s_left
        else              r = r->right;    /* лявото отпада */   //@s_right
        (*depth)++;
    }
    return NULL;                                             //@s_none
}

/* Вмъкване: същият път като търсенето до празна позиция. O(h). */
int bst_insert(BNode **link, int key)
{
    while (*link != NULL) {                                  //@i_loop
        BNode *r = *link;
        g_cmp++;
        if (key == r->key) return -1;      /* дубликат: политика — отказ */  //@i_dup
        g_cmp++;
        link = key < r->key ? &r->left : &r->right;          //@i_go
    }
    BNode *n = malloc(sizeof *n);                            //@i_new
    n->key = key;
    n->left = n->right = NULL;
    *link = n;                             /* закачаме на празното място */  //@i_link
    return 0;
}

/* Изтриване — три случая. Работим с адреса на връзката (link), която сочи възела,
   за да не се налага отделен случай за корена. */
int bst_delete(BNode **link, int key)
{
    while (*link != NULL && (*link)->key != key) {           //@d_find
        g_cmp += 2;
        link = key < (*link)->key ? &(*link)->left : &(*link)->right;
    }
    if (*link == NULL) return -1;                            //@d_none
    g_cmp++;
    BNode *x = *link;
    if (x->left == NULL && x->right == NULL) {               //@d_c0
        *link = NULL;                      /* 1) лист: откачаме */  //@d_leaf
    } else if (x->left == NULL || x->right == NULL) {        //@d_c1
        *link = x->left ? x->left : x->right;  /* 2) едно дете: заместваме */  //@d_one
    } else {                                                 //@d_c2
        /* 3) две деца: симетричният наследник = най-малкият в дясното поддърво */
        BNode **s = &x->right;                               //@d_succ0
        while ((*s)->left != NULL) s = &(*s)->left;          //@d_succ
        BNode *y = *s;
        x->key = y->key;                   /* пренасяме ключа */  //@d_copy
        *s = y->right;                     /* y няма ляво дете */  //@d_unlink
        x = y;
    }
    free(x);                                                 //@d_free
    return 0;
}

int bst_min(const BNode *r) { while (r->left)  r = r->left;  return r->key; }   //@min
int bst_max(const BNode *r) { while (r->right) r = r->right; return r->key; }   //@max
int bst_height(const BNode *r)             /* в ребра; празно = -1 */
{
    if (r == NULL) return -1;
    int a = bst_height(r->left), b = bst_height(r->right);
    return 1 + (a > b ? a : b);
}
//#end

static void inorder(const BNode *r, Out *o) { if (!r) return; inorder(r->left, o); out_int(o, r->key); inorder(r->right, o); }
static void preorder(const BNode *r, Out *o) { if (!r) return; out_int(o, r->key); preorder(r->left, o); preorder(r->right, o); }
static void free_tree(BNode *r) { if (!r) return; free_tree(r->left); free_tree(r->right); free(r); }

static void run(const char *key, const char *prog)
{
    BNode *root = NULL;
    Out o = { "" }, a = { "" }, b = { "" };
    Op op;
    const char *p = prog;
    int d;
    g_cmp = 0;
    while (op_next(&p, &op)) {
        for (int i = 0; i < op.n; i++) {
            int k = op_int(&op, i);
            if (op_is(&op, "ins")) { if (bst_insert(&root, k)) out_add(&o, "dup"); }
            else if (op_is(&op, "find")) { BNode *f = bst_search(root, k, &d); if (f) out_int(&o, d); else out_add(&o, "nf"); }
            else if (op_is(&op, "del")) { if (bst_delete(&root, k)) out_add(&o, "nf"); }
        }
        if (op_is(&op, "min")) { if (root) out_int(&o, bst_min(root)); else out_add(&o, "E"); }
        if (op_is(&op, "max")) { if (root) out_int(&o, bst_max(root)); else out_add(&o, "E"); }
    }
    inorder(root, &a); preorder(root, &b);
    printf("%s out = %s\n", key, o.s[0] ? o.s : "-");
    printf("%s in = %s\n", key, a.s[0] ? a.s : "-");
    printf("%s pre = %s\n", key, b.s[0] ? b.s : "-");
    printf("%s height = %d\n", key, bst_height(root));
    printf("%s cmp = %ld\n", key, g_cmp);
    free_tree(root);
}

#ifndef NO_MAIN
int main(void)
{
    run("b1", "ins 4 2 6 1 3, find 3, find 5");
    run("b2", "ins 1 2 3 4 5 6 7, find 7");
    run("b3", "ins 4 2 6 1 3 5 7, find 7");
    run("b4", "ins 50 30 70 20 40 60 80, del 20, del 30, del 50");
    run("b5", "ins 8 3 10 1 6 14 4 7 13, del 3, del 8, min, max, ins 6");
    run("b6", "del 1, min, ins 5, del 5, find 5");
    run("b7", "ins 5 3 8 4, del 5, del 3, del 99");
    return 0;
}
#endif
