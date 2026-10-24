/* Тема 10, раздел 3 — какво запазва всяко класическо преобразуване.
 *  - транспозицията запазва броя на всеки символ (мултимножеството);
 *  - моноазбучната замяна запазва „шаблона на повторенията“: кои позиции са еднакви.
 * Шаблонът тук е: всяка буква се заменя с поредния номер на първата ѝ поява.
 *   ATTACK -> 0 1 1 0 2 3,  DWWDFN -> 0 1 1 0 2 3 (същият),  AATCTK -> 0 0 1 2 1 3 (друг).
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 03_invariants.c -o inv && ./inv
 */
#include "alpha.h"

//#viz ch03_counts
/* Хистограма: колко пъти се среща всяка буква */
void letter_counts(const int *x, int n, int m, int *cnt)
{
    for (int j = 0; j < m; j++) cnt[j] = 0;          //@zero
    for (int i = 0; i < n; i++) cnt[x[i]]++;         //@count
}
/* Еднакви ли са мултимножествата (едни и същи букви със същия брой)? */
int same_counts(const int *x, const int *y, int n, int m)
{
    int a[30], b[30];
    letter_counts(x, n, m, a);                       //@cx
    letter_counts(y, n, m, b);                       //@cy
    for (int j = 0; j < m; j++)
        if (a[j] != b[j]) return 0;                  //@diff
    return 1;                                        //@same
}
//#end

//#viz ch03_pattern
/* Шаблон на повторенията: p[i] = номер на първата поява на x[i] */
void repeat_pattern(const int *x, int n, int m, int *p)
{
    int first[30], next = 0;
    for (int j = 0; j < m; j++) first[j] = -1;       //@init
    for (int i = 0; i < n; i++) {                    //@loop
        if (first[x[i]] < 0) first[x[i]] = next++;   //@new
        p[i] = first[x[i]];                          //@set
    }
}
int same_pattern(const int *x, const int *y, int n, int m)
{
    int px[4096], py[4096];
    repeat_pattern(x, n, m, px);                     //@px
    repeat_pattern(y, n, m, py);                     //@py
    for (int i = 0; i < n; i++)
        if (px[i] != py[i]) return 0;                //@diff
    return 1;                                        //@same
}
//#end

#ifndef NO_MAIN
static void show(const char *a, const char *b)
{
    const alphabet *A = alpha_get(0);
    int x[256], y[256];
    int n = alpha_encode(A, a, x, 256), k = alpha_encode(A, b, y, 256);
    if (n != k) { printf("len(%s,%s) = differ\n", a, b); return; }
    printf("counts(%s,%s) = %d\n", a, b, same_counts(x, y, n, 26));
    printf("pattern(%s,%s) = %d\n", a, b, same_pattern(x, y, n, 26));
}
int main(void)
{
    show("ATTACK", "DWWDFN");   /* Цезар k=3 */
    show("ATTACK", "AATCTK");   /* транспозиция 2x3 */
    show("ATTACK", "LXFOPV");   /* Виженер LEMON */
    const alphabet *A = alpha_get(0);
    int x[16], p[16];
    int n = alpha_encode(A, "ATTACK", x, 16);
    repeat_pattern(x, n, 26, p);
    printf("pat(ATTACK) =");
    for (int i = 0; i < n; i++) printf(" %d", p[i]);
    printf("\n");
    return 0;
}
#endif
