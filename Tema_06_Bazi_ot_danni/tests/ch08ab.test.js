/* Независима проверка на данните в раздели 8а (4НФ/5НФ) и 8б (пътят до 5НФ). */
const fs = require("fs"), vm = require("vm"), path = require("path");
const T = path.join(__dirname, "..");
const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map, Error, isFinite };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["../common/js/study.js", "Tema_06_Bazi_ot_danni/js/glossary.js", "Tema_06_Bazi_ot_danni/js/ch08a_nf45.js", "Tema_06_Bazi_ot_danni/js/ch08b_journey.js"])
  vm.runInContext(fs.readFileSync(path.join(T, "..", f.replace(/^\.\.\//, "")), "utf8"), ctx);
const chs = ctx.Study.chapters, A = chs.find((c) => c.id === "nf45").algos, J = chs.find((c) => c.id === "patnf").algos;
let ok = 0, bad = 0; const eq = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.error("  ✗", n, JSON.stringify(a), JSON.stringify(b)); } };

// независимо естествено съединение и проекция
const nj = (a, b) => { const com = a.cols.filter((c) => b.cols.includes(c)); const cols = a.cols.concat(b.cols.filter((c) => !com.includes(c))); const rows = [];
  for (const x of a.rows) for (const y of b.rows) if (com.every((c) => x[a.cols.indexOf(c)] === y[b.cols.indexOf(c)])) rows.push(cols.map((c) => (a.cols.includes(c) ? x[a.cols.indexOf(c)] : y[b.cols.indexOf(c)])));
  return { cols, rows }; };
const setOf = (rel, cols) => new Set(rel.rows.map((r) => JSON.stringify(cols.map((c) => r[rel.cols.indexOf(c)]))));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// 8а: МЗ Студент ↠ Курс в примера е в сила; след изтриване на ред — не
eq("МЗ в сила", A.mvdMissing(A.SCP0, ["Студент"], ["Курс"]).miss.length, 0);
const cut = { cols: A.SCP0.cols, rows: A.SCP0.rows.filter((r) => !(r[1] === "ОС" && r[2] === "0882")) };
eq("МЗ нарушена след изтриване", A.mvdMissing(cut, ["Студент"], ["Курс"]).miss.length, 1);
// Фейгин: проекциите (С,К) ⋈ (С,Т) = оригинала
eq("4НФ разлагане беззагубно", sameSet(setOf(nj(A.project(A.SCP0, ["Студент", "Курс"]), A.project(A.SCP0, ["Студент", "Телефон"])), A.SCP0.cols), setOf(A.SCP0, A.SCP0.cols)), true);
// 5НФ: JD в сила; всяко двойно съединение дава фалшиви; няма нетривиални МЗ
const O = A.OFFER, P3 = [["Преподавател", "Курс"], ["Преподавател", "Програма"], ["Курс", "Програма"]];
const j3 = nj(nj(A.project(O, P3[0]), A.project(O, P3[1])), A.project(O, P3[2]));
eq("JD: трите проекции = оригинала", sameSet(setOf(j3, O.cols), setOf(O, O.cols)), true);
for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) { const j2 = nj(A.project(O, P3[a]), A.project(O, P3[b])); eq(`двойно ${a}${b} има фалшиви`, setOf(j2, O.cols).size > O.rows.length, true); }
for (const X of O.cols) { const Y = O.cols.find((c) => c !== X); eq(`няма МЗ ${X}↠${Y}`, A.mvdMissing(O, [X], [Y]).miss.length > 0, true); }
eq("JD функцията на страницата", A.jd(O, P3).holds, true);
const O3 = { cols: O.cols, rows: O.rows.filter((r) => !(r[0] === "Петров" && r[1] === "БД" && r[2] === "Информатика")) };
eq("без правилото трите проекции дават фалшив ред", A.jd(O3, P3).spurious.length, 1);

// 8б: всеки етап от 2НФ до 4НФ е беззагубно разлагане на 1НФ
const S = J.STAGES, flat = { cols: S[1].tables[0].cols, rows: J.flat() };
eq("1НФ = разгънатите факти", sameSet(setOf(S[1].tables[0], flat.cols), setOf(flat, flat.cols)), true);
for (const k of ["2NF", "3NF", "BCNF", "4NF"]) {
  const st = S.find((s) => s.k === k);
  let j = st.tables[0]; for (const t of st.tables.slice(1)) j = nj(j, t);
  eq(`${k}: съединението = 1НФ`, sameSet(setOf(j, flat.cols), setOf(flat, flat.cols)), true);
}
// ФЗ в сила в данните на 1НФ
const fd = (X, Y) => { const m = new Map(); for (const r of flat.rows) { const kx = JSON.stringify(X.map((c) => r[flat.cols.indexOf(c)])), ky = JSON.stringify(Y.map((c) => r[flat.cols.indexOf(c)])); if (m.has(kx) && m.get(kx) !== ky) return false; m.set(kx, ky); } return true; };
[[["SID"], ["Име", "Програма"]], [["Програма"], ["Декан"]], [["Курс"], ["Заглавие"]], [["SID", "Курс"], ["Преподавател", "Оценка"]], [["Преподавател"], ["Курс"]]].forEach(([X, Y]) => eq(`ФЗ ${X}→${Y}`, fd(X, Y), true));
eq("МЗ SID↠Телефон в 1НФ", A.mvdMissing(flat, ["SID"], ["Телефон"]).miss.length, 0);
eq("Курс не определя Телефон", fd(["SID", "Курс"], ["Телефон"]), false);
// всеки ключ, обявен на етап, е уникален в данните на таблицата
S.forEach((st) => st.tables.forEach((t) => { const ks = t.rows.map((r) => JSON.stringify(t.key.map((c) => r[t.cols.indexOf(c)]))); eq(`${st.k}/${t.name}: ключът е уникален`, new Set(ks).size, ks.length); }));
// показатели
const M = S.map(J.metrics);
eq("Петрова: копия по етапи", M.slice(0, 6).map((m) => m.deanCopies), [2, 6, 2, 1, 1, 1]);
eq("смяна на заглавие: редове", M.slice(0, 6).map((m) => m.updTitle), [3, 4, 1, 1, 1, 1]);
eq("нов телефон: редове по етапи", M.slice(1, 6).map((m) => m.newPhone), [2, 2, 2, 2, 1]);
eq("нова програма възможна", M.slice(0, 6).map((m) => m.insProg), [false, false, false, true, true, true]);
eq("изтриване на Boris пази декана", M.slice(0, 6).map((m) => m.delBorisKeepsDean), [false, false, false, true, true, true]);
console.log(`ch08ab: ${ok} съвпадения, ${bad} разлики`); if (bad) process.exitCode = 1;
