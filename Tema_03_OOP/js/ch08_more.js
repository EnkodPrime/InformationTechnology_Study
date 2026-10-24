/* Раздел 8 — Допълнение и типични грешки: време на съхранение, четирите смесвания, concepts, GC срещу RAII. */
(function () {
  const S = window.Study, h = S.h;

  const algos = {
    /** Живот на обекти с различно време на съхранение — следата на 08_storage.cpp (включително след main). */
    storage() {
      const F = [], ev = [], live = new Set();
      const add = (o) => { if (o.ev) { ev.push(o.ev); const n = o.ev.slice(1); if (o.ev[0] === "+") live.add(n); else if (o.ev[0] === "-") live.delete(n); } F.push(Object.assign({}, o, { ev: ev.slice(), live: [...live] })); };
      add({ at: "global", ev: "+global", phase: "преди main", msg: "Глобален обект — <b>статично</b> време на съхранение. Конструира се преди <code>main</code>.", log: "+global" });
      add({ at: "main", ev: "main", phase: "main", msg: "Влизаме в <code>main</code>.", log: "main" });
      add({ at: "call1", phase: "f(1)", msg: "<code>f(1)</code>." });
      add({ at: "auto", ev: "+auto", phase: "f(1)", msg: "<code>T a</code> — <b>автоматично</b> време на съхранение: живее до края на блока (стек).", log: "+auto" });
      add({ at: "static", ev: "+static", phase: "f(1)", msg: "<code>static T s</code> — статично <b>локално</b>: конструира се при <b>първото</b> минаване и живее до края на програмата.", log: "+static" });
      add({ at: "thread", ev: "+thread", phase: "f(1)", msg: "<code>thread_local T t</code> — <b>нишково</b>: по един обект на нишка, живее колкото нишката.", log: "+thread" });
      add({ at: "body", ev: "f1", phase: "f(1)", msg: "Тяло на f(1); k ≠ 2, затова няма динамичен обект.", log: "f1" });
      add({ at: "f_end", ev: "-auto", phase: "f(1)", msg: "Край на f: само автоматичният <code>a</code> се унищожава. static и thread_local остават.", log: "-auto" });
      add({ at: "call2", phase: "f(2)", msg: "<code>f(2)</code>." });
      add({ at: "auto", ev: "+auto", phase: "f(2)", msg: "Нов автоматичен <code>a</code> — нов обект при всяко извикване.", log: "+auto" });
      add({ at: "static", phase: "f(2)", msg: "<code>static T s</code> — вече е създаден: <b>не</b> се конструира отново." });
      add({ at: "thread", phase: "f(2)", msg: "<code>thread_local T t</code> — същата нишка, вече съществува." });
      add({ at: "heap", ev: "+heap", phase: "f(2)", msg: "<code>make_unique&lt;T&gt;</code> — <b>динамично</b> време на съхранение, но притежавано от <code>unique_ptr</code> (RAII).", log: "+heap" });
      add({ at: "heap_end", ev: "-heap", phase: "f(2)", msg: "Край на блока: <code>unique_ptr</code> освобождава динамичния обект.", log: "-heap" });
      add({ at: "body", ev: "f2", phase: "f(2)", log: "f2", msg: "Тяло на f(2)." });
      add({ at: "f_end", ev: "-auto", phase: "f(2)", msg: "Край на f(2): ~auto.", log: "-auto" });
      add({ at: "raw", ev: "+raw", phase: "main", msg: "<code>new T</code> със суров указател — животът свършва само при изричен <code>delete</code>.", log: "+raw" });
      add({ at: "raw_del", ev: "-raw", phase: "main", msg: "<code>delete raw</code>.", log: "-raw" });
      add({ at: "main_end", ev: "end main", phase: "main", msg: "Край на main.", log: "end main" });
      add({ at: "main_end", ev: "-thread", phase: "след main", msg: "Нишката main приключва: thread_local обектът се унищожава.", log: "-thread" });
      add({ at: "main_end", ev: "-static", phase: "след main", msg: "Статичните обекти — в обратен ред на завършване на конструирането: първо локалният static…", log: "-static" });
      add({ at: "global", ev: "-global", phase: "след main", done: true, msg: "…накрая глобалният (създаден пръв). Обектността не определя сама къде и колко дълго съществува паметта.", log: "-global" });
      return { frames: F, result: ev.join("|") };
    },
  };

  const MIX = [
    { a: "клас", b: "обект", t: "Клас с обект", why: "Класът е тип (описание), обектът е екземпляр с идентичност, състояние и живот. „Класът Account има баланс 100“ е грешно изречение — обект с баланс 100.", go: "model" },
    { a: "капсулиране", b: "raii", t: "Достъп с притежание", why: "private/public казват <b>кой код може да пипа</b> члена. Притежанието казва <b>кой е отговорен да освободи</b> ресурса. Частно поле-указател може да не притежава нищо; публичен unique_ptr притежава.", go: "zhivot" },
    { a: "претоварване", b: "предефиниране на метод", t: "Претоварване с динамично предефиниране", why: "Претоварването е избор по аргументите при компилация; предефинирането е избор по динамичния тип при изпълнение. Еднакво име в наследник може да е и скриване.", go: "virtualni" },
    { a: "наследяване", b: "композиция", t: "Наследяване с композиция", why: "„Е вид“ срещу „има“. Регистраторът съдържа датчик, но не е датчик. Наследяване само за готов код създава неподходящи публични обещания.", go: "nasledyavane" },
  ];

  const html = `
<div class="block">
  <h3>Четирите смесвания</h3>
  <p class="prose">При представяне на темата трябва да се избягват четири смесвания. Качеството на обектния модел зависи от ясни договори и валидни състояния, а не от броя използвани класове. Щракни карта.</p>
  <div class="cards" id="mix"></div>
  <div class="key" id="mix-why"></div>
</div>

<div class="block">
  <h3>Обектът винаги ли е в динамичната памет? Не.</h3>
  <p class="prose">В C++ има обекти с автоматично, статично, нишково и динамично време на съхранение. Стъпките са следата на <code>08_storage.cpp</code>, включително унищожаването <b>след</b> края на <code>main</code> (програмата я печата от деструктора на статичен обект, създаден преди всички останали).</p>
  <div id="v-storage"></div>
  <details class="hint"><summary>Хинт: животът на обекта ≠ животът на ресурса ≠ физическото освобождаване</summary><div><p><dfn data-g="обект">Обектът</dfn> може да е свършил, а паметта да не е върната на ОС (алокаторът я пази). Ресурсът (файл, заключване) може да бъде освободен преди края на обекта (напр. <code>close()</code>). Трябва да се разграничават, както при файловете в тема 2.</p></div></details>
</div>

<div class="block">
  <h3>Събиране на отпадъци и RAII</h3>
  <p class="prose">Събирането на отпадъци управлява достижимостта и освобождаването на <b>памет</b> в определени среди. То не замества автоматично своевременното затваряне на файл или освобождаване на заключване. <dfn data-g="raii">RAII</dfn> свързва освобождаването с края на обхвата — предвидимо.</p>
</div>

<div class="block">
  <h3>Връзки със структури от данни</h3>
  <p class="prose">Контейнерът е обект, но организираните от него елементи следват собствена структура. <code>std::vector</code> е конкретен динамичен масив; „списък“ в естествения език не доказва свързана реализация. Премахването на елемент може да обезсили итератори според договора. Итераторът е абстракция за достъп и движение, а не непременно суров указател. Обектният интерфейс не определя автоматично сложността на операцията (тема 4, тема 5).</p>
</div>

<div class="block">
  <h3>Допълнения</h3>
  <div class="split">
    <div class="card"><h4>concepts <span class="extra-tag">извън конспекта</span></h4><p>Съвременният C++ (C++20) предлага <code>concepts</code> за изразяване на ограничения върху шаблонни параметри — напр. „T има &lt;“. Това е допълнение, а не условие за разбиране на основния конспект. Кодът тук е C++17, затова изискванията са описани в коментар.</p></div>
    <div class="card"><h4>Шаблонен метод не може да е виртуален</h4><p>Шаблонът се инстанцира при компилация за всеки използван тип; виртуалната таблица има фиксиран брой слотове, известен при дефиницията на класа. Двата механизма имат различни правила и момент на избор.</p></div>
    <div class="card"><h4>Композиция за подмяна <span class="extra-tag">извън конспекта</span></h4><p>Композицията позволява подмяна на съставни обекти без задължително наследяване. Виртуалното извикване в C++ често се реализира с таблица от указатели, но езиковата семантика не изисква точно тази реализация (виж <code>04_vtable.c</code>).</p></div>
  </div>
  <details class="trap"><summary>Капан: „ООП = много класове“</summary><div><p>Качеството на обектния модел зависи от ясни договори и валидни състояния. Обект не е задължителна кутия около всяка функция.</p></div></details>
</div>`;

  function mount(root) {
    const box = root.querySelector("#mix"), why = root.querySelector("#mix-why");
    const btns = MIX.map((M, i) => h("button", { class: "card", "aria-pressed": i === 0 ? "true" : "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: "смесване " + (i + 1) }), h("h4", { text: M.t })));
    box.append(...btns);
    function pick(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const M = MIX[i];
      why.innerHTML = `<p><dfn data-g="${M.a}" tabindex="0">${M.a}</dfn> ≠ <dfn data-g="${M.b}" tabindex="0">${M.b}</dfn></p><p>${M.why}</p><p><a href="#${M.go}">→ раздела</a></p>`;
    }
    pick(0);

    S.viz(root.querySelector("#v-storage"), {
      id: "storage", title: "Четири времена на съхранение", code: "ch08_storage",
      legend: [["s-act", "създава се сега"], ["s-done", "жив"], ["s-swap", "унищожава се"]],
      build: () => algos.storage(),
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const kinds = [["global", "статично (глобален)"], ["static", "статично (локален static)"], ["thread", "нишково"], ["auto", "автоматично"], ["heap", "динамично (unique_ptr)"], ["raw", "динамично (new/delete)"]];
        const last = f.ev[f.ev.length - 1] || "";
        const row = h("div", { class: "objs" });
        kinds.forEach(([k, t]) => {
          const live = f.live.includes(k);
          const cls = last === "+" + k ? "s-act" : last === "-" + k ? "s-swap" : live ? "s-done" : "";
          row.append(h("div", { class: "obj " + cls + (live || cls ? "" : " gone") }, h("div", { class: "oh", text: k }), h("div", { class: "orow", text: t })));
        });
        st.append(h("p", { class: "eyebrow", text: "фаза: " + f.phase }), row);
        const tl = h("div", { class: "tl", style: { marginTop: "10px" } });
        frames[frames.length - 1].ev.forEach((e, i) => tl.append(h("span", { class: "ev " + (i < f.ev.length ? (i === f.ev.length - 1 ? "s-act" : "") : "fut"), text: e })));
        st.append(tl);
      },
    });
  }

  S.chapter({ id: "dopalnenie", order: 8, num: "8", group: "Обобщение", title: "Допълнение и типични грешки", lead: "Четирите смесвания, време на съхранение, GC срещу RAII, concepts.", html, mount, algos });
})();
