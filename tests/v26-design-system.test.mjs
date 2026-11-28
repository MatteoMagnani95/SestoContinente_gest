import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=read('app/design-tokens.css');
const ui=read('app/design-system.css');
const components=read('components/ui/Primitives.tsx');
const token=name=>{const match=css.match(new RegExp('--sc-'+name+':\\s*(#[0-9a-f]{6})\\s*;','i'));assert.ok(match,'Missing token '+name);return match[1]};
function luminance(hex) {
  const channels=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
test('palette di identità e colori semantici centralizzati',()=>{
  assert.equal(token('navy').toUpperCase(),'#102D3B');
  assert.equal(token('teal').toUpperCase(),'#007D83');
  assert.equal(token('ocean').toUpperCase(),'#285EAE');
  assert.equal(token('aqua').toUpperCase(),'#46C9C4');
  assert.equal(token('surface').toUpperCase(),'#F7FAFC');
});
test('combinazioni testo/sfondo approvate rispettano 4.5:1',()=>{
  const pairs=[['navy','white'],['teal','white'],['teal-ink','surface'],['teal-ink','white'],['ocean','white'],['muted','surface'],['muted','white'],['aqua','navy'],['secretariat','white'],['teaching','white'],['calendar','white'],['equipment','white'],['finance','white'],['system','white'],...['success','warning','danger','info','neutral'].map(t=>[t+'-fg',t+'-bg'])];
  for(const [a,b] of pairs) assert.ok(contrast(token(a),token(b))>=4.5,a+' / '+b);
});
test('bordo controlli e focus rispettano almeno 3:1 su bianco',()=>{
  assert.ok(contrast(token('focus'),token('white'))>=3);
  assert.ok(contrast(token('control-border'),token('white'))>=3);
});
test('primitive: semantica minima, default button non-submit, errori e label',()=>{
  for(const component of ['Button','ButtonLink','PageHeader','SectionHeader','MetricCard','StatusBadge','Alert','EmptyState','LoadingState','ErrorState','FormField','FormSection','FormActions'])assert.match(components,new RegExp('export function '+component+'\\('));
  assert.match(components,/type = 'button'/);
  assert.match(components,/htmlFor=\{id\}/);
  assert.match(components,/aria-describedby/);
  assert.match(components,/role="status"/);
  assert.match(components,/role="alert"/);
  assert.match(read('components/ui/Icon.tsx'),/aria-hidden="true"/);
  assert.match(ui,/prefers-reduced-motion/);
});
test('design system caricato dopo CSS storico e dashboard usa primitive senza perdere guard',()=>{
  const root=read('app/layout.tsx');
  assert.ok(root.indexOf("./globals.css")<root.indexOf("./design-tokens.css"));
  assert.ok(root.indexOf("./design-tokens.css")<root.indexOf("./design-system.css"));
  const page=read('app/gestionale/page.tsx');
  assert.match(page,/await requireStaff\(\)/);
  assert.match(page,/<MetricCard/);
  assert.match(page,/lessonsError\?<ErrorState/);
  assert.match(page,/admin\.data&&/);
});
