/* Раздел 5 — доказуема печеливша стратегия: игра с купчина, ретроградно оцветяване, индукция. */
(function () {
  const S = window.Study, h = S.h;

  function parseMoves(str) {
    const M = S.parseNums(str, { min: 1, max: 9, minLen: 1, maxLen: 5 });
    return [...new Set(M)].sort((a, b) => a - b);
  }

  /* ---------- чисти функции ---------- */
  const algos = {
    parseMoves,
    /** retro() от 05_nim.c: W/L за 0..N */
    retro({ N, moves, misere }) {
      N = S.int(N, 1, 40, "Броят предмети");
      const M = parseMoves(moves), m = M.length, mis = misere === "1" || misere === true || misere === 1;
      const win = new Array(N + 1).fill(null), best = new Array(N + 1).fill(null), F = [];
      const st = () => ({ печеливши: win.filter((x) => x === 1).length, губещи: win.filter((x) => x === 0).length });
      const push = (o) => F.push(Object.assign({ win: win.slice(), best: best.slice(), N, M, mis, stats: st() }, o));
      win[0] = mis ? 1 : 0; best[0] = -1;
      push({ at: "base", n: 0, vars: { n: 0, "win[0]": win[0] }, msg: mis ? "0 предмета и ти си на ход: противникът е взел последния и <b>губи</b> ⇒ позиция 0 е <b>печеливша</b> (W) за теб." : "0 предмета и ти си на ход: противникът е взел последния и <b>печели</b> ⇒ позиция 0 е <b>губеща</b> (L).", log: `0: ${win[0] ? "W" : "L"} (база)` });
      for (let n = 1; n <= N; n++) {
        win[n] = 0; best[n] = -1;
        push({ at: ["init", "loop"], n, vars: { n }, msg: `Позиция ${n}: приемаме, че е губеща, докато не намерим ход към губеща.` });
        for (let k = 0; k < m; k++) {
          const t = M[k];
          if (t > n) { push({ at: "skip", n, t, vars: { n, t }, msg: `Ход ${t} не е допустим — има само ${n}.` }); continue; }
          const lose = !win[n - t];
          push({ at: "test", n, t, vars: { n, t, "n−t": n - t, "win[n−t]": win[n - t] }, msg: `Вземаме ${t} → оставяме ${n - t}, което е ${win[n - t] ? "W (печеливша за противника)" : "<b>L (губеща за противника)</b>"}.` });
          if (lose) { win[n] = 1; best[n] = t; push({ at: "win", n, t, vars: { n, "best[n]": t }, msg: `Има ход към губеща позиция ⇒ ${n} е <b>печеливша</b>: вземи ${t}.`, log: `${n}: W (вземи ${t} → ${n - t})` }); break; }
        }
        if (!win[n]) push({ at: "move", n, vars: { n }, msg: `Всеки допустим ход оставя печеливша позиция на противника ⇒ ${n} е <b>губеща</b>.`, log: `${n}: L` });
      }
      const L = win.map((w, n) => (w ? null : n)).filter((x) => x !== null);
      const last = F[F.length - 1];
      last.done = true;
      last.msg += ` Губещите позиции до ${N}: <b>${L.join(", ")}</b>.`;
      return { frames: F, pattern: win.map((w) => (w ? "W" : "L")).join(""), best: best.join(" "), win, bestArr: best, M, mis };
    },

    /** игра стратегия срещу стратегия — както в main() на 05_nim.c */
    game({ N, moves, misere }) {
      const R = algos.retro({ N, moves, misere });
      const { win, bestArr, M, mis } = R;
      let n = +N, side = 0;
      const seq = [];
      while (n > 0) {
        let t = win[n] ? bestArr[n] : 0;
        if (!t) for (const x of M) if (x <= n) { t = x; break; }
        if (!t) break;
        seq.push(t); n -= t; side ^= 1;
      }
      let first = mis ? side === 0 : side === 1;
      if (n > 0) first = side === 1;
      return { seq: seq.join(" "), first: first ? 1 : 0 };
    },
  };

  /* ---------- рисуване ---------- */
  function drawRetro(st, f) {
    st.innerHTML = "";
    const cls = {};
    f.win.forEach((w, n) => { cls[n] = w === null ? "s-dim" : w ? "s-done" : "s-swap"; });
    if (f.n != null) cls[f.n] = "s-act";
    if (f.t != null && f.n - f.t >= 0) cls[f.n - f.t] = cls[f.n - f.t] === "s-swap" ? "s-swap" : "s-cmp";
    const arr = f.win.map((w) => (w === null ? "?" : w ? "W" : "L"));
    const ptr = {};
    if (f.n != null) ptr.n = f.n;
    if (f.t != null && f.n - f.t >= 0 && f.n - f.t !== f.n) ptr["n−" + f.t] = f.n - f.t;
    S.drawArray(st, arr, { cls, ptr });
    st.append(h("p", { class: "muted", style: { fontSize: ".8rem", marginTop: "6px" }, text: `Позволени ходове: {${f.M.join(", ")}}. Правило: ${f.mis ? "взелият последния ГУБИ" : "взелият последния ПЕЧЕЛИ"}. W — печеливша за играча на ход, L — губеща.` }));
  }

  /* ---------- интерактивна игра срещу стратегията ---------- */
  function playBox(host) {
    const N = h("input", { type: "number", value: 6, min: 1, max: 40, style: { width: "5em" }, "aria-label": "Начален брой" });
    const Mi = h("input", { type: "text", value: "1 2 3", style: { width: "7em" }, "aria-label": "Позволени ходове" });
    const mis = h("select", { "aria-label": "Правило" }, h("option", { value: "0", text: "взелият последния печели" }), h("option", { value: "1", text: "взелият последния губи" }));
    const first = h("select", { "aria-label": "Кой започва" }, h("option", { value: "me", text: "аз започвам" }), h("option", { value: "ai", text: "стратегията започва" }));
    const pile = h("div", { class: "arr", style: { flexWrap: "wrap", minHeight: "40px" } });
    const btns = h("div", { class: "row" });
    const log = h("div", { class: "log", style: { maxHeight: "180px" } });
    const info = h("p", { "aria-live": "polite" });
    let R = null, n = 0, over = false;
    function start() {
      try { R = algos.retro({ N: N.value, moves: Mi.value, misere: mis.value }); } catch (e) { info.innerHTML = `<span class="warn">${S.esc(e.message)}</span>`; return; }
      n = +N.value; over = false; log.innerHTML = "";
      info.innerHTML = `Позиция ${n} е <b>${R.win[n] ? "печеливша" : "губеща"}</b> за първия играч при оптимална игра.`;
      if (first.value === "ai") aiMove(); else render();
    }
    function end(lastMover) {
      over = true;
      const lastWins = mis.value === "0";
      const winner = lastWins ? lastMover : lastMover === "аз" ? "стратегията" : "аз";
      info.innerHTML = `Купчината е празна. Последният ход беше на <b>${lastMover === "аз" ? "теб" : "стратегията"}</b> ⇒ печели <b>${winner === "аз" ? "ти" : "стратегията"}</b>.`;
      render();
    }
    function stuck(who) { over = true; info.innerHTML = `${who === "аз" ? "Нямаш" : "Стратегията няма"} допустим ход — ${who === "аз" ? "губиш" : "печелиш"}.`; render(); }
    function aiMove() {
      if (over) return;
      let t = R.win[n] ? R.bestArr[n] : 0;
      if (!t) t = R.M.find((x) => x <= n) || 0;
      if (!t) return stuck("ai");
      n -= t;
      log.append(h("div", { html: `стратегията взема ${t} → остават <b>${n}</b> (${R.win[n] ? "W" : "L"} за теб)` }));
      if (n === 0) return end("ai");
      if (!R.M.some((x) => x <= n)) return stuck("аз");
      render();
    }
    function myMove(t) {
      if (over || t > n) return;
      n -= t;
      log.append(h("div", { html: `ти взимаш ${t} → остават <b>${n}</b> (${R.win[n] ? "W" : "L"} за стратегията)` }));
      if (n === 0) return end("аз");
      aiMove();
    }
    function render() {
      pile.innerHTML = "";
      for (let k = 0; k < n; k++) pile.append(h("div", { class: "cell s-piv", style: { width: "22px", height: "22px", minWidth: "22px" } }, ""));
      if (!n) pile.append(h("span", { class: "muted", text: "празно" }));
      btns.innerHTML = "";
      if (R && !over) R.M.forEach((t) => btns.append(h("button", { class: "btn primary", disabled: t > n ? true : null, onclick: () => myMove(t), text: `вземи ${t}` })));
      if (R && !over) btns.append(h("span", { class: "muted", style: { fontSize: ".8rem" }, text: `Позиция ${n}: ${R.win[n] ? "печеливша за теб" : "губеща за теб"}` }));
      log.scrollTop = log.scrollHeight;
    }
    host.append(h("div", { class: "viz" },
      h("div", { class: "viz-head" }, h("h4", { text: "Изиграй срещу печелившата стратегия" }), h("span", { class: "sub", text: "Започни от печеливша позиция и опитай да спечелиш; започни от губеща и виж, че нищо не помага." })),
      h("div", { class: "viz-inputs" }, h("label", { class: "field" }, h("span", { text: "предмети" }), N), h("label", { class: "field" }, h("span", { text: "ходове" }), Mi), h("label", { class: "field" }, h("span", { text: "правило" }), mis), h("label", { class: "field" }, h("span", { text: "кой започва" }), first), h("button", { class: "btn primary", onclick: start, text: "Нова игра" })),
      h("div", { class: "viz-stage" }, pile, btns, info, log)));
    start();
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Minimax доказва стратегия за конкретно дърво. При игри с проста структура може да се докаже стратегия за <b>всички</b> начални позиции наведнъж. Купчина с n предмета; на ход играчът взема 1, 2 или 3; печели взелият последния.</p>
</div>

<div class="block">
  <h3>Ретроградно оцветяване: печеливши и губещи позиции</h3>
  <p class="prose">Позициите се класифицират отдолу нагоре, точно като стойностите в minimax. Позиция е <b>печеливша (W)</b> за играча на ход, ако има ход към <dfn data-g="губеща позиция">губеща</dfn> за противника; <b>губеща (L)</b> — ако всеки ход води към печеливша. Промени множеството от ходове или правилото.</p>
  <div id="v5-retro"></div>
  <div class="key"><b>Взелият последния печели, ходове {1,2,3}:</b> губещи са кратните на 4. От некратно на 4 оставяме кратно; след ход k на противника вземаме 4 − k и възстановяваме свойството. От купчина 6 първо вземаме 2.</div>
  <details class="hint"><summary>Хинт: доказателството по индукция</summary><div>
    <p><b>Твърдение:</b> n е губеща ⇔ n ≡ 0 (mod 4).</p>
    <p><b>База:</b> n = 0 — играчът на ход няма какво да вземе; противникът е взел последния и е спечелил ⇒ губеща.</p>
    <p><b>Стъпка:</b> ако n = 4q, всеки ход k ∈ {1,2,3} дава 4q − k, което не е кратно на 4 ⇒ по индукционното предположение е печеливша за противника. Ако n = 4q + r, r ∈ {1,2,3}, ходът k = r оставя 4q ⇒ губеща за противника. ∎</p>
    <p>Индукцията доказва резултата <b>за тези правила</b>. Визуализаторът горе е същото доказателство, изпълнено механично.</p>
  </div></details>
  <details class="trap"><summary>Капан: смяна на правилото „последният печели“</summary><div>
    <p>При вземане на 1, 2 или 3, като <b>взелият последния губи</b>, губещи за играча на ход са 1, 5, 9, … (4k + 1). От 2, 3, 4 оставяме 1; от 4k + 1 всяко вземане дава на противника възможност да върне такова състояние. За начални 6 вземаме 1 и оставяме 5. Смяната на правилото променя <b>базовия случай</b> и целия шаблон — стратегията трябва да се преизведе. Пробвай пресета „последният губи“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 10 — игра срещу стратегията</h3>
  <div id="v5-play"></div>
  <details class="hint"><summary>Хинт: защо стратегията играе „най-малкото“ от губеща позиция</summary><div>
    <p>От губеща позиция няма ход, който да гарантира нещо срещу оптимален противник — всеки е еднакво лош. Стратегията взема най-малкия допустим, за да остави на противника повече възможности да сгреши. Това не променя теоретичния изход.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v5-retro"), {
      id: "c5r", title: "Ретроградно оцветяване W/L", sub: "Зелено W — печеливша, червено L — губеща за играча на ход; оранжево — позицията след разглеждания ход.",
      code: "ch05_retro",
      inputs: [
        { id: "N", label: "до n =", type: "number", value: 12, width: "5em" },
        { id: "moves", label: "позволени ходове", value: "1 2 3", width: "7em" },
        { id: "misere", label: "правило", type: "select", value: "0", options: [["0", "взелият последния печели"], ["1", "взелият последния губи"]] },
      ],
      presets: [
        { label: "{1,2,3}, печели", values: { N: 12, moves: "1 2 3", misere: "0" } },
        { label: "последният губи", values: { N: 13, moves: "1 2 3", misere: "1" } },
        { label: "{1,3,4}", values: { N: 20, moves: "1 3 4", misere: "0" } },
        { label: "{2,5}", values: { N: 15, moves: "2 5", misere: "0" } },
      ],
      legend: [["s-done", "W печеливша"], ["s-swap", "L губеща"], ["s-act", "текуща n"], ["s-cmp", "n − t"]],
      build: algos.retro, draw: drawRetro, speed: 2,
    });
    playBox(root.querySelector("#v5-play"));
  }

  S.chapter({ id: "nim", order: 5, num: "5", group: "Печеливши стратегии", title: "Доказуема стратегия: игра с купчина",
    lead: "Печеливши и губещи позиции отдолу нагоре, стратегия „остави кратно на 4“, доказателство по индукция и какво се променя при друго правило.", html, mount, algos });
})();
