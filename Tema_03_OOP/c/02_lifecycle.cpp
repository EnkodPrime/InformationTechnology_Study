/* Тема 3, раздел 2 — създаване, живот и унищожаване на обекти.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 02_lifecycle.cpp -o 02_lifecycle && ./02_lifecycle
 *
 * Всяка специална функция записва събитие в trace; main печата следата като
 * "име = събитие|събитие|...". Визуализацията възпроизвежда точно тази следа.
 */
#include <cstdio>
#include <string>
#include <utility>
#include <set>

static std::string trace;
static void L(const std::string& s) { if (!trace.empty()) trace += "|"; trace += s; }
static void dump(const char* name) { std::printf("%s = %s\n", name, trace.c_str()); trace.clear(); }

/* ---------- а) ред на изграждане и разрушаване ---------- */
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wreorder"   /* g++ -Wall предупреждава: списъкът не следва декларациите */
//#viz ch02_order
struct M {                                   // член-обект, който съобщава за живота си
    std::string n;
    M(const char* s) : n(s) { L("M(" + n + ")"); }                    //@m_ctor
    ~M() { L("~M(" + n + ")"); }                                      //@m_dtor
};
struct Base {
    Base()  { L("Base()"); }                                          //@b_ctor
    ~Base() { L("~Base()"); }                                         //@b_dtor
};
struct Derived : Base {
    M a;                                     // декларирани: a, после b   //@decl
    M b;
    Derived() : b("b"), a("a")               // списъкът е b, a — НО редът е a, b  //@init
    { L("Derived()"); }                      // тялото — последно          //@d_body
    ~Derived() { L("~Derived()"); }          // тялото — първо             //@d_dtor
};                                           // после ~b, ~a, ~Base      //@d_after

void demo_order() {
    {                                                                  //@scope
        Derived d;                                                     //@create
    }                                        // край на обхвата          //@end
}
//#end

//#viz ch02_order2
// M е същият член-клас като горе
struct B1 { B1() { L("B1()"); }  ~B1() { L("~B1()"); } };            //@b1_ctor @b1_dtor
struct B2 { B2() { L("B2()"); }  ~B2() { L("~B2()"); } };            //@b2_ctor @b2_dtor
struct D2 : B1, B2 {                         // бази: B1, после B2      //@bases
    M x, y, z;                               // членове: x, y, z        //@decl
    D2() : z("z"), B2(), y("y"), B1(), x("x")  // списъкът е разбъркан  //@init
    { L("D2()"); }                                                    //@d_body
    ~D2() { L("~D2()"); }                                             //@d_dtor
};                                                                    //@d_after

void demo_order2() {
    {                                                                 //@scope
        D2 d;                                                         //@create
    }                                                                 //@end
}
//#end
#pragma GCC diagnostic pop

/* ---------- б) RAII и развиване на стека при изключение ---------- */
//#viz ch02_raii
struct Guard {                               // RAII: ресурсът живее колкото обекта
    std::string r;
    Guard(const char* s) : r(s) { L("acquire " + r); }                //@acq
    ~Guard() { L("release " + r); }                                   //@rel
};

void work(int where) {                       // where: 0 няма, 1 вътре, 2 след блока
    Guard lock("L1");                                                  //@g1
    {
        Guard file("F1");                                              //@g2
        if (where == 1) throw 1;                                       //@thr1
        L("work F1");                                                  //@w1
    }                                        // F1 се освобождава тук    //@close
    if (where == 2) throw 2;                                           //@thr2
    L("work L1");                                                      //@w2
}                                            // L1 се освобождава тук    //@ret

void run(int where) {
    try { work(where); }                                               //@call
    catch (int e) { L("catch " + std::to_string(e)); }                 //@catch
}
//#end

/* ---------- в) копиране и преместване — правилото на петте ---------- */
static int next_id = 1;
static std::set<int*> freed;                 /* само за демонстрацията на двойно освобождаване */

//#viz ch02_five
class Buf {                                  // притежава масив в динамичната памет
    int* p; int n; int id;                   // id — номер на заделения блок за следата
public:
    explicit Buf(int k) : p(new int[k]()), n(k), id(next_id++)        //@ctor
        { L("new r" + std::to_string(id)); }
    Buf(const Buf& o) : p(new int[o.n]), n(o.n), id(next_id++) {      //@cc
        for (int i = 0; i < n; i++) p[i] = o.p[i];   // дълбоко копие
        L("copy r" + std::to_string(o.id) + "->r" + std::to_string(id));
    }
    Buf(Buf&& o) noexcept : p(o.p), n(o.n), id(o.id) {                //@mc
        o.p = nullptr; o.n = 0; o.id = 0;    // източникът остава валиден, празен
        L("move r" + std::to_string(id));
    }
    Buf& operator=(const Buf& o) {                                    //@ca
        if (this != &o) {
            int* q = new int[o.n];
            for (int i = 0; i < o.n; i++) q[i] = o.p[i];
            release();
            p = q; n = o.n; id = next_id++;
            L("copy= r" + std::to_string(o.id) + "->r" + std::to_string(id));
        }
        return *this;
    }
    Buf& operator=(Buf&& o) noexcept {                                //@ma
        if (this != &o) {
            release();
            p = o.p; n = o.n; id = o.id;
            o.p = nullptr; o.n = 0; o.id = 0;
            L("move= r" + std::to_string(id));
        }
        return *this;
    }
    ~Buf() { release(); }                                             //@dtor
private:
    void release() {
        if (p) { L("delete r" + std::to_string(id)); delete[] p; p = nullptr; }  //@free
    }
};
//#end

//#viz ch02_shallow
class Shallow {                              // НЕ дефинира копиране: компилаторът
    int* p; int id;                          // копира полетата едно по едно
public:
    explicit Shallow(int k) : p(new int[k]()), id(next_id++)          //@s_ctor
        { L("new r" + std::to_string(id)); }
    // Shallow(const Shallow&) = default;  -> копира адреса p         //@s_copy
    ~Shallow() {                                                      //@s_dtor
        if (freed.count(p)) { L("DOUBLE delete r" + std::to_string(id)); return; }  //@s_double
        freed.insert(p);
        L("delete r" + std::to_string(id));
        delete[] p;                                                   //@s_free
    }
};
//#end

#ifndef NO_MAIN
int main(void)
{
    demo_order();                         dump("order1");
    demo_order2();                        dump("order2");
    for (int w = 0; w < 3; w++) { run(w); char nm[16]; std::snprintf(nm, sizeof nm, "raii%d", w); dump(nm); }

    /* скрипт 1:  a(3); b=a; c=move(a); b=c; c=move(b) */
    next_id = 1;
    { Buf a(3); Buf b = a; Buf c = std::move(a); b = c; c = std::move(b); }
    dump("five1");
    /* скрипт 2:  a(2); b(4); a=b; b=move(a) */
    next_id = 1;
    { Buf a(2); Buf b(4); a = b; b = std::move(a); }
    dump("five2");
    /* скрипт 3:  a(3); b=move(a); c=b */
    next_id = 1;
    { Buf a(3); Buf b = std::move(a); Buf c = b; }
    dump("five3");

    /* повърхностно копие: a(3); b=a  -> двата деструктора виждат един блок */
    next_id = 1; freed.clear();
    { Shallow a(3); Shallow b = a; }
    dump("shallow1");
    next_id = 1; freed.clear();
    { Shallow a(3); Shallow b(2); Shallow c = a; }
    dump("shallow2");
    return 0;
}
#endif
