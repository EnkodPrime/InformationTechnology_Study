/* Раздел 7 — средства за защита и реагиране: защитна стена, IDS (сигнатури срещу аномалии), дневници, цикъл на инцидента. */
(function () {
  const S = window.Study, h = S.h;

  const PROTO = { any: 0, tcp: 6, udp: 17 };
  const PNAME = { 0: "any", 6: "tcp", 17: "udp" };
  function ip2n(s) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(s).trim());
    if (!m) throw new Error(`„${s}“ не е IPv4 адрес.`);
    const p = m.slice(1).map(Number);
    if (p.some((x) => x > 255)) throw new Error(`„${s}“: октетите са 0..255.`);
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  }
  function inNet(ip, addr, pre) { const mask = pre === 0 ? 0 : (0xffffffff << (32 - pre)) >>> 0; return ((ip & mask) >>> 0) === ((addr & mask) >>> 0); }
  /* Правило: "allow tcp 0.0.0.0/0 443" или "deny any 203.0.113.0/24 0-65535" */
  function parseRules(str) {
    const lines = String(str).split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Нужно е поне едно правило.");
    if (lines.length > 10) throw new Error("Най-много 10 правила.");
    return lines.map((l) => {
      const m = /^(allow|deny)\s+(any|tcp|udp)\s+([\d.]+)\/(\d{1,2})\s+(\d{1,5})(?:-(\d{1,5}))?$/i.exec(l);
      if (!m) throw new Error(`„${l}“: формат „allow|deny any|tcp|udp МРЕЖА/ПРЕФИКС ПОРТ[-ПОРТ]“.`);
      const pre = +m[4]; if (pre > 32) throw new Error("Префиксът е 0..32.");
      const lo = +m[5], hi = m[6] != null ? +m[6] : lo;
      if (hi > 65535 || lo > hi) throw new Error("Портовете са 0..65535 и lo ≤ hi.");
      return { action: m[1].toLowerCase() === "allow" ? 0 : 1, proto: PROTO[m[2].toLowerCase()], addr: ip2n(m[3]), pre, lo, hi, text: l };
    });
  }

  const algos = {
    fw({ rules, proto, src, dport, def }) {
      const R = parseRules(rules);
      const p = { proto: PROTO[proto], src: ip2n(src), dport: S.int(dport, 0, 65535, "Портът") };
      if (p.proto == null || p.proto === 0) throw new Error("Протоколът на пакета е tcp или udp.");
      const d = def === "1" || def === 1 ? 1 : 0;
      const F = [];
      let cmp = 0;
      const fr = (o) => ({ R, p, def: d, stats: { сравнени_правила: cmp }, ...o });
      F.push(fr({ at: [], msg: `Пакет: ${PNAME[p.proto]} от ${src} към порт ${p.dport}. Правилата се проверяват отгоре надолу — <b>първото съвпадащо решава</b>.` }));
      for (let i = 0; i < R.length; i++) {
        const r = R[i];
        cmp++;
        F.push(fr({ at: "rule", cur: i, vars: { i, правило: r.text }, msg: `Правило ${i}: <code>${S.esc(r.text)}</code>.` }));
        if (r.proto !== 0 && r.proto !== p.proto) { F.push(fr({ at: "proto", cur: i, fail: "proto", msg: `Протоколът не съвпада (${PNAME[r.proto]} ≠ ${PNAME[p.proto]}) — следващо правило.`, log: `#${i}: протокол ✗` })); continue; }
        if (!inNet(p.src, r.addr, r.pre)) { F.push(fr({ at: "src", cur: i, fail: "src", msg: `${src} не е в мрежата на правилото — следващо.`, log: `#${i}: източник ✗` })); continue; }
        if (p.dport < r.lo || p.dport > r.hi) { F.push(fr({ at: "port", cur: i, fail: "port", msg: `Порт ${p.dport} не е в ${r.lo}–${r.hi} — следващо.`, log: `#${i}: порт ✗` })); continue; }
        F.push(fr({ at: "match", cur: i, hit: i, done: true, act: r.action, vars: { hit: i, action: r.action ? "DENY" : "ALLOW" }, msg: `Съвпада по всички полета → <b>${r.action ? "DENY" : "ALLOW"}</b>. Следващите правила не се гледат.`, log: `#${i}: ${r.action ? "DENY" : "ALLOW"}` }));
        return { frames: F, action: r.action, hit: i, cmp };
      }
      F.push(fr({ at: "default", hit: -1, done: true, act: d, vars: { hit: -1, action: d ? "DENY" : "ALLOW" }, msg: `Нито едно правило не съвпада → политика по подразбиране: <b>${d ? "DENY" : "ALLOW"}</b>. ${d ? "„Забранено е всичко, което не е разрешено“ — по-безопасният избор." : "„Разрешено е всичко, което не е забранено“ — неочакван трафик минава."}`, log: "по подразбиране" }));
      return { frames: F, action: d, hit: -1, cmp };
    },

    sig({ payload, sigs }) {
      payload = String(payload ?? "");
      const SG = String(sigs).split("|").map((x) => x.trim()).filter(Boolean);
      if (!SG.length) throw new Error("Нужна е поне една сигнатура (разделени с |).");
      if (SG.length > 8 || payload.length > 120) throw new Error("До 8 сигнатури и 120 символа съдържание.");
      const F = [];
      for (let i = 0; i < SG.length; i++) {
        const pos = payload.indexOf(SG[i]);
        F.push({ at: "sig_loop", SG, payload, cur: i, pos, vars: { i, sig: SG[i] }, msg: `Сигнатура ${i}: „${S.esc(SG[i])}“ — ${pos >= 0 ? `<b>намерена</b> на позиция ${pos}` : "не е намерена"}.`, log: `sig[${i}] ${pos >= 0 ? "✓" : "—"}` });
        if (pos >= 0) { F.push({ at: "sig_hit", SG, payload, cur: i, pos, done: true, res: i, vars: { return: i }, msg: `Сигнал по сигнатура ${i}. Сигнатурите откриват <b>известни</b> шаблони точно.` }); return { frames: F, result: i }; }
      }
      F.push({ at: "sig_none", SG, payload, cur: -1, done: true, res: -1, vars: { return: -1 }, msg: "Няма съвпадение — няма сигнал. Вариант, който не съвпада буквално с шаблона (друг регистър, допълнителен интервал), остава незабелязан: <b>фалшиво отрицателен</b> резултат, ако е реална атака." });
      return { frames: F, result: -1 };
    },

    anom({ base, x, k }) {
      const B = S.parseNums(base, { min: 0, max: 100000, minLen: 2, maxLen: 30, int: false });
      x = Number(x); if (!Number.isFinite(x) || x < 0) throw new Error("Наблюдението трябва да е неотрицателно число.");
      k = S.int(k, 1, 5, "k");
      const F = [];
      const m = B.reduce((a, b) => a + b, 0) / B.length;
      F.push({ at: "an_mean", B, x, m, vars: { mean: m.toFixed(2) }, msg: `Обучителен период: средно ${m.toFixed(2)} (напр. заявки в минута).` });
      const sd = Math.sqrt(B.reduce((a, b) => a + (b - m) * (b - m), 0) / B.length);
      const thr = m + k * sd;
      F.push({ at: "an_std", B, x, m, sd, thr, vars: { mean: m.toFixed(2), std: sd.toFixed(2), thr: thr.toFixed(2) }, msg: `σ = ${sd.toFixed(2)}; праг = mean + ${k}σ = <b>${thr.toFixed(2)}</b>.` });
      const a = x > thr;
      F.push({ at: "an_cmp", B, x, m, sd, thr, res: a, done: true, vars: { x, thr: thr.toFixed(2), alert: a ? 1 : 0 }, msg: `${x} ${a ? "&gt;" : "≤"} ${thr.toFixed(2)} → ${a ? "<b>сигнал</b>" : "няма сигнал"}. Аномалиите откриват и непознато поведение, но и законни отклонения дават сигнали — <b>фалшиво положителни</b>.`, log: a ? "сигнал" : "норма" });
      return { frames: F, result: a ? 1 : 0, thr: thr.toFixed(2) };
    },
  };

  const RULES = "deny any 203.0.113.0/24 0-65535; allow tcp 0.0.0.0/0 443; allow tcp 10.0.0.0/8 22; allow udp 10.0.0.0/8 53";
  const IR = [
    { k: "Подготовка", d: "Роли, процедури, защитени дневници, резервни копия, връзки за ескалация." },
    { k: "Откриване и анализ", d: "Сигналът не е още доказан инцидент — проверява се. Установяват се обхват и въздействие." },
    { k: "Ограничаване", d: "Спира разрастването (напр. блокиране на откраднатия акаунт). Доказателствата се запазват." },
    { k: "Отстраняване", d: "Премахва причината или устойчивото присъствие. Поправката може да премахне слабостта, без да премахне вече установено чуждо присъствие." },
    { k: "Възстановяване", d: "Връща работата. Резервното копие помага, но не отменя вече разкритите данни; репликацията може да разпространи грешна команда." },
    { k: "Поуки", d: "Проверява се дали достъпът и първопричината са отстранени; знанията подобряват подготовката." },
  ];
  const OBS = [
    { k: "Сигнал от IDS", ok: "Подозрение — изисква проверка. Не е доказан инцидент." },
    { k: "Няма записи за нощта", ok: "Може да означава: няма събитие, няма наблюдение или загуба на данни. Трите възможности не се сливат в един извод." },
    { k: "Няма открити инциденти тази година", ok: "Следва само, че няма установени инциденти в обхвата на наблюдението. За по-силен извод — сведения за видимостта и проверките." },
    { k: "Открита уязвимост в софтуера", ok: "Не доказва, че конкретната система е била използвана." },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="защитна стена">Защитната стена</dfn> допуска или ограничава комуникация по правила. <dfn data-g="ids">IDS</dfn> открива и сигнализира. <dfn data-g="ips">IPS</dfn> може да блокира, защото е в потока. Антивирусните и крайните защитни средства наблюдават устройства. Наличието на инструмент не гарантира откриване: зависи от видимостта, правилата, конфигурацията и вида атака.</p>
</div>

<div class="block">
  <h3>Защитна стена: първото съвпадащо правило</h3>
  <p class="prose">Пакетът се сравнява с правилата отгоре надолу; първото съвпадение решава. Редът на правилата има значение. Linux nftables/iptables работят така (първата крайна присъда accept/drop решава); OpenBSD pf по подразбиране прилага <b>последното</b> съвпадащо правило, освен при <code>quick</code>.</p>
  <div id="v-fw"></div>
  <details class="trap"><summary>Капан: редът на правилата</summary><div>
    <p>Пусни „Разменен ред“: allow 443 стои преди deny на мрежата 203.0.113.0/24, затова пакетът от забранената мрежа минава. Правилата не са множество — те са списък.</p>
  </div></details>
</div>

<div class="block">
  <h3>IDS: сигнатури срещу аномалии</h3>
  <p class="prose">Подходът по <b>сигнатури</b> търси известни шаблони — точен е, но пропуска неизвестното и вариантите. Подходът по <b>аномалии</b> сравнява с нормално поведение — открива и новото, но дава повече <dfn data-g="фалшиво положителен">фалшиво положителни</dfn> сигнали. Suricata и Snort са реални системи, които могат да откриват и при подходящ режим да блокират; Wireshark само показва пакети. Шифрованият трафик ограничава анализа на съдържанието, но не премахва всички наблюдаеми признаци.</p>
  <div class="split"><div id="v-sig"></div><div id="v-anom"></div></div>
  <div class="tbl-wrap"><table class="t">
    <tr><th></th><th>реална атака</th><th>няма атака</th></tr>
    <tr><th>сигнал</th><td>вярно положителен</td><td><b>фалшиво положителен</b></td></tr>
    <tr><th>няма сигнал</th><td><b>фалшиво отрицателен</b></td><td>вярно отрицателен</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>Схема 18. От наблюдение към обоснован извод</h3>
  <p class="prose"><dfn data-g="дневник">Логът</dfn> е свидетелство за наблюдавани събития. За полезно разследване са нужни смислени полета, синхронизирано време и защита от подмяна. Регистрирането на излишни тайни създава собствен риск. Видимостта без процедура за реакция не е достатъчна.</p>
  <div class="cards" id="obs"></div>
  <div class="key" id="obs-detail"></div>
</div>

<div class="block">
  <h3>Схема 17. Реагиране при инцидент като цикъл</h3>
  <p class="prose">При <dfn data-g="инцидент">инцидент</dfn> се установяват обхват и въздействие, ограничават се щетите, премахва се причината и се възстановява работата. Логическият ред се адаптира към инцидента, без да се губят доказателства и контрол над промените. Щракни етап.</p>
  <div id="ir-svg"></div>
  <div class="key" id="ir-detail"></div>
</div>

<div class="block">
  <h3>Пример: откраднат преподавателски акаунт</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Мярка</th><th>Роля</th></tr>
    <tr><td>Многофакторен вход</td><td>намалява част от риска</td></tr>
    <tr><td>Ограничени права</td><td>ограничават обхвата</td></tr>
    <tr><td>Журнал</td><td>подпомага откриването</td></tr>
    <tr><td>История и копия</td><td>позволяват възстановяване</td></tr>
  </table></div>
  <p class="prose muted">Примерът свързва технически и организационни мерки — всяка има конкретна роля (виж <a href="#model">защита в дълбочина</a>).</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-fw"), {
      id: "fw", title: "Проверка на пакет срещу списък правила", sub: "Правило: allow|deny протокол мрежа/префикс порт[-порт]; разделител „;“.",
      code: "ch07_fw",
      inputs: [
        { id: "rules", label: "правила", value: RULES, width: "38em" },
        { id: "proto", label: "протокол", type: "select", value: "tcp", options: ["tcp", "udp"] },
        { id: "src", label: "източник", value: "198.51.100.7", width: "10em" },
        { id: "dport", label: "порт", type: "number", value: 22, width: "6em" },
        { id: "def", label: "по подразбиране", type: "select", value: "1", options: [["1", "DENY"], ["0", "ALLOW"]] },
      ],
      presets: [
        { label: "HTTPS отвън", values: { rules: RULES, proto: "tcp", src: "198.51.100.7", dport: 443 } },
        { label: "Забранена мрежа", values: { rules: RULES, proto: "tcp", src: "203.0.113.9", dport: 443 } },
        { label: "SSH отвътре", values: { rules: RULES, proto: "tcp", src: "10.1.2.3", dport: 22 } },
        { label: "SSH отвън", values: { rules: RULES, proto: "tcp", src: "198.51.100.7", dport: 22 } },
        { label: "Разменен ред", values: { rules: "allow tcp 0.0.0.0/0 443; deny any 203.0.113.0/24 0-65535; allow tcp 10.0.0.0/8 22; allow udp 10.0.0.0/8 53", proto: "tcp", src: "203.0.113.9", dport: 443 } },
      ],
      legend: [["s-act", "проверява се"], ["s-dim", "не съвпада"], ["s-done", "ALLOW"], ["s-swap", "DENY"]],
      build: algos.fw,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, ...["#", "действие", "прот.", "мрежа", "портове"].map((x) => h("th", { text: x }))));
        f.R.forEach((r, i) => {
          let cls = "";
          if (f.cur != null && i < f.cur) cls = "s-dim";
          if (f.cur === i) cls = f.hit === i ? (r.action ? "s-swap" : "s-done") : f.fail ? "s-dim" : "s-act";
          const a = r.addr;
          tb.append(h("tr", null, h("td", { class: cls, text: i }), h("td", { class: cls, text: r.action ? "deny" : "allow" }), h("td", { class: cls, text: PNAME[r.proto] }),
            h("td", { class: cls, text: `${a >>> 24}.${(a >>> 16) & 255}.${(a >>> 8) & 255}.${a & 255}/${r.pre}` }), h("td", { class: cls, text: r.lo === r.hi ? r.lo : `${r.lo}–${r.hi}` })));
        });
        tb.append(h("tr", null, h("td", { class: f.hit === -1 ? (f.def ? "s-swap" : "s-done") : "", text: "*" }), h("td", { colspan: 4, class: f.hit === -1 ? (f.def ? "s-swap" : "s-done") : "", text: "по подразбиране: " + (f.def ? "deny" : "allow") })));
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.done) st.append(h("p", null, h("span", { class: "pill " + (f.act ? "s-swap" : "s-done"), text: f.act ? "DENY" : "ALLOW" })));
      },
    });

    S.viz(root.querySelector("#v-sig"), {
      id: "sig", title: "Сигнатури", sub: "Търсене на подниз (с точност до регистъра).",
      code: "ch07_ids",
      inputs: [{ id: "payload", label: "съдържание", value: "GET /?q=<SCRIPT", width: "14em" }, { id: "sigs", label: "сигнатури (|)", value: "<script|../|DROP TABLE", width: "14em" }],
      presets: [{ label: "точно", values: { payload: "GET /?q=<script" } }, { label: "вариант", values: { payload: "GET /?q=<SCRIPT" } }, { label: "нормално", values: { payload: "GET /index.html" } }],
      legend: [["s-act", "проверява се"], ["s-swap", "сигнал"], ["s-dim", "не съвпада"]],
      build: algos.sig,
      draw(st, f) {
        st.innerHTML = "";
        const pl = h("p", { class: "mono", style: { overflowWrap: "anywhere" } });
        if (f.pos >= 0 && f.cur >= 0) { const s = f.SG[f.cur]; pl.append(f.payload.slice(0, f.pos), h("mark", { text: f.payload.slice(f.pos, f.pos + s.length) }), f.payload.slice(f.pos + s.length)); }
        else pl.textContent = f.payload;
        st.append(pl, h("div", { class: "row" }, ...f.SG.map((s, i) => h("span", { class: "pill " + (i === f.cur ? (f.pos >= 0 ? "s-swap" : "s-act") : i < f.cur || f.cur === -1 ? "s-dim" : ""), text: s }))));
      },
    });

    S.viz(root.querySelector("#v-anom"), {
      id: "anom", title: "Аномалии", sub: "Праг = средно + k·σ от обучителния период.",
      code: "ch07_ids",
      inputs: [{ id: "base", label: "нормални стойности", value: "40 42 38 45 41 39 44 43", width: "14em" }, { id: "x", label: "наблюдение", type: "number", value: 52, width: "6em" }, { id: "k", label: "k", type: "number", value: 2, width: "4em" }],
      presets: [{ label: "малко над", values: { x: 46 } }, { label: "силно над", values: { x: 120 } }, { label: "k = 3", values: { k: 3, x: 46 } }],
      legend: [["s-done", "норма"], ["s-swap", "над прага"]],
      build: algos.anom,
      draw(st, f) {
        const arr = f.B.concat([f.x]);
        const cls = { [arr.length - 1]: f.res === true ? "s-swap" : f.res === false ? "s-done" : "s-act" };
        S.drawBars(st, arr, { height: 150, cls, fmt: (v) => Math.round(v) });
        if (f.thr != null) st.append(h("p", { class: "mono", text: `праг ${f.thr.toFixed(2)} · последната лента е наблюдението` }));
      },
    });

    const ob = root.querySelector("#obs"), od = root.querySelector("#obs-detail");
    const obs = OBS.map((o, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => po(i) }, h("h4", { text: o.k })));
    ob.append(...obs);
    function po(i) { obs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); od.innerHTML = `<p><b>${OBS[i].k}</b> → ${OBS[i].ok}</p>`; }
    po(1);

    const irs = root.querySelector("#ir-svg"), ird = root.querySelector("#ir-detail");
    function drawIR(sel) {
      irs.innerHTML = "";
      const cx = 300, cy = 150, R = 110;
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 600 300", width: 600 });
      svg.append(S.svg("circle", { cx, cy, r: R, fill: "none", stroke: "var(--line)", "stroke-width": 2, "stroke-dasharray": "6 5" }));
      IR.forEach((s, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / IR.length, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        svg.append(S.svg("g", { class: "node " + (i === sel ? "s-act" : i < sel ? "s-done" : ""), style: "cursor:pointer", onclick: () => pi(i) }, S.svg("circle", { cx: x, cy: y, r: 20 }),
          S.svg("text", { x, y: y + 5, "text-anchor": "middle", text: i + 1 })));
        svg.append(S.svg("text", { x: x + (Math.cos(a) >= -0.01 ? 28 : -28), y: y + 5, "text-anchor": Math.cos(a) >= -0.01 ? "start" : "end", text: s.k }));
      });
      irs.append(h("div", { class: "tbl-wrap" }, svg));
    }
    function pi(i) { drawIR(i); ird.innerHTML = `<p><b>${i + 1}. ${IR[i].k}</b> — ${IR[i].d}</p>`; }
    pi(2);
  }

  S.chapter({ id: "zashtita", order: 7, num: "7", group: "Защита", title: "Средства за защита и реагиране", lead: "Защитна стена (първото съвпадащо правило), IDS по сигнатури и по аномалии, дневниците като свидетелство и цикълът на реагиране при инцидент.", html, mount, algos });
})();
