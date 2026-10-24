/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch02_rel": {
  "file": "02_relmodel.c",
  "code": "/* Вмъкване в Student: NOT NULL, уникалност на PK, външен ключ (NULL е допустим). */\nconst char *insert_student(Db *db, const char *sid, const char *name, const char *pid)\n{\n    if (is_null(sid) || is_null(name))\n        return \"NOT NULL: sid и name са задължителни\";\n    if (find_student(db, sid) >= 0)\n        return \"PK: вече има студент с този sid\";\n    if (!is_null(pid) && find_programme(db, pid) < 0)\n        return \"FK: няма такава специалност (pid)\";\n    Student *s = &db->s[db->ns++];\n    put(s->sid, sid); put(s->name, name); put(s->pid, pid);\n    return NULL;\n}\n\n/* Вмъкване в Enrollment: домейн, NOT NULL, съставен PK, два външни ключа. */\nconst char *insert_enrollment(Db *db, const char *sid, const char *cid, int grade)\n{\n    if (grade < 2 || grade > 6)\n        return \"Домейн: оценката е цяло число от 2 до 6\";\n    if (is_null(sid) || is_null(cid))\n        return \"NOT NULL: колоните на PK не допускат NULL\";\n    for (int i = 0; i < db->ne; i++)\n        if (!strcmp(db->e[i].sid, sid) && !strcmp(db->e[i].cid, cid))\n            return \"PK: двойката (sid, cid) вече съществува\";\n    if (find_student(db, sid) < 0)\n        return \"FK: няма такъв студент\";\n    if (find_course(db, cid) < 0)\n        return \"FK: няма такава дисциплина\";\n    Enrollment *e = &db->e[db->ne++];\n    put(e->sid, sid); put(e->cid, cid); e->grade = grade;\n    return NULL;\n}\n\n/* Изтриване на студент. Enrollment.sid е част от PK, затова SET NULL е невъзможно. */\nconst char *delete_student(Db *db, const char *sid, int rule)\n{\n    int k = find_student(db, sid);\n    if (k < 0) return \"няма такъв студент\";\n    int refs = 0;\n    for (int i = 0; i < db->ne; i++)\n        if (!strcmp(db->e[i].sid, sid)) refs++;\n    if (refs > 0 && rule == RESTRICT)\n        return \"RESTRICT: има записвания, които сочат към студента\";\n    if (refs > 0 && rule == SET_NULL)\n        return \"SET NULL: Enrollment.sid е част от PK и не допуска NULL\";\n    int j = 0;\n    for (int i = 0; i < db->ne; i++)\n        if (strcmp(db->e[i].sid, sid)) db->e[j++] = db->e[i];\n    db->ne = j;\n    db->s[k] = db->s[--db->ns];\n    return NULL;\n}\n\n/* Изтриване на специалност; Student.pid допуска NULL. */\nconst char *delete_programme(Db *db, const char *pid, int rule)\n{\n    int k = find_programme(db, pid);\n    if (k < 0) return \"няма такава специалност\";\n    int refs = 0;\n    for (int i = 0; i < db->ns; i++)\n        if (!strcmp(db->s[i].pid, pid)) refs++;\n    if (refs > 0 && rule == RESTRICT)\n        return \"RESTRICT: има студенти от тази специалност\";\n    for (int i = 0; i < db->ns; i++)\n        if (!strcmp(db->s[i].pid, pid)) {\n            if (rule == SET_NULL) db->s[i].pid[0] = '\\0';\n            else {\n                /* CASCADE: изтриваме студента заедно с неговите записвания */\n                delete_student(db, db->s[i].sid, CASCADE);\n                i--;\n            }\n        }\n    db->p[k] = db->p[--db->np];\n    return NULL;\n}",
  "tags": {
   "s_null": [
    4
   ],
   "s_pk": [
    6
   ],
   "s_fk": [
    8
   ],
   "s_ok": [
    10
   ],
   "e_dom": [
    18
   ],
   "e_null": [
    20
   ],
   "e_pk": [
    22
   ],
   "e_fk1": [
    25
   ],
   "e_fk2": [
    27
   ],
   "e_ok": [
    29
   ],
   "d_none": [
    38
   ],
   "d_scan": [
    40
   ],
   "d_restrict": [
    42
   ],
   "d_setnull_pk": [
    44
   ],
   "d_cascade": [
    47
   ],
   "d_ok": [
    50
   ],
   "p_none": [
    58
   ],
   "p_scan": [
    60
   ],
   "p_restrict": [
    62
   ],
   "p_setnull": [
    66
   ],
   "p_cascade": [
    67
   ],
   "p_ok": [
    73
   ]
  }
 },
 "ch03_select": {
  "file": "03_algebra.c",
  "code": "/* σ_{col op val}(R) — селекция: избира РЕДОВЕ по условие */\nint test_cond(const char *x, const char *op, const char *val)\n{\n    long c = is_int(x) && is_int(val) ? strtol(x, NULL, 10) - strtol(val, NULL, 10)\n                                      : (long)strcmp(x, val);\n    if (!strcmp(op, \"=\"))  return c == 0;\n    if (!strcmp(op, \"!=\")) return c != 0;\n    if (!strcmp(op, \"<\"))  return c < 0;\n    if (!strcmp(op, \">\"))  return c > 0;\n    if (!strcmp(op, \"<=\")) return c <= 0;\n    return c >= 0;  /* \">=\" */\n}\n\nvoid select_rel(const Rel *R, int col, const char *op, const char *val, Rel *out)\n{\n    out->nc = R->nc; out->nr = 0;\n    memcpy(out->col, R->col, sizeof R->col);\n    for (int i = 0; i < R->nr; i++) {\n        cmp_count++;\n        if (test_cond(R->v[i][col], op, val))\n            copy_row(out, R, i);\n    }\n}",
  "tags": {
   "sel_init": [
    16
   ],
   "sel_loop": [
    18
   ],
   "sel_test": [
    20
   ],
   "sel_keep": [
    21
   ]
  }
 },
 "ch03_project": {
  "file": "03_algebra.c",
  "code": "/* π_{cols}(R) — проекция: избира КОЛОНИ; като множество премахва повторенията */\nvoid project_rel(const Rel *R, const int *cols, int k, int bag, Rel *out)\n{\n    out->nc = k; out->nr = 0;\n    for (int j = 0; j < k; j++) memcpy(out->col[j], R->col[cols[j]], W);\n    for (int i = 0; i < R->nr; i++) {\n        for (int j = 0; j < k; j++)         /* кандидат: следващият ред на out */\n            memcpy(out->v[out->nr][j], R->v[i][cols[j]], W);\n        if (!bag && contains(out, out, out->nr))\n            continue;\n        out->nr++;\n    }\n}",
  "tags": {
   "pr_init": [
    4
   ],
   "pr_loop": [
    6
   ],
   "pr_build": [
    8
   ],
   "pr_dup": [
    9
   ],
   "pr_skip": [
    10
   ],
   "pr_keep": [
    11
   ]
  }
 },
 "ch03_product": {
  "file": "03_algebra.c",
  "code": "/* R × S — декартово произведение: всеки ред на R с всеки ред на S */\nvoid product_rel(const Rel *R, const Rel *S, Rel *out)\n{\n    out->nc = R->nc + S->nc; out->nr = 0;\n    for (int j = 0; j < R->nc; j++)        /* общо име -> префикс R. / S. */\n        snprintf(out->col[j], W, col_index(S, R->col[j]) >= 0 ? \"R.%.12s\" : \"%.15s\", R->col[j]);\n    for (int j = 0; j < S->nc; j++)\n        snprintf(out->col[R->nc + j], W, col_index(R, S->col[j]) >= 0 ? \"S.%.12s\" : \"%.15s\", S->col[j]);\n    for (int i = 0; i < R->nr; i++)\n        for (int k = 0; k < S->nr; k++) {\n            cmp_count++;\n            memcpy(out->v[out->nr], R->v[i], sizeof(char[W]) * R->nc);\n            memcpy(out->v[out->nr] + R->nc, S->v[k], sizeof(char[W]) * S->nc);\n            out->nr++;\n        }\n}",
  "tags": {
   "px_init": [
    4
   ],
   "px_outer": [
    9
   ],
   "px_inner": [
    10
   ],
   "px_emit": [
    14
   ]
  }
 },
 "ch03_join": {
  "file": "03_algebra.c",
  "code": "/* R ⋈ S — естествено съединение по общите имена на колони (вложени цикли) */\nvoid join_rel(const Rel *R, const Rel *S, Rel *out)\n{\n    int ri[MC], si[MC], nk = 0, extra[MC], ne = 0;\n    for (int k = 0; k < S->nc; k++) {\n        int j = col_index(R, S->col[k]);\n        if (j >= 0) { ri[nk] = j; si[nk] = k; nk++; }\n        else extra[ne++] = k;\n    }\n    out->nc = R->nc + ne; out->nr = 0;\n    memcpy(out->col, R->col, sizeof(char[W]) * R->nc);\n    for (int e = 0; e < ne; e++) memcpy(out->col[R->nc + e], S->col[extra[e]], W);\n    for (int i = 0; i < R->nr; i++)\n        for (int k = 0; k < S->nr; k++) {\n            cmp_count++;\n            int match = 1;\n            for (int c = 0; c < nk; c++)\n                if (strcmp(R->v[i][ri[c]], S->v[k][si[c]])) { match = 0; break; }\n            if (!match) continue;\n            memcpy(out->v[out->nr], R->v[i], sizeof(char[W]) * R->nc);\n            for (int e = 0; e < ne; e++) memcpy(out->v[out->nr][R->nc + e], S->v[k][extra[e]], W);\n            out->nr++;\n        }\n}",
  "tags": {
   "j_init": [
    4
   ],
   "j_outer": [
    13
   ],
   "j_inner": [
    14
   ],
   "j_test": [
    17
   ],
   "j_emit": [
    20
   ]
  }
 },
 "ch03_setops": {
  "file": "03_algebra.c",
  "code": "/* ∪, −, ∩ — изискват съвместими схеми (еднакъв брой и имена на колоните) */\nint compatible(const Rel *R, const Rel *S)\n{\n    if (R->nc != S->nc) return 0;\n    for (int j = 0; j < R->nc; j++) if (strcmp(R->col[j], S->col[j])) return 0;\n    return 1;\n}\n\nvoid setop_rel(const Rel *R, const Rel *S, char op, Rel *out)\n{\n    out->nc = R->nc; out->nr = 0;\n    memcpy(out->col, R->col, sizeof R->col);\n    for (int i = 0; i < R->nr; i++) {\n        int inS = contains(S, R, i);\n        int keep = op == 'U' || (op == '-' && !inS) || (op == '^' && inS);\n        if (keep && !contains(out, R, i)) copy_row(out, R, i);\n    }\n    if (op == 'U')\n        for (int k = 0; k < S->nr; k++)\n            if (!contains(out, S, k)) copy_row(out, S, k);\n}",
  "tags": {
   "so_compat": [
    4
   ],
   "so_init": [
    11
   ],
   "so_r": [
    13
   ],
   "so_probe": [
    14
   ],
   "so_keep": [
    16
   ],
   "so_s": [
    19
   ],
   "so_add": [
    20
   ]
  }
 },
 "ch04_tvl": {
  "file": "04_sql.c",
  "code": "/* Тризначна логика на SQL: FALSE < UNKNOWN < TRUE */\ntypedef enum { F = 0, U = 1, T = 2 } Tv;\n\nTv tv_and(Tv a, Tv b) { return a < b ? a : b; }   /* минимум */\nTv tv_or (Tv a, Tv b) { return a > b ? a : b; }   /* максимум */\nTv tv_not(Tv a)       { return (Tv)(2 - a); }     /* NOT U = U */\n\n/* x >= g, когато x може да е NULL */\nTv ge(int x, int x_is_null, int g)\n{\n    if (x_is_null) return U;              /* NULL >= 5 -> UNKNOWN */\n    return x >= g ? T : F;\n}\n/* WHERE пропуска реда само ако условието е TRUE */\nint where_keeps(Tv c) { return c == T; }",
  "tags": {
   "and": [
    4
   ],
   "or": [
    5
   ],
   "not": [
    6
   ],
   "cmp_null": [
    11
   ],
   "cmp_val": [
    12
   ],
   "where": [
    15
   ]
  }
 },
 "ch04_leftjoin": {
  "file": "04_sql.c",
  "code": "/* place: 0 — без условие, 1 — условие в ON, 2 — условие в WHERE\n   agg:   0 — COUNT(e.course_id), 1 — COUNT(*) */\nint run_query(const Student *S, int ns, const Enrollment *E, int ne,\n              int place, int g, int agg, int out_count[])\n{\n    Row rows[MAXS * MAXE + MAXS];\n    int nr = 0;\n    /* 1. FROM Student LEFT JOIN Enrollment ON ... */\n    for (int i = 0; i < ns; i++) {\n        int matched = 0;\n        for (int k = 0; k < ne; k++) {\n            Tv on = E[k].sid == S[i].id ? T : F;\n            if (place == 1) on = tv_and(on, ge(E[k].grade, 0, g));\n            if (on != T) continue;\n            rows[nr++] = (Row){ S[i].id, E[k].cid, 0, E[k].grade, 0 };\n            matched = 1;\n        }\n        if (!matched)\n            rows[nr++] = (Row){ S[i].id, 0, 1, 0, 1 };  /* e.* = NULL */\n    }\n    /* 2. WHERE */\n    int kept = 0;\n    for (int r = 0; r < nr; r++) {\n        if (place == 2 && !where_keeps(ge(rows[r].grade, rows[r].grade_null, g)))\n            continue;\n        rows[kept++] = rows[r];\n    }\n    /* 3. GROUP BY s.id + 4. COUNT(...) */\n    int groups = 0;\n    for (int i = 0; i < ns; i++) {\n        int cnt = 0, present = 0;\n        for (int r = 0; r < kept; r++) {\n            if (rows[r].sid != S[i].id) continue;\n            present = 1;\n            if (agg == 1 || !rows[r].cid_null) cnt++;\n        }\n        out_count[i] = present ? cnt : -1;   /* -1: групата изчезна */\n        groups += present;\n    }\n    return groups;\n}",
  "tags": {
   "lj_outer": [
    9
   ],
   "lj_inner": [
    11
   ],
   "lj_on": [
    12
   ],
   "lj_match": [
    15
   ],
   "lj_pad": [
    18
   ],
   "wh_loop": [
    23
   ],
   "wh_drop": [
    25
   ],
   "wh_keep": [
    26
   ],
   "gb_group": [
    30
   ],
   "gb_row": [
    32
   ],
   "gb_count": [
    35
   ],
   "gb_emit": [
    37
   ]
  }
 },
 "ch05_closure": {
  "file": "05_fd.c",
  "code": "/* X⁺ — всички атрибути, които X определя чрез ФЗ от F */\nSet closure(const Schema *S, Set X)\n{\n    Set res = X;\n    int changed = 1;\n    closures++;\n    while (changed) {\n        changed = 0;\n        fd_passes++;\n        for (int i = 0; i < S->nf; i++) {\n            fd_checks++;\n            if (subset(S->f[i].lhs, res)\n                && !subset(S->f[i].rhs, res)) {\n                res |= S->f[i].rhs;\n                changed = 1;\n            }\n        }\n    }\n    return res;\n}",
  "tags": {
   "cl_init": [
    4
   ],
   "cl_pass": [
    7
   ],
   "cl_fd": [
    10
   ],
   "cl_test": [
    12
   ],
   "cl_apply": [
    14
   ],
   "cl_done": [
    19
   ]
  }
 },
 "ch05_keys": {
  "file": "05_fd.c",
  "code": "/* Всички кандидатни ключове: подмножествата по нарастващ размер;\n   надмножество на вече намерен ключ не може да е минимално. */\nint candidate_keys(const Schema *S, Set keys[], int maxk)\n{\n    Set all = (S->n == 32) ? ~0u : (1u << S->n) - 1;\n    int nk = 0;\n    for (int size = 1; size <= S->n; size++)\n        for (Set X = 1; X <= all; X++) {\n            if (popcount(X) != size) continue;\n            int sup = 0;\n            for (int j = 0; j < nk; j++)\n                if (subset(keys[j], X)) { sup = 1; break; }\n            if (sup) continue;\n            if (closure(S, X) == all && nk < maxk)\n                keys[nk++] = X;\n        }\n    return nk;\n}",
  "tags": {
   "k_size": [
    7
   ],
   "k_super": [
    11
   ],
   "k_skip": [
    13
   ],
   "k_test": [
    14
   ],
   "k_found": [
    15
   ]
  }
 },
 "ch05_holds": {
  "file": "05_fd.c",
  "code": "/* Изпълнена ли е X->Y в ТЕКУЩОТО състояние (редове rows[r][атрибут])?\n   Сравнява всяка двойка редове: еднакво X, различно Y => нарушение. */\nint fd_holds_in(int nrows, int ncols, const char rows[][MAXA][NAMEW], Set X, Set Y, int *pair_i, int *pair_j)\n{\n    for (int i = 0; i < nrows; i++)\n        for (int j = i + 1; j < nrows; j++) {\n            int sameX = 1, sameY = 1;\n            for (int a = 0; a < ncols; a++) {\n                if (!(X >> a & 1u) && !(Y >> a & 1u)) continue;\n                int eq = !strcmp(rows[i][a], rows[j][a]);\n                if (X >> a & 1u) sameX &= eq;\n                if (Y >> a & 1u) sameY &= eq;\n            }\n            if (sameX && !sameY) {\n                *pair_i = i; *pair_j = j;\n                return 0;\n            }\n        }\n    return 1;\n}",
  "tags": {
   "h_i": [
    5
   ],
   "h_j": [
    6
   ],
   "h_x": [
    11
   ],
   "h_bad": [
    14
   ],
   "h_ok": [
    19
   ]
  }
 },
 "ch07_analyze": {
  "file": "06_nf.c",
  "code": "/* Връща най-високата изпълнена форма: 1 (само 1НФ), 2, 3 или 4 (= BCNF). */\nint nf_analyze(const Schema *S, Viol v[], int *nv, Set *prime_out)\n{\n    Set keys[64], prime = 0, all = all_attrs(S);\n    int nk = candidate_keys(S, keys, 64);\n    for (int i = 0; i < nk; i++) prime |= keys[i];\n    *prime_out = prime; *nv = 0;\n    int partial = 0, bad3 = 0, badB = 0;\n    /* 2НФ: непървичен атрибут, определен от СОБСТВЕНА част на кандидатен ключ */\n    for (int i = 0; i < nk; i++)\n        for (Set X = (keys[i] - 1) & keys[i]; X; X = (X - 1) & keys[i]) {\n            Set dep = closure(S, X) & ~X & ~prime;\n            for (int a = 0; a < S->n; a++)\n                if (dep >> a & 1u) {\n                    v[(*nv)++] = (Viol){ X, a, 2 };\n                    partial = 1;\n                }\n        }\n    /* 3НФ и BCNF: всяка нетривиална X -> A от F */\n    for (int f = 0; f < S->nf; f++)\n        for (int a = 0; a < S->n; a++) {\n            if (!(S->f[f].rhs >> a & 1u) || (S->f[f].lhs >> a & 1u)) continue;\n            if (closure(S, S->f[f].lhs) == all) continue;\n            badB = 1;\n            if (prime >> a & 1u) { v[(*nv)++] = (Viol){ S->f[f].lhs, a, 4 }; continue; }\n            bad3 = 1;\n            v[(*nv)++] = (Viol){ S->f[f].lhs, a, 3 };\n        }\n    return partial ? 1 : bad3 ? 2 : badB ? 3 : 4;\n}",
  "tags": {
   "an_keys": [
    5
   ],
   "an_prime": [
    6
   ],
   "an_key": [
    10
   ],
   "an_part": [
    12
   ],
   "an_partbad": [
    15
   ],
   "an_fd": [
    20
   ],
   "an_super": [
    23
   ],
   "an_bcnf": [
    24
   ],
   "an_3nf": [
    26
   ],
   "an_level": [
    29
   ]
  }
 },
 "ch08_bcnf": {
  "file": "06_nf.c",
  "code": "/* Нарушение на BCNF в подсхемата Ri: X ⊂ Ri, X -> (X⁺ ∩ Ri) е нетривиална, X не е суперключ на Ri.\n   Подмножествата се обхождат по нарастващ размер — намира се най-малкият детерминант. */\nstatic Set find_violation(const Schema *S, Set Ri, Set *closure_out)\n{\n    int m = popcount(Ri);\n    for (int size = 1; size < m; size++)\n        for (Set X = (Ri - 1) & Ri; X; X = (X - 1) & Ri) {\n            if (popcount(X) != size) continue;\n            Set c = closure(S, X) & Ri;\n            if (c != X && c != Ri) { *closure_out = c; return X; }\n        }\n    return 0;\n}\n\nint bcnf_decompose(const Schema *S, Set rels[], int maxr)\n{\n    int nr = 1;\n    rels[0] = all_attrs(S);\n    for (int i = 0; i < nr; ) {\n        Set c, X = find_violation(S, rels[i], &c);\n        if (!X || nr >= maxr) { i++; continue; }\n        Set rest = rels[i] & ~(c & ~X);     /* Ri − (X⁺ − X) */\n        rels[i] = c;                        /* X ∪ (X⁺ ∩ Ri) */\n        rels[nr++] = rest;\n    }\n    return nr;\n}",
  "tags": {
   "b_size": [
    6
   ],
   "b_close": [
    9
   ],
   "b_viol": [
    10
   ],
   "b_init": [
    18
   ],
   "b_pick": [
    19
   ],
   "b_ok": [
    21
   ],
   "b_split": [
    23
   ]
  }
 },
 "ch08_preserve": {
  "file": "06_nf.c",
  "code": "/* Запазена ли е X -> Y? Z расте само чрез затваряния вътре в отделните подсхеми. */\nint preserved(const Schema *S, const Set rels[], int nr, FD d)\n{\n    Set Z = d.lhs;\n    int changed = 1;\n    while (changed) {\n        changed = 0;\n        for (int i = 0; i < nr; i++) {\n            Set add = closure(S, Z & rels[i]) & rels[i];\n            if (add & ~Z) { Z |= add; changed = 1; }\n        }\n    }\n    return (d.rhs & ~Z) == 0;\n}",
  "tags": {
   "p_init": [
    4
   ],
   "p_loop": [
    6
   ],
   "p_rel": [
    8
   ],
   "p_local": [
    9
   ],
   "p_grow": [
    10
   ],
   "p_res": [
    13
   ]
  }
 },
 "ch06_chase": {
  "file": "06_nf.c",
  "code": "/* Таблица: ред i = подсхема Ri, колона j = атрибут.\n   0 = отличен символ a_j; друго = b_ij. ФЗ изравнява символи; ред само от a_j => без загуба. */\nstatic long chase_steps;\nint chase(const Schema *S, const Set rels[], int nr)\n{\n    int t[MAXRELS][MAXA];\n    for (int i = 0; i < nr; i++)\n        for (int j = 0; j < S->n; j++)\n            t[i][j] = (rels[i] >> j & 1u) ? 0 : 1 + i * MAXA + j;\n    int changed = 1;\n    chase_steps = 0;\n    while (changed) {\n        changed = 0;\n        for (int f = 0; f < S->nf; f++)\n            for (int r1 = 0; r1 < nr; r1++)\n                for (int r2 = r1 + 1; r2 < nr; r2++) {\n                    int agree = 1;\n                    for (int j = 0; j < S->n; j++)\n                        if ((S->f[f].lhs >> j & 1u) && t[r1][j] != t[r2][j]) agree = 0;\n                    if (!agree) continue;\n                    for (int j = 0; j < S->n; j++) {\n                        if (!(S->f[f].rhs >> j & 1u) || t[r1][j] == t[r2][j]) continue;\n                        int keep = t[r1][j] < t[r2][j] ? t[r1][j] : t[r2][j];\n                        int drop = t[r1][j] + t[r2][j] - keep;\n                        for (int r = 0; r < nr; r++)\n                            if (t[r][j] == drop) t[r][j] = keep;\n                        changed = 1; chase_steps++;\n                    }\n                }\n        for (int r = 0; r < nr; r++) {\n            int full = 1;\n            for (int j = 0; j < S->n; j++) if (t[r][j]) full = 0;\n            if (full) return r + 1;   /* номер на реда, станал изцяло a */\n        }\n    }\n    return 0;\n}",
  "tags": {
   "c_init": [
    7
   ],
   "c_pass": [
    12
   ],
   "c_fd": [
    14
   ],
   "c_agree": [
    18
   ],
   "c_equate": [
    25
   ],
   "c_check": [
    30
   ],
   "c_yes": [
    33
   ],
   "c_no": [
    36
   ]
  }
 },
 "ch06_spurious": {
  "file": "06_nf.c",
  "code": "/* Проекции на R върху R1 и R2 (като множества) и естественото им съединение.\n   Връща броя редове в съединението; spurious = редове, които ги няма в R. */\ntypedef struct { int n; char v[MAXV][MAXA][NAMEW]; } Tab;\n\nstatic int same_on(const char a[][NAMEW], const char b[][NAMEW], Set cols, int ncol)\n{ for (int j = 0; j < ncol; j++) if ((cols >> j & 1u) && strcmp(a[j], b[j])) return 0; return 1; }\n\nstatic void project(const Tab *R, int ncol, Set cols, Tab *out)\n{\n    out->n = 0;\n    for (int i = 0; i < R->n; i++) {\n        int dup = 0;\n        for (int k = 0; k < out->n && !dup; k++) dup = same_on(R->v[i], out->v[k], cols, ncol);\n        if (!dup) memcpy(out->v[out->n++], R->v[i], sizeof R->v[i]);\n    }\n}\n\nint spurious_join(const Tab *R, int ncol, Set A1, Set A2, int *spurious)\n{\n    static Tab P1, P2;\n    project(R, ncol, A1, &P1);\n    project(R, ncol, A2, &P2);\n    Set common = A1 & A2;\n    int n = 0; *spurious = 0;\n    for (int i = 0; i < P1.n; i++)\n        for (int k = 0; k < P2.n; k++) {\n            if (!same_on(P1.v[i], P2.v[k], common, ncol)) continue;\n            char row[MAXA][NAMEW];\n            for (int j = 0; j < ncol; j++)\n                memcpy(row[j], (A1 >> j & 1u) ? P1.v[i][j] : P2.v[k][j], NAMEW);\n            n++;\n            int inR = 0;\n            for (int r = 0; r < R->n && !inR; r++) inR = same_on(row, R->v[r], A1 | A2, ncol);\n            if (!inR) (*spurious)++;\n        }\n    return n;\n}",
  "tags": {
   "sp_proj": [
    11
   ],
   "sp_outer": [
    25
   ],
   "sp_match": [
    27
   ],
   "sp_emit": [
    31
   ],
   "sp_fake": [
    34
   ]
  }
 },
 "ch09_transfer": {
  "file": "09_tx.c",
  "code": "/* crash_at: 0 — без срив; 1 — срив след първия запис; 2 — срив преди COMMIT */\ntypedef struct { int acc; int old; } Undo;\n\nint transfer(int bal[], int from, int to, int amount, int crash_at, int *undone)\n{\n    Undo log[4]; int nlog = 0;                 /* BEGIN */\n    *undone = 0;\n    if (bal[from] < amount)                    /* ограничение: баланс >= 0 */\n        goto rollback;\n    log[nlog++] = (Undo){ from, bal[from] };   /* журнал: старата стойност */\n    bal[from] -= amount;\n    if (crash_at == 1) goto rollback;\n    log[nlog++] = (Undo){ to, bal[to] };\n    bal[to] += amount;\n    if (crash_at == 2) goto rollback;\n    return 1;                                  /* COMMIT */\nrollback:\n    while (nlog > 0) {                         /* ROLLBACK: обратен ред */\n        nlog--;\n        bal[log[nlog].acc] = log[nlog].old;\n        (*undone)++;\n    }\n    return 0;\n}",
  "tags": {
   "t_begin": [
    6
   ],
   "t_check": [
    8
   ],
   "t_log1": [
    10
   ],
   "t_w1": [
    11
   ],
   "t_crash1": [
    12
   ],
   "t_log2": [
    13
   ],
   "t_w2": [
    14
   ],
   "t_crash2": [
    15
   ],
   "t_commit": [
    16
   ],
   "t_undo": [
    18
   ],
   "t_abort": [
    23
   ]
  }
 },
 "ch09_schedule": {
  "file": "09_tx.c",
  "code": "/* Разписание: \"R1 R2 W1 W2 C1 C2\". Ri — Ti чете x; Wi — Ti записва; Ci — COMMIT.\n   mode 0: прочитане и после запис на изчислената стойност (read–modify–write)\n   mode 1: атомарна команда UPDATE x = x - d (четенето и записът са една стъпка)\n   mode 2: Ri взема изключително заключване, освобождава се при Ci; чакащата операция се отлага */\nint run_schedule(const char *sched, int x0, const int d[3], int mode, int *waits)\n{\n    int x = x0, local[3] = { 0, 0, 0 }, lock = 0;   /* lock: 0 — свободно, i — държи Ti */\n    char ops[32][3]; int n = 0;\n    for (const char *p = sched; *p && n < 32; ) {\n        while (*p == ' ') p++;\n        if (!*p) break;\n        ops[n][0] = p[0]; ops[n][1] = p[1]; ops[n][2] = '\\0'; n++;\n        p += 2;\n    }\n    int done[32] = { 0 }, left = n;\n    *waits = 0;\n    while (left > 0) {\n        int progressed = 0;\n        for (int k = 0; k < n; k++) {\n            if (done[k]) continue;\n            int t = ops[k][1] - '0';\n            int blocked = 0;   /* по-ранна неизпълнена операция на същата транзакция */\n            for (int j = 0; j < k; j++) if (!done[j] && ops[j][1] - '0' == t) blocked = 1;\n            if (blocked) continue;\n            if (mode == 2 && ops[k][0] == 'R' && lock && lock != t) {\n                (*waits)++;\n                continue;\n            }\n            if (ops[k][0] == 'R') {\n                if (mode == 2) lock = t;\n                if (mode != 1) local[t] = x;\n            } else if (ops[k][0] == 'W') {\n                if (mode == 1) x = x - d[t];\n                else x = local[t] - d[t];\n            } else if (ops[k][0] == 'C') {\n                if (lock == t) lock = 0;\n            }\n            done[k] = 1; left--; progressed = 1;\n            break;          /* след всяка изпълнена операция — отначало по разписанието */\n        }\n        if (!progressed) break;   /* взаимно блокиране: не се случва с тези разписания */\n    }\n    return x;\n}",
  "tags": {
   "s_next": [
    19
   ],
   "s_wait": [
    25
   ],
   "s_lock": [
    30
   ],
   "s_read": [
    31
   ],
   "s_atomic": [
    33
   ],
   "s_write": [
    34
   ],
   "s_commit": [
    36
   ],
   "s_end": [
    43
   ]
  }
 },
 "ch09_index": {
  "file": "09_tx.c",
  "code": "/* Последователно четене: сравнява всеки ред (n сравнения при липса) */\nint seq_scan(const int keys[], int n, int key, int *cmp)\n{\n    *cmp = 0;\n    for (int i = 0; i < n; i++) {\n        (*cmp)++;\n        if (keys[i] == key) return i;\n    }\n    return -1;\n}\n/* Индекс: подреден масив от ключове -> двоично търсене, ~log2(n) сравнения */\nint index_lookup(const int idx[], int n, int key, int *cmp)\n{\n    int lo = 0, hi = n - 1;\n    *cmp = 0;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        (*cmp)++;\n        if (idx[mid] == key) return mid;\n        if (idx[mid] < key) lo = mid + 1; else hi = mid - 1;\n    }\n    return -1;\n}\n/* Цена за поддръжка: при всяко вмъкване в таблицата индексът също се променя */\nint index_insert(int idx[], int n, int key, int *moves)\n{\n    int i = n;\n    *moves = 0;\n    while (i > 0 && idx[i - 1] > key) {\n        idx[i] = idx[i - 1];\n        i--; (*moves)++;\n    }\n    idx[i] = key;\n    return n + 1;\n}",
  "tags": {
   "ix_scan": [
    5
   ],
   "ix_hit": [
    7
   ],
   "ix_bs": [
    16
   ],
   "ix_found": [
    19
   ],
   "ix_shift": [
    29
   ],
   "ix_put": [
    33
   ]
  }
 }
};
