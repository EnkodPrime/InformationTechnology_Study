/* Раздел 9 — допълнение извън основния обхват: NUMA, хардуерни нишки, ред на байтовете,
   FPGA/ASIC, OpenMP/MPI. */
(function () {
  const S = window.Study, h = S.h;

  const algos = {
    /** Същото като to_bytes() в c/08_perf.c */
    to_bytes({ v, order }) {
      const s = String(v).trim();
      if (!/^(0x)?[0-9a-f]{1,8}$/i.test(s)) throw new Error("Въведи 32-битова стойност в шестнадесетичен запис, напр. 0x12345678.");
      const x = parseInt(s.replace(/^0x/i, ""), 16) >>> 0;
      const big = order === "big", out = [], F = [];
      const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");
      F.push({ at: "loop", out: [], x, big, vars: { v: "0x" + x.toString(16).toUpperCase().padStart(8, "0") }, msg: `Стойност 0x${x.toString(16).toUpperCase().padStart(8, "0")}; ${big ? "big endian: най-значимият байт на най-ниския адрес" : "little endian: най-малко значимият байт на най-ниския адрес"}.` });
      for (let i = 0; i < 4; i++) {
        const sh = big ? 8 * (3 - i) : 8 * i;
        F.push({ at: "shift", out: out.slice(), cur: i, sh, x, big, vars: { i, shift: sh }, msg: `Адрес base+${i}: изместване с ${sh} бита.` });
        out.push((x >>> sh) & 255);
        F.push({ at: "byte", out: out.slice(), cur: i, sh, x, big, vars: { i, [`out[${i}]`]: hx(out[i]) }, msg: `out[${i}] = (v >> ${sh}) & 0xFF = <b>${hx(out[i])}</b>.`, log: `base+${i}: ${hx(out[i])}` });
      }
      F.push({ at: "loop", out: out.slice(), x, big, done: true, vars: {}, msg: `По нарастващи адреси: <b>${out.map(hx).join(" ")}</b>. Числовата стойност е същата — променя се само подредбата в паметта.` });
      return { frames: F, result: out.map(hx).join(" ") };
    },
  };

  const html = `
<div class="prose">
  <p><span class="extra-tag">разширение</span> Този раздел съдържа синия текст от ръководството — допълнителен контекст, който може да се спомене при въпрос, но не е задължителна част от темата.</p>
</div>

<div class="block">
  <h3>NUMA и хардуерни нишки</h3>
  <p class="prose"><dfn data-g="numa">NUMA</dfn> е организация на споделена памет, при която времето за достъп зависи от разположението на паметта спрямо процесора. Общото адресно пространство не прави всяка клетка еднакво близка до всяко ядро. Щракни ядро, после памет.</p>
  <div id="numa"></div>
  <div class="key" id="numa-d"></div>
  <p class="prose">Едновременното многонишково изпълнение (<dfn data-g="хардуерна нишка">хардуерни нишки</dfn>) използва ресурси на едно ядро за повече хардуерни нишки. Тези нишки не са равнозначни на отделни пълноценни ядра — споделят изпълнителните устройства и кешовете на ядрото.</p>
  <p class="prose">При GPU често е решаващо съвместното групиране на достъпи и избягването на силно разклоняване в една група нишки. Това са въпроси за организацията на конкретния товар, а не универсална победа на даден вид процесор.</p>
</div>

<div class="block">
  <h3>Редът на байтовете не е значимостта на битовете</h3>
  <p class="prose">Big endian поставя най-значимия байт на най-ниския адрес, а little endian — най-малко значимия. За 0x12345678 двата реда по нарастващи адреси са 12 34 56 78 и 78 56 34 12. <dfn data-g="msb">MSB</dfn> означава Most Significant Bit или в някои контексти Most Significant Byte; <dfn data-g="lsb">LSB</dfn> е съответното Least Significant — затова съкращението само по себе си не назовава еднозначно <dfn data-g="endian">endian</dfn> реда.</p>
  <div id="v-endian"></div>
  <details class="hint"><summary>Хинт: защо C кодът използва изместване, а не указател</summary><div>
    <p>Изместването <code>v &gt;&gt; shift</code> работи върху <i>стойността</i> и дава един и същ резултат на всяка машина. Затова <code>to_bytes()</code> е преносима. Функцията <code>host_is_little()</code> обратно гледа <i>паметта</i> чрез <code>memcpy</code> — нейният резултат зависи от машината (x86-64 и типичните Arm конфигурации са little endian).</p>
  </div></details>
  <details class="trap"><summary>Капан: мрежов ред и ред на битовете</summary><div>
    <p>Мрежовите формати задават собствен договор за полетата; редът на битовете при физическо предаване е отделен въпрос от реда на байтовете в паметта. Тема 11 разглежда протоколите за пренос.</p>
  </div></details>
</div>

<div class="block">
  <h3>Специализиран хардуер и програмни модели</h3>
  <div class="split">
    <div class="card"><h4><dfn data-g="fpga">FPGA</dfn> · <dfn data-g="asic">ASIC</dfn></h4><p>FPGA позволява конфигуриране на цифрова логика; ASIC е интегрална схема за определено приложение. Могат да реализират специализирани конвейери, без да изпълняват обща програма като CPU. „Хардуерен ускорител“ описва ролята, а не една задължителна вътрешна архитектура.</p></div>
    <div class="card"><h4>OpenMP · MPI</h4><p>OpenMP е модел и набор от интерфейси за паралелно програмиране със споделена памет; MPI (Message Passing Interface) е стандарт за обмен на съобщения. Те не са процесорни архитектури.</p></div>
  </div>
  <p class="prose">Основната архитектурна задача е да се съгласуват изчислителните ресурси, паметта и входът и изходът.</p>
</div>`;

  let mk = 0;
  function mount(root) {
    // NUMA
    {
      const W = 600, H = 210, box = root.querySelector("#numa"), det = root.querySelector("#numa-d");
      let core = 0, mem = 0;
      const draw = () => {
        const id = "nu" + (mk++), svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        const d = S.svg("defs"); d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))); svg.append(d);
        [0, 1].forEach((n) => {
          const x0 = 20 + n * 300;
          svg.append(S.svg("rect", { x: x0, y: 10, width: 260, height: 190, rx: 8, fill: "none", stroke: "var(--line)", "stroke-dasharray": "5 4" }));
          svg.append(S.svg("text", { x: x0 + 130, y: 28, "text-anchor": "middle", class: "wt", text: "възел " + n }));
          [0, 1].forEach((c) => {
            const k = n * 2 + c;
            const g = S.svg("g", { class: "node " + (core === k ? "s-act" : ""), style: "cursor:pointer", tabindex: 0, role: "button", onclick: () => { core = k; draw(); }, onkeydown: (e) => { if (e.key === "Enter") { core = k; draw(); } } });
            g.append(S.svg("rect", { x: x0 + 20 + c * 120, y: 40, width: 100, height: 40, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
            g.append(S.svg("text", { x: x0 + 70 + c * 120, y: 65, "text-anchor": "middle", text: "ядро " + k }));
            svg.append(g);
          });
          const g = S.svg("g", { class: "node " + (mem === n ? "s-piv" : ""), style: "cursor:pointer", tabindex: 0, role: "button", onclick: () => { mem = n; draw(); }, onkeydown: (e) => { if (e.key === "Enter") { mem = n; draw(); } } });
          g.append(S.svg("rect", { x: x0 + 20, y: 140, width: 220, height: 44, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
          g.append(S.svg("text", { x: x0 + 130, y: 167, "text-anchor": "middle", text: "локална памет " + n }));
          svg.append(g);
        });
        const cn = core >> 1, cx = 20 + cn * 300 + 70 + (core & 1) * 120;
        const local = cn === mem;
        const pts = local ? `${cx},80 ${cx},138` : `${cx},80 ${cx},110 ${mem ? 450 : 150},110 ${mem ? 450 : 150},138`;
        const pl = S.svg("polyline", { points: pts, class: "edge " + (local ? "s-done" : "s-swap"), "marker-end": `url(#${id})` }); pl.style.color = "var(--c)"; svg.append(pl);
        svg.append(S.svg("text", { x: 300, y: 125, "text-anchor": "middle", "font-size": 11, class: "wt", text: "връзка между възлите" }));
        box.innerHTML = ""; box.append(svg);
        det.innerHTML = `<p>Ядро ${core} (възел ${cn}) чете от памет ${mem}: <b>${local ? "локален достъп" : "отдалечен достъп"}</b> — ${local ? "по-кратък път" : "през връзката между възлите, по-висока латентност"}. Адресното пространство е общо и в двата случая.</p><p class="muted">Схемата е илюстративна; броят възли и видът на връзката зависят от системата.</p>`;
      };
      draw();
    }

    S.viz(root.querySelector("#v-endian"), {
      id: "endian", title: "Една стойност и два байтови реда", sub: "Байтовете в шестнадесетичен запис по нарастващи адреси",
      code: "ch08_endian",
      inputs: [{ id: "v", label: "Стойност (hex)", value: "0x12345678", width: "9em" }, { id: "order", label: "Ред", type: "select", value: "little", options: [["little", "little endian"], ["big", "big endian"]] }],
      presets: [{ label: "0xDEADBEEF", values: { v: "0xDEADBEEF" } }, { label: "1", values: { v: "0x1" } }],
      legend: [["s-act", "текущ адрес"], ["s-done", "записан байт"]],
      build: algos.to_bytes,
      draw(st, f) {
        st.innerHTML = "";
        const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");
        const vb = [24, 16, 8, 0].map((s) => hx((f.x >>> s) & 255));
        st.append(h("span", { class: "eyebrow", text: "Стойност (от старши към младши байт)" }));
        S.drawArray(st, vb, { append: true, index: false, cls: f.sh != null ? { [3 - f.sh / 8]: "s-cmp" } : {} });
        st.append(h("span", { class: "eyebrow", text: "Памет: base+0 … base+3" }));
        const arr = [0, 1, 2, 3].map((i) => (i < f.out.length ? hx(f.out[i]) : ""));
        S.drawArray(st, arr, { append: true, label: (k) => "+" + k, cls: Object.fromEntries(arr.map((_, i) => [i, i === f.cur ? "s-act" : i < f.out.length ? "s-done" : ""])) });
      },
    });
  }

  S.chapter({ id: "dopalnenie", order: 9, num: "9", group: "Разширение", title: "Допълнение извън основния обхват",
    lead: "NUMA, хардуерни нишки, ред на байтовете, FPGA/ASIC и програмни модели — синият текст от ръководството.", html, mount, algos });
})();
