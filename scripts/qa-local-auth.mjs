// Local email sink only. Never opens a non-loopback verification URL.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect} from '@playwright/test';

export async function runAuth({app,admin}){
 assert.equal(process.env.QA_ISOLATED_ENV,'true');
 assert.ok(['127.0.0.1','localhost'].includes(app.hostname));
 const mail='http://127.0.0.1:54324',seen=new Set();
 const email='signup-'+randomUUID()+'@example.invalid';
 const oldPassword=' '+randomBytes(20).toString('hex')+' ',newPassword=' '+randomBytes(20).toString('hex')+' ';
 async function emailLink(kind){
  for(let n=0;n<40;n++){
   const list=await fetch(mail+'/api/v1/messages');
   assert.ok(list.ok,'Local email sink unavailable');
   const data=await list.json();
   for(const message of data.messages??[]){
    if(seen.has(message.ID)||!message.To?.some(t=>t.Address.toLowerCase()===email))continue;
    const full=await fetch(mail+'/api/v1/message/'+encodeURIComponent(message.ID));
    assert.ok(full.ok,'Local email message unavailable');
    const body=await full.json();
    const links=[...(body.HTML??'').matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1].replaceAll('&amp;','&'));
    for(const href of links){
     let url;try{url=new URL(href);}catch{continue;}
     if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321'||url.pathname!=='/auth/v1/verify'||url.searchParams.get('type')!==kind)continue;
     const redirect=url.searchParams.get('redirect_to');
     if(redirect)assert.equal(new URL(redirect).origin,app.origin,'Verification redirect must stay in local application');
     seen.add(message.ID);return url.href;
    }
   }
   await delay(500);
  }
  throw Error('Messaggio di '+kind+' non trovato nel sink locale');
 }
 const browser=await chromium.launch();
 const context=await browser.newContext({baseURL:app.href,viewport:{width:1280,height:800}});
 try{
  const page=await context.newPage();
  const logout=async()=>{
   await page.locator('.sc-account-menu summary').click();
   await page.locator('.sc-account-menu').getByRole('button',{name:'Esci'}).click();
   await expect(page).toHaveURL(/\/accedi\?msg=uscita/);
  };
  const follow=async(kind,path)=>{
   const link=await emailLink(kind);
   try{await page.goto(link);await expect(page).toHaveURL(url=>url.origin===app.origin&&url.pathname===path,{timeout:15000});}
   catch{throw Error('Callback locale '+kind+' non ha raggiunto '+path);}
  };
  await page.goto('/registrati');
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill(oldPassword);
  await page.locator('input[name=confirm]').fill(oldPassword);
  await page.locator('input[name=presa_visione]').check();
  await expect(page.locator('input[name=immagini]')).not.toBeChecked();
  await page.getByRole('button',{name:'Crea account'}).click();
  await expect(page).toHaveURL(/\/registrati\?ok=verifica/);
  const users=await admin.auth.admin.listUsers({page:1,perPage:100});
  assert.ifError(users.error);const user=users.data.users.find(u=>u.email===email);
  assert.ok(user&&!user.email_confirmed_at);
  await follow('signup','/richiesta/nuova');
  const verified=await admin.auth.admin.getUserById(user.id);
  assert.ifError(verified.error);assert.ok(verified.data.user.email_confirmed_at);
  const declarations=await admin.from('scelte_iscrizione').select('tipo,scelta,versione,origine').eq('utente_id',user.id).order('tipo');
  assert.ifError(declarations.error);
  assert.deepEqual(declarations.data,[{tipo:'immagini',scelta:false,versione:'TEST-COLLAUDO-1',origine:'registrazione'},{tipo:'privacy',scelta:true,versione:'TEST-COLLAUDO-1',origine:'registrazione'}]);
  console.log('OK UI registrazione, mail locale, verifica email e rifiuto foto facoltativo');
  const fields={nome:'Collaudo',cognome:'Richiedente',data_nascita:'2000-01-01',luogo_nascita:'Modena',provincia_nascita:'MO',stato_nascita:'Italia',indirizzo:'Via sintetica 1',cap:'41100',comune:'Modena',telefono:'0000000000'};
  for(const [key,value] of Object.entries(fields))await page.locator('input[name='+key+']').fill(value);
  await page.locator('input[name=flag_statuto]').check();await page.locator('input[name=flag_privacy]').check();
  await page.getByRole('button',{name:'Salva bozza'}).click();
  await expect(page).toHaveURL(/msg=salvata/);
  const read=async()=>{const r=await admin.from('richieste').select('stato,versione_statuto,versione_privacy,immagini_scelta').eq('utente_id',user.id).single();assert.ifError(r.error);return r.data;};
  assert.deepEqual(await read(),{stato:'bozza',versione_statuto:'TEST-COLLAUDO-1',versione_privacy:'TEST-COLLAUDO-1',immagini_scelta:false});
  await page.getByRole('link',{name:'Continua compilazione'}).click();
  await expect(page.locator('input[name=nome]')).toHaveValue('Collaudo');
  await page.getByRole('button',{name:'Controlla e invia'}).click();
  await page.getByRole('dialog',{name:'Riepilogo della domanda'}).getByRole('button',{name:'Conferma e invia alla segreteria'}).click();
  await expect(page).toHaveURL(/msg=inviata/);
  assert.equal((await read()).stato,'inviata');
  console.log('OK UI bozza persistente, riepilogo e invio pratica esclusivamente TEST');
  await logout();
  await page.goto('/richiesta/stato');await expect(page).toHaveURL(/\/accedi\?msg=account/);
  await page.locator('input[name=email]').first().fill(email);
  await page.locator('input[name=password]').fill(oldPassword);
  await page.getByRole('button',{name:'Accedi',exact:true}).click();
  await expect(page).toHaveURL(/\/richiesta\/stato$/);await logout();
  await page.getByText('Password dimenticata?',{exact:true}).click();
  const recovery=page.locator('details').filter({hasText:'Password dimenticata?'});
  await recovery.locator('input[name=email]').fill(email);
  await recovery.getByRole('button',{name:'Invia link di recupero'}).click();
  await expect(recovery.getByText('Se l’account esiste e la richiesta è stata accettata',{exact:false})).toBeVisible();
  await follow('recovery','/nuova-password');
  await page.locator('input[name=password]').fill(newPassword);
  await page.locator('input[name=confirm]').fill(newPassword);
  await page.getByRole('button',{name:'Salva password'}).click();
  await expect(page).toHaveURL(/\/richiesta\/stato$/);await logout();
  await page.locator('input[name=email]').first().fill(email);
  await page.locator('input[name=password]').fill(oldPassword);
  await page.getByRole('button',{name:'Accedi',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Email o password non corrette'})).toBeVisible();
  await page.locator('input[name=password]').fill(newPassword);
  await page.getByRole('button',{name:'Accedi',exact:true}).click();
  await expect(page).toHaveURL(/\/richiesta\/stato$/);await logout();
  console.log('OK UI login/logout, recupero via email locale, password con spazi e vecchia password rifiutata');
 }finally{await context.close();await browser.close();}
}
