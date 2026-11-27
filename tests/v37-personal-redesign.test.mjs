import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
test('Area personale e istruttore: selezione esplicita solo negli ID consentiti',()=>{
 const h=load('lib/personal-ui.ts');
 assert.equal(h.selectedTab(h.personalTabs,'quote'),'quote');
 assert.equal(h.selectedTab(h.instructorTabs,'__proto__'),'corsi');
 assert.equal(h.authorizedSelection(['a','b'],'c'),null);
 assert.equal(h.authorizedSelection(['a','b'],'b'),'b');
 assert.equal(h.authorizedSelection([]),null);
 assert.equal(h.attendanceValue(''),null);
 assert.equal(h.attendanceValue('no'),'no');
});
test('Area personale: dati collegati all’account e senza note interne',()=>{
 const p=read('app/area-personale/page.tsx'),c=read('app/area-personale/corsi/page.tsx');
 assert.match(p,/eq\('utente_id',user.id\)/);assert.match(p,/from\('saldi_corsi'\)/);assert.match(p,/from\('tesseramenti'\)/);
 assert.match(c,/myEnrollments\?\.some\(e=>e.persona_id===p.persona_id&&e.edizione_id===l.edizione_id\)/);
 assert.doesNotMatch(c,/nota_didattica/);assert.doesNotMatch(p,/note_amministrative/);
 assert.doesNotMatch(read('app/area-personale/certificato/page.tsx'),/<Cronologia/);
 assert.match(read('components/SiteHeader.tsx'),/\/area-personale\?tab=notifiche/);
});
test('Registro istruttore: verifica della singola lezione e iscrizione prima della scrittura',async()=>{
 const writes=[],id='11111111-1111-4111-8111-111111111111',person='22222222-2222-4222-8222-222222222222';
 let assigned=false,annullata=null,enrolled=true;
 const chain=(data)=>{const q={select:()=>q,eq:()=>q,in:()=>q,maybeSingle:async()=>({data,error:null})};return q;};
 const db={rpc:async()=>({data:assigned,error:null}),from:table=>table==='ruoli_utente'?chain({ruolo:'istruttore'}):table==='lezioni'?chain({edizione_id:id,annullata_il:annullata}):table==='iscrizioni_corsi'?chain(enrolled?{id}:null):{upsert:async row=>{writes.push(row);return {error:null};}}};
 const a=load('app/istruttore/actions.ts',{'@/lib/security':{requireUser:async()=>({supabase:db,user:{id}})},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:href=>{throw Error(href);}}});
 const f=new FormData();for(const [k,v] of Object.entries({lezione_id:id,persona_id:person,presente:'si',pagina:'2'}))f.set(k,v);
 assert.match((await a.recordAttendance(f)).error,/non autorizzato/);assigned=true;enrolled=false;assert.match((await a.recordAttendance(f)).error,/non autorizzato/);enrolled=true;annullata='2026-01-01';assert.match((await a.recordAttendance(f)).error,/annullata/);assert.equal(writes.length,0);
 annullata=null;await assert.rejects(a.recordAttendance(f),/tab=presenze.*p=2&msg=ok/);assert.equal(writes.length,1);assert.equal(writes[0].presente,true);
});
test('Registro e materiali per un corso selezionato, non per ogni lezione contemporaneamente',()=>{
 const p=read('app/istruttore/page.tsx');
 assert.match(p,/authorizedSelection\(editions.map/);assert.match(p,/eq\('lezione_id',lesson.id\)/);assert.match(p,/registerError/);assert.match(p,/programma_versione_id/);assert.match(p,/lezione_moduli/);
 assert.doesNotMatch(p,/note_amministrative|saldi_quote|\.email\b|\.telefono\b/);
 const e=read('app/area-soci/page.tsx');assert.match(e,/eq\('utente_id',user.id\)/);assert.match(e,/area_soci_miei_profili/);assert.match(e,/ConfirmDialog/);assert.doesNotMatch(e,/historyIds.slice/);
});


test('F6: panoramica con profili separati, anteprime limitate e nessun pagamento online',()=>{
 const p=read('app/area-personale/page.tsx');assert.match(p,/relazione==='tutore'/);assert.match(p,/aria-label="Persone rappresentate"/);assert.match(p,/aria-label="Profili personali"/);assert.match(p,/areaSociAccess===true&&<QuickActionLink/);assert.match(p,/const \[brevetti,\[cards,courseDebts,patents\],overviewCourses,upcomingEvents\]=await Promise\.all\(/);assert.match(p,/overview&&areaSociAccess===true\?supabase\.from\('eventi_soci'\).*\.limit\(3\):\{data:\[\],error:null\}/);assert.match(p,/overview\?Promise\.all\(ids\.map\(async id=>supabase\.from\('iscrizioni_corsi'\)/);assert.match(p,/eq\('persona_id',id\)\.in\('stato',\['iscritto','concluso'\]\)/);assert.match(p,/\.limit\(3\)/);assert.match(p,/Nessun residuo/);assert.match(p,/<NereiaProject\/>/);assert.doesNotMatch(p,/Paga online|Paga quota/);
 const t=read('app/istruttore/page.tsx');assert.match(t,/sc-instructor-course/);assert.match(t,/saved\?\.presente===true\?'Presente':saved\?\.presente===false\?'Assente':'Da registrare'/);assert.match(t,/defaultValue=\{saved\?\.presente===true\?"si":saved\?\.presente===false\?"no":""\}/);assert.match(t,/registerError\?<Alert/);assert.match(t,/action=\{recordAttendance\}/);assert.match(t,/a.ruolo==='responsabile'/);
 for(const path of ['app/accedi/page.tsx','app/registrati/page.tsx','app/nuova-password/page.tsx']){const a=read(path);assert.match(a,/<AuthIdentity\/>/);assert.match(a,/sc-auth-decoration" aria-hidden="true"/);assert.match(a,/<AuthForm action=/);}
 assert.match(read('components/ui/AuthIdentity.tsx'),/<NereiaProject\/>/);
});

test('F6: navigazione desktop con soli percorsi di ruolo',()=>{
 const n=load('lib/navigation.ts'),enabled={...n.guestAccess,signedIn:true,enabled:true};
 assert.deepEqual(n.userAreaDestinations('/area-personale',n.guestAccess),[]);assert.deepEqual(n.userAreaDestinations('/accedi',{...enabled,personal:true}),[]);
 const member={...enabled,personal:true};assert.ok(n.userAreaDestinations('/area-personale',member).some(d=>d.href==='/documenti'));assert.ok(!n.userAreaDestinations('/area-personale',member).some(d=>d.href==='/area-soci'));
 assert.ok(n.userAreaDestinations('/area-personale',{...member,member:true}).some(d=>d.href==='/area-soci'));assert.ok(!n.userAreaDestinations('/istruttore',{...enabled,instructor:true}).some(d=>d.href.startsWith('/gestionale')));
 assert.equal(n.mobileDestinations('/area-personale',{...member,member:true}).length,5);
});
