/* Тема 8, раздел 7 — семантична мрежа и фреймове: наследяване по връзка „е вид“ (IS-A).
 * Компилиране:  gcc -std=c11 -Wall -Wextra -Werror -O2 07_frames.c -o 07 && ./07
 *
 * Всеки фрейм има име, родител по „е вид“ и слотове (име -> стойност).
 * Търсенето на слот започва от самия фрейм и се изкачва по веригата „е вид“;
 * първата намерена стойност печели — така по-специфичният фрейм отменя
 * стойността по подразбиране на по-общия (изключение: пингвинът не лети).
 * Връзката „има част“ се пази отделно и НЕ участва в наследяването.
 */
#include <stdio.h>
#include <string.h>

#define MAXF 16
#define MAXS 8

typedef struct {
    const char *name;
    int isa;                          /* индекс на родителя или -1 */
    int ns;
    const char *slot[MAXS], *val[MAXS];
    int partof;                       /* „част от“ — индекс на цялото или -1; НЕ е „е вид“ */
} Frame;

static Frame F[MAXF];
static int NF;
static int g_steps;

static int add(const char *name, int isa, int partof)
{
    F[NF] = (Frame){name, isa, 0, {0}, {0}, partof};
    return NF++;
}
static void set(int f, const char *s, const char *v) { F[f].slot[F[f].ns] = s; F[f].val[F[f].ns++] = v; }

//#viz ch07_lookup
/* Следващ фрейм нагоре. Коректно: само по „е вид“.
   wrong = 1 показва ГРЕШКАТА — следване и по „част от“, сякаш е „е вид“. */
static int up(int f, int wrong)
{
    if (F[f].isa >= 0) return F[f].isa;
    return wrong ? F[f].partof : -1;
}

/* Връща стойността на слота и в *from — фрейма, от който е взета (или -1) */
const char *lookup(int f, const char *slot, int *from, int wrong)
{
    for (int cur = f; cur >= 0; cur = up(cur, wrong)) {  //@climb
        g_steps++;
        for (int i = 0; i < F[cur].ns; i++)              //@scan
            if (strcmp(F[cur].slot[i], slot) == 0) {     //@match
                *from = cur;
                return F[cur].val[i];                    //@found
            }
    }
    *from = -1;
    return NULL;                                         //@none
}
//#end

#ifndef NO_MAIN
int main(void)
{
    int animal = add("животно", -1, -1);
    set(animal, "диша", "да");
    set(animal, "кожа", "има");
    int bird = add("птица", animal, -1);
    set(bird, "лети", "да (по подразбиране)");
    set(bird, "покритие", "пера");
    int canary = add("канарче", bird, -1);
    set(canary, "цвят", "жълт");
    set(canary, "пее", "да");
    int penguin = add("пингвин", bird, -1);
    set(penguin, "лети", "не");
    set(penguin, "плува", "да");
    int fish = add("риба", animal, -1);
    set(fish, "покритие", "люспи");
    set(fish, "плува", "да");
    int tweety = add("Туити", canary, -1);
    set(tweety, "собственик", "Ана");
    int wing = add("крило", -1, bird);
    set(wing, "брой", "2");
    int gill = add("хриле", -1, fish);
    set(gill, "функция", "дишане във вода");

    const struct { int f; const char *s; int wrong; } Q[] = {
        {canary, "лети", 0}, {penguin, "лети", 0}, {tweety, "диша", 0}, {tweety, "цвят", 0},
        {penguin, "цвят", 0}, {tweety, "лети", 0}, {penguin, "покритие", 0}, {canary, "плува", 0},
        {wing, "лети", 0}, {wing, "лети", 1}, {gill, "плува", 1}, {wing, "брой", 0},
    };
    for (int i = 0; i < 12; i++) {
        int from;
        g_steps = 0;
        const char *v = lookup(Q[i].f, Q[i].s, &from, Q[i].wrong);
        const char *w = Q[i].wrong ? " wrong" : "";
        printf("%s.%s%s = %s\n", F[Q[i].f].name, Q[i].s, w, v ? v : "?");
        printf("%s.%s%s from = %s\n", F[Q[i].f].name, Q[i].s, w, from >= 0 ? F[from].name : "-");
        printf("%s.%s%s steps = %d\n", F[Q[i].f].name, Q[i].s, w, g_steps);
    }
    return 0;
}
#endif
