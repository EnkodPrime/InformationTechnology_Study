/* Раздел 9 — Транзакции, индекси и възстановяване (глава 7). */
(function () {
  const S = window.Study, h = S.h;

  const algos = {
    transfer({ a, b, amount, crash }) {
      a = S.int(a, 0, 1e6, "Баланс A"); b = S.int(b, 0, 1e6, "Баланс B");
      amount = S.int(amount, 1, 1e6, "Сумата");
      crash = +crash;
      const bal = [a, b], log = [], F = [];
      let undone = 0;
      const snap = (o) => ({ bal: bal.slice(), log: log.map((x) => ({ ...x })), sum: bal[0] + bal[1], ...o });
      F.push(snap({ at: "t_begin", msg: `BEGIN. Инвариант на бизнес правилото: A + B = ${a + b}.` }));
      F.push(snap({ at: "t_check", msg: `Ограничение: A ≥ сумата? ${bal[0]} ≥ ${amount} → ${bal[0] >= amount}.` }));
      const rollback = (why) => {
        F.push(snap({ at: "t_undo", msg: `${why} <b>ROLLBACK</b>: възстановяваме старите стойности от журнала в обратен ред.` }));
        while (log.length) { const e = log.pop(); bal[e.acc] = e.old; undone++; F.push(snap({ at: "t_undo", msg: `${"AB"[e.acc]} := ${e.old}.`, log: `undo ${"AB"[e.acc]} = ${e.old}` })); }
        F.push(snap({ at: "t_abort", done: true, msg: "Транзакцията е отменена — <b>никакви</b> изменения.", inv: { text: `A + B = ${bal[0] + bal[1]} (непроменено)`, ok: bal[0] + bal[1] === a + b } }));
      };
      if (bal[0] < amount) { rollback("Недостатъчен баланс."); return { frames: F, ok: 0, bal, undone }; }
      log.push({ acc: 0, old: bal[0] });
      F.push(snap({ at: "t_log1", msg: `Журнал: старото A = ${bal[0]}.`, log: `log A = ${bal[0]}` }));
      bal[0] -= amount;
      F.push(snap({ at: "t_w1", hl: 0, msg: `A := A − ${amount} = ${bal[0]}. Междинно състояние: A + B = ${bal[0] + bal[1]} — <b>правилото е временно нарушено</b>.`, inv: { text: `A + B = ${bal[0] + bal[1]} ≠ ${a + b}`, ok: false } }));
      if (crash === 1) { F.push(snap({ at: "t_crash1", crash: true, msg: "<b>Срив</b> след първия запис." })); rollback("Ако първото действие остане само, се нарушава бизнес правилото."); return { frames: F, ok: 0, bal, undone }; }
      log.push({ acc: 1, old: bal[1] });
      F.push(snap({ at: "t_log2", msg: `Журнал: старото B = ${bal[1]}.`, log: `log B = ${bal[1]}` }));
      bal[1] += amount;
      F.push(snap({ at: "t_w2", hl: 1, msg: `B := B + ${amount} = ${bal[1]}.` }));
      if (crash === 2) { F.push(snap({ at: "t_crash2", crash: true, msg: "<b>Срив</b> преди COMMIT — двата записа са направени, но не са потвърдени." })); rollback("Непотвърдената транзакция се отменя изцяло."); return { frames: F, ok: 0, bal, undone }; }
      F.push(snap({ at: "t_commit", done: true, msg: "<b>COMMIT</b>. Изменението е потвърдено; устойчивостта се отнася до потвърдените изменения при зададения модел за откази.", inv: { text: `A + B = ${bal[0] + bal[1]}`, ok: bal[0] + bal[1] === a + b } }));
      return { frames: F, ok: 1, bal, undone };
    },

    schedule({ sched, x0, d1, d2, mode }) {
      x0 = S.int(x0, 0, 1e6, "Началният баланс");
      const d = [0, S.int(d1, 0, 1e6, "d1"), S.int(d2, 0, 1e6, "d2")];
      mode = +mode;
      const ops = String(sched).trim().split(/\s+/).filter(Boolean);
      if (!ops.length) throw new Error("Празно разписание.");
      ops.forEach((o) => { if (!/^[RWC][12]$/.test(o)) throw new Error(`„${o}“: операциите са R1 W1 C1 R2 W2 C2.`); });
      for (const t of [1, 2]) {
        const seq = ops.filter((o) => +o[1] === t).map((o) => o[0]).join("");
        if (seq !== "RWC") throw new Error(`T${t} трябва да има точно R${t}, W${t}, C${t} в този ред (сега: ${seq || "нищо"}).`);
      }
      let x = x0, lock = 0, waits = 0;
      const local = [0, 0, 0], done = ops.map(() => false), F = [], exec = [];
      const snap = (o) => ({ ops, done: done.slice(), x, local: local.slice(), lock, exec: exec.slice(), stats: { чакания: waits }, vars: { x, "T1.local": mode === 1 ? "—" : local[1], "T2.local": mode === 1 ? "—" : local[2], lock: lock ? "T" + lock : "свободно" }, ...o });
      const names = ["read–modify–write", "атомарна UPDATE x = x − d", "изключително заключване до COMMIT"];
      F.push(snap({ at: "s_next", msg: `x = ${x0}. T1 намалява с ${d[1]}, T2 — с ${d[2]}. Очакван резултат при последователно изпълнение: <b>${x0 - d[1] - d[2]}</b>. Режим: ${names[mode]}.` }));
      let left = ops.length;
      while (left > 0) {
        let progressed = false;
        for (let k = 0; k < ops.length; k++) {
          if (done[k]) continue;
          const t = +ops[k][1], kind = ops[k][0];
          if (ops.some((o, j) => j < k && !done[j] && +o[1] === t)) continue;
          if (mode === 2 && kind === "R" && lock && lock !== t) {
            waits++;
            F.push(snap({ at: "s_wait", cur: k, wait: true, msg: `${ops[k]}: x е заключено от T${lock} — T${t} <b>чака</b>.`, log: `${ops[k]} чака` }));
            continue;
          }
          let msg;
          if (kind === "R") {
            if (mode === 2) lock = t;
            if (mode !== 1) { local[t] = x; msg = `T${t} чете x = ${x}${mode === 2 ? " и заключва x" : ""}.`; }
            else msg = `T${t}: при атомарната команда отделното четене няма ефект — четенето и записът са една стъпка.`;
            F.push(snap({ at: mode === 2 ? ["s_lock", "s_read"] : mode === 1 ? "s_next" : "s_read", cur: k, msg, log: `${ops[k]}: ${mode === 1 ? "—" : "x = " + x}` }));
          } else if (kind === "W") {
            if (mode === 1) { x = x - d[t]; msg = `T${t}: UPDATE x = x − ${d[t]} → x = <b>${x}</b> (прочита текущото x в момента на записа).`; }
            else { const old = x; x = local[t] - d[t]; msg = `T${t} записва x = local − ${d[t]} = ${local[t]} − ${d[t]} = <b>${x}</b>.${local[t] !== old ? ` <b>Внимание:</b> T${t} е прочела ${local[t]}, а x вече беше ${old} — промяната на другата транзакция се губи.` : ""}`; }
            F.push(snap({ at: mode === 1 ? "s_atomic" : "s_write", cur: k, msg, log: `${ops[k]}: x = ${x}` }));
          } else {
            if (lock === t) lock = 0;
            F.push(snap({ at: "s_commit", cur: k, msg: `T${t} COMMIT${mode === 2 ? " — освобождава заключването" : ""}.`, log: `${ops[k]}` }));
          }
          exec.push(ops[k]);
          done[k] = true; left--; progressed = true;
          break;
        }
        if (!progressed) break;
      }
      const ok = x === x0 - d[1] - d[2];
      F.push(snap({ at: "s_end", done: true, msg: ok ? `Краен x = ${x} — съответства на последователно изпълнение.` : `Краен x = ${x}, а трябва ${x0 - d[1] - d[2]}: <b>загубено обновяване</b>. Транзакционната граница сама по себе си не го предотврати.`, inv: { text: `x = ${x}; изпълнен ред: ${exec.join(" ")}`, ok } }));
      return { frames: F, x, waits };
    },

    index({ keys, probe, mode }) {
      const K = S.parseNums(keys, { minLen: 1, maxLen: 24, min: -999, max: 999 });
      if (new Set(K).size !== K.length) throw new Error("Ключовете трябва да са различни (UNIQUE).");
      const p = S.int(probe, -999, 999, "Търсеният ключ");
      const F = [];
      if (mode === "insert") {
        const idx = [];
        let total = 0;
        K.forEach((k) => {
          let i = idx.length, mv = 0;
          while (i > 0 && idx[i - 1] > k) { i--; mv++; }
          idx.splice(i, 0, k); total += mv;
          F.push({ at: mv ? ["ix_shift", "ix_put"] : "ix_put", table: K, idx: idx.slice(), put: i, msg: `Вмъкваме ${k} в таблицата и в индекса: ${mv} отместени елемента в индекса.`, stats: { "отмествания общо": total }, log: `+${k}: ${mv} отм.` });
        });
        F.push({ at: "ix_put", table: K, idx, done: true, msg: `Изградихме индекса за ${K.length} реда с <b>${total}</b> отмествания. Това е цената за поддръжка: всяко INSERT/UPDATE/DELETE на ключ променя и индекса. (Реалните СУБД използват B-дървета, но цената при изменение остава.)`, stats: { "отмествания общо": total } });
        return { frames: F, moves: total };
      }
      const idx = K.slice().sort((a, b) => a - b);
      if (mode === "scan") {
        let c = 0, r = -1;
        for (let i = 0; i < K.length; i++) {
          c++;
          const hit = K[i] === p;
          F.push({ at: hit ? ["ix_scan", "ix_hit"] : "ix_scan", table: K, cur: i, hit, msg: `Ред ${i}: ${K[i]} ${hit ? "=" : "≠"} ${p}.`, stats: { сравнения: c } });
          if (hit) { r = i; break; }
        }
        F.push({ table: K, cur: r, hit: r >= 0, done: true, msg: `Последователно четене: ${c} сравнения${r < 0 ? " — при липсващ ключ винаги всички n" : ""}.`, stats: { сравнения: c } });
        return { frames: F, result: r, cmp: c };
      }
      let lo = 0, hi = idx.length - 1, c = 0, r = -1;
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1);
        c++;
        const hit = idx[mid] === p;
        F.push({ at: hit ? ["ix_bs", "ix_found"] : "ix_bs", idx, lo, hi, mid, hit, msg: `Индекс[${mid}] = ${idx[mid]} ${hit ? "=" : idx[mid] < p ? "<" : ">"} ${p}.`, stats: { сравнения: c } });
        if (hit) { r = mid; break; }
        if (idx[mid] < p) lo = mid + 1; else hi = mid - 1;
      }
      F.push({ idx, mid: r, hit: r >= 0, done: true, msg: `Индекс: ${c} сравнения (≈ log₂ ${idx.length} = ${Math.log2(idx.length).toFixed(1)}). Оптимизаторът може все пак да избере последователно четене, ако очаква по-евтино (напр. малка таблица или голяма част от редовете).`, stats: { сравнения: c } });
      return { frames: F, found: r >= 0 ? 1 : 0, cmp: c };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="транзакция">Транзакцията</dfn> е логическа единица работа. <dfn data-g="acid">ACID</dfn> означава атомарност, съгласуваност, изолация и устойчивост. <dfn data-g="атомарност">Атомарността</dfn> гарантира всички или никакви изменения в рамките на транзакцията; <dfn data-g="съгласуваност">съгласуваността</dfn> зависи и от правилно зададените ограничения и приложна логика. <dfn data-g="изолация">Изолацията</dfn> определя допустимото взаимодействие с конкурентни транзакции, а <dfn data-g="дълготрайност">устойчивостта</dfn> се отнася до потвърдените изменения при зададения модел за откази.</p>
</div>

<div class="block">
  <h3>Схема 14 · Четирите свойства ACID</h3>
  <div class="cards" id="acid"></div>
  <div class="key" id="acid-d"></div>
</div>

<div class="block">
  <h3>Превод между сметки — атомарност</h3>
  <p class="prose">Превод между сметки включва намаляване и увеличаване на баланс. Ако първото действие остане само, се нарушава бизнес правилото. Моделът по-долу използва журнал за отмяна (undo log): преди всеки запис пази старата стойност; при срив или отказ я възстановява. Това е учебен модел на идеята, не описание на конкретна СУБД.</p>
  <div id="v-tr"></div>
</div>

<div class="block">
  <h3>Изолация и едновременни промени</h3>
  <p class="prose">Две транзакции могат да прочетат баланс 100 и независимо да запишат 90 и 80. Ако желаните две намалявания са 10 и 20, крайното 80 е загубило едното. Транзакционната граница сама по себе си не означава, че избраната изолация и начин на обновяване предотвратяват тази аномалия. Нужно е да се разгледат атомарната команда, заключванията и гаранциите на конкретната СУБД. Транзакционните граници и защитата от конкурентни изменения са необходими <b>едновременно</b>.</p>
  <div id="v-sc"></div>
  <details class="hint"><summary>MVCC и serializable</summary><div>
    <p><dfn data-g="mvcc">MVCC</dfn> поддържа версии, за да позволи четене на подходящо видимо състояние при конкурентни промени. Това не премахва всички заключвания и не дава еднакъв резултат при всички нива на изолация. <dfn data-g="serializable">Serializable</dfn> гарантира поведение, съответстващо на <i>някакво</i> последователно изпълнение; приложението може да трябва да повтори отхвърлена транзакция. Snapshot не е общ синоним на serializable.</p>
  </div></details>
  <details class="trap"><summary>Капан: „по-силна изолация“ без цена</summary><div><p>По-силните нива на изолация ограничават повече аномалии, но конкретните реализации и разходи се различават. Режим „заключване“ по-горе показва цената: T2 чака.</p></div></details>
</div>

<div class="block">
  <h3>Индекси — скорост срещу цена</h3>
  <p class="prose"><dfn data-g="индекс">Индексът</dfn> ускорява определени достъпи срещу място и цена за поддръжка при изменение. B-дърветата и сродни структури поддържат наредени диапазони; хеш индексът е ориентиран към равенство. Оптимизаторът може да не използва индекс, ако очаква по-евтино последователно четене. UNIQUE индекс или ограничение може да участва и в гарантиране на уникалност. Индексните структури са в Тема 4.</p>
  <div id="v-ix"></div>
  <div class="key">Нормализацията организира <b>логическите зависимости</b>; индексирането организира <b>достъпа</b>. Добавянето на индекс не премахва аномалията от повтарящо се име на катедра в десет хиляди реда.</div>
</div>

<div class="block">
  <h3>Схема 15 · Резервно копие, журнал и реплика</h3>
  <p class="prose">Трите механизма имат различни цели. Избери инцидент и виж кой механизъм помага.</p>
  <div class="row" id="rec-btn"></div>
  <div class="tbl-wrap"><table class="t" id="rec-tab"></table></div>
  <div class="key" id="rec-d"></div>
  <details class="trap"><summary>Капан: „имаме реплика, значи имаме резервно копие“</summary><div><p>Реплика може да повтори погрешно изтриване. Репликацията сама по себе си не пази старите данни при коректно изпълнена грешна команда. Възстановяването изисква подходяща комбинация и проверима процедура.</p></div></details>
</div>`;

  const ACID = [
    ["A", "Atomicity", "Атомарност", "атомарност", "Всички или никакви изменения в рамките на транзакцията. Преводът: или и двете сметки се променят, или нито една."],
    ["C", "Consistency", "Съгласуваност", "съгласуваност", "Коректна транзакция запазва зададените ограничения. Зависи и от правилно зададените ограничения и приложна логика — СУБД не знае правило, което никой не е задал."],
    ["I", "Isolation", "Изолация", "изолация", "Допустимото взаимодействие с конкурентни транзакции. Има нива с различно допустимо взаимодействие."],
    ["D", "Durability", "Устойчивост", "дълготрайност", "Потвърдените изменения оцеляват при зададения модел за откази."],
  ];
  const REC = [
    { k: "crash", t: "Срив на сървъра посред транзакции", m: ["—", "✓ възстановява потвърденото, отменя непотвърденото", "✓ поема работата"], d: "Журналът подпомага възстановяване според съответната технология; репликата осигурява продължение на работата." },
    { k: "delete", t: "Погрешно DELETE, коректно изпълнено и потвърдено", m: ["✓ предишно състояние", "зависи от технологията (възстановяване до момент)", "✗ повтаря изтриването"], d: "Репликацията сама по себе си не пази старите данни при коректно изпълнена грешна команда." },
    { k: "disk", t: "Загубен диск", m: ["✓", "само ако журналът е запазен другаде", "✓"], d: "Нито един механизъм не заменя автоматично останалите." },
  ];

  function mount(root) {
    const ac = root.querySelector("#acid"), ad = root.querySelector("#acid-d");
    const bs = ACID.map(([L, en, bg, g, d], i) => {
      const b = h("button", { class: "card", "aria-pressed": "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: en }), h("h4", { style: { fontSize: "1.6rem" }, text: L }), h("p", { text: bg }));
      ac.append(b); return b;
    });
    function pick(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); const [, en, bg, g, d] = ACID[i]; ad.innerHTML = `<p><b><dfn data-g="${g}" tabindex="0">${bg}</dfn></b> (${en}) — ${d}</p>`; }
    pick(0);

    S.viz(root.querySelector("#v-tr"), {
      id: "tr", title: "Превод A → B с журнал за отмяна", sub: "Пробвай срив след първия запис.",
      code: "ch09_transfer",
      inputs: [
        { id: "a", label: "A", type: "number", value: 100, width: "6em" }, { id: "b", label: "B", type: "number", value: 50, width: "6em" },
        { id: "amount", label: "сума", type: "number", value: 30, width: "6em" },
        { id: "crash", label: "срив", type: "select", value: "1", options: [["0", "без срив"], ["1", "след първия запис"], ["2", "преди COMMIT"]] },
      ],
      presets: [{ label: "Успешен превод", values: { crash: "0" } }, { label: "Недостатъчен баланс", values: { a: 20, crash: "0" } }],
      legend: [["s-act", "записва се"], ["s-swap", "срив / нарушено правило"], ["s-done", "потвърдено"]],
      build: algos.transfer,
      draw(st, f) {
        st.innerHTML = "";
        const rc = {}; if (f.hl != null) rc[f.hl] = "s-act";
        if (f.crash) rc[0] = rc[1] = "s-swap";
        if (f.done) rc[0] = rc[1] = "s-done";
        st.append(T6.row(
          T6.table({ name: "Account", cols: ["acc", "balance"], rows: [["A", f.bal[0]], ["B", f.bal[1]]] }, { pk: [0], rowCls: rc, note: `A + B = ${f.sum}` }),
          T6.table({ name: "undo log", cols: ["acc", "old"], rows: f.log.map((e) => ["AB"[e.acc], e.old]) }, { empty: "празен" })));
      },
    });

    S.viz(root.querySelector("#v-sc"), {
      id: "sc", title: "Две транзакции върху един баланс", sub: "Ri — чете, Wi — записва, Ci — COMMIT. Изпълнява се по реда на разписанието, освен ако операция чака.",
      code: "ch09_schedule",
      inputs: [
        { id: "sched", label: "Разписание", value: "R1 R2 W1 W2 C1 C2", width: "14em" },
        { id: "x0", label: "x₀", type: "number", value: 100, width: "5em" },
        { id: "d1", label: "T1: −", type: "number", value: 10, width: "4.5em" }, { id: "d2", label: "T2: −", type: "number", value: 20, width: "4.5em" },
        { id: "mode", label: "Режим", type: "select", value: "0", options: [["0", "прочети, после запиши"], ["1", "атомарна UPDATE x = x − d"], ["2", "заключване до COMMIT"]] },
      ],
      presets: [
        { label: "Загубено обновяване", values: { sched: "R1 R2 W1 W2 C1 C2", mode: "0" } },
        { label: "Последователно", values: { sched: "R1 W1 C1 R2 W2 C2", mode: "0" } },
        { label: "Обратен ред на записите", values: { sched: "R1 R2 W2 W1 C2 C1", mode: "0" } },
        { label: "Същото със заключване", values: { sched: "R1 R2 W1 W2 C1 C2", mode: "2" } },
      ],
      legend: [["s-act", "текуща"], ["s-done", "изпълнена"], ["s-cmp", "чака"]],
      build: algos.schedule,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "arr", style: { flexWrap: "wrap" } });
        f.ops.forEach((o, k) => row.append(h("div", { class: "cell " + (k === f.cur ? (f.wait ? "s-cmp" : "s-act") : f.done[k] ? "s-done" : ""), style: { width: "48px" } }, o, h("span", { class: "ix", text: k + 1 }))));
        st.append(row);
        st.append(T6.row(T6.table({ name: "общо x", cols: ["x"], rows: [[f.x]] }), T6.table({ name: "локални копия", cols: ["T1", "T2"], rows: [[f.local[1], f.local[2]]] }), T6.table({ name: "изпълнен ред", cols: ["операции"], rows: [[f.exec.join(" ") || "—"]] })));
      },
    });

    S.viz(root.querySelector("#v-ix"), {
      id: "ix", title: "Търсене без и с индекс; цена на поддръжката", sub: "Индексът е подреден масив от ключове (модел на идеята за наредена структура).",
      code: "ch09_index",
      inputs: [
        { id: "keys", label: "Ключове в таблицата (по реда на вмъкване)", value: "42 7 19 88 3 56 71 25 64 11 90 33 50 15 77 2", width: "22em" },
        { id: "probe", label: "търси", type: "number", value: 50, width: "5em" },
        { id: "mode", label: "Режим", type: "select", value: "scan", options: [["scan", "последователно четене"], ["index", "чрез индекса"], ["insert", "изграждане на индекса (цена)"]] },
      ],
      presets: [{ label: "Без индекс", values: { mode: "scan" } }, { label: "С индекс", values: { mode: "index" } }, { label: "Липсващ ключ 60", values: { probe: 60, mode: "scan" } }, { label: "Цена при вмъкване", values: { mode: "insert" } }],
      random: () => ({ keys: [...new Set(S.randArray(16, 1, 99))].join(" ") }),
      legend: [["s-act", "сравнява се"], ["s-done", "намерено / вмъкнато"], ["s-dim", "извън диапазона"]],
      build: algos.index,
      draw(st, f) {
        st.innerHTML = "";
        if (f.table && f.mode !== "index") {
          st.append(h("span", { class: "eyebrow", text: "Таблица (ред на вмъкване)" }));
          const cls = {}; if (f.cur != null && f.cur >= 0) cls[f.cur] = f.hit ? "s-done" : "s-act";
          S.drawArray(st.appendChild(h("div")), f.table, { cls, dim: f.cur != null && f.cur >= 0 ? (k) => k < f.cur : null });
        }
        if (f.idx) {
          st.append(h("span", { class: "eyebrow", text: "Индекс (подреден)" }));
          const cls = {}; if (f.mid != null && f.mid >= 0) cls[f.mid] = f.hit ? "s-done" : "s-act"; if (f.put != null) cls[f.put] = "s-done";
          S.drawArray(st.appendChild(h("div")), f.idx, { cls, dim: f.lo != null ? [f.lo, f.hi] : null });
        }
      },
    });

    const rb = root.querySelector("#rec-btn"), rt = root.querySelector("#rec-tab"), rd = root.querySelector("#rec-d");
    const btns = REC.map((r, i) => { const b = h("button", { class: "btn", style: { whiteSpace: "normal", textAlign: "left", lineHeight: "1.3" }, text: r.t, onclick: () => pickR(i) }); rb.append(b); return b; });
    function pickR(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
      rt.innerHTML = "";
      rt.append(h("tr", null, ...["Механизъм", "Цел", "При този инцидент"].map((x) => h("th", { text: x }))));
      [["Резервно копие", "запазва предишни състояния"], ["Журнал", "подпомага възстановяване според технологията"], ["Реплика", "поддържа синхронизирано копие"]].forEach(([n, g], j) => {
        const v = REC[i].m[j];
        rt.append(h("tr", null, h("td", null, h("dfn", { "data-g": ["резервно копие", "журнал", "реплика"][j], tabindex: "0", text: n })), h("td", { text: g }), h("td", { class: v.startsWith("✓") ? "s-done" : v.startsWith("✗") ? "s-swap" : "", text: v })));
      });
      rd.innerHTML = REC[i].d;
    }
    pickR(1);
  }

  S.chapter({ id: "tranzakcii", order: 9, num: "9", group: "Изпълнение", title: "Транзакции, индекси и възстановяване", lead: "ACID, превод между сметки с отмяна, загубено обновяване при конкурентност, цената на индекса и разликата между копие, журнал и реплика.", html, mount, algos });
})();
