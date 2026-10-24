/* Раздел 7 — Честотен анализ и еднократна лента (XOR). */
(function () {
  const S = window.Study, h = S.h;

  /** ord[r] = буквата с r-та най-голяма честота (равенство → по-малкият код) — rank_letters */
  function rank(cnt) {
    const ord = cnt.map((_, j) => j);
    for (let i = 1; i < ord.length; i++) {
      const v = ord[i]; let j = i - 1;
      while (j >= 0 && (cnt[ord[j]] < cnt[v] || (cnt[ord[j]] === cnt[v] && ord[j] > v))) { ord[j + 1] = ord[j]; j--; }
      ord[j + 1] = v;
    }
    return ord;
  }
  function langOrder(al) {
    const f = T10.refFreq(al);
    return rank(f.map((x) => Math.round(x * 1e6)));
  }

  function parseBits(s, name) {
    const t = String(s).replace(/[\s_]/g, "");
    if (!/^[01]+$/.test(t)) throw new Error(`${name}: само 0 и 1.`);
    if (t.length > 32) throw new Error(`${name}: най-много 32 бита.`);
    return [...t].map(Number);
  }

  const algos = {
    rank, langOrder,
    /** моноазбучна замяна + честотно първо предположение — freq_guess */
    freq({ alpha, text, key }) {
      const al = T10.get(alpha), m = al.m;
      const p = T10.encode(al, text, { maxLen: 800, minLen: 1 });
      const K = T10.encode(al, key, { maxLen: m, what: "Ключът" });
      if (K.length !== m || new Set(K).size !== m) throw new Error(`Ключът трябва да е пермутация на всичките ${m} букви.`);
      const c = p.map((v) => K[v]), cnt = T10.counts(c, m), lo = langOrder(al), co = rank(cnt);
      const guess = new Array(m).fill(-1), F = [];
      F.push({ at: "rankc", c, p, cnt, co, lo, guess: guess.slice(), r: -1, vars: { n: c.length }, msg: `Броим шифросимволите и ги подреждаме по честота. Подредбата на езика (от референтния текст): ${T10.decode(al, lo.slice(0, 10))}…` });
      for (let r = 0; r < m; r++) {
        guess[co[r]] = lo[r];
        const ok = K[lo[r]] === co[r];
        F.push({ at: ["map", "match"], c, p, cnt, co, lo, guess: guess.slice(), r, ok, vars: { ранг: r, шифр: al.L[co[r]], брой: cnt[co[r]], "→ открита": al.L[lo[r]] }, msg: `${r + 1}-ият по честота шифросимвол „${al.L[co[r]]}“ (${cnt[co[r]]}×) → предполагаме „${al.L[lo[r]]}“${cnt[co[r]] === 0 ? " (не се среща — няма информация)" : ok ? " — <b>вярно</b>" : ""}.`, log: `${al.L[co[r]]}→${al.L[lo[r]]}${ok ? " ✓" : ""}` });
      }
      const d = c.map((v) => guess[v]);
      const right = d.filter((v, i) => v === p[i]).length;
      F.push({ at: "map", c, p, cnt, co, lo, guess, r: m, d, right, done: true, vars: { "верни букви": `${right}/${p.length}` }, msg: `Първото предположение дава <b>${right} от ${p.length}</b> верни букви (${Math.round(100 * right / p.length)}%). Не е решение, а отправна точка: оттук се коригира по двойки, тройки, шаблони на думи и вероятни думи.` });
      return { frames: F, d: T10.decode(al, d), right };
    },

    /** XOR на битови низове — xor_bytes; режими: otp, reuse, flip */
    xor({ m1, m2, k, mode }) {
      const M1 = parseBits(m1, "M₁"), K = parseBits(k, "K"), F = [];
      if (K.length < M1.length) throw new Error(`Ключът е по-къс (${K.length}) от съобщението (${M1.length}) — условието „поне толкова дълъг“ е нарушено.`);
      const n = M1.length;
      const xr = (a, b) => a.map((v, i) => v ^ b[i]);
      if (mode === "reuse" || mode === "flip") {
        const M2 = parseBits(m2, "M₂");
        if (mode === "reuse" && M2.length !== n) throw new Error("M₁ и M₂ трябва да са с еднаква дължина.");
        if (mode === "flip") {
          // M2 тук е маската Δ, която нападателят XOR-ва към C
          const D = M2.concat(new Array(Math.max(0, n - M2.length)).fill(0)).slice(0, n);
          const C = xr(M1, K), C2 = xr(C, D), M1p = xr(C2, K);
          const rows = [["M", M1], ["K", K.slice(0, n)], ["C = M ⊕ K", C], ["Δ (нападател)", D], ["C′ = C ⊕ Δ", C2], ["M′ = C′ ⊕ K", M1p]];
          rows.forEach((_, q) => F.push({ at: q < 3 ? "xor" : "loop", rows: rows.slice(0, q + 1), hi: q, mode, msg: q === 3 ? "Нападателят не знае K, но XOR-ва избрана маска Δ към шифротекста." : q === 5 ? `M′ = M ⊕ Δ: <b>точно обърнатите битове</b> — промяна с предвидим ефект, която получателят не открива. Еднократната лента не дава <dfn data-g="цялост">цялост</dfn>.` : `${rows[q][0]}.` }));
          F[F.length - 1].done = true;
          return { frames: F, result: M1p.join("") };
        }
        const C1 = xr(M1, K), C2 = xr(M2, K), X = xr(C1, C2), MM = xr(M1, M2);
        const rows = [["M₁", M1], ["M₂", M2], ["K (същият!)", K.slice(0, n)], ["C₁ = M₁ ⊕ K", C1], ["C₂ = M₂ ⊕ K", C2], ["C₁ ⊕ C₂", X], ["M₁ ⊕ M₂", MM]];
        rows.forEach((_, q) => F.push({ at: q >= 3 ? "xor" : "loop", rows: rows.slice(0, q + 1), hi: q, mode, msg: q === 5 ? "Нападателят вижда C₁ и C₂ и ги XOR-ва — без ключа." : q === 6 ? `C₁ ⊕ C₂ = (M₁ ⊕ K) ⊕ (M₂ ⊕ K) = M₁ ⊕ M₂, защото K ⊕ K = 0. <b>Ключът изчезна.</b> Това не дешифрира автоматично двете съобщения, но разкрива зависимост, която може да се съчетае с известен текст.` : `${rows[q][0]}.`, eq: q === 6 }));
        F[F.length - 1].done = true;
        return { frames: F, result: X.join(""), mm: MM.join("") };
      }
      const C = [], D = [];
      F.push({ at: "loop", M: M1, K, C: [], D: [], mode, msg: `Шифроване: C = M ⊕ K, бит по бит.` });
      for (let i = 0; i < n; i++) { C.push(M1[i] ^ K[i]); F.push({ at: "xor", M: M1, K, C: C.slice(), D: [], i, mode, vars: { i, m: M1[i], k: K[i], c: C[i] }, msg: `${M1[i]} ⊕ ${K[i]} = <b>${C[i]}</b>${K[i] ? " (ключовият бит 1 обръща)" : " (ключовият бит 0 запазва)"}.` }); }
      for (let i = 0; i < n; i++) { D.push(C[i] ^ K[i]); F.push({ at: "xor", M: M1, K, C, D: D.slice(), i, dec: true, mode, vars: { i, c: C[i], k: K[i], m: D[i] }, msg: `Дешифриране: ${C[i]} ⊕ ${K[i]} = <b>${D[i]}</b>. XOR с един и същ ключ е собствена обратна операция.` }); }
      F[F.length - 1].done = true;
      return { frames: F, result: C.join(""), back: D.join("") };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="честотен анализ">Честотният анализ</dfn> използва неравномерното разпределение на букви и съчетания в естествения език. При достатъчно дълъг <dfn data-g="моноазбучен шифър">моноазбучен</dfn> текст могат да се сравняват единични честоти, двойки, тройки и шаблони на думи.</p>
</div>

<div class="block">
  <h3>Схема 10. Честотите при заместване и транспозиция</h3>
  <p class="muted">Един и същ текст, три хистограми. Смени текста и метода — виж коя форма оцелява.</p>
  <div class="row"><label class="field"><span>Азбука</span><select id="h-al"><option value="lat">латиница</option><option value="bg">българска</option></select></label><label class="field" style="flex:1 1 200px;min-width:0"><span>Текст</span><input type="text" id="h-txt" value="ATTACK" style="width:100%"></label><button class="btn" id="h-long">дълъг текст</button><button class="btn" id="h-short">ATTACK</button></div>
  <div id="h3"></div>
  <p class="prose muted">Транспозицията запазва броя на всеки конкретен символ. Моноазбучната замяна преименува символите и пази формата на честотите. Шестбуквеният пример показва свойството, а не достатъчна статистика за реален криптоанализ.</p>
</div>

<div class="block">
  <h3>Честотният анализ в действие</h3>
  <p class="prose">Моноазбучна замяна с произволна пермутация (ключово пространство 26! или 30!). Нападателят подрежда шифросимволите по честота и ги съпоставя с подредбата на езика. Зеленото са вярно отгатнатите съответствия.</p>
  <div id="v-freq"></div>
  <details class="trap"><summary>Капан: „най-честият символ е E, значи това е E“</summary><div>
    <p>Най-честият символ не доказва самостоятелно определена буква: изводът е статистически и зависи от езика и текста. В английския референтен текст подредбата започва с E, T, R — третата не е A, както в общоприетите таблици; подредбата на конкретен текст се отклонява от средната за езика. Затова първото предположение тук дава под 20% верни букви, а не всички.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 11. Еднократна лента чрез XOR</h3>
  <p class="prose"><dfn data-g="еднократна лента">Еднократната лента</dfn> (<dfn data-g="otp">OTP</dfn>) използва равномерно случаен таен ключ, независим от съобщението, с дължина поне колкото него и без повторна употреба. За битови низове C = M <dfn data-g="xor">XOR</dfn> K и M = C XOR K. При изпълнени условия предоставя <dfn data-g="съвършена секретност">съвършена секретност</dfn> на съдържанието в стандартния модел; дължината може да остане видима.</p>
  <div id="v-otp"></div>
  <div class="key"><b>Петте условия</b><p>Ключът е <b>равномерно случаен</b>, <b>независим</b> от съобщението, <b>поне толкова дълъг</b>, <b>таен</b> и използван <b>еднократно</b>. Само използването на XOR не осигурява нито едно от тях.</p></div>
  <details class="hint"><summary>Хинт: защо при тези условия шифротекстът не казва нищо</summary><div>
    <p>За всеки наблюдаван C и всеки кандидат M със същата дължина има точно един ключ K = C ⊕ M. Ако всички ключове са равновероятни, всеки M остава точно толкова вероятен, колкото е бил преди наблюдението — шифротекстът не променя вероятностното знание за съобщението. Опитай в схемата отдолу: един и същ C, различни M — всеки има свой ключ.</p>
  </div></details>
  <div class="card" id="any-m"></div>
</div>

<div class="block">
  <h3>Схеми 12–13. Повторното използване на лента елиминира ключа</h3>
  <p class="prose">Пример от ръководството: M₁ = 1100, M₂ = 0011, K = 1010 ⇒ C₁ = 0110, C₂ = 1001 и C₁ XOR C₂ = 1111 = M₁ XOR M₂.</p>
  <div id="v-reuse"></div>
  <div class="key"><b>Формулата при повторен ключ</b><p class="formula">C₁ ⊕ C₂ = (M₁ ⊕ K) ⊕ (M₂ ⊕ K) = M₁ ⊕ M₂</p><p>Ако единият открит текст (или част от него) е известен, другият излиза директно.</p></div>
  <details class="trap"><summary>Капан: „потоковият шифър с XOR е еднократна лента“</summary><div>
    <p><dfn data-g="потоков шифър">Потоковият шифър</dfn> генерира псевдослучайна ключова последователност от по-къс секретен ключ и параметри. Той може да използва XOR, но не получава автоматично информационнотеоретичната гаранция на истинска еднократна лента — макар да може да е основа на сигурен изчислителен шифър.</p>
  </div></details>
</div>

<div class="block">
  <h3>Съвършената секретност не е цялост</h3>
  <p class="prose">Самото шифроване с XOR не удостоверява <dfn data-g="цялост">целостта</dfn>: изменение на бит в шифротекста променя съответния бит в текста. В C кода (<code>main</code> в <code>07_freq_otp.c</code>) нападателят XOR-ва първия байт с 'A' ⊕ 'R' и „ATTACK AT DAWN“ става „RTTACK AT DAWN“ — без да знае ключа.</p>
  <div id="v-flip"></div>
  <p class="prose muted">Следователно съвършената секретност не е универсална гаранция за всички цели на криптографията (виж <dfn data-g="mac">MAC</dfn> и <dfn data-g="aead">AEAD</dfn> в <a href="#savremenna">раздел 8</a>).</p>
</div>`;

  function mount(root) {
    /* схема 10 */
    const hal = root.querySelector("#h-al"), htx = root.querySelector("#h-txt"), hb = root.querySelector("#h3");
    root.querySelector("#h-long").onclick = () => { htx.value = T10.sample(T10.get(hal.value)); draw3(); };
    root.querySelector("#h-short").onclick = () => { hal.value = "lat"; htx.value = "ATTACK"; draw3(); };
    function draw3() {
      hb.innerHTML = "";
      const al = T10.get(hal.value);
      let x;
      try { x = T10.encode(al, htx.value, { maxLen: 2000, minLen: 1 }); } catch (e) { hb.append(h("p", { class: "warn", text: e.message })); return; }
      const sub = x.map((v) => T10.mod(v + 3, al.m));
      const tr = []; const w = Math.max(1, Math.ceil(x.length / 2)); for (let c = 0; c < w; c++) for (let i = c; i < x.length; i += w) tr.push(x[i]);
      const grid = h("div", { style: { display: "grid", gap: "4px" } });
      [["открит текст", x], ["Цезар k = 3 (моноазбучна)", sub], ["транспозиция", tr]].forEach(([t, z]) => { const b = h("div", { style: { overflowX: "auto" } }); grid.append(b); T10.hist(b, T10.counts(z, al.m), al, { title: `${t}: ${T10.decode(al, z.slice(0, 30))}${z.length > 30 ? "…" : ""}`, height: 90 }); });
      hb.append(grid);
    }
    hal.onchange = draw3; htx.onchange = draw3; draw3();

    S.viz(root.querySelector("#v-freq"), {
      id: "freq", title: "Първо предположение по честоти", sub: "Горе — подредени по честота шифросимволи; отдолу — предполагаемата открита буква.",
      code: "ch07_rank",
      inputs: [T10.alphaField(), { id: "text", label: "Таен открит текст", value: T10.TEXTS.EN_SAMPLE, width: "20em" }, { id: "key", label: "Ключ (пермутация)", value: "QWERTYUIOPASDFGHJKLZXCVBNM", width: "20em" }],
      presets: [{ label: "български", values: { alpha: "bg", text: T10.TEXTS.BG_SAMPLE, key: "ЯВЕРТЪУИОПЮЩШАСДФГХЙКЛЗЬЦЖБНМЧ" } }, { label: "кратък: ATTACKATDAWN", values: { alpha: "lat", text: "ATTACKATDAWN", key: "QWERTYUIOPASDFGHJKLZXCVBNM" } }],
      legend: [["s-act", "текущо съпоставяне"], ["s-done", "вярно"], ["s-swap", "грешно"]],
      speed: 2,
      build: algos.freq,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), K = T10.encode(al, I.key);
        const t = h("table", { class: "t grid", style: { fontSize: "12px" } });
        const cls = (r) => (r === f.r ? "s-act" : r < f.r && f.cnt[f.co[r]] > 0 ? (K[f.lo[r]] === f.co[r] ? "s-done" : "s-swap") : "");
        t.append(h("tr", null, h("th", { text: "шифр." }), ...f.co.map((v, r) => h("td", { class: cls(r), style: { padding: "3px 4px", minWidth: "22px" }, text: al.L[v] }))));
        t.append(h("tr", null, h("th", { text: "брой" }), ...f.co.map((v) => h("td", { style: { padding: "3px 4px", minWidth: "22px" }, text: f.cnt[v] }))));
        t.append(h("tr", null, h("th", { text: "език" }), ...f.lo.map((v, r) => h("td", { class: cls(r), style: { padding: "3px 4px", minWidth: "22px" }, text: r <= f.r ? al.L[v] : "·" }))));
        st.append(h("div", { class: "tbl-wrap" }, t));
        const show = (z, lab, mk) => st.append(h("p", { class: "mono", style: { overflowWrap: "anywhere", marginTop: "6px", fontSize: "13px" }, html: `<span class="muted">${lab}</span> ` + z.slice(0, 140).map((v, i) => (mk ? `<span style="color:${v === f.p[i] ? "var(--st-done)" : "var(--st-swap)"}">${al.L[v]}</span>` : al.L[v])).join("") + (z.length > 140 ? "…" : "") }));
        show(f.c, "шифротекст:");
        if (f.d) show(f.d, "предположение:", true);
      },
    });

    S.viz(root.querySelector("#v-otp"), {
      id: "otp", title: "Еднократна лента: C = M ⊕ K, M = C ⊕ K", sub: "Бит по бит — шифроване и после дешифриране със същия ключ.",
      code: "ch07_otp",
      inputs: [{ id: "m1", label: "M (битове)", value: "1100", width: "14em" }, { id: "k", label: "K (битове)", value: "1010", width: "14em" }],
      presets: [{ label: "8 бита", values: { m1: "01000001", k: "11010110" } }, { label: "ключът е по-къс", values: { m1: "110011", k: "1010" } }],
      random: () => ({ m1: Array.from({ length: 12 }, () => S.randInt(0, 1)).join(""), k: Array.from({ length: 12 }, () => S.randInt(0, 1)).join("") }),
      legend: [["s-act", "текущ бит"], ["s-piv", "ключов бит 1 (обръща)"], ["s-done", "възстановено"]],
      build: (i) => algos.xor({ ...i, mode: "otp" }),
      draw(st, f) {
        st.innerHTML = "";
        const ci = f.i != null ? { [f.i]: "s-act" } : {};
        T10.strip(st, f.M, { title: "M", cls: f.dec ? {} : ci, small: true });
        T10.strip(st, f.K.slice(0, f.M.length), { append: true, title: "K", cls: Object.fromEntries(f.K.map((b, k) => [k, k === f.i ? "s-act" : b ? "s-piv" : ""])), small: true });
        T10.strip(st, f.C, { append: true, title: "C = M ⊕ K", cls: f.dec ? ci : ci, small: true });
        if (f.D.length) T10.strip(st, f.D, { append: true, title: "C ⊕ K", cls: Object.fromEntries(f.D.map((b, k) => [k, k === f.i ? "s-act" : "s-done"])), small: true });
      },
    });

    /* всеки M е възможен */
    const am = root.querySelector("#any-m");
    const cIn = h("input", { type: "text", value: "0110", style: { width: "8em" } }), mIn = h("input", { type: "text", value: "1100", style: { width: "8em" } }), out = h("p", { class: "mono" });
    const upd = () => {
      const c = cIn.value.replace(/\s/g, ""), m = mIn.value.replace(/\s/g, "");
      if (!/^[01]+$/.test(c) || !/^[01]+$/.test(m) || c.length !== m.length) { out.innerHTML = `<span class="warn">C и M: битове с еднаква дължина.</span>`; return; }
      const k = [...c].map((b, i) => b ^ m[i]).join("");
      out.innerHTML = `K = C ⊕ M = <b>${k}</b> — при равномерно случаен ключ този K е точно толкова вероятен, колкото всеки друг.`;
    };
    cIn.oninput = upd; mIn.oninput = upd;
    am.append(h("h4", { text: "Всеки открит текст е възможен" }), h("div", { class: "row" }, h("label", { class: "field" }, h("span", { text: "наблюдаван C" }), cIn), h("label", { class: "field" }, h("span", { text: "предполагаем M" }), mIn)), out);
    upd();

    const drawRows = (st, f) => {
      st.innerHTML = "";
      f.rows.forEach(([t, b], q) => T10.strip(st, b, { append: true, title: t, small: true, cls: q === f.hi ? Object.fromEntries(b.map((_, k) => [k, f.eq || f.done ? "s-done" : "s-act"])) : {} }));
    };
    S.viz(root.querySelector("#v-reuse"), {
      id: "reuse", title: "Повторен ключ: C₁ ⊕ C₂ = M₁ ⊕ M₂", sub: "Два текста, един и същ K.",
      code: "ch07_otp",
      inputs: [{ id: "m1", label: "M₁", value: "1100", width: "12em" }, { id: "m2", label: "M₂", value: "0011", width: "12em" }, { id: "k", label: "K", value: "1010", width: "12em" }],
      random: () => { const r = () => Array.from({ length: 10 }, () => S.randInt(0, 1)).join(""); return { m1: r(), m2: r(), k: r() }; },
      legend: [["s-act", "нов ред"], ["s-done", "ключът изчезна"]],
      build: (i) => algos.xor({ ...i, mode: "reuse" }),
      draw: drawRows,
    });
    S.viz(root.querySelector("#v-flip"), {
      id: "flip", title: "Изменение без ключа: C′ = C ⊕ Δ ⇒ M′ = M ⊕ Δ", sub: "Δ е маската на нападателя.",
      code: "ch07_otp",
      inputs: [{ id: "m1", label: "M", value: "01000001", width: "12em" }, { id: "k", label: "K", value: "11010110", width: "12em" }, { id: "m2", label: "Δ", value: "00010011", width: "12em" }],
      presets: [{ label: "'A' → 'R' (Δ = 'A'⊕'R')", values: { m1: "01000001", k: "11010110", m2: "00010011" } }],
      legend: [["s-act", "нов ред"], ["s-done", "предвидим резултат"]],
      build: (i) => algos.xor({ ...i, mode: "flip" }),
      draw: drawRows,
    });
  }

  S.chapter({ id: "chestoti", order: 7, num: "7", group: "Криптоанализ", title: "Честотен анализ и еднократна лента", lead: "Езикът е неравномерен — моноазбучните шифри го пазят и се разбиват статистически. Еднократната лента не го пази, но само при пет строги условия.", html, mount, algos });
})();
