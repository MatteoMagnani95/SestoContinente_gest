import {test,expect} from '@playwright/test';
// Each storage state must be a synthetic, single-role account on isolated local Supabase.
const routes={
 secretary:['/gestionale','/gestionale/soci','/gestionale/corsi','/gestionale/calendario-visivo','/gestionale/incassi','/documenti','/organi-sociali'],
 member:['/area-personale','/area-personale?tab=notifiche','/area-personale/corsi','/area-personale/profilo','/area-personale/certificato','/area-soci','/area-soci?tab=storico','/documenti'],
 instructor:['/istruttore','/istruttore?tab=presenze','/gestione-eventi','/documenti'],
 board:['/organi-sociali','/organi-sociali/archivio','/organi-sociali/riepilogo','/documenti'],
 applicant:['/richiesta/stato','/richiesta/nuova','/area-personale/profilo']
};
test('Viste e navigazione per ruolo sintetico, solo lettura',async({page},info)=>{
 const role=info.project.metadata.role,paths=routes[role];
 expect(paths).toBeTruthy();
 for(const path of paths){
  await page.goto(path);
  const target=new URL(path,'http://localhost');
  await expect(page).toHaveURL(url=>url.pathname===target.pathname);
  await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
  for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1280,height:800}]){
   await page.setViewportSize(size);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),role+' '+path+' '+size.width).toBeLessThanOrEqual(size.width+1);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.sc-mobile-trigger').click();
  const menu=page.getByRole('dialog',{name:'Menu'});
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href="/gestionale/utenti"]')).toHaveCount(0);
  if(role!=='secretary')await expect(menu.locator('a[href="/gestionale/soci"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
 }
});
test('Ruolo limitato: accesso diretto amministrativo negato',async({page},info)=>{
 await page.goto('/gestionale/utenti');
 await expect(page).toHaveURL(info.project.metadata.role==='secretary'?/\/gestionale\?msg=permessi/:/\/\?msg=permessi/);
});

test('Ruolo limitato: accessi incrociati e risorse amministrative negati',async({page},info)=>{
 const role=info.project.metadata.role;
 const paths=role==='secretary'?['/gestionale/moduli/contabilita']:
  ['/gestionale','/gestionale/incassi','/gestionale/moduli/contabilita',...(role==='board'?[]:['/organi-sociali']),...(role==='instructor'?[]:['/istruttore'])];
 for(const path of paths){
  await page.goto(path);
  // Un login scaduto non è un successo del controllo di ruolo.
  await expect(page).toHaveURL(url=>url.pathname!==path&&url.pathname!=='/accedi'&&url.searchParams.get('msg')==='permessi');
 }
});

test('CdA: il consigliere senza ruolo di segreteria non può aggiungere componenti',async({page},info)=>{
 test.skip(info.project.metadata.role!=='board','Controllo riservato al ruolo consigliere sintetico');
 await page.goto('/organi-sociali?tab=componenti');
 await expect(page.getByRole('heading',{name:'Componenti CdA'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Aggiungi componente'})).toHaveCount(0);
});
