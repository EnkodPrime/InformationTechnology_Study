/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch06_nfr": {
  "file": "06_requirements.c",
  "code": "/* Изискване: pct% от заявките да отговарят до limit_ms.\n   offset_ms — добавка според точката на измерване\n   (0 = от сървъра; > 0 = от клиента, с мрежата).   */\nint nfr_check(const int t_ms[], int n, int offset_ms,\n              int limit_ms, int pct, int *ok_out)\n{\n    int ok = 0;\n    for (int i = 0; i < n; i++) {\n        int measured = t_ms[i] + offset_ms;\n        if (measured <= limit_ms)\n            ok++;\n    }\n    *ok_out = ok;\n    /* ok/n >= pct/100, без деление с плаваща запетая */\n    return n > 0 && ok * 100 >= pct * n;\n}",
  "tags": {
   "enter": [
    6
   ],
   "loop": [
    8
   ],
   "measure": [
    9
   ],
   "cmp": [
    10
   ],
   "ok": [
    11
   ],
   "verdict": [
    15
   ]
  }
 },
 "ch06_impact": {
  "file": "06_requirements.c",
  "code": "/* Обхождане в ширина: кои елементи засяга промяната на start.\n   Записва ги в out[] в реда на откриване; връща броя им.     */\nint impact(int start, int out[])\n{\n    int queue[N_EL], head = 0, tail = 0, cnt = 0;\n    int seen[N_EL] = {0};\n    seen[start] = 1;\n    queue[tail++] = start;\n    while (head < tail) {\n        int u = queue[head++];\n        out[cnt++] = u;\n        for (int e = 0; e < N_EDGES; e++) {\n            if (EDGES[e][0] != u) continue;\n            int v = EDGES[e][1];\n            if (!seen[v]) {\n                seen[v] = 1;\n                queue[tail++] = v;\n            }\n        }\n    }\n    return cnt;\n}",
  "tags": {
   "enter": [
    4
   ],
   "push": [
    8,
    17
   ],
   "loop": [
    9
   ],
   "pop": [
    10
   ],
   "edge": [
    12
   ],
   "check": [
    15
   ],
   "mark": [
    16
   ],
   "ret": [
    21
   ]
  }
 },
 "ch07_race": {
  "file": "07_design.c",
  "code": "/* Една стъпка на заявка r. atomic = 0: две отделни стъпки\n   (прочитане, после запис); atomic = 1: една неделима стъпка. */\nvoid enroll_step(Course *c, Req *r, int atomic)\n{\n    if (!atomic) {\n        if (r->phase == 0) {\n            r->seen_free = c->free;          /* прочитане */\n            r->seen_dup = is_enrolled(c, r->student);\n            r->phase = 1;\n            return;\n        }\n        /* решение по ВЕЧЕ ОСТАРЕЛИ прочетени стойности */\n        if (r->seen_dup)            r->result = -2;\n        else if (r->seen_free <= 0) r->result = -1;\n        else {\n            c->free = r->seen_free - 1;      /* загубено изменение */\n            c->enrolled[c->n_enrolled++] = r->student;\n            r->result = 1;\n        }\n        r->phase = 2;\n        return;\n    }\n    /* atomic: проверка и изменение — една операция при запис,\n       напр. UPDATE ... SET free = free - 1 WHERE free > 0\n       плюс уникално ограничение (student, course, semester) */\n    if (is_enrolled(c, r->student))  r->result = -2;\n    else if (c->free <= 0)           r->result = -1;\n    else {\n        c->free--;\n        c->enrolled[c->n_enrolled++] = r->student;\n        r->result = 1;\n    }\n    r->phase = 2;\n}",
  "tags": {
   "read": [
    6
   ],
   "dup": [
    13
   ],
   "full": [
    14
   ],
   "write": [
    16
   ],
   "ok": [
    18
   ],
   "adup": [
    26
   ],
   "afull": [
    27
   ],
   "awrite": [
    29
   ],
   "aok": [
    31
   ]
  }
 },
 "ch07_idem": {
  "file": "07_design.c",
  "code": "/* Сървърът: с use_key повторение със същия op_id връща запазения\n   резултат, без нов бизнес ефект.                                 */\nint server_handle(Server *s, int op_id, int use_key)\n{\n    if (use_key)\n        for (int i = 0; i < s->n_seen; i++)\n            if (s->seen_id[i] == op_id)\n                return s->saved[i];   /* повторение */\n    s->effects++;                     /* бизнес ефект */\n    if (use_key) {\n        s->seen_id[s->n_seen] = op_id;\n        s->saved[s->n_seen++] = s->effects;\n    }\n    return s->effects;\n}\n\n/* Клиентът: при изгубен отговор (lost[a] != 0) повтаря заявката.\n   Връща номера на опита, при който е получил отговор, или -1. */\nint client_send(Server *s, int op_id, const int lost[], int attempts,\n                int use_key)\n{\n    for (int a = 0; a < attempts; a++) {\n        int resp = server_handle(s, op_id, use_key);\n        if (lost[a]) continue;        /* отговорът се губи */\n        (void)resp;\n        return a + 1;\n    }\n    return -1;\n}",
  "tags": {
   "srv": [
    4
   ],
   "lookup": [
    7
   ],
   "replay": [
    8
   ],
   "effect": [
    9
   ],
   "store": [
    11
   ],
   "send": [
    22
   ],
   "lost": [
    24
   ],
   "got": [
    26
   ],
   "giveup": [
    28
   ]
  }
 },
 "ch09_accept": {
  "file": "09_migration.c",
  "code": "/* Пет проверки преди приемане. Бит k в резултата = проверка k е минала. */\nint accept(const Row src[], int n, const Row dst[], int m,\n           const int students[], int ns)\n{\n    int mask = 0;\n    /* 1. Брой редове */\n    if (m == n) mask |= 1;\n    /* 2. Уникален първичен ключ */\n    int uniq = 1;\n    for (int i = 0; i < m; i++)\n        for (int j = i + 1; j < m; j++)\n            if (dst[i].id == dst[j].id) uniq = 0;\n    if (uniq) mask |= 2;\n    /* 3. Чуждите ключове сочат съществуващи студенти */\n    int fk = 1;\n    for (int i = 0; i < m; i++) {\n        int found = 0;\n        for (int k = 0; k < ns; k++)\n            if (students[k] == dst[i].student) found = 1;\n        if (!found) fk = 0;\n    }\n    if (fk) mask |= 4;\n    /* 4. Контролна сума в евро (смисъл на единиците) */\n    long want = 0, got = 0;\n    for (int i = 0; i < n; i++) want += bgn_to_eur(src[i].amount);\n    for (int i = 0; i < m; i++) got += dst[i].amount;\n    if (want == got) mask |= 8;\n    /* 5. Съпоставяне ред по ред: същият студент и сума за всеки ид */\n    int rec = 1;\n    for (int i = 0; i < n; i++) {\n        int hit = 0;\n        for (int j = 0; j < m; j++)\n            if (dst[j].id == src[i].id && dst[j].student == src[i].student\n                && dst[j].amount == bgn_to_eur(src[i].amount)) hit = 1;\n        if (!hit) rec = 0;\n    }\n    if (rec) mask |= 16;\n    return mask;\n}",
  "tags": {
   "enter": [
    4
   ],
   "count": [
    7
   ],
   "pk": [
    12
   ],
   "fk": [
    20
   ],
   "sum": [
    27
   ],
   "rec": [
    35
   ],
   "ret": [
    38
   ]
  }
 }
};
