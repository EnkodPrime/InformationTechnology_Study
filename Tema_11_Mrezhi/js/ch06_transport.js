/* Раздел 6 — Транспортни протоколи: TCP установяване/затваряне (машина на състоянията),
   поток срещу дейтаграми (рамкиране), надеждно предаване с прозорец, контрол на поток и задръстване. */
(function () {
  const S = window.Study, h = S.h;
  const SN = ["CLOSED", "LISTEN", "SYN_SENT", "SYN_RCVD", "ESTABLISHED", "FIN_WAIT_1", "FIN_WAIT_2", "CLOSE_WAIT", "LAST_ACK", "TIME_WAIT"];

  const algos = {
    /* Като tcp_session() в C */
    tcp({ x, y, n, listening }) {
      x = S.int(x, 0, 4294967000, "ISN на клиента"); y = S.int(y, 0, 4294967000, "ISN на сървъра"); n = S.int(n, 0, 100000, "Байтовете данни");
      const L = !!listening, F = [], segs = [];
      let cs = "CLOSED", ss = L ? "LISTEN" : "CLOSED";
      const st = (o) => F.push(Object.assign({ cs, ss, segs: segs.slice() }, o));
      const seg = (dir, flags, seq, ack, len, at, msg, extra = {}) => {
        const sg = { dir, flags, seq, ack, len };
        segs.push(sg);
        st(Object.assign({ at, sg, msg, vars: { "C": cs, "S": ss, seq, ack }, log: `${dir} ${flags} seq=${seq} ack=${ack}${len ? " len=" + len : ""}` }, extra));
      };
      st({ at: "init", msg: L ? "Сървърът е отворил слушащ сокет (LISTEN). Клиентът е CLOSED." : "На този порт <b>няма</b> слушащ сокет.", vars: { C: cs, S: ss } });
      cs = "SYN_SENT";
      seg("C>S", "SYN", x, 0, 0, "syn", `Клиентът изпраща <dfn data-g="syn">SYN</dfn> с начален номер x = ${x}. SYN заема една позиция в последователността.`);
      if (!L) { cs = "CLOSED"; seg("S>C", "RST+ACK", 0, x + 1, 0, "rst", "Няма слушащ процес → сървърният хост отговаря с RST. Транспортът отказва — на ниво IP хостът е достижим."); return { frames: F, segs }; }
      ss = "SYN_RCVD";
      seg("S>C", "SYN+ACK", y, x + 1, 0, "synack", `Сървърът връща SYN+ACK: своя начален номер y = ${y} и потвърждение ack = x+1 = ${x + 1} („очаквам байт ${x + 1}“).`);
      cs = "ESTABLISHED";
      seg("C>S", "ACK", x + 1, y + 1, 0, "ack3", `Клиентът потвърждава y+1 = ${y + 1}. За него връзката е установена.`);
      ss = "ESTABLISHED";
      st({ at: "est", msg: "Сървърът получи ACK — и за двете страни състоянието е ESTABLISHED. Ръкостискането съгласува състояние, <b>не удостоверява</b> самоличност.", vars: { C: cs, S: ss }, inv: { text: "трипосочно ръкостискане завърши", ok: true } });
      if (n > 0) {
        seg("C>S", "PSH+ACK", x + 1, y + 1, n, "data", `Клиентът изпраща ${n} байта; seq = ${x + 1} е номерът на първия от тях.`);
        seg("S>C", "ACK", y + 1, x + 1 + n, 0, "dack", `Сървърът потвърждава: ack = ${x + 1} + ${n} = ${x + 1 + n} — следващата очаквана позиция.`);
      }
      const cf = x + 1 + n;
      cs = "FIN_WAIT_1";
      seg("C>S", "FIN+ACK", cf, y + 1, 0, "fin1", `Клиентът приключва изпращането: <dfn data-g="fin">FIN</dfn> с seq = ${cf}. FIN също заема позиция.`);
      ss = "CLOSE_WAIT";
      seg("S>C", "ACK", y + 1, cf + 1, 0, "finack1", `Сървърът потвърждава FIN (ack = ${cf + 1}). Половин затворена връзка: сървърът още може да изпраща.`);
      cs = "FIN_WAIT_2";
      st({ at: "fw2", msg: "Клиентът чака FIN от сървъра.", vars: { C: cs, S: ss } });
      ss = "LAST_ACK";
      seg("S>C", "FIN+ACK", y + 1, cf + 1, 0, "fin2", "Сървърното приложение също затваря: FIN от сървъра.");
      cs = "TIME_WAIT";
      seg("C>S", "ACK", cf + 1, y + 2, 0, "finack2", `Клиентът потвърждава (ack = ${y + 2}) и влиза в TIME_WAIT — изчаква 2·MSL, за да може да повтори последния ACK, ако се загуби, и закъснелите стари сегменти на тази връзка да изтекат.`);
      ss = "CLOSED";
      st({ at: "closed", done: true, msg: "Сървърът получава последния ACK → CLOSED. Клиентът ще затвори след изтичане на TIME_WAIT.", vars: { C: cs, S: ss } });
      return { frames: F, segs };
    },

    /* Като feed() в C: поток с префикс за дължина, нарязан на порции */
    frame({ msgs, cuts }) {
      const M = String(msgs).split(/[,\s]+/).filter(Boolean);
      if (!M.length) throw new Error("Въведи поне едно съобщение.");
      if (M.length > 8) throw new Error("Най-много 8 съобщения.");
      M.forEach((m) => { if (m.length > 20 || !/^[\x21-\x7e]+$/.test(m)) throw new Error(`„${m}“: до 20 видими ASCII символа.`); });
      const stream = []; M.forEach((m) => { stream.push(m.length); for (const c of m) stream.push(c.charCodeAt(0)); });
      const C = S.parseNums(cuts, { min: 1, max: 200, maxLen: 30, minLen: 1 });
      const tot = C.reduce((a, b) => a + b, 0);
      if (tot !== stream.length) throw new Error(`Сборът на порциите е ${tot}, а потокът е ${stream.length} байта.`);
      const F = [], buf = [], out = [], res = [];
      let pos = 0;
      F.push({ stream, pos, buf: [], out: [], msg: `Изпращачът извиква send() ${M.length} пъти. Всяко съобщение е предшествано от 1 байт дължина. Общо ${stream.length} байта в потока.` });
      C.forEach((c, k) => {
        const chunk = stream.slice(pos, pos + c); pos += c; buf.push(...chunk);
        F.push({ at: "append", stream, pos, chunk: c, buf: buf.slice(), out: out.slice(), msg: `recv() №${k + 1} връща ${c} байта. TCP не знае къде свършва съобщението — те просто се добавят в буфера.`, vars: { получени: c, буфер: buf.length } });
        const got = [];
        while (buf.length >= 1) {
          const L = buf[0];
          F.push({ at: "len", stream, pos, buf: buf.slice(), out: out.slice(), hl: 0, msg: `Първият байт в буфера казва: съобщение с дължина ${L}.`, vars: { L, буфер: buf.length } });
          if (buf.length - 1 < L) { F.push({ at: "wait", stream, pos, buf: buf.slice(), out: out.slice(), wait: true, msg: `Налични са само ${buf.length - 1} от ${L} байта — чакаме следващата порция.`, vars: { L, буфер: buf.length } }); break; }
          const m = String.fromCharCode(...buf.slice(1, 1 + L)); buf.splice(0, 1 + L); out.push(m); got.push(m);
          F.push({ at: ["msg", "shift"], stream, pos, buf: buf.slice(), out: out.slice(), newm: m, msg: `Цяло съобщение „<b>${S.esc(m)}</b>“ → предава се на приложението.`, vars: { буфер: buf.length }, log: `recv${k + 1}: „${m}“` });
        }
        res.push(`[${c}:${got.map((g) => " " + g).join("")} |${buf.length}]`);
      });
      F.push({ done: true, stream, pos, buf: buf.slice(), out: out.slice(), msg: `Получени ${out.length} съобщения — същите като изпратените, независимо как TCP е нарязал байтовете.`, stats: { "send()": M.length, "recv()": C.length, съобщения: out.length } });
      return { frames: F, res: res.join(" ") };
    },

    /* Като arq() в C */
    arq({ N, W, lost, mode }) {
      N = S.int(N, 1, 30, "Броят сегменти"); W = S.int(W, 1, 16, "Прозорецът");
      const LS = String(lost).trim() ? S.parseNums(lost, { min: 0, max: N - 1, maxLen: N }) : [];
      const sr = mode === "sr", lostA = Array(N).fill(0); LS.forEach((s) => (lostA[s] = 1));
      let base = 0, exp = 0, tx = 0, to = 0, round = 0;
      const got = Array(N).fill(0), sent = Array(N).fill(0), F = [], rows = [];
      const snap = (o) => F.push(Object.assign({ N, W, base, exp, got: got.slice(), rows: rows.map((r) => r.slice()), stats: { предавания: tx, "изтекли таймери": to, рундове: round }, vars: { base, exp } }, o));
      snap({ msg: `${N} сегмента, прозорец W = ${W}, ${sr ? "Selective Repeat" : "Go-Back-N"}. Губи се първото предаване на: ${LS.length ? LS.join(", ") : "нищо"}. Един рунд ≈ 1 RTT.` });
      while (base < N) {
        round++;
        const end = Math.min(base + W, N), row = [];
        rows.push(row);
        for (let s = base; s < end; s++) {
          if (sr && got[s]) continue;
          tx++;
          const drop = lostA[s] && !sent[s]; sent[s]++;
          if (drop) { row.push([s, "lost"]); snap({ at: ["send", "lost"], cur: s, msg: `Рунд ${round}: сегмент ${s} е изпратен и <b>загубен</b>.`, log: `р${round}: ${s} ✕` }); continue; }
          if (s === exp || (sr && s < exp + W)) {
            got[s] = 1;
            const e0 = exp; while (exp < N && got[exp]) exp++;
            row.push([s, s === e0 ? "ok" : "buf"]);
            snap({ at: ["accept", "advance"], cur: s, msg: s === e0 ? `Сегмент ${s} пристига по ред → приет; очакваният става ${exp}.` : `Сегмент ${s} пристига извън ред → SR го <b>буферира</b> (очакван е ${e0}).`, log: `р${round}: ${s} ${s === e0 ? "✓" : "буфер"}` });
          } else {
            row.push([s, "drop"]);
            snap({ at: ["accept", "discard"], cur: s, msg: `Сегмент ${s} пристига, но очакван е ${exp} → Go-Back-N го <b>изхвърля</b>; ще се изпрати отново.`, log: `р${round}: ${s} изхвърлен` });
          }
        }
        if (exp < end) { to++; snap({ at: "timeout", msg: `Край на рунда: кумулативното ACK казва „очаквам ${exp}“. Сегмент ${exp} липсва → таймерът му изтича.` }); }
        base = exp;
        snap({ at: "slide", msg: `Прозорецът се плъзга: base = ${base}.${base < N ? ` Следващ рунд: ${sr ? "само липсващите" : "всичко"} от ${base} до ${Math.min(base + W, N) - 1}.` : ""}` });
      }
      snap({ at: "done", done: true, msg: `Всички ${N} сегмента са доставени по ред за ${round} рунда с <b>${tx}</b> предавания (${tx - N} повторни).` });
      return { frames: F, tx, to };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="tcp">TCP</dfn> предоставя надежден подреден поток от байтове между крайни точки. Използва номера на последователност, потвърждения и повторно предаване. Не запазва границите на приложните съобщения: две операции за изпращане не гарантират две съответстващи операции за получаване. Приложението трябва да определя собствен формат и граници.</p>
  <p><dfn data-g="udp">UDP</dfn> предоставя дейтаграми с малък собствен механизъм и не гарантира доставка, ред или липса на дубликати. Приложението може да добави необходимите механизми. UDP не е „винаги по-бърз“: резултатът зависи от задачата, загубите и приложния протокол. <dfn data-g="quic">QUIC</dfn> например използва UDP и добавя надеждни потоци и защита.</p>
</div>

<div class="block">
  <h3>Установяване и затваряне на TCP връзка (Схема 20)</h3>
  <p class="prose">Установяването обикновено използва SYN, SYN+ACK и ACK. Номерът на последователност номерира позиции в потока; <dfn data-g="ack">ACK</dfn> посочва следващата очаквана позиция. SYN и FIN също използват място в последователността. Схемата следва RFC 9293 за обичайния случай: активно отваряне от клиента, активно затваряне от клиента, без загуби.</p>
  <div id="v-tcp"></div>
  <div class="key">SYN(x) → SYN+ACK(y, ack x+1) → ACK(ack y+1). Последният ACK потвърждава y+1; това <b>не е удостоверяване на самоличност</b>.</div>
  <details class="trap"><summary>Капан: „ръкостискането доказва, че говоря с правилния сървър“</summary><div>
    <p>То съгласува състояние на връзка. TCP сам не осигурява конфиденциалност и удостоверяване на приложния партньор — това прави TLS над него (<a href="#internet">раздел 8</a>).</p>
  </div></details>
  <details class="hint"><summary>Хинт: как TCP различава връзките</summary><div>
    <p><dfn data-g="порт">Портовете</dfn> разграничават услуги и комуникационни крайни точки в хоста. TCP връзката се идентифицира чрез адресите и портовете на двете страни. Затова много клиенти могат едновременно да говорят със сървърния порт 80.</p>
  </div></details>
</div>

<div class="block">
  <h3>Поток от байтове срещу дейтаграми (Схеми 21 и 22)</h3>
  <p class="prose">Ако приложението изпрати „AB“ и после „CD“, TCP получателят може да получи „A“, после „BCD“, или цялото „ABCD“. Границите на send() не са граници на получените съобщения. Тук приложният протокол слага пред всяко съобщение 1 байт дължина — така получателят възстановява съобщенията при <b>всяко</b> нарязване. Промени порциите (сборът трябва да е равен на дължината на потока).</p>
  <div id="v-frame"></div>
  <div class="split">
    <div class="key"><b>TCP</b> — поток: не пази границите; приложението ги кодира (дължина, разделител, друг договор). Надежден и подреден.</div>
    <div class="key"><b>UDP</b> — дейтаграми: пази границите на всяка дейтаграма; сам не гарантира доставка, ред, липса на дубликати.</div>
  </div>
  <details class="trap"><summary>Капан: „TCP изпраща цели файлове като единични съобщения“</summary><div>
    <p>Не. TCP пренася байтов поток. Файловият или друг приложен протокол определя начало, дължина, край и смисъл. Modbus TCP например има поле за дължина именно затова (<a href="#industrialni">раздел 10</a>).</p>
  </div></details>
  <details class="trap"><summary>Капан: „надеждно доставено = изпълнено“</summary><div>
    <p>Надеждната доставка на байтове не доказва изпълнена команда. Приложението може да отхвърли заявката или да се срине преди запис. Транспортно потвърждение и приложен отговор са различни събития.</p>
  </div></details>
</div>

<div class="block">
  <h3>Надеждно предаване с прозорец при загуби</h3>
  <p class="prose">Номерата на последователност, потвържденията и повторното предаване правят доставката надеждна над ненадеждния IP. Двата класически учебни механизма с плъзгащ се прозорец са <b>Go-Back-N</b> (получателят приема само по ред; изпращачът повтаря всичко от първия липсващ) и <b>Selective Repeat</b> (получателят буферира в прозореца; повтарят се само липсващите). Опростен модел: един рунд ≈ 1 RTT, потвърждението е кумулативно; при Selective Repeat получателят освен това потвърждава поотделно всеки приет сегмент — затова изпращачът знае кои липсват. <span class="extra-tag">извън конспекта</span> (конкретните механизми)</p>
  <div id="v-arq"></div>
  <details class="hint"><summary>Хинт: защо прозорецът изобщо е нужен</summary><div>
    <p>При W = 1 („изпрати и чакай“) всеки сегмент струва цял RTT. С прозорец W в движение са до W сегмента — ефективната скорост расте до W·размер/RTT, докато не достигне капацитета на канала. Числено — в <a href="#ocenki">раздел 9</a>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Контрол на потока и контрол на задръстванията</h3>
  <div class="split">
    <div class="key"><dfn data-g="flow control"><b>Flow control</b></dfn> ограничава изпращача спрямо възможностите на <b>получателя</b>.</div>
    <div class="key"><dfn data-g="congestion control"><b>Congestion control</b></dfn> отчита натоварването по <b>мрежовия път</b>.</div>
  </div>
  <p class="prose">Двете ограничения могат да действат едновременно и по различни причини. Загубата на пакет може да доведе до повторно предаване и закъснение; надеждността не премахва физическите ограничения на канала.</p>
  <details class="trap"><summary>Капан: смесване на двата механизма</summary><div>
    <p>„Получателят е бавен“ и „мрежата е задръстена“ са различни причини. Опорният план изисква изрично: „различавам контрол на поток и задръстване“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Два транспортни пътя за уеб</h3>
  <p class="prose">HTTP/1.1 и HTTP/2 обичайно използват TCP; HTTP/3 използва QUIC върху UDP. Следователно уеб трафикът не е задължително TCP трафик. DNS може да използва UDP или TCP; не е правилно всяка услуга да се свързва само с един възможен транспорт. „Ползва UDP“ не доказва „приложението няма надеждна доставка“.</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-tcp"), {
      id: "tcp", title: "TCP: машина на състоянията и номера", sub: "Стрелките са сегменти; вдясно — състоянието на всяка страна.",
      code: "ch06_tcp",
      inputs: [{ id: "x", label: "ISN клиент x", type: "number", value: 1000, width: "7em" }, { id: "y", label: "ISN сървър y", type: "number", value: 5000, width: "7em" }, { id: "n", label: "байтове данни", type: "number", value: 100, width: "6em" }, { id: "listening", label: "сървърът слуша", type: "checkbox", value: true }],
      presets: [{ label: "Без данни", values: { n: 0, listening: true } }, { label: "Затворен порт", values: { listening: false } }],
      legend: [["s-act", "текущ сегмент / състояние"], ["s-done", "ESTABLISHED"], ["s-swap", "RST"]],
      build: algos.tcp,
      draw(st, f) {
        st.innerHTML = "";
        const n = Math.max(f.segs.length, 1), W = 600, H = 70 + n * 34, xl = 120, xr = 480;
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        const stc = (s) => (s === "ESTABLISHED" ? "s-done" : s === "CLOSED" ? "s-dim" : "s-act");
        svg.append(S.svg("text", { x: xl, y: 18, "text-anchor": "middle", text: "Клиент" }), S.svg("text", { x: xr, y: 18, "text-anchor": "middle", text: "Сървър" }));
        svg.append(S.svg("line", { x1: xl, y1: 26, x2: xl, y2: H - 30, class: "edge" }), S.svg("line", { x1: xr, y1: 26, x2: xr, y2: H - 30, class: "edge" }));
        f.segs.forEach((sg, i) => {
          const y1 = 40 + i * 34, y2 = y1 + 24, l2r = sg.dir === "C>S", cur = i === f.segs.length - 1 && f.sg === sg;
          const cls = sg.flags.startsWith("RST") ? "s-swap" : cur ? "s-act" : "";
          svg.append(S.svg("line", { x1: l2r ? xl : xr, y1, x2: l2r ? xr - 6 : xl + 6, y2, class: "edge " + cls, "marker-end": "url(#arr6)" }));
          svg.append(S.svg("text", { x: (xl + xr) / 2, y: (y1 + y2) / 2 - 4, "text-anchor": "middle", style: cur ? "font-weight:700" : "", text: `${sg.flags}  seq=${sg.seq}${sg.flags.includes("ACK") ? " ack=" + sg.ack : ""}${sg.len ? " [" + sg.len + " B]" : ""}` }));
        });
        svg.append(S.svg("defs", null, S.svg("marker", { id: "arr6", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--ink-2)" }))));
        const yb = H - 22;
        svg.append(S.svg("g", { class: "node " + stc(f.cs) }, S.svg("rect", { x: xl - 70, y: yb - 6, width: 140, height: 24, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))" }), S.svg("text", { x: xl, y: yb + 11, "text-anchor": "middle", text: f.cs })));
        svg.append(S.svg("g", { class: "node " + stc(f.ss) }, S.svg("rect", { x: xr - 70, y: yb - 6, width: 140, height: 24, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))" }), S.svg("text", { x: xr, y: yb + 11, "text-anchor": "middle", text: f.ss })));
        st.append(svg);
      },
    });

    S.viz(root.querySelector("#v-frame"), {
      id: "frame", title: "Рамкиране на съобщения върху TCP поток", sub: "Цифрата е байтът за дължина.",
      code: "ch06_frame",
      inputs: [{ id: "msgs", label: "Съобщения (send)", value: "AB CD XYZ", width: "12em" }, { id: "cuts", label: "Порции при recv (байтове)", value: "1 4 5", width: "9em" }],
      presets: [{ label: "Всичко наведнъж", values: { cuts: "10" } }, { label: "По 2 байта", values: { cuts: "2 2 2 4" } }, { label: "Байт по байт", values: { msgs: "AB CD", cuts: "1 1 1 1 1 1" } }],
      legend: [["s-piv", "байт за дължина"], ["s-act", "получено, в буфера"], ["s-done", "предадено на приложението"]],
      build: algos.frame,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("span", { class: "eyebrow", text: "поток (вече получено вляво от чертата)" }));
        const lenIdx = new Set(); for (let i = 0; i < f.stream.length; i += f.stream[i] + 1) lenIdx.add(i);
        const cls = {}; f.stream.forEach((_, i) => { cls[i] = i >= f.pos ? "s-dim" : lenIdx.has(i) ? "s-piv" : ""; });
        S.drawArray(st, f.stream.map((b, i) => (lenIdx.has(i) ? b : String.fromCharCode(b))), { cls, append: true, gapAt: [f.pos] });
        st.append(h("span", { class: "eyebrow", text: "буфер на получателя" }));
        if (f.buf.length) S.drawArray(st, f.buf.map((b, i) => (i === 0 ? b : String.fromCharCode(b))), { cls: Object.fromEntries(f.buf.map((_, i) => [i, i === 0 ? "s-piv" : f.wait ? "s-cmp" : "s-act"])), append: true });
        else st.append(h("p", { class: "muted", text: "(празен)" }));
        st.append(h("p", null, h("b", { text: "Приложението получи: " }), ...f.out.map((m) => h("span", { class: "pill " + (m === f.newm ? "s-act" : "s-done"), style: { marginRight: "6px" }, text: m }))));
      },
    });

    S.viz(root.querySelector("#v-arq"), {
      id: "arq", title: "Go-Back-N срещу Selective Repeat", sub: "Ред = рунд (≈ 1 RTT). ✕ загубен, ✓ приет по ред, ◆ буфериран, ↯ изхвърлен.",
      code: "ch06_arq",
      inputs: [{ id: "N", label: "Сегменти", type: "number", value: 10, width: "5em" }, { id: "W", label: "Прозорец W", type: "number", value: 4, width: "5em" }, { id: "lost", label: "Губят се (първо предаване)", value: "2 5", width: "8em" }, { id: "mode", label: "Механизъм", type: "select", value: "gbn", options: [["gbn", "Go-Back-N"], ["sr", "Selective Repeat"]] }],
      presets: [{ label: "Без загуби", values: { lost: "" } }, { label: "W = 1 (stop-and-wait)", values: { W: 1, lost: "0 1 7" } }, { label: "W = 5, загуби 0 1 7", values: { N: 10, W: 5, lost: "0 1 7" } }],
      legend: [["s-swap", "загубен"], ["s-done", "приет"], ["s-piv", "буфериран (SR)"], ["s-dim", "изхвърлен (GBN)"]],
      build: algos.arq,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("span", { class: "eyebrow", text: "получател: приети сегменти; чертата = base" }));
        S.drawArray(st, Array.from({ length: f.N }, (_, i) => i), { cls: Object.fromEntries(f.got.map((g, i) => [i, g ? "s-done" : i >= f.base && i < f.base + f.W ? "s-act" : ""])), append: true, gapAt: f.base > 0 && f.base < f.N ? [f.base] : [], index: false });
        const tb = h("table", { class: "t grid" });
        const MK = { lost: ["✕", "s-swap"], ok: ["✓", "s-done"], buf: ["◆", "s-piv"], drop: ["↯", "s-dim"] };
        f.rows.forEach((r, k) => tb.append(h("tr", null, h("th", { text: "р" + (k + 1) }), ...r.map(([s, t]) => h("td", { class: MK[t][1] + (s === f.cur && k === f.rows.length - 1 ? " s-act" : ""), text: s + MK[t][0] })))));
        if (f.rows.length) st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });
  }

  S.chapter({ id: "transport", order: 6, num: "6", group: "Транспорт и услуги", title: "Транспортни протоколи", lead: "TCP и UDP: ръкостискане и затваряне с реалните номера, поток срещу дейтаграми, надеждно предаване с прозорец, контрол на поток и задръстване.", html, mount, algos });
})();
