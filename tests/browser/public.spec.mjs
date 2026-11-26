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
  '/gestionale/corsi/'+syntheticId+'/stampe'
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
