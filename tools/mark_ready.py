#!/usr/bin/env python3
"""Отбелязва тема като готова в index.html (хъба) и README.md.  Употреба: python3 tools/mark_ready.py Tema_NN_Ime"""
import pathlib, re, sys
folder = sys.argv[1]; n = int(re.match(r"Tema_(\d+)_", folder).group(1))
root = pathlib.Path(__file__).resolve().parent.parent
p = root / "index.html"; s = p.read_text(encoding="utf-8")
s = re.sub(rf'(\["{n:02d}", "[^"]*", "[^"]*")\]', rf'\1, "{folder}/index.html"]', s, count=1)
p.write_text(s, encoding="utf-8")
p = root / "README.md"; s = p.read_text(encoding="utf-8")
s = re.sub(rf"^\| {n} \| ([^|]+?) \| — \| предстои \|$", lambda m: f"| {n} | **{m.group(1)}** | [`{folder}/`]({folder}/) | готова |", s, flags=re.M)
p.write_text(s, encoding="utf-8")
print("готова:", folder)
