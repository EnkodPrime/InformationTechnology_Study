#!/usr/bin/env python3
"""Стрес-тест: във всеки раздел на темата натиска всички бутони, минава всички стъпки до края,
сменя всички селекти и плъзгачи и събира JS грешки/предупреждения.
Употреба: python3 tools/clickall.py <Tema_NN_Ime> [id ...]"""
import pathlib, sys
from playwright.sync_api import sync_playwright
topic = sys.argv[1]
url = pathlib.Path(__file__).resolve().parent.parent.joinpath(topic, "index.html").as_uri()
bad = 0
JS = """async () => {
  const sec = document.getElementById('ch-' + location.hash.slice(1));
  let clicks = 0; const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (const b of [...sec.querySelectorAll('button')].filter(b => !b.closest('.chapnav'))) {
    if (!b.isConnected || b.disabled) continue;
    try { b.click(); clicks++; } catch (e) {}
    await sleep(5);
    for (const v of sec.querySelectorAll('.viz')) { const l = v.querySelector('button[aria-label="Край"]'); if (l && !l.disabled) l.click(); }
  }
  for (const s of sec.querySelectorAll('select')) for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', {bubbles:true})); await sleep(5); }
  for (const r of sec.querySelectorAll('input[type=range]')) for (const v of [r.min || 0, r.max || 100]) { r.value = v; r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); await sleep(5); }
  return clicks;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1300, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") and "Failed to load resource" not in m.text else None)
    pg.route("**/fonts.g*/**", lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(300)
    ids = sys.argv[2:] or pg.evaluate("Study.chapters.map(c => c.id)")
    for cid in ids:
        errs.clear()
        pg.goto(url + "#" + cid); pg.wait_for_timeout(300)
        n = pg.evaluate(JS); pg.wait_for_timeout(300)
        uniq = sorted(set(errs))
        print(f"{cid:22s} натискания={n:4d}  грешки={len(uniq)}")
        for e in uniq[:8]: print("    ", e[:240])
        bad += len(uniq)
    b.close()
sys.exit(1 if bad else 0)
