(function () {
  const S=window.Study, h=S.h;
  const algos={
    counter({start,step,clicks}) {
      let count=S.int(start,-100,100,"Началната стойност");step=S.int(step,-10,10,"Стъпката");clicks=S.int(clicks,0,20,"Броят щраквания");
      const frames=[{count,msg:`let count = ${count}; регистрираме обработчик. Регистрацията не изпълнява обработчика.`}];
      for(let i=0;i<clicks;i++) {
        frames.push({count,msg:`Щракване ${i+1}: браузърът подава събитието към обработчика.`});
        count+=step;frames.push({count,msg:`count += ${step}; нова стойност ${count}.`});
        frames.push({count,msg:`output.textContent = String(count); DOM показва ${count}.`});
      }
      return {result:count,frames};
    },
    events({stop}) {
      const halted=stop===true||stop==="true"||stop==="1";
      const route=["контейнер: capture","бутон: target",...(halted?[]:["контейнер: bubble"])];
      return {route,frames:route.map((node,i)=>({node,msg:`${i+1}. ${node}. ${halted&&i===1?"В обработчика на бутона stopPropagation() спира продължаването към предшествениците.":"event.target остава бутонът; currentTarget е елементът с текущия обработчик."}`}))};
    }
  };
  const html=`<div class="prose"><p><dfn data-g="javascript">JavaScript</dfn> е език за програмиране, а не вариант на Java. Използва променливи, изрази, условия, цикли, масиви, обекти и функции. <code>let</code> позволява ново присвояване; <code>const</code> не позволява ново присвояване на самата връзка, но не прави автоматично обекта неизменяем. За сравнение без неявно преобразуване на типовете обичайно използваме <code>===</code>.</p>
  <p>DOM API е интерфейсът към документа: <code>document.querySelector</code> намира елемент, <code>textContent</code> задава текст, <code>classList</code> сменя класове. Външен класически скрипт с <code>defer</code> се изпълнява след анализа на HTML и преди DOMContentLoaded. Кодът трябва да има достъп до вече създадените елементи.</p></div>
  <div class="block"><h3>Състояние → събитие → промяна на DOM</h3>
  <pre class="mono">&lt;button id="add" type="button"&gt;Добави&lt;/button&gt;
&lt;output id="count"&gt;0&lt;/output&gt;
&lt;script src="app.js" defer&gt;&lt;/script&gt;

// app.js
let count = 0;
const output = document.querySelector('#count');
document.querySelector('#add').addEventListener('click', () =&gt; {
  count += 1;
  output.textContent = String(count);
});</pre><div id="v-counter"></div>
  <p>Работещ DOM пример: <button class="btn" id="live-add" type="button">Добави 1</button> <button class="btn ghost" id="live-reset" type="button">Нулирай</button> <output id="live-count" aria-live="polite">0</output></p>
  <details class="trap"><summary>Капан: текст срещу HTML</summary><div><p><code>textContent</code> показва текста буквално. <code>innerHTML</code> го анализира като маркиране; недоверен вход може да доведе до XSS. Използвай textContent за обикновен потребителски текст; обработката на HTML изисква отделен, подходящ механизъм.</p></div></details></div>
  <div class="block"><h3>Път на събитието</h3><p class="prose">При щракване има фаза на прихващане към целта, достигане на целта и изкачване (bubbling). Не всички видове събития се изкачват. <code>target</code> е първоначалната цел; <code>currentTarget</code> — елементът на текущия обработчик. Делегирането използва общ предшественик и проверка на target.</p><div id="v-events"></div>
  <p><code>stopPropagation()</code> спира разпространението; <code>preventDefault()</code> отменя допустимото действие по подразбиране, например изпращането на формуляр. Това са различни операции.</p></div>
  <div class="block"><h3>Асинхронни заявки <span class="extra-tag">разширение</span></h3><p class="prose"><code>fetch</code> връща Promise; <code>await</code> изчаква резултата в async функция, без синхронно блокиране на главната нишка през чакането. HTTP грешка като 404 не е непременно отхвърлен Promise — проверяваме <code>response.ok</code>. След успешен JSON отговор обновяваме DOM. Same-origin policy и CORS определят какво клиентският код може да чете от друг произход; CORS не е удостоверяване.</p>
  <pre class="mono">async function loadTitle() {
  try {
    const response = await fetch('/api/topic');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    document.querySelector('#title').textContent = data.title;
  } catch (error) {
    document.querySelector('#status').textContent = 'Неуспешно зареждане';
  }
}</pre><p class="muted">Пример за договор със сървър, не активна заявка в тази страница.</p></div>`;
  function mount(root) {
    S.viz(root.querySelector("#v-counter"),{id:"counter",title:"Обработчик стъпка по стъпка",code:false,inputs:[{id:"start",label:"начало",type:"number",value:0},{id:"step",label:"стъпка",type:"number",value:1},{id:"clicks",label:"щраквания",type:"number",value:3}],build:algos.counter,draw(st,f){st.replaceChildren(h("p",{class:"key",text:`count = ${f.count}`}));}});
    S.viz(root.querySelector("#v-events"),{id:"events",title:"Щракване върху бутон в контейнер",code:false,sub:"Съкратен път: показани са само двата елемента с регистрирани обработчици.",inputs:[{id:"stop",label:"stopPropagation в бутона",type:"checkbox",value:false}],build:algos.events,draw(st,f){st.replaceChildren(h("p",{class:"key",text:f.node}));}});
    let count=0;const out=root.querySelector("#live-count");
    root.querySelector("#live-add").addEventListener("click",()=>{out.textContent=String(++count);});
    root.querySelector("#live-reset").addEventListener("click",()=>{count=0;out.textContent="0";});
  }
  S.chapter({id:"javascript",order:4,num:"4",group:"Програмиране",title:"JavaScript, DOM и събития",lead:"Основни езикови конструкции, обработчици, състояние, разпространение на събития и заявка към API.",html,mount,algos});
})();
