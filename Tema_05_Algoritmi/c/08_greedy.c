/* Тема 5, раздел 8 — алчен подход.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 08_greedy.c -o 08_greedy && ./08_greedy
 *
 * 1) Избор на неприпокриващи се интервали (полуотворени [s, e)) — четири стратегии.
 * 2) Монети: алчно „най-голямата възможна монета“ срещу оптимума чрез DP.
 * 3) Алгоритъм на Дейкстра (O(V^2), без пирамида) и за сравнение Белман–Форд.
 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

#define MAXN 32

/* ------------------------------------------------------------------ */
/* 1. Интервали                                                        */
/* ------------------------------------------------------------------ */
typedef struct { int s, e, id, key; } Interval;   /* [s, e), id = позиция във входа */

/* [s, e) и [s', e') се пресичат точно когато s < e' и s' < e */
static bool overlap(const Interval *a, const Interval *b) { return a->s < b->e && b->s < a->e; }

/* по ключ; при равенство — по реда във входа (детерминирано, като в JS) */
static int cmp_key(const void *pa, const void *pb)
{
    const Interval *a = pa, *b = pb;
    if (a->key != b->key) return a->key < b->key ? -1 : 1;
    return a->id - b->id;
}

//#viz ch08_iv_end
/* Оптимален алчен избор: сортираме по нарастващ край и вземаме
   всеки интервал, чието начало е >= края на последния избран. */
static int cmp_end(const void *pa, const void *pb)
{
    const Interval *a = pa, *b = pb;
    if (a->e != b->e) return a->e < b->e ? -1 : 1;
    return a->id - b->id;
}

int select_by_end(const Interval in[], int n, int chosen[])
{
    Interval v[MAXN];
    memcpy(v, in, (size_t)n * sizeof v[0]);
    qsort(v, (size_t)n, sizeof v[0], cmp_end);      //@sort
    int m = 0;
    int last_end = INT_MIN;                         //@init
    for (int i = 0; i < n; i++) {                   //@loop
        if (v[i].s < last_end)                      //@cmp
            continue;        /* пресича последния */ //@skip
        chosen[m++] = v[i].id;                      //@take
        last_end = v[i].e;                          //@take
    }
    return m;                                       //@ret
}
//#end

enum { BY_END, BY_START, BY_LEN, BY_CONFLICTS };

//#viz ch08_iv_key
/* Общ шаблон „сортирай по ключ, вземи всичко съвместимо“.
   Ключът е стратегията: начало, дължина или брой конфликти.
   Без сортиране по край трябва да се проверяват ВСИЧКИ избрани. */
int select_by_key(const Interval in[], int n, int strategy, int chosen[])
{
    Interval v[MAXN];
    for (int i = 0; i < n; i++) {                   //@key
        v[i] = in[i];
        if (strategy == BY_START)      v[i].key = in[i].s;
        else if (strategy == BY_LEN)   v[i].key = in[i].e - in[i].s;
        else if (strategy == BY_CONFLICTS) {
            v[i].key = 0;
            for (int j = 0; j < n; j++)
                if (j != i && overlap(&in[i], &in[j])) v[i].key++;
        } else                         v[i].key = in[i].e;
    }
    qsort(v, (size_t)n, sizeof v[0], cmp_key);      //@sort
    int m = 0;                                      //@init
    for (int i = 0; i < n; i++) {                   //@loop
        bool ok = true;
        for (int j = 0; j < m && ok; j++)           //@cmp
            if (overlap(&v[i], &in[chosen[j]])) ok = false;
        if (!ok)
            continue;                               //@skip
        chosen[m++] = v[i].id;                      //@take
    }
    return m;                                       //@ret
}
//#end

/* "0-2 2-4 4-6" -> масив от интервали; връща броя */
static int parse_iv(const char *str, Interval out[])
{
    int n = 0, s, e, used;
    while (n < MAXN && sscanf(str, " %d-%d%n", &s, &e, &used) == 2) {
        out[n].s = s; out[n].e = e; out[n].id = n; out[n].key = 0;
        n++; str += used;
    }
    return n;
}

/* ------------------------------------------------------------------ */
/* 2. Монети                                                           */
/* ------------------------------------------------------------------ */
#define MAXK 10
#define MAXA 400
#define INF  (INT_MAX / 2)

//#viz ch08_coins_greedy
/* d[0] < d[1] < ... < d[k-1]. Алчно: всеки път най-голямата
   монета, която още се побира. Връща броя монети или -1. */
int coins_greedy(const int d[], int k, int amount, int used[])
{
    int cnt = 0;                                    //@enter
    for (int i = k - 1; i >= 0; i--) {              //@loop
        while (amount >= d[i]) {                    //@cmp
            amount -= d[i];                         //@take
            used[cnt++] = d[i];                     //@take
        }
    }
    return amount == 0 ? cnt : -1;  /* -1: остатъкът не може да се плати */ //@ret
}
//#end

//#viz ch08_coins_dp
/* Оптимум (динамично програмиране): best[s] = минимален брой
   монети за сума s; best[s] = 1 + min best[s - d[i]] по d[i] <= s. */
int coins_dp(const int d[], int k, int amount, int best[])
{
    best[0] = 0;                                    //@base
    for (int s = 1; s <= amount; s++) {             //@outer
        best[s] = INF;
        for (int i = 0; i < k; i++)                 //@inner
            if (d[i] <= s && best[s - d[i]] + 1 < best[s])   //@cmp
                best[s] = best[s - d[i]] + 1;       //@upd
    }
    return best[amount] >= INF ? -1 : best[amount]; //@ret
}
//#end

/* възстановява едно оптимално разлагане от таблицата best[] */
static int coins_dp_pick(const int d[], int k, int amount, const int best[], int used[])
{
    int cnt = 0;
    while (amount > 0) {
        for (int i = 0; i < k; i++)
            if (d[i] <= amount && best[amount - d[i]] + 1 == best[amount]) {
                used[cnt++] = d[i]; amount -= d[i]; break;
            }
    }
    return cnt;
}

/* най-малката сума в [1, limit], за която алчното е по-лошо от оптимума; 0 ако няма */
int coins_counterexample(const int d[], int k, int limit)
{
    static int best[MAXA + 1];
    int used[MAXA];
    coins_dp(d, k, limit, best);
    for (int s = 1; s <= limit; s++) {
        int opt = best[s] >= INF ? -1 : best[s];
        int g = coins_greedy(d, k, s, used);
        if (opt != -1 && (g == -1 || g > opt)) return s;
    }
    return 0;
}

/* ------------------------------------------------------------------ */
/* 3. Дейкстра и Белман–Форд                                            */
/* ------------------------------------------------------------------ */
#define V 6
#define NOEDGE INT_MIN

//#viz ch08_dijkstra
/* Дейкстра, O(V^2): всеки път най-близкият непосетен връх.
   Коректен само при НЕОТРИЦАТЕЛНИ тегла. */
void dijkstra(const int w[V][V], int src, int dist[V], int prev[V])
{
    bool visited[V];
    for (int v = 0; v < V; v++) {                   //@init
        dist[v] = INF; prev[v] = -1; visited[v] = false;
    }
    dist[src] = 0;                                  //@init
    for (int it = 0; it < V; it++) {                //@outer
        int u = -1;
        for (int v = 0; v < V; v++)                 //@pick
            if (!visited[v] && (u < 0 || dist[v] < dist[u])) u = v;   //@pick
        if (dist[u] == INF) break;  /* останалите са недостижими */  //@unreach
        visited[u] = true;          /* dist[u] се смята за окончателно */ //@visit
        for (int v = 0; v < V; v++)                 //@scan
            if (w[u][v] != NOEDGE && !visited[v] && dist[u] + w[u][v] < dist[v]) { //@relax
                dist[v] = dist[u] + w[u][v];        //@upd
                prev[v] = u;                        //@upd
            }
    }
}
//#end

/* Белман–Форд: V-1 пъти релаксира всички ребра; работи и с отрицателни
   тегла. Връща false при достижим отрицателен цикъл. */
bool bellman_ford(const int w[V][V], int src, int dist[V])
{
    for (int v = 0; v < V; v++) dist[v] = INF;
    dist[src] = 0;
    for (int k = 0; k < V - 1; k++)
        for (int u = 0; u < V; u++)
            for (int v = 0; v < V; v++)
                if (w[u][v] != NOEDGE && dist[u] != INF && dist[u] + w[u][v] < dist[v])
                    dist[v] = dist[u] + w[u][v];
    for (int u = 0; u < V; u++)
        for (int v = 0; v < V; v++)
            if (w[u][v] != NOEDGE && dist[u] != INF && dist[u] + w[u][v] < dist[v])
                return false;
    return true;
}

/* "AB:7 AC:9" -> матрица на теглата (ориентирани ребра) */
static void parse_graph(const char *str, int w[V][V])
{
    for (int i = 0; i < V; i++) for (int j = 0; j < V; j++) w[i][j] = NOEDGE;
    char a, b; int x, used;
    while (sscanf(str, " %c%c:%d%n", &a, &b, &x, &used) == 3) {
        w[a - 'A'][b - 'A'] = x;
        str += used;
    }
}

#ifndef NO_MAIN
static void print_dist(const char *name, const int dist[V])
{
    printf("%s =", name);
    for (int v = 0; v < V; v++) {
        if (dist[v] >= INF) printf(" inf");
        else printf(" %d", dist[v]);
    }
    printf("\n");
}

int main(void)
{
    /* интервали: брой и избрани id за всяка стратегия */
    static const char *sets[] = {
        "0-2 2-4 4-6 0-5",
        "0-10 1-2 3-4 5-6",
        "0-5 4-7 6-11",
        "0-2 2-4 4-6 6-8 1-3 1-3 1-3 5-7 5-7 5-7 3-5",
        "1-4 3-5 0-6 5-7 3-9 5-9 6-10 8-11 8-12 2-14 12-16",
    };
    static const char *names[] = { "end", "start", "len", "conf" };
    for (size_t t = 0; t < sizeof sets / sizeof sets[0]; t++) {
        Interval iv[MAXN]; int ch[MAXN];
        int n = parse_iv(sets[t], iv);
        for (int st = 0; st < 4; st++) {
            int m = st == BY_END ? select_by_end(iv, n, ch) : select_by_key(iv, n, st, ch);
            printf("iv[%s].%s = %d |", sets[t], names[st], m);
            for (int j = 0; j < m; j++) printf(" %d", ch[j]);
            printf("\n");
        }
    }

    /* монети */
    static const struct { int d[MAXK]; int k; int amount; } cs[] = {
        { {1, 3, 4}, 3, 6 },
        { {1, 2, 5, 10, 20, 50}, 6, 88 },
        { {1, 5, 10, 25}, 4, 63 },
        { {1, 6, 10}, 3, 12 },
        { {3, 5}, 2, 7 },
        { {1, 7, 10}, 3, 15 },
    };
    for (size_t t = 0; t < sizeof cs / sizeof cs[0]; t++) {
        static int best[MAXA + 1];
        int used[MAXA];
        char tag[64]; int p = 0;
        for (int i = 0; i < cs[t].k; i++) p += snprintf(tag + p, sizeof tag - (size_t)p, i ? ",%d" : "%d", cs[t].d[i]);
        int g = coins_greedy(cs[t].d, cs[t].k, cs[t].amount, used);
        printf("coins[%s;%d].greedy = %d |", tag, cs[t].amount, g);
        for (int j = 0; j < g; j++) printf(" %d", used[j]);
        printf("\n");
        int o = coins_dp(cs[t].d, cs[t].k, cs[t].amount, best);
        printf("coins[%s;%d].dp = %d |", tag, cs[t].amount, o);
        if (o > 0) { int c = coins_dp_pick(cs[t].d, cs[t].k, cs[t].amount, best, used); for (int j = 0; j < c; j++) printf(" %d", used[j]); }
        printf("\n");
        printf("coins[%s;%d].table =", tag, cs[t].amount);
        for (int s = 0; s <= cs[t].amount; s++) printf(" %d", best[s] >= INF ? -1 : best[s]);
        printf("\n");
        printf("coins[%s].counter = %d\n", tag, coins_counterexample(cs[t].d, cs[t].k, MAXA));
    }

    /* Дейкстра срещу Белман–Форд */
    static const char *graphs[] = {
        "AB:7 AC:9 AF:14 BC:10 BD:15 CD:11 CF:2 DE:6 FE:9",
        "AB:2 AC:5 CB:-4 BD:3 DE:1 CF:6",
        "AB:4 BC:1 DE:2",
        "AB:1 BC:-3 CA:1 CD:2",
    };
    for (size_t t = 0; t < sizeof graphs / sizeof graphs[0]; t++) {
        int w[V][V], dist[V], prev[V];
        parse_graph(graphs[t], w);
        char nm[128];
        dijkstra(w, 0, dist, prev);
        snprintf(nm, sizeof nm, "dijkstra[%s]", graphs[t]); print_dist(nm, dist);
        snprintf(nm, sizeof nm, "prev[%s] =", graphs[t]);
        printf("%s", nm);
        for (int v = 0; v < V; v++) printf(" %d", prev[v]);
        printf("\n");
        bool ok = bellman_ford(w, 0, dist);
        snprintf(nm, sizeof nm, "bellman[%s]", graphs[t]);
        if (ok) print_dist(nm, dist); else printf("%s = negcycle\n", nm);
    }
    return 0;
}
#endif
