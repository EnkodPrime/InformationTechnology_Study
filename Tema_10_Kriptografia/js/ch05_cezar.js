/* Раздел 5 — Цезарово, моноазбучно и афинно заместване. */
(function () {
  const S = window.Study, h = S.h;

  function chi2(x, m, exp) {
    const cnt = T10.counts(x, m);
    let s = 0;
    for (let j = 0; j < m; j++) { const e = exp[j] * x.length; if (e > 0) s += (cnt[j] - e) * (cnt[j] - e) / e; }
    return s;
  }

  const algos = {
    chi2,
    /** Цезар — caesar_encrypt / caesar_decrypt */
    caesar({ alpha, text, k, mode }) {
      const al = T10.get(alpha), m = al.m;
      k = S.int(k, -99, 99, "Ключът k");
      const x = T10.encode(al, text, { maxLen: 40, minLen: 1 });
      const dec = mode === "dec", F = [], y = [];
      F.push({ at: dec ? "dloop" : "loop", x, y: [], k, m, vars: { k, m, n: x.length }, msg: `${dec ? "D" : "E"}<sub>k</sub>: всяка буква ${dec ? "−" : "+"} ${k} по модул ${m}. Едно и също изместване за всички позиции.` });
      x.forEach((v, i) => {
        const r = T10.mod(dec ? v - k : v + k, m);
        y.push(r);
        F.push({ at: dec ? "dec" : "enc", x, y: y.slice(), i, k, m, vars: { i, x: v, [dec ? "y − k" : "x + k"]: dec ? v - k : v + k, "mod m": r }, msg: `${al.L[v]} (${v}) ${dec ? "−" : "+"} ${k} = ${dec ? v - k : v + k} ≡ <b>${r}</b> → „${al.L[r]}“${(dec ? v - k < 0 : v + k >= m) ? " — остатъкът „завърта“ азбуката" : ""}.`, log: `${al.L[v]}→${al.L[r]}` });
      });
      F[F.length - 1].done = true;
      return { frames: F, result: T10.decode(al, y) };
    },

    /** изчерпване на всички m ключа с хи-квадрат — caesar_bruteforce */
    brute({ alpha, text, k }) {
      const al = T10.get(alpha), m = al.m;
      k = S.int(k, 0, m - 1, "Тайният ключ");
      const p = T10.encode(al, text, { maxLen: 600, minLen: 1 });
      const c = p.map((v) => T10.mod(v + k, m)), exp = T10.refFreq(al), F = [], scores = [];
      let best = 0, bestS = Infinity;
      F.push({ at: "try", c, scores: [], best: -1, m, vars: { n: c.length }, msg: `Нападателят вижда само шифротекста (${c.length} букви). Пробва всички ${m} измествания и оценява всеки кандидат с χ² спрямо честотите на езика: по-малко = по-близо до естествен текст.` });
      for (let t = 0; t < m; t++) {
        const cand = c.map((v) => T10.mod(v - t, m));
        const s = chi2(cand, m, exp);
        scores.push(s);
        const better = s < bestS;
        if (better) { bestS = s; best = t; }
        F.push({ at: better ? ["best", "score"] : "score", c, cand, scores: scores.slice(), t, best, m, vars: { k: t, "χ²": s.toFixed(1), best }, msg: `k = ${t}: „${T10.decode(al, cand.slice(0, 24))}${cand.length > 24 ? "…" : ""}“ χ² = ${s.toFixed(1)}${better ? " — <b>най-добър досега</b>" : ""}.`, log: `k=${t} χ²=${s.toFixed(1)}` });
      }
      const ok = best === k;
      F.push({ at: "ret", c, cand: c.map((v) => T10.mod(v - best, m)), scores, t: best, best, m, done: true, ok, vars: { best, "истински": k }, msg: ok ? `Най-малък χ² при <b>k = ${best}</b> — това е ключът. ${m} опита стигат.` : `Най-малкият χ² е при k = ${best}, а истинският ключ е ${k}. <b>Статистиката греши</b>: ${c.length} букви са твърде малко за надеждна оценка. Нападателят все пак ще прочете всичките ${m} кандидата.`, inv: { text: ok ? "изчерпването намери ключа" : "кратък текст — честотите не са представителни", ok } });
      return { frames: F, result: best };
    },

    /** моноазбучна замяна с азбука-ключ — mono_apply / mono_invert */
    mono({ alpha, text, key, mode }) {
      const al = T10.get(alpha), m = al.m;
      const K = T10.encode(al, key, { maxLen: m, what: "Ключът" });
      if (K.length !== m) throw new Error(`Ключът трябва да съдържа точно ${m} букви (има ${K.length}).`);
      const inv = new Array(m).fill(-1);
      for (let x = 0; x < m; x++) { if (inv[K[x]] >= 0) throw new Error(`Ключът не е пермутация: „${al.L[K[x]]}“ се повтаря — две букви ще се слеят.`); inv[K[x]] = x; }
      const tab = mode === "dec" ? inv : K;
      const x = T10.encode(al, text, { maxLen: 40, minLen: 1 }), y = [], F = [];
      F.push({ at: "loop", x, y: [], tab, K, vars: { m }, msg: mode === "dec" ? "Обратната пермутация се строи веднъж; после всяка буква се търси в нея." : "Всяка буква се заменя според таблицата — една и съща за всички позиции." });
      x.forEach((v, i) => { y.push(tab[v]); F.push({ at: "map", x, y: y.slice(), i, tab, K, from: v, vars: { i, от: al.L[v], към: al.L[tab[v]] }, msg: `${al.L[v]} → <b>${al.L[tab[v]]}</b>.`, log: `${al.L[v]}→${al.L[tab[v]]}` }); });
      F[F.length - 1].done = true;
      return { frames: F, result: T10.decode(al, y) };
    },

    /** афинен шифър — affine_encrypt / affine_decrypt */
    affine({ alpha, text, a, b, mode }) {
      const al = T10.get(alpha), m = al.m;
      a = S.int(a, 0, 99, "a"); b = S.int(b, 0, 99, "b");
      const x = T10.encode(al, text, { maxLen: 40, minLen: 1 }), y = [], F = [];
      const g = T10.gcd(a, m);
      F.push({ at: "check", x, y: [], a, b, m, g, vars: { a, b, m, "НОД(a,m)": g }, msg: `НОД(${a}, ${m}) = ${g}${g === 1 ? " — a е обратимо, ключът е валиден." : ` ≠ 1 — <b>невалиден ключ</b>: различни букви се сливат (виж схемата отдолу).`}` });
      if (g !== 1) { F[0].done = true; F[0].bad = true; return { frames: F, result: "invalid" }; }
      if (mode === "dec") {
        let ai = -1;
        for (let t = 1; t < m; t++) {
          const hit = T10.mod(a * t, m) === 1;
          F.push({ at: hit ? "found" : "search", x, y: [], a, b, m, g, t, vars: { t, "a·t mod m": T10.mod(a * t, m) }, msg: `${a}·${t} = ${a * t} ≡ ${T10.mod(a * t, m)}${hit ? ` ⇒ <b>a⁻¹ = ${t}</b>` : ""}.` });
          if (hit) { ai = t; break; }
        }
        x.forEach((v, i) => {
          const r = T10.mod(ai * (v - b), m);
          y.push(r);
          F.push({ at: "dec", x, y: y.slice(), i, a, b, m, g, ai, vars: { i, y: v, "a⁻¹(y−b)": ai * (v - b), x: r }, msg: `${ai}·(${v} − ${b}) = ${ai * (v - b)} ≡ <b>${r}</b> → „${al.L[r]}“.`, log: `${al.L[v]}→${al.L[r]}` });
        });
      } else {
        x.forEach((v, i) => {
          const r = T10.mod(a * v + b, m);
          y.push(r);
          F.push({ at: "enc", x, y: y.slice(), i, a, b, m, g, vars: { i, x: v, "ax+b": a * v + b, y: r }, msg: `${a}·${v} + ${b} = ${a * v + b} ≡ <b>${r}</b> → „${al.L[r]}“.`, log: `${al.L[v]}→${al.L[r]}` });
        });
      }
      F[F.length - 1].done = true;
      return { frames: F, result: T10.decode(al, y) };
    },
  };

  const html = `
<div class="prose">
  <p>При <dfn data-g="цезаров шифър">Цезаровия шифър</dfn> E<sub>k</sub>(x) = (x + k) mod 26 и D<sub>k</sub>(y) = (y − k) mod 26. За k = 3 текстът ATTACK става DWWDFN. Всички позиции използват едно и също изместване. Има 26 измествания, включително тъждественото, така че пълното изпробване е непосредствено.</p>
</div>

<div class="block">
  <h3>Схема 6. Цезаров шифър като циклично изместване</h3>
  <p class="muted">Завърти вътрешния пръстен: той е азбуката на шифротекста. При A = 0, …, Z = 25 се прибавя ключът по модул m.</p>
  <div class="row"><label class="field"><span>ключ k</span><input type="range" id="wh-k" min="0" max="25" value="3"></label><span class="pill" id="wh-v">k = 3</span><label class="field"><span>Азбука</span><select id="wh-a"><option value="lat">латиница (26)</option><option value="bg">българска (30)</option></select></label></div>
  <div id="wheel" style="overflow-x:auto"></div>
  <div id="v-caesar"></div>
  <div class="key"><b>Модулната аритметика прави обратното действие точно</b><p>За k = 3 буквата X с код 23 става A с код 0: остатъкът реализира връщането в началото на азбуката. Ако сменим азбуката с българска, модулът и кодовете трябва да се зададат отново — не можем механично да запазим 26.</p></div>
</div>

<div class="block">
  <h3>Атака с изчерпване на ключовете</h3>
  <p class="prose"><dfn data-g="грубо изчерпване">Грубото изчерпване</dfn> тук е тривиално: m кандидата. Визуализацията ги подрежда по χ² — отклонение на честотите на кандидата от честотите на езика (референтен текст на английски или български). Смени тайния ключ и пусни.</p>
  <div id="v-brute"></div>
  <details class="hint"><summary>Хинт: защо ATTACK с ключ 3 „се чупи“ грешно</summary><div>
    <p>Шест букви не носят надеждна статистика — най-ниският χ² може да е при грешен ключ. Нападателят обаче пак разполага само с 26 кандидата и ще ги прочете. Честотният извод е <b>статистически</b> и зависи от езика и дължината на текста (<a href="#chestoti">раздел 7</a>).</p>
  </div></details>
</div>

<div class="block">
  <h3>Общо моноазбучно заместване</h3>
  <p class="prose">При общо <dfn data-g="моноазбучен шифър">моноазбучно заместване</dfn> ключът е пермутация на азбуката и има 26! възможни ключа. Независимо от голямото число се запазват повторенията и честотният модел: една и съща буква винаги се превръща в една и съща друга буква.</p>
  <div id="v-mono"></div>
</div>

<div class="block">
  <h3>Схема 7. Афинно заместване и обратен елемент</h3>
  <p class="prose"><dfn data-g="афинен шифър">Афинният шифър</dfn> използва E(x) = (ax + b) mod 26. За обратимост a трябва да е взаимно просто с 26. Тогава има <dfn data-g="обратен елемент">обратен елемент</dfn> a⁻¹ и D(y) = a⁻¹(y − b) mod 26. При a = 5 и b = 8 обратният елемент е 21, защото 5 × 21 = 105 ≡ 1 (mod 26). За C с x = 2 получаваме 18, тоест S. Обратно 21 × (18 − 8) = 210 ≡ 2 (mod 26).</p>
  <div id="v-affine"></div>
  <details class="trap"><summary>Капан: „дешифрирам, като деля на 5“</summary><div>
    <p>Обикновено деление на 5 не е правилната операция в <dfn data-g="модулна аритметика">модулната аритметика</dfn>. Умножаваме по модулния обратен елемент 21 — число, а не дробта 1/5. Проверката на една двойка (C ↔ S) е пример; общата обратимост следва от условието НОД(a, m) = 1.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 8. Необратим множител в афинния шифър</h3>
  <p class="muted">Избери a. Стрелките показват x → a·x mod m (b не влияе на обратимостта). Червеното — две букви, които се сливат.</p>
  <div class="row"><label class="field"><span>a</span><select id="col-a"></select></label><label class="field"><span>Азбука</span><select id="col-al"><option value="lat">латиница (26)</option><option value="bg">българска (30)</option></select></label></div>
  <div id="collide" style="overflow-x:auto"></div>
  <p class="prose" id="col-txt"></p>
  <details class="trap"><summary>Капан (Изяснени въпроси): „всички ключове правят афинния шифър обратим“</summary><div>
    <p>Не. Множителят трябва да е взаимно прост с размера на азбуката. Иначе различни входни кодове могат да се слеят и еднозначното възстановяване е невъзможно. При a = 2 и m = 26 кодовете 0 и 13 дават един и същ резултат. За m = 26 допустимите a са 12 (1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25); за m = 30 — само 8 (1, 7, 11, 13, 17, 19, 23, 29).</p>
  </div></details>
</div>`;

  function mount(root) {
    /* колело */
    const wk = root.querySelector("#wh-k"), wv = root.querySelector("#wh-v"), wa = root.querySelector("#wh-a"), wb = root.querySelector("#wheel");
    function wheel() {
      const al = T10.get(wa.value), m = al.m;
      wk.max = m - 1; if (+wk.value > m - 1) wk.value = m - 1;
      const k = +wk.value, sv = S.svg;
      wv.textContent = `k = ${k}: ${al.L[0]}→${al.L[k]}`;
      wb.innerHTML = "";
      const W = 360, c = W / 2, R1 = 160, R2 = 118;
      const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${W}`, width: W });
      g.append(sv("circle", { cx: c, cy: c, r: R1 + 14, style: "fill:none;stroke:var(--line)" }), sv("circle", { cx: c, cy: c, r: (R1 + R2) / 2, style: "fill:none;stroke:var(--line)" }), sv("circle", { cx: c, cy: c, r: R2 - 18, style: "fill:none;stroke:var(--line)" }));
      for (let i = 0; i < m; i++) {
        const ang = (i / m) * 2 * Math.PI - Math.PI / 2;
        const hi = i === 0 || i === 23 % m;
        g.append(sv("text", { x: c + R1 * Math.cos(ang), y: c + R1 * Math.sin(ang) + 5, "text-anchor": "middle", style: hi ? "font-weight:700;fill:var(--st-act)" : "font-weight:600", text: al.L[i] }));
        g.append(sv("text", { x: c + R2 * Math.cos(ang), y: c + R2 * Math.sin(ang) + 5, "text-anchor": "middle", style: hi ? "font-weight:700;fill:var(--st-done)" : "fill:var(--st-cmp)", text: al.L[T10.mod(i + k, m)] }));
      }
      g.append(sv("text", { x: c, y: c - 6, "text-anchor": "middle", class: "wt", text: "външен: открит" }), sv("text", { x: c, y: c + 12, "text-anchor": "middle", class: "wt", text: "вътрешен: шифр." }));
      wb.append(g);
    }
    wk.oninput = wheel; wa.onchange = wheel; wheel();

    S.viz(root.querySelector("#v-caesar"), {
      id: "caesar", title: "Цезар — стъпка по стъпка", sub: "Шифровай и после дешифрирай резултата със същия k.",
      code: "ch05_caesar",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACK", width: "15em" }, { id: "k", label: "k", type: "number", value: 3, width: "5em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "XYZ (завъртане)", values: { alpha: "lat", text: "XYZ", k: 3, mode: "enc" } }, { label: "дешифрирай DWWDFN", values: { alpha: "lat", text: "DWWDFN", k: 3, mode: "dec" } }, { label: "k = 0", values: { alpha: "lat", text: "ATTACK", k: 0, mode: "enc" } }, { label: "бълг. ЮЯ, k = 3", values: { alpha: "bg", text: "ЮЯ", k: 3, mode: "enc" } }],
      legend: [["s-act", "текуща буква"], ["s-piv", "завъртане през края"], ["s-done", "готово"]],
      build: algos.caesar,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), dec = I.mode === "dec";
        const cx = {}, cy = {};
        if (f.i != null) { cx[f.i] = "s-act"; const s = dec ? f.x[f.i] - f.k : f.x[f.i] + f.k; cy[f.i] = s < 0 || s >= f.m ? "s-piv" : "s-act"; }
        T10.strip(st, f.x.map((v) => al.L[v]), { title: dec ? "шифротекст" : "открит текст", cls: cx, sub: (k) => f.x[k], small: f.x.length > 16 });
        T10.strip(st, f.y.map((v) => al.L[v]), { append: true, title: dec ? "открит текст" : "шифротекст", cls: f.done ? Object.fromEntries(f.y.map((_, k) => [k, "s-done"])) : cy, sub: (k) => f.y[k], small: f.x.length > 16 });
      },
    });

    S.viz(root.querySelector("#v-brute"), {
      id: "brute", title: "Изчерпване на всички ключове + честотна оценка", sub: "Лентите са χ² за всеки кандидат-ключ; зелената е избраната.",
      code: "ch05_brute",
      inputs: [T10.alphaField(), { id: "text", label: "Таен открит текст", value: T10.TEXTS.EN_SAMPLE.slice(0, 120), width: "22em" }, { id: "k", label: "таен ключ", type: "number", value: 7, width: "5em" }],
      presets: [{ label: "дълъг английски", values: { alpha: "lat", text: T10.TEXTS.EN_SAMPLE, k: 19 } }, { label: "дълъг български", values: { alpha: "bg", text: T10.TEXTS.BG_SAMPLE, k: 11 } }, { label: "ATTACK (кратък)", values: { alpha: "lat", text: "ATTACK", k: 3 } }],
      random: () => ({ k: S.randInt(1, 25) }),
      legend: [["s-act", "текущ кандидат"], ["s-done", "най-малък χ²"], ["s-swap", "грешен избор"]],
      speed: 2,
      build: algos.brute,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha);
        const cls = {};
        if (f.t != null) cls[f.t] = "s-act";
        if (f.best >= 0) cls[f.best] = f.done && !f.ok ? "s-swap" : "s-done";
        const box = h("div", { style: { overflowX: "auto" } });
        st.append(box);
        const sc = f.scores.concat(new Array(f.m - f.scores.length).fill(0));
        const bars = S.drawBars(box, sc.map((v) => Math.round(v)), { height: 130, cls, fmt: (v) => (v ? v : ""), labelsUpTo: 40 });
        bars.style.minWidth = f.m * 16 + "px";
        bars.querySelectorAll(".bi").forEach((b, k) => (b.textContent = k));
        st.append(h("p", { class: "mono", style: { overflowWrap: "anywhere", marginTop: "10px" }, html: `<span class="muted">шифротекст:</span> ${S.esc(T10.decode(al, f.c.slice(0, 60)))}${f.c.length > 60 ? "…" : ""}` }));
        if (f.cand) st.append(h("p", { class: "mono", style: { overflowWrap: "anywhere" }, html: `<span class="muted">кандидат k=${f.t}:</span> <b>${S.esc(T10.decode(al, f.cand.slice(0, 60)))}${f.cand.length > 60 ? "…" : ""}</b>` }));
      },
    });

    S.viz(root.querySelector("#v-mono"), {
      id: "mono", title: "Моноазбучна замяна с произволна пермутация", sub: "Ключът е заместващата азбука (буквата под A, под B, …).",
      code: "ch05_mono",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "14em" }, { id: "key", label: "Ключ (пермутация)", value: "ZEBRASCDFGHIJKLMNOPQTUVWXY", width: "22em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "дешифрирай ZQQZBHZQRZVK", values: { alpha: "lat", text: "ZQQZBHZQRZVK", mode: "dec", key: "ZEBRASCDFGHIJKLMNOPQTUVWXY" } }, { label: "бълг.", values: { alpha: "bg", text: "КАРТАТА", key: "ЯВЕРТЪУИОПЮЩШАСДФГХЙКЛЗЬЦЖБНМЧ", mode: "enc" } }, { label: "невалиден (повтаря Z)", values: { alpha: "lat", key: "ZEBRASCDFGHIJKLMNOPQTUVWXZ" } }],
      random: () => ({ alpha: "lat", key: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].sort(() => Math.random() - 0.5).join("") }),
      legend: [["s-act", "текуща буква"], ["s-cmp", "ред в таблицата"]],
      build: algos.mono,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), dec = I.mode === "dec";
        const t = h("table", { class: "t grid" });
        t.append(h("tr", null, h("th", { text: "открит" }), ...al.L.map((c, k) => h("td", { class: !dec && f.from === k ? "s-cmp" : dec && f.from != null && f.tab[f.from] === k ? "s-cmp" : "", text: c }))));
        t.append(h("tr", null, h("th", { text: "шифр." }), ...f.K.map((v, k) => h("td", { class: !dec && f.from === k ? "s-act" : dec && f.from === v ? "s-act" : "", text: al.L[v] }))));
        st.append(h("div", { class: "tbl-wrap" }, t));
        const cx = {}; if (f.i != null) cx[f.i] = "s-act";
        T10.strip(st, f.x.map((v) => al.L[v]), { append: true, title: "вход", cls: cx, small: f.x.length > 16 });
        T10.strip(st, f.y.map((v) => al.L[v]), { append: true, title: "изход", cls: cx, small: f.x.length > 16 });
      },
    });

    S.viz(root.querySelector("#v-affine"), {
      id: "affine", title: "Афинен шифър y = (a·x + b) mod m", sub: "При дешифриране първо се търси a⁻¹.",
      code: "ch05_affine",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "C", width: "14em" }, { id: "a", label: "a", type: "number", value: 5, width: "5em" }, { id: "b", label: "b", type: "number", value: 8, width: "5em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "дешифрирай S", values: { alpha: "lat", text: "S", a: 5, b: 8, mode: "dec" } }, { label: "ATTACKATDAWN", values: { alpha: "lat", text: "ATTACKATDAWN", a: 5, b: 8, mode: "enc" } }, { label: "a = 2 (невалидно)", values: { alpha: "lat", text: "ATTACK", a: 2, b: 3, mode: "enc" } }, { label: "бълг. a = 7, b = 3", values: { alpha: "bg", text: "ЩЕ СЕ СРЕЩНЕМ", a: 7, b: 3, mode: "enc" } }],
      legend: [["s-act", "текуща буква"], ["s-swap", "невалиден ключ"], ["s-done", "готово"]],
      build: algos.affine,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha);
        if (f.bad) { st.append(h("p", { class: "warn", text: `a = ${f.a} и m = ${f.m} имат общ делител ${f.g}. Шифроване не се извършва.` })); return; }
        if (f.t != null && f.ai == null && !f.y.length) {
          S.drawArray(st, Array.from({ length: f.t }, (_, k) => T10.mod(f.a * (k + 1), f.m)), { cls: { [f.t - 1]: f.at === "found" ? "s-done" : "s-act" }, label: (k) => "t=" + (k + 1) });
          st.append(h("p", { class: "muted", text: "a·t mod m за t = 1, 2, … — търсим 1." }));
          return;
        }
        const cx = {}; if (f.i != null) cx[f.i] = "s-act";
        T10.strip(st, f.x.map((v) => al.L[v]), { title: "вход", cls: cx, sub: (k) => f.x[k], small: f.x.length > 16 });
        T10.strip(st, f.y.map((v) => al.L[v]), { append: true, title: "изход", cls: f.done ? Object.fromEntries(f.y.map((_, k) => [k, "s-done"])) : cx, sub: (k) => f.y[k], small: f.x.length > 16 });
      },
    });

    /* схема 8 — сливане */
    const ca = root.querySelector("#col-a"), cal = root.querySelector("#col-al"), cb = root.querySelector("#collide"), ct = root.querySelector("#col-txt");
    function fillA() {
      const m = T10.get(cal.value).m, prev = ca.value || "2";
      ca.innerHTML = "";
      for (let a = 1; a < m; a++) ca.append(h("option", { value: a, text: `${a}${T10.gcd(a, m) === 1 ? " ✓" : ""}`, selected: String(a) === prev ? true : null }));
    }
    function coll() {
      const al = T10.get(cal.value), m = al.m, a = +ca.value, sv = S.svg;
      const img = Array.from({ length: m }, (_, x) => T10.mod(a * x, m));
      const hits = {}; img.forEach((y) => (hits[y] = (hits[y] || 0) + 1));
      cb.innerHTML = "";
      const dx = 22, W = m * dx + 30, g = sv("svg", { class: "g", viewBox: `0 0 ${W} 150`, width: W });
      for (let x = 0; x < m; x++) {
        g.append(sv("text", { x: 20 + x * dx, y: 18, "text-anchor": "middle", text: al.L[x] }));
        g.append(sv("text", { x: 20 + x * dx, y: 140, "text-anchor": "middle", style: hits[x] ? "" : "fill:var(--st-dim)", text: al.L[x] }));
        g.append(sv("line", { x1: 20 + x * dx, y1: 26, x2: 20 + img[x] * dx, y2: 122, class: "edge " + (hits[img[x]] > 1 ? "s-swap" : "s-done") }));
      }
      cb.append(g);
      const g1 = T10.gcd(a, m);
      ct.innerHTML = g1 === 1 ? `НОД(${a}, ${m}) = 1: изображението е пермутация, всяка буква се получава точно веднъж — обратимо.` : `НОД(${a}, ${m}) = ${g1}: само ${m / g1} различни изхода; всеки се получава от ${g1} входа (напр. ${al.L[0]} и ${al.L[m / g1]} → ${al.L[0]}). Сивите букви никога не се появяват. Еднозначно дешифриране не е възможно.`;
    }
    cal.onchange = () => { fillA(); coll(); }; ca.onchange = coll;
    fillA(); coll();
  }

  S.chapter({ id: "cezar", order: 5, num: "5", group: "Класически методи", title: "Цезарово, моноазбучно и афинно заместване", lead: "Едно и също изместване за всички позиции; изчерпване на всички ключове; 26! ключа, които не помагат; обратен елемент и защо a = 2 не става.", html, mount, algos });
})();
