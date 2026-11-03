/* HTML/CSS playground: local srcdoc preview, generated source and native controls. */
(function () {
  "use strict";
  const P = window.WebPlayground = {};
  const MODES = [["html", "HTML · структурни елементи"], ["flex", "CSS · Flexbox"], ["grid", "CSS · Grid"], ["media", "CSS · media queries"]];
  const OPTIONS = {
    direction: ["row", "row-reverse", "column", "column-reverse"],
    wrap: ["nowrap", "wrap", "wrap-reverse"],
    justify: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
    align: ["stretch", "flex-start", "flex-end", "center", "baseline"],
    content: ["normal", "stretch", "flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
    gridAlign: ["stretch", "start", "end", "center"],
    gridContent: ["start", "end", "center", "stretch", "space-between", "space-around", "space-evenly"],
    columns: [["repeat(2, minmax(0, 1fr))", "2 равни колони"], ["repeat(3, minmax(0, 1fr))", "3 равни колони"], ["repeat(4, minmax(0, 1fr))", "4 равни колони"], ["repeat(6, minmax(0, 1fr))", "6 равни колони"], ["repeat(auto-fit, minmax(140px, 1fr))", "auto-fit · минимум 140px"], ["100px 1fr 2fr", "100px / 1fr / 2fr"], ["120px 120px", "2 фиксирани колони по 120px"]],
    rootTag: ["main", "div", "section", "article", "nav", "aside", "header", "footer"],
    itemTag: ["article", "section", "div", "aside"],
    heading: ["h1", "h2", "h3", "h4", "h5", "h6"],
    contentType: [["text", "Абзац · p"], ["list", "Списък · ul и li"], ["link", "Връзка · a"], ["button", "Бутон · button"], ["image", "Изображение · img с alt"]],
    rows: ["auto", "80px", "120px", "minmax(80px, auto)"],
    flow: ["row", "column", "row dense", "column dense"],
    basis: ["auto", "0px", "80px", "120px", "180px", "25%", "40%"],
    self: ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"],
    gridSelf: ["auto", "start", "end", "center", "stretch"],
    span: [["auto", "auto · автоматично"], ["span 2", "span 2 · две колони"], ["span 3", "span 3 · три колони"], ["1 / -1", "1 / -1 · целият явен ред"]],
    rowSpan: ["auto", "span 2", "span 3"],
    feature: [["min-width", "min-width · поне прага"], ["max-width", "max-width · най-много прага"]],
    display: ["grid", "flex", "block"],
    palette: [["#e7f0ff", "Синьо"], ["#e2f6e8", "Зелено"], ["#fff0db", "Оранжево"], ["#f1e7ff", "Лилаво"]]
  };
  const DEFAULTS = {
    mode: "flex", width: 720, height: 380, count: 6, gap: 12, padding: 16,
    direction: "row", wrap: "wrap", justify: "flex-start", align: "stretch", content: "normal",
    columns: "repeat(3, minmax(0, 1fr))", rows: "auto", flow: "row", gridAlign: "stretch", gridJustify: "stretch", gridContent: "start",
    itemWidth: 160, itemHeight: "auto", varied: false, selected: 2, grow: 0, shrink: 1, basis: "auto", self: "auto", span: "auto", rowSpan: "auto", gridSelf: "auto",
    rootTag: "main", itemTag: "article", heading: "h2", contentType: "text", showHeader: true, showNav: true, showAside: true, showFooter: true, outlines: true,
    feature: "min-width", breakpoint: 600, baseDisplay: "grid", activeDisplay: "grid", baseColumns: 1, activeColumns: 3,
    baseDirection: "column", activeDirection: "row", baseColor: "#e7f0ff", activeColor: "#e2f6e8"
  };
  const HELPS = {
    html: "Избери HTML елементи и виж маркировката им. Семантиката може да се промени без голяма промяна във външния вид — сравни генерирания HTML и етикетите.",
    flex: "Контейнерът е с пунктир. Променяй по едно свойство. При row основната ос е хоризонтална, при column — вертикална. Оцветеният елемент има отделни настройки.",
    grid: "Избери колони, автоматични редове и подравняване. 1fr дели свободното пространство. span може да създаде допълнителни колони, ако поискате повече от наличните.",
    media: "Ширината е на iframe прегледа, а не на прозореца на сайта. Условието включва самия праг. Премини точно под, на и над него и сравни фона и подредбата."
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
  function choice(key, value, fallback) {
    const values = OPTIONS[key].map(x => Array.isArray(x) ? x[0] : x);
    return values.includes(value) ? value : fallback;
  }
  function integer(v, min, max, fallback) {
    if (String(v).trim() === "" || !Number.isFinite(Number(v))) return fallback;
    return Math.min(max, Math.max(min, Math.round(Number(v))));
  }
  P.defaults = DEFAULTS;
  P.options = OPTIONS;
  P.normalize = function (raw) {
    const s = { ...DEFAULTS, ...raw };
    if (!MODES.some(x => x[0] === s.mode)) s.mode = DEFAULTS.mode;
    for (const k of ["direction", "wrap", "justify", "align", "content", "columns", "rows", "flow", "gridAlign", "gridContent", "basis", "self", "span", "rowSpan", "gridSelf", "rootTag", "itemTag", "heading", "contentType", "feature"])
      s[k] = choice(k, s[k], DEFAULTS[k]);
    s.gridJustify = choice("gridAlign", s.gridJustify, DEFAULTS.gridJustify);
    for (const k of ["baseDisplay", "activeDisplay"]) s[k] = choice("display", s[k], DEFAULTS[k]);
    for (const k of ["baseDirection", "activeDirection"]) s[k] = choice("direction", s[k], DEFAULTS[k]);
    for (const k of ["baseColor", "activeColor"]) s[k] = choice("palette", s[k], DEFAULTS[k]);
    for (const [k, lo, hi] of [["width",240,1280],["height",220,720],["count",1,12],["gap",0,48],["padding",0,40],["itemWidth",60,240],["grow",0,4],["shrink",0,4],["breakpoint",280,1200],["baseColumns",1,6],["activeColumns",1,6]]) s[k] = integer(s[k],lo,hi,DEFAULTS[k]);
    s.selected = integer(s.selected,1,s.count,Math.min(2,s.count));
    s.itemHeight = ["auto", "60px", "100px", "150px"].includes(s.itemHeight) ? s.itemHeight : "auto";
    for (const k of ["varied", "showHeader", "showNav", "showAside", "showFooter", "outlines"]) s[k] = s[k] === true || s[k] === "true";
    return s;
  };
  P.build = function (raw) {
    const s = P.normalize(raw), htmlMode = s.mode === "html";
    const root = htmlMode ? s.rootTag : "div", tag = htmlMode ? s.itemTag : "article";
    const heading = htmlMode ? s.heading : "h2";
    const items = [];
    for (let i = 1; i <= s.count; i++) {
      let content = "<p>Съдържание " + i + (s.varied && i % 2 === 0 ? ". По-дълъг текст, който заема повече място и показва разликата между размерите." : ".") + "</p>";
      if (htmlMode) {
        if (s.contentType === "list") content = "<ul><li>Първа точка</li><li>Втора точка</li></ul>";
        if (s.contentType === "link") content = '<a href="#preview-top">Към началото на прегледа</a>';
        if (s.contentType === "button") content = '<button type="button">Примерен бутон</button>';
        if (s.contentType === "image") {
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" rx="8" fill="#cde5f1"/><text x="120" y="47" text-anchor="middle" font-size="20" fill="#14394b">HTML img</text></svg>';
          content = '<img width="240" height="80" src="data:image/svg+xml,' + esc(encodeURIComponent(svg)) + '" alt="Учебно изображение с надпис HTML img">';
        }
      }
      items.push(`  <${tag} class="item${i === s.selected && ["flex", "grid"].includes(s.mode) ? " chosen" : ""}" data-element="${tag} · ${i}">\n    <${heading}>Елемент ${i}</${heading}>\n    ${content}\n  </${tag}>`);
    }
    const before = htmlMode ? [s.showHeader ? '<header data-element="header" id="preview-top"><h1>Моят учебен сайт</h1></header>' : '<div id="preview-top"></div>', s.showNav ? '<nav data-element="nav" aria-label="Учебна навигация"><a href="#demo">Към съдържанието</a></nav>' : ""].filter(Boolean).join("\n") + "\n" : "";
    const after = htmlMode ? [s.showAside ? '<aside data-element="aside"><p>Допълнителна информация</p></aside>' : "", s.showFooter ? '<footer data-element="footer"><small>Край на страницата</small></footer>' : ""].filter(Boolean).join("\n") : "";
    const html = before + `<${root} class="demo" id="demo"${htmlMode ? ` data-element="${root}"` : ""}>\n` + items.join("\n") + `\n</${root}>\n` + after;
    let css = `* { box-sizing: border-box; }\nbody { margin: 0; padding: 12px; font: 16px/1.4 system-ui, sans-serif; color: #183044; background: #f8fafc; }\n.item { min-width: 0; overflow-wrap: anywhere; padding: 12px; border: 2px solid #527d9d; border-radius: 8px; background: #e7f0ff; }\n.item h1, .item h2, .item h3, .item h4, .item h5, .item h6 { margin: 0 0 8px; }\n.item p { margin: 0; }\n.item:nth-child(even) { background: #fff0db; }\n.chosen { outline: 3px solid #ae411d; outline-offset: -3px; }\n`;
    if (htmlMode) {
      css += `.demo { padding: ${s.padding}px; }\nheader, nav, aside, footer { padding: 12px; margin-bottom: 8px; background: #edf2f7; }\n.item { margin-bottom: ${s.gap}px; }\nimg { max-width: 100%; height: auto; }\n`;
      if (s.outlines) css += `[data-element] { position: relative; border: 2px dashed #527d9d; padding-top: 30px; }\n[data-element]::before { content: attr(data-element); position: absolute; top: 3px; left: 5px; color: #183044; background: #fff; padding: 1px 5px; font: 12px/1.4 monospace; }\n`;
    } else {
      css += `.demo { height: ${s.height - 24}px; padding: ${s.padding}px; gap: ${s.gap}px; border: 2px dashed #527d9d; overflow: auto; }\n.item { width: ${s.itemWidth}px;${s.itemHeight !== "auto" ? " height: " + s.itemHeight + "; overflow: auto;" : ""} }\n`;
      if (s.mode === "flex") css += `.demo { display: flex; flex-direction: ${s.direction}; flex-wrap: ${s.wrap}; justify-content: ${s.justify}; align-items: ${s.align}; align-content: ${s.content}; }\n.item:nth-child(${s.selected}) { flex-grow: ${s.grow}; flex-shrink: ${s.shrink}; flex-basis: ${s.basis}; align-self: ${s.self}; }\n`;
      if (s.mode === "grid") css += `.demo { display: grid; grid-template-columns: ${s.columns}; grid-auto-rows: ${s.rows}; grid-auto-columns: 120px; grid-auto-flow: ${s.flow}; justify-items: ${s.gridJustify}; align-items: ${s.gridAlign}; justify-content: ${s.justify === "flex-start" ? "start" : s.justify === "flex-end" ? "end" : s.justify}; align-content: ${s.gridContent}; }\n.item { width: auto; }\n.item:nth-child(${s.selected}) { grid-column: ${s.span}; grid-row: ${s.rowSpan}; align-self: ${s.gridSelf}; }\n`;
      if (s.mode === "media") css += `.demo { display: ${s.baseDisplay}; grid-template-columns: repeat(${s.baseColumns}, minmax(0, 1fr)); flex-direction: ${s.baseDirection}; background: ${s.baseColor}; }\n.item { width: auto; }\n@media (${s.feature}: ${s.breakpoint}px) {\n  .demo { display: ${s.activeDisplay}; grid-template-columns: repeat(${s.activeColumns}, minmax(0, 1fr)); flex-direction: ${s.activeDirection}; background: ${s.activeColor}; }\n}\n`;
    }
    const active = s.feature === "min-width" ? s.width >= s.breakpoint : s.width <= s.breakpoint;
    const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">';
    const document = '<!doctype html><html lang="bg"><head><meta charset="utf-8">' + policy + '<meta name="viewport" content="width=device-width, initial-scale=1"><title>HTML и CSS playground</title><style>' + css + '</style></head><body>' + html + '</body></html>';
    return { state: s, html, css, document, active };
  };
  const STYLE = `
.wp-lab { border:1px solid var(--line); border-radius:12px; padding:16px; display:grid; gap:16px; min-width:0; background:var(--panel); }
.wp-lab h3,.wp-lab p { margin:0; }.wp-toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.wp-toolbar .wp-field{flex:1 1 210px}.wp-field{display:grid;gap:5px;min-width:0;font-size:.85rem}.wp-field select,.wp-field input[type=number]{width:100%;min-width:0;box-sizing:border-box}.wp-field small{font-size:.76rem;color:var(--muted);line-height:1.35}.wp-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.wp-panel{display:grid;gap:12px}.wp-panel[hidden]{display:none}.wp-panel fieldset{border:1px solid var(--line);padding:12px;min-width:0;border-radius:8px}.wp-panel legend{padding:0 6px;font-size:.88rem;font-weight:600}.wp-numeric{display:grid;grid-template-columns:minmax(0,1fr) 72px;gap:8px;align-items:center}.wp-numeric input[type=range]{width:100%;min-width:0}.wp-check{display:flex;align-items:center;gap:7px;font-size:.85rem}.wp-frame-wrap{overflow:auto;max-width:100%;border:1px solid var(--line);border-radius:8px;background:#dce3eb;padding:8px}.wp-frame{display:block;border:0;background:white;max-width:none;box-sizing:content-box;flex:none}.wp-status{padding:10px 12px;background:var(--bg);border-radius:6px;font-size:.88rem;overflow-wrap:anywhere}.wp-status[data-active=true]{border-left:4px solid #2d8055}.wp-status[data-active=false]{border-left:4px solid #ae411d}.wp-sources{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wp-sources textarea{width:100%;height:260px;box-sizing:border-box;font:12px/1.5 var(--f-mono,monospace);white-space:pre;overflow:auto}.wp-sources label{display:grid;gap:6px;min-width:0}.wp-actions{display:flex;flex-wrap:wrap;gap:8px}.wp-help{color:var(--ink-2);font-size:.88rem;line-height:1.5}.wp-width-presets{display:flex;flex-wrap:wrap;gap:6px}.wp-lab summary{cursor:pointer}.wp-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.wp-title .pill{font-size:.75rem}.wp-copy-status{min-height:1.3em;font-size:.8rem;color:var(--muted)}
@media(max-width:650px){.wp-sources{grid-template-columns:1fr}.wp-controls{grid-template-columns:1fr 1fr}.wp-lab{padding:12px}.wp-toolbar{align-items:stretch}.wp-toolbar .wp-field{flex-basis:100%}}
@media(max-width:420px){.wp-controls{grid-template-columns:1fr}}
`;
  let nextId = 0;
  P.mount = function (host, initialMode) {
    if (!host) return;
    if (!document.getElementById("web-playground-style")) {
      const style = document.createElement("style"); style.id = "web-playground-style"; style.textContent = STYLE; document.head.append(style);
    }
    const S = window.Study, h = S.h, uid = "wp-" + (++nextId);
    let state = { ...DEFAULTS, mode: initialMode || "flex" };
    if (state.mode === "html") state.count = 2;
    const fields = {}, root = h("div", { class:"wp-lab", "data-playground":true });
    const field = (key, label, control, help) => {
      control.id = uid + "-" + key; control.dataset.key = key; fields[key] = control;
      const hint = help ? h("small", { id:control.id + "-help", text:help }) : null;
      if (hint) control.setAttribute("aria-describedby", hint.id);
      return h("label", { class:"wp-field", for:control.id }, h("span", {text:label}), control, hint);
    };
    const select = (key,label,opts,help) => field(key,label,h("select",null,...opts.map(x=>{const [v,t]=Array.isArray(x)?x:[x,x];return h("option",{value:v,text:t});})),help);
    const numeric = (key,label,min,max,step,help) => {
      const input=h("input",{type:"number",min,max,step:step||1}),range=h("input",{type:"range",min,max,step:step||1,"aria-label":label + " — плъзгач"});
      input.id=uid+"-"+key; input.dataset.key=key; fields[key]=input;
      range.dataset.forKey=key;
      range.addEventListener("input",()=>{input.value=range.value;input.dispatchEvent(new Event("input",{bubbles:true}));});
      return h("div",{class:"wp-field"},h("label",{for:input.id,text:label}),h("div",{class:"wp-numeric"},range,input),help?h("small",{text:help}):null);
    };
    const check = (key,label) => {const input=h("input",{type:"checkbox","data-key":key,id:uid+"-"+key});fields[key]=input;return h("label",{class:"wp-check",for:input.id},input,label);};
    const controls = (...kids) => h("div",{class:"wp-controls"},...kids);
    const group = (label,...kids) => h("fieldset",null,h("legend",{text:label}),controls(...kids));
    root.append(h("div",{class:"wp-title"},h("h3",{text:"HTML и CSS playground"}),h("span",{class:"pill",text:"Промените се виждат веднага"})));
    const modeSelect=select("mode","Какво изследвам",MODES);
    const preset=h("select",{id:uid+"-preset","aria-label":"Готов пример"});
    const presetWrap=h("label",{class:"wp-field",for:preset.id},h("span",{text:"Готов пример"}),preset);
    const reset=h("button",{class:"btn ghost",type:"button",text:"Нулирай настройките"});
    root.append(h("div",{class:"wp-toolbar"},modeSelect,presetWrap,reset));
    const help=h("p",{class:"wp-help"});root.append(help);
    root.append(group("Размери на прегледа",numeric("width","Ширина на viewport (px)",240,1280,1),numeric("height","Височина на viewport (px)",220,720,1),numeric("count","Брой елементи",1,12,1),numeric("gap","gap / отстояние между елементите (px)",0,48,1),numeric("padding","padding на контейнера (px)",0,40,1)));
    const widths=h("div",{class:"wp-width-presets"});
    for(const w of [320,360,600,800,1024])widths.append(h("button",{type:"button",class:"btn ghost",text:w+"px",onclick:()=>{state.width=w;sync();render();}}));
    root.append(widths);
    const panels={};const panel=(mode,...kids)=>{const el=h("div",{class:"wp-panel","data-mode-panel":mode},...kids);panels[mode]=el;root.append(el);};
    panel("html",group("HTML структура",select("rootTag","Обвиващ структурен елемент",OPTIONS.rootTag),select("itemTag","Елемент за всяка карта",OPTIONS.itemTag),select("heading","Ниво на заглавие в картите",OPTIONS.heading),select("contentType","Съдържание на картите",OPTIONS.contentType)),
      controls(check("showHeader","header · въвеждаща област"),check("showNav","nav · навигация"),check("showAside","aside · допълнение"),check("showFooter","footer · долна област"),check("outlines","Показвай граници и имена на таговете")));
    panel("flex",group("Flexbox · контейнер",select("direction","flex-direction",OPTIONS.direction,"Определя основната ос и посоката."),select("wrap","flex-wrap",OPTIONS.wrap,"nowrap може да свие елементите. wrap допуска нов ред / колона."),select("justify","justify-content",OPTIONS.justify,"Разпределя свободното пространство по основната ос."),select("align","align-items",OPTIONS.align,"Подравнява по напречната ос. Фиксирана височина ограничава stretch."),select("content","align-content",OPTIONS.content,"Ефектът личи при няколко flex реда, wrap и свободно място.")),
      group("Flexbox · само избрания елемент",select("selected","Избран елемент",Array.from({length:12},(_,i)=>[String(i+1),"Елемент "+(i+1)])),numeric("grow","flex-grow",0,4,1),numeric("shrink","flex-shrink",0,4,1),select("basis","flex-basis",OPTIONS.basis),select("self","align-self",OPTIONS.self)),
      group("Размер на всички flex елементи",numeric("itemWidth","width (px)",60,240,1),select("itemHeight","height",["auto","60px","100px","150px"]),check("varied","Различна дължина на текстовете")));
    // Same state keys appear in two modes; use mirrored controls without overwriting the field registry.
    const mirrorSelect=(key,label,opts,help)=>{const previous=fields[key];const el=select(key,label,opts,help);const control=fields[key];control.id += "-grid";el.htmlFor=control.id;const hint=el.querySelector("small");if(hint){hint.id=control.id+"-help";control.setAttribute("aria-describedby",hint.id);}fields[key]=previous;control.dataset.mirror=key;delete control.dataset.key;return el;};
    panel("grid",group("Grid · контейнер",select("columns","grid-template-columns",OPTIONS.columns),select("rows","grid-auto-rows",OPTIONS.rows),select("flow","grid-auto-flow",OPTIONS.flow,"При column се създават и неявни колони по 120px."),select("gridJustify","justify-items",OPTIONS.gridAlign),select("gridAlign","align-items",OPTIONS.gridAlign),mirrorSelect("justify","justify-content",OPTIONS.justify,"Виж ефекта при фиксирани колони, оставящи свободно място."),select("gridContent","align-content",OPTIONS.gridContent)),
      group("Grid · само избрания елемент",mirrorSelect("selected","Избран елемент",Array.from({length:12},(_,i)=>[String(i+1),"Елемент "+(i+1)])),select("span","grid-column",OPTIONS.span),select("rowSpan","grid-row",OPTIONS.rowSpan),select("gridSelf","align-self",OPTIONS.gridSelf)),
      group("Съдържание",mirrorSelect("itemHeight","height на всички елементи",["auto","60px","100px","150px"]),(()=>{const previous=fields.varied;const el=check("varied","Различна дължина на текстовете");const input=fields.varied;input.id+="-grid";el.htmlFor=input.id;input.dataset.mirror="varied";delete input.dataset.key;fields.varied=previous;return el;})()));
    const near=h("div",{class:"wp-width-presets"});
    for(const delta of [-1,0,1])near.append(h("button",{type:"button",class:"btn ghost","data-near":delta,onclick:()=>{state.width=state.breakpoint+delta;sync();render();}}));
    panel("media",group("Условие на media query",select("feature","Условие",OPTIONS.feature),numeric("breakpoint","Праг (px)",280,1200,1)),near,
      group("Базов CSS · извън условието",select("baseDisplay","display",OPTIONS.display),numeric("baseColumns","Брой Grid колони",1,6,1),select("baseDirection","flex-direction",OPTIONS.direction),select("baseColor","Фон на контейнера",OPTIONS.palette)),
      group("CSS вътре в media query",select("activeDisplay","display при съвпадение",OPTIONS.display),numeric("activeColumns","Брой Grid колони при съвпадение",1,6,1),select("activeDirection","flex-direction при съвпадение",OPTIONS.direction),select("activeColor","Фон при съвпадение",OPTIONS.palette)));
    const status=h("div",{class:"wp-status",role:"status","aria-live":"polite"});
    const iframe=h("iframe",{class:"wp-frame",title:"Интерактивен HTML и CSS преглед",sandbox:""});
    root.append(status,h("div",{class:"wp-frame-wrap"},iframe),h("p",{class:"wp-help",text:"Прегледът има собствена ширина. Ако е по-широк от екрана ти, плъзни хоризонтално в сивата област. Примерите са локални; бутоните в HTML прегледа нямат JavaScript поведение."}));
    const htmlSource=h("textarea",{readOnly:true,spellcheck:"false","aria-label":"Генериран HTML"}),cssSource=h("textarea",{readOnly:true,spellcheck:"false","aria-label":"Генериран CSS"});
    const copyStatus=h("p",{class:"wp-copy-status",role:"status"});
    const copy=(area,label)=>h("button",{type:"button",class:"btn",text:label,onclick:async()=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(area.value);copyStatus.textContent="Кодът е копиран.";}catch(e){area.focus();area.select();copyStatus.textContent="Кодът е маркиран. Натисни Ctrl+C (или ⌘C).";}}});
    root.append(h("details",{class:"wp-code",open:true},h("summary",{text:"Генериран HTML и CSS · виж какво променя всяка настройка"}),h("div",{class:"wp-sources"},h("label",null,h("span",{text:"HTML"}),htmlSource),h("label",null,h("span",{text:"CSS"}),cssSource)),h("div",{class:"wp-actions"},copy(htmlSource,"Копирай HTML"),copy(cssSource,"Копирай CSS")),copyStatus));
    const PRESETS={
      html:[["default","Семантична страница"],["minimal","Само div контейнери"],["lists","Списъци"],["images","Изображения и alt"]],
      flex:[["default","Редове с пренасяне"],["center","Центриране по двете оси"],["column","Вертикална основна ос"],["nowrap","Без пренасяне · shrink"],["grow","Елемент 2 расте"]],
      grid:[["default","3 равни колони"],["fixed","2 фиксирани колони"],["fit","auto-fit според ширината"],["span","Елемент 2 заема две колони"]],
      media:[["default","1 → 3 Grid колони при 600px"],["flex","Flexbox · колона → ред"],["max","max-width · тесен екран"]]
    };
    let lastMode="";
    function sync(){
      for(const [k,el] of Object.entries(fields)){if(el.type==="checkbox")el.checked=!!state[k];else el.value=String(state[k]);}
      root.querySelectorAll("[data-for-key]").forEach(el=>{el.value=state[el.dataset.forKey];});
      root.querySelectorAll("[data-mirror]").forEach(el=>{if(el.type==="checkbox")el.checked=state[el.dataset.mirror];else el.value=state[el.dataset.mirror];});
      root.querySelectorAll('select[data-key="selected"],select[data-mirror="selected"]').forEach(el=>{for(const opt of el.options)opt.disabled=+opt.value>state.count;});
      for(const [mode,p]of Object.entries(panels))p.hidden=mode!==state.mode;
      if(lastMode!==state.mode){preset.replaceChildren(...PRESETS[state.mode].map(([value,text])=>h("option",{value,text})));lastMode=state.mode;}
      near.querySelectorAll("button").forEach(el=>{const delta=+el.dataset.near;el.textContent=(state.breakpoint+delta)+"px · "+(delta<0?"под прага":delta>0?"над прага":"точно на прага");});
      fields.baseColumns.disabled=state.baseDisplay!=="grid";fields.activeColumns.disabled=state.activeDisplay!=="grid";
      fields.baseDirection.disabled=state.baseDisplay!=="flex";fields.activeDirection.disabled=state.activeDisplay!=="flex";
    }
    function render(){
      const result=P.build(state);state=result.state;help.textContent=HELPS[state.mode];
      iframe.style.width=state.width+"px";iframe.style.height=state.height+"px";iframe.srcdoc=result.document;
      htmlSource.value=result.html;cssSource.value=result.css;
      if(state.mode==="media"){
        status.dataset.active=String(result.active);
        status.textContent=`Viewport ${state.width}px · @media (${state.feature}: ${state.breakpoint}px) ${result.active?"СЪВПАДА — прилага се CSS вътре в условието":"НЕ СЪВПАДА — остава базовият CSS"}. display: ${result.active?state.activeDisplay:state.baseDisplay}.`;
      }else{delete status.dataset.active;status.textContent=`Преглед ${state.width} × ${state.height}px · ${state.count} елемента`+(state.mode==="html"?` · обвивка <${state.rootTag}>, карти <${state.itemTag}>.`:state.mode==="flex"?` · основна ос: ${state.direction.startsWith("row")?"хоризонтална":"вертикална"} · избран елемент ${state.selected}.`:` · избран елемент ${state.selected} · колони: ${state.columns}.`);}
    }
    root.addEventListener("input",e=>{
      const key=e.target.dataset.key||e.target.dataset.mirror;if(!key)return;
      if(e.target.type==="number"&&(e.target.value===""||!e.target.validity.valid))return;
      state[key]=e.target.type==="checkbox"?e.target.checked:e.target.value;
      state=P.normalize(state);sync();render();
    });
    // change also supports keyboard selection and assistive technologies.
    root.addEventListener("change",e=>{const key=e.target.dataset.key||e.target.dataset.mirror;if(!key)return;if(e.target.type==="number"){state[key]=e.target.value;state=P.normalize(state);sync();render();}else e.target.dispatchEvent(new Event("input",{bubbles:true}));});
    function setPreset(name){
      const mode=state.mode;state={...DEFAULTS,mode,count:mode==="html"?2:6};
      if(mode==="html"){if(name==="minimal")Object.assign(state,{rootTag:"div",itemTag:"div",showHeader:false,showNav:false,showAside:false,showFooter:false});if(name==="lists")state.contentType="list";if(name==="images")state.contentType="image";}
      if(mode==="flex"){if(name==="center")Object.assign(state,{count:3,wrap:"nowrap",justify:"center",align:"center"});if(name==="column")Object.assign(state,{direction:"column",count:3,align:"flex-start"});if(name==="nowrap")Object.assign(state,{width:360,wrap:"nowrap",count:6});if(name==="grow")Object.assign(state,{count:3,grow:1});}
      if(mode==="grid"){if(name==="fixed")Object.assign(state,{columns:"120px 120px",justify:"center",gridContent:"center"});if(name==="fit")state.columns="repeat(auto-fit, minmax(140px, 1fr))";if(name==="span")state.span="span 2";}
      if(mode==="media"){if(name==="flex")Object.assign(state,{baseDisplay:"flex",activeDisplay:"flex",count:3});if(name==="max")Object.assign(state,{feature:"max-width",baseColumns:3,activeColumns:1});}
      sync();preset.value=name;render();
    }
    preset.addEventListener("change",()=>setPreset(preset.value));reset.addEventListener("click",()=>setPreset("default"));
    host.append(root);sync();render();
    return {root,iframe,get state(){return {...state};}};
  };
})();
