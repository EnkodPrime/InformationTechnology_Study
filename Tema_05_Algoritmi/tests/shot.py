#!/usr/bin/env python3
"""Отваря index.html#<глава> в headless Chromium, събира конзолни грешки и прави снимка.
Употреба: python3 tests/shot.py <глава> [изход.png] [--dark] [--mobile] [--click "селектор"]..."""
import sys, pathlib
from playwright.sync_api import sync_playwright
args = sys.argv[1:]
chap = args[0]; out = args[1] if len(args) > 1 and not args[1].startswith("--") else f"/tmp/claude-0/shot_{chap}.png"
dark = "--dark" in args; mobile = "--mobile" in args
clicks = [args[i + 1] for i, a in enumerate(args) if a == "--click"]
url = pathlib.Path(__file__).resolve().parent.parent.joinpath("index.html").as_uri() + "#" + chap
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390 if mobile else 1360, "height": 900}, color_scheme="dark" if dark else "light")
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") and "fonts.g" not in m.text else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(400)
    for c in clicks:
        pg.click(c); pg.wait_for_timeout(250)
    w = pg.evaluate("document.documentElement.scrollWidth"); vw = pg.evaluate("innerWidth")
    if w > vw: errs.append(f"horizontal overflow: {w} > {vw}")
    pg.screenshot(path=out, full_page=True)
    b.close()
print("\n".join(errs) if errs else "без грешки", "->", out)
