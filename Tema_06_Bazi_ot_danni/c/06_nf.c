/* Тема 6, раздели 6–8 — нормални форми и разлагане.
 *   nf_analyze        — кандидатни ключове, първични атрибути, нарушения на 2НФ / 3НФ / BCNF
 *   bcnf_decompose    — разлагане по нарушаваща зависимост X -> X⁺ (стандартен алгоритъм)
 *   preserved         — запазва ли разлагането дадена ФЗ (проверка чрез затваряне по проекциите)
 *   chase             — проверка за беззагубно съединение (метод на таблицата, „chase“)
 *   spurious_join     — проекции на конкретни редове и тяхното естествено съединение
 *
 * Използва затварянето X⁺ от 05_fd.c.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 06_nf.c -o nf && ./nf
 */
#define FD_NO_MAIN
#include "05_fd.c"

#define MAXV 64
#define MAXRELS 12

typedef struct { Set lhs; int attr; int kind; } Viol;   /* kind: 2 — частична (2НФ), 3 — 3НФ, 4 — BCNF */

static Set all_attrs(const Schema *S) { return (1u << S->n) - 1; }

//#viz ch07_analyze
/* Връща най-високата изпълнена форма: 1 (само 1НФ), 2, 3 или 4 (= BCNF). */
int nf_analyze(const Schema *S, Viol v[], int *nv, Set *prime_out)
{
    Set keys[64], prime = 0, all = all_attrs(S);
    int nk = candidate_keys(S, keys, 64);                       //@an_keys
    for (int i = 0; i < nk; i++) prime |= keys[i];              //@an_prime
    *prime_out = prime; *nv = 0;
    int partial = 0, bad3 = 0, badB = 0;
    /* 2НФ: непървичен атрибут, определен от СОБСТВЕНА част на кандидатен ключ */
    for (int i = 0; i < nk; i++)                                //@an_key
        for (Set X = (keys[i] - 1) & keys[i]; X; X = (X - 1) & keys[i]) {
            Set dep = closure(S, X) & ~X & ~prime;              //@an_part
            for (int a = 0; a < S->n; a++)
                if (dep >> a & 1u) {
                    v[(*nv)++] = (Viol){ X, a, 2 };             //@an_partbad
                    partial = 1;
                }
        }
    /* 3НФ и BCNF: всяка нетривиална X -> A от F */
    for (int f = 0; f < S->nf; f++)                             //@an_fd
        for (int a = 0; a < S->n; a++) {
            if (!(S->f[f].rhs >> a & 1u) || (S->f[f].lhs >> a & 1u)) continue;
            if (closure(S, S->f[f].lhs) == all) continue;       //@an_super
            badB = 1;                                           //@an_bcnf
            if (prime >> a & 1u) { v[(*nv)++] = (Viol){ S->f[f].lhs, a, 4 }; continue; }
            bad3 = 1;                                           //@an_3nf
            v[(*nv)++] = (Viol){ S->f[f].lhs, a, 3 };
        }
    return partial ? 1 : bad3 ? 2 : badB ? 3 : 4;              //@an_level
}
//#end

//#viz ch08_bcnf
/* Нарушение на BCNF в подсхемата Ri: X ⊂ Ri, X -> (X⁺ ∩ Ri) е нетривиална, X не е суперключ на Ri.
   Подмножествата се обхождат по нарастващ размер — намира се най-малкият детерминант. */
static Set find_violation(const Schema *S, Set Ri, Set *closure_out)
{
    int m = popcount(Ri);
    for (int size = 1; size < m; size++)                        //@b_size
        for (Set X = (Ri - 1) & Ri; X; X = (X - 1) & Ri) {
            if (popcount(X) != size) continue;
            Set c = closure(S, X) & Ri;                         //@b_close
            if (c != X && c != Ri) { *closure_out = c; return X; }  //@b_viol
        }
    return 0;
}

int bcnf_decompose(const Schema *S, Set rels[], int maxr)
{
    int nr = 1;
    rels[0] = all_attrs(S);                                     //@b_init
    for (int i = 0; i < nr; ) {                                 //@b_pick
        Set c, X = find_violation(S, rels[i], &c);
        if (!X || nr >= maxr) { i++; continue; }                //@b_ok
        Set rest = rels[i] & ~(c & ~X);     /* Ri − (X⁺ − X) */
        rels[i] = c;                        /* X ∪ (X⁺ ∩ Ri) */  //@b_split
        rels[nr++] = rest;
    }
    return nr;
}
//#end

//#viz ch08_preserve
/* Запазена ли е X -> Y? Z расте само чрез затваряния вътре в отделните подсхеми. */
int preserved(const Schema *S, const Set rels[], int nr, FD d)
{
    Set Z = d.lhs;                                              //@p_init
    int changed = 1;
    while (changed) {                                           //@p_loop
        changed = 0;
        for (int i = 0; i < nr; i++) {                          //@p_rel
            Set add = closure(S, Z & rels[i]) & rels[i];        //@p_local
            if (add & ~Z) { Z |= add; changed = 1; }            //@p_grow
        }
    }
    return (d.rhs & ~Z) == 0;                                   //@p_res
}
//#end

//#viz ch06_chase
/* Таблица: ред i = подсхема Ri, колона j = атрибут.
   0 = отличен символ a_j; друго = b_ij. ФЗ изравнява символи; ред само от a_j => без загуба. */
static long chase_steps;
int chase(const Schema *S, const Set rels[], int nr)
{
    int t[MAXRELS][MAXA];
    for (int i = 0; i < nr; i++)                                //@c_init
        for (int j = 0; j < S->n; j++)
            t[i][j] = (rels[i] >> j & 1u) ? 0 : 1 + i * MAXA + j;
    int changed = 1;
    chase_steps = 0;
    while (changed) {                                           //@c_pass
        changed = 0;
        for (int f = 0; f < S->nf; f++)                         //@c_fd
            for (int r1 = 0; r1 < nr; r1++)
                for (int r2 = r1 + 1; r2 < nr; r2++) {
                    int agree = 1;
                    for (int j = 0; j < S->n; j++)              //@c_agree
                        if ((S->f[f].lhs >> j & 1u) && t[r1][j] != t[r2][j]) agree = 0;
                    if (!agree) continue;
                    for (int j = 0; j < S->n; j++) {
                        if (!(S->f[f].rhs >> j & 1u) || t[r1][j] == t[r2][j]) continue;
                        int keep = t[r1][j] < t[r2][j] ? t[r1][j] : t[r2][j];
                        int drop = t[r1][j] + t[r2][j] - keep;
                        for (int r = 0; r < nr; r++)            //@c_equate
                            if (t[r][j] == drop) t[r][j] = keep;
                        changed = 1; chase_steps++;
                    }
                }
        for (int r = 0; r < nr; r++) {                          //@c_check
            int full = 1;
            for (int j = 0; j < S->n; j++) if (t[r][j]) full = 0;
            if (full) return r + 1;   /* номер на реда, станал изцяло a */  //@c_yes
        }
    }
    return 0;                                                   //@c_no
}
//#end

//#viz ch06_spurious
/* Проекции на R върху R1 и R2 (като множества) и естественото им съединение.
   Връща броя редове в съединението; spurious = редове, които ги няма в R. */
typedef struct { int n; char v[MAXV][MAXA][NAMEW]; } Tab;

static int same_on(const char a[][NAMEW], const char b[][NAMEW], Set cols, int ncol)
{ for (int j = 0; j < ncol; j++) if ((cols >> j & 1u) && strcmp(a[j], b[j])) return 0; return 1; }

static void project(const Tab *R, int ncol, Set cols, Tab *out)
{
    out->n = 0;
    for (int i = 0; i < R->n; i++) {                            //@sp_proj
        int dup = 0;
        for (int k = 0; k < out->n && !dup; k++) dup = same_on(R->v[i], out->v[k], cols, ncol);
        if (!dup) memcpy(out->v[out->n++], R->v[i], sizeof R->v[i]);
    }
}

int spurious_join(const Tab *R, int ncol, Set A1, Set A2, int *spurious)
{
    static Tab P1, P2;
    project(R, ncol, A1, &P1);
    project(R, ncol, A2, &P2);
    Set common = A1 & A2;
    int n = 0; *spurious = 0;
    for (int i = 0; i < P1.n; i++)                              //@sp_outer
        for (int k = 0; k < P2.n; k++) {
            if (!same_on(P1.v[i], P2.v[k], common, ncol)) continue;  //@sp_match
            char row[MAXA][NAMEW];
            for (int j = 0; j < ncol; j++)
                memcpy(row[j], (A1 >> j & 1u) ? P1.v[i][j] : P2.v[k][j], NAMEW);
            n++;                                                //@sp_emit
            int inR = 0;
            for (int r = 0; r < R->n && !inR; r++) inR = same_on(row, R->v[r], A1 | A2, ncol);
            if (!inR) (*spurious)++;                            //@sp_fake
        }
    return n;
}
//#end

#ifndef NO_MAIN
static void sets_str(const Schema *S, const Set *r, int n, char *out, size_t sz)
{
    out[0] = '\0';
    for (int i = 0; i < n; i++) {
        char b[256]; print_set(S, r[i], b, sizeof b);
        strncat(out, i ? " {" : "{", sz - strlen(out) - 1);
        strncat(out, b, sz - strlen(out) - 1);
        strncat(out, "}", sz - strlen(out) - 1);
    }
}

static void t_nf(const char *tag, const char *attrs, const char *fds)
{
    Schema S; parse_schema(&S, attrs, fds);
    Viol v[256]; int nv; Set prime;
    closures = 0;
    int lvl = nf_analyze(&S, v, &nv, &prime);
    int c2 = 0, c3 = 0, c4 = 0;
    for (int i = 0; i < nv; i++) { if (v[i].kind == 2) c2++; else if (v[i].kind == 3) c3++; else c4++; }
    char pb[256]; print_set(&S, prime, pb, sizeof pb);
    printf("%s level = %d\n%s prime = %s\n%s viol = %d %d %d\n", tag, lvl, tag, pb, tag, c2, c3, c4);

    Set rels[MAXRELS];
    int nr = bcnf_decompose(&S, rels, MAXRELS);
    char rb[1024]; sets_str(&S, rels, nr, rb, sizeof rb);
    printf("%s bcnf = %s\n", tag, rb);
    int pres = 0;
    for (int f = 0; f < S.nf; f++) pres += preserved(&S, rels, nr, S.f[f]);
    printf("%s preserved = %d/%d\n", tag, pres, S.nf);
    int ll = chase(&S, rels, nr) > 0;   /* отделно: редът на изчисляване на аргументите не е зададен */
    printf("%s lossless = %d\n%s chase = %ld\n", tag, ll, tag, chase_steps);
}

static void t_chase(const char *tag, const char *attrs, const char *fds, const char *dec)
{
    Schema S; parse_schema(&S, attrs, fds);
    Set rels[MAXRELS]; int nr = 0;
    const char *p = dec;
    while (*p && nr < MAXRELS) {
        const char *end = strchr(p, '|'); if (!end) end = p + strlen(p);
        rels[nr++] = parse_set(&S, p, end, 0);
        p = *end ? end + 1 : end;
    }
    int row = chase(&S, rels, nr);
    printf("%s = %d\n%s steps = %ld\n", tag, row, tag, chase_steps);
    int pres = 0;
    for (int f = 0; f < S.nf; f++) pres += preserved(&S, rels, nr, S.f[f]);
    printf("%s preserved = %d/%d\n", tag, pres, S.nf);
}

int main(void)
{
    t_nf("enr", "StudentID StudentName CourseID CourseName Grade",
         "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade");
    t_nf("emp", "EmpID DeptID DeptName", "EmpID->DeptID; DeptID->DeptName");
    t_nf("sct", "Student Course Teacher", "Student,Course->Teacher; Teacher->Course");
    t_nf("stu", "student_id name programme_id programme_name",
         "student_id->name,programme_id; programme_id->programme_name");
    t_nf("ok", "Student Course Grade", "Student,Course->Grade");
    t_nf("big", "A B C D E F", "A,B->C; C->D; D->A; E->F; B,D->E");

    t_chase("ch1", "A B C", "A->B", "A B|B C");
    t_chase("ch2", "A B C", "B->C", "A B|B C");
    t_chase("ch3", "Student Course Teacher", "Student,Course->Teacher; Teacher->Course", "Teacher Course|Student Teacher");
    t_chase("ch4", "Student Course Teacher", "Student,Course->Teacher; Teacher->Course", "Student Course|Course Teacher");
    t_chase("ch5", "A B C D E", "A->C; B->C; C->D; D,E->C; C,E->A", "A D|A B|B E|C D E|A E");
    t_chase("ch6", "EmpID DeptID DeptName", "EmpID->DeptID; DeptID->DeptName", "EmpID DeptName|DeptID DeptName");

    static Tab R;
    const char *rows1[][3] = { {"1", "x", "p"}, {"2", "x", "q"} };
    R.n = 2;
    for (int i = 0; i < 2; i++) for (int j = 0; j < 3; j++) snprintf(R.v[i][j], NAMEW, "%s", rows1[i][j]);
    int sp, n = spurious_join(&R, 3, 0x3, 0x6, &sp);
    printf("sp1 = %d %d\n", n, sp);
    n = spurious_join(&R, 3, 0x3, 0x5, &sp);
    printf("sp2 = %d %d\n", n, sp);
    const char *rows2[][3] = { {"1", "x", "p"}, {"2", "x", "p"}, {"3", "y", "q"}, {"4", "y", "q"}, {"5", "z", "r"} };
    R.n = 5;
    for (int i = 0; i < 5; i++) for (int j = 0; j < 3; j++) snprintf(R.v[i][j], NAMEW, "%s", rows2[i][j]);
    n = spurious_join(&R, 3, 0x3, 0x6, &sp);
    printf("sp3 = %d %d\n", n, sp);
    n = spurious_join(&R, 3, 0x5, 0x6, &sp);
    printf("sp4 = %d %d\n", n, sp);
    return 0;
}
#endif
