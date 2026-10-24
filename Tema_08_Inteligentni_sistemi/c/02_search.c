/* Тема 8, раздел 2 — търсене в пространство от състояния: BFS, DFS, uniform-cost, greedy best-first, A*.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 02_search.c -o 02 && ./02
 *
 * Една обща графова процедура; режимът определя само КОЙ елемент от фронта се изважда:
 *   BFS — най-рано добавения (опашка), DFS — най-късно добавения (стек),
 *   UCS — най-малко g, GREEDY — най-малко h, ASTAR — най-малко f = g + h.
 * При равенство печели по-рано добавеният (по-малък seq). Проверката за цел е при изваждане.
 * Затворените (приключени) върхове НЕ се отварят повторно — както в обичайната графова A*.
 * g_expanded е брояч за визуализацията.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

#define MAXN 16
#define NAMELEN 16

typedef struct {
    int n;
    char name[MAXN][NAMELEN];
    int deg[MAXN];
    int adj[MAXN][MAXN];
    int w[MAXN][MAXN];
    int h[MAXN];
} Graph;

enum { BFS, DFS, UCS, GREEDY, ASTAR };

static int g_expanded;
static int g_order[MAXN], g_norder;

//#viz ch02_search
typedef struct { int node, g, parent, seq; } Entry;

/* кой елемент от фронта да се извади според режима */
static int pick(const Entry fr[], int nf, const Graph *G, int mode)
{
    int b = 0;
    for (int i = 1; i < nf; i++) {
        long kb, ki;
        switch (mode) {
        case BFS:    kb = fr[b].seq;  ki = fr[i].seq;  break;   /* опашка */
        case DFS:    kb = -fr[b].seq; ki = -fr[i].seq; break;   /* стек   */
        case UCS:    kb = fr[b].g;    ki = fr[i].g;    break;
        case GREEDY: kb = G->h[fr[b].node]; ki = G->h[fr[i].node]; break;
        default:     kb = fr[b].g + G->h[fr[b].node]; ki = fr[i].g + G->h[fr[i].node]; break;
        }
        if (ki < kb || (ki == kb && fr[i].seq < fr[b].seq)) b = i;
    }
    return b;
}

/* Връща цената на намерения път или -1; parent[] описва пътя назад от целта. */
int search(const Graph *G, int start, int goal, int mode, int parent[])
{
    Entry fr[MAXN];
    int nf = 0, seq = 0, closed[MAXN] = {0};
    fr[nf++] = (Entry){start, 0, -1, seq++};                       //@init
    while (nf > 0) {                                                //@loop
        int b = pick(fr, nf, G, mode);                              //@pick
        Entry e = fr[b];
        fr[b] = fr[--nf];                     /* премахване от фронта */
        closed[e.node] = 1;                                         //@expand
        parent[e.node] = e.parent;
        g_expanded++; g_order[g_norder++] = e.node;
        if (e.node == goal)                                         //@goaltest
            return e.g;                                             //@found
        int u = e.node;
        for (int k = 0; k < G->deg[u]; k++) {                       //@nbr
            int v = G->adj[u][k], ng = e.g + G->w[u][k];
            if (closed[v])                                          //@closed
                continue;
            int f = -1;
            for (int i = 0; i < nf; i++) if (fr[i].node == v) f = i;
            if (f < 0)
                fr[nf++] = (Entry){v, ng, u, seq++};                //@push
            else if ((mode == UCS || mode == ASTAR) && ng < fr[f].g) {
                fr[f].g = ng; fr[f].parent = u;                     //@relax
            }
        }
    }
    return -1;                                                      //@fail
}
//#end

/* ---------- разбор на вход: "S A 1, S B 4" и "S=5 A=4" ---------- */
static int node_id(Graph *G, const char *s)
{
    for (int i = 0; i < G->n; i++) if (strcmp(G->name[i], s) == 0) return i;
    snprintf(G->name[G->n], NAMELEN, "%s", s);
    G->h[G->n] = 0; G->deg[G->n] = 0;
    return G->n++;
}
static void add_arc(Graph *G, int a, int b, int w) { G->adj[a][G->deg[a]] = b; G->w[a][G->deg[a]++] = w; }

static void parse_graph(Graph *G, const char *edges, const char *heur, int directed)
{
    char buf[1024], *save = NULL;
    G->n = 0;
    snprintf(buf, sizeof buf, "%s", edges);
    for (char *item = strtok_r(buf, ",;\n", &save); item; item = strtok_r(NULL, ",;\n", &save)) {
        char a[NAMELEN], b[NAMELEN]; int w = 1;
        int got = sscanf(item, "%15s %15s %d", a, b, &w);
        if (got < 2) continue;
        int x = node_id(G, a), y = node_id(G, b);
        add_arc(G, x, y, w);
        if (!directed) add_arc(G, y, x, w);
    }
    snprintf(buf, sizeof buf, "%s", heur);
    for (char *tok = strtok_r(buf, " ,;\n", &save); tok; tok = strtok_r(NULL, " ,;\n", &save)) {
        char *eq = strchr(tok, '=');
        if (!eq) continue;
        *eq = 0;
        for (int i = 0; i < G->n; i++) if (strcmp(G->name[i], tok) == 0) G->h[i] = atoi(eq + 1);
    }
}

#ifndef NO_MAIN
static const char *MN[] = {"bfs", "dfs", "ucs", "greedy", "astar"};

static void run(const char *tag, const char *edges, const char *heur, int directed, const char *s, const char *t)
{
    Graph G;
    parse_graph(&G, edges, heur, directed);
    int start = -1, goal = -1;
    for (int i = 0; i < G.n; i++) { if (!strcmp(G.name[i], s)) start = i; if (!strcmp(G.name[i], t)) goal = i; }
    for (int mode = 0; mode < 5; mode++) {
        int parent[MAXN];
        g_expanded = 0; g_norder = 0;
        int cost = search(&G, start, goal, mode, parent);
        printf("%s %s cost = %d\n", tag, MN[mode], cost);
        printf("%s %s expanded = %d\n", tag, MN[mode], g_expanded);
        printf("%s %s order =", tag, MN[mode]);
        for (int i = 0; i < g_norder; i++) printf(" %s", G.name[g_order[i]]);
        printf("\n%s %s path =", tag, MN[mode]);
        if (cost >= 0) {
            int p[MAXN], np = 0;
            for (int v = goal; v >= 0; v = parent[v]) p[np++] = v;
            while (np) printf(" %s", G.name[p[--np]]);
        } else printf(" -");
        printf("\n");
    }
}

int main(void)
{
    run("g1", "S A 1, S B 4, A B 2, A C 5, B C 1, C G 3", "S=5 A=4 B=2 C=1 G=0", 0, "S", "G");
    run("g2", "S A 1, S B 5, A G 10, B G 2", "S=6 A=1 B=2 G=0", 1, "S", "G");
    run("g3", "S A 1, A B 1, B G 1, S C 1, C D 1, D E 1, E G 1, S G 9", "", 0, "S", "G");
    run("g4", "S A 1, S B 2, A C 4, B C 1, C G 5", "S=6 A=5 B=6 C=4 G=0", 1, "S", "G");
    run("g6", "S A 1, S B 2, A G 6, B G 4", "S=0 A=1 B=9 G=0", 1, "S", "G");
    run("g5", "S A 1, A B 1, B S 1, G S 1", "", 1, "S", "G");
    return 0;
}
#endif
