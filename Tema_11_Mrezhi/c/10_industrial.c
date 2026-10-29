/* Тема 11, раздел 10 — автомобилни и индустриални комуникации (разширение):
 * побитов CAN арбитраж, Modbus RTU (CRC-16) и Modbus TCP (MBAP).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 10_industrial.c -o 10_industrial && ./10_industrial
 *
 * CAN: моделира се само 11-битовото арбитражно поле на стандартни кадри за данни,
 * започнали едновременно. Шината е „жично И“: доминантната 0 надделява над рецесивната 1.
 */
#include <stdio.h>
#include <stdint.h>

//#viz ch10_can
/* ids[] — 11-битови идентификатори; връща индекса на победителя. */
int can_arbitrate(const uint16_t ids[], int n, int lost_at[])
{
    int active[16];
    for (int i = 0; i < n; i++) { active[i] = 1; lost_at[i] = -1; }
    for (int b = 10; b >= 0; b--) {                     /* старшият бит първи */
        int bus = 1;                                    /* рецесивно, ако никой не дърпа */
        for (int i = 0; i < n; i++)
            if (active[i] && !((ids[i] >> b) & 1))
                bus = 0;                                //@bus
        for (int i = 0; i < n; i++)
            if (active[i] && ((ids[i] >> b) & 1) && bus == 0) {
                active[i] = 0;                          //@lose
                lost_at[i] = 10 - b;                    //@lose
            }
    }
    for (int i = 0; i < n; i++) if (active[i]) return i;    //@win
    return -1;
}
//#end

//#viz ch10_crc16
/* Modbus RTU CRC-16: начало FFFF, отразен полином 0xA001.
   В кадъра се записва младшият байт първо. */
uint16_t modbus_crc(const uint8_t *b, int n)
{
    uint16_t crc = 0xFFFF;                              //@init
    for (int i = 0; i < n; i++) {
        crc ^= b[i];                                    //@xor
        for (int k = 0; k < 8; k++) {
            if (crc & 1)                                //@bit
                crc = (uint16_t)((crc >> 1) ^ 0xA001);  //@poly
            else
                crc >>= 1;                              //@shift
        }
    }
    return crc;                                         //@ret
}
//#end

//#viz ch10_modbus
/* Четене на count holding registers от адрес addr на устройство unit. */
int rtu_read(uint8_t unit, uint16_t addr, uint16_t count, uint8_t out[8])
{
    out[0] = unit;                                      //@addr
    out[1] = 0x03;                 /* function 03 */    //@pdu
    out[2] = (uint8_t)(addr >> 8);  out[3] = (uint8_t)addr;    //@pdu
    out[4] = (uint8_t)(count >> 8); out[5] = (uint8_t)count;   //@pdu
    uint16_t c = modbus_crc(out, 6);                    //@crc
    out[6] = (uint8_t)c; out[7] = (uint8_t)(c >> 8);    /* младши първо */  //@crc
    return 8;
}
int tcp_read(uint16_t tid, uint8_t unit, uint16_t addr, uint16_t count, uint8_t out[12])
{
    out[0] = (uint8_t)(tid >> 8); out[1] = (uint8_t)tid;   /* transaction id */  //@mbap
    out[2] = 0; out[3] = 0;        /* protocol id = 0 */   //@mbap
    out[4] = 0; out[5] = 6;        /* length: unit + 5 байта PDU */  //@mbap
    out[6] = unit;                                      //@mbap
    out[7] = 0x03;                                      //@pdu
    out[8] = (uint8_t)(addr >> 8);  out[9] = (uint8_t)addr;    //@pdu
    out[10] = (uint8_t)(count >> 8); out[11] = (uint8_t)count; //@pdu
    return 12;                     /* без CRC: целостта е от TCP/Ethernet */  //@nocrc
}
//#end

static void hex(const char *nm, const uint8_t *b, int n)
{
    printf("%s =", nm);
    for (int i = 0; i < n; i++) printf(" %02X", b[i]);
    printf("\n");
}

#ifndef NO_MAIN
int main(void)
{
    const uint16_t s1[] = { 0x100, 0x180 };
    const uint16_t s2[] = { 0x7F0, 0x123, 0x124, 0x0FF };
    const uint16_t s3[] = { 0x555, 0x554, 0x55C };
    const uint16_t *S[] = { s1, s2, s3 };
    const int N[] = { 2, 4, 3 };
    for (int k = 0; k < 3; k++) {
        int lost[16], w = can_arbitrate(S[k], N[k], lost);
        printf("can%d = win %d lost", k, w);
        for (int i = 0; i < N[k]; i++) printf(" %d", lost[i]);
        printf("\n");
    }
    uint8_t f[12];
    rtu_read(1, 0, 1, f);   hex("rtu(1,0,1)", f, 8);
    rtu_read(17, 107, 3, f); hex("rtu(17,107,3)", f, 8);
    tcp_read(1, 1, 0, 1, f); hex("tcp(1,1,0,1)", f, 12);
    const uint8_t resp[] = { 0x01, 0x03, 0x02, 0x00, 0xFA };
    uint16_t c = modbus_crc(resp, 5);
    printf("crc(01 03 02 00 FA) = %02X %02X\n", c & 0xFF, c >> 8);
    printf("value = %d\n", resp[3] << 8 | resp[4]);
    return 0;
}
#endif
