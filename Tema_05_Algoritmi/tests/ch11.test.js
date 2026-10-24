/* Раздел 11 няма стъпкови алгоритми — проверява регистрацията и връзките към разделите. */
const t = require("./harness")("ch11_summary.js", null);
const ids = ["karta", "algoritam", "izchislimost", "slozhnost", "pnp", "rekursia", "razdelyai", "sortirovki", "alchen", "dp", "dopalnitelni", "sistematizacia"];
t.eq("id", t.ch.id, "sistematizacia");
t.eq("order", t.ch.order, 11);
const links = [...t.ch.html.matchAll(/href="#([a-z]+)"/g)].map((m) => m[1]);
const src = require("fs").readFileSync(require("path").join(__dirname, "../js/ch11_summary.js"), "utf8");
for (const m of src.matchAll(/sec: "([a-z]+)"/g)) links.push(m[1]);
for (const l of links) t.eq("връзка #" + l, ids.includes(l), true);
for (const m of src.matchAll(/data-g\\?=\\?"([^"\\]+)/g)) t.eq("речник " + m[1], !!t.ctx.Study.glossLookup(m[1]), true);
for (const m of src.matchAll(/, g: "([^"]+)"/g)) t.eq("речник " + m[1], !!t.ctx.Study.glossLookup(m[1]), true);
t.done();
