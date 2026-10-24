/* Раздел 11 — Систематизация и изпитни въпроси. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- данни ---------- */
  const METHODS = [
    { m: "Рекурсия", g: "рекурсия", p: "Самоизвикване до базов случай", ex: "Факториел, обхождане на дървета", c: "факториел: T(n) = T(n−1) + Θ(1) = Θ(n)", gu: "Начин на организация, не гаранция за ефективност", sec: "rekursia" },
    { m: "Разделяй и владей", g: "разделяй и владей", p: "Разделяне; решаване; обединяване", ex: "Merge Sort", c: "T(n) = 2T(n/2) + Θ(n) = Θ(n log n)", gu: "Точен резултат; подзадачите обикновено са независими", sec: "razdelyai" },
    { m: "Алчен подход", g: "алчен подход", p: "Локално най-добър избор", ex: "Избор на интервали (най-ранен край)", c: "O(n log n) със сортиране", gu: "Оптимален само при доказано свойство на алчния избор", sec: "alchen" },
    { m: "Динамично програмиране", g: "динамично програмиране", p: "Съхраняване на припокриващи се подзадачи", ex: "Раница 0/1", c: "O(nW) — псевдополиномиално", gu: "Точен оптимум при оптимална подструктура", sec: "dp" },
    { m: "Изчерпателно търсене", g: "изчерпателно търсене", p: "Всички възможности", ex: "Всички подмножества", c: "Θ(2ⁿ) кандидата", gu: "Точен; отправна точка", sec: "dopalnitelni" },
    { m: "Връщане назад", g: "търсене с връщане назад", p: "Отказ от неперспективни частични решения", ex: "N дами", c: "в най-лошия случай експоненциално", gu: "Точен; отрязва по недопустимост", sec: "dopalnitelni" },
    { m: "Разклоняване и ограничаване", g: "разклоняване и ограничаване", p: "Отрязване чрез граници на целта", ex: "Оптимизационен TSP", c: "в най-лошия случай (n−1)! обиколки", gu: "Точен оптимум при оптимистична граница", sec: "dopalnitelni" },
    { m: "Вероятностен", g: "вероятностен алгоритъм", p: "Случайни избори", ex: "Randomized Quick Sort", c: "очаквано O(n log n)", gu: "Las Vegas: винаги верен; Monte Carlo: контролирана грешка", sec: "dopalnitelni" },
    { m: "Приближен", g: "приближен алгоритъм", p: "Гаранция за близост до оптимума", ex: "Метричен TSP", c: "полиномиално", gu: "цена ≤ α·OPT (доказано)", sec: "dopalnitelni" },
    { m: "Евристичен", g: "евристика", p: "Практически насоки", ex: "Локално търсене", c: "зависи от правилото", gu: "Без задължителна гаранция; оценява се емпирично", sec: "dopalnitelni" },
  ];

  const LABELS = [["zad", "задача"], ["str", "стратегия"], ["cost", "цена на алгоритъм"], ["impl", "реализация"], ["cls", "клас"]];
  const SENT = [
    { parts: [["„Раница“", "zad"], [" е "], ["NP-пълна", "cls"], [" в разпознаващата си форма, решава се с "], ["DP", "str"], [" за "], ["O(mW)", "cost"], [", реализирано като "], ["Python функция с кеш", "impl"], ["."]],
      why: "„Раница“ назовава семейство задачи; DP е стратегия; O(mW) е цена на конкретен алгоритъм; Python с кеш е реализация; „NP-пълна“ се отнася до разпознаващата формулировка — клас." },
    { parts: [["Сортирането", "zad"], [" с Merge Sort — "], ["разделяй и владей", "str"], [" — отнема "], ["Θ(n log n)", "cost"], ["; написахме го като "], ["C функция за Cortex-M", "impl"], ["."]],
      why: "Merge Sort е конкретен алгоритъм; „разделяй и владей“ е стратегията, по която е построен. Θ(n log n) е растеж на алгоритъма, не на задачата и не на програмата." },
    { parts: [["TSP с праг K", "zad"], [" е "], ["в NP", "cls"], ["; решаваме го с "], ["разклоняване и ограничаване", "str"], [", което в най-лошия случай е "], ["(n−1)!", "cost"], ["."]],
      why: "Принадлежността към NP е свойство на разпознаващата задача. Разклоняването и ограничаването е метод; (n−1)! е горна граница за броя обиколки на този алгоритъм." },
    { parts: [["Най-кратки пътища от един връх", "zad"], [" при неотрицателни тегла: "], ["алчният", "str"], [" алгоритъм на Дейкстра, "], ["O((V+E) log V)", "cost"], [" с двоична пирамида, "], ["std::priority_queue на C++", "impl"], ["."]],
      why: "Условието „неотрицателни тегла“ е част от задачата. Сложността зависи от структурата от данни — и все пак е цена на алгоритъма, а std::priority_queue е реализация." },
    { parts: [["Изпълнимостта на булева формула", "zad"], [" е "], ["NP-пълна", "cls"], ["; нашият решател използва "], ["търсене с връщане назад", "str"], [", написан е като "], ["C програма", "impl"], [" и в най-лошия случай проверява "], ["2ⁿ", "cost"], [" присвоявания."]],
      why: "Бързото решаване на конкретни примери е факт за реализацията, не доказателство за полиномиален алгоритъм. Класът (NP-пълна) е на задачата; 2ⁿ е горна граница за този алгоритъм." },
  ];

  const FAQ = [
    { q: "NP значи ли „трудно“?", a: "Не. NP е класът на задачите за разпознаване с полиномиално проверими положителни сертификати. P ⊆ NP — всяка лесна задача е и в NP. NP-пълнотата показва, че задачата е сред най-трудните в NP спрямо полиномиална сводимост, но <b>не доказва P ≠ NP</b>." },
    { q: "Проверяваме ли и отрицателния отговор с NP сертификат?", a: "При стандартната дефиниция — само положителните отговори имат кратък, полиномиално проверим сертификат. Кратки сертификати за отрицателния отговор са свойство на класа <dfn data-g=\"conp\">coNP</dfn> (допълненията на задачите от NP)." },
    { q: "Рекурсия и DP изключват ли се?", a: "Не. Рекурсията е начин на организация; DP е стратегия със съхраняване на подзадачи. Рекурсия с <dfn data-g=\"мемоизация\">мемоизация</dfn> е типична реализация на DP (отгоре надолу); табличното изчисление е другата (отдолу нагоре)." },
    { q: "Оптимизатор, който бързо решава примери, доказва ли полиномиалност?", a: "Не. Бързи измервания върху конкретни примери не дават доказана полиномиална граница за <i>всички</i> входове с размер n. Полиномиалността е математическо твърдение за най-лошия случай." },
    { q: "Какво се променя при ново знание?", a: "Математическата принадлежност на задача към клас не зависи от текущото ни незнание: ако P = NP или P ≠ NP, това е вярно и днес. Ново знание променя какво <i>знаем</i>, не какво <i>е</i>. Също: от добри измервания не следва доказана полиномиална граница." },
  ];

  const PLAN = [
    { t: "Алгоритъм — същност и свойства", sec: "algoritam", say: "Задача → алгоритъм → програма → изпълнение. Шестте свойства: дискретност, определеност, масовост, крайност, резултатност, изпълнимост. Частична и пълна коректност; инвариант и рангова функция.", ex: "Линейно търсене с инварианта „key не е в a[0..i−1]“; Евклид с ранг b." },
    { t: "Изчислимост", sec: "izchislimost", say: "Модели: машина на Тюринг, рекурсивни функции, ламбда-смятане — еквивалентни. Тезата на Чърч–Тюринг е теза, не теорема. Видове задачи: разпознаване, търсене, оптимизация. Разрешима / полуразрешима / неразрешима. Изчислимост ≠ сложност.", ex: "Проблемът за спирането: неразрешим, но полуразрешим (симулираме и казваме „да“, ако спре)." },
    { t: "Сложност", sec: "slozhnost", say: "n е битовата дължина на входа; T(n), S(n). Най-лош / среден / най-добър случай. O, Ω, Θ. Ред на растеж: 1 → log n → n → n log n → n² → 2ⁿ → n!. P/NP са класове задачи, не алгоритми.", ex: "Merge Sort: Θ(n log n) сравнения във всеки случай." },
    { t: "P, NP, NP-пълнота, NP-трудност", sec: "pnp", say: "P — решими детерминирано за полиномиално време; NP — с полиномиално проверим положителен сертификат. P ⊆ NP. NP ≠ „неполиномиално“. Сводимост ≤ₚ: свеждаш известна трудна КЪМ новата. NP-пълна = в NP + NP-трудна. P = NP? — открит.", ex: "SAT (Кук–Левин), Хамилтонов цикъл, TSP в решаваща форма." },
    { t: "Рекурсия", sec: "rekursia", say: "Базов случай + рекурсивен преход + гаранция, че се стига до базата (намаляваща мярка). Рекурентно съотношение. Стекова памет — дълбочината на рекурсията.", ex: "Факториел: T(n) = T(n−1) + Θ(1) = Θ(n), стек Θ(n)." },
    { t: "Разделяй и владей", sec: "razdelyai", say: "Разделяне, решаване на независимите подзадачи, обединяване. Анализ с рекурентно съотношение.", ex: "Merge Sort: T(n) = 2T(n/2) + Θ(n) = Θ(n log n). Също двоично търсене, Quick Sort." },
    { t: "Алчен подход", sec: "alchen", say: "Локално най-добър избор без преразглеждане. Коректността се доказва отделно: свойство на алчния избор (аргумент за замяна) + оптимална подструктура.", ex: "Интервали по най-ранен край — оптимално. Монети {1,3,4}, сума 6: алчно 4+1+1 (3 монети), оптимум 3+3 (2). Дейкстра, Прим, Крускал, Хъфман." },
    { t: "Динамично програмиране", sec: "dp", say: "Припокриващи се подзадачи + оптимална подструктура; съхраняване. Мемоизация (отгоре) или таблица (отдолу). Разлика с D&C: там подзадачите са независими.", ex: "Фибоначи: от експоненциално към Θ(n). Раница: D(i, c) = max(D(i−1, c), D(i−1, c−wᵢ) + vᵢ); O(nW) — псевдополиномиално." },
    { t: "Други парадигми", sec: "dopalnitelni", say: "Не са една класификация. Изчерпателно; връщане назад (недопустимост); разклоняване и ограничаване (граница); намаляване на размера; предварително преобразуване; вероятностни (Las Vegas / Monte Carlo); приближени (≤ α·OPT); евристики; среща по средата; онлайн и поточни.", ex: "N дами; долна граница 12 изключва подобрение на минимум 10; Randomized Quick Sort; 2-приближение за върхово покритие." },
    { t: "Финално обобщение", sec: "karta", say: "Изчислимост — МОЖЕ ли? Сложност — КОЛКО? Парадигма — КАК? Коректност — ПРАВИЛЕН ли е и винаги ли завършва? P/NP класифицират задачи; O/Ω/Θ — асимптотични граници; парадигмите — подходи; езикът и платформата — реализация.", ex: "„Раница е NP-пълна, решава се с DP за O(nW), реализирана на C“ — четири различни равнища в едно изречение." },
  ];

  const QUIZ = [
    { q: "P ⊆ NP е…", options: ["открит въпрос", "доказан факт", "същото като P = NP", "вярно само за SAT"], correct: 1, why: "Всяка задача, решима полиномиално, има тривиален сертификат — самото решение се проверява полиномиално. Открит е въпросът P = NP." },
    { q: "Буквата N в NP означава…", options: ["Non-polynomial", "Nondeterministic", "Number", "NP-hard"], correct: 1, why: "Nondeterministic Polynomial time. NP не означава „неполиномиално“." },
    { q: "Тезата на Чърч–Тюринг е…", options: ["доказана теорема", "теза — не може да се докаже формално", "опровергана", "твърдение за сложност"], correct: 1, why: "„Ефективно изчислимо“ е интуитивно понятие, затова тезата не е теорема." },
    { q: "Проблемът за спирането е…", options: ["разрешим, но бавен", "неразрешим, но полуразрешим", "NP-пълен", "в P"], correct: 1, why: "Няма алгоритъм за всички входове, но положителният отговор се потвърждава чрез симулация." },
    { q: "За да докажеш, че нова задача B е NP-трудна, свеждаш…", options: ["B към известна NP-пълна A", "известна NP-пълна A към B", "B към P", "нищо — пускаш тестове"], correct: 1, why: "A ≤ₚ B: ако B се решаваше бързо, щеше да се реши и A." },
    { q: "Раница 0/1 за O(nW) е…", options: ["полиномиален алгоритъм", "псевдополиномиален алгоритъм", "доказателство, че P = NP", "приближен алгоритъм"], correct: 1, why: "W е стойност, а входът съдържа ≈ log W бита за нея — O(nW) е експоненциално спрямо дължината на записа." },
    { q: "Алчният алгоритъм за монети {1, 3, 4} и сума 6 дава…", options: ["2 монети — оптимум", "3 монети — не е оптимум", "грешка", "1 монета"], correct: 1, why: "4 + 1 + 1 = 3 монети; оптимумът е 3 + 3 = 2. Свойството на алчния избор не е изпълнено за тази система." },
    { q: "T(n) = 2T(n/2) + Θ(n) има решение…", options: ["Θ(n)", "Θ(n log n)", "Θ(n²)", "Θ(log n)"], correct: 1, why: "log n нива по Θ(n) работа на всяко — Merge Sort." },
    { q: "Разликата между DP и „разделяй и владей“ е, че при DP…", options: ["няма рекурсия", "подзадачите се припокриват и резултатите се съхраняват", "винаги има алчен избор", "сложността е винаги полиномиална"], correct: 1, why: "При D&C подзадачите обикновено са независими; при DP се повтарят и се пазят." },
    { q: "Програма, която никога не спира, е…", options: ["пълно коректна", "тривиално частично коректна", "невярна по дефиниция за частична коректност", "в NP"], correct: 1, why: "„Ако спре, резултатът е верен“ — условието е тривиално изпълнено. Пълна коректност няма." },
    { q: "Randomized Quick Sort е алгоритъм от тип…", options: ["Monte Carlo", "Las Vegas", "приближен", "недетерминиран (NP)"], correct: 1, why: "Винаги дава сортиран резултат; случайно е само времето." },
    { q: "Разклоняването и ограничаването при минимизация отрязва клон, когато…", options: ["долната граница е < best", "долната граница е ≥ best", "клонът е допустим", "е изминато половината"], correct: 1, why: "Оптимистичната граница ≥ вече намерения минимум ⇒ клонът не може да го подобри." },
    { q: "Θ(n log n) е характеристика на…", options: ["задачата за сортиране", "алгоритъма Merge Sort в модел", "C програмата на конкретен процесор", "класа P"], correct: 1, why: "Асимптотичната оценка е на алгоритъма. Задачата има много алгоритми; изпълнението дава измерване." },
    { q: "Оптимизационният TSP е…", options: ["NP-пълен", "NP-трудна задача, но не задача за разпознаване", "в P", "неразрешим"], correct: 1, why: "NP-пълнотата се отнася до разпознаващата версия (обиколка ≤ K). Оптимизационната е NP-трудна." },
  ];

  const SOURCES = [
    ["Конспект за кандидат-докторантски изпит „Информатика“, ШУ, 21.01.2025", "https://integrity.shu.bg/wp-content/uploads/file-manager-advanced/users/projects/news/2025/Kospekt_4.6..pdf"],
    ["Stephen Cook, The P versus NP Problem", "https://www.claymath.org/wp-content/uploads/2022/06/pvsnp.pdf"],
    ["Clay Mathematics Institute — P vs NP", "https://www.claymath.org/millennium/p-vs-np/"],
    ["Python — functools (lru_cache, cache)", "https://docs.python.org/3/library/functools.html"],
    ["Python — Sorting HOWTO", "https://docs.python.org/3/howto/sorting.html"],
    ["Google OR-Tools — CP-SAT Solver", "https://developers.google.com/optimization/cp/cp_solver"],
    ["Наков, П., Добриков, П. Програмиране = ++Алгоритми. 2013.", null],
    ["Седжуик, Р. Алгоритми на C. 2002.", null],
    ["Амерал, Л. Алгоритми и структури от данни в C++. 2001.", null],
  ];

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose"><p>Между методите <b>няма строга йерархия</b>: рекурсия се използва в разделяй и владей, в DP и при връщане назад; вероятностни техники се комбинират с другите. Таблицата подрежда водещия принцип, а не родословие.</p></div>

<div class="block">
  <h3>a) Сравнителна таблица на методите</h3>
  <div class="row"><input type="search" id="m-q" placeholder="Търси (напр. TSP, гаранция, n log n)…" aria-label="Търси в таблицата" style="flex:1 1 240px">
    <select id="m-f" aria-label="Филтър по раздел"><option value="">всички раздели</option><option value="conspect">в конспекта</option><option value="extra">извън конспекта</option></select></div>
  <div class="tbl-wrap"><table class="t" id="m-tbl"></table></div>
  <div class="key">Метод ≠ задача ≠ цена ≠ реализация. Методът казва <b>как</b>; сложността е на <b>алгоритъма</b>; класът е на <b>задачата</b>.</div>
</div>

<div class="block">
  <h3>b) Класифицирай примера</h3>
  <p class="muted">За всяка подчертана част избери равнище. После „Провери“.</p>
  <div id="cls-game" style="display:grid;gap:14px"></div>
</div>

<div class="block">
  <h3>c) Изяснени въпроси</h3>
  <div id="faq" style="display:grid;gap:8px"></div>
  <details class="trap"><summary>Капан: смесване на равнищата</summary><div><p>„Тази програма е NP-пълна“ е грешно изречение: NP-пълнотата е свойство на задача, не на програма. „Merge Sort е в P“ също е неточно: в P е задачата за сортиране (в разпознаваща форма), а Merge Sort е алгоритъм с Θ(n log n).</p></div></details>
</div>

<div class="block">
  <h3>d) Опорен план за устния изпит</h3>
  <div class="row"><label class="field" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pl-ex"> режим „упражнение“</label>
    <label class="field" for="pl-min"><span>минути на точка</span><input type="number" id="pl-min" value="3" min="1" max="10" style="width:5em"></label>
    <span class="muted" style="font-size:.85rem">В режим „упражнение“ отговорът е скрит; разкажи на глас, после „покажи подсказка“.</span></div>
  <div id="plan" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>e) Финален тест</h3>
  <div id="final"></div>
  <h3>Флашкарти от речника</h3>
  <div class="viz" style="padding:14px 16px;display:grid;gap:12px" id="fc"></div>
</div>

<div class="block">
  <h3>f) Източници</h3>
  <ol class="prose" id="src" style="padding-left:1.3em"></ol>
</div>`;

  /* ---------- mount ---------- */
  // разбърква опциите детерминирано (верният отговор не е винаги на едно място)
  const mixQuiz = (items) => items.map((it, i) => { const r = (i * 3 + 1) % it.options.length; const o = it.options.map((_, k) => it.options[(k + r) % it.options.length]); return Object.assign({}, it, { options: o, correct: (it.correct - r + o.length) % o.length }); });
  function mount(root) {
    // a) таблица
    const tbl = root.querySelector("#m-tbl"), q = root.querySelector("#m-q"), fsel = root.querySelector("#m-f");
    function renderTbl() {
      const s = q.value.toLowerCase().trim(), f = fsel.value;
      tbl.innerHTML = "";
      tbl.append(h("tr", null, ...["Метод", "Водещ принцип", "Подходящ пример", "Сложност на примера", "Гаранция", "Раздел"].map((x) => h("th", { text: x }))));
      let k = 0;
      METHODS.forEach((M) => {
        const extra = M.sec === "dopalnitelni";
        if (f === "conspect" && extra) return;
        if (f === "extra" && !extra) return;
        if (s && !Object.values(M).join(" ").toLowerCase().includes(s)) return;
        k++;
        tbl.append(h("tr", null, h("td", null, h("dfn", { "data-g": M.g, tabindex: "0", text: M.m })), h("td", { text: M.p }), h("td", { text: M.ex }), h("td", { class: "mono", text: M.c }), h("td", { text: M.gu }),
          h("td", null, h("a", { href: "#" + M.sec, text: "#" + M.sec }), extra ? h("span", { class: "extra-tag", text: "извън" }) : null)));
      });
      if (!k) tbl.append(h("tr", null, h("td", { colspan: 6, class: "muted", text: "Няма съвпадения." })));
    }
    q.addEventListener("input", renderTbl); fsel.addEventListener("change", renderTbl); renderTbl();

    // b) класификация
    const game = root.querySelector("#cls-game");
    SENT.forEach((Sx, si) => {
      const sels = [];
      const p = h("p", { style: { lineHeight: "2.4" } });
      Sx.parts.forEach(([txt, lab]) => {
        if (!lab) { p.append(txt); return; }
        const sel = h("select", { "aria-label": "Равнище за " + txt, style: { minHeight: "28px", padding: "2px 4px", fontSize: "12px" } }, h("option", { value: "", text: "?" }), ...LABELS.map(([v, t]) => h("option", { value: v, text: t })));
        sels.push([sel, lab]);
        p.append(h("span", null, h("b", { text: txt }), " ", sel));
      });
      const out = h("div", { class: "why", hidden: true, style: { fontSize: ".88rem", color: "var(--ink-2)", borderLeft: "3px solid var(--line)", paddingLeft: "10px" } });
      const btn = h("button", { class: "btn", text: "Провери", onclick: () => {
        let ok = 0;
        sels.forEach(([sel, lab]) => { const r = sel.value === lab; if (r) ok++; sel.style.borderColor = r ? "var(--st-done)" : "var(--st-swap)"; sel.style.background = r ? "var(--st-done-bg)" : "var(--st-swap-bg)"; });
        out.hidden = false;
        out.innerHTML = `<b>${ok}/${sels.length} верни.</b> ` + Sx.why + (ok < sels.length ? "<br>Верни: " + sels.map(([sel, lab]) => `${sel.parentElement.querySelector("b").textContent} → ${LABELS.find((l) => l[0] === lab)[1]}`).join("; ") : "");
      } });
      game.append(h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Изречение " + (si + 1) }), p, h("div", { class: "row" }, btn), out));
    });

    // c) FAQ
    const faq = root.querySelector("#faq");
    FAQ.forEach((F) => faq.append(h("details", { class: "hint" }, h("summary", { text: F.q }), h("div", { html: `<p>${F.a}</p>` }))));

    // d) план
    const plan = root.querySelector("#plan"), ex = root.querySelector("#pl-ex"), mins = root.querySelector("#pl-min");
    let timer = null;
    function renderPlan() {
      if (timer) { clearInterval(timer.id); timer = null; }
      plan.innerHTML = "";
      PLAN.forEach((P, i) => {
        const body = h("div", null, h("p", null, h("b", { text: "Какво да кажа: " }), P.say), h("p", null, h("b", { text: "Пример: " }), P.ex),
          h("p", null, h("a", { href: "#" + P.sec, text: "→ към раздела" })));
        const d = h("details", { class: "hint" }, h("summary", { text: `${i + 1}. ${P.t}` }));
        if (!ex.checked) { d.append(body); }
        else {
          const clock = h("span", { class: "pill", text: "—" });
          body.hidden = true;
          const hintB = h("button", { class: "btn ghost", text: "покажи подсказка", onclick: () => { body.hidden = false; hintB.disabled = true; } });
          const start = h("button", { class: "btn primary", text: "старт таймер", onclick: () => {
            if (timer) clearInterval(timer.id);
            let left = Math.max(1, Math.min(10, +mins.value || 3)) * 60;
            const tick = () => { clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; clock.className = "pill " + (left <= 0 ? "s-swap" : left <= 30 ? "s-cmp" : "s-act"); if (left <= 0) { clearInterval(timer.id); clock.textContent = "времето изтече"; } left--; };
            tick(); timer = { id: setInterval(tick, 1000) };
          } });
          d.append(h("div", null, h("div", { class: "row" }, start, clock, hintB), body));
        }
        plan.append(d);
      });
    }
    ex.addEventListener("change", renderPlan); renderPlan();

    // e) тест
    S.quiz(root.querySelector("#final"), mixQuiz(QUIZ), "Финален тест — цялата тема");

    // флашкарти
    const fc = root.querySelector("#fc"), G = window.GLOSSARY || {};
    const cats = [...new Set(Object.values(G).map((g) => g.cat).filter(Boolean))];
    const csel = h("select", { "aria-label": "Категория" }, h("option", { value: "", text: "всички категории" }), ...cats.map((c) => h("option", { value: c, text: c })));
    const card = h("button", { class: "card", style: { minHeight: "150px", placeContent: "center", textAlign: "center", justifyItems: "center" }, "aria-live": "polite" });
    const pos = h("span", { class: "mono muted", style: { fontSize: ".8rem" } });
    let deck = [], k = 0, flipped = false;
    function build() { deck = Object.values(G).filter((g) => !csel.value || g.cat === csel.value); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } k = 0; flipped = false; show(); }
    function show() {
      card.innerHTML = "";
      if (!deck.length) { card.append(h("p", { text: "Няма понятия." })); return; }
      const g = deck[k];
      if (!flipped) card.append(h("span", { class: "eyebrow", text: g.cat || "" }), h("h3", { text: g.t }), g.en ? h("span", { class: "muted", text: g.en }) : null, h("span", { class: "muted", style: { fontSize: ".8rem" }, text: "щракни, за да обърнеш" }));
      else card.append(h("b", { text: g.t }), h("p", { html: g.d, style: { fontSize: ".95rem", color: "var(--ink)" } }), g.more ? h("p", { class: "muted", html: g.more }) : null);
      pos.textContent = `${k + 1} / ${deck.length}`;
    }
    card.addEventListener("click", () => { flipped = !flipped; show(); });
    csel.addEventListener("change", build);
    fc.append(h("div", { class: "row" }, csel, h("button", { class: "btn", text: "◀ предишна", onclick: () => { k = (k - 1 + deck.length) % deck.length; flipped = false; show(); } }),
      h("button", { class: "btn primary", text: "следваща ▶", onclick: () => { k = (k + 1) % deck.length; flipped = false; show(); } }),
      h("button", { class: "btn ghost", text: "разбъркай", onclick: build }), pos), card);
    build();

    // f) източници
    const src = root.querySelector("#src");
    SOURCES.forEach(([t, u]) => src.append(h("li", null, u ? h("a", { href: u, target: "_blank", rel: "noopener", text: t }) : t)));
  }

  S.chapter({ id: "sistematizacia", order: 11, num: "11", group: "Обобщение", title: "Систематизация и изпитни въпроси",
    lead: "Сравнителна таблица на методите, упражнение за равнищата (задача / стратегия / цена / реализация / клас), изяснени въпроси, опорен план за устния изпит, финален тест и флашкарти.",
    html, mount, algos: {} });
})();
