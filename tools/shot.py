#!/usr/bin/env python3
"""Снимка на раздел в headless Chromium + конзолни грешки и хоризонтално препълване.
Употреба: python3 tools/shot.py <Tema_NN_Ime> <id-на-раздел> [изход.png] [--dark] [--mobile] [--click "селектор"]..."""
import sys, pathlib
from playwright.sync_api import sync_playwright
a = sys.argv[1:]
topic, chap = a[0], a[1]
out = a[2] if len(a) > 2 and not a[2].startswith("--") else f"/tmp/shot_{topic}_{chap}.png"
dark, mobile = "--dark" in a, "--mobile" in a
clicks = [a[i + 1] for i, x in enumerate(a) if x == "--click"]
url = pathlib.Path(__file__).resolve().parent.parent.joinpath(topic, "index.html").as_uri() + "#" + chap
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390 if mobile else 1360, "height": 900}, color_scheme="dark" if dark else "light")
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") and "Failed to load resource" not in m.text else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.route("**/fonts.g*/**", lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(400)
    for c in clicks:
        pg.click(c); pg.wait_for_timeout(250)
    w = pg.evaluate("document.documentElement.scrollWidth"); vw = pg.evaluate("innerWidth")
    if w > vw: errs.append(f"хоризонтално препълване: {w} > {vw}")
    pg.screenshot(path=out, full_page=True)
    b.close()
print("\n".join(errs) if errs else "без грешки", "->", out)
