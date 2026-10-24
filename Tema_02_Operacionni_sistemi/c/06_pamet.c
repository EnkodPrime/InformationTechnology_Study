/* Тема 2, раздел 6 — странициране: виртуален → физически адрес, TLB, page fault.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 06_pamet.c -o 06_pamet && ./06_pamet
 *
 * Учебен модел: еднониво таблица на страниците, байтово адресиране,
 * напълно асоциативен TLB с FIFO подмяна. Права на страница:
 *   W — четене и запис, R — само четене, C — споделена за copy-on-write.
 * Причини за page fault в модела (Схема 15):
 *   липсва  -> зареждане от носител в свободна рамка
 *   C+запис -> copy-on-write: ново копие в свободна рамка
 *   R+запис или страница извън таблицата -> невалиден достъп
 */
#include <stdio.h>
#include <string.h>

#define MAXPG 16
#define TLB_MAX 8

enum { P_NONE = 0, P_W, P_R, P_C };
enum { OK_TLB = 0, OK_WALK, FAULT_LOAD, FAULT_COW, FAULT_INVALID };

typedef struct { int present, frame, perm; } PTE;

typedef struct {
    int shift;                       /* log2(размер на страница) */
    int npages;
    PTE pt[MAXPG];
    int tlb_page[TLB_MAX], tlb_frame[TLB_MAX], tlb_n, tlb_cap, tlb_next;
    int next_free;                   /* следваща свободна рамка */
    int hits, misses, faults, invalid;
} MMU;

static int tlb_lookup(const MMU *m, int page)
{
    for (int i = 0; i < m->tlb_n; i++)
        if (m->tlb_page[i] == page) return i;
    return -1;
}

static void tlb_insert(MMU *m, int page, int frame)
{
    int i = tlb_lookup(m, page);
    if (i < 0) {
        if (m->tlb_n < m->tlb_cap) i = m->tlb_n++;
        else { i = m->tlb_next; m->tlb_next = (m->tlb_next + 1) % m->tlb_cap; }
    }
    m->tlb_page[i] = page;
    m->tlb_frame[i] = frame;
}

//#viz s06_translate
/* Връща физическия адрес или -1 при невалиден достъп; *kind = какво се случи. */
static long translate(MMU *m, unsigned vaddr, int write, int *kind)
{
    unsigned page = vaddr >> m->shift;                         //@split
    unsigned off  = vaddr & ((1u << m->shift) - 1);            //@split
    int t = tlb_lookup(m, (int)page);                          //@tlb
    if (t >= 0 && !(write && m->pt[page].perm != P_W)) {
        m->hits++;                                             //@hit
        *kind = OK_TLB;
        return ((long)m->tlb_frame[t] << m->shift) | off;      //@phys
    }
    m->misses++;                                               //@miss
    if (page >= (unsigned)m->npages) {                         //@walk
        m->invalid++;
        *kind = FAULT_INVALID;                                 //@invalid
        return -1;
    }
    PTE *e = &m->pt[page];
    *kind = OK_WALK;
    if (!e->present) {                                         //@absent
        m->faults++;
        e->present = 1;              /* зареждане от носител */
        e->frame = m->next_free++;                             //@load
        *kind = FAULT_LOAD;
    }
    if (write && e->perm == P_R) {                             //@rights
        m->invalid++;
        *kind = FAULT_INVALID;                                 //@invalid
        return -1;
    }
    if (write && e->perm == P_C) {                             //@cow
        m->faults++;
        e->frame = m->next_free++;   /* отделно копие */
        e->perm = P_W;
        *kind = FAULT_COW;
    }
    tlb_insert(m, (int)page, e->frame);                        //@fill
    return ((long)e->frame << m->shift) | off;                 //@phys
}
//#end

/* Таблица като низ: "5W 2R - 10C" (рамка + права, '-' = липсва). */
static void setup(MMU *m, int shift, int tlb_cap, const char *table)
{
    memset(m, 0, sizeof *m);
    m->shift = shift;
    m->tlb_cap = tlb_cap;
    int maxf = -1;
    const char *p = table;
    while (*p && m->npages < MAXPG) {
        while (*p == ' ') p++;
        if (!*p) break;
        PTE *e = &m->pt[m->npages++];
        if (*p == '-') { e->perm = P_W; p++; continue; }
        int f = 0;
        while (*p >= '0' && *p <= '9') f = f * 10 + (*p++ - '0');
        e->present = 1;
        e->frame = f;
        e->perm = (*p == 'R') ? P_R : (*p == 'C') ? P_C : P_W;
        if (*p == 'R' || *p == 'C' || *p == 'W') p++;
        if (f > maxf) maxf = f;
    }
    m->next_free = maxf + 1;
}

static void run(const char *name, int shift, int tlb, const char *table, const unsigned *va, const int *wr, int n)
{
    MMU m;
    setup(&m, shift, tlb, table);
    printf("%s.phys = ", name);
    for (int i = 0; i < n; i++) {
        int kind;
        long pa = translate(&m, va[i], wr[i], &kind);
        printf("%s%ld", i ? "," : "", pa);
    }
    printf("\n%s.hits = %d\n%s.misses = %d\n%s.faults = %d\n%s.invalid = %d\n",
           name, m.hits, name, m.misses, name, m.faults, name, m.invalid);
}

#ifndef NO_MAIN
int main(void)
{
    /* примерът от ръководството: 4096 B, адрес 12345 -> страница 3, отместване 57, рамка 10 */
    unsigned v1[] = {12345};
    int w1[] = {0};
    run("m", 12, 4, "5W 2W 7W 10W", v1, w1, 1);
    unsigned v2[] = {12345, 12400, 100, 8200, 8200, 4100, 4100, 70000};
    int w2[] = {0, 0, 0, 0, 1, 0, 1, 0};
    run("x", 12, 2, "5W 2R - 10C", v2, w2, 8);
    unsigned v3[] = {0, 256, 512, 0, 768, 256, 1024};
    int w3[] = {0, 1, 0, 0, 0, 0, 0};
    run("y", 8, 2, "3W 1C 4W 9W", v3, w3, 7);
    return 0;
}
#endif
