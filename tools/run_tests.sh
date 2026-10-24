#!/bin/sh
# Употреба: sh tools/run_tests.sh Tema_NN_Ime
# Генерира csrc.js, компилира всеки C/C++ файл с -Werror, пуска го и пуска всички tests/*.test.js.
set -e
cd "$(dirname "$0")/.."
T="$1"; [ -d "$T" ] || { echo "Няма папка $T"; exit 2; }
python3 tools/gen_csrc.py "$T"
for f in "$T"/c/*.c; do [ -e "$f" ] || continue; gcc -std=c11 -Wall -Wextra -Werror -O2 "$f" -o /tmp/its_bin -lm && /tmp/its_bin > /dev/null && echo "ok  $f"; done
for f in "$T"/c/*.cpp; do [ -e "$f" ] || continue; g++ -std=c++17 -Wall -Wextra -Werror -O2 "$f" -o /tmp/its_bin -lm && /tmp/its_bin > /dev/null && echo "ok  $f"; done
for t in "$T"/tests/*.test.js; do [ -e "$t" ] || continue; node "$t"; done
