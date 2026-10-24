/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch02_search": {
  "file": "02_search.c",
  "code": "typedef struct { int node, g, parent, seq; } Entry;\n\n/* кой елемент от фронта да се извади според режима */\nstatic int pick(const Entry fr[], int nf, const Graph *G, int mode)\n{\n    int b = 0;\n    for (int i = 1; i < nf; i++) {\n        long kb, ki;\n        switch (mode) {\n        case BFS:    kb = fr[b].seq;  ki = fr[i].seq;  break;   /* опашка */\n        case DFS:    kb = -fr[b].seq; ki = -fr[i].seq; break;   /* стек   */\n        case UCS:    kb = fr[b].g;    ki = fr[i].g;    break;\n        case GREEDY: kb = G->h[fr[b].node]; ki = G->h[fr[i].node]; break;\n        default:     kb = fr[b].g + G->h[fr[b].node]; ki = fr[i].g + G->h[fr[i].node]; break;\n        }\n        if (ki < kb || (ki == kb && fr[i].seq < fr[b].seq)) b = i;\n    }\n    return b;\n}\n\n/* Връща цената на намерения път или -1; parent[] описва пътя назад от целта. */\nint search(const Graph *G, int start, int goal, int mode, int parent[])\n{\n    Entry fr[MAXN];\n    int nf = 0, seq = 0, closed[MAXN] = {0};\n    fr[nf++] = (Entry){start, 0, -1, seq++};\n    while (nf > 0) {\n        int b = pick(fr, nf, G, mode);\n        Entry e = fr[b];\n        fr[b] = fr[--nf];                     /* премахване от фронта */\n        closed[e.node] = 1;\n        parent[e.node] = e.parent;\n        g_expanded++; g_order[g_norder++] = e.node;\n        if (e.node == goal)\n            return e.g;\n        int u = e.node;\n        for (int k = 0; k < G->deg[u]; k++) {\n            int v = G->adj[u][k], ng = e.g + G->w[u][k];\n            if (closed[v])\n                continue;\n            int f = -1;\n            for (int i = 0; i < nf; i++) if (fr[i].node == v) f = i;\n            if (f < 0)\n                fr[nf++] = (Entry){v, ng, u, seq++};\n            else if ((mode == UCS || mode == ASTAR) && ng < fr[f].g) {\n                fr[f].g = ng; fr[f].parent = u;\n            }\n        }\n    }\n    return -1;\n}",
  "tags": {
   "init": [
    26
   ],
   "loop": [
    27
   ],
   "pick": [
    28
   ],
   "expand": [
    31
   ],
   "goaltest": [
    34
   ],
   "found": [
    35
   ],
   "nbr": [
    37
   ],
   "closed": [
    39
   ],
   "push": [
    44
   ],
   "relax": [
    46
   ],
   "fail": [
    50
   ]
  }
 },
 "ch03_minimax": {
  "file": "03_minimax.c",
  "code": "/* V(s) = U(s) за лист; max по децата при MAX; min при MIN */\nint minimax(int s, int is_max)\n{\n    g_visited++;\n    if (T[s].leaf) {\n        g_leaves++;\n        return T[s].value;\n    }\n    int best = is_max ? INT_MIN : INT_MAX;\n    for (int k = 0; k < T[s].nk; k++) {\n        int v = minimax(T[s].kid[k], !is_max);\n        best = is_max ? max(best, v) : min(best, v);\n    }\n    return best;\n}",
  "tags": {
   "visit": [
    4
   ],
   "leaf": [
    5
   ],
   "util": [
    7
   ],
   "init": [
    9
   ],
   "loop": [
    10
   ],
   "rec": [
    11
   ],
   "upd": [
    12
   ],
   "ret": [
    14
   ]
  }
 },
 "ch04_alphabeta": {
  "file": "03_minimax.c",
  "code": "/* alpha — осигурена долна граница за MAX; beta — горна граница, наложена от MIN */\nint alphabeta(int s, int alpha, int beta, int is_max)\n{\n    g_visited++;\n    if (T[s].leaf) {\n        g_leaves++;\n        return T[s].value;\n    }\n    int best = is_max ? INT_MIN : INT_MAX;\n    for (int k = 0; k < T[s].nk; k++) {\n        int v = alphabeta(T[s].kid[k], alpha, beta, !is_max);\n        if (is_max) { best = max(best, v); alpha = max(alpha, best); }\n        else        { best = min(best, v); beta  = min(beta,  best); }\n        if (alpha >= beta) {\n            for (int r = k + 1; r < T[s].nk; r++)\n                mark_cut(T[s].kid[r]);\n            break;\n        }\n    }\n    return best;\n}",
  "tags": {
   "visit": [
    4
   ],
   "leaf": [
    5
   ],
   "util": [
    7
   ],
   "init": [
    9
   ],
   "loop": [
    10
   ],
   "rec": [
    11
   ],
   "updmax": [
    12
   ],
   "updmin": [
    13
   ],
   "test": [
    14
   ],
   "cut": [
    16
   ],
   "ret": [
    20
   ]
  }
 },
 "ch05_retro": {
  "file": "05_nim.c",
  "code": "/* win[n] = 1, ако играчът на ход при n предмета има печеливша стратегия */\nvoid retro(int N, const int M[], int m, int misere, int win[], int best[])\n{\n    win[0] = misere ? 1 : 0;\n    best[0] = -1;\n    for (int n = 1; n <= N; n++) {\n        win[n] = 0; best[n] = -1;\n        for (int k = 0; k < m; k++) {\n            int t = M[k];\n            if (t > n) continue;\n            if (!win[n - t]) {\n                win[n] = 1; best[n] = t;\n                break;\n            }\n        }\n    }\n}",
  "tags": {
   "base": [
    4
   ],
   "loop": [
    6
   ],
   "init": [
    7
   ],
   "move": [
    8
   ],
   "skip": [
    10
   ],
   "test": [
    11
   ],
   "win": [
    12
   ]
  }
 },
 "ch05_play": {
  "file": "05_nim.c",
  "code": "/* ход по стратегията: ако позицията е печеливша — към губеща; иначе — най-малкият допустим ход */\nint strategy_move(int n, const int M[], int m, const int win[], const int best[])\n{\n    if (win[n])\n        return best[n];\n    for (int k = 0; k < m; k++)\n        if (M[k] <= n) return M[k];\n    return 0;\n}",
  "tags": {
   "good": [
    4
   ],
   "any": [
    6
   ],
   "none": [
    8
   ]
  }
 },
 "ch06_valid": {
  "file": "06_logic.c",
  "code": "/* prem[0..np-1] — предпоставки, concl — заключение, nv — брой променливи (P, Q, ...) */\nint valid(const char *prem[], int np, const char *concl, int nv)\n{\n    int ok = 1;\n    for (int a = 0; a < (1 << nv); a++) {\n        for (int k = 0; k < nv; k++)\n            VAL[k] = (a >> (nv - 1 - k)) & 1;              /* P е старшият бит */\n        g_rows++;\n        int all = 1;\n        for (int i = 0; i < np; i++)\n            all = all && eval(prem[i]);\n        if (!all)\n            continue;\n        g_models++;\n        if (!eval(concl)) {\n            g_counter++;\n            if (g_first_cex < 0) g_first_cex = a;\n            ok = 0;\n        }\n    }\n    return ok;\n}",
  "tags": {
   "row": [
    5
   ],
   "prem": [
    10
   ],
   "skip": [
    12
   ],
   "concl": [
    15
   ],
   "cex": [
    16
   ],
   "ret": [
    21
   ]
  }
 },
 "ch06_world": {
  "file": "06_logic.c",
  "code": "enum { NO, YES, UNKNOWN };\n/* known — факти, записани като верни; neg — факти, записани изрично като неверни */\nint query(const char *fact, const char *known[], int nk, const char *neg[], int nn, int closed)\n{\n    for (int i = 0; i < nk; i++)\n        if (strcmp(known[i], fact) == 0) return YES;\n    for (int i = 0; i < nn; i++)\n        if (strcmp(neg[i], fact) == 0) return NO;\n    if (closed)\n        return NO;     /* затворен свят: липсата се приема за „не“ */\n    return UNKNOWN;    /* отворен свят: липсата не доказва отрицание */\n}",
  "tags": {
   "yes": [
    6
   ],
   "no": [
    8
   ],
   "cwa": [
    9
   ],
   "owa": [
    11
   ]
  }
 },
 "ch07_lookup": {
  "file": "07_frames.c",
  "code": "/* Следващ фрейм нагоре. Коректно: само по „е вид“.\n   wrong = 1 показва ГРЕШКАТА — следване и по „част от“, сякаш е „е вид“. */\nstatic int up(int f, int wrong)\n{\n    if (F[f].isa >= 0) return F[f].isa;\n    return wrong ? F[f].partof : -1;\n}\n\n/* Връща стойността на слота и в *from — фрейма, от който е взета (или -1) */\nconst char *lookup(int f, const char *slot, int *from, int wrong)\n{\n    for (int cur = f; cur >= 0; cur = up(cur, wrong)) {\n        g_steps++;\n        for (int i = 0; i < F[cur].ns; i++)\n            if (strcmp(F[cur].slot[i], slot) == 0) {\n                *from = cur;\n                return F[cur].val[i];\n            }\n    }\n    *from = -1;\n    return NULL;\n}",
  "tags": {
   "climb": [
    12
   ],
   "scan": [
    14
   ],
   "match": [
    15
   ],
   "found": [
    17
   ],
   "none": [
    21
   ]
  }
 },
 "ch08_forward": {
  "file": "08_rules.c",
  "code": "/* strategy: 0 — по реда (приоритет), 1 — по специфичност; refraction: 1 — правило не се\n   задейства отново, ако заключението му вече е в паметта; limit — предпазен брой цикли */\nint forward(int strategy, int refraction, int limit)\n{\n    for (;;) {\n        if (++g_cycles > limit)\n            return -1;\n        int chosen = -1;\n        for (int r = 0; r < NR; r++) {\n            if (refraction && find_fact(R[r].concl) >= 0)\n                continue;\n            int ok = 1;\n            for (int c = 0; c < R[r].nc && ok; c++)\n                ok = holds(R[r].cond[c]);\n            if (!ok) continue;\n            /* правилото е в конфликтното множество */\n            if (chosen < 0 || (strategy == 1 && R[r].nc > R[chosen].nc))\n                chosen = r;\n        }\n        if (chosen < 0)\n            return g_nfired;\n        if (find_fact(R[chosen].concl) < 0)\n            assert_fact(R[chosen].concl, chosen);\n        g_fired[g_nfired++] = chosen;\n    }\n}",
  "tags": {
   "cycle": [
    6
   ],
   "limit": [
    7
   ],
   "match": [
    9
   ],
   "refr": [
    11
   ],
   "cond": [
    14
   ],
   "conflict": [
    17
   ],
   "stop": [
    20
   ],
   "fire": [
    23
   ],
   "act": [
    24
   ]
  }
 },
 "ch08_backward": {
  "file": "08_rules.c",
  "code": "int prove(const char *goal)\n{\n    g_calls++;\n    if (holds(goal))\n        return 1;\n    for (int s = 0; s < NST; s++)\n        if (!strcmp(STACK[s], goal)) return 0;\n    if (NST >= 16) return 0;\n    snprintf(STACK[NST++], SYM, \"%s\", goal);\n    for (int r = 0; r < NR; r++) {\n        if (strcmp(R[r].concl, goal)) continue;\n        int ok = 1;\n        for (int c = 0; c < R[r].nc && ok; c++)\n            ok = prove(R[r].cond[c]);\n        if (ok) {\n            assert_fact(goal, r);\n            g_fired[g_nfired++] = r;\n            NST--;\n            return 1;\n        }\n    }\n    NST--;\n    return 0;\n}",
  "tags": {
   "call": [
    3
   ],
   "known": [
    4
   ],
   "loopchk": [
    7
   ],
   "rules": [
    10
   ],
   "try": [
    12
   ],
   "sub": [
    14
   ],
   "proved": [
    16
   ],
   "fail": [
    23
   ]
  }
 }
};
