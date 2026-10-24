/* Тема 11, раздел 8 — разбор на URL: кое парче на кое равнище отива.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 08_url.c -o 08_url && ./08_url
 *
 * Учебен разбор на абсолютен http/https URL без потребител/парола и без IPv6 литерал.
 * DNS получава само host; транспортът — порта; HTTP заявката — пътя и query.
 * Фрагментът (#…) не се изпраща към сървъра.
 */
#include <stdio.h>
#include <string.h>

typedef struct { char scheme[8], host[64], path[128], query[128], frag[64]; int port; } Url;

static void cpy(char *d, size_t cap, const char *s, size_t n) { if (n >= cap) n = cap - 1; memcpy(d, s, n); d[n] = 0; }

//#viz ch08_url
/* Връща 0 при успех, -1 при неподдържан или невалиден URL. */
int parse_url(const char *u, Url *r)
{
    memset(r, 0, sizeof *r);
    const char *p = strstr(u, "://");
    if (!p) return -1;                                       //@scheme
    cpy(r->scheme, sizeof r->scheme, u, (size_t)(p - u));    //@scheme
    if (strcmp(r->scheme, "http") && strcmp(r->scheme, "https")) return -1;
    p += 3;
    size_t hl = strcspn(p, ":/?#");                          //@host
    if (hl == 0) return -1;
    cpy(r->host, sizeof r->host, p, hl);                     //@host
    p += hl;
    r->port = strcmp(r->scheme, "https") == 0 ? 443 : 80;   //@defport
    if (*p == ':') {
        int v = 0, d = 0;
        for (p++; *p >= '0' && *p <= '9' && d < 6; p++, d++) v = v * 10 + (*p - '0');   //@port
        if (d == 0 || v < 1 || v > 65535 || (*p >= '0' && *p <= '9')) return -1;
        r->port = v;                                         //@port
    }
    size_t pl = strcspn(p, "?#");                            //@path
    if (pl) cpy(r->path, sizeof r->path, p, pl); else strcpy(r->path, "/");   //@path
    p += pl;
    if (*p == '?') { size_t ql = strcspn(++p, "#"); cpy(r->query, sizeof r->query, p, ql); p += ql; }   //@query
    if (*p == '#') cpy(r->frag, sizeof r->frag, p + 1, strlen(p + 1));        //@frag
    return 0;                                                //@ret
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const char *t[] = { "https://example.org/course?id=5", "http://example.org:8080/a/b#top", "https://api.example.org", "ftp://example.org/x", "https://example.org:99999/" };
    for (int i = 0; i < 5; i++) {
        Url r;
        if (parse_url(t[i], &r) == 0)
            printf("url(%s) = %s|%s|%d|%s|%s|%s\n", t[i], r.scheme, r.host, r.port, r.path, r.query, r.frag);
        else
            printf("url(%s) = ERR\n", t[i]);
    }
    return 0;
}
#endif
