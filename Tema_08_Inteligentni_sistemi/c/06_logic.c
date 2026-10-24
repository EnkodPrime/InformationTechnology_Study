/* Тема 8, раздел 6 — логическо представяне на знания.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 06_logic.c -o 06 && ./06
 *
 * 1) Валидност на извод по таблица на истинност: изводът е валиден, ако във ВСЯКО
 *    присвояване, при което всички предпоставки са верни, и заключението е вярно.
 *    Формули над променливите P Q R S с операции  !  &  |  ->  и скоби.
 *    Приоритет: ! > & > | > -> (импликацията е дясноасоциативна).
 * 2) Заявка към база от факти при отворен и при затворен свят.
 */
#include <stdio.h>
#include <string.h>

/* ---------- разбор и пресмятане на формула (рекурсивно спускане) ---------- */
static const char *P;
static int VAL[4];                 /* стойности на P Q R S */
static int var_index(char c) { const char *v = "PQRS"; const char *p = strchr(v, c); return p && c ? (int)(p - v) : -1; }
static void ws(void) { while (*P == ' ') P++; }
static int imp(void);
static int atom(void)
{
    ws();
    if (*P == '!') { P++; return !atom(); }
    if (*P == '(') { P++; int v = imp(); ws(); if (*P == ')') P++; return v; }
    int k = var_index(*P);
    P++;
    return k >= 0 ? VAL[k] : 0;
}
static int conj_f(void) { int v = atom(); for (ws(); *P == '&'; ws()) { P++; int r = atom(); v = v && r; } return v; }
static int disj(void) { int v = conj_f(); for (ws(); *P == '|'; ws()) { P++; int r = conj_f(); v = v || r; } return v; }
static int imp(void)
{
    int v = disj();
    ws();
    if (P[0] == '-' && P[1] == '>') { P += 2; int r = imp(); return !v || r; }   /* материална импликация */
    return v;
}
static int eval(const char *f) { P = f; return imp(); }

static int g_rows, g_models, g_counter;
static int g_first_cex = -1;

//#viz ch06_valid
/* prem[0..np-1] — предпоставки, concl — заключение, nv — брой променливи (P, Q, ...) */
int valid(const char *prem[], int np, const char *concl, int nv)
{
    int ok = 1;
    for (int a = 0; a < (1 << nv); a++) {                 //@row
        for (int k = 0; k < nv; k++)
            VAL[k] = (a >> (nv - 1 - k)) & 1;              /* P е старшият бит */
        g_rows++;
        int all = 1;
        for (int i = 0; i < np; i++)                       //@prem
            all = all && eval(prem[i]);
        if (!all)                                          //@skip
            continue;
        g_models++;
        if (!eval(concl)) {                                //@concl
            g_counter++;                                   //@cex
            if (g_first_cex < 0) g_first_cex = a;
            ok = 0;
        }
    }
    return ok;                                             //@ret
}
//#end

//#viz ch06_world
enum { NO, YES, UNKNOWN };
/* known — факти, записани като верни; neg — факти, записани изрично като неверни */
int query(const char *fact, const char *known[], int nk, const char *neg[], int nn, int closed)
{
    for (int i = 0; i < nk; i++)
        if (strcmp(known[i], fact) == 0) return YES;       //@yes
    for (int i = 0; i < nn; i++)
        if (strcmp(neg[i], fact) == 0) return NO;          //@no
    if (closed)                                            //@cwa
        return NO;     /* затворен свят: липсата се приема за „не“ */
    return UNKNOWN;    /* отворен свят: липсата не доказва отрицание */  //@owa
}
//#end

#ifndef NO_MAIN
static void run(const char *tag, const char *prem[], int np, const char *concl, int nv)
{
    g_rows = g_models = g_counter = 0; g_first_cex = -1;
    int v = valid(prem, np, concl, nv);
    printf("%s valid = %d\n", tag, v);
    printf("%s rows = %d\n", tag, g_rows);
    printf("%s models = %d\n", tag, g_models);
    printf("%s counter = %d\n", tag, g_counter);
    printf("%s first = %d\n", tag, g_first_cex);
}

int main(void)
{
    const char *mp[] = {"P", "P -> Q"};
    run("mp", mp, 2, "Q", 2);                       /* modus ponens */
    const char *ac[] = {"Q", "P -> Q"};
    run("ac", ac, 2, "P", 2);                       /* потвърждаване на следствието */
    const char *mt[] = {"!Q", "P -> Q"};
    run("mt", mt, 2, "!P", 2);                      /* modus tollens */
    const char *hs[] = {"P -> Q", "Q -> R"};
    run("hs", hs, 2, "P -> R", 3);
    const char *da[] = {"!P", "P -> Q"};
    run("da", da, 2, "!Q", 2);                      /* отричане на предпоставката */
    const char *ds[] = {"P | Q", "!P"};
    run("ds", ds, 2, "Q", 2);

    const char *known[] = {"подаден(doc1)"}, *neg[] = {"подаден(doc3)"};
    const char *q[] = {"подаден(doc1)", "подаден(doc2)", "подаден(doc3)"};
    for (int i = 0; i < 3; i++) {
        printf("q%d owa = %d\n", i + 1, query(q[i], known, 1, neg, 1, 0));
        printf("q%d cwa = %d\n", i + 1, query(q[i], known, 1, neg, 1, 1));
    }
    return 0;
}
#endif
