/* Раздел 6 — Полиазбучна замяна: Виженер, таблица, Касиски, индекс на съвпадение, разбиване по колони. */
(function () {
  const S = window.Study, h = S.h;

  function ic(x, step, start, m) {
    const cnt = new Array(m).fill(0); let len = 0;
    for (let i = start; i < x.length; i += step) { cnt[x[i]]++; len++; }
    if (len < 2) return 0;
    let s = 0; for (let j = 0; j < m; j++) s += cnt[j] * (cnt[j] - 1);
    return s / (len * (len - 1));
  }
  const icPeriod = (c, L, m) => { let s = 0; for (let r = 0; r < L; r++) s += ic(c, L, r, m); return s / L; };

  function prep({ alpha, text, key, maxLen = 600 }) {
    const al = T10.get(alpha);
    const p = T10.encode(al, text, { maxLen, minLen: 1, what: "Откритият текст" });
    const k = T10.encode(al, key, { maxLen: 20, minLen: 1, what: "Ключът" });
    const c = p.map((v, i) => T10.mod(v + k[i % k.length], al.m));
    return { al, p, k, c };
  }

  const algos = {
    ic, icPeriod,
    /** vig_encrypt / vig_decrypt */
    vig({ alpha, text, key, mode }) {
      const al = T10.get(alpha), m = al.m, dec = mode === "dec";
      const x = T10.encode(al, text, { maxLen: 40, minLen: 1 });
      const k = T10.encode(al, key, { maxLen: 20, minLen: 1, what: "Ключът" });
      const L = k.length, y = [], F = [];
      F.push({ at: dec ? "dloop" : "loop", x, k, y: [], vars: { L, m }, msg: `Ключът „${T10.decode(al, k)}“ (L = ${L}) се повтаря до дължината: ${T10.decode(al, x.map((_, i) => k[i % L]))}.` });
      x.forEach((v, i) => {
        const kk = k[i % L], r = T10.mod(dec ? v - kk : v + kk, m);
        y.push(r);
        F.push({ at: dec ? "dec" : "enc", x, k, y: y.slice(), i, row: kk, col: dec ? r : v, out: dec ? v : r, vars: { i, "i mod L": i % L, [dec ? "c" : "p"]: `${al.L[v]}=${v}`, k: `${al.L[kk]}=${kk}`, [dec ? "p" : "c"]: `${al.L[r]}=${r}` }, msg: `${al.L[v]} (${v}) ${dec ? "−" : "+"} ${al.L[kk]} (${kk}) = ${dec ? v - kk : v + kk} ≡ <b>${r}</b> → „${al.L[r]}“.`, log: `${al.L[v]}${dec ? "−" : "+"}${al.L[kk]}=${al.L[r]}` });
      });
      F[F.length - 1].done = true;
      return { frames: F, result: T10.decode(al, y) };
    },

    /** Касиски — kasiski + kasiski_votes */
    kasiski(inp) {
      const { al, c } = prep(inp);
      const n = c.length, F = [], dist = [], pos = [];
      F.push({ at: "outer", c, dist: [], pos: [], vars: { n }, msg: `Търсим тройки букви в <b>шифротекста</b>, които се повтарят, и записваме разстоянието до най-близкото следващо повторение.` });
      for (let i = 0; i + 2 < n; i++) for (let j = i + 1; j + 2 < n; j++) {
        if (c[i] === c[j] && c[i + 1] === c[j + 1] && c[i + 2] === c[j + 2]) {
          dist.push(j - i); pos.push([i, j]);
          F.push({ at: ["rec", "match"], c, dist: dist.slice(), pos: pos.slice(), cur: [i, j], vars: { i, j, тройка: T10.decode(al, c.slice(i, i + 3)), разстояние: j - i }, msg: `„${T10.decode(al, c.slice(i, i + 3))}“ на позиции ${i} и ${j}: разстояние <b>${j - i}</b> = ${factor(j - i)}.`, log: `${T10.decode(al, c.slice(i, i + 3))}: ${j - i}` });
          break;
        }
      }
      const votes = {};
      for (let d = 2; d <= 20; d++) votes[d] = dist.filter((x) => x % d === 0).length;
      const best = dist.length ? +Object.keys(votes).reduce((a, b) => (votes[b] > votes[a] ? b : a), "2") : 0;
      F.push({ at: ["vote", "div"], c, dist, pos, votes, done: true, vars: { повторения: dist.length }, msg: dist.length ? `Брой разстояния, които всеки делител дели. Ако тройката е шифрирана с една и съща част от ключа, разстоянието е кратно на периода. Случайни съвпадения също има — затова гледаме кой делител събира <b>повечето</b> гласове, а не всички. Тук: ${best} (${votes[best]} от ${dist.length}).` : `Няма повторени тройки — текстът е твърде кратък за метода на Касиски.` });
      return { frames: F, n: dist.length, dist, votes };
    },

    /** индекс на съвпадение по колони за L = 1..maxL — ic_period */
    ic(inp) {
      const { al, c, p } = prep(inp);
      const m = al.m, F = [], vals = [];
      const icP = ic(p, 1, 0, m), icR = 1 / m;
      F.push({ at: "count", c, vals: [], icP, icR, vars: { "IC(открит)": icP.toFixed(4), "IC(равномерно) = 1/m": icR.toFixed(4) }, msg: `IC = вероятност два случайно избрани символа да са еднакви. За естествен текст е по-голям (тук ${icP.toFixed(4)}), за равномерно случаен — 1/m = ${icR.toFixed(4)}.` });
      for (let L = 1; L <= 12; L++) {
        const cols = Array.from({ length: L }, (_, r) => ic(c, L, r, m));
        const v = cols.reduce((a, b) => a + b, 0) / L;
        vals.push(v);
        F.push({ at: ["col", "avg"], c, vals: vals.slice(), cols, L, icP, icR, vars: { L, "среден IC": v.toFixed(4) }, msg: `L = ${L}: разделяме шифротекста на ${L} колони (позиции с еднакъв остатък по модул ${L}) и усредняваме IC: <b>${v.toFixed(4)}</b>.${v > (icP + icR) / 2 ? " Близо до езика — колоните изглеждат като Цезарови шифри." : ""}`, log: `L=${L}: ${v.toFixed(4)}` });
      }
      F[F.length - 1].done = true;
      F[F.length - 1].msg += ` Истинският период и кратните му дават високи стойности.`;
      return { frames: F, vals };
    },

    /** при известен L: всяка колона е Цезар → χ² — vig_crack */
    crack({ alpha, text, key, L }) {
      const { al, c, k } = prep({ alpha, text, key });
      const m = al.m, exp = T10.refFreq(al);
      L = S.int(L, 1, 20, "Периодът L");
      const F = [], found = [];
      for (let r = 0; r < L; r++) {
        const cnt = new Array(m).fill(0); let len = 0;
        for (let i = r; i < c.length; i += L) { cnt[c[i]]++; len++; }
        F.push({ at: "hist", r, cnt, found: found.slice(), L, vars: { колона: r, букви: len }, msg: `Колона ${r}: позиции ${r}, ${r + L}, ${r + 2 * L}, … (${len} букви). Всички са шифровани с едно и също изместване.` });
        let best = Infinity, bk = 0;
        const scores = [];
        for (let t = 0; t < m; t++) {
          let s = 0;
          for (let j = 0; j < m; j++) { const e = exp[j] * len, o = cnt[T10.mod(j + t, m)]; if (e > 0) s += (o - e) * (o - e) / e; }
          scores.push(s);
          if (s < best) { best = s; bk = t; }
        }
        found.push(bk);
        F.push({ at: ["best", "shift"], r, cnt, scores, bk, found: found.slice(), L, vars: { колона: r, изместване: bk, буква: al.L[bk], "χ²": best.toFixed(1) }, msg: `Пробваме всичките ${m} измествания: най-малък χ² при <b>${bk}</b> → ключова буква „${al.L[bk]}“.`, log: `колона ${r}: ${al.L[bk]}` });
      }
      const guess = T10.decode(al, found), real = T10.decode(al, k);
      const dec = c.map((v, i) => T10.mod(v - found[i % L], m));
      F.push({ at: "col", found, L, dec, done: true, ok: guess === real, vars: { ключ: guess }, msg: `Възстановен ключ: <b>${guess}</b>${guess === real ? " — точно." : ` (истинският е ${real}). ${L !== k.length ? "Периодът е грешен." : "Някоя колона е твърде къса за надеждна статистика — грешката обаче е в една буква и се поправя на око."}`}`, inv: { text: guess === real ? "ключът е възстановен" : "статистиката е подвела в поне една колона", ok: guess === real } });
      return { frames: F, key: guess };
    },
  };

  function factor(n) {
    const f = []; let x = n;
    for (let d = 2; d * d <= x; d++) while (x % d === 0) { f.push(d); x /= d; }
    if (x > 1) f.push(x);
    return f.join("·");
  }

  const html = `
<div class="prose">
  <p><dfn data-g="виженер">Виженер</dfn> използва последователност от измествания, определена от ключова дума. При кодове 0–25 получаваме c<sub>i</sub> = (p<sub>i</sub> + k<sub>i</sub>) mod 26. Краткият ключ се повтаря до дължината на съобщението; дешифрирането изважда съответния код на ключа.</p>
  <p>За открит текст ATTACKATDAWN и ключ LEMON повтореният ключ е LEMONLEMONLE, а шифротекстът — <b>LXFOPVEFRNHR</b>. Първата буква A = 0 с L = 11 дава L, втората T = 19 с E = 4 дава X = 23.</p>
</div>

<div class="block">
  <h3>Схема 9. Виженер върху текст и повторен ключ</h3>
  <p class="muted">Таблицата (tabula recta) е m Цезарови азбуки една под друга: ред = буква на ключа, колона = открита буква, пресечната клетка = шифросимвол.</p>
  <div id="v-vig"></div>
  <div class="key"><b>Една и съща буква — различни шифросимволи</b><p>В ATTACK първата A с L дава L, втората A с O дава O. Това е разликата с <dfn data-g="моноазбучен шифър">моноазбучната</dfn> замяна: шаблонът на повторенията и формата на честотите вече не оцеляват (<a href="#razbarkvane">раздел 3</a>).</p></div>
</div>

<div class="block">
  <h3>Повтарящият ключ оставя периодична структура</h3>
  <p class="prose">Ако периодът се установи, позициите с един и същ остатък по модул L са шифровани с еднакво изместване и се анализират като отделни <dfn data-g="цезаров шифър">Цезарови шифри</dfn>. <dfn data-g="метод на касиски">Методът на Касиски</dfn> използва разстояния между повтарящи се фрагменти, а <dfn data-g="индекс на съвпадение">индексът на съвпадение</dfn> помага да се оцени структурата. Трите визуализатора по-долу работят върху един и същ шифротекст: смени ключа и пусни и трите.</p>
  <p class="muted">Подробностите на двата метода (тройки, най-близко повторение, усредняване по колони, χ² за всяка колона) са общоизвестна реализация <span class="extra-tag">извън конспекта</span> — ръководството само ги назовава.</p>
  <div id="v-kas"></div>
  <div id="v-ic"></div>
  <div id="v-crack"></div>
  <details class="trap"><summary>Капан: „статистиката на кратък низ е надеждна“</summary><div>
    <p>Нито един резултат върху много кратък низ не е автоматично надеждна статистическа оценка на целия език. Пусни разбиването с ключ LEMON върху английския текст: колоните са по ~42 букви и една от тях дава грешна буква (LEBON). При българския текст разстоянията на Касиски са само три. Кратък или нетипичен текст затруднява анализа.</p>
  </div></details>
  <details class="hint"><summary>Хинт: криптоанализът не е само честоти</summary><div>
    <p>Повторенията не са единственият източник на сведения. Формат, очаквани думи, известни фрагменти и повторна употреба на ключ свързват наблюденията. С известен открит текст ключът излиза направо: k = c − p (<a href="#ataki">раздел 2</a>).</p>
  </div></details>
</div>

<details class="trap"><summary>Капан: „Виженер с ключ колкото текста = еднократна лента“</summary><div>
  <p>Многоазбучната замяна затруднява непосредствения едносимволен анализ, но не премахва всички зависимости. Разликата с <dfn data-g="еднократна лента">еднократната лента</dfn> не е само името или дължината на ключа: за лентата има строги условия — равномерна случайност, независимост, секретност и еднократна употреба (<a href="#chestoti">раздел 7</a>). Ключ — смислена дума или текст — не е равномерно случаен.</p>
</div></details>`;

  function mount(root) {
    const common = [T10.alphaField(), { id: "text", label: "Открит текст", value: T10.TEXTS.EN_SAMPLE, width: "22em" }, { id: "key", label: "Ключ", value: "LEMON", width: "9em" }];
    const presetsA = [{ label: "англ., LEMON", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, key: "LEMON" } }, { label: "англ., FIRMWARE", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, key: "FIRMWARE" } }, { label: "бълг., КЛЮЧ", values: { alpha: "bg", text: T10.TEXTS.BG_SAMPLE, key: "КЛЮЧ" } }];

    S.viz(root.querySelector("#v-vig"), {
      id: "vig", title: "Виженер — буква по буква в таблицата", sub: "Синьо — ред на ключа; оранжево — колона на буквата; зелено — пресечната клетка.",
      code: "ch06_vig",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "14em" }, { id: "key", label: "Ключ", value: "LEMON", width: "8em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "дешифрирай LXFOPVEFRNHR", values: { alpha: "lat", text: "LXFOPVEFRNHR", key: "LEMON", mode: "dec" } }, { label: "бълг., КЛЮЧ", values: { alpha: "bg", text: "ДОНЕСИ КАРТАТА", key: "КЛЮЧ", mode: "enc" } }],
      legend: [["s-act", "ред (ключ)"], ["s-cmp", "колона"], ["s-done", "резултат"]],
      build: algos.vig,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), m = al.m, n = f.x.length, dec = I.mode === "dec";
        const ci = {}; if (f.i != null) ci[f.i] = "s-act";
        T10.strip(st, f.x.map((v) => al.L[v]), { title: dec ? "шифротекст" : "открит текст", cls: ci, small: true });
        T10.strip(st, f.x.map((_, i) => al.L[f.k[i % f.k.length]]), { append: true, title: "повторен ключ", cls: ci, small: true });
        T10.strip(st, f.y.map((v) => al.L[v]), { append: true, title: dec ? "открит текст" : "шифротекст", cls: f.done ? Object.fromEntries(f.y.map((_, k) => [k, "s-done"])) : ci, small: true });
        // таблица — само редовете на ключа (компактно) + текущия
        const rows = [...new Set(f.k)];
        const t = h("table", { class: "t grid", style: { fontSize: "12px" } });
        t.append(h("tr", null, h("th", { text: "+" }), ...al.L.map((c, j) => h("th", { class: f.col === j ? "s-cmp" : "", text: c }))));
        rows.forEach((r) => t.append(h("tr", null, h("th", { class: f.row === r ? "s-act" : "", text: al.L[r] }), ...al.L.map((_, j) => {
          const v = T10.mod(r + j, m);
          let cls = "";
          if (f.row === r && f.col === j) cls = "s-done"; else if (f.row === r) cls = "s-act"; else if (f.col === j) cls = "s-cmp";
          return h("td", { class: cls, style: { minWidth: "22px", padding: "3px 2px" }, text: al.L[v] });
        }))));
        st.append(h("div", { class: "tbl-wrap", style: { marginTop: "8px" } }, t));
        if (dec && f.row != null) st.append(h("p", { class: "muted", text: `Дешифриране: в ред „${al.L[f.row]}“ търсим „${al.L[f.out]}“ — колоната е откритата буква „${al.L[f.col]}“.` }));
        void n;
      },
    });

    S.viz(root.querySelector("#v-kas"), {
      id: "kas", title: "Метод на Касиски — разстояния между повторени тройки", sub: "Лентите: колко от разстоянията дели всеки делител 2…20.",
      code: "ch06_kasiski", inputs: common, presets: presetsA,
      legend: [["s-act", "повторена тройка"], ["s-done", "най-много гласове"]],
      build: algos.kasiski,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha);
        const wrap = h("div", { class: "mono", style: { overflowWrap: "anywhere", lineHeight: "1.9", fontSize: "13px" } });
        const mark = new Map();
        f.pos.forEach(([i, j], q) => { for (let d = 0; d < 3; d++) { mark.set(i + d, q); mark.set(j + d, q); } });
        f.c.forEach((v, i) => {
          const q = mark.get(i), cur = f.cur && (i - f.cur[0] < 3 && i >= f.cur[0] || i - f.cur[1] < 3 && i >= f.cur[1]);
          wrap.append(h("span", { style: { background: cur ? "var(--st-act-bg)" : q != null ? "var(--st-cmp-bg)" : "", outline: cur ? "1px solid var(--st-act)" : "", padding: "1px 0" }, text: al.L[v] }));
          if (i % 5 === 4) wrap.append(" ");
        });
        st.append(wrap);
        if (f.dist.length) st.append(h("p", { class: "mono", text: "разстояния: " + f.dist.join(", ") }));
        if (f.votes) {
          const ds = Array.from({ length: 19 }, (_, k) => k + 2), vs = ds.map((d) => f.votes[d]);
          const mx = Math.max(...vs);
          const box = h("div", { style: { overflowX: "auto" } }); st.append(box);
          const b = S.drawBars(box, vs, { height: 110, cls: Object.fromEntries(vs.map((v, k) => [k, v === mx && mx > 0 ? "s-done" : ""])), labelsUpTo: 40 });
          b.querySelectorAll(".bi").forEach((x, k) => (x.textContent = ds[k]));
          b.style.minWidth = "420px";
        }
      },
    });

    S.viz(root.querySelector("#v-ic"), {
      id: "ic", title: "Индекс на съвпадение по колони", sub: "Хоризонталните линии: IC на открития текст и 1/m (равномерно).",
      code: "ch06_ic", inputs: common, presets: presetsA,
      legend: [["s-act", "текущ L"], ["s-done", "близо до езика"]],
      build: algos.ic,
      draw(st, f) {
        st.innerHTML = "";
        const sv = S.svg, W = 560, H = 200, max = Math.max(f.icP * 1.25, ...f.vals, 0.08);
        const Y = (v) => H - 24 - (v / max) * (H - 40), X = (L) => 40 + (L - 1) * 42;
        const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        [[f.icP, "език"], [f.icR, "1/m"]].forEach(([v, t]) => { g.append(sv("line", { x1: 30, x2: W - 10, y1: Y(v), y2: Y(v), class: "edge", style: "stroke-dasharray:4 4" })); g.append(sv("text", { x: W - 12, y: Y(v) - 4, "text-anchor": "end", class: "wt", text: `${t} ${v.toFixed(3)}` })); });
        const mid = (f.icP + f.icR) / 2;
        f.vals.forEach((v, k) => {
          const L = k + 1;
          g.append(sv("g", { class: "node " + (L === f.L ? "s-act" : v > mid ? "s-done" : "") }, sv("rect", { x: X(L) - 13, y: Y(v), width: 26, height: H - 24 - Y(v), style: "fill:var(--cb,var(--accent-soft));stroke:var(--c,var(--accent))" })));
          g.append(sv("text", { x: X(L), y: H - 8, "text-anchor": "middle", text: L }));
        });
        g.append(sv("text", { x: 4, y: 14, class: "wt", text: "среден IC" }));
        st.append(g);
      },
    });

    S.viz(root.querySelector("#v-crack"), {
      id: "crack", title: "Разбиване при известен период: всяка колона е Цезар", sub: "Хистограмата е колоната; зелената буква — избраното изместване.",
      code: "ch06_crack",
      inputs: [...common, { id: "L", label: "период L", type: "number", value: 5, width: "5em" }],
      presets: [{ label: "англ., LEMON, L=5", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, key: "LEMON", L: 5 } }, { label: "англ., FIRMWARE, L=8", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, key: "FIRMWARE", L: 8 } }, { label: "бълг., КЛЮЧ, L=4", values: { alpha: "bg", text: T10.TEXTS.BG_SAMPLE, key: "КЛЮЧ", L: 4 } }, { label: "грешен L=3", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, key: "LEMON", L: 3 } }],
      legend: [["s-done", "избрано изместване"]],
      build: algos.crack,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha);
        T10.strip(st, Array.from({ length: f.L }, (_, k) => (f.found[k] != null ? al.L[f.found[k]] : "?")), { title: "ключ досега", cls: f.r != null ? { [f.r]: "s-act" } : {} });
        if (f.cnt) {
          const box = h("div", { style: { overflowX: "auto" } }); st.append(box);
          T10.hist(box, f.cnt, al, { title: `колона ${f.r} (шифросимволи)`, cls: f.bk != null ? { [f.bk]: "s-done" } : {}, height: 100 });
          if (f.bk != null) box.append(h("p", { class: "muted", text: `При изместване ${f.bk}: най-честата открита буква на езика „${al.L[T10.refFreq(al).indexOf(Math.max(...T10.refFreq(al)))]}“ се вижда като „${al.L[T10.mod(T10.refFreq(al).indexOf(Math.max(...T10.refFreq(al))) + f.bk, al.m)]}“.` }));
        }
        if (f.dec) st.append(h("p", { class: "mono", style: { overflowWrap: "anywhere" }, html: "<span class='muted'>дешифрирано:</span> " + S.esc(T10.decode(al, f.dec.slice(0, 120))) + "…" }));
      },
    });
  }

  S.chapter({ id: "vizhener", order: 6, num: "6", group: "Класически методи", title: "Полиазбучна замяна: шифър на Виженер", lead: "Последователност от измествания; таблицата; защо повтарящият ключ издава периода — Касиски, индекс на съвпадение и разбиване по колони.", html, mount, algos });
})();
