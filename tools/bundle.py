#!/usr/bin/env python3
"""Събира тема в ЕДИН самостоятелен HTML файл (CSS и JS вградени).

    python3 tools/bundle.py Tema_05_Algoritmi            -> Tema_05_Algoritmi/dist/Tema_05_Algoritmi.html
    python3 tools/bundle.py Tema_05_Algoritmi --artifact -> без <!doctype>/<html>/<head>/<body> обвивка

Връзките „целият файл“ към c/*.c в еднофайловия вариант сочат към GitHub.
"""
import pathlib
import re
import sys

REPO_RAW = "https://github.com/EnkodPrime/InformationTechnology_Study/blob/main/"


def main():
    topic = pathlib.Path(sys.argv[1]).resolve()
    artifact = "--artifact" in sys.argv
    src = (topic / "index.html").read_text(encoding="utf-8")

    def css(m):
        p = (topic / m.group(1)).resolve()
        return "<style>\n" + p.read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        p = (topic / m.group(1)).resolve()
        if not p.exists():
            return ""
        code = p.read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>\n" + code + "\n</script>"

    out = re.sub(r'<link rel="stylesheet" href="((?:\.\./)?[^"h][^"]*\.css)">', css, src)
    out = re.sub(r'<script src="([^"]+\.js)"></script>', js, out)
    # пълните C файлове — към GitHub
    out = out.replace('Study.boot({', f'Study.cBase = "{REPO_RAW}{topic.name}/c/"; Study.boot({{', 1)
    out = out.replace('<a class="btn ghost" href="../index.html">Всички теми</a>',
                      f'<a class="btn ghost" href="{REPO_RAW}README.md" target="_blank" rel="noopener">Репо</a>')
    if artifact:
        out = re.sub(r"(?is)<!doctype html>\s*<html[^>]*>\s*<head>", "", out)
        out = re.sub(r'(?i)<meta charset="utf-8">\s*', "", out)
        out = re.sub(r'(?i)<meta name="viewport"[^>]*>\s*', "", out)
        out = re.sub(r"(?i)</head>\s*<body>", "", out)
        out = re.sub(r"(?i)</body>\s*</html>\s*$", "", out)
    dist = topic / "dist"
    dist.mkdir(exist_ok=True)
    name = topic.name + ("_artifact" if artifact else "") + ".html"
    (dist / name).write_text(out, encoding="utf-8")
    print(f"{dist / name}  ({len(out.encode()) // 1024} KB)")


if __name__ == "__main__":
    main()
