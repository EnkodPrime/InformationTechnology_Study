/* Раздел 9 — Допълнение за оценки: L/R, разпространение, RTT, произведение капацитет–закъснение,
   ефективна скорост при ограничен прозорец. */
(function () {
  const S = window.Study, h = S.h;

  function num(v, lo, hi, name) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) throw new Error(`${name} трябва да е число.`);
    if (n < lo || n > hi) throw new Error(`${name} трябва да е между ${lo} и ${hi}.`);
    return n;
  }
  const fmtT = (s) => (s >= 1 ? s.toFixed(3) + " s" : s >= 1e-3 ? (s * 1e3).toFixed(3) + " ms" : (s * 1e6).toFixed(3) + " μs");
  const fmtB = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : b >= 1e3 ? (b / 1e3).toFixed(1) + " kB" : Math.round(b) + " B");

  const algos = {
    /* Като estimate() в C. Входове: L байта, R Mbit/s, d km, v ×10^8 m/s, W байта */
    delay({ L, R, d, v, W }) {
      L = num(L, 1, 1e7, "L (байта)"); const Rb = num(R, 0.001, 1e5, "R (Mbit/s)") * 1e6; const dm = num(d, 0, 4e4, "Разстоянието (km)") * 1e3;
      const vm = num(v, 0.1, 3, "Скоростта на сигнала (×10⁸ m/s)") * 1e8; W = num(W, 1, 1e9, "W (байта)");
      const F = [];
      const tx = (L * 8) / Rb, prop = dm / vm, rtt = 2 * prop + tx, bdp = (Rb * rtt) / 8, per = (W * 8) / rtt, eff = Math.min(per, Rb), util = eff / Rb;
      const e = { tx, prop, rtt, bdp, eff, util, L, Rb, dm, vm, W };
      F.push(Object.assign({ step: 0, msg: `Пакет от ${L} байта = ${L * 8} бита; канал ${Rb / 1e6} Mbit/s; разстояние ${dm / 1e3} km.` }, e));
      F.push(Object.assign({ step: 1, at: "tx", msg: `<b>Време за предаване</b> L/R = ${L * 8} / ${Rb.toExponential(2)} = <b>${fmtT(tx)}</b> — колко време отнема да „избутаме“ битовете в канала.`, vars: { tx: fmtT(tx) }, log: `L/R = ${fmtT(tx)}` }, e));
      F.push(Object.assign({ step: 2, at: "prop", msg: `<b>Време за разпространение</b> d/v = ${dm} / ${vm.toExponential(1)} = <b>${fmtT(prop)}</b> — колко пътува един бит. Не зависи от скоростта на канала.`, vars: { prop: fmtT(prop) }, log: `d/v = ${fmtT(prop)}` }, e));
      F.push(Object.assign({ step: 3, at: "rtt", msg: `<b>RTT</b> ≈ 2·d/v + L/R = <b>${fmtT(rtt)}</b> (потвърждението е кратко; опашки и обработка не са включени). ${prop > tx ? "Тук закъснението е доминирано от разпространението." : "Тук доминира времето за предаване."}`, vars: { rtt: fmtT(rtt) }, log: `RTT = ${fmtT(rtt)}` }, e));
      F.push(Object.assign({ step: 4, at: "bdp", msg: `<b>Капацитет × закъснение</b> = R·RTT = <b>${fmtB(bdp)}</b> — толкова данни трябва да са „в движение“, за да е каналът зает непрекъснато.`, vars: { bdp: fmtB(bdp) }, log: `BDP = ${fmtB(bdp)}` }, e));
      F.push(Object.assign({ step: 5, at: "eff", msg: `Най-много W = ${fmtB(W)} без потвърждение на RTT → W/RTT = ${(per / 1e6).toFixed(3)} Mbit/s; ограничено от R → <b>${(eff / 1e6).toFixed(3)} Mbit/s</b>.`, vars: { eff: (eff / 1e6).toFixed(3) + " Mbit/s" }, log: `eff = ${(eff / 1e6).toFixed(3)} Mbit/s` }, e));
      F.push(Object.assign({ step: 6, at: ["util", "ret"], done: true, msg: `Използване на канала: <b>${(util * 100).toFixed(2)} %</b>. ${W < bdp ? `W (${fmtB(W)}) &lt; BDP (${fmtB(bdp)}) → каналът стои неизползван част от времето: „бърза мрежа“ не означава бърз обмен.` : "W ≥ BDP → прозорецът е достатъчен, каналът е запълнен."}`, vars: { util: (util * 100).toFixed(2) + " %" } }, e));
      const line = `tx=${(tx * 1e6).toFixed(3)}us prop=${(prop * 1e6).toFixed(3)}us rtt=${(rtt * 1e6).toFixed(3)}us bdp=${bdp.toFixed(1)}B eff=${(eff / 1e6).toFixed(3)}Mbit/s util=${util.toFixed(4)}`;
      return { frames: F, line };
    },
  };

  const html = `
<div class="prose">
  <p>Времето за предаване на L бита по канал със скорост R bit/s е <b>L/R</b>. То се различава от времето за разпространение, приблизително разстояние/скорост на сигнала. За 1500 байта при 100 Mbit/s предаването на тези 12000 бита е <b>120 микросекунди</b>, без служебни разходи и изчакване.</p>
  <p><dfn data-g="rtt">RTT</dfn> е време за двупосочно преминаване. При голям RTT и ограничен обем непотвърдени данни ефективната скорост може да е далеч под капацитета. Изпитното изложение трябва да различава скорост на канала, полезен обем и закъснение, вместо да ги обобщава с „бърза мрежа“.</p>
</div>

<div class="block">
  <h3>Три компонента на закъснението (Схема 28)</h3>
  <p class="prose">Модел без опашки, обработка и загуби. Скоростта на сигнала в мед и оптика обичайно се приема около 2·10⁸ m/s. Задай пакета, канала и разстоянието; W е колко байта могат да са изпратени, преди да дойде потвърждение (виж прозореца в <a href="#transport">раздел 6</a>).</p>
  <div id="v-delay"></div>
  <div class="key"><span class="formula">t_пред = L/R · t_разпр = d/v · RTT ≈ 2d/v + L/R · BDP = R·RTT · ефективна скорост ≤ min(R, W/RTT)</span></div>
  <details class="hint"><summary>Хинт: защо „100 мегабита“ не определя времето за отговор</summary><div>
    <p>R влияе само на L/R. Разпространението зависи от разстоянието и средата; опашките, обработката и повторенията добавят още закъснение. При 3000 km разпространението е ≈ 15 ms в едната посока — то не намалява, ако купим по-бърз канал.</p>
  </div></details>
  <details class="trap"><summary>Капан: размерите не са едно и също</summary><div>
    <p><dfn data-g="mtu">MTU</dfn> ограничава преносимия пакет за интерфейс или път. Приложно съобщение, TCP сегмент и MTU не са еднакви размери. <dfn data-g="bdp">Произведението капацитет–закъснение</dfn> показва колко данни могат да са в движение при зададения модел.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-delay"), {
      id: "delay", title: "Оценка на закъснението и ефективната скорост", sub: "Лентите са в мащаб спрямо RTT.",
      code: "ch09_delay",
      inputs: [
        { id: "L", label: "L (байта)", type: "number", value: 1500, width: "6em" }, { id: "R", label: "R (Mbit/s)", type: "number", value: 100, width: "6em" },
        { id: "d", label: "d (km)", value: "3000", width: "6em" }, { id: "v", label: "v (×10⁸ m/s)", value: "2", width: "5em" }, { id: "W", label: "W (байта)", type: "number", value: 65535, width: "7em" },
      ],
      presets: [
        { label: "1500 B, 100 Mbit/s, LAN", values: { L: 1500, R: 100, d: "0.1", v: "2", W: 1500 } },
        { label: "Изпрати и чакай, 3000 km", values: { L: 1500, R: 100, d: "3000", v: "2", W: 1500 } },
        { label: "1 Gbit/s, 10000 km", values: { L: 1500, R: 1000, d: "10000", v: "2", W: 4000000 } },
      ],
      legend: [["s-act", "предаване L/R"], ["s-cmp", "разпространение"], ["s-done", "полезно използване"]],
      build: algos.delay,
      draw(st, f) {
        st.innerHTML = "";
        const W = 600, sx = (t) => 110 + (t / f.rtt) * (W - 130);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 120`, width: W });
        const bar = (y, x0, x1, cls, lab, show) => { if (!show) return; svg.append(S.svg("g", { class: cls }, S.svg("rect", { x: x0, y, width: Math.max(2, x1 - x0), height: 18, rx: 3, fill: "var(--cb)", stroke: "var(--c)" }))); svg.append(S.svg("text", { x: 4, y: y + 14, class: "wt", text: lab })); };
        bar(8, sx(0), sx(f.tx), "s-act", "предаване", f.step >= 1);
        bar(34, sx(f.tx), sx(f.tx + f.prop), "s-cmp", "път натам", f.step >= 2);
        bar(60, sx(f.tx + f.prop), sx(f.rtt), "s-cmp", "ACK обратно", f.step >= 3);
        if (f.step >= 6) { svg.append(S.svg("g", { class: "s-done" }, S.svg("rect", { x: sx(0), y: 88, width: Math.max(2, (sx(f.rtt) - sx(0)) * f.util), height: 18, rx: 3, fill: "var(--cb)", stroke: "var(--c)" }))); svg.append(S.svg("text", { x: 4, y: 102, class: "wt", text: "използване" })); }
        svg.append(S.svg("line", { x1: sx(f.rtt), y1: 2, x2: sx(f.rtt), y2: 112, stroke: "var(--muted)", "stroke-dasharray": "3 3" }));
        st.append(svg);
        const tb = h("table", { class: "t grid" });
        [["L/R", fmtT(f.tx), 1], ["d/v", fmtT(f.prop), 2], ["RTT", fmtT(f.rtt), 3], ["BDP", fmtB(f.bdp), 4], ["ефективно", (f.eff / 1e6).toFixed(3) + " Mbit/s", 5], ["използване", (f.util * 100).toFixed(2) + " %", 6]]
          .forEach(([k, v, s]) => tb.append(h("tr", null, h("th", { text: k }), h("td", { class: f.step === s ? "s-act" : "", text: f.step >= s ? v : "…" }))));
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });
  }

  S.chapter({ id: "ocenki", order: 9, num: "9", group: "Транспорт и услуги", title: "Оценки: скорост, закъснение, RTT", lead: "L/R срещу разпространение; защо при голям RTT и малък прозорец бързият канал стои празен.", html, mount, algos });
})();
