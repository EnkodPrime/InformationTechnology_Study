(function () {
  const S=window.Study;
  const html=`<div class="prose"><p>Формулярът събира данни чрез <code>input</code>, <code>select</code> и <code>textarea</code>. <code>label for</code> се свързва с <code>id</code> на полето. <code>name</code> е името на изпращания параметър; id сам по себе си не го замества. Placeholder е кратка подсказка, а не заместител на етикета.</p>
  <p><code>required</code>, <code>type="email"</code>, <code>min</code>, <code>max</code> и <code>pattern</code> задават клиентски ограничения. Проверяват удобството и допустимия формат; email проверката не доказва, че адресът съществува. Данните се проверяват отново на сървъра — браузърната валидация може да се заобиколи.</p></div>
  <div class="block"><h3>Работещ формуляр: само локален резултат</h3><form id="demo-form">
  <p><label for="student-name">Име (задължително)</label><br><input id="student-name" name="name" required maxlength="80" autocomplete="off"></p>
  <p><label for="student-email">Примерен email (задължително)</label><br><input id="student-email" name="email" type="email" required autocomplete="off" placeholder="student@example.org"></p>
  <p><label for="student-topic">Тема</label><br><select id="student-topic" name="topic"><option value="html">HTML</option><option value="css">CSS</option><option value="js">JavaScript</option></select></p>
  <button class="btn" type="submit">Покажи данните локално</button></form>
  <output id="form-result" class="mono" aria-live="polite" style="display:block;white-space:pre-wrap;margin-top:12px"></output>
  <p class="muted">Използвай измислени данни. Няма сървърна заявка и данните не се запазват.</p>
  <pre class="mono">form.addEventListener('submit', (event) =&gt; {
  event.preventDefault();
  const values = new FormData(form);
  output.textContent = new URLSearchParams(values).toString();
});</pre></div>
  <div class="block"><h3>Клиентско и сървърно програмиране</h3><p class="prose">Браузърът показва документа и обработва взаимодействието. Сървърът обработва заявки, проверява права, изпълнява бизнес правила и достъпва база данни. Клиентът не трябва да получава сървърни тайни. Статичният сайт може да има JavaScript взаимодействие; „динамичен интерфейс“ не означава задължително сървърно генериран HTML.</p>
  <table class="t"><tr><th>Метод</th><th>Предназначение</th><th>Пример</th></tr><tr><td>GET</td><td>Извличане; параметрите на обикновен GET формуляр са в URL</td><td>/search?q=html</td></tr><tr><td>POST</td><td>Подаване за обработка; обикновено параметри в тялото</td><td>Регистрация или добавяне на запис</td></tr></table>
  <p class="prose">GET има безопасна семантика — не се използва за заявено изменение на състояние. POST не шифрова: HTTPS защитава транспорта и при двата метода. POST сам по себе си не защитава от CSRF и не замества оторизация. HTTP 200, 400, 401/403, 404 и 500 означават различни резултати; страницата трябва да показва разбираема грешка.</p>
  <details class="trap"><summary>Капан: скрит бутон ≠ защита на действие</summary><div><p>Потребителят може да промени клиентския JavaScript или да изпрати HTTP заявка направо. Сървърът проверява правото при всяко защитено действие. Това свързва уеб програмирането с тема 9, а HTTP обмена — с тема 11.</p></div></details></div>`;
  function mount(root) {
    const form=root.querySelector("#demo-form"), output=root.querySelector("#form-result");
    form.addEventListener("submit",event=>{event.preventDefault();const values=new FormData(form);output.textContent=new URLSearchParams(values).toString();});
  }
  S.chapter({id:"forms",order:5,num:"5",group:"Програмиране",title:"Формуляри, валидация и клиент–сървър",lead:"Етикети, полета, обработка на входа и границата между браузър и сървър.",html,mount,algos:{}});
})();
