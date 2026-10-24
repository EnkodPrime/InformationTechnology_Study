/* Тема 8, раздел 5 — игра с купчина: вземане на ход от множество M (напр. {1,2,3}).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 05_nim.c -o 05 && ./05
 *
 * Ретроградно оцветяване: позициите се класифицират от 0 нагоре.
 *   Позиция е ПЕЧЕЛИВША (W) за играча на ход, ако има ход към ГУБЕЩА (L) позиция;
 *   ГУБЕЩА е, ако всички ходове водят към печеливши (или ходове няма).
 * Режим 0: взелият последния предмет печели  (0 предмета на ход ⇒ L).
 * Режим 1: взелият последния предмет губи   (0 предмета на ход ⇒ W: противникът е взел последния).
 */
#include <stdio.h>

#define MAXH 64

//#viz ch05_retro
/* win[n] = 1, ако играчът на ход при n предмета има печеливша стратегия */
void retro(int N, const int M[], int m, int misere, int win[], int best[])
{
    win[0] = misere ? 1 : 0;                       //@base
    best[0] = -1;
    for (int n = 1; n <= N; n++) {                 //@loop
        win[n] = 0; best[n] = -1;                  //@init
        for (int k = 0; k < m; k++) {              //@move
            int t = M[k];
            if (t > n) continue;                   //@skip
            if (!win[n - t]) {                     //@test
                win[n] = 1; best[n] = t;           //@win
                break;
            }
        }
    }
}
//#end

//#viz ch05_play
/* ход по стратегията: ако позицията е печеливша — към губеща; иначе — най-малкият допустим ход */
int strategy_move(int n, const int M[], int m, const int win[], const int best[])
{
    if (win[n])                                    //@good
        return best[n];
    for (int k = 0; k < m; k++)                    //@any
        if (M[k] <= n) return M[k];
    return 0;                                      //@none
}
//#end

#ifndef NO_MAIN
static void run(const char *tag, int N, const int M[], int m, int misere)
{
    int win[MAXH + 1], best[MAXH + 1];
    retro(N, M, m, misere, win, best);
    printf("%s pattern = ", tag);
    for (int n = 0; n <= N; n++) putchar(win[n] ? 'W' : 'L');
    printf("\n%s best =", tag);
    for (int n = 0; n <= N; n++) printf(" %d", best[n]);
    printf("\n");
    /* игра стратегия срещу стратегия от N */
    int n = N, side = 0, moves = 0;
    printf("%s game =", tag);
    while (n > 0) {
        int t = strategy_move(n, M, m, win, best);
        if (t == 0) break;
        printf(" %d", t);
        n -= t; side ^= 1; moves++;
    }
    /* side = кой е на ход сега (0 — първият) */
    int first_wins = misere ? (side == 0) : (side == 1);
    if (n > 0) first_wins = (side == 1);     /* блокиран играч на ход губи */
    printf("\n%s first wins = %d\n", tag, first_wins);
}

int main(void)
{
    int M123[] = {1, 2, 3}, M134[] = {1, 3, 4}, M25[] = {2, 5};
    run("n6", 6, M123, 3, 0);
    run("n12", 12, M123, 3, 0);
    run("m6", 6, M123, 3, 1);
    run("m13", 13, M123, 3, 1);
    run("s20", 20, M134, 3, 0);
    run("t15", 15, M25, 2, 0);
    return 0;
}
#endif
