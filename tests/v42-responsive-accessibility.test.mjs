import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createElement as h,Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const source=read(path);
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
test('Contrasto WCAG: testo normale, stati e controlli della palette condivisa',()=>{
 const css=read('app/design-tokens.css')+'\n'+read('app/responsive-accessibility.css');
 const tokens=Object.fromEntries([...css.matchAll(/--(sc-[\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(m=>[m[1],m[2]]));
 const luminance=color=>{
  const [r,g,b]=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
 };
 const ratio=(a,b)=>{const aa=luminance(tokens[a]),bb=luminance(tokens[b]);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);};
 const textPairs=[['sc-navy','sc-white'],['sc-navy','sc-surface'],['sc-muted','sc-white'],['sc-muted','sc-surface'],['sc-teal-ink','sc-white'],['sc-teal-ink','sc-surface'],['sc-teal','sc-white'],...['success','warning','danger','info','neutral'].map(t=>['sc-'+t+'-fg','sc-'+t+'-bg'])];
 for(const [a,b] of textPairs)assert.ok(ratio(a,b)>=4.5,a+' / '+b+' '+ratio(a,b));
 for(const [a,b] of [['sc-control-border','sc-white'],['sc-control-border','sc-surface'],['sc-focus','sc-white'],['sc-focus','sc-surface'],['sc-aqua','sc-navy']])assert.ok(ratio(a,b)>=3,a+' / '+b+' '+ratio(a,b));
});
test('Tabella trasformata in schede: ruoli delle righe, gruppi e celle conservati nel markup',()=>{
 const {DataTable}=load('components/ui/DataTable.tsx',{'next/link':{},'./Primitives':{}});
 const html=renderToStaticMarkup(h(DataTable,{label:'Archivio',mobileCards:true},
  h('thead',null,h('tr',null,h('th',null,'Nome'))),
  h('tbody',null,h(Fragment,null,h('tr',null,h('th',{scope:'row'},'Socio'),h('td',{'data-label':'Note'},'Esempio'))))));
 assert.match(html,/<table role="table" aria-label="Archivio">/);
 assert.match(html,/<thead role="rowgroup">/);assert.match(html,/<tbody role="rowgroup">/);
 assert.match(html,/<th role="columnheader">Nome/);assert.match(html,/<th scope="row" role="rowheader">/);
 assert.match(html,/<td data-label="Note" role="cell">/);
});
test('Agenda predefinita e viste esplicite: nessuna scelta dell’utente sovrascritta',()=>{
 const calendar=load('lib/calendar-tools.ts',{'./course-tools':load('lib/course-tools.ts')});
 assert.equal(calendar.calendarView(),'agenda');assert.equal(calendar.calendarView(''),'agenda');
 for(const view of ['giorno','settimana','mese','agenda'])assert.equal(calendar.calendarView(view),view);
 assert.equal(calendar.calendarView('sconosciuta'),'settimana');
});
test('Viewport dinamica e focus: zoom non disabilitato, aggiornamento e cleanup, layer finale',()=>{
 const layout=read('app/layout.tsx'),shell=read('components/AppShell.tsx'),css=read('app/responsive-accessibility.css');
 assert.doesNotMatch(layout,/maximumScale|userScalable/);assert.match(layout,/viewportFit:'cover'/);
 assert.match(shell,/window\.visualViewport/);assert.match(shell,/Math\.abs\(viewport\.scale-1\)/);
 assert.match(shell,/removeEventListener\('resize',update\)/);
 assert.match(shell,/getElementById\('sc-main'\)\?\.focus/);
 assert.match(css,/body:has\(dialog\[open\]\)/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/--sc-visual-height/);assert.doesNotMatch(css,/html\s*\{[^}]*overflow-x\s*:\s*hidden/);
 assert.ok(layout.indexOf("import './responsive-accessibility.css'")>layout.indexOf("import './personal-ui.css'"));
});
