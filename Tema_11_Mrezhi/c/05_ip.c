/* Тема 11, раздел 5 — IPv4 подмрежи, най-дълъг съвпадащ префикс, NAT с портове.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 05_ip.c -o 05_ip && ./05_ip
 *
 * Подмрежите приемат стандартна IPv4 подмрежа с broadcast семантика;
 * /31 и /32 са специални случаи и се отчитат отделно.
 */
#include <stdio.h>
#include <stdint.h>

typedef struct { uint32_t net, mask, bcast, first, last; uint64_t size, hosts; } Subnet;

//#viz ch05_subnet
Subnet subnet(uint32_t addr, int prefix)
{
    Subnet s;
    s.mask  = prefix ? 0xFFFFFFFFu << (32 - prefix) : 0;     //@mask
    s.net   = addr & s.mask;                                 //@net
    s.bcast = s.net | ~s.mask;                               //@bcast
    s.size  = (uint64_t)1 << (32 - prefix);   /* 2^(брой хостови битове) */  //@size
    if (prefix >= 31) {          /* /31: две адреси за връзка точка–точка; /32: един хост */
        s.first = s.net; s.last = s.bcast;                   //@special
        s.hosts = prefix == 31 ? 2 : 1;                      //@special
    } else {
        s.first = s.net + 1;                                 //@hosts
        s.last  = s.bcast - 1;                               //@hosts
        s.hosts = s.size - 2;    /* без адреса на мрежата и broadcast */  //@hosts
    }
    return s;                                                //@ret
}
//#end

typedef struct { uint32_t pfx; int len; const char *via; } Route;

//#viz ch05_lpm
/* Връща индекса на маршрута с НАЙ-ДЪЛЪГ съвпадащ префикс или -1. */
int lookup(const Route *rt, int n, uint32_t dst)
{
    int best = -1;
    for (int i = 0; i < n; i++) {
        uint32_t m = rt[i].len ? 0xFFFFFFFFu << (32 - rt[i].len) : 0;   //@mask
        if ((dst & m) != rt[i].pfx) continue;                           //@cmp
        if (best < 0 || rt[i].len > rt[best].len)                       //@match
            best = i;                                                   //@best
    }
    return best;                                                        //@ret
}
//#end

typedef struct { uint32_t in_ip; uint16_t in_port, out_port; } NatEntry;
static NatEntry nat[64];
static int nnat;
static uint16_t next_port = 40000;

//#viz ch05_nat
/* Изходящ пакет от частен адрес: връща публичния порт (създава запис при нужда). */
uint16_t nat_out(uint32_t src, uint16_t sport)
{
    for (int i = 0; i < nnat; i++)
        if (nat[i].in_ip == src && nat[i].in_port == sport)   //@find
            return nat[i].out_port;                           //@hit
    nat[nnat].in_ip = src; nat[nnat].in_port = sport;         //@new
    nat[nnat].out_port = next_port++;                         //@new
    return nat[nnat++].out_port;                              //@new
}
/* Входящ пакет към публичния адрес: намира вътрешния получател или 0 (отхвърля). */
int nat_in(uint16_t dport, uint32_t *ip, uint16_t *port)
{
    for (int i = 0; i < nnat; i++)
        if (nat[i].out_port == dport) {                       //@rfind
            *ip = nat[i].in_ip; *port = nat[i].in_port;       //@rhit
            return 1;                                         //@rhit
        }
    return 0;          /* няма запис: няма към кого да се преведе */   //@rmiss
}
//#end

static uint32_t ip4(int a, int b, int c, int d) { return (uint32_t)a << 24 | (uint32_t)b << 16 | (uint32_t)c << 8 | (uint32_t)d; }
static void ps(char *o, uint32_t v) { sprintf(o, "%u.%u.%u.%u", v >> 24, v >> 16 & 255, v >> 8 & 255, v & 255); }

static void show(int a, int b, int c, int d, int p)
{
    Subnet s = subnet(ip4(a, b, c, d), p);
    char m[16], n[16], bc[16], f[16], l[16];
    ps(m, s.mask); ps(n, s.net); ps(bc, s.bcast); ps(f, s.first); ps(l, s.last);
    printf("sub(%d.%d.%d.%d/%d) = %s %s %s %s %s %llu\n", a, b, c, d, p, m, n, bc, f, l, (unsigned long long)s.hosts);
}

#ifndef NO_MAIN
int main(void)
{
    show(192, 168, 10, 34, 24);
    show(192, 168, 10, 70, 26);
    show(10, 1, 2, 3, 8);
    show(172, 16, 5, 200, 20);
    show(192, 0, 2, 7, 31);
    show(192, 0, 2, 7, 32);
    show(198, 51, 100, 130, 25);
    show(203, 0, 113, 9, 0);

    const Route rt[] = {
        { 0, 0, "default -> 203.0.113.1" },
        { 0x0A000000u, 8, "10.0.0.0/8 -> R2" },
        { 0x0A010000u, 16, "10.1.0.0/16 -> R3" },
        { 0x0A010200u, 24, "10.1.2.0/24 -> eth1 (direct)" },
        { 0xC0A80A00u, 24, "192.168.10.0/24 -> eth0 (direct)" },
    };
    const uint32_t q[] = { ip4(10,1,2,3), ip4(10,1,9,9), ip4(10,200,0,1), ip4(8,8,8,8), ip4(192,168,10,70) };
    for (int i = 0; i < 5; i++) {
        char a[16]; ps(a, q[i]);
        printf("lpm(%s) = %d\n", a, lookup(rt, 5, q[i]));
    }

    printf("nat(192.168.10.34:51000) = %u\n", nat_out(ip4(192,168,10,34), 51000));
    printf("nat(192.168.10.35:51000) = %u\n", nat_out(ip4(192,168,10,35), 51000));
    printf("nat(192.168.10.34:51000) again = %u\n", nat_out(ip4(192,168,10,34), 51000));
    printf("nat(192.168.10.34:51001) = %u\n", nat_out(ip4(192,168,10,34), 51001));
    uint32_t ip; uint16_t port;
    if (nat_in(40001, &ip, &port)) { char a[16]; ps(a, ip); printf("natin(40001) = %s:%u\n", a, port); }
    printf("natin(45000) = %d\n", nat_in(45000, &ip, &port));
    return 0;
}
#endif
