/* Раздел 9 — допълнение и свързващ пример: четене на файл през подсистемите; ВМ и контейнер; bare-metal и RTOS. */
(function () {
  const S = window.Study, h = S.h;

  /* Стъпките на свързващия пример от ръководството (Глава 8). Без C код — това е концептуален поток. */
  const READ = [
    { sub: "app", st: 1, t: "Приложението вика read(fd, buf, n)", d: "Библиотечната функция подготвя аргументите и прави системно извикване.", link: "sastav" },
    { sub: "kern", st: 1, t: "Смяна на режим → ядро", d: "Контролиран вход към услуга на ядрото. Още няма смяна на процес.", link: "sastav" },
    { sub: "fs", st: 1, t: "Проверка на дескриптора и правата", d: "ОС проверява, че fd е отворен за четене от този процес, и намира файловия обект (inode).", link: "fs" },
    { sub: "fs", st: 1, t: "Кеш?", d: "Ако данните са в кеша — копират се веднага и се преминава към последната стъпка. Иначе — заявка към драйвер.", branch: true, link: "fs" },
    { sub: "dev", st: 2, t: "Заявка към драйвер", d: "Драйверът изпраща команда към устройството. Данните не са налични веднага.", miss: true },
    { sub: "proc", st: 2, t: "Процесът се блокира", d: "Процесът чака събитие — става блокиран. Не е в опашката на готовите.", miss: true, link: "procesi" },
    { sub: "sched", st: 2, t: "Друга задача използва процесора", d: "Планировчикът избира готов процес; превключване на контекст.", miss: true, link: "planirane" },
    { sub: "dev", st: 0, t: "Прекъсване: операцията завърши", d: "Обработчикът на прекъсване отбелязва събитието.", miss: true },
    { sub: "proc", st: 0, t: "Процесът става готов", d: "Не веднага изпълняващ се — чака планировчика да го избере.", miss: true, link: "procesi" },
    { sub: "mem", st: 1, t: "Данните в адресното пространство", d: "Ядрото копира данните в buf — в адресното пространство на процеса (виртуални адреси → рамки).", link: "pamet" },
    { sub: "app", st: 1, t: "Връщане от извикването", d: "Смяна на режим обратно; read връща броя прочетени байтове.", link: "sastav" },
  ];
  const SUBN = { app: "приложение", kern: "ядро", fs: "файлова система", dev: "драйвер / устройство", proc: "процеси", sched: "планиране", mem: "памет" };
  const STN = ["готов", "изпълнява се", "блокиран"], STC = ["s-cmp", "s-act", "s-swap"];

  const algos = {
    readflow({ cached }) {
      const hit = cached === true || cached === "true";
      const steps = READ.filter((s) => !(hit && s.miss));
      const F = steps.map((s, i) => ({ step: s, idx: i, n: steps.length, hit, msg: `<b>${i + 1}. ${s.t}</b> — ${s.d}${s.branch ? (hit ? " <b>Попадение в кеша.</b>" : " <b>Пропуск в кеша.</b>") : ""}`, vars: { подсистема: SUBN[s.sub], процес: STN[s.st] }, log: `${i + 1}. ${s.t}` }));
      return { frames: F, steps: F.length };
    },
  };

  const html = `
<div class="prose">
  <p>Ръководството завършва със свързващ пример, който минава през четирите основни подсистеми: процеси, памет, планиране и файлове. Превключи „данните са в кеша“, за да видиш кои стъпки отпадат.</p>
</div>

<div class="block">
  <h3>Четене на файл през подсистемите</h3>
  <div id="v-read"></div>
  <details class="hint"><summary>Хинт: как да го кажеш накратко</summary><div>
    <p>„Приложението влиза чрез системна услуга; ОС проверява дескриптора и правата, намира кеширани данни или изпраща заявка към драйвер. Процесът може да бъде блокиран, докато друга задача използва процесора. Завършването го прави готов, данните се предоставят в неговото адресно пространство и извикването връща резултат.“</p>
  </div></details>
  <details class="trap"><summary>Изяснен въпрос: прекъсването създава ли нов процес?</summary><div>
    <p>Не като общ механизъм. То прехвърля управлението към обработчик. Обработчикът може да събуди чакаща задача, след което планировчикът евентуално да избере друго изпълнение.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 21 · Виртуална машина и контейнер</h3>
  <p class="prose">Виртуализацията предоставя виртуален хардуер за гостуваща ОС. Контейнерите изолират процеси и ресурси, като обикновено споделят ядро. Това са различни равнища на абстракция. Щракни.</p>
  <div class="row"><button class="btn" id="vm-b" aria-pressed="true">виртуална машина</button><button class="btn" id="ct-b" aria-pressed="false">контейнер</button></div>
  <div class="tbl-wrap" id="vm-svg"></div>
  <p class="muted" id="vm-note"></p>
  <details class="trap"><summary>Капан: контейнерът е „лека виртуална машина“</summary><div>
    <p>Разликата е границата на абстракцията, а не само удобството за пакетиране. Контейнерът не превръща приложение, изискващо едно ядро, в приложение за произволно друго ядро. И двете среди използват реалния хардуер на хоста и имат конкретни ограничения на изолацията. Правата за достъп, ограниченията на ресурси и отделянето на адресни пространства работят съвместно, но не са взаимозаменяеми.</p>
  </div></details>
</div>

<div class="block">
  <h3>Bare-metal фърмуер и RTOS</h3>
  <p class="prose">При bare-metal фърмуер няма задължително обща ОС, но пак съществуват прекъсвания, буфери и споделени ресурси. Главният цикъл и обработчиците могат да се намесват един в друг. <b>Липсата на нишки не премахва всички състезания.</b> <dfn data-g="rtos">RTOS</dfn> добавя задачи, планиране и синхронизация; тя не прави автоматично правилен протокола за <dfn data-g="dma">DMA</dfn> буфер от тема 1.</p>
  <details class="hint"><summary>Хинт: същото загубено увеличение, без нишки</summary><div>
    <p>Главният цикъл прави <code>count = count + 1</code>, а обработчик на прекъсване също променя <code>count</code>. Ако прекъсването дойде между четенето и записа в главния цикъл, промяната на обработчика се губи — точно Схема 10 от <a href="#sinhronizacia">раздел 4</a>, но с прекъсване на мястото на втората нишка.</p>
  </div></details>
</div>

<div class="block">
  <h3>Имена и стандарти</h3>
  <p class="prose">Android и iOS са продуктови имена. UNIX е историческо име и марка, а не акроним, който трябва изкуствено да се разгъва. <dfn data-g="posix">POSIX</dfn> означава Portable Operating System Interface и описва стандартизирани интерфейси.</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-read"), {
      id: "read", title: "read(fd, buf, n) — от приложението до устройството и обратно", sub: "Цветът на процеса: синьо — изпълнява се, червено — блокиран, оранжево — готов.",
      code: false,
      inputs: [{ id: "cached", label: "данните са в кеша", type: "checkbox", value: false }],
      legend: [["s-act", "изпълнява се"], ["s-swap", "блокиран"], ["s-cmp", "готов"]],
      build: algos.readflow,
      draw(st, f) {
        st.innerHTML = "";
        const lanes = Object.keys(SUBN);
        const tb = h("table", { class: "t" });
        lanes.forEach((ln) => {
          const on = f.step.sub === ln;
          tb.append(h("tr", null, h("th", { class: on ? "s-act" : "", style: on ? { background: "var(--cb)" } : null, text: SUBN[ln] }),
            h("td", { style: { minWidth: "240px" } }, on ? h("span", { class: "pill s-act", text: f.step.t }) : "")));
        });
        st.append(h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, tb),
          h("div", { class: "card " + STC[f.step.st], style: { borderColor: "var(--c)", background: "var(--cb)", opacity: 1 } }, h("span", { class: "eyebrow", text: "състояние на процеса" }), h("h4", { text: STN[f.step.st] }),
            h("p", { text: `стъпка ${f.idx + 1} от ${f.n}` + (f.hit ? " (попадение в кеша)" : "") }),
            f.step.link ? h("a", { href: "#" + f.step.link, text: "→ свързан раздел" }) : null)));
      },
    });

    const box = root.querySelector("#vm-svg"), note = root.querySelector("#vm-note");
    const bv = root.querySelector("#vm-b"), bc = root.querySelector("#ct-b");
    function draw(ct) {
      bv.setAttribute("aria-pressed", ct ? "false" : "true"); bc.setAttribute("aria-pressed", ct ? "true" : "false");
      const W = 560, H = 250;
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": ct ? "Контейнери" : "Виртуални машини" });
      const box2 = (x, y, w, hh, t, cls) => svg.append(S.svg("g", { class: "node " + cls }, S.svg("rect", { x, y, width: w, height: hh, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }), S.svg("text", { x: x + w / 2, y: y + hh / 2 + 4, "text-anchor": "middle", style: "font-size:12px", text: t })));
      box2(10, 210, W - 20, 32, "хардуер на хоста", "s-dim");
      if (!ct) {
        box2(10, 170, W - 20, 32, "хост ОС / хипервайзор", "s-piv");
        [0, 1].forEach((i) => { const x = 20 + i * 275; box2(x, 120, 245, 40, "виртуален хардуер", "s-cmp"); box2(x, 72, 245, 40, `гост ядро ${i + 1}`, "s-piv"); box2(x, 20, 245, 44, `приложения ${i + 1}`, "s-act"); });
        note.textContent = "Всяка виртуална машина има собствено ядро над виртуален хардуер. Граница на абстракцията: хардуерът.";
      } else {
        box2(10, 170, W - 20, 32, "едно ядро на хоста (общо)", "s-piv");
        [0, 1, 2].forEach((i) => { const x = 20 + i * 180; box2(x, 110, 160, 50, "изолация от ядрото", "s-cmp"); box2(x, 30, 160, 70, `контейнер ${i + 1}: процеси`, "s-act"); });
        note.textContent = "Контейнерите са процеси, изолирани чрез механизми на общото ядро. Граница на абстракцията: ядрото.";
      }
      box.innerHTML = ""; box.append(svg);
    }
    bv.onclick = () => draw(false); bc.onclick = () => draw(true);
    draw(false);
  }

  S.chapter({ id: "dopalnenie", order: 9, num: "9", group: "Обобщение", title: "Допълнение и свързващ пример", lead: "Четене на файл през процеси, памет, планиране и файлове; виртуална машина и контейнер; bare-metal и RTOS.", html, mount, algos });
})();
