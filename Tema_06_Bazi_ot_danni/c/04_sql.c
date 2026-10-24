/* Тема 6, раздел 4 — SQL заявката от ръководството, изпълнена „на ръка“:
 *
 *   SELECT s.id, s.name, COUNT(e.course_id) AS courses      -- или COUNT(*)
 *   FROM Student AS s
 *   LEFT JOIN Enrollment AS e ON e.student_id = s.id [AND e.grade >= g]
 *   [WHERE e.grade >= g]
 *   GROUP BY s.id, s.name
 *   ORDER BY s.id;
 *
 * Логическият ред: FROM/JOIN -> WHERE -> GROUP BY -> SELECT (агрегати) -> ORDER BY.
 * Това е логически модел; реалният план на СУБД може да е различен, но със същия смисъл.
 * NULL се пази като флаг; сравнение с NULL дава UNKNOWN (тризначна логика).
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 04_sql.c -o sql && ./sql
 */
#include <stdio.h>
#include <string.h>

#define MAXS 16
#define MAXE 32

//#viz ch04_tvl
/* Тризначна логика на SQL: FALSE < UNKNOWN < TRUE */
typedef enum { F = 0, U = 1, T = 2 } Tv;

Tv tv_and(Tv a, Tv b) { return a < b ? a : b; }   /* минимум */     //@and
Tv tv_or (Tv a, Tv b) { return a > b ? a : b; }   /* максимум */    //@or
Tv tv_not(Tv a)       { return (Tv)(2 - a); }     /* NOT U = U */   //@not

/* x >= g, когато x може да е NULL */
Tv ge(int x, int x_is_null, int g)
{
    if (x_is_null) return U;              /* NULL >= 5 -> UNKNOWN */  //@cmp_null
    return x >= g ? T : F;                                            //@cmp_val
}
/* WHERE пропуска реда само ако условието е TRUE */
int where_keeps(Tv c) { return c == T; }                              //@where
//#end

typedef struct { int id; char name[12]; } Student;
typedef struct { int sid; int cid; int grade; } Enrollment;
typedef struct { int sid; int cid, cid_null; int grade, grade_null; } Row;

//#viz ch04_leftjoin
/* place: 0 — без условие, 1 — условие в ON, 2 — условие в WHERE
   agg:   0 — COUNT(e.course_id), 1 — COUNT(*) */
int run_query(const Student *S, int ns, const Enrollment *E, int ne,
              int place, int g, int agg, int out_count[])
{
    Row rows[MAXS * MAXE + MAXS];
    int nr = 0;
    /* 1. FROM Student LEFT JOIN Enrollment ON ... */
    for (int i = 0; i < ns; i++) {                                    //@lj_outer
        int matched = 0;
        for (int k = 0; k < ne; k++) {                                //@lj_inner
            Tv on = E[k].sid == S[i].id ? T : F;                      //@lj_on
            if (place == 1) on = tv_and(on, ge(E[k].grade, 0, g));
            if (on != T) continue;
            rows[nr++] = (Row){ S[i].id, E[k].cid, 0, E[k].grade, 0 };//@lj_match
            matched = 1;
        }
        if (!matched)                                                 //@lj_pad
            rows[nr++] = (Row){ S[i].id, 0, 1, 0, 1 };  /* e.* = NULL */
    }
    /* 2. WHERE */
    int kept = 0;
    for (int r = 0; r < nr; r++) {                                    //@wh_loop
        if (place == 2 && !where_keeps(ge(rows[r].grade, rows[r].grade_null, g)))
            continue;                                                 //@wh_drop
        rows[kept++] = rows[r];                                       //@wh_keep
    }
    /* 3. GROUP BY s.id + 4. COUNT(...) */
    int groups = 0;
    for (int i = 0; i < ns; i++) {                                    //@gb_group
        int cnt = 0, present = 0;
        for (int r = 0; r < kept; r++) {                              //@gb_row
            if (rows[r].sid != S[i].id) continue;
            present = 1;
            if (agg == 1 || !rows[r].cid_null) cnt++;                 //@gb_count
        }
        out_count[i] = present ? cnt : -1;   /* -1: групата изчезна */ //@gb_emit
        groups += present;
    }
    return groups;
}
//#end

#ifndef NO_MAIN
static void show(const char *name, const Student *S, int ns, const Enrollment *E, int ne, int place, int g, int agg)
{
    int c[MAXS];
    int groups = run_query(S, ns, E, ne, place, g, agg, c);
    printf("%s = ", name);
    for (int i = 0; i < ns; i++) printf("%s%d", i ? "," : "", c[i]);
    printf("\n%s groups = %d\n", name, groups);
}

int main(void)
{
    Student S[] = { {1, "Ana"}, {2, "Boris"}, {3, "Vera"} };
    Enrollment E[] = { {1, 101, 6}, {1, 102, 4}, {3, 101, 5} };
    Student S2[] = { {1, "Ana"}, {2, "Boris"} };
    Enrollment E2[] = { {1, 101, 6} };
    show("q1", S2, 2, E2, 1, 0, 0, 0);
    show("q2", S2, 2, E2, 1, 0, 0, 1);
    show("q3", S, 3, E, 3, 0, 0, 0);
    show("q4", S, 3, E, 3, 1, 5, 0);
    show("q5", S, 3, E, 3, 2, 5, 0);
    show("q6", S, 3, E, 3, 1, 5, 1);
    show("q7", S, 3, E, 3, 2, 5, 1);
    show("q8", S, 3, E, 0, 0, 0, 0);
    printf("and(U,F) = %d\n", tv_and(U, F));
    printf("or(U,T) = %d\n", tv_or(U, T));
    printf("not(U) = %d\n", tv_not(U));
    printf("ge(NULL,5) = %d\n", ge(0, 1, 5));
    return 0;
}
#endif
