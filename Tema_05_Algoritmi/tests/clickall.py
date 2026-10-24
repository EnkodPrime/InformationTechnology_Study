#!/usr/bin/env python3
"""Стрес-тест: във всеки раздел натиска всички бутони на визуализаторите (примери, случайни,
Изпълни), минава всички стъпки до края и събира JS грешки/предупреждения."""
import pathlib, sys
from playwright.sync_api import sync_playwright
ids = sys.argv[1:] or "karta algoritam izchislimost slozhnost pnp rekursia razdelyai sortirovki alchen dp dopalnitelni sistematizacia".split()
url = pathlib.Path(__file__).resolve().parent.parent.joinpath("index.html").as_uri()
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1300, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") and "Failed to load resource" not in m.text else None)
    pg.route("**/fonts.g*/**", lambda r: r.abort())
    for cid in ids:
        errs.clear()
        pg.goto(url + "#" + cid); pg.wait_for_timeout(300)
        n = pg.evaluate("""async () => {
          const sec = document.getElementById('ch-' + location.hash.slice(1));
          let clicks = 0;
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));
          // всички бутони/карти извън навигацията, без линкове
          const btns = [...sec.querySelectorAll('button')].filter(b => !b.closest('.chapnav'));
          for (const b of btns) {
            if (!b.isConnected || b.disabled) continue;
            try { b.click(); clicks++; } catch (e) {}
            await sleep(5);
            // след всяко натискане: прескочи до края на всеки визуализатор
            for (const v of sec.querySelectorAll('.viz')) {
              const last = v.querySelector('button[aria-label="Край"]');
              if (last && !last.disabled) { last.click(); }
            }
          }
          // промени селекти
          for (const s of sec.querySelectorAll('select')) {
            for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', {bubbles:true})); await sleep(5); }
          }
          // плъзгачи
          for (const r of sec.querySelectorAll('input[type=range]')) {
            for (const v of [r.min || 0, r.max || 100]) { r.value = v; r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); await sleep(5); }
          }
          return clicks;
        }""")
        pg.wait_for_timeout(300)
        uniq = sorted(set(errs))
        print(f"{cid:16s} натискания={n:4d}  грешки={len(uniq)}")
        for e in uniq[:8]: print("    ", e[:220])
        bad += len(uniq)
    b.close()
sys.exit(1 if bad else 0)
