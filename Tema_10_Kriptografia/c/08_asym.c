/* Тема 10, раздел 9 — асиметрични ключове с малки числа (само за илюстрация).
 *   RSA:  n = p·q, φ(n) = (p−1)(q−1), e·d ≡ 1 (mod φ), C = M^e mod n, M = C^d mod n
 *   Дифи–Хелман: A = g^a mod p, B = g^b mod p, общ секрет s = B^a = A^b (mod p)
 *   Разбиване на RSA с малко n: разлагане чрез пробно делене.
 * Всички стойности са < 2^31, затова произведенията се събират в uint64_t.
 * Компилиране: gcc -std=c11 -Wall -Wextra -Werror -O2 08_asym.c -o asym && ./asym
 */
#include <stdio.h>
#include <stdint.h>

typedef uint64_t u64;
typedef int64_t i64;

//#viz ch09_egcd
/* Разширен алгоритъм на Евклид: d = e^−1 mod φ.
   Инвариант на всеки ред: r = e·s (mod φ). Когато r = 1, s е обратният. */
i64 mod_inverse(i64 e, i64 phi)
{
    i64 r0 = phi, r1 = e;                          //@init
    i64 s0 = 0, s1 = 1;
    while (r1 != 0) {                              //@loop
        i64 q = r0 / r1;                           //@q
        i64 r2 = r0 - q * r1;  r0 = r1;  r1 = r2;  //@step
        i64 s2 = s0 - q * s1;  s0 = s1;  s1 = s2;
    }
    if (r0 != 1) return -1;  /* НОД ≠ 1: няма */   //@gcd
    return s0 < 0 ? s0 + phi : s0;                 //@done
}
//#end

//#viz ch09_modpow
/* Бързо степенуване (квадрат и умножение), битовете на k отдясно наляво.
   O(log k) умножения вместо k − 1. */
u64 mod_pow(u64 b, u64 k, u64 n)
{
    u64 r = 1 % n;                                 //@init
    b %= n;
    while (k > 0) {                                //@loop
        if (k & 1)                                 //@bit
            r = r * b % n;                         //@mul
        b = b * b % n;                             //@sq
        k >>= 1;
    }
    return r;                                      //@done
}
//#end

//#viz ch09_factor
/* Нападателят знае само (n, e). Ако разложи n = p·q, пресмята φ и d.
   Пробно делене: до √n опита — безнадеждно при n с 2048 бита. */
u64 factor(u64 n)
{
    if (n % 2 == 0) return 2;                      //@even
    for (u64 f = 3; f * f <= n; f += 2)            //@try
        if (n % f == 0)                            //@hit
            return f;
    return n;                                      //@prime
}
//#end

static int is_prime(u64 x)
{
    if (x < 2) return 0;
    for (u64 f = 2; f * f <= x; f++) if (x % f == 0) return 0;
    return 1;
}

#ifndef NO_MAIN
static void rsa_case(const char *tag, u64 p, u64 q, u64 e, u64 m)
{
    u64 n = p * q, phi = (p - 1) * (q - 1);
    i64 d = mod_inverse((i64)e, (i64)phi);
    printf("%s n = %llu\n", tag, (unsigned long long)n);
    printf("%s phi = %llu\n", tag, (unsigned long long)phi);
    printf("%s d = %lld\n", tag, (long long)d);
    if (d < 0) return;
    u64 c = mod_pow(m, e, n), back = mod_pow(c, (u64)d, n);
    u64 sig = mod_pow(m, (u64)d, n), ver = mod_pow(sig, e, n);
    printf("%s c = %llu\n%s m2 = %llu\n", tag, (unsigned long long)c, tag, (unsigned long long)back);
    printf("%s sig = %llu\n%s ver = %llu\n", tag, (unsigned long long)sig, tag, (unsigned long long)ver);
    u64 f = factor(n);
    printf("%s factor = %llu\n", tag, (unsigned long long)f);
}

int main(void)
{
    rsa_case("r1", 61, 53, 17, 65);          /* класическият пример: n = 3233, d = 2753 */
    rsa_case("r2", 11, 13, 7, 42);
    rsa_case("r3", 46337, 46327, 65537, 123456789);
    rsa_case("r4", 3, 11, 3, 4);
    rsa_case("bad", 61, 53, 13, 65);         /* НОД(13, 3120) = 13 → няма d */
    printf("inv(3,7) = %lld\n", (long long)mod_inverse(3, 7));
    printf("inv(4,8) = %lld\n", (long long)mod_inverse(4, 8));

    /* Дифи–Хелман */
    const u64 dh[][4] = {{23, 5, 6, 15}, {2147483647, 16807, 123456, 654321}, {467, 2, 153, 197}};
    for (int i = 0; i < 3; i++) {
        u64 p = dh[i][0], g = dh[i][1], a = dh[i][2], b = dh[i][3];
        u64 A = mod_pow(g, a, p), B = mod_pow(g, b, p);
        printf("dh%d A = %llu\ndh%d B = %llu\n", i, (unsigned long long)A, i, (unsigned long long)B);
        printf("dh%d sA = %llu\ndh%d sB = %llu\n", i, (unsigned long long)mod_pow(B, a, p), i, (unsigned long long)mod_pow(A, b, p));
    }

    printf("factor(91) = %llu\nfactor(2147483647) = %llu\nfactor(1022117) = %llu\n",
           (unsigned long long)factor(91), (unsigned long long)factor(2147483647ULL), (unsigned long long)factor(1022117));
    printf("prime(46337) = %d\nprime(46327) = %d\nprime(2147483647) = %d\n", is_prime(46337), is_prime(46327), is_prime(2147483647ULL));
    return 0;
}
#endif
