const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_fs.js", "08_fs.c");
const A = t.ch.algos;
for (const [nm, script] of [["hard", "c a.txt hello; l a.txt b.txt; u a.txt; o b.txt"], ["sym", "c a.txt hello; s a.txt s.lnk; u a.txt; o s.lnk"], ["open", "c a.txt hello; o a.txt; u a.txt; x 0"], ["both", "c f x; l f g; o g; u f; u g; x 0; o g"]]) {
  const r = A.fs({ script });
  for (const k of ["names", "inodes", "freed", "fails", "lastfd"]) t.eq(nm + "." + k, r[k], t.get(nm + "." + k));
  t.checkTags("s08_inode", r.frames);
}
const disk = "##..#...##.###.....#..##.#......";
for (const m of ["contig", "linked", "indexed"]) for (const [n, k] of [[5, 3], [8, 7]]) {
  const nm = `d${n}.${m}`, r = A.alloc({ disk, method: m, n, k });
  t.eq(nm + ".ok", r.ok, t.get(nm + ".ok"));
  if (r.ok) { t.eq(nm + ".blocks", r.blocks, t.get(nm + ".blocks")); t.eq(nm + ".index", r.index, t.get(nm + ".index")); t.eq(nm + ".reads", r.reads, t.get(nm + ".reads")); }
  t.checkTags("s08_alloc", r.frames);
}
t.done();
