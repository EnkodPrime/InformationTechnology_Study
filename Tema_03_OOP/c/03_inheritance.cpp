/* Тема 3, раздел 3 — наследяване и композиция.
 * Компилиране:  g++ -std=c++17 -Wall -Wextra -Werror -O2 03_inheritance.cpp -o 03_inheritance && ./03_inheritance
 *
 * Отместванията и размерите са за x86-64 (Itanium C++ ABI) и не са езиков договор.
 * Матрицата на достъпа НЕ е въведена ръчно: изчислява я компилаторът чрез SFINAE
 * (проверката на достъп е част от заместването на шаблонни аргументи от C++11).
 */
#include <cstdio>
#include <cstdint>
#include <string>
#include <type_traits>
#include <utility>

#define OFF(obj, m) ((int)((const char*)&(obj).m - (const char*)&(obj)))
static int diff(const void* a, const void* b) { return (int)((const char*)a - (const char*)b); }

//#viz ch03_layout
struct Sensor {                              // базов клас
    int id = 7;                                                        //@b_field
    int read() const { return id; }
};
struct TemperatureSensor : Sensor {          // „е вид“ Sensor
    int celsius = 21;                        // базовият подобект е пръв   //@d_field
};
struct Clock { long ticks = 0; };
struct Logger : TemperatureSensor, Clock {   // множествено наследяване (за схемата)
    int lines = 0;                                                     //@mi_field
};

void upcast_demo(Logger& lg) {
    TemperatureSensor* t = &lg;              // същият адрес                //@up1
    Sensor* s = &lg;                         // същият адрес                //@up2
    Clock* c = &lg;                          // адрес + отместване на Clock //@up3
    (void)t; (void)s; (void)c;
}
//#end

/* ---------- отрязване (object slicing) ---------- */
//#viz ch03_slice
struct Shape {
    int w = 1;
    virtual std::string name() const { return "Shape"; }               //@s_name
    virtual ~Shape() = default;
};
struct Box : Shape {
    int depth = 5;                           // производна част            //@d_part
    std::string name() const override { return "Box"; }               //@d_name
};

std::string by_value(Shape s) { return s.name(); }    // копира САМО базовата част  //@byval
std::string by_ref(const Shape& s) { return s.name(); }  // сочи оригинала          //@byref
std::string by_ptr(const Shape* s) { return s->name(); } //                        //@byptr

void slicing_demo() {
    Box b;                                                             //@mk
    Shape copy = b;                          // копие на базовата част     //@assign
    std::string r1 = by_value(b);            // "Shape"                   //@call_val
    std::string r2 = by_ref(b);              // "Box"                     //@call_ref
    std::string r3 = by_ptr(&b);             // "Box"                     //@call_ptr
    (void)copy; (void)r1; (void)r2; (void)r3;
}
//#end

/* ---------- диамант: обикновено и виртуално наследяване ---------- */
static std::string trace;
static void L(const char* s) { if (!trace.empty()) trace += "|"; trace += s; }

//#viz ch03_diamond
struct Device      { int serial = 0; Device() { L("Device()"); } };     //@dev
// без virtual: всеки път носи СВОЙ Device
struct NetA  : Device { NetA()  { L("NetA()"); } };                     //@na
struct UsbA  : Device { UsbA()  { L("UsbA()"); } };                     //@ua
struct ComboA : NetA, UsbA { ComboA() { L("ComboA()"); } };             //@ca
// с virtual: един общ Device, изграден от най-производния клас
struct NetV  : virtual Device { NetV()  { L("NetV()"); } };             //@nv
struct UsbV  : virtual Device { UsbV()  { L("UsbV()"); } };             //@uv
struct ComboV : NetV, UsbV { ComboV() { L("ComboV()"); } };             //@cv
//   ComboA x;  x.serial      -> грешка: двусмислено (два подобекта)     //@amb
//   ComboV y;  y.serial      -> един подобект                          //@one
//#end

/* ---------- композиция: Logger ИМА Sensor ---------- */
//#viz ch03_compose
struct ISensor { virtual int read() const = 0; virtual ~ISensor() = default; };
struct Temp  : ISensor { int read() const override { return 21; } };   //@c_temp
struct Press : ISensor { int read() const override { return 1013; } }; //@c_press
class DataLogger {                           // „има“ датчик — не „е“ датчик
    const ISensor& src;                                                //@c_has
    int sum = 0, n = 0;
public:
    explicit DataLogger(const ISensor& s) : src(s) {}
    void sample() { sum += src.read(); n++; }                          //@c_sample
    int total() const { return sum; }
};
//#end

/* ---------- достъп при различните видове наследяване ---------- */
struct AB { public: int pub = 1; protected: int prot = 2; private: int priv = 3; friend struct Probe; };
/* SELF_PROBE: проверки, изпълнени в контекста на САМИЯ производен клас */
#define SELF_PROBE(Me)                                                                                   \
    template <class X = Me, class = void> struct q1 : std::false_type {};                               \
    template <class X> struct q1<X, std::void_t<decltype(std::declval<X&>().pub)>> : std::true_type {};  \
    template <class X = Me, class = void> struct q2 : std::false_type {};                               \
    template <class X> struct q2<X, std::void_t<decltype(std::declval<X&>().prot)>> : std::true_type {}; \
    template <class X = Me, class = void> struct q3 : std::false_type {};                               \
    template <class X> struct q3<X, std::void_t<decltype(std::declval<X&>().priv)>> : std::true_type {}; \
    static int self_pub() { return q1<>::value; }                                                       \
    static int self_prot() { return q2<>::value; }                                                      \
    static int self_priv() { return q3<>::value; }
struct DPub  : public    AB { SELF_PROBE(DPub) };
struct DProt : protected AB { SELF_PROBE(DProt) };
struct DPriv : private   AB { SELF_PROBE(DPriv) };

/* дали изразът d.member е допустим ОТВЪН (SFINAE) */
template <class T, class = void> struct has_pub  : std::false_type {};
template <class T> struct has_pub<T, std::void_t<decltype(std::declval<T&>().pub)>>  : std::true_type {};
template <class T, class = void> struct has_prot : std::false_type {};
template <class T> struct has_prot<T, std::void_t<decltype(std::declval<T&>().prot)>> : std::true_type {};
template <class T, class = void> struct has_priv : std::false_type {};
template <class T> struct has_priv<T, std::void_t<decltype(std::declval<T&>().priv)>> : std::true_type {};

/* дали изразът е допустим ОТ ВЪТРЕ в наследника (член-шаблон) */
template <class Base> struct Inside : Base {
    template <class X = Inside, class = void> struct p1 : std::false_type {};
    template <class X> struct p1<X, std::void_t<decltype(std::declval<X&>().pub)>> : std::true_type {};
    template <class X = Inside, class = void> struct p2 : std::false_type {};
    template <class X> struct p2<X, std::void_t<decltype(std::declval<X&>().prot)>> : std::true_type {};
    static int pub_ok()  { return p1<>::value; }
    static int prot_ok() { return p2<>::value; }
};

#ifndef NO_MAIN
int main(void)
{
    Logger lg;
    std::printf("sizeof(Sensor) = %d\n", (int)sizeof(Sensor));
    std::printf("sizeof(TemperatureSensor) = %d\n", (int)sizeof(TemperatureSensor));
    std::printf("off(TemperatureSensor) = %d %d\n", OFF(lg, id), OFF(lg, celsius));
    std::printf("sizeof(Logger) = %d\n", (int)sizeof(Logger));
    std::printf("off(Logger) = %d %d %d %d\n", OFF(lg, id), OFF(lg, celsius), OFF(lg, ticks), OFF(lg, lines));
    TemperatureSensor* t = &lg; Sensor* s = &lg; Clock* c = &lg;
    std::printf("upcast = %d %d %d\n", diff(t, &lg), diff(s, &lg), diff(c, &lg));
    upcast_demo(lg);

    Box b;
    Shape copy = b;
    std::printf("slice = %s %s %s %s\n", copy.name().c_str(), by_value(b).c_str(), by_ref(b).c_str(), by_ptr(&b).c_str());
    std::printf("sizeof(Shape,Box) = %d %d\n", (int)sizeof(Shape), (int)sizeof(Box));
    slicing_demo();

    { ComboA x; (void)x; } std::printf("diamondA = %s\n", trace.c_str()); trace.clear();
    { ComboV y; (void)y; } std::printf("diamondV = %s\n", trace.c_str()); trace.clear();
    { ComboA x; ComboV y;
      std::printf("devices = %d %d\n", diff(static_cast<Device*>(static_cast<NetA*>(&x)), static_cast<Device*>(static_cast<UsbA*>(&x))) != 0 ? 2 : 1,
                  diff(static_cast<Device*>(static_cast<NetV*>(&y)), static_cast<Device*>(static_cast<UsbV*>(&y))) != 0 ? 2 : 1); }

    Temp tp; Press pr;
    DataLogger d1(tp); d1.sample(); d1.sample();
    DataLogger d2(pr); d2.sample();
    std::printf("compose = %d %d\n", d1.total(), d2.total());

    std::printf("outside(public) = %d %d %d\n", (int)has_pub<DPub>::value, (int)has_prot<DPub>::value, (int)has_priv<DPub>::value);
    std::printf("outside(protected) = %d %d %d\n", (int)has_pub<DProt>::value, (int)has_prot<DProt>::value, (int)has_priv<DProt>::value);
    std::printf("outside(private) = %d %d %d\n", (int)has_pub<DPriv>::value, (int)has_prot<DPriv>::value, (int)has_priv<DPriv>::value);
    std::printf("self(public) = %d %d %d\n", DPub::self_pub(), DPub::self_prot(), DPub::self_priv());
    std::printf("self(protected) = %d %d %d\n", DProt::self_pub(), DProt::self_prot(), DProt::self_priv());
    std::printf("self(private) = %d %d %d\n", DPriv::self_pub(), DPriv::self_prot(), DPriv::self_priv());
    std::printf("inside(public) = %d %d\n", Inside<DPub>::pub_ok(), Inside<DPub>::prot_ok());
    std::printf("inside(protected) = %d %d\n", Inside<DProt>::pub_ok(), Inside<DProt>::prot_ok());
    std::printf("inside(private) = %d %d\n", Inside<DPriv>::pub_ok(), Inside<DPriv>::prot_ok());
    std::printf("upcast_ok = %d %d %d\n", (int)std::is_convertible<DPub*, AB*>::value, (int)std::is_convertible<DProt*, AB*>::value, (int)std::is_convertible<DPriv*, AB*>::value);
    return 0;
}
#endif
