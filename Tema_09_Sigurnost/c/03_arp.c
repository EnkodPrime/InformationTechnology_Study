/* Тема 9, раздел 3 — модел на ARP кеш при подмяна (spoofing) и две защити.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 03_arp.c -o 03 && ./03
 *
 * Това е МОДЕЛ в паметта: няма мрежа, няма сокети. IP и MAC адресите са кодирани
 * като малки цели числа (последния октет / последния байт):
 *   1  -> шлюз (gateway)   MAC 0x01
 *   20 -> жертва (victim)  MAC 0x20
 *   66 -> нападател        MAC 0x66
 * Събитие "reply IP MAC" = пристига ARP отговор „IP е на MAC“.
 * Събитие "send IP"      = жертвата изпраща кадър към IP; кешът казва на кой MAC.
 */
#include <stdio.h>
#include <string.h>

enum { MODE_NONE = 0, MODE_STATIC = 1, MODE_DAI = 2 };
enum { ACC_NEW = 0, ACC_UPDATE = 1, ACC_DROP_DAI = 2, ACC_KEEP_STATIC = 3, ACC_SAME = 4 };

//#viz ch03_arp
#define CACHE 4
typedef struct { int ip, mac, is_static, used; } Entry;
static Entry cache[CACHE];

/* Таблица на комутатора с доверени двойки IP–MAC (при DAI) */
static const int BIND_IP[]  = { 1, 20, 66 };
static const int BIND_MAC[] = { 0x01, 0x20, 0x66 };

static int binding_ok(int ip, int mac)
{
    for (int i = 0; i < 3; i++)
        if (BIND_IP[i] == ip) return BIND_MAC[i] == mac;
    return 0;
}

void arp_init(int mode)
{
    memset(cache, 0, sizeof cache);
    if (mode == MODE_STATIC)                                   //@init
        cache[0] = (Entry){ 1, 0x01, 1, 1 };  /* статичен запис за шлюза */
}

int arp_receive(int ip, int mac, int mode)
{
    if (mode == MODE_DAI && !binding_ok(ip, mac))              //@dai
        return ACC_DROP_DAI;     /* комутаторът не препраща отговора */
    for (int i = 0; i < CACHE; i++) {                          //@find
        if (cache[i].used && cache[i].ip == ip) {
            if (cache[i].is_static) return ACC_KEEP_STATIC;    //@static
            if (cache[i].mac == mac) return ACC_SAME;
            cache[i].mac = mac;  /* последният отговор печели */  //@overwrite
            return ACC_UPDATE;
        }
    }
    for (int i = 0; i < CACHE; i++)
        if (!cache[i].used) {
            cache[i] = (Entry){ ip, mac, 0, 1 };               //@insert
            return ACC_NEW;
        }
    return ACC_SAME;   /* пълен кеш — моделът игнорира */
}

/* На кой MAC отива кадър към ip; -1 ако няма запис */
int arp_resolve(int ip)
{
    for (int i = 0; i < CACHE; i++)                            //@resolve
        if (cache[i].used && cache[i].ip == ip) return cache[i].mac;
    return -1;                                                 //@miss
}
//#end

#ifndef NO_MAIN
/* Сценарий: списък от събития; тип 'r' = reply, 's' = send */
typedef struct { char type; int ip, mac; } Ev;

static void run(const char *name, const Ev *ev, int n, int mode)
{
    arp_init(mode);
    char delivered[128] = "";
    int dropped = 0, kept = 0, sends = 0;
    for (int k = 0; k < n; k++) {
        if (ev[k].type == 'r') {
            int r = arp_receive(ev[k].ip, ev[k].mac, mode);
            if (r == ACC_DROP_DAI) dropped++;
            if (r == ACC_KEEP_STATIC) kept++;
        } else {
            int m = arp_resolve(ev[k].ip);
            char b[16];
            snprintf(b, sizeof b, "%s%d", sends ? "," : "", m);
            strncat(delivered, b, sizeof delivered - strlen(delivered) - 1);
            sends++;
        }
    }
    printf("%s m%d delivered = %s\n", name, mode, delivered);
    printf("%s m%d dropped = %d\n", name, mode, dropped);
    printf("%s m%d kept = %d\n", name, mode, kept);
    printf("%s m%d gw = %d\n", name, mode, arp_resolve(1));
}

int main(void)
{
    const Ev s1[] = { {'r', 1, 0x01}, {'s', 1, 0}, {'r', 1, 0x66}, {'s', 1, 0}, {'r', 1, 0x01}, {'s', 1, 0} };
    const Ev s2[] = { {'s', 1, 0}, {'r', 1, 0x66}, {'r', 20, 0x66}, {'s', 1, 0}, {'s', 20, 0} };
    const Ev s3[] = { {'r', 1, 0x01}, {'r', 66, 0x66}, {'r', 1, 0x66}, {'s', 1, 0}, {'s', 66, 0} };
    for (int m = 0; m < 3; m++) {
        run("s1", s1, 6, m);
        run("s2", s2, 5, m);
        run("s3", s3, 5, m);
    }
    return 0;
}
#endif
