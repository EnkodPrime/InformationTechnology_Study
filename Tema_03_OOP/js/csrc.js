/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */
window.CSRC = {
 "ch01_layout": {
  "file": "01_model.cpp",
  "code": "struct P1 {                 // „естествен“ ред на полетата\n    char   a;\n    double b;\n    int    c;\n};\nstruct P2 {                 // същите полета, от голямо към малко\n    double b;\n    int    c;\n    char   a;\n};\nstruct P3 {                 // всяко поле е вече подравнено\n    char  a;\n    char  b;\n    short s;\n    int   i;\n};\nstruct P4 {                 // полиморфен: скрит указател vptr\n    virtual ~P4() {}\n    char a;\n    int  c;\n};\nstruct P5 {\n    bool      f;\n    long long x;\n    char      z;\n    short     w;\n};\nstruct P6 {};               // празен клас: sizeof е поне 1",
  "tags": {
   "P1": [
    1
   ],
   "P1_a": [
    2
   ],
   "P1_b": [
    3
   ],
   "P1_c": [
    4
   ],
   "P1_end": [
    5
   ],
   "P2": [
    6
   ],
   "P2_b": [
    7
   ],
   "P2_c": [
    8
   ],
   "P2_a": [
    9
   ],
   "P2_end": [
    10
   ],
   "P3": [
    11
   ],
   "P3_a": [
    12
   ],
   "P3_b": [
    13
   ],
   "P3_s": [
    14
   ],
   "P3_i": [
    15
   ],
   "P3_end": [
    16
   ],
   "P4": [
    17
   ],
   "P4_vptr": [
    17
   ],
   "P4_a": [
    19
   ],
   "P4_c": [
    20
   ],
   "P4_end": [
    21
   ],
   "P5": [
    22
   ],
   "P5_f": [
    23
   ],
   "P5_x": [
    24
   ],
   "P5_z": [
    25
   ],
   "P5_w": [
    26
   ],
   "P5_end": [
    27
   ],
   "P6": [
    28
   ],
   "P6_end": [
    28
   ]
  }
 },
 "ch01_account": {
  "file": "01_model.cpp",
  "code": "class Account {\n    long balance = 0;          // инвариант: balance >= 0\npublic:\n    bool deposit(long amount) {\n        if (amount <= 0)\n            return false;      // договорът отхвърля операцията\n        balance += amount;\n        return true;\n    }\n    bool withdraw(long amount) {\n        if (amount <= 0 || amount > balance)\n            return false;\n        balance -= amount;\n        return true;\n    }\n    long get() const { return balance; }\n};\n\nstruct OpenAccount { long balance = 0; };   // публично поле — никой не пази инварианта\n\n// клиентски код\n//   Account a, b;  Account* p = &a;\n//   a.balance = -100;      // грешка при компилация: balance е private\n//   a.get() == b.get()     // равни СТОЙНОСТИ\n//   &a == &b               // същият ОБЕКТ? (идентичност)",
  "tags": {
   "field": [
    2
   ],
   "dep": [
    4
   ],
   "dep_chk": [
    5
   ],
   "dep_rej": [
    6
   ],
   "dep_do": [
    7
   ],
   "wd": [
    10
   ],
   "wd_chk": [
    11
   ],
   "wd_rej": [
    12
   ],
   "wd_do": [
    13
   ],
   "get": [
    16
   ],
   "open": [
    19
   ],
   "decl": [
    22
   ],
   "priv": [
    23
   ],
   "eqval": [
    24
   ],
   "eqid": [
    25
   ]
  }
 },
 "ch01_access": {
  "file": "01_model.cpp",
  "code": "class Base {\npublic:    int pub  = 1;\nprotected: int prot = 2;\nprivate:   int priv = 3;\n    friend int friend_fn(const Base& b);\npublic:\n    int self() const { return pub + prot + priv; }\n};\n\nint friend_fn(const Base& b) {                                 // приятел: вижда всичко\n    return b.pub + b.prot + b.priv;\n}\n\nclass Derived : public Base {\npublic:\n    int mine() const {\n        return pub + prot;\n        // + priv  -> грешка: priv е private в Base\n    }\n};\n\nint outside(const Derived& d) {                                // външен код\n    return d.pub;\n    // d.prot  -> грешка: protected\n    // d.priv  -> грешка: private\n}\n\nstruct S { int x = 0; };   // struct: достъп по подразбиране public\nclass  K { int x = 0; };   // class:  достъп по подразбиране private",
  "tags": {
   "m_pub": [
    2
   ],
   "m_prot": [
    3
   ],
   "m_priv": [
    4
   ],
   "m_friend": [
    5
   ],
   "self_pub": [
    7
   ],
   "self_prot": [
    7
   ],
   "self_priv": [
    7
   ],
   "fr_pub": [
    11
   ],
   "fr_prot": [
    11
   ],
   "fr_priv": [
    11
   ],
   "der_pub": [
    17
   ],
   "der_prot": [
    17
   ],
   "der_priv": [
    18
   ],
   "out_pub": [
    23
   ],
   "out_prot": [
    24
   ],
   "out_priv": [
    25
   ],
   "def_struct": [
    28
   ],
   "def_class": [
    29
   ]
  }
 },
 "ch02_order": {
  "file": "02_lifecycle.cpp",
  "code": "struct M {                                   // член-обект, който съобщава за живота си\n    std::string n;\n    M(const char* s) : n(s) { L(\"M(\" + n + \")\"); }\n    ~M() { L(\"~M(\" + n + \")\"); }\n};\nstruct Base {\n    Base()  { L(\"Base()\"); }\n    ~Base() { L(\"~Base()\"); }\n};\nstruct Derived : Base {\n    M a;                                     // декларирани: a, после b\n    M b;\n    Derived() : b(\"b\"), a(\"a\")               // списъкът е b, a — НО редът е a, b\n    { L(\"Derived()\"); }                      // тялото — последно\n    ~Derived() { L(\"~Derived()\"); }          // тялото — първо\n};                                           // после ~b, ~a, ~Base\n\nvoid demo_order() {\n    {\n        Derived d;\n    }                                        // край на обхвата\n}",
  "tags": {
   "m_ctor": [
    3
   ],
   "m_dtor": [
    4
   ],
   "b_ctor": [
    7
   ],
   "b_dtor": [
    8
   ],
   "decl": [
    11
   ],
   "init": [
    13
   ],
   "d_body": [
    14
   ],
   "d_dtor": [
    15
   ],
   "d_after": [
    16
   ],
   "scope": [
    19
   ],
   "create": [
    20
   ],
   "end": [
    21
   ]
  }
 },
 "ch02_order2": {
  "file": "02_lifecycle.cpp",
  "code": "// M е същият член-клас като горе\nstruct B1 { B1() { L(\"B1()\"); }  ~B1() { L(\"~B1()\"); } };\nstruct B2 { B2() { L(\"B2()\"); }  ~B2() { L(\"~B2()\"); } };\nstruct D2 : B1, B2 {                         // бази: B1, после B2\n    M x, y, z;                               // членове: x, y, z\n    D2() : z(\"z\"), B2(), y(\"y\"), B1(), x(\"x\")  // списъкът е разбъркан\n    { L(\"D2()\"); }\n    ~D2() { L(\"~D2()\"); }\n};\n\nvoid demo_order2() {\n    {\n        D2 d;\n    }\n}",
  "tags": {
   "b1_ctor": [
    2
   ],
   "b1_dtor": [
    2
   ],
   "b2_ctor": [
    3
   ],
   "b2_dtor": [
    3
   ],
   "bases": [
    4
   ],
   "decl": [
    5
   ],
   "init": [
    6
   ],
   "d_body": [
    7
   ],
   "d_dtor": [
    8
   ],
   "d_after": [
    9
   ],
   "scope": [
    12
   ],
   "create": [
    13
   ],
   "end": [
    14
   ]
  }
 },
 "ch02_raii": {
  "file": "02_lifecycle.cpp",
  "code": "struct Guard {                               // RAII: ресурсът живее колкото обекта\n    std::string r;\n    Guard(const char* s) : r(s) { L(\"acquire \" + r); }\n    ~Guard() { L(\"release \" + r); }\n};\n\nvoid work(int where) {                       // where: 0 няма, 1 вътре, 2 след блока\n    Guard lock(\"L1\");\n    {\n        Guard file(\"F1\");\n        if (where == 1) throw 1;\n        L(\"work F1\");\n    }                                        // F1 се освобождава тук\n    if (where == 2) throw 2;\n    L(\"work L1\");\n}                                            // L1 се освобождава тук\n\nvoid run(int where) {\n    try { work(where); }\n    catch (int e) { L(\"catch \" + std::to_string(e)); }\n}",
  "tags": {
   "acq": [
    3
   ],
   "rel": [
    4
   ],
   "g1": [
    8
   ],
   "g2": [
    10
   ],
   "thr1": [
    11
   ],
   "w1": [
    12
   ],
   "close": [
    13
   ],
   "thr2": [
    14
   ],
   "w2": [
    15
   ],
   "ret": [
    16
   ],
   "call": [
    19
   ],
   "catch": [
    20
   ]
  }
 },
 "ch02_five": {
  "file": "02_lifecycle.cpp",
  "code": "class Buf {                                  // притежава масив в динамичната памет\n    int* p; int n; int id;                   // id — номер на заделения блок за следата\npublic:\n    explicit Buf(int k) : p(new int[k]()), n(k), id(next_id++)\n        { L(\"new r\" + std::to_string(id)); }\n    Buf(const Buf& o) : p(new int[o.n]), n(o.n), id(next_id++) {\n        for (int i = 0; i < n; i++) p[i] = o.p[i];   // дълбоко копие\n        L(\"copy r\" + std::to_string(o.id) + \"->r\" + std::to_string(id));\n    }\n    Buf(Buf&& o) noexcept : p(o.p), n(o.n), id(o.id) {\n        o.p = nullptr; o.n = 0; o.id = 0;    // източникът остава валиден, празен\n        L(\"move r\" + std::to_string(id));\n    }\n    Buf& operator=(const Buf& o) {\n        if (this != &o) {\n            int* q = new int[o.n];\n            for (int i = 0; i < o.n; i++) q[i] = o.p[i];\n            release();\n            p = q; n = o.n; id = next_id++;\n            L(\"copy= r\" + std::to_string(o.id) + \"->r\" + std::to_string(id));\n        }\n        return *this;\n    }\n    Buf& operator=(Buf&& o) noexcept {\n        if (this != &o) {\n            release();\n            p = o.p; n = o.n; id = o.id;\n            o.p = nullptr; o.n = 0; o.id = 0;\n            L(\"move= r\" + std::to_string(id));\n        }\n        return *this;\n    }\n    ~Buf() { release(); }\nprivate:\n    void release() {\n        if (p) { L(\"delete r\" + std::to_string(id)); delete[] p; p = nullptr; }\n    }\n};",
  "tags": {
   "ctor": [
    4
   ],
   "cc": [
    6
   ],
   "mc": [
    10
   ],
   "ca": [
    14
   ],
   "ma": [
    24
   ],
   "dtor": [
    33
   ],
   "free": [
    36
   ]
  }
 },
 "ch02_shallow": {
  "file": "02_lifecycle.cpp",
  "code": "class Shallow {                              // НЕ дефинира копиране: компилаторът\n    int* p; int id;                          // копира полетата едно по едно\npublic:\n    explicit Shallow(int k) : p(new int[k]()), id(next_id++)\n        { L(\"new r\" + std::to_string(id)); }\n    // Shallow(const Shallow&) = default;  -> копира адреса p\n    ~Shallow() {\n        if (freed.count(p)) { L(\"DOUBLE delete r\" + std::to_string(id)); return; }\n        freed.insert(p);\n        L(\"delete r\" + std::to_string(id));\n        delete[] p;\n    }\n};",
  "tags": {
   "s_ctor": [
    4
   ],
   "s_copy": [
    6
   ],
   "s_dtor": [
    7
   ],
   "s_double": [
    8
   ],
   "s_free": [
    11
   ]
  }
 },
 "ch03_layout": {
  "file": "03_inheritance.cpp",
  "code": "struct Sensor {                              // базов клас\n    int id = 7;\n    int read() const { return id; }\n};\nstruct TemperatureSensor : Sensor {          // „е вид“ Sensor\n    int celsius = 21;                        // базовият подобект е пръв\n};\nstruct Clock { long ticks = 0; };\nstruct Logger : TemperatureSensor, Clock {   // множествено наследяване (за схемата)\n    int lines = 0;\n};\n\nvoid upcast_demo(Logger& lg) {\n    TemperatureSensor* t = &lg;              // същият адрес\n    Sensor* s = &lg;                         // същият адрес\n    Clock* c = &lg;                          // адрес + отместване на Clock\n    (void)t; (void)s; (void)c;\n}",
  "tags": {
   "b_field": [
    2
   ],
   "d_field": [
    6
   ],
   "mi_field": [
    10
   ],
   "up1": [
    14
   ],
   "up2": [
    15
   ],
   "up3": [
    16
   ]
  }
 },
 "ch03_slice": {
  "file": "03_inheritance.cpp",
  "code": "struct Shape {\n    int w = 1;\n    virtual std::string name() const { return \"Shape\"; }\n    virtual ~Shape() = default;\n};\nstruct Box : Shape {\n    int depth = 5;                           // производна част\n    std::string name() const override { return \"Box\"; }\n};\n\nstd::string by_value(Shape s) { return s.name(); }    // копира САМО базовата част\nstd::string by_ref(const Shape& s) { return s.name(); }  // сочи оригинала\nstd::string by_ptr(const Shape* s) { return s->name(); } //\n\nvoid slicing_demo() {\n    Box b;\n    Shape copy = b;                          // копие на базовата част\n    std::string r1 = by_value(b);            // \"Shape\"\n    std::string r2 = by_ref(b);              // \"Box\"\n    std::string r3 = by_ptr(&b);             // \"Box\"\n    (void)copy; (void)r1; (void)r2; (void)r3;\n}",
  "tags": {
   "s_name": [
    3
   ],
   "d_part": [
    7
   ],
   "d_name": [
    8
   ],
   "byval": [
    11
   ],
   "byref": [
    12
   ],
   "byptr": [
    13
   ],
   "mk": [
    16
   ],
   "assign": [
    17
   ],
   "call_val": [
    18
   ],
   "call_ref": [
    19
   ],
   "call_ptr": [
    20
   ]
  }
 },
 "ch03_diamond": {
  "file": "03_inheritance.cpp",
  "code": "struct Device      { int serial = 0; Device() { L(\"Device()\"); } };\n// без virtual: всеки път носи СВОЙ Device\nstruct NetA  : Device { NetA()  { L(\"NetA()\"); } };\nstruct UsbA  : Device { UsbA()  { L(\"UsbA()\"); } };\nstruct ComboA : NetA, UsbA { ComboA() { L(\"ComboA()\"); } };\n// с virtual: един общ Device, изграден от най-производния клас\nstruct NetV  : virtual Device { NetV()  { L(\"NetV()\"); } };\nstruct UsbV  : virtual Device { UsbV()  { L(\"UsbV()\"); } };\nstruct ComboV : NetV, UsbV { ComboV() { L(\"ComboV()\"); } };\n//   ComboA x;  x.serial      -> грешка: двусмислено (два подобекта)\n//   ComboV y;  y.serial      -> един подобект",
  "tags": {
   "dev": [
    1
   ],
   "na": [
    3
   ],
   "ua": [
    4
   ],
   "ca": [
    5
   ],
   "nv": [
    7
   ],
   "uv": [
    8
   ],
   "cv": [
    9
   ],
   "amb": [
    10
   ],
   "one": [
    11
   ]
  }
 },
 "ch03_compose": {
  "file": "03_inheritance.cpp",
  "code": "struct ISensor { virtual int read() const = 0; virtual ~ISensor() = default; };\nstruct Temp  : ISensor { int read() const override { return 21; } };\nstruct Press : ISensor { int read() const override { return 1013; } };\nclass DataLogger {                           // „има“ датчик — не „е“ датчик\n    const ISensor& src;\n    int sum = 0, n = 0;\npublic:\n    explicit DataLogger(const ISensor& s) : src(s) {}\n    void sample() { sum += src.read(); n++; }\n    int total() const { return sum; }\n};",
  "tags": {
   "c_temp": [
    2
   ],
   "c_press": [
    3
   ],
   "c_has": [
    5
   ],
   "c_sample": [
    9
   ]
  }
 },
 "ch04_dispatch": {
  "file": "04_virtual.cpp",
  "code": "struct Sensor {\n    virtual int read() const { return 0; }             // слот 0\n    virtual const char* unit() const { return \"?\"; }   // слот 1\n    const char* kind() const { return \"Sensor\"; }      // НЕ е виртуален\n    virtual ~Sensor() = default;\n};\nstruct Temp : Sensor {\n    int read() const override { return 21; }           // замества слот 0\n    const char* unit() const override { return \"C\"; }  // замества слот 1\n    const char* kind() const { return \"Temp\"; }        // скрива Sensor::kind\n};\nstruct Press : Sensor {\n    int read() const override { return 1013; }         // замества слот 0\n    // unit() не е предефиниран -> слот 1 сочи Sensor::unit\n};\n\nstd::string poll(const Sensor* const* p, int n, int m) {   // m: 0 read, 1 unit, 2 kind\n    std::string out;\n    for (int i = 0; i < n; i++) {\n        const Sensor* s = p[i];              // статичен тип: const Sensor*\n        if (m == 0) out += std::to_string(s->read());   // динамично свързване\n        if (m == 1) out += s->unit();                   // динамично свързване\n        if (m == 2) out += s->kind();        // статично: винаги Sensor::kind\n        out += i + 1 < n ? \" \" : \"\";\n    }\n    return out;\n}",
  "tags": {
   "s_read": [
    2
   ],
   "s_unit": [
    3
   ],
   "s_kind": [
    4
   ],
   "t_read": [
    8
   ],
   "t_unit": [
    9
   ],
   "t_kind": [
    10
   ],
   "p_read": [
    13
   ],
   "loop": [
    19
   ],
   "load": [
    20
   ],
   "call_read": [
    21
   ],
   "call_unit": [
    22
   ],
   "call_kind": [
    23
   ],
   "ret": [
    26
   ]
  }
 },
 "ch04_names": {
  "file": "04_virtual.cpp",
  "code": "struct B {\n    virtual std::string f() const    { return \"B::f()\"; }\n    std::string f(int) const         { return \"B::f(int)\"; }  // претоварване\n    virtual std::string g(double) const { return \"B::g(double)\"; }\n    std::string h() const            { return \"B::h()\"; }\n    virtual ~B() = default;\n};\nstruct D : B {\n    std::string f() const override   { return \"D::f()\"; }  // предефиниране\n    std::string g(int) const         { return \"D::g(int)\"; } // СКРИВА B::g\n    std::string h() const            { return \"D::h()\"; }    // скрива B::h\n};\nstruct E : B {\n    using B::f;                      // връща B::f(int) във видимите имена\n    std::string f() const override   { return \"E::f()\"; }\n};",
  "tags": {
   "b_f": [
    2
   ],
   "b_fi": [
    3
   ],
   "b_g": [
    4
   ],
   "b_h": [
    5
   ],
   "d_f": [
    9
   ],
   "d_g": [
    10
   ],
   "d_h": [
    11
   ],
   "e_using": [
    14
   ],
   "e_f": [
    15
   ]
  }
 },
 "ch04_ctor": {
  "file": "04_virtual.cpp",
  "code": "struct Base0 {\n    Base0() { ctrace += std::string(\"Base0() calls \") + who() + \"|\"; }\n    virtual const char* who() const { return \"Base0::who\"; }\n    virtual ~Base0() { ctrace += std::string(\"~Base0() calls \") + who() + \"|\"; }\n};\nstruct Der0 : Base0 {\n    Der0() { ctrace += std::string(\"Der0() calls \") + who() + \"|\"; }\n    const char* who() const override { return \"Der0::who\"; }\n    ~Der0() override { ctrace += std::string(\"~Der0() calls \") + who() + \"|\"; }\n};",
  "tags": {
   "bc": [
    2
   ],
   "bw": [
    3
   ],
   "bd": [
    4
   ],
   "dc": [
    7
   ],
   "dw": [
    8
   ],
   "dd": [
    9
   ]
  }
 },
 "ch04_cvtable": {
  "file": "04_vtable.c",
  "code": "typedef struct Sensor Sensor;\ntypedef struct {                             /* „виртуалната таблица“          */\n    int         (*read)(const Sensor*);      /* слот 0                         */\n    const char* (*unit)(const Sensor*);      /* слот 1                         */\n} SensorVT;\nstruct Sensor { const SensorVT* vt; };       /* скритият vptr — първо поле     */\n\nstatic int         sensor_read(const Sensor* s) { (void)s; return 0; }\nstatic const char* sensor_unit(const Sensor* s) { (void)s; return \"?\"; }\nstatic int         temp_read(const Sensor* s)   { (void)s; return 21; }\nstatic const char* temp_unit(const Sensor* s)   { (void)s; return \"C\"; }\nstatic int         press_read(const Sensor* s)  { (void)s; return 1013; }\n\nstatic const SensorVT SENSOR_VT = { sensor_read, sensor_unit };\nstatic const SensorVT TEMP_VT   = { temp_read,   temp_unit   };\nstatic const SensorVT PRESS_VT  = { press_read,  sensor_unit };  /* наследен слот 1 */\n\ntypedef struct { Sensor base; } Temp;        /* „наследяване“: базата е първа  */\ntypedef struct { Sensor base; } Press;\n\nstatic void temp_init(Temp* t)   { t->base.vt = &TEMP_VT;  }   /* „конструктор“ */\nstatic void press_init(Press* p) { p->base.vt = &PRESS_VT; }\n\n/* „виртуално извикване“: s->vt->read(s)  ==  s->read() в C++ */\nstatic int poll_read(const Sensor* const* p, int n, char* out, size_t cap)\n{\n    size_t len = 0; int sum = 0;\n    for (int i = 0; i < n; i++) {\n        const Sensor* s = p[i];\n        int v = s->vt->read(s);              /* 1) vptr  2) слот  3) скок    */\n        sum += v;\n        len += (size_t)snprintf(out + len, cap - len, i + 1 < n ? \"%d \" : \"%d\", v);\n    }\n    return sum;\n}",
  "tags": {
   "vptr": [
    6
   ],
   "vt_s": [
    14
   ],
   "vt_t": [
    15
   ],
   "vt_p": [
    16
   ],
   "ctor": [
    21
   ],
   "loop": [
    28
   ],
   "load": [
    29
   ],
   "call": [
    30
   ],
   "ret": [
    34
   ]
  }
 },
 "ch05_shapes": {
  "file": "05_abstract.cpp",
  "code": "class Shape {                                // абстрактен: има чисто виртуална функция\npublic:\n    virtual double area() const = 0;\n    virtual ~Shape() { L(\"~Shape\"); }        // виртуален деструктор\n    std::string describe() const {           // невиртуален метод в абстрактен клас\n        return \"area=\" + num(area());\n    }\n};\nclass Rectangle : public Shape {\n    double w, h;\npublic:\n    Rectangle(double a, double b) : w(a), h(b) { L(\"Rectangle\"); }\n    double area() const override { return w * h; }\n    ~Rectangle() override { L(\"~Rectangle\"); }\n};\nclass Triangle : public Shape {              // правоъгълен триъгълник с катети a, b\n    double a, b;\npublic:\n    Triangle(double x, double y) : a(x), b(y) { L(\"Triangle\"); }\n    double area() const override { return a * b / 2; }\n    ~Triangle() override { L(\"~Triangle\"); }\n};\nclass Square final : public Rectangle {      // final: не може да има наследници\npublic:\n    explicit Square(double s) : Rectangle(s, s) { L(\"Square\"); }\n    ~Square() override { L(\"~Square\"); }\n};\n\ndouble total(const std::vector<std::unique_ptr<Shape>>& v) {\n    double s = 0;\n    for (const auto& p : v)\n        s += p->area();                      // динамичен тип решава\n    return s;\n}\n//   Shape s;   -> грешка: Shape е абстрактен",
  "tags": {
   "pure": [
    3
   ],
   "vdtor": [
    4
   ],
   "describe": [
    6
   ],
   "r_ctor": [
    12
   ],
   "r_area": [
    13
   ],
   "r_dtor": [
    14
   ],
   "t_ctor": [
    19
   ],
   "t_area": [
    20
   ],
   "t_dtor": [
    21
   ],
   "q_ctor": [
    25
   ],
   "q_dtor": [
    26
   ],
   "loop": [
    31
   ],
   "call": [
    32
   ],
   "ret": [
    33
   ],
   "noinst": [
    35
   ]
  }
 },
 "ch05_delete": {
  "file": "05_abstract.cpp",
  "code": "struct BaseV {                               // правилно: виртуален деструктор\n    virtual ~BaseV() { L(\"~BaseV\"); }\n};\nstruct DerV : BaseV {\n    std::vector<int> buf = std::vector<int>(4);   // ресурс в производната част\n    ~DerV() override { L(\"~DerV\"); }\n};\nvoid ok_delete() {\n    BaseV* p = new DerV;                     // статичен тип BaseV*, динамичен DerV\n    delete p;                                // ~DerV, после ~BaseV\n}\n\nclass BaseP {                                // алтернативен договор: защитен,\nprotected:                                   // невиртуален деструктор\n    ~BaseP() { L(\"~BaseP\"); }\n};\nstruct DerP : BaseP { ~DerP() { L(\"~DerP\"); } };\nvoid protected_delete() {\n    DerP d;                                  // унищожава се като DerP — наред\n    // BaseP* q = &d; delete q;  -> грешка при компилация: ~BaseP е protected\n}\n\n// struct BaseN { ~BaseN(); };  BaseN* q = new DerN; delete q;\n//   -> НЕДЕФИНИРАНО поведение; g++ -Wall НЕ предупреждава: -Wdelete-non-virtual-dtor\n//      се включва само ако класът има други виртуални функции (BaseN няма)",
  "tags": {
   "bv": [
    2
   ],
   "dv": [
    6
   ],
   "new": [
    9
   ],
   "del": [
    10
   ],
   "bp": [
    15
   ],
   "dp": [
    17
   ],
   "auto": [
    19
   ],
   "forbid": [
    20
   ],
   "ub": [
    24
   ]
  }
 },
 "ch06_complex": {
  "file": "06_operators.cpp",
  "code": "struct Complex {\n    double re, im;\n    Complex& operator+=(const Complex& b) {  // член: променя ЛЕВИЯ операнд\n        re += b.re; im += b.im; L(\"+=\");\n        return *this;\n    }\n};\nstd::ostream& operator<<(std::ostream& os, const Complex& z);\n\nComplex operator+(const Complex& a, const Complex& b) {    // свободна, симетрична\n    L(\"+\");\n    return {a.re + b.re, a.im + b.im};\n}\nComplex operator-(const Complex& a, const Complex& b) {\n    L(\"-\");\n    return {a.re - b.re, a.im - b.im};\n}\nComplex operator*(const Complex& a, const Complex& b) {   // (a+bi)(c+di)\n    L(\"*\");\n    return {a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re};\n}\nbool operator==(const Complex& a, const Complex& b) {\n    return a.re == b.re && a.im == b.im;\n}\nstd::ostream& operator<<(std::ostream& os, const Complex& z) {  // връща потока\n    os << z.re << (z.im < 0 ? \"-\" : \"+\") << (z.im < 0 ? -z.im : z.im) << \"i\";\n    return os;                               // за верижно os << a << b\n}",
  "tags": {
   "pluseq": [
    3
   ],
   "plus": [
    10
   ],
   "plus_ret": [
    12
   ],
   "minus": [
    14
   ],
   "mul": [
    18
   ],
   "mul_ret": [
    20
   ],
   "eq": [
    22
   ],
   "out": [
    25
   ],
   "out_ret": [
    27
   ]
  }
 },
 "ch07_larger": {
  "file": "07_templates.cpp",
  "code": "template <class T>\nT larger(T a, T b) {                         // изискване: T има <  и се копира\n    seen(__PRETTY_FUNCTION__);\n    return a < b ? b : a;\n}\ntemplate <>                                  // пълна (явна) специализация\nconst char* larger<const char*>(const char* a, const char* b) {\n    seen(__PRETTY_FUNCTION__);\n    return std::strcmp(a, b) < 0 ? b : a;    // сравнява текста, не адресите\n}\n//   larger(3, 2.5)          -> грешка: T е int или double? (противоречиво извеждане)\n//   larger<double>(3, 2.5)  -> явно T = double, 3 се преобразува",
  "tags": {
   "tpl": [
    2
   ],
   "inst": [
    3
   ],
   "cmp": [
    4
   ],
   "spec": [
    7
   ],
   "spec_cmp": [
    9
   ],
   "conflict": [
    11
   ],
   "explicit": [
    12
   ]
  }
 },
 "ch07_stack": {
  "file": "07_templates.cpp",
  "code": "template <class T, int N>                    // параметър-тип и параметър-стойност\nclass Stack {\n    T data[N];\n    int top = 0;\npublic:\n    bool push(const T& v) { if (top == N) return false; data[top++] = v; return true; }\n    bool pop(T& out) { if (top == 0) return false; out = data[--top]; return true; }\n    int size() const { return top; }\n};\n// Stack<char,4>, Stack<int,4>, Stack<double,4> — три РАЗЛИЧНИ класа",
  "tags": {
   "data": [
    3
   ],
   "top": [
    4
   ],
   "push": [
    6
   ],
   "pop": [
    7
   ],
   "three": [
    10
   ]
  }
 },
 "ch08_storage": {
  "file": "08_storage.cpp",
  "code": "T g(\"global\");                               // статично: преди main, след main\n\nvoid f(int k) {\n    T a(\"auto\");                             // автоматично: до края на блока\n    static T s(\"static\");                    // статично локално: при ПЪРВО минаване\n    thread_local T t(\"thread\");              // нишково: живее колкото нишката\n    if (k == 2) {\n        auto p = std::make_unique<T>(\"heap\"); // динамично, но с RAII притежател\n    }                                        // unique_ptr освобождава тук\n    L(\"f\" + std::to_string(k));\n}                                            // ~auto\n\nint main_body() {\n    L(\"main\");\n    f(1);\n    f(2);\n    T* raw = new T(\"raw\");                   // динамично, суров указател\n    delete raw;                              // животът свършва при delete\n    L(\"end main\");\n    return 0;\n}   // след main: ~static, ~thread (на нишката main), ~global — в обратен ред на създаване",
  "tags": {
   "global": [
    1
   ],
   "auto": [
    4
   ],
   "static": [
    5
   ],
   "thread": [
    6
   ],
   "heap": [
    8
   ],
   "heap_end": [
    9
   ],
   "body": [
    10
   ],
   "f_end": [
    11
   ],
   "main": [
    14
   ],
   "call1": [
    15
   ],
   "call2": [
    16
   ],
   "raw": [
    17
   ],
   "raw_del": [
    18
   ],
   "main_end": [
    19
   ]
  }
 }
};
