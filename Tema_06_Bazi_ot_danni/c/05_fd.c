/* Тема 6, раздел 5 — функционални зависимости: затваряне на атрибути X⁺,
 * намиране на всички кандидатни ключове, проверка на ФЗ върху текущо състояние.
 *
 * Атрибутите са номерирани 0..n-1 и множество от атрибути е битова маска (unsigned).
 * Формат на входа (същият като във визуализацията):
 *   схема:  "StudentID StudentName CourseID CourseName Grade"
 *   ФЗ:     "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade"
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 05_fd.c -o fd && ./fd
 * Файлът се включва и от 06_nf.c (с #define FD_NO_MAIN).
 */
#include <stdio.h>
#include <string.h>

#define MAXA 12
#define MAXF 32
#define NAMEW 16

typedef unsigned Set;
typedef struct { Set lhs, rhs; } FD;

typedef struct {
    int n;                      /* брой атрибути */
    char name[MAXA][NAMEW];
    int nf;                     /* брой ФЗ */
    FD f[MAXF];
} Schema;

static long fd_checks, fd_passes, closures;   /* броячи */

static int popcount(Set s) { int c = 0; while (s) { c += (int)(s & 1u); s >>= 1; } return c; }
static int subset(Set a, Set b) { return (a & ~b) == 0; }   /* a ⊆ b */

/* ----- разбор на входа ----- */
static int attr_index(Schema *S, const char *nm, int add)
{
    for (int i = 0; i < S->n; i++) if (!strcmp(S->name[i], nm)) return i;
    if (!add || S->n >= MAXA) return -1;
    snprintf(S->name[S->n], NAMEW, "%s", nm);
    return S->n++;
}
/* чете имена, разделени с интервали или запетаи, между [p, end) */
static Set parse_set(Schema *S, const char *p, const char *end, int add)
{
    Set m = 0;
    while (p < end) {
        while (p < end && (*p == ' ' || *p == ',' || *p == '\t')) p++;
        const char *t = p;
        while (p < end && *p != ' ' && *p != ',' && *p != '\t') p++;
        if (p > t) {
            char nm[NAMEW]; int L = (int)(p - t) < NAMEW - 1 ? (int)(p - t) : NAMEW - 1;
            memcpy(nm, t, (size_t)L); nm[L] = '\0';
            int k = attr_index(S, nm, add);
            if (k >= 0) m |= 1u << k;
        }
    }
    return m;
}
void parse_schema(Schema *S, const char *attrs, const char *fds)
{
    S->n = S->nf = 0;
    parse_set(S, attrs, attrs + strlen(attrs), 1);
    const char *p = fds;
    while (*p) {
        const char *end = strchr(p, ';'); if (!end) end = p + strlen(p);
        const char *ar = strstr(p, "->");
        if (ar && ar < end && S->nf < MAXF) {
            FD d = { parse_set(S, p, ar, 0), parse_set(S, ar + 2, end, 0) };
            if (d.rhs) S->f[S->nf++] = d;
        }
        p = *end ? end + 1 : end;
    }
}

//#viz ch05_closure
/* X⁺ — всички атрибути, които X определя чрез ФЗ от F */
Set closure(const Schema *S, Set X)
{
    Set res = X;                                   //@cl_init
    int changed = 1;
    closures++;
    while (changed) {                              //@cl_pass
        changed = 0;
        fd_passes++;
        for (int i = 0; i < S->nf; i++) {          //@cl_fd
            fd_checks++;
            if (subset(S->f[i].lhs, res)           //@cl_test
                && !subset(S->f[i].rhs, res)) {
                res |= S->f[i].rhs;                //@cl_apply
                changed = 1;
            }
        }
    }
    return res;                                    //@cl_done
}
//#end

//#viz ch05_keys
/* Всички кандидатни ключове: подмножествата по нарастващ размер;
   надмножество на вече намерен ключ не може да е минимално. */
int candidate_keys(const Schema *S, Set keys[], int maxk)
{
    Set all = (S->n == 32) ? ~0u : (1u << S->n) - 1;
    int nk = 0;
    for (int size = 1; size <= S->n; size++)                 //@k_size
        for (Set X = 1; X <= all; X++) {
            if (popcount(X) != size) continue;
            int sup = 0;
            for (int j = 0; j < nk; j++)                     //@k_super
                if (subset(keys[j], X)) { sup = 1; break; }
            if (sup) continue;                               //@k_skip
            if (closure(S, X) == all && nk < maxk)           //@k_test
                keys[nk++] = X;                              //@k_found
        }
    return nk;
}
//#end

//#viz ch05_holds
/* Изпълнена ли е X->Y в ТЕКУЩОТО състояние (редове rows[r][атрибут])?
   Сравнява всяка двойка редове: еднакво X, различно Y => нарушение. */
int fd_holds_in(int nrows, int ncols, const char rows[][MAXA][NAMEW], Set X, Set Y, int *pair_i, int *pair_j)
{
    for (int i = 0; i < nrows; i++)                          //@h_i
        for (int j = i + 1; j < nrows; j++) {                //@h_j
            int sameX = 1, sameY = 1;
            for (int a = 0; a < ncols; a++) {
                if (!(X >> a & 1u) && !(Y >> a & 1u)) continue;
                int eq = !strcmp(rows[i][a], rows[j][a]);
                if (X >> a & 1u) sameX &= eq;                //@h_x
                if (Y >> a & 1u) sameY &= eq;
            }
            if (sameX && !sameY) {                           //@h_bad
                *pair_i = i; *pair_j = j;
                return 0;
            }
        }
    return 1;                                                //@h_ok
}
//#end

void print_set(const Schema *S, Set m, char *out, size_t sz)
{
    out[0] = '\0';
    for (int i = 0; i < S->n; i++)
        if (m >> i & 1u) {
            if (out[0]) strncat(out, ",", sz - strlen(out) - 1);
            strncat(out, S->name[i], sz - strlen(out) - 1);
        }
    if (!out[0]) snprintf(out, sz, "∅");
}

#if !defined(NO_MAIN) && !defined(FD_NO_MAIN)
static void t_closure(const char *tag, const char *attrs, const char *fds, const char *x)
{
    Schema S; parse_schema(&S, attrs, fds);
    Set X = parse_set(&S, x, x + strlen(x), 0);
    fd_checks = fd_passes = closures = 0;
    Set c = closure(&S, X);
    char buf[256]; print_set(&S, c, buf, sizeof buf);
    printf("%s = %s\n%s passes = %ld\n%s checks = %ld\n", tag, buf, tag, fd_passes, tag, fd_checks);
}
static void t_keys(const char *tag, const char *attrs, const char *fds)
{
    Schema S; parse_schema(&S, attrs, fds);
    Set k[64]; closures = 0;
    int nk = candidate_keys(&S, k, 64);
    printf("%s = ", tag);
    for (int i = 0; i < nk; i++) { char b[256]; print_set(&S, k[i], b, sizeof b); printf("%s{%s}", i ? " " : "", b); }
    printf("\n%s closures = %ld\n", tag, closures);
}

#define ENR_A "StudentID StudentName CourseID CourseName Grade"
#define ENR_F "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade"
#define SCT_A "Student Course Teacher"
#define SCT_F "Student,Course->Teacher; Teacher->Course"
#define ABC_A "A B C"
#define ABC_F "A->B; B->C"
#define PER_A "NationalID Country DocumentNo Name"
#define PER_F "NationalID->Country,DocumentNo,Name; Country,DocumentNo->NationalID"
#define BIG_A "A B C D E F"
#define BIG_F "A,B->C; C->D; D->A; E->F; B,D->E"

int main(void)
{
    t_closure("cl1", ABC_A, ABC_F, "A");
    t_closure("cl2", ABC_A, ABC_F, "B");
    t_closure("cl3", ENR_A, ENR_F, "StudentID");
    t_closure("cl4", ENR_A, ENR_F, "StudentID,CourseID");
    t_closure("cl5", SCT_A, SCT_F, "Student,Teacher");
    t_closure("cl6", SCT_A, SCT_F, "Teacher");
    t_closure("cl7", BIG_A, BIG_F, "A,B");
    t_closure("cl8", BIG_A, BIG_F, "B,C");
    t_closure("cl9", PER_A, PER_F, "Country,DocumentNo");
    t_keys("k1", ABC_A, ABC_F);
    t_keys("k2", ENR_A, ENR_F);
    t_keys("k3", SCT_A, SCT_F);
    t_keys("k4", PER_A, PER_F);
    t_keys("k5", BIG_A, BIG_F);
    t_keys("k6", "A B C D", "");

    static const char rows[4][MAXA][NAMEW] = {
        { "1", "Ana",   "C1", "Bazi", "6" },
        { "1", "Ana",   "C2", "Algo", "5" },
        { "2", "Boris", "C1", "Bazi", "4" },
        { "3", "Ana",   "C2", "Algo", "3" },
    };
    int pi = -1, pj = -1, ok;
    ok = fd_holds_in(4, 5, rows, 1u << 0, 1u << 1, &pi, &pj); printf("h1 = %d %d %d\n", ok, pi, pj);
    pi = pj = -1;
    ok = fd_holds_in(4, 5, rows, 1u << 1, 1u << 0, &pi, &pj); printf("h2 = %d %d %d\n", ok, pi, pj);
    pi = pj = -1;
    ok = fd_holds_in(4, 5, rows, 1u << 3, 1u << 2, &pi, &pj); printf("h3 = %d %d %d\n", ok, pi, pj);
    pi = pj = -1;
    ok = fd_holds_in(4, 5, rows, 1u << 2, 1u << 4, &pi, &pj); printf("h4 = %d %d %d\n", ok, pi, pj);
    return 0;
}
#endif
