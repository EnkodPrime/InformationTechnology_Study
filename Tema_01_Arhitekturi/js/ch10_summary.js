/* Раздел 10 — систематизация: сравнителни таблици, изяснени въпроси, опорен план, източници. */
(function () {
  const S = window.Study, h = S.h;

  const AXES = [
    { ax: "Програмно видимо срещу реализация", a: "Архитектура / ISA", b: "Микроархитектура", q: "Какво вижда програмата? срещу Как е направено?", sec: "arhitektura" },
    { ax: "Пътища до паметта", a: "Фон Нойман", b: "Харвард", q: "Общ или отделен път за инструкции и данни — на кое равнище?", sec: "arhitektura" },
    { ax: "Сложност на ISA", a: "RISC", b: "CISC", q: "Регулярни load/store инструкции срещу сложни инструкции и режими", sec: "isa" },
    { ax: "Потоци (Флин)", a: "SISD / SIMD", b: "MISD / MIMD", q: "Колко потока инструкции × колко потока данни", sec: "paralelna" },
    { ax: "Време на задачите", a: "Конкурентност", b: "Паралелност", q: "Припокриващи се интервали (и с редуване) срещу действително едновременно", sec: "paralelna" },
    { ax: "Комуникация", a: "Споделена памет", b: "Разпределена памет", q: "Общи адреси срещу съобщения", sec: "paralelna" },
    { ax: "Време на операция", a: "Латентност", b: "Пропускателна способност", q: "Кога идва един резултат срещу колко резултата за единица време", sec: "konveier" },
    { ax: "Запис в кеша", a: "Write-through", b: "Write-back", q: "Веднага към следващото ниво срещу при изместване на dirty линия", sec: "pamet" },
    { ax: "Многоядрена памет", a: "Кеш кохерентност", b: "Модел на паметта", q: "Копия на една област срещу допустим ред на операциите", sec: "pamet" },
    { ax: "Вход и изход", a: "Прекъсване", b: "DMA", q: "Уведомяване срещу прехвърляне (често се комбинират)", sec: "vhod-izhod" },
  ];

  const IO = [
    ["Запитване", "CPU проверява регистъра за състояние в цикъл", "CPU", "харчи процесорно време за проверки", "прост; подходящ при много бързо или рядко ползвано устройство"],
    ["Прекъсване", "устройството сигнализира; CPU изпълнява обработчик", "CPU (в обработчика)", "вход/изход от обработчика на всяко събитие", "CPU върши друга работа между събитията"],
    ["DMA", "CPU задава адрес, посока, размер; контролерът пренася", "DMA контролерът", "настройка + едно прекъсване при завършване", "блокове без копиране от CPU; буферът и кешът изискват протокол"],
  ];

  const FORMULAS = [
    ["Идеален конвейер", "T = k + n − 1 такта (вместо k·n)", "k = 5, n = 10 → 14 вместо 50", "konveier"],
    ["AMAT", "t_hit + m · penalty", "1 + 0,05 · 80 = 5 ns", "pamet"],
    ["Процесорно време", "T = IC × CPI × период", "10⁹ · 2 / 2 GHz = 1 s; 5·10⁸ · 5 / 2 GHz = 1,25 s", "proizvoditelnost"],
    ["Ускорение", "S = T_посл / T_пар", "при една и съща работа", "proizvoditelnost"],
    ["Закон на Амдал", "S(p) = 1 / ((1−f) + f/p)", "f = 0,9, p = 4 → 3,08; p → ∞ → 10", "proizvoditelnost"],
    ["Брой SIMD инструкции", "⌊n/W⌋ + (n mod W)", "n = 10, W = 4 → 4", "paralelna"],
  ];

  const FAQ = [
    { q: "Може ли един процесор да бъде едновременно MIMD и SIMD?", a: "Да, когато описваме различни равнища. Независимите ядра са MIMD; векторната операция във всяко ядро е SIMD. Не са дадени две противоположни оценки за едно и също равнище.", sec: "paralelna" },
    { q: "Два кеша означават ли две отделни основни памети?", a: "Не. Кешовете за инструкции и данни могат да извличат блокове от обща RAM. За класификацията трябва да се разгледат адресните пространства, пътищата и конкретното ниво.", sec: "arhitektura" },
    { q: "Един такт означава ли една завършена инструкция?", a: "Не като общ закон. Инструкция може да отнема много тактове; няколко могат да завършват в един такт; изчакванията могат да оставят такт без завършена инструкция.", sec: "konveier" },
    { q: "Защо един и същ код е по-бавен върху друг процесор?", a: "ISA съвместимостта гарантира поведение, а времето зависи от микроархитектурата, кешовете, паметта, честотата и конкретните зависимости в програмата.", sec: "arhitektura" },
    { q: "АЛУ и УУ едно и също устройство ли са?", a: "Не. АЛУ преобразува операндите според избрана операция; УУ организира избора на операция, данните и записите.", sec: "cpu" },
    { q: "Регистрите адреси в RAM ли са?", a: "Не. Регистровият номер избира регистър, а паметният адрес избира място в адресното пространство. Регистърът може да съдържа адрес като стойност.", sec: "cpu" },
    { q: "Carry и signed overflow едно и също ли са?", a: "Не. При 8-битово 255 + 1 има пренос извън осемте бита; при знаково 127 + 1 има signed overflow без такъв пренос.", sec: "cpu" },
    { q: "LOAD и ADD четат ли едни и същи източници?", a: "Не като общо правило. RV32I ADD използва регистрови операнди; LOAD зарежда данни от изчислен паметен адрес. Извличането на инструкцията е отделно действие.", sec: "isa" },
  ];

  const PLAN = [
    { t: "Архитектура и организация на компютъра", sec: "arhitektura", pts: ["Разграничавам архитектура от микроархитектура.", "Сравнявам фон Нойман и Харвард.", "Назовавам основните устройства."], ex: "Един RV32I договор — различни реализации (Ibex). Отделни L1 кешове пред обща RAM — смесена организация." },
    { t: "Последователна и паралелна обработка", sec: "paralelna", pts: ["Обяснявам SISD, SIMD, MIMD.", "Давам по един пример.", "Различавам конкурентност и паралелност."], ex: "Arm NEON е SIMD разширение; многоядрените Intel Core и AMD Ryzen са MIMD на равнище ядра; NVIDIA CUDA позволява програмиране на GPU." },
    { t: "Система от инструкции", sec: "isa", pts: ["Определям ISA.", "Изброявам групи инструкции и адресни режими.", "Показвам зависимост между LOAD и ADD."], ex: "LOAD R1, [R2+4]; ADD R3, R1, R4. Intel 64 и AMD64 са наименованията на Intel и AMD за x86-64 ISA; RISC-V е отворена ISA." },
    { t: "Конвейерна обработка", sec: "konveier", pts: ["Описвам петте етапа.", "Смятам 14 срещу 50 такта.", "Обяснявам трите конфликта."], ex: "I1 завършва в такт 5, I3 в такт 7 — 7 вместо 15 такта." },
    { t: "Йерархия на паметта", sec: "pamet", pts: ["Изреждам йерархията.", "Обяснявам локалност и кеш линия.", "Пресмятам AMAT и разграничавам кохерентност от подредба."], ex: "1 ns + 5% · 80 ns = 5 ns." },
    { t: "Подсистема за вход и изход", sec: "vhod-izhod", pts: ["Сравнявам polling, прекъсвания, DMA.", "Проследявам заявка от приложение до устройство."], ex: "DMA контролер пренася блок от UART или ADC към RAM; NVMe контролер обслужва SSD." },
    { t: "Производителност и ограничения на паралелизма", sec: "proizvoditelnost", pts: ["Записвам формулата за CPU time и закона на Амдал.", "Обяснявам защо четири ядра не гарантират четворно ускорение."], ex: "f = 0,9, p = 4 → 3,08; граница 10." },
    { t: "Допълнение извън основния обхват", sec: "dopalnenie", extra: true, pts: ["При въпрос допълвам с NUMA и хардуерни нишки.", "Връщам се към ограниченията на паметта."], ex: "OpenMP (споделена памет) и MPI (съобщения) не са процесорни архитектури." },
  ];

  const SOURCES = [
    ["M. J. Flynn, Some Computer Organizations and Their Effectiveness, 1972", "https://www.computer.org/csdl/journal/tc/1972/09/05009071/13rRUwdrdOi"],
    ["RISC-V Instruction Set Manual (unprivileged)", "https://docs.riscv.org/reference/isa/_attachments/riscv-unprivileged.pdf"],
    ["RISC-V RV32I Base Integer Instruction Set", "https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html"],
    ["Ibex — Instruction Decode and Execute", "https://ibex-core.readthedocs.io/en/latest/03_reference/instruction_decode_execute.html"],
    ["Ibex — Register File", "https://ibex-core.readthedocs.io/en/latest/03_reference/register_file.html"],
    ["Ibex — Instruction Fetch", "https://ibex-core.readthedocs.io/en/latest/03_reference/instruction_fetch.html"],
    ["Ibex — Load-Store Unit", "https://ibex-core.readthedocs.io/en/latest/03_reference/load_store_unit.html"],
    ["Ibex — Pipeline Details", "https://ibex-core.readthedocs.io/en/latest/03_reference/pipeline_details.html"],
    ["Arm Cortex-M0 Technical Reference Manual", "https://support.arm.com/documentation/ddi0432/c/functional-description/about-the-functions"],
    ["Arm Cortex-M0+ Processor Datasheet", "https://documentation-service.arm.com/static/620545c494e7af28dd7c9cbc"],
    ["Intel 64 and IA-32 Architectures Software Developer Manuals", "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html"],
    ["Linux kernel documentation", "https://www.kernel.org/doc/html/latest/"],
    ["Боровска, П. Компютърни системи. 2012.", null],
    ["Станев, С. Компютърни системи. 2013.", null],
  ];

  const html = `
<div class="prose"><p>Повечето въпроси в темата са разграничения между две понятия по <b>една ос</b>. Ако кажеш на коя ос и на кое равнище говориш, капаните отпадат.</p></div>

<div class="block">
  <h3>a) Оси на разграничение</h3>
  <div class="row"><input type="search" id="ax-q" placeholder="Търси (напр. кеш, Флин, DMA)…" aria-label="Търси в таблицата" style="flex:1 1 240px"></div>
  <div class="tbl-wrap"><table class="t" id="ax"></table></div>
</div>

<div class="block">
  <h3>b) Вход и изход — сравнение</h3>
  <div class="tbl-wrap"><table class="t" id="io"></table></div>
</div>

<div class="block">
  <h3>c) Формули и числа от материала</h3>
  <div class="tbl-wrap"><table class="t" id="fm"></table></div>
</div>

<div class="block">
  <h3>d) Изяснени въпроси</h3>
  <div id="faq" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>e) Опорен опорен план</h3>
  <p class="prose muted">Структура за устно изложение. Всяка точка задава понятията, разграниченията и примерите, които да бъдат развити със собствени думи. При обяснение назовавам входа и резултата, проследявам стрелките или промените стъпка по стъпка и посочвам условието, при което примерът е валиден.</p>
  <div id="plan" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>f) Източници</h3>
  <p class="prose muted">По учебното ръководство (раздел „Източници и литература“) и разработката. Изискванията на конкретна версия на продукт се проверяват в нейната документация.</p>
  <ol class="prose" id="src" style="padding-left:1.3em"></ol>
</div>`;

  function mount(root) {
    const ax = root.querySelector("#ax"), q = root.querySelector("#ax-q");
    const renderAx = () => {
      const s = q.value.toLowerCase().trim();
      ax.innerHTML = "";
      ax.append(h("tr", null, ...["Ос", "Едното", "Другото", "Въпросът, на който отговарят", "Раздел"].map((x) => h("th", { text: x }))));
      let k = 0;
      AXES.forEach((A) => {
        if (s && !Object.values(A).join(" ").toLowerCase().includes(s)) return;
        k++;
        ax.append(h("tr", null, h("td", { text: A.ax }), h("td", null, h("b", { text: A.a })), h("td", null, h("b", { text: A.b })), h("td", { text: A.q }), h("td", null, h("a", { href: "#" + A.sec, text: "#" + A.sec }))));
      });
      if (!k) ax.append(h("tr", null, h("td", { colspan: 5, class: "muted", text: "Няма съвпадения." })));
    };
    q.addEventListener("input", renderAx); renderAx();

    const io = root.querySelector("#io");
    io.append(h("tr", null, ...["Механизъм", "Как работи", "Кой копира данните", "Цена за CPU", "Кога е удачен"].map((x) => h("th", { text: x }))));
    IO.forEach((r) => io.append(h("tr", null, h("td", null, h("b", { text: r[0] })), ...r.slice(1).map((x) => h("td", { text: x })))));

    const fm = root.querySelector("#fm");
    fm.append(h("tr", null, ...["Величина", "Формула", "Пример от материала", ""].map((x) => h("th", { text: x }))));
    FORMULAS.forEach((r) => fm.append(h("tr", null, h("td", { text: r[0] }), h("td", { class: "mono", text: r[1] }), h("td", { class: "mono", text: r[2] }), h("td", null, h("a", { href: "#" + r[3], text: "→" })))));

    const faq = root.querySelector("#faq");
    FAQ.forEach((F) => faq.append(h("details", { class: "hint" }, h("summary", { text: F.q }), h("div", null, h("p", { text: F.a }), h("p", null, h("a", { href: "#" + F.sec, text: "→ към раздела" }))))));

    const plan = root.querySelector("#plan");
    PLAN.forEach((P, i) => plan.append(h("div", { class: "card" },
      h("h4", null, `${i + 1}. ${P.t}`, P.extra ? h("span", { class: "extra-tag", text: "разширение" }) : null),
      h("ul", { class: "prose", style: { margin: 0 } }, ...P.pts.map((x) => h("li", { text: x }))),
      h("p", null, h("b", { text: "Пример: " }), P.ex),
      h("p", null, h("a", { href: "#" + P.sec, text: "→ към раздела" })))));

    const src = root.querySelector("#src");
    SOURCES.forEach(([t, u]) => src.append(h("li", null, u ? h("a", { href: u, target: "_blank", rel: "noopener", text: t }) : t)));
  }

  S.chapter({ id: "sistematizacia", order: 10, num: "10", group: "Обобщение", title: "Систематизация",
    lead: "Оси на разграничение, сравнение на механизмите за вход и изход, формулите, изяснените въпроси и опорният план.", html, mount, algos: {} });
})();
