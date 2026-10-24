/* Тема 4 — общи функции за рисуване (само за draw; алгоритмите в algos не ги ползват).
 *   T4.tree(stage, root, opts)   двоично дърво: root = {id, key, l, r} (вложено), opts.cls {id: "s-act"}, opts.edge {id: cls} (реброто към id),
 *                                 opts.sub {id: "текст под възела"}, opts.top {id: "текст над"}, opts.ghost [{x:"left"|..}] (не се ползва)
 *   T4.list(stage, st, opts)      свързани възли (кутии и стрелки): st = {nodes: {id: {v, next, prev}}, head, sentinel}
 *   T4.ring(stage, cells, opts)   кръгов буфер като окръжност
 */
(function () {
  const S = window.Study, h = S.h, sv = S.svg;
  const T4 = (window.T4 = {});

  function arrowHead(x, y, ang, cls) {
    const a = 7, w = 4.2;
    const p1 = [x - a * Math.cos(ang) + w * Math.sin(ang), y - a * Math.sin(ang) - w * Math.cos(ang)];
    const p2 = [x - a * Math.cos(ang) - w * Math.sin(ang), y - a * Math.sin(ang) + w * Math.cos(ang)];
    return sv("polygon", { points: `${x},${y} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`, class: "ah " + (cls || "") });
  }
  T4.arrowHead = arrowHead;

  /* ---------------- двоично дърво ---------------- */
  T4.tree = function (st, root, o = {}) {
    const box = o.append ? h("div") : st;
    if (!o.append) st.innerHTML = "";
    if (!root) { box.append(h("p", { class: "muted", text: o.emptyText || "Празно дърво (root = NULL)." })); if (o.append) st.append(box); return; }
    const pos = [];
    let ix = 0, maxD = 0;
    (function walk(n, d) { if (!n) return; walk(n.l, d + 1); pos.push({ n, x: ix++, d }); maxD = Math.max(maxD, d); walk(n.r, d + 1); })(root, 0);
    const R = o.r || 17, dx = o.dx || 44, dy = o.dy || 58, padX = 26, padY = (o.top ? 30 : 22);
    const W = Math.max(ix * dx + padX * 2 - dx + 2 * R + (o.nulls ? dx * 0.5 : 0), 120), H = maxD * dy + padY + R * 2 + (o.sub ? 34 : 14) + (o.nulls ? dy * 0.4 : 0);
    const svg = sv("svg", { class: "g t4tree", viewBox: `0 0 ${W} ${H}`, width: W, style: `max-width:100%;height:auto` });
    const P = new Map();
    pos.forEach((p) => P.set(p.n, { x: padX + R + p.x * dx, y: padY + R + p.d * dy }));
    const g1 = sv("g"), g2 = sv("g");
    pos.forEach((p) => {
      const a = P.get(p.n);
      for (const c of [p.n.l, p.n.r]) {
        if (!c) continue;
        const b = P.get(c);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        g1.append(sv("line", { x1: a.x + R * Math.cos(ang), y1: a.y + R * Math.sin(ang), x2: b.x - R * Math.cos(ang), y2: b.y - R * Math.sin(ang), class: "edge " + ((o.edge && o.edge[c.id]) || "") }));
      }
      if (o.nulls) for (const [c, side] of [[p.n.l, -1], [p.n.r, 1]]) if (!c) {
        const x = a.x + side * dx * 0.42, y = a.y + dy * 0.55;
        g1.append(sv("line", { x1: a.x + side * R * 0.7, y1: a.y + R * 0.7, x2: x, y2: y - 6, class: "edge nil" }));
        g1.append(sv("text", { x, y: y + 5, "text-anchor": "middle", class: "wt", text: "∅" }));
      }
    });
    pos.forEach((p) => {
      const a = P.get(p.n), cls = (o.cls && o.cls[p.n.id]) || "";
      const g = sv("g", { class: "node " + cls });
      g.append(sv("circle", { cx: a.x, cy: a.y, r: R }));
      const lab = o.label ? o.label(p.n) : String(p.n.key);
      g.append(sv("text", { x: a.x, y: a.y + 4.5, "text-anchor": "middle", style: `font-weight:600;font-size:${lab.length > 3 ? 11 : 13}px`, text: lab }));
      if (o.sub && o.sub[p.n.id] != null) g.append(sv("text", { x: a.x, y: a.y + R + 14, "text-anchor": "middle", class: "wt", text: o.sub[p.n.id] }));
      if (o.top && o.top[p.n.id] != null) g.append(sv("text", { x: a.x, y: a.y - R - 6, "text-anchor": "middle", class: "lbl", text: o.top[p.n.id] }));
      if (o.onclick) { g.style.cursor = "pointer"; g.addEventListener("click", () => o.onclick(p.n)); }
      g2.append(g);
    });
    svg.append(g1, g2);
    box.append(svg);
    if (o.append) st.append(box);
    return svg;
  };

  /* ---------------- свързани възли ----------------
     st.nodes: {id: {v, next, prev, freed, label}}; st.head: id или null; st.sentinel: id (кръгов двусвързан);
     opts.ptr: {id: ["p", "cur"]}; opts.cls: {id: cls}; opts.ecls: {"id>next"|"id<prev": cls}; opts.double; opts.headName */
  T4.list = function (stage, st, o = {}) {
    stage.innerHTML = "";
    const N = st.nodes, BW = 58, BH = 34, GAP = 40, X0 = 70, Y0 = 46, ROW2 = 102;
    const pos = {};
    const chain = [];
    const seen = new Set();
    if (st.sentinel != null) {
      chain.push(st.sentinel); seen.add(st.sentinel);
      let c = N[st.sentinel].next;
      while (c != null && !seen.has(c) && N[c]) { chain.push(c); seen.add(c); c = N[c].next; }
    } else {
      let c = st.head;
      while (c != null && !seen.has(c) && N[c]) { chain.push(c); seen.add(c); c = N[c].next; }
    }
    chain.forEach((id, i) => (pos[id] = { x: X0 + i * (BW + GAP), y: Y0 }));
    // откъснати възли (нов X, освободен) — под реда, до възела, който сочи към тях или към който сочат
    let extra = 0;
    Object.keys(N).forEach((id) => {
      id = isNaN(id) ? id : +id;
      if (pos[id]) return;
      const n = N[id];
      let ax = null;
      for (const k in pos) if (N[k] && N[k].next === id) ax = pos[k].x + (BW + GAP) / 2;
      if (ax == null && n.next != null && pos[n.next]) ax = pos[n.next].x - (BW + GAP) / 2;
      if (ax == null && n.prev != null && pos[n.prev]) ax = pos[n.prev].x + (BW + GAP) / 2;
      if (ax == null) ax = X0 + (chain.length + extra) * (BW + GAP);
      pos[id] = { x: ax, y: Y0 + ROW2 };
      extra++;
    });
    const xs = Object.values(pos).map((p) => p.x);
    const W = Math.max(...xs, X0) + BW + 60;
    const anyLow = Object.values(pos).some((p) => p.y > Y0);
    const H = Y0 + BH + (anyLow ? ROW2 : 0) + (st.sentinel != null || o.double ? 54 : 34);
    const svg = sv("svg", { class: "g t4list", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:none;height:auto" });
    const gE = sv("g"), gN = sv("g");
    const dbl = !!o.double;
    // head
    if (st.sentinel == null) {
      const hx = 8, hy = Y0 + BH / 2;
      gN.append(sv("text", { x: hx, y: hy - 14, class: "lbl", text: o.headName || "head" }));
      if (st.head != null && pos[st.head]) gE.append(...edge(hx + 30, hy, pos[st.head].x, hy, (o.ecls && o.ecls["head"]) || ""));
      else gN.append(sv("text", { x: hx + 10, y: hy + 5, class: "wt", text: "∅" }));
    }
    function edge(x1, y1, x2, y2, cls, curve) {
      const out = [];
      if (!curve) {
        out.push(sv("line", { x1, y1, x2: x2 - 1, y2, class: "edge arr " + cls }));
        out.push(arrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1), cls));
      } else {
        const cx = (x1 + x2) / 2, cy = curve;
        out.push(sv("path", { d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, class: "edge arr " + cls }));
        out.push(arrowHead(x2, y2, Math.atan2(y2 - cy, x2 - cx), cls));
      }
      return out;
    }
    Object.keys(pos).forEach((k) => {
      const id = isNaN(k) ? k : +k, n = N[id], p = pos[id];
      const isS = id === st.sentinel;
      const cls = (o.cls && o.cls[id]) || (n.freed ? "s-dim" : isS ? "s-piv" : "");
      const g = sv("g", { class: "node lnode " + cls });
      g.append(sv("rect", { x: p.x, y: p.y, width: BW, height: BH, rx: 4 }));
      const split = dbl ? 0.28 : 0;
      if (dbl) g.append(sv("line", { x1: p.x + BW * split, y1: p.y, x2: p.x + BW * split, y2: p.y + BH, class: "div" }));
      g.append(sv("line", { x1: p.x + BW * 0.7, y1: p.y, x2: p.x + BW * 0.7, y2: p.y + BH, class: "div" }));
      g.append(sv("text", { x: p.x + BW * (dbl ? 0.49 : 0.35), y: p.y + BH / 2 + 5, "text-anchor": "middle", style: "font-weight:600", text: isS ? "S" : n.freed ? "✗" : String(n.v) }));
      // указатели-имена над възела
      const nm = o.ptr && o.ptr[id];
      if (nm && nm.length) g.append(sv("text", { x: p.x + BW / 2, y: p.y - 8, "text-anchor": "middle", class: "lbl ptrn", text: nm.join(", ") }));
      gN.append(g);
      // next
      const sx = p.x + BW * 0.85, sy = p.y + (dbl ? BH * 0.35 : BH / 2);
      const ec = (o.ecls && o.ecls[id + ">"]) || "";
      if (n.next == null) {
        gN.append(sv("text", { x: sx, y: sy + 5, "text-anchor": "middle", class: "wt", text: "∅" }));
      } else if (pos[n.next]) {
        const t = pos[n.next];
        const ty = t.y + (dbl ? BH * 0.35 : BH / 2);
        if (t.y === p.y && t.x > p.x && Math.abs(t.x - p.x - BW - GAP) < 1) gE.append(...edge(sx, sy, t.x, ty, ec));
        else if (n.next === id) gE.append(...edge(sx, sy, p.x + BW * 0.15, p.y, ec, p.y - 34));
        else if (t.y === p.y) gE.append(...edge(sx, p.y, t.x + BW * 0.3, t.y, ec, p.y - 36 - Math.abs(t.x - p.x) * 0.04));
        else gE.append(...edge(sx, sy + (t.y > p.y ? BH / 2 : -BH / 2) * 0.6, t.x + (t.x > p.x ? 0 : BW * 0.3), t.y + (t.y > p.y ? 0 : BH), ec, (p.y + t.y) / 2 + (t.y > p.y ? -10 : 10)));
      }
      // prev
      if (dbl) {
        const px = p.x + BW * 0.14, py = p.y + BH * 0.72;
        const pc = (o.ecls && o.ecls[id + "<"]) || "prev";
        if (n.prev == null) gN.append(sv("text", { x: px, y: py + 4, "text-anchor": "middle", class: "wt", text: "∅" }));
        else if (pos[n.prev]) {
          const t = pos[n.prev], ty = t.y + BH * 0.72;
          if (t.y === p.y && t.x < p.x && Math.abs(p.x - t.x - BW - GAP) < 1) gE.append(...edge(p.x, py, t.x + BW, ty, pc));
          else if (n.prev === id) gE.append(...edge(px, p.y + BH, p.x + BW * 0.6, p.y + BH, pc, p.y + BH + 30));
          else if (t.y === p.y) gE.append(...edge(px, p.y + BH, t.x + BW * 0.7, t.y + BH, pc, p.y + BH + 34 + Math.abs(t.x - p.x) * 0.03));
          else gE.append(...edge(px, t.y > p.y ? p.y + BH : p.y, t.x + BW * (t.x > p.x ? 0.1 : 0.9), t.y > p.y ? t.y : t.y + BH, pc, (p.y + t.y) / 2));
        }
      }
    });
    svg.append(gE, gN);
    stage.append(svg);
    return svg;
  };

  /* ---------------- кръгов буфер ----------------
     cells: масив (null = свободна), opts: {head, tail, cls:{i:cls}, size} */
  T4.ring = function (host, cells, o = {}) {
    const C = cells.length, R = 78, cx = 150, cy = 140, W = 300, H = 280;
    const svg = sv("svg", { class: "g t4ring", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%;height:auto;flex:none" });
    for (let i = 0; i < C; i++) {
      const a0 = -Math.PI / 2 + (i / C) * 2 * Math.PI, a1 = -Math.PI / 2 + ((i + 1) / C) * 2 * Math.PI;
      const r1 = R - 26, r2 = R + 14;
      const p = (r, a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M${p(r1, a0)} L${p(r2, a0)} A${r2},${r2} 0 ${large} 1 ${p(r2, a1)} L${p(r1, a1)} A${r1},${r1} 0 ${large} 0 ${p(r1, a0)} Z`;
      const cls = (o.cls && o.cls[i]) || (cells[i] == null ? "s-dim" : "");
      const g = sv("g", { class: "node " + cls });
      g.append(sv("path", { d, class: "seg" }));
      const am = (a0 + a1) / 2;
      g.append(sv("text", { x: cx + (R - 6) * Math.cos(am), y: cy + (R - 6) * Math.sin(am) + 5, "text-anchor": "middle", style: "font-weight:600", text: cells[i] == null ? "" : String(cells[i]) }));
      g.append(sv("text", { x: cx + (R + 26) * Math.cos(am), y: cy + (R + 26) * Math.sin(am) + 4, "text-anchor": "middle", class: "wt", text: i }));
      svg.append(g);
    }
    const mark = (i, txt, inner) => {
      if (i == null) return;
      const am = -Math.PI / 2 + ((i + 0.5) / C) * 2 * Math.PI, r = R + (inner ? 58 : 44);
      svg.append(sv("text", { x: cx + r * Math.cos(am), y: cy + r * Math.sin(am) + (inner ? 12 : 4), "text-anchor": "middle", class: "lbl" + (inner ? " ptrn" : ""), text: txt }));
    };
    if (o.head != null && o.tail != null && o.head === o.tail) mark(o.head, o.hn || "head=tail", false);
    else { mark(o.head, o.hn || "head", false); mark(o.tail, o.tn || "tail", true); }
    if (o.center) svg.append(sv("text", { x: cx, y: cy + 5, "text-anchor": "middle", class: "lbl", text: o.center }));
    host.append(svg);
    return svg;
  };

  /* общ CSS за рисунките на тема 4 */
  const css = `
  svg.g .lbl { font: 600 11px var(--f-mono); fill: var(--accent); }
  svg.g .ptrn { fill: var(--st-cmp); }
  svg.g .edge.arr { stroke: var(--ink-2); stroke-width: 1.6; }
  svg.g .edge.arr.prev { stroke: var(--muted); stroke-dasharray: 4 3; }
  svg.g .edge.nil { stroke-dasharray: 3 3; stroke-width: 1.2; }
  svg.g polygon.ah { fill: var(--ink-2); }
  svg.g polygon.ah.prev { fill: var(--muted); }
  svg.g polygon.ah.s-act, svg.g polygon.ah.s-cmp, svg.g polygon.ah.s-done, svg.g polygon.ah.s-swap, svg.g polygon.ah.s-piv { fill: var(--c); }
  svg.g .lnode rect, svg.g .node .seg { fill: var(--cb, var(--panel)); stroke: var(--c, var(--ink-2)); stroke-width: 1.8; }
  svg.g .lnode .div { stroke: var(--c, var(--ink-2)); stroke-width: 1; opacity: .6; }
  svg.g .node.s-dim { opacity: .55; }
  .t4row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  .t4col { display: grid; gap: 6px; min-width: 0; }
  .t4cap { font: 600 .72rem/1.2 var(--f-body); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .t4out { font: 13px var(--f-mono); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .t4out .pill { font-family: var(--f-mono); }
  .t4scroll { overflow-x: auto; max-width: 100%; }
  .t4mini { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .t4mini > * { min-width: 0; }
  .t4stack { display: flex; flex-direction: column-reverse; gap: 3px; min-height: 40px; }
  `;
  if (typeof document !== "undefined" && document.head) document.head.append(h("style", { text: css }));
})();
