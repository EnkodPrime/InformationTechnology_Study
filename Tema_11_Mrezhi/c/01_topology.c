/* Тема 11, раздел 1 — топологии и какво става при прекъсване на връзка.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 01_topology.c -o 01_topology && ./01_topology
 *
 * Моделът: възлите са върхове, връзките са двупосочни ребра. Прекъсната връзка
 * или повреден възел се изключват. BFS намира свързаните компоненти —
 * кои участници още могат да обменят данни помежду си.
 * Моделът показва само свързаността, не електрическите ефекти по средата.
 */
#include <stdio.h>
#include <string.h>

#define MAXN 10
enum { STAR, BUS, RING, TREE, MESH };
static const char *TNAME[] = { "star", "bus", "ring", "tree", "mesh" };

static int adj[MAXN][MAXN];

static void link_nodes(int u, int v) { adj[u][v] = adj[v][u] = 1; }

/* Ребрата на учебните топологии (същите като в JS визуализацията). */
static void build(int type, int n)
{
    memset(adj, 0, sizeof adj);
    for (int i = 1; i < n; i++) {
        if (type == STAR) link_nodes(0, i);             /* всички през център 0 */
        if (type == BUS)  link_nodes(i - 1, i);         /* последователни отводи по шината */
        if (type == TREE) link_nodes((i - 1) / 2, i);   /* двоично дърво */
    }
    if (type == RING || type == MESH)
        for (int i = 0; i < n; i++) link_nodes(i, (i + 1) % n);
    if (type == MESH)
        for (int i = 0; i < n / 2; i++) link_nodes(i, i + n / 2);  /* допълнителни алтернативни връзки */
}

static void cut_link(int u, int v) { adj[u][v] = adj[v][u] = 0; }

//#viz ch01_bfs
/* Свързани компоненти чрез обхождане в ширина (BFS).
   down[v] = 1, ако възел v е повреден. comp[v] = номер на компонента. */
int components(int n, const int down[], int comp[])
{
    int queue[MAXN], ncomp = 0;
    for (int v = 0; v < n; v++) comp[v] = -1;
    for (int s = 0; s < n; s++) {
        if (comp[s] != -1 || down[s]) continue;
        int head = 0, tail = 0;
        queue[tail++] = s;                            //@newcomp
        comp[s] = ncomp;                              //@newcomp
        while (head < tail) {
            int u = queue[head++];                    //@pop
            for (int v = 0; v < n; v++) {
                if (!adj[u][v]) continue;             /* няма (или прекъсната) връзка */
                if (down[v] || comp[v] != -1)         //@edge
                    continue;                         //@skip
                comp[v] = ncomp;                      //@visit
                queue[tail++] = v;                    //@visit
            }
        }
        ncomp++;                                      //@done
    }
    return ncomp;
}
//#end

static void run(int type, int n, int cu, int cv, int dn)
{
    int down[MAXN] = {0}, comp[MAXN];
    build(type, n);
    if (cu >= 0) cut_link(cu, cv);
    if (dn >= 0) down[dn] = 1;
    int k = components(n, down, comp);
    printf("comps(%s,%d,cut=%d-%d,down=%d) = %d\n", TNAME[type], n, cu, cv, dn, k);
    printf("label(%s,%d,cut=%d-%d,down=%d) =", TNAME[type], n, cu, cv, dn);
    for (int v = 0; v < n; v++) printf(" %d", comp[v]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    run(STAR, 6, 0, 2, -1);
    run(STAR, 6, -1, -1, 0);
    run(BUS, 6, 2, 3, -1);
    run(RING, 6, 2, 3, -1);
    run(TREE, 7, 0, 1, -1);
    run(MESH, 6, 0, 1, -1);
    run(MESH, 8, -1, -1, 3);
    run(RING, 5, -1, -1, 2);
    return 0;
}
#endif
