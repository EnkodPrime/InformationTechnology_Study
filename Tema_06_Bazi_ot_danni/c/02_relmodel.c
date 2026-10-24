/* Тема 6, раздел 2 — релационен модел: домейн, NOT NULL, първичен ключ, външен ключ,
 * референтна цялост при изтриване (RESTRICT / CASCADE / SET NULL).
 *
 * Схемата (учебен пример):
 *   Programme(pid PK, pname NOT NULL)
 *   Student  (sid PK, name NOT NULL, pid FK -> Programme, допуска NULL)
 *   Course   (cid PK, title NOT NULL)
 *   Enrollment(sid FK -> Student, cid FK -> Course, grade ∈ {2..6}, PK(sid, cid))
 *
 * Скриптът е поредица от команди, разделени с ';':
 *   +P pid име   +S sid име pid|NULL   +C cid заглавие   +E sid cid оценка
 *   -P pid       -S sid                -C cid
 * Правилото при изтриване (RESTRICT / CASCADE / SET NULL) се задава отделно.
 * NULL се пази като празен низ "".
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 02_relmodel.c -o relmodel && ./relmodel
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXR 64
#define W 16

typedef struct { char pid[W], pname[W]; } Programme;
typedef struct { char sid[W], name[W], pid[W]; } Student;   /* pid "" == NULL */
typedef struct { char cid[W], title[W]; } Course;
typedef struct { char sid[W], cid[W]; int grade; } Enrollment;

typedef struct {
    Programme p[MAXR]; int np;
    Student   s[MAXR]; int ns;
    Course    c[MAXR]; int nc;
    Enrollment e[MAXR]; int ne;
} Db;

enum { RESTRICT, CASCADE, SET_NULL };

static int is_null(const char *v) { return v[0] == '\0'; }
static void put(char *dst, const char *src) { snprintf(dst, W, "%s", src); }

static int find_programme(const Db *db, const char *pid)
{ for (int i = 0; i < db->np; i++) if (!strcmp(db->p[i].pid, pid)) return i; return -1; }
static int find_student(const Db *db, const char *sid)
{ for (int i = 0; i < db->ns; i++) if (!strcmp(db->s[i].sid, sid)) return i; return -1; }
static int find_course(const Db *db, const char *cid)
{ for (int i = 0; i < db->nc; i++) if (!strcmp(db->c[i].cid, cid)) return i; return -1; }

//#viz ch02_rel
/* Вмъкване в Student: NOT NULL, уникалност на PK, външен ключ (NULL е допустим). */
const char *insert_student(Db *db, const char *sid, const char *name, const char *pid)
{
    if (is_null(sid) || is_null(name))                         //@s_null
        return "NOT NULL: sid и name са задължителни";
    if (find_student(db, sid) >= 0)                            //@s_pk
        return "PK: вече има студент с този sid";
    if (!is_null(pid) && find_programme(db, pid) < 0)          //@s_fk
        return "FK: няма такава специалност (pid)";
    Student *s = &db->s[db->ns++];                             //@s_ok
    put(s->sid, sid); put(s->name, name); put(s->pid, pid);
    return NULL;
}

/* Вмъкване в Enrollment: домейн, NOT NULL, съставен PK, два външни ключа. */
const char *insert_enrollment(Db *db, const char *sid, const char *cid, int grade)
{
    if (grade < 2 || grade > 6)                                //@e_dom
        return "Домейн: оценката е цяло число от 2 до 6";
    if (is_null(sid) || is_null(cid))                          //@e_null
        return "NOT NULL: колоните на PK не допускат NULL";
    for (int i = 0; i < db->ne; i++)                           //@e_pk
        if (!strcmp(db->e[i].sid, sid) && !strcmp(db->e[i].cid, cid))
            return "PK: двойката (sid, cid) вече съществува";
    if (find_student(db, sid) < 0)                             //@e_fk1
        return "FK: няма такъв студент";
    if (find_course(db, cid) < 0)                              //@e_fk2
        return "FK: няма такава дисциплина";
    Enrollment *e = &db->e[db->ne++];                          //@e_ok
    put(e->sid, sid); put(e->cid, cid); e->grade = grade;
    return NULL;
}

/* Изтриване на студент. Enrollment.sid е част от PK, затова SET NULL е невъзможно. */
const char *delete_student(Db *db, const char *sid, int rule)
{
    int k = find_student(db, sid);
    if (k < 0) return "няма такъв студент";                     //@d_none
    int refs = 0;
    for (int i = 0; i < db->ne; i++)                           //@d_scan
        if (!strcmp(db->e[i].sid, sid)) refs++;
    if (refs > 0 && rule == RESTRICT)                          //@d_restrict
        return "RESTRICT: има записвания, които сочат към студента";
    if (refs > 0 && rule == SET_NULL)                          //@d_setnull_pk
        return "SET NULL: Enrollment.sid е част от PK и не допуска NULL";
    int j = 0;
    for (int i = 0; i < db->ne; i++)                           //@d_cascade
        if (strcmp(db->e[i].sid, sid)) db->e[j++] = db->e[i];
    db->ne = j;
    db->s[k] = db->s[--db->ns];                                //@d_ok
    return NULL;
}

/* Изтриване на специалност; Student.pid допуска NULL. */
const char *delete_programme(Db *db, const char *pid, int rule)
{
    int k = find_programme(db, pid);
    if (k < 0) return "няма такава специалност";                //@p_none
    int refs = 0;
    for (int i = 0; i < db->ns; i++)                           //@p_scan
        if (!strcmp(db->s[i].pid, pid)) refs++;
    if (refs > 0 && rule == RESTRICT)                          //@p_restrict
        return "RESTRICT: има студенти от тази специалност";
    for (int i = 0; i < db->ns; i++)
        if (!strcmp(db->s[i].pid, pid)) {
            if (rule == SET_NULL) db->s[i].pid[0] = '\0';      //@p_setnull
            else {                                             //@p_cascade
                /* CASCADE: изтриваме студента заедно с неговите записвания */
                delete_student(db, db->s[i].sid, CASCADE);
                i--;
            }
        }
    db->p[k] = db->p[--db->np];                                //@p_ok
    return NULL;
}
//#end

static const char *insert_programme(Db *db, const char *pid, const char *name)
{
    if (is_null(pid) || is_null(name)) return "NOT NULL: pid и pname са задължителни";
    if (find_programme(db, pid) >= 0) return "PK: вече има специалност с този pid";
    put(db->p[db->np].pid, pid); put(db->p[db->np].pname, name); db->np++;
    return NULL;
}
static const char *insert_course(Db *db, const char *cid, const char *title)
{
    if (is_null(cid) || is_null(title)) return "NOT NULL: cid и title са задължителни";
    if (find_course(db, cid) >= 0) return "PK: вече има дисциплина с този cid";
    put(db->c[db->nc].cid, cid); put(db->c[db->nc].title, title); db->nc++;
    return NULL;
}
static const char *delete_course(Db *db, const char *cid, int rule)
{
    int k = find_course(db, cid);
    if (k < 0) return "няма такава дисциплина";
    int refs = 0;
    for (int i = 0; i < db->ne; i++) if (!strcmp(db->e[i].cid, cid)) refs++;
    if (refs > 0 && rule == RESTRICT) return "RESTRICT: има записвания за дисциплината";
    if (refs > 0 && rule == SET_NULL) return "SET NULL: Enrollment.cid е част от PK и не допуска NULL";
    int j = 0;
    for (int i = 0; i < db->ne; i++) if (strcmp(db->e[i].cid, cid)) db->e[j++] = db->e[i];
    db->ne = j;
    db->c[k] = db->c[--db->nc];
    return NULL;
}

/* Изпълнява скрипта; печата "ok" или "err" за всяка команда, разделени с интервал. */
static void run(Db *db, const char *script, int rule, char *out, size_t outsz)
{
    char buf[2048];
    snprintf(buf, sizeof buf, "%s", script);
    out[0] = '\0';
    for (char *cmd = strtok(buf, ";"); cmd; cmd = strtok(NULL, ";")) {
        char op[4] = "", a[W] = "", b[W] = "", c[W] = "";
        int n = sscanf(cmd, " %3s %15s %15s %15s", op, a, b, c);
        if (n < 1) continue;
        if (!strcmp(b, "NULL")) b[0] = '\0';
        if (!strcmp(c, "NULL")) c[0] = '\0';
        const char *err = "непозната команда";
        if (!strcmp(op, "+P")) err = insert_programme(db, a, b);
        else if (!strcmp(op, "+S")) err = insert_student(db, a, b, c);
        else if (!strcmp(op, "+C")) err = insert_course(db, a, b);
        else if (!strcmp(op, "+E")) err = insert_enrollment(db, a, b, n >= 4 ? atoi(c) : 0);
        else if (!strcmp(op, "-P")) err = delete_programme(db, a, rule);
        else if (!strcmp(op, "-S")) err = delete_student(db, a, rule);
        else if (!strcmp(op, "-C")) err = delete_course(db, a, rule);
        strncat(out, err ? "err " : "ok ", outsz - strlen(out) - 1);
    }
    size_t L = strlen(out);
    if (L) out[L - 1] = '\0';
}

#ifndef NO_MAIN
static const char *BASE =
    "+P INF Informatika; +P MAT Matematika; +S 1 Ana INF; +S 2 Boris MAT; +S 3 Vera NULL;"
    "+C C1 Bazi; +C C2 Algoritmi; +E 1 C1 6; +E 1 C2 5; +E 2 C1 4";

static void test(const char *name, const char *extra, int rule)
{
    Db *db = calloc(1, sizeof *db);
    char script[2048], out[512];
    snprintf(script, sizeof script, "%s;%s", BASE, extra);
    run(db, script, rule, out, sizeof out);
    printf("%s = %s\n", name, out);
    printf("%s counts = %d %d %d %d\n", name, db->np, db->ns, db->nc, db->ne);
    int nulls = 0;
    for (int i = 0; i < db->ns; i++) if (is_null(db->s[i].pid)) nulls++;
    printf("%s nullpid = %d\n", name, nulls);
    free(db);
}

int main(void)
{
    test("t1", "+E 1 C1 5; +E 4 C1 5; +E 2 C2 7; +E 2 C3 5; +S 2 Dimo INF; +S 5 Eli FIZ; +E 3 C2 3", RESTRICT);
    test("t2", "-S 1", RESTRICT);
    test("t3", "-S 1", CASCADE);
    test("t4", "-S 1", SET_NULL);
    test("t5", "-P INF", RESTRICT);
    test("t6", "-P INF", SET_NULL);
    test("t7", "-P INF", CASCADE);
    test("t8", "-C C2", CASCADE);
    test("t9", "-S 3; -P MAT", RESTRICT);
    return 0;
}
#endif
