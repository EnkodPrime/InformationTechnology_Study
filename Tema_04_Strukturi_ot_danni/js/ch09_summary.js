/* Раздел 9 — систематизация: разграничения, изяснени въпроси, опорен план, източници. */
(function () {
  const S = window.Study, h = S.h;

  const PAIRS = [
    ["АТД", "абстрактен тип данни", "реализация (структура от данни)", "структура от данни", "Договор: стойности, операции, поведение.", "Разположение в паметта и цена на операциите."],
    ["Стек", "стек", "Опашка", "опашка", "LIFO: последният добавен излиза първи.", "FIFO: най-дълго чакалият излиза първи."],
    ["Масив", null, "Свързан списък", "едносвързан списък", "Последователно; индекс Θ(1); локалност; вмъкване по средата с изместване.", "Връзки; индекс O(n); свързване Θ(1) при известно място."],
    ["Едносвързан", "едносвързан списък", "Двусвързан", "двусвързан списък", "Изтриване изисква предходния.", "Известен възел се откача с две пренасочвания; повече памет."],
    ["Кръгов буфер", "кръгов буфер", "Кръгов списък", "кръгов списък", "Масив + mod; пълно/празно чрез size.", "Последният сочи първия/сентинела; обход до връщане."],
    ["Двоично дърво", "двоично дърво", "BST", "bst", "≤ 2 различими деца; без наредба.", "Ред за целите поддървета; търсене O(h)."],
    ["Дълбочина", "дълбочина", "Височина", "височина", "Ребра от корена надолу до възела.", "Най-дълъг път от възела до лист."],
    ["Full", "full binary tree", "Complete", "complete binary tree", "0 или 2 деца на всеки възел.", "Нивата запълнени, последното — отляво."],
    ["BST", "bst", "Heap", "binary heap", "Ред ляво < корен < дясно за поддърветата.", "Приоритет родител–деца; минимум в корена."],
    ["Балансирано", "avl", "BST", "bst", "Ограничава формата/височината.", "Ограничава реда на ключовете."],
  ];

  const FAQ = [
    ["Всеки възел в двоично дърво има ли точно две деца?", "Не. Допустими са нула, едно или две. По-силни свойства като „пълно“ имат различни определения в различни учебни традиции и трябва да се зададат изрично.", "darvo"],
    ["Сортираният резултат от симетричен обход доказва ли балансираност?", "Не. Редът следва от BST инварианта. Една верига може да е правилно BST и да даде сортиран обход, но да има линейна височина.", "bst"],
    ["O на едно и също n означава ли еднакво време?", "Не. O(n) ограничава асимптотичния растеж. Константите, паметният достъп и цената на сравнение остават различни.", "sapostavka"],
    ["Празна структура и липсващ възел еднакви случаи ли са?", "Не. Празният контейнер е валидно състояние. Несъществуващ или освободен възел може да е невалиден аргумент. API трябва да различава проверимото отсъствие от неправилна употреба на паметта.", "spisak"],
    ["Двоично дърво и BST едно и също ли са?", "Не. Двоично означава най-много две различими деца. BST добавя ред за целите леви и десни поддървета.", "bst"],
    ["Full, complete и perfect едно и също ли са?", "Не в използваната тук конвенция. Full е нула или две деца; complete е запълване на нивата отляво; perfect има всички листа на една дълбочина и две деца във всеки вътрешен възел.", "darvo"],
    ["Балансираното дърво задължително ли е BST?", "Не. Балансът ограничава формата или височината; BST изисква отделна подредба на ключовете. AVL и red-black съчетават такива изисквания.", "dopalnenie"],
    ["Min heap връща ли нареден симетричен обход?", "Не като общо правило. Той гарантира минимум в корена и отношение родител–деца, а не BST подредба.", "dopalnenie"],
    ["Равенство с вътрешен B+ разделител приключва ли търсенето?", "Не. При B+ tree търсенето на записа продължава до подходящия лист; вътрешният ключ насочва движението.", "dopalnenie"],
    ["Префикс в trie задължително ли е записана дума?", "Не. Нужен е маркер за край на ключ. ca е път в примера car и cat, но става самостоятелен ключ само при изрично маркиране.", "dopalnenie"],
  ];

  const PLAN = [
    { t: "Абстрактен тип и конкретна реализация", sec: "atd", pts: ["Различавам АТД от реализация.", "Обвързвам всяка оценка с условията ѝ."], ex: "Един стек — масив с капацитет или свързани възли; еднакво поведение, различна цена." },
    { t: "Стек", sec: "stek", pts: ["Показвам LIFO.", "Сравнявам масивен и свързан стек.", "Обяснявам амортизирана цена и проверка на скоби."], ex: "push(4), push(7), push(2) → top = 2; pop премахва 2, връх 7. „([)]“ — еднакъв брой, грешен ред." },
    { t: "Опашка", sec: "opashka", pts: ["Обяснявам FIFO и кръгов буфер.", "Давам формулите.", "Посочвам празно и пълно състояние."], ex: "C = 6, head = 3, size = 4: ред 3,4,5,0; следващ запис (3+4) mod 6 = 1." },
    { t: "Линеен свързан списък", sec: "spisak", pts: ["Обяснявам едно- и двусвързан списък.", "Показвам реда на вмъкване.", "Различавам цена на търсене от цена на свързване."], ex: "X.next = P.next; P.next = X. Обратният ред губи остатъка." },
    { t: "Двоично дърво и обхождания", sec: "darvo", pts: ["Определям възли, ребра и височина.", "Възпроизвеждам четирите обхода на примера."], ex: "4 (2 (1, 3), 6): предред 4,2,1,3,6; симетричен 1,2,3,4,6; следред 1,3,2,6,4; по нива 4,2,6,1,3." },
    { t: "Двоично дърво за търсене", sec: "bst", pts: ["Давам BST инварианта.", "Обяснявам трите случая на изтриване.", "Свързвам сложността с височината."], ex: "1..7 нарастващо: височина 6; 4,2,6,1,3,5,7: височина 2. Търсене на 7: 7 срещу 3 посетени възела." },
    { t: "Съпоставка на реализации", sec: "sapostavka", pts: ["Сравнявам по операции и условия.", "Обяснявам защо нито една структура не е универсално най-добра."], ex: "Вмъкване в началото: масив n измествания, списък 2 присвоявания; достъп по индекс — обратното." },
    { t: "Допълнение извън основния обхват", sec: "dopalnenie", extra: true, pts: ["Допълвам с балансирани дървета, heap и хеширане само при въпрос.", "Изброявам граничните случаи."], ex: "Гранични случаи: празна структура, единствен елемент, препълване, дублиран ключ, коректно освобождаване." },
  ];

  const REAL = [
    ["Стек", "C++ std::stack (адаптер: push, pop, top); Python list (append, pop от края)."],
    ["Опашка", "C++ std::queue; Python collections.deque (append, popleft); FreeRTOS Queue (+ синхронизация и изчакване)."],
    ["Списък", "std::forward_list — едносвързан; std::list — двусвързан; std::vector и Python list — динамичен масив."],
    ["Наредено дърво", "std::map — логаритмични гаранции, често red-black (не е задължено); Java TreeMap — red-black."],
    ["Извън основния обхват", "std::priority_queue, Python heapq — приоритет; std::unordered_map — хеширане; PostgreSQL B-tree индекси."],
  ];

  const SOURCES = [
    ["NIST DADS — Binary Tree", "https://xlinux.nist.gov/dads/HTML/binarytree.html"],
    ["NIST DADS — Full Binary Tree", "https://xlinux.nist.gov/dads/HTML/fullBinaryTree.html"],
    ["NIST DADS — Complete Binary Tree", "https://xlinux.nist.gov/dads/HTML/completeBinaryTree.html"],
    ["NIST DADS — Perfect Binary Tree", "https://xlinux.nist.gov/dads/HTML/perfectBinaryTree.html"],
    ["NIST DADS — AVL Tree", "https://xlinux.nist.gov/dads/HTML/avltree.html"],
    ["OpenDSA — The AVL Tree", "https://opendsa.cs.vt.edu/ODSA/Books/ucsc/cse101/spring-2025/CSE101P/html/AVL.html"],
    ["GNU libavl — RB Balancing Rule", "https://adtinfo.org/libavl.html/RB-Balancing-Rule.html"],
    ["NIST DADS — Red-Black Tree", "https://xlinux.nist.gov/dads/HTML/redblack.html"],
    ["Java SE 21 — TreeMap", "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html"],
    ["Python — heapq", "https://docs.python.org/3.10/library/heapq.html"],
    ["Python — collections", "https://docs.python.org/3/library/collections.html"],
    ["NIST DADS — B-Tree", "https://xlinux.nist.gov/dads/HTML/btree.html"],
    ["OpenDSA — B-Trees", "https://opendsa-server.cs.vt.edu/OpenDSA/Books/Catalog/html/BTree.html"],
    ["PostgreSQL 17 — Index Types", "https://www.postgresql.org/docs/17/indexes-types.html"],
    ["CMU BusTub — B+Tree project", "https://15445.courses.cs.cmu.edu/fall2024/project2/"],
    ["NIST DADS — Trie", "https://xlinux.nist.gov/dads/HTML/trie.html"],
    ["libstdc++ — Containers", "https://gcc.gnu.org/onlinedocs/libstdc++/manual/containers.html"],
    ["C++ Core Guidelines", "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines"],
    ["Азълов, П. Обектно ориентирано програмиране. Структури от данни и STL. 2008.", null],
    ["Тодорова, М. Структури от данни и програмиране на С++. 2011.", null],
    ["Дянкова, В. Структури от данни. 2014.", null],
  ];

  const html = `
<div class="block">
  <h3>a) Разграничения: две понятия — два въпроса</h3>
  <p class="muted">Всеки ред съпоставя две близки понятия. Посочи термин за определението от речника.</p>
  <div class="tbl-wrap"><table class="t" id="pairs"></table></div>
</div>

<div class="block">
  <h3>b) Изяснени въпроси</h3>
  <div id="faq" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>c) Опорен план</h3>
  <p class="prose">При обяснение назовавам входа и резултата, проследявам стрелките или промените стъпка по стъпка и посочвам условието, при което примерът е валиден.</p>
  <div id="plan" style="display:grid;gap:8px"></div>
  <div class="key"><b>Визуална опора.</b> След добавяне на 4, 7 и 2 стекът изважда 2, а опашката изважда 4. Физическата реализация може да е различна.</div>
</div>

<div class="block">
  <h3>d) Реални примери за устното изложение</h3>
  <div class="tbl-wrap"><table class="t" id="real"></table></div>
</div>

<div class="block">
  <h3>e) Източници</h3>
  <ol class="prose" id="src" style="padding-left:1.3em"></ol>
</div>`;

  function mount(root) {
    const pt = root.querySelector("#pairs");
    pt.append(h("tr", null, ...["Понятие", "Отговаря на", "Понятие", "Отговаря на"].map((x) => h("th", { text: x }))));
    const term = (t, g) => (g ? h("dfn", { "data-g": g, tabindex: "0", text: t }) : h("span", { text: t }));
    PAIRS.forEach(([a, ga, b, gb, da, db]) => pt.append(h("tr", null, h("td", null, h("b", null, term(a, ga))), h("td", { text: da }), h("td", null, h("b", null, term(b, gb))), h("td", { text: db }))));

    const faq = root.querySelector("#faq");
    FAQ.forEach(([q, a, sec]) => faq.append(h("details", { class: "hint" }, h("summary", { text: q }), h("div", null, h("p", { text: a }), h("p", null, h("a", { href: "#" + sec, text: "→ към раздела" }))))));

    const plan = root.querySelector("#plan");
    PLAN.forEach((P, i) => {
      const box = h("div", { class: "card" },
        h("h4", null, `${i + 1}. `, h("a", { href: "#" + P.sec, text: P.t }), P.extra ? h("span", { class: "extra-tag", text: "разширение" }) : null),
        h("ul", { style: { margin: "0", paddingLeft: "1.2em" } }, ...P.pts.map((x) => h("li", { text: x }))),
        h("p", null, h("b", { text: "Пример: " }), P.ex));
      plan.append(box);
    });

    const rt = root.querySelector("#real");
    rt.append(h("tr", null, h("th", { text: "АТД / структура" }), h("th", { text: "Реална реализация" })));
    REAL.forEach(([a, b]) => rt.append(h("tr", null, h("td", { text: a }), h("td", { text: b }))));

    const src = root.querySelector("#src");
    SOURCES.forEach(([t, u]) => src.append(h("li", null, u ? h("a", { href: u, target: "_blank", rel: "noopener", text: t }) : t)));
  }

  S.chapter({ id: "sistematizacia", order: 9, num: "9", group: "Обобщение", title: "Систематизация", lead: "Разграничения на близки понятия, изяснените въпроси, опорният план и реалните примери.", html, mount, algos: {} });
})();
