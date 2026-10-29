/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_b64enc": {
  "file": "01_base64.c",
  "code": "/* 3 байта (24 бита) -> 4 знака по 6 бита. Непълна група -> '=' */\nsize_t b64_encode(const unsigned char *in, size_t n, char *out)\n{\n    size_t j = 0;\n    for (size_t i = 0; i < n; i += 3) {\n        unsigned v = (unsigned)in[i] << 16;\n        if (i + 1 < n) v |= (unsigned)in[i + 1] << 8;\n        if (i + 2 < n) v |= in[i + 2];\n        out[j++] = B64[(v >> 18) & 63];\n        out[j++] = B64[(v >> 12) & 63];\n        out[j++] = i + 1 < n ? B64[(v >> 6) & 63] : '=';\n        out[j++] = i + 2 < n ? B64[v & 63] : '=';\n    }\n    out[j] = '\\0';\n    return j;\n}",
  "tags": {
   "group": [
    5
   ],
   "pack": [
    6,
    7,
    8
   ],
   "six": [
    9,
    10,
    11,
    12
   ],
   "pad": [
    11,
    12
   ],
   "done": [
    14
   ]
  }
 },
 "ch01_b64dec": {
  "file": "01_base64.c",
  "code": "/* Обратното правило — също публично. Ключ не е нужен. */\nstatic int b64_val(char c)\n{\n    const char *p = strchr(B64, c);\n    return (c && p) ? (int)(p - B64) : -1;\n}\nlong b64_decode(const char *in, unsigned char *out)\n{\n    size_t n = strlen(in), j = 0;\n    if (n % 4) return -1;\n    for (size_t i = 0; i < n; i += 4) {\n        unsigned v = 0; int pad = 0;\n        for (int k = 0; k < 4; k++) {\n            int d = in[i + k] == '=' ? (pad++, 0) : b64_val(in[i + k]);\n            if (d < 0) return -1;\n            /* '=' само на позиции 2–3 в последната група и нищо след него (RFC 4648, 3.3) */\n            if (in[i + k] == '=' ? (k < 2 || i + 4 != n) : pad > 0) return -1;\n            v = (v << 6) | (unsigned)d;\n        }\n        out[j++] = (unsigned char)(v >> 16);\n        if (pad < 2) out[j++] = (unsigned char)(v >> 8);\n        if (pad < 1) out[j++] = (unsigned char)v;\n    }\n    return (long)j;\n}",
  "tags": {
   "check": [
    10,
    15,
    17
   ],
   "group": [
    11
   ],
   "six": [
    13,
    18
   ],
   "unpack": [
    20,
    21,
    22
   ],
   "done": [
    24
   ]
  }
 },
 "ch02_modinv": {
  "file": "02_known_plain.c",
  "code": "/* Разширен алгоритъм на Евклид: a*x ≡ 1 (mod m). Връща -1, ако НОД(a,m) != 1 */\nint modinv(int a, int m)\n{\n    int r0 = m, r1 = mod(a, m), x0 = 0, x1 = 1;\n    while (r1 != 0) {\n        int q = r0 / r1;\n        int t = r0 - q * r1; r0 = r1; r1 = t;\n        t = x0 - q * x1; x0 = x1; x1 = t;\n    }\n    if (r0 != 1) return -1;\n    return mod(x0, m);\n}",
  "tags": {
   "init": [
    4
   ],
   "loop": [
    5
   ],
   "q": [
    6
   ],
   "step": [
    7,
    8
   ],
   "nogcd": [
    10
   ],
   "ret": [
    11
   ]
  }
 },
 "ch02_affine_kp": {
  "file": "02_known_plain.c",
  "code": "/* Две известни двойки открит/шифротекст -> ключ (a, b) на афинния шифър.\n   c1 - c2 ≡ a (p1 - p2)  =>  a = (c1 - c2) * (p1 - p2)^-1,  b = c1 - a p1 */\nint affine_from_pairs(int p1, int c1, int p2, int c2, int m, int *a, int *b)\n{\n    int dp = mod(p1 - p2, m), dc = mod(c1 - c2, m);\n    int inv = modinv(dp, m);\n    if (inv < 0) return 0;  /* p1 - p2 няма обратен: a не се получава директно */\n    *a = mod(dc * inv, m);\n    *b = mod(c1 - *a * p1, m);\n    if (gcd_int(*a, m) != 1) return 0;  /* не е валиден ключ */\n    return 1;\n}",
  "tags": {
   "diff": [
    5
   ],
   "inv": [
    6
   ],
   "fail": [
    7,
    10
   ],
   "a": [
    8
   ],
   "b": [
    9
   ],
   "ok": [
    11
   ]
  }
 },
 "ch02_vig_kp": {
  "file": "02_known_plain.c",
  "code": "/* Виженер: при известна двойка ключовата последователност е k_i = c_i - p_i */\nvoid vig_keystream(const int *p, const int *c, int n, int m, int *k)\n{\n    for (int i = 0; i < n; i++)\n        k[i] = mod(c[i] - p[i], m);\n}\n/* най-малкият период L, при който k[i] == k[i-L] за всички i */\nint keystream_period(const int *k, int n)\n{\n    for (int L = 1; L < n; L++) {\n        int ok = 1;\n        for (int i = L; i < n && ok; i++)\n            if (k[i] != k[i - L]) ok = 0;\n        if (ok) return L;\n    }\n    return n;\n}",
  "tags": {
   "loop": [
    4
   ],
   "sub": [
    5
   ],
   "tryL": [
    10
   ],
   "cmp": [
    13
   ],
   "found": [
    14
   ],
   "whole": [
    16
   ]
  }
 },
 "ch03_counts": {
  "file": "03_invariants.c",
  "code": "/* Хистограма: колко пъти се среща всяка буква */\nvoid letter_counts(const int *x, int n, int m, int *cnt)\n{\n    for (int j = 0; j < m; j++) cnt[j] = 0;\n    for (int i = 0; i < n; i++) cnt[x[i]]++;\n}\n/* Еднакви ли са мултимножествата (едни и същи букви със същия брой)? */\nint same_counts(const int *x, const int *y, int n, int m)\n{\n    int a[30], b[30];\n    letter_counts(x, n, m, a);\n    letter_counts(y, n, m, b);\n    for (int j = 0; j < m; j++)\n        if (a[j] != b[j]) return 0;\n    return 1;\n}",
  "tags": {
   "zero": [
    4
   ],
   "count": [
    5
   ],
   "cx": [
    11
   ],
   "cy": [
    12
   ],
   "diff": [
    14
   ],
   "same": [
    15
   ]
  }
 },
 "ch03_pattern": {
  "file": "03_invariants.c",
  "code": "/* Шаблон на повторенията: p[i] = номер на първата поява на x[i] */\nvoid repeat_pattern(const int *x, int n, int m, int *p)\n{\n    int first[30], next = 0;\n    for (int j = 0; j < m; j++) first[j] = -1;\n    for (int i = 0; i < n; i++) {\n        if (first[x[i]] < 0) first[x[i]] = next++;\n        p[i] = first[x[i]];\n    }\n}\nint same_pattern(const int *x, const int *y, int n, int m)\n{\n    int px[4096], py[4096];\n    repeat_pattern(x, n, m, px);\n    repeat_pattern(y, n, m, py);\n    for (int i = 0; i < n; i++)\n        if (px[i] != py[i]) return 0;\n    return 1;\n}",
  "tags": {
   "init": [
    5
   ],
   "loop": [
    6
   ],
   "new": [
    7
   ],
   "set": [
    8
   ],
   "px": [
    14
   ],
   "py": [
    15
   ],
   "diff": [
    17
   ],
   "same": [
    18
   ]
  }
 },
 "ch04_col_enc": {
  "file": "04_transposition.c",
  "code": "/* order[r] = номер (0..w-1) на колоната, която се чете на r-то място;\n   pad = код на буквата за допълване или -1 (без допълване, неравни колони) */\nint col_encrypt(const int *p, int n, const int *order, int w, int pad, int *c)\n{\n    int len = n;\n    if (pad >= 0) while (len % w) len++;                 /* допълване до пълен ред */\n    int j = 0;\n    for (int r = 0; r < w; r++) {\n        int col = order[r];\n        for (int i = col; i < len; i += w)\n            c[j++] = i < n ? p[i] : pad;             /* pad е кодът на X */\n    }\n    return j;\n}",
  "tags": {
   "pad": [
    6
   ],
   "col": [
    8
   ],
   "cell": [
    10
   ],
   "read": [
    11
   ],
   "done": [
    13
   ]
  }
 },
 "ch04_col_dec": {
  "file": "04_transposition.c",
  "code": "int col_decrypt(const int *c, int n, const int *order, int w, int *p)\n{\n    int rows = n / w, extra = n % w;                 /* колоните < extra са с 1 по-дълги */\n    int j = 0;\n    for (int r = 0; r < w; r++) {\n        int col = order[r];\n        int h = rows + (col < extra ? 1 : 0);\n        for (int k = 0; k < h; k++)\n            p[k * w + col] = c[j++];\n    }\n    return n;\n}",
  "tags": {
   "len": [
    3
   ],
   "col": [
    5
   ],
   "h": [
    7
   ],
   "cell": [
    8
   ],
   "write": [
    9
   ],
   "done": [
    11
   ]
  }
 },
 "ch04_rail": {
  "file": "04_transposition.c",
  "code": "/* ред (0..rails-1) на позиция i при зигзаг 0,1,…,rails-1,…,1,0,… */\nstatic int rail_of(int i, int rails)\n{\n    if (rails == 1) return 0;\n    int cyc = 2 * (rails - 1), t = i % cyc;\n    return t < rails ? t : cyc - t;\n}\nint rail_encrypt(const int *p, int n, int rails, int *c)\n{\n    int j = 0;\n    for (int r = 0; r < rails; r++)\n        for (int i = 0; i < n; i++)\n            if (rail_of(i, rails) == r) c[j++] = p[i];\n    return j;\n}\nint rail_decrypt(const int *c, int n, int rails, int *p)\n{\n    int j = 0;\n    for (int r = 0; r < rails; r++)\n        for (int i = 0; i < n; i++)\n            if (rail_of(i, rails) == r) p[i] = c[j++];\n    return n;\n}",
  "tags": {
   "zig": [
    6
   ],
   "row": [
    11
   ],
   "scan": [
    12
   ],
   "take": [
    13
   ],
   "drow": [
    19
   ],
   "dscan": [
    20
   ],
   "put": [
    21
   ]
  }
 },
 "ch04_route": {
  "file": "04_transposition.c",
  "code": "/* Маршрут: правоъгълник rows x w (по редове, допълнен с pad), прочит по спирала */\nint route_encrypt(const int *p, int n, int w, int pad, int *c)\n{\n    int rows = (n + w - 1) / w, j = 0;\n    int top = 0, bot = rows - 1, lef = 0, rig = w - 1;\n#define CELL(r, q) ((r) * w + (q) < n ? p[(r) * w + (q)] : pad)\n    while (top <= bot && lef <= rig) {\n        for (int q = lef; q <= rig; q++) c[j++] = CELL(top, q);\n        for (int r = top + 1; r <= bot; r++) c[j++] = CELL(r, rig);\n        if (top < bot) for (int q = rig - 1; q >= lef; q--) c[j++] = CELL(bot, q);\n        if (lef < rig) for (int r = bot - 1; r > top; r--) c[j++] = CELL(r, lef);\n        top++; bot--; lef++; rig--;\n    }\n#undef CELL\n    return j;\n}\nint route_decrypt(const int *c, int n, int w, int *p)\n{\n    int rows = n / w, j = 0;                         /* n е кратно на w */\n    int top = 0, bot = rows - 1, lef = 0, rig = w - 1;\n    while (top <= bot && lef <= rig) {\n        for (int q = lef; q <= rig; q++) p[top * w + q] = c[j++];\n        for (int r = top + 1; r <= bot; r++) p[r * w + rig] = c[j++];\n        if (top < bot) for (int q = rig - 1; q >= lef; q--) p[bot * w + q] = c[j++];\n        if (lef < rig) for (int r = bot - 1; r > top; r--) p[r * w + lef] = c[j++];\n        top++; bot--; lef++; rig--;\n    }\n    return n;\n}",
  "tags": {
   "ring": [
    7
   ],
   "right": [
    8
   ],
   "down": [
    9
   ],
   "left": [
    10
   ],
   "up": [
    11
   ],
   "shrink": [
    12
   ]
  }
 },
 "ch05_caesar": {
  "file": "05_caesar_affine.c",
  "code": "void caesar_encrypt(const int *p, int n, int k, int m, int *c)\n{\n    for (int i = 0; i < n; i++)\n        c[i] = mod(p[i] + k, m);\n}\nvoid caesar_decrypt(const int *c, int n, int k, int m, int *p)\n{\n    for (int i = 0; i < n; i++)\n        p[i] = mod(c[i] - k, m);\n}",
  "tags": {
   "loop": [
    3
   ],
   "enc": [
    4
   ],
   "dloop": [
    8
   ],
   "dec": [
    9
   ]
  }
 },
 "ch05_brute": {
  "file": "05_caesar_affine.c",
  "code": "/* Грубо изчерпване: пробваме всички m измествания и оценяваме кандидата\n   с хи-квадрат спрямо очакваните честоти exp[] (по-малко = по-близо до езика) */\ndouble chi2(const int *x, int n, int m, const double *exp)\n{\n    int cnt[30] = { 0 };\n    for (int i = 0; i < n; i++) cnt[x[i]]++;\n    double s = 0;\n    for (int j = 0; j < m; j++) {\n        double e = exp[j] * n;\n        if (e > 0) s += (cnt[j] - e) * (cnt[j] - e) / e;\n    }\n    return s;\n}\nint caesar_bruteforce(const int *c, int n, int m, const double *exp, int *tmp)\n{\n    int best = 0; double bestS = 1e300;\n    for (int k = 0; k < m; k++) {\n        caesar_decrypt(c, n, k, m, tmp);\n        double s = chi2(tmp, n, m, exp);\n        if (s < bestS) { bestS = s; best = k; }\n    }\n    return best;\n}",
  "tags": {
   "hist": [
    6
   ],
   "chi": [
    10
   ],
   "try": [
    17
   ],
   "cand": [
    18
   ],
   "score": [
    19
   ],
   "best": [
    20
   ],
   "ret": [
    22
   ]
  }
 },
 "ch05_mono": {
  "file": "05_caesar_affine.c",
  "code": "/* key[x] = кодът, в който се превръща буквата x; inv е обратната пермутация */\nint mono_invert(const int *key, int m, int *inv)\n{\n    for (int j = 0; j < m; j++) inv[j] = -1;\n    for (int x = 0; x < m; x++) {\n        if (inv[key[x]] >= 0) return 0;  /* не е пермутация */\n        inv[key[x]] = x;\n    }\n    return 1;\n}\nvoid mono_apply(const int *tab, const int *in, int n, int *out)\n{\n    for (int i = 0; i < n; i++)\n        out[i] = tab[in[i]];\n}",
  "tags": {
   "inv": [
    5,
    7
   ],
   "bad": [
    6
   ],
   "loop": [
    13
   ],
   "map": [
    14
   ]
  }
 },
 "ch05_affine": {
  "file": "05_caesar_affine.c",
  "code": "int affine_encrypt(const int *p, int n, int a, int b, int m, int *c)\n{\n    if (gcd_int(a, m) != 1) return 0;\n    for (int i = 0; i < n; i++)\n        c[i] = mod(a * p[i] + b, m);\n    return 1;\n}\nint affine_decrypt(const int *c, int n, int a, int b, int m, int *p)\n{\n    int ai = -1;\n    for (int t = 1; t < m; t++)\n        if (mod(a * t, m) == 1) { ai = t; break; }\n    if (ai < 0) return 0;  /* няма обратен елемент */\n    for (int i = 0; i < n; i++)\n        p[i] = mod(ai * (c[i] - b), m);\n    return 1;\n}",
  "tags": {
   "check": [
    3
   ],
   "loop": [
    4
   ],
   "enc": [
    5
   ],
   "search": [
    11
   ],
   "found": [
    12
   ],
   "noinv": [
    13
   ],
   "dloop": [
    14
   ],
   "dec": [
    15
   ]
  }
 },
 "ch06_vig": {
  "file": "06_vigenere.c",
  "code": "void vig_encrypt(const int *p, int n, const int *k, int L, int m, int *c)\n{\n    for (int i = 0; i < n; i++)\n        c[i] = mod(p[i] + k[i % L], m);\n}\nvoid vig_decrypt(const int *c, int n, const int *k, int L, int m, int *p)\n{\n    for (int i = 0; i < n; i++)\n        p[i] = mod(c[i] - k[i % L], m);\n}",
  "tags": {
   "loop": [
    3
   ],
   "enc": [
    4
   ],
   "dloop": [
    8
   ],
   "dec": [
    9
   ]
  }
 },
 "ch06_kasiski": {
  "file": "06_vigenere.c",
  "code": "/* Касиски: за всяка тройка, която се повтаря, записваме разстоянието до\n   предишната ѝ поява; периодът обикновено дели повечето разстояния */\nint kasiski(const int *c, int n, int *dist, int cap)\n{\n    int nd = 0;\n    for (int i = 0; i + 2 < n; i++)\n        for (int j = i + 1; j + 2 < n; j++)\n            if (c[i] == c[j] && c[i + 1] == c[j + 1] && c[i + 2] == c[j + 2]) {\n                if (nd < cap) dist[nd++] = j - i;\n                break;  /* само най-близкото повторение */\n            }\n    return nd;\n}\n/* за всеки делител d = 2..maxL: колко от разстоянията дели */\nvoid kasiski_votes(const int *dist, int nd, int maxL, int *votes)\n{\n    for (int d = 2; d <= maxL; d++) {\n        votes[d] = 0;\n        for (int t = 0; t < nd; t++)\n            if (dist[t] % d == 0) votes[d]++;\n    }\n}",
  "tags": {
   "outer": [
    6
   ],
   "inner": [
    7
   ],
   "match": [
    8
   ],
   "rec": [
    9
   ],
   "vote": [
    17
   ],
   "div": [
    20
   ]
  }
 },
 "ch06_ic": {
  "file": "06_vigenere.c",
  "code": "/* Индекс на съвпадение: вероятност два случайно избрани символа да са еднакви */\ndouble ic(const int *x, int n, int step, int start, int m)\n{\n    int cnt[30] = { 0 }, len = 0;\n    for (int i = start; i < n; i += step) { cnt[x[i]]++; len++; }\n    if (len < 2) return 0;\n    double s = 0;\n    for (int j = 0; j < m; j++) s += (double)cnt[j] * (cnt[j] - 1);\n    return s / ((double)len * (len - 1));\n}\n/* среден IC по колоните при период L */\ndouble ic_period(const int *c, int n, int L, int m)\n{\n    double s = 0;\n    for (int r = 0; r < L; r++) s += ic(c, n, L, r, m);\n    return s / L;\n}",
  "tags": {
   "count": [
    5
   ],
   "sum": [
    8
   ],
   "ret": [
    9
   ],
   "col": [
    15
   ],
   "avg": [
    16
   ]
  }
 },
 "ch06_crack": {
  "file": "06_vigenere.c",
  "code": "/* При известен период L всяка колона е Цезар: избираме изместването с\n   най-малък хи-квадрат спрямо очакваните честоти exp[] */\nvoid vig_crack(const int *c, int n, int L, int m, const double *exp, int *key)\n{\n    for (int r = 0; r < L; r++) {\n        int cnt[30] = { 0 }, len = 0;\n        for (int i = r; i < n; i += L) { cnt[c[i]]++; len++; }\n        double best = 1e300;\n        for (int k = 0; k < m; k++) {\n            double s = 0;\n            for (int j = 0; j < m; j++) {\n                double e = exp[j] * len;\n                int o = cnt[mod(j + k, m)];          /* буква j се вижда като j+k */\n                if (e > 0) s += (o - e) * (o - e) / e;\n            }\n            if (s < best) { best = s; key[r] = k; }\n        }\n    }\n}",
  "tags": {
   "col": [
    5
   ],
   "hist": [
    7
   ],
   "shift": [
    9
   ],
   "chi": [
    14
   ],
   "best": [
    16
   ]
  }
 },
 "ch07_rank": {
  "file": "07_freq_otp.c",
  "code": "/* ord[r] = буквата с r-та най-голяма честота (при равенство — по-малкият код) */\nvoid rank_letters(const int *cnt, int m, int *ord)\n{\n    for (int j = 0; j < m; j++) ord[j] = j;\n    for (int i = 1; i < m; i++) {                    /* сортиране чрез вмъкване */\n        int v = ord[i], j = i - 1;\n        while (j >= 0 && (cnt[ord[j]] < cnt[v] ||\n               (cnt[ord[j]] == cnt[v] && ord[j] > v))) {\n            ord[j + 1] = ord[j]; j--;\n        }\n        ord[j + 1] = v;\n    }\n}\n/* guess[c] = открита буква, предполагана за шифросимвола c */\nvoid freq_guess(const int *ccnt, const int *lang_ord, int m, int *guess)\n{\n    int cord[30];\n    rank_letters(ccnt, m, cord);\n    for (int r = 0; r < m; r++)\n        guess[cord[r]] = lang_ord[r];\n}",
  "tags": {
   "init": [
    4
   ],
   "ins": [
    5
   ],
   "cmp": [
    8
   ],
   "shift": [
    9
   ],
   "put": [
    11
   ],
   "rankc": [
    18
   ],
   "match": [
    19
   ],
   "map": [
    20
   ]
  }
 },
 "ch07_otp": {
  "file": "07_freq_otp.c",
  "code": "void xor_bytes(const unsigned char *a, const unsigned char *b, int n, unsigned char *out)\n{\n    for (int i = 0; i < n; i++)\n        out[i] = a[i] ^ b[i];\n}",
  "tags": {
   "loop": [
    3
   ],
   "xor": [
    4
   ]
  }
 },
 "ch09_egcd": {
  "file": "08_asym.c",
  "code": "/* Разширен алгоритъм на Евклид: d = e^−1 mod φ.\n   Инвариант на всеки ред: r = e·s (mod φ). Когато r = 1, s е обратният. */\ni64 mod_inverse(i64 e, i64 phi)\n{\n    i64 r0 = phi, r1 = e;\n    i64 s0 = 0, s1 = 1;\n    while (r1 != 0) {\n        i64 q = r0 / r1;\n        i64 r2 = r0 - q * r1;  r0 = r1;  r1 = r2;\n        i64 s2 = s0 - q * s1;  s0 = s1;  s1 = s2;\n    }\n    if (r0 != 1) return -1;  /* НОД ≠ 1: няма */\n    return s0 < 0 ? s0 + phi : s0;\n}",
  "tags": {
   "init": [
    5
   ],
   "loop": [
    7
   ],
   "q": [
    8
   ],
   "step": [
    9
   ],
   "gcd": [
    12
   ],
   "done": [
    13
   ]
  }
 },
 "ch09_modpow": {
  "file": "08_asym.c",
  "code": "/* Бързо степенуване (квадрат и умножение), битовете на k отдясно наляво.\n   O(log k) умножения вместо k − 1. */\nu64 mod_pow(u64 b, u64 k, u64 n)\n{\n    u64 r = 1 % n;\n    b %= n;\n    while (k > 0) {\n        if (k & 1)\n            r = r * b % n;\n        b = b * b % n;\n        k >>= 1;\n    }\n    return r;\n}",
  "tags": {
   "init": [
    5
   ],
   "loop": [
    7
   ],
   "bit": [
    8
   ],
   "mul": [
    9
   ],
   "sq": [
    10
   ],
   "done": [
    13
   ]
  }
 },
 "ch09_factor": {
  "file": "08_asym.c",
  "code": "/* Нападателят знае само (n, e). Ако разложи n = p·q, пресмята φ и d.\n   Пробно делене: до √n опита — безнадеждно при n с 2048 бита. */\nu64 factor(u64 n)\n{\n    if (n % 2 == 0) return 2;\n    for (u64 f = 3; f * f <= n; f += 2)\n        if (n % f == 0)\n            return f;\n    return n;\n}",
  "tags": {
   "even": [
    5
   ],
   "try": [
    6
   ],
   "hit": [
    7
   ],
   "prime": [
    9
   ]
  }
 }
};
