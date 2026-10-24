/* Раздел 2 — Създаване, живот и унищожаване на обекти. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Ред на изграждане/разрушаване. bases и members — в реда на ДЕКЛАРИРАНЕ; init — редът в списъка за инициализация (само за показване). */
    order({ prog }) {
      const P = {
        d1: { cls: "Derived", bases: ["Base"], members: ["a", "b"], init: ["b", "a"], code: "ch02_order" },
        d2: { cls: "D2", bases: ["B1", "B2"], members: ["x", "y", "z"], init: ["z", "B2", "y", "B1", "x"], code: "ch02_order2" },
      }[prog];
      if (!P) throw new Error("Непозната програма.");
      const F = [], ev = [], alive = new Set();
      const bTag = (b) => (P.code === "ch02_order" ? ["b_ctor", "b_dtor"] : b === "B1" ? ["b1_ctor", "b1_dtor"] : ["b2_ctor", "b2_dtor"]);
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), alive: [...alive], P })); };
      add({ at: "scope", msg: `Влизаме в блока. Предстои <code>${P.cls} d;</code>. Списъкът за инициализация е изписан в ред <b>${P.init.join(", ")}</b> — но той <b>не</b> определя реда.` });
      add({ at: "create", msg: `Създава се <code>d</code>. Правило: първо <dfn data-g="базов клас">базовите</dfn> подобекти (в реда на изброяване след „:“), после членовете в реда на <b>декларирането</b> им, накрая тялото.`, log: `${P.cls} d;` });
      P.bases.forEach((b) => { alive.add(b); add({ at: [bTag(b)[0], P.code === "ch02_order" ? "init" : "bases"], cur: b, ev: b + "()", msg: `Базов подобект <code>${b}</code> — изгражда се пръв.`, log: `${b}()` }); });
      P.members.forEach((m, k) => { alive.add(m); add({ at: P.code === "ch02_order" ? ["m_ctor", "decl"] : "decl", cur: m, ev: `M(${m})`, msg: `Член <code>${m}</code> — ${k + 1}-ви по ред на <b>декларация</b> (в списъка за инициализация е изписан на позиция ${P.init.indexOf(m) + 1}).`, log: `M(${m})` }); });
      alive.add(P.cls);
      add({ at: "d_body", cur: P.cls, ev: P.cls + "()", msg: `Тялото на <dfn data-g="конструктор">конструктора</dfn> <code>${P.cls}()</code> се изпълнява <b>последно</b> — всички бази и членове вече съществуват.`, log: `${P.cls}()` });
      add({ at: "end", msg: "Край на обхвата: <code>d</code> е автоматичен обект и животът му свършва тук. Разрушаването е в <b>обратен</b> ред." });
      alive.delete(P.cls);
      add({ at: "d_dtor", cur: P.cls, ev: "~" + P.cls + "()", dying: true, msg: `Първо тялото на <dfn data-g="деструктор">деструктора</dfn> <code>~${P.cls}()</code> — членовете и базите още са живи и могат да се ползват.`, log: `~${P.cls}()` });
      [...P.members].reverse().forEach((m) => { alive.delete(m); add({ at: P.code === "ch02_order" ? ["m_dtor", "d_after"] : "d_after", cur: m, dying: true, ev: `~M(${m})`, msg: `Член <code>${m}</code> — членовете се унищожават в обратен ред на декларирането.`, log: `~M(${m})` }); });
      [...P.bases].reverse().forEach((b) => { alive.delete(b); add({ at: [bTag(b)[1], "d_after"], cur: b, dying: true, ev: `~${b}()`, msg: `Базов подобект <code>${b}</code> — последен.`, log: `~${b}()` }); });
      F[F.length - 1].done = true;
      return { frames: F, result: ev.join("|") };
    },

    /** RAII: където е изключението — 0 няма, 1 вътре в блока, 2 след блока. */
    raii({ where }) {
      const w = S.int(where, 0, 2, "Мястото на изключението");
      const F = [], ev = [], held = [];
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), held: held.slice() })); };
      add({ at: "call", msg: `<code>run(${w})</code> вика <code>work(${w})</code> в <code>try</code>.${w ? ` Ще има изключение ${w === 1 ? "вътре във вътрешния блок" : "след вътрешния блок"}.` : " Няма изключение."}`, log: `work(${w})` });
      held.push("L1"); add({ at: "g1", cur: "L1", ev: "acquire L1", msg: "<code>Guard lock(\"L1\")</code> — конструкторът придобива ресурса (напр. заключване). Обектът е на стека.", log: "acquire L1" });
      held.push("F1"); add({ at: "g2", cur: "F1", ev: "acquire F1", msg: "<code>Guard file(\"F1\")</code> във вътрешен блок — втори ресурс.", log: "acquire F1" });
      const unwind = (n) => {
        add({ at: n === 1 ? "thr1" : "thr2", exc: true, msg: `<code>throw ${n}</code>. Започва <b>развиване на стека</b>: всеки автоматичен обект, създаден след входа в <code>try</code>, се унищожава в обратен ред — деструкторите освобождават ресурсите.`, log: `throw ${n}` });
        while (held.length) { const r = held.pop(); add({ at: "rel", cur: r, exc: true, ev: "release " + r, msg: `<code>~Guard()</code> за ${r} — <b>${r}</b> се освобождава автоматично, без ред код в <code>work</code>.`, log: "release " + r }); }
        add({ at: "catch", ev: "catch " + n, done: true, msg: `<code>catch (int e)</code> получава ${n}. И двата ресурса вече са освободени — <dfn data-g="raii">RAII</dfn> гарантира това и при изключение.`, log: "catch " + n });
      };
      if (w === 1) { unwind(1); return { frames: F, result: ev.join("|") }; }
      add({ at: "w1", ev: "work F1", msg: "Работа с двата ресурса.", log: "work F1" });
      held.pop(); add({ at: ["close", "rel"], cur: "F1", ev: "release F1", msg: "Край на вътрешния блок: <code>file</code> излиза от обхвата → деструкторът освобождава F1.", log: "release F1" });
      if (w === 2) { unwind(2); return { frames: F, result: ev.join("|") }; }
      add({ at: "w2", ev: "work L1", msg: "Работа само с L1.", log: "work L1" });
      held.pop(); add({ at: ["ret", "rel"], cur: "L1", ev: "release L1", done: true, msg: "Край на <code>work</code>: <code>lock</code> излиза от обхвата → L1 се освобождава.", log: "release L1" });
      return { frames: F, result: ev.join("|") };
    },

    /** Правилото на петте: интерпретатор на скрипт върху Buf (същата семантика като 02_lifecycle.cpp). */
    five({ script }) {
      const st = String(script).split(";").map((x) => x.trim()).filter(Boolean);
      if (!st.length) throw new Error("Празен скрипт.");
      if (st.length > 16) throw new Error("Най-много 16 операции.");
      const vars = {}, order = [], ev = [], F = [];
      let nextId = 1;
      const heap = {};   // id -> size (жив блок)
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), objs: order.map((n) => ({ n, id: vars[n].id, sz: vars[n].sz })), heap: Object.assign({}, heap), stats: { "живи блока": Object.keys(heap).length, заделяния: nextId - 1 } })); };
      const need = (n) => { if (!vars[n]) throw new Error(`„${n}“ не е деклариран.`); return vars[n]; };
      const release = (n, at) => { const v = vars[n]; if (v.id) { delete heap[v.id]; add({ at: [at, "free"], cur: n, ev: "delete r" + v.id, msg: `<code>${n}</code> освобождава r${v.id}.`, log: `delete r${v.id}` }); v.id = 0; v.sz = 0; } };
      for (const s of st) {
        let m;
        if ((m = s.match(/^([a-z])\s*\(\s*(\d+)\s*\)$/))) {
          const [, n, k] = m; if (vars[n]) throw new Error(`„${n}“ вече е деклариран.`);
          const sz = S.int(k, 1, 99, "Размерът");
          vars[n] = { id: nextId++, sz }; order.push(n); heap[vars[n].id] = sz;
          add({ at: "ctor", cur: n, ev: "new r" + vars[n].id, msg: `<code>Buf ${n}(${sz})</code> — конструкторът заделя блок <b>r${vars[n].id}</b> с ${sz} елемента.`, log: s });
        } else if ((m = s.match(/^([a-z])\s*=\s*move\s*\(\s*([a-z])\s*\)$/))) {
          const [, d, src] = m; const sv = need(src);
          if (d === src) throw new Error("Самопреместване не се демонстрира.");
          if (!vars[d]) {
            vars[d] = { id: sv.id, sz: sv.sz }; order.push(d); sv.id = 0; sv.sz = 0;
            add({ at: "mc", cur: d, src, ev: "move r" + vars[d].id, msg: `<code>Buf ${d} = std::move(${src})</code> — <b>преместващ конструктор</b>: ${d} поема r${vars[d].id}; ${src}.p = nullptr. Без заделяне, без копиране на елементи. <code>std::move</code> само прави <code>${src}</code> „rvalue“ — не мести байтове.`, log: s });
          } else {
            add({ at: "ma", cur: d, src, msg: `<code>${d} = std::move(${src})</code> — <b>преместващо присвояване</b> към вече съществуващ обект: първо ${d} трябва да освободи своя ресурс.`, log: s });
            release(d, "ma");
            vars[d].id = sv.id; vars[d].sz = sv.sz; sv.id = 0; sv.sz = 0;
            add({ at: "ma", cur: d, src, ev: "move= r" + vars[d].id, msg: `${d} поема r${vars[d].id}; <code>${src}</code> остава валиден, но празен (тук договорът на Buf го обещава; за стандартните типове състоянието е „неуточнено“).` });
          }
        } else if ((m = s.match(/^([a-z])\s*=\s*([a-z])$/))) {
          const [, d, src] = m; const sv = need(src);
          if (d === src) throw new Error("Самоприсвояването се пропуска от проверката this != &o — не се демонстрира.");
          if (!sv.id) throw new Error(`„${src}“ е празен (преместен) — копирането му не се демонстрира.`);
          if (!vars[d]) {
            const id = nextId++; vars[d] = { id, sz: sv.sz }; order.push(d); heap[id] = sv.sz;
            add({ at: "cc", cur: d, src, ev: `copy r${sv.id}->r${id}`, msg: `<code>Buf ${d} = ${src}</code> — <b>копиращ конструктор</b>: заделя НОВ блок r${id} и копира елементите (дълбоко копие). Двата обекта са независими.`, log: s });
          } else {
            const id = nextId++; heap[id] = sv.sz;
            add({ at: "ca", cur: d, src, msg: `<code>${d} = ${src}</code> — <b>копиращо присвояване</b>: първо се заделя и копира новият блок r${id} (ако заделянето хвърли, ${d} остава непокътнат)…`, log: s });
            release(d, "ca");
            vars[d].id = id; vars[d].sz = sv.sz;
            add({ at: "ca", cur: d, src, ev: `copy= r${sv.id}->r${id}`, msg: `…после ${d} поема r${id}.` });
          }
        } else throw new Error(`Неразпозната операция „${s}“. Примери: a(3); b = a; c = move(a); b = c`);
      }
      add({ at: "dtor", msg: "Край на блока: деструкторите се извикват в <b>обратен</b> ред на създаване." });
      [...order].reverse().forEach((n) => {
        const v = vars[n];
        if (v.id) { delete heap[v.id]; add({ at: ["dtor", "free"], cur: n, ev: "delete r" + v.id, msg: `<code>~Buf()</code> на ${n}: освобождава r${v.id}.`, log: `~${n}: delete r${v.id}` }); }
        else add({ at: "dtor", cur: n, msg: `<code>~Buf()</code> на ${n}: p == nullptr (преместен) — нищо за освобождаване.`, log: `~${n}: празен` });
        v.dead = true; v.id = 0;
      });
      const last = F[F.length - 1]; last.done = true;
      last.inv = { text: "всеки блок е освободен точно веднъж", ok: Object.keys(heap).length === 0 };
      return { frames: F, result: ev.join("|") };
    },

    /** Повърхностно копие: компилаторът копира адреса — два деструктора освобождават един блок. */
    shallow({ script }) {
      const st = String(script).split(";").map((x) => x.trim()).filter(Boolean);
      if (!st.length || st.length > 10) throw new Error("Между 1 и 10 операции.");
      const vars = {}, order = [], ev = [], F = [], freed = new Set();
      let nextId = 1, doubles = 0;
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), objs: order.map((n) => ({ n, id: vars[n].id })), freed: [...freed], stats: { "двойни освобождавания": doubles } })); };
      for (const s of st) {
        let m;
        if ((m = s.match(/^([a-z])\s*\(\s*(\d+)\s*\)$/))) {
          if (vars[m[1]]) throw new Error(`„${m[1]}“ вече е деклариран.`);
          vars[m[1]] = { id: nextId++ }; order.push(m[1]);
          add({ at: "s_ctor", cur: m[1], ev: "new r" + vars[m[1]].id, msg: `<code>Shallow ${m[1]}(${m[2]})</code> — заделя r${vars[m[1]].id}.`, log: s });
        } else if ((m = s.match(/^([a-z])\s*=\s*([a-z])$/))) {
          if (vars[m[1]]) throw new Error("Тук се демонстрира само копиращ конструктор (нова променлива).");
          if (!vars[m[2]]) throw new Error(`„${m[2]}“ не е деклариран.`);
          vars[m[1]] = { id: vars[m[2]].id }; order.push(m[1]);
          add({ at: "s_copy", cur: m[1], src: m[2], msg: `<code>Shallow ${m[1]} = ${m[2]}</code> — неявният копиращ конструктор копира <b>полето p</b>, т.е. адреса. Сега ${m[1]} и ${m[2]} сочат <b>един и същ</b> блок r${vars[m[1]].id}.`, inv: { text: "всеки блок има един притежател", ok: false }, log: s });
        } else throw new Error(`Неразпозната операция „${s}“. Примери: a(3); b = a`);
      }
      [...order].reverse().forEach((n) => {
        const id = vars[n].id;
        if (freed.has(id)) {
          doubles++;
          add({ at: ["s_dtor", "s_double"], cur: n, bad: true, ev: "DOUBLE delete r" + id, msg: `<code>~Shallow()</code> на ${n}: r${id} <b>вече е освободен</b>. Повторното <code>delete[]</code> е недефинирано поведение (ASan: <i>attempting double-free</i>). Програмата в <code>c/</code> само го отбелязва, без да го изпълнява.`, log: `~${n}: DOUBLE delete r${id}` });
        } else {
          freed.add(id);
          add({ at: ["s_dtor", "s_free"], cur: n, ev: "delete r" + id, msg: `<code>~Shallow()</code> на ${n}: освобождава r${id}.`, log: `~${n}: delete r${id}` });
        }
      });
      F[F.length - 1].done = true;
      return { frames: F, result: ev.join("|"), doubles };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="конструктор">Конструкторът</dfn> установява началното състояние. Списъкът за инициализация инициализира базовите подобекти и полетата <b>преди</b> тялото на конструктора. <dfn data-g="деструктор">Деструкторът</dfn> изпълнява освобождаване при приключване на живота. Инициализацията създава началното състояние на обект, а присвояването променя вече съществуващ обект.</p>
</div>

<div class="block">
  <h3>Ред на изграждане и разрушаване</h3>
  <p class="prose">Реалният ред на инициализация на полетата е редът на <b>декларирането</b> им в класа, а не редът, в който са изписани в списъка. Ако B зависи от A, декларациите трябва да отразяват това. Разрушаването е точно обратно. Стъпките по-долу са следата, която отпечатва <code>02_lifecycle.cpp</code>.</p>
  <div id="v-order"></div>
  <details class="hint"><summary>Хинт: защо редът е фиксиран от декларациите</summary><div>
    <p>Един клас може да има няколко конструктора с различни списъци за инициализация, но <b>един</b> деструктор. За да разрушава в обратен ред, деструкторът трябва да знае единствен ред на изграждане — този на декларациите. g++ с <code>-Wall</code> предупреждава с <code>-Wreorder</code>, когато списъкът е изписан в друг ред (в примера предупреждението е изрично изключено, за да се демонстрира).</p>
  </div></details>
  <details class="trap"><summary>Капан: член, инициализиран от друг член</summary><div><p><code>struct X { int n; int m; X() : m(5), n(m * 2) {} };</code> — <code>n</code> се инициализира пръв (деклариран е пръв), докато <code>m</code> още няма стойност. Списъкът не променя реда.</p></div></details>
</div>

<div class="block">
  <h3>RAII — ресурсът живее колкото обекта</h3>
  <p class="prose"><dfn data-g="raii">RAII</dfn> (Resource Acquisition Is Initialization) свързва притежанието на ресурс с живота на обект: конструкторът придобива ресурса, деструкторът го освобождава. Ресурс може да бъде памет, файл или заключване. Автоматичен обект се унищожава при напускане на областта му, включително при нормално развиване на стека след изключение. Реални реализации: <code>std::unique_ptr</code> притежава обект, <code>std::lock_guard</code> управлява заключване на мютекс, <code>std::fstream</code> — файлов поток.</p>
  <div id="v-raii"></div>
  <details class="hint"><summary>Хинт: защо името „Acquisition Is Initialization“</summary><div><p>Името акцентира върху придобиването в инициализацията, но практическата полза е предвидимото <b>освобождаване</b>: няма път през функцията (return, break, изключение), по който деструкторът да бъде пропуснат.</p></div></details>
</div>

<div class="block">
  <h3>Копиране и преместване — правилото на петте</h3>
  <p class="prose"><dfn data-g="копиране">Копирането</dfn> създава или присвоява стойност от съществуващ обект, а <dfn data-g="преместване">преместването</dfn> позволява прехвърляне на ресурсите му. <code>Buf</code> притежава масив и затова дефинира и петте специални операции. Опиши скрипт и проследи кой блок кой обект притежава.</p>
  <div id="v-five"></div>
  <details class="hint"><summary>Хинт: правилото на нулата</summary><div><p>Ако класът държи ресурса в <code>std::vector&lt;int&gt;</code> или <code>std::unique_ptr&lt;int[]&gt;</code> вместо в суров указател, той не дефинира нито една от петте операции — генерираните правилно копират/местят членовете. Това е <dfn data-g="правило на нулата">правилото на нулата</dfn>, което ръководството препоръчва. <code>std::unique_ptr</code> може да се премества, но не допуска копиране.</p></div></details>
  <details class="trap"><summary>Капан: „след std::move обектът е празен“</summary><div><p>Не е задължително. За много стандартни типове преместеният обект остава валиден, но с <b>неуточнено</b> състояние, освен когато конкретният договор обещава повече. Може да се унищожи или да му се присвои нова стойност, но не бива да се предполага старото му съдържание. <code>std::move</code> само по себе си не мести байтове — то променя категорията на израза.</p></div></details>
</div>

<div class="block">
  <h3>Повърхностно копие на притежаващ указател</h3>
  <p class="prose">Копиране на обект със суров притежаващ указател може да копира само адреса. После два деструктора опитват да освободят един ресурс. За притежаващ ресурс е нужен изричен договор: дълбоко копие, споделяне или забрана на копието.</p>
  <div id="v-shallow"></div>
</div>

<div class="block">
  <h3>const и static</h3>
  <div class="split">
    <div class="card"><h4>const метод</h4><p>Ограничава промените през текущия обект според езиковите правила. Не означава, че цялата програма или всички достижими обекти са неизменяеми — например обект, сочен от член-указател, може да се променя.</p></div>
    <div class="card"><h4><dfn data-g="статичен член">Статичен член</dfn></h4><p>Принадлежи към класа, а не е отделно поле във всеки обект. Не се брои в <code>sizeof</code> на обекта.</p></div>
  </div>
  <div class="key">Конструктор: бази → членове (ред на декларация) → тяло. Деструктор: тяло → членове (обратно) → бази (обратно). Срокът на живота и редът на разрушаване са част от правилността.</div>
</div>`;

  function timeline(st, all, k, cls) {
    const tl = h("div", { class: "tl" });
    all.forEach((e, i) => tl.append(h("span", { class: "ev " + (i < k ? (i === k - 1 ? cls || "s-act" : "") : "fut"), text: e })));
    st.append(h("div", { class: "lane" }, h("span", { class: "lbl", text: "следа на програмата" }), tl));
  }

  function mount(root) {
    S.viz(root.querySelector("#v-order"), {
      id: "order", title: "Конструктори и деструктори при наследяване", sub: "Следата долу е редът, отпечатан от C++ програмата.",
      code: (i) => (i.prog === "d2" ? "ch02_order2" : "ch02_order"),
      inputs: [{ id: "prog", label: "програма", type: "select", value: "d1", options: [["d1", "Derived : Base, членове a, b"], ["d2", "D2 : B1, B2, членове x, y, z"]] }],
      legend: [["s-act", "създава се"], ["s-swap", "унищожава се"], ["s-done", "жив"]],
      build: algos.order,
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const P = f.P, all = frames[frames.length - 1].ev;
        const parts = P.bases.concat(P.members.map((m) => m), [P.cls]);
        const obj = h("div", { class: "obj" + (f.alive.length || f.cur ? "" : " gone") }, h("div", { class: "oh" }, h("span", { text: P.cls + " d" })));
        parts.forEach((p) => {
          const isM = P.members.includes(p);
          const live = f.alive.includes(p);
          let cls = live ? "s-done" : "";
          if (f.cur === p) cls = f.dying ? "s-swap" : "s-act";
          obj.append(h("div", { class: "orow " + cls + (!live && f.cur !== p ? " s-dim" : "") }, h("span", { text: p === P.cls ? "тяло " + P.cls + "()" : isM ? "член M " + p : "база " + p }), h("span", { text: live ? "жив" : f.cur === p && f.dying ? "†" : "—" })));
        });
        const initRow = h("div", { class: "card" }, h("span", { class: "eyebrow", text: "списък за инициализация (както е изписан)" }), h("p", { class: "mono", text: ": " + P.init.map((x) => (P.members.includes(x) ? x + '("' + x + '")' : x + "()")).join(", ") }),
          h("span", { class: "eyebrow", text: "действителен ред" }), h("p", { class: "mono", text: P.bases.concat(P.members).join(" → ") + " → тяло" }));
        st.append(h("div", { class: "objs" }, obj, initRow));
        timeline(st, all, f.ev.length, f.dying ? "s-swap" : "s-act");
      },
    });

    S.viz(root.querySelector("#v-raii"), {
      id: "raii", title: "RAII и развиване на стека", sub: "Ресурсите се освобождават и при изключение.",
      code: "ch02_raii",
      inputs: [{ id: "where", label: "изключение", type: "select", value: "1", options: [["0", "няма"], ["1", "вътре в блока (throw 1)"], ["2", "след блока (throw 2)"]] }],
      legend: [["s-act", "придобит"], ["s-swap", "развиване на стека"], ["s-done", "освободен"]],
      build: algos.raii,
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const stack = h("div", { class: "objs" });
        ["L1", "F1"].forEach((r) => {
          const live = f.held.includes(r);
          let cls = live ? "s-act" : "s-done";
          if (f.cur === r && f.exc) cls = "s-swap";
          stack.append(h("div", { class: "obj " + cls + (live || f.cur === r ? "" : " gone") }, h("div", { class: "oh" }, h("span", { text: "Guard " + (r === "L1" ? "lock" : "file") })), h("div", { class: "orow" }, h("span", { text: "ресурс " + r }), h("b", { text: live ? "държи" : "свободен" }))));
        });
        st.append(stack);
        if (f.exc) st.append(h("p", { class: "warn", text: "изключение в полет — търси се catch, стекът се развива" }));
        timeline(st, frames[frames.length - 1].ev, f.ev.length, f.exc ? "s-swap" : "s-act");
      },
    });

    const drawOwn = (st, f, frames, opts) => {
      st.innerHTML = "";
      const row = h("div", { class: "objs" });
      f.objs.forEach((o) => {
        let cls = o.id ? "" : "s-dim";
        if (f.cur === o.n) cls = f.bad ? "s-swap" : "s-act";
        if (f.src === o.n) cls = "s-cmp";
        row.append(h("div", { class: "obj " + cls }, h("div", { class: "oh" }, h("span", { text: (opts.cls || "Buf") + " " + o.n })),
          h("div", { class: "orow" }, h("span", { text: "p →" }), h("b", { text: o.id ? "r" + o.id : "nullptr" })),
          o.sz != null ? h("div", { class: "orow" }, h("span", { text: "n" }), h("span", { text: String(o.sz) })) : null));
      });
      st.append(h("div", { class: "lane" }, h("span", { class: "lbl", text: "обекти на стека" }), row));
      const heapRow = h("div", { class: "objs" });
      if (opts.heap) {
        const ids = Object.keys(f.heap);
        if (!ids.length) heapRow.append(h("span", { class: "muted", text: "няма живи блокове" }));
        ids.forEach((id) => {
          const owners = f.objs.filter((o) => String(o.id) === id).map((o) => o.n);
          heapRow.append(h("div", { class: "obj " + (owners.length === 1 ? "s-done" : "s-swap") }, h("div", { class: "oh", text: "r" + id }), h("div", { class: "orow", text: `${f.heap[id]} int · притежател: ${owners.join(", ") || "—"}` })));
        });
      } else {
        const ids = [...new Set(f.objs.map((o) => o.id))];
        ids.forEach((id) => {
          const owners = f.objs.filter((o) => o.id === id).map((o) => o.n);
          const fr = f.freed.includes(id);
          heapRow.append(h("div", { class: "obj " + (fr ? "s-swap" : owners.length > 1 ? "s-cmp" : "s-done") + (fr ? " gone" : "") }, h("div", { class: "oh", text: "r" + id }), h("div", { class: "orow", text: (fr ? "освободен · " : "") + "сочен от: " + owners.join(", ") })));
        });
      }
      st.append(h("div", { class: "lane", style: { marginTop: "12px" } }, h("span", { class: "lbl", text: "динамична памет" }), heapRow));
      timeline(st, frames[frames.length - 1].ev, f.ev.length, f.bad ? "s-swap" : "s-act");
    };

    S.viz(root.querySelector("#v-five"), {
      id: "five", title: "Притежание при копиране и преместване", sub: "Операции: <code>a(3)</code> създава; <code>b = a</code> копира; <code>c = move(a)</code> премества. Ако лявата страна вече съществува — присвояване.",
      code: "ch02_five",
      inputs: [{ id: "script", label: "скрипт", value: "a(3); b = a; c = move(a); b = c; c = move(b)", width: "min(30em, 100%)" }],
      presets: [{ label: "Присвояване", values: { script: "a(2); b(4); a = b; b = move(a)" } }, { label: "Премести, после копирай", values: { script: "a(3); b = move(a); c = b" } }],
      legend: [["s-act", "текущ обект"], ["s-cmp", "източник"], ["s-done", "блок с 1 притежател"], ["s-dim", "празен (преместен)"]],
      build: algos.five,
      draw: (st, f, { frames }) => drawOwn(st, f, frames, { heap: true }),
    });

    S.viz(root.querySelector("#v-shallow"), {
      id: "shallow", title: "Неявно копие = копие на адреса", sub: "Класът <code>Shallow</code> не дефинира копиране.",
      code: "ch02_shallow",
      inputs: [{ id: "script", label: "скрипт", value: "a(3); b = a", width: "18em" }],
      presets: [{ label: "Три обекта", values: { script: "a(3); b(2); c = a" } }],
      legend: [["s-cmp", "споделен блок"], ["s-swap", "двойно освобождаване"]],
      build: algos.shallow,
      draw: (st, f, { frames }) => drawOwn(st, f, frames, { cls: "Shallow", heap: false }),
    });
  }

  S.chapter({ id: "zhivot", order: 2, num: "2", group: "Основа", title: "Създаване, живот и унищожаване", lead: "Ред на конструкторите и деструкторите, RAII при изключение, копиране и преместване на собственост.", html, mount, algos });
})();
