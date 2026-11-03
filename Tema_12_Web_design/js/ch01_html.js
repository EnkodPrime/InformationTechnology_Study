(function () {
  const S = window.Study, h = S.h;
  const SAMPLE = `<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Учебна страница</title>
</head>
<body>
  <header><h1>Моят учебен сайт</h1></header>
  <nav aria-label="Основна навигация"><a href="#tema">Към темата</a></nav>
  <main id="tema">
    <article><h2>Уеб дизайн</h2><p>Структура, представяне и поведение.</p></article>
  </main>
  <footer><small>Материал за подготовка</small></footer>
</body>
</html>`;
  const html = `<div id="html-playground"></div><div class="prose"><p><dfn data-g="html">HTML</dfn> е език за маркиране. Елементът има име, атрибути и обикновено съдържание. В <code>&lt;a href="index.html"&gt;Начало&lt;/a&gt;</code> атрибутът <code>href</code> задава целта на връзката. <code>img</code>, <code>input</code> и <code>meta</code> са празни (void) елементи — нямат затварящ таг.</p>
  <p><code>doctype</code> включва стандартния режим на HTML. В <code>head</code> са метаданните; в <code>body</code> — съдържанието. <code>lang="bg"</code> посочва езика; <code>charset="utf-8"</code> — кодирането; <code>title</code> е заглавието на документа, а <code>h1</code> е заглавие в съдържанието.</p></div>
  <div class="block"><h3>Семантични структурни елементи</h3><table class="t"><tr><th>Елемент</th><th>Роля</th></tr>
  <tr><td>header, footer</td><td>Въвеждаща и заключителна информация за страница или секция</td></tr>
  <tr><td>nav, main</td><td>Основна навигация и основно съдържание</td></tr>
  <tr><td>article, section, aside</td><td>Самостоятелно съдържание, тематична секция, странично свързана информация</td></tr>
  <tr><td>h1–h6, p, ul/ol/li</td><td>Йерархия от заглавия, абзаци, списъци</td></tr>
  <tr><td>a, img, figure/figcaption</td><td>Връзки, изображения и надписи</td></tr>
  <tr><td>table, caption, tr, th, td</td><td>Таблични данни; таблица не е средство за общо оформление</td></tr>
  <tr><td>div, span</td><td>Общи контейнери без собствен специализиран семантичен смисъл</td></tr></table>
  <p class="prose">Избираме елемент по смисъл, а не по вида му по подразбиране. <code>button</code> изпълнява действие, <code>a href</code> навигира. Заглавията отразяват йерархията, а размерът им се задава с CSS. Изображението има подходящ <code>alt</code>; чисто декоративното — празен <code>alt=""</code>.</p></div>
  <div class="block"><h3>От HTML текст до DOM</h3><p class="prose"><dfn data-g="dom">DOM</dfn> е дървовидното представяне в паметта. Браузърът анализира HTML и създава възли. Може да поправя невалидно влагане; дървото не е гарантирано буквално копие на изходния текст. CSS избира елементи от това дърво, а JavaScript може да го променя.</p>
  <table class="t"><tr><th>Родител</th><th>Деца в примера</th></tr><tr><td>document</td><td>doctype, html</td></tr><tr><td>html</td><td>head, body</td></tr><tr><td>head</td><td>meta, title</td></tr><tr><td>body</td><td>header, nav, main, footer</td></tr><tr><td>main</td><td>article</td></tr><tr><td>article</td><td>h2, p</td></tr></table>
  <details class="trap"><summary>Капан: таг, елемент и DOM възел</summary><div><p>Тагът е част от синтаксиса; елементът е структурна единица. DOM включва и текстови възли и коментари. След JavaScript промяна изходният HTML файл може да остане същият, докато DOM вече е различен.</p></div></details></div>
  <div class="block"><h3>Редактируем HTML документ</h3><p>Промени заглавието, добави списък или връзка към секция и обнови изгледа.</p><label for="html-source">HTML</label><textarea id="html-source" rows="20" spellcheck="false" class="mono" style="width:100%"></textarea>
  <p><button class="btn" id="render-html" type="button">Обнови изгледа</button> <button class="btn ghost" id="reset-html" type="button">Начален пример</button></p>
  <iframe id="html-preview" title="Преглед на HTML документа" sandbox="" style="width:100%;height:300px;border:1px solid var(--line);background:white"></iframe>
  <p class="muted">Изолиран преглед на HTML: скриптове и изпращане на формуляри са изключени. Относителните адреси се тълкуват спрямо адреса на страницата; абсолютният URL включва схема и хост.</p></div>`;
  function mount(root) {
    window.WebPlayground.mount(root.querySelector("#html-playground"), "html");
    const input = root.querySelector("#html-source"), frame = root.querySelector("#html-preview");
    function render() {
      const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">';
      const source = input.value;
      frame.srcdoc = /^\s*<!doctype html>/i.test(source) ? source.replace(/^(\s*<!doctype html>)/i, '$1' + policy) : policy + source;
    }
    root.querySelector("#render-html").addEventListener("click", render);
    root.querySelector("#reset-html").addEventListener("click", () => { input.addEventListener("input", render); input.value = SAMPLE; render(); });
    input.addEventListener("input", render); input.value = SAMPLE; render();
  }
  S.chapter({id:"html", order:1, num:"1", group:"Структура", title:"HTML: документ, елементи и семантика", lead:"Структура на документа, смисъл на елементите, DOM и редактируем пример.", html, mount, algos:{}});
})();
