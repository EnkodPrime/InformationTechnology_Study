#!/bin/sh
# Компилира всички C примери (-Werror), пуска ги и сверява JS визуализациите с тях.
set -e
cd "$(dirname "$0")/.."
python3 ../tools/gen_csrc.py .
for f in c/*.c; do gcc -std=c11 -Wall -Wextra -Werror -O2 "$f" -o /tmp/t05_bin -lm && /tmp/t05_bin > /dev/null && echo "ok  $f"; done
for t in tests/*.test.js; do node "$t"; done
