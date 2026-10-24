/* Тема 3, раздел 8 — „Обектът винаги ли е в динамичната памет?“ Не.
 * Четирите времена на съхранение в C++: автоматично, статично, нишково, динамично.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 08_storage.cpp -o 08_storage && ./08_storage
 */
#include <cstdio>
#include <memory>
#include <string>

static std::string trace;
static void L(const std::string& s) { if (!trace.empty()) trace += "|"; trace += s; }

struct T {
    std::string n;
    explicit T(const char* s) : n(s) { L("+" + n); }
    ~T() { L("-" + n); }
};

/* Създава се ПРЕДИ g (същата единица на транслация, ред на дефиниране) =>
   унищожава се СЛЕД g и печата цялата следа, включително събитията след main. */
struct Dump { ~Dump() { std::printf("full = %s\n", trace.c_str()); } } dump_at_exit;

//#viz ch08_storage
T g("global");                               // статично: преди main, след main  //@global

void f(int k) {
    T a("auto");                             // автоматично: до края на блока    //@auto
    static T s("static");                    // статично локално: при ПЪРВО минаване //@static
    thread_local T t("thread");              // нишково: живее колкото нишката  //@thread
    if (k == 2) {
        auto p = std::make_unique<T>("heap"); // динамично, но с RAII притежател  //@heap
    }                                        // unique_ptr освобождава тук       //@heap_end
    L("f" + std::to_string(k));                                          //@body
}                                            // ~auto                           //@f_end

int main_body() {
    L("main");                                                           //@main
    f(1);                                                                //@call1
    f(2);                                                                //@call2
    T* raw = new T("raw");                   // динамично, суров указател       //@raw
    delete raw;                              // животът свършва при delete      //@raw_del
    L("end main");                                                       //@main_end
    return 0;
}   // след main: ~static, ~thread (на нишката main), ~global — в обратен ред на създаване
//#end

#ifndef NO_MAIN
int main(void)
{
    main_body();
    std::printf("in_main = %s\n", trace.c_str());
    return 0;
}
#endif
