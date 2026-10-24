/* Тема 7 — помощници за схеми (кутии, стрелки, участници, хранилища) върху Study.svg.
   Използват се само в mount/draw; чистите algos не зависят от тях (тестват се в node без DOM). */
(function () {
  const S = window.Study;
  let uid = 0;
  const DG = {};

  /** Корен на схема. w, h — координатна система; cls — допълнителен клас (напр. "narrow"). */
  DG.root = function (w, hgt, cls) {
    const id = "ah" + ++uid;
    const svg = S.svg("svg", { class: "dg " + (cls || ""), viewBox: `0 0 ${w} ${hgt}`, role: "img", "data-ah": id });
    svg.append(S.svg("defs", null,
      S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
        S.svg("path", { d: "M0,0 L10,5 L0,10 z", class: "ah" }))));
    return svg;
  };
  DG.wrap = function (host, svg) { const w = S.h("div", { class: "dg-wrap" }); w.append(svg); host.append(w); return w; };

  function label(g, x, y, t, sub, cls) {
    const lines = String(t).split("\n");
    const total = lines.length + (sub ? 1 : 0);
    let yy = y - ((total - 1) * 16) / 2 + 4;
    lines.forEach((ln) => { g.append(S.svg("text", { x, y: yy, "text-anchor": "middle", class: cls || "", text: ln })); yy += 16; });
    if (sub) g.append(S.svg("text", { x, y: yy, "text-anchor": "middle", class: "sub", text: sub }));
  }
  DG.text = function (svg, x, y, t, cls, anchor) {
    const el = S.svg("text", { x, y, "text-anchor": anchor || "middle", class: cls || "", text: t });
    svg.append(el); return el;
  };

  /** Възел: {x, y, w, h, t, sub, cls, shape: "rect"|"ell"|"circ"|"doc", onclick, key} — x, y е центърът. */
  DG.node = function (svg, o) {
    const g = S.svg("g", { class: "nd " + (o.cls || "") + (o.onclick ? " click" : ""), tabindex: o.onclick ? 0 : null, role: o.onclick ? "button" : null, "aria-label": o.onclick ? String(o.t).replace(/\n/g, " ") : null });
    const w = o.w || 120, hh = o.h || 44, x0 = o.x - w / 2, y0 = o.y - hh / 2;
    if (o.shape === "ell") g.append(S.svg("ellipse", { cx: o.x, cy: o.y, rx: w / 2, ry: hh / 2 }));
    else if (o.shape === "circ") g.append(S.svg("circle", { cx: o.x, cy: o.y, r: w / 2 }));
    else g.append(S.svg("rect", { x: x0, y: y0, width: w, height: hh, rx: o.r == null ? 6 : o.r }));
    label(g, o.x, o.y, o.t, o.sub, o.tcls);
    if (o.onclick) {
      g.addEventListener("click", o.onclick);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onclick(e); } });
    }
    if (o.key) g.dataset.key = o.key;
    svg.append(g);
    return g;
  };

  /** Хранилище от данни (DFD): отворен отдясно правоъгълник. */
  DG.store = function (svg, o) {
    const g = S.svg("g", { class: "nd " + (o.cls || "") + (o.onclick ? " click" : "") });
    const w = o.w || 130, hh = o.h || 36, x0 = o.x - w / 2, y0 = o.y - hh / 2;
    g.append(S.svg("rect", { x: x0, y: y0, width: w, height: hh, rx: 0, style: "stroke:none" }));
    g.append(S.svg("path", { d: `M${x0 + w},${y0} H${x0} V${y0 + hh} H${x0 + w} M${x0 + 22},${y0} V${y0 + hh}`, class: "ln", style: "stroke:var(--c,var(--ink-2))" }));
    label(g, o.x + 10, o.y, o.t, o.sub);
    if (o.onclick) g.addEventListener("click", o.onclick);
    svg.append(g);
    return g;
  };

  /** Участник (човече) с надпис отдолу. */
  DG.actor = function (svg, x, y, t, cls, onclick) {
    const g = S.svg("g", { class: "nd " + (cls || "") + (onclick ? " click" : "") });
    g.append(S.svg("circle", { cx: x, cy: y - 22, r: 8, class: "actor" }),
      S.svg("path", { d: `M${x},${y - 14} V${y + 6} M${x - 13},${y - 6} H${x + 13} M${x},${y + 6} L${x - 10},${y + 22} M${x},${y + 6} L${x + 10},${y + 22}`, class: "actor" }));
    label(g, x, y + 38, t);
    if (onclick) g.addEventListener("click", onclick);
    svg.append(g);
    return g;
  };

  /** Линия по точки [[x,y],...]; o: {cls, arrow (по подразбиране true), both, dash, label, lx, ly}. */
  DG.line = function (svg, pts, o = {}) {
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
    const id = svg.getAttribute("data-ah");
    const el = S.svg("path", { d, class: "ln " + (o.cls || "") + (o.dash ? " dash" : ""),
      "marker-end": o.arrow === false ? null : `url(#${id})`, "marker-start": o.both ? `url(#${id})` : null });
    svg.append(el);
    if (o.label) {
      const a = pts[0], b = pts[pts.length - 1];
      const lx = o.lx != null ? o.lx : (a[0] + b[0]) / 2, ly = o.ly != null ? o.ly : (a[1] + b[1]) / 2 - 6;
      svg.append(S.svg("text", { x: lx, y: ly, "text-anchor": o.anchor || "middle", class: "el", text: o.label }));
    }
    return el;
  };

  /** Маркира избран възел в група. */
  DG.select = function (svg, key) {
    svg.querySelectorAll(".nd[data-key]").forEach((g) => g.classList.toggle("sel", g.dataset.key === key));
  };

  window.DG = DG;
})();
