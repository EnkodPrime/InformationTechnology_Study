/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "linear_search": {
  "file": "01_algorithm.c",
  "code": "/* Връща индекса на key в a[0..n-1] или -1, ако липсва. */\nint linear_search(const int a[], int n, int key)\n{\n    for (int i = 0; i < n; i++) {\n        /* Инвариант: key не се среща в a[0..i-1] */\n        if (a[i] == key)\n            return i;\n    }\n    return -1;\n}",
  "tags": {
   "enter": [
    3
   ],
   "loop": [
    4
   ],
   "cmp": [
    6
   ],
   "found": [
    7
   ],
   "notfound": [
    9
   ]
  }
 },
 "gcd_euclid": {
  "file": "01_algorithm.c",
  "code": "/* Най-голям общ делител — алгоритъм на Евклид. */\nunsigned gcd(unsigned a, unsigned b)\n{\n    /* Инвариант:   НОД(a, b) не се променя\n       Ранг. функция: b >= 0 и строго намалява */\n    while (b != 0) {\n        unsigned r = a % b;\n        a = b;\n        b = r;\n    }\n    return a;\n}",
  "tags": {
   "enter": [
    3
   ],
   "cond": [
    6
   ],
   "mod": [
    7
   ],
   "shift": [
    8,
    9
   ],
   "ret": [
    11
   ]
  }
 },
 "is_even_partial": {
  "file": "01_algorithm.c",
  "code": "/* Частично коректна, но НЕ пълно коректна:\n   ако спре, отговорът е верен; за нечетно x не спира.\n   (Разсъждението е в модела с неограничени цели числа. В C с int\n   x - 2 стига INT_MIN и препълва — недефинирано поведение; gcc -O2\n   дори премахва цикъла и връща 1 и за нечетно x.) */\nint is_even(int x)\n{\n    while (x != 0)\n        x = x - 2;\n    return 1;  /* \"четно\" */\n}",
  "tags": {
   "enter": [
    7
   ],
   "cond": [
    8
   ],
   "step": [
    9
   ],
   "ret": [
    10
   ]
  }
 },
 "prop_finiteness": {
  "file": "01_algorithm.c",
  "code": "/* Нарушена КРАЙНОСТ: i никога не достига n при n > 0 */\nint sum_bad(const int a[], int n)\n{\n    int s = 0;\n    for (int i = 0; i < n; i = i * 2)\n        s += a[i];\n    return s;\n}",
  "tags": {
   "bug": [
    5
   ]
  }
 },
 "prop_definiteness": {
  "file": "01_algorithm.c",
  "code": "/* Нарушена ОПРЕДЕЛЕНОСТ: редът на изчисляване на\n   операндите на „−“ не е зададен (unspecified, C11 6.5p3) —\n   резултатът (−1 или 1) зависи от компилатора */\nint next(void) { static int k = 0; return ++k; }\nint pair_diff(void)\n{\n    return next() - next();\n}",
  "tags": {
   "bug": [
    7
   ]
  }
 },
 "prop_mass": {
  "file": "01_algorithm.c",
  "code": "/* Нарушена МАСОВОСТ: работи само за един конкретен вход */\nint max_of_example(void)\n{\n    /* входът {3, 9, 4} е \"вграден\" — за друг масив е безполезна */\n    return 9;\n}",
  "tags": {
   "bug": [
    5
   ]
  }
 },
 "prop_result": {
  "file": "01_algorithm.c",
  "code": "/* Нарушена РЕЗУЛТАТНОСТ: за празен масив няма\n   резултат по спецификацията (чете извън масива) */\nint max_bad(const int a[], int n)\n{\n    int m = a[0];\n    for (int i = 1; i < n; i++)\n        if (a[i] > m) m = a[i];\n    return m;\n}",
  "tags": {
   "bug": [
    5
   ]
  }
 },
 "prop_exec": {
  "file": "01_algorithm.c",
  "code": "/* Нарушена ИЗПЪЛНИМОСТ: операцията не е изпълнима\n   в модела (делене на нула / недефинирано поведение) */\nint avg_bad(const int a[], int n)\n{\n    int s = 0;\n    for (int i = 0; i < n; i++) s += a[i];\n    return s / n;\n}",
  "tags": {
   "bug": [
    7
   ]
  }
 },
 "ch02_bfs": {
  "file": "02_computability.c",
  "code": "/* Обхождане в ширина (BFS) от s към t.\n   Връща dist[t] = брой ребра по най-краткия път, или -1, ако t е недостижим.\n   parent[] пази дървото на обхождането — от него се възстановява пътят. */\nint bfs(int n, const int adj[][MAXV], int s, int t, int parent[])\n{\n    int dist[MAXV], queue[MAXV], head = 0, tail = 0;\n    for (int v = 0; v < n; v++) { dist[v] = -1; parent[v] = -1; }\n    dist[s] = 0;\n    queue[tail++] = s;\n    while (head < tail) {\n        int u = queue[head++];\n        if (u == t)\n            return dist[u];          /* t е изваден: намерен */\n        for (int v = 0; v < n; v++)\n            if (adj[u][v] && dist[v] < 0) {\n                dist[v] = dist[u] + 1;\n                parent[v] = u;\n                queue[tail++] = v;\n            }\n    }\n    return -1;  /* опашката е празна: ВСИЧКИ достижими са обходени */\n}\n\n/* 1) Разпознаване: „Има ли път от s до t?“ — отговор да/не */\nint reachable(int n, const int adj[][MAXV], int s, int t)\n{\n    int parent[MAXV];\n    return bfs(n, adj, s, t, parent) >= 0;\n}\n\n/* 2) Търсене: „Намери път“ — връща броя върхове в path[] (0 = няма) */\nint find_path(int n, const int adj[][MAXV], int s, int t, int path[])\n{\n    int parent[MAXV], len = 0;\n    if (bfs(n, adj, s, t, parent) < 0) return 0;\n    for (int v = t; v != -1; v = parent[v])\n        path[len++] = v;\n    for (int i = 0; i < len / 2; i++) {      /* обръщане s..t */\n        int x = path[i]; path[i] = path[len - 1 - i]; path[len - 1 - i] = x;\n    }\n    return len;\n}\n\n/* 3) Оптимизация: „Най-кратък път“ — BFS вади върховете по\n   нарастващ брой ребра, затова първото изваждане на t е минимално */\nint shortest_len(int n, const int adj[][MAXV], int s, int t)\n{\n    int parent[MAXV];\n    return bfs(n, adj, s, t, parent);\n}",
  "tags": {
   "init": [
    7
   ],
   "start": [
    8,
    9
   ],
   "loop": [
    10
   ],
   "deq": [
    11,
    12
   ],
   "found": [
    13
   ],
   "edge": [
    15
   ],
   "visit": [
    16,
    17,
    18
   ],
   "empty": [
    21
   ],
   "dec": [
    28
   ],
   "back": [
    36,
    37
   ],
   "opt": [
    49
   ]
  }
 },
 "ch02_collatz": {
  "file": "02_computability.c",
  "code": "/* Колац: n -> n/2 (четно) или 3n+1 (нечетно); спира при n == 1.\n   Дали спира за ВСЯКО n >= 1, е открит въпрос. За n = 0 зацикля (0 -> 0). */\nlong collatz(long n)\n{\n    long steps = 0;\n    while (n != 1) {\n        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;\n        steps++;\n    }\n    return steps;\n}",
  "tags": {
   "enter": [
    4
   ],
   "cond": [
    6
   ],
   "step": [
    7,
    8
   ],
   "halt": [
    10
   ]
  }
 },
 "ch02_is_even": {
  "file": "02_computability.c",
  "code": "/* Спира само за четни x >= 0; за нечетно x прескача 0 и не спира\n   (в модела с неограничени цели числа; в C int препълването е UB). */\nint is_even_loop(int x)\n{\n    while (x != 0)\n        x = x - 2;\n    return 1;\n}",
  "tags": {
   "enter": [
    4
   ],
   "cond": [
    5
   ],
   "step": [
    6
   ],
   "halt": [
    7
   ]
  }
 },
 "ch02_countdown": {
  "file": "02_computability.c",
  "code": "/* Брояч надолу: спира за всяко n (ранг. функция n намалява). */\nint countdown(int n)\n{\n    while (n > 0)\n        n--;\n    return 0;\n}",
  "tags": {
   "enter": [
    3
   ],
   "cond": [
    4
   ],
   "step": [
    5
   ],
   "halt": [
    6
   ]
  }
 },
 "ch02_forever": {
  "file": "02_computability.c",
  "code": "/* Вечен цикъл: не спира за нито един вход. */\nvoid forever(int n)\n{\n    (void)n;\n    while (1) {\n        /* нищо не се променя */\n    }\n}",
  "tags": {
   "enter": [
    3
   ],
   "cond": [
    5
   ],
   "step": [
    6
   ]
  }
 },
 "ch02_semi": {
  "file": "02_computability.c",
  "code": "/* Процедура, която ПОЛУрешава „спира ли P върху x?“:\n   симулираме P стъпка по стъпка. Ако P спре — отговорът е ДА.\n   Без лимит това е полуразрешаваща процедура (самата тя може да не спре).\n   С лимит връща 0 = „още не“, което НЕ означава „никога“. */\ntypedef struct {\n    int  (*halted)(long state);   /* спряла ли е P в това състояние? */\n    long (*next)(long state);     /* една стъпка на P                */\n} program;\n\nint halts_within(program P, long x, long limit, long *steps)\n{\n    long s = x;\n    for (*steps = 0; !P.halted(s); ++*steps) {\n        if (*steps == limit)\n            return 0;     /* „още не“ — НЕ е „никога“ */\n        s = P.next(s);\n    }\n    return 1;             /* P спря: ДА, потвърдено */\n}",
  "tags": {
   "enter": [
    12
   ],
   "check": [
    13
   ],
   "limit": [
    14
   ],
   "unknown": [
    15
   ],
   "sim": [
    16
   ],
   "yes": [
    18
   ]
  }
 },
 "ch02_diag": {
  "file": "02_computability.c",
  "code": "/* H[i][j] = 1, ако предполагаемият решател казва „Pi спира върху вход Pj“.\n   D обръща диагонала: D(Pi) спира  <=>  H[i][i] == 0. */\nvoid build_d(const int H[][NP], int n, int d[])\n{\n    for (int i = 0; i < n; i++)\n        d[i] = !H[i][i];\n}\n\n/* Търси ред, равен на D. Винаги връща -1: D се различава от ред i\n   поне в колона i, значи D не е никоя от изброените програми. */\nint row_equal_to_d(const int H[][NP], int n, const int d[])\n{\n    for (int i = 0; i < n; i++) {\n        int same = 1;\n        for (int j = 0; j < n && same; j++)\n            same = (H[i][j] == d[j]);\n        if (same) return i;\n    }\n    return -1;\n}",
  "tags": {
   "loop": [
    5
   ],
   "flip": [
    6
   ],
   "row": [
    13
   ],
   "cmp": [
    16
   ],
   "same": [
    17
   ],
   "none": [
    19
   ]
  }
 },
 "ch02_diag_D": {
  "file": "02_computability.c",
  "code": "/* Хипотетичен решател: halts(p, x) == 1 <=> програма p спира върху вход x.\n   Тюринг: такава винаги вярна и винаги завършваща функция не съществува. */\ntypedef int (*halts_fn)(int prog, int input);\n\n/* D(p): прави обратното на това, което halts предсказва за p върху p */\nint D(halts_fn halts, int p)\n{\n    if (halts(p, p))          /* „p спира върху себе си“ ... */\n        for (;;) { }          /* ... тогава D зацикля           */\n    return 0;                 /* иначе D спира                   */\n}\n/* Въпрос: какво казва halts(D, D)?\n   1 => D(D) зацикля;  0 => D(D) спира.  И в двата случая halts греши. */",
  "tags": {
   "ask": [
    8
   ],
   "loop": [
    9
   ],
   "halt": [
    10
   ]
  }
 },
 "ch03_single": {
  "file": "03_complexity.c",
  "code": "/* Единичен цикъл: count = n  ->  Θ(n) */\nvoid single(int n)\n{\n    for (int i = 0; i < n; i++)\n        count++;\n}",
  "tags": {
   "loop": [
    4
   ],
   "op": [
    5
   ]
  }
 },
 "ch03_nested": {
  "file": "03_complexity.c",
  "code": "/* Два вложени цикъла: count = n·n  ->  Θ(n²) */\nvoid nested(int n)\n{\n    for (int i = 0; i < n; i++)\n        for (int j = 0; j < n; j++)\n            count++;\n}",
  "tags": {
   "outer": [
    4
   ],
   "inner": [
    5
   ],
   "op": [
    6
   ]
  }
 },
 "ch03_tri": {
  "file": "03_complexity.c",
  "code": "/* Триъгълен цикъл: j тръгва от i.\n   count = n + (n-1) + ... + 1 = n(n+1)/2  ->  Θ(n²) */\nvoid triangle(int n)\n{\n    for (int i = 0; i < n; i++)\n        for (int j = i; j < n; j++)\n            count++;\n}",
  "tags": {
   "outer": [
    5
   ],
   "inner": [
    6
   ],
   "op": [
    7
   ]
  }
 },
 "ch03_double": {
  "file": "03_complexity.c",
  "code": "/* Удвояване: i = 1, 2, 4, 8, ... <= n\n   count = ⌊log₂ n⌋ + 1  ->  Θ(log n) */\nvoid doubling(int n)\n{\n    for (int i = 1; i <= n; i *= 2)\n        count++;\n}",
  "tags": {
   "loop": [
    5
   ],
   "op": [
    6
   ]
  }
 },
 "ch03_rec": {
  "file": "03_complexity.c",
  "code": "/* T(n) = 2T(n/2) + n: n операции на ниво, ~log₂ n нива.\n   За n = 2^k: count = n·log₂ n  ->  Θ(n log n) */\nvoid rec(int n)\n{\n    if (n <= 1) return;\n    for (int i = 0; i < n; i++)\n        count++;\n    rec(n / 2);\n    rec(n - n / 2);\n}",
  "tags": {
   "enter": [
    4
   ],
   "base": [
    5
   ],
   "loop": [
    6
   ],
   "op": [
    7
   ],
   "left": [
    8
   ],
   "right": [
    9
   ]
  }
 },
 "ch03_lsearch": {
  "file": "03_complexity.c",
  "code": "/* Линейно търсене, брои сравненията на ключове.\n   Най-добър случай: 1 · Най-лош: n · Среден (ключът е на\n   равномерно случайна позиция): (n+1)/2 */\nint lsearch(const int a[], int n, int key, long *cmp)\n{\n    *cmp = 0;\n    for (int i = 0; i < n; i++) {\n        ++*cmp;\n        if (a[i] == key) return i;\n    }\n    return -1;\n}",
  "tags": {
   "loop": [
    7
   ],
   "cmp": [
    8,
    9
   ],
   "miss": [
    11
   ]
  }
 },
 "ch03_theta": {
  "file": "03_complexity.c",
  "code": "/* T(n) = 3n² + 5n + 7.  Θ(n²) значи: има c1, c2 > 0 и n0,\n   така че c1·n² <= T(n) <= c2·n² за всяко n >= n0.\n   Числена проверка за n = 1..nmax: последното нарушение. */\ndouble T(long n) { return 3.0 * n * n + 5.0 * n + 7.0; }\n\nlong min_n0(double c1, double c2, long nmax)\n{\n    long last_bad = 0;\n    for (long n = 1; n <= nmax; n++) {\n        double t = T(n), lo = c1 * n * n, hi = c2 * n * n;\n        if (lo > t || t > hi)\n            last_bad = n;      /* нарушено при това n */\n    }\n    return last_bad < nmax ? last_bad + 1 : -1;\n}",
  "tags": {
   "loop": [
    9
   ],
   "eval": [
    10
   ],
   "test": [
    11
   ],
   "bad": [
    12
   ],
   "ret": [
    14
   ]
  }
 },
 "ch03_pseudo": {
  "file": "03_complexity.c",
  "code": "/* Брой битове на W >= 1: ⌊log₂ W⌋ + 1 — това е РАЗМЕРЪТ на входа */\nunsigned bits(uint64_t W)\n{\n    unsigned b = 0;\n    do { b++; W >>= 1; } while (W);\n    return b;\n}\n\n/* Цикъл до W: W стъпки — полиномиално спрямо СТОЙНОСТТА W,\n   но ~2^bits(W) спрямо ДЪЛЖИНАТА на входа (псевдополиномиално) */\nuint64_t count_to(uint64_t W)\n{\n    uint64_t steps = 0;\n    for (uint64_t i = 1; i <= W; i++)\n        steps++;\n    return steps;\n}",
  "tags": {
   "bits": [
    5
   ],
   "loop": [
    14,
    15
   ]
  }
 },
 "ch04_ham_verify": {
  "file": "04_pnp.c",
  "code": "/* Проверител на сертификат за Хамилтонов цикъл.\n   cyc[0..k-1] е предложената последователност от върхове.\n   Време: O(n²) с матрица на съседство — полиномиално. */\nint verify_ham(int n, const int adj[][MAXN], const int cyc[], int k)\n{\n    int seen[MAXN] = { 0 };\n    if (k != n) return 0;                       /* точно n върха */\n    for (int i = 0; i < k; i++) {\n        int v = cyc[i];\n        if (v < 0 || v >= n || seen[v]) return 0; /* повторение */\n        seen[v] = 1;\n    }\n    for (int i = 0; i < k; i++) {\n        int a = cyc[i], b = cyc[(i + 1) % k];   /* вкл. последен→първи */\n        if (!adj[a][b]) return 0;               /* няма ребро */\n    }\n    return 1;                                   /* сертификатът е валиден */\n}",
  "tags": {
   "len": [
    7
   ],
   "loop": [
    8
   ],
   "dup": [
    10
   ],
   "mark": [
    11
   ],
   "eloop": [
    13
   ],
   "pair": [
    14
   ],
   "noedge": [
    15
   ],
   "ok": [
    17
   ]
  }
 },
 "ch04_ham_search": {
  "file": "04_pnp.c",
  "code": "/* Изчерпателно търсене: фиксираме връх 0 и пробваме всички\n   (n-1)! наредби на останалите. tried брои проверените пермутации. */\nstatic long tried;\n\nstatic int next_perm(int a[], int m)  /* следваща лексикографска пермутация */\n{\n    int i = m - 2;\n    while (i >= 0 && a[i] >= a[i + 1]) i--;\n    if (i < 0) return 0;\n    int j = m - 1;\n    while (a[j] <= a[i]) j--;\n    int t = a[i]; a[i] = a[j]; a[j] = t;\n    for (int l = i + 1, r = m - 1; l < r; l++, r--) { t = a[l]; a[l] = a[r]; a[r] = t; }\n    return 1;\n}\n\nint search_ham(int n, const int adj[][MAXN], int cyc[])\n{\n    tried = 0;\n    for (int i = 0; i < n; i++) cyc[i] = i;\n    do {\n        tried++;\n        if (verify_ham(n, adj, cyc, n))\n            return 1;\n    } while (next_perm(cyc + 1, n - 1));  /* върхът 0 остава първи */\n    return 0;   /* всички (n-1)! са проверени: НЯМА цикъл (доказано) */\n}",
  "tags": {
   "init": [
    20
   ],
   "try": [
    22
   ],
   "verify": [
    23
   ],
   "found": [
    24
   ],
   "next": [
    25
   ],
   "none": [
    26
   ]
  }
 },
 "ch04_sat_eval": {
  "file": "04_pnp.c",
  "code": "/* КНФ: клауза = масив литерали; +i е x_i, -i е ¬x_i, 0 завършва клаузата.\n   Проверка на присвояване (сертификат): O(дължина на формулата). */\nint eval_cnf(const int f[][4], int m, const int x[])\n{\n    for (int c = 0; c < m; c++) {\n        int sat = 0;\n        for (int k = 0; k < 4 && f[c][k] != 0; k++) {\n            int v = f[c][k] > 0 ? f[c][k] : -f[c][k];\n            int val = f[c][k] > 0 ? x[v] : !x[v];\n            if (val) { sat = 1; break; }\n        }\n        if (!sat) return 0;      /* клауза c е невярна */\n    }\n    return 1;                    /* всички клаузи са верни */\n}",
  "tags": {
   "clause": [
    5
   ],
   "lit": [
    7,
    9
   ],
   "true": [
    10
   ],
   "false": [
    12
   ],
   "ok": [
    14
   ]
  }
 },
 "ch04_sat_brute": {
  "file": "04_pnp.c",
  "code": "/* Изчерпателно: всички 2^n присвоявания, x[1..n] = битовете на mask. */\nint sat_brute(const int f[][4], int m, int n, long *tried_out)\n{\n    int x[MAXV + 1] = { 0 };\n    *tried_out = 0;\n    for (long mask = 0; mask < (1L << n); mask++) {\n        for (int i = 1; i <= n; i++) x[i] = (mask >> (i - 1)) & 1;\n        ++*tried_out;\n        if (eval_cnf(f, m, x))\n            return 1;            /* изпълнима: x е сертификат */\n    }\n    return 0;                    /* 2^n проверки: неизпълнима */\n}",
  "tags": {
   "loop": [
    6
   ],
   "assign": [
    7,
    8
   ],
   "check": [
    9
   ],
   "sat": [
    10
   ],
   "unsat": [
    12
   ]
  }
 },
 "ch04_reduce": {
  "file": "04_pnp.c",
  "code": "/* Свеждане Хамилтонов цикъл ≤p TSP (решаваща):\n   d(u,v) = 1, ако (u,v) е ребро, иначе 2; K = n.\n   G има Хамилтонов цикъл  <=>  има обиколка с дължина <= n.\n   Време: O(n²) — полиномиално преобразуване на входа. */\nint ham_to_tsp(int n, const int adj[][MAXN], int d[][MAXN])\n{\n    for (int u = 0; u < n; u++)\n        for (int v = 0; v < n; v++)\n            d[u][v] = (u == v) ? 0 : (adj[u][v] ? 1 : 2);\n    return n;                    /* K = n */\n}\n\n/* Решаващ TSP чрез изчерпване (само за малки n, за проверка) */\nint tsp_le_k(int n, const int d[][MAXN], int K, int tour[])\n{\n    int p[MAXN];\n    for (int i = 0; i < n; i++) p[i] = i;\n    do {\n        int len = 0;\n        for (int i = 0; i < n; i++) len += d[p[i]][p[(i + 1) % n]];\n        if (len <= K) { memcpy(tour, p, sizeof p); return 1; }\n    } while (next_perm(p + 1, n - 1));\n    return 0;\n}",
  "tags": {
   "loop": [
    7
   ],
   "w": [
    9
   ],
   "k": [
    10
   ]
  }
 },
 "ch05_fact_rec": {
  "file": "05_recursion.c",
  "code": "/* n! рекурсивно.  Предусловие: n >= 0.\n   0! = 1;  n! = n * (n-1)!  за n > 0          */\nunsigned long long fact(int n)\n{\n    g_calls++;\n    if (n == 0)\n        return 1;\n    unsigned long long r = fact(n - 1);\n    return (unsigned long long)n * r;\n}",
  "tags": {
   "enter": [
    5
   ],
   "base_test": [
    6
   ],
   "base": [
    7
   ],
   "call": [
    8
   ],
   "mul": [
    9
   ]
  }
 },
 "ch05_fact_iter": {
  "file": "05_recursion.c",
  "code": "/* n! итеративно: една променлива r — Θ(1) допълнителна памет */\nunsigned long long fact_iter(int n)\n{\n    unsigned long long r = 1;\n    for (int i = 2; i <= n; i++)\n        r *= (unsigned long long)i;\n    return r;\n}",
  "tags": {
   "init": [
    4
   ],
   "loop": [
    5
   ],
   "mul": [
    6
   ],
   "ret": [
    7
   ]
  }
 },
 "ch05_dfact_bad": {
  "file": "05_recursion.c",
  "code": "/* \"Двоен факториел\" n*(n-2)*(n-4)*...\n   Базовият случай е САМО n == 0: при нечетно n\n   аргументът прескача 0 и тръгва към -безкрайност. */\nlong long dfact_bad(int n)\n{\n    g_calls++;\n    if (n == 0)\n        return 1;\n    return n * dfact_bad(n - 2);\n}",
  "tags": {
   "enter": [
    6
   ],
   "base_test": [
    7
   ],
   "base": [
    8
   ],
   "call": [
    9
   ],
   "mul": [
    9
   ]
  }
 },
 "ch05_dfact_ok": {
  "file": "05_recursion.c",
  "code": "/* Поправено: базовият случай покрива и 1, и всички n <= 0.\n   Мярката n намалява с 2 и неизбежно стига до n <= 1. */\nlong long dfact_ok(int n)\n{\n    g_calls++;\n    if (n <= 1)\n        return 1;\n    return n * dfact_ok(n - 2);\n}",
  "tags": {
   "enter": [
    5
   ],
   "base_test": [
    6
   ],
   "base": [
    7
   ],
   "call": [
    8
   ],
   "mul": [
    8
   ]
  }
 },
 "ch05_pow_lin": {
  "file": "05_recursion.c",
  "code": "/* x^n линейно: x^n = x * x^(n-1).  n+1 извиквания — Θ(n) */\nlong long pow_lin(long long x, int n)\n{\n    g_calls++;\n    if (n == 0)\n        return 1;\n    long long r = pow_lin(x, n - 1);\n    return x * r;\n}",
  "tags": {
   "enter": [
    4
   ],
   "base_test": [
    5
   ],
   "base": [
    6
   ],
   "call": [
    7
   ],
   "comb": [
    8
   ]
  }
 },
 "ch05_pow_twice": {
  "file": "05_recursion.c",
  "code": "/* x^n чрез ДВЕ еднакви извиквания за n/2.\n   Изглежда \"разделяй и владей\", но C(n) = 2C(n/2) + 1 = Θ(n) извиквания. */\nlong long pow_twice(long long x, int n)\n{\n    g_calls++;\n    if (n == 0)\n        return 1;\n    long long a = pow_twice(x, n / 2);\n    long long b = pow_twice(x, n / 2);\n    return (n % 2) ? a * b * x : a * b;\n}",
  "tags": {
   "enter": [
    5
   ],
   "base_test": [
    6
   ],
   "base": [
    7
   ],
   "call": [
    8
   ],
   "call1": [
    8
   ],
   "call2": [
    9
   ],
   "comb": [
    10
   ]
  }
 },
 "ch05_pow_fast": {
  "file": "05_recursion.c",
  "code": "/* Бързо степенуване: x^n = (x^(n/2))^2  [* x при нечетно n].\n   Едно извикване за n/2:  C(n) = C(n/2) + 1 = Θ(log n) */\nlong long pow_fast(long long x, int n)\n{\n    g_calls++;\n    if (n == 0)\n        return 1;\n    long long h = pow_fast(x, n / 2);\n    return (n % 2) ? h * h * x : h * h;\n}",
  "tags": {
   "enter": [
    5
   ],
   "base_test": [
    6
   ],
   "base": [
    7
   ],
   "call": [
    8
   ],
   "comb": [
    9
   ]
  }
 },
 "ch06_merge_sort": {
  "file": "06_divide.c",
  "code": "/* Сливане на сортираните a[lo..mid) и a[mid..hi) чрез буфер tmp */\nstatic void merge(int a[], int tmp[], int lo, int mid, int hi)\n{\n    int i = lo, j = mid, k = lo;\n    while (i < mid && j < hi) {\n        g_cmp++;\n        if (a[i] <= a[j])        /* <= : стабилност */\n            tmp[k++] = a[i++];\n        else\n            tmp[k++] = a[j++];\n        g_copy++;\n    }\n    while (i < mid) { tmp[k++] = a[i++]; g_copy++; }\n    while (j < hi)  { tmp[k++] = a[j++]; g_copy++; }\n    for (k = lo; k < hi; k++) { a[k] = tmp[k]; g_copy++; }\n}\n\n/* Сортира a[lo..hi) — top-down */\nstatic void merge_sort_rec(int a[], int tmp[], int lo, int hi)\n{\n    if (hi - lo < 2)\n        return;\n    int mid = lo + (hi - lo) / 2;\n    merge_sort_rec(a, tmp, lo, mid);\n    merge_sort_rec(a, tmp, mid, hi);\n    merge(a, tmp, lo, mid, hi);\n}\n\nvoid merge_sort(int a[], int n)\n{\n    int tmp[64];          /* Θ(n) допълнителна памет (тук — фиксиран буфер) */\n    merge_sort_rec(a, tmp, 0, n);\n}",
  "tags": {
   "m_init": [
    4
   ],
   "m_loop": [
    5
   ],
   "m_cmp": [
    7
   ],
   "m_left": [
    8
   ],
   "m_right": [
    10
   ],
   "m_restL": [
    13
   ],
   "m_restR": [
    14
   ],
   "m_back": [
    15
   ],
   "enter": [
    20
   ],
   "base": [
    21
   ],
   "split": [
    23
   ],
   "left": [
    24
   ],
   "right": [
    25
   ],
   "merge": [
    26
   ]
  }
 },
 "ch06_bsearch": {
  "file": "06_divide.c",
  "code": "/* Двоично търсене в СОРТИРАН a[0..n-1]. Връща индекс или -1.\n   Предусловие: a е сортиран ненамаляващо. */\nint binary_search(const int a[], int n, int key)\n{\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;  /* не (lo+hi)/2: препълване */\n        g_cmp++;\n        if (a[mid] == key)\n            return mid;\n        g_cmp++;\n        if (a[mid] < key)\n            lo = mid + 1;\n        else\n            hi = mid - 1;\n    }\n    return -1;\n}",
  "tags": {
   "init": [
    5
   ],
   "loop": [
    6
   ],
   "mid": [
    7
   ],
   "eq": [
    9
   ],
   "found": [
    10
   ],
   "lt": [
    12
   ],
   "right": [
    13
   ],
   "left": [
    15
   ],
   "notfound": [
    17
   ]
  }
 },
 "ch06_quick_sort": {
  "file": "06_divide.c",
  "code": "static int lt(int x, int y) { g_cmp++; return x < y; }\nstatic void swap(int *x, int *y) { int t = *x; *x = *y; *y = t; g_swap++; }\n\n/* Опорен елемент: 0 последен, 1 среден, 2 случаен, 3 медиана от три */\nstatic int choose_pivot(const int a[], int lo, int hi, int mode)\n{\n    int mid = lo + (hi - lo) / 2;\n    if (mode == 0) return hi;\n    if (mode == 1) return mid;\n    if (mode == 2) return lo + rnd(hi - lo + 1);\n    if (lt(a[lo], a[mid]))                                  /* медиана от три */\n        return lt(a[mid], a[hi]) ? mid : (lt(a[lo], a[hi]) ? hi : lo);\n    return lt(a[lo], a[hi]) ? lo : (lt(a[mid], a[hi]) ? hi : mid);\n}\n\n/* Разделяне на Lomuto: опорният отива в a[hi], после на мястото си */\nstatic int partition(int a[], int lo, int hi, int mode)\n{\n    int p = choose_pivot(a, lo, hi, mode);\n    swap(&a[p], &a[hi]);\n    int pivot = a[hi], i = lo;\n    for (int j = lo; j < hi; j++) {\n        if (!lt(pivot, a[j])) {   /* a[j] <= pivot */\n            swap(&a[i], &a[j]);\n            i++;\n        }\n    }\n    swap(&a[i], &a[hi]);\n    return i;\n}\n\nvoid quick_sort(int a[], int lo, int hi, int mode)\n{\n    if (lo >= hi)\n        return;\n    if (++g_depth > g_maxdepth) g_maxdepth = g_depth;\n    int p = partition(a, lo, hi, mode);\n    quick_sort(a, lo, p - 1, mode);\n    quick_sort(a, p + 1, hi, mode);\n    g_depth--;\n}",
  "tags": {
   "choose": [
    19
   ],
   "tolast": [
    20
   ],
   "pinit": [
    21
   ],
   "ploop": [
    22
   ],
   "pcmp": [
    23
   ],
   "pswap": [
    24
   ],
   "pfinal": [
    28
   ],
   "enter": [
    33
   ],
   "base": [
    34
   ],
   "part": [
    37
   ],
   "left": [
    38
   ],
   "right": [
    39
   ]
  }
 },
 "ch07_selection": {
  "file": "07_sorting.c",
  "code": "/* Пряк избор: на позиция i поставяме минимума на a[i..n-1].\n   Θ(n²) сравнения ВИНАГИ; ≤ n−1 размени. Не е стабилно. */\nvoid selection_sort(item a[], int n)\n{\n    for (int i = 0; i < n - 1; i++) {\n        int m = i;\n        for (int j = i + 1; j < n; j++)\n            if (less(a[j], a[m]))\n                m = j;\n        if (m != i)\n            swap(&a[i], &a[m]);\n    }\n}",
  "tags": {
   "outer": [
    5
   ],
   "minit": [
    6
   ],
   "inner": [
    7
   ],
   "cmp": [
    8
   ],
   "newmin": [
    9
   ],
   "test": [
    10
   ],
   "swap": [
    11
   ]
  }
 },
 "ch07_bubble": {
  "file": "07_sorting.c",
  "code": "/* Мехурче с ранно спиране: ако в прохода няма размяна — готово.\n   Най-добър случай (сортиран) Θ(n); най-лош Θ(n²). Стабилно. */\nvoid bubble_sort(item a[], int n)\n{\n    for (int end = n - 1; end > 0; end--) {\n        int swapped = 0;\n        for (int j = 0; j < end; j++)\n            if (less(a[j + 1], a[j])) {\n                swap(&a[j], &a[j + 1]);\n                swapped = 1;\n            }\n        if (!swapped)\n            break;\n    }\n}",
  "tags": {
   "outer": [
    5
   ],
   "flag": [
    6
   ],
   "inner": [
    7
   ],
   "cmp": [
    8
   ],
   "swap": [
    9
   ],
   "early": [
    12
   ],
   "stop": [
    13
   ]
  }
 },
 "ch07_insertion": {
  "file": "07_sorting.c",
  "code": "/* Вмъкване (намаляване на размера): подреденото a[0..i-1]\n   се допълва чрез вмъкване на a[i]. Стабилно, на място. */\nvoid insertion_sort(item a[], int n)\n{\n    for (int i = 1; i < n; i++) {\n        item x = a[i];\n        int j = i - 1;\n        while (j >= 0 && less(x, a[j])) {\n            a[j + 1] = a[j]; g_wr++;\n            j--;\n        }\n        a[j + 1] = x; g_wr++;\n    }\n}",
  "tags": {
   "outer": [
    5
   ],
   "take": [
    6
   ],
   "cmp": [
    8
   ],
   "shift": [
    9
   ],
   "put": [
    12
   ]
  }
 },
 "ch07_merge": {
  "file": "07_sorting.c",
  "code": "/* Сливане (top-down, буфер tmp): Θ(n log n) винаги, Θ(n) памет.\n   a[i] <= a[j] (а не <) пази стабилността. */\nstatic void ms_rec(item a[], item tmp[], int lo, int hi)\n{\n    if (hi - lo < 2) return;\n    int mid = lo + (hi - lo) / 2;\n    ms_rec(a, tmp, lo, mid);\n    ms_rec(a, tmp, mid, hi);\n    int i = lo, j = mid, k = lo;\n    while (i < mid && j < hi) {\n        if (!less(a[j], a[i]))   /* a[i] <= a[j] */\n            tmp[k++] = a[i++];\n        else\n            tmp[k++] = a[j++];\n        g_wr++;\n    }\n    while (i < mid) { tmp[k++] = a[i++]; g_wr++; }\n    while (j < hi)  { tmp[k++] = a[j++]; g_wr++; }\n    for (k = lo; k < hi; k++) { a[k] = tmp[k]; g_wr++; }\n}\nvoid merge_sort(item a[], int n)\n{\n    item *tmp = malloc((size_t)(n > 0 ? n : 1) * sizeof *tmp);\n    if (!tmp) return;\n    ms_rec(a, tmp, 0, n);\n    free(tmp);\n}",
  "tags": {
   "base": [
    5
   ],
   "split": [
    6
   ],
   "minit": [
    9
   ],
   "cmp": [
    11
   ],
   "takeL": [
    12
   ],
   "takeR": [
    14
   ],
   "rest": [
    17,
    18
   ],
   "back": [
    19
   ]
  }
 },
 "ch07_quick": {
  "file": "07_sorting.c",
  "code": "/* Бързо (Lomuto, опорен = средният елемент, преместен в края).\n   Средно Θ(n log n), най-лошо Θ(n²). Не е стабилно. */\nstatic void qs_rec(item a[], int lo, int hi)\n{\n    if (lo >= hi) return;\n    int mid = lo + (hi - lo) / 2;\n    swap(&a[mid], &a[hi]);\n    int i = lo;\n    for (int j = lo; j < hi; j++)\n        if (!less(a[hi], a[j])) {  /* a[j] <= pivot */\n            swap(&a[i], &a[j]);\n            i++;\n        }\n    swap(&a[i], &a[hi]);\n    qs_rec(a, lo, i - 1);\n    qs_rec(a, i + 1, hi);\n}\nvoid quick_sort(item a[], int n) { qs_rec(a, 0, n - 1); }",
  "tags": {
   "base": [
    5
   ],
   "pivot": [
    7
   ],
   "loop": [
    9
   ],
   "cmp": [
    10
   ],
   "swap": [
    11
   ],
   "place": [
    14
   ],
   "rec": [
    15,
    16
   ]
  }
 },
 "ch07_heap": {
  "file": "07_sorting.c",
  "code": "/* Пирамидално: строим max-пирамида, после n−1 пъти\n   местим максимума в края. O(n log n) винаги (Θ(n log n) при различни\n   ключове; при всички равни — Θ(n)), на място, не е стабилно. */\nstatic void sift_down(item a[], int k, int n)\n{\n    for (;;) {\n        int c = 2 * k + 1;\n        if (c >= n) return;\n        if (c + 1 < n && less(a[c], a[c + 1]))\n            c++;\n        if (!less(a[k], a[c])) return;\n        swap(&a[k], &a[c]);\n        k = c;\n    }\n}\nvoid heap_sort(item a[], int n)\n{\n    for (int k = n / 2 - 1; k >= 0; k--)\n        sift_down(a, k, n);\n    for (int end = n - 1; end > 0; end--) {\n        swap(&a[0], &a[end]);\n        sift_down(a, 0, end);\n    }\n}",
  "tags": {
   "child": [
    7
   ],
   "cmp2": [
    9
   ],
   "cmp": [
    11
   ],
   "swap": [
    12
   ],
   "build": [
    18
   ],
   "extract": [
    20
   ],
   "top": [
    21
   ]
  }
 },
 "ch07_shell": {
  "file": "07_sorting.c",
  "code": "/* Shell (стъпки на Кнут 1, 4, 13, 40, …): вмъкване между елементи на\n   разстояние h, после h намалява до 1. Последният проход е обикновено\n   вмъкване, но върху почти подреден масив. Не е стабилно. */\nvoid shell_sort(item a[], int n)\n{\n    int h = 1;\n    while (h < n / 3) h = 3 * h + 1;\n    for (; h >= 1; h /= 3)\n        for (int i = h; i < n; i++) {\n            item x = a[i];\n            int j = i;\n            while (j >= h && less(x, a[j - h])) {\n                a[j] = a[j - h]; g_wr++;\n                j -= h;\n            }\n            a[j] = x; g_wr++;\n        }\n}",
  "tags": {
   "gap": [
    8
   ],
   "outer": [
    9
   ],
   "take": [
    10
   ],
   "cmp": [
    12
   ],
   "shift": [
    13
   ],
   "put": [
    16
   ]
  }
 },
 "ch07_cocktail": {
  "file": "07_sorting.c",
  "code": "/* Шейкър (двупосочно мехурче): проход напред изкарва максимума вдясно,\n   проход назад — минимума вляво. Стабилно, Θ(n²) най-лошо, Θ(n) най-добро. */\nvoid cocktail_sort(item a[], int n)\n{\n    int lo = 0, hi = n - 1;\n    for (;;) {\n        int swapped = 0;\n        for (int j = lo; j < hi; j++)\n            if (less(a[j + 1], a[j])) {\n                swap(&a[j], &a[j + 1]);\n                swapped = 1;\n            }\n        hi--;\n        if (!swapped) break;\n        swapped = 0;\n        for (int j = hi; j > lo; j--)\n            if (less(a[j], a[j - 1])) {\n                swap(&a[j - 1], &a[j]);\n                swapped = 1;\n            }\n        lo++;\n        if (!swapped) break;\n    }\n}",
  "tags": {
   "fwd": [
    7
   ],
   "cmp": [
    9
   ],
   "swap": [
    10
   ],
   "stop": [
    14
   ],
   "back": [
    15
   ],
   "cmpb": [
    17
   ],
   "swapb": [
    18
   ],
   "stopb": [
    22
   ]
  }
 },
 "ch07_comb": {
  "file": "07_sorting.c",
  "code": "/* Comb (гребен): мехурче с разстояние gap, което намалява ×10/13.\n   Далечните размени бързо махат малки стойности от края. Не е стабилно. */\nvoid comb_sort(item a[], int n)\n{\n    int gap = n, sorted = 0;\n    while (!sorted) {\n        gap = gap * 10 / 13;\n        if (gap <= 1) { gap = 1; sorted = 1; }\n        for (int i = 0; i + gap < n; i++)\n            if (less(a[i + gap], a[i])) {\n                swap(&a[i], &a[i + gap]);\n                sorted = 0;\n            }\n    }\n}",
  "tags": {
   "gap": [
    7
   ],
   "cmp": [
    10
   ],
   "swap": [
    11
   ]
  }
 },
 "ch07_gnome": {
  "file": "07_sorting.c",
  "code": "/* Gnome (градинарско джудже): върви напред, докато двойката е наред;\n   иначе разменя и се връща една позиция. Стабилно, Θ(n²) най-лошо. */\nvoid gnome_sort(item a[], int n)\n{\n    int pos = 0;\n    while (pos < n) {\n        if (pos == 0 || !less(a[pos], a[pos - 1]))\n            pos++;\n        else {\n            swap(&a[pos], &a[pos - 1]);\n            pos--;\n        }\n    }\n}",
  "tags": {
   "cmp": [
    7
   ],
   "fwd": [
    8
   ],
   "swap": [
    10
   ]
  }
 },
 "ch07_counting": {
  "file": "07_sorting.c",
  "code": "/* Броене: k = max − min + 1 брояча; без сравнения между елементите\n   при подреждането (сравненията са само за min/max). Θ(n + k), стабилно. */\nvoid counting_sort(item a[], int n)\n{\n    int mn, mx;\n    key_range(a, n, &mn, &mx);\n    int k = mx - mn + 1;\n    int *cnt = calloc((size_t)k, sizeof *cnt);\n    item *tmp = malloc((size_t)n * sizeof *tmp);\n    if (!cnt || !tmp) { free(cnt); free(tmp); return; }\n    for (int i = 0; i < n; i++)\n        cnt[a[i].key - mn]++;\n    for (int v = 1; v < k; v++)\n        cnt[v] += cnt[v - 1];\n    for (int i = n - 1; i >= 0; i--) {              /* отзад напред: стабилност */\n        tmp[--cnt[a[i].key - mn]] = a[i]; g_wr++;\n    }\n    for (int i = 0; i < n; i++) { a[i] = tmp[i]; g_wr++; }\n    free(cnt); free(tmp);\n}",
  "tags": {
   "range": [
    6
   ],
   "count": [
    12
   ],
   "prefix": [
    14
   ],
   "place": [
    16
   ],
   "back": [
    18
   ]
  }
 },
 "ch07_radix": {
  "file": "07_sorting.c",
  "code": "/* Поразредно LSD (основа 10) върху key − min: за всяка цифра от\n   младшата към старшата — стабилно броене по тази цифра. Θ(d·(n + 10)). */\nvoid radix_sort(item a[], int n)\n{\n    int mn, mx;\n    key_range(a, n, &mn, &mx);\n    int range = mx - mn;\n    item *tmp = malloc((size_t)n * sizeof *tmp);\n    if (!tmp) return;\n    for (int e = 1; ; e *= 10) {\n        int cnt[10] = {0};\n        for (int i = 0; i < n; i++)\n            cnt[(a[i].key - mn) / e % 10]++;\n        for (int d = 1; d < 10; d++)\n            cnt[d] += cnt[d - 1];\n        for (int i = n - 1; i >= 0; i--) {\n            tmp[--cnt[(a[i].key - mn) / e % 10]] = a[i]; g_wr++;\n        }\n        for (int i = 0; i < n; i++) { a[i] = tmp[i]; g_wr++; }\n        if (range / e < 10) break;\n    }\n    free(tmp);\n}",
  "tags": {
   "range": [
    6
   ],
   "digit": [
    10
   ],
   "count": [
    13
   ],
   "place": [
    17
   ],
   "back": [
    19
   ],
   "last": [
    20
   ]
  }
 },
 "ch07_merge_bu": {
  "file": "07_sorting.c",
  "code": "/* Сливане отдолу нагоре (итеративно): серии с дължина 1, 2, 4, …\n   се сливат по двойки. Без рекурсия; същите сравнения като top-down\n   при n = 2^k. Стабилно, Θ(n) памет. */\nvoid merge_bu_sort(item a[], int n)\n{\n    item *tmp = malloc((size_t)(n > 0 ? n : 1) * sizeof *tmp);\n    if (!tmp) return;\n    for (int w = 1; w < n; w *= 2)\n        for (int lo = 0; lo < n - w; lo += 2 * w) {\n            int mid = lo + w, hi = lo + 2 * w < n ? lo + 2 * w : n;\n            int i = lo, j = mid, k = lo;\n            while (i < mid && j < hi) {\n                if (!less(a[j], a[i]))\n                    tmp[k++] = a[i++];\n                else\n                    tmp[k++] = a[j++];\n                g_wr++;\n            }\n            while (i < mid) { tmp[k++] = a[i++]; g_wr++; }\n            while (j < hi)  { tmp[k++] = a[j++]; g_wr++; }\n            for (k = lo; k < hi; k++) { a[k] = tmp[k]; g_wr++; }\n        }\n    free(tmp);\n}",
  "tags": {
   "width": [
    8
   ],
   "minit": [
    11
   ],
   "cmp": [
    13
   ],
   "takeL": [
    14
   ],
   "takeR": [
    16
   ],
   "rest": [
    19,
    20
   ],
   "back": [
    21
   ]
  }
 },
 "ch07_quick3": {
  "file": "07_sorting.c",
  "code": "/* Бързо с трипосочно разделяне (Дейкстра): < p | = p | > p.\n   Равните на опорния не влизат в рекурсията — при много повторения\n   работата пада до Θ(n·броя различни ключове). Не е стабилно. */\nstatic void q3_rec(item a[], int lo, int hi)\n{\n    if (lo >= hi) return;\n    item p = a[lo + (hi - lo) / 2];\n    int lt = lo, i = lo, gt = hi;\n    while (i <= gt) {\n        if (less(a[i], p)) {\n            swap(&a[lt], &a[i]);\n            lt++; i++;\n        } else if (less(p, a[i])) {\n            swap(&a[i], &a[gt]);\n            gt--;\n        } else\n            i++;\n    }\n    q3_rec(a, lo, lt - 1);\n    q3_rec(a, gt + 1, hi);\n}\nvoid quick3_sort(item a[], int n) { q3_rec(a, 0, n - 1); }",
  "tags": {
   "base": [
    6
   ],
   "pivot": [
    7
   ],
   "cmp": [
    10
   ],
   "swl": [
    11
   ],
   "cmp2": [
    13
   ],
   "swg": [
    14
   ],
   "eq": [
    17
   ],
   "rec": [
    19
   ]
  }
 },
 "ch08_iv_end": {
  "file": "08_greedy.c",
  "code": "/* Оптимален алчен избор: сортираме по нарастващ край и вземаме\n   всеки интервал, чието начало е >= края на последния избран. */\nstatic int cmp_end(const void *pa, const void *pb)\n{\n    const Interval *a = pa, *b = pb;\n    if (a->e != b->e) return a->e < b->e ? -1 : 1;\n    return a->id - b->id;\n}\n\nint select_by_end(const Interval in[], int n, int chosen[])\n{\n    Interval v[MAXN];\n    memcpy(v, in, (size_t)n * sizeof v[0]);\n    qsort(v, (size_t)n, sizeof v[0], cmp_end);\n    int m = 0;\n    int last_end = INT_MIN;\n    for (int i = 0; i < n; i++) {\n        if (v[i].s < last_end)\n            continue;        /* пресича последния */\n        chosen[m++] = v[i].id;\n        last_end = v[i].e;\n    }\n    return m;\n}",
  "tags": {
   "sort": [
    14
   ],
   "init": [
    16
   ],
   "loop": [
    17
   ],
   "cmp": [
    18
   ],
   "skip": [
    19
   ],
   "take": [
    20,
    21
   ],
   "ret": [
    23
   ]
  }
 },
 "ch08_iv_key": {
  "file": "08_greedy.c",
  "code": "/* Общ шаблон „сортирай по ключ, вземи всичко съвместимо“.\n   Ключът е стратегията: начало, дължина или брой конфликти.\n   Без сортиране по край трябва да се проверяват ВСИЧКИ избрани. */\nint select_by_key(const Interval in[], int n, int strategy, int chosen[])\n{\n    Interval v[MAXN];\n    for (int i = 0; i < n; i++) {\n        v[i] = in[i];\n        if (strategy == BY_START)      v[i].key = in[i].s;\n        else if (strategy == BY_LEN)   v[i].key = in[i].e - in[i].s;\n        else if (strategy == BY_CONFLICTS) {\n            v[i].key = 0;\n            for (int j = 0; j < n; j++)\n                if (j != i && overlap(&in[i], &in[j])) v[i].key++;\n        } else                         v[i].key = in[i].e;\n    }\n    qsort(v, (size_t)n, sizeof v[0], cmp_key);\n    int m = 0;\n    for (int i = 0; i < n; i++) {\n        bool ok = true;\n        for (int j = 0; j < m && ok; j++)\n            if (overlap(&v[i], &in[chosen[j]])) ok = false;\n        if (!ok)\n            continue;\n        chosen[m++] = v[i].id;\n    }\n    return m;\n}",
  "tags": {
   "key": [
    7
   ],
   "sort": [
    17
   ],
   "init": [
    18
   ],
   "loop": [
    19
   ],
   "cmp": [
    21
   ],
   "skip": [
    24
   ],
   "take": [
    25
   ],
   "ret": [
    27
   ]
  }
 },
 "ch08_coins_greedy": {
  "file": "08_greedy.c",
  "code": "/* d[0] < d[1] < ... < d[k-1]. Алчно: всеки път най-голямата\n   монета, която още се побира. Връща броя монети или -1. */\nint coins_greedy(const int d[], int k, int amount, int used[])\n{\n    int cnt = 0;\n    for (int i = k - 1; i >= 0; i--) {\n        while (amount >= d[i]) {\n            amount -= d[i];\n            used[cnt++] = d[i];\n        }\n    }\n    return amount == 0 ? cnt : -1;  /* -1: остатъкът не може да се плати */\n}",
  "tags": {
   "enter": [
    5
   ],
   "loop": [
    6
   ],
   "cmp": [
    7
   ],
   "take": [
    8,
    9
   ],
   "ret": [
    12
   ]
  }
 },
 "ch08_coins_dp": {
  "file": "08_greedy.c",
  "code": "/* Оптимум (динамично програмиране): best[s] = минимален брой\n   монети за сума s; best[s] = 1 + min best[s - d[i]] по d[i] <= s. */\nint coins_dp(const int d[], int k, int amount, int best[])\n{\n    best[0] = 0;\n    for (int s = 1; s <= amount; s++) {\n        best[s] = INF;\n        for (int i = 0; i < k; i++)\n            if (d[i] <= s && best[s - d[i]] + 1 < best[s])\n                best[s] = best[s - d[i]] + 1;\n    }\n    return best[amount] >= INF ? -1 : best[amount];\n}",
  "tags": {
   "base": [
    5
   ],
   "outer": [
    6
   ],
   "inner": [
    8
   ],
   "cmp": [
    9
   ],
   "upd": [
    10
   ],
   "ret": [
    12
   ]
  }
 },
 "ch08_dijkstra": {
  "file": "08_greedy.c",
  "code": "/* Дейкстра, O(V^2): всеки път най-близкият непосетен връх.\n   Коректен само при НЕОТРИЦАТЕЛНИ тегла. */\nvoid dijkstra(const int w[V][V], int src, int dist[V], int prev[V])\n{\n    bool visited[V];\n    for (int v = 0; v < V; v++) {\n        dist[v] = INF; prev[v] = -1; visited[v] = false;\n    }\n    dist[src] = 0;\n    for (int it = 0; it < V; it++) {\n        int u = -1;\n        for (int v = 0; v < V; v++)\n            if (!visited[v] && (u < 0 || dist[v] < dist[u])) u = v;\n        if (dist[u] == INF) break;  /* останалите са недостижими */\n        visited[u] = true;          /* dist[u] се смята за окончателно */\n        for (int v = 0; v < V; v++)\n            if (w[u][v] != NOEDGE && !visited[v] && dist[u] + w[u][v] < dist[v]) {\n                dist[v] = dist[u] + w[u][v];\n                prev[v] = u;\n            }\n    }\n}",
  "tags": {
   "init": [
    6,
    9
   ],
   "outer": [
    10
   ],
   "pick": [
    12,
    13
   ],
   "unreach": [
    14
   ],
   "visit": [
    15
   ],
   "scan": [
    16
   ],
   "relax": [
    17
   ],
   "upd": [
    18,
    19
   ]
  }
 },
 "ch09_fib_naive": {
  "file": "09_dp.c",
  "code": "/* Наивна рекурсия: Θ(φ^n) извиквания — едни и същи\n   подзадачи се пресмятат отново и отново. */\nlong long fib_naive(int n)\n{\n    calls++;\n    if (n < 2)\n        return n;\n    long long a = fib_naive(n - 1);\n    long long b = fib_naive(n - 2);\n    return a + b;\n}",
  "tags": {
   "enter": [
    5
   ],
   "base": [
    6,
    7
   ],
   "left": [
    8
   ],
   "right": [
    9
   ],
   "ret": [
    10
   ]
  }
 },
 "ch09_fib_memo": {
  "file": "09_dp.c",
  "code": "/* Мемоизация (отгоре надолу): memo[k] == -1 означава\n   „още не е пресметнато“. Θ(n) време и Θ(n) памет. */\nlong long fib_memo(int n, long long memo[])\n{\n    calls++;\n    if (memo[n] != -1)\n        return memo[n];      /* от кеша */\n    if (n < 2)\n        return memo[n] = n;\n    long long a = fib_memo(n - 1, memo);\n    long long b = fib_memo(n - 2, memo);\n    memo[n] = a + b;\n    return memo[n];\n}\n\nlong long fib_memo_start(int n)\n{\n    long long memo[100];\n    for (int k = 0; k <= n; k++) memo[k] = -1;\n    return fib_memo(n, memo);\n}",
  "tags": {
   "enter": [
    5
   ],
   "hit": [
    6,
    7
   ],
   "base": [
    8,
    9
   ],
   "left": [
    10
   ],
   "right": [
    11
   ],
   "ret": [
    12,
    13
   ],
   "init": [
    19
   ]
  }
 },
 "ch09_fib_table": {
  "file": "09_dp.c",
  "code": "/* Таблично (отдолу нагоре): редът 0, 1, 2, ... гарантира,\n   че F[i-1] и F[i-2] са готови. Θ(n) време, Θ(n) памет. */\nlong long fib_table(int n)\n{\n    long long F[100];\n    F[0] = 0;\n    if (n > 0) F[1] = 1;\n    for (int i = 2; i <= n; i++)\n        F[i] = F[i - 1] + F[i - 2];\n    return F[n];\n}",
  "tags": {
   "init": [
    6,
    7
   ],
   "loop": [
    8
   ],
   "step": [
    9
   ],
   "ret": [
    10
   ]
  }
 },
 "ch09_fib_two": {
  "file": "09_dp.c",
  "code": "/* Пазим само последните две стойности: Θ(1) допълнителна памет. */\nlong long fib_two(int n)\n{\n    long long prev = 0, cur = 1;     /* F(0), F(1) */\n    if (n == 0) return 0;\n    for (int i = 2; i <= n; i++) {\n        long long next = prev + cur;\n        prev = cur;\n        cur = next;\n    }\n    return cur;\n}",
  "tags": {
   "init": [
    4
   ],
   "zero": [
    5
   ],
   "loop": [
    6
   ],
   "step": [
    7
   ],
   "shift": [
    8,
    9
   ],
   "ret": [
    11
   ]
  }
 },
 "ch09_knap2d": {
  "file": "09_dp.c",
  "code": "/* D[i][c] — максимална стойност от първите i предмета\n   при вместимост c. Всеки предмет — най-много веднъж. */\nint knapsack(const int w[], const int v[], int n, int W)\n{\n    for (int c = 0; c <= W; c++)\n        D[0][c] = 0;\n    for (int i = 1; i <= n; i++)\n        for (int c = 0; c <= W; c++) {\n            D[i][c] = D[i - 1][c];      /* не взимаме i */\n            if (w[i - 1] <= c) {\n                int take = v[i - 1] + D[i - 1][c - w[i - 1]];\n                if (take > D[i][c])\n                    D[i][c] = take;\n            }\n        }\n    return D[n][W];\n}\n\n/* Обратно проследяване: кои предмети са взети */\nint knapsack_items(const int w[], int n, int W, int taken[])\n{\n    int m = 0, c = W;\n    for (int i = n; i >= 1; i--)\n        if (D[i][c] != D[i - 1][c]) {   /* i е взет */\n            taken[m++] = i;\n            c -= w[i - 1];\n        }\n    return m;\n}",
  "tags": {
   "base": [
    6
   ],
   "row": [
    7
   ],
   "cell": [
    8
   ],
   "skip": [
    9
   ],
   "fits": [
    10
   ],
   "take": [
    11
   ],
   "cmp": [
    12
   ],
   "upd": [
    13
   ],
   "ret": [
    16
   ],
   "tb": [
    23
   ],
   "tbcmp": [
    24
   ],
   "tbtake": [
    25,
    26
   ]
  }
 },
 "ch09_knap1d": {
  "file": "09_dp.c",
  "code": "/* Едномерен масив: dp[c] е редът D(i, c) „на място“.\n   down = 1: c надолу — всеки предмет най-много веднъж (0/1);\n   down = 0: c нагоре — dp[c - w] вече съдържа предмет i,\n             т.е. той се ползва многократно (неограничена раница). */\nint knapsack_1d(const int w[], const int v[], int n, int W, int down)\n{\n    int dp[MAXW + 1];\n    for (int c = 0; c <= W; c++) dp[c] = 0;\n    for (int i = 0; i < n; i++) {\n        if (down) {\n            for (int c = W; c >= w[i]; c--)\n                if (v[i] + dp[c - w[i]] > dp[c])\n                    dp[c] = v[i] + dp[c - w[i]];\n        } else {\n            for (int c = w[i]; c <= W; c++)\n                if (v[i] + dp[c - w[i]] > dp[c])\n                    dp[c] = v[i] + dp[c - w[i]];\n        }\n    }\n    return dp[W];\n}",
  "tags": {
   "init": [
    8
   ],
   "item": [
    9
   ],
   "down": [
    11
   ],
   "cmp": [
    12,
    16
   ],
   "upd": [
    13,
    17
   ],
   "up": [
    15
   ],
   "ret": [
    20
   ]
  }
 },
 "ch10_queens": {
  "file": "10_more.c",
  "code": "/* N дами: col[r] = колоната на дамата в ред r. */\nstatic int N, col[MAXN];\nstatic long placed, pruned, solutions;\nstatic int first_only, stop;\n\n/* Ред на дамата, която атакува клетка (row, c), или -1. */\nstatic int attacker(int row, int c)\n{\n    for (int r = 0; r < row; r++)\n        if (col[r] == c || abs(col[r] - c) == row - r)\n            return r;            /* същата колона или диагонал */\n    return -1;\n}\n\nstatic void place(int row)\n{\n    if (row == N) {\n        solutions++;\n        if (first_only) stop = 1;\n        return;\n    }\n    for (int c = 0; c < N && !stop; c++) {\n        if (attacker(row, c) >= 0) {\n            pruned++;      /* отрязан клон */\n            continue;\n        }\n        col[row] = c; placed++;\n        place(row + 1);\n        col[row] = -1;     /* връщане назад */\n    }\n}",
  "tags": {
   "enter": [
    16
   ],
   "sol": [
    17,
    18
   ],
   "try": [
    22
   ],
   "conflict": [
    23,
    24
   ],
   "place": [
    27
   ],
   "recurse": [
    28
   ],
   "back": [
    29
   ]
  }
 },
 "ch10_bb": {
  "file": "10_more.c",
  "code": "/* Минимална обиколка от град 0. d[i][j] >= 0. */\nstatic int n, d[MAXC][MAXC], minOut[MAXC];\nstatic int path[MAXC], used[MAXC], best, bestPath[MAXC];\nstatic long nodes, cut, tours;\n\n/* Оптимистична (долна) граница: изминатото + по едно\n   най-евтино изходящо ребро от последния и от всеки непосетен град. */\nstatic int bound(int depth, int cost)\n{\n    int b = cost + minOut[path[depth - 1]];\n    for (int v = 0; v < n; v++)\n        if (!used[v]) b += minOut[v];\n    return b;\n}\n\nstatic void bb(int depth, int cost)\n{\n    nodes++;\n    if (depth == n) {                                /* пълна обиколка */\n        int total = cost + d[path[n - 1]][0];\n        tours++;\n        if (total < best) {\n            best = total;\n            for (int i = 0; i < n; i++) bestPath[i] = path[i];\n        }\n        return;\n    }\n    if (bound(depth, cost) >= best) {\n        cut++;            /* клонът не може да подобри best */\n        return;\n    }\n    for (int v = 1; v < n; v++)\n        if (!used[v]) {\n            used[v] = 1; path[depth] = v;\n            bb(depth + 1, cost + d[path[depth - 1]][v]);\n            used[v] = 0;\n        }\n}",
  "tags": {
   "bound": [
    10,
    12
   ],
   "enter": [
    17
   ],
   "leaf": [
    20,
    22
   ],
   "best": [
    23
   ],
   "prune": [
    28,
    29
   ],
   "branch": [
    32,
    35
   ]
  }
 },
 "ch10_rqs": {
  "file": "10_more.c",
  "code": "static long cmps;            /* брой сравнения — случайна величина */\nstatic int randomized = 1;\n\nstatic void rqs(int a[], int lo, int hi)\n{\n    if (lo >= hi) return;\n    int p = randomized ? lo + (int)(rnd() % (uint32_t)(hi - lo + 1))\n                       : hi;       /* детерминиран: последният */\n    swap(&a[p], &a[hi]);\n    int x = a[hi], i = lo;\n    for (int j = lo; j < hi; j++) {\n        cmps++;\n        if (a[j] < x) swap(&a[i++], &a[j]);\n    }\n    swap(&a[i], &a[hi]);\n    rqs(a, lo, i - 1);\n    rqs(a, i + 1, hi);\n}\n/* Резултатът е ВИНАГИ сортиран (Las Vegas);\n   случаен е само броят сравнения (времето). */",
  "tags": {
   "pivot": [
    7
   ],
   "cmp": [
    12
   ],
   "rec": [
    16,
    17
   ]
  }
 },
 "ch10_fermat": {
  "file": "10_more.c",
  "code": "/* Модулно степенуване: a^e mod m за O(log e) умножения. m < 2^32. */\nuint64_t powmod(uint64_t a, uint64_t e, uint64_t m)\n{\n    uint64_t r = 1 % m;\n    a %= m;\n    while (e > 0) {\n        if (e & 1) r = r * a % m;\n        a = a * a % m;\n        e >>= 1;\n    }\n    return r;\n}\n\n/* Тест на Ферма: 0 = сигурно съставно, 1 = \"вероятно просто\". */\nint fermat(uint64_t n, const uint64_t base[], int k)\n{\n    for (int i = 0; i < k; i++) {\n        uint64_t a = base[i];\n        if (powmod(a, n - 1, n) != 1)\n            return 0;      /* a е свидетел */\n    }\n    return 1;              /* грешка е възможна */\n}",
  "tags": {
   "loop": [
    6
   ],
   "mul": [
    7
   ],
   "sq": [
    8
   ],
   "ret": [
    11
   ],
   "pick": [
    18
   ],
   "test": [
    19
   ],
   "witness": [
    20
   ],
   "prob": [
    22
   ]
  }
 },
 "ch10_mr": {
  "file": "10_more.c",
  "code": "/* Милър–Рабин: n - 1 = d * 2^s, d нечетно.  (powmod — виж теста на Ферма) */\nint miller_rabin(uint64_t n, const uint64_t base[], int k)\n{\n    uint64_t d = n - 1; int s = 0;\n    while ((d & 1) == 0) { d >>= 1; s++; }\n    for (int i = 0; i < k; i++) {\n        uint64_t x = powmod(base[i], d, n);\n        if (x == 1 || x == n - 1) continue;\n        int r;\n        for (r = 1; r < s; r++) {\n            x = x * x % n;\n            if (x == n - 1) break;\n        }\n        if (r == s) return 0;   /* свидетел */\n    }\n    return 1;                   /* вероятно просто */\n}",
  "tags": {
   "split": [
    5
   ],
   "pick": [
    7
   ],
   "pass": [
    8
   ],
   "sq": [
    11,
    12
   ],
   "witness": [
    14
   ],
   "prob": [
    16
   ]
  }
 },
 "ch10_insertion": {
  "file": "10_more.c",
  "code": "/* a[0..i-1] вече е сортиран (по-малката задача);\n   вмъкваме a[i] — задачата нараства с 1 елемент. */\nvoid insertion_sort(int a[], int len)\n{\n    for (int i = 1; i < len; i++) {\n        int x = a[i], j = i - 1;\n        while (j >= 0 && a[j] > x) {\n            a[j + 1] = a[j];\n            j--;\n        }\n        a[j + 1] = x;\n    }\n}",
  "tags": {
   "grow": [
    5
   ],
   "insert": [
    11
   ]
  }
 },
 "ch10_dup_naive": {
  "file": "10_more.c",
  "code": "/* Наивно: всяка двойка (i, j) — O(n^2) сравнения. */\nint has_dup_naive(const int a[], int len, long *cmp)\n{\n    for (int i = 0; i < len; i++)\n        for (int j = i + 1; j < len; j++) {\n            ++*cmp;\n            if (a[i] == a[j]) return 1;\n        }\n    return 0;\n}",
  "tags": {
   "outer": [
    4
   ],
   "cmp": [
    6
   ],
   "found": [
    7
   ],
   "none": [
    9
   ]
  }
 },
 "ch10_dup_presort": {
  "file": "10_more.c",
  "code": "/* Предварително сортиране: O(n log n) + O(n) обхождане.\n   Равните елементи стават СЪСЕДНИ. */\nint has_dup_presort(int a[], int len, long *cmp)\n{\n    merge_sort(a, len, cmp);     /* цената влиза в анализа */\n    for (int i = 0; i + 1 < len; i++) {\n        ++*cmp;\n        if (a[i] == a[i + 1]) return 1;\n    }\n    return 0;\n}",
  "tags": {
   "sort": [
    5
   ],
   "cmp": [
    7
   ],
   "found": [
    8
   ],
   "none": [
    10
   ]
  }
 },
 "ch10_mitm": {
  "file": "10_more.c",
  "code": "typedef struct { long sum; unsigned mask; } Item;\n\nstatic int by_sum(const void *p, const void *q)\n{\n    const Item *a = p, *b = q;\n    if (a->sum != b->sum) return a->sum < b->sum ? -1 : 1;\n    return a->mask < b->mask ? -1 : a->mask > b->mask;\n}\n\n/* Има ли подмножество на x[0..n-1] със сума T? */\nint mitm(const long x[], int n, long T, unsigned *ma, unsigned *mb, long *probes)\n{\n    int h = n / 2, m = n - h, na = 1 << h, nb = 1 << m, ok = 0;\n    Item *A = malloc(sizeof *A * (size_t)na), *B = malloc(sizeof *B * (size_t)nb);\n    if (!A || !B) { free(A); free(B); return -1; }\n    for (int s = 0; s < na; s++) {                   /* суми на лявата половина */\n        A[s].sum = 0; A[s].mask = (unsigned)s;\n        for (int i = 0; i < h; i++) if (s >> i & 1) A[s].sum += x[i];\n    }\n    for (int s = 0; s < nb; s++) {                   /* суми на дясната половина */\n        B[s].sum = 0; B[s].mask = (unsigned)s;\n        for (int i = 0; i < m; i++) if (s >> i & 1) B[s].sum += x[h + i];\n    }\n    qsort(B, (size_t)nb, sizeof *B, by_sum);\n    for (int s = 0; s < na && !ok; s++) {\n        long need = T - A[s].sum;\n        int lo = 0, hi = nb;                         /* двоично търсене */\n        while (lo < hi) {\n            int mid = (lo + hi) / 2; ++*probes;\n            if (B[mid].sum < need) lo = mid + 1; else hi = mid;\n        }\n        if (lo < nb && B[lo].sum == need) {\n            *ma = A[s].mask; *mb = B[lo].mask; ok = 1;\n        }\n    }\n    free(A); free(B);\n    return ok;\n}",
  "tags": {
   "enumA": [
    18
   ],
   "enumB": [
    22
   ],
   "sort": [
    24
   ],
   "need": [
    26
   ],
   "probe": [
    29
   ],
   "check": [
    32
   ],
   "found": [
    33
   ],
   "ret": [
    37
   ]
  }
 },
 "ch10_nn": {
  "file": "10_more.c",
  "code": "/* Алчна евристика \"най-близък съсед\" за TSP — без гаранция. */\nint nn_tour(int cities, int m[][MAXC], int tour[])\n{\n    int seen[MAXC] = {0}, cur = 0, cost = 0;\n    seen[0] = 1; tour[0] = 0;\n    for (int k = 1; k < cities; k++) {\n        int nx = -1;\n        for (int j = 0; j < cities; j++)\n            if (!seen[j] && (nx < 0 || m[cur][j] < m[cur][nx]))\n                nx = j;\n        seen[nx] = 1; tour[k] = nx;\n        cost += m[cur][nx]; cur = nx;\n    }\n    return cost + m[cur][0];   /* връщане в 0 */\n}",
  "tags": {
   "step": [
    6
   ],
   "scan": [
    9
   ],
   "take": [
    11
   ],
   "back": [
    14
   ]
  }
 },
 "ch10_vc": {
  "file": "10_more.c",
  "code": "/* 2-приближение за върхово покритие: за всяко непокрито\n   ребро (u, v) вземи И ДВАТА края. */\nint vc_approx(int m, const int eu[], const int ev[], int inC[])\n{\n    int size = 0;\n    for (int e = 0; e < m; e++) {\n        if (!inC[eu[e]] && !inC[ev[e]]) {\n            inC[eu[e]] = inC[ev[e]] = 1;\n            size += 2;\n        }\n    }\n    return size;\n}",
  "tags": {
   "edge": [
    6
   ],
   "uncov": [
    7
   ],
   "take": [
    8,
    9
   ],
   "ret": [
    12
   ]
  }
 },
 "ch10_stream": {
  "file": "10_more.c",
  "code": "/* Поточна статистика: O(1) памет, едно преминаване.\n   Минали елементи НЕ се пазят. */\ntypedef struct { long count; long long sum; int max; } Stream;\n\nvoid stream_init(Stream *s) { s->count = 0; s->sum = 0; s->max = INT_MIN; }\n\nvoid stream_push(Stream *s, int x)\n{\n    s->count++;\n    s->sum += x;\n    if (x > s->max) s->max = x;\n}\n\ndouble stream_mean(const Stream *s)\n{\n    return (double)s->sum / (double)s->count;\n}",
  "tags": {
   "push": [
    8
   ],
   "count": [
    9
   ],
   "sum": [
    10
   ],
   "max": [
    11
   ],
   "mean": [
    16
   ]
  }
 }
};
