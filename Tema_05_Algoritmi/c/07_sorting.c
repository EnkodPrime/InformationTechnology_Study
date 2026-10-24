/* Тема 5, раздел 7 — лаборатория за сортиране.
 * Всички алгоритми сортират масив от записи {key, id} по key; id показва стабилността.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 07_sorting.c -o 07 && ./07
 *
 * Броячи (еднакви с визуализацията):
 *   g_cmp — сравнения на ключове;  g_swp — размени;
 *   g_wr  — записи на елемент в масив (a[] или tmp[]); една размяна = 2 записа.
 */
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct { int key; int id; } item;

static long g_cmp, g_swp, g_wr;

static int less(item x, item y) { g_cmp++; return x.key < y.key; }
static void swap(item *x, item *y) { item t = *x; *x = *y; *y = t; g_swp++; g_wr += 2; }

//#viz ch07_selection
/* Пряк избор: на позиция i поставяме минимума на a[i..n-1].
   Θ(n²) сравнения ВИНАГИ; ≤ n−1 размени. Не е стабилно. */
void selection_sort(item a[], int n)
{
    for (int i = 0; i < n - 1; i++) {               //@outer
        int m = i;                                  //@minit
        for (int j = i + 1; j < n; j++)             //@inner
            if (less(a[j], a[m]))                   //@cmp
                m = j;                              //@newmin
        if (m != i)                                 //@test
            swap(&a[i], &a[m]);                     //@swap
    }
}
//#end

//#viz ch07_bubble
/* Мехурче с ранно спиране: ако в прохода няма размяна — готово.
   Най-добър случай (сортиран) Θ(n); най-лош Θ(n²). Стабилно. */
void bubble_sort(item a[], int n)
{
    for (int end = n - 1; end > 0; end--) {         //@outer
        int swapped = 0;                            //@flag
        for (int j = 0; j < end; j++)               //@inner
            if (less(a[j + 1], a[j])) {             //@cmp
                swap(&a[j], &a[j + 1]);             //@swap
                swapped = 1;
            }
        if (!swapped)                               //@early
            break;                                  //@stop
    }
}
//#end

//#viz ch07_insertion
/* Вмъкване (намаляване на размера): подреденото a[0..i-1]
   се допълва чрез вмъкване на a[i]. Стабилно, на място. */
void insertion_sort(item a[], int n)
{
    for (int i = 1; i < n; i++) {                   //@outer
        item x = a[i];                              //@take
        int j = i - 1;
        while (j >= 0 && less(x, a[j])) {           //@cmp
            a[j + 1] = a[j]; g_wr++;                //@shift
            j--;
        }
        a[j + 1] = x; g_wr++;                       //@put
    }
}
//#end

//#viz ch07_merge
/* Сливане (top-down, буфер tmp): Θ(n log n) винаги, Θ(n) памет.
   a[i] <= a[j] (а не <) пази стабилността. */
static void ms_rec(item a[], item tmp[], int lo, int hi)
{
    if (hi - lo < 2) return;                        //@base
    int mid = lo + (hi - lo) / 2;                   //@split
    ms_rec(a, tmp, lo, mid);
    ms_rec(a, tmp, mid, hi);
    int i = lo, j = mid, k = lo;                    //@minit
    while (i < mid && j < hi) {
        if (!less(a[j], a[i]))   /* a[i] <= a[j] */ //@cmp
            tmp[k++] = a[i++];                      //@takeL
        else
            tmp[k++] = a[j++];                      //@takeR
        g_wr++;
    }
    while (i < mid) { tmp[k++] = a[i++]; g_wr++; }  //@rest
    while (j < hi)  { tmp[k++] = a[j++]; g_wr++; }  //@rest
    for (k = lo; k < hi; k++) { a[k] = tmp[k]; g_wr++; }  //@back
}
void merge_sort(item a[], int n)
{
    item *tmp = malloc((size_t)(n > 0 ? n : 1) * sizeof *tmp);
    if (!tmp) return;
    ms_rec(a, tmp, 0, n);
    free(tmp);
}
//#end

//#viz ch07_quick
/* Бързо (Lomuto, опорен = средният елемент, преместен в края).
   Средно Θ(n log n), най-лошо Θ(n²). Не е стабилно. */
static void qs_rec(item a[], int lo, int hi)
{
    if (lo >= hi) return;                           //@base
    int mid = lo + (hi - lo) / 2;
    swap(&a[mid], &a[hi]);                          //@pivot
    int i = lo;
    for (int j = lo; j < hi; j++)                   //@loop
        if (!less(a[hi], a[j])) {  /* a[j] <= pivot */  //@cmp
            swap(&a[i], &a[j]);                     //@swap
            i++;
        }
    swap(&a[i], &a[hi]);                            //@place
    qs_rec(a, lo, i - 1);                           //@rec
    qs_rec(a, i + 1, hi);                           //@rec
}
void quick_sort(item a[], int n) { qs_rec(a, 0, n - 1); }
//#end

//#viz ch07_heap
/* Пирамидално: строим max-пирамида, после n−1 пъти
   местим максимума в края. O(n log n) винаги (Θ(n log n) при различни
   ключове; при всички равни — Θ(n)), на място, не е стабилно. */
static void sift_down(item a[], int k, int n)
{
    for (;;) {
        int c = 2 * k + 1;                          //@child
        if (c >= n) return;
        if (c + 1 < n && less(a[c], a[c + 1]))      //@cmp2
            c++;
        if (!less(a[k], a[c])) return;              //@cmp
        swap(&a[k], &a[c]);                         //@swap
        k = c;
    }
}
void heap_sort(item a[], int n)
{
    for (int k = n / 2 - 1; k >= 0; k--)            //@build
        sift_down(a, k, n);
    for (int end = n - 1; end > 0; end--) {         //@extract
        swap(&a[0], &a[end]);                       //@top
        sift_down(a, 0, end);
    }
}
//#end

#ifndef NO_MAIN
/* Генератор на входове — същият като в JS (LCG). */
static uint32_t seed;
static int rnd(int m) { seed = seed * 1103515245u + 12345u; return (int)((seed & 0x7fffffffu) % (uint32_t)m); }
static void gen(item a[], int n, int type, uint32_t s)
{
    seed = s;
    for (int i = 0; i < n; i++) {
        int v;
        switch (type) {
        case 1:  v = i + 1; break;                          /* сортиран */
        case 2:  v = n - i; break;                          /* обратно */
        case 3:  v = i + 1; break;                          /* почти: после размени */
        case 4:  v = 1 + rnd(5); break;                     /* много повторения */
        default: v = 1 + rnd(n * 3); break;                 /* случаен */
        }
        a[i].key = v; a[i].id = i;
    }
    if (type == 3)
        for (int t = 0; t < (n / 10 > 1 ? n / 10 : 1); t++) {
            int x = rnd(n), y = rnd(n);
            item tt = a[x]; a[x] = a[y]; a[y] = tt;
        }
}

typedef void (*sorter)(item[], int);
static const char *NAMES[] = {"selection", "bubble", "insertion", "merge", "quick", "heap"};
static const sorter FNS[] = {selection_sort, bubble_sort, insertion_sort, merge_sort, quick_sort, heap_sort};

static void run(const char *tag, const item in[], int n, int print_arr)
{
    static item a[4096];
    for (int s = 0; s < 6; s++) {
        for (int i = 0; i < n; i++) a[i] = in[i];
        g_cmp = g_swp = g_wr = 0;
        FNS[s](a, n);
        if (print_arr) {
            printf("%s %s keys =", tag, NAMES[s]);
            for (int i = 0; i < n; i++) printf(" %d", a[i].key);
            printf("\n%s %s ids =", tag, NAMES[s]);
            for (int i = 0; i < n; i++) printf(" %d", a[i].id);
            printf("\n");
        }
        printf("%s %s cmp = %ld\n", tag, NAMES[s], g_cmp);
        printf("%s %s swp = %ld\n", tag, NAMES[s], g_swp);
        printf("%s %s wr = %ld\n", tag, NAMES[s], g_wr);
    }
}

int main(void)
{
    static item in[4096];
    const int fixed[][10] = {{5, 3, 5, 1, 3, 9, 2, 5, 7, 1}, {8, 3, 6, 2, 0, 0, 0, 0, 0, 0}};
    for (int i = 0; i < 10; i++) { in[i].key = fixed[0][i]; in[i].id = i; }
    run("f1", in, 10, 1);
    for (int i = 0; i < 4; i++) { in[i].key = fixed[1][i]; in[i].id = i; }
    run("f2", in, 4, 1);
    run("f0", in, 1, 1);
    int ns[] = {20, 40, 200, 1000};
    for (int t = 0; t < 5; t++)
        for (int k = 0; k < 4; k++) {
            char tag[32];
            gen(in, ns[k], t, 777u);
            snprintf(tag, sizeof tag, "g%d n%d", t, ns[k]);
            run(tag, in, ns[k], ns[k] <= 40);
        }
    return 0;
}
#endif
