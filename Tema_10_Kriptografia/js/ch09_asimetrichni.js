/* Раздел 9 — Асиметрични ключове: ключова двойка, роли, RSA и Дифи–Хелман с малки числа, разлагане, автентичност. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "ключова двойка": { cat: "Ключове", t: "Ключова двойка", en: "Key pair", d: "Публичен и частен ключ, генерирани заедно и математически свързани.", more: "Публичният се извежда лесно от частния; обратната посока трябва да е изчислително непосилна. Двойката принадлежи на един участник." },
    "публичен ключ": { cat: "Ключове", t: "Публичен ключ", en: "Public key", d: "Частта от ключовата двойка, която се разпространява свободно.", more: "Не е тайна, но трябва да е <b>автентична</b>: проверяващият трябва да знае чий е. Иначе нападателят подменя ключа (човек по средата)." },
    "частен ключ": { cat: "Ключове", t: "Частен ключ", en: "Private key", d: "Частта от ключовата двойка, която остава само у притежателя.", more: "Не се изпраща на никого. Изтичането му компрометира всичко, подписано или дешифрирано с него; затова се пази в смарткарта, HSM или защитено хранилище и има процедура за отнемане." },
    "еднопосочна функция с вратичка": { cat: "Ключове", t: "Еднопосочна функция с вратичка", en: "Trapdoor one-way function", d: "Функция, лесна за пресмятане и трудна за обръщане — освен ако не знаеш допълнителна тайна (вратичката).", more: "При RSA: x ↦ x^e mod n е лесно; обръщането без d се смята за трудно; с d (т.е. със знание на p и q) е лесно. Трудността е предположение, не доказана теорема." },
    "функция на ойлер": { cat: "Математика", t: "Функция на Ойлер φ(n)", en: "Euler's totient", d: "Броят на числата в [1, n], взаимно прости с n.", more: "За n = p·q с различни прости p, q: φ(n) = (p − 1)(q − 1). Пресмятането на φ(n) от n е толкова трудно, колкото разлагането на n." },
    "модулно степенуване": { cat: "Математика", t: "Бързо модулно степенуване", en: "Modular exponentiation (square-and-multiply)", d: "Пресмятане на b^k mod n с O(log k) умножения по битовете на k.", more: "Всеки бит удвоява степента (квадрат), единичните битове добавят множител. Наивното k − 1 умножения е непосилно за експоненти с хиляди битове." },
    "дифи–хелман": { cat: "Ключове", t: "Обмен на ключове на Дифи–Хелман", en: "Diffie–Hellman key exchange", d: "Двама участници установяват общ секрет по открит канал, без да го изпращат.", more: "Сигурността срещу пасивен наблюдател почива на трудността на дискретния логаритъм. Без удостоверяване не пази от активен нападател (човек по средата)." },
    "човек по средата": { cat: "Атаки", t: "Атака „човек по средата“", en: "Man-in-the-middle (MITM)", d: "Активен нападател застава между участниците и подменя съобщенията, включително публичните ключове.", more: "Защитата е удостоверяване на публичните ключове: сертификат, подписан от доверен издател, предварително споделен отпечатък и т.н." },
    "сертификат": { cat: "Ключове", t: "Сертификат (X.509)", en: "Public key certificate", d: "Документ, в който издател свързва публичен ключ с име и го подписва.", more: "Проверката се свежда до доверие в публичния ключ на издателя — верига до корен, който вече е в системата. Инфраструктурата за това се нарича PKI." },
    "хибридно шифроване": { cat: "Ключове", t: "Хибридно шифроване", en: "Hybrid encryption", d: "Асиметричен механизъм установява или пренася симетричен ключ; данните се шифроват симетрично.", more: "Асиметричните операции са с порядъци по-бавни и не са предназначени за обемни данни. Така работят TLS, SSH, OpenPGP." },
    "напред секретност": { cat: "Ключове", t: "Напред секретност", en: "Forward secrecy", d: "Изтичане на дълготраен ключ по-късно не разкрива ключовете на минали сесии.", more: "Постига се с еднократни (ефемерни) ключове на Дифи–Хелман за всяка сесия; дълготрайният ключ само подписва. TLS 1.3 я има по подразбиране." },
    "oaep": { cat: "Съкращения", t: "OAEP", en: "Optimal Asymmetric Encryption Padding", d: "Рандомизирано допълване за шифроване с RSA (PKCS #1).", more: "„Учебният“ RSA C = M^e mod n е детерминиран и податлив на изменения; OAEP добавя случайност и структура. За подпис съответно се използва PSS." },
    "ecc": { cat: "Съкращения", t: "ECC", en: "Elliptic Curve Cryptography", d: "Асиметрична криптография върху група от точки на елиптична крива.", more: "Същата идея като Дифи–Хелман, но в друга група; при сравнима сигурност ключовете са много по-къси от RSA (256 срещу 3072 бита). Примери: X25519 (обмен), Ed25519, ECDSA (подпис)." },
    "постквантова криптография": { cat: "Ключове", t: "Постквантова криптография", en: "Post-quantum cryptography", d: "Асиметрични схеми, за които не е известна ефективна квантова атака.", more: "Алгоритъмът на Шор би разбил RSA, Дифи–Хелман и ECC при достатъчно голям квантов компютър. NIST стандартизира ML-KEM (FIPS 203), ML-DSA (FIPS 204) и SLH-DSA (FIPS 205) през 2024 г. Симетричните шифри се засягат по-малко (Гроувър: удвояване на дължината на ключа)." },
  });
  window.TERM_SOURCES = window.TERM_SOURCES || {};
  Object.assign(window.TERM_SOURCES, {
    "дифи–хелман": "https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange",
    "човек по средата": "https://en.wikipedia.org/wiki/Man-in-the-middle_attack",
    "сертификат": "https://en.wikipedia.org/wiki/Public_key_certificate",
    "хибридно шифроване": "https://en.wikipedia.org/wiki/Hybrid_cryptosystem",
    "напред секретност": "https://en.wikipedia.org/wiki/Forward_secrecy",
    "oaep": "https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding",
    "ecc": "https://en.wikipedia.org/wiki/Elliptic-curve_cryptography",
    "постквантова криптография": "https://en.wikipedia.org/wiki/Post-quantum_cryptography",
    "модулно степенуване": "https://en.wikipedia.org/wiki/Modular_exponentiation",
    "еднопосочна функция с вратичка": "https://en.wikipedia.org/wiki/Trapdoor_function",
    "функция на ойлер": "https://en.wikipedia.org/wiki/Euler%27s_totient_function",
  });

  /* ---------- чисти функции (огледало на c/08_asym.c) ---------- */
  const B = BigInt;
  function isPrime(x) {
    if (x < 2) return false;
    for (let f = 2; f * f <= x; f++) if (x % f === 0) return false;
    return true;
  }
  /** разширен Евклид с кадри; връща d или −1 */
  function modInverse(e, phi, F) {
    let r0 = phi, r1 = e, s0 = 0, s1 = 1;
    const rows = [{ q: "", r: r0, s: s0 }, { q: "", r: r1, s: s1 }];
    if (F) F.push({ at: "init", rows: rows.slice(), vars: { r0, r1, s0, s1 }, msg: `Започваме с редовете (φ, 0) и (e, 1). Инвариант: r ≡ e·s (mod ${phi}).` });
    while (r1 !== 0) {
      const q = Math.floor(r0 / r1);
      if (F) F.push({ at: "q", rows: rows.slice(), cur: rows.length - 1, vars: { r0, r1, q }, msg: `q = ⌊${r0} / ${r1}⌋ = ${q}.` });
      const r2 = r0 - q * r1; r0 = r1; r1 = r2;
      const s2 = s0 - q * s1; s0 = s1; s1 = s2;
      rows.push({ q, r: r1, s: s1 });
      if (F) F.push({ at: "step", rows: rows.slice(), cur: rows.length - 1, vars: { r0, r1, s0, s1 }, msg: `Нов ред: r = ${r1}, s = ${s1}. Проверка: ${e}·(${s1}) mod ${phi} = ${(((e * s1) % phi) + phi) % phi} = r mod ${phi}.` });
    }
    if (r0 !== 1) { if (F) F.push({ at: "gcd", rows: rows.slice(), vars: { "НОД": r0 }, bad: true, msg: `НОД(e, φ) = ${r0} ≠ 1 ⇒ e няма обратен по модул φ. Избери друго e.` }); return -1; }
    const d = s0 < 0 ? s0 + phi : s0;
    if (F) F.push({ at: "done", rows, hit: rows.length - 2, vars: { d }, msg: `Редът с r = 1 дава s = ${s0}${s0 < 0 ? ` → +φ = ${d}` : ""}. Проверка: ${e}·${d} mod ${phi} = ${Number((B(e) * B(d)) % B(phi))}.` });
    return d;
  }
  /** бързо степенуване с кадри (BigInt, защото произведенията стигат 2^62) */
  function modPow(b, k, n, F, phase) {
    let r = B(1) % B(n), bb = B(b) % B(n), kk = B(k);
    const bits = B(k).toString(2);
    let idx = bits.length - 1;
    const base = (o) => Object.assign({ bits, phase, vars: { r: String(r), b: String(bb), k: String(kk) } }, o);
    if (F) F.push(base({ at: "init", msg: `${phase}: ${b}^${k} mod ${n}. Експонентата в двоичен вид: ${bits} (${bits.length} бита).` }));
    while (kk > 0n) {
      const one = (kk & 1n) === 1n;
      if (F) F.push(base({ at: "bit", bi: idx, msg: `Бит ${bits.length - 1 - idx} (отдясно) = ${one ? 1 : 0}${one ? " → умножаваме r по текущата степен." : " → само квадрат."}` }));
      if (one) { r = (r * bb) % B(n); if (F) F.push(base({ at: "mul", bi: idx })); }
      bb = (bb * bb) % B(n); kk >>= 1n; idx--;
      if (F) F.push(base({ at: "sq", bi: idx + 1 }));
    }
    if (F) F.push(base({ at: "done", fin: true, msg: `${phase}: резултат <b>${r}</b>.` }));
    return Number(r);
  }
  function factor(n, F) {
    if (n % 2 === 0) { if (F) F.push({ at: "even", f: 2, tries: 1, n, vars: { f: 2 }, msg: "n е четно — делител 2." }); return { f: 2, tries: 1 }; }
    let tries = 0;
    const lim = Math.floor(Math.sqrt(n));
    const total = Math.max(1, Math.floor((lim - 1) / 2));
    const every = total > 240 ? Math.ceil(total / 200) : 1;
    for (let f = 3; f * f <= n; f += 2) {
      tries++;
      const hit = n % f === 0;
      if (F && (hit || tries <= 20 || tries % every === 0)) F.push({ at: hit ? "hit" : "try", f, tries, n, lim, vars: { f, "опити": tries }, msg: hit ? `${n} mod ${f} = 0 ⇒ <b>${n} = ${f} · ${n / f}</b> след ${tries} опита.` : `${n} mod ${f} = ${n % f}` });
      if (hit) return { f, tries };
    }
    if (F) F.push({ at: "prime", f: n, tries, n, lim, vars: { "опити": tries }, msg: `Няма делител до √n ≈ ${lim} ⇒ n е просто (не е RSA модул).` });
    return { f: n, tries };
  }

  function keyInputs({ p, q, e }) {
    p = S.int(p, 3, 46337, "p"); q = S.int(q, 3, 46337, "q"); e = S.int(e, 3, 2 ** 31 - 1, "e");
    if (!isPrime(p)) throw new Error(`p = ${p} не е просто.`);
    if (!isPrime(q)) throw new Error(`q = ${q} не е просто.`);
    if (p === q) throw new Error("p и q трябва да са различни (иначе φ(n) ≠ (p−1)(q−1) и n = p² се разлага веднага).");
    const n = p * q, phi = (p - 1) * (q - 1);
    if (e >= phi) throw new Error(`e трябва да е < φ(n) = ${phi}.`);
    return { p, q, e, n, phi };
  }

  const algos = {
    isPrime, modInverse: (e, phi) => modInverse(e, phi, null), modPow: (b, k, n) => modPow(b, k, n, null, ""), factor: (n) => factor(n, null).f,
    /** a) генериране на ключове */
    keygen(inp) {
      const K = keyInputs(inp), F = [];
      F.push({ rows: [], vars: { p: K.p, q: K.q, n: K.n }, msg: `n = p·q = ${K.p}·${K.q} = <b>${K.n}</b> (${Math.floor(Math.log2(K.n)) + 1} бита). n е публично.` });
      F.push({ rows: [], vars: { "φ(n)": K.phi }, msg: `φ(n) = (p−1)(q−1) = ${K.p - 1}·${K.q - 1} = <b>${K.phi}</b>. Тайно — който знае φ, пресмята d.` });
      const d = modInverse(K.e, K.phi, F);
      const last = F[F.length - 1];
      if (d > 0) Object.assign(last, { keys: { n: K.n, e: K.e, d } });
      return { frames: F, d, n: K.n, phi: K.phi, result: d > 0 ? `публичен (n=${K.n}, e=${K.e}) · частен d=${d}` : "няма d" };
    },
    /** b) шифроване/дешифриране или подпис/проверка */
    crypt(inp) {
      const K = keyInputs(inp);
      const m = S.int(inp.m, 0, K.n - 1, `M (0 ≤ M < n = ${K.n})`);
      const d = modInverse(K.e, K.phi, null);
      if (d < 0) throw new Error(`НОД(e, φ) ≠ 1 — с e = ${K.e} няма частен ключ. Избери друго e.`);
      const F = [];
      if (inp.op === "sig") {
        const s = modPow(m, d, K.n, F, "Подпис σ = M^d mod n (частен ключ)");
        const v = modPow(s, K.e, K.n, F, "Проверка σ^e mod n (публичен ключ)");
        F[F.length - 1].msg += v === m ? ` = M ⇒ подписът е валиден за M = ${m}.` : ` ≠ M ⇒ невалиден.`;
        return { frames: F, a: s, b: v, result: `σ = ${s}, проверка → ${v}` };
      }
      const c = modPow(m, K.e, K.n, F, "Шифроване C = M^e mod n (публичен ключ)");
      const back = modPow(c, d, K.n, F, "Дешифриране C^d mod n (частен ключ)");
      F[F.length - 1].msg += back === m ? ` = M — същото съобщение.` : "";
      return { frames: F, a: c, b: back, result: `C = ${c}, обратно → ${back}` };
    },
    /** c) Дифи–Хелман, по желание с активен нападател */
    dh({ p, g, a, b, mitm, x }) {
      p = S.int(p, 5, 2 ** 31 - 1, "p");
      if (!isPrime(p)) throw new Error(`p = ${p} не е просто.`);
      g = S.int(g, 2, p - 2, "g"); a = S.int(a, 1, p - 2, "a"); b = S.int(b, 1, p - 2, "b");
      const pw = (u, v) => modPow(u, v, p, null, "");
      const A = pw(g, a), Bv = pw(g, b);
      const F = [];
      const K = { alice: [["p, g", `${p}, ${g}`]], bob: [["p, g", `${p}, ${g}`]], eve: [["p, g", `${p}, ${g}`]] };
      const fr = (o) => F.push(Object.assign({ K: JSON.parse(JSON.stringify(K)) }, o));
      fr({ msg: `Публични параметри: просто p = ${p} и основа g = ${g}. Всеки ги знае, включително нападателят.` });
      K.alice.push(["a (тайно)", a, "sec"]); K.bob.push(["b (тайно)", b, "sec"]);
      fr({ msg: "Всеки избира случайно тайно число и не го изпраща никъде." });
      K.alice.push(["A = gᵃ mod p", A]); K.bob.push(["B = gᵇ mod p", Bv]);
      fr({ msg: `Алиса пресмята A = ${g}^${a} mod ${p} = ${A}; Боб — B = ${g}^${b} mod ${p} = ${Bv}.` });
      if (!mitm) {
        K.eve.push(["A", A], ["B", Bv]); K.alice.push(["получен B", Bv]); K.bob.push(["получен A", A]);
        fr({ wire: [A, Bv], msg: "A и B минават по открития канал — нападателят ги вижда." });
        const sA = pw(Bv, a), sB = pw(A, b);
        K.alice.push(["s = Bᵃ mod p", sA, "key"]); K.bob.push(["s = Aᵇ mod p", sB, "key"]);
        K.eve.push(["s = ?", "трябва a или b: дискретен логаритъм", "bad"]);
        fr({ fin: true, sA, sB, msg: `Алиса: ${Bv}^${a} mod ${p} = <b>${sA}</b>; Боб: ${A}^${b} mod ${p} = <b>${sB}</b>. Общ секрет, който не е минавал по канала: (gᵇ)ᵃ = (gᵃ)ᵇ.` });
        return { frames: F, A, B: Bv, sA, sB, result: `общ секрет ${sA}` };
      }
      x = S.int(x, 1, p - 2, "x на нападателя");
      const X = pw(g, x);
      K.eve.push(["x (тайно)", x, "sec"], ["X = gˣ mod p", X], ["прихванати A, B", `${A}, ${Bv}`]);
      K.alice.push(["„B“ (всъщност X)", X, "bad"]); K.bob.push(["„A“ (всъщност X)", X, "bad"]);
      fr({ wire: [X, X], mitm: true, msg: `Активен нападател спира A и B и на двамата праща своето X = ${X}. Нищо в съобщенията не издава подмяната.` });
      const s1 = pw(X, a), s2 = pw(X, b);
      K.alice.push(["s = Xᵃ mod p", s1, "key"]); K.bob.push(["s = Xᵇ mod p", s2, "key"]);
      K.eve.push(["ключ с Алиса Aˣ", pw(A, x), "key"], ["ключ с Боб Bˣ", pw(Bv, x), "key"]);
      fr({ fin: true, mitm: true, sA: s1, sB: s2, msg: `Алиса има ключ ${s1}, Боб — ${s2}${s1 === s2 ? " (случайно равни)" : " — различни"}. Нападателят знае и двата и препредава, дешифрирайки всичко. Защита: удостоверени публични ключове (подпис, сертификат).` });
      return { frames: F, A, B: Bv, sA: s1, sB: s2, result: `MITM: ${s1} / ${s2}` };
    },
    /** d) разбиване на малко n */
    attack({ n, e }) {
      n = S.int(n, 4, 2 ** 31 - 1, "n"); e = S.int(e, 3, 2 ** 31 - 1, "e");
      const F = [];
      const r = factor(n, F);
      F.forEach((fr) => (fr.e = e));
      const last = F[F.length - 1];
      if (r.f !== n) {
        const p = r.f, q = n / r.f, phi = (p - 1) * (q - 1), d = modInverse(e % phi, phi, null);
        last.rec = { p, q, phi, d };
        F.push({ at: "hit", e, f: r.f, tries: r.tries, n, lim: Math.floor(Math.sqrt(n)), rec: last.rec, fin: true, vars: { p, q, "φ": phi, d }, msg: d > 0 ? `Нападателят пресмята φ = ${phi} и d = e⁻¹ mod φ = <b>${d}</b> — частният ключ, без никой да му го е дал.` : `φ = ${phi}, но НОД(e, φ) ≠ 1 — с това e няма валиден ключ.` });
      }
      return { frames: F, f: r.f, tries: r.tries, result: r.f === n ? "просто" : `${r.f} · ${n / r.f}` };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<p class="prose"><span class="extra-tag">разширение</span> Числата в примерите са до 2³¹ — достатъчно малки, за да се следят на ръка, и затова <b>напълно несигурни</b>. Реалните ключове са с хиляди битове и с допълнителни мерки, описани по-долу.</p>

<div class="prose">
  <p>При <dfn data-g="симетрична криптография">симетричната криптография</dfn> двете страни трябва предварително да споделят една тайна. <dfn data-g="асиметрична криптография">Асиметричната</dfn> разделя ключа на две части с различни роли — <dfn data-g="ключова двойка">ключова двойка</dfn>:</p>
</div>
<div class="split">
  <div class="key"><b><dfn data-g="публичен ключ">Публичен ключ</dfn></b><p>Разпространява се свободно — публикува се, изпраща се, слага се в сертификат. Не е тайна, но трябва да е <b>автентичен</b>: ако нападател подмени публичния ключ, всичко останало губи смисъл.</p></div>
  <div class="key"><b><dfn data-g="частен ключ">Частен ключ</dfn></b><p>Остава само у притежателя и никога не се изпраща. От публичния ключ не може да бъде пресметнат в разумно време — на това почива цялата схема.</p></div>
</div>
<div class="prose">
  <p>Връзката между двата е <dfn data-g="еднопосочна функция с вратичка">еднопосочна функция с вратичка</dfn>: пресмятането в едната посока е лесно, обратното е трудно, освен за този, който знае тайната. При <dfn data-g="rsa">RSA</dfn> тайната е разлагането n = p·q; при <dfn data-g="дифи–хелман">Дифи–Хелман</dfn> и <dfn data-g="ecc">ECC</dfn> — дискретният логаритъм. „Трудно“ означава, че не е известен ефективен алгоритъм; това е предположение, а не доказана теорема.</p>
</div>

<div class="block">
  <h3>Схема 20. Три роли на ключовата двойка</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>цел</th><th>изпращачът / подписващият използва</th><th>получателят / проверяващият използва</th><th>какво постига</th></tr>
    <tr><td>шифроване</td><td><b>публичния</b> ключ на получателя</td><td>своя <b>частен</b> ключ</td><td>само притежателят на частния ключ чете съобщението</td></tr>
    <tr><td><dfn data-g="цифров подпис">цифров подпис</dfn></td><td>своя <b>частен</b> ключ</td><td><b>публичния</b> ключ на подписващия</td><td>всеки проверява целостта и връзката с ключа; съдържанието не е скрито</td></tr>
    <tr><td>установяване на ключ</td><td>своя частен + публичния на другия</td><td>своя частен + публичния на другия</td><td>общ симетричен ключ, който не е минавал по канала</td></tr>
  </table></div>
  <p class="muted">Посоките са противоположни: при шифроването частният ключ е у <i>получателя</i>, при подписа — у <i>изпращача</i>. Затова една и съща двойка обикновено не се използва и за двете.</p>
</div>

<div class="block">
  <h3>Схема 21. Генериране на ключ RSA</h3>
  <p class="prose">Избират се две различни прости числа p и q и публична експонента e (на практика почти винаги 65 537). Публичният ключ е (n, e), където n = p·q. Частният ключ d е обратният на e по модул <dfn data-g="функция на ойлер">φ(n)</dfn> = (p − 1)(q − 1) и се намира с разширения алгоритъм на Евклид. Без p и q нападателят не знае φ(n) и не може да пресметне d.</p>
  <div id="v9-key"></div>
  <details class="hint"><summary>Хинт: защо e·d ≡ 1 (mod φ) връща съобщението</summary><div>
    <p>По теоремата на Ойлер M<sup>φ(n)</sup> ≡ 1 (mod n) за M, взаимно просто с n. Щом e·d = 1 + t·φ(n), то (M<sup>e</sup>)<sup>d</sup> = M · (M<sup>φ(n)</sup>)<sup>t</sup> ≡ M. С китайската теорема за остатъците равенството се доказва и за M, които не са взаимно прости с n.</p>
    <p>Стандартът PKCS #1 допуска вместо φ(n) и λ(n) = НОК(p − 1, q − 1); тогава d е по-малко, а шифроването и дешифрирането дават същия резултат.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 22. Шифроване и подпис с RSA</h3>
  <p class="prose">И двете операции са едно и също <dfn data-g="модулно степенуване">бързо модулно степенуване</dfn> с различен ключ: шифроването вдига на степен e (публичен), дешифрирането и подписването — на степен d (частен). Ключовете от горната схема се използват отново: въведи същите p, q, e.</p>
  <div id="v9-crypt"></div>
  <details class="trap"><summary>Капан: „RSA = C = M<sup>e</sup> mod n, и толкова“</summary><div>
    <p>Това е „учебният“ RSA и в реалност е несигурен. Той е <b>детерминиран</b>: еднакво M дава еднакво C, затова при малко възможни съобщения (да/не, сума) нападателят шифрова всички кандидати с публичния ключ и сравнява. Освен това е <b>мултипликативен</b>: C₁·C₂ е шифротекст на M₁·M₂, т.е. шифротекстът може да бъде изменен смислено. Реалното шифроване използва случайно допълване (<dfn data-g="oaep">OAEP</dfn>), а подписът — хеш на съобщението и допълване (PSS).</p>
  </div></details>
  <details class="trap"><summary>Капан: „подписът е шифроване с частния ключ“</summary><div>
    <p>При учебния RSA формулите съвпадат, но целите не: подписът не скрива нищо (всеки с публичния ключ го „отключва“), а при други подписни схеми (ECDSA, Ed25519, ML-DSA) операция „шифроване“ изобщо няма. Виж и <a href="#savremenna">ролите на ключа</a>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 23. Обмен на ключове на Дифи–Хелман</h3>
  <p class="prose">Алиса и Боб се договарят открито за просто p и основа g. Всеки избира тайно число (a, b), изпраща само g<sup>a</sup> или g<sup>b</sup> mod p и вдига полученото на своята тайна степен. И двамата получават g<sup>ab</sup> mod p. Наблюдателят вижда g<sup>a</sup> и g<sup>b</sup>, но за да намери a от g<sup>a</sup> трябва да реши задачата за дискретния логаритъм.</p>
  <div id="v9-dh"></div>
  <details class="trap"><summary>Капан: „Дифи–Хелман пази и от активен нападател“</summary><div>
    <p>Не. Включи „активен нападател“: той подменя A и B със своето X и установява отделен ключ с всеки от двамата. Обменът защитава само от <b>пасивно</b> подслушване. Срещу <dfn data-g="човек по средата">човек по средата</dfn> е нужно удостоверяване — например сървърът подписва своята част с ключ от <dfn data-g="сертификат">сертификат</dfn>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 24. Защо n трябва да е голямо</h3>
  <p class="prose">Нападателят има публичния ключ (n, e). Ако разложи n на p·q, пресмята φ(n) и d точно както собственикът. Пробното делене стига до √n — при n с 31 бита това са десетки хиляди опита.</p>
  <div id="v9-att"></div>
  <details class="hint"><summary>Хинт: колко е голямо „голямо“</summary><div>
    <p>За 2048-битово n пробното делене би изисквало около 2<sup>1023</sup> опита. Най-добрият известен класически метод — общото числово решето (GNFS) — е много по-бърз от пробното делене, но остава непосилен за 2048 бита. Най-голямото публично разложено число от предизвикателството RSA е RSA-250 (829 бита, 2020 г.).</p>
  </div></details>
</div>

<div class="block">
  <h3>Дължини на ключовете</h3>
  <p class="prose">Битовете на различните семейства не са сравними пряко: 256-битов ключ за елиптична крива е по-силен от 2048-битов RSA. Таблицата е по NIST SP 800-57, част 1 (сравнима сигурност).</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>сигурност (бита)</th><th>симетричен</th><th>RSA / DH (бита на n, p)</th><th>ECC (бита на реда)</th></tr>
    <tr><td class="mono">112</td><td>3TDEA</td><td class="mono">2048</td><td class="mono">224–255</td></tr>
    <tr><td class="mono">128</td><td>AES-128</td><td class="mono">3072</td><td class="mono">256–383</td></tr>
    <tr><td class="mono">192</td><td>AES-192</td><td class="mono">7680</td><td class="mono">384–511</td></tr>
    <tr><td class="mono">256</td><td>AES-256</td><td class="mono">15360</td><td class="mono">512+</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>Как се използват на практика</h3>
  <div class="split">
    <div class="key"><b><dfn data-g="хибридно шифроване">Хибридно шифроване</dfn></b><p>Асиметричните операции са с порядъци по-бавни от симетричните и се прилагат само към малки данни. Асиметричната част установява симетричен ключ; данните се шифроват с него (напр. AES-GCM). Така работят TLS, SSH и OpenPGP.</p></div>
    <div class="key"><b>Автентичност на публичния ключ</b><p>Браузърът проверява, че публичният ключ на сайта е подписан от издател, на когото вече има доверие — <dfn data-g="сертификат">сертификат</dfn> и верига до корен (PKI). В SSH при първа връзка се показва отпечатък на ключа на сървъра за ръчна проверка.</p></div>
    <div class="key"><b><dfn data-g="напред секретност">Напред секретност</dfn></b><p>В TLS 1.3 ключът на сесията идва от еднократен (ефемерен) Дифи–Хелман, а дълготрайният ключ на сървъра само подписва. Ако той изтече по-късно, записаните минали сесии остават защитени.</p></div>
    <div class="key"><b><dfn data-g="постквантова криптография">Квантовата заплаха</dfn></b><p>Алгоритъмът на Шор би разбил RSA, Дифи–Хелман и ECC при достатъчно голям квантов компютър. NIST стандартизира през 2024 г. ML-KEM (FIPS 203) за установяване на ключ и ML-DSA (FIPS 204), SLH-DSA (FIPS 205) за подпис.</p></div>
  </div>
  <details class="trap"><summary>Капан: „асиметричното шифроване е по-сигурно от симетричното“</summary><div>
    <p>То решава друга задача — разпределянето на ключове и публичната проверимост, — а не е „по-силна“ версия. AES-128 и RSA-3072 се смятат за сравними по сигурност. Асиметричното е по-бавно, а отделно се допълва със симетрично.</p>
  </div></details>
  <details class="trap"><summary>Капан: „щом ключът е публичен, няма какво да се пази“</summary><div>
    <p>Тайната на публичния ключ не е нужна, но <b>целостта и принадлежността</b> му са. Нападател, който подмени публичния ключ, чете шифрованото „за получателя“ и подписва от негово име. Частният ключ пък се пази от изтичане, а при компрометиране се отнема (сертификатът се анулира).</p>
  </div></details>
</div>
<p class="prose muted">Литература: Diffie W., Hellman M., New Directions in Cryptography, 1976; Rivest R., Shamir A., Adleman L., A Method for Obtaining Digital Signatures and Public-Key Cryptosystems, 1978; RFC 8017 (PKCS #1 v2.2); RFC 8446 (TLS 1.3); NIST SP 800-57 Part 1 Rev. 5; NIST FIPS 203, 204, 205 (2024).</p>`;

  /* ---------- рисуване ---------- */
  function keyBoxes(K) {
    return h("div", { class: "split", style: { marginTop: "10px" } },
      h("div", { class: "key" }, h("b", { text: "публичен ключ" }), h("p", { class: "mono", text: `(n, e) = (${K.n}, ${K.e})` }), h("p", { class: "muted", text: "публикува се" })),
      h("div", { class: "key s-swap", style: { borderColor: "var(--c)" } }, h("b", { text: "частен ключ" }), h("p", { class: "mono", text: `d = ${K.d}` }), h("p", { class: "muted", text: "p, q и φ(n) също са тайни — от тях d се пресмята" })));
  }

  function mount(root) {
    const KEYIN = [{ id: "p", label: "p (просто)", type: "number", value: 61, width: "6em" }, { id: "q", label: "q (просто)", type: "number", value: 53, width: "6em" }, { id: "e", label: "e", type: "number", value: 17, width: "7em" }];
    const KEYPRE = [{ label: "61 · 53, e = 17", values: { p: 61, q: 53, e: 17 } }, { label: "11 · 13, e = 7", values: { p: 11, q: 13, e: 7 } }, { label: "46337 · 46327, e = 65537", values: { p: 46337, q: 46327, e: 65537 } }, { label: "e без обратен (13)", values: { p: 61, q: 53, e: 13 } }];

    // a) генериране
    S.viz(root.querySelector("#v9-key"), {
      id: "k9", title: "Генериране на ключова двойка", sub: "Разширен Евклид: всеки ред пази r ≡ e·s (mod φ).",
      code: "ch09_egcd", inputs: KEYIN, presets: KEYPRE,
      legend: [["s-act", "текущ ред"], ["s-done", "r = 1 → s дава d"], ["s-swap", "НОД ≠ 1"]],
      build: algos.keygen,
      draw(st, f) {
        st.innerHTML = "";
        if (f.rows && f.rows.length) {
          const t = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "#" }), h("th", { text: "q" }), h("th", { text: "r" }), h("th", { text: "s" })));
          f.rows.forEach((r, k) => t.append(h("tr", null, h("th", { text: k }), h("td", { text: r.q }),
            h("td", { class: k === f.hit ? "s-done" : f.bad && k === f.rows.length - 2 ? "s-swap" : k === f.cur ? "s-act" : "", text: r.r }),
            h("td", { class: k === f.hit ? "s-done" : k === f.cur ? "s-act" : "", text: r.s }))));
          st.append(h("div", { class: "tbl-wrap" }, t));
        } else st.append(h("p", { class: "muted", text: "Таблицата на Евклид започва след n и φ(n)." }));
        if (f.keys) st.append(keyBoxes(f.keys));
      },
    });

    // b) шифроване / подпис
    S.viz(root.querySelector("#v9-crypt"), {
      id: "c9", title: "M^k mod n — квадрат и умножение", sub: "Битовете на експонентата се обхождат отдясно наляво.",
      code: "ch09_modpow",
      inputs: KEYIN.concat([{ id: "m", label: "M (< n)", type: "number", value: 65, width: "8em" }, { id: "op", label: "операция", type: "select", value: "enc", options: [["enc", "шифроване → дешифриране"], ["sig", "подпис → проверка"]] }]),
      presets: [{ label: "M = 65", values: { p: 61, q: 53, e: 17, m: 65, op: "enc" } }, { label: "подпис M = 65", values: { p: 61, q: 53, e: 17, m: 65, op: "sig" } }, { label: "голям ключ", values: { p: 46337, q: 46327, e: 65537, m: 123456789, op: "enc" } }],
      legend: [["s-act", "текущ бит"], ["s-done", "обработени битове"]], speed: 2,
      build: algos.crypt,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("p", { style: { fontWeight: "600", marginBottom: "6px" }, text: f.phase }));
        const L = f.bits.length;
        const cls = {};
        for (let k = 0; k < L; k++) { if (f.bi != null && k > f.bi) cls[k] = "s-done"; if (k === f.bi) cls[k] = "s-act"; if (f.fin) cls[k] = "s-done"; }
        const w = h("div", { style: { overflowX: "auto" } });
        st.append(h("span", { class: "eyebrow", text: "експонента k в двоичен вид (бит 0 е най-десният)" }), w);
        S.drawArray(w, f.bits.split(""), { cls, label: (k) => L - 1 - k });
        st.append(h("div", { class: "split", style: { marginTop: "10px" } },
          h("div", { class: "key" }, h("b", { text: "r — натрупан резултат" }), h("p", { class: "mono", text: f.vars.r })),
          h("div", { class: "key" }, h("b", { text: "b — текуща степен на основата (основа^(2^i))" }), h("p", { class: "mono", text: f.vars.b }))));
      },
    });

    // c) Дифи–Хелман
    S.viz(root.querySelector("#v9-dh"), {
      id: "d9", title: "Кой какво знае", sub: "Червено — тайни; зелено — получен ключ.",
      code: false,
      inputs: [{ id: "p", label: "p (просто)", type: "number", value: 23, width: "8em" }, { id: "g", label: "g", type: "number", value: 5, width: "6em" },
        { id: "a", label: "a (Алиса)", type: "number", value: 6, width: "7em" }, { id: "b", label: "b (Боб)", type: "number", value: 15, width: "7em" },
        { id: "mitm", label: "активен нападател", type: "checkbox", value: false }, { id: "x", label: "x (нападател)", type: "number", value: 13, width: "6em" }],
      presets: [{ label: "p = 23", values: { p: 23, g: 5, a: 6, b: 15, mitm: false } }, { label: "p = 2³¹ − 1", values: { p: 2147483647, g: 16807, a: 123456, b: 654321, mitm: false } }, { label: "човек по средата", values: { p: 23, g: 5, a: 6, b: 15, mitm: true, x: 13 } }],
      legend: [["s-swap", "тайно"], ["s-done", "общ ключ"], ["s-cmp", "подменено / недостъпно"]],
      build: algos.dh,
      draw(st, f) {
        st.innerHTML = "";
        const col = (title, rows, accent) => h("div", { class: "card", style: { minWidth: "0" } }, h("h4", { text: title, style: accent ? { color: "var(--st-swap)" } : null }),
          h("table", { class: "t", style: { width: "100%" } }, ...rows.map(([k, v, c]) => h("tr", { class: c === "sec" ? "s-swap" : c === "key" ? "s-done" : c === "bad" ? "s-cmp" : "" },
            h("td", { text: k, style: { background: "var(--cb, transparent)" } }), h("td", { class: "mono", text: String(v), style: { background: "var(--cb, transparent)" } })))));
        st.append(h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" } },
          col("Алиса", f.K.alice), col(f.mitm ? "Нападател (активен)" : "Канал / наблюдател", f.K.eve, true), col("Боб", f.K.bob)));
        if (f.wire) st.append(h("p", { class: "mono", style: { marginTop: "8px" }, text: f.mitm ? `Алиса → [${f.K.alice.find((r) => r[0] === "A = gᵃ mod p")[1]} спрян] · Боб ← ${f.wire[0]};  Боб → [спрян] · Алиса ← ${f.wire[1]}` : `Алиса → Боб: A = ${f.wire[0]};  Боб → Алиса: B = ${f.wire[1]}` }));
      },
    });

    // d) разлагане
    S.viz(root.querySelector("#v9-att"), {
      id: "a9", title: "Разлагане на n с пробно делене", sub: "Показва се част от опитите; броячът е точен.",
      code: "ch09_factor",
      inputs: [{ id: "n", label: "n (публично)", type: "number", value: 3233, width: "10em" }, { id: "e", label: "e (публично)", type: "number", value: 17, width: "7em" }],
      presets: [{ label: "n = 3233", values: { n: 3233, e: 17 } }, { label: "n = 2146654199", values: { n: 2146654199, e: 65537 } }, { label: "просто n", values: { n: 2147483647, e: 65537 } }],
      legend: [["s-act", "текущ делител"], ["s-done", "намерен"]], speed: 3,
      build: algos.attack,
      draw(st, f) {
        st.innerHTML = "";
        const pct = Math.min(100, (f.f / Math.max(1, f.lim || f.f)) * 100);
        st.append(h("p", { class: "mono", text: `опит ${f.tries.toLocaleString("bg")}: f = ${f.f}${f.lim ? `  (до √n ≈ ${f.lim.toLocaleString("bg")})` : ""}` }),
          h("div", { style: { height: "14px", border: "1px solid var(--line)", borderRadius: "3px", margin: "6px 0 10px", overflow: "hidden" } },
            h("div", { class: f.at === "hit" ? "s-done" : "s-act", style: { width: pct + "%", height: "100%", background: "var(--cb)", borderRight: "2px solid var(--c)" } })));
        if (f.rec) st.append(h("div", { class: "split" },
          h("div", { class: "key" }, h("b", { text: "известно на нападателя" }), h("p", { class: "mono", text: `n = ${f.n}, e = ${f.e}` })),
          h("div", { class: "key s-swap", style: { borderColor: "var(--c)" } }, h("b", { text: "пресметнато" }), h("p", { class: "mono", text: `p = ${f.rec.p}, q = ${f.rec.q}, φ = ${f.rec.phi}, d = ${f.rec.d}` }))));
      },
    });
  }

  S.chapter({ id: "asimetrichni", order: 9, num: "9", group: "Допълнение", title: "Асиметрични ключове", lead: "Публичен и частен ключ: какво е всеки, кой го държи и за какво служи. RSA и Дифи–Хелман стъпка по стъпка с малки числа, атака „човек по средата“, разлагане на n, дължини на ключовете и практическата употреба. Разширение.", html, mount, algos });
})();
