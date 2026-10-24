/* Раздел 3 — Разбъркване и заместване: какво се изменя и какво се запазва. */
(function () {
  const S = window.Study, h = S.h;

  /* преобразувания за сравнението (същите правила като в разделите 4–6) */
  function transform(al, x, kind) {
    const m = al.m;
    if (kind === "caesar") return x.map((v) => T10.mod(v + 3, m));
    if (kind === "trans") { // колонна, ширина = ⌈n/2⌉, естествен ред на колоните (ATTACK → AATCTK)
      const w = Math.max(1, Math.ceil(x.length / 2)), out = [];
      for (let c = 0; c < w; c++) for (let i = c; i < x.length; i += w) out.push(x[i]);
      return out;
    }
    if (kind === "vig") { const k = al.name === "bg" ? [10, 11, 28, 23] : [11, 4, 12, 14, 13]; return x.map((v, i) => T10.mod(v + k[i % k.length], m)); }
    if (kind === "product") { // Цезар 3, после транспозицията
      return transform(al, transform(al, x, "caesar"), "trans");
    }
    return x.slice();
  }
  const KINDS = { caesar: "Цезар, k = 3 (заместване)", trans: "колонна транспозиция 2 реда", vig: "Виженер LEMON / КЛЮЧ", product: "Цезар 3, после транспозиция" };

  function pattern(x, m) {
    const first = new Array(m).fill(-1); let next = 0;
    return x.map((v) => { if (first[v] < 0) first[v] = next++; return first[v]; });
  }

  const algos = {
    /** стъпково: шаблон на повторенията на x и y, после сравнение — като same_pattern() */
    pattern({ alpha, text, kind }) {
      const al = T10.get(alpha);
      const x = T10.encode(al, text, { maxLen: 24, minLen: 1 });
      const y = transform(al, x, kind), n = x.length, F = [];
      const run = (z, tag, label) => {
        const first = new Array(al.m).fill(-1), p = [];
        let next = 0;
        F.push({ at: [tag, "init"], z, p: [], label, x, y, vars: { next: 0 }, msg: `Шаблон на ${label}: first[] = −1 за всички букви.` });
        for (let i = 0; i < n; i++) {
          const nw = first[z[i]] < 0;
          if (nw) first[z[i]] = next++;
          p.push(first[z[i]]);
          F.push({ at: [nw ? "new" : "set", tag], z, p: p.slice(), i, nw, label, x, y, vars: { i, буква: al.L[z[i]], "p[i]": p[i], next }, msg: nw ? `„${al.L[z[i]]}“ се среща за първи път → получава номер <b>${p[i]}</b>.` : `„${al.L[z[i]]}“ вече има номер ${p[i]} — повторение на позиция ${z.indexOf(z[i])}.` });
        }
        return p;
      };
      const px = run(x, "px", "открития текст"), py = run(y, "py", "шифротекста");
      let same = 1, di = -1;
      for (let i = 0; i < n; i++) if (px[i] !== py[i]) { same = 0; di = i; break; }
      F.push({ at: same ? "same" : "diff", x, y, px, py, di, done: true, vars: { same }, msg: same ? `Шаблоните съвпадат: <b>${px.join(" ")}</b>. Повторенията са на същите места — моноазбучната замяна само „преименува“ буквите.` : `Шаблоните се различават на позиция ${di}: ${px[di]} ≠ ${py[di]}. ${kind === "trans" || kind === "product" ? "Транспозицията мести буквите — повторенията сменят местата си." : "Полиазбучната замяна дава различни шифросимволи за една и съща буква."}` });
      return { frames: F, same, px, py };
    },
    /** стъпково: хистограми и сравнение — като same_counts() */
    counts({ alpha, text, kind }) {
      const al = T10.get(alpha);
      const x = T10.encode(al, text, { maxLen: 40, minLen: 1 });
      const y = transform(al, x, kind), n = x.length, F = [];
      const cx = new Array(al.m).fill(0), cy = new Array(al.m).fill(0);
      F.push({ at: ["cx", "zero"], x, y, cx: cx.slice(), cy: cy.slice(), msg: `Броим буквите на открития текст.` });
      for (let i = 0; i < n; i++) { cx[x[i]]++; F.push({ at: ["count", "cx"], x, y, i, side: 0, cx: cx.slice(), cy: cy.slice(), vars: { i, буква: al.L[x[i]] }, msg: `cnt[${al.L[x[i]]}] = ${cx[x[i]]}.` }); }
      F.push({ at: ["cy", "zero"], x, y, cx: cx.slice(), cy: cy.slice(), msg: `Броим буквите на шифротекста.` });
      for (let i = 0; i < n; i++) { cy[y[i]]++; F.push({ at: ["count", "cy"], x, y, i, side: 1, cx: cx.slice(), cy: cy.slice(), vars: { i, буква: al.L[y[i]] }, msg: `cnt[${al.L[y[i]]}] = ${cy[y[i]]}.` }); }
      let same = 1, dj = -1;
      for (let j = 0; j < al.m; j++) if (cx[j] !== cy[j]) { same = 0; dj = j; break; }
      const sx = cx.slice().sort((a, b) => b - a).join(","), sy = cy.slice().sort((a, b) => b - a).join(",");
      F.push({ at: same ? "same" : "diff", x, y, cx, cy, dj, done: true, vars: { same, "форма еднаква": sx === sy }, msg: same ? `Броят на <b>всяка конкретна буква</b> е същият — транспозицията пази мултимножеството от символи.` : `cnt[${al.L[dj]}]: ${cx[dj]} ≠ ${cy[dj]} — буквите са други. ${sx === sy ? "Но <b>формата</b> на хистограмата (подредените честоти) е същата: моноазбучната замяна пази формата, сменя етикетите." : "И формата на честотите е друга — полиазбучната замяна я изглажда."}` });
      return { frames: F, same, shape: sx === sy ? 1 : 0 };
    },
  };

  const html = `
<div class="prose">
  <p>При шифрите с разбъркване, или <dfn data-g="транспозиция">транспозиция</dfn>, символите запазват стойностите си, но променят позициите. При <dfn data-g="заместване">заместване</dfn> символи или блокове се заменят с други според правило; при едносимволно заместване редът на позициите се запазва, а стойностите се преобразуват.</p>
  <p><dfn data-g="моноазбучен шифър">Моноазбучната замяна</dfn> заменя всяка буква последователно с друга според една фиксирана азбука. <dfn data-g="полиазбучен шифър">Полиазбучната замяна</dfn> използва различни съответствия на различни позиции или състояния — така еднакви букви от открития текст могат да дадат различни букви в шифротекста.</p>
</div>

<div class="block">
  <h3>Схема 2. Заместването сменя символите, а транспозицията сменя местата</h3>
  <p class="muted">Плъзни, за да видиш как всяка буква на ATTACK се движи (транспозиция) или се сменя (Цезар с ключ 3).</p>
  <div class="row"><label class="field"><span>Метод</span><select id="s2-kind"><option value="caesar">Цезар k = 3 → DWWDFN</option><option value="trans">транспозиция 2 × 3 → AATCTK</option></select></label><label class="field" style="flex:1 1 160px;min-width:0"><span>преход</span><input type="range" id="s2-t" min="0" max="100" value="100" style="width:100%;min-width:0"></label></div>
  <div id="s2" style="overflow-x:auto"></div>
</div>

<div class="split">
  <div class="key"><b>Транспозиция</b><p>пермутира позициите → пази <b>броя на всяка конкретна буква</b>; разрушава част от съседствата.</p></div>
  <div class="key"><b>Моноазбучна замяна</b><p>преименува символите → пази <b>шаблона на повторенията</b> и <b>формата на честотите</b>; при ATTACK двете A остават еднакви.</p></div>
  <div class="key"><b>Полиазбучна замяна</b><p>различни азбуки по позиция → разчупва и двете, но повтарящият се ключ оставя период.</p></div>
</div>

<div class="block">
  <h3>Схема 3. Транспозиция и замяна пазят различни свойства — проверка в код</h3>
  <p class="prose">Двата визуализатора сравняват открития текст с шифротекста по два признака. Смени метода и виж кой признак оцелява.</p>
  <div id="v-pat"></div>
  <div id="v-cnt"></div>
  <details class="hint"><summary>Хинт: защо тези инварианти са „вход“ за криптоанализа</summary><div>
    <p>Каквото преобразуването запазва, нападателят може да измери. Запазените честоти на транспозицията казват „това е открит текст на езика, само разбъркан“ — търсят се разположения и вероятни думи. Запазеният шаблон на моноазбучната замяна позволява честотен анализ и шаблони на думи (<a href="#chestoti">раздел 7</a>).</p>
  </div></details>
</div>

<div class="block">
  <h3>Азбуката е конвенция</h3>
  <p class="prose">За еднозначни учебни примери материалът използва латинската азбука A–Z с кодове 0–25 и аритметика по модул 26; интервалите се премахват. Това е конвенция за примерите, а не ограничение на метода: при друга азбука се променят модулът и съответствията. В тази страница българската азбука е А–Я: 30 букви, m = 30, А = 0 … Я = 29.</p>
  <div id="alpha-t" class="tbl-wrap"></div>
</div>

<div class="block">
  <h3>Продуктови конструкции</h3>
  <p class="prose">Комбинирането на заместване и разместване лежи в основата на <dfn data-g="продуктова конструкция">продуктови конструкции</dfn>. В горните визуализатори избери „Цезар 3, после транспозиция“: шаблонът на повторенията и броят на буквите вече не се запазват, но <b>формата</b> на хистограмата остава — Цезар я пренася, транспозицията не я пипа.</p>
  <details class="trap"><summary>Капан: „съчетах два метода, значи е сигурно“</summary><div>
    <p>Самото съчетаване не доказва сигурност. Класическите методи са учебни модели за структурата на преобразуванията и не са достатъчни съвременни средства за защита.</p>
  </div></details>
  <details class="trap"><summary>Капан: „пермутацията на битове в блоков шифър е колонна транспозиция“</summary><div>
    <p>Съвременната пермутация на битове вътре в <dfn data-g="блоков шифър">блоков шифър</dfn> е свързана идея, но не бива да се отъждествява с произволна колонна транспозиция на букви.</p>
  </div></details>
</div>`;

  function mount(root) {
    /* схема 2 — анимирано движение */
    const box = root.querySelector("#s2"), kind = root.querySelector("#s2-kind"), tr = root.querySelector("#s2-t");
    const al = T10.get("lat"), x = T10.encode(al, "ATTACK");
    function draw2() {
      const k = kind.value, t = +tr.value / 100, sv = S.svg;
      box.innerHTML = "";
      const W = 520, H = 170, g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const X = (i) => 40 + i * 76;
      // транспозиция: ATT/ACK → колони A A | T C | T K → позиции
      const perm = [0, 2, 4, 1, 3, 5]; // източник i отива на позиция perm[i]
      x.forEach((v, i) => {
        g.append(sv("text", { x: X(i) + 20, y: 26, "text-anchor": "middle", text: al.L[v], style: "font-weight:700" }));
        g.append(sv("text", { x: X(i) + 20, y: 12, "text-anchor": "middle", class: "wt", text: String(i) }));
        const j = k === "trans" ? perm[i] : i;
        const y = 50 + t * 70, xx = X(i) + (X(j) - X(i)) * t;
        const letter = k === "caesar" ? (t < 0.5 ? al.L[v] : al.L[T10.mod(v + 3, 26)]) : al.L[v];
        g.append(sv("line", { x1: X(i) + 20, y1: 34, x2: xx + 20, y2: y, class: "edge" + (k === "trans" ? " s-act" : " s-cmp") }));
        const node = sv("g", { class: "node " + (v === 0 ? "s-piv" : t === 1 ? "s-done" : "s-act") });
        node.append(sv("rect", { x: xx, y, width: 40, height: 40, rx: 5, style: "fill:var(--cb);stroke:var(--c);stroke-width:2" }));
        node.append(sv("text", { x: xx + 20, y: y + 26, "text-anchor": "middle", text: letter, style: "font-weight:700" }));
        g.append(node);
      });
      box.append(g);
      box.append(h("p", { class: "muted", html: k === "trans" ? "Записваме ATT / ACK по редове, четем по колони → <b>AATCTK</b>. Същите букви (две A, две T), други места. Лилавото е буквата A — проследи я." : "Всяка буква остава на мястото си и се сменя: A→D, T→W, C→F, K→N → <b>DWWDFN</b>. Двете A (лилаво) стават две D — повторението оцелява." }));
    }
    kind.onchange = draw2; tr.oninput = draw2; draw2();

    const inputs = [T10.alphaField(), { id: "text", label: "Открит текст", value: "ATTACK", width: "14em" }, { id: "kind", label: "Преобразуване", type: "select", value: "caesar", options: Object.entries(KINDS) }];
    const presets = [{ label: "ATTACK / транспозиция", values: { alpha: "lat", text: "ATTACK", kind: "trans" } }, { label: "ATTACK / Виженер", values: { alpha: "lat", text: "ATTACK", kind: "vig" } }, { label: "бълг. КАРТАТА", values: { alpha: "bg", text: "КАРТАТА", kind: "caesar" } }];
    const strip2 = (st, f, al2) => {
      const n = f.x.length, cx = {}, cy = {};
      if (f.i != null) { if (f.side === 1 || (f.at && [].concat(f.at).includes("py"))) cy[f.i] = "s-act"; else cx[f.i] = "s-act"; }
      T10.strip(st, f.x.map((v) => al2.L[v]), { title: "открит текст", cls: cx, small: n > 14 });
      T10.strip(st, f.y.map((v) => al2.L[v]), { append: true, title: "шифротекст", cls: cy, small: n > 14 });
    };
    S.viz(root.querySelector("#v-pat"), {
      id: "pat", title: "Шаблон на повторенията", sub: "Всяка буква получава номера на първата си поява. ATTACK → 0 1 1 0 2 3.",
      code: "ch03_pattern", inputs, presets,
      legend: [["s-act", "текуща буква"], ["s-piv", "нов номер"], ["s-done", "същият шаблон"], ["s-swap", "различие"]],
      build: algos.pattern,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al2 = T10.get(I.alpha);
        strip2(st, f, al2);
        const show = (p, title, ref) => {
          const cls = {};
          p.forEach((v, k) => { if (f.done) cls[k] = ref && ref[k] !== v ? "s-swap" : "s-done"; });
          if (f.i != null && !f.done) cls[f.i] = f.nw ? "s-piv" : "s-act";
          T10.strip(st, p, { append: true, title, cls, small: f.x.length > 14 });
        };
        if (f.done) { show(f.px, "шаблон на открития текст"); show(f.py, "шаблон на шифротекста", f.px); }
        else show(f.p, "шаблон на " + f.label);
      },
    });
    S.viz(root.querySelector("#v-cnt"), {
      id: "cnt", title: "Брой на всяка буква", sub: "Хистограмите на открития текст и на шифротекста.",
      code: "ch03_counts", inputs, presets,
      legend: [["s-act", "току-що преброена"], ["s-swap", "първа разлика"]],
      build: algos.counts,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al2 = T10.get(I.alpha);
        strip2(st, f, al2);
        const wrap = h("div", { class: "split" }), a = h("div", { style: { overflowX: "auto" } }), b = h("div", { style: { overflowX: "auto" } });
        wrap.append(a, b); st.append(wrap);
        const ca = {}, cb = {};
        if (f.i != null) (f.side ? cb : ca)[(f.side ? f.y : f.x)[f.i]] = "s-act";
        if (f.dj != null && f.dj >= 0) { ca[f.dj] = "s-swap"; cb[f.dj] = "s-swap"; }
        T10.hist(a, f.cx, al2, { cls: ca, title: "открит текст", height: 100 });
        T10.hist(b, f.cy, al2, { cls: cb, title: "шифротекст", height: 100 });
      },
    });

    // таблица на азбуките
    const at = root.querySelector("#alpha-t");
    ["lat", "bg"].forEach((nm) => {
      const a2 = T10.get(nm);
      const t = h("table", { class: "t grid", style: { marginBottom: "8px" } }, h("tr", null, h("th", { text: nm === "bg" ? "БГ" : "LAT" }), ...a2.L.map((c) => h("th", { text: c }))), h("tr", null, h("td", { text: "код" }), ...a2.L.map((_, k) => h("td", { text: k }))));
      at.append(t);
    });
  }

  S.chapter({ id: "razbarkvane", order: 3, num: "3", group: "Класически методи", title: "Разбъркване и заместване", lead: "Какво изменя и какво запазва всяко класическо преобразуване — и защо точно запазеното е входът за криптоанализа.", html, mount, algos });
})();
