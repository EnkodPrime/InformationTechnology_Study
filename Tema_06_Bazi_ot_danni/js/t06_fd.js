/* Тема 6 — общо ядро за функционални зависимости (чисти функции, без DOM).
   Огледало на c/05_fd.c: множествата са битови маски, ФЗ са {lhs, rhs}.
   Използва се от разделите 5–8. */
(function () {
  const FD = (window.T6FD = {});

  /** "A B C", "A->B; B,C->A" -> {names, fds:[{lhs,rhs}]}  (хвърля Error при грешка) */
  FD.parse = function (attrs, fds) {
    const names = String(attrs).split(/[\s,]+/).filter(Boolean);
    if (!names.length) throw new Error("Схемата няма атрибути.");
    if (names.length > 10) throw new Error("Най-много 10 атрибута (за да е видимо стъпка по стъпка).");
    if (new Set(names).size !== names.length) throw new Error("Повторено име на атрибут в схемата.");
    names.forEach((n) => { if (n.length > 15) throw new Error(`Името „${n}“ е по-дълго от 15 знака.`); if (/->|;/.test(n)) throw new Error(`Невалидно име „${n}“.`); });
    const idx = (n) => { const k = names.indexOf(n); if (k < 0) throw new Error(`Атрибутът „${n}“ не е в схемата.`); return k; };
    const set = (s) => s.split(/[\s,]+/).filter(Boolean).reduce((m, n) => m | (1 << idx(n)), 0);
    const list = [];
    String(fds).split(";").map((x) => x.trim()).filter(Boolean).forEach((p) => {
      const parts = p.split("->");
      if (parts.length !== 2) throw new Error(`„${p}“: зависимост във вида „X->Y“, напр. „A,B->C“.`);
      const lhs = set(parts[0]), rhs = set(parts[1]);
      if (!lhs) throw new Error(`„${p}“: лявата страна е празна.`);
      if (rhs) list.push({ lhs, rhs, txt: p });
    });
    if (list.length > 16) throw new Error("Най-много 16 зависимости.");
    return { names, n: names.length, fds: list, set, all: (1 << names.length) - 1 };
  };
  FD.pop = (s) => { let c = 0; while (s) { c += s & 1; s >>>= 1; } return c; };
  FD.sub = (a, b) => (a & ~b) === 0;
  FD.str = (sch, m) => { const o = []; for (let i = 0; i < sch.n; i++) if (m >> i & 1) o.push(sch.names[i]); return o.length ? o.join(",") : "∅"; };
  FD.fdStr = (sch, d) => FD.str(sch, d.lhs) + " → " + FD.str(sch, d.rhs);

  /** X⁺ с броячи (passes, checks) и по желание — кадри. */
  FD.closure = function (sch, X, cnt, frames, tagged) {
    let res = X, changed = true;
    if (cnt) cnt.closures = (cnt.closures || 0) + 1;
    if (frames) frames.push({ at: "cl_init", res, fi: -1, msg: `X⁺ := X = {${FD.str(sch, X)}}.`, log: `start {${FD.str(sch, X)}}` });
    let pass = 0;
    while (changed) {
      changed = false; pass++;
      if (cnt) cnt.passes = (cnt.passes || 0) + 1;
      if (frames) frames.push({ at: "cl_pass", res, fi: -1, pass, msg: `Проход ${pass} през всички зависимости.` });
      for (let i = 0; i < sch.fds.length; i++) {
        const d = sch.fds[i];
        if (cnt) cnt.checks = (cnt.checks || 0) + 1;
        const lhsIn = FD.sub(d.lhs, res), rhsIn = FD.sub(d.rhs, res);
        if (lhsIn && !rhsIn) {
          const add = d.rhs & ~res;
          if (frames) frames.push({ at: ["cl_fd", "cl_test"], res, fi: i, ok: true, pass, msg: `${FD.fdStr(sch, d)}: {${FD.str(sch, d.lhs)}} ⊆ X⁺ — прилагаме.` });
          res |= d.rhs; changed = true;
          if (frames) frames.push({ at: "cl_apply", res, fi: i, ok: true, added: add, pass, msg: `X⁺ ∪= {${FD.str(sch, d.rhs)}} → нови: <b>${FD.str(sch, add)}</b>.`, log: `+${FD.str(sch, add)} (${FD.fdStr(sch, d)})` });
        } else if (frames) frames.push({ at: ["cl_fd", "cl_test"], res, fi: i, ok: false, pass, msg: lhsIn ? `${FD.fdStr(sch, d)}: дясната страна вече е в X⁺ — нищо ново.` : `${FD.fdStr(sch, d)}: {${FD.str(sch, d.lhs & ~res)}} още не е в X⁺ — не може да се приложи.` });
      }
      if (frames && !changed) frames.push({ at: "cl_pass", res, fi: -1, pass, msg: `Проход ${pass} не добави нищо — неподвижна точка.` });
    }
    if (frames) frames.push({ at: "cl_done", res, fi: -1, done: true, msg: `X⁺ = {<b>${FD.str(sch, res)}</b>}.` });
    return res;
  };

  /** Всички кандидатни ключове (същият ред на обхождане като в C). */
  FD.keys = function (sch, cnt, frames) {
    const keys = [];
    for (let size = 1; size <= sch.n; size++) {
      if (frames) frames.push({ at: "k_size", size, keys: keys.slice(), msg: `Подмножества с ${size} атрибута.` });
      for (let X = 1; X <= sch.all; X++) {
        if (FD.pop(X) !== size) continue;
        const sup = keys.find((k) => FD.sub(k, X));
        if (sup !== undefined) { if (frames) frames.push({ at: ["k_super", "k_skip"], X, size, keys: keys.slice(), skip: sup, msg: `{${FD.str(sch, X)}} ⊇ ключа {${FD.str(sch, sup)}} — не е минимален, пропускаме без затваряне.` }); continue; }
        const c = FD.closure(sch, X, cnt);
        const isKey = c === sch.all;
        if (frames) frames.push({ at: "k_test", X, size, cl: c, keys: keys.slice(), ok: isKey, msg: `{${FD.str(sch, X)}}⁺ = {${FD.str(sch, c)}} ${isKey ? "= всички атрибути" : "≠ всички"}.` });
        if (isKey) { keys.push(X); if (frames) frames.push({ at: "k_found", X, size, cl: c, keys: keys.slice(), ok: true, msg: `<b>Кандидатен ключ: {${FD.str(sch, X)}}</b>. Никой собствен поднабор не е ключ (иначе щеше да е намерен по-рано).`, log: `ключ {${FD.str(sch, X)}}` }); }
      }
    }
    return keys;
  };

  FD.prime = (keys) => keys.reduce((m, k) => m | k, 0);

  /* ---------- нормални форми и разлагане (огледало на c/06_nf.c) ---------- */

  /** Анализ: ключове, първични атрибути, нарушения. kind: 2 частична, 3 — 3НФ, 4 — само BCNF. */
  FD.analyze = function (sch, cnt, frames) {
    const keys = FD.keys(sch, cnt);
    const prime = FD.prime(keys);
    const v = [];
    let partial = false, bad3 = false, badB = false;
    const push = (o) => frames && frames.push({ keys, prime, viol: v.slice(), ...o });
    push({ at: ["an_keys", "an_prime"], msg: `Кандидатни ключове: ${keys.map((k) => "{" + FD.str(sch, k) + "}").join(", ")}. Първични атрибути: {${FD.str(sch, prime)}}.` });
    for (const K of keys) {
      push({ at: "an_key", K, msg: `2НФ: собствените части на ключа {${FD.str(sch, K)}}${FD.pop(K) === 1 ? " — ключът е от един атрибут, няма собствени непразни части" : ""}.` });
      for (let X = (K - 1) & K; X; X = (X - 1) & K) {
        const dep = FD.closure(sch, X, cnt) & ~X & ~prime;
        push({ at: "an_part", K, X, dep, msg: `{${FD.str(sch, X)}}⁺ съдържа непървични: {${FD.str(sch, dep)}}.` });
        for (let a = 0; a < sch.n; a++) if (dep >> a & 1) {
          v.push({ lhs: X, attr: a, kind: 2 }); partial = true;
          push({ at: "an_partbad", K, X, a, bad: 2, msg: `<b>Нарушение на 2НФ:</b> ${sch.names[a]} зависи от {${FD.str(sch, X)}} — собствена част на ключа {${FD.str(sch, K)}}.`, log: `2НФ: ${FD.str(sch, X)} → ${sch.names[a]}` });
        }
      }
    }
    sch.fds.forEach((d, fi) => {
      for (let a = 0; a < sch.n; a++) {
        if (!(d.rhs >> a & 1) || (d.lhs >> a & 1)) continue;
        const sup = FD.closure(sch, d.lhs, cnt) === sch.all;
        push({ at: "an_fd", fi, a, sup, msg: `${FD.str(sch, d.lhs)} → ${sch.names[a]}: ${FD.str(sch, d.lhs)} ${sup ? "<b>е</b> суперключ — допустимо и в BCNF" : "не е суперключ"}.` });
        if (sup) continue;
        badB = true;
        if (prime >> a & 1) {
          v.push({ lhs: d.lhs, attr: a, kind: 4 });
          push({ at: "an_bcnf", fi, a, bad: 4, msg: `${sch.names[a]} е <b>първичен</b> атрибут — 3НФ допуска зависимостта, <b>BCNF я забранява</b>.`, log: `BCNF: ${FD.str(sch, d.lhs)} → ${sch.names[a]}` });
          continue;
        }
        bad3 = true;
        v.push({ lhs: d.lhs, attr: a, kind: 3 });
        push({ at: ["an_bcnf", "an_3nf"], fi, a, bad: 3, msg: `${sch.names[a]} е непървичен, а ${FD.str(sch, d.lhs)} не е суперключ — <b>нарушение на 3НФ</b> (и на BCNF).`, log: `3НФ: ${FD.str(sch, d.lhs)} → ${sch.names[a]}` });
      }
    });
    const level = partial ? 1 : bad3 ? 2 : badB ? 3 : 4;
    push({ at: "an_level", level, done: true, msg: `Най-високата изпълнена форма: <b>${["", "1НФ", "2НФ", "3НФ", "BCNF"][level]}</b>.` });
    return { level, keys, prime, viol: v };
  };

  /** Стандартно BCNF разлагане (същият избор на нарушение като в C). */
  FD.bcnf = function (sch, cnt, frames) {
    const rels = [sch.all];
    const push = (o) => frames && frames.push({ rels: rels.slice(), ...o });
    push({ at: "b_init", msg: `Започваме с R = {${FD.str(sch, sch.all)}}.` });
    for (let i = 0; i < rels.length;) {
      const Ri = rels[i], m = FD.pop(Ri);
      push({ at: "b_pick", ri: i, msg: `Проверяваме R${i + 1} = {${FD.str(sch, Ri)}} за нарушение на BCNF.` });
      let X = 0, c = 0;
      outer: for (let size = 1; size < m; size++) for (let Y = (Ri - 1) & Ri; Y; Y = (Y - 1) & Ri) {
        if (FD.pop(Y) !== size) continue;
        const cc = FD.closure(sch, Y, cnt) & Ri;
        if (cc !== Y && cc !== Ri) { X = Y; c = cc; push({ at: ["b_close", "b_viol"], ri: i, X, c, msg: `{${FD.str(sch, Y)}}⁺ ∩ R${i + 1} = {${FD.str(sch, cc)}}: нетривиално и ≠ R${i + 1} ⇒ {${FD.str(sch, Y)}} е детерминант, който <b>не е суперключ</b> на R${i + 1}.` }); break outer; }
      }
      if (!X || rels.length >= 12) { push({ at: "b_ok", ri: i, okRel: i, msg: `R${i + 1} = {${FD.str(sch, Ri)}} е в BCNF${m <= 2 ? " (всяка релация с два атрибута е в BCNF)" : ""}.`, log: `R${i + 1} = {${FD.str(sch, Ri)}} ✓` }); i++; continue; }
      const rest = Ri & ~(c & ~X);
      rels[i] = c; rels.push(rest);
      push({ at: "b_split", ri: i, X, c, newRel: rels.length - 1, msg: `Разделяме: R${i + 1} := {${FD.str(sch, c)}} (X ∪ X⁺) и R${rels.length} := {${FD.str(sch, rest)}} (R − (X⁺ − X)). Общият атрибут {${FD.str(sch, X)}} е ключ на първата част ⇒ разделянето е без загуба.`, log: `раздели по ${FD.str(sch, X)}` });
    }
    push({ done: true, msg: `Резултат: ${rels.map((r) => "{" + FD.str(sch, r) + "}").join(", ")}.` });
    return rels;
  };

  /** Запазена ли е d при разлагането rels? */
  FD.preserved = function (sch, rels, d, cnt, frames) {
    let Z = d.lhs, changed = true;
    const push = (o) => frames && frames.push({ Z, ...o });
    push({ at: "p_init", msg: `Проверяваме ${FD.fdStr(sch, d)}: Z := {${FD.str(sch, Z)}}.` });
    while (changed) {
      changed = false;
      push({ at: "p_loop", msg: "Нов проход през подсхемите." });
      rels.forEach((Ri, i) => {
        const add = FD.closure(sch, Z & Ri, cnt) & Ri;
        const grow = add & ~Z;
        push({ at: ["p_rel", "p_local"], ri: i, add, msg: `В R${i + 1} = {${FD.str(sch, Ri)}}: ({${FD.str(sch, Z & Ri)}})⁺ ∩ R${i + 1} = {${FD.str(sch, add)}}${grow ? ` — нови: <b>${FD.str(sch, grow)}</b>` : " — нищо ново"}.` });
        if (grow) { Z |= add; changed = true; push({ at: "p_grow", ri: i, add, msg: `Z = {${FD.str(sch, Z)}}.` }); }
      });
    }
    const ok = (d.rhs & ~Z) === 0;
    push({ at: "p_res", ok, done: true, msg: ok ? `{${FD.str(sch, d.rhs)}} ⊆ Z ⇒ <b>запазена</b>: проверява се чрез локалните зависимости.` : `{${FD.str(sch, d.rhs & ~Z)}} ⊄ Z ⇒ <b>не е запазена</b>: никоя комбинация от локални проверки не я гарантира.` });
    return ok;
  };

  /** Chase (метод на таблицата). Връща номера (1..) на реда, станал изцяло „a“, или 0. */
  FD.chase = function (sch, rels, frames) {
    const t = rels.map((R, i) => Array.from({ length: sch.n }, (_, j) => (R >> j & 1 ? 0 : 1 + i * 12 + j)));
    let steps = 0, changed = true;
    const snap = (o) => frames && frames.push({ t: t.map((r) => r.slice()), steps, ...o });
    snap({ at: "c_init", msg: "Таблица: ред i е подсхемата Ri. В колоните на Ri пишем отличения символ a; в останалите — b<sub>ij</sub> (уникален за реда)." });
    let pass = 0;
    while (changed) {
      changed = false; pass++;
      snap({ at: "c_pass", msg: `Проход ${pass}: прилагаме всяка ФЗ към всяка двойка редове.` });
      sch.fds.forEach((d, fi) => {
        for (let r1 = 0; r1 < rels.length; r1++) for (let r2 = r1 + 1; r2 < rels.length; r2++) {
          let agree = true;
          for (let j = 0; j < sch.n; j++) if ((d.lhs >> j & 1) && t[r1][j] !== t[r2][j]) agree = false;
          if (!agree) continue;
          for (let j = 0; j < sch.n; j++) {
            if (!(d.rhs >> j & 1) || t[r1][j] === t[r2][j]) continue;
            const keep = Math.min(t[r1][j], t[r2][j]), drop = t[r1][j] + t[r2][j] - keep;
            snap({ at: "c_agree", fi, r1, r2, col: j, msg: `${FD.fdStr(sch, d)}: редове ${r1 + 1} и ${r2 + 1} съвпадат по {${FD.str(sch, d.lhs)}} ⇒ трябва да съвпадат и по ${sch.names[j]}.` });
            for (let r = 0; r < rels.length; r++) if (t[r][j] === drop) t[r][j] = keep;
            changed = true; steps++;
            snap({ at: "c_equate", fi, r1, r2, col: j, msg: `Изравняваме ${sch.names[j]}: ${keep === 0 ? "a" : "b"} замества другия символ навсякъде.`, log: `${FD.fdStr(sch, d)}: ред ${r1 + 1}~${r2 + 1}, ${sch.names[j]}` });
          }
        }
      });
      for (let r = 0; r < rels.length; r++) if (t[r].every((x) => x === 0)) { snap({ at: ["c_check", "c_yes"], full: r, done: true, msg: `Ред ${r + 1} е изцяло от a ⇒ разлагането е <b>без загуба</b>.`, inv: { text: "Съединението на проекциите възстановява точно R", ok: true } }); return { row: r + 1, steps }; }
      snap({ at: "c_check", msg: changed ? "Още няма ред само от a; повтаряме." : "Нищо не се промени." });
    }
    snap({ at: "c_no", done: true, msg: "Неподвижна точка без ред само от a ⇒ разлагането <b>не е</b> гарантирано без загуба: има състояние, в което съединението добавя фалшиви кортежи.", inv: { text: "Възможни са фалшиви кортежи", ok: false } });
    return { row: 0, steps };
  };
})();
