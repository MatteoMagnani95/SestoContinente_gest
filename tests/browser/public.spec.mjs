import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createElement as h,Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),ts=require('typescript');
const readApp=file=>readFileSync(new URL('../../app/'+file,import.meta.url),'utf8');
const css=[...readApp('layout.tsx').matchAll(/import '\.\/([^']+\.css)'/g)].map(m=>readApp(m[1])).join('\n');
const tableSource=readFileSync(new URL('../../components/ui/DataTable.tsx',import.meta.url),'utf8');
const tableJs=ts.transpileModule(tableSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tableExports={};
new Function('exports','require',tableJs)(tableExports,id=>id==='next/link'||id==='./Primitives'?{}:require(id));
const {DataTable}=tableExports;


test('La home, l’accesso e la registrazione rientrano nella viewport',async({page})=>{
  for(const path of ['/','/accedi','/registrati']){
    const response=await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
      await page.setViewportSize({width,height:width>=1024?768:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth),path+' a '+width).toBeLessThanOrEqual(width+1);
    }
  }
});
test('Il menu mobile ripristina il focus e si chiude dopo la navigazione',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.goto('/');
  const trigger=page.locator('.sc-mobile-trigger');
  const menu=page.getByRole('dialog',{name:'Menu'});
  await expect(menu).toBeHidden();
  await trigger.click();
  await expect(menu.getByRole('button',{name:'Chiudi menu'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole('link',{name:'Accedi'}).click();
  await expect(page).toHaveURL(/\/accedi$/);
  await expect(menu).toBeHidden();
});
test('Il collegamento riservato richiede accesso e il campo password conserva gli spazi',async({page})=>{
  await page.goto('/gestionale');
  await expect(page).toHaveURL(/\/accedi\?msg=account/);
  const input=page.locator('input[name="password"]');
  await input.fill(' password di prova ');
  const toggle=page.locator('button[aria-controls]').filter({hasText:/Mostra/i});
  await toggle.click();
  await expect(input).toHaveAttribute('type','text');
  await expect(input).toHaveValue(' password di prova ');
});

const syntheticId='00000000-0000-4000-8000-000000000001';
for(const path of [
  '/gestionale/soci','/gestionale/soci/'+syntheticId,
  '/gestionale/corsi/'+syntheticId,'/gestionale/incassi',
  '/gestionale/calendario-visivo','/gestionale/utenti',
  '/area-personale','/area-personale/certificato','/area-soci',
  '/istruttore','/gestione-eventi','/organi-sociali','/documenti',
  '/richiesta/nuova','/richiesta/stato','/nuova-password'
]){
  test('Accesso anonimo negato: '+path,async({page})=>{
    await page.goto(path);
    await expect(page).toHaveURL(/\/accedi\?msg=account(?:&|$)/);
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
}

for(const path of [
  '/documenti/'+syntheticId,
  '/documenti/'+syntheticId+'?download=1',
  '/gestionale/esporta/contabilita',
  '/gestionale/corsi/'+syntheticId+'/stampe?tipo=programma'
]){
  test('Endpoint riservato senza sessione: '+path,async({request,baseURL})=>{
    const response=await request.get(path,{maxRedirects:0});
    expect([303,307,308]).toContain(response.status());
    const location=new URL(response.headers().location,baseURL);
    expect(location.origin).toBe(new URL(baseURL).origin);
    expect(location.pathname).toBe('/accedi');
    expect(location.searchParams.get('msg')).toBe('account');
  });
}

test('Telefono in verticale e orizzontale: pagine pubbliche, controlli e assenza di overflow',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,isMobile:true,hasTouch:true,viewport:{width:390,height:844},deviceScaleFactor:2});
 try{
  const page=await context.newPage();
  for(const path of ['/','/accedi','/registrati']){
   await page.goto(path);
   await expect(page.locator('h1')).toBeVisible();
   for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(size);
    const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,controls:[...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter(e=>e.getBoundingClientRect().width>0).map(e=>Number.parseFloat(getComputedStyle(e).fontSize))}));
    expect(dimensions.document,path+' '+JSON.stringify(size)).toBeLessThanOrEqual(dimensions.viewport+1);
    expect(dimensions.controls.every(n=>n>=16)).toBe(true);
    const trigger=page.locator('.sc-mobile-trigger');
    expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);
   }
  }
 }finally{await context.close();}
});

test('Salto al contenuto e focus della navigazione da tastiera',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/accedi');
 const skip=page.getByRole('link',{name:'Vai al contenuto'}),main=page.locator('#sc-main');
 await skip.focus();await page.keyboard.press('Enter');await expect(main).toBeFocused();
 await expect(main).toHaveCSS('outline-style','solid');
 const trigger=page.locator('.sc-mobile-trigger');await trigger.focus();await page.keyboard.press('Enter');
 const menu=page.getByRole('dialog',{name:'Menu'});await expect(menu).toBeVisible();
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await menu.evaluate(e=>e.contains(document.activeElement)||document.activeElement===document.body)).toBe(true);}
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});

// Fixture del solo layout con il componente DataTable reale renderizzato a HTML.
// Non è una pagina amministrativa autenticata e non usa Supabase.
function responsiveFixture(){
 const content=h(DataTable,{label:'Archivio sintetico',mobileCards:true},
  h('thead',null,h('tr',null,h('th',null,'Nominativo'),h('th',null,'Azioni'))),
  h('tbody',null,h(Fragment,null,h('tr',null,
   h('td',{'data-label':'Nominativo'},h('strong',null,'Associazione '+ 'L'.repeat(90)),h('p',null,'Informazioni aggiuntive nella stessa cella')),
   h('td',{'data-label':'Azioni'},h('div',{className:'sc-row-actions'},h('a',{href:'#detail',className:'sc-button sc-button-secondary'},'Apri scheda'),h('button',{className:'sc-button'},'Modifica dati')))))));
 return '<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>'+css+'</style></head><body><main id="sc-main" class="sc-main sc-main-staff"><div class="container staff-layout sc-staff-layout"><aside class="staff-sidebar sc-staff-sidebar">Menu di prova</aside><div class="staff-content sc-staff-content"><h1>Archivio e modulo di prova</h1>'+renderToStaticMarkup(content)+'<div class="sc-data-table table-panel" tabindex="0" role="region" aria-label="Tabella larga"><table style="min-width:1100px"><tbody><tr><td>Prima colonna</td><td>Ultima colonna</td></tr></tbody></table></div><div class="sc-card sc-calendar sc-calendar-settimana"><section class="sc-calendar-day"><div class="sc-calendar-day-head"><a href="#detail">Lunedì 30 novembre</a><a href="#detail" class="sc-calendar-add" aria-label="Nuova lezione">+</a></div><a href="#detail" class="sc-calendar-event">Lezione di prova</a></section></div></div></div></main><dialog class="sc-editor-dialog sc-editor-drawer" aria-label="Editor sintetico"><div class="sc-editor-inner"><header class="sc-editor-header"><h2>Modifica il record</h2><button class="sc-icon-button" autofocus>Chiudi</button></header><div class="sc-editor-body"><form><fieldset class="edit-fields"><div class="form-grid"><label>Data<input type="date"></label><label>Ora<input type="time"></label><label>Scelta<select><option>'+ 'Voce molto lunga '.repeat(12)+'</option></select></label></div>'+Array.from({length:12},(_,i)=>'<label>Campo '+i+'<input value="Test"></label>').join('')+'<button type="button" class="button" id="confirm">Conferma</button></fieldset></form></div></div></dialog></body></html>';
}
test('Componenti condivisi: schede tabellari semantiche, tabella larga locale e calendario a 10 viewport',async({page})=>{
 await page.setContent(responsiveFixture());
 const table=page.getByRole('table',{name:'Archivio sintetico'});
 await expect(table.getByRole('columnheader',{name:'Nominativo'})).toHaveCount(1);
 await expect(table.getByRole('cell')).toHaveCount(2);
 for(const size of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:600,height:800},{width:768,height:1024},{width:844,height:390},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080}]){
  await page.setViewportSize(size);
  const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  expect(sizes.document,JSON.stringify(size)).toBeLessThanOrEqual(sizes.viewport+1);
  const cell=table.locator('td').first();
  await expect(cell).toHaveCSS('display',size.width<=600?'block':'table-cell');
  const box=await table.getByRole('link',{name:'Apri scheda'}).boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  if(size.width<=600){const wide=page.getByRole('region',{name:'Tabella larga'});expect(await wide.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);}
 }
});
test('Drawer condiviso: fullscreen su telefono e tablet, scroll verticale e conferma raggiungibile',async({page})=>{
 for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]){
  await page.setViewportSize(size);await page.setContent(responsiveFixture());
  const dialog=page.getByRole('dialog',{name:'Editor sintetico',includeHidden:true});
  await dialog.evaluate(e=>e.showModal());await expect(dialog).toBeVisible();
  expect(await page.locator('body').evaluate(e=>getComputedStyle(e).overflowY)).toBe('hidden');
  const rect=await dialog.boundingBox();
  expect(rect.width).toBeLessThanOrEqual(size.width+1);
  if(size.width<=768)expect(rect.width).toBe(size.width);
  expect(rect.height).toBeLessThanOrEqual(size.height+1);
  const date=dialog.locator('input[type=date]'),time=dialog.locator('input[type=time]');
  await date.fill('2026-11-26');await time.fill('10:30');await expect(date).toHaveValue('2026-11-26');
  await expect(date).toHaveCSS('font-size','16px');
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const button=dialog.getByRole('button',{name:'Conferma'});await button.scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await dialog.evaluate(e=>e.close());
 }
});

test('Viewport visibile ridotta: pannello e pulsante finale restano raggiungibili',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.setContent(responsiveFixture());
 await page.evaluate(()=>{document.documentElement.style.setProperty('--sc-visual-height','390px');document.documentElement.style.setProperty('--sc-visual-top','30px');document.documentElement.setAttribute('data-sc-keyboard','');});
 const dialog=page.getByRole('dialog',{name:'Editor sintetico',includeHidden:true});
 await dialog.evaluate(e=>e.showModal());const rect=await dialog.boundingBox();
 expect(rect.height).toBeLessThanOrEqual(391);
 expect(rect.y).toBeGreaterThanOrEqual(29);
 expect(rect.y+rect.height).toBeLessThanOrEqual(421);
 const button=dialog.getByRole('button',{name:'Conferma'});await button.scrollIntoViewIfNeeded();
 const final=await button.boundingBox();
 expect(final.y+final.height).toBeLessThanOrEqual(421);
 await dialog.evaluate(e=>e.close());
});

test('Autenticazione: nomi accessibili distinti, etichette e reflow equivalente a 200/400%',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/accedi');
 await expect(page.getByRole('textbox',{name:'Email',exact:true})).toBeVisible();
 const password=page.getByLabel('Password',{exact:true}),toggle=page.getByRole('button',{name:'Mostra password',exact:true});
 await password.fill(' Password di prova ');
 await toggle.focus();await page.keyboard.press('Enter');
 await expect(password).toHaveAttribute('type','text');
 await expect(page.getByRole('button',{name:'Nascondi password',exact:true})).toBeFocused();
 await expect(password).toHaveValue(' Password di prova ');
 await page.keyboard.press('Enter');await expect(password).toHaveAttribute('type','password');
 for(const path of ['/','/accedi','/registrati']){
  await page.goto(path);
  // 1280/2 e 1280/4 CSS px: equivalente di reflow, non zoom browser fisico.
  for(const width of [640,320]){
   await page.setViewportSize({width,height:800});
   const geometry=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
   expect(geometry.s,path+' '+width).toBeLessThanOrEqual(geometry.w+1);
   await expect(page.getByRole('heading',{level:1})).toBeVisible();
  }
 }
 await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Conferma password',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Mostra password',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Mostra conferma password',exact:true})).toHaveCount(1);
});

test('Sicurezza HTTP: header delle pagine e risposte riservate non memorizzabili',async({request})=>{
 for(const path of ['/','/accedi','/registrati','/area-personale','/documenti/'+syntheticId,'/organi-sociali/documento/'+syntheticId,'/gestionale/importazione/modello?tipo=soci']){
  const response=await request.get(path,{maxRedirects:0});
  const headers=response.headers();
  expect(headers['x-content-type-options'],path).toBe('nosniff');
  expect(headers['x-frame-options'],path).toBe('DENY');
  expect(headers['referrer-policy'],path).toBe('no-referrer');
  expect(headers['content-security-policy'],path).toContain("frame-ancestors 'none'");
  expect(headers['cache-control'],path).toContain('no-store');
  expect(headers['x-powered-by'],path).toBeUndefined();
 }
});
test('Endpoint riservati aggiuntivi e callback senza codice non divulgano dati né redirigono fuori sito',async({request,baseURL})=>{
 for(const path of ['/organi-sociali/documento/'+syntheticId+'?tipo=pdf','/organi-sociali/documento/'+syntheticId+'?tipo=anteprima','/gestionale/importazione/modello?tipo=soci','/gestionale/importazione/modello?tipo=corsi']){
  const response=await request.get(path,{maxRedirects:0});
  expect([303,307,308]).toContain(response.status());
  const location=new URL(response.headers().location,baseURL);
  expect(location.origin).toBe(new URL(baseURL).origin);
  expect(location.pathname).toBe('/accedi');
 }
 for(const target of ['https://example.invalid','//example.invalid','/\\example.invalid','/nuova-password']){
  const response=await request.get('/auth/callback?next='+encodeURIComponent(target),{maxRedirects:0});
  expect([303,307,308]).toContain(response.status());
  const location=new URL(response.headers().location,baseURL);
  expect(location.origin).toBe(new URL(baseURL).origin);
  expect(location.pathname).toBe('/accedi');
  expect(location.searchParams.get('msg')).toBe(target==='/nuova-password'?'recupero_scaduto':'verifica');
 }
});
