import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(p,'utf8');
const css=read('app/design-tokens.css');
const tokens=Object.fromEntries([...css.matchAll(/--sc-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(m=>[m[1],m[2]]));
const lum=h=>h.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(tokens[a]),lum(tokens[b]))+.05)/(Math.min(lum(tokens[a]),lum(tokens[b]))+.05);
test('3.0: contrasto degli inchiostri area su fondi pastello e azioni',()=>{
 for(const a of ['secretariat','teaching','calendar','equipment','finance','system','pool','event','certificate','documents'])assert.ok(ratio(a,a+'-tint')>=4.5,a);
 for(const a of ['teal','brand-deep'])assert.ok(ratio(a,'white')>=4.5,a);
 for(const a of ['control-border','focus'])assert.ok(ratio(a,'surface')>=3,a);
});
test('3.0: asset PNG reali, dimensioni e SHA degli originali restaurati',()=>{
 const assets=[['sestocontinente-logo.png',742,376,'2bcec4beabc0eb32262198ac281887b6d5d1b66c'],['sestocontinente-mark.png',536,238,'03b69edc30785d13f03aa32ff03c9876ee418b92'],['nereia-logo.png',540,546,'06d3a385b200e1c077ea53f25ff8393c1ee6a515'],['favicon.png',128,128,'4ac372f411c532efabdf2d1ee36e9ecdb64e0335']];
 for(const [name,w,h,sha] of assets){const b=readFileSync('public/brand/'+name);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h);assert.equal(b[25],6);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha);}
});
test('3.0: branding collegato, niente marchio generico o link fittizio Nereia',()=>{
 const brand=read('components/ui/BrandLogo.tsx'),header=read('components/SiteHeader.tsx'),home=read('app/page.tsx'),shell=read('components/AppShell.tsx'),layout=read('app/layout.tsx');
 assert.match(header,/<BrandMark\/>/);assert.doesNotMatch(header,/≈/);assert.match(home,/<AssociationLogo\/>/);assert.doesNotMatch(home,/≈/);assert.match(home,/<NereiaProject\/>/);assert.match(shell,/<NereiaProject compact\/>/);assert.match(layout,/\/brand\/favicon\.png/);assert.doesNotMatch(brand,/href=|https?:\/\//);
 assert.match(read('public/brand/marine-accent.svg'),/<svg[^>]*viewBox=/);assert.doesNotMatch(read('public/brand/marine-accent.svg'),/<script|<image|<foreignObject/i);
});
test('3.0: tracker censisce ogni UI e handler senza confondere implementato con verificato',()=>{
 const tracker=read('docs/redesign/UI_UX_3.0_TRACKER.md');
 function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):/^(page|route|layout)\.tsx?$/.test(e.name)?[join(dir,e.name)]:[]);}
 for(const file of walk('app'))assert.ok(tracker.includes('\x60'+file+'\x60'),file);
 assert.match(tracker,/NV\/NV\/NV\/NV/);
});
