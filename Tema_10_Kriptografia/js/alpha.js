/* Тема 10 — обща азбука и помощници (огледало на c/alpha.h).
 * Латиница A–Z (m = 26) или българска азбука А–Я (m = 30, без Ё Ы Э).
 * Нормализация като в C: a–z и а–я стават главни, всичко извън азбуката се пропуска.
 * Главите използват window.T10 само по време на изпълнение (не при зареждане),
 * за да може тестовете в node да го заредят след главата. */
(function () {
  const LAT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const BG = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ";
  const mk = (name, s, pad, label) => ({ name, m: s.length, L: [...s], pad, label, idx: new Map([...s].map((c, i) => [c.codePointAt(0), i])) });
  const A = { lat: mk("lat", LAT, 23, "латиница A–Z, m = 26"), bg: mk("bg", BG, 21, "българска А–Я, m = 30") };

  const mod = (a, m) => ((a % m) + m) % m;
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  function get(name) { return A[name === "bg" || name === true || name === 1 ? "bg" : "lat"]; }
  function index(al, cp) {
    if (cp >= 0x61 && cp <= 0x7a) cp -= 32;
    if (cp >= 0x430 && cp <= 0x44f) cp -= 0x20;
    const k = al.idx.get(cp);
    return k === undefined ? -1 : k;
  }
  /** текст -> кодове; maxLen ограничава размера (хвърля грешка) */
  function encode(al, text, { maxLen = 4096, minLen = 0, what = "Текстът" } = {}) {
    const out = [];
    for (const ch of String(text)) { const k = index(al, ch.codePointAt(0)); if (k >= 0) out.push(k); }
    if (out.length > maxLen) throw new Error(`${what} е твърде дълъг: ${out.length} букви (най-много ${maxLen}).`);
    if (out.length < minLen) throw new Error(minLen === 1 ? `${what} не съдържа нито една буква от азбуката (${al.label}).` : `${what} трябва да има поне ${minLen} букви от азбуката (${al.label}).`);
    return out;
  }
  const decode = (al, x) => x.map((v) => al.L[v]).join("");

  const TEXTS = {
    EN_SAMPLE: "WE WILL MEET AT THE OLD BRIDGE NEAR THE RIVER AT DAWN. BRING THE MAP, THE SECOND KEY AND ENOUGH WATER FOR TWO DAYS. IF THE WEATHER CHANGES, WAIT IN THE HOUSE BEHIND THE CHURCH AND DO NOT LIGHT A FIRE. THE OTHERS WILL JOIN US ON THE THIRD DAY WHEN THE ROAD IS OPEN AGAIN.",
    EN_REF: "THE ENGINEER OPENED THE NOTEBOOK AND READ THE NOTES FROM THE LAST TEST. THE DATA LOGGER HAD RECORDED EVERY SIGNAL ON THE BUS FOR THREE HOURS, AND THE FILE WAS LARGER THAN EXPECTED. SHE DECIDED TO WRITE A SHORT PROGRAM THAT WOULD COUNT THE MESSAGES, CHECK THE TIME STAMPS AND MARK EVERY FRAME THAT ARRIVED OUT OF ORDER. WHEN THE PROGRAM FINISHED, THE RESULT WAS CLEAR: MOST OF THE ERRORS CAME FROM ONE NODE THAT RESTARTED WHENEVER THE VOLTAGE DROPPED. THE TEAM REPLACED THE POWER SUPPLY, REPEATED THE TEST ON THE NEXT MORNING AND FOUND NO MORE PROBLEMS. IN THE REPORT SHE EXPLAINED HOW THE DATA WAS COLLECTED, WHICH TOOLS WERE USED AND WHY THE SIMPLE COUNT WAS ENOUGH TO FIND THE CAUSE.",
    BG_SAMPLE: "ЩЕ СЕ СРЕЩНЕМ ПРИ СТАРИЯ МОСТ ДО РЕКАТА ПРИ ИЗГРЕВ. ДОНЕСИ КАРТАТА, ВТОРИЯ КЛЮЧ И ДОСТАТЪЧНО ВОДА ЗА ДВА ДНИ. АКО ВРЕМЕТО СЕ ПРОМЕНИ, ЧАКАЙ В КЪЩАТА ЗАД ЦЪРКВАТА И НЕ ПАЛИ ОГЪН. ДРУГИТЕ ЩЕ ДОЙДАТ НА ТРЕТИЯ ДЕН, КОГАТО ПЪТЯТ ОТНОВО Е ОТВОРЕН.",
    BG_REF: "ИНЖЕНЕРЪТ ОТВОРИ ТЕТРАДКАТА И ПРОЧЕТЕ БЕЛЕЖКИТЕ ОТ ПОСЛЕДНОТО ИЗПИТВАНЕ. УСТРОЙСТВОТО БЕШЕ ЗАПИСАЛО ВСЕКИ СИГНАЛ ПО ШИНАТА В ПРОДЪЛЖЕНИЕ НА ТРИ ЧАСА И ФАЙЛЪТ БЕШЕ ПО-ГОЛЯМ ОТ ОЧАКВАНОТО. ТЯ РЕШИ ДА НАПИШЕ КРАТКА ПРОГРАМА, КОЯТО ДА ПРЕБРОИ СЪОБЩЕНИЯТА, ДА ПРОВЕРИ ВРЕМЕТО НА ВСЯКО ОТ ТЯХ И ДА ОТБЕЛЕЖИ ВСИЧКИ, КОИТО СА ПРИСТИГНАЛИ НЕ НА МЯСТОТО СИ. КОГАТО ПРОГРАМАТА ПРИКЛЮЧИ, РЕЗУЛТАТЪТ БЕШЕ ЯСЕН: ПОВЕЧЕТО ГРЕШКИ ИДВАХА ОТ ЕДИН ВЪЗЕЛ, КОЙТО СЕ РЕСТАРТИРАШЕ ВСЕКИ ПЪТ, КОГАТО НАПРЕЖЕНИЕТО ПАДНЕШЕ. ЕКИПЪТ СМЕНИ ЗАХРАНВАНЕТО, ПОВТОРИ ИЗПИТВАНЕТО НА СЛЕДВАЩАТА СУТРИН И НЕ ОТКРИ ПОВЕЧЕ ПРОБЛЕМИ. В ДОКЛАДА ТЯ ОБЯСНИ КАК СА СЪБРАНИ ДАННИТЕ, КАКВИ СРЕДСТВА СА ИЗПОЛЗВАНИ И ЗАЩО ПРОСТОТО ПРЕБРОЯВАНЕ Е БИЛО ДОСТАТЪЧНО, ЗА ДА СЕ ОТКРИЕ ПРИЧИНАТА.",
  };
  const sample = (al) => (al.name === "bg" ? TEXTS.BG_SAMPLE : TEXTS.EN_SAMPLE);

  const cache = {};
  /** относителни честоти на буквите в референтния текст на езика */
  function refFreq(al) {
    if (cache[al.name]) return cache[al.name];
    const x = encode(al, al.name === "bg" ? TEXTS.BG_REF : TEXTS.EN_REF);
    const cnt = new Array(al.m).fill(0);
    x.forEach((v) => cnt[v]++);
    return (cache[al.name] = cnt.map((c) => c / x.length));
  }
  function counts(x, m) { const c = new Array(m).fill(0); x.forEach((v) => c[v]++); return c; }

  /** поле „азбука“ за визуализаторите */
  const alphaField = (value = "lat") => ({ id: "alpha", label: "Азбука", type: "select", value, options: [["lat", "латиница A–Z (m=26)"], ["bg", "българска А–Я (m=30)"]] });

  /* ---------- рисуване (само в браузъра) ---------- */
  /** лента от букви; opts.cls{i:'s-act'}, opts.sub(i) — малък текст отдолу, opts.ptr{name:i} */
  function strip(el, letters, opts = {}) {
    const S = window.Study;
    const box = S.drawArray(el, letters, { cls: opts.cls, ptr: opts.ptr, label: opts.sub || ((k) => k), append: opts.append, dim: opts.dim, index: opts.index });
    if (opts.small) box.querySelectorAll(".cell").forEach((c) => { c.style.width = "30px"; c.style.height = "34px"; c.style.fontSize = "13px"; });
    box.style.flexWrap = "wrap"; box.style.rowGap = "28px";
    if (opts.title) box.before(S.h("div", { class: "eyebrow", style: { marginTop: "6px" }, text: opts.title }));
    return box;
  }
  /** хистограма с букви отдолу */
  function hist(el, cnt, al, opts = {}) {
    const S = window.Study;
    const box = S.drawBars(el, cnt, { height: opts.height || 130, cls: opts.cls, fmt: (v) => (v ? v : ""), append: opts.append, labelsUpTo: 40 });
    box.querySelectorAll(".bi").forEach((b, k) => (b.textContent = al.L[k]));
    if (opts.title) box.before(S.h("div", { class: "eyebrow", style: { marginTop: "8px", marginBottom: "18px" }, text: opts.title }));
    box.style.minWidth = al.m * 14 + "px";
    return box;
  }

  window.T10 = { A, get, mod, gcd, index, encode, decode, TEXTS, sample, refFreq, counts, alphaField, strip, hist };
})();
