/* Тема 3, раздел 4 — полиморфизъм и виртуални методи.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 04_virtual.cpp -o 04_virtual && ./04_virtual
 *
 * Виртуалната таблица (vtable) е техника на реализация (тук: Itanium C++ ABI, g++),
 * а не изискване на езика. Същият механизъм „на ръка“ е в 04_vtable.c.
 */
#include <cstdio>
#include <cstring>
#include <string>
#include <utility>

//#viz ch04_dispatch
struct Sensor {
    virtual int read() const { return 0; }             // слот 0          //@s_read
    virtual const char* unit() const { return "?"; }   // слот 1          //@s_unit
    const char* kind() const { return "Sensor"; }      // НЕ е виртуален  //@s_kind
    virtual ~Sensor() = default;
};
struct Temp : Sensor {
    int read() const override { return 21; }           // замества слот 0  //@t_read
    const char* unit() const override { return "C"; }  // замества слот 1  //@t_unit
    const char* kind() const { return "Temp"; }        // скрива Sensor::kind //@t_kind
};
struct Press : Sensor {
    int read() const override { return 1013; }         // замества слот 0  //@p_read
    // unit() не е предефиниран -> слот 1 сочи Sensor::unit
};

std::string poll(const Sensor* const* p, int n, int m) {   // m: 0 read, 1 unit, 2 kind
    std::string out;
    for (int i = 0; i < n; i++) {                                      //@loop
        const Sensor* s = p[i];              // статичен тип: const Sensor*  //@load
        if (m == 0) out += std::to_string(s->read());   // динамично свързване //@call_read
        if (m == 1) out += s->unit();                   // динамично свързване //@call_unit
        if (m == 2) out += s->kind();        // статично: винаги Sensor::kind  //@call_kind
        out += i + 1 < n ? " " : "";
    }
    return out;                                                        //@ret
}
//#end

/* ---------- претоварване, предефиниране, скриване ---------- */
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Woverloaded-virtual"  /* g++ предупреждава именно за скриването на B::g */
//#viz ch04_names
struct B {
    virtual std::string f() const    { return "B::f()"; }              //@b_f
    std::string f(int) const         { return "B::f(int)"; }  // претоварване //@b_fi
    virtual std::string g(double) const { return "B::g(double)"; }     //@b_g
    std::string h() const            { return "B::h()"; }              //@b_h
    virtual ~B() = default;
};
struct D : B {
    std::string f() const override   { return "D::f()"; }  // предефиниране //@d_f
    std::string g(int) const         { return "D::g(int)"; } // СКРИВА B::g  //@d_g
    std::string h() const            { return "D::h()"; }    // скрива B::h  //@d_h
};
struct E : B {
    using B::f;                      // връща B::f(int) във видимите имена //@e_using
    std::string f() const override   { return "E::f()"; }                  //@e_f
};
//#end
#pragma GCC diagnostic pop

/* опит за извикване: "ERR" ако изразът не се компилира (SFINAE) */
#define TRY(NAME, CALL)                                                                        \
    template <class T> auto NAME(T& o, int) -> decltype(o.CALL, std::string()) { return o.CALL; } \
    template <class T> std::string NAME(T&, long) { return "ERR"; }
TRY(c_f0, f())
TRY(c_f1, f(1))
TRY(c_g25, g(2.5))
TRY(c_g2, g(2))
TRY(c_h, h())

template <class T> void row(const char* obj, T& o) {
    std::printf("call(%s,f()) = %s\n", obj, c_f0(o, 0).c_str());
    std::printf("call(%s,f(1)) = %s\n", obj, c_f1(o, 0).c_str());
    std::printf("call(%s,g(2.5)) = %s\n", obj, c_g25(o, 0).c_str());
    std::printf("call(%s,g(2)) = %s\n", obj, c_g2(o, 0).c_str());
    std::printf("call(%s,h()) = %s\n", obj, c_h(o, 0).c_str());
}

/* виртуално извикване в конструктор */
static std::string ctrace;
//#viz ch04_ctor
struct Base0 {
    Base0() { ctrace += std::string("Base0() calls ") + who() + "|"; }  //@bc
    virtual const char* who() const { return "Base0::who"; }           //@bw
    virtual ~Base0() { ctrace += std::string("~Base0() calls ") + who() + "|"; } //@bd
};
struct Der0 : Base0 {
    Der0() { ctrace += std::string("Der0() calls ") + who() + "|"; }    //@dc
    const char* who() const override { return "Der0::who"; }           //@dw
    ~Der0() override { ctrace += std::string("~Der0() calls ") + who() + "|"; } //@dd
};
//#end

static const Sensor* make(char c) {
    static Sensor s; static Temp t; static Press p;
    return c == 'T' ? (const Sensor*)&t : c == 'P' ? (const Sensor*)&p : &s;
}
template <class X> static const void* vptr_of(const X& x) { const void* v; std::memcpy(&v, (const void*)&x, sizeof v); return v; }

#ifndef NO_MAIN
int main(void)
{
    const char* seqs[] = {"TPS", "PPTS", "STTP", "T"};
    for (const char* q : seqs) {
        const Sensor* arr[8]; int n = (int)std::strlen(q);
        for (int i = 0; i < n; i++) arr[i] = make(q[i]);
        for (int m = 0; m < 3; m++) std::printf("poll(%s,%d) = %s\n", q, m, poll(arr, n, m).c_str());
    }
    Temp t1, t2; Press p1;
    std::printf("same_vptr = %d %d\n", vptr_of(t1) == vptr_of(t2), vptr_of(t1) == vptr_of(p1));
    std::printf("sizeof(Sensor) = %d\n", (int)sizeof(Sensor));

    B b; D d; E e; B& rbd = d; B& rbe = e;
    row("b", b); row("d", d); row("e", e); row("rbd", rbd); row("rbe", rbe);

    { Der0 x; ctrace += "use: " + std::string(x.who()) + "|"; }
    std::printf("ctor = %s\n", ctrace.c_str());
    return 0;
}
#endif
