import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Il titolo del menu coincide con il ruolo amministratore realmente verificato',()=>{
 const layout=read('app/gestionale/layout.tsx'),access=read('lib/navigation-access.ts'),shell=read('components/AppShell.tsx');
 assert.match(layout,/await requireStaff\(\)/);
 assert.match(access,/readRolesForRender\(supabase,user.id\)/);
 assert.match(read('lib/security.ts'),/readRolesForRender=cache\(async[\s\S]*?\.from\('ruoli_utente'\)\.select\('ruolo'\)\.eq\('utente_id',userId\)/);
 assert.match(access,/admin=allowed\.has\('amministratore'\)/);
 assert.match(shell,/access\.admin\?'Amministrazione':'Segreteria'/);
 assert.match(shell,/<StaffNav isAdmin=\{access\.admin\}/);
});

test('Una sovrapposizione PostgreSQL 23P01 viene distinta dalle altre anomalie',()=>{
 const actions=read('app/module-actions.ts');
 assert.match(actions,/key==='prenotazioni'&&error\.code==='23P01'/);
 assert.match(actions,/new URLSearchParams\(\{msg:'corsia_occupata'\}\)/);
 assert.match(actions,/\.from\('corsie'\)\.select\('numero'\)/);
 assert.match(actions,/params\.set\('inizio',changes\.inizio\)/);
 assert.match(actions,/params\.set\('fine',changes\.fine\)/);
 assert.match(actions,/key==='prenotazioni'&&error\.code==='23505'/);
 assert.match(actions,/await requireStaff\(\)/);
});

test('Il messaggio mostra la corsia e gli orari in italiano senza errori SQL',()=>{
 const page=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(page,/bookingConflictText\(corsia,inizio,fine\)/);
 assert.match(page,/Numero|numero=corsia/);
 assert.match(page,/formatRome\(value\)/);
 assert.match(page,/Scegli un’altra corsia o modifica l’orario/);
 assert.match(page,/msg==='corsia_occupata'&&modulo==='prenotazioni'/);
 assert.match(page,/role="status"/);
 assert.doesNotMatch(page,/{error\.details}|{error\.message}/);
});
