/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_bfs": {
  "file": "01_topology.c",
  "code": "/* Свързани компоненти чрез обхождане в ширина (BFS).\n   down[v] = 1, ако възел v е повреден. comp[v] = номер на компонента. */\nint components(int n, const int down[], int comp[])\n{\n    int queue[MAXN], ncomp = 0;\n    for (int v = 0; v < n; v++) comp[v] = -1;\n    for (int s = 0; s < n; s++) {\n        if (comp[s] != -1 || down[s]) continue;\n        int head = 0, tail = 0;\n        queue[tail++] = s;\n        comp[s] = ncomp;\n        while (head < tail) {\n            int u = queue[head++];\n            for (int v = 0; v < n; v++) {\n                if (!adj[u][v]) continue;             /* няма (или прекъсната) връзка */\n                if (down[v] || comp[v] != -1)\n                    continue;\n                comp[v] = ncomp;\n                queue[tail++] = v;\n            }\n        }\n        ncomp++;\n    }\n    return ncomp;\n}",
  "tags": {
   "newcomp": [
    10,
    11
   ],
   "pop": [
    13
   ],
   "edge": [
    16
   ],
   "skip": [
    17
   ],
   "visit": [
    18,
    19
   ],
   "done": [
    22
   ]
  }
 },
 "ch02_repr": {
  "file": "02_layers.c",
  "code": "/* Записва v в buf по избрания формат; връща броя байтове. */\nenum { TEXT, BE16, LE16 };\nint encode(uint16_t v, int fmt, uint8_t buf[8])\n{\n    int n = 0;\n    if (fmt == TEXT) {                         /* десетичен текст, ASCII ⊂ UTF-8 */\n        char tmp[8];\n        int len = snprintf(tmp, sizeof tmp, \"%u\", (unsigned)v);\n        for (int i = 0; i < len; i++)\n            buf[n++] = (uint8_t)tmp[i];\n    } else if (fmt == BE16) {\n        buf[n++] = (uint8_t)(v >> 8);\n        buf[n++] = (uint8_t)(v & 0xFF);\n    } else {\n        buf[n++] = (uint8_t)(v & 0xFF);\n        buf[n++] = (uint8_t)(v >> 8);\n    }\n    return n;\n}\n\n/* Получателят тълкува 2 байта като 16-битово число в СВОЯ формат. */\nuint16_t decode16(const uint8_t b[2], int fmt)\n{\n    if (fmt == BE16) return (uint16_t)(b[0] << 8 | b[1]);\n    return (uint16_t)(b[1] << 8 | b[0]);\n}",
  "tags": {
   "text": [
    8
   ],
   "textbyte": [
    10
   ],
   "hi": [
    12,
    16
   ],
   "lo": [
    13,
    15
   ],
   "ret": [
    18
   ],
   "decbe": [
    24
   ],
   "decle": [
    25
   ]
  }
 },
 "ch03_csum": {
  "file": "03_encap.c",
  "code": "/* Интернет контролна сума (RFC 1071): допълнение до единица\n   на сумата в допълнение до единица на 16-битовите думи. */\nuint16_t inet_checksum(const uint8_t *b, int n, uint32_t sum)\n{\n    for (int i = 0; i + 1 < n; i += 2) {\n        sum += (uint32_t)(b[i] << 8 | b[i + 1]);\n        sum = (sum & 0xFFFF) + (sum >> 16);\n    }\n    if (n & 1) {                                    /* нечетен брой: допълва се с 0 */\n        sum += (uint32_t)(b[n - 1] << 8);\n        sum = (sum & 0xFFFF) + (sum >> 16);\n    }\n    return (uint16_t)~sum;\n}",
  "tags": {
   "add": [
    6,
    10
   ],
   "fold": [
    7,
    11
   ],
   "not": [
    13
   ]
  }
 },
 "ch03_encap": {
  "file": "03_encap.c",
  "code": "/* Строи кадъра отвътре навън. Връща дължината с FCS. */\nint encapsulate(const Params *p, const char *http, uint8_t f[MAXF])\n{\n    int alen = (int)strlen(http);\n    uint8_t *eth = f, *ip = f + 14, *tcp = ip + 20, *app = tcp + 20;\n    memcpy(app, http, (size_t)alen);\n\n    /* TCP заглавие, 20 байта */\n    put16(tcp, p->sport); put16(tcp + 2, p->dport);\n    put32(tcp + 4, p->seq); put32(tcp + 8, p->ack);\n    tcp[12] = 5 << 4;              /* data offset = 5 думи */\n    tcp[13] = 0x18;                /* флагове PSH + ACK */\n    put16(tcp + 14, 64240);        /* прозорец */\n    put16(tcp + 16, 0); put16(tcp + 18, 0);\n    /* контролна сума върху псевдо-заглавие + сегмент */\n    int tlen = 20 + alen;\n    uint32_t ps = (uint32_t)(p->sip[0] << 8 | p->sip[1]) + (uint32_t)(p->sip[2] << 8 | p->sip[3])\n                + (uint32_t)(p->dip[0] << 8 | p->dip[1]) + (uint32_t)(p->dip[2] << 8 | p->dip[3])\n                + 6u + (uint32_t)tlen;\n    put16(tcp + 16, inet_checksum(tcp, tlen, ps));\n\n    /* IPv4 заглавие, 20 байта */\n    ip[0] = 0x45;                  /* версия 4, IHL 5 */\n    ip[1] = 0;\n    put16(ip + 2, (uint16_t)(20 + tlen));  /* обща дължина */\n    put16(ip + 4, p->ipid);\n    put16(ip + 6, 0x4000);         /* DF, отместване 0 */\n    ip[8] = p->ttl;\n    ip[9] = 6;                     /* протокол: TCP */\n    put16(ip + 10, 0);\n    memcpy(ip + 12, p->sip, 4); memcpy(ip + 16, p->dip, 4);\n    put16(ip + 10, inet_checksum(ip, 20, 0));\n\n    /* Ethernet II: получател = MAC на ШЛЮЗА, не на сървъра */\n    memcpy(eth, p->gmac, 6); memcpy(eth + 6, p->cmac, 6);\n    put16(eth + 12, 0x0800);       /* EtherType: IPv4 */\n    int len = 14 + 20 + tlen;\n    while (len < 60) f[len++] = 0; /* минимален кадър: допълване */\n    uint32_t fcs = crc32(f, len);\n    for (int k = 0; k < 4; k++) f[len++] = (uint8_t)(fcs >> (8 * k));\n    return len;\n}",
  "tags": {
   "app": [
    6
   ],
   "tcp": [
    9,
    10,
    11,
    12,
    13,
    14
   ],
   "tcsum": [
    19,
    20
   ],
   "ip": [
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31
   ],
   "icsum": [
    32
   ],
   "eth": [
    35,
    36
   ],
   "pad": [
    38
   ],
   "fcs": [
    39,
    40
   ],
   "ret": [
    41
   ]
  }
 },
 "ch03_hop": {
  "file": "03_encap.c",
  "code": "/* Маршрутизатор: приема кадъра, препраща IP пакета в НОВ кадър.\n   Връща новата дължина или -1, ако пакетът се отхвърля (TTL). */\nint forward(uint8_t f[MAXF], int len, const uint8_t out_mac[6], const uint8_t next_mac[6])\n{\n    if (crc32(f, len - 4) != (uint32_t)(f[len - 4] | f[len - 3] << 8 | f[len - 2] << 16 | (uint32_t)f[len - 1] << 24))\n        return -1;\n    uint8_t *ip = f + 14;\n    if (inet_checksum(ip, 20, 0) != 0) return -1;\n    if (ip[8] <= 1) return -1;     /* TTL изтича: отхвърля (и ICMP) */\n    ip[8]--;\n    put16(ip + 10, 0);\n    put16(ip + 10, inet_checksum(ip, 20, 0));\n    memcpy(f, next_mac, 6); memcpy(f + 6, out_mac, 6);\n    len -= 4;\n    uint32_t fcs = crc32(f, len);\n    for (int k = 0; k < 4; k++) f[len++] = (uint8_t)(fcs >> (8 * k));\n    return len;\n}",
  "tags": {
   "chkfcs": [
    6
   ],
   "chkip": [
    8
   ],
   "ttl": [
    9
   ],
   "dec": [
    10
   ],
   "recsum": [
    11,
    12
   ],
   "mac": [
    13
   ],
   "fcs": [
    15,
    16
   ],
   "ret": [
    17
   ]
  }
 },
 "ch04_switch": {
  "file": "04_lan.c",
  "code": "/* Обработва един кадър (src, dst) пристигнал на порт in.\n   out[p] = 1 за изходните портове. Връща броя изходни портове. */\nint switch_frame(const char *src, const char *dst, int in, int nports, int out[NPORT])\n{\n    int k;\n    for (k = 0; k < ntab; k++)                      /* обучение: търсим src */\n        if (strcmp(tab[k].mac, src) == 0) break;\n    if (k == ntab && ntab < TABSZ) {\n        strcpy(tab[ntab].mac, src);\n        tab[ntab++].port = in;\n    } else if (k < ntab && tab[k].port != in) {\n        tab[k].port = in;\n    }\n    memset(out, 0, sizeof(int) * NPORT);\n    if (strcmp(dst, \"FF\") != 0)                      /* FF = broadcast */\n        for (k = 0; k < ntab; k++)\n            if (strcmp(tab[k].mac, dst) == 0) {\n                if (tab[k].port == in) return 0;\n                out[tab[k].port] = 1;\n                return 1;\n            }\n    int n = 0;\n    for (int p = 0; p < nports; p++)                 /* непознат или broadcast */\n        if (p != in) { out[p] = 1; n++; }\n    return n;\n}",
  "tags": {
   "lookup_src": [
    7
   ],
   "learn": [
    9,
    10
   ],
   "move": [
    12
   ],
   "lookup_dst": [
    17
   ],
   "filter": [
    18
   ],
   "forward": [
    19,
    20
   ],
   "flood": [
    24,
    25
   ]
  }
 },
 "ch04_arp": {
  "file": "04_lan.c",
  "code": "/* Към кой IPv4 адрес хостът търси MAC чрез ARP? */\nuint32_t next_hop(uint32_t me, int prefix, uint32_t dst, uint32_t gw)\n{\n    uint32_t mask = prefix ? 0xFFFFFFFFu << (32 - prefix) : 0;\n    if ((me & mask) == (dst & mask))\n        return dst;       /* локален: ARP за самата цел */\n    return gw;            /* отдалечен: ARP за шлюза */\n}",
  "tags": {
   "mask": [
    4
   ],
   "cmp": [
    5
   ],
   "local": [
    6
   ],
   "remote": [
    7
   ]
  }
 },
 "ch04_crc": {
  "file": "04_lan.c",
  "code": "/* CRC-32 на Ethernet (IEEE 802.3), побитово, отразен полином 0xEDB88320. */\nuint32_t crc32_bitwise(const uint8_t *b, int n)\n{\n    uint32_t c = 0xFFFFFFFFu;\n    for (int i = 0; i < n; i++) {\n        c ^= b[i];\n        for (int k = 0; k < 8; k++) {\n            if (c & 1)\n                c = (c >> 1) ^ 0xEDB88320u;\n            else\n                c >>= 1;\n        }\n    }\n    return ~c;\n}",
  "tags": {
   "init": [
    4
   ],
   "xor": [
    6
   ],
   "bit": [
    8
   ],
   "poly": [
    9
   ],
   "shift": [
    11
   ],
   "final": [
    14
   ]
  }
 },
 "ch05_subnet": {
  "file": "05_ip.c",
  "code": "Subnet subnet(uint32_t addr, int prefix)\n{\n    Subnet s;\n    s.mask  = prefix ? 0xFFFFFFFFu << (32 - prefix) : 0;\n    s.net   = addr & s.mask;\n    s.bcast = s.net | ~s.mask;\n    s.size  = (uint64_t)1 << (32 - prefix);   /* 2^(брой хостови битове) */\n    if (prefix >= 31) {          /* /31: две адреси за връзка точка–точка; /32: един хост */\n        s.first = s.net; s.last = s.bcast;\n        s.hosts = prefix == 31 ? 2 : 1;\n    } else {\n        s.first = s.net + 1;\n        s.last  = s.bcast - 1;\n        s.hosts = s.size - 2;    /* без адреса на мрежата и broadcast */\n    }\n    return s;\n}",
  "tags": {
   "mask": [
    4
   ],
   "net": [
    5
   ],
   "bcast": [
    6
   ],
   "size": [
    7
   ],
   "special": [
    9,
    10
   ],
   "hosts": [
    12,
    13,
    14
   ],
   "ret": [
    16
   ]
  }
 },
 "ch05_lpm": {
  "file": "05_ip.c",
  "code": "/* Връща индекса на маршрута с НАЙ-ДЪЛЪГ съвпадащ префикс или -1. */\nint lookup(const Route *rt, int n, uint32_t dst)\n{\n    int best = -1;\n    for (int i = 0; i < n; i++) {\n        uint32_t m = rt[i].len ? 0xFFFFFFFFu << (32 - rt[i].len) : 0;\n        if ((dst & m) != rt[i].pfx) continue;\n        if (best < 0 || rt[i].len > rt[best].len)\n            best = i;\n    }\n    return best;\n}",
  "tags": {
   "mask": [
    6
   ],
   "cmp": [
    7
   ],
   "match": [
    8
   ],
   "best": [
    9
   ],
   "ret": [
    11
   ]
  }
 },
 "ch05_nat": {
  "file": "05_ip.c",
  "code": "/* Изходящ пакет от частен адрес: връща публичния порт (създава запис при нужда). */\nuint16_t nat_out(uint32_t src, uint16_t sport)\n{\n    for (int i = 0; i < nnat; i++)\n        if (nat[i].in_ip == src && nat[i].in_port == sport)\n            return nat[i].out_port;\n    nat[nnat].in_ip = src; nat[nnat].in_port = sport;\n    nat[nnat].out_port = next_port++;\n    return nat[nnat++].out_port;\n}\n/* Входящ пакет към публичния адрес: намира вътрешния получател или 0 (отхвърля). */\nint nat_in(uint16_t dport, uint32_t *ip, uint16_t *port)\n{\n    for (int i = 0; i < nnat; i++)\n        if (nat[i].out_port == dport) {\n            *ip = nat[i].in_ip; *port = nat[i].in_port;\n            return 1;\n        }\n    return 0;          /* няма запис: няма към кого да се преведе */\n}",
  "tags": {
   "find": [
    5
   ],
   "hit": [
    6
   ],
   "new": [
    7,
    8,
    9
   ],
   "rfind": [
    15
   ],
   "rhit": [
    16,
    17
   ],
   "rmiss": [
    19
   ]
  }
 },
 "ch06_tcp": {
  "file": "06_transport.c",
  "code": "/* x, y — начални номера (ISN) на клиента и сървъра; n — байтове данни. */\nvoid tcp_session(uint32_t x, uint32_t y, int n, int listening)\n{\n    cs = CLOSED; ss = listening ? LISTEN : CLOSED;\n    cs = SYN_SENT;              seg(\"C>S\", \"SYN\", x, 0, 0);\n    if (!listening) {           /* няма слушащ сокет на този порт */\n        cs = CLOSED;            seg(\"S>C\", \"RST+ACK\", 0, x + 1, 0);\n        return;\n    }\n    ss = SYN_RCVD;              seg(\"S>C\", \"SYN+ACK\", y, x + 1, 0);\n    cs = ESTABLISHED;           seg(\"C>S\", \"ACK\", x + 1, y + 1, 0);\n    ss = ESTABLISHED;\n    if (n > 0) {\n        seg(\"C>S\", \"PSH+ACK\", x + 1, y + 1, n);\n        seg(\"S>C\", \"ACK\", y + 1, x + 1 + (uint32_t)n, 0);\n    }\n    uint32_t cf = x + 1 + (uint32_t)n;  /* FIN заема една позиция */\n    cs = FIN_WAIT_1;            seg(\"C>S\", \"FIN+ACK\", cf, y + 1, 0);\n    ss = CLOSE_WAIT;            seg(\"S>C\", \"ACK\", y + 1, cf + 1, 0);\n    cs = FIN_WAIT_2;\n    ss = LAST_ACK;              seg(\"S>C\", \"FIN+ACK\", y + 1, cf + 1, 0);\n    cs = TIME_WAIT;             seg(\"C>S\", \"ACK\", cf + 1, y + 2, 0);\n    ss = CLOSED;\n}",
  "tags": {
   "init": [
    4
   ],
   "syn": [
    5
   ],
   "rst": [
    7
   ],
   "synack": [
    10
   ],
   "ack3": [
    11
   ],
   "est": [
    12
   ],
   "data": [
    14
   ],
   "dack": [
    15
   ],
   "fin1": [
    18
   ],
   "finack1": [
    19
   ],
   "fw2": [
    20
   ],
   "fin2": [
    21
   ],
   "finack2": [
    22
   ],
   "closed": [
    23
   ]
  }
 },
 "ch06_frame": {
  "file": "06_transport.c",
  "code": "/* Подава поредната порция байтове от потока; печата всяко цяло съобщение. */\nint feed(const uint8_t *chunk, int n, char out[][64], int *nout)\n{\n    memcpy(rbuf + rlen, chunk, (size_t)n);\n    rlen += n;\n    int used = 0;\n    while (rlen - used >= 1) {\n        int L = rbuf[used];\n        if (rlen - used - 1 < L) break;\n        memcpy(out[*nout], rbuf + used + 1, (size_t)L);\n        out[(*nout)++][L] = 0;\n        used += 1 + L;\n    }\n    memmove(rbuf, rbuf + used, (size_t)(rlen - used));\n    rlen -= used;\n    return rlen;      /* непълно съобщение, чакащо още байтове */\n}",
  "tags": {
   "append": [
    4,
    5
   ],
   "len": [
    8
   ],
   "wait": [
    9
   ],
   "msg": [
    10,
    11,
    12
   ],
   "shift": [
    14,
    15
   ]
  }
 },
 "ch06_arq": {
  "file": "06_transport.c",
  "code": "/* Модел по рундове: в един рунд (≈ 1 RTT) изпращачът праща целия прозорец\n   [base, base+W), после получава кумулативното потвърждение exp.\n   lost[s] = 1: първото предаване на сегмент s се губи.\n   sr = 0 — Go-Back-N: получателят приема само по ред, изпращачът\n            преизпраща всичко от base;\n   sr = 1 — Selective Repeat: получателят буферира в прозореца,\n            изпращачът преизпраща само липсващите. Връща броя предавания. */\nstatic int timeouts;\nint arq(int N, int W, const int lost[], int sr)\n{\n    int base = 0, exp = 0, tx = 0, got[64] = {0}, sent[64] = {0};\n    timeouts = 0;\n    while (base < N) {\n        int end = base + W < N ? base + W : N;\n        for (int s = base; s < end; s++) {\n            if (sr && got[s]) continue;            /* SR: вече приет */\n            tx++;\n            if (lost[s] && !sent[s]++) continue;\n            if (s == exp || (sr && s < exp + W))\n                got[s] = 1;\n            else\n                continue;  /* GBN: извън ред — изхвърля */\n            while (exp < N && got[exp]) exp++;\n        }\n        if (exp < end) timeouts++;  /* липсва сегмент: изтича таймерът */\n        base = exp;        /* кумулативно ACK плъзга прозореца */\n    }\n    return tx;\n}",
  "tags": {
   "send": [
    17
   ],
   "lost": [
    18
   ],
   "accept": [
    20
   ],
   "discard": [
    22
   ],
   "advance": [
    23
   ],
   "timeout": [
    25
   ],
   "slide": [
    26
   ],
   "done": [
    28
   ]
  }
 },
 "ch07_qname": {
  "file": "07_dns.c",
  "code": "/* \"www.example.org\" -> 03 'w' 'w' 'w' 07 'e' ... 03 'o' 'r' 'g' 00 */\nint encode_qname(const char *name, uint8_t *out)\n{\n    int n = 0;\n    while (*name) {\n        const char *dot = strchr(name, '.');\n        int len = dot ? (int)(dot - name) : (int)strlen(name);\n        out[n++] = (uint8_t)len;\n        memcpy(out + n, name, (size_t)len);\n        n += len;\n        name += len + (dot ? 1 : 0);\n    }\n    out[n++] = 0;          /* коренът: етикет с дължина 0 */\n    return n;\n}",
  "tags": {
   "label": [
    7
   ],
   "lenbyte": [
    8
   ],
   "copy": [
    9,
    10
   ],
   "next": [
    11
   ],
   "root": [
    13
   ],
   "ret": [
    14
   ]
  }
 },
 "ch07_resolve": {
  "file": "07_dns.c",
  "code": "/* Връща адреса или NULL (NXDOMAIN). *q = брой заявки към сървъри. */\nconst char *resolve(const char *name, int now, int *q)\n{\n    *q = 0;\n    char key[64];\n    snprintf(key, sizeof key, \"A %s\", name);\n    Cache *c = cget(key, now);\n    if (c) return c->a;\n    int z = 0;                                               /* най-близкото кеширано насочване */\n    for (int i = NZ - 1; i > 0; i--) {\n        snprintf(key, sizeof key, \"NS %s\", Z[i].zone);\n        if (in_zone(name, Z[i].zone) && cget(key, now)) { z = i; break; }\n    }\n    for (;;) {\n        (*q)++;\n        for (int r = 0; r < NR; r++)                         /* сървърът на зона z */\n            if (strcmp(R[r].name, name) == 0 && in_zone(name, Z[z].zone)\n                && Z[z].parent > 0) {      /* A записите са в листовите зони */\n                snprintf(key, sizeof key, \"A %s\", name);\n                cput(key, z, R[r].a, now + R[r].ttl);\n                return R[r].a;\n            }\n        int child = -1;\n        for (int i = 1; i < NZ; i++)\n            if (Z[i].parent == z && in_zone(name, Z[i].zone)) child = i;\n        if (child < 0) return NULL;\n        snprintf(key, sizeof key, \"NS %s\", Z[child].zone);\n        cput(key, child, NULL, now + NS_TTL[child]);\n        z = child;\n    }\n}",
  "tags": {
   "cache": [
    7
   ],
   "hit": [
    8
   ],
   "closest": [
    12
   ],
   "ask": [
    15
   ],
   "answer": [
    20,
    21
   ],
   "child": [
    25
   ],
   "nx": [
    26
   ],
   "referral": [
    28,
    29
   ]
  }
 },
 "ch08_url": {
  "file": "08_url.c",
  "code": "/* Връща 0 при успех, -1 при неподдържан или невалиден URL. */\nint parse_url(const char *u, Url *r)\n{\n    memset(r, 0, sizeof *r);\n    const char *p = strstr(u, \"://\");\n    if (!p) return -1;\n    cpy(r->scheme, sizeof r->scheme, u, (size_t)(p - u));\n    if (strcmp(r->scheme, \"http\") && strcmp(r->scheme, \"https\")) return -1;\n    p += 3;\n    size_t hl = strcspn(p, \":/?#\");\n    if (hl == 0) return -1;\n    cpy(r->host, sizeof r->host, p, hl);\n    p += hl;\n    r->port = strcmp(r->scheme, \"https\") == 0 ? 443 : 80;\n    if (*p == ':') {\n        int v = 0, d = 0;\n        for (p++; *p >= '0' && *p <= '9' && d < 6; p++, d++) v = v * 10 + (*p - '0');\n        if (d == 0 || v < 1 || v > 65535 || (*p >= '0' && *p <= '9')) return -1;\n        r->port = v;\n    }\n    size_t pl = strcspn(p, \"?#\");\n    if (pl) cpy(r->path, sizeof r->path, p, pl); else strcpy(r->path, \"/\");\n    p += pl;\n    if (*p == '?') { size_t ql = strcspn(++p, \"#\"); cpy(r->query, sizeof r->query, p, ql); p += ql; }\n    if (*p == '#') cpy(r->frag, sizeof r->frag, p + 1, strlen(p + 1));\n    return 0;\n}",
  "tags": {
   "scheme": [
    6,
    7
   ],
   "host": [
    10,
    12
   ],
   "defport": [
    14
   ],
   "port": [
    17,
    19
   ],
   "path": [
    21,
    22
   ],
   "query": [
    24
   ],
   "frag": [
    25
   ],
   "ret": [
    26
   ]
  }
 },
 "ch09_delay": {
  "file": "09_delay.c",
  "code": "typedef struct { double tx, prop, rtt, bdp, eff, util; } Est;\n\n/* L — байтове в пакета, R — bit/s, d — метри, v — m/s,\n   W — байтове, които могат да са изпратени без потвърждение. */\nEst estimate(double L, double R, double d, double v, double W)\n{\n    Est e;\n    e.tx   = L * 8 / R;                    /* време за предаване L/R */\n    e.prop = d / v;                        /* време за разпространение */\n    e.rtt  = 2 * e.prop + e.tx;            /* RTT за пакет + кратко потвърждение */\n    e.bdp  = R * e.rtt / 8;                /* байтове „в движение“ при пълен канал */\n    double per_rtt = W * 8 / e.rtt;        /* най-много W байта на един RTT */\n    e.eff  = per_rtt < R ? per_rtt : R;    /* не повече от капацитета */\n    e.util = e.eff / R;\n    return e;\n}",
  "tags": {
   "tx": [
    8
   ],
   "prop": [
    9
   ],
   "rtt": [
    10
   ],
   "bdp": [
    11
   ],
   "eff": [
    12,
    13
   ],
   "util": [
    14
   ],
   "ret": [
    15
   ]
  }
 },
 "ch10_can": {
  "file": "10_industrial.c",
  "code": "/* ids[] — 11-битови идентификатори; връща индекса на победителя. */\nint can_arbitrate(const uint16_t ids[], int n, int lost_at[])\n{\n    int active[16];\n    for (int i = 0; i < n; i++) { active[i] = 1; lost_at[i] = -1; }\n    for (int b = 10; b >= 0; b--) {                     /* старшият бит първи */\n        int bus = 1;                                    /* рецесивно, ако никой не дърпа */\n        for (int i = 0; i < n; i++)\n            if (active[i] && !((ids[i] >> b) & 1))\n                bus = 0;\n        for (int i = 0; i < n; i++)\n            if (active[i] && ((ids[i] >> b) & 1) && bus == 0) {\n                active[i] = 0;\n                lost_at[i] = 10 - b;\n            }\n    }\n    for (int i = 0; i < n; i++) if (active[i]) return i;\n    return -1;\n}",
  "tags": {
   "bus": [
    10
   ],
   "lose": [
    13,
    14
   ],
   "win": [
    17
   ]
  }
 },
 "ch10_crc16": {
  "file": "10_industrial.c",
  "code": "/* Modbus RTU CRC-16: начало FFFF, отразен полином 0xA001.\n   В кадъра се записва младшият байт първо. */\nuint16_t modbus_crc(const uint8_t *b, int n)\n{\n    uint16_t crc = 0xFFFF;\n    for (int i = 0; i < n; i++) {\n        crc ^= b[i];\n        for (int k = 0; k < 8; k++) {\n            if (crc & 1)\n                crc = (uint16_t)((crc >> 1) ^ 0xA001);\n            else\n                crc >>= 1;\n        }\n    }\n    return crc;\n}",
  "tags": {
   "init": [
    5
   ],
   "xor": [
    7
   ],
   "bit": [
    9
   ],
   "poly": [
    10
   ],
   "shift": [
    12
   ],
   "ret": [
    15
   ]
  }
 },
 "ch10_modbus": {
  "file": "10_industrial.c",
  "code": "/* Четене на count holding registers от адрес addr на устройство unit. */\nint rtu_read(uint8_t unit, uint16_t addr, uint16_t count, uint8_t out[8])\n{\n    out[0] = unit;\n    out[1] = 0x03;                 /* function 03 */\n    out[2] = (uint8_t)(addr >> 8);  out[3] = (uint8_t)addr;\n    out[4] = (uint8_t)(count >> 8); out[5] = (uint8_t)count;\n    uint16_t c = modbus_crc(out, 6);\n    out[6] = (uint8_t)c; out[7] = (uint8_t)(c >> 8);    /* младши първо */\n    return 8;\n}\nint tcp_read(uint16_t tid, uint8_t unit, uint16_t addr, uint16_t count, uint8_t out[12])\n{\n    out[0] = (uint8_t)(tid >> 8); out[1] = (uint8_t)tid;   /* transaction id */\n    out[2] = 0; out[3] = 0;        /* protocol id = 0 */\n    out[4] = 0; out[5] = 6;        /* length: unit + 5 байта PDU */\n    out[6] = unit;\n    out[7] = 0x03;\n    out[8] = (uint8_t)(addr >> 8);  out[9] = (uint8_t)addr;\n    out[10] = (uint8_t)(count >> 8); out[11] = (uint8_t)count;\n    return 12;                     /* без CRC: целостта е от TCP/Ethernet */\n}",
  "tags": {
   "addr": [
    4
   ],
   "pdu": [
    5,
    6,
    7,
    18,
    19,
    20
   ],
   "crc": [
    8,
    9
   ],
   "mbap": [
    14,
    15,
    16,
    17
   ],
   "nocrc": [
    21
   ]
  }
 },
 "ch11_gatt": {
  "file": "11_ble.c",
  "code": "/* Връща процента или -1, ако стойността е извън допустимото. */\nint battery_level(const uint8_t *v, int n)\n{\n    if (n != 1) return -1;\n    if (v[0] > 100) return -1;   /* 101..255 са запазени */\n    return v[0];\n}\n\n/* Десети от градуса; договор на учебния датчик, не общ Bluetooth формат. */\nint temp_decitenths(const uint8_t *v, int n)\n{\n    if (n != 2) return -1;\n    return v[0] | v[1] << 8;     /* little-endian */\n}\n\n/* Шлюзът създава НОВ приложен запис — не пренася байтовете прозрачно. */\nint to_json(int deci, char *out, int cap)\n{\n    return snprintf(out, (size_t)cap, \"{\\\"temperature_c\\\":%d.%d}\", deci / 10, deci % 10);\n}",
  "tags": {
   "blen": [
    4
   ],
   "brange": [
    5
   ],
   "bret": [
    6
   ],
   "tlen": [
    12
   ],
   "tle": [
    13
   ],
   "json": [
    19
   ]
  }
 }
};
