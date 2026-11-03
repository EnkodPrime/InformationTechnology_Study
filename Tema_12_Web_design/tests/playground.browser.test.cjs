/* Run: node Tema_12_Web_design/tests/playground.browser.test.cjs */
const { chromium } = require('playwright');
const { expect } = require('playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1050}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,route=>route.abort());
    const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    await page.goto(url+'#layout');
    const pg=page.locator('#layout-playground');
    await expect(pg.locator('[data-key="mode"]')).toHaveValue('flex');
    const frame=await (await pg.locator('iframe').elementHandle()).contentFrame();
    const select=(key,value)=>pg.locator('[data-key="'+key+'"]').selectOption(value);
    const num=async(key,value)=>{await pg.locator('[data-key="'+key+'"]').fill(String(value));await pg.locator('[data-key="'+key+'"]').press('Tab');};
    const css=(selector,property)=>frame.locator(selector).first().evaluate((el,p)=>getComputedStyle(el)[p],property);
    await expect.poll(()=>css('.demo','display')).toBe('flex');
    await select('direction','column');
    await expect.poll(()=>css('.demo','flexDirection')).toBe('column');
    await select('justify','center');
    await expect.poll(()=>css('.demo','justifyContent')).toBe('center');
    await num('grow',2);await expect.poll(()=>css('.chosen','flexGrow')).toBe('2');
    await num('count',1);await expect(frame.locator('.item')).toHaveCount(1);
    await expect(pg.locator('[data-key="selected"]')).toHaveValue('1');
    await select('mode','grid');
    await select('columns','repeat(3, minmax(0, 1fr))');
    await num('count',6);
    await expect.poll(()=>css('.demo','display')).toBe('grid');
    await pg.locator('[data-mirror="selected"]').selectOption('2');
    await select('span','span 2');
    await expect.poll(()=>css('.chosen','gridColumnStart')).toBe('span 2');
    await select('columns','repeat(auto-fit, minmax(140px, 1fr))');
    await num('width',360);
    await expect.poll(async()=>String(await css('.demo','gridTemplateColumns')).split(' ').length).toBe(2);
    await select('mode','media');
    await num('breakpoint',600);
    await select('feature','min-width');
    for(const [w,active,columns]of [[599,false,1],[600,true,3],[601,true,3]]){
      await num('width',w);
      await expect(pg.locator('.wp-status')).toHaveAttribute('data-active',String(active));
      await expect.poll(()=>frame.evaluate(()=>innerWidth)).toBe(w);
      await expect.poll(async()=>String(await css('.demo','gridTemplateColumns')).split(' ').length).toBe(columns);
      await expect.poll(()=>frame.evaluate(()=>matchMedia('(min-width: 600px)').matches)).toBe(active);
    }
    await select('feature','max-width');
    for(const [w,active]of [[599,true],[600,true],[601,false]]){
      await num('width',w);
      await expect(pg.locator('.wp-status')).toHaveAttribute('data-active',String(active));
      await expect.poll(()=>frame.evaluate(()=>matchMedia('(max-width: 600px)').matches)).toBe(active);
    }
    await select('baseDisplay','flex');await select('baseDirection','column');
    await num('width',800);await expect.poll(()=>css('.demo','flexDirection')).toBe('column');
    await select('mode','html');await select('rootTag','section');await select('itemTag','div');await select('heading','h3');
    await select('contentType','list');
    await expect(frame.locator('section.demo > div.item > ul')).toHaveCount(6);
    await expect(frame.locator('.item > h3')).toHaveCount(6);
    await pg.locator('[data-key="showFooter"]').uncheck();await expect(frame.locator('footer')).toHaveCount(0);
    await select('contentType','image');await expect(frame.locator('.item img')).toHaveCount(6);
    await expect.poll(()=>frame.locator('.item img').first().evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
    await expect(pg.getByRole('textbox',{name:'Генериран HTML'})).toHaveValue(/<section class="demo"/);
    await pg.getByRole('button',{name:'Нулирай настройките'}).click();
    await expect(pg.locator('[data-key="rootTag"]')).toHaveValue('main');
    await expect(frame.locator('.item')).toHaveCount(2);
    // No duplicate IDs or invalid selections in either hosted chapter.
    assert.deepEqual(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return ids.filter((v,i)=>ids.indexOf(v)!==i);}),[]);
    await select('mode','flex');
    await page.setViewportSize({width:390,height:844});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:path.resolve(__dirname,'../../playground-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1050});
    await pg.locator('select[aria-label="Готов пример"]').selectOption('center');
    await page.screenshot({path:path.resolve(__dirname,'../../playground-desktop.png'),fullPage:true});
    // The same module mounts independently in the HTML chapter; old editors still work.
    await page.goto(url+'#html');const htmlpg=page.locator('#html-playground');
    await expect(htmlpg.locator('[data-key="mode"]')).toHaveValue('html');
    await htmlpg.locator('[data-key="heading"]').selectOption('h4');
    const htmlframe=await (await htmlpg.locator('iframe').elementHandle()).contentFrame();
    await expect(htmlframe.locator('.item h4')).toHaveCount(2);
    assert.deepEqual(errors,[]);
    console.log('PASS: HTML structure, live flex/grid, per-item controls, media boundaries, images, reset, mobile overflow and both chapter mounts.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
