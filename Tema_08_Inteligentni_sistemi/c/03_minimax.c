/* Тема 8, раздели 3–4 — дърво на игра: minimax и алфа-бета отсичане.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 03_minimax.c -o 03 && ./03
 *
 * Дървото се задава с вложени скоби: "((3 5) (2 9))" — коренът е MAX, нивата се редуват.
 * Възлите се номерират в прав ред (preorder) от 0; така визуализацията и C говорят за едни и същи id.
 * g_visited (посетени възли) и g_leaves (оценени листа) са броячи за визуализацията.
 */
#include <stdio.h>
#include <limits.h>

#define MAXT 256

typedef struct { int leaf, value, nk, kid[16]; } Node;
static Node T[MAXT];
static int T_n;
static int g_visited, g_leaves;
static int g_cut[MAXT], g_ncut;          /* корени на отсечени поддървета */

/* разбор на "( ... )" — рекурсивно спускане; връща id на възела */
static const char *P;
static int parse_node(void)
{
    while (*P == ' ' || *P == ',') P++;
    int id = T_n++;
    T[id].nk = 0; T[id].leaf = 0;
    if (*P == '(') {
        P++;
        for (;;) {
            while (*P == ' ' || *P == ',') P++;
            if (*P == ')') { P++; break; }
            int c = parse_node();
            T[id].kid[T[id].nk++] = c;
        }
    } else {
        int sign = 1, v = 0;
        if (*P == '-') { sign = -1; P++; }
        while (*P >= '0' && *P <= '9') v = v * 10 + (*P++ - '0');
        T[id].leaf = 1; T[id].value = sign * v;
    }
    return id;
}
static int parse_tree(const char *s) { P = s; T_n = 0; return parse_node(); }

static int max(int a, int b) { return a > b ? a : b; }
static int min(int a, int b) { return a < b ? a : b; }

//#viz ch03_minimax
/* V(s) = U(s) за лист; max по децата при MAX; min при MIN */
int minimax(int s, int is_max)
{
    g_visited++;                                         //@visit
    if (T[s].leaf) {                                     //@leaf
        g_leaves++;
        return T[s].value;                               //@util
    }
    int best = is_max ? INT_MIN : INT_MAX;               //@init
    for (int k = 0; k < T[s].nk; k++) {                  //@loop
        int v = minimax(T[s].kid[k], !is_max);           //@rec
        best = is_max ? max(best, v) : min(best, v);     //@upd
    }
    return best;                                         //@ret
}
//#end

/* отбелязва всички възли на поддърво като отсечени (само за отчета) */
static void mark_cut(int s) { g_cut[g_ncut++] = s; }

//#viz ch04_alphabeta
/* alpha — осигурена долна граница за MAX; beta — горна граница, наложена от MIN */
int alphabeta(int s, int alpha, int beta, int is_max)
{
    g_visited++;                                         //@visit
    if (T[s].leaf) {                                     //@leaf
        g_leaves++;
        return T[s].value;                               //@util
    }
    int best = is_max ? INT_MIN : INT_MAX;               //@init
    for (int k = 0; k < T[s].nk; k++) {                  //@loop
        int v = alphabeta(T[s].kid[k], alpha, beta, !is_max);  //@rec
        if (is_max) { best = max(best, v); alpha = max(alpha, best); }  //@updmax
        else        { best = min(best, v); beta  = min(beta,  best); }  //@updmin
        if (alpha >= beta) {                             //@test
            for (int r = k + 1; r < T[s].nk; r++)
                mark_cut(T[s].kid[r]);                   //@cut
            break;
        }
    }
    return best;                                         //@ret
}
//#end

static int count_nodes(int s) { int c = 1; for (int k = 0; k < T[s].nk; k++) c += count_nodes(T[s].kid[k]); return c; }

#ifndef NO_MAIN
static void run(const char *tag, const char *tree)
{
    int root = parse_tree(tree);
    g_visited = g_leaves = 0;
    int v = minimax(root, 1);
    printf("%s nodes = %d\n", tag, count_nodes(root));
    printf("%s minimax = %d\n", tag, v);
    printf("%s mm visited = %d\n", tag, g_visited);
    printf("%s mm leaves = %d\n", tag, g_leaves);
    g_visited = g_leaves = 0; g_ncut = 0;
    int w = alphabeta(root, INT_MIN, INT_MAX, 1);
    printf("%s alphabeta = %d\n", tag, w);
    printf("%s ab visited = %d\n", tag, g_visited);
    printf("%s ab leaves = %d\n", tag, g_leaves);
    printf("%s ab cut =", tag);
    for (int i = 0; i < g_ncut; i++) printf(" %d", g_cut[i]);
    if (!g_ncut) printf(" -");
    printf("\n");
    /* избран ход на корена: първото дете със стойност v */
    int best = -1;
    for (int k = 0; k < T[root].nk && best < 0; k++) {
        g_visited = g_leaves = 0;
        if (minimax(T[root].kid[k], 0) == v) best = k;
    }
    printf("%s move = %d\n", tag, best);
}

int main(void)
{
    run("t1", "((3 5) (2 9))");
    run("t2", "((3 12 8) (2 4 6) (14 5 2))");
    run("t3", "(((5 6) (7 4 5)) ((3)) ((6) (6 9)) ((7) (5)) ((9 8) (6)))");
    run("t4", "(((3 17) (2 12)) ((15) (25 0)) ((2 5) (3)) ((2 14)))");
    run("t5", "((2 9) (3 5))");
    run("t6", "((8 9) (5 6) (2 3))");
    run("t7", "((2 3) (5 6) (8 9))");
    return 0;
}
#endif
