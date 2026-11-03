"""Build topic 12's dedicated playground with inline CSS/JS for a fresh, portable entrypoint."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
topic = root / "Tema_12_Web_design"
css = (root / "common/css/study.css").read_text(encoding="utf-8")
js = "\n".join((root / p).read_text(encoding="utf-8") for p in
               ("common/js/study.js", "Tema_12_Web_design/js/playground.js"))
js = js.replace("</script", "<\\/script")
out = '''<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HTML и CSS playground · Тема 12</title>
<style>''' + css + '''
main.playground-page{max-width:1240px;margin:auto;padding:24px 16px 48px;min-width:0}
</style></head><body>
<header class="topbar"><div class="brand"><b>HTML и CSS playground</b><span>Тема 12 · Уеб дизайн</span></div><span class="sp"></span><a class="btn ghost" href="index.html#layout">Към урока</a></header>
<main class="playground-page"><div id="playground"></div></main>
<script>''' + js + '''
const savedTheme = Study.store.get("theme", null);
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
WebPlayground.mount(document.getElementById("playground"), "flex");
</script></body></html>'''
(topic / "playground.html").write_text(out, encoding="utf-8")
print("Built", topic / "playground.html")
