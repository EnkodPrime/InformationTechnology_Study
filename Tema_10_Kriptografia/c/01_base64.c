/* Тема 10, раздел 1 — кодиране НЕ е шифроване: Base64.
 * Base64 представя байтове в 64-символна азбука. Няма таен ключ: всеки, който знае
 * (публичното) правило, възстановява данните. Обратимостта не е сигурност.
 * Компилиране: gcc -std=c11 -Wall -Wextra -O2 01_base64.c -o b64 && ./b64
 */
#include <stdio.h>
#include <string.h>

static const char B64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

//#viz ch01_b64enc
/* 3 байта (24 бита) -> 4 знака по 6 бита. Непълна група -> '=' */
size_t b64_encode(const unsigned char *in, size_t n, char *out)
{
    size_t j = 0;
    for (size_t i = 0; i < n; i += 3) {                 //@group
        unsigned v = (unsigned)in[i] << 16;             //@pack
        if (i + 1 < n) v |= (unsigned)in[i + 1] << 8;   //@pack
        if (i + 2 < n) v |= in[i + 2];                  //@pack
        out[j++] = B64[(v >> 18) & 63];                 //@six
        out[j++] = B64[(v >> 12) & 63];                 //@six
        out[j++] = i + 1 < n ? B64[(v >> 6) & 63] : '='; //@six @pad
        out[j++] = i + 2 < n ? B64[v & 63] : '=';       //@six @pad
    }
    out[j] = '\0';                                      //@done
    return j;
}
//#end

//#viz ch01_b64dec
/* Обратното правило — също публично. Ключ не е нужен. */
static int b64_val(char c)
{
    const char *p = strchr(B64, c);
    return (c && p) ? (int)(p - B64) : -1;
}
long b64_decode(const char *in, unsigned char *out)
{
    size_t n = strlen(in), j = 0;
    if (n % 4) return -1;                               //@check
    for (size_t i = 0; i < n; i += 4) {                 //@group
        unsigned v = 0; int pad = 0;
        for (int k = 0; k < 4; k++) {                   //@six
            int d = in[i + k] == '=' ? (pad++, 0) : b64_val(in[i + k]);
            if (d < 0) return -1;                       //@check
            v = (v << 6) | (unsigned)d;                 //@six
        }
        out[j++] = (unsigned char)(v >> 16);            //@unpack
        if (pad < 2) out[j++] = (unsigned char)(v >> 8); //@unpack
        if (pad < 1) out[j++] = (unsigned char)v;       //@unpack
    }
    return (long)j;                                     //@done
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const char *tests[] = { "ATTACK", "AT DAWN", "Ключ", "M", "" };
    for (int t = 0; t < 5; t++) {
        char enc[256]; unsigned char dec[256];
        size_t n = strlen(tests[t]);
        b64_encode((const unsigned char *)tests[t], n, enc);
        long m = b64_decode(enc, dec);
        printf("b64(%s) = %s\n", tests[t], enc);
        printf("roundtrip(%s) = %d\n", tests[t], m == (long)n && memcmp(dec, tests[t], n) == 0);
    }
    unsigned char d[16];
    printf("bad(QUJ) = %ld\n", b64_decode("QUJ", d));
    return 0;
}
#endif
