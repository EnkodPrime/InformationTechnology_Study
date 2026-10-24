/* Раздел 8 — файлови системи: име, inode, връзки, дескриптор; разпределение на блокове; кеш, журнал, резервно копие. */
(function () {
  const S = window.Study, h = S.h;
  const MAXI = 8, DISK = 32;
  const MN = { contig: "непрекъснато", linked: "свързано (списък)", indexed: "индексно" };
  const COLORS = ["#4f7fd0", "#d08a2a", "#3f9a64", "#b0504a", "#8a62c8", "#2a9aa8", "#a07a3a", "#c05a9a"];

  function parseScript(str) {
    const cmds = String(str).split(";").map((s) => s.trim()).filter(Boolean);
    if (!cmds.length) throw new Error("Въведи поне една команда.");
    if (cmds.length > 16) throw new Error("Най-много 16 команди.");
    return cmds.map((c) => {
      const p = c.split(/\s+/);
      const op = p[0];
      const need = { c: 3, l: 3, s: 3, u: 2, o: 2, x: 2 }[op];
      if (!need) throw new Error(`„${c}“: непозната команда. Допустими: c, l, s, u, o, x.`);
      if (p.length < need) throw new Error(`„${c}“: липсва аргумент.`);
      if (p.slice(1).some((x) => x.length > 11)) throw new Error("Имената трябва да са до 11 символа.");
      if (op === "x" && !/^\d+$/.test(p[1])) throw new Error(`„${c}“: x очаква номер на дескриптор.`);
      return { op, a: p[1], b: p[2] };
    });
  }

  const algos = {
    /* Огледало на fs_create/fs_link/fs_symlink/fs_unlink/fs_open/fs_close */
    fs({ script }) {
      const C = parseScript(script);
      const ino = Array.from({ length: MAXI }, () => ({ used: false, nlink: 0, nopen: 0, sym: false, data: "" }));
      let dir = [], fds = [], freed = 0, fails = 0, lastfd = -1;
      const F = [];
      const snap = (o) => ({ ino: ino.map((x) => ({ ...x })), dir: dir.map((d) => ({ ...d })), fds: fds.slice(), stats: { имена: dir.length, "живи inode": ino.filter((x) => x.used).length, освободени: freed }, ...o });
      const look = (n) => dir.findIndex((d) => d.name === n);
      const newI = () => { const i = ino.findIndex((x) => !x.used); if (i >= 0) ino[i] = { used: true, nlink: 0, nopen: 0, sym: false, data: "" }; return i; };
      const maybeFree = (i, fr) => {
        if (ino[i].nlink === 0 && ino[i].nopen === 0) { ino[i].used = false; freed++; F.push(snap({ at: "free", hiI: i, vars: { inode: i }, msg: `inode ${i}: nlink = 0 и nopen = 0 → обектът и данните му се <b>освобождават</b>.`, log: `inode ${i} освободен`, ...fr })); }
        else F.push(snap({ at: "free", hiI: i, vars: { nlink: ino[i].nlink, nopen: ino[i].nopen }, msg: `inode ${i} остава: nlink = ${ino[i].nlink}, отворени достъпи = ${ino[i].nopen}.${ino[i].nlink === 0 ? " <b>Без име</b>, но още достъпен през дескриптора." : ""}`, ...fr }));
      };
      F.push(snap({ vars: {}, msg: "Празна директория. Команди: <code>c име данни</code>, <code>l старо ново</code> (твърда връзка), <code>s цел име</code> (символна), <code>u име</code>, <code>o име</code>, <code>x fd</code>." }));
      for (const c of C) {
        const fail = (why, at) => { fails++; F.push(snap({ at, bad: true, vars: {}, msg: `<span class="warn">${why}</span>`, log: `${c.op} ${c.a} ✗` })); };
        if (c.op === "c") {
          if (look(c.a) >= 0) { fail(`Името „${c.a}“ вече съществува.`, "create"); continue; }
          const i = newI(); if (i < 0) { fail("Няма свободен inode.", "create"); continue; }
          ino[i].data = c.b.slice(0, 11); ino[i].nlink = 1;
          F.push(snap({ at: "create", hiI: i, vars: { inode: i }, msg: `Нов inode ${i} с данни „${ino[i].data}“, nlink = 1.` }));
          dir.push({ name: c.a, ino: i });
          F.push(snap({ at: "name", hiI: i, hiN: c.a, vars: { [c.a]: i }, msg: `Директорията получава запис „${c.a}“ → inode ${i}. <b>Името е в директорията</b>, не в inode.`, log: `create ${c.a} → ${i}` }));
        } else if (c.op === "l") {
          const e = look(c.a);
          if (e < 0) { fail(`Няма име „${c.a}“.`, "link"); continue; }
          if (look(c.b) >= 0) { fail(`Името „${c.b}“ вече съществува.`, "link"); continue; }
          const i = dir[e].ino; ino[i].nlink++;
          F.push(snap({ at: "link", hiI: i, vars: { nlink: ino[i].nlink }, msg: `<dfn data-g="твърда връзка">Твърда връзка</dfn>: inode ${i} получава второ име, nlink = ${ino[i].nlink}. Нов inode НЕ се създава.` }));
          dir.push({ name: c.b, ino: i });
          F.push(snap({ at: "name", hiI: i, hiN: c.b, vars: { [c.b]: i }, msg: `„${c.b}“ → inode ${i} — същият обект като „${c.a}“.`, log: `link ${c.b} → ${i}` }));
        } else if (c.op === "s") {
          if (look(c.b) >= 0) { fail(`Името „${c.b}“ вече съществува.`, "symlink"); continue; }
          const i = newI(); if (i < 0) { fail("Няма свободен inode.", "symlink"); continue; }
          ino[i].sym = true; ino[i].nlink = 1; ino[i].data = c.a.slice(0, 11);
          F.push(snap({ at: "symlink", hiI: i, vars: { inode: i, път: c.a }, msg: `<dfn data-g="символна връзка">Символна връзка</dfn>: <b>отделен</b> inode ${i}, който пази пътя „${c.a}“, а не номер на inode.` }));
          dir.push({ name: c.b, ino: i });
          F.push(snap({ at: "name", hiI: i, hiN: c.b, vars: {}, msg: `„${c.b}“ → inode ${i} (връзка към път „${c.a}“).`, log: `symlink ${c.b} → „${c.a}“` }));
        } else if (c.op === "u") {
          const e = look(c.a);
          if (e < 0) { fail(`Няма име „${c.a}“.`, "unlink"); continue; }
          const i = dir[e].ino;
          dir[e] = dir[dir.length - 1]; dir.pop(); ino[i].nlink--;
          F.push(snap({ at: "unlink", hiI: i, vars: { nlink: ino[i].nlink }, msg: `Изтриване на името „${c.a}“: записът изчезва от директорията; nlink на inode ${i} става ${ino[i].nlink}.`, log: `unlink ${c.a}` }));
          maybeFree(i, {});
        } else if (c.op === "o") {
          const e = look(c.a);
          if (e < 0) { lastfd = -1; fail(`Няма име „${c.a}“.`, "noent"); continue; }
          let i = dir[e].ino;
          if (ino[i].sym) {
            const tgt = ino[i].data, e2 = look(tgt);
            F.push(snap({ at: "follow", hiI: i, vars: { път: tgt }, msg: `„${c.a}“ е символна връзка → търсим пътя „${tgt}“.` }));
            if (e2 < 0) { lastfd = -1; fail(`<b>Висяща връзка</b>: „${tgt}“ вече не съществува.`, "dangling"); continue; }
            i = dir[e2].ino;
          }
          ino[i].nopen++; fds.push(i); lastfd = fds.length - 1;
          F.push(snap({ at: "open", hiI: i, vars: { fd: lastfd, nopen: ino[i].nopen }, msg: `Отваряне: <dfn data-g="файлов дескриптор">дескриптор</dfn> ${lastfd} → inode ${i}. Дескрипторът сочи обекта, не името.`, log: `open ${c.a} → fd ${lastfd}` }));
        } else if (c.op === "x") {
          const fd = +c.a;
          if (fd >= fds.length || fds[fd] < 0) { fail(`Няма отворен дескриптор ${fd}.`, "close"); continue; }
          const i = fds[fd]; fds[fd] = -1; ino[i].nopen--;
          F.push(snap({ at: "close", hiI: i, vars: { fd, nopen: ino[i].nopen }, msg: `Затваряне на дескриптор ${fd}.`, log: `close ${fd}` }));
          maybeFree(i, {});
        }
      }
      F.push(snap({ done: true, vars: {}, msg: `Край: ${dir.length} имена, ${ino.filter((x) => x.used).length} живи inode, ${freed} освободени.` }));
      return { frames: F, names: dir.length, inodes: ino.filter((x) => x.used).length, freed, fails, lastfd };
    },

    /* Огледало на place() и reads_to_block() */
    alloc({ disk, method, n, k }) {
      const d = String(disk).replace(/\s+/g, "");
      if (d.length !== DISK || /[^#.]/.test(d)) throw new Error(`Дискът е низ от ${DISK} символа: „#“ — зает, „.“ — свободен.`);
      if (!(method in MN)) throw new Error("Непознат метод.");
      n = S.int(n, 1, 16, "Размерът на файла");
      k = S.int(k, 0, n - 1, "Търсеният логически блок");
      const used = [...d].map((c) => c === "#");
      const F = [];
      const snap = (o) => ({ used: used.slice(), method, n, k, ...o });
      F.push(snap({ vars: { метод: MN[method], "блокове": n }, msg: `Файл от ${n} блока, метод <b>${MN[method]}</b>. Сиво = заети от други файлове.` }));
      let blocks = [], ib = -1;
      if (method === "contig") {
        let found = -1;
        for (let s = 0; s + n <= DISK; s++) {
          let ok = true;
          for (let i = 0; i < n; i++) if (used[s + i]) { ok = false; break; }
          if (ok) { found = s; break; }
        }
        if (found < 0) {
          const free = used.filter((x) => !x).length;
          F.push(snap({ at: "cfail", bad: true, done: true, vars: { свободни: free }, msg: `<b class="warn">Няма ${n} поредни свободни блока</b>, въпреки че свободни са ${free}. Външна фрагментация на носителя.` }));
          return { frames: F, ok: 0 };
        }
        for (let i = 0; i < n; i++) { used[found + i] = true; blocks.push(found + i); }
        F.push(snap({ at: "cfit", blocks: blocks.slice(), vars: { начало: found, дължина: n }, msg: `Първата поредица от ${n} свободни блока започва от ${found}. Директорията пази (начало, дължина).` }));
      } else {
        const need = n + (method === "indexed" ? 1 : 0), tmp = [];
        for (let b = 0; b < DISK && tmp.length < need; b++) if (!used[b]) tmp.push(b);
        if (tmp.length < need) { F.push(snap({ at: "scatter", bad: true, done: true, vars: {}, msg: "Няма достатъчно свободни блокове." })); return { frames: F, ok: 0 }; }
        let off = 0;
        if (method === "indexed") { ib = tmp[0]; used[ib] = true; off = 1; F.push(snap({ at: "iblock", ib, vars: { "индексен блок": ib }, msg: `Индексният блок ${ib} ще пази списъка с номерата на блоковете с данни (в духа на inode).` })); }
        for (let i = 0; i < n; i++) { blocks.push(tmp[i + off]); used[tmp[i + off]] = true; }
        F.push(snap({ at: "scatter", blocks: blocks.slice(), ib, vars: { блокове: blocks.join(",") }, msg: method === "linked" ? `Блоковете не са поредни: ${blocks.join(" → ")}. Всеки пази указател към следващия.` : `Блоковете с данни: ${blocks.join(", ")}; номерата им са в индексния блок ${ib}.` }));
      }
      // достъп до блок k
      const reads = method === "contig" ? 1 : method === "linked" ? k + 1 : 2;
      const path = method === "contig" ? [blocks[k]] : method === "linked" ? blocks.slice(0, k + 1) : [ib, blocks[k]];
      const tag = { contig: "contig", linked: "linked", indexed: "indexed" }[method];
      const expl = method === "contig" ? `адрес = начало + k = ${blocks[0]} + ${k} = ${blocks[k]} — едно четене, пряк достъп.` : method === "linked" ? `трябва да прочетем ${k + 1} блока, за да стигнем по указателите до блок ${k}: ${path.join(" → ")}.` : `четем индексния блок ${ib}, намираме запис ${k} → блок ${blocks[k]}: две четения независимо от k.`;
      F.push(snap({ at: tag, blocks, ib, path, done: true, vars: { k, "четения": reads }, stats: { "четения до блок k": reads }, msg: `Произволен достъп до логически блок ${k}: ${expl}` }));
      return { frames: F, ok: 1, blocks: blocks.join(","), index: ib, reads };
    },
  };

  function drawFS(st, f) {
    st.innerHTML = "";
    const dt = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "име" }), h("th", { text: "inode" })));
    if (!f.dir.length) dt.append(h("tr", null, h("td", { colspan: 2, class: "muted", text: "празна" })));
    f.dir.forEach((d) => dt.append(h("tr", null, h("td", { class: f.hiN === d.name ? "s-act" : "", style: { textAlign: "left" }, text: d.name }), h("td", { class: f.hiI === d.ino ? "s-cmp" : "", text: d.ino }))));
    const it = h("table", { class: "t grid" }, h("tr", null, ...["inode", "вид", "nlink", "отворен", "данни / път"].map((x) => h("th", { text: x }))));
    f.ino.forEach((x, i) => { if (!x.used && f.hiI !== i) return; it.append(h("tr", null, h("th", { text: i }), h("td", { class: f.hiI === i ? (x.used ? "s-act" : "s-swap") : "", text: x.used ? (x.sym ? "symlink" : "файл") : "освободен" }), h("td", { text: x.nlink }), h("td", { text: x.nopen }), h("td", { style: { textAlign: "left" }, text: x.used ? (x.sym ? "→ „" + x.data + "“" : x.data) : "" }))); });
    const ft = h("div", { class: "row" }, h("span", { class: "muted", text: "дескриптори:" }), ...(f.fds.some((x) => x >= 0) ? f.fds.map((x, i) => (x >= 0 ? h("span", { class: "pill s-piv", text: `fd ${i} → inode ${x}` }) : null)).filter(Boolean) : [h("span", { class: "muted", text: "няма" })]));
    st.append(h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, h("p", { class: "eyebrow", text: "директория" }), dt), h("div", { class: "tbl-wrap" }, h("p", { class: "eyebrow", text: "inode таблица" }), it)), h("div", { style: { marginTop: "8px" } }, ft));
  }

  function drawDisk(st, f) {
    st.innerHTML = "";
    const cls = {};
    const vals = f.used.map(() => "");
    f.used.forEach((u, i) => { if (u) { cls[i] = "s-dim"; vals[i] = "#"; } });
    (f.blocks || []).forEach((b, i) => { cls[b] = "s-act"; vals[b] = "d" + i; });
    if (f.ib >= 0 && f.ib != null) { cls[f.ib] = "s-piv"; vals[f.ib] = "idx"; }
    (f.path || []).forEach((b) => { cls[b] = "s-done"; });
    const rows = [0, 16].map((s) => {
      const box = h("div", { style: { overflowX: "auto" } });
      S.drawArray(box, vals.slice(s, s + 16), { cls: Object.fromEntries(Object.entries(cls).filter(([i]) => i >= s && i < s + 16).map(([i, c]) => [i - s, c])), label: (k) => k + s });
      return box;
    });
    st.append(...rows);
    if (f.method === "linked" && f.blocks && f.blocks.length) {
      const t = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "блок" }), ...f.blocks.map((b) => h("th", { text: b }))), h("tr", null, h("th", { text: "следващ" }), ...f.blocks.map((b, i) => h("td", { class: f.path && f.path.includes(b) ? "s-done" : "", text: i + 1 < f.blocks.length ? f.blocks[i + 1] : "край" }))));
      st.append(h("p", { class: "muted", style: { marginTop: "6px", fontSize: ".85rem" }, html: "Указателите „следващ“ — събрани в отделна таблица, това е идеята на FAT <span class=\"extra-tag\">извън конспекта</span>:" }), h("div", { class: "tbl-wrap" }, t));
    }
    if (f.method === "indexed" && f.blocks && f.blocks.length) {
      const t = h("table", { class: "t grid" }, h("tr", null, h("th", { text: `индексен блок ${f.ib}: запис` }), ...f.blocks.map((_, i) => h("th", { text: i }))), h("tr", null, h("th", { text: "блок с данни" }), ...f.blocks.map((b, i) => h("td", { class: i === f.k && f.path ? "s-done" : "", text: b }))));
      st.append(h("div", { class: "tbl-wrap", style: { marginTop: "6px" } }, t));
    }
    if (f.bad) st.append(h("p", { class: "warn", text: "Файлът не може да се разположи с този метод." }));
  }

  /* журнал — стъпков модел без C код */
  const JSTEPS = [
    { t: "Начало", d: "Операция „премести файл“ трябва да промени два блока метаданни: изтрива име от директория A и добавя име в директория B." },
    { t: "Запис в журнала", d: "Описанието на промените се записва в журнала." },
    { t: "Потвърждение (commit)", d: "Записът в журнала се отбелязва като завършен." },
    { t: "Прилагане: директория A", d: "Името се премахва от A на мястото му." },
    { t: "Прилагане: директория B", d: "Името се добавя в B." },
    { t: "Изчистване", d: "Журналният запис вече не е нужен." },
  ];
  function journalOutcome(crashAt) {
    if (crashAt === 0 || crashAt > 5) return { state: "ok", text: "Няма срив — операцията завършва, структурите са съгласувани." };
    if (crashAt <= 2) return { state: "old", text: "Срив преди потвърждението: при възстановяване непотвърденият запис се пренебрегва. Остава старото съгласувано състояние — файлът е в A." };
    if (crashAt <= 5) return { state: "new", text: "Срив след потвърждението: при възстановяване записът от журнала се възпроизвежда и операцията се довършва. Ново съгласувано състояние — файлът е в B." };
  }

  const html = `
<div class="prose">
  <p><dfn data-g="файлова система">Файловата система</dfn> организира устойчиви данни като файлове, директории и метаданни. Типични операции са създаване, отваряне, четене, запис, позициониране и изтриване. <dfn data-g="файлов дескриптор">Дескрипторът за отворен файл</dfn> е управляван от ОС идентификатор, свързан с достъп и състояние; той не е самото съдържание на файла.</p>
  <p>Директорията съпоставя имена с файлови обекти. При <dfn data-g="inode">inode</dfn> организацията името е в директорията, а inode пази метаданни и информация за блоковете. Наличните възможности и ограничения зависят от конкретната файлова система.</p>
</div>

<div class="block">
  <h3>Схема 19 · Име, inode, твърда и символна връзка, дескриптор</h3>
  <p class="muted">Команди, разделени с „;“: <code>c име данни</code> — създай; <code>l старо ново</code> — твърда връзка; <code>s цел име</code> — символна връзка; <code>u име</code> — изтрий име; <code>o име</code> — отвори; <code>x fd</code> — затвори. Моделът следва Unix-подобна семантика.</p>
  <div id="v-fs"></div>
  <details class="hint"><summary>Хинт: защо изтриване на име не е непременно освобождаване на данните</summary><div>
    <p>Когато име бъде изтрито, отворен файл в Unix-подобна система може да остане достъпен през съществуващия отворен достъп. Последната директория и последният отворен достъп имат различни роли за живота на обекта: inode се освобождава едва когато nlink = 0 <b>и</b> няма отворени дескриптори. Пусни „Отворен и изтрит“.</p>
  </div></details>
  <details class="trap"><summary>Капан: символната връзка е „още едно име“</summary><div>
    <p>Символната връзка е отделен обект с път към цел, а не още едно име на същия обект. Затова може да сочи към вече несъществуващо име („висяща“). Твърдата връзка е друго име на същия inode — изтриването на оригиналното име не я засяга.</p>
  </div></details>
</div>

<div class="block">
  <h3>Разпределение на блокове</h3>
  <p class="prose">Блоковете могат да се разпределят непрекъснато, чрез списък, индекси или екстенти. Изборът влияе върху произволния достъп, разрастването и фрагментацията. По-долу: колко четения са нужни, за да се стигне до логически блок k.</p>
  <div id="v-alloc"></div>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Метод</th><th>Произволен достъп до блок k</th><th>Разрастване</th><th>Фрагментация</th></tr>
    <tr><td>Непрекъснато</td><td>1 четене (начало + k)</td><td>трудно — съседите може да са заети</td><td>външна</td></tr>
    <tr><td>Свързано (списък)</td><td>k + 1 четения по указателите</td><td>лесно</td><td>няма външна</td></tr>
    <tr><td>Индексно</td><td>индексен блок + блок с данни</td><td>лесно, до размера на индекса</td><td>няма външна; цена — индексният блок</td></tr>
  </table></div>
  <p class="muted" style="font-size:.85rem">Таблицата е класическото сравнение на трите метода <span class="extra-tag">извън конспекта</span>; екстентите (поредици от блокове) съчетават непрекъснатост и индекс.</p>
</div>

<div class="block">
  <h3>Кеш, журнал и резервно копие</h3>
  <p class="prose">Кеширането ускорява операциите, но успешният запис към кеша не е непременно физически устойчив запис върху носителя. <dfn data-g="журнал">Журналът</dfn> записва информация за измененията с цел възстановяване на съгласуваността след срив. Дали се журналират само метаданни или и данни зависи от режима.</p>
  <h4>Схема 20 · Журнал и възстановяване след срив</h4>
  <p class="muted">Избери момент на срив. Схемата е логически модел; точният ред и обхват зависят от файловата система и режима.</p>
  <div class="row" id="j-btns"></div>
  <ol class="prose" id="j-steps" style="padding-left:1.3em"></ol>
  <div class="key" id="j-out"></div>
  <details class="trap"><summary>Капан: журнал = резервно копие</summary><div>
    <p>Журналът възстановява определена структурна съгласуваност; резервното копие пази предишни данни. Журналът може съвсем правилно да възпроизведе погрешно изтриване и следователно не замества историята за възстановяване.</p>
  </div></details>
  <details class="trap"><summary>Капан: write() върна успех → данните са на диска</summary><div>
    <p>Успехът на запис може да означава, че данните са приети в буфер (виж <a href="#sastav">раздел 1</a>). Устойчивостта при срив зависи от синхронизирането, файловата система, устройството и техните гаранции.</p>
  </div></details>
</div>

<div class="block">
  <h3>Реални файлови системи</h3>
  <p class="prose">ext4 и XFS в Linux; NTFS в Windows; APFS в системи на Apple; FAT32 и exFAT за обменяеми носители. Това са <b>файлови системи, а не операционни системи</b>.</p>
</div>

<div class="key"><b>За запомняне.</b> Име — в директорията; inode — обектът и метаданните; дескриптор — отворен достъп. Твърда връзка — второ име; символна — отделен обект с път. Обектът живее, докато има име или отворен достъп. Кеш ≠ устойчивост; журнал ≠ резервно копие.</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-fs"), {
      id: "fs", title: "Директория, inode и дескриптори", sub: "Синьо — засегнат запис; оранжево — inode на името.",
      code: "s08_inode",
      inputs: [{ id: "script", label: "Команди (с ;)", value: "c a.txt hello; l a.txt b.txt; u a.txt; o b.txt", width: "min(28em, 78vw)" }],
      presets: [{ label: "Твърда връзка", values: { script: "c a.txt hello; l a.txt b.txt; u a.txt; o b.txt" } }, { label: "Висяща символна", values: { script: "c a.txt hello; s a.txt s.lnk; u a.txt; o s.lnk" } },
        { label: "Отворен и изтрит", values: { script: "c a.txt hello; o a.txt; u a.txt; x 0" } }, { label: "Две имена + fd", values: { script: "c f x; l f g; o g; u f; u g; x 0; o g" } }],
      legend: [["s-act", "засегнат"], ["s-cmp", "inode на името"], ["s-swap", "освободен"], ["s-piv", "дескриптор"]],
      build: algos.fs, draw: drawFS,
    });
    S.viz(root.querySelector("#v-alloc"), {
      id: "alloc", title: "Разполагане на файл и достъп до блок k", sub: "Зелено — блоковете, които се четат, за да се стигне до блок k.",
      code: "s08_alloc",
      inputs: [{ id: "disk", label: "Диск (# зает, . свободен)", value: "##..#...##.###.....#..##.#......", width: "22em" },
        { id: "method", label: "Метод", type: "select", value: "linked", options: Object.keys(MN).map((k) => [k, MN[k]]) },
        { id: "n", label: "Блокове", type: "number", value: 5, width: "5em" }, { id: "k", label: "k", type: "number", value: 3, width: "4em" }],
      presets: [{ label: "8 блока непрекъснато", values: { method: "contig", n: 8, k: 7 } }, { label: "8 блока индексно", values: { method: "indexed", n: 8, k: 7 } }],
      legend: [["s-dim", "зает"], ["s-act", "блок на файла"], ["s-piv", "индексен блок"], ["s-done", "четене"]],
      build: algos.alloc, draw: drawDisk,
    });

    // журнал
    const jb = root.querySelector("#j-btns"), js = root.querySelector("#j-steps"), jo = root.querySelector("#j-out");
    const opts = [[0, "без срив"], [1, "след стъпка 1"], [2, "след стъпка 2"], [3, "след commit"], [4, "след стъпка 4"], [5, "след стъпка 5"]];
    const btns = opts.map(([v, t]) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pick(v) }, t));
    jb.append(h("span", { class: "muted", text: "срив:" }), ...btns);
    function pick(c) {
      btns.forEach((b, i) => b.setAttribute("aria-pressed", opts[i][0] === c ? "true" : "false"));
      js.innerHTML = "";
      JSTEPS.forEach((s, i) => js.append(h("li", { class: c && i + 1 > c ? "muted" : "", style: c && i + 1 > c ? { textDecoration: "line-through" } : null }, h("b", { text: s.t + ": " }), s.d, c === i + 1 ? h("span", { class: "pill s-swap", style: { marginLeft: "8px" }, text: "СРИВ" }) : null)));
      const o = journalOutcome(c);
      jo.innerHTML = `<p><b>${o.state === "ok" ? "Няма срив" : o.state === "old" ? "Старо състояние" : "Ново състояние"}</b> — ${o.text}</p><p class="muted">И в двата случая структурите са съгласувани: файлът не е „и в двете“, нито „в никоя“ директория.</p>`;
    }
    pick(3);
  }

  S.chapter({ id: "fs", order: 8, num: "8", group: "Файлове", title: "Файлови системи", lead: "Файл, директория, метаданни, inode, твърда и символна връзка, дескриптор; непрекъснато, свързано и индексно разпределение; кеш, журнал, резервно копие.", html, mount, algos });
})();
