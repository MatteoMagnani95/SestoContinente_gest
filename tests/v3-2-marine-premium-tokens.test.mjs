import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
test('Marine Premium: opt-in layer stays inactive until visual integration',()=>{
 assert.ok(!read('app/layout.tsx').includes('marine-premium-tokens.css'));
 assert.match(css,/\.sc-marine-preview\s*\{/);
 assert.doesNotMatch(css,/@import|url\(|:root\s*\{|!important/i);
 assert.match(css,/--sc-target:\s*44px/);
 assert.match(css,/--sc-primary-target:\s*48px/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
});
