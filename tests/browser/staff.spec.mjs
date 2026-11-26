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
for(const path of [
  '/gestionale','/gestionale/soci','/gestionale/richieste','/gestionale/corsi',
  '/gestionale/calendario-visivo','/gestionale/moduli/piscine','/gestione-eventi',
  '/organi-sociali','/documenti','/gestionale/incassi',
  '/gestionale/moduli/contabilita','/gestionale/moduli/attrezzature',
  '/gestionale/moduli/revisioni','/gestionale/utenti','/gestionale/report'
]){
  test('Responsive area amministrativa: '+path,async({page})=>{
    await page.goto(path);
    await expect(page).toHaveURL(url=>url.pathname===path);
    await expect(page.locator('h1').first()).toBeVisible();
    for(const viewport of [
      {width:320,height:568},{width:375,height:667},{width:390,height:844},
      {width:430,height:932},{width:844,height:390},{width:768,height:1024},
      {width:1024,height:768},{width:1280,height:800},{width:1440,height:900},
      {width:1920,height:1080}
    ]){
      await page.setViewportSize(viewport);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth),path+' '+viewport.width+'×'+viewport.height).toBeLessThanOrEqual(viewport.width+1);
    }
  });
}
