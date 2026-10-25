/* Раздел 3 — допълнение: асимптотични означения O, Ω, Θ, o, ω.
   Интерактивна лаборатория: избираш двойка функции f, g и отношение; плъзгачите задават
   константите и прага n₀; графиките показват f и c·g, както и отношението f/g.
   Регистрира се към раздел „slozhnost“ чрез Study.asymLab(host). */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "малко o": { cat: "Сложност", t: "Малко o", en: "little-o", d: "f = o(g): f расте строго по-бавно от g. Колкото и малка положителна константа c да изберем, от някое n нататък f(n) < c·g(n). Ако границата на f/g съществува, тя е 0.", more: "o е по-силно от O: от f = o(g) следва f = O(g), но не и f = Θ(g). Пример: n = o(n²), но n ≠ o(n)." },
    "малко омега": { cat: "Сложност", t: "Малко ω (омега)", en: "little-omega", d: "f = ω(g): f расте строго по-бързо от g. Колкото и голяма константа c да изберем, от някое n нататък f(n) > c·g(n). Ако границата на f/g съществува, тя е ∞.", more: "f = ω(g) точно когато g = o(f). Пример: 4ⁿ = ω(2ⁿ)." },
    "праг n0": { cat: "Сложност", t: "Праг n₀", en: "threshold n₀", d: "Мястото, от което нататък неравенството трябва да е изпълнено. Поведението при малки n не влияе на асимптотичния клас.", more: "100n > n² за n < 100, но 100n = O(n²) с c = 1 и n₀ = 100." },
  });

  const lg2 = Math.log2, lg10 = Math.log10;
  /* Готови двойки. truth: кои отношения са верни (O, Om, Th, o, om). lim: граница на f/g. */
  const PAIRS = [
    { id: "quad", f: "3n² + 5n + 7", g: "n²", F: (n) => 3 * n * n + 5 * n + 7, G: (n) => n * n, N: 40, log: false,
      truth: { O: 1, Om: 1, Th: 1, o: 0, om: 0 }, lim: "3", c: 4, c1: 3, c2: 4, n0: 7,
      why: "f/g → 3 (константа > 0) ⇒ Θ. Водещият член 3n² определя растежа; 5n + 7 само измества прага n₀." },
    { id: "n2n3", f: "n²", g: "n³", F: (n) => n * n, G: (n) => n ** 3, N: 40, log: false,
      truth: { O: 1, Om: 0, Th: 0, o: 1, om: 0 }, lim: "0", c: 1, c1: 0.5, c2: 1, n0: 1,
      why: "f/g = 1/n → 0 ⇒ o (а значи и O). Ω е невярно: за всяко c > 0 при n > 1/c имаме n² < c·n³." },
    { id: "n3n2", f: "n³", g: "n²", F: (n) => n ** 3, G: (n) => n * n, N: 40, log: false,
      truth: { O: 0, Om: 1, Th: 0, o: 0, om: 1 }, lim: "∞", c: 1, c1: 1, c2: 10, n0: 1,
      why: "f/g = n → ∞ ⇒ ω (а значи и Ω). O е невярно: каквото и c да изберем, за n > c имаме n³ > c·n²." },
    { id: "100n", f: "100n", g: "n²", F: (n) => 100 * n, G: (n) => n * n, N: 300, log: false,
      truth: { O: 1, Om: 0, Th: 0, o: 1, om: 0 }, lim: "0", c: 1, c1: 0.5, c2: 1, n0: 100,
      why: "До n = 100 линията 100n е над n², но това не пречи: с c = 1 и n₀ = 100 неравенството е изпълнено. Началото не определя асимптотичния клас." },
    { id: "nlog", f: "n·log₂ n", g: "n²", F: (n) => n * lg2(n), G: (n) => n * n, N: 200, log: false,
      truth: { O: 1, Om: 0, Th: 0, o: 1, om: 0 }, lim: "0", c: 1, c1: 0.5, c2: 1, n0: 1,
      why: "f/g = log₂ n / n → 0 ⇒ o. Затова Merge Sort (Θ(n log n)) е асимптотично по-бърз от прекия избор (Θ(n²))." },
    { id: "logs", f: "log₂ n", g: "log₁₀ n", F: (n) => lg2(n), G: (n) => lg10(n), N: 200, log: false,
      truth: { O: 1, Om: 1, Th: 1, o: 0, om: 0 }, lim: "log₂ 10 ≈ 3,32", c: 4, c1: 3, c2: 4, n0: 2,
      why: "log₂ n = log₂ 10 · log₁₀ n — отношението е константа. Основата на логаритъма не влияе на класа, затова се пише просто O(log n)." },
    { id: "2n1", f: "2ⁿ⁺¹", g: "2ⁿ", F: (n) => 2 ** (n + 1), G: (n) => 2 ** n, N: 40, log: true,
      truth: { O: 1, Om: 1, Th: 1, o: 0, om: 0 }, lim: "2", c: 2, c1: 2, c2: 2, n0: 1,
      why: "2ⁿ⁺¹ = 2·2ⁿ — константен множител 2 ⇒ Θ. Събираемо в показателя дава множител." },
    { id: "4n", f: "4ⁿ = 2²ⁿ", g: "2ⁿ", F: (n) => 4 ** n, G: (n) => 2 ** n, N: 40, log: true,
      truth: { O: 0, Om: 1, Th: 0, o: 0, om: 1 }, lim: "∞", c: 1000, c1: 1, c2: 1000, n0: 10,
      why: "4ⁿ / 2ⁿ = 2ⁿ → ∞ ⇒ ω. Множител в показателя променя основата и класа: 4ⁿ ≠ O(2ⁿ)." },
    { id: "nn1000", f: "n", g: "n + 1000", F: (n) => n, G: (n) => n + 1000, N: 5000, log: false,
      truth: { O: 1, Om: 1, Th: 1, o: 0, om: 0 }, lim: "1", c: 1, c1: 0.5, c2: 1, n0: 1000,
      why: "f/g → 1 ⇒ Θ. За долната граница с c₁ = 0,5 е нужен праг n₀ = 1000; с по-малко c₁ прагът пада." },
    { id: "osc", f: "n² (четно n), n (нечетно n)", g: "n^1,5", F: (n) => (n % 2 === 0 ? n * n : n), G: (n) => n ** 1.5, N: 60, log: true,
      truth: { O: 0, Om: 0, Th: 0, o: 0, om: 0 }, lim: "не съществува", c: 1, c1: 0.5, c2: 2, n0: 1,
      why: "При четно n отношението е √n → ∞, при нечетно е 1/√n → 0. Нито O, нито Ω: не всяка двойка функции е асимптотично сравнима." },
  ];
  const RELS = [
    { k: "O", t: "O — горна граница", sym: "≤" },
    { k: "Om", t: "Ω — долна граница", sym: "≥" },
    { k: "Th", t: "Θ — точна граница", sym: "=" },
    { k: "o", t: "o — строго по-бавно", sym: "<" },
    { k: "om", t: "ω — строго по-бързо", sym: ">" },
  ];
  const RELNAME = { O: "O", Om: "Ω", Th: "Θ", o: "o", om: "ω" };

  /* ---------- чисти функции (тестват се в node) ---------- */
  /** Проверява неравенството на отношението rel за n = n0..N. Връща нарушенията. */
  function check(pair, rel, c, c1, c2, n0, N) {
    const bad = [];
    for (let n = Math.max(1, n0); n <= N; n++) {
      const f = pair.F(n), g = pair.G(n);
      let ok;
      if (rel === "O") ok = f <= c * g;
      else if (rel === "Om") ok = f >= c * g;
      else if (rel === "Th") ok = c1 * g <= f && f <= c2 * g;
      else if (rel === "o") ok = f < c * g;
      else ok = f > c * g;
      if (!ok) bad.push(n);
    }
    return bad;
  }
  /** Най-малкото n₀, от което нататък (до N) неравенството е изпълнено; −1 ако няма. */
  function minN0(pair, rel, c, c1, c2, N) {
    const bad = check(pair, rel, c, c1, c2, 1, N);
    if (!bad.length) return 1;
    const last = bad[bad.length - 1];
    return last >= N ? -1 : last + 1;
  }
  const algos = { check, minN0, PAIRS };

  /* ---------- съдържание ---------- */
  const DEFS = [
    { k: "O", g: "o", t: "O(g) — горна граница", like: "≈ ≤",
      d: "f = O(g), ако има положителна константа c и праг n₀, след който f(n) ≤ c·g(n) за всяко n.",
      ex: "3n² + 5n + 7 = O(n²) (c = 4, n₀ = 7); също n = O(n²)." },
    { k: "Om", g: "omega", t: "Ω(g) — долна граница", like: "≈ ≥",
      d: "f = Ω(g), ако има положителна константа c и праг n₀, след който f(n) ≥ c·g(n) за всяко n.",
      ex: "n³ = Ω(n²); 3n² + 5n + 7 = Ω(n²) (c = 3)." },
    { k: "Th", g: "theta", t: "Θ(g) — точна граница", like: "≈ =",
      d: "f = Θ(g), ако има положителни c₁, c₂ и праг n₀, след който c₁·g(n) ≤ f(n) ≤ c₂·g(n). Θ = O и Ω едновременно.",
      ex: "3n² + 5n + 7 = Θ(n²); log₂ n = Θ(log₁₀ n)." },
    { k: "o", g: "малко o", t: "o(g) — строго по-бавно", like: "≈ <",
      d: "f = o(g), ако за всяка положителна константа c — колкото и малка — има праг n₀ (зависещ от c), след който f(n) < c·g(n).",
      ex: "n = o(n²); n log n = o(n²); но n ≠ o(n)." },
    { k: "om", g: "малко омега", t: "ω(g) — строго по-бързо", like: "≈ >",
      d: "f = ω(g), ако за всяка константа c > 0 — колкото и голяма — има праг n₀, след който f(n) > c·g(n).",
      ex: "n² = ω(n); 4ⁿ = ω(2ⁿ); но n² ≠ ω(n²)." },
  ];

  const html = `
<div class="block">
  <h3>Петте асимптотични означения</h3>
  <p class="prose">Петте означения сравняват <b>скоростта на растеж</b> на две функции при голямо n, като пренебрегват постоянните множители и поведението при малки n. Полезно е да ги мислиш като сравнения между числа: O е „≤“, Ω е „≥“, Θ е „=“, o е „&lt;“, ω е „&gt;“.</p>
  <div class="cards" id="asym-defs"></div>
  <div class="key"><b>Разлика между O и o.</b><p>При O е достатъчна <b>една</b> подходяща константа c. При o неравенството трябва да се изпълни за <b>всяка</b> c &gt; 0 — колкото по-малко c, толкова по-късно започва (по-голям праг n₀), но винаги започва. Същото е разликата между Ω и ω.</p></div>
  <div class="key"><b>Проверка чрез отношението f(n)/g(n)</b> (когато границата при n → ∞ съществува):
    <p class="formula">→ 0 ⇒ f = o(g), а значи и O &nbsp;·&nbsp; → константа &gt; 0 ⇒ f = Θ(g) &nbsp;·&nbsp; → ∞ ⇒ f = ω(g), а значи и Ω</p>
    <p>Ако границата не съществува, правилото не казва нищо — трябва директна проверка на неравенствата (виж двойката с четно/нечетно n).</p></div>
</div>

<div class="block">
  <h3>Лаборатория: сравни две функции</h3>
  <p class="prose">Избери двойка f, g и отношение. Плъзгачите задават константите и <dfn data-g="праг n0">прага n₀</dfn>. Горната графика показва f и границата c·g (при Θ — коридора между c₁·g и c₂·g). Долната показва отношението f/g спрямо константите: f ≤ c·g е същото като f/g ≤ c.</p>
  <div id="asym-lab"></div>
  <details class="hint"><summary>Хинт: как да четеш двете графики</summary><div>
    <p><b>Горе:</b> точките на f са зелени, където неравенството е изпълнено, и червени, където е нарушено, но само в оцветената зона n ≥ n₀. Сивите точки преди n₀ не се броят.</p>
    <p><b>Долу:</b> отношението f/g. При O линията трябва да остане под c, при Ω — над c, при Θ — в коридора [c₁, c₂]. При o, каквото и c да избереш, кривата накрая слиза под него (затова таблицата „праг n₀ за всяко c“ е пълна). При O e достатъчно кривата да остане под някоя константа.</p>
    <p>Проверката е числена до избраното N — илюстрира дефиницията, но не е доказателство за всички n.</p>
  </div></details>
</div>

<div class="block">
  <h3>Връзки между означенията</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Връзка</th><th>Пример</th></tr>
    <tr><td>f = Θ(g) точно когато f = O(g) и f = Ω(g)</td><td class="mono">3n² + 5n + 7 = Θ(n²)</td></tr>
    <tr><td>f = o(g) ⇒ f = O(g), но не f = Θ(g)</td><td class="mono">n = o(n²) ⇒ n = O(n²)</td></tr>
    <tr><td>f = ω(g) ⇒ f = Ω(g), но не f = Θ(g)</td><td class="mono">n³ = ω(n²) ⇒ n³ = Ω(n²)</td></tr>
    <tr><td>f = O(g) точно когато g = Ω(f)</td><td class="mono">n = O(n²) ⇔ n² = Ω(n)</td></tr>
    <tr><td>f = o(g) точно когато g = ω(f)</td><td class="mono">n = o(n²) ⇔ n² = ω(n)</td></tr>
    <tr><td>Преходност: f = O(g) и g = O(h) ⇒ f = O(h) (същото за Ω, Θ, o, ω)</td><td class="mono">n = O(n log n), n log n = O(n²) ⇒ n = O(n²)</td></tr>
    <tr><td>Константен множител не променя класа</td><td class="mono">100·n² = Θ(n²)</td></tr>
    <tr><td>Сбор: доминира по-бързо растящото събираемо</td><td class="mono">n² + n log n + 7 = Θ(n²)</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>Капани</h3>
  <details class="trap"><summary>Капан: „=“ в f = O(g) е симетрично</summary><div>
    <p>Не е. Записът f = O(g) означава „f принадлежи на класа O(g)“. n = O(n²) е вярно, но n² = O(n) е невярно. Някои автори пишат f ∈ O(g), за да е ясно.</p>
  </div></details>
  <details class="trap"><summary>Капан: „O(g) е точната сложност“</summary><div>
    <p>O дава само горна граница. n = O(n²) и n = O(2ⁿ) са верни, но неинформативни. Точната граница е Θ. Когато се казва „Merge Sort е O(n log n)“, обикновено се има предвид Θ(n log n).</p>
  </div></details>
  <details class="trap"><summary>Капан: „основата не влияе“ — и при степените</summary><div>
    <p>При логаритъма основата не влияе: log₂ n = Θ(log₁₀ n). При показателната функция влияе: 2ⁿ⁺¹ = Θ(2ⁿ) (множител 2), но 4ⁿ = 2²ⁿ ≠ O(2ⁿ) (отношението 2ⁿ расте неограничено).</p>
  </div></details>
  <details class="trap"><summary>Капан: „всеки две функции са сравними“</summary><div>
    <p>Не. Функция, която при четно n е n², а при нечетно е n, не е нито O(n^1,5), нито Ω(n^1,5). При числата едно от a ≤ b и a ≥ b винаги е вярно; при асимптотичните означения — не.</p>
  </div></details>
  <details class="trap"><summary>Капан: „100n е по-бавно от n², защото при n = 10 е по-голямо“</summary><div>
    <p>Асимптотиката говори за големи n. 100n = o(n²) въпреки че до n = 100 е по-голямо. На практика при малки входове константите имат значение — затова библиотечните сортировки превключват към Insertion Sort за малки подмасиви.</p>
  </div></details>
</div>`;

  function mount(host) {
    host.innerHTML = html;
    const defs = host.querySelector("#asym-defs");
    defs.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
    DEFS.forEach((D) => defs.append(h("div", { class: "card" },
      h("span", { class: "eyebrow", text: "като " + D.like.replace("≈ ", "") }), h("h4", null, h("dfn", { "data-g": D.g, tabindex: "0", text: D.t })),
      h("p", { text: D.d }), h("p", { class: "mono", style: { fontSize: ".82rem" }, text: D.ex }))));
    lab(host.querySelector("#asym-lab"));
  }

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";
  function setupCanvas(cv, H) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  }
  const fmt = (v) => {
    if (!isFinite(v)) return "∞";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(2).replace("e+", "·10^").replace("e", "·10^");
    return (Math.round(v * 1000) / 1000).toLocaleString("bg");
  };
  const cFromSlider = (k) => Math.round(10 ** (k / 10) * 1000) / 1000;
  const sliderFromC = (c) => Math.round(10 * Math.log10(c));

  function lab(host) {
    let P = PAIRS[0], rel = "Th", c = P.c, c1 = P.c1, c2 = P.c2, n0 = P.n0, N = P.N, logY = P.log;
    const pairSel = h("select", { id: "asym-pair", "aria-label": "Двойка функции", style: { width: "100%", minWidth: "0" } }, ...PAIRS.map((p) => h("option", { value: p.id, text: `f = ${p.f},  g = ${p.g}` })));
    const relBox = h("div", { class: "row", role: "group", "aria-label": "Отношение" });
    const relBtns = RELS.map((R) => {
      const b = h("button", { class: "btn", type: "button", "aria-pressed": R.k === rel ? "true" : "false", onclick: () => { rel = R.k; relBtns.forEach((x, i) => x.setAttribute("aria-pressed", RELS[i].k === rel ? "true" : "false")); syncSliders(); draw(); } }, R.t);
      relBox.append(b); return b;
    });
    const mkLog = (lab2, get, set) => {
      const out = h("b", { class: "mono" });
      const r = h("input", { type: "range", min: -30, max: 30, step: 1, "aria-label": lab2, oninput: () => { set(cFromSlider(+r.value)); out.textContent = fmt(get()); draw(); } });
      r.style.width = "100%";
      const wrap = h("label", { class: "field", style: { flex: "1 1 150px", minWidth: "0" } }, h("span", null, lab2 + " = ", out), r);
      wrap.sync = () => { r.value = sliderFromC(get()); out.textContent = fmt(get()); };
      return wrap;
    };
    const sC = mkLog("c", () => c, (v) => (c = v));
    const sC1 = mkLog("c₁", () => c1, (v) => (c1 = v));
    const sC2 = mkLog("c₂", () => c2, (v) => (c2 = v));
    const n0Out = h("b", { class: "mono" });
    const n0R = h("input", { type: "range", min: 1, max: 100, step: 1, "aria-label": "n₀", id: "asym-n0", oninput: () => { n0 = +n0R.value; n0Out.textContent = n0; draw(); } });
    n0R.style.width = "100%";
    const sN0 = h("label", { class: "field", style: { flex: "1 1 150px", minWidth: "0" } }, h("span", null, "n₀ = ", n0Out), n0R);
    const logCb = h("input", { type: "checkbox", id: "asym-log", onchange: () => { logY = logCb.checked; draw(); } });
    const autoBtn = h("button", { class: "btn ghost", type: "button", text: "Намери n₀", title: "Най-малкото n₀ за текущите константи", onclick: () => {
      const m = minN0(P, rel, c, c1, c2, N);
      if (m > 0) { n0 = m; syncSliders(); draw(); } else { info.innerHTML = `<div class="warn">С тези константи не съществува праг до N = ${N}. Смени константата.</div>`; }
    } });
    const cv = h("canvas", { class: "chart" }), cvR = h("canvas", { class: "chart" });
    const info = h("div", { class: "viz-msg", "aria-live": "polite" });
    const truthBox = h("div", { class: "viz-msg" });
    const tblBox = h("div", { class: "tbl-wrap" });
    const box = h("div", { class: "viz" },
      h("div", { class: "viz-head" }, h("h4", { text: "Асимптотична лаборатория" }), h("span", { class: "sub", text: "f — плътна линия; c·g — пунктир; оцветено: n ≥ n₀" })),
      h("div", { class: "viz-inputs" }, h("label", { class: "field", style: { flex: "1 1 240px", minWidth: "0" } }, h("span", { text: "Двойка функции" }), pairSel)),
      h("div", { class: "viz-inputs" }, relBox),
      h("div", { class: "viz-inputs" }, sC, sC1, sC2, sN0, autoBtn, h("label", { class: "field", style: { display: "flex", gap: "6px", alignItems: "center" } }, logCb, "логаритмична ос y")),
      h("div", { class: "viz-stage" }, h("span", { class: "eyebrow", text: "f(n) и границата" }), cv, h("span", { class: "eyebrow", style: { display: "block", marginTop: "10px" }, text: "Отношението f(n) / g(n)" }), cvR),
      info, truthBox, h("div", { class: "viz-stage", style: { minHeight: "0" } }, tblBox));
    host.append(box);

    pairSel.addEventListener("change", () => {
      P = PAIRS.find((p) => p.id === pairSel.value);
      c = P.c; c1 = P.c1; c2 = P.c2; n0 = Math.min(P.n0, P.N); N = P.N; logY = P.log;
      syncSliders(); draw();
    });
    function syncSliders() {
      const th = rel === "Th";
      sC.hidden = th; sC1.hidden = !th; sC2.hidden = !th;
      n0R.max = Math.max(10, Math.min(P.N - 1, P.N > 500 ? 2000 : P.N - 1));
      n0R.value = n0; n0Out.textContent = n0;
      logCb.checked = logY;
      [sC, sC1, sC2].forEach((s) => s.sync());
    }

    function draw() {
      const isTh = rel === "Th";
      const lo = isTh ? (n) => c1 * P.G(n) : (n) => c * P.G(n);
      const hi = isTh ? (n) => c2 * P.G(n) : null;
      // точки: всички n при N ≤ 200, иначе ~200 равномерни
      const step = Math.max(1, Math.ceil(N / 200));
      const pts = []; for (let n = 1; n <= N; n += step) pts.push(n); if (pts[pts.length - 1] !== N) pts.push(N);
      const bad = check(P, rel, c, c1, c2, n0, N);
      const badSet = new Set(bad);
      plotMain(pts, lo, hi, badSet);
      plotRatio(pts, badSet);
      // съобщение
      const R = RELS.find((r) => r.k === rel);
      const cTxt = isTh ? `c₁ = ${fmt(c1)}, c₂ = ${fmt(c2)}` : `c = ${fmt(c)}`;
      const ineq = rel === "O" ? "f(n) ≤ c·g(n)" : rel === "Om" ? "f(n) ≥ c·g(n)" : rel === "Th" ? "c₁·g(n) ≤ f(n) ≤ c₂·g(n)" : rel === "o" ? "f(n) < c·g(n)" : "f(n) > c·g(n)";
      info.innerHTML = bad.length
        ? `<div>С ${cTxt} и n₀ = ${n0}: <b>${ineq}</b> е <b class="warn">нарушено</b> при ${bad.length} стойности на n (${bad.slice(0, 6).join(", ")}${bad.length > 6 ? ", …" : ""}).</div>`
        : `<div>С ${cTxt} и n₀ = ${n0}: <b>${ineq}</b> е изпълнено за всички n от ${n0} до ${N} <span class="muted">(числено)</span>.</div>`;
      // истина за двойката
      const T = P.truth;
      truthBox.innerHTML = "";
      const row = h("div", { class: "row" }, h("b", { text: "За тази двойка:" }));
      RELS.forEach((x) => row.append(h("span", { class: "pill " + (T[x.k] ? "s-done" : "s-swap"), text: `f ${T[x.k] ? "=" : "≠"} ${RELNAME[x.k]}(g)` })));
      truthBox.append(row, h("p", null, h("b", { text: `Граница на f/g: ${P.lim}. ` }), P.why));
      if ((rel === "o" || rel === "om") && T[rel]) truthBox.append(h("p", { class: "muted", text: "Една константа не стига да се докаже o/ω — нужно е за всяка. Таблицата отдолу показва, че прагът съществува за все по-строги c." }));
      if ((rel === "O" || rel === "Om" || rel === "Th") && !T[rel]) truthBox.append(h("p", { class: "muted", text: "Опитай различни константи: за невярно отношение няма c, с които нарушенията да изчезнат за всички големи n." }));
      // таблица праг n₀ за различни c
      tblBox.innerHTML = "";
      if (rel !== "Th") {
        const cs = rel === "o" || rel === "O" ? [10, 1, 0.1, 0.01, 0.001] : [0.1, 1, 10, 100, 1000];
        const t = h("table", { class: "t", style: { marginTop: "4px" } }, h("tr", null, h("th", { text: "c" }), ...cs.map((x) => h("th", { class: "mono", text: fmt(x) }))));
        t.append(h("tr", null, h("td", { text: `най-малък праг n₀ (до N = ${N})` }), ...cs.map((x) => { const m = minN0(P, rel, x, 0, 0, N); return h("td", { class: "mono " + (m > 0 ? "" : "warn"), text: m > 0 ? m : "няма" }); })));
        tblBox.append(h("span", { class: "eyebrow", text: rel === "o" || rel === "om" ? "Прагът за все по-строги константи" : "Прагът за различни константи" }), t);
        if (!T[rel]) tblBox.append(h("p", { class: "muted", style: { fontSize: ".85rem", marginTop: "6px" }, text: `Отношението е невярно: за всяко c има нарушения при достатъчно голямо n. Ако в таблицата се вижда праг, той е само в рамките на проверката до N = ${N}.` }));
      }
    }

    function axes(ctx, W, H, L, R, Tp, B, pw, ph, ymin, ymax, log, sx) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = "11px " + css("--f-mono"); ctx.fillStyle = css("--muted"); ctx.textAlign = "center";
      const ticks = [1, Math.round(N / 4), Math.round(N / 2), Math.round((3 * N) / 4), N];
      ticks.forEach((n) => ctx.fillText("n=" + n, sx(n), H - 8));
      ctx.textAlign = "right";
      const ys = log ? [ymin, Math.sqrt(ymin * ymax), ymax] : [ymin, (ymin + ymax) / 2, ymax];
      ys.forEach((v) => { const y = Tp + ph - (log ? (Math.log10(v) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin) || 1) : (v - ymin) / (ymax - ymin || 1)) * ph; ctx.fillText(fmt(v), L - 6, y + 4); ctx.strokeStyle = css("--line-2"); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); });
      ctx.fillStyle = css("--panel-2"); ctx.globalAlpha = 0.7; ctx.fillRect(sx(n0), Tp, L + pw - sx(n0), ph); ctx.globalAlpha = 1;
      ctx.fillStyle = css("--muted"); ctx.textAlign = "left"; ctx.fillText("n₀", sx(n0) + 3, Tp + 12);
    }

    function plotMain(pts, lo, hi, badSet) {
      const { ctx, W, H } = setupCanvas(cv, 280);
      const L = W < 500 ? 52 : 78, R = W < 500 ? 34 : 70, Tp = 10, B = 26, pw = W - L - R, ph = H - Tp - B;
      const sx = (n) => L + ((n - 1) / Math.max(1, N - 1)) * pw;
      let vals = [];
      pts.forEach((n) => { vals.push(P.F(n), lo(n)); if (hi) vals.push(hi(n)); });
      vals = vals.filter((v) => isFinite(v));
      const pos = vals.filter((v) => v > 0);
      let ymin = logY ? Math.max(1e-3, Math.min(...pos)) : Math.min(0, ...vals), ymax = Math.max(...vals);
      if (ymax <= ymin) ymax = ymin + 1;
      const sy = (v) => {
        if (logY) { const a = Math.log10(ymin), b = Math.log10(ymax); return Tp + ph - ((Math.log10(Math.max(v, ymin)) - a) / (b - a || 1)) * ph; }
        return Tp + ph - ((v - ymin) / (ymax - ymin)) * ph;
      };
      axes(ctx, W, H, L, R, Tp, B, pw, ph, ymin, ymax, logY, sx);
      const labs = [];
      const line = (f, col, dash, lab2) => {
        ctx.strokeStyle = css(col); ctx.setLineDash(dash); ctx.lineWidth = 2; ctx.beginPath();
        pts.forEach((n, i) => (i ? ctx.lineTo(sx(n), sy(f(n))) : ctx.moveTo(sx(n), sy(f(n)))));
        ctx.stroke(); ctx.setLineDash([]);
        let y = sy(f(N)) + 4; while (labs.some((q) => Math.abs(q - y) < 13)) y += 13; labs.push(y);
        ctx.fillStyle = css(col); ctx.textAlign = "left"; ctx.font = "600 12px " + css("--f-mono"); ctx.fillText(lab2, L + pw + 6, Math.min(H - 4, Math.max(12, y)));
      };
      if (hi) line(hi, "--st-cmp", [6, 4], "c₂·g");
      line(lo, hi ? "--st-act" : "--st-cmp", [6, 4], hi ? "c₁·g" : "c·g");
      if (P.id === "osc") {
        // при осцилиращата функция рисуваме само точки — линията през четни/нечетни е подвеждаща
      } else line(P.F, "--ink", [], "f");
      pts.forEach((n) => {
        ctx.fillStyle = css(n < n0 ? "--st-dim" : badSet.has(n) ? "--st-swap" : "--st-done");
        ctx.beginPath(); ctx.arc(sx(n), sy(P.F(n)), n >= n0 && badSet.has(n) ? 3.8 : 2.6, 0, 7); ctx.fill();
      });
    }

    function plotRatio(pts, badSet) {
      const { ctx, W, H } = setupCanvas(cvR, 200);
      const L = W < 500 ? 52 : 78, R = W < 500 ? 34 : 70, Tp = 10, B = 26, pw = W - L - R, ph = H - Tp - B;
      const sx = (n) => L + ((n - 1) / Math.max(1, N - 1)) * pw;
      const ratio = (n) => P.F(n) / P.G(n);
      const rs = pts.map(ratio).filter((v) => isFinite(v));
      const refs = rel === "Th" ? [c1, c2] : [c];
      const useLog = Math.max(...rs, ...refs) / Math.max(1e-6, Math.min(...rs.filter((v) => v > 0), ...refs)) > 50;
      let ymin = useLog ? Math.max(1e-4, Math.min(...rs.filter((v) => v > 0), ...refs) / 1.5) : 0;
      let ymax = Math.max(...rs, ...refs) * 1.15;
      if (ymax <= ymin) ymax = ymin + 1;
      const sy = (v) => {
        if (useLog) { const a = Math.log10(ymin), b = Math.log10(ymax); return Tp + ph - ((Math.log10(Math.max(v, ymin)) - a) / (b - a || 1)) * ph; }
        return Tp + ph - ((v - ymin) / (ymax - ymin)) * ph;
      };
      axes(ctx, W, H, L, R, Tp, B, pw, ph, useLog ? ymin : Math.max(ymin, 0), ymax, useLog, sx);
      // коридор / граница
      ctx.font = "600 12px " + css("--f-mono"); ctx.textAlign = "left";
      if (rel === "Th") {
        ctx.fillStyle = css("--st-done-bg"); ctx.globalAlpha = 0.6; ctx.fillRect(L, sy(c2), pw, sy(c1) - sy(c2)); ctx.globalAlpha = 1;
        [[c1, "c₁", "--st-act"], [c2, "c₂", "--st-cmp"]].forEach(([v, t, col]) => { ctx.strokeStyle = css(col); ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(L, sy(v)); ctx.lineTo(L + pw, sy(v)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = css(col); ctx.fillText(t, L + pw + 6, sy(v) + 4); });
      } else {
        ctx.strokeStyle = css("--st-cmp"); ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(L, sy(c)); ctx.lineTo(L + pw, sy(c)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = css("--st-cmp"); ctx.fillText("c", L + pw + 6, sy(c) + 4);
      }
      if (P.id !== "osc") {
        ctx.strokeStyle = css("--ink"); ctx.lineWidth = 2; ctx.beginPath();
        pts.forEach((n, i) => (i ? ctx.lineTo(sx(n), sy(ratio(n))) : ctx.moveTo(sx(n), sy(ratio(n)))));
        ctx.stroke();
      }
      pts.forEach((n) => {
        ctx.fillStyle = css(n < n0 ? "--st-dim" : badSet.has(n) ? "--st-swap" : "--st-done");
        ctx.beginPath(); ctx.arc(sx(n), sy(ratio(n)), 2.4, 0, 7); ctx.fill();
      });
      ctx.fillStyle = css("--ink"); ctx.fillText("f/g", L + pw + 6, Math.min(H - 4, Math.max(12, sy(ratio(N)) + 4 + (Math.abs(sy(ratio(N)) - sy(c)) < 13 ? 13 : 0))));
    }

    syncSliders();
    draw();
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("resize", draw);
  }

  S.asymLab = mount;
  S.asymAlgos = algos;
})();
