/* Тема 7, раздел 9 — миграция с проверки преди приемане.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 09_migration.c -o mig && ./mig
 *
 * Стара система: плащания на студенти в стотинки (BGN).
 * Нова система:  същите плащания в евроценти (EUR).
 * Фиксиран курс 1 EUR = 1.95583 BGN; преобразуване с математическо закръгляне.
 *
 * migrate() пренася редовете, като по избор внася типична грешка.
 * accept() прилага пет проверки — от структурни към смислови — и показва,
 * че еднаквият брой редове не доказва запазен смисъл.
 */
#include <stdio.h>

#define MAXR 16

typedef struct { int id; int student; long long amount; } Row; /* amount: стотинки или евроценти */

enum { BUG_NONE, BUG_NO_CONVERT, BUG_FK_SHIFT, BUG_DUP_ID, BUG_DROP, BUG_FK_TYPO, BUG_COUNT };

/* стотинки -> евроценти, закръгляне до най-близкия цент (за amount >= 0) */
/* long long: st * 100000 + 97791 надхвърля INT32_MAX още при 21474 стотинки, а long е 32-битов под Windows (LLP64) */
long long bgn_to_eur(long long st)
{
    return (st * 100000LL + 97791LL) / 195583LL;
}

/* Пренасяне (Extract-Transform-Load) с възможна грешка. Връща броя редове в dst. */
int migrate(const Row src[], int n, const int students[], int ns, int bug, Row dst[])
{
    int m = 0;
    for (int i = 0; i < n; i++) {
        if (bug == BUG_DROP && i == n - 1) continue;           /* изпуснат последен ред */
        Row r = src[i];
        if (bug != BUG_NO_CONVERT) r.amount = bgn_to_eur(r.amount);
        if (bug == BUG_FK_SHIFT) {                             /* съпоставяне по позиция, изместено с 1 */
            for (int k = 0; k < ns; k++)
                if (students[k] == src[i].student) { r.student = students[(k + 1) % ns]; break; }
        }
        if (bug == BUG_FK_TYPO && i == 0) r.student += 1000;   /* несъществуващ студент */
        if (bug == BUG_DUP_ID && i == n - 1 && n > 1) r = dst[m - 1]; /* последният ред затрит с копие */
        dst[m++] = r;
    }
    return m;
}

//#viz ch09_accept
/* Пет проверки преди приемане. Бит k в резултата = проверка k е минала. */
int accept(const Row src[], int n, const Row dst[], int m,
           const int students[], int ns)
{                                                         //@enter
    int mask = 0;
    /* 1. Брой редове */
    if (m == n) mask |= 1;                                //@count
    /* 2. Уникален първичен ключ */
    int uniq = 1;
    for (int i = 0; i < m; i++)
        for (int j = i + 1; j < m; j++)
            if (dst[i].id == dst[j].id) uniq = 0;         //@pk
    if (uniq) mask |= 2;
    /* 3. Чуждите ключове сочат съществуващи студенти */
    int fk = 1;
    for (int i = 0; i < m; i++) {
        int found = 0;
        for (int k = 0; k < ns; k++)
            if (students[k] == dst[i].student) found = 1;
        if (!found) fk = 0;                               //@fk
    }
    if (fk) mask |= 4;
    /* 4. Контролна сума в евро (смисъл на единиците) */
    long long want = 0, got = 0;
    for (int i = 0; i < n; i++) want += bgn_to_eur(src[i].amount);
    for (int i = 0; i < m; i++) got += dst[i].amount;
    if (want == got) mask |= 8;                           //@sum
    /* 5. Съпоставяне ред по ред: същият студент и сума за всеки ид */
    int rec = 1;
    for (int i = 0; i < n; i++) {
        int hit = 0;
        for (int j = 0; j < m; j++)
            if (dst[j].id == src[i].id && dst[j].student == src[i].student
                && dst[j].amount == bgn_to_eur(src[i].amount)) hit = 1;
        if (!hit) rec = 0;                                //@rec
    }
    if (rec) mask |= 16;
    return mask;                                          //@ret
}
//#end

#ifndef NO_MAIN
int main(void)
{
    const int students[] = {101, 102, 103, 104};
    const Row src[] = {{1, 101, 12000}, {2, 102, 5000}, {3, 103, 25000},
                       {4, 101, 3000}, {5, 104, 9999}};
    const int n = 5, ns = 4;
    static const char *const NAME[BUG_COUNT] = {"none", "noconv", "fkshift", "dupid", "drop", "fktypo"};
    printf("bgn_to_eur(12000) = %lld\n", bgn_to_eur(12000));
    printf("bgn_to_eur(9999) = %lld\n", bgn_to_eur(9999));
    for (int b = 0; b < BUG_COUNT; b++) {
        Row dst[MAXR];
        int m = migrate(src, n, students, ns, b, dst);
        int mask = accept(src, n, dst, m, students, ns);
        printf("accept(%s) = %d rows=%d\n", NAME[b], mask, m);
    }
    return 0;
}
#endif
