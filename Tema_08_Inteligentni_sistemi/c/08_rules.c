/* Тема 8, раздели 8–9 — продукционни правила: прав и обратен извод с обяснение.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 08_rules.c -o 08 && ./08
 *
 * База от знания (правила), ред по ред:   R1: T>80 -> прегряване
 *                                          R3: има_захранване & не_отговаря -> провери_връзката
 * Работна памет (факти):                  "T=90 има_захранване не_отговаря"
 * Условие е символ (факт) или сравнение X>n, X<n, X>=n, X<=n, X=n с числов факт X=стойност.
 *
 * Прав извод: цикъл „съпоставяне → конфликтно множество → избор → изпълнение“.
 *   Конфликтното множество съдържа правилата с изпълнени условия, чието заключение още го няма
 *   в работната памет (опростена рефракция; класическата в OPS5/CLIPS забранява повторно задействане
 *   на една и съща инстанциация — правило + същите съпоставени факти).
 *   Стратегия 0: по реда на правилата (приоритет); 1: по специфичност (повече условия), после по ред.
 * Обратен извод: от цел към подцели, в дълбочина, правилата се пробват по реда им;
 *   цел, която вече е в стека на доказване, се отхвърля (защита от цикъл).
 * g_* са броячи за визуализацията.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define MAXR 24
#define MAXC 6
#define MAXF 48
#define SYM 48

typedef struct { char name[16]; int nc; char cond[MAXC][SYM]; char concl[SYM]; } Rule;
typedef struct { char sym[SYM]; int num, has_num, by; } Fact;   /* by: индекс на правилото или -1 (вход) */

static Rule R[MAXR]; static int NR;
static Fact WM[MAXF]; static int NWM;
static int g_cycles, g_tests, g_calls;
static int g_fired[64], g_nfired;

/* ---------- разбор ---------- */
static char *trim(char *s) { while (*s == ' ') s++; char *e = s + strlen(s); while (e > s && e[-1] == ' ') *--e = 0; return s; }
static void parse_rules(const char *text)
{
    char buf[2048]; snprintf(buf, sizeof buf, "%s", text);
    NR = 0;
    char *save1 = NULL;
    for (char *ln = strtok_r(buf, ";\n", &save1); ln; ln = strtok_r(NULL, ";\n", &save1)) {
        char *arrow = strstr(ln, "->");
        if (!arrow) continue;
        *arrow = 0;
        Rule *r = &R[NR];
        char *lhs = ln, *colon = strchr(ln, ':');
        if (colon) { *colon = 0; snprintf(r->name, sizeof r->name, "%s", trim(ln)); lhs = colon + 1; }
        else snprintf(r->name, sizeof r->name, "R%d", NR + 1);
        snprintf(r->concl, SYM, "%s", trim(arrow + 2));
        r->nc = 0;
        char *save2 = NULL;
        for (char *c = strtok_r(lhs, "&", &save2); c; c = strtok_r(NULL, "&", &save2))
            snprintf(r->cond[r->nc++], SYM, "%s", trim(c));
        NR++;
    }
}
static void parse_facts(const char *text)
{
    char buf[1024]; snprintf(buf, sizeof buf, "%s", text);
    NWM = 0;
    char *save = NULL;
    for (char *t = strtok_r(buf, " ,", &save); t; t = strtok_r(NULL, " ,", &save)) {
        Fact *f = &WM[NWM++];
        char *eq = strchr(t, '=');
        f->by = -1; f->has_num = 0;
        if (eq) { *eq = 0; f->num = atoi(eq + 1); f->has_num = 1; }
        snprintf(f->sym, SYM, "%s", t);
    }
}

static int find_fact(const char *s) { for (int i = 0; i < NWM; i++) if (!strcmp(WM[i].sym, s)) return i; return -1; }

/* Условие: символ или сравнение с числов факт. */
static int holds(const char *c)
{
    g_tests++;
    const char *ops[] = {">=", "<=", ">", "<", "="};
    for (int k = 0; k < 5; k++) {
        const char *p = strstr(c, ops[k]);
        if (!p) continue;
        char var[SYM]; int L = (int)(p - c); if (L >= SYM) L = SYM - 1;
        memcpy(var, c, (size_t)L); var[L] = 0;
        int f = find_fact(var);
        if (f < 0 || !WM[f].has_num) return 0;
        int x = WM[f].num, n = atoi(p + strlen(ops[k]));
        switch (k) { case 0: return x >= n; case 1: return x <= n; case 2: return x > n; case 3: return x < n; default: return x == n; }
    }
    return find_fact(c) >= 0;
}
static void assert_fact(const char *s, int by) { Fact *f = &WM[NWM++]; snprintf(f->sym, SYM, "%s", s); f->has_num = 0; f->by = by; }

//#viz ch08_forward
/* strategy: 0 — по реда (приоритет), 1 — по специфичност; refraction: 1 — правило не се
   задейства отново, ако заключението му вече е в паметта; limit — предпазен брой цикли */
int forward(int strategy, int refraction, int limit)
{
    for (;;) {
        if (++g_cycles > limit)                                //@cycle
            return -1;                                         //@limit
        int chosen = -1;
        for (int r = 0; r < NR; r++) {                         //@match
            if (refraction && find_fact(R[r].concl) >= 0)
                continue;                                      //@refr
            int ok = 1;
            for (int c = 0; c < R[r].nc && ok; c++)
                ok = holds(R[r].cond[c]);                      //@cond
            if (!ok) continue;
            /* правилото е в конфликтното множество */
            if (chosen < 0 || (strategy == 1 && R[r].nc > R[chosen].nc))  //@conflict
                chosen = r;
        }
        if (chosen < 0)                                        //@stop
            return g_nfired;
        if (find_fact(R[chosen].concl) < 0)
            assert_fact(R[chosen].concl, chosen);              //@fire
        g_fired[g_nfired++] = chosen;                          //@act
    }
}
//#end

static char STACK[16][SYM]; static int NST;

//#viz ch08_backward
int prove(const char *goal)
{
    g_calls++;                                                 //@call
    if (holds(goal))                                           //@known
        return 1;
    for (int s = 0; s < NST; s++)
        if (!strcmp(STACK[s], goal)) return 0;                 //@loopchk
    if (NST >= 16) return 0;
    snprintf(STACK[NST++], SYM, "%s", goal);
    for (int r = 0; r < NR; r++) {                             //@rules
        if (strcmp(R[r].concl, goal)) continue;
        int ok = 1;                                            //@try
        for (int c = 0; c < R[r].nc && ok; c++)
            ok = prove(R[r].cond[c]);                          //@sub
        if (ok) {
            assert_fact(goal, r);                              //@proved
            g_fired[g_nfired++] = r;
            NST--;
            return 1;
        }
    }
    NST--;
    return 0;                                                  //@fail
}
//#end

#ifndef NO_MAIN
static void dump(const char *tag)
{
    int any = 0;
    printf("%s wm =", tag);
    for (int i = 0; i < NWM; i++) if (!WM[i].has_num) { printf(" %s", WM[i].sym); any = 1; }
    if (!any) printf(" -");
    printf("\n%s fired =", tag);
    for (int i = 0; i < g_nfired; i++) printf(" %s", R[g_fired[i]].name);
    if (!g_nfired) printf(" -");
    printf("\n");
}
static void fw(const char *tag, const char *rules, const char *facts, int strategy, int refraction)
{
    parse_rules(rules); parse_facts(facts);
    g_cycles = g_tests = g_nfired = 0;
    int r = forward(strategy, refraction, 12);
    printf("%s result = %d\n", tag, r);
    dump(tag);
    printf("%s cycles = %d\n%s tests = %d\n", tag, g_cycles, tag, g_tests);
}
static void bw(const char *tag, const char *rules, const char *facts, const char *goal)
{
    parse_rules(rules); parse_facts(facts);
    g_calls = g_tests = g_nfired = 0; NST = 0;
    int ok = prove(goal);
    printf("%s proved = %d\n", tag, ok);
    dump(tag);
    printf("%s calls = %d\n%s tests = %d\n", tag, g_calls, tag, g_tests);
}

static const char *KB1 =
    "R1: T>80 -> прегряване\n"
    "R2: липсва_захранване -> провери_захранващия_път\n"
    "R3: има_захранване & не_отговаря -> провери_връзката\n"
    "R4: не_отговаря -> рестартирай\n"
    "R5: прегряване & провери_връзката -> спри_и_охлади";
static const char *KB2 =
    "R1: A & B -> C\n"
    "R2: C -> D\n"
    "R3: D & E -> G\n"
    "R4: F -> G\n"
    "R5: G -> H";
static const char *KB3 =
    "R1: P -> Q\n"
    "R2: Q -> P\n"
    "R3: S -> P";

int main(void)
{
    fw("f1", KB1, "T=90 има_захранване не_отговаря", 0, 1);
    fw("f2", KB1, "T=90 има_захранване не_отговаря", 1, 1);
    fw("f3", KB1, "T=70 липсва_захранване", 0, 1);
    fw("f4", KB2, "A B E", 0, 1);
    fw("f5", KB2, "F", 1, 1);
    fw("f6", KB1, "T=90 има_захранване не_отговаря", 0, 0);
    fw("f7", KB2, "A B E", 1, 1);
    bw("b1", KB1, "T=90 има_захранване не_отговаря", "спри_и_охлади");
    bw("b2", KB1, "T=70 има_захранване не_отговаря", "спри_и_охлади");
    bw("b3", KB2, "A B E", "H");
    bw("b4", KB2, "F", "H");
    bw("b5", KB3, "S", "Q");
    bw("b6", KB3, "", "Q");
    return 0;
}
#endif
