/* Тема 3, раздел 4 — същият полиморфизъм като в 04_virtual.cpp, написан на C:
 * „ръчна“ виртуална таблица = структура от указатели към функции + указател към нея
 * в началото на всеки обект. Това е модел на разпространената реализация, не дефиниция.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 04_vtable.c -o 04_vtable && ./04_vtable
 */
#include <stdio.h>
#include <string.h>

//#viz ch04_cvtable
typedef struct Sensor Sensor;
typedef struct {                             /* „виртуалната таблица“          */
    int         (*read)(const Sensor*);      /* слот 0                         */
    const char* (*unit)(const Sensor*);      /* слот 1                         */
} SensorVT;
struct Sensor { const SensorVT* vt; };       /* скритият vptr — първо поле     */ //@vptr

static int         sensor_read(const Sensor* s) { (void)s; return 0; }
static const char* sensor_unit(const Sensor* s) { (void)s; return "?"; }
static int         temp_read(const Sensor* s)   { (void)s; return 21; }
static const char* temp_unit(const Sensor* s)   { (void)s; return "C"; }
static int         press_read(const Sensor* s)  { (void)s; return 1013; }

static const SensorVT SENSOR_VT = { sensor_read, sensor_unit };              //@vt_s
static const SensorVT TEMP_VT   = { temp_read,   temp_unit   };              //@vt_t
static const SensorVT PRESS_VT  = { press_read,  sensor_unit };  /* наследен слот 1 */ //@vt_p

typedef struct { Sensor base; } Temp;        /* „наследяване“: базата е първа  */
typedef struct { Sensor base; } Press;

static void temp_init(Temp* t)   { t->base.vt = &TEMP_VT;  }   /* „конструктор“ */ //@ctor
static void press_init(Press* p) { p->base.vt = &PRESS_VT; }

/* „виртуално извикване“: s->vt->read(s)  ==  s->read() в C++ */
static int poll_read(const Sensor* const* p, int n, char* out, size_t cap)
{
    size_t len = 0; int sum = 0;
    for (int i = 0; i < n; i++) {                                            //@loop
        const Sensor* s = p[i];                                              //@load
        int v = s->vt->read(s);              /* 1) vptr  2) слот  3) скок    */ //@call
        sum += v;
        len += (size_t)snprintf(out + len, cap - len, i + 1 < n ? "%d " : "%d", v);
    }
    return sum;                                                              //@ret
}
//#end

static Sensor s0 = { &SENSOR_VT };
static Temp t0; static Press p0;
static const Sensor* make(char c) { return c == 'T' ? &t0.base : c == 'P' ? &p0.base : &s0; }

#ifndef NO_MAIN
int main(void)
{
    temp_init(&t0); press_init(&p0);
    const char* seqs[] = {"TPS", "PPTS", "STTP", "T"};
    for (int k = 0; k < 4; k++) {
        const Sensor* arr[8]; int n = (int)strlen(seqs[k]); char buf[128];
        for (int i = 0; i < n; i++) arr[i] = make(seqs[k][i]);
        poll_read(arr, n, buf, sizeof buf);
        printf("poll(%s,0) = %s\n", seqs[k], buf);
        size_t len = 0;
        for (int i = 0; i < n; i++) len += (size_t)snprintf(buf + len, sizeof buf - len, i + 1 < n ? "%s " : "%s", arr[i]->vt->unit(arr[i]));
        printf("poll(%s,1) = %s\n", seqs[k], buf);
    }
    printf("sizeof(Sensor) = %d\n", (int)sizeof(Sensor));
    return 0;
}
#endif
