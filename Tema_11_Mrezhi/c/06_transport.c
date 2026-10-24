/* Тема 11, раздел 6 — транспорт: TCP установяване и затваряне, рамкиране на съобщения
 * върху поток от байтове, надеждно предаване с плъзгащ се прозорец при загуби.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 06_transport.c -o 06_transport && ./06_transport
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* ---------------- TCP: номера на последователност при установяване и затваряне ---------------- */
enum { CLOSED, LISTEN, SYN_SENT, SYN_RCVD, ESTABLISHED, FIN_WAIT_1, FIN_WAIT_2, CLOSE_WAIT, LAST_ACK, TIME_WAIT };
static const char *SN[] = { "CLOSED", "LISTEN", "SYN_SENT", "SYN_RCVD", "ESTABLISHED", "FIN_WAIT_1", "FIN_WAIT_2", "CLOSE_WAIT", "LAST_ACK", "TIME_WAIT" };

static int cs, ss;                   /* състояния на клиента и сървъра */
static void seg(const char *dir, const char *flags, uint32_t seq, uint32_t ack, int len)
{
    printf("seg = %s %s seq=%u ack=%u len=%d | C=%s S=%s\n", dir, flags, seq, ack, len, SN[cs], SN[ss]);
}

//#viz ch06_tcp
/* x, y — начални номера (ISN) на клиента и сървъра; n — байтове данни. */
void tcp_session(uint32_t x, uint32_t y, int n, int listening)
{
    cs = CLOSED; ss = listening ? LISTEN : CLOSED;          //@init
    cs = SYN_SENT;              seg("C>S", "SYN", x, 0, 0);       //@syn
    if (!listening) {           /* няма слушащ сокет на този порт */
        cs = CLOSED;            seg("S>C", "RST+ACK", 0, x + 1, 0);   //@rst
        return;
    }
    ss = SYN_RCVD;              seg("S>C", "SYN+ACK", y, x + 1, 0);   //@synack
    cs = ESTABLISHED;           seg("C>S", "ACK", x + 1, y + 1, 0);   //@ack3
    ss = ESTABLISHED;                                               //@est
    if (n > 0) {
        seg("C>S", "PSH+ACK", x + 1, y + 1, n);                     //@data
        seg("S>C", "ACK", y + 1, x + 1 + (uint32_t)n, 0);           //@dack
    }
    uint32_t cf = x + 1 + (uint32_t)n;  /* FIN заема една позиция */
    cs = FIN_WAIT_1;            seg("C>S", "FIN+ACK", cf, y + 1, 0);  //@fin1
    ss = CLOSE_WAIT;            seg("S>C", "ACK", y + 1, cf + 1, 0);  //@finack1
    cs = FIN_WAIT_2;                                                //@fw2
    ss = LAST_ACK;              seg("S>C", "FIN+ACK", y + 1, cf + 1, 0);   //@fin2
    cs = TIME_WAIT;             seg("C>S", "ACK", cf + 1, y + 2, 0);  //@finack2
    ss = CLOSED;                                                    //@closed
}
//#end

/* ---------------- рамкиране: 1 байт дължина + данни ---------------- */
static uint8_t rbuf[512];
static int rlen;

//#viz ch06_frame
/* Подава поредната порция байтове от потока; печата всяко цяло съобщение. */
int feed(const uint8_t *chunk, int n, char out[][64], int *nout)
{
    memcpy(rbuf + rlen, chunk, (size_t)n);   //@append
    rlen += n;                               //@append
    int used = 0;
    while (rlen - used >= 1) {
        int L = rbuf[used];                   //@len
        if (rlen - used - 1 < L) break;       //@wait
        memcpy(out[*nout], rbuf + used + 1, (size_t)L);   //@msg
        out[(*nout)++][L] = 0;                //@msg
        used += 1 + L;                        //@msg
    }
    memmove(rbuf, rbuf + used, (size_t)(rlen - used));   //@shift
    rlen -= used;                             //@shift
    return rlen;      /* непълно съобщение, чакащо още байтове */
}
//#end

/* ---------------- плъзгащ се прозорец: Go-Back-N и Selective Repeat ---------------- */
//#viz ch06_arq
/* Модел по рундове: в един рунд (≈ 1 RTT) изпращачът праща целия прозорец
   [base, base+W), после получава кумулативното потвърждение exp.
   lost[s] = 1: първото предаване на сегмент s се губи.
   sr = 0 — Go-Back-N: получателят приема само по ред, изпращачът
            преизпраща всичко от base;
   sr = 1 — Selective Repeat: получателят буферира в прозореца,
            изпращачът преизпраща само липсващите. Връща броя предавания. */
static int timeouts;
int arq(int N, int W, const int lost[], int sr)
{
    int base = 0, exp = 0, tx = 0, got[64] = {0}, sent[64] = {0};
    timeouts = 0;
    while (base < N) {
        int end = base + W < N ? base + W : N;
        for (int s = base; s < end; s++) {
            if (sr && got[s]) continue;            /* SR: вече приет */
            tx++;                                  //@send
            if (lost[s] && !sent[s]++) continue;   //@lost
            if (s == exp || (sr && s < exp + W))
                got[s] = 1;                        //@accept
            else
                continue;  /* GBN: извън ред — изхвърля */   //@discard
            while (exp < N && got[exp]) exp++;     //@advance
        }
        if (exp < end) timeouts++;  /* липсва сегмент: изтича таймерът */  //@timeout
        base = exp;        /* кумулативно ACK плъзга прозореца */   //@slide
    }
    return tx;                                     //@done
}
//#end

#ifndef NO_MAIN
int main(void)
{
    tcp_session(1000, 5000, 100, 1);
    tcp_session(1000, 5000, 0, 0);

    /* съобщения "AB" и "CD" с префикс за дължина, подадени на произволни порции */
    const uint8_t stream[] = { 2, 'A', 'B', 2, 'C', 'D', 3, 'X', 'Y', 'Z' };
    const int cuts[][4] = { {10, 0, 0, 0}, {1, 4, 5, 0}, {2, 2, 2, 4}, {7, 3, 0, 0} };
    for (int c = 0; c < 4; c++) {
        char out[8][64]; int nout = 0, pos = 0; rlen = 0;
        printf("frame%d =", c);
        for (int k = 0; k < 4 && cuts[c][k]; k++) {
            int before = nout;
            int pend = feed(stream + pos, cuts[c][k], out, &nout);
            pos += cuts[c][k];
            printf(" [%d:", cuts[c][k]);
            for (int m = before; m < nout; m++) printf(" %s", out[m]);
            printf(" |%d]", pend);
        }
        printf("\n");
    }

    int L1[64] = {0}; L1[2] = 1;
    int L2[64] = {0}; L2[2] = L2[5] = 1;
    int L3[64] = {0};
    int L4[64] = {0}; L4[0] = L4[1] = L4[7] = 1;
    { int tx = arq(8, 4, L1, 0); printf("gbn(8,4,{2}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(8, 4, L1, 1); printf("sr(8,4,{2}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(10, 4, L2, 0); printf("gbn(10,4,{2,5}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(10, 4, L2, 1); printf("sr(10,4,{2,5}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(6, 3, L3, 0); printf("gbn(6,3,{}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(10, 1, L4, 0); printf("gbn(10,1,{0,1,7}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(10, 5, L4, 0); printf("gbn(10,5,{0,1,7}) = %d to=%d\n", tx, timeouts); }
    { int tx = arq(10, 5, L4, 1); printf("sr(10,5,{0,1,7}) = %d to=%d\n", tx, timeouts); }
    return 0;
}
#endif
