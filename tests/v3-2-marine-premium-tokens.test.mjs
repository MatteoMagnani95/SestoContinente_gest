import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('app/marine-premium-tokens.css');
const tokens=Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-fA-F]{6})\s*;/g)].map(m=>[m[1],m[2]]));
function luminance(hex){
 const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function ratio(a,b){const x=luminance(tokens[a]),y=luminance(tokens[b]);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('Marine Premium: proposed normal text token pairs meet WCAG AA',()=>{
 for(const [a,b] of [['--sc-marine-ink','--sc-surface'],['--sc-muted','--sc-white'],['--sc-white','--sc-teal'],['--sc-white','--sc-ocean'],['--sc-white','--sc-brand-deep'],['--sc-navy','--sc-aqua'],['--sc-navy','--sc-marine-coral'],...['success','warning','danger','info','neutral'].map(x=>['--sc-'+x+'-fg','--sc-'+x+'-bg'])]){
  assert.ok(tokens[a]&&tokens[b],a+' '+b);
  assert.ok(ratio(a,b)>=4.5,a+' '+b+' '+ratio(a,b));
 }
});
test('Marine Premium: control border and focus have minimum 3:1 contrast',()=>{
 for(const bg of ['--sc-white','--sc-surface'])for(const fg of ['--sc-control-border','--sc-focus'])assert.ok(ratio(fg,bg)>=3,fg+' '+bg);
});
test('Marine Premium: active public layer stays scoped, not global',()=>{
 assert.match(read('app/layout.tsx'),/import '\.\/marine-premium-tokens\.css'/);
 for(const path of ['app/page.tsx','app/accedi/page.tsx','app/registrati/page.tsx','app/nuova-password/page.tsx','app/richiesta/nuova/page.tsx','app/richiesta/stato/page.tsx'])assert.match(read(path),/sc-marine-preview/,path);
 for(const path of ['components/AppShell.tsx','components/StaffNav.tsx','app/gestionale/page.tsx','app/gestionale/incassi/page.tsx'])assert.doesNotMatch(read(path),/sc-marine-preview/,path);
 assert.match(css,/\.sc-marine-preview\s*\{/);
 assert.doesNotMatch(css,/@import|url\(|:root\s*\{|!important/i);
 assert.match(css,/--sc-target:\s*44px/);
 assert.match(css,/--sc-primary-target:\s*48px/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
});

test('Marine Premium: locally generated WebP bytes and no SVG decoration in new layer',()=>{
 const visual=read('app/marine-premium-public.css');
 for(const [name,size,hash] of [['marine-hero-1440.webp',209738,'68b04ebd489743ff7f1f5a33d2cba7e98816e686380f3ebe97ad5f9393f7b537'],['marine-hero-480.webp',33776,'f1d58f1bf64c8095d663ca0fb254b3764c9a098a167f491cca14cd5360751f61'],['marine-hero-768.webp',76596,'35aaf6d9734b3c70461f4a9918f2145c48e5f397d87dcc0d4ac675f1b303645f'],['marine-nereia-640.webp',35958,'86fa1f537dd8af264838f1b715b8e7bc66be49273e5869d8369fcfd20347957a']]){
 const b=readFileSync(new URL('../public/brand/marine-premium/'+name,import.meta.url));assert.equal(b.length,size);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(createHash('sha256').update(b).digest('hex'),hash);assert.ok(visual.includes(name));}
 assert.doesNotMatch(visual,/url\([^)]*\.svg|https?:\/\//i);
});
