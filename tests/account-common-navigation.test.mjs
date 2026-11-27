import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('logout is rendered outside the desktop-only nav for any signed-in account',()=>{
 const header=read('components/SiteHeader.tsx');
 assert.match(header,/<\/nav>\s*\{access\.signedIn&&<LogoutButton direct\/>\}/);
 assert.match(header,/form action=\{logoutAction\} data-dirty-ignore/);
 assert.match(read('app/navigation.css'),/\.sc-direct-logout\s*\{flex:none/);
 assert.match(read('components/AppShell.tsx'),/access\.signedIn&&<LogoutButton\/>/);
});
test('common account actions do not require administrative privileges',()=>{
 const header=read('components/SiteHeader.tsx');
 assert.match(header,/href=\{homeFor\(access\)\}/);
 assert.match(header,/href="\/area-personale\/profilo"/);
 assert.match(header,/href="\/nuova-password"/);
 assert.match(read('app/nuova-password/page.tsx'),/await requireUser\(\)/);
 assert.match(read('app/area-personale/profilo/page.tsx'),/await requireUser\(\)/);
});
test('notifications are reachable even without a linked person',()=>{
 for(const file of ['components/SiteHeader.tsx','components/AppShell.tsx']){
  assert.match(read(file),/access\.enabled&&<Link[^\n]*href=\{access\.personal\?'\/area-personale\?tab=notifiche':'\/notifiche'\}/);
 }
 const access=read('lib/navigation-access.ts');
 assert.match(access,/const \[roles,member,request,links,alerts,owners\]=await Promise\.all\(/);
 assert.match(access,/supabase\.from\('notifiche'\)\.select\('id',\{head:true,count:'exact'\}\)\.eq\('utente_id',user\.id\)\.is\('letta_il',null\)/);
 assert.match(access,/unread:alerts&&!alerts\.error\?alerts\.count:null/);
 const page=read('app/notifiche/page.tsx'),action=read('app/notifiche/actions.ts');
 for(const src of [page,action]){
  assert.match(src,/await requireUser\(\)/);
  assert.match(src,/\.eq\('utente_id',user\.id\)/);
  assert.doesNotMatch(src,/service_role|requireAdmin|requireStaff/);
 }
 assert.match(action,/if\(ownershipError\|\|!owned\)redirect/);
 assert.match(action,/segna_notifica_letta/);
});
