import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Il titolo del menu coincide con il ruolo amministratore realmente verificato',()=>{
 const layout=read('app/gestionale/layout.tsx');
 assert.match(layout,/eq\('utente_id',user\.id\)\.eq\('ruolo','amministratore'\)/);
 assert.match(layout,/const isAdmin=Boolean\(admin\)/);
 assert.match(layout,/<h2>\{isAdmin\?'Amministrazione':'Segreteria'\}<\/h2>/);
 assert.match(layout,/<StaffNav isAdmin=\{isAdmin\}/);
 assert.doesNotMatch(layout,/<h2>Segreteria<\/h2>/);
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
