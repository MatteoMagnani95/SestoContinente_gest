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
 const b=readFileSync(new URL('../public/brand/marine-premium/'+name,import.meta.url));assert.equal(b.length,size);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(createHash('sha256').update(b).digest('hex'),hash);assert.ok(!visual.includes(name),'archived superseded image '+name);}
 assert.doesNotMatch(visual,/url\([^)]*\.svg|https?:\/\//i);
});

test('Marine Premium: three distinct local decorative scenes, verified by digest',()=>{
 const visual=read('app/marine-premium-public.css');
 const assets=[["marine-reef-1440.webp",76132,"2ae08406665b22bc3f21f789ab77aba0ba3a7c03b07e1894250e37fc4f64a565"],["marine-reef-768.webp",27586,"7d43434b99e8e7bd40c379da6d136dd9d103826d4cc81a8b0510dca37d4ae119"],["marine-reef-480.webp",11626,"28cbfc5b77f2ba8ff74108743999a76ba2a730851962cc47685e8776a2849d87"],["marine-auth-strip-1000.webp",52516,"a23c949b28dc4340a094b18a75c6949395d08c65c59f1924748747b5a98a0298"],["marine-auth-strip-480.webp",14044,"d79cd71e1a491461e9b74a6089d3a5666fe641765856aea5b08f0638b3f805a7"],["marine-nereia-scene-960.webp",30492,"7ab3236575d2ffc578cb8c8048458310bf931d135b8fb17296a3cb84ccc8147c"],["marine-nereia-scene-480.webp",8560,"d6d1231ea0b12d14d126eed37c0948cd540f7bf28f8abae801a12bc0edee931e"]];
 for(const [name,size,hash] of assets){const b=readFileSync(new URL('../public/brand/marine-premium/'+name,import.meta.url));assert.equal(b.length,size);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(createHash('sha256').update(b).digest('hex'),hash);assert.ok(!visual.includes(name),'archived superseded image '+name);}
 assert.equal(new Set(assets.map(a=>a[2])).size,7);
 assert.match(visual,/--sc-marine-reef:/);assert.match(visual,/--sc-marine-strip:/);assert.match(visual,/--sc-marine-nereia:/);
 assert.doesNotMatch(visual,/url\([^)]*marine-nereia-640\.webp/);
});

test('Marine Premium: approved painterly assets are local, responsive and byte-verified',()=>{
 const visual=read('app/marine-premium-public.css');
 const approved=[["marine-paint-hero-1440.webp",245788,"878c6ba01f427cee177f230ade421f6d2e87ab00f8dac6c82e708edcd7a8665e"],["marine-paint-hero-768.webp",92946,"9ca63c5828fe90e01add83cf15361b988f6f36deebb58cae5134fa8c794ab45d"],["marine-paint-hero-480.webp",45726,"a200a04e18de0b53bbe7a3bba36056e4c12b80e64eee2018f4af7e25e12438d7"],["marine-paint-auth-1000.webp",57566,"7e8358265de95ec92059291cafee02b7f6eb583b638d71c7cdfef1197ccc36e3"],["marine-paint-auth-480.webp",20722,"eadc8f5593102f4dbffb2f141bec128d8adc919a5914ef0b3e891233b7ef9b29"],["marine-paint-nereia-960.webp",80958,"7827b8418608204baf903e747a48604cc047c917fbab2cb67d3eba724231d333"],["marine-paint-nereia-480.webp",30422,"7f1f92a07998cc93c4fea545a09cdecf874c34ba14ea0b5c6c3b0055f02afcda"],["marine-paint-reef-360.webp",65090,"ec5c0bd6c0909ca565b5991372ffc5a09a46cad03d0faf027f959235814aa36f"],["marine-paint-reef-240.webp",36394,"0f4f4a4f8fa8ae12e2e06b98cad117c84a0396c4d77af82f2bae5c1a6306281d"]];
 for(const [name,size,hash] of approved){
 const b=readFileSync(new URL('../public/brand/marine-premium/'+name,import.meta.url));
 assert.equal(b.length,size);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(createHash('sha256').update(b).digest('hex'),hash);assert.ok(visual.includes(name),name);
 }
 assert.equal(new Set(approved.map(x=>x[2])).size,9);
 assert.ok(approved[0][1]<=256000);assert.ok(approved[1][1]<=153600);assert.ok(approved[2][1]<=153600);
 for(const p of ['app/accedi/page.tsx','app/registrati/page.tsx','app/richiesta/nuova/page.tsx','app/richiesta/stato/page.tsx'])assert.doesNotMatch(read(p),/sc-marine-home-link/);
 assert.match(read('components/AppShell.tsx'),/sc-back-button/);
});
