/* Раздел 1 — цели и основни понятия: CIA, актив/заплаха/уязвимост/атака/риск, удостоверяване/оторизация/отчетност. */
(function () {
  const S = window.Study, h = S.h;

  const USERS = ["alice", "bob", "admin"];
  const ACL = [["alice", "syllabus", "read"], ["alice", "grades", "read"], ["bob", "syllabus", "read"], ["bob", "grades", "read"], ["bob", "grades", "write"], ["admin", "syllabus", "write"]];
  const RNAME = ["ALLOW", "UNKNOWN", "BAD_AUTH", "FORBIDDEN"];
  const LEVELS = ["нисък", "среден", "висок", "критичен"];
  const LVCLS = ["s-done", "s-cmp", "s-swap", "s-swap"];
  const M = { mfa: 1, patch: 2, least: 4, backup: 8, encrypt: 16 };

  const algos = {
    /* Проверка на достъп — същият ред като check_access() в 01_access.c */
    access({ user, pw, op, obj, srv }) {
      user = String(user || "").trim();
      if (!/^[a-z]{1,12}$/.test(user)) throw new Error("Потребителят трябва да е от 1 до 12 малки латински букви.");
      const pwOk = pw === true || pw === "true" || pw === 1 || pw === "1";
      const server = srv === true || srv === "true" || srv === 1 || srv === "1";
      if (!["read", "write"].includes(op)) throw new Error("Операцията е read или write.");
      if (!["grades", "syllabus"].includes(obj)) throw new Error("Обектът е grades или syllabus.");
      const F = [], log = [];
      let cmp = 0;
      const base = () => ({ user, pwOk, op, obj, server, log: undefined, logs: log.slice(), stats: { сравнения: cmp, записи: log.length } });
      const audit = (r, phase) => { log.push([user, op, obj, r]); F.push({ ...base(), at: "log", phase, vars: { user, op, obj, result: RNAME[r] }, msg: `Записваме в <dfn data-g="дневник">дневника</dfn>: ${user} · ${op} · ${obj} → <b>${RNAME[r]}</b>. Записват се и отказите — те също са свидетелство.`, log: `log: ${user} ${op} ${obj} → ${RNAME[r]}` }); };
      F.push({ ...base(), at: "ident", phase: "ident", vars: { user }, msg: `<b>Идентификация.</b> Заявката казва „аз съм <code>${user}</code>“. Търсим името сред известните акаунти.` });
      const known = USERS.includes(user);
      if (!known) {
        F.push({ ...base(), at: "unknown", phase: "ident", bad: "ident", vars: { user, known: 0 }, msg: `Няма акаунт <code>${user}</code>. Отказ още на първата стъпка.` });
        audit(1, "ident");
        return { frames: F, result: 1, cmp, nlog: log.length };
      }
      F.push({ ...base(), at: "authn", phase: "authn", vars: { user, known: 1, password_ok: pwOk ? 1 : 0 }, msg: `<b>Удостоверяване.</b> Името само заявява. Проверяваме доказателството (паролата): ${pwOk ? "вярно" : "<b>грешно</b>"}.` });
      if (!pwOk) {
        F.push({ ...base(), at: "badauth", phase: "authn", bad: "authn", vars: { user, password_ok: 0 }, msg: "Доказателството не е прието. Оторизацията изобщо не се стига." });
        audit(2, "authn");
        return { frames: F, result: 2, cmp, nlog: log.length };
      }
      F.push({ ...base(), at: "noauthz", phase: "authz", vars: { user, server_checks: server ? 1 : 0 }, msg: server ? "Сървърът проверява правата за конкретната операция и обект." : "<b>Грешката:</b> правата се проверяват само в интерфейса (бутонът е скрит), а сървърната операция е достъпна." });
      if (!server) {
        F.push({ ...base(), at: "allow_blind", phase: "authz", bad: "authz", vars: { user, op, obj, return: "ALLOW" }, msg: `Разрешено <b>без проверка</b>: ${user} може да ${op} ${obj}. Успешният вход се третира като право за всяка операция.` });
        audit(0, "authz");
        return { frames: F, result: 0, cmp, nlog: log.length, blind: true };
      }
      for (let i = 0; i < ACL.length; i++) {
        F.push({ ...base(), at: "authz", phase: "authz", row: i, vars: { user, op, obj, i }, msg: `<b>Оторизация.</b> Ред ${i} от списъка за достъп.` });
        cmp++;
        const [u, o, p] = ACL[i];
        const hit = u === user && o === obj && p === op;
        F.push({ ...base(), at: "cmp", phase: "authz", row: i, hit, vars: { user, op, obj, i, "ACL[i]": `${u} ${o} ${p}` }, msg: `(${u}, ${o}, ${p}) == (${user}, ${obj}, ${op})? <b>${hit ? "да" : "не"}</b>.`, log: `ACL[${i}] ${hit ? "съвпада" : "—"}` });
        if (hit) {
          F.push({ ...base(), at: "allow", phase: "authz", row: i, hit: true, vars: { user, op, obj, return: "ALLOW" }, msg: `Разрешено по ред ${i}. Правото е за <b>тази</b> операция върху <b>този</b> обект.` });
          audit(0, "acct");
          return { frames: F, result: 0, cmp, nlog: log.length };
        }
      }
      F.push({ ...base(), at: "forbidden", phase: "authz", bad: "authz", vars: { user, op, obj, return: "FORBIDDEN" }, msg: `Нито един ред не разрешава ${op} върху ${obj}. Участникът е удостоверен, но <b>няма право</b>.` });
      audit(3, "acct");
      return { frames: F, result: 3, cmp, nlog: log.length };
    },

    /* Риск — същият модел като risk_eval() */
    risk({ L, I, prop, mfa, patch, least, backup, encrypt }) {
      L = S.int(L, 1, 5, "Вероятността"); I = S.int(I, 1, 5, "Въздействието");
      const p = { C: 0, I: 1, A: 2 }[prop];
      if (p == null) throw new Error("Свойството е C, I или A.");
      const on = (x) => x === true || x === "true" || x === 1 || x === "1";
      const ms = (on(mfa) ? 1 : 0) | (on(patch) ? 2 : 0) | (on(least) ? 4 : 0) | (on(backup) ? 8 : 0) | (on(encrypt) ? 16 : 0);
      const L0 = L, I0 = I, F = [];
      const dec = (v) => (v > 1 ? v - 1 : 1);
      const fr = (o) => ({ L0, I0, L, I, p, stats: { L, I, "L×I": L * I }, ...o });
      const steps = [
        ["mfa", M.mfa, "L", true, "<dfn data-g=\"многофакторно удостоверяване\">MFA</dfn> затруднява използването на откраднат акаунт → вероятността намалява."],
        ["patch", M.patch, "L", true, "Актуализирането премахва известни дефекти → вероятността намалява. Не компенсира грешни права."],
        ["least", M.least, "I", true, "<dfn data-g=\"минимални привилегии\">Минималните привилегии</dfn> ограничават обхвата → въздействието намалява."],
        ["backup", M.backup, "I", p !== 0, p !== 0 ? "Резервното копие помага за възстановяване → въздействието върху цялост/наличност намалява." : "Резервното копие <b>не помага</b> срещу изтичане: вече прочетените данни не се връщат."],
        ["encrypt", M.encrypt, "I", p === 0, p === 0 ? "Шифроването на съхранените данни намалява въздействието на изтичане." : "Шифроването не намалява въздействието върху цялост/наличност в този модел."],
      ];
      F.push(fr({ at: [], vars: { L, I, prop }, msg: `Изходно: вероятност L = ${L}, въздействие I = ${I}, засегнато свойство <b>${prop}</b>.` }));
      for (const [tag, bit, dim, applies, txt] of steps) {
        if (!(ms & bit)) continue;
        if (applies) { if (dim === "L") L = dec(L); else I = dec(I); }
        F.push(fr({ at: tag, applied: applies, vars: { L, I }, msg: txt, log: `${tag}: ${applies ? dim + "→" + (dim === "L" ? L : I) : "без ефект"}` }));
      }
      const score = L * I;
      F.push(fr({ at: "score", vars: { L, I, score }, msg: `score = L × I = ${L} × ${I} = <b>${score}</b> (беше ${L0 * I0}).` }));
      const lv = score <= 4 ? 0 : score <= 9 ? 1 : score <= 16 ? 2 : 3;
      F.push(fr({ at: "level", done: true, lv, vars: { L, I, score, level: LEVELS[lv] }, msg: `Ниво в <b>този</b> модел: <b>${LEVELS[lv]}</b>. Скалата и праговете са пример, не универсален стандарт.` }));
      return { frames: F, L, I, level: lv, ms };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Компютърната сигурност защитава информацията и системите срещу неразрешени действия и нежелани събития. Основните цели са <dfn data-g="конфиденциалност">конфиденциалност</dfn>, <dfn data-g="цялост">цялост</dfn> и <dfn data-g="наличност">наличност</dfn> — триадата <dfn data-g="cia">CIA</dfn>. Конфиденциалността ограничава разкриването; целостта защитава от неразрешена или незабелязана промяна; наличността осигурява достъп за оправомощените участници при необходимост.</p>
</div>

<div class="block">
  <h3>Схема 1. Целите на сигурността са различни</h3>
  <p class="muted">Щракни върху събитие — вижда се кое свойство нарушава. Една мярка може да помага за няколко свойства, но не ги прави синоними.</p>
  <div class="cards" id="cia-ev"></div>
  <div id="cia-svg"></div>
  <div class="key" id="cia-detail"></div>
</div>

<div class="block">
  <h3>Схема 2. Актив, заплаха, уязвимост, атака, въздействие</h3>
  <p class="prose"><dfn data-g="актив">Активът</dfn> има стойност. <dfn data-g="заплаха">Заплахата</dfn> е възможна причина за неблагоприятно събитие. <dfn data-g="уязвимост">Уязвимостта</dfn> е използваема слабост. <dfn data-g="атака">Атаката</dfn> е действие за използване или нарушаване. <dfn data-g="риск">Рискът</dfn> разглежда вероятност и въздействие в определен контекст.</p>
  <p class="muted">Щракни върху звено от веригата.</p>
  <div id="chain"></div>
  <div class="key" id="chain-detail"></div>
  <details class="trap"><summary>Капан: „няма атака, значи няма риск“</summary><div>
    <p>Сървърът може да има уязвимост, без да има данни за извършена атака; <b>липсата на наблюдавана атака не доказва липса на риск</b>. Обратно — рискът не е друго име за уязвимостта: той оценява вероятност и последствия в модел.</p>
  </div></details>
</div>

<div class="block">
  <h3>Риск като модел: калкулатор</h3>
  <p class="prose">Рискът съчетава вероятност и последствие <b>в определен модел</b>. Тук моделът е матрица 5×5 и произведение L × I — един от възможните; не е коректно всяка оценка да се свежда до едно универсално точно произведение. Включи мерки и виж коя координата местят: някои намаляват вероятността, други — въздействието, а трети не помагат за избраното свойство.</p>
  <div id="v-risk"></div>
  <details class="hint"><summary>Хинт: защо резервното копие не помага срещу изтичане</summary><div>
    <p>Резервните копия подпомагат възстановяване, но не спират изтичане на вече прочетени данни. Изтичането нарушава конфиденциалност; копието възстановява цялост и наличност. Различни свойства — различни механизми.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схеми 3 и 6. Удостоверяване, оторизация, отчетност</h3>
  <p class="prose"><dfn data-g="идентификация">Идентификацията</dfn> заявява име. <dfn data-g="удостоверяване">Удостоверяването</dfn> (authentication) проверява доказателство. <dfn data-g="оторизация">Оторизацията</dfn> (authorization) решава дали този участник може да извърши тази операция върху този обект. <dfn data-g="отчетност">Отчетността</dfn> (accounting/audit) записва действията. Успешен вход не означава право за всяка операция; защитата трябва да действа и при вече компрометиран обикновен акаунт.</p>
  <div id="v-access"></div>
  <details class="trap"><summary>Капан: проверка само на бутона в интерфейса</summary><div>
    <p>Изключи „сървърът проверява правата“ и пусни alice → write → grades. Интерфейсът може да не показва бутона, но ако сървърната операция остава достъпна, удостовереният потребител я изпълнява. Правата се проверяват за конкретното действие и обект — на сървъра.</p>
  </div></details>
  <details class="hint"><summary>Хинт: защо дневникът записва и отказите</summary><div>
    <p>Дневникът е отделно свидетелство за наблюдаваното действие. Поредица откази за много акаунти е признак за пробване на пароли (виж <a href="#prilozhenia">раздел 5</a>). Дневникът трябва да е защитен от подмяна — иначе нападателят изтрива следите си.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 4. Различни свойства на едно съобщение</h3>
  <p class="prose">„Автентичен“, „цял“ и „поверителен“ обозначават отделни свойства. Включвай ги поотделно. Изключение: автентичността на произхода включва целостта — променено съобщение вече не е това, което подателят е изпратил, затова „автентично, но не цяло“ не е смислена комбинация. Тема 10 обяснява криптографските механизми, които покриват различни части.</p>
  <div class="row" id="msg-tg"></div>
  <div class="key" id="msg-detail"></div>
</div>`;

  const CIA = [
    { ev: "Изтичане на оценки", p: "C", why: "Данните са прочетени от неоправомощени — нарушена е конфиденциалността. Целостта може да е запазена: оценките не са променени." },
    { ev: "Подмяна на оценки", p: "I", why: "Данните са променени неразрешено — нарушена е целостта. Може никой външен да не ги е прочел." },
    { ev: "Недостъпен портал", p: "A", why: "Оправомощените не могат да работят при нужда — нарушена е наличността. Данните може да са непокътнати и непрочетени." },
    { ev: "Откраднат акаунт на преподавател", p: "CIA", why: "Един инцидент може да засегне и трите: четене на чужди оценки (C), промяна (I), изтриване (A). Анализира се всяко свойство поотделно." },
  ];
  const PNAME = { C: "Конфиденциалност", I: "Цялост", A: "Наличност" };
  const CHAIN = [
    { k: "Актив", g: "актив", ex: "Базата с оценки на студентите.", note: "Без актив няма какво да се губи." },
    { k: "Заплаха", g: "заплаха", ex: "Външен нападател, който иска да промени оценки; повреда на диск.", note: "Възможна причина — не е действие и не е слабост." },
    { k: "Уязвимост", g: "уязвимост", ex: "Сървърът не проверява правата при запис; слаба парола.", note: "Слабостта съществува и без атака." },
    { k: "Атака", g: "атака", ex: "Заявка за запис на оценка от акаунт без право.", note: "Действието, което използва слабостта." },
    { k: "Въздействие", g: "риск", ex: "Променени оценки — нарушена цялост; загуба на доверие.", note: "Рискът оценява вероятност × последствие в модел — не е друго име за уязвимостта." },
  ];
  const MSGP = [["auth", "автентично", "подателят е този, за когото се представя"], ["integ", "цяло", "не е променено"], ["conf", "поверително", "не е прочетено от трети лица"]];

  function mount(root) {
    // CIA
    const ev = root.querySelector("#cia-ev"), cd = root.querySelector("#cia-detail"), cs = root.querySelector("#cia-svg");
    const btn = CIA.map((c, i) => h("button", { class: "card", "aria-pressed": "false", onclick: () => pickCia(i) }, h("span", { class: "eyebrow", text: "събитие" }), h("h4", { text: c.ev })));
    ev.append(...btn);
    function drawTri(hit) {
      cs.innerHTML = "";
      const W = 420, H = 210, P = { C: [210, 50], I: [70, 170], A: [350, 170] };
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: `0 0 ${W} ${H}`, width: W });
      [["C", "I"], ["I", "A"], ["A", "C"]].forEach(([a, b]) => svg.append(S.svg("line", { class: "edge", x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1] })));
      for (const k of ["C", "I", "A"]) {
        svg.append(S.svg("g", { class: "node " + (hit.includes(k) ? "s-swap" : "s-done") }, S.svg("circle", { cx: P[k][0], cy: P[k][1], r: 22 })));
        svg.append(S.svg("text", { x: P[k][0], y: P[k][1] + 5, "text-anchor": "middle", text: k }));
        svg.append(S.svg("text", { x: P[k][0], y: P[k][1] + (k === "C" ? -28 : 40), "text-anchor": "middle", class: "wt", text: PNAME[k] }));
      }
      cs.append(svg);
    }
    function pickCia(i) {
      btn.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const c = CIA[i];
      drawTri(c.p.split(""));
      cd.innerHTML = `<p><b>${c.ev}</b> → нарушено: ${c.p.split("").map((x) => PNAME[x]).join(", ")}.</p><p>${c.why}</p>`;
    }
    pickCia(0);

    // верига
    const ch = root.querySelector("#chain"), chd = root.querySelector("#chain-detail");
    function drawChain(sel) {
      ch.innerHTML = "";
      const W = 720, H = 90, w = 120, gap = (W - 5 * w) / 4;
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: `0 0 ${W} ${H}`, width: W });
      CHAIN.forEach((c, i) => {
        const x = i * (w + gap);
        if (i) svg.append(S.svg("line", { class: "edge", x1: x - gap, y1: 45, x2: x - 4, y2: 45 }), S.svg("path", { d: `M${x - 4} 45 l-8 -5 v10 z`, fill: "var(--line)" }));
        const g = S.svg("g", { class: "node " + (i === sel ? "s-act" : ""), style: "cursor:pointer", onclick: () => pickChain(i) },
          S.svg("rect", { x, y: 22, width: w, height: 46, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }),
          S.svg("text", { x: x + w / 2, y: 50, "text-anchor": "middle", text: c.k }));
        svg.append(g);
      });
      ch.append(h("div", { class: "tbl-wrap" }, svg));
    }
    function pickChain(i) { drawChain(i); const c = CHAIN[i]; chd.innerHTML = `<p><b><dfn data-g="${c.g}" tabindex="0">${c.k}</dfn></b> — пример: ${c.ex}</p><p class="muted">${c.note}</p>`; }
    pickChain(0);

    // риск
    S.viz(root.querySelector("#v-risk"), {
      id: "risk", title: "Калкулатор на риска (един модел)", sub: "Матрица вероятност × въздействие; ○ — преди мерките, ● — след тях.",
      code: "ch01_risk",
      inputs: [
        { id: "L", label: "вероятност L (1–5)", type: "number", value: 4, width: "5em" },
        { id: "I", label: "въздействие I (1–5)", type: "number", value: 5, width: "5em" },
        { id: "prop", label: "засегнато свойство", type: "select", value: "C", options: [["C", "C — изтичане"], ["I", "I — подмяна"], ["A", "A — недостъпност"]] },
        { id: "mfa", label: "MFA", type: "checkbox", value: false },
        { id: "patch", label: "актуализации", type: "checkbox", value: false },
        { id: "least", label: "мин. привилегии", type: "checkbox", value: false },
        { id: "backup", label: "резервно копие", type: "checkbox", value: true },
        { id: "encrypt", label: "шифроване", type: "checkbox", value: false },
      ],
      presets: [
        { label: "Изтичане + копие", values: { prop: "C", L: 4, I: 5, mfa: false, patch: false, least: false, backup: true, encrypt: false }, title: "Копието не помага срещу изтичане" },
        { label: "Подмяна + копие", values: { prop: "I", L: 4, I: 5, mfa: false, patch: false, least: false, backup: true, encrypt: false } },
        { label: "Всички мерки", values: { mfa: true, patch: true, least: true, backup: true, encrypt: true } },
      ],
      legend: [["s-dim", "преди"], ["s-act", "след"], ["s-done", "нисък"], ["s-cmp", "среден"], ["s-swap", "висок / критичен"]],
      build: algos.risk,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "L \\ I" }), ...[1, 2, 3, 4, 5].map((i) => h("th", { text: i }))));
        for (let l = 5; l >= 1; l--) {
          const tr = h("tr", null, h("th", { text: l }));
          for (let i = 1; i <= 5; i++) {
            const sc = l * i, lv = sc <= 4 ? 0 : sc <= 9 ? 1 : sc <= 16 ? 2 : 3;
            let mark = "", cls = "";
            if (l === f.L0 && i === f.I0) mark = "○";
            if (l === f.L && i === f.I) { mark = mark ? "○●" : "●"; cls = "s-act"; }
            const td = h("td", { class: cls, text: mark || sc, title: `${l}×${i}=${sc} (${LEVELS[lv]})` });
            if (!cls) td.style.background = `color-mix(in srgb, var(${["--st-done-bg", "--st-cmp-bg", "--st-swap-bg", "--st-swap-bg"][lv]}) ${lv === 3 ? 100 : 70}%, transparent)`;
            tr.append(td);
          }
          tb.append(tr);
        }
        st.append(h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, tb),
          h("div", { style: { display: "grid", gap: "6px", alignContent: "start" } },
            h("p", null, "Преди: ", h("b", { text: `${f.L0}×${f.I0} = ${f.L0 * f.I0}` })),
            h("p", null, "Сега: ", h("b", { text: `${f.L}×${f.I} = ${f.L * f.I}` })),
            f.lv != null ? h("p", null, h("span", { class: "pill " + LVCLS[f.lv], text: LEVELS[f.lv] })) : null,
            f.applied === false ? h("p", { class: "warn", text: "Тази мярка не намалява риска за избраното свойство." }) : null)));
      },
    });

    // достъп
    S.viz(root.querySelector("#v-access"), {
      id: "access", title: "Заявка: идентификация → удостоверяване → оторизация → дневник", sub: "Учебен списък за достъп (ACL) с 6 реда.",
      code: "ch01_access",
      inputs: [
        { id: "user", label: "потребител", value: "alice", width: "7em" },
        { id: "pw", label: "вярна парола", type: "checkbox", value: true },
        { id: "op", label: "операция", type: "select", value: "write", options: ["read", "write"] },
        { id: "obj", label: "обект", type: "select", value: "grades", options: ["grades", "syllabus"] },
        { id: "srv", label: "сървърът проверява правата", type: "checkbox", value: true },
      ],
      presets: [
        { label: "alice чете оценки", values: { user: "alice", pw: true, op: "read", obj: "grades", srv: true } },
        { label: "bob пише оценки", values: { user: "bob", pw: true, op: "write", obj: "grades", srv: true } },
        { label: "admin пише оценки", values: { user: "admin", pw: true, op: "write", obj: "grades", srv: true }, title: "Администратор ≠ всички права" },
        { label: "Само интерфейсът", values: { user: "alice", pw: true, op: "write", obj: "grades", srv: false } },
        { label: "Непознат eve", values: { user: "eve", pw: true, op: "read", obj: "grades", srv: true } },
      ],
      legend: [["s-act", "текуща фаза / ред"], ["s-done", "съвпадение / разрешено"], ["s-swap", "отказ / пропусната проверка"]],
      build: algos.access,
      draw(st, f) {
        st.innerHTML = "";
        const PH = [["ident", "Идентификация"], ["authn", "Удостоверяване"], ["authz", "Оторизация"], ["acct", "Отчетност"]];
        const order = PH.map((p) => p[0]);
        const cur = f.at === "log" ? "acct" : f.phase;
        const row = h("div", { class: "row" });
        PH.forEach(([k, t]) => {
          const ci = order.indexOf(cur), ki = order.indexOf(k);
          let cls = ki < ci ? "s-done" : ki === ci ? (f.bad === k ? "s-swap" : "s-act") : "s-dim";
          if (k === "authz" && !f.server && ki <= ci && f.phase !== "ident" && f.phase !== "authn") cls = "s-swap";
          row.append(h("span", { class: "pill " + cls, text: t }));
        });
        st.append(row);
        const tb = h("table", { class: "t grid", style: { marginTop: "10px" } }, h("tr", null, h("th", { text: "#" }), h("th", { text: "user" }), h("th", { text: "obj" }), h("th", { text: "op" })));
        ACL.forEach((r, i) => {
          const cls = f.row === i ? (f.hit ? "s-done" : "s-cmp") : f.row != null && i < f.row ? "s-dim" : "";
          tb.append(h("tr", null, h("td", { class: cls, text: i }), ...r.map((x) => h("td", { class: cls, text: x }))));
        });
        const lg = h("table", { class: "t" }, h("tr", null, h("th", { text: "дневник" })));
        (f.logs.length ? f.logs : [["—"]]).forEach((l) => lg.append(h("tr", null, h("td", { class: "mono", text: l.length > 1 ? `${l[0]} ${l[1]} ${l[2]} → ${RNAME[l[3]]}` : "празен" }))));
        st.append(h("div", { class: "split", style: { marginTop: "10px" } }, h("div", { class: "tbl-wrap" }, tb), h("div", { class: "tbl-wrap" }, lg)));
      },
    });

    // свойства на съобщение
    const tg = root.querySelector("#msg-tg"), md = root.querySelector("#msg-detail");
    const st = { auth: false, integ: true, conf: false };
    const bs = MSGP.map(([k, t]) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => { st[k] = !st[k]; upd(); }, text: t }));
    tg.append(...bs);
    function upd() {
      MSGP.forEach(([k], i) => bs[i].setAttribute("aria-pressed", st[k] ? "true" : "false"));
      const yes = MSGP.filter(([k]) => st[k]).map((x) => `${x[1]} (${x[2]})`), no = MSGP.filter(([k]) => !st[k]).map((x) => x[1]);
      let ex = "";
      if (st.auth && !st.integ) ex = "Несъвместима комбинация: автентичността на произхода предполага цялост (Menezes, van Oorschot, Vanstone, Handbook of Applied Cryptography, §9.6).";
      else if (st.integ && !st.auth) ex = "Съобщението може да е непроменено, но да е изпратено от измамник.";
      else if (st.auth && !st.conf) ex = "Може да е автентично, но да е прочетено от трети лица.";
      else if (st.conf && !st.integ) ex = "Може да е шифровано, но да допуска контролирана промяна, ако схемата не осигурява подходящо удостоверяване.";
      else if (st.auth && st.integ && st.conf) ex = "И трите свойства — но всяко е осигурено от свой механизъм и се оценява спрямо модел на противника.";
      else ex = "Нито едно свойство не следва автоматично от друго.";
      md.innerHTML = `<p><b>Има:</b> ${yes.join(", ") || "—"}. <b>Няма:</b> ${no.join(", ") || "—"}.</p><p>${ex}</p>`;
    }
    upd();
  }

  S.chapter({ id: "celi", order: 1, num: "1", group: "Основа", title: "Цели и основни понятия", lead: "Триадата CIA, веригата актив–заплаха–уязвимост–атака–въздействие, рискът като модел и разликата между удостоверяване и оторизация.", html, mount, algos });
})();
