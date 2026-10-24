/* Раздел 8 — производителност и ограничения на паралелизма: T = IC·CPI/f, закон на Амдал. */
(function () {
  const S = window.Study, h = S.h;

  const num = (v, lo, hi, name) => { const x = Number(v); if (!Number.isFinite(x)) throw new Error(`${name} трябва да е число.`); if (x < lo || x > hi) throw new Error(`${name} трябва да е между ${lo} и ${hi}.`); return x; };

  const algos = {
    cpu_time(ic, cpi, f) { return ic * cpi * (1 / f); },
    amdahl(f, p, c = 0) { return 1 / ((1 - f) + f / p + c * (p - 1)); },

    /** Стъпково пресмятане на T за две програми/реализации — същото като cpu_time() */
    cpu_steps({ ic1, cpi1, f1, ic2, cpi2, f2 }) {
      const A = { ic: num(ic1, 1, 1e13, "IC₁"), cpi: num(cpi1, 0.1, 100, "CPI₁"), f: num(f1, 0.001, 10, "f₁ (GHz)") * 1e9 };
      const B = { ic: num(ic2, 1, 1e13, "IC₂"), cpi: num(cpi2, 0.1, 100, "CPI₂"), f: num(f2, 0.001, 10, "f₂ (GHz)") * 1e9 };
      const F = [], res = [];
      [A, B].forEach((X, k) => {
        const nm = k ? "B" : "A";
        const cyc = X.ic * X.cpi;
        F.push({ at: "cycles", res: res.slice(), vars: { [`IC_${nm}`]: X.ic.toExponential(2), [`CPI_${nm}`]: X.cpi, такта: cyc.toExponential(3) }, msg: `${nm}: тактове = IC × CPI = ${X.ic.toExponential(2)} × ${X.cpi} = <b>${cyc.toExponential(3)}</b>.` });
        const per = 1 / X.f;
        F.push({ at: "period", res: res.slice(), vars: { [`f_${nm}`]: X.f / 1e9 + " GHz", период: (per * 1e9).toFixed(4) + " ns" }, msg: `${nm}: период = 1 / f = 1 / ${X.f / 1e9} GHz = <b>${(per * 1e9).toFixed(4)} ns</b>.` });
        const T = algos.cpu_time(X.ic, X.cpi, X.f);
        res.push({ nm, T, ...X });
        F.push({ at: "time", res: res.slice(), vars: { [`T_${nm}`]: T.toFixed(4) + " s" }, msg: `${nm}: T = ${cyc.toExponential(3)} × ${(per * 1e9).toFixed(4)} ns = <b>${T.toFixed(4)} s</b>.`, log: `T_${nm} = ${T.toFixed(4)} s` });
      });
      const r = res[0].T / res[1].T;
      F.push({ at: "time", res, done: true, vars: { "T_A / T_B": r.toFixed(3) }, msg: r > 1 ? `B е <b>${r.toFixed(2)}×</b> по-бърза.` : r < 1 ? `A е <b>${(1 / r).toFixed(2)}×</b> по-бърза.` : "Двете са еднакво бързи." });
      return { frames: F, TA: res[0].T, TB: res[1].T };
    },

    amdahl_steps({ f, p, c }) {
      f = num(f, 0, 1, "f"); p = S.int(p, 1, 4096, "p"); c = num(c, 0, 0.1, "c");
      const F = [];
      const serial = 1 - f, par = f / p, over = c * (p - 1), S_ = 1 / (serial + par + over);
      F.push({ at: "serial", f, p, c, parts: [serial, 0, 0], vars: { f, p }, msg: `Последователната част остава същата: 1 − f = <b>${serial.toFixed(4)}</b> от T₁.` });
      F.push({ at: "par", f, p, c, parts: [serial, par, 0], vars: { "f/p": par.toFixed(4) }, msg: `Паралелната част се дели на ${p}: ${f} / ${p} = <b>${par.toFixed(4)}</b>.` });
      F.push({ at: "over", f, p, c, parts: [serial, par, over], vars: { "c(p−1)": over.toFixed(4) }, msg: c ? `Учебен разход за синхронизация: ${c} × (${p} − 1) = <b>${over.toFixed(4)}</b> — не е част от закона на Амдал.` : "c = 0 — чист закон на Амдал, без разходи за комуникация." });
      F.push({ at: "speed", f, p, c, parts: [serial, par, over], done: true, vars: { S: S_.toFixed(4) }, msg: `S(${p}) = 1 / (${serial.toFixed(4)} + ${par.toFixed(4)}${c ? " + " + over.toFixed(4) : ""}) = <b>${S_.toFixed(4)}</b>. Граница при p → ∞${c ? " без разходи" : ""}: 1 / (1 − f) = ${f < 1 ? (1 / serial).toFixed(2) : "∞"}.` });
      return { frames: F, result: S_ };
    },
  };

  const html = `
<div class="prose">
  <p>Основна оценка за процесорно време е <span class="formula">T = брой инструкции × среден <dfn data-g="cpi">CPI</dfn> × период на такта</span>. Честотата сама по себе си не е достатъчна за сравнение: различни ISA, оптимизации и пропуски в паметта променят останалите множители. <dfn data-g="ускорение">Ускорението</dfn> се определя като S = T<sub>последователно</sub> / T<sub>паралелно</sub> при една и съща работа.</p>
</div>

<div class="block">
  <h3>Изчисляване вместо сравнение само по гигахерци</h3>
  <p class="prose">При 10⁹ инструкции, среден CPI = 2 и 2 GHz времето е 1 секунда. Ако оптимизация намали инструкциите наполовина, но вдигне CPI на 5, времето става 1,25 секунди — по-късият машинен код може да е по-бавен.</p>
  <div id="v-cpu"></div>
  <details class="trap"><summary>Капан: по-малко инструкции или повече GHz = по-бързо?</summary><div>
    <p>Нито едното не е достатъчно. Трите множителя действат заедно. Сметката предполага правилно измерен среден CPI за конкретния товар и включените изчаквания (пропуски в кеша, конфликти в конвейера — те вдигат CPI).</p>
  </div></details>
</div>

<div class="block">
  <h3>Закон на Амдал</h3>
  <p class="prose"><dfn data-g="закон на амдал">Законът на Амдал</dfn>: S(p) = 1 / ((1−f) + f/p), където f е паралелизируемата част от времето, а p е броят еднакви изпълнители. При f = 0,9 и p = 4 ускорението е ≈ 3,08; при неограничен брой изпълнители границата е 10. При 20% непаралелна част и 4 изпълнителя: 1/(0,2 + 0,8/4) = 2,5.</p>
  <div id="v-amdahl"></div>
  <div id="amdahl-chart"></div>
  <div class="key"><span class="formula">S(p) = 1 / ((1 − f) + f / p) &nbsp;·&nbsp; S(∞) = 1 / (1 − f)</span><br>Допълнителните ядра не премахват последователната част.</div>
  <details class="hint"><summary>Хинт: защо четири ядра не дават четирикратно ускорение</summary><div>
    <p>Защото последователната част (1 − f) не се дели. Освен това синхронизацията, небалансираното разпределение и ограниченията на паметта намаляват практическото ускорение. Паралелизирането може дори да увеличи времето за малки задачи — задай c &gt; 0 и голямо p, за да видиш как S намалява.</p>
    <p>Законът е модел с фиксиран размер на задачата и без допълнителни разходи за комуникация. Промяната на размера на задачата променя постановката и не опровергава формулата.</p>
  </div></details>
  <details class="trap"><summary>Капан: какво измерваме?</summary><div>
    <p>Когато оценяваме архитектура, трябва да посочим натоварването и дали измерваме латентност, пропускателна способност, енергия или цена. Теоретична максимална производителност ≠ измерена върху конкретна програма; бенчмаркът е полезен само с определени входни данни, конфигурация и методика.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> T = IC × CPI × период (= IC × CPI / f). S = T₁ / T<sub>p</sub>. Амдал: S(p) = 1/((1−f)+f/p), граница 1/(1−f). f = 0,9, p = 4 → 3,08; p → ∞ → 10.</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-cpu"), {
      id: "cput", title: "T = IC × CPI / f за две версии", sub: "f в GHz",
      code: "ch08_cpu_time",
      inputs: [{ id: "ic1", label: "IC_A", value: "1e9", width: "6em" }, { id: "cpi1", label: "CPI_A", value: 2, width: "4.5em" }, { id: "f1", label: "f_A", value: 2, width: "4.5em" },
        { id: "ic2", label: "IC_B", value: "5e8", width: "6em" }, { id: "cpi2", label: "CPI_B", value: 5, width: "4.5em" }, { id: "f2", label: "f_B", value: 2, width: "4.5em" }],
      presets: [{ label: "Ръководството (1 s срещу 1,25 s)", values: { ic1: "1e9", cpi1: 2, f1: 2, ic2: "5e8", cpi2: 5, f2: 2 } }, { label: "По-висока честота, по-висок CPI", values: { ic1: "2e9", cpi1: 1.2, f1: 3, ic2: "2e9", cpi2: 2, f2: 4 } }],
      build: algos.cpu_steps,
      draw(st, f) {
        st.innerHTML = "";
        if (!f.res.length) { st.append(h("p", { class: "muted", text: "Смятаме A, после B." })); return; }
        const mx = Math.max(...f.res.map((r) => r.T));
        f.res.forEach((r) => {
          st.append(h("div", { class: "row", style: { marginBottom: "6px" } }, h("b", { class: "mono", style: { width: "2em" }, text: r.nm }),
            h("div", { style: { height: "22px", width: `${Math.max(4, (r.T / mx) * 70)}%`, background: "var(--st-act-bg)", border: "1.5px solid var(--st-act)", borderRadius: "3px" } }),
            h("span", { class: "mono", text: r.T.toFixed(4) + " s" })));
        });
      },
    });

    let chartP = 4, chartF = 0.9;
    S.viz(root.querySelector("#v-amdahl"), {
      id: "amd", title: "Ускорение по Амдал — разлагане на времето", sub: "Лентата е T_p като дял от T₁",
      code: "ch08_amdahl",
      inputs: [{ id: "f", label: "f (0..1)", type: "number", value: 0.9, step: 0.05, width: "5em" }, { id: "p", label: "p", type: "number", value: 4, width: "5em" }, { id: "c", label: "c (разход)", type: "number", value: 0, step: 0.005, width: "5em" }],
      presets: [{ label: "f = 0,9, p = 4", values: { f: 0.9, p: 4, c: 0 } }, { label: "f = 0,8, p = 4 (2,5)", values: { f: 0.8, p: 4, c: 0 } }, { label: "p = 1024", values: { f: 0.9, p: 1024, c: 0 } }, { label: "с разход c = 0,01", values: { f: 0.9, p: 16, c: 0.01 } }],
      legend: [["s-swap", "последователна част"], ["s-act", "паралелна част / p"], ["s-cmp", "разход (учебно допускане)"]],
      build: (inp) => { const r = algos.amdahl_steps(inp); chartP = +inp.p; chartF = +inp.f; drawChart(+inp.c); return r; },
      draw(st, f) {
        st.innerHTML = "";
        const total = f.parts.reduce((a, b) => a + b, 0);
        const bar = h("div", { style: { display: "flex", height: "34px", width: "100%", maxWidth: "640px", border: "1px solid var(--line)", borderRadius: "4px", overflow: "hidden" } });
        [["s-swap", f.parts[0]], ["s-act", f.parts[1]], ["s-cmp", f.parts[2]]].forEach(([c, v]) => { if (v > 0) bar.append(h("div", { class: c, title: v.toFixed(4), style: { width: `${(v / Math.max(1, total)) * 100}%`, background: "var(--cb)", borderRight: "2px solid var(--c)" } })); });
        st.append(h("span", { class: "eyebrow", text: "T₁ = 1" }), h("div", { style: { width: "100%", maxWidth: "640px", height: "10px", background: "var(--panel-2)", border: "1px solid var(--line)", marginBottom: "8px" } }));
        st.append(h("span", { class: "eyebrow", text: `T_p = ${total.toFixed(4)}` }), bar);
      },
    });

    function drawChart(c) {
      const box = root.querySelector("#amdahl-chart");
      if (!box) return;
      box.innerHTML = "";
      const W = 620, H = 240, L = 46, B = 30, ps = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
      const fs = [0.5, 0.75, 0.9, 0.95, 0.99];
      const maxS = 100, x = (p) => L + (Math.log2(p) / 10) * (W - L - 20), y = (s) => H - B - (Math.log10(s) / Math.log10(maxS)) * (H - B - 14);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      [1, 2, 5, 10, 20, 50, 100].forEach((s) => { svg.append(S.svg("line", { x1: L, x2: W - 20, y1: y(s), y2: y(s), stroke: "var(--line-2)" })); svg.append(S.svg("text", { x: L - 6, y: y(s) + 4, "text-anchor": "end", class: "wt", text: s })); });
      ps.forEach((p) => svg.append(S.svg("text", { x: x(p), y: H - 10, "text-anchor": "middle", class: "wt", text: p })));
      svg.append(S.svg("text", { x: W - 20, y: H - B - 4, "text-anchor": "end", class: "wt", text: "p (лог.)" }));
      svg.append(S.svg("polyline", { points: ps.map((p) => `${x(p)},${y(p > maxS ? maxS : p)}`).join(" "), fill: "none", stroke: "var(--st-dim)", "stroke-dasharray": "4 4" }));
      fs.forEach((f, k) => {
        const on = Math.abs(f - chartF) < 1e-9;
        const col = on ? "var(--st-act)" : "var(--ink-2)";
        svg.append(S.svg("polyline", { points: ps.map((p) => `${x(p)},${y(algos.amdahl(f, p, on ? c : 0))}`).join(" "), fill: "none", stroke: col, "stroke-width": on ? 3 : 1.3, opacity: on ? 1 : 0.55 }));
        svg.append(S.svg("text", { x: W - 18, y: y(algos.amdahl(f, 1024, on ? c : 0)) + (k === 0 ? 12 : -3), "text-anchor": "end", "font-size": 11, fill: col, text: `f=${f}` }));
      });
      if (chartP >= 1 && chartP <= 1024) {
        const sp = algos.amdahl(chartF, chartP, c);
        svg.append(S.svg("circle", { cx: x(chartP), cy: y(Math.max(1, sp)), r: 6, fill: "var(--st-cmp)" }));
      }
      box.append(svg, h("p", { class: "muted", html: "Пунктир — идеално линейно ускорение S = p. Кривите излизат на хоризонтала 1/(1 − f). Оранжевата точка е текущото (f, p)." }));
    }
    drawChart(0);
  }

  S.chapter({ id: "proizvoditelnost", order: 8, num: "8", group: "Производителност", title: "Производителност и граници на паралелизма",
    lead: "T = IC × CPI × период, ускорение и закон на Амдал — защо повече ядра не значи пропорционално по-бързо.", html, mount, algos });
})();
