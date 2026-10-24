/* Тема 3, раздел 5 — абстрактни класове и работещият пример от ръководството.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 05_abstract.cpp -o 05_abstract && ./05_abstract
 */
#include <cstdio>
#include <memory>
#include <string>
#include <type_traits>
#include <vector>

static std::string trace;
static void L(const std::string& s) { if (!trace.empty()) trace += "|"; trace += s; }
static std::string num(double v) { char b[32]; std::snprintf(b, sizeof b, "%g", v); return b; }

//#viz ch05_shapes
class Shape {                                // абстрактен: има чисто виртуална функция
public:
    virtual double area() const = 0;                                    //@pure
    virtual ~Shape() { L("~Shape"); }        // виртуален деструктор     //@vdtor
    std::string describe() const {           // невиртуален метод в абстрактен клас
        return "area=" + num(area());                                   //@describe
    }
};
class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double a, double b) : w(a), h(b) { L("Rectangle"); }      //@r_ctor
    double area() const override { return w * h; }                     //@r_area
    ~Rectangle() override { L("~Rectangle"); }                          //@r_dtor
};
class Triangle : public Shape {              // правоъгълен триъгълник с катети a, b
    double a, b;
public:
    Triangle(double x, double y) : a(x), b(y) { L("Triangle"); }        //@t_ctor
    double area() const override { return a * b / 2; }                  //@t_area
    ~Triangle() override { L("~Triangle"); }                            //@t_dtor
};
class Square final : public Rectangle {      // final: не може да има наследници
public:
    explicit Square(double s) : Rectangle(s, s) { L("Square"); }        //@q_ctor
    ~Square() override { L("~Square"); }                                //@q_dtor
};

double total(const std::vector<std::unique_ptr<Shape>>& v) {
    double s = 0;
    for (const auto& p : v)                                             //@loop
        s += p->area();                      // динамичен тип решава      //@call
    return s;                                                           //@ret
}
//   Shape s;   -> грешка: Shape е абстрактен                            //@noinst
//#end

/* ---------- изтриване през базов указател ---------- */
//#viz ch05_delete
struct BaseV {                               // правилно: виртуален деструктор
    virtual ~BaseV() { L("~BaseV"); }                                   //@bv
};
struct DerV : BaseV {
    std::vector<int> buf = std::vector<int>(4);   // ресурс в производната част
    ~DerV() override { L("~DerV"); }                                    //@dv
};
void ok_delete() {
    BaseV* p = new DerV;                     // статичен тип BaseV*, динамичен DerV  //@new
    delete p;                                // ~DerV, после ~BaseV                 //@del
}

class BaseP {                                // алтернативен договор: защитен,
protected:                                   // невиртуален деструктор
    ~BaseP() { L("~BaseP"); }                                           //@bp
};
struct DerP : BaseP { ~DerP() { L("~DerP"); } };                        //@dp
void protected_delete() {
    DerP d;                                  // унищожава се като DerP — наред       //@auto
    // BaseP* q = &d; delete q;  -> грешка при компилация: ~BaseP е protected        //@forbid
}

// struct BaseN { ~BaseN(); };  BaseN* q = new DerN; delete q;
//   -> НЕДЕФИНИРАНО поведение; g++ -Wall: warning [-Wdelete-non-virtual-dtor]       //@ub
//#end

/* интерпретатор на списък от фигури: "R 3 4; T 3 4; Q 2" */
static double run_script(const char* src)
{
    std::vector<std::unique_ptr<Shape>> v;
    char k; double a, b; int n;
    while (std::sscanf(src, " %c%n", &k, &n) == 1) {
        src += n;
        if (k == ';') continue;
        if (k == 'Q') { std::sscanf(src, "%lf%n", &a, &n); src += n; v.push_back(std::make_unique<Square>(a)); }
        else { std::sscanf(src, "%lf %lf%n", &a, &b, &n); src += n;
               if (k == 'R') v.push_back(std::make_unique<Rectangle>(a, b)); else v.push_back(std::make_unique<Triangle>(a, b)); }
    }
    L("total=" + num(total(v)));
    while (!v.empty()) v.pop_back();         /* разрушаване: от последния към първия */
    return 0;
}

#ifndef NO_MAIN
int main(void)
{
    {   /* примерът от ръководството */
        std::unique_ptr<Shape> p = std::make_unique<Rectangle>(3, 4);
        std::printf("manual = %s\n", num(p->area()).c_str());
        std::printf("describe = %s\n", p->describe().c_str());
    }
    trace.clear();
    const char* scripts[] = {"R 3 4", "R 3 4; T 3 4; Q 2", "Q 5; T 1 1", "T 6 2; R 0.5 4"};
    for (int i = 0; i < 4; i++) { run_script(scripts[i]); std::printf("shapes%d = %s\n", i, trace.c_str()); trace.clear(); }
    ok_delete();         std::printf("delete_virtual = %s\n", trace.c_str()); trace.clear();
    protected_delete();  std::printf("delete_protected = %s\n", trace.c_str()); trace.clear();
    std::printf("abstract = %d %d %d %d\n", (int)std::is_abstract<Shape>::value, (int)std::is_abstract<Rectangle>::value,
                (int)std::is_final<Square>::value, (int)std::has_virtual_destructor<Shape>::value);
    std::printf("polydelete_ok = %d %d\n", (int)std::has_virtual_destructor<BaseV>::value, (int)std::is_destructible<BaseP>::value);
    return 0;
}
#endif
