const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_osi.js", "02_layers.c");
const A = t.ch.algos;
for (const v of [1000, 250, 65535, 7]) {
  let r = A.repr({ v, fmt: "text", rfmt: "text" }); t.eq(`text(${v})`, r.bytes, t.get(`text(${v})`)); t.checkTags("ch02_repr", r.frames);
  r = A.repr({ v, fmt: "be16", rfmt: "be16" }); t.eq(`be16(${v})`, r.bytes, t.get(`be16(${v})`)); t.checkTags("ch02_repr", r.frames);
  r = A.repr({ v, fmt: "be16", rfmt: "le16" }); t.eq(`be16 read as le ${v}`, r.got, t.get(`be16(${v}) read as le`)); t.checkTags("ch02_repr", r.frames);
  r = A.repr({ v, fmt: "le16", rfmt: "le16" }); t.eq(`le16(${v})`, r.bytes, t.get(`le16(${v})`));
  r = A.repr({ v, fmt: "le16", rfmt: "be16" }); t.eq(`le16 read as be ${v}`, r.got, t.get(`le16(${v}) read as be`)); t.checkTags("ch02_repr", r.frames);
  r = A.repr({ v, fmt: "text", rfmt: "be16" }); t.checkTags("ch02_repr", r.frames);
}
t.done();
