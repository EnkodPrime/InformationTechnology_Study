(function () {
  const S = window.Study;
  const HTML = `<main class="cards">
  <article><h2>HTML</h2><p>Структура и значение.</p></article>
  <article><h2>CSS</h2><p>Представяне и подредба.</p></article>
  <article><h2>JavaScript</h2><p>Поведение и взаимодействие.</p></article>
</main>`;
  const CSS = `* { box-sizing: border-box; }
body { margin: 0; padding: 16px; font: 16px/1.5 system-ui; }
.cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
article { padding: 16px; border: 1px solid #8899aa; border-radius: 8px; }
h2 { color: #185b75; }
@media (min-width: 600px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
}`;
  const html = `<div class="prose"><p>В нормалния поток блоковите кутии обикновено се подреждат една след друга, а текстът и inline елементите — по редове. <code>display</code> избира модел на оформление. Не подреждаме страница с поредица от интервали и <code>br</code>.</p></div>
  <div class="block"><h3>Flexbox и Grid</h3><table class="t"><tr><th>Модел</th><th>Основна идея</th><th>Подходящ пример</th></tr>
  <tr><td>Flexbox</td><td>Едномерно разпределяне по основна ос, с възможно пренасяне</td><td>Навигация, лента от бутони; display:flex; gap:1rem; flex-wrap:wrap</td></tr>
  <tr><td>Grid</td><td>Редове и колони, общи линии на мрежата</td><td>Карти и областите на страница; grid-template-columns:repeat(3,1fr)</td></tr></table>
  <p class="prose">При Flexbox <code>justify-content</code> работи по основната ос, а <code>align-items</code> — по напречната; посоката зависи от <code>flex-direction</code>. При Grid <code>fr</code> разпределя свободното пространство. Flexbox и Grid могат да се влагат.</p>
  <p class="prose"><code>position:relative</code> запазва мястото в потока и позволява отместване. <code>absolute</code> изважда кутията от нормалния поток и я позиционира спрямо съдържащия блок, често най-близкия позициониран предшественик. <code>fixed</code> обичайно е спрямо viewport; <code>sticky</code> зависи от прага и контейнера за превъртане. Припокриването и stacking context не се свеждат само до най-голямо <code>z-index</code>.</p></div>
  <div class="block"><h3>Адаптивен дизайн: един документ, различна ширина</h3><p class="prose"><dfn data-g="адаптивен дизайн">Адаптивният дизайн</dfn> използва гъвкави размери, изображения и <dfn data-g="media query">media queries</dfn>. Mobile first започва с тесния изглед и добавя възможности при достатъчно пространство. Точките на пречупване се избират според съдържанието. Viewport meta настройва мобилния viewport; само по себе си не прави страницата адаптивна.</p>
  <p>Редактирай CSS и сравни 360px с 800px. Media query се оценява спрямо viewport на прегледа.</p>
  <label for="layout-css">CSS</label><textarea id="layout-css" rows="13" class="mono" spellcheck="false" style="width:100%"></textarea>
  <div class="row"><label for="preview-width">Ширина на прегледа</label><select id="preview-width"><option value="360">360px — телефон</option><option value="800">800px — широк изглед</option></select><button class="btn" id="layout-run" type="button">Приложи CSS</button><button class="btn ghost" id="layout-reset" type="button">Начален CSS</button></div>
  <div style="overflow:auto;margin-top:12px"><iframe id="layout-preview" title="Адаптивно оформление с Grid" sandbox="" style="height:390px;border:1px solid var(--line);background:white"></iframe></div>
  <details class="hint"><summary>Защо съдържанието идва първо?</summary><div><p>Логичният ред в HTML остава важен за клавиатура и екранни четци. CSS пренареждането на картите може да промени визуалния ред, без да промени реда на фокуса.</p></div></details></div>
  <div class="block"><h3>Проверка на достъпността</h3><ul class="prose"><li>Семантични заглавия и области, описателни връзки, текстови алтернативи на изображенията.</li><li>Всички действия са достижими с клавиатура; фокусът се вижда. Използвай native button и form controls.</li><li>Проверявай контраст, увеличение на текста и липса на нежелано хоризонтално превъртане.</li><li>Съдържанието остава разбираемо без цвят и при различни размери. Избягвай ненужно движение.</li></ul></div>`;
  function mount(root) {
    const css=root.querySelector("#layout-css"), width=root.querySelector("#preview-width"), frame=root.querySelector("#layout-preview");
    function render() {
      frame.style.width=width.value+"px";
      frame.srcdoc='<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css.value+'</style></head><body>'+HTML+'</body></html>';
    }
    css.value=CSS; root.querySelector("#layout-run").addEventListener("click",render);
    root.querySelector("#layout-reset").addEventListener("click",()=>{css.value=CSS;render();});
    width.addEventListener("change",render);render();
  }
  S.chapter({id:"layout",order:3,num:"3",group:"Форматиране",title:"Оформление, адаптивност и достъпност",lead:"Нормален поток, Flexbox, Grid и редактируема лаборатория с две ширини.",html,mount,algos:{}});
})();
