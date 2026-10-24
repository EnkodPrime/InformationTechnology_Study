/* Раздел 3 — Наследяване и композиция. */
(function () {
  const S = window.Study, h = S.h;

  /* Матрица на достъпа при наследяване — стойностите са ИЗЧИСЛЕНИ от компилатора в 03_inheritance.cpp (SFINAE). */
  const KINDS = ["public", "protected", "private"];
  const RULE = {
    public: { pub: "public", prot: "protected", priv: "недостъпен" },
    protected: { pub: "protected", prot: "protected", priv: "недостъпен" },
    private: { pub: "private", prot: "private", priv: "недостъпен" },
  };

  const algos = {
    /** Достъп до членовете на AB през D (наследен с kind): отвън, от D, от наследник на D; плюс upcast D* → AB*. */
    inherit_access({ kind }) {
      if (!RULE[kind]) throw new Error("Вид наследяване: public, protected или private.");
      const R = RULE[kind], F = [];
      const out = [], self = [], inside = [];
      ["pub", "prot", "priv"].forEach((m) => {
        const eff = R[m];
        out.push(eff === "public" ? 1 : 0);
        self.push(eff !== "недостъпен" ? 1 : 0);
        F.push({ m, eff, vars: { член: "AB::" + m, "вид наследяване": kind, "в D става": eff }, msg: m === "priv" ? "<code>priv</code> е private в AB — остава в базовия подобект, но D няма пряк достъп до него при <b>никакъв</b> вид наследяване." : `<code>${m}</code> (${m === "pub" ? "public" : "protected"} в AB) при ${kind} наследяване става <b>${eff}</b> в D.`, log: `${m} → ${eff}` });
      });
      ["pub", "prot"].forEach((m) => inside.push(R[m] === "public" || R[m] === "protected" ? 1 : 0));
      const up = kind === "public" ? 1 : 0;
      F.push({ m: "up", done: true, vars: { "D* → AB* отвън": up ? "да" : "не" }, msg: up ? "При public наследяване външният код може да ползва D като AB (upcast) — отношението „е вид“ е публично." : `При ${kind} наследяване външният код <b>не</b> може да преобразува D* в AB* — наследяването е детайл на реализацията, не публично „е вид“.`, log: `upcast: ${up ? "да" : "не"}` });
      return { frames: F, out: out.join(" "), self: self.join(" "), inside: inside.join(" "), up };
    },

    /** Upcast и разположение на Logger : TemperatureSensor, Clock (отместванията — от C++ програмата). */
    upcast({ target }) {
      const L = [
        { n: "Sensor::id", off: 0, sz: 4, part: "Sensor" }, { n: "TemperatureSensor::celsius", off: 4, sz: 4, part: "TemperatureSensor" },
        { n: "Clock::ticks", off: 8, sz: 8, part: "Clock" }, { n: "Logger::lines", off: 16, sz: 4, part: "Logger" }, { n: "padding", off: 20, sz: 4, part: "pad" },
      ];
      const T = { TemperatureSensor: { off: 0, parts: ["Sensor", "TemperatureSensor"], tag: "up1" }, Sensor: { off: 0, parts: ["Sensor"], tag: "up2" }, Clock: { off: 8, parts: ["Clock"], tag: "up3" } };
      const sel = target === "all" ? ["TemperatureSensor", "Sensor", "Clock"] : [target];
      if (sel.some((x) => !T[x])) throw new Error("Непознат базов тип.");
      const F = [];
      F.push({ at: "mi_field", L, sel: null, vars: { "&lg": "0x2000", "sizeof(Logger)": 24 }, msg: "Обектът <code>Logger</code> съдържа подобект <code>TemperatureSensor</code> (с подобект <code>Sensor</code>) и подобект <code>Clock</code>. Тук (Itanium C++ ABI) невиртуалните базови подобекти са преди собствените полета — стандартът не задава това разположение.", log: "Logger lg;" });
      const res = [];
      sel.forEach((s) => {
        const t = T[s];
        res.push(t.off);
        F.push({ at: t.tag, L, sel: t.parts, vars: { цел: s + "*", адрес: "0x" + (0x2000 + t.off).toString(16), отместване: t.off }, msg: t.off ? `<code>${s}* c = &amp;lg</code> — <b>адресът се променя</b> с +${t.off}: подобектът Clock не е в началото. Компилаторът добавя отместването автоматично.` : `<code>${s}* = &amp;lg</code> — подобектът е в началото, адресът е същият (+0). Upcast е безопасен и неявен при public наследяване.`, log: `${s}*: +${t.off}` });
      });
      F[F.length - 1].done = true;
      return { frames: F, result: res.join(" ") };
    },

    /** Отрязване: какво вижда всяка функция. */
    slicing({ how }) {
      const H = {
        assign: { tag: "assign", r: "Shape", copy: true, txt: "<code>Shape copy = b</code> — създава се <b>нов</b> обект Shape: копира се само базовата част (w). depth не се копира; vptr на копието сочи vtable на Shape." },
        val: { tag: ["call_val", "byval"], r: "Shape", copy: true, txt: "<code>by_value(b)</code> — параметърът е Shape по стойност: нов Shape, конструиран от базовата част на b. Вътре <code>s.name()</code> намира vtable на Shape." },
        ref: { tag: ["call_ref", "byref"], r: "Box", copy: false, txt: "<code>by_ref(b)</code> — референцията сочи <b>оригиналния</b> обект: статичен тип Shape, динамичен Box. <code>name()</code> е виртуален → Box::name." },
        ptr: { tag: ["call_ptr", "byptr"], r: "Box", copy: false, txt: "<code>by_ptr(&amp;b)</code> — указател към оригинала: както при референцията, динамичният тип се запазва." },
      };
      const seq = how === "all" ? ["assign", "val", "ref", "ptr"] : [how];
      if (seq.some((x) => !H[x])) throw new Error("Непознат начин.");
      const F = [{ at: "mk", step: null, vars: { "sizeof(Box)": 16 }, msg: "<code>Box b</code>: vptr → vtable на Box, w = 1 (от Shape), depth = 5 (производна част).", log: "Box b;" }];
      const res = [];
      seq.forEach((k) => { res.push(H[k].r); F.push({ at: H[k].tag, step: k, copy: H[k].copy, r: H[k].r, vars: { "name()": H[k].r, "нов обект?": H[k].copy ? "да" : "не" }, msg: H[k].txt, log: `${k}: ${H[k].r}` }); });
      F[F.length - 1].done = true;
      return { frames: F, result: res.join(" ") };
    },

    /** Диамант: ред на конструкторите и брой подобекти Device. */
    diamond({ virt }) {
      const v = virt === true || virt === "true" || virt === "1";
      const F = [], ev = [];
      const N = v ? ["NetV", "UsbV", "ComboV"] : ["NetA", "UsbA", "ComboA"];
      const add = (o) => { if (o.ev) ev.push(o.ev); F.push(Object.assign({}, o, { ev: ev.slice(), v })); };
      add({ at: v ? "cv" : "ca", msg: `<code>${N[2]} x;</code> — ${v ? "Net и Usb наследяват Device <b>виртуално</b>." : "Net и Usb наследяват Device обикновено."}` });
      if (v) {
        add({ at: "dev", cur: "Device", ev: "Device()", msg: "Виртуалната база се изгражда <b>първа и веднъж</b> — от най-производния клас ComboV, преди невиртуалните бази.", log: "Device()" });
        add({ at: "nv", cur: "NetV", ev: "NetV()", msg: "NetV — без собствен Device: използва споделения.", log: "NetV()" });
        add({ at: "uv", cur: "UsbV", ev: "UsbV()", msg: "UsbV — също използва споделения Device.", log: "UsbV()" });
      } else {
        add({ at: "dev", cur: "Device₁", ev: "Device()", msg: "Пътят през NetA изгражда своя Device.", log: "Device()" });
        add({ at: "na", cur: "NetA", ev: "NetA()", log: "NetA()", msg: "NetA()." });
        add({ at: "dev", cur: "Device₂", ev: "Device()", msg: "Пътят през UsbA изгражда <b>втори</b> Device.", log: "Device()" });
        add({ at: "ua", cur: "UsbA", ev: "UsbA()", log: "UsbA()", msg: "UsbA()." });
      }
      add({ at: v ? "cv" : "ca", cur: N[2], ev: N[2] + "()", log: N[2] + "()", msg: `Тялото на ${N[2]}().` });
      add({ at: v ? "one" : "amb", done: true, bad: !v, msg: v ? "Един подобект Device → <code>y.serial</code> е еднозначно." : "Два подобекта Device → <code>x.serial</code> е <b>двусмислено</b> (грешка при компилация); трябва <code>x.NetA::serial</code> или <code>x.UsbA::serial</code>.", inv: { text: `брой подобекти Device = ${v ? 1 : 2}`, ok: v } });
      return { frames: F, result: ev.join("|"), devices: v ? 1 : 2 };
    },

    /** Композиция: DataLogger събира пробите на датчика, към който държи референция. */
    compose({ seq }) {
    if (!/^[TP][1-9]$/.test(seq)) throw new Error("Вход: T или P и брой проби 1–9.");
      const kind = seq[0], n = +seq.slice(1), v = kind === "T" ? 21 : 1013, F = [];
      let sum = 0;
      F.push({ at: "c_has", vars: { src: kind === "T" ? "Temp" : "Press", sum: 0 }, k: kind, msg: `<code>DataLogger d(${kind === "T" ? "tp" : "pr"})</code> — регистраторът запазва референция към датчика. Той <b>има</b> датчик.`, log: "DataLogger d" });
      for (let i = 0; i < n; i++) {
        F.push({ at: "c_sample", vars: { i, sum }, k: kind, msg: `<code>sample()</code> → <code>src.read()</code> — виртуално извикване през ISensor&amp;.` });
        sum += v;
        F.push({ at: kind === "T" ? "c_temp" : "c_press", vars: { i, sum }, k: kind, hit: true, msg: `Изпълнява се <code>${kind === "T" ? "Temp" : "Press"}::read()</code> → ${v}. sum = ${sum}.`, log: `read → ${v}` });
      }
      F[F.length - 1].done = true;
      return { frames: F, result: sum };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="наследяване">Наследяването</dfn> създава <dfn data-g="производен клас">производен клас</dfn> от <dfn data-g="базов клас">базов</dfn>. При публично наследяване то изразява отношение <b>„е вид“</b> и позволява използване на производен обект чрез интерфейса на базовия. <dfn data-g="композиция">Композицията</dfn> изразява <b>„има“</b>: автомобилът има двигател, а електромобилът може да е вид автомобил в подходящ модел.</p>
</div>

<div class="block">
  <h3>Два вида отношения — щракни върху връзка или клас</h3>
  <div class="split">
    <div class="diag" id="rel-diag"></div>
    <div class="key" id="rel-info"></div>
  </div>
  <div id="v-compose"></div>
  <details class="hint"><summary>Хинт: композицията не изключва полиморфизма</summary><div><p><code>DataLogger</code> държи <code>const ISensor&amp;</code>. Един и същ код на регистратора работи с Temp и с Press — изборът е по динамичния тип на сочения датчик. Композицията позволява подмяна на съставните обекти без задължително наследяване. <span class="extra-tag">извън конспекта</span></p></div></details>
</div>

<div class="block">
  <h3>Принцип на заместване</h3>
  <p class="prose"><dfn data-g="принцип на заместване">Принципът на заместване</dfn> изисква клиент, работещ с базовия договор, да не бъде изненадан от производния тип. Ако Base обещава приемане на всяко неотрицателно число, Derived не бива необявено да допуска само числа над 100. Типовата съвместимост се проверява от компилатора, но поведенческите обещания изискват проект и проверки.</p>
  <details class="trap"><summary>Капан: „компилира се, значи моделът е правилен“</summary><div><p>Синтактично допустимо наследяване не доказва правилно моделиране. Ако производен клас забранява операция, която договорът на базовия обещава, заместването се нарушава. Наследяване само за получаване на готов код може да създаде неподходящи публични обещания.</p></div></details>
</div>

<div class="block">
  <h3>Обектът на производния клас съдържа базов подобект</h3>
  <p class="prose">Базовият подобект е част от производния обект. Преобразуването „нагоре“ (upcast) от <code>Logger*</code> към указател на база е неявно при public наследяване; при множествено наследяване адресът може да се отмести.</p>
  <div id="v-upcast"></div>
</div>

<div class="block">
  <h3>Достъп при public, protected и private наследяване</h3>
  <p class="prose">Публичното наследяване запазва публичните членове като публични и защитените като защитени. При protected или private наследяване достъпността им се стеснява. Частните членове на базовия остават част от базовия подобект, но производният няма пряк достъп до тях само поради наследяването. Таблицата е <b>изчислена от компилатора</b> (SFINAE проверки в <code>03_inheritance.cpp</code>), не въведена на ръка.</p>
  <div class="tbl-wrap"><table class="t mx" id="inh-mx"></table></div>
  <div id="v-inh"></div>
</div>

<div class="block">
  <h3>Отрязване на обект (object slicing)</h3>
  <p class="prose">При предаване на Derived по стойност като Base се копира само базовата част — <dfn data-g="отрязване на обект">отрязване</dfn>. Производните полета и динамичното поведение на отделения Base обект не се запазват. Референцията запазва достъп до действителния обект, чийто живот трябва да остане валиден.</p>
  <div id="v-slice"></div>
  <details class="trap"><summary>Капан: отрязването не „поврежда“ оригинала</summary><div><p>Отрязването се отнася до <b>отделения</b> базов обект (копието). Оригиналният Box е непокътнат; просто копието е истински Shape с vptr към vtable на Shape.</p></div></details>
</div>

<div class="block">
  <h3>Множествено наследяване и диамант</h3>
  <p class="prose">Множественото наследяване допуска повече базови класове. Диамантената структура може да създаде два базови подобекта; <dfn data-g="виртуално наследяване">виртуалното наследяване</dfn> позволява споделен базов подобект. То се различава от <dfn data-g="виртуален метод">виртуален метод</dfn>: едното организира подобекти, другото — динамично извикване. Наличието на едното не изисква другото.</p>
  <div id="v-diamond"></div>
  <div class="key">„Е вид“ → публично наследяване (и заместване без изненади). „Има“ → композиция. Изборът следва модела, а не универсална забрана за наследяване.</div>
</div>`;

  /* ---------- диаграма „е вид“ / „има“ ---------- */
  const NODES = { Sensor: [40, 20], TemperatureSensor: [10, 150], DataLogger: [250, 20], ISensor: [250, 150] };
  const INFO = {
    Sensor: "<b>Sensor</b> — базов клас с договор „датчик“.",
    TemperatureSensor: "<b>TemperatureSensor</b> е <b>вид</b> Sensor: публично наследяване, може да се използва навсякъде, където се очаква Sensor.",
    DataLogger: "<b>DataLogger</b> (регистратор) <b>съдържа</b> датчик — композиция. Регистраторът не е датчик. (Не го бъркай с <code>Logger</code> от схемата за upcast по-долу — той нарочно <b>наследява</b> TemperatureSensor и Clock.)",
    ISensor: "<b>ISensor</b> — абстрактен интерфейс; регистраторът държи референция към него и работи с всеки конкретен датчик.",
    inh: "Стрелка с триъгълник = наследяване, „е вид“. Производният обект съдържа базов подобект и се преобразува неявно нагоре.",
    has: "Линия с ромб = композиция, „има“. Цялото съдържа или използва частта; връзката не обещава интерфейса на частта.",
  };
  function diagram(host, info) {
    const W = 470, H = 210;
    const svg = S.svg("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Наследяване и композиция" });
    const els = {};
    const pick = (k) => { Object.values(els).forEach((e) => e.classList.remove("on")); (els[k] && els[k].classList.add("on")); if (k === "inh") els.ln1.classList.add("on"); if (k === "has") els.ln2.classList.add("on"); info.innerHTML = INFO[k]; };
    const ln1 = S.svg("path", { class: "ln", d: "M90 150 L90 66" }); els.ln1 = ln1;
    const ln2 = S.svg("path", { class: "ln has", d: "M320 66 L320 150" }); els.ln2 = ln2;
    const g1 = S.svg("g", { role: "button", tabindex: 0, onclick: () => pick("inh") }, S.svg("path", { d: "M90 150 L90 66", stroke: "transparent", "stroke-width": 16 }), ln1, S.svg("path", { class: "tri", d: "M90 50 L80 66 L100 66 Z" }), S.svg("text", { x: 98, y: 112, text: "е вид" }));
    const g2 = S.svg("g", { role: "button", tabindex: 0, onclick: () => pick("has") }, S.svg("path", { d: "M320 66 L320 150", stroke: "transparent", "stroke-width": 16 }), ln2, S.svg("path", { class: "dia", d: "M320 50 L312 58 L320 66 L328 58 Z" }), S.svg("text", { x: 328, y: 112, text: "има (const ISensor&)" }));
    svg.append(g1, g2);
    Object.entries(NODES).forEach(([k, [x, y]]) => {
      const w = k.length * 8.2 + 20;
      const r = S.svg("rect", { class: "bx", x, y, width: w, height: 32, rx: 4 });
      els[k] = r;
      svg.append(S.svg("g", { role: "button", tabindex: 0, onclick: () => pick(k), onkeydown: (e) => { if (e.key === "Enter") pick(k); } }, r, S.svg("text", { x: x + 10, y: y + 21, text: k })));
    });
    host.append(svg);
    pick("inh");
  }

  function mount(root) {
    diagram(root.querySelector("#rel-diag"), root.querySelector("#rel-info"));

    S.viz(root.querySelector("#v-compose"), {
      id: "compose", title: "Композиция: DataLogger има ISensor", sub: "Същият код на регистратора, различни датчици.",
      code: "ch03_compose",
      inputs: [{ id: "seq", label: "датчик и брой проби", type: "select", value: "T2", options: [["T2", "Temp, 2 проби"], ["P1", "Press, 1 проба"], ["T3", "Temp, 3 проби"]] }],
      build: algos.compose,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("div", { class: "objs" },
          h("div", { class: "obj s-act" }, h("div", { class: "oh", text: "DataLogger d" }), h("div", { class: "orow" }, h("span", { text: "src →" }), h("b", { text: f.k === "T" ? "Temp" : "Press" })), h("div", { class: "orow" }, h("span", { text: "sum" }), h("b", { text: String(f.vars.sum) }))),
          h("div", { class: "obj " + (f.hit ? "s-done" : "") }, h("div", { class: "oh", text: f.k === "T" ? "Temp tp" : "Press pr" }), h("div", { class: "orow", text: "read() → " + (f.k === "T" ? 21 : 1013) }))));
      },
    });

    S.viz(root.querySelector("#v-upcast"), {
      id: "upcast", title: "Logger : TemperatureSensor, Clock — разположение и upcast", sub: "Отместванията са измерени от 03_inheritance.cpp.",
      code: "ch03_layout",
      inputs: [{ id: "target", label: "преобразувай към", type: "select", value: "all", options: [["all", "всички бази"], ["TemperatureSensor", "TemperatureSensor*"], ["Sensor", "Sensor*"], ["Clock", "Clock*"]] }],
      legend: [["s-act", "подобект, към който сочи указателят"], ["s-swap", "padding"]],
      build: algos.upcast,
      draw(st, f) {
        st.innerHTML = "";
        const box = h("div", { class: "mem" });
        f.L.forEach((x) => { for (let b = 0; b < x.sz; b++) {
          const on = f.sel && f.sel.includes(x.part);
          box.append(h("div", { class: "b " + (x.part === "pad" ? "pad s-swap" : on ? "s-act" : "s-done"), title: x.n }, h("span", { class: "o", text: (x.off + b) % 4 === 0 ? x.off + b : "" }), b === 0 && x.part !== "pad" ? x.n.split("::")[1] : ""));
        } });
        st.append(box, h("p", { class: "muted", style: { fontSize: ".8rem" }, text: "Sensor::id 0–3 · TemperatureSensor::celsius 4–7 · Clock::ticks 8–15 · Logger::lines 16–19 · padding 20–23" }));
      },
    });

    // матрица за достъпа
    const mx = root.querySelector("#inh-mx");
    mx.append(h("tr", null, h("th", { text: "AB::член \\ наследяване" }), ...KINDS.map((k) => h("th", null, h("code", { text: k })))));
    [["pub", "public"], ["prot", "protected"], ["priv", "private"]].forEach(([m, t]) => {
      mx.append(h("tr", null, h("th", null, h("code", { text: t + " " + m })), ...KINDS.map((k) => { const e = RULE[k][m]; return h("td", { class: e === "недостъпен" ? "no" : e === "public" ? "ok" : "", text: e }); })));
    });
    S.viz(root.querySelector("#v-inh"), {
      id: "inh", title: "Какво става с членовете на AB в D", code: false,
      inputs: [{ id: "kind", label: "вид наследяване", type: "select", value: "public", options: KINDS }],
      build: algos.inherit_access,
      draw(st, f) {
        st.innerHTML = "";
        if (f.m === "up") { st.append(h("p", { html: f.msg })); return; }
        st.append(h("div", { class: "objs" }, h("div", { class: "obj" }, h("div", { class: "oh", text: "AB::" + f.m })), h("div", { class: "ar", style: { alignSelf: "center", font: "700 18px var(--f-mono)" }, text: "→" }),
          h("div", { class: "obj " + (f.eff === "недостъпен" ? "s-swap" : f.eff === "public" ? "s-done" : "s-cmp") }, h("div", { class: "oh", text: "в D: " + f.eff }))));
      },
    });

    S.viz(root.querySelector("#v-slice"), {
      id: "slice", title: "По стойност, по референция, по указател", sub: "Box : Shape; name() е виртуален.",
      code: "ch03_slice",
      inputs: [{ id: "how", label: "начин", type: "select", value: "all", options: [["all", "всички поред"], ["assign", "Shape copy = b"], ["val", "by_value(b)"], ["ref", "by_ref(b)"], ["ptr", "by_ptr(&b)"]] }],
      legend: [["s-act", "оригинал"], ["s-swap", "отрязано копие"], ["s-done", "достъп до оригинала"]],
      build: algos.slicing,
      draw(st, f) {
        st.innerHTML = "";
        const orig = h("div", { class: "obj " + (f.step && !f.copy ? "s-done" : "s-act") }, h("div", { class: "oh" }, h("span", { text: "Box b" }), h("span", { class: "ad", text: "0x3000" })),
          h("div", { class: "orow s-piv" }, h("span", { text: "vptr" }), h("span", { text: "→ vtable Box" })), h("div", { class: "orow" }, h("span", { text: "w" }), h("span", { text: "1" })), h("div", { class: "orow" }, h("span", { text: "depth" }), h("span", { text: "5" })));
        const row = h("div", { class: "objs" }, orig);
        if (f.step) {
          if (f.copy) row.append(h("div", { class: "obj s-swap" }, h("div", { class: "oh" }, h("span", { text: f.step === "assign" ? "Shape copy" : "Shape s (параметър)" })),
            h("div", { class: "orow s-piv" }, h("span", { text: "vptr" }), h("span", { text: "→ vtable Shape" })), h("div", { class: "orow" }, h("span", { text: "w" }), h("span", { text: "1" })), h("div", { class: "orow s-dim" }, h("span", { text: "depth" }), h("span", { text: "отрязан" }))));
          else row.append(h("div", { class: "obj s-done" }, h("div", { class: "oh", text: f.step === "ref" ? "const Shape& s" : "const Shape* s" }), h("div", { class: "orow", text: "→ 0x3000 (оригинала)" })));
          row.append(h("div", { class: "card" }, h("span", { class: "eyebrow", text: "s.name() връща" }), h("h4", { text: '"' + f.r + '"' })));
        }
        st.append(row);
      },
    });

    S.viz(root.querySelector("#v-diamond"), {
      id: "diamond", title: "Диамант: колко подобекта Device?", sub: "Следата е изходът на C++ програмата.",
      code: "ch03_diamond",
      inputs: [{ id: "virt", label: "виртуално наследяване (virtual Device)", type: "checkbox", value: false }],
      legend: [["s-act", "изгражда се"], ["s-done", "изграден"], ["s-swap", "двусмисленост"]],
      build: algos.diamond,
      draw(st, f, { frames }) {
        st.innerHTML = "";
        const W = 420, H = 190, s = S.svg("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", class: "g" });
        const done = new Set(f.ev.map((e) => e.replace("()", "")));
        const box = (x, y, t, key) => {
          const on = f.cur === key, ok = key.startsWith("Device") ? (key === "Device₂" ? f.ev.filter((e) => e === "Device()").length >= 2 : f.ev.includes("Device()")) : done.has(key);
          return S.svg("g", { class: "node " + (on ? "s-act" : ok ? "s-done" : "") }, S.svg("rect", { x, y, width: 100, height: 30, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }), S.svg("text", { x: x + 50, y: y + 20, "text-anchor": "middle", text: t }));
        };
        const N = f.v ? ["NetV", "UsbV", "ComboV"] : ["NetA", "UsbA", "ComboA"];
        const line = (x1, y1, x2, y2) => S.svg("line", { x1, y1, x2, y2, class: "edge" + (f.done && !f.v && y2 < 40 ? " s-swap" : "") });
        if (f.v) { s.append(line(80, 80, 210, 35), line(340, 80, 210, 35), box(160, 5, "Device", "Device")); }
        else { s.append(line(80, 80, 80, 35), line(340, 80, 340, 35), box(30, 5, "Device", "Device₁"), box(290, 5, "Device", "Device₂")); }
        s.append(line(80, 110, 210, 150), line(340, 110, 210, 150), box(30, 80, N[0], N[0]), box(290, 80, N[1], N[1]), box(160, 150, N[2], N[2]));
        st.append(s);
        const tl = h("div", { class: "tl" });
        frames[frames.length - 1].ev.forEach((e, i) => tl.append(h("span", { class: "ev " + (i < f.ev.length ? (i === f.ev.length - 1 ? "s-act" : "") : "fut"), text: e })));
        st.append(tl);
      },
    });
  }

  S.chapter({ id: "nasledyavane", order: 3, num: "3", group: "Типове и отношения", title: "Наследяване и композиция", lead: "„Е вид“ срещу „има“, заместване, upcast, достъп при наследяване, отрязване и диамант.", html, mount, algos });
})();
