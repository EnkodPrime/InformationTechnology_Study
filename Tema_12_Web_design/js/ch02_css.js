(function () {
  const S = window.Study, h = S.h;
  const algos = {
    box({width, padding, border, margin, sizing}) {
      width = S.int(width, 100, 500, "Ширината"); padding = S.int(padding, 0, 40, "Padding");
      border = S.int(border, 0, 10, "Рамката"); margin = S.int(margin, 0, 40, "Margin");
      if (!["content-box","border-box"].includes(sizing)) throw new Error("Непознат box-sizing.");
      const content = sizing === "content-box" ? width : width - 2 * padding - 2 * border;
      const outer = content + 2 * padding + 2 * border;
      return {content, outer, occupied:outer + 2 * margin, frames:[
        {part:"content", value:content, msg:`Съдържание: ${content}px. width се отнася за ${sizing === "content-box" ? "съдържанието" : "съдържанието + padding + border"}.`},
        {part:"padding", value:content + 2 * padding, msg:`Добавяме ляв и десен padding: ${content} + 2 × ${padding}.`},
        {part:"border", value:outer, msg:`Ширина на border box: ${outer}px. Margin не влиза в зададената width.`},
        {part:"margin", value:outer + 2 * margin, msg:`С външните хоризонтални отстояния: ${outer + 2 * margin}px. Моделът е без min/max-width и без свиване от layout.`,done:true}
      ]};
    },
    cascade({important, idRule}) {
      const imp = important === true || important === "true" || important === "1";
      const id = idRule === true || idRule === "true" || idRule === "1";
      const winner = imp ? ".note !important" : id ? "#demo" : ".note (последно)";
      return {winner, frames:[
        {msg:"Елементът е <p id='demo' class='note'>. Сравняваме само свойството color на съвпадащите декларации."},
        {msg:imp ? "Включена е важна авторска декларация: тя изпреварва нормалните в този модел." : "Всички декларации са нормални, авторски, без слоеве и в еднакъв обхват."},
        {msg:imp ? "Сред разглежданите важни декларации има само една." : id ? "#demo има специфичност (1,0,0); .note — (0,1,0); p — (0,0,1). Сравняват се лексикографски." : "Двете .note правила са с равна специфичност: печели по-късната декларация."},
        {msg:`Победител: ${winner}. Наследяването се разглежда, когато стойността се получава от родителя, а не като още един конкурентен селектор.`, winner,done:true}
      ]};
    }
  };
  const html = `<div class="prose"><p><dfn data-g="css">CSS</dfn> правило съдържа селектор и декларации: <code>.note { color: navy; padding: 1rem; }</code>. Свойство и стойност са разделени с двоеточие. Стиловете могат да са във външен файл чрез <code>link</code>, в <code>style</code> или в атрибута <code>style</code>; външният файл улеснява общото оформление и поддръжката.</p>
  <p>Селектори: <code>p</code> — тип; <code>.note</code> — клас; <code>#demo</code> — идентификатор; <code>nav a</code> — наследник; <code>ul &gt; li</code> — пряко дете; <code>:hover</code> и <code>:focus-visible</code> — състояния. Един клас може да се използва многократно; идентификаторът трябва да е уникален в документа.</p></div>
  <div class="block"><h3>Каскада, специфичност и наследяване</h3><p class="prose"><dfn data-g="каскада">Каскадата</dfn> избира стойност за всяко свойство поотделно. Значение имат произходът, важността и слоевете, а след тях специфичността, близостта на обхвата и редът. „Последното правило печели“ е вярно само при равенство на по-ранните критерии. <code>!important</code> променя приоритета в каскадата, не увеличава специфичността.</p>
  <pre class="mono">p { color: gray; }                 /* (0,0,1) */
.note { color: navy; }             /* (0,1,0) */
#demo { color: green; }            /* (1,0,0), по избор */
.note { color: purple; }           /* (0,1,0), по-късно */
.note { color: red !important; }   /* по избор */</pre><div id="v-cascade"></div>
  <p class="prose">Цвят и шрифт обикновено се наследяват; margin и border — не. <code>inherit</code> изрично взема стойността от родителя. Наследена стойност не побеждава пряко приложена декларация само защото селекторът на родителя е по-специфичен.</p></div>
  <div class="block"><h3>Кутиев модел</h3><p class="prose"><dfn data-g="кутиев модел">Кутиевият модел</dfn> различава съдържание, вътрешно отстояние (padding), рамка (border) и външно отстояние (margin). При <code>content-box</code> width е ширината на съдържанието; при <code>border-box</code> включва padding и border. Margin остава отвън.</p><div id="v-box"></div>
  <details class="trap"><summary>Капан: width:100% плюс padding</summary><div><p>При content-box padding и border се добавят към 100% и могат да причинят преливане. Често използваме <code>*, *::before, *::after { box-sizing: border-box; }</code>. Вертикални margin в нормалния блоков поток понякога се сливат; хоризонталната сметка тук не моделира това.</p></div></details></div>
  <div class="block"><h3>Форматиране на текст и размери</h3><p class="prose">Използвай <code>font-family</code> с резервно семейство, четим <code>font-size</code>, достатъчен <code>line-height</code> и контраст. <code>rem</code> е спрямо шрифта на корена; за font-size <code>em</code> е спрямо наследения размер; процентите зависят от свойството. CSS px е логическа единица и не е непременно един физически пиксел. Цвят сам по себе си не трябва да носи цялото значение.</p></div>`;
  function mount(root) {
    S.viz(root.querySelector("#v-cascade"), {id:"cascade",title:"Коя декларация печели?",code:false,
      sub:"Ограничен модел: авторски стилове, без слоеве, анимации, transitions, inline style и @scope.",
      inputs:[{id:"important",label:"!important",type:"checkbox",value:false},{id:"idRule",label:"#demo правило",type:"checkbox",value:true}],build:algos.cascade,
      draw(st,f) {st.replaceChildren(h("p",{class:"key",text:f.winner || "Сравняваме декларациите стъпка по стъпка."}));}});
    S.viz(root.querySelector("#v-box"), {id:"box",title:"Ширината стъпка по стъпка",code:false,
      inputs:[{id:"width",label:"width px",type:"number",value:240},{id:"padding",label:"padding px",type:"number",value:20},{id:"border",label:"border px",type:"number",value:4},{id:"margin",label:"margin px",type:"number",value:10},{id:"sizing",label:"box-sizing",type:"select",value:"content-box",options:[["content-box","content-box"],["border-box","border-box"]]}],
      build:algos.box, draw(st,f) {st.replaceChildren(h("div",{class:"card s-act",style:{width:f.value+"px",maxWidth:"100%",boxSizing:"border-box"},text:`${f.part}: ${f.value}px` }));}});
  }
  S.chapter({id:"css",order:2,num:"2",group:"Форматиране",title:"CSS: каскада и кутиев модел",lead:"Селектори, специфичност, наследяване, типография и изчисляване на ширината.",html,mount,algos});
})();
