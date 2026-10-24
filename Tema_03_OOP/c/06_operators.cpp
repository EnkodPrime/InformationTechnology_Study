/* Тема 3, раздел 6 — предефиниране (претоварване) на операции.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 06_operators.cpp -o 06_operators && ./06_operators
 */
#include <cstdio>
#include <sstream>
#include <string>

static std::string trace;
static void L(const std::string& s) { if (!trace.empty()) trace += "|"; trace += s; }

//#viz ch06_complex
struct Complex {
    double re, im;
    Complex& operator+=(const Complex& b) {  // член: променя ЛЕВИЯ операнд   //@pluseq
        re += b.re; im += b.im; L("+=");
        return *this;
    }
};
std::ostream& operator<<(std::ostream& os, const Complex& z);

Complex operator+(const Complex& a, const Complex& b) {    // свободна, симетрична  //@plus
    L("+");
    return {a.re + b.re, a.im + b.im};                                     //@plus_ret
}
Complex operator-(const Complex& a, const Complex& b) {                    //@minus
    L("-");
    return {a.re - b.re, a.im - b.im};
}
Complex operator*(const Complex& a, const Complex& b) {   // (a+bi)(c+di)    //@mul
    L("*");
    return {a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re};         //@mul_ret
}
bool operator==(const Complex& a, const Complex& b) {                      //@eq
    return a.re == b.re && a.im == b.im;
}
std::ostream& operator<<(std::ostream& os, const Complex& z) {  // връща потока  //@out
    os << z.re << (z.im < 0 ? "-" : "+") << (z.im < 0 ? -z.im : z.im) << "i";
    return os;                               // за верижно os << a << b     //@out_ret
}
//#end

static std::string S(const Complex& z) { std::ostringstream o; o << z; return o.str(); }

#ifndef NO_MAIN
int main(void)
{
    Complex a{2, 3}, b{4, 1}, c{1, -1}, d{0, 2};
    trace.clear(); std::printf("manual = %s\n", S(a + b).c_str());                     /* (2+3i)+(4+i)=6+4i */
    trace.clear(); { Complex r = a + b * c;       std::printf("e1 = %s [%s]\n", S(r).c_str(), trace.c_str()); }
    trace.clear(); { Complex r = (a + b) * c;     std::printf("e2 = %s [%s]\n", S(r).c_str(), trace.c_str()); }
    trace.clear(); { Complex r = a - b - c;       std::printf("e3 = %s [%s]\n", S(r).c_str(), trace.c_str()); }
    trace.clear(); { Complex r = a * b + c * d;   std::printf("e4 = %s\n", S(r).c_str()); }   /* редът на двете * не е зададен */
    trace.clear(); { Complex r = a * a * a;       std::printf("e5 = %s [%s]\n", S(r).c_str(), trace.c_str()); }
    trace.clear(); { Complex r = a; r += b; r += c; std::printf("e6 = %s [%s] a=%s\n", S(r).c_str(), trace.c_str(), S(a).c_str()); }
    std::printf("comm = %d %d\n", (int)(a + b == b + a), (int)(a - b == b - a));
    std::ostringstream o; o << a << " " << c; std::printf("chain = %s\n", o.str().c_str());
    return 0;
}
#endif
