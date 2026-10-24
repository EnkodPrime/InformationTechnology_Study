/* Тема 1, раздел 6 — йерархия на паметта.
 *   a) Кеш симулатор: директно съответствие / асоциативен по набори / напълно асоциативен,
 *      замяна LRU или FIFO, политика write-back + write-allocate или write-through +
 *      no-write-allocate. Адресът се разбива на tag | index | offset.
 *   b) Локалност: обхождане на матрица по редове и по колони през същия кеш.
 *   c) AMAT = време за попадение + дял на пропуските * наказание при пропуск.
 *
 * Броим само попадения/пропуски и записи към следващото ниво; времето не се моделира.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 06_cache.c -o cache && ./cache
 */
#include <stdio.h>
#include <string.h>

#define MAXLINES 64

//#viz ch06_cache
typedef struct { int valid, dirty; unsigned tag; long stamp; } line_t;
typedef struct {
    int sets, ways, block;          /* брой набори, линии в набор, байтове в линия */
    int lru, write_back;            /* 1 = LRU, 0 = FIFO;  1 = write-back, 0 = write-through */
    line_t L[MAXLINES];
    long clock;
    int hits, misses, evictions, writebacks, mem_writes;
} cache_t;

static int log2i(int x) { int k = 0; while ((1 << k) < x) k++; return k; }

/* Връща 1 при попадение, 0 при пропуск. is_write: 0 четене, 1 запис. */
int cache_access(cache_t *c, unsigned addr, int is_write)
{
    int ob = log2i(c->block), ib = log2i(c->sets);
    unsigned offset = addr & (unsigned)(c->block - 1);      //@split
    unsigned index = (addr >> ob) & (unsigned)(c->sets - 1); //@split
    unsigned tag = addr >> (ob + ib);                        //@split
    (void)offset;
    line_t *set = &c->L[index * (unsigned)c->ways];
    c->clock++;
    for (int w = 0; w < c->ways; w++)                        //@search
        if (set[w].valid && set[w].tag == tag) {             //@cmp
            c->hits++;                                       //@hit
            if (c->lru) set[w].stamp = c->clock;   /* FIFO не обновява */ //@touch
            if (is_write) {
                if (c->write_back) set[w].dirty = 1;         //@wdirty
                else c->mem_writes++;                        //@wthrough
            }
            return 1;
        }
    c->misses++;                                             //@miss
    if (is_write && !c->write_back) {                        /* no-write-allocate */
        c->mem_writes++;                                     //@wnoalloc
        return 0;
    }
    int victim = -1;
    for (int w = 0; w < c->ways; w++)                        /* свободна линия? */
        if (!set[w].valid) { victim = w; break; }            //@free
    if (victim < 0) {                                        /* най-стар печат */
        victim = 0;
        for (int w = 1; w < c->ways; w++)                    //@victim
            if (set[w].stamp < set[victim].stamp) victim = w;
        c->evictions++;                                      //@evict
        if (set[victim].dirty) { c->writebacks++; c->mem_writes++; } //@wb
    }
    set[victim].valid = 1; set[victim].tag = tag;            //@fill
    set[victim].dirty = is_write;                            //@fill
    set[victim].stamp = c->clock;                            //@fill
    return 0;
}
//#end

//#viz ch06_locality
/* Обхождане на int m[R][C] (4 байта елемент, редово разположение в C).
   Адресът на m[i][j] е base + (i*C + j)*4. */
void walk(cache_t *c, unsigned base, int R, int C, int by_rows)
{
    for (int a = 0; a < (by_rows ? R : C); a++)              //@outer
        for (int b = 0; b < (by_rows ? C : R); b++) {        //@inner
            int i = by_rows ? a : b, j = by_rows ? b : a;
            unsigned addr = base + (unsigned)(i * C + j) * 4u; //@addr
            cache_access(c, addr, 0);                        //@acc
        }
}
//#end

//#viz ch06_amat
double amat(double t_hit, double miss_rate, double penalty)
{
    return t_hit + miss_rate * penalty;                      //@amat
}

/* Две нива: наказанието на L1 е самото AMAT на L2. */
double amat2(double h1, double m1, double h2, double m2, double mem)
{
    double l2 = amat(h2, m2, mem);                           //@l2
    return amat(h1, m1, l2);                                 //@l1
}
//#end

#ifndef NO_MAIN
static void init(cache_t *c, int sets, int ways, int block, int lru, int wb)
{
    memset(c, 0, sizeof *c);
    c->sets = sets; c->ways = ways; c->block = block; c->lru = lru; c->write_back = wb;
}

static void trace(const char *name, int sets, int ways, int block, int lru, int wb,
                  const unsigned *a, const int *w, int n)
{
    cache_t c; init(&c, sets, ways, block, lru, wb);
    printf("%s = ", name);
    for (int i = 0; i < n; i++) putchar(cache_access(&c, a[i], w[i]) ? 'H' : 'M');
    printf(" %d %d %d %d %d\n", c.hits, c.misses, c.evictions, c.writebacks, c.mem_writes);
}

int main(void)
{
    /* поредица 1: конфликт при директно съответствие (0 и 64 -> един и същ индекс) */
    const unsigned A1[] = {0, 64, 0, 64, 4, 68, 128, 0};
    const int W0[16] = {0};
    /* поредица 2: смесени четения и записи */
    const unsigned A2[] = {0, 16, 32, 0, 48, 64, 16, 0, 80, 32};
    const int W2[] = {1, 0, 1, 0, 0, 1, 0, 1, 0, 0};
    /* поредица 3: LRU срещу FIFO */
    const unsigned A3[] = {0, 32, 0, 64, 0, 96, 32, 0};
    const int cfg[][3] = {{4, 1, 16}, {2, 2, 16}, {1, 4, 16}, {8, 1, 8}, {2, 4, 8}};
    for (unsigned k = 0; k < sizeof cfg / sizeof cfg[0]; k++)
        for (int lru = 0; lru <= 1; lru++)
            for (int wb = 0; wb <= 1; wb++) {
                char nm[64];
                snprintf(nm, sizeof nm, "t1(%d,%d,%d,%d,%d)", cfg[k][0], cfg[k][1], cfg[k][2], lru, wb);
                trace(nm, cfg[k][0], cfg[k][1], cfg[k][2], lru, wb, A1, W0, 8);
                snprintf(nm, sizeof nm, "t2(%d,%d,%d,%d,%d)", cfg[k][0], cfg[k][1], cfg[k][2], lru, wb);
                trace(nm, cfg[k][0], cfg[k][1], cfg[k][2], lru, wb, A2, W2, 10);
                snprintf(nm, sizeof nm, "t3(%d,%d,%d,%d,%d)", cfg[k][0], cfg[k][1], cfg[k][2], lru, wb);
                trace(nm, cfg[k][0], cfg[k][1], cfg[k][2], lru, wb, A3, W0, 8);
            }
    /* локалност: матрица 8x8 int, кеш 4 набора x 2 линии x 16 B (128 B) */
    const int LM[][5] = {{8, 8, 4, 2, 16}, {8, 8, 8, 1, 16}, {16, 16, 4, 2, 32}, {6, 10, 2, 2, 16}, {16, 4, 8, 2, 16}};
    for (unsigned k = 0; k < sizeof LM / sizeof LM[0]; k++)
        for (int rows = 0; rows <= 1; rows++) {
            cache_t c; init(&c, LM[k][2], LM[k][3], LM[k][4], 1, 1);
            walk(&c, 0, LM[k][0], LM[k][1], rows);
            printf("walk(%d,%d,%d,%d,%d,%s) = %d %d\n", LM[k][0], LM[k][1], LM[k][2], LM[k][3], LM[k][4],
                   rows ? "rows" : "cols", c.hits, c.misses);
        }
    printf("amat(1,0.05,80) = %.4f\n", amat(1, 0.05, 80));
    printf("amat(2,0.1,100) = %.4f\n", amat(2, 0.1, 100));
    printf("amat2(1,0.05,10,0.2,100) = %.4f\n", amat2(1, 0.05, 10, 0.2, 100));
    return 0;
}
#endif
