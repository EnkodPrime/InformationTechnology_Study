/* Тема 11, раздел 3 — капсулиране с реални заглавия: HTTP → TCP → IPv4 → Ethernet II.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 03_encap.c -o 03_encap && ./03_encap
 *
 * Учебен случай от ръководството: клиент 192.0.2.10:51000 изпраща
 * „GET /status HTTP/1.1“ към сървър 198.51.100.20:80 през шлюз.
 * Приемаме вече установен TCP канал (seq/ack са примерни стойности),
 * без опции в заглавията, без NAT и тунели. Адресите са от диапазоните
 * за документационни примери; MAC адресите са локално администрирани (02:…).
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define MAXF 1600

typedef struct {
    uint8_t  cmac[6], gmac[6];           /* клиент, шлюз */
    uint8_t  sip[4], dip[4];
    uint16_t sport, dport, ipid;
    uint32_t seq, ack;
    uint8_t  ttl;
} Params;

static void put16(uint8_t *p, uint16_t v) { p[0] = (uint8_t)(v >> 8); p[1] = (uint8_t)v; }
static void put32(uint8_t *p, uint32_t v) { put16(p, (uint16_t)(v >> 16)); put16(p + 2, (uint16_t)v); }

//#viz ch03_csum
/* Интернет контролна сума (RFC 1071): допълнение до единица
   на сумата в допълнение до единица на 16-битовите думи. */
uint16_t inet_checksum(const uint8_t *b, int n, uint32_t sum)
{
    for (int i = 0; i + 1 < n; i += 2) {
        sum += (uint32_t)(b[i] << 8 | b[i + 1]);   //@add
        sum = (sum & 0xFFFF) + (sum >> 16);         //@fold
    }
    if (n & 1) {                                    /* нечетен брой: допълва се с 0 */
        sum += (uint32_t)(b[n - 1] << 8);           //@add
        sum = (sum & 0xFFFF) + (sum >> 16);         //@fold
    }
    return (uint16_t)~sum;                          //@not
}
//#end

/* CRC-32 на Ethernet (IEEE 802.3), отразен полином 0xEDB88320 — подробно в раздел 4. */
static uint32_t crc32(const uint8_t *b, int n)
{
    uint32_t c = 0xFFFFFFFFu;
    for (int i = 0; i < n; i++) {
        c ^= b[i];
        for (int k = 0; k < 8; k++) c = (c >> 1) ^ (0xEDB88320u & (0u - (c & 1u)));
    }
    return ~c;
}

//#viz ch03_encap
/* Строи кадъра отвътре навън. Връща дължината с FCS. */
int encapsulate(const Params *p, const char *http, uint8_t f[MAXF])
{
    int alen = (int)strlen(http);
    uint8_t *eth = f, *ip = f + 14, *tcp = ip + 20, *app = tcp + 20;
    memcpy(app, http, (size_t)alen);                    //@app

    /* TCP заглавие, 20 байта */
    put16(tcp, p->sport); put16(tcp + 2, p->dport);     //@tcp
    put32(tcp + 4, p->seq); put32(tcp + 8, p->ack);     //@tcp
    tcp[12] = 5 << 4;              /* data offset = 5 думи */   //@tcp
    tcp[13] = 0x18;                /* флагове PSH + ACK */      //@tcp
    put16(tcp + 14, 64240);        /* прозорец */              //@tcp
    put16(tcp + 16, 0); put16(tcp + 18, 0);             //@tcp
    /* контролна сума върху псевдо-заглавие + сегмент */
    int tlen = 20 + alen;
    uint32_t ps = (uint32_t)(p->sip[0] << 8 | p->sip[1]) + (uint32_t)(p->sip[2] << 8 | p->sip[3])
                + (uint32_t)(p->dip[0] << 8 | p->dip[1]) + (uint32_t)(p->dip[2] << 8 | p->dip[3])
                + 6u + (uint32_t)tlen;                  //@tcsum
    put16(tcp + 16, inet_checksum(tcp, tlen, ps));      //@tcsum

    /* IPv4 заглавие, 20 байта */
    ip[0] = 0x45;                  /* версия 4, IHL 5 */       //@ip
    ip[1] = 0;                                          //@ip
    put16(ip + 2, (uint16_t)(20 + tlen));  /* обща дължина */  //@ip
    put16(ip + 4, p->ipid);                             //@ip
    put16(ip + 6, 0x4000);         /* DF, отместване 0 */      //@ip
    ip[8] = p->ttl;                                     //@ip
    ip[9] = 6;                     /* протокол: TCP */         //@ip
    put16(ip + 10, 0);                                  //@ip
    memcpy(ip + 12, p->sip, 4); memcpy(ip + 16, p->dip, 4);    //@ip
    put16(ip + 10, inet_checksum(ip, 20, 0));           //@icsum

    /* Ethernet II: получател = MAC на ШЛЮЗА, не на сървъра */
    memcpy(eth, p->gmac, 6); memcpy(eth + 6, p->cmac, 6);      //@eth
    put16(eth + 12, 0x0800);       /* EtherType: IPv4 */       //@eth
    int len = 14 + 20 + tlen;
    while (len < 60) f[len++] = 0; /* минимален кадър: допълване */   //@pad
    uint32_t fcs = crc32(f, len);                       //@fcs
    for (int k = 0; k < 4; k++) f[len++] = (uint8_t)(fcs >> (8 * k));   //@fcs
    return len;                                         //@ret
}
//#end

//#viz ch03_hop
/* Маршрутизатор: приема кадъра, препраща IP пакета в НОВ кадър.
   Връща новата дължина или -1, ако пакетът се отхвърля (TTL). */
int forward(uint8_t f[MAXF], int len, const uint8_t out_mac[6], const uint8_t next_mac[6])
{
    if (crc32(f, len - 4) != (uint32_t)(f[len - 4] | f[len - 3] << 8 | f[len - 2] << 16 | (uint32_t)f[len - 1] << 24))
        return -1;                                      //@chkfcs
    uint8_t *ip = f + 14;
    if (inet_checksum(ip, 20, 0) != 0) return -1;       //@chkip
    if (ip[8] <= 1) return -1;     /* TTL изтича: отхвърля (и ICMP) */ //@ttl
    ip[8]--;                                            //@dec
    put16(ip + 10, 0);                                  //@recsum
    put16(ip + 10, inet_checksum(ip, 20, 0));           //@recsum
    memcpy(f, next_mac, 6); memcpy(f + 6, out_mac, 6);  //@mac
    len -= 4;
    uint32_t fcs = crc32(f, len);                       //@fcs
    for (int k = 0; k < 4; k++) f[len++] = (uint8_t)(fcs >> (8 * k));   //@fcs
    return len;                                         //@ret
}
//#end

static void hex(const char *name, const uint8_t *b, int n)
{
    printf("%s =", name);
    for (int i = 0; i < n; i++) printf(" %02X", b[i]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    Params p = { {2,0,0,0,0,0x0A}, {2,0,0,0,0,0x01}, {192,0,2,10}, {198,51,100,20},
                 51000, 80, 0x1C46, 1000, 5000, 64 };
    const char *http = "GET /status HTTP/1.1\r\nHost: example.org\r\n\r\n";
    uint8_t f[MAXF];
    int n = encapsulate(&p, http, f);
    printf("len = %d\n", n);
    hex("frame", f, n);
    printf("ipcsum = %04X\n", (unsigned)(f[24] << 8 | f[25]));
    printf("tcpcsum = %04X\n", (unsigned)(f[50] << 8 | f[51]));
    printf("verify ip = %04X\n", (unsigned)inet_checksum(f + 14, 20, 0));

    const uint8_t r1out[6] = {2,0,0,0,1,1}, r2in[6] = {2,0,0,0,1,2};
    const uint8_t r2out[6] = {2,0,0,0,2,1}, srv[6] = {2,0,0,0,0,0x14};
    n = forward(f, n, r1out, r2in);
    printf("hop1 ttl = %u\n", (unsigned)f[22]);
    printf("hop1 ipcsum = %04X\n", (unsigned)(f[24] << 8 | f[25]));
    hex("hop1 head", f, 34);
    hex("hop1 fcs", f + n - 4, 4);
    n = forward(f, n, r2out, srv);
    printf("hop2 ttl = %u\n", (unsigned)f[22]);
    printf("hop2 ipcsum = %04X\n", (unsigned)(f[24] << 8 | f[25]));
    hex("hop2 fcs", f + n - 4, 4);

    /* TTL = 2: първият маршрутизатор препраща с TTL 1, вторият отхвърля */
    p.ttl = 2;
    n = encapsulate(&p, http, f);
    n = forward(f, n, r1out, r2in);
    printf("ttl2 hop1 = %d\n", n);
    printf("ttl2 hop2 = %d\n", forward(f, n, r2out, srv));

    /* кратък полезен товар: допълване до 60 байта */
    n = encapsulate(&p, "", f);
    printf("empty len = %d\n", n);
    const uint8_t t1[] = {0xAB, 0xCD, 0xEF}, t2[] = {0xFF, 0xFF, 0x00, 0x01}, t3[] = {0x45, 0x00, 0x00, 0x53};
    printf("csum(AB CD EF) = %04X\n", (unsigned)inet_checksum(t1, 3, 0));
    printf("csum(FF FF 00 01) = %04X\n", (unsigned)inet_checksum(t2, 4, 0));
    printf("csum(45 00 00 53) = %04X\n", (unsigned)inet_checksum(t3, 4, 0));
    return 0;
}
#endif
