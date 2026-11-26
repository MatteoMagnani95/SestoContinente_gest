import {test,expect} from '@playwright/test';

test('Notifiche dal menu amministrativo mobile',async({page})=>{
  await page.goto('/gestionale');
  await expect(page).toHaveURL(/\/gestionale$/);
  await page.locator('.sc-mobile-trigger').click();
  const menu=page.getByRole('dialog',{name:'Menu'});
  await menu.getByRole('link',{name:/Notifiche \(/}).click();
  await expect(page).toHaveURL(/\/area-personale\?tab=notifiche$/);
  await expect(page.getByRole('heading',{name:'Notifiche da leggere'})).toBeVisible();
  await expect(menu).toBeHidden();
});
test('Inventario, pannello a schermo intero e annullamento senza perdere la bozza',async({page})=>{
  await page.goto('/gestionale/moduli/attrezzature');
  const add=page.getByRole('button',{name:'Aggiungi attrezzatura'});
  await add.click();
  const dialog=page.getByRole('dialog',{name:'Aggiungi attrezzatura'});
  const code=dialog.getByLabel('Codice univoco');
  await expect(code).toBeVisible();
  expect((await dialog.boundingBox()).width).toBe(390);
  await code.fill('COLLAUDO-SOLO-BOZZA');
  await dialog.getByRole('button',{name:'Chiudi pannello'}).click();
  await page.getByRole('button',{name:'Continua a modificare'}).click();
  await expect(code).toHaveValue('COLLAUDO-SOLO-BOZZA');
  await dialog.getByRole('button',{name:'Chiudi pannello'}).click();
  await page.getByRole('button',{name:'Esci senza salvare'}).click();
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
  await add.click();
  await expect(page.getByLabel('Codice univoco')).toHaveValue('');
});

// QA_STAFF_STATE deve appartenere a un amministratore dell'ambiente locale isolato.
// Tutte le route seguenti sono di sola consultazione; nessun record è scritto.
const modules=['anagrafiche','adesioni','tesseramenti','stagioni','corsi','edizioni','iscrizioni','istruttori','qualifiche','brevetti','certificati','programmi','versioni','piscine','corsie','calendario','prenotazioni','presenze','attrezzature','revisioni','consegne','quote','addebiti','pagamenti','listino','contabilita','comunicazioni','promemoria'];
const fixtures=JSON.parse(process.env.QA_FIXTURE_IDS||'{}');
const dynamic=[
 ['person','/gestionale/soci/'],['edition','/gestionale/corsi/'],['lesson','/gestionale/calendario-visivo/'],
 ['event','/gestione-eventi/'],['equipment','/gestionale/attrezzature/'],['request','/gestionale/richieste/'],
 ['payment','/gestionale/incassi/'],['account','/gestionale/utenti/'],['minutes','/organi-sociali/archivio/']
].flatMap(([key,prefix])=>{
 const id=fixtures[key];if(!id)return [];
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw Error('Fixture non valida: '+key);
 return [prefix+id];
});
const routes=[
 '/gestionale','/gestionale/soci','/gestionale/richieste','/gestionale/corsi','/gestionale/corsi/nuovo',
 '/gestionale/calendario-visivo','/gestione-eventi','/organi-sociali','/organi-sociali/archivio',
 '/organi-sociali/riepilogo','/documenti','/gestionale/incassi','/gestionale/archivio-incassi',
 '/gestionale/economia','/gestionale/utenti','/gestionale/report','/gestionale/amministrazione-dati',
 '/gestionale/importazione','/gestionale/programmi-didattici',
 ...modules.map(m=>'/gestionale/moduli/'+m),...dynamic
];
for(const path of routes){
 test('Responsive area amministrativa: '+path,async({page})=>{
  const canonical=path==='/gestionale/moduli/pagamenti'?'/gestionale/incassi':path;
  await page.goto(path);
  await expect(page).toHaveURL(url=>url.pathname===canonical);
  await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
  for(const viewport of [
   {width:320,height:568},{width:375,height:667},{width:390,height:844},
   {width:430,height:932},{width:844,height:390},{width:768,height:1024},
   {width:1024,height:768},{width:1280,height:800},{width:1440,height:900},
   {width:1920,height:1080}
  ]){
   await page.setViewportSize(viewport);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),path+' '+viewport.width+'×'+viewport.height).toBeLessThanOrEqual(viewport.width+1);
   const sidebar=page.locator('.sc-staff-sidebar');
   if(viewport.width<=1000){await expect(sidebar).toBeHidden();await expect(page.locator('.sc-mobile-trigger')).toBeVisible();}
   else await expect(sidebar).toBeVisible();
  }
 });
}

test('Filtri URL duplicati e messaggi sconosciuti non interrompono gli archivi',async({page})=>{
 for(const path of ['/gestionale/soci','/gestionale/corsi','/gestionale/richieste','/gestionale/utenti','/gestionale/moduli/anagrafiche','/documenti','/organi-sociali/archivio']){
  const response=await page.goto(path+'?q=uno&q=due&msg=__proto__');
  expect(response.status(),path).toBe(200);
  await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
 }
});
test('Paginazione obsoleta offre il ritorno immediato alla prima pagina',async({page})=>{
 await page.goto('/gestionale/soci?p=9999');
 const recovery=page.getByRole('navigation',{name:'Paginazione'}).getByRole('link',{name:'Prima pagina'});
 await expect(recovery).toBeVisible();
 await recovery.click();
 await expect(page).toHaveURL(url=>url.pathname==='/gestionale/soci'&&url.searchParams.get('p')==='1');
 await expect(page.getByRole('table',{name:'Adesioni di soci e allievi'})).toBeVisible();
});
