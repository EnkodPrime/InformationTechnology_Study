/* Тема 11, раздел 7 — DNS: кодиране на име в заявка и итеративно разрешаване с кеш.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 07_dns.c -o 07_dns && ./07_dns
 *
 * Учебна йерархия (имената и адресите са от диапазоните за документационни примери;
 * сървърите са условни): корен → org/com → example.org/example.com.
 * Рекурсивният resolver пита от името на клиента, кешира отговорите и
 * насочванията за TTL секунди. Отрицателно кеширане не е моделирано.
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

//#viz ch07_qname
/* "www.example.org" -> 03 'w' 'w' 'w' 07 'e' ... 03 'o' 'r' 'g' 00 */
int encode_qname(const char *name, uint8_t *out)
{
    int n = 0;
    while (*name) {
        const char *dot = strchr(name, '.');
        int len = dot ? (int)(dot - name) : (int)strlen(name);   //@label
        out[n++] = (uint8_t)len;                                 //@lenbyte
        memcpy(out + n, name, (size_t)len);                      //@copy
        n += len;                                                //@copy
        name += len + (dot ? 1 : 0);                             //@next
    }
    out[n++] = 0;          /* коренът: етикет с дължина 0 */     //@root
    return n;                                                    //@ret
}
//#end

typedef struct { const char *zone; int parent; const char *server; } Zone;
static const Zone Z[] = {
    { "",            -1, "198.51.100.1 (корен)" },
    { "org",          0, "198.51.100.2 (org)" },
    { "com",          0, "198.51.100.3 (com)" },
    { "example.org",  1, "203.0.113.53 (example.org)" },
    { "example.com",  2, "203.0.113.54 (example.com)" },
};
enum { NZ = 5 };
static const int NS_TTL[NZ] = { 0, 3600, 3600, 1800, 1800 };   /* TTL на насочването към зоната */
typedef struct { const char *name; const char *a; int ttl; } Rec;
static const Rec R[] = {
    { "example.org",     "203.0.113.80", 300 },
    { "www.example.org", "203.0.113.80", 300 },
    { "api.example.org", "203.0.113.81", 60 },
    { "www.example.com", "203.0.113.90", 120 },
};
enum { NR = 4 };

static int in_zone(const char *name, const char *zone)
{
    size_t ln = strlen(name), lz = strlen(zone);
    if (lz == 0) return 1;
    if (ln == lz) return strcmp(name, zone) == 0;
    return ln > lz && name[ln - lz - 1] == '.' && strcmp(name + ln - lz, zone) == 0;
}

/* кеш на resolver-а */
typedef struct { char key[64]; int zone; const char *a; int exp; } Cache;
static Cache C[32];
static int nc;
static Cache *cget(const char *key, int now)
{
    for (int i = 0; i < nc; i++) if (strcmp(C[i].key, key) == 0 && C[i].exp > now) return &C[i];
    return NULL;
}
static void cput(const char *key, int zone, const char *a, int exp)
{
    for (int i = 0; i < nc; i++) if (strcmp(C[i].key, key) == 0) { C[i].zone = zone; C[i].a = a; C[i].exp = exp; return; }
    snprintf(C[nc].key, sizeof C[nc].key, "%s", key); C[nc].zone = zone; C[nc].a = a; C[nc++].exp = exp;
}

//#viz ch07_resolve
/* Връща адреса или NULL (NXDOMAIN). *q = брой заявки към сървъри. */
const char *resolve(const char *name, int now, int *q)
{
    *q = 0;
    char key[64];
    snprintf(key, sizeof key, "A %s", name);
    Cache *c = cget(key, now);                               //@cache
    if (c) return c->a;                                      //@hit
    int z = 0;                                               /* най-близкото кеширано насочване */
    for (int i = NZ - 1; i > 0; i--) {
        snprintf(key, sizeof key, "NS %s", Z[i].zone);
        if (in_zone(name, Z[i].zone) && cget(key, now)) { z = i; break; }   //@closest
    }
    for (;;) {
        (*q)++;                                              //@ask
        for (int r = 0; r < NR; r++)                         /* сървърът на зона z */
            if (strcmp(R[r].name, name) == 0 && in_zone(name, Z[z].zone)
                && Z[z].parent > 0) {      /* A записите са в листовите зони */
                snprintf(key, sizeof key, "A %s", name);
                cput(key, z, R[r].a, now + R[r].ttl);        //@answer
                return R[r].a;                               //@answer
            }
        int child = -1;
        for (int i = 1; i < NZ; i++)
            if (Z[i].parent == z && in_zone(name, Z[i].zone)) child = i;   //@child
        if (child < 0) return NULL;                          //@nx
        snprintf(key, sizeof key, "NS %s", Z[child].zone);
        cput(key, child, NULL, now + NS_TTL[child]);         //@referral
        z = child;                                           //@referral
    }
}
//#end

static void hex(const char *nm, const uint8_t *b, int n)
{
    printf("%s =", nm);
    for (int i = 0; i < n; i++) printf(" %02X", b[i]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    uint8_t b[256];
    const char *names[] = { "www.example.org", "example.org", "a.b.example.com" };
    for (int i = 0; i < 3; i++) {
        char nm[64]; int n = encode_qname(names[i], b);
        snprintf(nm, sizeof nm, "qname(%s)", names[i]); hex(nm, b, n);
    }
    /* последователност от заявки във времето (секунди) */
    const char *qn[] = { "www.example.org", "www.example.org", "api.example.org", "www.example.com", "nope.example.org", "api.example.org", "www.example.org", "www.example.org" };
    const int   qt[] = { 0, 10, 20, 30, 40, 100, 290, 400 };
    for (int i = 0; i < 8; i++) {
        int q; const char *a = resolve(qn[i], qt[i], &q);
        printf("dns(%s@%d) = %s q=%d\n", qn[i], qt[i], a ? a : "NXDOMAIN", q);
    }
    return 0;
}
#endif
