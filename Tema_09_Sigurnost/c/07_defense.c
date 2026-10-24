/* Тема 9, раздел 7 — защитна стена (първото съвпадащо правило) и два подхода на IDS:
 * сигнатури срещу аномалии.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 07_defense.c -o 07 -lm && ./07
 *
 * Всичко е модел в паметта: „пакетът“ е структура, а не мрежов трафик.
 * IPv4 адресите са 32-битови числа; мрежата се задава с адрес и префикс (/24 и т.н.).
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

enum { ACT_ALLOW = 0, ACT_DENY = 1 };
enum { PR_ANY = 0, PR_TCP = 6, PR_UDP = 17 };

//#viz ch07_fw
typedef struct { uint32_t addr; int prefix; } Net;
typedef struct { int action, proto; Net src; int dlo, dhi; } Rule;
typedef struct { int proto; uint32_t src; int dport; } Packet;

static int in_net(uint32_t ip, Net n)
{
    uint32_t mask = n.prefix == 0 ? 0 : 0xFFFFFFFFu << (32 - n.prefix);
    return (ip & mask) == (n.addr & mask);
}

/* Връща действието; *hit = номер на правилото или -1 за политиката по подразбиране */
int fw_check(const Rule *r, int n, Packet p, int def, int *hit, int *cmp)
{
    for (int i = 0; i < n; i++) {                                //@rule
        ++*cmp;
        if (r[i].proto != PR_ANY && r[i].proto != p.proto) continue;   //@proto
        if (!in_net(p.src, r[i].src)) continue;                  //@src
        if (p.dport < r[i].dlo || p.dport > r[i].dhi) continue;  //@port
        *hit = i;                                                //@match
        return r[i].action;
    }
    *hit = -1;
    return def;      /* нито едно правило не съвпада */          //@default
}
//#end

//#viz ch07_ids
/* Сигнатури: търсим известни шаблони в съдържанието (подниз) */
int ids_signature(const char *payload, const char *const sig[], int nsig)
{
    for (int i = 0; i < nsig; i++)                               //@sig_loop
        if (strstr(payload, sig[i])) return i;   /* сигнал */    //@sig_hit
    return -1;                                                   //@sig_none
}

/* Аномалии: стойност над mean + k*std на обучителен период (едностранен праг) */
int ids_anomaly(const double base[], int nb, double x, double k, double *thr)
{
    double m = 0, v = 0;
    for (int i = 0; i < nb; i++) m += base[i];                   //@an_mean
    m /= nb;
    for (int i = 0; i < nb; i++) v += (base[i] - m) * (base[i] - m);
    double sd = sqrt(v / nb);                                    //@an_std
    *thr = m + k * sd;
    return x > *thr;                                             //@an_cmp
}
//#end

#ifndef NO_MAIN
#define IP(a, b, c, d) (((uint32_t)(a) << 24) | ((uint32_t)(b) << 16) | ((uint32_t)(c) << 8) | (uint32_t)(d))
int main(void)
{
    const Rule R[] = {
        { ACT_DENY,  PR_ANY, { IP(203, 0, 113, 0), 24 }, 0, 65535 },
        { ACT_ALLOW, PR_TCP, { IP(0, 0, 0, 0), 0 },     443, 443 },
        { ACT_ALLOW, PR_TCP, { IP(10, 0, 0, 0), 8 },    22, 22 },
        { ACT_ALLOW, PR_UDP, { IP(10, 0, 0, 0), 8 },    53, 53 },
    };
    const Packet P[] = {
        { PR_TCP, IP(198, 51, 100, 7), 443 }, { PR_TCP, IP(203, 0, 113, 9), 443 }, { PR_TCP, IP(10, 1, 2, 3), 22 },
        { PR_TCP, IP(198, 51, 100, 7), 22 },  { PR_UDP, IP(10, 9, 9, 9), 53 },     { PR_UDP, IP(192, 0, 2, 1), 53 },
    };
    for (int i = 0; i < 6; i++)
        for (int def = 0; def < 2; def++) {
            int hit, cmp = 0, a = fw_check(R, 4, P[i], def, &hit, &cmp);
            printf("fw %d def%d = %d %d %d\n", i, def, a, hit, cmp);
        }
    /* обърнат ред: allow 443 преди deny на мрежата */
    const Rule R2[] = { R[1], R[0], R[2], R[3] };
    { int hit, cmp = 0, a = fw_check(R2, 4, P[1], 1, &hit, &cmp); printf("fw swapped 1 = %d %d %d\n", a, hit, cmp); }

    const char *const SIG[] = { "<script", "../", "DROP TABLE" };
    const char *PL[] = { "GET /index.html", "GET /?q=<script", "q=DROP TABLE", "GET /a/../b", "q=DROP  TABLE", "GET /?q=<SCRIPT" };
    for (int i = 0; i < 6; i++) printf("sig %d = %d\n", i, ids_signature(PL[i], SIG, 3));
    const double base[] = { 40, 42, 38, 45, 41, 39, 44, 43 };
    const double X[] = { 46, 52, 120, 30 };
    for (int i = 0; i < 4; i++) for (int k = 2; k <= 3; k++) {
        double thr; int a = ids_anomaly(base, 8, X[i], k, &thr);
        printf("anom %g k%d = %d %.2f\n", X[i], k, a, thr);
    }
    return 0;
}
#endif
