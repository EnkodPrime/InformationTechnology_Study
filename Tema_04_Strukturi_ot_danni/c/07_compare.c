/* Тема 4, раздел 7 — една и съща операция върху масив, свързан списък и BST:
 * броим елементарните стъпки (премествания, преходи по връзки, сравнения).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 07_compare.c -o cmp && ./cmp
 */
#include <stdio.h>
#include <stdlib.h>

static long g_steps;

//#viz ch07_array
/* Масив a[0..n-1] (има свободен капацитет). */
int arr_get(const int a[], int k) { g_steps++; return a[k]; }       /* Θ(1) */  //@get
int arr_find(const int a[], int n, int x)                           /* O(n) */
{
    for (int i = 0; i < n; i++) { g_steps++; if (a[i] == x) return i; }  //@find
    return -1;
}
void arr_insert_at(int a[], int *n, int k, int x)                   /* O(n - k) */
{
    for (int i = *n; i > k; i--) { a[i] = a[i - 1]; g_steps++; }   /* изместване */  //@shift
    a[k] = x; g_steps++;                                                             //@put
    (*n)++;
}
//#end

//#viz ch07_list
typedef struct N { int v; struct N *next; } N;
int lst_get(const N *h, int k)                                      /* O(k) */
{
    while (k--) { h = h->next; g_steps++; }                         //@walk
    g_steps++;
    return h->v;                                                    //@get
}
int lst_find(const N *h, int x)                                     /* O(n) */
{
    for (int i = 0; h; h = h->next, i++) { g_steps++; if (h->v == x) return i; }  //@find
    return -1;
}
void lst_insert_at(N **h, int k, N *x)    /* достигане O(k) + свързване Θ(1) */
{
    if (k == 0) { x->next = *h; *h = x; g_steps += 2; return; }     //@head
    N *p = *h;
    for (int i = 0; i < k - 1; i++) { p = p->next; g_steps++; }     //@walk
    x->next = p->next; g_steps++;                                   //@link1
    p->next = x; g_steps++;                                         //@link2
}
//#end

//#viz ch07_bst
typedef struct B { int key; struct B *l, *r; } B;
int bst_find(const B *t, int x)                                     /* O(h) */
{
    while (t) {                                                     //@loop
        g_steps++;
        if (x == t->key) return 1;                                  //@eq
        t = x < t->key ? t->l : t->r;                               //@go
    }
    return 0;
}
//#end

static B *bins(B *t, int k) { if (!t) { B *n = calloc(1, sizeof *n); n->key = k; return n; } if (k < t->key) t->l = bins(t->l, k); else t->r = bins(t->r, k); return t; }
static void bfree(B *t) { if (!t) return; bfree(t->l); bfree(t->r); free(t); }
/* балансиран ред на вмъкване: средата първо */
static B *bbal(B *t, int lo, int hi) { if (lo > hi) return t; int m = lo + (hi - lo) / 2; t = bins(t, m); t = bbal(t, lo, m - 1); return bbal(t, m + 1, hi); }

static void run(int n, int k, int x)
{
    int *a = malloc((size_t)(n + 1) * sizeof *a);
    N *h = NULL;
    for (int i = n - 1; i >= 0; i--) { a[i] = i; N *e = malloc(sizeof *e); e->v = i; e->next = h; h = e; }
    int m = n;
    B *bal = bbal(NULL, 0, n - 1), *deg = NULL;
    for (int i = 0; i < n; i++) deg = bins(deg, i);

    g_steps = 0; arr_get(a, k);          printf("n%d k%d arr get = %ld\n", n, k, g_steps);
    g_steps = 0; lst_get(h, k);          printf("n%d k%d lst get = %ld\n", n, k, g_steps);
    g_steps = 0; arr_find(a, n, x);      printf("n%d x%d arr find = %ld\n", n, x, g_steps);
    g_steps = 0; lst_find(h, x);         printf("n%d x%d lst find = %ld\n", n, x, g_steps);
    g_steps = 0; bst_find(bal, x);       printf("n%d x%d bal find = %ld\n", n, x, g_steps);
    g_steps = 0; bst_find(deg, x);       printf("n%d x%d deg find = %ld\n", n, x, g_steps);
    g_steps = 0; arr_insert_at(a, &m, k, -1); printf("n%d k%d arr ins = %ld\n", n, k, g_steps);
    N *e = malloc(sizeof *e); e->v = -1;
    g_steps = 0; lst_insert_at(&h, k, e); printf("n%d k%d lst ins = %ld\n", n, k, g_steps);

    while (h) { N *q = h->next; free(h); h = q; }
    bfree(bal); bfree(deg); free(a);
}

#ifndef NO_MAIN
int main(void)
{
    run(8, 0, 7);
    run(8, 5, 3);
    run(16, 15, 0);
    run(100, 50, 99);
    run(100, 0, 1000);
    run(1, 0, 0);
    return 0;
}
#endif
