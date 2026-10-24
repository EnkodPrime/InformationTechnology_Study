/* Тема 5, раздел 6 — разделяй и владей: Merge Sort, двоично търсене, Quick Sort (Lomuto).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 06_divide.c -o 06 && ./06
 *
 * g_cmp, g_copy, g_swap, g_depth са броячи за визуализацията — не са част от алгоритмите.
 */
#include <stdio.h>
#include <stdint.h>

static long g_cmp, g_copy, g_swap;
static int g_depth, g_maxdepth;

//#viz ch06_merge_sort
/* Сливане на сортираните a[lo..mid) и a[mid..hi) чрез буфер tmp */
static void merge(int a[], int tmp[], int lo, int mid, int hi)
{
    int i = lo, j = mid, k = lo;                    //@m_init
    while (i < mid && j < hi) {                     //@m_loop
        g_cmp++;
        if (a[i] <= a[j])        /* <= : стабилност */  //@m_cmp
            tmp[k++] = a[i++];                      //@m_left
        else
            tmp[k++] = a[j++];                      //@m_right
        g_copy++;
    }
    while (i < mid) { tmp[k++] = a[i++]; g_copy++; }   //@m_restL
    while (j < hi)  { tmp[k++] = a[j++]; g_copy++; }   //@m_restR
    for (k = lo; k < hi; k++) { a[k] = tmp[k]; g_copy++; }  //@m_back
}

/* Сортира a[lo..hi) — top-down */
static void merge_sort_rec(int a[], int tmp[], int lo, int hi)
{                                                   //@enter
    if (hi - lo < 2)                                //@base
        return;
    int mid = lo + (hi - lo) / 2;                   //@split
    merge_sort_rec(a, tmp, lo, mid);                //@left
    merge_sort_rec(a, tmp, mid, hi);                //@right
    merge(a, tmp, lo, mid, hi);                     //@merge
}

void merge_sort(int a[], int n)
{
    int tmp[64];          /* Θ(n) допълнителна памет (тук — фиксиран буфер) */
    merge_sort_rec(a, tmp, 0, n);
}
//#end

//#viz ch06_bsearch
/* Двоично търсене в СОРТИРАН a[0..n-1]. Връща индекс или -1.
   Предусловие: a е сортиран ненамаляващо. */
int binary_search(const int a[], int n, int key)
{
    int lo = 0, hi = n - 1;                         //@init
    while (lo <= hi) {                              //@loop
        int mid = lo + (hi - lo) / 2;  /* не (lo+hi)/2: препълване */  //@mid
        g_cmp++;
        if (a[mid] == key)                          //@eq
            return mid;                             //@found
        g_cmp++;
        if (a[mid] < key)                           //@lt
            lo = mid + 1;                           //@right
        else
            hi = mid - 1;                           //@left
    }
    return -1;                                      //@notfound
}
//#end

static uint32_t g_seed = 12345u;
/* детерминиран ГПСЧ (LCG), за да съвпада с визуализацията */
static int rnd(int m)
{
    g_seed = g_seed * 1103515245u + 12345u;
    return (int)((g_seed & 0x7fffffffu) % (uint32_t)m);
}

//#viz ch06_quick_sort
static int lt(int x, int y) { g_cmp++; return x < y; }
static void swap(int *x, int *y) { int t = *x; *x = *y; *y = t; g_swap++; }

/* Опорен елемент: 0 последен, 1 среден, 2 случаен, 3 медиана от три */
static int choose_pivot(const int a[], int lo, int hi, int mode)
{
    int mid = lo + (hi - lo) / 2;
    if (mode == 0) return hi;
    if (mode == 1) return mid;
    if (mode == 2) return lo + rnd(hi - lo + 1);
    if (lt(a[lo], a[mid]))                                  /* медиана от три */
        return lt(a[mid], a[hi]) ? mid : (lt(a[lo], a[hi]) ? hi : lo);
    return lt(a[lo], a[hi]) ? lo : (lt(a[mid], a[hi]) ? hi : mid);
}

/* Разделяне на Lomuto: опорният отива в a[hi], после на мястото си */
static int partition(int a[], int lo, int hi, int mode)
{
    int p = choose_pivot(a, lo, hi, mode);           //@choose
    swap(&a[p], &a[hi]);                             //@tolast
    int pivot = a[hi], i = lo;                       //@pinit
    for (int j = lo; j < hi; j++) {                  //@ploop
        if (!lt(pivot, a[j])) {   /* a[j] <= pivot */ //@pcmp
            swap(&a[i], &a[j]);                      //@pswap
            i++;
        }
    }
    swap(&a[i], &a[hi]);                             //@pfinal
    return i;
}

void quick_sort(int a[], int lo, int hi, int mode)
{                                                    //@enter
    if (lo >= hi)                                    //@base
        return;
    if (++g_depth > g_maxdepth) g_maxdepth = g_depth;
    int p = partition(a, lo, hi, mode);              //@part
    quick_sort(a, lo, p - 1, mode);                  //@left
    quick_sort(a, p + 1, hi, mode);                  //@right
    g_depth--;
}
//#end

#ifndef NO_MAIN
static void print_arr(const char *name, const int a[], int n)
{
    printf("%s = ", name);
    for (int i = 0; i < n; i++) printf(i ? " %d" : "%d", a[i]);
    printf("\n");
}

int main(void)
{
    /* Merge Sort */
    struct { const char *name; int n; int v[16]; } ms[] = {
        {"ms1", 4, {8, 3, 6, 2}},
        {"ms2", 8, {5, 2, 4, 7, 1, 3, 2, 6}},
        {"ms3", 11, {9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1}},
        {"ms4", 16, {3, 3, 1, 9, 12, 0, 7, 7, 4, 15, 2, 8, 6, 11, 5, 10}},
        {"ms5", 1, {42}},
    };
    for (int t = 0; t < 5; t++) {
        g_cmp = g_copy = 0;
        merge_sort(ms[t].v, ms[t].n);
        char nm[32];
        snprintf(nm, sizeof nm, "%s sorted", ms[t].name); print_arr(nm, ms[t].v, ms[t].n);
        printf("%s cmp = %ld\n", ms[t].name, g_cmp);
        printf("%s copy = %ld\n", ms[t].name, g_copy);
    }

    /* Двоично търсене */
    int bs[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int keys[] = {23, 2, 91, 7, 100, 56};
    for (int t = 0; t < 6; t++) {
        g_cmp = 0;
        int r = binary_search(bs, 10, keys[t]);
        printf("bs(%d) = %d\n", keys[t], r);
        printf("bs(%d) cmp = %ld\n", keys[t], g_cmp);
    }
    int uns[] = {9, 1, 7, 3, 8, 2, 6};      /* НЕсортиран — нарушено предусловие */
    g_cmp = 0;
    printf("bs_unsorted(9) = %d\n", binary_search(uns, 7, 9));
    printf("bs_unsorted(9) cmp = %ld\n", g_cmp);

    /* Quick Sort */
    struct { const char *name; int n; int v[24]; } qs[] = {
        {"qs1", 8, {5, 2, 4, 7, 1, 3, 2, 6}},
        {"qs2", 12, {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}},
        {"qs3", 10, {4, 4, 4, 1, 4, 4, 2, 4, 4, 4}},
        {"qs4", 16, {3, 3, 1, 9, 12, 0, 7, 7, 4, 15, 2, 8, 6, 11, 5, 10}},
    };
    for (int t = 0; t < 4; t++)
        for (int mode = 0; mode < 4; mode++) {
            int a[24];
            for (int i = 0; i < qs[t].n; i++) a[i] = qs[t].v[i];
            g_cmp = g_swap = 0; g_depth = g_maxdepth = 0; g_seed = 12345u;
            quick_sort(a, 0, qs[t].n - 1, mode);
            char nm[40];
            snprintf(nm, sizeof nm, "%s m%d sorted", qs[t].name, mode); print_arr(nm, a, qs[t].n);
            printf("%s m%d cmp = %ld\n", qs[t].name, mode, g_cmp);
            printf("%s m%d swap = %ld\n", qs[t].name, mode, g_swap);
            printf("%s m%d depth = %d\n", qs[t].name, mode, g_maxdepth);
        }
    return 0;
}
#endif
