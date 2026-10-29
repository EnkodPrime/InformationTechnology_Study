/* Раздел 4 — синхронизация: състезание за данни, мютекс, семафори, производител–потребител. */
(function () {
  const S = window.Study, h = S.h;
  const PCN = ["lock", "load", "add", "store", "unlock"];

  function parseSched(str, allowed, max) {
    const s = String(str).toUpperCase().replace(/[\s,]+/g, "");
    if (!s.length) throw new Error("Разписанието е празно.");
    if (s.length > max) throw new Error(`Най-много ${max} стъпки в разписанието.`);
    const bad = [...s].find((c) => !allowed.includes(c));
    if (bad) throw new Error(`„${bad}“ не е допустимо в разписанието. Използвай само ${allowed.split("").join(" и ")}.`);
    return s;
  }

  const algos = {
    /* Огледало на step()/race() от c/04_sinhronizacia.c */
    race({ k, mutex, sched }) {
      k = S.int(k, 1, 5, "Увеличенията на нишка");
      const useM = mutex === true || mutex === "true";
      const sc = parseSched(sched, "AB", 60);
      const s = { counter: 0, owner: -1, blocked: 0 };
      const t = [{ pc: 0, r: 0, left: k }, { pc: 0, r: 0, left: k }];
      const F = [];
      const nm = ["A", "B"];
      const snap = (o) => ({ s: { ...s }, t: t.map((x) => ({ ...x })), useM, k, stats: { counter: s.counter, "очаквано": 2 * k, "блокирани опити": s.blocked }, ...o });
      F.push(snap({ vars: { counter: 0 }, msg: `Две нишки, по ${k} увеличения. ${useM ? "Критичният участък е защитен с <dfn data-g=\"мютекс\">мютекс</dfn>." : "<b>Без защита</b> — counter++ е три отделни микростъпки: load, add, store."}` }));
      const step = (id, phase) => {
        const T = t[id], who = nm[id];
        if (T.pc === 0) {
          if (!useM) { T.pc = 1; return step(id, phase); }
          if (s.owner >= 0) { s.blocked++; F.push(snap({ at: "blocked", who: id, vars: { [`${who}.pc`]: "lock", owner: nm[s.owner] }, msg: `${who}: <code>lock</code> — мютексът е зает от ${nm[s.owner]}. ${who} е <b>блокирана</b> и ще опита пак.`, log: `${who}: lock → чака` })); return; }
          s.owner = id; T.pc = 1;
          F.push(snap({ at: "lock", who: id, vars: { owner: who }, msg: `${who}: <code>lock</code> — мютексът е свободен; ${who} го притежава и влиза в <dfn data-g="критичен участък">критичния участък</dfn>.`, log: `${who}: lock` }));
          return;
        }
        if (T.pc === 1) { T.r = s.counter; T.pc = 2; F.push(snap({ at: "load", who: id, vars: { counter: s.counter, [`${who}.r`]: T.r }, msg: `${who}: <code>r = counter</code> → r = ${T.r}.`, log: `${who}: load ${T.r}` })); return; }
        if (T.pc === 2) { T.r++; T.pc = 3; F.push(snap({ at: "add", who: id, vars: { counter: s.counter, [`${who}.r`]: T.r }, msg: `${who}: <code>r = r + 1</code> → r = ${T.r} (само в регистъра на ${who}).` })); return; }
        if (T.pc === 3) {
          const lost = s.counter >= T.r;
          s.counter = T.r; T.pc = useM ? 4 : 0;
          if (!useM) T.left--;
          F.push(snap({ at: "store", who: id, lost, vars: { counter: s.counter, [`${who}.r`]: T.r }, msg: `${who}: <code>counter = r</code> → counter = ${s.counter}.${lost ? ` <b class="warn">Изгубено увеличение:</b> ${who} записва стойност, пресметната от стара прочетена стойност.` : ""}`, log: `${who}: store ${s.counter}${lost ? " ✗" : ""}` }));
          return;
        }
        if (T.pc === 4) { s.owner = -1; T.pc = 0; T.left--; F.push(snap({ at: "unlock", who: id, vars: { owner: "—" }, msg: `${who}: <code>unlock</code> — мютексът е свободен.`, log: `${who}: unlock` })); }
      };
      for (const c of sc) {
        const id = c === "A" ? 0 : 1;
        if (t[id].left === 0) continue;
        step(id, "sched");
      }
      if (t[0].left > 0 || t[1].left > 0) F.push(snap({ vars: {}, msg: "Разписанието свърши; нишките се довършват, като се редуват." }));
      for (let g = 0; (t[0].left > 0 || t[1].left > 0) && g < 10000; g++)
        for (let id = 0; id < 2; id++) if (t[id].left > 0) step(id, "tail");
      const ok = s.counter === 2 * k;
      F.push(snap({ done: true, vars: { counter: s.counter }, inv: { text: `counter = ${s.counter}, очаквано ${2 * k}`, ok }, msg: ok ? `Крайна стойност <b>${s.counter}</b> — няма загуби.` : `Крайна стойност <b>${s.counter}</b> вместо ${2 * k}: загубени са ${2 * k - s.counter} увеличения.` }));
      return { frames: F, result: s.counter, blocked: s.blocked };
    },

    /* Огледало на producer_step()/consumer_step() */
    pc({ cap, sched }) {
      cap = S.int(cap, 1, 8, "Капацитетът на буфера");
      const sc = parseSched(sched, "PC", 80);
      const q = { buf: Array(cap).fill(null), cap, in: 0, out: 0, count: 0, empty: cap, full: 0, mutex: 1, ppc: 0, cpc: 0, next: 0, produced: 0, consumed: 0, sum: 0, pb: 0, cb: 0, item: null, citem: null };
      const F = [];
      const snap = (o) => ({ q: { ...q, buf: q.buf.slice() }, stats: { произведени: q.produced, консумирани: q.consumed, "блокирани опити P": q.pb, "блокирани опити C": q.cb }, ...o });
      const sv = () => ({ empty: q.empty, full: q.full, mutex: q.mutex, count: q.count });
      F.push(snap({ vars: sv(), msg: `Ограничен буфер с капацитет ${cap}. Семафори: <code>empty = ${cap}</code> (свободни места), <code>full = 0</code> (пълни места), <code>mutex = 1</code> (взаимно изключване).` }));
      const wait = (name) => { if (q[name] === 0) return false; q[name]--; return true; };
      for (const c of sc) {
        if (c === "P") {
          switch (q.ppc) {
            case 0: q.item = ++q.next; q.ppc = 1; F.push(snap({ at: "pmake", who: "P", vars: { ...sv(), item: q.item }, msg: `P произвежда елемент <b>${q.item}</b> (извън критичния участък).` })); break;
            case 1: if (wait("empty")) { q.ppc = 2; F.push(snap({ at: "pempty", who: "P", vars: sv(), msg: `P: <code>wait(empty)</code> — има свободно място; empty = ${q.empty}.` })); } else { q.pb++; F.push(snap({ at: "pempty", who: "P", blockedP: true, vars: sv(), msg: `P: <code>wait(empty)</code> — empty = 0, <b>буферът е пълен</b>. P е блокиран.`, log: "P блокиран: пълен буфер" })); } break;
            case 2: if (wait("mutex")) { q.ppc = 3; F.push(snap({ at: "plock", who: "P", vars: sv(), msg: "P: <code>wait(mutex)</code> — влиза в критичния участък." })); } else { q.pb++; F.push(snap({ at: "plock", who: "P", blockedP: true, vars: sv(), msg: "P: <code>wait(mutex)</code> — C е в критичния участък. P чака.", log: "P чака mutex" })); } break;
            case 3: q.buf[q.in] = q.item; F.push(snap({ at: "pput", who: "P", slot: q.in, vars: sv(), msg: `P: <code>buf[${q.in}] = ${q.item}</code>.`, log: `P: buf[${q.in}] ← ${q.item}` })); q.in = (q.in + 1) % cap; q.count++; q.ppc = 4; break;
            case 4: q.mutex++; q.ppc = 5; F.push(snap({ at: "punlock", who: "P", vars: sv(), msg: "P: <code>signal(mutex)</code> — излиза от критичния участък." })); break;
            case 5: q.full++; q.produced++; q.ppc = 0; F.push(snap({ at: "pfull", who: "P", vars: sv(), msg: `P: <code>signal(full)</code> — full = ${q.full}; ако C е чакал, вече може да продължи.` })); break;
          }
        } else {
          switch (q.cpc) {
            case 0: if (wait("full")) { q.cpc = 1; F.push(snap({ at: "cfull", who: "C", vars: sv(), msg: `C: <code>wait(full)</code> — има елемент; full = ${q.full}.` })); } else { q.cb++; F.push(snap({ at: "cfull", who: "C", blockedC: true, vars: sv(), msg: "C: <code>wait(full)</code> — full = 0, <b>буферът е празен</b>. C е блокиран.", log: "C блокиран: празен буфер" })); } break;
            case 1: if (wait("mutex")) { q.cpc = 2; F.push(snap({ at: "clock", who: "C", vars: sv(), msg: "C: <code>wait(mutex)</code> — влиза в критичния участък." })); } else { q.cb++; F.push(snap({ at: "clock", who: "C", blockedC: true, vars: sv(), msg: "C: <code>wait(mutex)</code> — P е в критичния участък. C чака.", log: "C чака mutex" })); } break;
            case 2: q.citem = q.buf[q.out]; q.buf[q.out] = null; F.push(snap({ at: "cget", who: "C", slot: q.out, vars: { ...sv(), citem: q.citem }, msg: `C: взима <code>buf[${q.out}] = ${q.citem}</code>.`, log: `C: buf[${q.out}] → ${q.citem}` })); q.out = (q.out + 1) % cap; q.count--; q.cpc = 3; break;
            case 3: q.mutex++; q.cpc = 4; F.push(snap({ at: "cunlock", who: "C", vars: sv(), msg: "C: <code>signal(mutex)</code>." })); break;
            case 4: q.empty++; q.cpc = 5; F.push(snap({ at: "cempty", who: "C", vars: sv(), msg: `C: <code>signal(empty)</code> — empty = ${q.empty}; освободено място за P.` })); break;
            case 5: q.consumed++; q.sum += q.citem; q.cpc = 0; F.push(snap({ at: "cuse", who: "C", vars: { ...sv(), citem: q.citem }, msg: `C използва елемент ${q.citem} (извън критичния участък).` })); break;
          }
        }
      }
      const inv = q.empty + q.full + (q.ppc >= 2 && q.ppc <= 5 ? 1 : 0) - (q.cpc >= 1 && q.cpc <= 4 ? 1 : 0);
      F.push(snap({ done: true, vars: sv(), msg: `Край на разписанието: произведени ${q.produced}, консумирани ${q.consumed}, в буфера ${q.count}. Семафорите не позволиха на P да пише в пълен буфер, нито на C да чете от празен.` }));
      void inv;
      return { frames: F, produced: q.produced, consumed: q.consumed, count: q.count, pb: q.pb, cb: q.cb, sum: q.sum };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="състезание за данни">Състезание за данни</dfn> възниква при конфликтни несинхронизирани достъпи до споделена памет, когато поне един е запис. Операцията <code>counter++</code> обикновено включва четене, увеличаване и запис; две нишки могат да загубят увеличение. <dfn data-g="критичен участък">Критичният участък</dfn> е частта, която използва защитавания общ ресурс.</p>
</div>

<div class="block">
  <h3>Схема 10 · Загубено увеличение</h3>
  <p class="muted">Разписанието казва коя нишка прави следващата микростъпка: <code>A</code> или <code>B</code>. Моделът е детерминиран, за да се възпроизвежда; в реална система разписанието го избира планировчикът. Включи мютекса и пусни същото разписание.</p>
  <div id="v-race"></div>
  <details class="hint"><summary>Хинт: кое разписание губи и кое не</summary><div>
    <p><code>AAABBB</code> — A завършва load/add/store преди B да прочете: няма загуба. <code>ABABAB</code> — двете четат 0, двете записват 1: едно увеличение е изгубено. С мютекс B блокира на <code>lock</code>, докато A не направи <code>unlock</code> — „мютекс около целия критичен участък принуждава двете увеличавания да се изпълнят последователно“.</p>
  </div></details>
  <details class="trap"><summary>Изяснен въпрос: атомарност на един достъп ≠ атомарност на операцията</summary><div>
    <p>Атомарността на един машинен достъп не прави атомарна последователност от няколко достъпа. В модела и load, и store са неделими, но <code>counter++</code> пак губи. За „провери и после запиши“ трябва да се защити съвместното условие — например чрез мютекс или подходяща атомарна операция. Дори атомарни отделни полета могат да образуват неправилна съвместна операция.</p>
  </div></details>
  <details class="hint"><summary>Истинският код с pthread мютекс</summary><div id="pthread-code"></div></details>
</div>

<div class="block">
  <h3>Схема 12 · Мютекс, семафор и условна променлива</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Механизъм</th><th>Основна роля</th><th>Важно</th></tr>
    <tr><td><dfn data-g="мютекс">Мютекс</dfn></td><td>взаимно изключване</td><td>има притежател — отключва този, който е заключил</td></tr>
    <tr><td><dfn data-g="семафор">Семафор</dfn></td><td>брояч на разрешения; wait / signal</td><td>може да ограничава достъп до N еднакви ресурса</td></tr>
    <tr><td><dfn data-g="условна променлива">Условна променлива</dfn></td><td>изчакване на предикат</td><td>използва се със съответен мютекс; условието се проверява отново в цикъл</td></tr>
  </table></div>
  <p class="muted">Това са основните роли; точният API договор зависи от средата.</p>
  <details class="trap"><summary>Капан: „събудих се, значи условието е вярно“</summary><div>
    <p>Уведомяването не гарантира, че условието още е вярно при получаване на CPU. След събуждане предикатът се проверява отново в цикъл: събуждането не е запазено обещание. Затова чакането е <code>while (!условие) wait(&amp;cv, &amp;m);</code>, а не <code>if</code>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Производител–потребител с два брояча и мютекс <span class="extra-tag">разширение</span></h3>
  <p class="prose">Класическа илюстрация на ролите от Схема 12: семафорът <code>empty</code> брои свободните места, <code>full</code> — заетите, а <code>mutex</code> пази самия буфер. Разписанието съдържа <code>P</code> (стъпка на производителя) и <code>C</code> (стъпка на потребителя). Блокирана нишка опитва отново при следващата си стъпка.</p>
  <div id="v-pc"></div>
  <details class="hint"><summary>Хинт: защо редът wait(empty) → wait(mutex) е важен</summary><div>
    <p>Ако P първо заключи mutex и после чака empty при пълен буфер, той ще чака, <b>държейки</b> mutex. C не може да влезе, за да освободи място — всеки чака другия: това е взаимно блокиране (<a href="#deadlock">раздел 5</a>). Броячите се чакат извън критичния участък.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 13 · Три различни причини за липса на напредък</h3>
  <p class="muted">Външният симптом („забила програма“) може да е еднакъв. Механизмът е различен. Щракни.</p>
  <div class="cards" id="noprog"></div>
  <div class="key" id="noprog-note">Щракни карта.</div>
</div>

<div class="key"><b>За запомняне.</b> counter++ = четене + изменение + запис. Критичният участък пази целия инвариант. Мютекс — притежание; семафор — брояч; условна променлива — предикат под мютекс, проверка в цикъл.</div>`;

  const NOPROG = [
    { g: "взаимно блокиране", t: "Deadlock", d: "Невъзможност участниците да напреднат поради взаимното си изчакване. A държи R1 и чака R2; B държи R2 и чака R1. Никой не напредва.", go: "deadlock" },
    { g: "гладуване", t: "Starvation", d: "Неограничено отлагане на участник, <b>докато други напредват</b>. Пример: нисък приоритет без стареене (раздел 3, бутон „Гладуване“).", go: "planirane" },
    { g: "livelock", t: "Livelock", d: "Активност без полезен общ напредък — например постоянно взаимно отстъпване. Процесорът е зает, работа не се върши.", go: null },
  ];

  function drawRace(st, f) {
    st.innerHTML = "";
    const nm = ["A", "B"];
    const col = (id) => {
      const T = f.t[id];
      const steps = (f.useM ? PCN : PCN.slice(1, 4)).map((p) => {
        const idx = PCN.indexOf(p);
        const cur = f.who === id && f.at && [].concat(f.at)[0] === (p === "lock" && f.at === "blocked" ? "blocked" : p);
        const next = T.pc === idx;
        return h("span", { class: "pill " + (cur ? (f.at === "blocked" ? "s-swap" : f.lost && p === "store" ? "s-swap" : "s-act") : next ? "s-cmp" : ""), text: p });
      });
      return h("div", { class: "card" + (f.who === id ? " s-act" : ""), style: f.who === id ? { borderColor: "var(--c)" } : null },
        h("span", { class: "eyebrow", text: "нишка " + nm[id] + (T.left === 0 ? " · готова" : ` · остават ${T.left}`) }),
        h("div", { class: "row" }, ...steps),
        h("p", { class: "mono", text: `регистър r = ${T.r}` }));
    };
    const mid = h("div", { class: "card", style: { textAlign: "center" } }, h("span", { class: "eyebrow", text: "споделена памет" }),
      h("p", { class: "mono", style: { fontSize: "1.6rem", fontWeight: 700, color: f.lost ? "var(--st-swap)" : "inherit" }, text: "counter = " + f.s.counter }),
      f.useM ? h("p", { class: "mono", text: "мютекс: " + (f.s.owner < 0 ? "свободен" : "държи " + nm[f.s.owner]) }) : h("p", { class: "muted", text: "без мютекс" }));
    st.append(h("div", { class: "split" }, col(0), mid, col(1)));
  }

  function drawPC(st, f) {
    st.innerHTML = "";
    const q = f.q;
    const cls = {};
    q.buf.forEach((v, k) => { if (v != null) cls[k] = "s-done"; });
    if (f.slot != null) cls[f.slot] = f.who === "P" ? "s-act" : "s-cmp";
    const arrBox = h("div", { style: { overflowX: "auto" } });
    S.drawArray(arrBox, q.buf.map((v) => (v == null ? "" : v)), { cls, ptr: q.in === q.out ? { "in,out": q.in } : { in: q.in, out: q.out } });
    const sem = (n, v) => h("span", { class: "pill " + (v === 0 ? "s-swap" : "s-done"), text: `${n} = ${v}` });
    const who = (w, bl, pc, names) => h("div", { class: "card" + (f.who === w ? " s-act" : ""), style: f.who === w ? { borderColor: "var(--c)" } : null },
      h("span", { class: "eyebrow", text: w === "P" ? "производител" : "потребител" }),
      h("p", { class: bl ? "warn" : "mono", text: bl ? "блокиран" : "следва: " + names[pc] }));
    st.append(h("div", { class: "row" }, sem("empty", q.empty), sem("full", q.full), sem("mutex", q.mutex)), arrBox,
      h("div", { class: "split" }, who("P", f.blockedP, q.ppc, ["произведи", "wait(empty)", "wait(mutex)", "постави", "signal(mutex)", "signal(full)"]),
        who("C", f.blockedC, q.cpc, ["wait(full)", "wait(mutex)", "вземи", "signal(mutex)", "signal(empty)", "използвай"])));
  }

  function mount(root) {
    S.viz(root.querySelector("#v-race"), {
      id: "race", title: "Две нишки увеличават общ брояч", sub: "Червено = изгубено увеличение или блокиран опит.",
      code: "s04_race",
      inputs: [{ id: "k", label: "Увеличения на нишка", type: "number", value: 1, width: "5em" }, { id: "mutex", label: "мютекс", type: "checkbox", value: false },
        { id: "sched", label: "Разписание (A/B)", value: "ABABAB", width: "16em" }],
      presets: [{ label: "Последователно", values: { sched: "AAABBB", k: 1 } }, { label: "Преплетено", values: { sched: "ABABAB", k: 1 } }, { label: "3+3, преплетено", values: { k: 3, sched: "AABBAABBAB" } }],
      random: () => ({ sched: Array.from({ length: 12 }, () => (Math.random() < 0.5 ? "A" : "B")).join("") }),
      legend: [["s-act", "текуща микростъпка"], ["s-cmp", "следваща"], ["s-swap", "загуба / блокиран"]],
      build: algos.race,
      draw: drawRace,
    });
    S.codeView(root.querySelector("#pthread-code"), "s04_pthread");
    root.querySelector("#pthread-code").append(h("p", { class: "muted", text: "Файлът c/04_sinhronizacia.c пуска две такива нишки по 100 000 увеличения; с мютекса резултатът е 200 000 (компилира се и с -fsanitize=address,undefined)." }));

    S.viz(root.querySelector("#v-pc"), {
      id: "pc", title: "Производител–потребител: ограничен буфер", sub: "in — следващо място за запис, out — следващо за четене (кръгов буфер).",
      code: "s04_pc",
      inputs: [{ id: "cap", label: "Капацитет", type: "number", value: 2, width: "5em" }, { id: "sched", label: "Разписание (P/C)", value: "CCPPPPPPPPPPPPPPPPPPCCCCCC", width: "22em" }],
      presets: [{ label: "Пълен буфер", values: { cap: 3, sched: "PPPPPPPPPPPPPPPPPPPPPPPPPPPP" } }, { label: "Празен буфер", values: { cap: 2, sched: "CCCCPPPPPPCCCCCC" } }, { label: "Редуване", values: { cap: 1, sched: "PCPCPCPCPCPCPCPCPCPCPC" } }],
      random: () => ({ sched: Array.from({ length: 30 }, () => (Math.random() < 0.5 ? "P" : "C")).join("") }),
      legend: [["s-done", "зает слот"], ["s-act", "запис"], ["s-cmp", "четене"], ["s-swap", "семафор = 0"]],
      build: algos.pc,
      draw: drawPC,
    });

    const np = root.querySelector("#noprog"), nn = root.querySelector("#noprog-note");
    const btns = NOPROG.map((N, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      nn.innerHTML = `<p><b>${N.t}</b> — ${N.d}</p>` + (N.go ? `<p><a href="#${N.go}">→ виж раздела</a></p>` : "");
    } }, h("h4", null, h("dfn", { "data-g": N.g, text: N.t })), h("p", { class: "muted", text: "щракни за механизма" })));
    np.append(...btns);
  }

  S.chapter({ id: "sinhronizacia", order: 4, num: "4", group: "Ресурси", title: "Синхронизация", lead: "Състезание за данни и загубено увеличение, критичен участък, мютекс, семафор, условна променлива, производител–потребител.", html, mount, algos });
})();
