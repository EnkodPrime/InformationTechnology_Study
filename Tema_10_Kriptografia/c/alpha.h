/* Тема 10 — обща азбука за примерите: латиница A–Z (m = 26) или българска А–Я (m = 30).
 * Текстът се нормализира: малките букви a–z и а–я стават главни, всичко извън азбуката
 * (интервали, препинателни знаци, Ё, Ы, Э, цифри) се пропуска. Така C и JS виждат
 * една и съща последователност от кодове 0..m-1.
 * Всички функции са static inline, за да няма предупреждения за неизползвани.
 */
#ifndef T10_ALPHA_H
#define T10_ALPHA_H

#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    const char *name;
    int m;                 /* размер на азбуката = модул */
    unsigned cp[30];       /* Unicode код на всяка буква */
    int pad;               /* код на буквата за допълване (X / Х) */
} alphabet;

static inline const alphabet *alpha_get(int bg)
{
    static const alphabet LAT = { "lat", 26,
        { 'A','B','C','D','E','F','G','H','I','J','K','L','M',
          'N','O','P','Q','R','S','T','U','V','W','X','Y','Z' }, 23 };
    /* А Б В Г Д Е Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ь Ю Я */
    static const alphabet BG = { "bg", 30,
        { 0x410,0x411,0x412,0x413,0x414,0x415,0x416,0x417,0x418,0x419,
          0x41A,0x41B,0x41C,0x41D,0x41E,0x41F,0x420,0x421,0x422,0x423,
          0x424,0x425,0x426,0x427,0x428,0x429,0x42A,0x42C,0x42E,0x42F }, 21 };
    return bg ? &BG : &LAT;
}

static inline int mod(int a, int m) { int r = a % m; return r < 0 ? r + m : r; }

static inline int gcd_int(int a, int b)
{
    a = a < 0 ? -a : a; b = b < 0 ? -b : b;
    while (b) { int r = a % b; a = b; b = r; }
    return a;
}

/* следващият Unicode символ от UTF-8 низ (1–3 байта; иначе 0xFFFD) */
static inline unsigned utf8_next(const char **ps)
{
    const unsigned char *s = (const unsigned char *)*ps;
    unsigned c = s[0];
    if (c < 0x80) { *ps += 1; return c; }
    if ((c & 0xE0) == 0xC0 && (s[1] & 0xC0) == 0x80) { *ps += 2; return ((c & 0x1F) << 6) | (s[1] & 0x3F); }
    if ((c & 0xF0) == 0xE0 && (s[1] & 0xC0) == 0x80 && (s[2] & 0xC0) == 0x80) {
        *ps += 3; return ((c & 0x0F) << 12) | ((unsigned)(s[1] & 0x3F) << 6) | (s[2] & 0x3F);
    }
    *ps += 1; return 0xFFFD;
}

static inline int alpha_index(const alphabet *A, unsigned cp)
{
    if (cp >= 'a' && cp <= 'z') cp -= 32;
    if (cp >= 0x430 && cp <= 0x44F) cp -= 0x20;
    for (int i = 0; i < A->m; i++) if (A->cp[i] == cp) return i;
    return -1;
}

/* текст -> кодове; връща броя букви */
static inline int alpha_encode(const alphabet *A, const char *text, int *out, int cap)
{
    int n = 0;
    while (*text && n < cap) {
        int k = alpha_index(A, utf8_next(&text));
        if (k >= 0) out[n++] = k;
    }
    return n;
}

/* кодове -> UTF-8 текст */
static inline void alpha_decode(const alphabet *A, const int *x, int n, char *out, size_t cap)
{
    size_t j = 0;
    for (int i = 0; i < n; i++) {
        unsigned c = A->cp[x[i]];
        if (c < 0x80) { if (j + 1 >= cap) break; out[j++] = (char)c; }
        else { if (j + 2 >= cap) break; out[j++] = (char)(0xC0 | (c >> 6)); out[j++] = (char)(0x80 | (c & 0x3F)); }
    }
    out[j] = '\0';
}

/* удобство за main(): печата "име = текст" */
static inline void print_codes(const char *name, const alphabet *A, const int *x, int n)
{
    char buf[4096];
    alpha_decode(A, x, n, buf, sizeof buf);
    printf("%s = %s\n", name, buf);
}

/* Примерни текстове — същите като T10.TEXTS в js/alpha.js */
#define EN_SAMPLE "WE WILL MEET AT THE OLD BRIDGE NEAR THE RIVER AT DAWN. BRING THE MAP, THE SECOND KEY AND ENOUGH WATER FOR TWO DAYS. IF THE WEATHER CHANGES, WAIT IN THE HOUSE BEHIND THE CHURCH AND DO NOT LIGHT A FIRE. THE OTHERS WILL JOIN US ON THE THIRD DAY WHEN THE ROAD IS OPEN AGAIN."
#define EN_REF "THE ENGINEER OPENED THE NOTEBOOK AND READ THE NOTES FROM THE LAST TEST. THE DATA LOGGER HAD RECORDED EVERY SIGNAL ON THE BUS FOR THREE HOURS, AND THE FILE WAS LARGER THAN EXPECTED. SHE DECIDED TO WRITE A SHORT PROGRAM THAT WOULD COUNT THE MESSAGES, CHECK THE TIME STAMPS AND MARK EVERY FRAME THAT ARRIVED OUT OF ORDER. WHEN THE PROGRAM FINISHED, THE RESULT WAS CLEAR: MOST OF THE ERRORS CAME FROM ONE NODE THAT RESTARTED WHENEVER THE VOLTAGE DROPPED. THE TEAM REPLACED THE POWER SUPPLY, REPEATED THE TEST ON THE NEXT MORNING AND FOUND NO MORE PROBLEMS. IN THE REPORT SHE EXPLAINED HOW THE DATA WAS COLLECTED, WHICH TOOLS WERE USED AND WHY THE SIMPLE COUNT WAS ENOUGH TO FIND THE CAUSE."
#define BG_SAMPLE "ЩЕ СЕ СРЕЩНЕМ ПРИ СТАРИЯ МОСТ ДО РЕКАТА ПРИ ИЗГРЕВ. ДОНЕСИ КАРТАТА, ВТОРИЯ КЛЮЧ И ДОСТАТЪЧНО ВОДА ЗА ДВА ДНИ. АКО ВРЕМЕТО СЕ ПРОМЕНИ, ЧАКАЙ В КЪЩАТА ЗАД ЦЪРКВАТА И НЕ ПАЛИ ОГЪН. ДРУГИТЕ ЩЕ ДОЙДАТ НА ТРЕТИЯ ДЕН, КОГАТО ПЪТЯТ ОТНОВО Е ОТВОРЕН."
#define BG_REF "ИНЖЕНЕРЪТ ОТВОРИ ТЕТРАДКАТА И ПРОЧЕТЕ БЕЛЕЖКИТЕ ОТ ПОСЛЕДНОТО ИЗПИТВАНЕ. УСТРОЙСТВОТО БЕШЕ ЗАПИСАЛО ВСЕКИ СИГНАЛ ПО ШИНАТА В ПРОДЪЛЖЕНИЕ НА ТРИ ЧАСА И ФАЙЛЪТ БЕШЕ ПО-ГОЛЯМ ОТ ОЧАКВАНОТО. ТЯ РЕШИ ДА НАПИШЕ КРАТКА ПРОГРАМА, КОЯТО ДА ПРЕБРОИ СЪОБЩЕНИЯТА, ДА ПРОВЕРИ ВРЕМЕТО НА ВСЯКО ОТ ТЯХ И ДА ОТБЕЛЕЖИ ВСИЧКИ, КОИТО СА ПРИСТИГНАЛИ НЕ НА МЯСТОТО СИ. КОГАТО ПРОГРАМАТА ПРИКЛЮЧИ, РЕЗУЛТАТЪТ БЕШЕ ЯСЕН: ПОВЕЧЕТО ГРЕШКИ ИДВАХА ОТ ЕДИН ВЪЗЕЛ, КОЙТО СЕ РЕСТАРТИРАШЕ ВСЕКИ ПЪТ, КОГАТО НАПРЕЖЕНИЕТО ПАДНЕШЕ. ЕКИПЪТ СМЕНИ ЗАХРАНВАНЕТО, ПОВТОРИ ИЗПИТВАНЕТО НА СЛЕДВАЩАТА СУТРИН И НЕ ОТКРИ ПОВЕЧЕ ПРОБЛЕМИ. В ДОКЛАДА ТЯ ОБЯСНИ КАК СА СЪБРАНИ ДАННИТЕ, КАКВИ СРЕДСТВА СА ИЗПОЛЗВАНИ И ЗАЩО ПРОСТОТО ПРЕБРОЯВАНЕ Е БИЛО ДОСТАТЪЧНО, ЗА ДА СЕ ОТКРИЕ ПРИЧИНАТА."

#endif
