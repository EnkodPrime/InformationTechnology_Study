/* Тема 10, раздел 4 — методи с разбъркване (транспозиция).
 *  - колонна транспозиция: запис по редове в ширина w, прочит по колони в реда на ключа;
 *    непълен последен ред: „неравни колони“ (без допълване) или допълване с X;
 *  - железопътна ограда (rail fence): зигзаг 0,1,2,1,0,… и прочит по редове;
 *  - маршрутна (спирала по часовниковата стрелка) — един от възможните маршрути.
 * Ключът на колонната транспозиция е редът на четене: "3 1 4 2" = първо колона 3, после 1, 4, 2.
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 04_transposition.c -o tr && ./tr
 */
#include "alpha.h"

//#viz ch04_col_enc
/* order[r] = номер (0..w-1) на колоната, която се чете на r-то място;
   pad = код на буквата за допълване или -1 (без допълване, неравни колони) */
int col_encrypt(const int *p, int n, const int *order, int w, int pad, int *c)
{
    int len = n;
    if (pad >= 0) while (len % w) len++;                 /* допълване до пълен ред */ //@pad
    int j = 0;
    for (int r = 0; r < w; r++) {                    //@col
        int col = order[r];
        for (int i = col; i < len; i += w)           //@cell
            c[j++] = i < n ? p[i] : pad;             /* pad е кодът на X */ //@read
    }
    return j;                                        //@done
}
//#end

//#viz ch04_col_dec
int col_decrypt(const int *c, int n, const int *order, int w, int *p)
{
    int rows = n / w, extra = n % w;                 /* колоните < extra са с 1 по-дълги */ //@len
    int j = 0;
    for (int r = 0; r < w; r++) {                    //@col
        int col = order[r];
        int h = rows + (col < extra ? 1 : 0);        //@h
        for (int k = 0; k < h; k++)                  //@cell
            p[k * w + col] = c[j++];                 //@write
    }
    return n;                                        //@done
}
//#end

//#viz ch04_rail
/* ред (0..rails-1) на позиция i при зигзаг 0,1,…,rails-1,…,1,0,… */
static int rail_of(int i, int rails)
{
    if (rails == 1) return 0;
    int cyc = 2 * (rails - 1), t = i % cyc;
    return t < rails ? t : cyc - t;                  //@zig
}
int rail_encrypt(const int *p, int n, int rails, int *c)
{
    int j = 0;
    for (int r = 0; r < rails; r++)                  //@row
        for (int i = 0; i < n; i++)                  //@scan
            if (rail_of(i, rails) == r) c[j++] = p[i]; //@take
    return j;
}
int rail_decrypt(const int *c, int n, int rails, int *p)
{
    int j = 0;
    for (int r = 0; r < rails; r++)                  //@drow
        for (int i = 0; i < n; i++)                  //@dscan
            if (rail_of(i, rails) == r) p[i] = c[j++]; //@put
    return n;
}
//#end

//#viz ch04_route
/* Маршрут: правоъгълник rows x w (по редове, допълнен с pad), прочит по спирала */
int route_encrypt(const int *p, int n, int w, int pad, int *c)
{
    int rows = (n + w - 1) / w, j = 0;
    int top = 0, bot = rows - 1, lef = 0, rig = w - 1;
#define CELL(r, q) ((r) * w + (q) < n ? p[(r) * w + (q)] : pad)
    while (top <= bot && lef <= rig) {               //@ring
        for (int q = lef; q <= rig; q++) c[j++] = CELL(top, q);           //@right
        for (int r = top + 1; r <= bot; r++) c[j++] = CELL(r, rig);       //@down
        if (top < bot) for (int q = rig - 1; q >= lef; q--) c[j++] = CELL(bot, q); //@left
        if (lef < rig) for (int r = bot - 1; r > top; r--) c[j++] = CELL(r, lef);  //@up
        top++; bot--; lef++; rig--;                  //@shrink
    }
#undef CELL
    return j;
}
int route_decrypt(const int *c, int n, int w, int *p)
{
    int rows = n / w, j = 0;                         /* n е кратно на w */
    int top = 0, bot = rows - 1, lef = 0, rig = w - 1;
    while (top <= bot && lef <= rig) {
        for (int q = lef; q <= rig; q++) p[top * w + q] = c[j++];
        for (int r = top + 1; r <= bot; r++) p[r * w + rig] = c[j++];
        if (top < bot) for (int q = rig - 1; q >= lef; q--) p[bot * w + q] = c[j++];
        if (lef < rig) for (int r = bot - 1; r > top; r--) p[r * w + lef] = c[j++];
        top++; bot--; lef++; rig--;
    }
    return n;
}
//#end

#ifndef NO_MAIN
static int parse_order(const char *s, int *o)
{
    int w = 0;
    while (*s) { if (*s >= '1' && *s <= '9') o[w++] = *s - '1'; s++; }
    return w;
}
static void run_col(const char *name, int bg, const char *text, const char *key, int padmode)
{
    const alphabet *A = alpha_get(bg);
    int p[512], c[600], d[600], o[9];
    int n = alpha_encode(A, text, p, 512), w = parse_order(key, o);
    int m = col_encrypt(p, n, o, w, padmode ? A->pad : -1, c);
    char lab[160];
    snprintf(lab, sizeof lab, "col%s(%s)", padmode ? "pad" : "", name);
    print_codes(lab, A, c, m);
    col_decrypt(c, m, o, w, d);
    snprintf(lab, sizeof lab, "coldec%s(%s)", padmode ? "pad" : "", name);
    print_codes(lab, A, d, m);
}
static void run_rail(const char *name, int bg, const char *text, int rails)
{
    const alphabet *A = alpha_get(bg);
    int p[512], c[512], d[512];
    int n = alpha_encode(A, text, p, 512);
    char lab[160];
    rail_encrypt(p, n, rails, c);
    snprintf(lab, sizeof lab, "rail%d(%s)", rails, name); print_codes(lab, A, c, n);
    rail_decrypt(c, n, rails, d);
    snprintf(lab, sizeof lab, "raildec%d(%s)", rails, name); print_codes(lab, A, d, n);
}
static void run_route(const char *name, int bg, const char *text, int w)
{
    const alphabet *A = alpha_get(bg);
    int p[512], c[600], d[600];
    int n = alpha_encode(A, text, p, 512);
    char lab[160];
    int m = route_encrypt(p, n, w, A->pad, c);
    snprintf(lab, sizeof lab, "route%d(%s)", w, name); print_codes(lab, A, c, m);
    route_decrypt(c, m, w, d);
    snprintf(lab, sizeof lab, "routedec%d(%s)", w, name); print_codes(lab, A, d, m);
}
int main(void)
{
    run_col("ATTACKATDAWN", 0, "ATTACKATDAWN", "3142", 0);
    run_col("ATTACK", 0, "ATTACK", "123", 0);
    run_col("WEAREDISCOVERED", 0, "WEAREDISCOVERED", "3142", 0);
    run_col("WEAREDISCOVERED", 0, "WEAREDISCOVERED", "3142", 1);
    run_col("BG", 1, "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", "25314", 0);
    {   /* двойна транспозиция: 3142, после 312 върху резултата */
        const alphabet *A = alpha_get(0);
        int p[64], c1[64], c2[64], d1[64], d2[64], o1[9], o2[9];
        int n = alpha_encode(A, "ATTACKATDAWN", p, 64);
        int w1 = parse_order("3142", o1), w2 = parse_order("312", o2);
        col_encrypt(p, n, o1, w1, -1, c1);
        col_encrypt(c1, n, o2, w2, -1, c2);
        print_codes("double(ATTACKATDAWN)", A, c2, n);
        col_decrypt(c2, n, o2, w2, d1);
        col_decrypt(d1, n, o1, w1, d2);
        print_codes("doubledec(ATTACKATDAWN)", A, d2, n);
    }
    run_rail("ATTACKATDAWN", 0, "ATTACKATDAWN", 3);
    run_rail("ATTACKATDAWN", 0, "ATTACKATDAWN", 2);
    run_rail("WEAREDISCOVERED", 0, "WEAREDISCOVERED", 4);
    run_rail("BG", 1, "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 3);
    run_route("ATTACKATDAWN", 0, "ATTACKATDAWN", 4);
    run_route("WEAREDISCOVERED", 0, "WEAREDISCOVERED", 4);
    return 0;
}
#endif
