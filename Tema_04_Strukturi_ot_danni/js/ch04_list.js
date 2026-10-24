/* Раздел 4 — линеен свързан списък: едносвързан, двусвързан кръгов със сентинел, грешен ред на връзките. */
(function () {
  const S = window.Study, h = S.h;

  function parseProg(str, spec, maxOps = 30) {
    const parts = String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > maxOps) throw new Error(`Най-много ${maxOps} операции.`);
    return parts.map((p) => {
      const t = p.replace(/[()]/g, " ").trim().split(/\s+/);
      const nm = t[0].toLowerCase();
      const key = Object.keys(spec).find((k) => k === nm || (spec[k].alias || []).includes(nm));
      if (!key) throw new Error(`Непозната операция „${t[0]}“. Допустими: ${Object.keys(spec).join(", ")}.`);
      const args = t.slice(1).map((x) => { const v = Number(x); if (!Number.isInteger(v) || Math.abs(v) > 999) throw new Error(`„${x}“ в „${p}“ не е цяло число между −999 и 999.`); return v; });
      if (args.length !== spec[key].args) throw new Error(`„${key}“ очаква ${spec[key].args} аргумент(а): „${p}“.`);
      return { name: key, args, text: p };
    });
  }
  const LSPEC = { pushf: { args: 1, alias: ["push_front"] }, pushb: { args: 1, alias: ["push_back"] }, find: { args: 1, alias: ["search"] }, ins: { args: 2, alias: ["insert"] }, del: { args: 1, alias: ["delete", "remove"] } };

  const algos = {
    /** Едносвързан (mode = "single") или двусвързан кръгов със сентинел (mode = "double"). */
    list({ prog, mode }) {
      const ops = parseProg(prog, LSPEC);
      const dbl = mode === "double";
      const N = {}; let head = null, nid = 1, cmp = 0, hops = 0;
      const SID = "S";
      if (dbl) N[SID] = { v: 0, next: SID, prev: SID };
      const out = [], F = [];
      if (Object.keys(N).length > 40) throw new Error("Твърде много възли.");
      const snap = (o) => F.push(Object.assign({ dbl, st: { nodes: JSON.parse(JSON.stringify(N)), head, sentinel: dbl ? SID : null }, out: out.slice(), stats: { сравнения: cmp, "преходи p=p->next": hops } }, o));
      const firstId = () => (dbl ? N[SID].next : head);
      const isEnd = (id) => (dbl ? id === SID : id == null);
      const val = (id) => (id == null || id === SID ? "∅" : N[id].v);
      snap({ msg: dbl ? "Празен списък: S.next == S.prev == &S. Сентинелът S не е потребителски елемент." : "Празен списък: head = NULL." });

      // търсене — общо за find / ins / del(dbl)
      function find(x, tagLoop, tagCmp, tagNone, extra) {
        let i = 0;
        for (let p = firstId(); !isEnd(p); p = N[p].next, i++) {
          cmp++;
          const eq = N[p].v === x;
          snap(Object.assign({ at: [tagCmp, tagLoop].concat(extra || []), ptr: { [p]: ["p"] }, cls: { [p]: eq ? "s-done" : "s-cmp" }, vars: { x, i, "p->v": N[p].v }, msg: `p->v == x? ${N[p].v} == ${x} → <b>${eq}</b>.` }));
          if (eq) return { id: p, i };
          hops++;
        }
        snap({ at: [tagNone].concat(extra || []), vars: { x, return: dbl ? "NULL" : "NULL" }, msg: dbl ? `Върнахме се до сентинела S → ${x} липсва. Краят се разпознава по p == S, не по NULL.` : `p == NULL → ${x} липсва. Обходихме целия списък: O(n).` });
        return { id: null, i: -1 };
      }

      // двусвързано свързване след a
      function linkAfter(a, x, tag) {
        const id = nid++;
        N[id] = { v: x, next: null, prev: null };
        const cl = { [id]: "s-done" };
        snap({ at: ["dl_new", tag], cls: cl, ptr: { [a]: ["a"], [id]: ["n"] }, msg: `Нов възел n = ${x}. Свързваме го след a = ${val(a) === "∅" ? "S" : val(a)}.` });
        N[id].prev = a; snap({ at: ["dl_1", tag], cls: cl, ptr: { [a]: ["a"], [id]: ["n"] }, msg: "n->prev = a." });
        N[id].next = N[a].next; snap({ at: ["dl_2", tag], cls: cl, ptr: { [a]: ["a"], [id]: ["n"] }, msg: "n->next = a->next. Новият възел знае и двамата съседи; списъкът още не е променен." });
        N[N[a].next].prev = id; snap({ at: ["dl_3", tag], cls: cl, ptr: { [a]: ["a"], [id]: ["n"] }, msg: "a->next->prev = n — следващият вече сочи назад към n." });
        N[a].next = id; snap({ at: ["dl_4", tag], cls: cl, ptr: { [a]: ["a"], [id]: ["n"] }, msg: "a->next = n. Четири присвоявания, Θ(1), без специален случай за празен списък или край." });
      }

      ops.forEach((op, k) => {
        const log = `${k + 1}. ${op.text}`;
        if (Object.keys(N).length > 40) throw new Error("Твърде много възли (до 40).");
        if (op.name === "pushf") {
          const x = op.args[0];
          if (dbl) { snap({ at: "dpf", msg: `push_front(${x}) = свързване след S.`, log }); linkAfter(SID, x, "dpf"); return; }
          const id = nid++; N[id] = { v: x, next: null };
          snap({ at: "pf_new", cls: { [id]: "s-done" }, msg: `push_front(${x}): нов възел.`, log });
          N[id].next = head; snap({ at: "pf_link", cls: { [id]: "s-done" }, msg: "n->next = head." });
          head = id; snap({ at: "pf_head", cls: { [id]: "s-done" }, msg: "head = n. Θ(1)." });
        } else if (op.name === "pushb") {
          const x = op.args[0];
          if (dbl) { snap({ at: "dpb", msg: `push_back(${x}) = свързване след S->prev — краят е достъпен за Θ(1).`, log }); linkAfter(N[SID].prev, x, "dpb"); return; }
          const id = nid++; N[id] = { v: x, next: null };
          snap({ at: "pb_new", cls: { [id]: "s-done" }, msg: `push_back(${x}): нов възел с next = NULL.`, log });
          if (head == null) { head = id; snap({ at: "pb_empty", cls: { [id]: "s-done" }, msg: "Празен списък: head = n." }); return; }
          let p = head;
          snap({ at: "pb_start", ptr: { [p]: ["p"] }, cls: { [id]: "s-done", [p]: "s-cmp" }, msg: "Без tail указател трябва да стигнем до последния възел." });
          while (N[p].next != null) { p = N[p].next; hops++; snap({ at: "pb_walk", ptr: { [p]: ["p"] }, cls: { [id]: "s-done", [p]: "s-cmp" }, msg: `p = p->next (${N[p].v}).` }); }
          N[p].next = id; snap({ at: "pb_link", ptr: { [p]: ["p"] }, cls: { [id]: "s-done" }, msg: `p->next = n. Общо Θ(n) заради обхождането; самото свързване е Θ(1).` });
        } else if (op.name === "find") {
          const x = op.args[0];
          snap({ at: dbl ? "df_loop" : "f_loop", msg: `find(${x}): линейно търсене от началото.`, log });
          const r = dbl ? find(x, "df_loop", "df_cmp", "df_none") : find(x, "f_loop", "f_cmp", "f_none");
          out.push(String(r.i));
          if (r.id != null) snap({ at: dbl ? "df_cmp" : "f_cmp", cls: { [r.id]: "s-done" }, ptr: { [r.id]: ["p"] }, msg: `Намерено на позиция <b>${r.i}</b>.` });
        } else if (op.name === "ins") {
          const [key, x] = op.args;
          snap({ at: dbl ? "dia_find" : "ia_find", msg: `insert_after(${key}, ${x}): първо намираме P — O(n).`, log });
          const r = dbl ? find(key, "df_loop", "df_cmp", "df_none", ["dia_find"]) : find(key, "f_loop", "f_cmp", "f_none", ["ia_find"]);
          if (r.id == null) { out.push("nf"); if (!dbl) snap({ at: "ia_none", msg: `Няма възел ${key} → -1, нищо не се вмъква.` }); return; }
          const P = r.id;
          if (dbl) { linkAfter(P, x, "dia_find"); return; }
          const id = nid++; N[id] = { v: x, next: null };
          const Q = N[P].next;
          const ptr = { [P]: ["P"], [id]: ["X"] }; if (Q != null) ptr[Q] = ["Q"];
          snap({ at: "ia_new", ptr, cls: { [id]: "s-done", [P]: "s-cmp" }, msg: `Нов възел X = ${x}. Свързването оттук нататък е Θ(1).` });
          N[id].next = Q;
          snap({ at: "ia_1", ptr, cls: { [id]: "s-done", [P]: "s-cmp" }, ecls: { [id + ">"]: "s-act" }, msg: `<b>1)</b> X.next = P.next — X вече държи остатъка (${Q == null ? "NULL" : "Q = " + N[Q].v}).` });
          N[P].next = id;
          snap({ at: "ia_2", ptr, cls: { [id]: "s-done" }, ecls: { [P + ">"]: "s-act" }, msg: "<b>2)</b> P.next = X. Нито една връзка не е загубена." });
        } else if (op.name === "del") {
          const x = op.args[0];
          if (dbl) {
            snap({ at: "dd_find", msg: `delete(${x}): намираме X; предходният не е нужен — X->prev го знае.`, log });
            const r = find(x, "df_loop", "df_cmp", "df_none", ["dd_find"]);
            if (r.id == null) { out.push("nf"); return; }
            const X = r.id, Ap = N[X].prev, B = N[X].next;
            const ptr = { [X]: ["X"] };
            N[Ap].next = B; snap({ at: "dd_1", ptr, cls: { [X]: "s-swap" }, ecls: { [Ap + ">"]: "s-act" }, msg: "X->prev->next = X->next." });
            N[B].prev = Ap; snap({ at: "dd_2", ptr, cls: { [X]: "s-swap" }, ecls: { [B + "<"]: "s-act" }, msg: "X->next->prev = X->prev. X е откачен с две пренасочвания, Θ(1) (след като е намерен)." });
            N[X].freed = true; snap({ at: "dd_free", ptr, cls: { [X]: "s-dim" }, msg: "free(X). Ако X беше единствен, S.next = S.prev = S — без специален случай." });
            delete N[X];
            return;
          }
          let prev = null, cur = head;
          const pp = () => { const o = {}; if (prev != null) o[prev] = ["prev"]; if (cur != null) (o[cur] = o[cur] || []).push("cur"); return o; };
          snap({ at: "d_init", ptr: pp(), msg: `delete(${x}): prev = NULL, cur = head. Ще ни трябва предходният възел.`, log });
          while (cur != null) {
            cmp++;
            const eq = N[cur].v === x;
            snap({ at: ["d_cmp", "d_loop"], ptr: pp(), cls: { [cur]: eq ? "s-swap" : "s-cmp" }, vars: { x, "cur->v": N[cur].v }, msg: `cur->v == x? ${N[cur].v} == ${x} → <b>${eq}</b>.` });
            if (eq) break;
            prev = cur; cur = N[cur].next; hops++;
            snap({ at: "d_step", ptr: pp(), msg: "prev = cur; cur = cur->next." });
          }
          if (cur == null) { out.push("nf"); snap({ at: "d_none", ptr: pp(), msg: `${x} липсва → -1.` }); return; }
          if (prev == null) { head = N[cur].next; snap({ at: "d_head", ptr: pp(), cls: { [cur]: "s-swap" }, msg: "Изтриваме първия възел: head = cur->next (специален случай без сентинел)." }); }
          else { N[prev].next = N[cur].next; snap({ at: "d_link", ptr: pp(), cls: { [cur]: "s-swap" }, ecls: { [prev + ">"]: "s-act" }, msg: "prev->next = cur->next — прескачаме cur." }); }
          N[cur].freed = true; snap({ at: "d_free", ptr: pp(), cls: { [cur]: "s-dim" }, msg: "free(cur). След това cur не бива да се чете (use-after-free)." });
          delete N[cur];
        }
      });
      const lst = [], back = [];
      if (dbl) { for (let p = N[SID].next; p !== SID; p = N[p].next) lst.push(N[p].v); for (let p = N[SID].prev; p !== SID; p = N[p].prev) back.push(N[p].v); }
      else for (let p = head; p != null; p = N[p].next) lst.push(N[p].v);
      snap({ done: true, msg: `Край. Списък: <b>${lst.join(" → ") || "празен"}</b>. Изход: ${out.join(" ") || "—"}.${dbl ? " Обратно (по prev): " + (back.join(" → ") || "—") + "." : ""}` });
      return { frames: F, out: out.join(" ") || "-", list: lst.join(" ") || "-", back: back.join(" ") || "-", cmp, hops };
    },

    /** Грешният ред на присвояванията при вмъкване (схема 9, обратно). */
    wrong({ vals, after, x }) {
      const a = S.parseNums(vals, { minLen: 2, maxLen: 8, min: -999, max: 999 });
      after = S.int(after, -999, 999, "P");
      x = S.int(x, -999, 999, "X");
      const pi = a.indexOf(after);
      if (pi < 0) throw new Error(`Няма възел ${after} в списъка.`);
      if (pi === a.length - 1) throw new Error("Избери P, който не е последен — иначе няма остатък за губене.");
      const N = {}; a.forEach((v, i) => (N[i + 1] = { v, next: i + 2 <= a.length ? i + 2 : null }));
      const P = pi + 1, Q = pi + 2, X = 99;
      N[X] = { v: x, next: null };
      const F = [];
      const snap = (o) => F.push(Object.assign({ st: { nodes: JSON.parse(JSON.stringify(N)), head: 1 } }, o));
      snap({ ptr: { [P]: ["P"], [Q]: ["Q"], [X]: ["X"] }, cls: { [X]: "s-done" }, msg: "Нов възел X, още несвързан. Опитваме ГРЕШНИЯ ред." });
      N[P].next = X;
      const lost = {}; for (let k = Q; k <= a.length; k++) lost[k] = "s-swap";
      snap({ at: "w_1", ptr: { [P]: ["P"], [X]: ["X"] }, cls: Object.assign({ [X]: "s-done" }, lost), ecls: { [P + ">"]: "s-act" }, msg: `P.next = X. Единственият указател към Q (${a[pi + 1]}) беше P.next — <b>остатъкът е недостижим</b> (червено). В C това е изтичане на памет.` });
      N[X].next = N[P].next;
      snap({ at: "w_2", ptr: { [P]: ["P"], [X]: ["X"] }, cls: Object.assign({ [X]: "s-swap" }, lost), ecls: { [X + ">"]: "s-swap" }, done: true, msg: "X.next = P.next — но P.next вече е X, така че X сочи себе си. Обход оттук никога не стига NULL." });
      return { frames: F };
    },
  };

  function drawList(st, f) {
    st.innerHTML = "";
    const box = h("div", { class: "t4scroll" });
    T4.list(box, f.st, { ptr: f.ptr, cls: f.cls, ecls: f.ecls, double: f.dbl });
    st.append(box);
    if (f.out) st.append(h("div", { class: "t4out" }, h("span", { class: "muted", text: "изход (find → позиция, nf → няма):" }), ...(f.out.length ? f.out.map((x) => h("span", { class: "pill " + (x === "nf" || x === "-1" ? "s-swap" : ""), text: x })) : [h("span", { class: "muted", text: "—" })])));
  }

  const html = `
<div class="prose">
  <p><dfn data-g="едносвързан списък">Едносвързаният списък</dfn> се състои от <dfn data-g="възел">възли</dfn> с данни и връзка към следващия. Началният указател определя първия възел; последният сочи към празна връзка при некръговия вариант. <dfn data-g="двусвързан списък">Двусвързаният</dfn> възел има и връзка към предходния, което позволява движение в двете посоки срещу допълнителна памет и изменения.</p>
  <p>Добавяне в началото е Θ(1). Добавяне след известен възел е Θ(1) за свързването. Но ако първо трябва да се намери позицията, общата операция може да е Θ(n). Индексният достъп и търсенето по стойност в несортиран списък са O(n); списъкът няма директния индексен достъп на масива.</p>
</div>

<div class="block">
  <h3>Кутии и стрелки: вмъкване, търсене, изтриване (схеми 9 и 10)</h3>
  <p class="prose">Въведи своя програма. Всяко присвояване на указател е отделна стъпка; оранжевото име над кутия е локален указател (p, prev, cur, P, X), а стрелката, която току-що е променена, е оцветена. В двусвързания режим пунктирът е <code>prev</code>, а виолетовата кутия S е <dfn data-g="сентинел">сентинелът</dfn>.</p>
  <div id="v4-list"></div>
  <div class="key"><span class="formula">вмъкване на X след P:   X.next = P.next;   P.next = X;</span><br><span class="formula">изтриване на наследника Q:   P.next = Q.next;   free(Q);</span></div>
  <details class="hint"><summary>Хинт: защо за изтриване в едносвързан списък трябва предходният</summary><div>
    <p>Връзката, която трябва да се промени, е <b>в предходния</b> възел (prev->next). Възелът няма как да „намери“ предходния си без обхождане от началото. Затова изтриването държи двойка prev/cur. Специални случаи са първи възел (тогава се променя head), единствен възел и последен възел при поддържан tail.</p>
    <p>При двусвързан списък известен валиден възел може да се откачи чрез двете му връзки: A.next = B и B.prev = A — Θ(1), без prev/cur обхождане (обхождането е само за <i>намирането</i> по стойност).</p>
  </div></details>
  <details class="trap"><summary>Капан: „добавяне в списък е O(1)“</summary><div>
    <p>Има скрита предпоставка: мястото вече е известно. Ако трябва да се намери петстотният възел, достигането до него е O(n). Броячите горе разделят двете цени: „сравнения“ и „преходи“ са търсенето; самото свързване е 2 присвоявания (едносвързан) или 4 (двусвързан).</p>
    <p>„push_back без tail“ също е Θ(n) — пробвай с много pushb и гледай брояча на преходите.</p>
  </div></details>
</div>

<div class="block">
  <h3>Как редът на присвояванията губи списъка</h3>
  <p class="prose">Редът на присвояванията пази връзката към остатъка. Ако първо P.next се пренасочи към X и старият наследник не е запазен, част от списъка може да се загуби. След освобождаване указателят към възела не трябва да се използва.</p>
  <div id="v4-wrong"></div>
  <details class="trap"><summary>Капан: четене след free</summary><div>
    <p>За изтриване на наследника Q първо се запазва достъпът до него, P.next се насочва към Q.next и едва тогава Q се освобождава. След освобождаване четенето на Q.next е недопустимо в обичайния C/C++ модел. Типичната грешка е цикъл <code>for (p = head; p; p = p-&gt;next) free(p);</code> — <code>p-&gt;next</code> се чете след <code>free(p)</code>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Сентинел и кръгов списък</h3>
  <p class="prose">Sentinel е служебен възел, който може да унифицира граничните случаи. Той не е допълнителен потребителски елемент. <dfn data-g="кръгов списък">Кръговият свързан списък</dfn> е друг вариант: последната връзка се връща към началото или sentinel; обходът приключва при връщане до началото, а не при празен указател. Той не е кръгов масивен буфер. Думата „кръгов“ описва логическо затваряне, а механизмът на достъп остава различен.</p>
  <p class="prose">Сравни кода за двата режима горе: в едносвързания <code>s_delete</code> има отделен клон за първи възел (<code>*head = cur-&gt;next</code>), а в двусвързания със сентинел изтриването е само два реда за всички случаи. Сентинелът не премахва нуждата от инварианти: <code>S.next</code> и <code>S.prev</code> трябва винаги да сочат валидни възли.</p>
  <details class="hint"><summary>Хинт: реални контейнери</summary><div>
    <p><code>std::forward_list</code> е едносвързан списък, <code>std::list</code> е двусвързан, <code>std::vector</code> е динамичен масив. Имената на контейнерите не бива да се смесват с абстрактните операции. Двусвързаният кръгов списък със служебен възел е класическа схема (напр. в ядрото на Linux <code>list_head</code>) — но конкретната реализация на <code>std::list</code> не е задължена от стандарта.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v4-list"), {
      id: "c4list", title: "Свързан списък", sub: "операции: <code>pushf x</code>, <code>pushb x</code>, <code>find x</code>, <code>ins P X</code> (X след P), <code>del x</code>",
      code: (inp) => (inp.mode === "double" ? "ch04_double" : "ch04_single"),
      inputs: [
        { id: "prog", label: "Програма", value: "pushb 4, pushb 7, pushb 2, ins 7 5, find 2, del 4", width: "26em" },
        { id: "mode", label: "вид", type: "select", value: "single", options: [["single", "едносвързан (head)"], ["double", "двусвързан кръгов + сентинел"]] },
      ],
      presets: [
        { label: "изтриване: първи, последен", values: { prog: "pushf 3, pushf 2, pushf 1, pushb 9, del 9, del 1, find 3" } },
        { label: "празен / единствен", values: { prog: "del 5, find 1, pushb 1, del 1, ins 1 2, pushf 8" } },
        { label: "дълъг", values: { prog: "pushb 1, pushb 2, pushb 3, pushb 4, pushb 5, ins 5 6, ins 1 0, del 3, find 6" } },
      ],
      random: () => { const v = S.randArray(4, 1, 30); return { prog: v.map((x) => "pushb " + x).join(", ") + `, ins ${v[1]} ${S.randInt(31, 60)}, del ${v[S.randInt(0, 3)]}, find ${v[3]}` }; },
      legend: [["s-cmp", "сравнява се / P"], ["s-done", "нов / намерен"], ["s-swap", "откачен"], ["s-dim", "освободен"], ["s-piv", "сентинел"]],
      build: algos.list, draw: drawList,
    });
    S.viz(root.querySelector("#v4-wrong"), {
      id: "c4wrong", title: "Грешен ред: P.next = X преди X.next = P.next", sub: "Червеното е изгубено.",
      code: "ch04_wrong",
      inputs: [{ id: "vals", label: "Списък", value: "1 2 3 4", width: "12em" }, { id: "after", label: "P", type: "number", value: 2, width: "5em" }, { id: "x", label: "X", type: "number", value: 9, width: "5em" }],
      build: algos.wrong, draw: drawList,
    });
  }

  S.chapter({ id: "spisak", order: 4, num: "4", group: "Линейни структури", title: "Линеен свързан списък", lead: "Едносвързан и двусвързан списък с анимирани указатели: ред на присвояванията, цена на търсене срещу цена на свързване, сентинел.", html, mount, algos });
})();
