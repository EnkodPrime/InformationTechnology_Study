const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_io.js", "07_io.c");
const A = t.ch.algos;
const C = [[4, 6, 2, 3, 4, 40], [6, 4, 1, 2, 3, 40], [3, 10, 2, 3, 5, 50], [8, 3, 1, 2, 4, 40], [2, 2, 3, 3, 2, 30]];
for (const [N, gap, copy, isr, setup, H] of C)
  ["polling", "irq", "dma"].forEach((mode, m) => {
    const k = `io(${m},${N},${gap},${copy},${isr},${setup},${H})`;
    const r = A.io_sim({ mode, N, gap, copy, isr, setup, H });
    t.eq(k, r.result, t.get(k)); t.checkTags("ch07_io", r.frames);
  });
// DMA: точно едно прекъсване; polling: 0 полезна работа до края
const d = A.io_sim({ mode: "dma", N: 4, gap: 6, copy: 2, isr: 3, setup: 4, H: 40 });
t.eq("DMA: 1 прекъсване", d.r.irqs, 1);
const p = A.io_sim({ mode: "polling", N: 4, gap: 6, copy: 2, isr: 3, setup: 4, H: 40 });
t.eq("polling: CPU зает до края", p.r.cpu_io, p.r.end);
t.done();
