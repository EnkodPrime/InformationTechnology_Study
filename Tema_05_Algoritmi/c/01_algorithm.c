/* Тема 5, раздел 1 — понятие за алгоритъм, свойства, коректност.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 01_algorithm.c -o 01_algorithm && ./01_algorithm
 *
 * Регионите //#viz ... //#end се показват във визуализацията;
 * маркерите //@етикет казват кой ред да се подсвети на дадена стъпка.
 */
#include <stdio.h>

//#viz linear_search
/* Връща индекса на key в a[0..n-1] или -1, ако липсва. */
int linear_search(const int a[], int n, int key)
{                                            //@enter
    for (int i = 0; i < n; i++) {            //@loop
        /* Инвариант: key не се среща в a[0..i-1] */
        if (a[i] == key)                     //@cmp
            return i;                        //@found
    }
    return -1;                               //@notfound
}
//#end

//#viz gcd_euclid
/* Най-голям общ делител — алгоритъм на Евклид. */
unsigned gcd(unsigned a, unsigned b)
{                                            //@enter
    /* Инвариант:   НОД(a, b) не се променя
       Ранг. функция: b >= 0 и строго намалява */
    while (b != 0) {                         //@cond
        unsigned r = a % b;                  //@mod
        a = b;                               //@shift
        b = r;                               //@shift
    }
    return a;                                //@ret
}
//#end

//#viz is_even_partial
/* Частично коректна, но НЕ пълно коректна:
   ако спре, отговорът е верен; за нечетно x не спира.
   (Разсъждението е в модела с неограничени цели числа. В C с int
   x - 2 стига INT_MIN и препълва — недефинирано поведение; gcc -O2
   дори премахва цикъла и връща 1 и за нечетно x.) */
int is_even(int x)
{                                            //@enter
    while (x != 0)                           //@cond
        x = x - 2;                           //@step
    return 1;  /* "четно" */                 //@ret
}
//#end

//#viz prop_finiteness
/* Нарушена КРАЙНОСТ: i никога не достига n при n > 0 */
int sum_bad(const int a[], int n)
{
    int s = 0;
    for (int i = 0; i < n; i = i * 2)        //@bug
        s += a[i];
    return s;
}
//#end

//#viz prop_definiteness
/* Нарушена ОПРЕДЕЛЕНОСТ: редът на изчисляване на
   операндите на „−“ не е зададен (unspecified, C11 6.5p3) —
   резултатът (−1 или 1) зависи от компилатора */
int next(void) { static int k = 0; return ++k; }
int pair_diff(void)
{
    return next() - next();                  //@bug
}
//#end

//#viz prop_mass
/* Нарушена МАСОВОСТ: работи само за един конкретен вход */
int max_of_example(void)
{
    /* входът {3, 9, 4} е "вграден" — за друг масив е безполезна */
    return 9;                                //@bug
}
//#end

//#viz prop_result
/* Нарушена РЕЗУЛТАТНОСТ: за празен масив няма
   резултат по спецификацията (чете извън масива) */
int max_bad(const int a[], int n)
{
    int m = a[0];                            //@bug
    for (int i = 1; i < n; i++)
        if (a[i] > m) m = a[i];
    return m;
}
//#end

//#viz prop_exec
/* Нарушена ИЗПЪЛНИМОСТ: операцията не е изпълнима
   в модела (делене на нула / недефинирано поведение) */
int avg_bad(const int a[], int n)
{
    int s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return s / n;                            //@bug
}
//#end

#ifndef NO_MAIN
int main(void)
{
    int a[] = {7, 3, 9, 4, 1, 8};
    int n = (int)(sizeof a / sizeof a[0]);
    printf("linear_search(4) = %d\n", linear_search(a, n, 4));
    printf("linear_search(5) = %d\n", linear_search(a, n, 5));
    printf("gcd(84, 18) = %u\n", gcd(84, 18));
    printf("gcd(1071, 462) = %u\n", gcd(1071, 462));
    printf("gcd(17, 5) = %u\n", gcd(17, 5));
    printf("is_even(6) = %d\n", is_even(6));
    (void)sum_bad; (void)pair_diff; (void)max_of_example; (void)max_bad; (void)avg_bad;
    return 0;
}
#endif
