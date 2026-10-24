/* Тема 3, раздел 7 — шаблони и статичен полиморфизъм.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 07_templates.cpp -o 07_templates && ./07_templates
 *
 * __PRETTY_FUNCTION__ (разширение на g++) показва коя специализация се изпълнява:
 * така програмата сама отпечатва генерираните функции.
 */
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

static std::vector<std::string> inst;        /* специализации в реда на първото им извикване */
static void seen(const char* pf) { for (auto& s : inst) if (s == pf) return; inst.push_back(pf); }

//#viz ch07_larger
template <class T>
T larger(T a, T b) {                         // изискване: T има <  и се копира  //@tpl
    seen(__PRETTY_FUNCTION__);                                          //@inst
    return a < b ? b : a;                                               //@cmp
}
template <>                                  // пълна (явна) специализация
const char* larger<const char*>(const char* a, const char* b) {         //@spec
    seen(__PRETTY_FUNCTION__);
    return std::strcmp(a, b) < 0 ? b : a;    // сравнява текста, не адресите  //@spec_cmp
}
//   larger(3, 2.5)          -> грешка: T е int или double? (противоречиво извеждане) //@conflict
//   larger<double>(3, 2.5)  -> явно T = double, 3 се преобразува                       //@explicit
//#end

//#viz ch07_stack
template <class T, int N>                    // параметър-тип и параметър-стойност
class Stack {
    T data[N];                                                          //@data
    int top = 0;                                                        //@top
public:
    bool push(const T& v) { if (top == N) return false; data[top++] = v; return true; } //@push
    bool pop(T& out) { if (top == 0) return false; out = data[--top]; return true; }    //@pop
    int size() const { return top; }
};
// Stack<char,4>, Stack<int,4>, Stack<double,4> — три РАЗЛИЧНИ класа    //@three
//#end

struct Big { char b[24]; bool operator<(const Big& o) const { return std::memcmp(b, o.b, 24) < 0; } };

#ifndef NO_MAIN
int main(void)
{
    /* скрипт 1 — примерът от ръководството */
    int r1 = larger(3, 7); double r2 = larger(2.5, 1.0);
    std::printf("larger(3,7) = %d\n", r1);
    std::printf("larger(2.5,1.0) = %g\n", r2);
    for (size_t i = 0; i < inst.size(); i++) std::printf("s1.%d = %s\n", (int)i, inst[i].c_str());
    std::printf("s1.n = %d\n", (int)inst.size()); inst.clear();

    /* скрипт 2 */
    char r3 = larger('a', 'z'); int r4 = larger(10, -4); double r5 = larger<double>(3, 2.5);
    const char* r6 = larger<const char*>("abc", "abd"); long r7 = larger(5L, 9L);
    std::printf("larger('a','z') = %c\n", r3);
    std::printf("larger(10,-4) = %d\n", r4);
    std::printf("larger<double>(3,2.5) = %g\n", r5);
    std::printf("larger<const char*>(\"abc\",\"abd\") = %s\n", r6);
    std::printf("larger(5L,9L) = %ld\n", r7);
    for (size_t i = 0; i < inst.size(); i++) std::printf("s2.%d = %s\n", (int)i, inst[i].c_str());
    std::printf("s2.n = %d\n", (int)inst.size()); inst.clear();

    /* размери на специализациите на Stack */
    std::printf("sizeof(Stack<char,4>) = %d\n", (int)sizeof(Stack<char, 4>));
    std::printf("sizeof(Stack<short,4>) = %d\n", (int)sizeof(Stack<short, 4>));
    std::printf("sizeof(Stack<int,4>) = %d\n", (int)sizeof(Stack<int, 4>));
    std::printf("sizeof(Stack<double,4>) = %d\n", (int)sizeof(Stack<double, 4>));
    std::printf("sizeof(Stack<char,10>) = %d\n", (int)sizeof(Stack<char, 10>));
    std::printf("sizeof(Stack<int,3>) = %d\n", (int)sizeof(Stack<int, 3>));
    std::printf("sizeof(Stack<double,1>) = %d\n", (int)sizeof(Stack<double, 1>));
    std::printf("sizeof(Stack<Big,2>) = %d\n", (int)sizeof(Stack<Big, 2>));
    Stack<int, 3> st; int x = 0, pushed = 0, popped = 0;
    for (int v : {5, 8, 1, 9}) pushed += st.push(v);
    std::string out;
    while (st.pop(x)) { popped++; out += std::to_string(x) + " "; }
    std::printf("stack = %d %d %s\n", pushed, popped, out.c_str());
    return 0;
}
#endif
