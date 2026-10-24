/* Тема 9, раздел 5 — защитен код за приложения и акаунти:
 * валидиране на вход по списък от разрешени символи, параметризиране (структурата е фиксирана),
 * копиране с проверка на границите, оценка на парола, сол (концепция).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 05_app.c -o 05 -lm && ./05
 *
 * Няма база от данни и няма мрежа. Хешът е учебен (FNV-1a) и НЕ е подходящ за пароли —
 * криптографските механизми са в тема 10.
 */
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <math.h>
#include <stdint.h>

/* ---------------- валидиране и параметри ---------------- */
//#viz ch05_validate
enum { V_OK = 0, V_EMPTY = 1, V_LONG = 2, V_CHAR = 3 };

/* Списък от разрешени символи: латински букви, интервал, тире, апостроф.
   Валидирането проверява очаквания формат; то НЕ замества параметризирането. */
int validate_name(const char *s, int maxlen, int *bad_pos)
{
    int n = (int)strlen(s);
    *bad_pos = -1;
    if (n == 0) return V_EMPTY;                                  //@empty
    if (n > maxlen) return V_LONG;                               //@long
    for (int i = 0; i < n; i++) {                                //@loop
        unsigned char c = (unsigned char)s[i];
        int ok = isalpha(c) || c == ' ' || c == '-' || c == '\'';   //@check
        if (!ok) { *bad_pos = i; return V_CHAR; }                //@reject
    }
    return V_OK;                                                 //@accept
}

/* Параметризиране: текстът на заявката е константа; стойността се подава отделно
   и никога не се анализира като част от синтаксиса. */
typedef struct { const char *sql; const char *param; } Query;

Query bind_name(const char *value)
{
    Query q = { "SELECT * FROM users WHERE name = ?", value };   //@bind
    return q;
}
//#end

//#viz ch05_tokens
/* Брои лексемите на фиксирания SQL текст — показва, че структурата
   не зависи от стойността на параметъра. */
int count_tokens(const char *q)
{
    int n = 0, i = 0, len = (int)strlen(q);
    while (i < len) {
        if (q[i] == ' ') { i++; continue; }                      //@sp
        if (isalnum((unsigned char)q[i]) || q[i] == '_' || q[i] == '*') {
            while (i < len && (isalnum((unsigned char)q[i]) || q[i] == '_' || q[i] == '*')) i++;
        } else i++;                                              //@tok
        n++;
    }
    return n;                                                    //@ret
}
//#end

/* ---------------- проверка на граници ---------------- */
//#viz ch05_copy
/* Копира в буфер с вместимост cap байта (вкл. завършващата нула).
   Никога не пише извън буфера; връща -1, ако входът е бил отрязан. */
int copy_checked(char *dst, int cap, const char *src)
{
    int i = 0;
    while (src[i] && i < cap - 1) {                              //@c_loop
        dst[i] = src[i];                                         //@c_write
        i++;
    }
    dst[i] = '\0';                                               //@c_term
    return src[i] ? -1 : i;   /* -1: входът е по-дълъг — съобщаваме */  //@c_ret
}
//#end

/* ---------------- парола и сол ---------------- */
//#viz ch05_pw
static const char *COMMON[] = { "123456", "password", "qwerty", "111111", "letmein", "parola", "admin" };

/* Груб модел: битове = дължина * log2(размер на използваните класове).
   Надценява паролите, избрани от хора — затова и списъкът с чести пароли. */
double pw_bits(const char *p, int *pool_out)
{
    int lo = 0, up = 0, di = 0, ot = 0, len = (int)strlen(p);
    for (int i = 0; i < (int)(sizeof COMMON / sizeof COMMON[0]); i++)   //@common
        if (strcmp(p, COMMON[i]) == 0) { *pool_out = 0; return 0.0; }
    for (int i = 0; i < len; i++) {                              //@classes
        unsigned char c = (unsigned char)p[i];
        if (islower(c)) lo = 1; else if (isupper(c)) up = 1;
        else if (isdigit(c)) di = 1; else ot = 1;
    }
    int pool = 26 * lo + 26 * up + 10 * di + 33 * ot;            //@pool
    *pool_out = pool;
    return pool ? len * log2((double)pool) : 0.0;                //@bits
}

/* Учебен хеш FNV-1a 32 бита върху сол || парола — само за концепцията */
uint32_t toy_hash(const char *salt, const char *pw)
{
    uint32_t h = 2166136261u;                                    //@h_init
    for (const char *s = salt; *s; s++) { h ^= (unsigned char)*s; h *= 16777619u; }  //@h_salt
    for (const char *s = pw; *s; s++)   { h ^= (unsigned char)*s; h *= 16777619u; }  //@h_pw
    return h;                                                    //@h_ret
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const char *N[] = { "Ivan", "O'Brien", "Anna-Maria", "", "Ivan2", "Ivan;", "Petar Petrov Ivanov Georgiev", "x<y" };
    for (int i = 0; i < 8; i++) {
        int bp, r = validate_name(N[i], 20, &bp);
        printf("validate [%s] = %d %d\n", N[i], r, bp);
    }
    printf("tokens param = %d\n", count_tokens(bind_name("anything").sql));

    const char *C[] = { "Ivan", "Petrova", "Ivanov_Petrov", "AAAAAAAAAAAA" };
    for (int i = 0; i < 4; i++) {
        char buf[8];
        int r = copy_checked(buf, (int)sizeof buf, C[i]);
        printf("checked %s = %d %s\n", C[i], r, buf);
    }
    const char *P[] = { "password", "parola", "abc", "Abc123", "correct horse battery", "Tr0ub4dor&3", "qwertyuiopasdfgh", "7391" };
    for (int i = 0; i < 8; i++) {
        int pool; double b = pw_bits(P[i], &pool);
        printf("pw %s = %d %.1f\n", P[i], pool, b);
    }
    const char *H[][2] = { { "q7Z1", "parola" }, { "Lm40", "parola" }, { "", "parola" }, { "q7Z1", "Parola" } };
    for (int i = 0; i < 4; i++) printf("hash %s %s = %08x\n", H[i][0][0] ? H[i][0] : "-", H[i][1], (unsigned)toy_hash(H[i][0], H[i][1]));
    return 0;
}
#endif
