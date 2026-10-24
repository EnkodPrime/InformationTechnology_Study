/* Тема 6, раздел 3 — релационна алгебра върху малки таблици от низове.
 * Операции: селекция σ, проекция π, декартово произведение ×, естествено съединение ⋈,
 * обединение ∪, разлика −, сечение ∩. Резултатите са МНОЖЕСТВА (без повторения),
 * освен проекцията в режим "bag" (както SQL SELECT без DISTINCT).
 *
 * Формат на таблица:  "A B C|1 x p|2 x q"  — първият сегмент е схемата, следващите са редове.
 * Сравненията в σ: ако и двете стойности са цели числа — числово, иначе като низове.
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 03_algebra.c -o algebra && ./algebra
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MC 8
#define MR 64
#define W 16

typedef struct {
    int nc, nr;
    char col[MC][W];
    char v[MR][MC][W];
} Rel;

static long cmp_count;   /* брой сравнения на редове/стойности */

static void parse_rel(const char *txt, Rel *r)
{
    r->nc = r->nr = 0;
    int first = 1;
    const char *p = txt;
    while (*p) {
        const char *end = strchr(p, '|');
        if (!end) end = p + strlen(p);
        int k = 0;
        const char *q = p;
        while (q < end && k < MC) {
            while (q < end && (*q == ' ' || *q == '\t')) q++;
            if (q >= end) break;
            const char *t = q;
            while (q < end && *q != ' ' && *q != '\t') q++;
            int len = (int)(q - t) < W - 1 ? (int)(q - t) : W - 1;
            char *dst = first ? r->col[k] : r->v[r->nr][k];
            memcpy(dst, t, (size_t)len); dst[len] = '\0';
            k++;
        }
        if (first) { r->nc = k; first = 0; }
        else if (k == r->nc && k > 0 && r->nr < MR) r->nr++;
        p = *end ? end + 1 : end;
    }
}

static int col_index(const Rel *r, const char *name)
{ for (int j = 0; j < r->nc; j++) if (!strcmp(r->col[j], name)) return j; return -1; }

static int is_int(const char *s)
{ char *e; if (!*s) return 0; strtol(s, &e, 10); return *e == '\0'; }

static int same_row(const Rel *a, int i, const Rel *b, int k)
{
    cmp_count++;
    for (int j = 0; j < a->nc; j++) if (strcmp(a->v[i][j], b->v[k][j])) return 0;
    return 1;
}
static int contains(const Rel *r, const Rel *src, int i)
{ for (int k = 0; k < r->nr; k++) if (same_row(src, i, r, k)) return 1; return 0; }
static void copy_row(Rel *dst, const Rel *src, int i)
{ memcpy(dst->v[dst->nr++], src->v[i], sizeof src->v[i]); }

//#viz ch03_select
/* σ_{col op val}(R) — селекция: избира РЕДОВЕ по условие */
int test_cond(const char *x, const char *op, const char *val)
{
    long c = is_int(x) && is_int(val) ? strtol(x, NULL, 10) - strtol(val, NULL, 10)
                                      : (long)strcmp(x, val);
    if (!strcmp(op, "="))  return c == 0;
    if (!strcmp(op, "!=")) return c != 0;
    if (!strcmp(op, "<"))  return c < 0;
    if (!strcmp(op, ">"))  return c > 0;
    if (!strcmp(op, "<=")) return c <= 0;
    return c >= 0;  /* ">=" */
}

void select_rel(const Rel *R, int col, const char *op, const char *val, Rel *out)
{
    out->nc = R->nc; out->nr = 0;                              //@sel_init
    memcpy(out->col, R->col, sizeof R->col);
    for (int i = 0; i < R->nr; i++) {                          //@sel_loop
        cmp_count++;
        if (test_cond(R->v[i][col], op, val))                  //@sel_test
            copy_row(out, R, i);                               //@sel_keep
    }
}
//#end

//#viz ch03_project
/* π_{cols}(R) — проекция: избира КОЛОНИ; като множество премахва повторенията */
void project_rel(const Rel *R, const int *cols, int k, int bag, Rel *out)
{
    out->nc = k; out->nr = 0;                                  //@pr_init
    for (int j = 0; j < k; j++) memcpy(out->col[j], R->col[cols[j]], W);
    for (int i = 0; i < R->nr; i++) {                          //@pr_loop
        for (int j = 0; j < k; j++)         /* кандидат: следващият ред на out */
            memcpy(out->v[out->nr][j], R->v[i][cols[j]], W);   //@pr_build
        if (!bag && contains(out, out, out->nr))               //@pr_dup
            continue;                                          //@pr_skip
        out->nr++;                                             //@pr_keep
    }
}
//#end

//#viz ch03_product
/* R × S — декартово произведение: всеки ред на R с всеки ред на S */
void product_rel(const Rel *R, const Rel *S, Rel *out)
{
    out->nc = R->nc + S->nc; out->nr = 0;                      //@px_init
    for (int j = 0; j < R->nc; j++)        /* общо име -> префикс R. / S. */
        snprintf(out->col[j], W, col_index(S, R->col[j]) >= 0 ? "R.%.12s" : "%.15s", R->col[j]);
    for (int j = 0; j < S->nc; j++)
        snprintf(out->col[R->nc + j], W, col_index(R, S->col[j]) >= 0 ? "S.%.12s" : "%.15s", S->col[j]);
    for (int i = 0; i < R->nr; i++)                            //@px_outer
        for (int k = 0; k < S->nr; k++) {                      //@px_inner
            cmp_count++;
            memcpy(out->v[out->nr], R->v[i], sizeof(char[W]) * R->nc);
            memcpy(out->v[out->nr] + R->nc, S->v[k], sizeof(char[W]) * S->nc);
            out->nr++;                                         //@px_emit
        }
}
//#end

//#viz ch03_join
/* R ⋈ S — естествено съединение по общите имена на колони (вложени цикли) */
void join_rel(const Rel *R, const Rel *S, Rel *out)
{
    int ri[MC], si[MC], nk = 0, extra[MC], ne = 0;             //@j_init
    for (int k = 0; k < S->nc; k++) {
        int j = col_index(R, S->col[k]);
        if (j >= 0) { ri[nk] = j; si[nk] = k; nk++; }
        else extra[ne++] = k;
    }
    out->nc = R->nc + ne; out->nr = 0;
    memcpy(out->col, R->col, sizeof(char[W]) * R->nc);
    for (int e = 0; e < ne; e++) memcpy(out->col[R->nc + e], S->col[extra[e]], W);
    for (int i = 0; i < R->nr; i++)                            //@j_outer
        for (int k = 0; k < S->nr; k++) {                      //@j_inner
            cmp_count++;
            int match = 1;
            for (int c = 0; c < nk; c++)                       //@j_test
                if (strcmp(R->v[i][ri[c]], S->v[k][si[c]])) { match = 0; break; }
            if (!match) continue;
            memcpy(out->v[out->nr], R->v[i], sizeof(char[W]) * R->nc);   //@j_emit
            for (int e = 0; e < ne; e++) memcpy(out->v[out->nr][R->nc + e], S->v[k][extra[e]], W);
            out->nr++;
        }
}
//#end

//#viz ch03_setops
/* ∪, −, ∩ — изискват съвместими схеми (еднакъв брой и имена на колоните) */
int compatible(const Rel *R, const Rel *S)
{
    if (R->nc != S->nc) return 0;                              //@so_compat
    for (int j = 0; j < R->nc; j++) if (strcmp(R->col[j], S->col[j])) return 0;
    return 1;
}

void setop_rel(const Rel *R, const Rel *S, char op, Rel *out)
{
    out->nc = R->nc; out->nr = 0;                              //@so_init
    memcpy(out->col, R->col, sizeof R->col);
    for (int i = 0; i < R->nr; i++) {                          //@so_r
        int inS = contains(S, R, i);                           //@so_probe
        int keep = op == 'U' || (op == '-' && !inS) || (op == '^' && inS);
        if (keep && !contains(out, R, i)) copy_row(out, R, i); //@so_keep
    }
    if (op == 'U')
        for (int k = 0; k < S->nr; k++)                        //@so_s
            if (!contains(out, S, k)) copy_row(out, S, k);     //@so_add
}
//#end

static void print_rel(const char *name, const Rel *r)
{
    printf("%s = ", name);
    for (int i = 0; i < r->nr; i++) {
        for (int j = 0; j < r->nc; j++) printf("%s%s", j ? "," : "", r->v[i][j]);
        printf("%s", i + 1 < r->nr ? ";" : "");
    }
    printf("\n%s cols = ", name);
    for (int j = 0; j < r->nc; j++) printf("%s%s", j ? "," : "", r->col[j]);
    printf("\n%s cmp = %ld\n", name, cmp_count);
}

#ifndef NO_MAIN
#define STUD "sid name pid|1 Ana INF|2 Boris MAT|3 Vera INF|4 Galin FIZ"
#define PROG "pid pname|INF Informatika|MAT Matematika|PED Pedagogika"
#define ENR  "sid cid grade|1 C1 6|1 C2 5|2 C1 4|3 C2 3"
#define R1 "A B C|1 x p|2 x q|3 y p"
#define R2 "A B C|2 x q|3 y p|4 z r"

int main(void)
{
    static Rel a, b, o;
    parse_rel(STUD, &a);
    cmp_count = 0; select_rel(&a, 2, "=", "INF", &o); print_rel("sel1", &o);
    cmp_count = 0; select_rel(&a, 0, ">", "2", &o); print_rel("sel2", &o);
    parse_rel(ENR, &a);
    cmp_count = 0; select_rel(&a, 2, ">=", "5", &o); print_rel("sel3", &o);
    cmp_count = 0; select_rel(&a, 1, "!=", "C1", &o); print_rel("sel4", &o);

    parse_rel(STUD, &a);
    int c1[] = {2};
    cmp_count = 0; project_rel(&a, c1, 1, 0, &o); print_rel("pr1", &o);
    cmp_count = 0; project_rel(&a, c1, 1, 1, &o); print_rel("pr2", &o);
    parse_rel(ENR, &a);
    int c2[] = {1, 0};
    cmp_count = 0; project_rel(&a, c2, 2, 0, &o); print_rel("pr3", &o);

    parse_rel("sid name|1 Ana|2 Boris", &a); parse_rel("cid title|C1 Bazi|C2 Algo|C3 Mrezhi", &b);
    cmp_count = 0; product_rel(&a, &b, &o); print_rel("px1", &o);
    parse_rel(STUD, &a); parse_rel(PROG, &b);
    cmp_count = 0; product_rel(&a, &b, &o); print_rel("px2", &o);

    cmp_count = 0; join_rel(&a, &b, &o); print_rel("j1", &o);
    parse_rel(ENR, &b);
    cmp_count = 0; join_rel(&a, &b, &o); print_rel("j2", &o);
    parse_rel("A B|1 x|2 x", &a); parse_rel("B C|x p|x q", &b);
    cmp_count = 0; join_rel(&a, &b, &o); print_rel("j3", &o);

    parse_rel(R1, &a); parse_rel(R2, &b);
    cmp_count = 0; setop_rel(&a, &b, 'U', &o); print_rel("u1", &o);
    cmp_count = 0; setop_rel(&a, &b, '-', &o); print_rel("d1", &o);
    cmp_count = 0; setop_rel(&a, &b, '^', &o); print_rel("i1", &o);
    cmp_count = 0; setop_rel(&b, &a, '-', &o); print_rel("d2", &o);
    printf("compat1 = %d\n", compatible(&a, &b));
    parse_rel("A B|1 x", &b);
    printf("compat2 = %d\n", compatible(&a, &b));
    return 0;
}
#endif
