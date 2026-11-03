(function () {
  const S=window.Study;
  const html=`<div class="block"><h3>Опорен план за допълнителния материал</h3><ol class="prose">
  <li><b>Уеб дизайн:</b> потребители, задачи, информационна архитектура, навигация, визуална йерархия, използваемост и достъпност.</li>
  <li><b>Основни структурни елементи:</b> HTML документ (doctype, html, head, body), метаданни, семантични области, заглавия, абзаци, списъци, връзки, изображения, таблици и формуляри. HTML се анализира до DOM.</li>
  <li><b>Форматиране:</b> CSS правила и селектори, каскада и наследяване, шрифт и цвят, кутиев модел, нормален поток, Flexbox, Grid и media queries.</li>
  <li><b>Програмиране:</b> променливи, условия, цикли и функции в JavaScript; DOM операции и събития; валидация и комуникация със сървър. Разграничавам клиентския код от сървърните проверки.</li>
  <li><b>Свързващ пример:</b> HTML формулярът задава полетата; CSS го подрежда; JavaScript обработва взаимодействието; сървърът проверява данните и правата при реална заявка.</li></ol></div>
  <div class="block"><h3>Работен процес</h3><p class="prose">Уточни аудиторията и целта → подреди съдържанието и навигацията → направи скица на страницата → реализирай семантичен HTML → добави адаптивен CSS → добави JavaScript само за нужното поведение → провери → публикувай и поддържай. Прототипът проверява идея; готовият сайт изисква и реална обработка на грешки, достъпност и сигурност.</p>
  <ul class="prose"><li>HTML валидатор и браузърни DevTools: DOM, приложени стилове, box model, конзола и мрежови заявки.</li><li>Клавиатура, видим фокус, увеличение, тесен и широк екран; проверка на смисления ред и етикетите.</li><li>Валиден и невалиден вход, липсващ ресурс, отказ на сървъра, бавна връзка; проверка на връзките.</li><li>Оптимизирани изображения, разумно количество CSS/JS и стабилно оформление при зареждане.</li></ul></div>
  <div class="block"><h3>Разграничения за запомняне</h3><table class="t"><tr><th>Понятия</th><th>Разлика</th></tr>
  <tr><td>Интернет / Web</td><td>Мрежова инфраструктура / система от уеб ресурси и услуги върху нея</td></tr>
  <tr><td>HTML / DOM</td><td>Изходна маркировка / дърво в паметта, което може да е променено</td></tr>
  <tr><td>Клас / id</td><td>Повторно използваем етикет / уникален идентификатор в документа</td></tr>
  <tr><td>Padding / margin</td><td>Отстояние вътре в рамката / извън рамката</td></tr>
  <tr><td>Специфичност / каскада</td><td>Критерий / цялостният избор на декларация</td></tr>
  <tr><td>textContent / innerHTML</td><td>Буквален текст / анализирано HTML съдържание</td></tr>
  <tr><td>preventDefault / stopPropagation</td><td>Отмяна на подразбираното действие / спиране на разпространението</td></tr>
  <tr><td>Клиентска / сървърна валидация</td><td>Обратна връзка към потребителя / задължителна проверка на недоверения вход</td></tr>
  <tr><td>POST / HTTPS</td><td>HTTP метод / защита на транспорта</td></tr></table></div>
  <div class="block"><h3>Източници и допълнително четене</h3><ul class="prose">
  <li><a href="https://html.spec.whatwg.org/multipage/" target="_blank" rel="noopener">WHATWG HTML Living Standard</a> — структура, семантика и формуляри.</li>
  <li><a href="https://www.w3.org/TR/css-cascade-5/" target="_blank" rel="noopener">W3C CSS Cascading and Inheritance</a> — каскада, произход, слоеве и важност.</li>
  <li><a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity" target="_blank" rel="noopener">MDN: Specificity</a> и <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing" target="_blank" rel="noopener">box-sizing</a>.</li>
  <li><a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling" target="_blank" rel="noopener">MDN: Event bubbling</a> и <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" target="_blank" rel="noopener">JavaScript Guide</a>.</li>
  <li><a href="https://www.w3.org/WAI/tutorials/" target="_blank" rel="noopener">W3C WAI Tutorials</a> — практически насоки за достъпност.</li>
  <li><a href="https://www.rfc-editor.org/rfc/rfc9110.html" target="_blank" rel="noopener">RFC 9110: HTTP Semantics</a> — методи и статуси.</li></ul>
  <p class="muted">Нормативните спецификации и документацията обосновават техническите примери. Темата присъства в конспекта от 21.01.2025 г. и е запазена като допълнителен материал извън новия конспект.</p></div>`;
  S.chapter({id:"sistematizacia",order:6,num:"6",group:"Обобщение",title:"Систематизация и опорен план",lead:"Преглед на трите части на допълнителния материал, работен процес, разграничения и източници.",html,mount(){},algos:{}});
})();
