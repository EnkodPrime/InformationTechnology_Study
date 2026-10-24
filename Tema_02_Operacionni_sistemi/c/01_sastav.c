/* Тема 2, раздел 1 — библиотечна функция срещу системно извикване.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 01_sastav.c -o 01_sastav && ./01_sastav
 *
 * Модел на буфериран изход в стила на stdio: out_putc() е библиотечна функция,
 * която работи в потребителското пространство и само понякога иска услуга
 * от ядрото. В истинската библиотека flush извиква write(2); тук моделът
 * брои извикванията и пази байтовете, за да е проверим резултатът.
 */
#include <stdio.h>
#include <string.h>

#define BUF_MAX 64
#define SINK_MAX 512

enum { MODE_NONE = 0, MODE_LINE = 1, MODE_FULL = 2 };

typedef struct {
    char data[BUF_MAX];
    int len, cap, mode;
    int syscalls;               /* брой заявки към ядрото */
    char sink[SINK_MAX];        /* какво е „стигнало до ядрото“ */
    int sink_len;
} OutBuf;

//#viz s01_bufio
/* Тук реалната библиотека прави write(fd, b->data, b->len). */
static void do_syscall_write(OutBuf *b)
{
    memcpy(b->sink + b->sink_len, b->data, (size_t)b->len);   //@sys
    b->sink_len += b->len;
    b->syscalls++;                                            //@sys
    b->len = 0;
}

static void out_flush(OutBuf *b)
{
    if (b->len > 0)                                           //@flush
        do_syscall_write(b);
}

/* Библиотечна функция: обикновено НЕ влиза в ядрото. */
static void out_putc(OutBuf *b, char c)
{
    b->data[b->len++] = c;                                    //@put
    if (b->mode == MODE_NONE)                                 //@none
        out_flush(b);
    else if (b->mode == MODE_LINE && c == '\n')               //@line
        out_flush(b);
    else if (b->len == b->cap)                                //@full
        out_flush(b);
}
//#end

static int run(const char *text, int mode, int cap)
{
    OutBuf b = {0};
    b.mode = mode;
    b.cap = cap;
    for (const char *p = text; *p; p++)
        out_putc(&b, *p);
    out_flush(&b);                         /* при изход / fclose */
    return b.syscalls;
}

#ifndef NO_MAIN
int main(void)
{
    const char *t1 = "Hello\nOS\n";
    const char *t2 = "abcdefghijklmnopqrstuvwxyz";
    printf("bufio(t1,none,8) = %d\n", run(t1, MODE_NONE, 8));
    printf("bufio(t1,line,8) = %d\n", run(t1, MODE_LINE, 8));
    printf("bufio(t1,full,8) = %d\n", run(t1, MODE_FULL, 8));
    printf("bufio(t2,full,8) = %d\n", run(t2, MODE_FULL, 8));
    printf("bufio(t2,line,8) = %d\n", run(t2, MODE_LINE, 8));
    printf("bufio(t2,full,64) = %d\n", run(t2, MODE_FULL, 64));
    printf("strlen(t2) = %zu\n", strlen(t2));   /* без системно извикване */
    return 0;
}
#endif
