import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
const course=load('lib/course-tools.ts'),event=load('lib/event-ui.ts',{'./course-tools':course}),doc=load('lib/document-ui.ts'),pages=load('lib/pagine.ts');
const id='11111111-1111-4111-8111-111111111111';
function form(entries){const f=new FormData();for(const [k,v] of Object.entries(entries))f.set(k,v);return f;}
test('Eventi: cinque viste, filtri ammessi e occupazione non inventata',()=>{
 assert.equal(event.eventTabs.length,5);assert.equal(event.eventTab('ignoto'),'informazioni');
 assert.equal(event.eventPeriod('passati'),'passati');assert.equal(event.eventState('annullato'),'annullato');
 assert.deepEqual(event.occupancy(10,3),{occupied:7,free:3,percent:70});
 for(const value of [null,undefined,-1,11,NaN])assert.equal(event.occupancy(10,value),null);
 assert.match(event.eventReturn(form({origine:'scheda',tab:'approvazioni'}),id,'ok'),/tab=approvazioni&msg=ok/);
 assert.equal(event.eventReturn(form({origine:'https://example.com'}),id,'ok'),'/gestione-eventi?msg=ok');
});
test('Eventi: salvataggio tramite RPC, errori inline e ritorno contestuale',async()=>{
 const calls=[];let error={code:'P3416'};
 const a=load('app/area-soci/actions.ts',{'@/lib/event-ui':event,'@/lib/security':{requireUser:async()=>({supabase:{rpc:async(...args)=>{calls.push(args);return {data:id,error};}}})},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}}});
 const f=form({id,titolo:'Evento',destinazione:'Luogo',descrizione:'Descrizione',dal:'2027-01-01',al:'2027-01-02',costo:'15.00',posti:'10',origine:'scheda',tab:'informazioni'});
 assert.match((await a.saveEvent(f)).error,/Capienza/);assert.equal(calls[0][0],'area_soci_salva_evento');
 f.set('stato','annullato');assert.match((await a.saveEvent(f)).error,/conferma/);assert.equal(calls.length,1);
 f.set('conferma','on');error=null;await assert.rejects(a.saveEvent(f),/REDIRECT.*tab=informazioni&msg=ok/);
});
test('Eventi: permessi e lock delle iscrizioni, filtri richieste e storico',()=>{
 const s=read('supabase/migrations/20261117223000_area_soci_eventi.sql');
 assert.match(s,/eventi_soci_una_prenotazione/);assert.match(s,/WHERE id=p_evento FOR UPDATE/);assert.match(s,/stato IN \('in_attesa','approvata'\)/);
 assert.match(s,/revisione_prenotazioni=revisione_prenotazioni\+1/);
 const page=read('app/gestione-eventi/page.tsx');assert.match(page,/eventi_soci_iscrizioni!inner/);assert.match(page,/if\(!staff\)query=query.eq\('responsabile_id',user.id\)/);
 const detail=read('app/gestione-eventi/[id]/page.tsx');assert.match(detail,/if\(!staff\)query=query.eq\('responsabile_id',user.id\)/);assert.match(detail,/area_soci_partecipanti/);assert.match(detail,/requireEventManager/);
});
test('Documenti: ambito e destinatari prudenti, nessuna visibilità pubblica',()=>{
 const base={ambito:'associazione',visibilita:'staff',utente:'',persona:'',edizione:'',versione:'',isAdmin:false};
 assert.equal(doc.checkDocumentDestination(base),true);
 assert.equal(doc.checkDocumentDestination({...base,visibilita:'soci'}),false);
 assert.equal(doc.checkDocumentDestination({...base,visibilita:'soci',isAdmin:true}),true);
 assert.equal(doc.checkDocumentDestination({...base,visibilita:'soci',isAdmin:true,utente:id}),false);
 assert.equal(doc.checkDocumentDestination({...base,ambito:'personale'}),false);
 assert.equal(doc.checkDocumentDestination({...base,ambito:'personale',utente:id}),true);
 assert.equal(doc.checkDocumentDestination({...base,ambito:'amministrativo',visibilita:'soci',isAdmin:true}),false);
 assert.equal(doc.checkDocumentDestination({...base,ambito:'didattica',visibilita:'soci',versione:id}),false);
 assert.equal(doc.checkDocumentDestination({...base,ambito:'didattica',visibilita:'soci',edizione:id}),true);
 assert.match(doc.documentAudience('personale','staff',true),/account intestatario/);
 assert.equal(doc.archiveUploadLimit,3*1024*1024);
});
test('Documenti: accesso privato invariato e upload contestuale',()=>{
 const s=read('app/documenti/actions.ts'),r=read('app/documenti/[id]/route.ts'),p=read('app/documenti/page.tsx');
 assert.match(s,/checkDocumentDestination/);assert.match(s,/realMime/);assert.match(s,/annulla_upload_documento/);
 assert.match(r,/requireUser/);assert.match(r,/legge_certificato/);assert.match(r,/autorizzato!==true/);assert.match(r,/createSignedUrl\(doc.percorso_storage,60/);
 assert.match(r,/private, no-store/);assert.match(p,/DocumentDestination/);assert.match(p,/visibilita/);assert.match(p,/count:'exact'/);
});
test('Consiglio: quorum e adesioni conservano RPC, originali e versioni',()=>{
 const s=read('app/organi-sociali/page.tsx'),a=read('app/organi-sociali/actions.ts');
 assert.match(s,/Votazione non configurata/);assert.match(s,/BoardAdmissions/);assert.match(s,/aria-current/);assert.match(s,/requireBoard/);assert.match(s,/Consiglio d'Amministrazione/);
 assert.match(a,/prepara_verbale_cda/);assert.match(a,/approva_versione_cda/);assert.match(a,/finalizza_verbale_cda/);assert.match(a,/upsert:false/);
 const sql=read('supabase/migrations/20261116100800_v12_sicurezza_organi_didattica_import.sql');
 assert.match(sql,/where id=p_verbale for update/);assert.match(sql,/on conflict do nothing/);assert.match(sql,/Adesioni non valide o duplicate/);
 const next=read('supabase/migrations/20261125223000_patch_0019.sql');
 assert.match(next,/cda_letture/);assert.match(next,/sostituisci_verbale/);
});
