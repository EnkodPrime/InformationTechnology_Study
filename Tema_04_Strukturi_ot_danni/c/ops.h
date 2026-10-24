/* Служебен разбор на текстова програма от операции, напр. "push 4, push 7, pop".
 * Използва се само от main() на примерите, за да се пускат същите поредици,
 * които визуализацията приема. Не е част от структурите от данни. */
#ifndef OPS_H
#define OPS_H
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OP_MAXARG 32
typedef struct { char name[16]; char arg[OP_MAXARG][24]; int n; } Op;

static inline int op_sep(char c) { return c == ',' || c == ';' || c == '\n'; }
static inline int op_sp(char c) { return c == ' ' || c == '(' || c == ')' || c == '\t'; }

/* Чете следващата операция от *pp; връща 0 в края. */
static inline int op_next(const char **pp, Op *op)
{
    const char *p = *pp;
    while (op_sp(*p) || op_sep(*p)) p++;
    if (!*p) { *pp = p; return 0; }
    int k = 0;
    while (*p && !op_sp(*p) && !op_sep(*p)) { if (k < 15) op->name[k++] = *p; p++; }
    op->name[k] = 0;
    op->n = 0;
    while (*p && !op_sep(*p)) {
        while (op_sp(*p)) p++;
        if (!*p || op_sep(*p)) break;
        k = 0;
        while (*p && !op_sp(*p) && !op_sep(*p)) { if (k < 23) op->arg[op->n][k++] = *p; p++; }
        op->arg[op->n][k] = 0;
        if (op->n < OP_MAXARG - 1) op->n++;
    }
    *pp = p;
    return 1;
}
static inline int op_is(const Op *op, const char *a) { return strcmp(op->name, a) == 0; }
static inline int op_int(const Op *op, int i) { return atoi(op->arg[i]); }

/* Натрупване на изход в низ: "4 7 E" и т.н. */
typedef struct { char s[4096]; } Out;
static inline void out_add(Out *o, const char *t)
{
    size_t n = strlen(o->s);
    if (n && n < sizeof o->s - 1) { o->s[n++] = ' '; o->s[n] = 0; }
    strncat(o->s, t, sizeof o->s - n - 1);
}
static inline void out_int(Out *o, long v) { char b[24]; snprintf(b, sizeof b, "%ld", v); out_add(o, b); }
#endif
