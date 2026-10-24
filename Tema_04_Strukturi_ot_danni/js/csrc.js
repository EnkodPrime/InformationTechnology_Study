/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_contract": {
  "file": "01_adt.c",
  "code": "/* ---- Договор (АТД): стойности + операции + поведение ---- */\ntypedef struct Stack Stack;\ntypedef struct {\n    const char *name;\n    Stack *(*create)(int capacity);\n    int  (*push)(Stack *s, int x);        /* 0 = успех, -1 = няма място  */\n    int  (*pop)(Stack *s, int *out);      /* 0 = успех, -1 = празен стек */\n    int  (*top)(const Stack *s, int *out);\n    int  (*empty)(const Stack *s);\n    void (*destroy)(Stack *s);\n} StackOps;\n\n/* ---- Клиент: знае само договора, не и разположението в паметта ---- */\nvoid client_step(const StackOps *ops, Stack *s, const Op *op, Out *o)\n{\n    int v;\n    if (op_is(op, \"push\"))\n        out_add(o, ops->push(s, op_int(op, 0)) == 0 ? \"ok\" : \"full\");\n    else if (op_is(op, \"pop\")) {\n        if (ops->pop(s, &v) == 0) out_int(o, v); else out_add(o, \"E\");\n    } else if (op_is(op, \"top\")) {\n        if (ops->top(s, &v) == 0) out_int(o, v); else out_add(o, \"E\");\n    } else if (op_is(op, \"empty\"))\n        out_int(o, ops->empty(s));\n}",
  "tags": {
   "c_push": [
    17
   ],
   "c_pop": [
    19
   ],
   "c_top": [
    21
   ],
   "c_empty": [
    23
   ]
  }
 },
 "ch01_array": {
  "file": "01_adt.c",
  "code": "/* ---- Реализация 1: масив с фиксиран капацитет ----\n   Инвариант: 0 <= size <= cap; елементите са в a[0..size-1]; върхът е a[size-1] */\nstruct Stack { int *a; int size, cap; void *top_node; };\n\nstatic Stack *arr_create(int cap)\n{\n    Stack *s = malloc(sizeof *s);\n    s->a = malloc((size_t)cap * sizeof *s->a);\n    s->size = 0; s->cap = cap; s->top_node = NULL;\n    return s;\n}\nstatic int arr_push(Stack *s, int x)\n{\n    if (s->size == s->cap) return -1;\n    s->a[s->size++] = x;\n    return 0;\n}\nstatic int arr_pop(Stack *s, int *out)\n{\n    if (s->size == 0) return -1;\n    *out = s->a[--s->size];\n    return 0;\n}\nstatic int arr_top(const Stack *s, int *out)\n{\n    if (s->size == 0) return -1;\n    *out = s->a[s->size - 1];\n    return 0;\n}\nstatic int arr_empty(const Stack *s) { return s->size == 0; }\nstatic void arr_destroy(Stack *s) { free(s->a); free(s); }",
  "tags": {
   "a_full": [
    14
   ],
   "a_push": [
    15
   ],
   "a_empty": [
    20,
    26
   ],
   "a_pop": [
    21
   ],
   "a_top": [
    27
   ],
   "a_isempty": [
    30
   ]
  }
 },
 "ch01_list": {
  "file": "01_adt.c",
  "code": "/* ---- Реализация 2: свързани възли; върхът е първият възел ----\n   Инвариант: веригата от top_node по next е редът на изваждане */\ntypedef struct LNode { int v; struct LNode *next; } LNode;\n\nstatic Stack *lst_create(int cap)\n{\n    (void)cap;                    /* няма предварителен капацитет */\n    Stack *s = malloc(sizeof *s);\n    s->a = NULL; s->size = 0; s->cap = 0; s->top_node = NULL;\n    return s;\n}\nstatic int lst_push(Stack *s, int x)\n{\n    LNode *n = malloc(sizeof *n);\n    if (!n) return -1;            /* само при изчерпана памет */\n    n->v = x;\n    n->next = s->top_node;\n    s->top_node = n;\n    return 0;\n}\nstatic int lst_pop(Stack *s, int *out)\n{\n    LNode *n = s->top_node;\n    if (!n) return -1;\n    *out = n->v;\n    s->top_node = n->next;\n    free(n);\n    return 0;\n}\nstatic int lst_top(const Stack *s, int *out)\n{\n    const LNode *n = s->top_node;\n    if (!n) return -1;\n    *out = n->v;\n    return 0;\n}\nstatic int lst_empty(const Stack *s) { return s->top_node == NULL; }\nstatic void lst_destroy(Stack *s)\n{\n    int v;\n    while (lst_pop(s, &v) == 0) { }\n    free(s);\n}",
  "tags": {
   "l_push": [
    14
   ],
   "l_link": [
    17
   ],
   "l_head": [
    18
   ],
   "l_empty": [
    24,
    33
   ],
   "l_pop": [
    25
   ],
   "l_unlink": [
    26
   ],
   "l_free": [
    27
   ],
   "l_top": [
    34
   ],
   "l_isempty": [
    37
   ]
  }
 },
 "ch02_dyn": {
  "file": "02_stack.c",
  "code": "/* Стек върху динамичен масив. Инвариант: 0 <= size <= cap,\n   елементите са в a[0..size-1], върхът е a[size-1]. */\ntypedef struct { int *a; int size, cap; } DStack;\n\nstatic void ds_grow(DStack *s)\n{\n    int ncap = s->cap * 2;                       /* геометричен растеж */\n    int *b = malloc((size_t)ncap * sizeof *b);\n    for (int i = 0; i < s->size; i++) {          /* Θ(size) копирания */\n        b[i] = s->a[i];\n        g_copies++;\n    }\n    free(s->a);\n    s->a = b;\n    s->cap = ncap;\n    g_grows++;\n}\nvoid ds_push(DStack *s, int x)\n{\n    if (s->size == s->cap)\n        ds_grow(s);\n    s->a[s->size++] = x;                         /* Θ(1), ако има място */\n}\nint ds_pop(DStack *s, int *out)\n{\n    if (s->size == 0) return -1;                 /* договор: -1 при празен */\n    *out = s->a[--s->size];\n    return 0;\n}\nint ds_top(const DStack *s, int *out)\n{\n    if (s->size == 0) return -1;\n    *out = s->a[s->size - 1];\n    return 0;\n}",
  "tags": {
   "grow": [
    7
   ],
   "copy": [
    10
   ],
   "swapbuf": [
    14
   ],
   "full": [
    20
   ],
   "push": [
    22
   ],
   "empty": [
    26,
    32
   ],
   "pop": [
    27
   ],
   "top": [
    33
   ]
  }
 },
 "ch02_brackets": {
  "file": "02_stack.c",
  "code": "/* Проверка на скоби ( ) [ ] { }. Връща -1 при коректен низ,\n   иначе позицията на първата грешка (len — незатворена отваряща). */\nint check_brackets(const char *s)\n{\n    char st[256];\n    int top = 0;                                 /* празен стек */\n    int i;\n    for (i = 0; s[i]; i++) {\n        char c = s[i];\n        if (c == '(' || c == '[' || c == '{') {\n            if (top == (int)sizeof st) return i; /* препълване на стека: отказ, не запис извън масива */\n            st[top++] = c;                       /* push */\n        } else if (c == ')' || c == ']' || c == '}') {\n            char want = c == ')' ? '(' : c == ']' ? '[' : '{';\n            if (top == 0) return i;              /* няма отваряща */\n            if (st[top - 1] != want) return i;   /* не съвпада с върха */\n            top--;                               /* pop */\n        }\n    }\n    return top == 0 ? -1 : i;                    /* в края стекът трябва да е празен */\n}",
  "tags": {
   "init": [
    6
   ],
   "loop": [
    8
   ],
   "push": [
    12
   ],
   "underflow": [
    15
   ],
   "mismatch": [
    16
   ],
   "pop": [
    17
   ],
   "end": [
    20
   ]
  }
 },
 "ch02_postfix": {
  "file": "02_stack.c",
  "code": "/* Изчисляване на постфиксен израз, напр. \"3 4 + 2 *\". Цели числа.\n   Връща 0 при успех; -1 при грешка (липсващ операнд, излишни, деление на 0). */\nint eval_postfix(const Op *toks, long *res)\n{\n    long st[64];\n    int top = 0;\n    for (int i = 0; i < toks->n; i++) {\n        const char *t = toks->arg[i];\n        if (strchr(\"+-*/\", t[0]) && t[1] == 0) {\n            if (top < 2) return -1;              /* липсва операнд */\n            long b = st[--top];                  /* десният е отгоре */\n            long a = st[--top];\n            long r;\n            if (t[0] == '+') r = a + b;\n            else if (t[0] == '-') r = a - b;\n            else if (t[0] == '*') r = a * b;\n            else { if (b == 0) return -1; r = a / b; }\n            st[top++] = r;\n        } else {\n            st[top++] = atol(t);                 /* операнд: push */\n        }\n    }\n    if (top != 1) return -1;                     /* точно една стойност */\n    *res = st[0];\n    return 0;\n}",
  "tags": {
   "init": [
    6
   ],
   "loop": [
    7
   ],
   "underflow": [
    10
   ],
   "popb": [
    11
   ],
   "popa": [
    12
   ],
   "apply": [
    17
   ],
   "pushr": [
    18
   ],
   "push": [
    20
   ],
   "end": [
    23
   ],
   "ret": [
    24
   ]
  }
 },
 "ch03_ring": {
  "file": "03_queue.c",
  "code": "/* Кръгов буфер: капацитет C, начало head, брой size.\n   Празно: size == 0.  Пълно: size == C.  Следващ запис: (head + size) mod C. */\ntypedef struct { int a[QMAX]; int C, head, size; int overwrite; } Ring;\n\nint ring_enqueue(Ring *q, int x)\n{\n    if (q->size == q->C) {\n        if (!q->overwrite) return -1;          /* политика: отказ */\n        q->head = (q->head + 1) % q->C;        /* политика: изтриваме най-стария */\n        q->size--;\n    }\n    int tail = (q->head + q->size) % q->C;\n    q->a[tail] = x;\n    q->size++;\n    return 0;\n}\nint ring_dequeue(Ring *q, int *out)\n{\n    if (q->size == 0) return -1;\n    *out = q->a[q->head];\n    q->head = (q->head + 1) % q->C;\n    q->size--;\n    return 0;\n}\nint ring_front(const Ring *q, int *out)\n{\n    if (q->size == 0) return -1;\n    *out = q->a[q->head];\n    return 0;\n}",
  "tags": {
   "full": [
    7
   ],
   "reject": [
    8
   ],
   "drop": [
    9
   ],
   "tail": [
    12
   ],
   "write": [
    13
   ],
   "empty": [
    19,
    27
   ],
   "read": [
    20
   ],
   "advance": [
    21
   ],
   "front": [
    28
   ]
  }
 },
 "ch03_ring2": {
  "file": "03_queue.c",
  "code": "/* Вариант само с два индекса: head (първи) и tail (следващ запис).\n   head == tail би значело и „празно“, и „пълно“ — затова една клетка\n   остава винаги неизползвана: полезният капацитет е C - 1. */\ntypedef struct { int a[QMAX]; int C, head, tail; } Ring2;\n\nint ring2_empty(const Ring2 *q) { return q->head == q->tail; }\nint ring2_full(const Ring2 *q)  { return (q->tail + 1) % q->C == q->head; }\n\nint ring2_enqueue(Ring2 *q, int x)\n{\n    if (ring2_full(q)) return -1;\n    q->a[q->tail] = x;\n    q->tail = (q->tail + 1) % q->C;\n    return 0;\n}\nint ring2_dequeue(Ring2 *q, int *out)\n{\n    if (ring2_empty(q)) return -1;\n    *out = q->a[q->head];\n    q->head = (q->head + 1) % q->C;\n    return 0;\n}",
  "tags": {
   "isempty": [
    6
   ],
   "isfull": [
    7
   ],
   "full": [
    11
   ],
   "write": [
    12
   ],
   "advt": [
    13
   ],
   "empty": [
    18
   ],
   "read": [
    19
   ],
   "advh": [
    20
   ]
  }
 },
 "ch03_linked": {
  "file": "03_queue.c",
  "code": "/* Свързана опашка: указатели към първия (front) и последния (rear) възел. */\ntypedef struct QNode { int v; struct QNode *next; } QNode;\ntypedef struct { QNode *front, *rear; } LQueue;\n\nvoid lq_enqueue(LQueue *q, int x)\n{\n    QNode *n = malloc(sizeof *n);\n    n->v = x;\n    n->next = NULL;\n    if (q->rear == NULL)\n        q->front = n;                  /* първи елемент */\n    else\n        q->rear->next = n;             /* закачаме в края */\n    q->rear = n;\n}\nint lq_dequeue(LQueue *q, int *out)\n{\n    QNode *n = q->front;\n    if (n == NULL) return -1;\n    *out = n->v;\n    q->front = n->next;\n    if (q->front == NULL)              /* опашката стана празна */\n        q->rear = NULL;\n    free(n);\n    return 0;\n}",
  "tags": {
   "new": [
    7
   ],
   "isempty": [
    10
   ],
   "first": [
    11
   ],
   "link": [
    13
   ],
   "rear": [
    14
   ],
   "empty": [
    19
   ],
   "read": [
    20
   ],
   "unlink": [
    21
   ],
   "clearrear": [
    23
   ],
   "free": [
    24
   ]
  }
 },
 "ch03_deque": {
  "file": "03_queue.c",
  "code": "/* Дек (double-ended queue) върху кръгов буфер: добавяне и премахване в двата края. */\ntypedef struct { int a[QMAX]; int C, head, size; } Deque;\n\nint dq_push_back(Deque *d, int x)\n{\n    if (d->size == d->C) return -1;\n    d->a[(d->head + d->size) % d->C] = x;\n    d->size++;\n    return 0;\n}\nint dq_push_front(Deque *d, int x)\n{\n    if (d->size == d->C) return -1;\n    d->head = (d->head - 1 + d->C) % d->C;   /* назад с прехвърляне */\n    d->a[d->head] = x;\n    d->size++;\n    return 0;\n}\nint dq_pop_front(Deque *d, int *out)\n{\n    if (d->size == 0) return -1;\n    *out = d->a[d->head];\n    d->head = (d->head + 1) % d->C;\n    d->size--;\n    return 0;\n}\nint dq_pop_back(Deque *d, int *out)\n{\n    if (d->size == 0) return -1;\n    *out = d->a[(d->head + d->size - 1) % d->C];\n    d->size--;\n    return 0;\n}",
  "tags": {
   "full": [
    6,
    13
   ],
   "pb": [
    7
   ],
   "pf": [
    14
   ],
   "empty": [
    21,
    29
   ],
   "popf": [
    22
   ],
   "popb": [
    30
   ]
  }
 },
 "ch04_single": {
  "file": "04_list.c",
  "code": "typedef struct SNode { int v; struct SNode *next; } SNode;\n\n/* Добавяне в началото: Θ(1) */\nvoid s_push_front(SNode **head, int x)\n{\n    SNode *n = malloc(sizeof *n);\n    n->v = x;\n    n->next = *head;\n    *head = n;\n}\n\n/* Добавяне в края без tail: първо се търси последният — Θ(n) */\nvoid s_push_back(SNode **head, int x)\n{\n    SNode *n = malloc(sizeof *n);\n    n->v = x;\n    n->next = NULL;\n    if (*head == NULL) { *head = n; return; }\n    SNode *p = *head;\n    while (p->next != NULL) { p = p->next; g_hops++; }\n    p->next = n;\n}\n\n/* Търсене по стойност: O(n). Връща указател или NULL. */\nSNode *s_find(SNode *head, int x, int *index)\n{\n    int i = 0;\n    for (SNode *p = head; p != NULL; p = p->next, i++) {\n        g_cmp++;\n        if (p->v == x) { *index = i; return p; }\n        g_hops++;\n    }\n    *index = -1;\n    return NULL;\n}\n\n/* Вмъкване на x след първия възел със стойност key.\n   Самото свързване е Θ(1); търсенето на P е O(n). */\nint s_insert_after(SNode *head, int key, int x)\n{\n    int i;\n    SNode *P = s_find(head, key, &i);\n    if (P == NULL) return -1;\n    SNode *X = malloc(sizeof *X);\n    X->v = x;\n    X->next = P->next;          /* 1) запазваме остатъка */\n    P->next = X;                /* 2) едва после пренасочваме P */\n    return 0;\n}\n\n/* Изтриване на първия възел със стойност x: нужен е предходният. */\nint s_delete(SNode **head, int x)\n{\n    SNode *prev = NULL, *cur = *head;\n    while (cur != NULL) {\n        g_cmp++;\n        if (cur->v == x) break;\n        prev = cur;\n        cur = cur->next;\n        g_hops++;\n    }\n    if (cur == NULL) return -1;\n    if (prev == NULL) *head = cur->next;   /* първи възел */\n    else prev->next = cur->next;           /* прескачаме cur */\n    free(cur);                     /* след free cur не се ползва */\n    return 0;\n}",
  "tags": {
   "pf_new": [
    6
   ],
   "pf_link": [
    8
   ],
   "pf_head": [
    9
   ],
   "pb_new": [
    15
   ],
   "pb_empty": [
    18
   ],
   "pb_start": [
    19
   ],
   "pb_walk": [
    20
   ],
   "pb_link": [
    21
   ],
   "f_loop": [
    28
   ],
   "f_cmp": [
    30
   ],
   "f_none": [
    33
   ],
   "ia_find": [
    42
   ],
   "ia_none": [
    43
   ],
   "ia_new": [
    44
   ],
   "ia_1": [
    46
   ],
   "ia_2": [
    47
   ],
   "d_init": [
    54
   ],
   "d_loop": [
    55
   ],
   "d_cmp": [
    57
   ],
   "d_step": [
    58
   ],
   "d_none": [
    62
   ],
   "d_head": [
    63
   ],
   "d_link": [
    64
   ],
   "d_free": [
    65
   ]
  }
 },
 "ch04_wrong": {
  "file": "04_list.c",
  "code": "/* ГРЕШЕН ред на присвояванията — само за илюстрация, не се извиква. */\nvoid s_insert_after_WRONG(SNode *P, SNode *X)\n{\n    P->next = X;               /* старият P->next (Q) е загубен */\n    X->next = P->next;         /* = X: X сочи себе си, остатъкът е недостижим */\n}",
  "tags": {
   "w_1": [
    4
   ],
   "w_2": [
    5
   ]
  }
 },
 "ch04_double": {
  "file": "04_list.c",
  "code": "/* Двусвързан кръгов списък със сентинел S:\n   празен списък: S.next == S.prev == &S. Няма NULL указатели и няма специален\n   случай за първи/последен/единствен възел. */\ntypedef struct DNode { int v; struct DNode *prev, *next; } DNode;\n\nvoid d_init(DNode *S) { S->next = S->prev = S; }\n\n/* Вмъкване на нов възел след възела a: Θ(1) */\nstatic void d_link_after(DNode *a, int x)\n{\n    DNode *n = malloc(sizeof *n);\n    n->v = x;\n    n->prev = a;\n    n->next = a->next;\n    a->next->prev = n;\n    a->next = n;\n}\nvoid d_push_front(DNode *S, int x) { d_link_after(S, x); }\nvoid d_push_back(DNode *S, int x)  { d_link_after(S->prev, x); }\n\nDNode *d_find(DNode *S, int x, int *index)\n{\n    int i = 0;\n    for (DNode *p = S->next; p != S; p = p->next, i++) {\n        g_cmp++;                    /* край: връщане до S, не NULL */\n        if (p->v == x) { *index = i; return p; }\n        g_hops++;\n    }\n    *index = -1;\n    return NULL;\n}\nint d_insert_after(DNode *S, int key, int x)\n{\n    int i;\n    DNode *P = d_find(S, key, &i);\n    if (P == NULL) return -1;\n    d_link_after(P, x);\n    return 0;\n}\n/* Откачане на известен възел X: две пренасочвания, Θ(1) */\nint d_delete(DNode *S, int x)\n{\n    int i;\n    DNode *X = d_find(S, x, &i);\n    if (X == NULL) return -1;\n    X->prev->next = X->next;\n    X->next->prev = X->prev;\n    free(X);\n    return 0;\n}",
  "tags": {
   "dl_new": [
    11
   ],
   "dl_1": [
    13
   ],
   "dl_2": [
    14
   ],
   "dl_3": [
    15
   ],
   "dl_4": [
    16
   ],
   "dpf": [
    18
   ],
   "dpb": [
    19
   ],
   "df_loop": [
    24
   ],
   "df_cmp": [
    26
   ],
   "df_none": [
    29
   ],
   "dia_find": [
    35
   ],
   "dd_find": [
    44
   ],
   "dd_1": [
    46
   ],
   "dd_2": [
    47
   ],
   "dd_free": [
    48
   ]
  }
 },
 "ch05_pre": {
  "file": "05_tree.c",
  "code": "/* Предреден обход: корен, ляво, дясно. Стекова памет O(h). */\nvoid preorder(const TNode *r, Out *o)\n{\n    if (r == NULL) return;\n    out_int(o, r->key);                    /* посещение */\n    preorder(r->left, o);\n    preorder(r->right, o);\n}",
  "tags": {
   "null": [
    4
   ],
   "visit": [
    5
   ],
   "left": [
    6
   ],
   "right": [
    7
   ]
  }
 },
 "ch05_in": {
  "file": "05_tree.c",
  "code": "/* Симетричен обход: ляво, корен, дясно. */\nvoid inorder(const TNode *r, Out *o)\n{\n    if (r == NULL) return;\n    inorder(r->left, o);\n    out_int(o, r->key);                    /* посещение */\n    inorder(r->right, o);\n}",
  "tags": {
   "null": [
    4
   ],
   "left": [
    5
   ],
   "visit": [
    6
   ],
   "right": [
    7
   ]
  }
 },
 "ch05_post": {
  "file": "05_tree.c",
  "code": "/* Следреден обход: ляво, дясно, корен. */\nvoid postorder(const TNode *r, Out *o)\n{\n    if (r == NULL) return;\n    postorder(r->left, o);\n    postorder(r->right, o);\n    out_int(o, r->key);                    /* посещение */\n}",
  "tags": {
   "null": [
    4
   ],
   "left": [
    5
   ],
   "right": [
    6
   ],
   "visit": [
    7
   ]
  }
 },
 "ch05_level": {
  "file": "05_tree.c",
  "code": "/* Обход по нива: опашка (FIFO). Памет — според максималната ширина. */\nvoid levelorder(TNode *r, Out *o)\n{\n    TNode *q[64];\n    int head = 0, tail = 0;\n    if (r) q[tail++] = r;                  /* enqueue(корен) */\n    while (head < tail) {\n        TNode *p = q[head++];              /* dequeue */\n        out_int(o, p->key);\n        if (p->left)  q[tail++] = p->left;\n        if (p->right) q[tail++] = p->right;\n    }\n}",
  "tags": {
   "init": [
    6
   ],
   "loop": [
    7
   ],
   "deq": [
    8
   ],
   "visit": [
    9
   ],
   "enql": [
    10
   ],
   "enqr": [
    11
   ]
  }
 },
 "ch05_height": {
  "file": "05_tree.c",
  "code": "/* Височина в ребра: празно = -1, лист = 0. */\nint height(const TNode *r)\n{\n    if (r == NULL) return -1;\n    int hl = height(r->left);\n    int hr = height(r->right);\n    return 1 + (hl > hr ? hl : hr);\n}",
  "tags": {
   "null": [
    4
   ],
   "left": [
    5
   ],
   "right": [
    6
   ],
   "ret": [
    7
   ]
  }
 },
 "ch05_shape": {
  "file": "05_tree.c",
  "code": "/* full (proper): всеки възел има 0 или 2 деца */\nint is_full(const TNode *r)\n{\n    if (r == NULL) return 1;\n    if ((r->left == NULL) != (r->right == NULL)) return 0;\n    return is_full(r->left) && is_full(r->right);\n}\n/* complete: при обход по нива след първата празна позиция няма възли */\nint is_complete(TNode *r)\n{\n    TNode *q[128];\n    int head = 0, tail = 0, gap = 0;\n    q[tail++] = r;\n    while (head < tail) {\n        TNode *p = q[head++];\n        if (p == NULL) { gap = 1; continue; }\n        if (gap) return 0;                 /* възел след празнина */\n        q[tail++] = p->left;\n        q[tail++] = p->right;\n    }\n    return 1;\n}\n/* perfect: n == 2^(h+1) - 1 */\nint is_perfect(const TNode *r)\n{\n    int h = height(r);\n    return count(r) == (1 << (h + 1)) - 1;\n}",
  "tags": {
   "full": [
    5
   ],
   "gap": [
    16
   ],
   "complete": [
    17
   ],
   "perfect": [
    27
   ]
  }
 },
 "ch05_expr": {
  "file": "05_tree.c",
  "code": "/* Дърво за израз от постфиксен запис: операндите са листа, операциите — вътрешни възли.\n   Построяването използва стек от указатели; изчисляването е следреден обход. */\ntypedef struct ENode { char tok[12]; struct ENode *l, *r; } ENode;\nvoid expr_free(ENode *e);\n\nENode *expr_build(const Op *t)\n{\n    ENode *st[64];\n    int top = 0, bad = 0;\n    for (int i = 0; i < t->n && !bad; i++) {\n        ENode *n = calloc(1, sizeof *n);\n        strncpy(n->tok, t->arg[i], sizeof n->tok - 1);\n        if (strchr(\"+-*/\", n->tok[0]) && n->tok[1] == 0) {\n            if (top < 2) { free(n); bad = 1; break; }   /* липсва операнд */\n            n->r = st[--top];\n            n->l = st[--top];\n        }\n        st[top++] = n;\n    }\n    if (!bad && top == 1) return st[0];\n    while (top) expr_free(st[--top]);      /* грешен запис: освобождаваме */\n    return NULL;\n}\nlong expr_eval(const ENode *e)\n{\n    if (e->l == NULL) return atol(e->tok);  /* лист: операнд */\n    long a = expr_eval(e->l);               /* първо лявото */\n    long b = expr_eval(e->r);               /* после дясното */\n    switch (e->tok[0]) {                    /* накрая корена */\n    case '+': return a + b;\n    case '-': return a - b;\n    case '*': return a * b;\n    default:  return b ? a / b : 0;\n    }\n}",
  "tags": {
   "b_r": [
    15
   ],
   "b_l": [
    16
   ],
   "b_push": [
    18
   ],
   "e_leaf": [
    26
   ],
   "e_left": [
    27
   ],
   "e_right": [
    28
   ],
   "e_op": [
    29
   ]
  }
 },
 "ch06_bst": {
  "file": "06_bst.c",
  "code": "/* Търсене: на всяка стъпка инвариантът изключва цяло поддърво. O(h). */\nBNode *bst_search(BNode *r, int key, int *depth)\n{\n    *depth = 0;\n    while (r != NULL) {\n        g_cmp++;\n        if (key == r->key) return r;\n        g_cmp++;\n        if (key < r->key) r = r->left;     /* дясното отпада */\n        else              r = r->right;    /* лявото отпада */\n        (*depth)++;\n    }\n    return NULL;\n}\n\n/* Вмъкване: същият път като търсенето до празна позиция. O(h). */\nint bst_insert(BNode **link, int key)\n{\n    while (*link != NULL) {\n        BNode *r = *link;\n        g_cmp++;\n        if (key == r->key) return -1;      /* дубликат: политика — отказ */\n        g_cmp++;\n        link = key < r->key ? &r->left : &r->right;\n    }\n    BNode *n = malloc(sizeof *n);\n    n->key = key;\n    n->left = n->right = NULL;\n    *link = n;                             /* закачаме на празното място */\n    return 0;\n}\n\n/* Изтриване — три случая. Работим с адреса на връзката (link), която сочи възела,\n   за да не се налага отделен случай за корена. */\nint bst_delete(BNode **link, int key)\n{\n    while (*link != NULL && (*link)->key != key) {\n        g_cmp += 2;\n        link = key < (*link)->key ? &(*link)->left : &(*link)->right;\n    }\n    if (*link == NULL) return -1;\n    g_cmp++;\n    BNode *x = *link;\n    if (x->left == NULL && x->right == NULL) {\n        *link = NULL;                      /* 1) лист: откачаме */\n    } else if (x->left == NULL || x->right == NULL) {\n        *link = x->left ? x->left : x->right;  /* 2) едно дете: заместваме */\n    } else {\n        /* 3) две деца: симетричният наследник = най-малкият в дясното поддърво */\n        BNode **s = &x->right;\n        while ((*s)->left != NULL) s = &(*s)->left;\n        BNode *y = *s;\n        x->key = y->key;                   /* пренасяме ключа */\n        *s = y->right;                     /* y няма ляво дете */\n        x = y;\n    }\n    free(x);\n    return 0;\n}\n\nint bst_min(const BNode *r) { while (r->left)  r = r->left;  return r->key; }\nint bst_max(const BNode *r) { while (r->right) r = r->right; return r->key; }\nint bst_height(const BNode *r)             /* в ребра; празно = -1 */\n{\n    if (r == NULL) return -1;\n    int a = bst_height(r->left), b = bst_height(r->right);\n    return 1 + (a > b ? a : b);\n}",
  "tags": {
   "s_loop": [
    5
   ],
   "s_eq": [
    7
   ],
   "s_left": [
    9
   ],
   "s_right": [
    10
   ],
   "s_none": [
    13
   ],
   "i_loop": [
    19
   ],
   "i_dup": [
    22
   ],
   "i_go": [
    24
   ],
   "i_new": [
    26
   ],
   "i_link": [
    29
   ],
   "d_find": [
    37
   ],
   "d_none": [
    41
   ],
   "d_c0": [
    44
   ],
   "d_leaf": [
    45
   ],
   "d_c1": [
    46
   ],
   "d_one": [
    47
   ],
   "d_c2": [
    48
   ],
   "d_succ0": [
    50
   ],
   "d_succ": [
    51
   ],
   "d_copy": [
    53
   ],
   "d_unlink": [
    54
   ],
   "d_free": [
    57
   ],
   "min": [
    61
   ],
   "max": [
    62
   ]
  }
 },
 "ch07_array": {
  "file": "07_compare.c",
  "code": "/* Масив a[0..n-1] (има свободен капацитет). */\nint arr_get(const int a[], int k) { g_steps++; return a[k]; }       /* Θ(1) */\nint arr_find(const int a[], int n, int x)                           /* O(n) */\n{\n    for (int i = 0; i < n; i++) { g_steps++; if (a[i] == x) return i; }\n    return -1;\n}\nvoid arr_insert_at(int a[], int *n, int k, int x)                   /* O(n - k) */\n{\n    for (int i = *n; i > k; i--) { a[i] = a[i - 1]; g_steps++; }   /* изместване */\n    a[k] = x; g_steps++;\n    (*n)++;\n}",
  "tags": {
   "get": [
    2
   ],
   "find": [
    5
   ],
   "shift": [
    10
   ],
   "put": [
    11
   ]
  }
 },
 "ch07_list": {
  "file": "07_compare.c",
  "code": "typedef struct N { int v; struct N *next; } N;\nint lst_get(const N *h, int k)                                      /* O(k) */\n{\n    while (k--) { h = h->next; g_steps++; }\n    g_steps++;\n    return h->v;\n}\nint lst_find(const N *h, int x)                                     /* O(n) */\n{\n    for (int i = 0; h; h = h->next, i++) { g_steps++; if (h->v == x) return i; }\n    return -1;\n}\nvoid lst_insert_at(N **h, int k, N *x)    /* достигане O(k) + свързване Θ(1) */\n{\n    if (k == 0) { x->next = *h; *h = x; g_steps += 2; return; }\n    N *p = *h;\n    for (int i = 0; i < k - 1; i++) { p = p->next; g_steps++; }\n    x->next = p->next; g_steps++;\n    p->next = x; g_steps++;\n}",
  "tags": {
   "walk": [
    4,
    17
   ],
   "get": [
    6
   ],
   "find": [
    10
   ],
   "head": [
    15
   ],
   "link1": [
    18
   ],
   "link2": [
    19
   ]
  }
 },
 "ch07_bst": {
  "file": "07_compare.c",
  "code": "typedef struct B { int key; struct B *l, *r; } B;\nint bst_find(const B *t, int x)                                     /* O(h) */\n{\n    while (t) {\n        g_steps++;\n        if (x == t->key) return 1;\n        t = x < t->key ? t->l : t->r;\n    }\n    return 0;\n}",
  "tags": {
   "loop": [
    4
   ],
   "eq": [
    6
   ],
   "go": [
    7
   ]
  }
 },
 "ch08_heap": {
  "file": "08_extra.c",
  "code": "/* Min-heap в масив, индексиране от 0: деца на i са 2i+1 и 2i+2, родител (i-1)/2.\n   Форма: complete. Правило: a[родител] <= a[дете]. */\ntypedef struct { int a[64]; int n; } Heap;\n\nstatic void hswap(int *x, int *y) { int t = *x; *x = *y; *y = t; g_swaps++; }\n\nint heap_push(Heap *h, int x)                                /* O(log n) */\n{\n    if (h->n == 64) return -1;\n    int i = h->n++;\n    h->a[i] = x;                           /* следващата свободна позиция */\n    while (i > 0) {\n        int p = (i - 1) / 2;\n        if (h->a[p] <= h->a[i]) break;     /* редът е възстановен */\n        hswap(&h->a[p], &h->a[i]);         /* изкачване */\n        i = p;\n    }\n    return 0;\n}\nint heap_pop(Heap *h, int *out)                              /* O(log n) */\n{\n    if (h->n == 0) return -1;\n    *out = h->a[0];                        /* минимумът е в корена */\n    h->a[0] = h->a[--h->n];                /* последният заема корена */\n    int i = 0;\n    for (;;) {\n        int l = 2 * i + 1, r = l + 1, m = i;\n        if (l < h->n && h->a[l] < h->a[m]) m = l;\n        if (r < h->n && h->a[r] < h->a[m]) m = r;\n        if (m == i) break;\n        hswap(&h->a[i], &h->a[m]);         /* спускане */\n        i = m;\n    }\n    return 0;\n}",
  "tags": {
   "put": [
    11
   ],
   "up": [
    12
   ],
   "upok": [
    14
   ],
   "upswap": [
    15
   ],
   "empty": [
    22
   ],
   "min": [
    23
   ],
   "last": [
    24
   ],
   "down": [
    26
   ],
   "pick": [
    28
   ],
   "downok": [
    30
   ],
   "downswap": [
    31
   ]
  }
 },
 "ch08_avl": {
  "file": "08_extra.c",
  "code": "/* AVL: BST + |h(left) - h(right)| <= 1 във всеки възел. Височина в ребра, празно = -1. */\ntypedef struct A { int key, h; struct A *l, *r; } A;\n\nstatic int ht(const A *t) { return t ? t->h : -1; }\nstatic void upd(A *t) { int a = ht(t->l), b = ht(t->r); t->h = 1 + (a > b ? a : b); }\nstatic int bf(const A *t) { return ht(t->l) - ht(t->r); }    /* balance factor */\n\nstatic A *rot_right(A *y)                  /* ляво дете x се издига */\n{\n    A *x = y->l;\n    y->l = x->r;\n    x->r = y;\n    upd(y); upd(x); g_rot++;\n    return x;\n}\nstatic A *rot_left(A *x)                   /* дясно дете y се издига */\n{\n    A *y = x->r;\n    x->r = y->l;\n    y->l = x;\n    upd(x); upd(y); g_rot++;\n    return y;\n}\nA *avl_insert(A *t, int key)\n{\n    if (t == NULL) {\n        A *n = malloc(sizeof *n);\n        n->key = key; n->h = 0; n->l = n->r = NULL;\n        return n;\n    }\n    if (key < t->key)      t->l = avl_insert(t->l, key);\n    else if (key > t->key) t->r = avl_insert(t->r, key);\n    else return t;                         /* дубликат: без промяна */\n    upd(t);\n    int b = bf(t);\n    if (b > 1 && key < t->l->key)  return rot_right(t);                 /* ляво-ляво */\n    if (b < -1 && key > t->r->key) return rot_left(t);                  /* дясно-дясно */\n    if (b > 1)  { t->l = rot_left(t->l);  return rot_right(t); }        /* ляво-дясно */\n    if (b < -1) { t->r = rot_right(t->r); return rot_left(t); }         /* дясно-ляво */\n    return t;\n}",
  "tags": {
   "rr": [
    10
   ],
   "rl": [
    18
   ],
   "new": [
    26
   ],
   "goleft": [
    31
   ],
   "goright": [
    32
   ],
   "dup": [
    33
   ],
   "upd": [
    34
   ],
   "LL": [
    36
   ],
   "RR": [
    37
   ],
   "LR": [
    38
   ],
   "RL": [
    39
   ],
   "ok": [
    40
   ]
  }
 }
};
