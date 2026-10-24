/* Тема 3, раздел 1 — обектният модел: клас и обект, разположение в паметта,
 * капсулиране, инвариант, равенство и идентичност.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 01_model.cpp -o 01_model && ./01_model
 *
 * Разположението (sizeof, отместванията) зависи от ABI-то; стойностите в коментарите
 * са за x86-64 (System V / Itanium C++ ABI) — не са езиков договор.
 */
#include <cstdio>

//#viz ch01_layout
struct P1 {                 // „естествен“ ред на полетата       //@P1
    char   a;                                                    //@P1_a
    double b;                                                    //@P1_b
    int    c;                                                    //@P1_c
};                                                               //@P1_end
struct P2 {                 // същите полета, от голямо към малко //@P2
    double b;                                                    //@P2_b
    int    c;                                                    //@P2_c
    char   a;                                                    //@P2_a
};                                                               //@P2_end
struct P3 {                 // всяко поле е вече подравнено       //@P3
    char  a;                                                     //@P3_a
    char  b;                                                     //@P3_b
    short s;                                                     //@P3_s
    int   i;                                                     //@P3_i
};                                                               //@P3_end
struct P4 {                 // полиморфен: скрит указател vptr    //@P4 @P4_vptr
    virtual ~P4() {}
    char a;                                                      //@P4_a
    int  c;                                                      //@P4_c
};                                                               //@P4_end
struct P5 {                                                      //@P5
    bool      f;                                                 //@P5_f
    long long x;                                                 //@P5_x
    char      z;                                                 //@P5_z
    short     w;                                                 //@P5_w
};                                                               //@P5_end
struct P6 {};               // празен клас: sizeof е поне 1       //@P6 @P6_end
//#end

#define OFF(obj, m) ((int)((const char*)&(obj).m - (const char*)&(obj)))

//#viz ch01_account
class Account {
    long balance = 0;          // инвариант: balance >= 0                  //@field
public:
    bool deposit(long amount) {                                            //@dep
        if (amount <= 0)                                                   //@dep_chk
            return false;      // договорът отхвърля операцията            //@dep_rej
        balance += amount;                                                 //@dep_do
        return true;
    }
    bool withdraw(long amount) {                                           //@wd
        if (amount <= 0 || amount > balance)                               //@wd_chk
            return false;                                                  //@wd_rej
        balance -= amount;                                                 //@wd_do
        return true;
    }
    long get() const { return balance; }                                   //@get
};

struct OpenAccount { long balance = 0; };   // публично поле — никой не пази инварианта  //@open

// клиентски код
//   Account a, b;  Account* p = &a;                                        //@decl
//   a.balance = -100;      // грешка при компилация: balance е private     //@priv
//   a.get() == b.get()     // равни СТОЙНОСТИ                              //@eqval
//   &a == &b               // същият ОБЕКТ? (идентичност)                  //@eqid
//#end

//#viz ch01_access
class Base {
public:    int pub  = 1;                                       //@m_pub
protected: int prot = 2;                                       //@m_prot
private:   int priv = 3;                                       //@m_priv
    friend int friend_fn(const Base& b);                       //@m_friend
public:
    int self() const { return pub + prot + priv; }             //@self_pub @self_prot @self_priv
};

int friend_fn(const Base& b) {                                 // приятел: вижда всичко
    return b.pub + b.prot + b.priv;                            //@fr_pub @fr_prot @fr_priv
}

class Derived : public Base {
public:
    int mine() const {
        return pub + prot;                                     //@der_pub @der_prot
        // + priv  -> грешка: priv е private в Base            //@der_priv
    }
};

int outside(const Derived& d) {                                // външен код
    return d.pub;                                              //@out_pub
    // d.prot  -> грешка: protected                            //@out_prot
    // d.priv  -> грешка: private                              //@out_priv
}

struct S { int x = 0; };   // struct: достъп по подразбиране public  //@def_struct
class  K { int x = 0; };   // class:  достъп по подразбиране private //@def_class
//#end

static int run_account(int which, long* fa, long* fb, int* rej, int* eqv, int* same)
{
    Account a, b;
    Account* p = &a;
    int r = 0;
    if (which == 0) {        /* a.deposit(100); b.deposit(100); a==b; &a==&b; p->withdraw(30); a.withdraw(500); b.deposit(-5) */
        r += !a.deposit(100); r += !b.deposit(100);
        *eqv = a.get() == b.get(); *same = &a == &b;
        r += !p->withdraw(30); r += !a.withdraw(500); r += !b.deposit(-5);
    } else {                 /* a.deposit(50); p=&b; p->deposit(20); p->withdraw(20); a==b; p==&b */
        r += !a.deposit(50); p = &b; r += !p->deposit(20); r += !p->withdraw(20);
        *eqv = a.get() == b.get(); *same = p == &b;
    }
    *fa = a.get(); *fb = b.get(); *rej = r;
    return 0;
}

#ifndef NO_MAIN
int main(void)
{
    P1 p1{}; P2 p2{}; P3 p3{}; P4 p4; P5 p5{}; P6 p6{};
    (void)p6;
    std::printf("sizeof(P1) = %d\n", (int)sizeof(P1));
    std::printf("off(P1) = %d %d %d\n", OFF(p1, a), OFF(p1, b), OFF(p1, c));
    std::printf("sizeof(P2) = %d\n", (int)sizeof(P2));
    std::printf("off(P2) = %d %d %d\n", OFF(p2, b), OFF(p2, c), OFF(p2, a));
    std::printf("sizeof(P3) = %d\n", (int)sizeof(P3));
    std::printf("off(P3) = %d %d %d %d\n", OFF(p3, a), OFF(p3, b), OFF(p3, s), OFF(p3, i));
    std::printf("sizeof(P4) = %d\n", (int)sizeof(P4));
    std::printf("off(P4) = %d %d\n", OFF(p4, a), OFF(p4, c));
    std::printf("sizeof(P5) = %d\n", (int)sizeof(P5));
    std::printf("off(P5) = %d %d %d %d\n", OFF(p5, f), OFF(p5, x), OFF(p5, z), OFF(p5, w));
    std::printf("sizeof(P6) = %d\n", (int)sizeof(P6));

    for (int w = 0; w < 2; w++) {
        long fa, fb; int rej, eqv, same;
        run_account(w, &fa, &fb, &rej, &eqv, &same);
        std::printf("acc%d = a=%ld b=%ld rej=%d eqval=%d same=%d\n", w, fa, fb, rej, eqv, same);
    }
    OpenAccount o; o.balance = -100;     /* компилира се — инвариантът е нарушен */
    std::printf("open.balance = %ld\n", o.balance);

    Base bb; Derived dd; S s; K k; (void)k;
    std::printf("access = %d %d %d %d\n", bb.self(), friend_fn(bb), dd.mine(), outside(dd) + s.x);
    return 0;
}
#endif
