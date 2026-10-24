/* Раздел 10 — Допълнение извън основния обхват (глава 8): други модели, ACID срещу CAP,
   съхранение по редове и колони, векторно търсене. */
(function () {
  const S = window.Study, h = S.h;

  const MODELS = [
    { k: "rel", t: "Релационен", ex: "PostgreSQL, MySQL, SQL Server, Oracle", same: "Person, Project, WorksOn(person_id, project_id) с външни ключове.", op: "Съединения, декларативни заявки (SQL).", note: "Една таблица сама представя релация; външните ключове са отделен механизъм." },
    { k: "doc", t: "Документен", ex: "MongoDB", same: "Документ Project {name, members:[{name:'Ana'},{name:'Boris'}]} или препратки по идентификатор.", op: "Вграждане или препратки.", note: "„Документна“ не означава „няма схема“. Вграденият адрес в поръчка може да пази адреса към момента на покупката; препратката към текущия адрес има друг смисъл. Препратка в документ не е автоматично външен ключ." },
    { k: "kv", t: "Ключ–стойност", ex: "Redis", same: "user:42:name → \"Ana\"; project:P:members → множество.", op: "SET / GET / DEL по известен ключ.", note: "Ключът е адрес за достъп, не автоматично SQL първичен ключ. Redis има и hash, list, set, sorted set — не е „само текст по ключ“. TTL: изтекъл кеш запис не означава изтрит бизнес запис." },
    { k: "graph", t: "Графов (property graph)", ex: "Neo4j (Cypher)", same: "(Ana:Person)-[:WORKS_ON]->(P:Project)<-[:WORKS_ON]-(Boris:Person)", op: "Обхождане по шаблон от връзки.", note: "Свойството „има отношения“ не е изключително за графовите бази — различни са централните конструкции и операциите. Графовият модел не е непременно по-бърз за всяка заявка. RDF (тройки) е друг графов подход." },
    { k: "mv", t: "MultiValue", ex: "Rocket UniVerse, UniData", same: "Клиент C42 с многозначен атрибут Phones = {0881, 0882} (две стойности на един атрибут).", op: "Нива fields, values, subvalues.", note: "Не е същото като многозначна зависимост (MVD) от нормализацията, нито като документна база." },
    { k: "obj", t: "Обектен", ex: "ObjectDB (JPA, JDO)", same: "Order O17 → Line L1, L2 → един и същ устойчив Product P5.", op: "Устойчиви обекти с идентичност и препратки.", note: "Обектна база ≠ обектно-релационна ≠ ORM. Java класове с ORM върху PostgreSQL използват релационна СУБД." },
    { k: "ts", t: "Времеви редове", ex: "InfluxDB, TimescaleDB (върху PostgreSQL)", same: "sensor=T1, 10:00:00 → 20,0 °C; 10:00:01 → 20,4 °C …", op: "Средна стойност за интервал, последно наблюдение.", note: "Time series не означава „без SQL“: TimescaleDB използва PostgreSQL и hypertables. Времева колона в таблица не прави системата TSDB. Време на събитието ≠ време на получаване." },
    { k: "vec", t: "Векторен", ex: "Qdrant; PostgreSQL + pgvector", same: "point {id, vector, payload}.", op: "Намиране на близки вектори по мярка (евклидова, косинусова).", note: "Близостта не е равенство, истинност или разрешение за достъп. ANN индекси (HNSW, IVFFlat) могат да пропуснат истински съседи. PostgreSQL остава релационна СУБД и с pgvector." },
  ];

  const algos = {
    /** Векторно търсене: точно (всички разстояния) — учебен двумерен пример от ръководството. */
    vectors({ q, pts, k }) {
      const parseV = (s, nm) => { const v = String(s).split(/[\s,;]+/).filter(Boolean).map(Number); if (v.length !== 2 || v.some((x) => !Number.isFinite(x))) throw new Error(`${nm}: две числа, напр. „1 0“.`); return v; };
      const Q = parseV(q, "q");
      const P = String(pts).split("|").map((s) => s.trim()).filter(Boolean).map((s) => {
        const m = /^(\w+)\s*[:=]\s*(.+)$/.exec(s);
        if (!m) throw new Error(`„${s}“: точка във вида „A: 0.9 0.1“.`);
        return { n: m[1], v: parseV(m[2], m[1]) };
      });
      if (!P.length) throw new Error("Нужна е поне една точка.");
      if (P.length > 8) throw new Error("Най-много 8 точки.");
      k = S.int(k, 1, P.length, "k");
      const F = [];
      F.push({ Q, P, d: [], msg: `Заявка q = (${Q.join("; ")}). Точното търсене смята разстоянието до <b>всяка</b> точка.` });
      const d = [];
      P.forEach((p, i) => {
        const dist = Math.hypot(p.v[0] - Q[0], p.v[1] - Q[1]);
        d.push(dist);
        F.push({ Q, P, d: d.slice(), cur: i, msg: `d(q, ${p.n}) = √((${p.v[0]} − ${Q[0]})² + (${p.v[1]} − ${Q[1]})²) ≈ <b>${dist.toFixed(3)}</b>.`, log: `${p.n}: ${dist.toFixed(3)}` });
      });
      const order = d.map((x, i) => i).sort((a, b) => d[a] - d[b]);
      F.push({ Q, P, d, top: order.slice(0, k), done: true, msg: `Най-близки ${k}: ${order.slice(0, k).map((i) => P[i].n).join(", ")}. Числата са учебни, не реални embeddings, и не им се приписва семантично значение.` });
      return { frames: F, top: order.slice(0, k).map((i) => P[i].n).join(","), d: d.map((x) => x.toFixed(3)) };
    },
  };

  const html = `
<div class="prose">
  <p><span class="extra-tag">извън конспекта</span> Ръководството отбелязва тази глава като допълнителен контекст. Опорният план препоръчва: „Допълвам с други модели <b>само при въпрос</b>.“</p>
  <p>По-високите нормални форми разглеждат <dfn data-g="mvd">многозначни зависимости</dfn> и зависимости на съединение. Нерелационните системи използват документни, <dfn data-g="key-value">ключ–стойност</dfn>, графови и други модели. Изборът на модел не отменя нуждата да бъдат определени идентичност, ограничения и правила за изменение.</p>
</div>

<div class="block">
  <h3>Схема 16 · Една предметна област в няколко модела</h3>
  <p class="muted">„Ana и Boris работят по проект P.“ Щракни върху модел.</p>
  <div class="cards" id="mdl"></div>
  <div class="key" id="mdl-d"></div>
  <details class="trap"><summary>Капан: една СУБД — един тип?</summary><div><p>Не. Моделът, поддържаните операции и специализацията могат да се припокриват. PostgreSQL с pgvector е конкретен пример. Етикетът <dfn data-g="nosql">NoSQL</dfn> е широко историческо обозначение, а не един строг модел, и сам по себе си не определя транзакционните гаранции.</p></div></details>
</div>

<div class="block">
  <h3>Схема 21 · Графов модел намира общ проект чрез две връзки</h3>
  <div class="t6-diag" id="g-diag"></div>
  <pre class="t6-sql">MATCH (a:Person {name:'Ana'})-[:WORKS_ON]->(p:Project)&lt;-[:WORKS_ON]-(b:Person)
WHERE b &lt;&gt; a
RETURN b.name</pre>
  <p class="muted">Същото в релационен модел: <code>SELECT b.name FROM WorksOn w1 JOIN WorksOn w2 ON w1.project_id = w2.project_id JOIN Person b ON b.id = w2.person_id JOIN Person a ON a.id = w1.person_id WHERE a.name = 'Ana' AND b.id &lt;&gt; a.id;</code></p>
</div>

<div class="block">
  <h3>Схема 25 · Векторното търсене нарежда кандидати по избрана мярка</h3>
  <p class="prose">Учебен пример от ръководството: q = (1, 0), A = (0,9; 0,1), B = (0,8; 0,2), C = (0; 1). Евклидовите разстояния до q са приблизително A 0,141; B 0,283; C 1,414. Най-близкият е A.</p>
  <div id="v-vec"></div>
  <details class="hint"><summary>ANN, HNSW, IVFFlat, recall</summary><div>
    <p><dfn data-g="ann">ANN</dfn> тук означава Approximate Nearest Neighbor — различно от Artificial Neural Network. Приблизителните индекси (<dfn data-g="hnsw">HNSW</dfn>, <dfn data-g="ivfflat">IVFFlat</dfn> в pgvector) правят компромис между ресурси и намиране на действителните най-близки съседи. <dfn data-g="recall">Recall</dfn> измерва каква част от истинските съседи са намерени. Визуализацията показва <b>точното</b> търсене — референцията, спрямо която се мери recall.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 17 · Съхранение по редове и по колони</h3>
  <div class="row"><button class="btn" id="rc-row" aria-pressed="true">по редове</button><button class="btn" id="rc-col" aria-pressed="false">по колони</button></div>
  <div id="rc"></div>
  <p class="prose muted">Съхранението по колони (напр. ClickHouse) е <b>физическа</b> организация за аналитично четене. Това не е същото като wide-column модела на Apache Cassandra — различна ос.</p>
</div>

<div class="block">
  <h3>Схема 18 · ACID и CAP използват различни значения на „съгласуваност“</h3>
  <div class="split">
    <div class="key"><b>C в ACID</b><p>Запазване на зададените ограничения на данните при коректна транзакция.</p></div>
    <div class="key"><b>C в CAP</b><p>Линейризуемост: операциите изглеждат като единна история, съвместима с реалния времеви ред.</p></div>
  </div>
  <p class="prose"><dfn data-g="cap">CAP</dfn>: при действително мрежово разделяне не може едновременно да се гарантират тази съгласуваност и отговор на всяка заявка към неотказал възел. Това е условно ограничение на разпределен модел, а не общо правило „избери произволни две от три“ за всяка база.</p>
</div>

<div class="block">
  <h3>Изяснени въпроси от главата</h3>
  <div id="ex-faq" style="display:grid;gap:8px"></div>
</div>`;

  const FAQ = [
    ["MultiValue и многозначна зависимост едно и също ли са?", "Не. MultiValue е категория модели и системи, а MVD е зависимост в релационната теория и нормализацията."],
    ["Обектно приложение означава ли обектна база?", "Не. Обектите могат да се преобразуват с ORM към релационни таблици. ObjectDB е пример за обектна СУБД; ORM е отделен механизъм."],
    ["Time series означава ли без SQL?", "Не. TimescaleDB използва PostgreSQL и hypertables; времевата специализация може да се съчетава с релационен модел."],
    ["Векторна близост означава ли еднакъв или верен запис?", "Не. Тя е резултат от избрани представяне и мярка. Приблизителното търсене може да пропусне част от истинските най-близки съседи."],
    ["ANN винаги ли означава невронна мрежа?", "Не. При векторно търсене означава Approximate Nearest Neighbor; Artificial Neural Network е друго разгръщане в машинното обучение."],
    ["Препратката в документ равна ли е на външен ключ?", "Не автоматично. Документът може да пази идентификатор на друг документ, без системата да налага същите ограничения за съществуване и изтриване като релационен външен ключ."],
  ];

  function mount(root) {
    const mc = root.querySelector("#mdl"), md = root.querySelector("#mdl-d");
    const bs = MODELS.map((m, i) => { const b = h("button", { class: "card", "aria-pressed": "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: m.ex }), h("h4", { text: m.t })); mc.append(b); return b; });
    function pick(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); const m = MODELS[i]; md.innerHTML = `<p><b>${m.t}</b> — ${S.esc(m.ex)}</p><p><b>Примерът:</b> <code>${S.esc(m.same)}</code></p><p><b>Типични операции:</b> ${m.op}</p><p class="muted">${m.note}</p>`; }
    pick(0);

    const gd = root.querySelector("#g-diag");
    const svg = S.svg("svg", { viewBox: "0 0 480 150", width: 480, role: "img", "aria-label": "Графов модел" });
    const nodes = { Ana: [60, 40], Boris: [60, 115], P: [380, 78] };
    const edges = [];
    [["Ana", "P"], ["Boris", "P"]].forEach(([a, b]) => { const p = S.svg("path", { class: "ln", d: `M${nodes[a][0] + 50} ${nodes[a][1]} L${nodes[b][0] - 50} ${nodes[b][1]}` }); edges.push(p); svg.append(p); svg.append(S.svg("text", { class: "lbl", x: 200, y: (nodes[a][1] + nodes[b][1]) / 2 - 6, text: "WORKS_ON" })); });
    const gn = {};
    Object.entries(nodes).forEach(([n, [x, y]]) => { const g = S.svg("g", { class: "box", tabindex: 0, role: "button", onclick: () => run(n), onkeydown: (e) => { if (e.key === "Enter") run(n); } }, S.svg("rect", { x: x - 50, y: y - 20, width: 100, height: 40, rx: 20 }), S.svg("text", { x: x - 34, y: y + 5, text: (n === "P" ? "Project " : "Person ") + n })); gn[n] = g; svg.append(g); });
    gd.append(svg, h("p", { class: "muted", text: "Щракни върху човек — шаблонът тръгва от него, минава през общ проект и стига до другия." }));
    function run(n) {
      Object.values(gn).forEach((g) => g.setAttribute("class", "box"));
      edges.forEach((e) => e.setAttribute("class", "ln"));
      if (n === "P") { gn.P.setAttribute("class", "box s-act"); return; }
      const other = n === "Ana" ? "Boris" : "Ana";
      gn[n].setAttribute("class", "box s-act"); gn.P.setAttribute("class", "box s-cmp"); gn[other].setAttribute("class", "box s-done");
      edges.forEach((e) => e.setAttribute("class", "ln s-act"));
    }
    run("Ana");

    S.viz(root.querySelector("#v-vec"), {
      id: "vec", title: "Точно търсене на най-близки вектори", sub: "Евклидово разстояние в две измерения.", code: false,
      inputs: [{ id: "q", label: "q", value: "1 0", width: "6em" }, { id: "pts", label: "точки (име: x y | …)", value: "A: 0.9 0.1 | B: 0.8 0.2 | C: 0 1", width: "24em" }, { id: "k", label: "k", type: "number", value: 1, width: "4em" }],
      presets: [{ label: "Примерът от ръководството", values: { q: "1 0", pts: "A: 0.9 0.1 | B: 0.8 0.2 | C: 0 1", k: 1 } }, { label: "Пет точки, k = 2", values: { q: "0.5 0.5", pts: "A: 0.9 0.1 | B: 0.8 0.2 | C: 0 1 | D: 0.4 0.6 | E: 0.6 0.3", k: 2 } }],
      legend: [["s-act", "текуща"], ["s-done", "в top-k"]],
      build: algos.vectors,
      draw(st, f) {
        st.innerHTML = "";
        const W = 300, Hh = 260, pad = 30;
        const xs = f.P.map((p) => p.v[0]).concat(f.Q[0]), ys = f.P.map((p) => p.v[1]).concat(f.Q[1]);
        const x0 = Math.min(0, ...xs), x1 = Math.max(1, ...xs), y0 = Math.min(0, ...ys), y1 = Math.max(1, ...ys);
        const sx = (v) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * pad), sy = (v) => Hh - pad - ((v - y0) / (y1 - y0 || 1)) * (Hh - 2 * pad);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${Hh}`, width: W });
        svg.append(S.svg("line", { class: "edge", x1: pad, y1: sy(0), x2: W - pad, y2: sy(0) }), S.svg("line", { class: "edge", x1: sx(0), y1: pad, x2: sx(0), y2: Hh - pad }));
        f.P.forEach((p, i) => {
          const cls = f.top && f.top.includes(i) ? "s-done" : f.cur === i ? "s-act" : "";
          if (i < f.d.length) svg.append(S.svg("line", { class: "edge " + cls, x1: sx(f.Q[0]), y1: sy(f.Q[1]), x2: sx(p.v[0]), y2: sy(p.v[1]) }));
          svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: sx(p.v[0]), cy: sy(p.v[1]), r: 8 })));
          svg.append(S.svg("text", { x: sx(p.v[0]) + 11, y: sy(p.v[1]) - 8, text: p.n + (i < f.d.length ? " " + f.d[i].toFixed(3) : "") }));
        });
        svg.append(S.svg("g", { class: "node s-piv" }, S.svg("circle", { cx: sx(f.Q[0]), cy: sy(f.Q[1]), r: 9 })), S.svg("text", { x: sx(f.Q[0]) + 11, y: sy(f.Q[1]) + 18, text: "q" }));
        st.append(svg);
      },
    });

    const rc = root.querySelector("#rc"), br = root.querySelector("#rc-row"), bc = root.querySelector("#rc-col");
    const T = [["1", "Ana", "6"], ["2", "Boris", "4"], ["3", "Vera", "5"]], C = ["id", "name", "grade"];
    function rcRender(byCol) {
      br.setAttribute("aria-pressed", String(!byCol)); bc.setAttribute("aria-pressed", String(byCol));
      rc.innerHTML = "";
      const blocks = byCol ? C.map((c, j) => [c, T.map((r) => r[j])]) : T.map((r, i) => ["ред " + (i + 1), r]);
      const wrap = h("div", { style: { display: "grid", gap: "6px", marginTop: "8px" } });
      blocks.forEach(([lab, vals], b) => wrap.append(h("div", { class: "row", style: { alignItems: "center" } }, h("span", { class: "mono muted", style: { minWidth: "5.5em" }, text: "блок " + (b + 1) }), ...vals.map((v) => h("span", { class: "pill " + (byCol ? "s-act" : "s-done"), text: v })), h("span", { class: "muted", text: lab }))));
      rc.append(wrap, h("p", { class: "muted", style: { marginTop: "6px" }, text: byCol ? "AVG(grade) чете само блок 3. Възстановяването на цял ред изисква и трите блока." : "Цял ред — един блок. AVG(grade) трябва да прочете всички блокове." }));
    }
    br.onclick = () => rcRender(false); bc.onclick = () => rcRender(true); rcRender(false);

    const fq = root.querySelector("#ex-faq");
    FAQ.forEach(([q, a]) => fq.append(h("details", { class: "hint" }, h("summary", { text: q }), h("div", { html: `<p>${a}</p>` }))));
  }

  S.chapter({ id: "dopalnenie", order: 10, num: "10", group: "Разширение (извън конспекта)", title: "Други модели и специализации", lead: "Документни, ключ–стойност, графови, MultiValue, обектни, времеви и векторни бази; ACID срещу CAP; редове срещу колони. Само при въпрос на изпита.", html, mount, algos });
})();
