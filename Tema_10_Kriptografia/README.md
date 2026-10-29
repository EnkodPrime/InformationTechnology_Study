# Тема 10. Криптография

Обхват: *Основни понятия в криптографията. Класически методи с разбъркване и заместване.*

Отвори `index.html` в браузър (или `dist/Tema_10_Kriptografia.html` — един самостоятелен файл).
Източник на съдържанието: Tema_10_Manual, Tema_10_Razrabotka, Tema_10_Oporn_plan, Tema_10_Ponyatia.

## Раздели

```
Тема 10
├─ 0 Карта на темата                       ch00_map.js
├─ Основи
│  ├─ 1 Предмет и основни понятия          ch01_ponyatia.js       щракаема схема на канала; Base64 (кодиране ≠ шифроване)
│  └─ 2 Цели, модели на атака и ключове    ch02_ataki.js          модели на атака; разширен Евклид; known-plaintext (афинен, Виженер)
├─ Класически методи
│  ├─ 3 Разбъркване и заместване           ch03_razbarkvane.js    анимация ATTACK; шаблон на повторенията; брой на буквите; продуктов шифър
│  ├─ 4 Методи с разбъркване               ch04_transpozicia.js   колонна (с/без допълване), двойна, rail fence, маршрут (спирала)
│  ├─ 5 Цезарово и афинно заместване       ch05_cezar.js          колело; Цезар; изчерпване + χ²; моноазбучна; афинен; сливане при НОД ≠ 1
│  └─ 6 Виженер                            ch06_vizhener.js       таблица стъпково; Касиски; индекс на съвпадение; разбиване по колони
├─ Криптоанализ
│  └─ 7 Честотен анализ и еднократна лента ch07_chestoti.js       хистограми; честотно предположение; OTP; повторен ключ; изменение на бит
├─ Допълнение
│  ├─ 8 Съвременна криптография            ch08_savremenna.js     роли на ключа (шифроване/хеш/MAC/подпис/AEAD); колизии
│  └─ 9 Асиметрични ключове                ch09_asimetrichni.js   ключова двойка; RSA (Евклид, степенуване); Дифи–Хелман; MITM; разлагане
└─ Систематизация
   └─ 10 Систематизация и опорен план      ch10_sistematizacia.js
```

`js/alpha.js` — обща азбука (латиница A–Z, m = 26 / българска А–Я, m = 30) и рисуване; огледало на `c/alpha.h`.
Всеки визуализатор с текст има превключвател на азбуката.

## C код

```
c/alpha.h               азбуки, UTF-8 → кодове, mod, НОД, примерни текстове
c/01_base64.c           b64_encode / b64_decode
c/02_known_plain.c      modinv, affine_from_pairs, vig_keystream, keystream_period
c/03_invariants.c       letter_counts / same_counts, repeat_pattern / same_pattern
c/04_transposition.c    col_encrypt / col_decrypt, rail_*, route_*
c/05_caesar_affine.c    caesar_*, chi2, caesar_bruteforce, mono_*, affine_*
c/06_vigenere.c         vig_*, kasiski, kasiski_votes, ic, ic_period, vig_crack
c/07_freq_otp.c         rank_letters, freq_guess, xor_bytes
c/08_asym.c             mod_inverse (разширен Евклид), mod_pow, factor — RSA и Дифи–Хелман с малки числа
```

Компилиране: `gcc -std=c11 -Wall -Wextra -Werror -O2 c/05_caesar_affine.c -o cz -lm && ./cz`
Всички файлове са чисти и под `-fsanitize=address,undefined`.

## Проверка

```
sh tools/run_tests.sh Tema_10_Kriptografia      # 306 сверки JS ↔ C, 0 разлики
python3 tools/clickall.py Tema_10_Kriptografia  # 0 грешки
```

Тестовете сверяват **и двете посоки** на всеки шифър (шифроване и дешифриране) с изхода на C,
плюс резултатите от криптоанализа (изчерпване, Касиски, IC, разбиване по колони, честотно предположение).
`tests/_alpha.js` зарежда `js/alpha.js` в контекста на харнеса.
