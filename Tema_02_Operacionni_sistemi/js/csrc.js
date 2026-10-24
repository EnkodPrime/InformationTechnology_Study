/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "s01_bufio": {
  "file": "01_sastav.c",
  "code": "/* Тук реалната библиотека прави write(fd, b->data, b->len). */\nstatic void do_syscall_write(OutBuf *b)\n{\n    memcpy(b->sink + b->sink_len, b->data, (size_t)b->len);\n    b->sink_len += b->len;\n    b->syscalls++;\n    b->len = 0;\n}\n\nstatic void out_flush(OutBuf *b)\n{\n    if (b->len > 0)\n        do_syscall_write(b);\n}\n\n/* Библиотечна функция: обикновено НЕ влиза в ядрото. */\nstatic void out_putc(OutBuf *b, char c)\n{\n    b->data[b->len++] = c;\n    if (b->mode == MODE_NONE)\n        out_flush(b);\n    else if (b->mode == MODE_LINE && c == '\\n')\n        out_flush(b);\n    else if (b->len == b->cap)\n        out_flush(b);\n}",
  "tags": {
   "sys": [
    4,
    6
   ],
   "flush": [
    12
   ],
   "put": [
    19
   ],
   "none": [
    20
   ],
   "line": [
    22
   ],
   "full": [
    24
   ]
  }
 },
 "s02_states": {
  "file": "02_procesi.c",
  "code": "/* Избира следващия готов процес (FIFO) — само ако процесорът е свободен. */\nstatic void dispatch(Kernel *k)\n{\n    if (k->running >= 0 || k->rq_len == 0) {\n        if (k->running < 0) k->last = -1;   /* процесорът остава свободен */\n        return;\n    }\n    int i = rq_pop(k);\n    k->p[i].state = RUNNING;\n    k->running = i;\n    if (i != k->last)            /* същият процес отново: няма превключване */\n        k->ctx_switches++;       /* възстановяваме контекста на i */\n    k->last = i;\n}\n\n/* Обработка на едно събитие. Връща -1 при недопустимо събитие. */\nstatic int on_event(Kernel *k, char ev, int target)\n{\n    k->kernel_entries++;         /* смяна на режим: влизаме в ядрото */\n    int r = k->running;\n    if (r >= 0) k->p[r].pc = k->clock;   /* запазваме контекста */\n    switch (ev) {\n    case 't':\n        if (r < 0) return -1;\n        k->p[r].state = READY;   /* изпреварване: обратно в опашката */\n        rq_push(k, r);\n        k->running = -1;\n        break;\n    case 'w':\n        if (r < 0) return -1;\n        k->p[r].state = BLOCKED; /* чака събитие — не е в опашката */\n        k->running = -1;\n        break;\n    case 'd':\n        if (target < 0 || target >= k->n || k->p[target].state != BLOCKED)\n            return -1;\n        k->p[target].state = READY;   /* ГОТОВ, не веднага изпълняващ се */\n        rq_push(k, target);\n        break;\n    case 'x':\n        if (r < 0) return -1;\n        k->p[r].state = DONE;\n        k->running = -1;\n        break;\n    default:\n        return -1;\n    }\n    dispatch(k);\n    k->clock++;\n    return 0;                    /* връщане в потребителски режим */\n}",
  "tags": {
   "disp": [
    4
   ],
   "run": [
    9
   ],
   "ctx": [
    12
   ],
   "enter": [
    19
   ],
   "tmo": [
    23
   ],
   "wait": [
    29
   ],
   "io": [
    34
   ],
   "wake": [
    37
   ],
   "exit": [
    40
   ],
   "sched": [
    48
   ],
   "ret": [
    50
   ]
  }
 },
 "s03_sched": {
  "file": "03_planirane.c",
  "code": "static void schedule(int pol, int q, const Job *j, int n, Result *R)\n{\n    int rem[MAXN], queue[MAXT + MAXN], qh = 0, qt = 0;   /* qt <= пристигания + 1 добавяне на единица време */\n    int cur = -1, slice = 0, done = 0, t = 0, prev = -1;\n    memset(R, 0, sizeof *R);\n    for (int i = 0; i < n; i++) { rem[i] = j[i].burst; R->start[i] = -1; }\n    while (done < n && t < MAXT) {\n        for (int i = 0; i < n; i++)                     /* пристигания */\n            if (j[i].arr == t) queue[qt++] = i;\n        if (pol == RR && cur >= 0 && slice == q) {      /* изтекъл квант */\n            queue[qt++] = cur;\n            cur = -1;\n        }\n        int preempt = (pol == SRTF || pol == PPRIO);\n        if (cur < 0 || preempt) {\n            int best = cur, bi = -1;\n            for (int k = qh; k < qt; k++) {\n                int c = queue[k];\n                if (pol == FCFS || pol == RR) { if (bi < 0) { best = c; bi = k; } }\n                else if (better(pol, j, rem, c, best)) { best = c; bi = k; }\n            }\n            if (bi >= 0) {\n                if (cur >= 0) queue[qt++] = cur;        /* изпреварен */\n                for (int k = bi; k > qh; k--) queue[k] = queue[k - 1];\n                qh++;\n                cur = best;\n                slice = 0;\n                if (R->start[cur] < 0) R->start[cur] = t;\n            }\n        }\n        R->timeline[t] = cur;\n        if (cur >= 0) {\n            if (prev >= 0 && prev != cur) R->switches++;\n            prev = cur;\n            rem[cur]--; slice++;\n            if (rem[cur] == 0) {\n                R->finish[cur] = t + 1;\n                done++;\n                cur = -1;\n            }\n        }\n        t++;\n    }\n    R->T = t;\n    for (int i = 0; i < n; i++) {\n        int tat = R->finish[i] - j[i].arr;\n        R->tat_sum  += tat;                             /* обръщане */\n        R->wait_sum += tat - j[i].burst;                /* чакане   */\n        R->resp_sum += R->start[i] - j[i].arr;          /* отговор  */\n    }\n}",
  "tags": {
   "arrive": [
    9
   ],
   "quantum": [
    11
   ],
   "pick": [
    15
   ],
   "cmp": [
    20
   ],
   "preempt": [
    23
   ],
   "first": [
    28
   ],
   "run": [
    31
   ],
   "finish": [
    36
   ],
   "metrics": [
    46
   ]
  }
 },
 "s04_race": {
  "file": "04_sinhronizacia.c",
  "code": "/* Една микростъпка на нишка id. Без мютекс стъпките lock/unlock се прескачат. */\nstatic void step(Shared *s, Thr *t, int id)\n{\n    switch (t->pc) {\n    case 0:                                   /* lock(&m) */\n        if (!s->use_mutex) { t->pc = 1; step(s, t, id); return; }\n        if (s->owner >= 0) { s->blocked_steps++; return; }\n        s->owner = id;\n        t->pc = 1;\n        return;\n    case 1: t->r = s->counter; t->pc = 2; return;\n    case 2: t->r = t->r + 1;   t->pc = 3; return;\n    case 3:\n        s->counter = t->r;\n        t->pc = s->use_mutex ? 4 : 0;\n        if (!s->use_mutex) t->left--;\n        return;\n    case 4:\n        s->owner = -1;\n        t->pc = 0;\n        t->left--;\n        return;\n    }\n}",
  "tags": {
   "blocked": [
    7
   ],
   "lock": [
    8
   ],
   "load": [
    11
   ],
   "add": [
    12
   ],
   "store": [
    14
   ],
   "unlock": [
    19
   ]
  }
 },
 "s04_pc": {
  "file": "04_sinhronizacia.c",
  "code": "/* wait(S): ако S == 0 — нишката е блокирана и ще опита отново. */\nstatic int sem_wait_m(int *s)  { if (*s == 0) return 0; (*s)--; return 1; }\nstatic void sem_signal_m(int *s) { (*s)++; }\n\nstatic void producer_step(PC *q)\n{\n    switch (q->ppc) {\n    case 0: q->item = ++q->next_item; q->ppc = 1; break;\n    case 1: if (sem_wait_m(&q->empty)) q->ppc = 2; else q->p_blocked++; break;\n    case 2: if (sem_wait_m(&q->mutex)) q->ppc = 3; else q->p_blocked++; break;\n    case 3: q->buf[q->in] = q->item;\n            q->in = (q->in + 1) % q->cap; q->count++; q->ppc = 4; break;\n    case 4: sem_signal_m(&q->mutex); q->ppc = 5; break;\n    case 5: sem_signal_m(&q->full); q->produced++; q->ppc = 0; break;\n    }\n}\n\nstatic void consumer_step(PC *q)\n{\n    switch (q->cpc) {\n    case 0: if (sem_wait_m(&q->full)) q->cpc = 1; else q->c_blocked++; break;\n    case 1: if (sem_wait_m(&q->mutex)) q->cpc = 2; else q->c_blocked++; break;\n    case 2: q->citem = q->buf[q->out];\n            q->out = (q->out + 1) % q->cap; q->count--; q->cpc = 3; break;\n    case 3: sem_signal_m(&q->mutex); q->cpc = 4; break;\n    case 4: sem_signal_m(&q->empty); q->cpc = 5; break;\n    case 5: q->consumed++; q->sum_consumed += q->citem; q->cpc = 0; break;\n    }\n}",
  "tags": {
   "pmake": [
    8
   ],
   "pempty": [
    9
   ],
   "plock": [
    10
   ],
   "pput": [
    11
   ],
   "punlock": [
    13
   ],
   "pfull": [
    14
   ],
   "cfull": [
    21
   ],
   "clock": [
    22
   ],
   "cget": [
    23
   ],
   "cunlock": [
    25
   ],
   "cempty": [
    26
   ],
   "cuse": [
    27
   ]
  }
 },
 "s04_pthread": {
  "file": "04_sinhronizacia.c",
  "code": "static long counter = 0;\nstatic pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;\n\nstatic void *worker(void *arg)\n{\n    long n = *(const long *)arg;\n    for (long i = 0; i < n; i++) {\n        pthread_mutex_lock(&m);       /* вход в критичния участък */\n        counter++;                    /* четене–изменение–запис  */\n        pthread_mutex_unlock(&m);     /* изход                    */\n    }\n    return NULL;\n}",
  "tags": {}
 },
 "s05_cycle": {
  "file": "05_deadlock.c",
  "code": "static int waits_for(const int *hold, const int *want, int p)\n{\n    return want[p] >= 0 ? hold[want[p]] : -1;\n}\n\n/* Връща дължината на цикъла, намерен от p, или 0. */\nstatic int find_cycle(const int *hold, const int *want, int n, int p, int *cyc)\n{\n    int seen[MAXP];\n    memset(seen, -1, sizeof seen);\n    int len = 0;\n    while (p >= 0 && seen[p] < 0) {\n        seen[p] = len;\n        cyc[len++] = p;\n        p = waits_for(hold, want, p);\n    }\n    if (p < 0) return 0;\n    int start = seen[p];\n    memmove(cyc, cyc + start, (size_t)(len - start) * sizeof *cyc);\n    (void)n;\n    return len - start;\n}",
  "tags": {
   "edge": [
    3
   ],
   "walk": [
    12
   ],
   "next": [
    15
   ],
   "nocycle": [
    17
   ],
   "cycle": [
    18
   ]
  }
 },
 "s05_banker": {
  "file": "05_deadlock.c",
  "code": "/* Безопасно ли е състоянието? order[] получава безопасната последователност. */\nstatic int is_safe(const Bank *b, int *order)\n{\n    int work[MAXR], finish[MAXP] = {0}, k = 0;\n    memcpy(work, b->avail, sizeof work);\n    for (int found = 1; found;) {\n        found = 0;\n        for (int i = 0; i < b->n; i++) {\n            if (finish[i]) continue;\n            int ok = 1;\n            for (int j = 0; j < b->m; j++)\n                if (b->max[i][j] - b->alloc[i][j] > work[j]) { ok = 0; break; }\n            if (!ok) continue;\n            for (int j = 0; j < b->m; j++)\n                work[j] += b->alloc[i][j];\n            finish[i] = 1;\n            order[k++] = i;\n            found = 1;\n        }\n    }\n    return k == b->n;\n}\n\n/* Заявка от процес p: 1 = удовлетворена, 0 = трябва да чака, -1 = грешка */\nstatic int request(Bank *b, int p, const int *req)\n{\n    int order[MAXP];\n    for (int j = 0; j < b->m; j++)\n        if (req[j] > b->max[p][j] - b->alloc[p][j]) return -1;\n    for (int j = 0; j < b->m; j++)\n        if (req[j] > b->avail[j]) return 0;\n    Bank t = *b;                                  /* пробно разпределение */\n    for (int j = 0; j < b->m; j++) {\n        t.avail[j] -= req[j];\n        t.alloc[p][j] += req[j];\n    }\n    if (!is_safe(&t, order)) return 0;\n    *b = t;\n    return 1;\n}",
  "tags": {
   "init": [
    5
   ],
   "need": [
    11
   ],
   "skip": [
    13
   ],
   "release": [
    15
   ],
   "verdict": [
    21
   ],
   "rq_err": [
    29
   ],
   "rq_avail": [
    31
   ],
   "rq_try": [
    34
   ],
   "rq_unsafe": [
    37
   ],
   "rq_grant": [
    38
   ]
  }
 },
 "s06_translate": {
  "file": "06_pamet.c",
  "code": "/* Връща физическия адрес или -1 при невалиден достъп; *kind = какво се случи. */\nstatic long translate(MMU *m, unsigned vaddr, int write, int *kind)\n{\n    unsigned page = vaddr >> m->shift;\n    unsigned off  = vaddr & ((1u << m->shift) - 1);\n    int t = tlb_lookup(m, (int)page);\n    if (t >= 0 && !(write && m->pt[page].perm != P_W)) {\n        m->hits++;\n        *kind = OK_TLB;\n        return ((long)m->tlb_frame[t] << m->shift) | off;\n    }\n    m->misses++;\n    if (page >= (unsigned)m->npages) {\n        m->invalid++;\n        *kind = FAULT_INVALID;\n        return -1;\n    }\n    PTE *e = &m->pt[page];\n    *kind = OK_WALK;\n    if (!e->present) {\n        m->faults++;\n        e->present = 1;              /* зареждане от носител */\n        e->frame = m->next_free++;\n        *kind = FAULT_LOAD;\n    }\n    if (write && e->perm == P_R) {\n        m->invalid++;\n        *kind = FAULT_INVALID;\n        return -1;\n    }\n    if (write && e->perm == P_C) {\n        m->faults++;\n        e->frame = m->next_free++;   /* отделно копие */\n        e->perm = P_W;\n        *kind = FAULT_COW;\n    }\n    tlb_insert(m, (int)page, e->frame);\n    return ((long)e->frame << m->shift) | off;\n}",
  "tags": {
   "split": [
    4,
    5
   ],
   "tlb": [
    6
   ],
   "hit": [
    8
   ],
   "phys": [
    10,
    38
   ],
   "miss": [
    12
   ],
   "walk": [
    13
   ],
   "invalid": [
    15,
    28
   ],
   "absent": [
    20
   ],
   "load": [
    23
   ],
   "rights": [
    26
   ],
   "cow": [
    31
   ],
   "fill": [
    37
   ]
  }
 },
 "s07_fit": {
  "file": "07_zamestvane.c",
  "code": "static int choose(const Mem *m, int need, int pol)\n{\n    int pick = -1;\n    for (int i = 0; i < m->n; i++) {\n        if (m->b[i].owner || m->b[i].size < need) continue;\n        if (pick < 0) { pick = i; if (pol == FIRST) break; continue; }\n        if (pol == BEST  && m->b[i].size < m->b[pick].size) pick = i;\n        if (pol == WORST && m->b[i].size > m->b[pick].size) pick = i;\n    }\n    return pick;\n}\n\nstatic int alloc(Mem *m, int need, int pol)\n{\n    int i = choose(m, need, pol);\n    if (i < 0) { m->failed++; return -1; }\n    int id = ++m->next_id;\n    if (m->b[i].size > need) {                                 /* разделяне */\n        memmove(&m->b[i + 2], &m->b[i + 1], (size_t)(m->n - i - 1) * sizeof(Block));\n        m->b[i + 1] = (Block){m->b[i].start + need, m->b[i].size - need, 0};\n        m->n++;\n    }\n    m->b[i].size = need;\n    m->b[i].owner = id;\n    return id;\n}\n\nstatic void release(Mem *m, int id)\n{\n    for (int i = 0; i < m->n; i++) {\n        if (m->b[i].owner != id) continue;\n        m->b[i].owner = 0;\n        if (i + 1 < m->n && !m->b[i + 1].owner) {              /* сливане надясно */\n            m->b[i].size += m->b[i + 1].size;\n            memmove(&m->b[i + 1], &m->b[i + 2], (size_t)(m->n - i - 2) * sizeof(Block));\n            m->n--;\n        }\n        if (i > 0 && !m->b[i - 1].owner) {                     /* сливане наляво */\n            m->b[i - 1].size += m->b[i].size;\n            memmove(&m->b[i], &m->b[i + 1], (size_t)(m->n - i - 1) * sizeof(Block));\n            m->n--;\n        }\n        return;\n    }\n}",
  "tags": {
   "scan": [
    5
   ],
   "first": [
    6
   ],
   "best": [
    7
   ],
   "worst": [
    8
   ],
   "fail": [
    16
   ],
   "split": [
    20
   ],
   "take": [
    24
   ],
   "free": [
    32
   ],
   "merge": [
    34,
    39
   ]
  }
 },
 "s07_replace": {
  "file": "07_zamestvane.c",
  "code": "static int replace(int pol, const int *ref, int n, int nf, int *victims)\n{\n    int frame[MAXF], loaded[MAXF], used[MAXF], refbit[MAXF];\n    int cnt = 0, faults = 0, hand = 0;\n    for (int t = 0; t < n; t++) {\n        int p = ref[t], hit = -1;\n        victims[t] = -1;\n        for (int i = 0; i < cnt; i++) if (frame[i] == p) hit = i;\n        if (hit >= 0) {\n            used[hit] = t;\n            refbit[hit] = 1;\n            continue;\n        }\n        faults++;\n        int v, evict = 1;\n        if (cnt < nf) { v = cnt++; evict = 0; }\n        else if (pol == R_FIFO) {                             /* най-рано заредена */\n            v = 0;\n            for (int i = 1; i < nf; i++) if (loaded[i] < loaded[v]) v = i;\n        } else if (pol == R_LRU) {                            /* най-отдавна ползвана */\n            v = 0;\n            for (int i = 1; i < nf; i++) if (used[i] < used[v]) v = i;\n        } else if (pol == R_OPT) {                            /* най-далечно бъдещо ползване */\n            int far = -1; v = 0;\n            for (int i = 0; i < nf; i++) {\n                int nx = n;                                   /* n = никога повече */\n                for (int k = t + 1; k < n; k++) if (ref[k] == frame[i]) { nx = k; break; }\n                if (nx > far) { far = nx; v = i; }\n            }\n        } else {                                              /* Clock: втори шанс */\n            while (refbit[hand]) {\n                refbit[hand] = 0;\n                hand = (hand + 1) % nf;\n            }\n            v = hand;\n            hand = (hand + 1) % nf;\n        }\n        if (evict) victims[t] = frame[v];                    /* жертва */\n        frame[v] = p;\n        loaded[v] = t;\n        used[v] = t;\n        refbit[v] = 1;\n    }\n    return faults;\n}",
  "tags": {
   "look": [
    8
   ],
   "hit": [
    9
   ],
   "fault": [
    14
   ],
   "freeframe": [
    16
   ],
   "fifo": [
    19
   ],
   "lru": [
    22
   ],
   "opt": [
    28
   ],
   "clock": [
    31
   ],
   "load": [
    39
   ]
  }
 },
 "s08_inode": {
  "file": "08_fs.c",
  "code": "static void maybe_free(FS *fs, int ino)\n{\n    Inode *n = &fs->in[ino];\n    if (n->nlink == 0 && n->nopen == 0) {\n        n->used = 0;                             /* данните се освобождават */\n        fs->freed++;\n    }\n}\n\nstatic int fs_create(FS *fs, const char *name, const char *data)\n{\n    if (lookup(fs, name) >= 0 || fs->nd >= MAXD) return -1;\n    int ino = new_inode(fs);\n    if (ino < 0) return -1;\n    snprintf(fs->in[ino].data, NAMEL, \"%s\", data);\n    fs->in[ino].nlink = 1;\n    add_name(fs, name, ino);\n    return ino;\n}\n\nstatic int fs_link(FS *fs, const char *old, const char *name)   /* твърда връзка */\n{\n    int e = lookup(fs, old);\n    if (e < 0 || lookup(fs, name) >= 0 || fs->nd >= MAXD) return -1;\n    int ino = fs->d[e].ino;\n    fs->in[ino].nlink++;\n    add_name(fs, name, ino);\n    return ino;\n}\n\nstatic int fs_symlink(FS *fs, const char *target, const char *name)\n{\n    if (lookup(fs, name) >= 0 || fs->nd >= MAXD) return -1;\n    int ino = new_inode(fs);\n    if (ino < 0) return -1;\n    fs->in[ino].is_symlink = 1;\n    fs->in[ino].nlink = 1;\n    snprintf(fs->in[ino].data, NAMEL, \"%s\", target);  /* пази ПЪТ, не inode */\n    add_name(fs, name, ino);\n    return ino;\n}\n\nstatic int fs_unlink(FS *fs, const char *name)\n{\n    int e = lookup(fs, name);\n    if (e < 0) return -1;\n    int ino = fs->d[e].ino;\n    fs->d[e] = fs->d[--fs->nd];\n    fs->in[ino].nlink--;\n    maybe_free(fs, ino);\n    return 0;\n}\n\n/* Отваряне: следва символна връзка (едно ниво). Връща дескриптор или -1. */\nstatic int fs_open(FS *fs, const char *name)\n{\n    int e = lookup(fs, name);\n    if (e < 0 || fs->nfd >= MAXD) return -1;\n    int ino = fs->d[e].ino;\n    if (fs->in[ino].is_symlink) {\n        e = lookup(fs, fs->in[ino].data);\n        if (e < 0) return -1;                    /* висяща връзка */\n        ino = fs->d[e].ino;\n    }\n    fs->in[ino].nopen++;\n    fs->fd_ino[fs->nfd] = ino;\n    return fs->nfd++;\n}\n\nstatic void fs_close(FS *fs, int fd)\n{\n    int ino = fs->fd_ino[fd];\n    if (ino < 0) return;\n    fs->fd_ino[fd] = -1;\n    fs->in[ino].nopen--;\n    maybe_free(fs, ino);\n}",
  "tags": {
   "free": [
    4
   ],
   "create": [
    13
   ],
   "name": [
    17,
    27,
    39
   ],
   "link": [
    26
   ],
   "symlink": [
    34
   ],
   "unlink": [
    48
   ],
   "noent": [
    58
   ],
   "follow": [
    60
   ],
   "dangling": [
    62
   ],
   "open": [
    65
   ],
   "close": [
    75
   ]
  }
 },
 "s08_alloc": {
  "file": "08_fs.c",
  "code": "/* Брой четения от диска, за да се стигне до логически блок k на файла. */\nstatic int reads_to_block(int method, int k)\n{\n    switch (method) {\n    case CONTIG:  return 1;          /* адрес = начало + k */\n    case LINKED:  return k + 1;      /* следваме k указателя */\n    case INDEXED: return 2;          /* индексен блок + блок с данни */\n    }\n    return -1;\n}\n\n/* Разполага файл от n блока върху диска (used[] = 1 за заети). */\nstatic int place(int method, int *used, int n, int *blocks, int *index_blk)\n{\n    *index_blk = -1;\n    if (method == CONTIG) {                          /* търси n поредни */\n        for (int s = 0; s + n <= DISK; s++) {\n            int ok = 1;\n            for (int i = 0; i < n; i++) if (used[s + i]) { ok = 0; break; }\n            if (ok) {\n                for (int i = 0; i < n; i++) { used[s + i] = 1; blocks[i] = s + i; }\n                return 0;\n            }\n        }\n        return -1;                                   /* външна фрагментация */\n    }\n    int need = n + (method == INDEXED ? 1 : 0), got = 0, tmp[DISK];\n    for (int b = 0; b < DISK && got < need; b++) if (!used[b]) tmp[got++] = b;\n    if (got < need) return -1;\n    int off = 0;\n    if (method == INDEXED) { *index_blk = tmp[0]; used[tmp[0]] = 1; off = 1; }\n    for (int i = 0; i < n; i++) { blocks[i] = tmp[i + off]; used[blocks[i]] = 1; }\n    return 0;\n}",
  "tags": {
   "contig": [
    5
   ],
   "linked": [
    6
   ],
   "indexed": [
    7
   ],
   "cfit": [
    20
   ],
   "cfail": [
    25
   ],
   "scatter": [
    28
   ],
   "iblock": [
    31
   ]
  }
 }
};
