const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_cpu.js", "02_cpu.c");
const A = t.ch.algos;
for (const [a, b] of [[5, 3], [255, 1], [127, 1], [200, 100], [128, 128], [0, 0], [100, 27]]) {
  const r = A.alu_add({ a, b });
  t.eq(`add(${a},${b})`, r.result, t.get(`add(${a},${b})`));
  t.checkTags("ch02_alu_add", r.frames);
  for (const [n, op] of [["and", "&"], ["or", "|"], ["xor", "^"]]) t.eq(`${n}(${a},${b})`, A.alu_logic(a, b, op), t.get(`${n}(${a},${b})`));
}
for (const [x1, x2, x5, m] of [[5, 3, 43, 42], [7, 7, -1, 100], [-5, 2147483647, 0, -8]])
  for (const instr of ["add", "addi", "lw", "sw", "beq"]) {
    const r = A.datapath({ instr, x1, x2, x5, m });
    const k = `dp_${instr}(${x1},${x2},${x5},${m})`;
    t.eq(k, r.result, t.get(k));
    t.checkTags("ch02_datapath", r.frames);
  }
// примерите от ръководството
t.eq("ADD 0x002081B3: x3=8, pc=0x1004", A.datapath({ instr: "add", x1: 5, x2: 3, x5: 0, m: 0 }).result.startsWith("pc=0x1004 x3=8"), true);
t.eq("BEQ равни -> 0x1010", A.datapath({ instr: "beq", x1: 4, x2: 4, x5: 0, m: 0 }).result.startsWith("pc=0x1010"), true);
t.done();
