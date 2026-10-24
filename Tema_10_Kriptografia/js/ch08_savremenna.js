/* Раздел 8 — Допълнение за съвременната криптография (извън конспекта). Концептуални щракаеми схеми, без C код. */
(function () {
  const S = window.Study, h = S.h;

  const ROLES = {
    sym: { t: "Симетрично шифроване", steps: [["Изпращач", "M"], ["E с общ таен K", "C"], ["канал", "C"], ["D с общ таен K", "M"], ["Получател", "M"]], who: "И двамата имат K. Никой друг не може да дешифрира.", hides: "да", proves: "не (само по себе си)", g: "симетрична криптография" },
    asym: { t: "Асиметрично шифроване", steps: [["Изпращач", "M"], ["E с публичния ключ на получателя", "C"], ["канал", "C"], ["D с частния ключ на получателя", "M"], ["Получател", "M"]], who: "Всеки може да шифрова; само притежателят на частния ключ дешифрира. Публичният ключ трябва да е автентичен. На практика често се използват хибридни конструкции.", hides: "да", proves: "не", g: "асиметрична криптография" },
    hash: { t: "Хеш", steps: [["Изпращач", "M"], ["H (без ключ)", "h = H(M)"], ["канал", "M, h"], ["H(M) == h ?", "да/не"], ["Получател", "?"]], who: "Всеки може да преизчисли H. Съвпадение на хешове само по себе си не удостоверява изпращача: нападателят подменя и M, и h.", hides: "не", proves: "не", g: "хеш" },
    mac: { t: "MAC", steps: [["Изпращач", "M"], ["MAC с общ таен K", "t"], ["канал", "M, t"], ["MAC с K == t ?", "да/не"], ["Получател", "M"]], who: "Само притежател на K може да създаде или провери t. Не дава публична проверимост: и двамата имат K, третата страна не може да различи кой е подписал.", hides: "не", proves: "цялост и произход спрямо притежанието на K", g: "mac" },
    sig: { t: "Цифров подпис", steps: [["Подписващ", "M"], ["Sign с частен ключ", "σ"], ["канал", "M, σ"], ["Verify с публичен ключ", "да/не"], ["Всеки проверяващ", "M"]], who: "Само притежателят на частния ключ подписва; всеки с автентичния публичен ключ проверява. Подписването не е общо равнозначно на „шифроване с частния ключ“ и не скрива съдържанието.", hides: "не", proves: "цялост и връзка с ключа — не истинност на съдържанието", g: "цифров подпис" },
    aead: { t: "AEAD", steps: [["Изпращач", "M, AD"], ["Enc(K, nonce, M, AD)", "C, tag"], ["канал", "nonce, AD, C, tag"], ["Dec + проверка на tag", "M или отказ"], ["Получател", "M"]], who: "Комбинира защита на съдържанието с удостоверяване. AD (associated data) остават открити, но участват в удостоверяването. Nonce обикновено не е тайна; правилата за уникалност зависят от схемата.", hides: "M — да; AD — не", proves: "цялост на C и AD", g: "aead" },
  };

  const html = `
<p class="prose"><span class="extra-tag">извън конспекта</span> Целият раздел е синият текст на материала — допълнение за ориентация. Класическите шифри в темата са учебни модели, а не достатъчен избор за съвременна защита.</p>
<div class="prose">
  <p>Съвременните системи комбинират <dfn data-g="симетрична криптография">симетрично шифроване</dfn>, обмен или установяване на ключове, <dfn data-g="криптографски хеш">криптографски хешове</dfn> и удостоверяване. <dfn data-g="блоков шифър">Блоковият шифър</dfn> обработва блокове, а режимът определя обработката на цялото съобщение. <dfn data-g="aes">AES</dfn> е блоков шифър; <dfn data-g="rsa">RSA</dfn> е асиметрично семейство; SHA-256 (<dfn data-g="sha">SHA</dfn>) е хеш функция; <dfn data-g="hmac">HMAC</dfn> е код за удостоверяване с таен ключ. OpenSSL реализира съвременни криптографски алгоритми и <dfn data-g="tls">TLS</dfn>.</p>
</div>

<div class="block">
  <h3>Схеми 14–18. Шест механизма — шест различни роли на ключа</h3>
  <p class="muted">Избери механизъм. Схемата показва кой какво държи и какво минава по канала; таблицата отдолу — какво гарантира.</p>
  <div class="row" id="r-btn"></div>
  <div id="r-svg" style="overflow-x:auto"></div>
  <div class="key" id="r-txt"></div>
  <div class="tbl-wrap"><table class="t" id="r-tbl"></table></div>
</div>

<details class="trap"><summary>Капан (Изяснени въпроси): „цифровият подпис доказва, че съдържанието е вярно“</summary><div>
  <p>Той удостоверява връзката с ключ и целостта според схемата и предпоставките. Невярно твърдение може да бъде напълно валидно подписано. Получателят трябва да знае и чий е публичният ключ.</p>
</div></details>
<details class="trap"><summary>Капан (Изяснени въпроси): „по-дългият ключ премахва всички слабости“</summary><div>
  <p>Не. Повторен <dfn data-g="nonce">nonce</dfn>, изтичане на ключ, неправилен режим или липсващо удостоверяване могат да нарушат защитата без изчерпателно търсене на ключа. Сравни с <a href="#chestoti">повторената еднократна лента</a>: ключът изчезва, без да е отгатнат.</p>
</div></details>
<details class="trap"><summary>Капан: „шифроването с частния ключ е подпис“</summary><div>
  <p>Подписването не е общо равнозначно на „шифроване с частния ключ“ и не скрива съдържанието. При обмен на ключове участниците установяват общ секрет — това е трета роля. Протокол като TLS комбинира няколко такива механизма.</p>
</div></details>

<div class="block">
  <h3>Схема 19. Защо колизиите съществуват</h3>
  <p class="prose">За произволно дълги входове и фиксиран изход колизиите неизбежно съществуват — принцип на чекмеджетата. Криптографската цел (collision resistance) е <b>трудност</b> да се намери определен вид съвпадение, а не математическо отсъствие на колизии.</p>
  <p class="muted">Играчка-функция с n-битов изход (не е криптографски хеш — само илюстрира броенето). Пусни и виж кога настъпва първото съвпадение.</p>
  <div id="v-coll"></div>
  <details class="hint"><summary>Хинт: защо първата колизия идва толкова рано</summary><div>
    <p>При 2<sup>n</sup> възможни изхода колизия е гарантирана след 2<sup>n</sup> + 1 входа, но вероятността за съвпадение става значителна много по-рано — около √(2<sup>n</sup>) входа (парадоксът на рождените дни). Пусни няколко пъти с n = 8: първото съвпадение средно идва около 20-ия вход (с голям разброс), а не около 256-ия. Затова изходите на реалните хеш функции са дълги (SHA-256: 256 бита). <span class="extra-tag">извън конспекта</span></p>
  </div></details>
</div>

<div class="split">
  <div class="key"><b>Стеганография ≠ криптография</b><p><dfn data-g="стеганография">Стеганографията</dfn> цели да скрие наличието на съобщение; криптографията защитава неговите свойства при видимо съобщение.</p></div>
  <div class="key"><b>Хешът не е шифроване</b><p>Няма обща операция за дешифриране. Фиксираният отпечатък съответства на много входове.</p></div>
</div>
<p class="prose muted">Литература: Shannon C., Communication Theory of Secrecy Systems, 1949; NIST FIPS 197 (AES); NIST CSRC Glossary. По конспекта: Станев С., Железов С. Компютърна и мрежова сигурност, 2005; Станев С. Стеганологична защита на информацията, 2013.</p>`;

  function toyHash(s, bits) {
    // FNV-1a (32 бита) върху Unicode кодовете на знаците (за ASCII = байтовете), отрязан до bits бита — само илюстрация
    let x = 0x811c9dc5;
    for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; }
    return x & ((1 << bits) - 1);
  }
  const WORDS = "ALPHA BRAVO CHARLIE DELTA ECHO FOXTROT GOLF HOTEL INDIA JULIET KILO LIMA MIKE NOVEMBER OSCAR PAPA QUEBEC ROMEO SIERRA TANGO UNIFORM VICTOR WHISKEY XRAY YANKEE ZULU".split(" ");

  const algos = {
    toyHash,
    collide({ bits, seed }) {
      bits = S.int(bits, 2, 10, "Битовете n");
      seed = S.int(seed, 0, 9999, "seed");
      const N = 1 << bits, seen = new Map(), F = [];
      for (let i = 0; i <= N; i++) {
        const w = `${WORDS[(i + seed) % WORDS.length]}-${i + seed}`;
        const v = toyHash(w, bits);
        if (seen.has(v)) {
          F.push({ i, w, v, prev: seen.get(v), fill: [...seen.keys()], N, done: true, vars: { входове: i + 1, изходи: N }, msg: `<b>Колизия</b> след ${i + 1} входа: „${seen.get(v)}“ и „${w}“ → ${v}. Гаранцията от принципа на чекмеджетата е ${N + 1}; √${N} ≈ ${Math.round(Math.sqrt(N))}.` });
          return { frames: F, at: i + 1 };
        }
        seen.set(v, w);
        F.push({ i, w, v, fill: [...seen.keys()], N, vars: { входове: i + 1, "заети чекмеджета": seen.size }, msg: `„${w}“ → ${v}. Заети ${seen.size} от ${N}.` });
      }
      return { frames: F, at: -1 };
    },
  };

  function mount(root) {
    const rb = root.querySelector("#r-btn"), rs = root.querySelector("#r-svg"), rt = root.querySelector("#r-txt"), tbl = root.querySelector("#r-tbl");
    let cur = "sym";
    const btns = {};
    Object.entries(ROLES).forEach(([k, R]) => { btns[k] = h("button", { class: "btn", "aria-pressed": "false", text: R.t, onclick: () => { cur = k; draw(); } }); rb.append(btns[k]); });
    tbl.append(h("tr", null, h("th", { text: "механизъм" }), h("th", { text: "скрива съдържанието" }), h("th", { text: "удостоверява" })));
    Object.entries(ROLES).forEach(([k, R]) => tbl.append(h("tr", { "data-k": k }, h("td", null, h("dfn", { "data-g": R.g, text: R.t })), h("td", { text: R.hides }), h("td", { text: R.proves }))));
    function draw() {
      Object.entries(btns).forEach(([k, b]) => b.setAttribute("aria-pressed", k === cur));
      tbl.querySelectorAll("tr[data-k]").forEach((tr) => (tr.style.background = tr.dataset.k === cur ? "var(--accent-soft)" : ""));
      const R = ROLES[cur], sv = S.svg, W = 780, H = 120;
      rs.innerHTML = "";
      const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      g.append(sv("defs", null, sv("marker", { id: "t10b", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, sv("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--muted)" }))));
      R.steps.forEach(([lab, out], i) => {
        const x = 8 + i * 156, w = 140;
        const cls = i === 2 ? "s-swap" : i === 1 || i === 3 ? "s-act" : "";
        const gg = sv("g", { class: "node " + cls });
        gg.append(sv("rect", { x, y: 20, width: w, height: 56, rx: 6, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }));
        const words = lab.split(" "), lines = [];
        let line = "";
        words.forEach((wd) => { if ((line + " " + wd).trim().length > 18) { lines.push(line.trim()); line = wd; } else line += " " + wd; });
        lines.push(line.trim());
        lines.slice(0, 2).forEach((l, q) => gg.append(sv("text", { x: x + w / 2, y: 40 + q * 15 - (lines.length > 1 ? 4 : -4), "text-anchor": "middle", style: "font-size:11.5px;font-weight:600", text: l })));
        g.append(gg);
        g.append(sv("text", { x: x + w / 2, y: 98, "text-anchor": "middle", class: "wt", text: out }));
        if (i < 4) g.append(sv("line", { x1: x + w, y1: 48, x2: x + w + 14, y2: 48, class: "edge", "marker-end": "url(#t10b)" }));
      });
      g.append(sv("text", { x: 8 + 2 * 156 + 70, y: 114, "text-anchor": "middle", class: "wt", style: "fill:var(--st-swap)", text: "противникът вижда това" }));
      rs.append(g);
      rt.innerHTML = `<p><b>${R.t}</b></p><p>${R.who}</p>`;
    }
    draw();

    S.viz(root.querySelector("#v-coll"), {
      id: "coll", title: "Принцип на чекмеджетата: 2ⁿ изхода, безброй входове", sub: "Всяка клетка е един възможен изход; оцветена = вече зает.",
      code: false,
      inputs: [{ id: "bits", label: "изход n бита", type: "number", value: 6, width: "5em" }, { id: "seed", label: "начало", type: "number", value: 0, width: "6em" }],
      presets: [{ label: "n = 4", values: { bits: 4 } }, { label: "n = 8", values: { bits: 8 } }],
      random: () => ({ seed: S.randInt(0, 9999) }),
      legend: [["s-done", "зает изход"], ["s-act", "текущ"], ["s-swap", "колизия"]],
      speed: 2,
      build: algos.collide,
      draw(st, f) {
        st.innerHTML = "";
        const set = new Set(f.fill), cols = Math.min(32, f.N);
        const grid = h("div", { style: { display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(10px, 18px))`, gap: "2px" } });
        for (let v = 0; v < f.N; v++) grid.append(h("div", { class: v === f.v ? (f.done ? "s-swap" : "s-act") : set.has(v) ? "s-done" : "", title: String(v), style: { aspectRatio: "1", border: "1px solid var(--c, var(--line))", background: "var(--cb, var(--panel))", borderRadius: "2px" } }));
        st.append(h("div", { style: { overflowX: "auto" } }, grid));
        st.append(h("p", { class: "mono", style: { marginTop: "8px" }, text: f.done ? `H(${f.prev}) = H(${f.w}) = ${f.v}` : `H(${f.w}) = ${f.v}` }));
      },
    });
  }

  S.chapter({ id: "savremenna", order: 8, num: "8", group: "Допълнение", title: "Съвременна криптография (ориентация)", lead: "Хеш, MAC, цифров подпис, AEAD — кой ключ каква роля има и какво всеки механизъм гарантира. Извън конспекта.", html, mount, algos });
})();
