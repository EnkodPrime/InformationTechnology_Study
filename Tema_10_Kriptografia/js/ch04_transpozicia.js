/* Раздел 4 — Методи с разбъркване: колонна (и двойна) транспозиция, железопътна ограда, маршрут. */
(function () {
  const S = window.Study, h = S.h;

  function parseOrder(s) {
    const o = String(s).split(/[\s,;]+/).filter(Boolean).map((t) => {
      const v = Number(t);
      if (!Number.isInteger(v)) throw new Error(`„${t}“ не е цяло число.`);
      return v;
    });
    if (o.length < 2 || o.length > 9) throw new Error("Ключът трябва да има от 2 до 9 числа (номера на колони).");
    const w = o.length;
    const seen = new Set(o);
    if (seen.size !== w || o.some((v) => v < 1 || v > w)) throw new Error(`Ключът трябва да е пермутация на 1…${w} (всяко число точно веднъж).`);
    return o.map((v) => v - 1);
  }

  const algos = {
    /** колонна транспозиция — col_encrypt / col_decrypt от c/04_transposition.c */
    columnar({ alpha, text, key, mode, pad }) {
      const al = T10.get(alpha), order = parseOrder(key), w = order.length;
      const usePad = pad === true || pad === "true" || pad === 1;
      const F = [];
      if (mode === "dec") {
        const c = T10.encode(al, text, { maxLen: 60, minLen: 1, what: "Шифротекстът" });
        const n = c.length, rows = Math.floor(n / w), extra = n % w, R = Math.ceil(n / w);
        const grid = new Array(n).fill(null);
        F.push({ at: "len", grid: grid.slice(), w, n, R, order, c, j: 0, vars: { n, w, rows, extra }, msg: `n = ${n}, w = ${w} ⇒ ${rows} пълни реда${extra ? `, а първите <b>${extra}</b> колони имат по още една буква` : ""}. Получателят трябва да знае това правило — без него блоковете не могат да се отрежат.` });
        let j = 0;
        for (let r = 0; r < w; r++) {
          const col = order[r], hgt = rows + (col < extra ? 1 : 0);
          F.push({ at: ["col", "h"], grid: grid.slice(), w, n, R, order, c, j, col, r, vars: { r, col: col + 1, h: hgt }, msg: `${r + 1}-ият блок (${hgt} букви: ${T10.decode(al, c.slice(j, j + hgt))}) отива в колона <b>${col + 1}</b>.`, log: `блок ${r + 1} → колона ${col + 1}` });
          for (let k = 0; k < hgt; k++) {
            grid[k * w + col] = c[j];
            F.push({ at: "write", grid: grid.slice(), w, n, R, order, c, j, col, r, cell: k * w + col, vars: { r, col: col + 1, k, "c[j]": al.L[c[j]] }, msg: `c[${j}] = ${al.L[c[j]]} → ред ${k}, колона ${col + 1}.` });
            j++;
          }
        }
        F.push({ at: "done", grid, w, n, R, order, c, j, done: true, msg: `Четем по редове: <b>${T10.decode(al, grid)}</b>.` });
        return { frames: F, result: T10.decode(al, grid) };
      }
      const p = T10.encode(al, text, { maxLen: 60, minLen: 1, what: "Откритият текст" });
      const n = p.length;
      let len = n;
      if (usePad) while (len % w) len++;
      const R = Math.ceil(len / w);
      const grid = p.concat(new Array(len - n).fill(al.pad));
      const out = [];
      F.push({ at: "pad", grid, n, len, w, R, order, out: [], vars: { n, w, len }, msg: `Записваме ${n} букви по редове в ширина ${w}: ${R} реда. ${len > n ? `Допълваме с <b>${al.L[al.pad]}</b> до ${len} — получателят трябва да знае, че ги има.` : n % w ? `Последният ред е <b>непълен</b> (${n % w} от ${w}) — колоните са с различна дължина.` : "Последният ред е пълен."}` });
      for (let r = 0; r < w; r++) {
        const col = order[r];
        F.push({ at: "col", grid, n, len, w, R, order, out: out.slice(), col, r, vars: { r, col: col + 1 }, msg: `Ключът казва: ${r + 1}-а по ред се чете колона <b>${col + 1}</b>.`, log: `колона ${col + 1}` });
        for (let i = col; i < len; i += w) {
          out.push(grid[i]);
          F.push({ at: ["read", "cell"], grid, n, len, w, R, order, out: out.slice(), col, r, cell: i, vars: { r, col: col + 1, i, буква: al.L[grid[i]] }, msg: `Клетка ${i} (ред ${Math.floor(i / w)}) → „${al.L[grid[i]]}“${i >= n ? " (допълване)" : ""}.` });
        }
      }
      F.push({ at: "done", grid, n, len, w, R, order, out, done: true, msg: `Шифротекст: <b>${T10.decode(al, out)}</b>. Броят на всяка буква е същият като в открития текст.` });
      return { frames: F, result: T10.decode(al, out) };
    },

    /** двойна транспозиция — два прохода колонна, после обратно */
    double({ alpha, text, key1, key2 }) {
      const al = T10.get(alpha);
      const a = algos.columnar({ alpha, text, key: key1, mode: "enc", pad: false }).result;
      const b = algos.columnar({ alpha, text: a, key: key2, mode: "enc", pad: false }).result;
      const d1 = algos.columnar({ alpha, text: b, key: key2, mode: "dec" }).result;
      const d2 = algos.columnar({ alpha, text: d1, key: key1, mode: "dec" }).result;
      const p = T10.decode(al, T10.encode(al, text));
      const st = [
        { at: "col", stage: 0, a, b, d1, d2, p, msg: `Открит текст: <b>${p}</b>.` },
        { at: "col", stage: 1, a, b, d1, d2, p, msg: `1-ви проход с ключ ${key1}: <b>${a}</b>.` },
        { at: "col", stage: 2, a, b, d1, d2, p, msg: `2-ри проход с ключ ${key2} върху резултата: <b>${b}</b>.` },
        { at: "col", stage: 3, a, b, d1, d2, p, msg: `Дешифриране в <b>обратен ред</b>: първо ключ ${key2} → ${d1}.` },
        { at: "done", stage: 4, a, b, d1, d2, p, done: true, msg: `После ключ ${key1} → <b>${d2}</b>. ${d2 === p ? "Съвпада с открития текст." : ""} Зависимостите са по-сложни, но честотите отново са непокътнати.` },
      ];
      return { frames: st, result: b, back: d2 };
    },

    /** железопътна ограда — rail_encrypt / rail_decrypt */
    rail({ alpha, text, rails, mode }) {
      const al = T10.get(alpha);
      rails = S.int(rails, 1, 8, "Броят редове");
      const x = T10.encode(al, text, { maxLen: 48, minLen: 1 });
      const n = x.length, F = [];
      const cyc = 2 * (rails - 1);
      const railOf = (i) => (rails === 1 ? 0 : (i % cyc) < rails ? i % cyc : cyc - (i % cyc));
      const rr = Array.from({ length: n }, (_, i) => railOf(i));
      if (mode === "dec") {
        const p = new Array(n).fill(null);
        let j = 0;
        F.push({ at: "drow", rr, p: p.slice(), x, rails, n, j, vars: { rails, n }, msg: `Първо пресмятаме зигзага (същите ${n} позиции), за да знаем колко букви има всеки ред. После пълним ред по ред с поредните букви на шифротекста.` });
        for (let r = 0; r < rails; r++) {
          F.push({ at: "drow", rr, p: p.slice(), x, rails, n, j, r, vars: { r, j }, msg: `Ред ${r}: ${rr.filter((v) => v === r).length} позиции.`, log: `ред ${r}` });
          for (let i = 0; i < n; i++) if (rr[i] === r) {
            p[i] = x[j];
            F.push({ at: ["put", "dscan"], rr, p: p.slice(), x, rails, n, j, r, i, vars: { r, i, j, буква: al.L[x[j]] }, msg: `Позиция ${i} е на ред ${r} → взимаме c[${j}] = ${al.L[x[j]]}.` });
            j++;
          }
        }
        F.push({ at: "drow", rr, p, x, rails, n, j, done: true, msg: `Четем позициите отляво надясно: <b>${T10.decode(al, p)}</b>.` });
        return { frames: F, result: T10.decode(al, p) };
      }
      const out = [];
      F.push({ at: "zig", rr, x, rails, n, out: [], showZig: true, vars: { rails, cyc }, msg: `Зигзаг с ${rails} реда: ${rr.slice(0, Math.min(n, cyc * 2 || n)).join(",")}… (период ${cyc || 1}). Всяка позиция получава ред.` });
      for (let r = 0; r < rails; r++) {
        F.push({ at: "row", rr, x, rails, n, out: out.slice(), r, vars: { r }, msg: `Четем ред ${r}.`, log: `ред ${r}` });
        for (let i = 0; i < n; i++) if (rr[i] === r) {
          out.push(x[i]);
          F.push({ at: ["take", "scan"], rr, x, rails, n, out: out.slice(), r, i, vars: { r, i, буква: al.L[x[i]] }, msg: `Позиция ${i} → „${al.L[x[i]]}“.` });
        }
      }
      F.push({ at: "row", rr, x, rails, n, out, done: true, msg: `Шифротекст: <b>${T10.decode(al, out)}</b>.` });
      return { frames: F, result: T10.decode(al, out) };
    },

    /** маршрутна (спирала) — route_encrypt */
    route({ alpha, text, w, mode }) {
      const al = T10.get(alpha);
      w = S.int(w, 2, 8, "Ширината");
      const x = T10.encode(al, text, { maxLen: 48, minLen: 1 });
      const n = x.length, F = [];
      if (mode === "dec" && n % w) throw new Error(`При дешифриране дължината (${n}) трябва да е кратна на ширината ${w}.`);
      const R = Math.ceil(n / w), len = R * w;
      const path = [];
      let top = 0, bot = R - 1, lef = 0, rig = w - 1;
      while (top <= bot && lef <= rig) {
        for (let q = lef; q <= rig; q++) path.push([top * w + q, "right"]);
        for (let r = top + 1; r <= bot; r++) path.push([r * w + rig, "down"]);
        if (top < bot) for (let q = rig - 1; q >= lef; q--) path.push([bot * w + q, "left"]);
        if (lef < rig) for (let r = bot - 1; r > top; r--) path.push([r * w + lef, "up"]);
        top++; bot--; lef++; rig--;
      }
      const DIR = { right: "→", down: "↓", left: "←", up: "↑" };
      if (mode === "dec") {
        const grid = new Array(len).fill(null);
        F.push({ at: "ring", grid: grid.slice(), w, R, path, k: -1, out: [], dec: true, msg: `Попълваме таблица ${R} × ${w} по същата спирала с буквите на шифротекста.` });
        path.forEach(([cell, d], k) => { grid[cell] = x[k]; F.push({ at: d, grid: grid.slice(), w, R, path, k, cell, dec: true, msg: `${DIR[d]} c[${k}] = ${al.L[x[k]]} → клетка ${cell}.` }); });
        F.push({ at: "shrink", grid, w, R, path, k: path.length, dec: true, done: true, msg: `Четем по редове: <b>${T10.decode(al, grid)}</b>.` });
        return { frames: F, result: T10.decode(al, grid) };
      }
      const grid = x.concat(new Array(len - n).fill(al.pad));
      const out = [];
      F.push({ at: "ring", grid, w, R, path, k: -1, out: [], n, msg: `Записваме по редове в ${R} × ${w}${len > n ? `, допълваме с ${al.L[al.pad]}` : ""}. Маршрутът е спирала по часовниковата стрелка от горния ляв ъгъл.` });
      path.forEach(([cell, d], k) => { out.push(grid[cell]); F.push({ at: d, grid, w, R, path, k, cell, out: out.slice(), n, msg: `${DIR[d]} клетка ${cell} → „${al.L[grid[cell]]}“.` }); });
      F.push({ at: "shrink", grid, w, R, path, k: path.length, out, n, done: true, msg: `Шифротекст: <b>${T10.decode(al, out)}</b>. Ключът е маршрутът + размерът на таблицата.` });
      return { frames: F, result: T10.decode(al, out) };
    },
  };

  const html = `
<div class="prose">
  <p>При <dfn data-g="колонна транспозиция">колонна транспозиция</dfn> текстът се записва по редове в правоъгълник и се прочита по колони в ред, определен от ключ. Нека текстът е ATTACKATDAWN и ширината е 4. Редовете са ATTA, CKAT и DAWN; колоните отляво надясно са ACD, TKA, TAW и ATN.</p>
  <p>Ако ключовият ред на колоните е 3, 1, 4, 2, прочитаме TAW | ACD | ATN | TKA и получаваме <b>TAWACDATNTKA</b>. За дешифриране разделяме текста на четири блока по три букви, връщаме ги в съответните колони и четем редовете.</p>
</div>

<div class="block">
  <h3>Схема 4. Колонна транспозиция с ключов ред 3 1 4 2</h3>
  <div id="v-col"></div>
  <details class="hint"><summary>Хинт: как да чета ключа „3 1 4 2“</summary><div>
    <p>В тази страница ключът е <b>редът на четене</b>: първо се чете колона 3, после 1, 4, 2 — точно както в ръководството. В литературата ключът често се дава като дума (напр. ZEBRA), а редът на колоните е азбучният ред на буквите ѝ; това е друга форма на записа на същата пермутация. Внимание: числата, които ключовата дума дава <b>над колоните</b> (рангът на всяка колона), са <b>обратната</b> пермутация на реда на четене — редът на четене 3 1 4 2 съответства на номера над колоните 2 4 1 3 (в схемата са в скоби).</p>
  </div></details>
</div>

<div class="block">
  <h3>Транспозицията трябва да има точен обратен договор</h3>
  <p class="prose">Ако последният ред е непълен, не всяка колона има еднаква дължина. Получателят трябва да знае дължината и правилото за запълване или за липсващите клетки. Пусни горния визуализатор с „WEAREDISCOVERED“ (15 букви, ширина 4) веднъж без и веднъж с допълване и дешифрирай и двата резултата.</p>
  <details class="trap"><summary>Капан: „допълвам с произволни букви — получателят ще се досети“</summary><div>
    <p>Добавяне на произволни символи без разграничение може да направи възстановяването двусмислено: при допълване с X дешифрираното WEAREDISCOVEREDX не казва дали X е част от съобщението. Всяко обратимо преобразуване има <b>договор за формат</b>, не само красива схема на стрелки.</p>
  </div></details>
  <div class="key"><b>Конкретна транспозиция</b><p>ATTACK по редове в таблица 2 × 3: ATT / ACK. Прочитът по колони дава <b>AATCTK</b> (ключ „1 2 3“). Позициите се сменят, броят на всеки символ се запазва.</p></div>
</div>

<div class="block">
  <h3>Двойна транспозиция</h3>
  <p class="prose">Двойната транспозиция усложнява зависимостите, но не предоставя съвременна обща гаранция за защита. Дешифрирането прилага обратните преобразувания в обратен ред.</p>
  <div id="v-dbl"></div>
</div>

<div class="block">
  <h3>Схема 5. Железопътна ограда с три реда</h3>
  <p class="prose"><dfn data-g="железопътна ограда">Rail fence</dfn> записва буквите по зигзаг между редове и ги прочита по редове. За три реда позициите вървят 0, 1, 2, 1, 0, … За ATTACKATDAWN прочитът на редовете дава <b>ACDTAKTANTAW</b>.</p>
  <div id="v-rail"></div>
  <details class="trap"><summary>Капан: „името на шифъра стига за дешифриране“</summary><div>
    <p>Ако броят редове е същият, но началният ред или посоката са други, резултатът може да се промени. Самото име на шифъра не заменя параметрите. Тук началото е ред 0 и посоката е надолу.</p>
  </div></details>
</div>

<div class="block">
  <h3>Маршрутно разместване <span class="extra-tag">извън конспекта</span></h3>
  <p class="prose">Ръководството само назовава <dfn data-g="маршрутно разместване">маршрутното разместване</dfn>. Показан е един възможен маршрут — спирала по часовниковата стрелка; маршрутът и размерът на таблицата са част от ключа.</p>
  <div id="v-route"></div>
</div>

<div class="key"><b>Анализ на транспозицията</b><p>Транспозицията запазва честотите, но разрушава част от съседствата. Анализът използва езикови модели, вероятни думи и изпробване на разположения (напр. различни ширини, докато редовете станат четими).</p></div>`;

  function mount(root) {
    const drawGrid = (st, cells, w, R, opts = {}) => {
      const t = h("table", { class: "t grid" });
      if (opts.head) t.append(h("tr", null, ...Array.from({ length: w }, (_, c) => h("th", { class: opts.headCls?.[c] || "", text: opts.head(c) }))));
      for (let r = 0; r < R; r++) {
        const tr = h("tr");
        for (let c = 0; c < w; c++) {
          const i = r * w + c;
          tr.append(h("td", { class: (opts.cls && opts.cls(i, c)) || "", text: i < cells.length && cells[i] != null ? cells[i] : opts.empty ?? "" }));
        }
        t.append(tr);
      }
      st.append(h("div", { class: "tbl-wrap" }, t));
    };

    S.viz(root.querySelector("#v-col"), {
      id: "col", title: "Колонна транспозиция — запис по редове, прочит по колони", sub: "Над всяка колона е номерът ѝ и (в скоби) кога се чете.",
      code: (i) => (i.mode === "dec" ? "ch04_col_dec" : "ch04_col_enc"),
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "15em" }, { id: "key", label: "Ред на колоните", value: "3 1 4 2", width: "8em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }, { id: "pad", label: "допълвай", type: "checkbox", value: false }],
      presets: [
        { label: "дешифрирай TAWACDATNTKA", values: { alpha: "lat", text: "TAWACDATNTKA", key: "3 1 4 2", mode: "dec" } },
        { label: "ATTACK, 1 2 3", values: { alpha: "lat", text: "ATTACK", key: "1 2 3", mode: "enc", pad: false } },
        { label: "непълен ред", values: { alpha: "lat", text: "WEAREDISCOVERED", key: "3 1 4 2", mode: "enc", pad: false } },
        { label: "бълг., 2 5 3 1 4", values: { alpha: "bg", text: "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", key: "2 5 3 1 4", mode: "enc", pad: false } },
      ],
      legend: [["s-act", "текуща клетка"], ["s-cmp", "текуща колона"], ["s-piv", "допълване"], ["s-done", "прочетено / записано"]],
      build: algos.columnar,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), w = f.w;
        const when = []; f.order.forEach((c, r) => (when[c] = r + 1));
        if (I.mode === "dec") {
          const blocks = {}; // позиция в c → оцветяване
          for (let k = 0; k < f.j; k++) blocks[k] = "s-done";
          if (f.cell != null) blocks[f.j] = "s-act";
          T10.strip(st, f.c.map((v) => al.L[v]), { title: "шифротекст", cls: blocks, small: f.n > 16 });
          drawGrid(st, f.grid.map((v) => (v == null ? null : al.L[v])), w, f.R, {
            head: (c) => `${c + 1} (${when[c]})`, headCls: f.col != null ? { [f.col]: "s-cmp" } : {},
            cls: (i, c) => (i >= f.n ? "s-dim" : i === f.cell ? "s-act" : f.col === c ? "s-cmp" : f.grid[i] != null ? "s-done" : ""),
          });
          return;
        }
        const readSet = new Set();
        let cnt = f.out.length;
        for (let r = 0; r < w && cnt > 0; r++) for (let i = f.order[r]; i < f.len && cnt > 0; i += w) { readSet.add(i); cnt--; }
        drawGrid(st, f.grid.map((v) => al.L[v]), w, f.R, {
          head: (c) => `${c + 1} (${when[c]})`, headCls: f.col != null ? { [f.col]: "s-cmp" } : {},
          cls: (i, c) => (i >= f.len ? "s-dim" : i === f.cell ? "s-act" : i >= f.n ? "s-piv" : f.col === c ? "s-cmp" : readSet.has(i) ? "s-done" : ""),
        });
        if (f.out.length) T10.strip(st, f.out.map((v) => al.L[v]), { append: true, title: "шифротекст", small: f.out.length > 16, cls: f.done ? Object.fromEntries(f.out.map((_, k) => [k, "s-done"])) : { [f.out.length - 1]: "s-act" } });
      },
    });

    S.viz(root.querySelector("#v-dbl"), {
      id: "dbl", title: "Двойна транспозиция", sub: "Два прохода колонна транспозиция без допълване; обратно — в обратен ред.",
      code: "ch04_col_enc",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "15em" }, { id: "key1", label: "ключ 1", value: "3 1 4 2", width: "7em" }, { id: "key2", label: "ключ 2", value: "3 1 2", width: "7em" }],
      legend: [["s-act", "текущ етап"], ["s-done", "върнат открит текст"]],
      build: algos.double,
      draw(st, f) {
        st.innerHTML = "";
        const rows = [["открит текст", f.p], ["след ключ 1", f.a], ["след ключ 2 = шифротекст", f.b], ["обратно с ключ 2", f.d1], ["обратно с ключ 1", f.d2]];
        rows.forEach(([t, s], k) => { if (k <= f.stage) T10.strip(st, [...s], { append: true, title: t, small: s.length > 16, cls: k === f.stage ? Object.fromEntries([...s].map((_, q) => [q, k === 4 ? "s-done" : "s-act"])) : {} }); });
      },
    });

    S.viz(root.querySelector("#v-rail"), {
      id: "rail", title: "Железопътна ограда (rail fence)", sub: "Зигзагът започва от ред 0 надолу.",
      code: "ch04_rail",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "15em" }, { id: "rails", label: "редове", type: "number", value: 3, width: "5em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "дешифрирай ACDTAKTANTAW", values: { alpha: "lat", text: "ACDTAKTANTAW", rails: 3, mode: "dec" } }, { label: "2 реда", values: { alpha: "lat", text: "ATTACKATDAWN", rails: 2, mode: "enc" } }, { label: "бълг., 3 реда", values: { alpha: "bg", text: "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", rails: 3, mode: "enc" } }],
      legend: [["s-act", "текуща позиция"], ["s-cmp", "текущ ред"], ["s-done", "обработено"]],
      build: algos.rail,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), n = f.n, dec = I.mode === "dec";
        const t = h("table", { class: "t grid" });
        t.append(h("tr", null, h("th", { text: "ред" }), ...Array.from({ length: n }, (_, i) => h("th", { text: i }))));
        const used = new Set();
        if (!dec) { let c = f.out.length; for (let r = 0; r < f.rails && c > 0; r++) for (let i = 0; i < n && c > 0; i++) if (f.rr[i] === r) { used.add(i); c--; } }
        for (let r = 0; r < f.rails; r++) {
          const tr = h("tr", null, h("th", { class: f.r === r ? "s-cmp" : "", text: r }));
          for (let i = 0; i < n; i++) {
            let txt = "", cls = "";
            if (f.rr[i] === r) {
              txt = dec ? (f.p[i] != null ? al.L[f.p[i]] : "•") : al.L[f.x[i]];
              cls = i === f.i ? "s-act" : (dec ? f.p[i] != null : used.has(i)) ? "s-done" : f.r === r ? "s-cmp" : "";
            }
            tr.append(h("td", { class: cls, text: txt }));
          }
          t.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, t));
        if (dec) T10.strip(st, f.x.map((v) => al.L[v]), { append: true, title: "шифротекст", small: n > 16, cls: Object.fromEntries(Array.from({ length: f.j }, (_, k) => [k, "s-done"])) });
        else if (f.out.length) T10.strip(st, f.out.map((v) => al.L[v]), { append: true, title: "шифротекст", small: n > 16, cls: f.done ? Object.fromEntries(f.out.map((_, k) => [k, "s-done"])) : {} });
      },
    });

    S.viz(root.querySelector("#v-route"), {
      id: "route", title: "Маршрут: спирала", sub: "Номерът в ъгъла на клетката е поредността в маршрута.",
      code: "ch04_route",
      inputs: [T10.alphaField(), { id: "text", label: "Текст", value: "ATTACKATDAWN", width: "15em" }, { id: "w", label: "ширина", type: "number", value: 4, width: "5em" }, { id: "mode", label: "Посока", type: "select", value: "enc", options: [["enc", "шифровай"], ["dec", "дешифрирай"]] }],
      presets: [{ label: "дешифрирай ATTATNWADCKA", values: { alpha: "lat", text: "ATTATNWADCKA", w: 4, mode: "dec" } }, { label: "15 букви, ширина 4", values: { alpha: "lat", text: "WEAREDISCOVERED", w: 4, mode: "enc" } }],
      legend: [["s-act", "текуща клетка"], ["s-done", "обходена"], ["s-piv", "допълване"]],
      build: algos.route,
      draw(st, f, { inputs: I }) {
        st.innerHTML = "";
        const al = T10.get(I.alpha), order = {};
        f.path.forEach(([c], k) => (order[c] = k));
        const t = h("table", { class: "t grid" });
        for (let r = 0; r < f.R; r++) {
          const tr = h("tr");
          for (let c = 0; c < f.w; c++) {
            const i = r * f.w + c, k = order[i];
            const val = f.grid[i] == null ? "" : al.L[f.grid[i]];
            const cls = i === f.cell ? "s-act" : k <= f.k ? "s-done" : !f.dec && i >= f.n ? "s-piv" : "";
            tr.append(h("td", { class: cls }, h("sup", { class: "muted", style: { fontSize: "9px", marginRight: "3px" }, text: k }), val));
          }
          t.append(tr);
        }
        st.append(h("div", { class: "tbl-wrap" }, t));
        if (f.out && f.out.length) T10.strip(st, f.out.map((v) => al.L[v]), { append: true, title: "шифротекст", small: f.out.length > 16 });
      },
    });
  }

  S.chapter({ id: "transpozicia", order: 4, num: "4", group: "Класически методи", title: "Методи с разбъркване", lead: "Колонна транспозиция с ключ, непълният ред и договорът за формат, двойна транспозиция, железопътна ограда, маршрут.", html, mount, algos });
})();
