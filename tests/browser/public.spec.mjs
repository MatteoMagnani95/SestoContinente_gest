import {test,expect} from '@playwright/test';

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
