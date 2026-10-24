/* Тема 6 — общи помощници за рисуване на таблици (само DOM; алгоритмите в главите не ги ползват). */
(function () {
  const S = window.Study, h = S.h;
  const T6 = (window.T6 = {});

  /** Рисува релация като таблица.
   *  rel: {name, cols:[...], rows:[[...]]}
   *  o: {rowCls:{i:cls}, cellCls:{"i,j":cls}, colCls:{j:cls}, pk:[j], fk:[j], note, empty, nullTxt} */
  T6.table = function (rel, o = {}) {
    const wrap = h("div", { class: "t6-rel" });
    if (rel.name) wrap.append(h("div", { class: "t6-rn", html: rel.name }));
    const tb = h("table", { class: "t grid t6" });
    const hr = h("tr");
    rel.cols.forEach((c, j) => {
      const mark = (o.pk || []).includes(j) ? " t6-pk" : (o.fk || []).includes(j) ? " t6-fk" : "";
      hr.append(h("th", { class: ((o.colCls && o.colCls[j]) || "") + mark, html: S.esc(c) + ((o.pk || []).includes(j) ? ' <span class="t6-tag">PK</span>' : "") + ((o.fk || []).includes(j) ? ' <span class="t6-tag">FK</span>' : "") }));
    });
    tb.append(hr);
    if (!rel.rows.length) tb.append(h("tr", null, h("td", { colspan: rel.cols.length || 1, class: "muted", text: o.empty || "∅ (няма редове)" })));
    rel.rows.forEach((r, i) => {
      const tr = h("tr", { class: (o.rowCls && o.rowCls[i]) || "" });
      r.forEach((v, j) => {
        const cls = (o.cellCls && o.cellCls[i + "," + j]) || (o.rowCls && o.rowCls[i]) || (o.colCls && o.colCls[j]) || "";
        const isNull = v === null || v === "" || v === undefined;
        tr.append(h("td", { class: cls + (isNull ? " t6-null" : ""), text: isNull ? (o.nullTxt || "NULL") : String(v) }));
      });
      tb.append(tr);
    });
    wrap.append(h("div", { class: "tbl-wrap" }, tb));
    if (o.note) wrap.append(h("div", { class: "t6-note", html: o.note }));
    return wrap;
  };

  /** Ред от таблици с етикет между тях (напр. оператор). */
  T6.row = function (...kids) { return h("div", { class: "t6-row" }, ...kids); };
  T6.op = function (txt) { return h("div", { class: "t6-op", html: txt }); };

  /** Блок с SQL текст (само показване). */
  T6.sql = function (txt) { return h("pre", { class: "t6-sql", text: txt }); };

  /** Множество атрибути като „хапчета“. cls(a) -> клас */
  T6.attrs = function (names, cls) {
    return h("div", { class: "t6-attrs" }, ...names.map((a, k) => h("span", { class: "pill " + (cls ? cls(a, k) : "") , text: a })));
  };

  /* стилове, специфични за темата */
  const css = `
.t6-rel{display:grid;gap:4px;min-width:0;align-content:start}
.t6-rn{font:600 .85rem var(--f-mono);color:var(--ink-2)}
table.t6 td,table.t6 th{min-width:30px;font-size:.84rem;padding:4px 7px;white-space:nowrap}
table.t6 th.t6-pk{text-decoration:underline;text-underline-offset:3px}
table.t6 th.t6-fk{font-style:italic}
table.t6 .t6-tag{font:600 .62rem var(--f-body);color:var(--muted);vertical-align:1px}
table.t6 tr.s-act td,table.t6 tr.s-cmp td,table.t6 tr.s-done td,table.t6 tr.s-swap td,table.t6 tr.s-piv td{background:var(--cb)}
table.t6 tr.s-dim td{opacity:.45;text-decoration:line-through}
table.t6 td.s-dim{opacity:.45}
table.t6 th.s-act,table.t6 th.s-cmp,table.t6 th.s-done,table.t6 th.s-piv,table.t6 th.s-swap{background:var(--cb);color:var(--c)}
table.t6 td.t6-null{color:var(--muted);font-style:italic}
.t6-note{font-size:.8rem;color:var(--muted);max-width:44ch}
.t6-row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.t6-op{font:700 1.2rem var(--f-mono);color:var(--muted);align-self:center}
pre.t6-sql{margin:0;background:var(--code-bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font:13px/1.5 var(--f-mono);white-space:pre-wrap;overflow-wrap:anywhere;color:var(--code-ink)}
.t6-attrs{display:flex;flex-wrap:wrap;gap:6px}
.t6-schema{display:grid;gap:10px}
.t6-diag{display:grid;gap:10px}
.t6-diag svg{max-width:100%;height:auto}
.t6-diag svg .box rect{fill:var(--cb,var(--panel));stroke:var(--c,var(--line));stroke-width:1.5}
.t6-diag svg .box{cursor:pointer}
.t6-diag svg .box:hover rect{stroke:var(--accent)}
.t6-diag svg .box text{fill:var(--ink);font:13px var(--f-body)}
.t6-diag svg .box text.sm{font-size:11px;fill:var(--muted)}
.t6-diag svg .ln{stroke:var(--muted);stroke-width:1.5;fill:none}
.t6-diag svg .ln.s-act,.t6-diag svg .ln.s-done,.t6-diag svg .ln.s-swap{stroke:var(--c);stroke-width:2.5}
.t6-diag svg .lbl{fill:var(--muted);font:11px var(--f-mono)}
.t6-res{font:600 .9rem var(--f-mono)}
.t6-tableau td{min-width:44px}
`;
  document.head.append(h("style", { html: css }));
})();
