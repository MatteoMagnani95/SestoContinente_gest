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
