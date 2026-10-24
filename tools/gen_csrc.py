#!/usr/bin/env python3
"""Генерира js/csrc.js от C файловете на една тема.

Всеки .c или .cpp файл в <тема>/c/ може да съдържа един или повече региона:

    //#viz <ключ>
    ... C код, който се показва във визуализацията ...
    //#end

Ред в региона може да завършва с маркер  //@етикет  (или няколко: //@a @b).
Маркерът не се показва; визуализацията го използва, за да подсвети реда.

Употреба:  python3 tools/gen_csrc.py Tema_05_Algoritmi
"""
import json
import pathlib
import re
import sys

TAG_RE = re.compile(r"\s*//@([\w@ ]+)\s*$")


def parse(path):
    regions = {}
    cur = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if s.startswith("//#viz"):
            key = s.split(None, 1)[1].strip()
            cur = {"lines": [], "tags": {}, "file": path.name}
            regions[key] = cur
            continue
        if s.startswith("//#end"):
            cur = None
            continue
        if cur is None:
            continue
        m = TAG_RE.search(raw)
        line = raw
        if m:
            line = raw[: m.start()].rstrip()
            for t in m.group(1).replace("@", " ").split():
                cur["tags"].setdefault(t, []).append(len(cur["lines"]) + 1)
        cur["lines"].append(line.rstrip())
    out = {}
    for k, r in regions.items():
        # премахва общия отстъп
        lines = r["lines"]
        ind = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
        out[k] = {
            "file": r["file"],
            "code": "\n".join(l[ind:] for l in lines),
            "tags": r["tags"],
        }
    return out


def main():
    topic = pathlib.Path(sys.argv[1])
    allr = {}
    for f in sorted(list((topic / "c").glob("*.c")) + list((topic / "c").glob("*.cpp"))):
        for k, v in parse(f).items():
            if k in allr:
                sys.exit(f"Дублиран ключ {k} в {f} и {allr[k]['file']}")
            allr[k] = v
    js = "/* Генерирано от tools/gen_csrc.py — не редактирай ръчно; редактирай c/*.c */\n"
    js += "window.CSRC = " + json.dumps(allr, ensure_ascii=False, indent=1) + ";\n"
    (topic / "js" / "csrc.js").write_text(js, encoding="utf-8")
    print(f"{len(allr)} региона -> {topic/'js'/'csrc.js'}")


if __name__ == "__main__":
    main()
