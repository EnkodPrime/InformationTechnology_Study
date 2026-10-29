/* Раздел 0 — карта на темата и как се използва страницата. */
(function () {
  const S = window.Study, h = S.h;

  const CHAIN = [
    { t: "Предметна област", d: "Правила: „един студент — едно име“, „една оценка за двойка студент–дисциплина“.", go: "subd" },
    { t: "Релационна схема", d: "Релации, атрибути, домейни, ограничения.", go: "relmodel" },
    { t: "Ключове", d: "Суперключ → кандидатен → първичен; външен ключ и референтна цялост.", go: "relmodel" },
    { t: "Заявки", d: "Релационна алгебра; SQL е декларативен; NULL и тризначна логика.", go: "algebra" },
    { t: "Зависимости", d: "X→Y като правило; затваряне X⁺; извеждане на ключовете.", go: "fz" },
    { t: "Нормализация", d: "Аномалии → 1НФ, 2НФ, 3НФ, BCNF, 4НФ, 5НФ; разлагане без загуба.", go: "nf123" },
    { t: "Пътят до 5НФ", d: "Едни и същи данни през всички нормални форми — какво печелим на всяка стъпка.", go: "patnf" },
    { t: "Транзакционно изпълнение", d: "ACID, изолация, индекси, възстановяване.", go: "tranzakcii" },
  ];

  const Q = [
    { q: "КАКВО пазим и КОЙ го управлява?", t: "База · СУБД · приложение", d: "Три различни обекта. Схема ≠ състояние. Концептуално → логическо → физическо моделиране.", go: "subd" },
    { q: "КАК е организирано логически?", t: "Релационен модел", d: "Релация = множество кортежи върху домейни. Ключове и референтна цялост.", go: "relmodel" },
    { q: "КАК питаме?", t: "Алгебра и SQL", d: "σ, π, ×, ⋈, ∪, −, ∩. SQL описва резултата, оптимизаторът избира плана.", go: "algebra" },
    { q: "ДОБРА ли е схемата?", t: "Зависимости и нормални форми", d: "Аномалиите идват от зависимости към части на ключ или към неключове. Нормализацията ги отстранява.", go: "fz" },
    { q: "ВЯРНО ли се изпълнява?", t: "Транзакции", d: "Всички или никакви изменения; конкурентни промени; индексът е цена срещу скорост.", go: "tranzakcii" },
  ];

  const html = `
<div class="cards" id="m-q"></div>

<div class="block">
  <h3>Нишката на темата</h3>
  <p class="prose">Ръководството подрежда изложението като една верига: <b>предметна област → релационна схема → ключове → зависимости → нормализация → транзакционно изпълнение</b>. Заявките обработват конкретни данни; нормалните форми ограничават допустимата организация на схемата. Щракни върху звено.</p>
  <div class="t6-diag" id="m-chain"></div>
  <div class="key" id="m-chain-d"></div>
</div>

<div class="block">
  <h3>Как се работи със страницата</h3>
  <div class="split">
    <div class="card"><h4>Визуализаторите</h4><p>Промени входа (таблици, зависимости, команди) и натисни <b>Изпълни</b> (или Enter). <b>◀ ▶</b> движат стъпка по стъпка, плъзгачът прескача, <b>▶ Пусни</b> върви автоматично. С фокус върху визуализатора: ← → стъпка, интервал — пусни/пауза.</p></div>
    <div class="card"><h4>C кодът</h4><p>Алгоритмите (ограничения при вмъкване, релационна алгебра, затваряне X⁺, ключове, нормални форми, разлагане, транзакции) са на C11 в папка <code>c/</code>. Подсветеният ред е текущата стъпка. SQL е показан като текст до тях — изпълнимият код е C.</p></div>
    <div class="card"><h4>Подсказките</h4><p>Подчертаните с точки понятия показват определение от речника при посочване или докосване. Бутонът <b>Речник</b> горе отваря всички термини. „?“ е хинт, „!“ е капан — честа грешка.</p></div>
    <div class="card"><h4>Цветовете</h4><p class="legend" style="display:grid;gap:4px">
      <span class="s-act"><i></i>текущ / активен</span><span class="s-cmp"><i></i>проверява се / сравнява се</span><span class="s-swap"><i></i>нарушение / конфликт</span><span class="s-done"><i></i>готово / прието</span><span class="s-piv"><i></i>ключ / специален</span></p></div>
  </div>
</div>

<div class="block">
  <h3>Обхват на тема 6</h3>
  <p class="prose">„Бази от данни. Системи за управление на бази от данни, релационен модел, нормализация.“ Разделите 1–9 следват главите 1–7 на ръководството (глави 4 и 5 са разделени на по два раздела заради алгоритмите). Раздел 10 е глава 8 — <span class="extra-tag">разширение</span>. Раздел 11 е систематизацията, изяснените въпроси и опорният план.</p>
  <p class="prose muted">Сквозният пример е от ръководството: студенти, дисциплини и записвания (<code>Student</code>, <code>Course</code>, <code>Enrollment</code>).</p>
</div>`;

  function mount(root) {
    const box = root.querySelector("#m-q");
    Q.forEach((x) => box.append(h("a", { class: "card", href: "#" + x.go, style: { textDecoration: "none", color: "inherit" } },
      h("span", { class: "eyebrow", text: x.t }), h("h4", { text: x.q }), h("p", { text: x.d }))));

    const ch = root.querySelector("#m-chain"), det = root.querySelector("#m-chain-d");
    const W = 150, GAP = 22, H = 64, cols = window.innerWidth < 600 ? 2 : 4;
    const rows = Math.ceil(CHAIN.length / cols);
    const svg = S.svg("svg", { viewBox: `0 0 ${cols * W + (cols - 1) * GAP} ${rows * H + (rows - 1) * 26}`, width: cols * W + (cols - 1) * GAP, role: "img", "aria-label": "Верига на темата" });
    const boxes = [];
    CHAIN.forEach((c, k) => {
      const r = Math.floor(k / cols), cc = k % cols;
      const x = cc * (W + GAP), y = r * (H + 26);
      if (k < CHAIN.length - 1) {
        const nr = Math.floor((k + 1) / cols), nc = (k + 1) % cols;
        if (nr === r) svg.append(S.svg("path", { class: "ln", d: `M${x + W} ${y + H / 2} L${x + W + GAP} ${y + H / 2}`, "marker-end": "" }));
        else svg.append(S.svg("path", { class: "ln", d: `M${x + W / 2} ${y + H} L${x + W / 2} ${y + H + 13} L${nc * (W + GAP) + W / 2} ${y + H + 13} L${nc * (W + GAP) + W / 2} ${nr * (H + 26)}` }));
      }
      const g = S.svg("g", { class: "box", tabindex: 0, role: "button", onclick: () => pick(k), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(k); } } },
        S.svg("rect", { x, y, width: W, height: H, rx: 6 }),
        S.svg("text", { x: x + 10, y: y + 22, text: (k + 1) + ". " + c.t.split(" ")[0] }),
        S.svg("text", { x: x + 10, y: y + 42, text: c.t.split(" ").slice(1).join(" ") }));
      boxes.push(g); svg.append(g);
    });
    ch.append(svg);
    function pick(k) {
      boxes.forEach((b, j) => b.setAttribute("class", "box " + (j === k ? "s-act" : j < k ? "s-done" : "")));
      det.innerHTML = `<p><b>${k + 1}. ${CHAIN[k].t}</b> — ${CHAIN[k].d}</p><p><a href="#${CHAIN[k].go}">→ към раздела</a></p>`;
    }
    pick(0);
  }

  S.chapter({ id: "karta", order: 0, num: "0", group: "Основа", title: "Карта на темата", lead: "Пет въпроса подреждат темата: какво пазим, как е организирано, как питаме, добра ли е схемата и вярно ли се изпълнява.", html, mount });
})();
