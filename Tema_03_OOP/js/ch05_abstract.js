/* Раздел 5 — Абстрактни класове и работещият пример Shape / Rectangle. */
(function () {
  const S = window.Study, h = S.h;
  /* като printf("%g") / ostream по подразбиране: 6 значещи цифри, експоненциален запис при X < -4 или X >= 6 */
  const g6 = (v) => { if (v === 0) return Object.is(v, -0) ? "-0" : "0"; const [m, ex] = v.toExponential(5).split("e"), X = Number(ex);
    if (X < -4 || X >= 6) return m.replace(/\.?0+$/, "") + "e" + (X < 0 ? "-" : "+") + String(Math.abs(X)).padStart(2, "0");
    const f = v.toFixed(5 - X); return f.includes(".") ? f.replace(/\.?0+$/, "") : f; };
  const fmt = g6;

  const algos = {
    /** Скрипт "R 3 4; T 3 4; Q 2" → конструктори, total(), разрушаване от последния към първия (vector::pop_back). */
    shapes({ script }) {
      const parts = String(script).split(";").map((x) => x.trim()).filter(Boolean);
      if (!parts.length) throw new Error("Празен списък.");
      if (parts.length > 6) throw new Error("Най-много 6 фигури.");
      const shapes = [];
      parts.forEach((p) => {
        const m = p.match(/^([RTQ])\s+([\d.]+)(?:\s+([\d.]+))?$/i);
        if (!m) throw new Error(`„${p}“: пиши R w h (правоъгълник), T a b (правоъгълен триъгълник) или Q s (квадрат).`);
        const k = m[1].toUpperCase(), a = Number(m[2]), b = m[3] != null ? Number(m[3]) : null;
        if (!Number.isFinite(a) || a > 1000 || (b != null && (!Number.isFinite(b) || b > 1000))) throw new Error("Размерите са числа до 1000.");
        if (k === "Q" && b != null) throw new Error("Квадратът има един размер: Q s.");
        if (k !== "Q" && b == null) throw new Error(`„${p}“: нужни са два размера.`);
        shapes.push(k === "R" ? { k, cls: "Rectangle", a, b, area: a * b, chain: ["Rectangle"] } : k === "T" ? { k, cls: "Triangle", a, b, area: (a * b) / 2, chain: ["Triangle"] } : { k, cls: "Square", a, b: a, area: a * a, chain: ["Rectangle", "Square"] });
      });
      const F = [], ev = [];
      const live = [];
      const add = (o) => { if (o.ev) [].concat(o.ev).forEach((e) => ev.push(e)); F.push(Object.assign({}, o, { ev: ev.slice(), live: live.map((x) => x.i), shapes })); };
      add({ at: "noinst", msg: "<code>Shape</code> е <dfn data-g=\"абстрактен клас\">абстрактен</dfn>: има <dfn data-g=\"чисто виртуален метод\">чисто виртуална</dfn> <code>area() = 0</code>. <code>Shape s;</code> не се компилира — но <code>unique_ptr&lt;Shape&gt;</code> и <code>Shape&amp;</code> са допустими.", log: "vector<unique_ptr<Shape>> v" });
      shapes.forEach((s, i) => {
        live.push({ i });
        const tags = s.k === "R" ? "r_ctor" : s.k === "T" ? "t_ctor" : ["r_ctor", "q_ctor"];
        add({ at: tags, cur: i, ev: s.chain, msg: `<code>make_unique&lt;${s.cls}&gt;(${s.k === "Q" ? s.a : s.a + ", " + s.b})</code>${s.k === "Q" ? " — Square е final наследник на Rectangle: първо се изгражда Rectangle(s, s), после тялото на Square" : ""}. Абстрактната база Shape няма видимо съобщение в конструктора.`, log: s.chain.join(", ") });
      });
      let sum = 0;
      shapes.forEach((s, i) => {
        add({ at: "loop", cur: i, vars: { "p.get()": s.cls, s: fmt(sum) }, msg: `<code>p->area()</code>: статичният тип на <code>p</code> е <code>unique_ptr&lt;Shape&gt;</code>, динамичният — ${s.cls}.` });
        sum += s.area;
        add({ at: s.k === "T" ? "t_area" : "r_area", cur: i, hit: true, vars: { "area()": fmt(s.area), s: fmt(sum) }, msg: `Изпълнява се <code>${s.k === "T" ? "Triangle" : "Rectangle"}::area()</code>${s.k === "Q" ? " (Square не я предефинира — наследена от Rectangle)" : ""} → ${fmt(s.area)}. Сума ${fmt(sum)}.`, log: `${s.cls}: ${fmt(s.area)}` });
      });
      add({ at: "ret", ev: "total=" + fmt(sum), vars: { total: fmt(sum) }, msg: `<code>total()</code> = <b>${fmt(sum)}</b>. Общият код не познава нито един конкретен вид фигура.`, log: "total = " + fmt(sum) });
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        live.pop();
        const dt = s.k === "Q" ? ["~Square", "~Rectangle", "~Shape"] : s.k === "R" ? ["~Rectangle", "~Shape"] : ["~Triangle", "~Shape"];
        add({ at: [s.k === "Q" ? "q_dtor" : s.k === "R" ? "r_dtor" : "t_dtor", "vdtor"], cur: i, dying: true, ev: dt, msg: `unique_ptr унищожава ${s.cls} през <code>Shape*</code>. Деструкторът на Shape е <b>виртуален</b> → извиква се ${dt.join(" → ")}: производната част преди базовата.`, log: dt.join(", ") });
      }
      F[F.length - 1].done = true;
      return { frames: F, result: ev.join("|"), total: fmt(sum) };
    },

    /** Изтриване през базов указател: виртуален деструктор / защитен невиртуален / невиртуален (UB). */
    del({ mode }) {
      const F = [], ev = [];
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), mode })); };
      if (mode === "virtual") {
        add({ at: "new", parts: ["BaseV", "DerV"], msg: "<code>BaseV* p = new DerV</code> — статичен тип BaseV*, динамичен DerV. DerV държи ресурс (vector)." });
        add({ at: "del", parts: ["BaseV", "DerV"], msg: "<code>delete p</code>: деструкторът е виртуален → намира се през vtable на действителния обект." });
        add({ at: "dv", parts: ["BaseV"], gone: "DerV", ev: "~DerV", msg: "<code>~DerV()</code> — производната част (и нейният vector) се разрушава първа.", log: "~DerV" });
        add({ at: "bv", parts: [], gone: "BaseV", ev: "~BaseV", done: true, msg: "<code>~BaseV()</code> — базовата част последна. Паметта се освобождава с правилния размер.", log: "~BaseV", inv: { text: "пълно разрушаване", ok: true } });
      } else if (mode === "protected") {
        add({ at: "auto", parts: ["BaseP", "DerP"], msg: "Алтернативен договор: <code>~BaseP()</code> е <b>protected</b> и невиртуален. Обектът се създава и унищожава като DerP." });
        add({ at: "forbid", parts: ["BaseP", "DerP"], msg: "<code>delete q</code> през <code>BaseP*</code> <b>не се компилира</b> — договорът забранява изтриването през базовия интерфейс. Критерият е разрешеният начин на употреба.", inv: { text: "грешната употреба е невъзможна", ok: true } });
        add({ at: "dp", parts: ["BaseP"], gone: "DerP", ev: "~DerP", msg: "Край на обхвата: <code>~DerP()</code>.", log: "~DerP" });
        add({ at: "bp", parts: [], gone: "BaseP", ev: "~BaseP", done: true, msg: "<code>~BaseP()</code> — достъпен от производния клас, затова е наред.", log: "~BaseP" });
      } else if (mode === "ub") {
        add({ at: "ub", parts: ["BaseN", "DerN"], bad: true, msg: "Публичен <b>невиртуален</b> деструктор и <code>delete</code> през базов указател: <b>недефинирано поведение</b>. На практика обикновено се вика само ~BaseN и ресурсът на DerN изтича — но езикът не обещава нищо. g++ -Wall предупреждава (<code>-Wdelete-non-virtual-dtor</code>) само ако класът има други виртуални функции — за BaseN без тях няма предупреждение; програмата в <code>c/</code> нарочно не го изпълнява.", inv: { text: "недефинирано поведение", ok: false }, done: true });
      } else throw new Error("Непознат режим.");
      return { frames: F, result: ev.join("|") };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="абстрактен клас">Абстрактният клас</dfn> има поне една <dfn data-g="чисто виртуален метод">чисто виртуална функция</dfn>, за която крайната реализация остава чисто виртуална. Не могат да се създават непосредствени обекти от него, но могат да се използват указатели и референции. Той може да има полета, конструктор и невиртуални методи; не е задължително да бъде само празен интерфейс (тук <code>describe()</code> е невиртуален метод в абстрактния Shape).</p>
  <p>В C++ „интерфейс“ обикновено е проектна роля, а не отделна ключова дума. В Java <code>interface</code> има собствен езиков договор — терминът не бива да се пренася механично между езиците.</p>
</div>

<div class="block">
  <h3>Работещият пример: Shape и Rectangle</h3>
  <p class="prose">Примерът от ръководството свързва абстракция, наследяване, виртуален метод и безопасно управление на живота. <code>std::unique_ptr&lt;Shape&gt; p = std::make_unique&lt;Rectangle&gt;(3, 4); p-&gt;area()</code> дава <b>12</b>. Тук е разширен с Triangle и Square — опиши свой списък.</p>
  <div id="v-shapes"></div>
  <details class="hint"><summary>Хинт: как да обясниш „защо 12“</summary><div>
    <p>Типът на <code>p</code> е <code>unique_ptr&lt;Shape&gt;</code> — компилаторът разрешава само интерфейса на Shape. Действителният обект е Rectangle(3, 4). <code>area()</code> е виртуална → динамичното свързване стига до <code>Rectangle::area</code> → 3 × 4 = 12. При излизане от обхвата unique_ptr вика <code>delete</code> през <code>Shape*</code>; деструкторът на Shape е виртуален, затова се разрушава целият Rectangle.</p>
    <p>За учебна краткост примерът приема валидни размери. При пълен модел конструкторът трябва да установява договор за отрицателни или невалидни стойности — това е отделен въпрос от механизма на полиморфизма.</p>
  </div></details>
</div>

<div class="block">
  <h3>Разрушаване през базов указател</h3>
  <p class="prose">При <code>delete</code> през <code>Base*</code> обичайният полиморфен модел изисква виртуален базов деструктор; последователността разрушава производната част преди базовата. Публичен невиртуален деструктор не е безопасна универсална основа за такова изтриване. Възможен алтернативен договор е защитен невиртуален деструктор, който забранява изтриването през базовия интерфейс.</p>
  <div id="v-del"></div>
  <details class="trap"><summary>Капан: „абстрактен клас = празен интерфейс“</summary><div><p>Не. Абстрактният клас може да има полета, конструктори и реализирани методи. Абстрактен е, защото поне една чисто виртуална функция остава без окончателна реализация.</p></div></details>
  <div class="key">Абстрактен клас ⇒ няма непосредствени обекти, но има указатели и референции. Полиморфно изтриване ⇒ виртуален деструктор (или защитен невиртуален, който го забранява).</div>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-shapes"), {
      id: "shapes", title: "Общ код върху абстрактен интерфейс", sub: "R w h · T a b (правоъгълен триъгълник) · Q s (квадрат), разделени с „;“.",
      code: "ch05_shapes",
      inputs: [{ id: "script", label: "фигури", value: "R 3 4; T 3 4; Q 2", width: "16em" }],
      presets: [{ label: "Примерът (R 3 4)", values: { script: "R 3 4" } }, { label: "Q 5; T 1 1", values: { script: "Q 5; T 1 1" } }, { label: "T 6 2; R 0.5 4", values: { script: "T 6 2; R 0.5 4" } }],
      legend: [["s-act", "текущ обект"], ["s-done", "изпълнено area()"], ["s-swap", "разрушава се"]],
      build: algos.shapes,
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const row = h("div", { class: "objs" });
        f.shapes.forEach((s, i) => {
          const live = f.live.includes(i);
          let cls = i === f.cur ? (f.dying ? "s-swap" : f.hit ? "s-done" : "s-act") : "";
          row.append(h("div", { class: "obj " + cls + (live || i === f.cur ? "" : " gone") }, h("div", { class: "oh" }, h("span", { text: "v[" + i + "]" }), h("span", { class: "ad", text: s.cls })),
            h("div", { class: "orow s-piv" }, h("span", { text: "vptr" }), h("span", { text: "→ " + s.cls })), h("div", { class: "orow" }, h("span", { text: "area()" }), h("b", { text: fmt(s.area) }))));
        });
        st.append(row);
        const tl = h("div", { class: "tl", style: { marginTop: "10px" } });
        frames[frames.length - 1].ev.forEach((e, i) => tl.append(h("span", { class: "ev " + (i < f.ev.length ? (i === f.ev.length - 1 ? (f.dying ? "s-swap" : "s-act") : "") : "fut"), text: e })));
        st.append(tl);
      },
    });

    S.viz(root.querySelector("#v-del"), {
      id: "del", title: "Три договора за деструктора", code: "ch05_delete",
      inputs: [{ id: "mode", label: "базов деструктор", type: "select", value: "virtual", options: [["virtual", "public virtual"], ["protected", "protected, невиртуален"], ["ub", "public, невиртуален (грешка)"]] }],
      legend: [["s-act", "жива част"], ["s-swap", "UB / разрушава се"]],
      build: algos.del,
      draw(st, f) {
        st.innerHTML = "";
        const names = f.mode === "virtual" ? ["BaseV", "DerV"] : f.mode === "protected" ? ["BaseP", "DerP"] : ["BaseN", "DerN"];
        const obj = h("div", { class: "obj " + (f.bad ? "s-swap" : "") }, h("div", { class: "oh", text: "обект " + names[1] }));
        names.forEach((n) => obj.append(h("div", { class: "orow " + (f.parts && f.parts.includes(n) ? "s-act" : f.gone === n ? "s-swap" : "s-dim") }, h("span", { text: n === names[0] ? "базова част " + n : "производна част " + n }), h("span", { text: f.parts && f.parts.includes(n) ? "жива" : f.gone === n ? "† сега" : f.bad ? "?" : "—" }))));
        st.append(obj);
      },
    });
  }

  S.chapter({ id: "abstraktni", order: 5, num: "5", group: "Полиморфизъм", title: "Абстрактни класове и работещ пример", lead: "Чисто виртуални функции, Shape → Rectangle, виртуален деструктор и изтриване през базов указател.", html, mount, algos });
})();
