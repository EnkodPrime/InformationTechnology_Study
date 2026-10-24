/* Тема 11, раздел 2 — представителна функция: едно и също число, различни байтове.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 02_layers.c -o 02_layers && ./02_layers
 *
 * Пример от ръководството: числото 1000 като текст UTF-8 е 31 30 30 30,
 * като 16-битово цяло big-endian е 03 E8, little-endian — E8 03.
 * Ако страните не са съгласували формата, байтовете пристигат правилно,
 * но се тълкуват грешно.
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

//#viz ch02_repr
/* Записва v в buf по избрания формат; връща броя байтове. */
enum { TEXT, BE16, LE16 };
int encode(uint16_t v, int fmt, uint8_t buf[8])
{
    int n = 0;
    if (fmt == TEXT) {                         /* десетичен текст, ASCII ⊂ UTF-8 */
        char tmp[8];
        int len = snprintf(tmp, sizeof tmp, "%u", (unsigned)v);   //@text
        for (int i = 0; i < len; i++)
            buf[n++] = (uint8_t)tmp[i];        //@textbyte
    } else if (fmt == BE16) {
        buf[n++] = (uint8_t)(v >> 8);          //@hi
        buf[n++] = (uint8_t)(v & 0xFF);        //@lo
    } else {
        buf[n++] = (uint8_t)(v & 0xFF);        //@lo
        buf[n++] = (uint8_t)(v >> 8);          //@hi
    }
    return n;                                  //@ret
}

/* Получателят тълкува 2 байта като 16-битово число в СВОЯ формат. */
uint16_t decode16(const uint8_t b[2], int fmt)
{
    if (fmt == BE16) return (uint16_t)(b[0] << 8 | b[1]);   //@decbe
    return (uint16_t)(b[1] << 8 | b[0]);                    //@decle
}
//#end

static void hex(const char *name, const uint8_t *b, int n)
{
    printf("%s =", name);
    for (int i = 0; i < n; i++) printf(" %02X", b[i]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    uint8_t b[8];
    const uint16_t vals[] = { 1000, 250, 65535, 7 };
    for (int k = 0; k < 4; k++) {
        char nm[48];
        int n = encode(vals[k], TEXT, b); snprintf(nm, sizeof nm, "text(%u)", (unsigned)vals[k]); hex(nm, b, n);
        n = encode(vals[k], BE16, b);     snprintf(nm, sizeof nm, "be16(%u)", (unsigned)vals[k]); hex(nm, b, n);
        printf("be16(%u) read as le = %u\n", (unsigned)vals[k], (unsigned)decode16(b, LE16));
        n = encode(vals[k], LE16, b);     snprintf(nm, sizeof nm, "le16(%u)", (unsigned)vals[k]); hex(nm, b, n);
        printf("le16(%u) read as be = %u\n", (unsigned)vals[k], (unsigned)decode16(b, BE16));
    }
    return 0;
}
#endif
