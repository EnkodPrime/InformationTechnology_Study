const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const context = {window:{}}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../js/playground.js'),'utf8'),context);
const P = context.window.WebPlayground;
for (const mode of ['html','flex','grid','media']) {
 const r=P.build({mode}); assert.ok(r.document.startsWith('<!doctype html>'));
 assert.equal((r.html.match(/class="item/g)||[]).length,6);
 assert.ok(r.document.includes('form-action'));
}
for (const [w,active] of [[599,false],[600,true],[601,true]]) assert.equal(P.build({mode:'media',width:w,breakpoint:600}).active,active);
for (const [w,active] of [[599,true],[600,true],[601,false]]) assert.equal(P.build({mode:'media',width:w,feature:'max-width',breakpoint:600}).active,active);
const normalized=P.normalize({count:0,width:999999,gap:-1,selected:99,rootTag:'script',columns:'</style><script>bad()</script>'});
assert.equal(normalized.count,1); assert.equal(normalized.width,1280); assert.equal(normalized.gap,0); assert.equal(normalized.selected,1); assert.equal(normalized.rootTag,'main');
assert.equal(normalized.columns,P.defaults.columns);
const html=P.build({mode:'html',rootTag:'section',itemTag:'div',contentType:'list',heading:'h3',showFooter:false});
assert.ok(html.html.includes('<section class="demo"')); assert.ok(html.html.includes('<h3>')); assert.ok(html.html.includes('<ul>')); assert.ok(!html.html.includes('<footer'));
assert.ok(P.build({mode:'flex',direction:'column',grow:2,selected:3}).css.includes('.item:nth-child(3) { flex-grow: 2'));
assert.ok(P.build({mode:'grid',span:'span 2'}).css.includes('grid-column: span 2'));
assert.ok(!P.build({mode:'media'}).html.includes('chosen'));
assert.ok(P.build({mode:'html',contentType:'image'}).html.includes('alt="Учебно изображение'));
console.log('PASS: all four modes, media boundaries, generated HTML/CSS and bounded allowed control values.');
