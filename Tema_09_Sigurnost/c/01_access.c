/* Тема 9, раздел 1 — идентификация, удостоверяване, оторизация, отчетност; модел на риска.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 01_access.c -o 01 && ./01
 *
 * Моделът е учебен: потребителите, обектите и списъкът за достъп са вградени таблици.
 * g_cmp брои сравненията при търсене в списъка за достъп — само за визуализацията.
 */
#include <stdio.h>
#include <string.h>

static int g_cmp;

enum { R_ALLOW = 0, R_UNKNOWN = 1, R_BADAUTH = 2, R_FORBIDDEN = 3 };

//#viz ch01_access
typedef struct { const char *user, *obj, *op; } Acl;

static const char *USERS[] = { "alice", "bob", "admin" };
static const Acl ACL[] = {               /* кой какво може върху кой обект */
    { "alice", "syllabus", "read"  },
    { "alice", "grades",   "read"  },
    { "bob",   "syllabus", "read"  },
    { "bob",   "grades",   "read"  },
    { "bob",   "grades",   "write" },
    { "admin", "syllabus", "write" },
};
#define NUSERS (int)(sizeof USERS / sizeof USERS[0])
#define NACL   (int)(sizeof ACL / sizeof ACL[0])

typedef struct { const char *user, *op, *obj; int result; } LogRec;
static LogRec g_log[32];
static int g_nlog;

static void audit(const char *u, const char *op, const char *obj, int r)
{
    if (g_nlog < 32) g_log[g_nlog++] = (LogRec){ u, op, obj, r };  //@log
}

/* server_checks = 0 моделира грешката „проверка само в интерфейса“ */
int check_access(const char *user, int password_ok,
                 const char *op, const char *obj, int server_checks)
{
    int known = 0;
    for (int i = 0; i < NUSERS; i++)                  //@ident
        if (strcmp(USERS[i], user) == 0) known = 1;
    if (!known) { audit(user, op, obj, R_UNKNOWN); return R_UNKNOWN; }   //@unknown

    if (!password_ok) {                               //@authn
        audit(user, op, obj, R_BADAUTH); return R_BADAUTH;               //@badauth
    }
    if (!server_checks) {                             //@noauthz
        audit(user, op, obj, R_ALLOW); return R_ALLOW;                   //@allow_blind
    }
    for (int i = 0; i < NACL; i++) {                  //@authz
        g_cmp++;
        if (strcmp(ACL[i].user, user) == 0 &&         //@cmp
            strcmp(ACL[i].obj, obj) == 0 &&
            strcmp(ACL[i].op, op) == 0) {
            audit(user, op, obj, R_ALLOW); return R_ALLOW;               //@allow
        }
    }
    audit(user, op, obj, R_FORBIDDEN); return R_FORBIDDEN;               //@forbidden
}
//#end

//#viz ch01_risk
/* Един възможен модел: матрица 5×5 (вероятност × въздействие).
   Скалата и праговете са пример, не универсален стандарт. */
enum { P_C = 0, P_I = 1, P_A = 2 };           /* засегнато свойство */
enum { M_MFA = 1, M_PATCH = 2, M_LEAST = 4, M_BACKUP = 8, M_ENCRYPT = 16 };

static int dec(int v) { return v > 1 ? v - 1 : 1; }

int risk_eval(int L, int I, int prop, int measures, int *outL, int *outI)
{
    if (measures & M_MFA)     L = dec(L);                    //@mfa
    if (measures & M_PATCH)   L = dec(L);                    //@patch
    if (measures & M_LEAST)   I = dec(I);                    //@least
    if ((measures & M_BACKUP) && prop != P_C) I = dec(I);    //@backup
    if ((measures & M_ENCRYPT) && prop == P_C) I = dec(I);   //@encrypt
    *outL = L; *outI = I;
    int score = L * I;                                       //@score
    if (score <= 4)  return 0;   /* нисък */                 //@level
    if (score <= 9)  return 1;   /* среден */
    if (score <= 16) return 2;   /* висок */
    return 3;                    /* критичен */
}
//#end

#ifndef NO_MAIN
int main(void)
{
    struct { const char *u; int pw; const char *op, *obj; int srv; } C[] = {
        { "alice", 1, "read",  "grades",   1 },
        { "alice", 1, "write", "grades",   1 },
        { "alice", 1, "write", "grades",   0 },
        { "alice", 0, "read",  "grades",   1 },
        { "bob",   1, "write", "grades",   1 },
        { "admin", 1, "write", "grades",   1 },
        { "admin", 1, "write", "syllabus", 1 },
        { "eve",   1, "read",  "grades",   1 },
    };
    for (int k = 0; k < (int)(sizeof C / sizeof C[0]); k++) {
        g_cmp = 0;
        int r = check_access(C[k].u, C[k].pw, C[k].op, C[k].obj, C[k].srv);
        printf("access %s %d %s %s %d = %d\n", C[k].u, C[k].pw, C[k].op, C[k].obj, C[k].srv, r);
        printf("access %s %d %s %s %d cmp = %d\n", C[k].u, C[k].pw, C[k].op, C[k].obj, C[k].srv, g_cmp);
    }
    printf("log entries = %d\n", g_nlog);

    struct { int L, I, p, m; } R[] = {
        { 4, 5, P_C, 0 }, { 4, 5, P_C, M_BACKUP }, { 4, 5, P_I, M_BACKUP },
        { 4, 5, P_C, M_MFA | M_LEAST | M_ENCRYPT }, { 5, 5, P_A, 31 }, { 2, 2, P_I, 0 }, { 3, 3, P_A, M_PATCH },
    };
    for (int k = 0; k < (int)(sizeof R / sizeof R[0]); k++) {
        int l, i, lv = risk_eval(R[k].L, R[k].I, R[k].p, R[k].m, &l, &i);
        printf("risk %d %d %d %d = %d %d %d\n", R[k].L, R[k].I, R[k].p, R[k].m, l, i, lv);
    }
    return 0;
}
#endif
