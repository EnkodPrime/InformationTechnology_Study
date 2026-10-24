/* Тема 6, раздел 9 — транзакции и индекси (учебни модели, не реализация на конкретна СУБД).
 *   transfer      — превод между сметки с журнал за отмяна (undo log): всички или никакви изменения
 *   run_schedule  — две конкурентни транзакции върху един баланс: загубено обновяване,
 *                   атомарна команда UPDATE x = x - d, изключително заключване до COMMIT
 *   seq_scan / index_lookup / index_insert — цената на индекс: по-малко сравнения при търсене,
 *                   повече работа при вмъкване (подреден масив вместо B-дърво — същата идея)
 *
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 09_tx.c -o tx && ./tx
 */
#include <stdio.h>
#include <string.h>

//#viz ch09_transfer
/* crash_at: 0 — без срив; 1 — срив след първия запис; 2 — срив преди COMMIT */
typedef struct { int acc; int old; } Undo;

int transfer(int bal[], int from, int to, int amount, int crash_at, int *undone)
{
    Undo log[4]; int nlog = 0;                 /* BEGIN */           //@t_begin
    *undone = 0;
    if (bal[from] < amount)                    /* ограничение: баланс >= 0 */  //@t_check
        goto rollback;
    log[nlog++] = (Undo){ from, bal[from] };   /* журнал: старата стойност */  //@t_log1
    bal[from] -= amount;                                             //@t_w1
    if (crash_at == 1) goto rollback;                                //@t_crash1
    log[nlog++] = (Undo){ to, bal[to] };                             //@t_log2
    bal[to] += amount;                                               //@t_w2
    if (crash_at == 2) goto rollback;                                //@t_crash2
    return 1;                                  /* COMMIT */          //@t_commit
rollback:
    while (nlog > 0) {                         /* ROLLBACK: обратен ред */  //@t_undo
        nlog--;
        bal[log[nlog].acc] = log[nlog].old;
        (*undone)++;
    }
    return 0;                                                        //@t_abort
}
//#end

//#viz ch09_schedule
/* Разписание: "R1 R2 W1 W2 C1 C2". Ri — Ti чете x; Wi — Ti записва; Ci — COMMIT.
   mode 0: прочитане и после запис на изчислената стойност (read–modify–write)
   mode 1: атомарна команда UPDATE x = x - d (четенето и записът са една стъпка)
   mode 2: Ri взема изключително заключване, освобождава се при Ci; чакащата операция се отлага */
int run_schedule(const char *sched, int x0, const int d[3], int mode, int *waits)
{
    int x = x0, local[3] = { 0, 0, 0 }, lock = 0;   /* lock: 0 — свободно, i — държи Ti */
    char ops[32][3]; int n = 0;
    for (const char *p = sched; *p && n < 32; ) {
        while (*p == ' ') p++;
        if (!*p) break;
        ops[n][0] = p[0]; ops[n][1] = p[1]; ops[n][2] = '\0'; n++;
        p += 2;
    }
    int done[32] = { 0 }, left = n;
    *waits = 0;
    while (left > 0) {
        int progressed = 0;
        for (int k = 0; k < n; k++) {                                //@s_next
            if (done[k]) continue;
            int t = ops[k][1] - '0';
            int blocked = 0;   /* по-ранна неизпълнена операция на същата транзакция */
            for (int j = 0; j < k; j++) if (!done[j] && ops[j][1] - '0' == t) blocked = 1;
            if (blocked) continue;
            if (mode == 2 && ops[k][0] == 'R' && lock && lock != t) { //@s_wait
                (*waits)++;
                continue;
            }
            if (ops[k][0] == 'R') {
                if (mode == 2) lock = t;                             //@s_lock
                if (mode != 1) local[t] = x;                         //@s_read
            } else if (ops[k][0] == 'W') {
                if (mode == 1) x = x - d[t];                         //@s_atomic
                else x = local[t] - d[t];                            //@s_write
            } else if (ops[k][0] == 'C') {
                if (lock == t) lock = 0;                             //@s_commit
            }
            done[k] = 1; left--; progressed = 1;
            break;          /* след всяка изпълнена операция — отначало по разписанието */
        }
        if (!progressed) break;   /* взаимно блокиране: не се случва с тези разписания */
    }
    return x;                                                        //@s_end
}
//#end

//#viz ch09_index
/* Последователно четене: сравнява всеки ред (n сравнения при липса) */
int seq_scan(const int keys[], int n, int key, int *cmp)
{
    *cmp = 0;
    for (int i = 0; i < n; i++) {                                    //@ix_scan
        (*cmp)++;
        if (keys[i] == key) return i;                                //@ix_hit
    }
    return -1;
}
/* Индекс: подреден масив от ключове -> двоично търсене, ~log2(n) сравнения */
int index_lookup(const int idx[], int n, int key, int *cmp)
{
    int lo = 0, hi = n - 1;
    *cmp = 0;
    while (lo <= hi) {                                               //@ix_bs
        int mid = lo + (hi - lo) / 2;
        (*cmp)++;
        if (idx[mid] == key) return mid;                             //@ix_found
        if (idx[mid] < key) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
/* Цена за поддръжка: при всяко вмъкване в таблицата индексът също се променя */
int index_insert(int idx[], int n, int key, int *moves)
{
    int i = n;
    *moves = 0;
    while (i > 0 && idx[i - 1] > key) {                              //@ix_shift
        idx[i] = idx[i - 1];
        i--; (*moves)++;
    }
    idx[i] = key;                                                    //@ix_put
    return n + 1;
}
//#end

#ifndef NO_MAIN
int main(void)
{
    int und;
    for (int crash = 0; crash <= 2; crash++) {
        int bal[2] = { 100, 50 };
        int ok = transfer(bal, 0, 1, 30, crash, &und);
        printf("tr%d = %d %d %d %d\n", crash, ok, bal[0], bal[1], und);
    }
    int bal[2] = { 20, 50 };
    int ok = transfer(bal, 0, 1, 30, 0, &und);
    printf("tr3 = %d %d %d %d\n", ok, bal[0], bal[1], und);

    const int d[3] = { 0, 10, 20 };
    const char *sc[] = { "R1 R2 W1 W2 C1 C2", "R1 W1 C1 R2 W2 C2", "R1 R2 W2 W1 C2 C1", "R2 R1 W1 C1 W2 C2" };
    for (int s = 0; s < 4; s++)
        for (int m = 0; m < 3; m++) {
            int w, x = run_schedule(sc[s], 100, d, m, &w);
            printf("sc%d m%d = %d %d\n", s, m, x, w);
        }

    int keys[] = { 42, 7, 19, 88, 3, 56, 71, 25, 64, 11, 90, 33, 50, 15, 77, 2 };
    int n = (int)(sizeof keys / sizeof keys[0]);
    int idx[64], m = 0, mv, total = 0;
    for (int i = 0; i < n; i++) { m = index_insert(idx, m, keys[i], &mv); total += mv; }
    printf("ix moves = %d\n", total);
    int probes[] = { 50, 2, 90, 60 };
    for (int p = 0; p < 4; p++) {
        int c1, c2;
        int r1 = seq_scan(keys, n, probes[p], &c1);
        int r2 = index_lookup(idx, m, probes[p], &c2);
        printf("ix%d = %d %d %d %d\n", probes[p], r1, c1, r2 >= 0, c2);
    }
    return 0;
}
#endif
