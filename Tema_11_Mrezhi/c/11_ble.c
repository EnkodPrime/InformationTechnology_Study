/* Тема 11, раздел 11 — Bluetooth (разширение): смисъл на байтовете в GATT характеристика
 * и приложен шлюз към HTTP/JSON.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 11_ble.c -o 11_ble && ./11_ble
 *
 * Battery Level (UUID 0x2A19): един байт, процент 0…100 по спецификацията.
 * Учебна собствена температурна характеристика — ДОПУСКАНЕ на примера:
 * два байта без знак, little-endian, стъпка 0,1 °C.
 */
#include <stdio.h>
#include <stdint.h>

//#viz ch11_gatt
/* Връща процента или -1, ако стойността е извън допустимото. */
int battery_level(const uint8_t *v, int n)
{
    if (n != 1) return -1;                         //@blen
    if (v[0] > 100) return -1;   /* 101..255 са запазени */   //@brange
    return v[0];                                   //@bret
}

/* Десети от градуса; договор на учебния датчик, не общ Bluetooth формат. */
int temp_decitenths(const uint8_t *v, int n)
{
    if (n != 2) return -1;                         //@tlen
    return v[0] | v[1] << 8;     /* little-endian */          //@tle
}

/* Шлюзът създава НОВ приложен запис — не пренася байтовете прозрачно. */
int to_json(int deci, char *out, int cap)
{
    return snprintf(out, (size_t)cap, "{\"temperature_c\":%d.%d}", deci / 10, deci % 10);   //@json
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const uint8_t b1[] = { 0x64 }, b2[] = { 0x32 }, b3[] = { 0xC8 };
    printf("battery(64) = %d\n", battery_level(b1, 1));
    printf("battery(32) = %d\n", battery_level(b2, 1));
    printf("battery(C8) = %d\n", battery_level(b3, 1));
    const uint8_t t1[] = { 0xFA, 0x00 }, t2[] = { 0x00, 0xFA }, t3[] = { 0xE9, 0x00 };
    char j[64];
    int d = temp_decitenths(t1, 2); to_json(d, j, sizeof j); printf("temp(FA 00) = %d %s\n", d, j);
    d = temp_decitenths(t2, 2); to_json(d, j, sizeof j); printf("temp(00 FA) = %d %s\n", d, j);
    d = temp_decitenths(t3, 2); to_json(d, j, sizeof j); printf("temp(E9 00) = %d %s\n", d, j);
    return 0;
}
#endif
