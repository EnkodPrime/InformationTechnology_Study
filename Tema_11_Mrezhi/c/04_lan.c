/* Тема 11, раздел 4 — локални мрежи: обучение на комутатор, решение за ARP, CRC-32 на кадъра.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 04_lan.c -o 04_lan && ./04_lan
 *
 * Комутаторът е учебен модел: таблица MAC → порт, научава се от адреса
 * на ИЗПРАЩАЧА, препраща по адреса на ПОЛУЧАТЕЛЯ; непознат получател или
 * broadcast → наводнява всички портове освен входния. Без VLAN и без стареене.
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define NPORT 8
#define TABSZ 32

typedef struct { char mac[8]; int port; } Entry;
static Entry tab[TABSZ];
static int ntab;

//#viz ch04_switch
/* Обработва един кадър (src, dst) пристигнал на порт in.
   out[p] = 1 за изходните портове. Връща броя изходни портове. */
int switch_frame(const char *src, const char *dst, int in, int nports, int out[NPORT])
{
    int k;
    for (k = 0; k < ntab; k++)                      /* обучение: търсим src */
        if (strcmp(tab[k].mac, src) == 0) break;     //@lookup_src
    if (k == ntab && ntab < TABSZ) {
        strcpy(tab[ntab].mac, src);                  //@learn
        tab[ntab++].port = in;                       //@learn
    } else if (k < ntab && tab[k].port != in) {
        tab[k].port = in;                            //@move
    }
    memset(out, 0, sizeof(int) * NPORT);
    if (strcmp(dst, "FF") != 0)                      /* FF = broadcast */
        for (k = 0; k < ntab; k++)
            if (strcmp(tab[k].mac, dst) == 0) {      //@lookup_dst
                if (tab[k].port == in) return 0;     //@filter
                out[tab[k].port] = 1;                //@forward
                return 1;                            //@forward
            }
    int n = 0;
    for (int p = 0; p < nports; p++)                 /* непознат или broadcast */
        if (p != in) { out[p] = 1; n++; }            //@flood
    return n;                                        //@flood
}
//#end

//#viz ch04_arp
/* Към кой IPv4 адрес хостът търси MAC чрез ARP? */
uint32_t next_hop(uint32_t me, int prefix, uint32_t dst, uint32_t gw)
{
    uint32_t mask = prefix ? 0xFFFFFFFFu << (32 - prefix) : 0;  //@mask
    if ((me & mask) == (dst & mask))                 //@cmp
        return dst;       /* локален: ARP за самата цел */      //@local
    return gw;            /* отдалечен: ARP за шлюза */         //@remote
}
//#end

//#viz ch04_crc
/* CRC-32 на Ethernet (IEEE 802.3), побитово, отразен полином 0xEDB88320. */
uint32_t crc32_bitwise(const uint8_t *b, int n)
{
    uint32_t c = 0xFFFFFFFFu;                        //@init
    for (int i = 0; i < n; i++) {
        c ^= b[i];                                   //@xor
        for (int k = 0; k < 8; k++) {
            if (c & 1)                               //@bit
                c = (c >> 1) ^ 0xEDB88320u;          //@poly
            else
                c >>= 1;                             //@shift
        }
    }
    return ~c;                                       //@final
}
//#end

static uint32_t ip(int a, int b, int c, int d) { return (uint32_t)a << 24 | (uint32_t)b << 16 | (uint32_t)c << 8 | (uint32_t)d; }
static void pip(const char *name, uint32_t v) { printf("%s = %u.%u.%u.%u\n", name, v >> 24, v >> 16 & 255, v >> 8 & 255, v & 255); }

#ifndef NO_MAIN
int main(void)
{
    /* сценарий: A на порт 0, B на 1, C на 2, D на 3; 4 порта */
    const char *seq[][2] = { {"A","B"}, {"B","A"}, {"C","FF"}, {"A","C"}, {"D","A"}, {"A","E"}, {"B","A"} };
    const int inport[] = { 0, 1, 2, 0, 3, 0, 3 };     /* последният: B се е преместил на порт 3 */
    int out[NPORT];
    for (int i = 0; i < 7; i++) {
        int n = switch_frame(seq[i][0], seq[i][1], inport[i], 4, out);
        printf("sw%d out =", i);
        for (int p = 0; p < 4; p++) if (out[p]) printf(" %d", p);
        printf(" (%d)\n", n);
    }
    printf("sw table =");
    for (int k = 0; k < ntab; k++) printf(" %s:%d", tab[k].mac, tab[k].port);
    printf("\n");

    pip("nh(192.168.10.34/24 -> 192.168.10.77)", next_hop(ip(192,168,10,34), 24, ip(192,168,10,77), ip(192,168,10,1)));
    pip("nh(192.168.10.34/24 -> 198.51.100.20)", next_hop(ip(192,168,10,34), 24, ip(198,51,100,20), ip(192,168,10,1)));
    pip("nh(192.168.10.70/26 -> 192.168.10.130)", next_hop(ip(192,168,10,70), 26, ip(192,168,10,130), ip(192,168,10,65)));
    pip("nh(192.168.10.70/26 -> 192.168.10.100)", next_hop(ip(192,168,10,70), 26, ip(192,168,10,100), ip(192,168,10,65)));

    printf("crc(123456789) = %08X\n", (unsigned)crc32_bitwise((const uint8_t *)"123456789", 9));
    printf("crc(abc) = %08X\n", (unsigned)crc32_bitwise((const uint8_t *)"abc", 3));
    const uint8_t z[1] = {0};
    printf("crc(00) = %08X\n", (unsigned)crc32_bitwise(z, 1));
    return 0;
}
#endif
