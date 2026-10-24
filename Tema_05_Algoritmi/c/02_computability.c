/* Тема 5, раздел 2 — изчислимост и разрешимост.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 02_computability.c -o 02 && ./02
 *
 * Регионите //#viz ... //#end се показват във визуализацията;
 * маркерите //@етикет казват кой ред да се подсвети на дадена стъпка.
 */
#include <stdio.h>
#include <string.h>

#define MAXV 8

//#viz ch02_bfs
/* Обхождане в ширина (BFS) от s към t.
   Връща dist[t] = брой ребра по най-краткия път, или -1, ако t е недостижим.
   parent[] пази дървото на обхождането — от него се възстановява пътят. */
int bfs(int n, const int adj[][MAXV], int s, int t, int parent[])
{
    int dist[MAXV], queue[MAXV], head = 0, tail = 0;
    for (int v = 0; v < n; v++) { dist[v] = -1; parent[v] = -1; } //@init
    dist[s] = 0;                                                     //@start
    queue[tail++] = s;                                               //@start
    while (head < tail) {                                            //@loop
        int u = queue[head++];                                       //@deq
        if (u == t)                                                  //@deq
            return dist[u];          /* t е изваден: намерен */      //@found
        for (int v = 0; v < n; v++)
            if (adj[u][v] && dist[v] < 0) {                          //@edge
                dist[v] = dist[u] + 1;                               //@visit
                parent[v] = u;                                       //@visit
                queue[tail++] = v;                                   //@visit
            }
    }
    return -1;  /* опашката е празна: ВСИЧКИ достижими са обходени */ //@empty
}

/* 1) Разпознаване: „Има ли път от s до t?“ — отговор да/не */
int reachable(int n, const int adj[][MAXV], int s, int t)
{
    int parent[MAXV];
    return bfs(n, adj, s, t, parent) >= 0;                           //@dec
}

/* 2) Търсене: „Намери път“ — връща броя върхове в path[] (0 = няма) */
int find_path(int n, const int adj[][MAXV], int s, int t, int path[])
{
    int parent[MAXV], len = 0;
    if (bfs(n, adj, s, t, parent) < 0) return 0;
    for (int v = t; v != -1; v = parent[v])                          //@back
        path[len++] = v;                                             //@back
    for (int i = 0; i < len / 2; i++) {      /* обръщане s..t */
        int x = path[i]; path[i] = path[len - 1 - i]; path[len - 1 - i] = x;
    }
    return len;
}

/* 3) Оптимизация: „Най-кратък път“ — BFS вади върховете по
   нарастващ брой ребра, затова първото изваждане на t е минимално */
int shortest_len(int n, const int adj[][MAXV], int s, int t)
{
    int parent[MAXV];
    return bfs(n, adj, s, t, parent);                                //@opt
}
//#end

//#viz ch02_collatz
/* Колац: n -> n/2 (четно) или 3n+1 (нечетно); спира при n == 1.
   Дали спира за ВСЯКО n >= 1, е открит въпрос. За n = 0 зацикля (0 -> 0). */
long collatz(long n)
{                                                        //@enter
    long steps = 0;
    while (n != 1) {                                     //@cond
        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;            //@step
        steps++;                                         //@step
    }
    return steps;                                        //@halt
}
//#end

//#viz ch02_is_even
/* Спира само за четни x >= 0; за нечетно x прескача 0 и не спира
   (в модела с неограничени цели числа; в C int препълването е UB). */
int is_even_loop(int x)
{                                                        //@enter
    while (x != 0)                                       //@cond
        x = x - 2;                                       //@step
    return 1;                                            //@halt
}
//#end

//#viz ch02_countdown
/* Брояч надолу: спира за всяко n (ранг. функция n намалява). */
int countdown(int n)
{                                                        //@enter
    while (n > 0)                                        //@cond
        n--;                                             //@step
    return 0;                                            //@halt
}
//#end

//#viz ch02_forever
/* Вечен цикъл: не спира за нито един вход. */
void forever(int n)
{                                                        //@enter
    (void)n;
    while (1) {                                          //@cond
        /* нищо не се променя */                         //@step
    }
}
//#end

/* Програмите като (спряла ли е?, една стъпка) — за симулатора */
static int  collatz_halted(long s)   { return s == 1; }
static long collatz_next(long s)     { return (s % 2 == 0) ? s / 2 : 3 * s + 1; }
static int  is_even_halted(long s)   { return s == 0; }
static long is_even_next(long s)     { return s - 2; }
static int  countdown_halted(long s) { return s <= 0; }
static long countdown_next(long s)   { return s - 1; }
static int  forever_halted(long s)   { (void)s; return 0; }
static long forever_next(long s)     { return s; }

//#viz ch02_semi
/* Процедура, която ПОЛУрешава „спира ли P върху x?“:
   симулираме P стъпка по стъпка. Ако P спре — отговорът е ДА.
   Без лимит това е полуразрешаваща процедура (самата тя може да не спре).
   С лимит връща 0 = „още не“, което НЕ означава „никога“. */
typedef struct {
    int  (*halted)(long state);   /* спряла ли е P в това състояние? */
    long (*next)(long state);     /* една стъпка на P                */
} program;

int halts_within(program P, long x, long limit, long *steps)
{
    long s = x;                                          //@enter
    for (*steps = 0; !P.halted(s); ++*steps) {           //@check
        if (*steps == limit)                             //@limit
            return 0;     /* „още не“ — НЕ е „никога“ */ //@unknown
        s = P.next(s);                                   //@sim
    }
    return 1;             /* P спря: ДА, потвърдено */   //@yes
}
//#end

#define NP 6

//#viz ch02_diag
/* H[i][j] = 1, ако предполагаемият решател казва „Pi спира върху вход Pj“.
   D обръща диагонала: D(Pi) спира  <=>  H[i][i] == 0. */
void build_d(const int H[][NP], int n, int d[])
{
    for (int i = 0; i < n; i++)                          //@loop
        d[i] = !H[i][i];                                 //@flip
}

/* Търси ред, равен на D. Винаги връща -1: D се различава от ред i
   поне в колона i, значи D не е никоя от изброените програми. */
int row_equal_to_d(const int H[][NP], int n, const int d[])
{
    for (int i = 0; i < n; i++) {                        //@row
        int same = 1;
        for (int j = 0; j < n && same; j++)
            same = (H[i][j] == d[j]);                    //@cmp
        if (same) return i;                              //@same
    }
    return -1;                                           //@none
}
//#end

//#viz ch02_diag_D
/* Хипотетичен решател: halts(p, x) == 1 <=> програма p спира върху вход x.
   Тюринг: такава винаги вярна и винаги завършваща функция не съществува. */
typedef int (*halts_fn)(int prog, int input);

/* D(p): прави обратното на това, което halts предсказва за p върху p */
int D(halts_fn halts, int p)
{
    if (halts(p, p))          /* „p спира върху себе си“ ... */  //@ask
        for (;;) { }          /* ... тогава D зацикля           */  //@loop
    return 0;                 /* иначе D спира                   */  //@halt
}
/* Въпрос: какво казва halts(D, D)?
   1 => D(D) зацикля;  0 => D(D) спира.  И в двата случая halts греши. */
//#end

/* „решател“-заглушка: винаги казва „не спира“ (затова греши за D) */
static int halts_stub(int prog, int input) { (void)prog; (void)input; return 0; }

/* граф: A..H, H е изолиран */
static const char *EDGES[] = { "AB", "AC", "BD", "CD", "CE", "DF", "EF", "EG", "FG" };

static void build(int adj[][MAXV], const char *cut)
{
    memset(adj, 0, sizeof(int) * MAXV * MAXV);
    for (size_t k = 0; k < sizeof EDGES / sizeof EDGES[0]; k++) {
        int a = EDGES[k][0] - 'A', b = EDGES[k][1] - 'A';
        char e1[3] = { EDGES[k][0], EDGES[k][1], 0 }, e2[3] = { EDGES[k][1], EDGES[k][0], 0 };
        if (strstr(cut, e1) || strstr(cut, e2)) continue;
        adj[a][b] = adj[b][a] = 1;
    }
}

static void report(const char *cut, char s, char t)
{
    int adj[MAXV][MAXV], path[MAXV];
    build(adj, cut);
    int S = s - 'A', T = t - 'A';
    printf("reach(%c,%c|%s) = %d\n", s, t, cut, reachable(MAXV, adj, S, T));
    printf("dist(%c,%c|%s) = %d\n", s, t, cut, shortest_len(MAXV, adj, S, T));
    int len = find_path(MAXV, adj, S, T, path);
    printf("path(%c,%c|%s) =", s, t, cut);
    for (int i = 0; i < len; i++) printf(" %c", 'A' + path[i]);
    printf("%s\n", len ? "" : " -");
}

static void semi(const char *name, program f, long x, long limit)
{
    long steps;
    int r = halts_within(f, x, limit, &steps);
    printf("semi %s(%ld,%ld) = %d %ld\n", name, x, limit, r, steps);
}

static void diag(const char *rows)
{
    int H[NP][NP], d[NP], n = 0;
    for (const char *p = rows; *p; ) {           /* "1010 0110 ..." */
        int j = 0;
        while (*p == '0' || *p == '1') H[n][j++] = *p++ - '0';
        n++;
        while (*p == ' ') p++;
    }
    build_d(H, n, d);
    printf("diag(%s) = ", rows);
    for (int i = 0; i < n; i++) printf("%d", d[i]);
    printf(" %d\n", row_equal_to_d(H, n, d));
}

#ifndef NO_MAIN
int main(void)
{
    report("", 'A', 'F');
    report("", 'A', 'G');
    report("", 'A', 'H');
    report("", 'C', 'B');
    report("DF EF", 'A', 'F');
    report("DF EF FG", 'A', 'F');
    report("AB AC", 'A', 'G');
    printf("collatz(27) = %ld\n", collatz(27));
    printf("collatz(6) = %ld\n", collatz(6));
    printf("is_even_loop(6) = %d\n", is_even_loop(6));
    printf("countdown(5) = %d\n", countdown(5));
    semi("collatz", (program){ collatz_halted, collatz_next }, 27, 200);
    semi("collatz", (program){ collatz_halted, collatz_next }, 27, 100);
    semi("collatz", (program){ collatz_halted, collatz_next }, 6, 8);
    semi("collatz", (program){ collatz_halted, collatz_next }, 6, 7);
    semi("collatz", (program){ collatz_halted, collatz_next }, 6, 200);
    semi("collatz", (program){ collatz_halted, collatz_next }, 0, 50);
    semi("is_even", (program){ is_even_halted, is_even_next }, 6, 50);
    semi("is_even", (program){ is_even_halted, is_even_next }, 7, 50);
    semi("countdown", (program){ countdown_halted, countdown_next }, 5, 50);
    semi("forever", (program){ forever_halted, forever_next }, 0, 50);
    diag("1010 0110 1101 0011");
    diag("00000 00000 00000 00000 00000");
    diag("110100 011001 101011 000110 111111 010101");
    printf("D(stub, 3) = %d\n", D(halts_stub, 3));
    (void)forever;
    return 0;
}
#endif
