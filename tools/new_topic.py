#!/usr/bin/env python3
"""Създава скелет на нова тема.
Употреба: python3 tools/new_topic.py Tema_NN_Ime NN "Кратко заглавие" "Ред от конспекта"
След това: добави js/chNN_*.js файловете в index.html (между маркерите CHAPTERS)."""
import pathlib, sys
folder, num, title, konspekt = sys.argv[1:5]
root = pathlib.Path(__file__).resolve().parent.parent
T = root / folder
if T.exists():
    sys.exit(f"{T} вече съществува")
for d in ("c", "js", "tests", "dist"):
    (T / d).mkdir(parents=True, exist_ok=True)
topic_key = "t" + num.zfill(2)
(T / "index.html").write_text(f"""<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} · Тема {int(num)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap">
<link rel="stylesheet" href="../common/css/study.css">
</head>
<body>
<header class="topbar">
  <div class="brand"><b>Тема {int(num)} · {title}</b><span>Кандидат-докторантски изпит · Информатика · ШУ</span></div>
  <select id="navselect" class="navselect" aria-label="Раздел"></select>
  <span class="sp"></span>
  <button class="btn" id="btn-gloss" type="button">Речник</button>
  <button class="btn ghost" id="btn-theme" type="button">Тъмна тема</button>
  <a class="btn ghost" href="../index.html">Всички теми</a>
</header>
<div class="layout">
  <nav class="sidenav" id="sidenav" aria-label="Раздели"></nav>
  <main class="content" id="content"></main>
</div>

<script src="../common/js/study.js"></script>
<script src="../common/js/aichat.js"></script>
<script src="js/glossary.js"></script>
<script src="js/sources.js"></script>
<script src="js/csrc.js"></script>
<!-- CHAPTERS -->
<script src="js/ch00_map.js"></script>
<!-- /CHAPTERS -->
<script>Study.boot({{ topic: "{topic_key}", title: "Тема {int(num)} · {title}" }});</script>
</body>
</html>
""", encoding="utf-8")
(T / "js" / "glossary.js").write_text(f"/* Речник за тема {int(num)}. Основните определения (d) са от „Тема {int(num)}. Речник на понятията“. */\nwindow.GLOSSARY = {{\n}};\n", encoding="utf-8")
(T / "js" / "sources.js").write_text(f"/* Справки в Уикипедия за понятията от речника на тема {int(num)} (ключ като в glossary.js). */\nwindow.TERM_SOURCES = {{\n}};\n", encoding="utf-8")
(T / "js" / "csrc.js").write_text("window.CSRC = {};\n", encoding="utf-8")
(T / "README.md").write_text(f"# Тема {int(num)}. {title}\n\nКонспект: *{konspekt}*\n\nОтвори `index.html` в браузър.\n", encoding="utf-8")
print("Създадена", T)
