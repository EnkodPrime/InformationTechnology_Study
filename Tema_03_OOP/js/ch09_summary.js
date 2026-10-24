/* Раздел 9 — Систематизация, изяснени въпроси и опорен план за устния изпит. */
(function () {
  const S = window.Study, h = S.h;

  const MECH = [
    { m: "Претоварване", g: "претоварване", when: "при компилация", by: "типовете на аргументите", ex: "f(int) / f(double)", sec: "virtualni" },
    { m: "Предефиниране (overriding)", g: "предефиниране на метод", when: "при изпълнение", by: "динамичния тип на обекта", ex: "Rectangle::area() override", sec: "virtualni" },
    { m: "Скриване на име", g: "скриване на име", when: "при компилация (търсене на името)", by: "статичния тип; първият клас с това име", ex: "D::g(int) скрива B::g(double)", sec: "virtualni" },
    { m: "Претоварване на оператор", g: "претоварване на оператор", when: "при компилация", by: "типовете на операндите", ex: "Complex operator+", sec: "operacii" },
    { m: "Шаблон", g: "шаблон", when: "при компилация (инстанциране)", by: "параметрите на шаблона", ex: "larger<int>, larger<double>", sec: "shabloni" },
    { m: "Виртуално наследяване", g: "виртуално наследяване", when: "разположение на обекта", by: "йерархията", ex: "един споделен Device при диамант", sec: "nasledyavane" },
  ];

  const REL = [
    ["Наследяване (public)", "„е вид“", "производният се използва чрез интерфейса на базовия", "TemperatureSensor : Sensor"],
    ["Композиция", "„има“", "цялото съдържа или използва частта", "DataLogger държи const ISensor&"],
    ["Шаблон", "„параметризиран по“", "семейство специализации", "Stack<T, N>"],
  ];

  const FAQ = [
    { q: "Private означава ли, че данните не могат да бъдат видени отвън?", a: "Не. Private е правило за допустим достъп в езика. То не обещава шифроване, процесна изолация или защита срещу четене на памет чрез други средства." },
    { q: "Всяка функция с еднакво име в наследник предефиниране ли е?", a: "Не. Възможни са ново претоварване и скриване на име. За виртуално предефиниране трябва да са изпълнени езиковите условия; <code>override</code> проверява именно това намерение." },
    { q: "Шаблонът вид наследяване ли е?", a: "Не. Шаблонът генерира семейство специализации според параметри; наследяването задава отношение между класове. Могат да участват в една конструкция, но не определят едно и също отношение." },
    { q: "Обектът винаги ли е в динамичната памет?", a: "Не. В C++ има обекти с автоматично, статично, нишково и динамично време на съхранение. Обектността не определя сама къде и колко дълго съществува паметта. (<a href=\"#dopalnenie\">стъпково в раздел 8</a>)" },
  ];

  const PLAN = [
    { t: "Обектният модел", sec: "model", say: ["Определям клас и обект.", "Различавам абстракция, капсулиране и скриване.", "Давам инвариант."], ex: "Account: private balance, публични deposit/withdraw пазят balance ≥ 0; a и b с равни балансове не са един обект." },
    { t: "Създаване, живот и унищожаване на обекти", sec: "zhivot", say: ["Обяснявам конструктор, деструктор, RAII.", "Разграничавам копиране и преместване."], ex: "Ред: бази → членове (по декларация) → тяло; обратно при разрушаване. std::lock_guard; unique_ptr се мести, не се копира." },
    { t: "Наследяване и композиция", sec: "nasledyavane", say: ["Давам примери „е вид“ и „има“.", "Обяснявам заместването и проблема при диамант."], ex: "TemperatureSensor е Sensor; DataLogger има ISensor. Диамант без virtual — два Device; с virtual — един." },
    { t: "Полиморфизъм и виртуални методи", sec: "virtualni", say: ["Различавам претоварване, предефиниране и скриване.", "Обяснявам override и отрязване на обект."], ex: "D::g(int) скрива B::g(double); by_value(Box) вика Shape::name." },
    { t: "Абстрактни класове и работещ пример", sec: "abstraktni", say: ["Проследявам типа на p и реалния тип на обекта.", "Обяснявам защо резултатът е 12 и защо деструкторът е виртуален."], ex: "p: unique_ptr<Shape>, обект Rectangle(3, 4) → area() = 12; delete през Shape* → ~Rectangle, ~Shape." },
    { t: "Предефиниране на операции", sec: "operacii", say: ["Давам сбор на комплексни числа.", "Посочвам какво претоварването не може да променя."], ex: "(2+3i)+(4+i) = 6+4i. Не се променят приоритет, асоциативност, арност; няма нови знаци." },
    { t: "Шаблони и статичен полиморфизъм", sec: "shabloni", say: ["Обяснявам инстанциране.", "Сравнявам шаблони с виртуални методи.", "Посочвам изискването за операция <."], ex: "larger(3, 7) → T = int; larger(2.5, 1.0) → T = double; изборът е при компилация." },
    { t: "Допълнение и типични грешки", sec: "dopalnenie", say: ["Завършвам с четирите разграничения и връзката между интерфейс и договор."], ex: "Клас/обект; достъп/притежание; претоварване/предефиниране; наследяване/композиция." },
  ];

  const REAL = [
    "Реални езици: C++ използва virtual и предефиниране в производен клас; Java има интерфейси и динамично извикване на подходящите методи; C# има interface и virtual/override.",
    "Реални C++ реализации на RAII: std::unique_ptr притежава обект, std::lock_guard управлява заключване на мютекс, а std::fstream управлява файлов поток.",
  ];

  const SOURCES = [
    ["Конспект за кандидат-докторантски изпит „Информатика“, ШУ, 21.01.2025", null],
    ["C++ Core Guidelines — обекти, ресурси и виртуални интерфейси", "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines"],
    ["Bjarne Stroustrup, A History of C++: 1979–1991 — произход на C++ и влиянието на Simula", "https://www.stroustrup.com/hopl2.pdf"],
    ["Standard C++ FAQ — Virtual Functions", "https://isocpp.org/wiki/faq/virtual-functions"],
    ["GCC libstdc++ manual", "https://gcc.gnu.org/onlinedocs/libstdc++/manual/"],
    ["Азълов, П. Обектно ориентирано програмиране. Структури от данни и STL. 2008.", null],
    ["Богданов, Д. Обектно ориентирано програмиране със С++. 1994.", null],
  ];

  const html = `
<div class="block">
  <h3>a) Механизми с едно и също име — кога и по какво се избира</h3>
  <div class="tbl-wrap"><table class="t" id="mech"></table></div>
  <div class="key">Компилация: претоварване, скриване, оператори, шаблони. Изпълнение: само предефинирането на виртуален метод.</div>
</div>

<div class="block">
  <h3>b) Отношения между типовете</h3>
  <div class="tbl-wrap"><table class="t" id="rel"></table></div>
</div>

<div class="block">
  <h3>c) Изяснени въпроси</h3>
  <div id="faq" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>d) Опорен план за устния изпит</h3>
  <p class="prose">При обяснение назовавам входа и резултата, проследявам стрелките или промените стъпка по стъпка и посочвам условието, при което примерът е валиден.</p>
  <div id="plan" style="display:grid;gap:10px"></div>
  <div class="card"><h4>Реални примери за устното изложение</h4><ul class="prose" id="real" style="padding-left:1.2em"></ul></div>
  <div class="key"><b>Визуална опора: един интерфейс и различни реализации.</b> Извикването през базов интерфейс достига метода на конкретния динамичен тип. Това е полиморфизъм. <a href="#virtualni">→ vtable стъпка по стъпка</a></div>
</div>

<div class="block">
  <h3>e) Източници</h3>
  <ol class="prose" id="src" style="padding-left:1.3em"></ol>
</div>`;

  function mount(root) {
    const m = root.querySelector("#mech");
    m.append(h("tr", null, ...["Механизъм", "Кога се решава", "По какво", "Пример", "Раздел"].map((x) => h("th", { text: x }))));
    MECH.forEach((M) => m.append(h("tr", null, h("td", null, h("dfn", { "data-g": M.g, text: M.m })), h("td", { text: M.when }), h("td", { text: M.by }), h("td", { class: "mono", text: M.ex }), h("td", null, h("a", { href: "#" + M.sec, text: "#" + M.sec })))));
    const r = root.querySelector("#rel");
    r.append(h("tr", null, ...["Отношение", "Чете се", "Смисъл", "Пример"].map((x) => h("th", { text: x }))));
    REL.forEach((x) => r.append(h("tr", null, h("td", { text: x[0] }), h("td", { text: x[1] }), h("td", { text: x[2] }), h("td", { class: "mono", text: x[3] }))));
    const faq = root.querySelector("#faq");
    FAQ.forEach((F) => faq.append(h("details", { class: "hint", open: true }, h("summary", { text: F.q }), h("div", { html: `<p>${F.a}</p>` }))));
    const plan = root.querySelector("#plan");
    PLAN.forEach((P, i) => plan.append(h("div", { class: "card" },
      h("h4", null, `${i + 1}. `, h("a", { href: "#" + P.sec, text: P.t })),
      h("ul", { class: "prose", style: { paddingLeft: "1.2em" } }, ...P.say.map((s) => h("li", { text: s }))),
      h("p", null, h("b", { text: "Пример: " }), P.ex))));
    const real = root.querySelector("#real");
    REAL.forEach((x) => real.append(h("li", { text: x })));
    const src = root.querySelector("#src");
    SOURCES.forEach(([t, u]) => src.append(h("li", null, u ? h("a", { href: u, target: "_blank", rel: "noopener", text: t }) : t)));
  }

  S.chapter({ id: "sistematizacia", order: 9, num: "9", group: "Обобщение", title: "Систематизация", lead: "Сравнителни таблици, изяснени въпроси и опорен план за устния изпит.", html, mount, algos: {} });
})();
