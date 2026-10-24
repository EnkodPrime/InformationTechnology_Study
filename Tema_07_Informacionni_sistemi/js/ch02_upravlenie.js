/* Раздел 2 — Класификация според управленското равнище (ръководство, глава 2; схеми 3 и 4). */
(function () {
  const S = window.Study, h = S.h, DG = window.DG;

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Една продажба в трите употреби (ръководство, глава 2): оперативно регистриране → месечна справка → стратегически анализ.
        Числата са учебен пример; сценарият е проста пропорция, а не прогнозен модел. */
    sale_levels({ sales, growth }) {
      const a = S.parseNums(sales, { min: 1, max: 100000, minLen: 1, maxLen: 31 });
      const g = S.int(growth, -90, 300, "Сценарият (%)");
      const F = [];
      let sum = 0;
      a.forEach((x, k) => {
        sum += x;
        F.push({ lvl: "tps", k, sum, a, msg: `<b>TPS — оперативно.</b> Регистрира се продажба №${k + 1}: ${x} лв. Всяко събитие се записва надеждно и съгласувано.`, log: `продажба ${k + 1}: ${x}`, stats: { записани: k + 1, сума: sum } });
      });
      const avg = Math.round(sum / a.length);
      F.push({ lvl: "mis", k: -1, sum, a, avg, msg: `<b>MIS — управленско.</b> Периодична справка: ${a.length} продажби, общо <b>${sum} лв.</b>, средно ${avg} лв. Детайлността пада, периодът расте.`, log: `справка: Σ=${sum}, ср.=${avg}`, stats: { записани: a.length, сума: sum } });
      const scen = Math.round(sum * (100 + g) / 100);
      F.push({ lvl: "dss", k: -1, sum, a, avg, scen, msg: `<b>DSS — анализ на вариант.</b> Сценарий „${g >= 0 ? "+" : ""}${g}% продажби“: ${sum} → <b>${scen} лв.</b> Системата показва варианта; решаващият преценява. Това е полуструктуриран проблем.`, log: `сценарий ${g}%: ${scen}`, stats: { записани: a.length, сума: sum } });
      F.push({ lvl: "ess", k: -1, sum, a, avg, scen, msg: `<b>ESS / EIS — стратегическо.</b> Обобщена картина за висшето ръководство: ще се влиза ли на нов пазар? Колкото по-обобщени са данните, толкова по-важни са <b>контекстът и качеството на източниците</b> — грешка в една продажба вече е невидима.`, log: "стратегическа картина", stats: { записани: a.length, сума: sum } });
      return { frames: F, sum, scen };
    },
  };

  /* ---------- данни ---------- */
  const LV = {
    tps: { t: "TPS", g: "tps", name: "Transaction Processing System", lvl: "Оперативно", who: "Касиери, служители, оператори", what: "Повтарящи се оперативни събития: продажби, плащания, заявки, движения на наличности.", dec: "Структурирани", data: "Отделни записи, текущи", ex: "Касова POS система", need: "Надеждно регистриране и съгласуваност." },
    mis: { t: "MIS", g: "mis", name: "Management Information System", lvl: "Управленско (средно)", who: "Ръководители на звена", what: "Обобщават оперативни данни в периодични справки и показатели.", dec: "Структурирани и полуструктурирани", data: "Обобщения за период", ex: "Месечна справка; управленски табла (Microsoft Power BI, Tableau)", need: "Правилно обобщение и период." },
    dss: { t: "DSS", g: "dss", name: "Decision Support System", lvl: "Управленско / аналитично", who: "Анализатори, решаващи лица", what: "Анализ на варианти, модели и сценарии при частично структурирани проблеми.", dec: "Полуструктурирани", data: "Модели, сценарии", ex: "Анализи в Power BI, Tableau", need: "Подпомагат решаващия, без непременно да вземат решението вместо него." },
    ess: { t: "ESS / EIS", g: "ess", name: "Executive Support / Information System", lvl: "Стратегическо", who: "Висше ръководство", what: "Обобщена картина за стратегическо управление.", dec: "Неструктурирани", data: "Силно обобщени, вкл. външни", ex: "Стратегическо табло", need: "Контекст и качество на източниците." },
  };
  const AXES = [
    { k: "lvl", t: "Управленско равнище", opts: ["оперативно", "управленско", "стратегическо"] },
    { k: "dec", t: "Структурираност на решението", opts: ["структурирано", "полуструктурирано", "неструктурирано"] },
    { k: "org", t: "Организация на обработката", opts: ["централизирана", "разпределена"] },
  ];
  const SYS = [
    { t: "Касова POS система", v: { lvl: ["оперативно"], dec: ["структурирано"], org: ["разпределена"] }, n: "TPS функции: регистрира продажбите. [допускане: каси в няколко магазина към обща система → разпределена]" },
    { t: "Месечна справка за продажбите", v: { lvl: ["управленско"], dec: ["структурирано"], org: ["централизирана"] }, n: "MIS функция: периодично обобщение. Правилото за пресмятане е ясно — структурирано. [допускане: генерира се от един централен сървър]" },
    { t: "Анализ „нов пазар“", v: { lvl: ["стратегическо"], dec: ["неструктурирано"], org: ["централизирана"] }, n: "Избор на нова бизнес посока изисква значителна човешка преценка — неструктурирано. [допускане: анализът се прави централно]" },
    { t: "Интегрирана платформа (оперативни модули + отчети + анализ)", v: { lvl: ["оперативно", "управленско", "стратегическо"], dec: ["структурирано", "полуструктурирано", "неструктурирано"], org: ["разпределена"] }, n: "Една платформа може да обслужва няколко равнища. Класификацията описва доминираща функция, а не задължително отделен продукт." },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="tps">Транзакционните системи (TPS)</dfn> обработват повтарящи се оперативни събития. <dfn data-g="mis">MIS</dfn> обобщават оперативни данни в периодични справки и показатели. <dfn data-g="dss">DSS</dfn> позволяват анализ на варианти, модели и сценарии при частично структурирани проблеми. <dfn data-g="ess">ESS</dfn> или <dfn data-g="eis">EIS</dfn> предоставят обобщена картина за стратегическо управление.</p>
</div>

<div class="block">
  <h3>Схема 3. Оперативно, управленско и стратегическо равнище</h3>
  <p class="muted">Щракни равнище. Пирамидата показва нарастващо обобщение нагоре — не четири отделни продукта.</p>
  <div id="s3"></div>
  <div class="detail" id="s3-det"></div>
  <details class="trap"><summary>Капан: „транзакционна“ = SQL BEGIN</summary><div>
    <p>Тук „транзакционна“ описва <b>вида дейност</b> — повтарящи се оперативни събития. Не трябва да се свежда само до SQL команда BEGIN (транзакциите в СУБД са тема 6).</p>
  </div></details>
  <details class="trap"><summary>Капан: класовете TPS/MIS/DSS/ESS като формални класове</summary><div>
    <p>Границите са <b>учебни категории</b> и различни автори ги организират различно; не са формални класове като <dfn data-g="p">P</dfn> и <dfn data-g="np">NP</dfn>. Конкретен продукт може да обслужва повече от едно управленско равнище.</p>
  </div></details>
</div>

<div class="block">
  <h3>Една продажба — три употреби</h3>
  <p class="prose">Една продажба се регистрира оперативно, влиза в месечна управленска справка и участва в стратегически анализ за нов пазар. Трите употреби могат да са в една платформа. От това не следва, че една и съща справка е подходяща за всички решения: различни са <b>периодът, детайлността и допустимата неопределеност</b>.</p>
  <div id="v-sale"></div>
</div>

<div class="block">
  <h3>Схема 4. Класификацията има независими оси</h3>
  <p class="prose"><dfn data-g="структурирано решение">Структурираното решение</dfn> има ясни входове и правило (изчисляване на дължимата сума). Неструктурираното изисква значителна човешка преценка (избор на нова бизнес посока). Полуструктурираното съчетава двете. Това е ос за <b>характера на решението</b>; „централизирана“ и „разпределена“ са ос за <b>организацията и разполагането</b>.</p>
  <p class="muted">Избери система — виж къде попада по всяка ос. Една система може едновременно да попадне в категории по трите оси.</p>
  <div class="chips" id="s4-sys"></div>
  <div id="s4"></div>
  <p class="mini" id="s4-note"></p>
  <div class="key">Класификацията описва <b>потребности и функции</b>, не отделни изолирани продукти. Осите са независими: „DSS“ не означава „разпределена“, „стратегическо“ не означава „неструктурирано“ по определение.</div>
</div>

<details class="hint"><summary>Хинт: DSS взема ли решението вместо човека?</summary><div>
  <p>Не по определение. Подпомагането може да предоставя модели, варианти и оценки. Автоматичното решение е отделно изискване с отделна отговорност.</p>
</div></details>`;

  function mount(root) {
    /* --- пирамида --- */
    const host = root.querySelector("#s3"), det = root.querySelector("#s3-det");
    let sel = "tps";
    function draw3() {
      host.innerHTML = "";
      const svg = DG.root(640, 300);
      const rows = [["ess", 0], ["dss", 1], ["mis", 2], ["tps", 3]];
      rows.forEach(([k, r]) => {
        const y0 = 20 + r * 65, y1 = y0 + 60, cx = 260;
        const w0 = 60 + r * 100, w1 = 60 + (r + 1) * 100;
        const g = S.svg("g", { class: "nd click " + (k === sel ? "s-act sel" : ""), tabindex: 0, role: "button", "aria-label": LV[k].t });
        g.append(S.svg("path", { class: "shape", d: `M${cx - w0 / 2},${y0} H${cx + w0 / 2} L${cx + w1 / 2},${y1} H${cx - w1 / 2} Z` }));
        g.append(S.svg("text", { x: cx, y: y0 + 28, "text-anchor": "middle", class: "ttl", text: LV[k].t }));
        g.append(S.svg("text", { x: cx, y: y0 + 46, "text-anchor": "middle", class: "sub", text: LV[k].lvl }));
        const go = () => { sel = k; draw3(); };
        g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
        svg.append(g);
      });
      DG.line(svg, [[540, 270], [540, 30]], { cls: "s-piv" });
      DG.text(svg, 555, 60, "по-обобщени", "sub", "start");
      DG.text(svg, 555, 76, "данни", "sub", "start");
      DG.text(svg, 555, 240, "отделни", "sub", "start");
      DG.text(svg, 555, 256, "събития", "sub", "start");
      DG.wrap(host, svg);
      const L = LV[sel];
      det.innerHTML = `<h4><dfn data-g="${L.g}" tabindex="0">${L.t}</dfn> — ${L.name}</h4>
        <div class="tbl-wrap"><table class="t"><tr><th>Равнище</th><td>${L.lvl}</td></tr><tr><th>Потребител</th><td>${L.who}</td></tr><tr><th>Функция</th><td>${L.what}</td></tr><tr><th>Решения</th><td>${L.dec}</td></tr><tr><th>Данни</th><td>${L.data}</td></tr><tr><th>Пример</th><td>${L.ex}</td></tr><tr><th>Важно</th><td>${L.need}</td></tr></table></div>`;
    }
    draw3();

    /* --- продажба --- */
    const ORDER = ["tps", "mis", "dss", "ess"];
    S.viz(root.querySelector("#v-sale"), {
      id: "sale", title: "От събитие до стратегическа картина", sub: "Учебни числа. Сценарият е проста пропорция, за да се види идеята „анализ на вариант“.", code: false,
      inputs: [{ id: "sales", label: "Продажби (лв.)", value: "120 80 45 200 60", width: "16em" }, { id: "growth", label: "сценарий, %", type: "number", value: 15, width: "6em" }],
      presets: [{ label: "Един ден", values: { sales: "60" } }, { label: "Спад −20%", values: { growth: -20 } }],
      random: () => ({ sales: S.randArray(S.randInt(3, 8), 20, 300).join(" "), growth: S.randInt(-30, 50) }),
      build: algos.sale_levels,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "phase-row" });
        ORDER.forEach((k) => row.append(h("span", { class: "ph " + (k === f.lvl ? "s-act" : ORDER.indexOf(k) < ORDER.indexOf(f.lvl) ? "s-done" : "s-dim"), text: LV[k].t })));
        st.append(row);
        const sub = h("div", { style: { marginTop: "12px" } });
        st.append(sub);
        if (f.lvl === "tps") {
          const cls = {}; cls[f.k] = "s-act";
          for (let j = 0; j < f.k; j++) cls[j] = "s-done";
          S.drawArray(sub, f.a, { cls, dim: (j) => j > f.k });
        } else {
          sub.append(h("div", { class: "cards" },
            h("div", { class: "card " + (f.lvl === "mis" ? "s-act" : "") }, h("span", { class: "eyebrow", text: "справка" }), h("h4", { class: "mono", text: `Σ = ${f.sum} лв.` }), h("p", { text: `${f.a.length} продажби, средно ${f.avg} лв.` })),
            f.scen != null ? h("div", { class: "card" }, h("span", { class: "eyebrow", text: "сценарий" }), h("h4", { class: "mono", text: `${f.scen} лв.` }), h("p", { text: "вариант, не решение" })) : null,
            f.lvl === "ess" ? h("div", { class: "card" }, h("span", { class: "eyebrow", text: "стратегия" }), h("h4", { text: "Нов пазар?" }), h("p", { text: "изисква човешка преценка" })) : null));
        }
      },
    });

    /* --- оси --- */
    const chips = root.querySelector("#s4-sys"), box = root.querySelector("#s4"), note = root.querySelector("#s4-note");
    let cur = 0;
    function draw4() {
      chips.innerHTML = "";
      SYS.forEach((s, k) => chips.append(h("button", { class: "chip", "aria-pressed": k === cur ? "true" : "false", text: s.t, onclick: () => { cur = k; draw4(); } })));
      box.innerHTML = "";
      const s = SYS[cur];
      AXES.forEach((A) => {
        const r = h("div", { class: "phase-row" });
        A.opts.forEach((o) => r.append(h("span", { class: "ph " + (s.v[A.k].includes(o) ? "s-act" : "s-dim"), text: o })));
        box.append(h("div", { class: "axis" }, h("b", { text: A.t }), r));
      });
      note.textContent = s.n;
    }
    draw4();
  }

  S.chapter({ id: "upravlenie", order: 2, num: "2", group: "Класификация", title: "Класификация според управленското равнище", lead: "TPS, MIS, DSS, ESS/EIS — нарастващо обобщение. Структурираност на решението като отделна ос.", html, mount, algos });
})();
