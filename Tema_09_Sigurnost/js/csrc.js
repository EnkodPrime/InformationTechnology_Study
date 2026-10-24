/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_access": {
  "file": "01_access.c",
  "code": "typedef struct { const char *user, *obj, *op; } Acl;\n\nstatic const char *USERS[] = { \"alice\", \"bob\", \"admin\" };\nstatic const Acl ACL[] = {               /* кой какво може върху кой обект */\n    { \"alice\", \"syllabus\", \"read\"  },\n    { \"alice\", \"grades\",   \"read\"  },\n    { \"bob\",   \"syllabus\", \"read\"  },\n    { \"bob\",   \"grades\",   \"read\"  },\n    { \"bob\",   \"grades\",   \"write\" },\n    { \"admin\", \"syllabus\", \"write\" },\n};\n#define NUSERS (int)(sizeof USERS / sizeof USERS[0])\n#define NACL   (int)(sizeof ACL / sizeof ACL[0])\n\ntypedef struct { const char *user, *op, *obj; int result; } LogRec;\nstatic LogRec g_log[32];\nstatic int g_nlog;\n\nstatic void audit(const char *u, const char *op, const char *obj, int r)\n{\n    if (g_nlog < 32) g_log[g_nlog++] = (LogRec){ u, op, obj, r };\n}\n\n/* server_checks = 0 моделира грешката „проверка само в интерфейса“ */\nint check_access(const char *user, int password_ok,\n                 const char *op, const char *obj, int server_checks)\n{\n    int known = 0;\n    for (int i = 0; i < NUSERS; i++)\n        if (strcmp(USERS[i], user) == 0) known = 1;\n    if (!known) { audit(user, op, obj, R_UNKNOWN); return R_UNKNOWN; }\n\n    if (!password_ok) {\n        audit(user, op, obj, R_BADAUTH); return R_BADAUTH;\n    }\n    if (!server_checks) {\n        audit(user, op, obj, R_ALLOW); return R_ALLOW;\n    }\n    for (int i = 0; i < NACL; i++) {\n        g_cmp++;\n        if (strcmp(ACL[i].user, user) == 0 &&\n            strcmp(ACL[i].obj, obj) == 0 &&\n            strcmp(ACL[i].op, op) == 0) {\n            audit(user, op, obj, R_ALLOW); return R_ALLOW;\n        }\n    }\n    audit(user, op, obj, R_FORBIDDEN); return R_FORBIDDEN;\n}",
  "tags": {
   "log": [
    21
   ],
   "ident": [
    29
   ],
   "unknown": [
    31
   ],
   "authn": [
    33
   ],
   "badauth": [
    34
   ],
   "noauthz": [
    36
   ],
   "allow_blind": [
    37
   ],
   "authz": [
    39
   ],
   "cmp": [
    41
   ],
   "allow": [
    44
   ],
   "forbidden": [
    47
   ]
  }
 },
 "ch01_risk": {
  "file": "01_access.c",
  "code": "/* Един възможен модел: матрица 5×5 (вероятност × въздействие).\n   Скалата и праговете са пример, не универсален стандарт. */\nenum { P_C = 0, P_I = 1, P_A = 2 };           /* засегнато свойство */\nenum { M_MFA = 1, M_PATCH = 2, M_LEAST = 4, M_BACKUP = 8, M_ENCRYPT = 16 };\n\nstatic int dec(int v) { return v > 1 ? v - 1 : 1; }\n\nint risk_eval(int L, int I, int prop, int measures, int *outL, int *outI)\n{\n    if (measures & M_MFA)     L = dec(L);\n    if (measures & M_PATCH)   L = dec(L);\n    if (measures & M_LEAST)   I = dec(I);\n    if ((measures & M_BACKUP) && prop != P_C) I = dec(I);\n    if ((measures & M_ENCRYPT) && prop == P_C) I = dec(I);\n    *outL = L; *outI = I;\n    int score = L * I;\n    if (score <= 4)  return 0;   /* нисък */\n    if (score <= 9)  return 1;   /* среден */\n    if (score <= 16) return 2;   /* висок */\n    return 3;                    /* критичен */\n}",
  "tags": {
   "mfa": [
    10
   ],
   "patch": [
    11
   ],
   "least": [
    12
   ],
   "backup": [
    13
   ],
   "encrypt": [
    14
   ],
   "score": [
    16
   ],
   "level": [
    17
   ]
  }
 },
 "ch03_arp": {
  "file": "03_arp.c",
  "code": "#define CACHE 4\ntypedef struct { int ip, mac, is_static, used; } Entry;\nstatic Entry cache[CACHE];\n\n/* Таблица на комутатора с доверени двойки IP–MAC (при DAI) */\nstatic const int BIND_IP[]  = { 1, 20, 66 };\nstatic const int BIND_MAC[] = { 0x01, 0x20, 0x66 };\n\nstatic int binding_ok(int ip, int mac)\n{\n    for (int i = 0; i < 3; i++)\n        if (BIND_IP[i] == ip) return BIND_MAC[i] == mac;\n    return 0;\n}\n\nvoid arp_init(int mode)\n{\n    memset(cache, 0, sizeof cache);\n    if (mode == MODE_STATIC)\n        cache[0] = (Entry){ 1, 0x01, 1, 1 };  /* статичен запис за шлюза */\n}\n\nint arp_receive(int ip, int mac, int mode)\n{\n    if (mode == MODE_DAI && !binding_ok(ip, mac))\n        return ACC_DROP_DAI;     /* комутаторът не препраща отговора */\n    for (int i = 0; i < CACHE; i++) {\n        if (cache[i].used && cache[i].ip == ip) {\n            if (cache[i].is_static) return ACC_KEEP_STATIC;\n            if (cache[i].mac == mac) return ACC_SAME;\n            cache[i].mac = mac;  /* последният отговор печели */\n            return ACC_UPDATE;\n        }\n    }\n    for (int i = 0; i < CACHE; i++)\n        if (!cache[i].used) {\n            cache[i] = (Entry){ ip, mac, 0, 1 };\n            return ACC_NEW;\n        }\n    return ACC_SAME;   /* пълен кеш — моделът игнорира */\n}\n\n/* На кой MAC отива кадър към ip; -1 ако няма запис */\nint arp_resolve(int ip)\n{\n    for (int i = 0; i < CACHE; i++)\n        if (cache[i].used && cache[i].ip == ip) return cache[i].mac;\n    return -1;\n}",
  "tags": {
   "init": [
    19
   ],
   "dai": [
    25
   ],
   "find": [
    27
   ],
   "static": [
    29
   ],
   "overwrite": [
    31
   ],
   "insert": [
    37
   ],
   "resolve": [
    46
   ],
   "miss": [
    48
   ]
  }
 },
 "ch05_validate": {
  "file": "05_app.c",
  "code": "enum { V_OK = 0, V_EMPTY = 1, V_LONG = 2, V_CHAR = 3 };\n\n/* Списък от разрешени символи: латински букви, интервал, тире, апостроф.\n   Валидирането проверява очаквания формат; то НЕ замества параметризирането. */\nint validate_name(const char *s, int maxlen, int *bad_pos)\n{\n    int n = (int)strlen(s);\n    *bad_pos = -1;\n    if (n == 0) return V_EMPTY;\n    if (n > maxlen) return V_LONG;\n    for (int i = 0; i < n; i++) {\n        unsigned char c = (unsigned char)s[i];\n        int ok = isalpha(c) || c == ' ' || c == '-' || c == '\\'';\n        if (!ok) { *bad_pos = i; return V_CHAR; }\n    }\n    return V_OK;\n}\n\n/* Параметризиране: текстът на заявката е константа; стойността се подава отделно\n   и никога не се анализира като част от синтаксиса. */\ntypedef struct { const char *sql; const char *param; } Query;\n\nQuery bind_name(const char *value)\n{\n    Query q = { \"SELECT * FROM users WHERE name = ?\", value };\n    return q;\n}",
  "tags": {
   "empty": [
    9
   ],
   "long": [
    10
   ],
   "loop": [
    11
   ],
   "check": [
    13
   ],
   "reject": [
    14
   ],
   "accept": [
    16
   ],
   "bind": [
    25
   ]
  }
 },
 "ch05_tokens": {
  "file": "05_app.c",
  "code": "/* Брои лексемите на фиксирания SQL текст — показва, че структурата\n   не зависи от стойността на параметъра. */\nint count_tokens(const char *q)\n{\n    int n = 0, i = 0, len = (int)strlen(q);\n    while (i < len) {\n        if (q[i] == ' ') { i++; continue; }\n        if (isalnum((unsigned char)q[i]) || q[i] == '_' || q[i] == '*') {\n            while (i < len && (isalnum((unsigned char)q[i]) || q[i] == '_' || q[i] == '*')) i++;\n        } else i++;\n        n++;\n    }\n    return n;\n}",
  "tags": {
   "sp": [
    7
   ],
   "tok": [
    10
   ],
   "ret": [
    13
   ]
  }
 },
 "ch05_copy": {
  "file": "05_app.c",
  "code": "/* Копира в буфер с вместимост cap байта (вкл. завършващата нула).\n   Никога не пише извън буфера; връща -1, ако входът е бил отрязан. */\nint copy_checked(char *dst, int cap, const char *src)\n{\n    int i = 0;\n    if (cap <= 0) return -1;     /* няма място дори за нулата */\n    while (src[i] && i < cap - 1) {\n        dst[i] = src[i];\n        i++;\n    }\n    dst[i] = '\\0';\n    return src[i] ? -1 : i;   /* -1: входът е по-дълъг — съобщаваме */\n}",
  "tags": {
   "c_loop": [
    7
   ],
   "c_write": [
    8
   ],
   "c_term": [
    11
   ],
   "c_ret": [
    12
   ]
  }
 },
 "ch05_pw": {
  "file": "05_app.c",
  "code": "static const char *COMMON[] = { \"123456\", \"password\", \"qwerty\", \"111111\", \"letmein\", \"parola\", \"admin\" };\n\n/* Груб модел: битове = дължина * log2(размер на използваните класове).\n   Надценява паролите, избрани от хора — затова и списъкът с чести пароли. */\ndouble pw_bits(const char *p, int *pool_out)\n{\n    int lo = 0, up = 0, di = 0, ot = 0, len = (int)strlen(p);\n    for (int i = 0; i < (int)(sizeof COMMON / sizeof COMMON[0]); i++)\n        if (strcmp(p, COMMON[i]) == 0) { *pool_out = 0; return 0.0; }\n    for (int i = 0; i < len; i++) {\n        unsigned char c = (unsigned char)p[i];\n        if (islower(c)) lo = 1; else if (isupper(c)) up = 1;\n        else if (isdigit(c)) di = 1; else ot = 1;\n    }\n    int pool = 26 * lo + 26 * up + 10 * di + 33 * ot;\n    *pool_out = pool;\n    return pool ? len * log2((double)pool) : 0.0;\n}\n\n/* Учебен хеш FNV-1a 32 бита върху сол || парола — само за концепцията */\nuint32_t toy_hash(const char *salt, const char *pw)\n{\n    uint32_t h = 2166136261u;\n    for (const char *s = salt; *s; s++) { h ^= (unsigned char)*s; h *= 16777619u; }\n    for (const char *s = pw; *s; s++)   { h ^= (unsigned char)*s; h *= 16777619u; }\n    return h;\n}",
  "tags": {
   "common": [
    8
   ],
   "classes": [
    10
   ],
   "pool": [
    15
   ],
   "bits": [
    17
   ],
   "h_init": [
    23
   ],
   "h_salt": [
    24
   ],
   "h_pw": [
    25
   ],
   "h_ret": [
    26
   ]
  }
 },
 "ch07_fw": {
  "file": "07_defense.c",
  "code": "typedef struct { uint32_t addr; int prefix; } Net;\ntypedef struct { int action, proto; Net src; int dlo, dhi; } Rule;\ntypedef struct { int proto; uint32_t src; int dport; } Packet;\n\nstatic int in_net(uint32_t ip, Net n)\n{\n    uint32_t mask = n.prefix == 0 ? 0 : 0xFFFFFFFFu << (32 - n.prefix);\n    return (ip & mask) == (n.addr & mask);\n}\n\n/* Връща действието; *hit = номер на правилото или -1 за политиката по подразбиране */\nint fw_check(const Rule *r, int n, Packet p, int def, int *hit, int *cmp)\n{\n    for (int i = 0; i < n; i++) {\n        ++*cmp;\n        if (r[i].proto != PR_ANY && r[i].proto != p.proto) continue;\n        if (!in_net(p.src, r[i].src)) continue;\n        if (p.dport < r[i].dlo || p.dport > r[i].dhi) continue;\n        *hit = i;\n        return r[i].action;\n    }\n    *hit = -1;\n    return def;      /* нито едно правило не съвпада */\n}",
  "tags": {
   "rule": [
    14
   ],
   "proto": [
    16
   ],
   "src": [
    17
   ],
   "port": [
    18
   ],
   "match": [
    19
   ],
   "default": [
    23
   ]
  }
 },
 "ch07_ids": {
  "file": "07_defense.c",
  "code": "/* Сигнатури: търсим известни шаблони в съдържанието (подниз) */\nint ids_signature(const char *payload, const char *const sig[], int nsig)\n{\n    for (int i = 0; i < nsig; i++)\n        if (strstr(payload, sig[i])) return i;   /* сигнал */\n    return -1;\n}\n\n/* Аномалии: стойност над mean + k*std на обучителен период (едностранен праг) */\nint ids_anomaly(const double base[], int nb, double x, double k, double *thr)\n{\n    double m = 0, v = 0;\n    for (int i = 0; i < nb; i++) m += base[i];\n    m /= nb;\n    for (int i = 0; i < nb; i++) v += (base[i] - m) * (base[i] - m);\n    double sd = sqrt(v / nb);\n    *thr = m + k * sd;\n    return x > *thr;\n}",
  "tags": {
   "sig_loop": [
    4
   ],
   "sig_hit": [
    5
   ],
   "sig_none": [
    6
   ],
   "an_mean": [
    13
   ],
   "an_std": [
    16
   ],
   "an_cmp": [
    18
   ]
  }
 }
};
