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
const course=load('lib/course-tools.ts'),calendar=load('lib/calendar-tools.ts',{'./course-tools':course}),pages=load('lib/pagine.ts'),h=load('lib/course-ui.ts');
const pool='11111111-1111-4111-8111-111111111111',edition='22222222-2222-4222-8222-222222222222',lesson='33333333-3333-4333-8333-333333333333',lane='44444444-4444-4444-8444-444444444444',booking='55555555-5555-4555-8555-555555555555';
function form(entries){const f=new FormData();for(const [k,v] of Object.entries(entries))f.set(k,v);return f;}
function chain(data,error=null,log=[]){const q={};for(const method of ['select','eq','neq','lt','gt','order'])q[method]=(...args)=>{log.push([method,...args]);return q;};q.range=async(...args)=>{log.push(['range',...args]);return {data,error};};q.maybeSingle=async()=>({data,error});return q;}
function actions(db){return load('app/gestionale/calendario-visivo/actions.ts',{'@/lib/calendar-tools':calendar,'@/lib/pagine':pages,'@/lib/course-tools':course,'@/lib/security':{requireStaff:async()=>({supabase:db})},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}}});}
const context={cal_giorno:'2026-11-26',cal_vista:'mese',cal_piscina:pool,cal_edizione:edition,cal_annullate:'1'};
const times={giorno_inizio:'2026-11-26',ora_inizio:'10:00',giorno_fine:'2026-11-26',ora_fine:'11:00'};
test('Calendario: giorno, settimana, mese, agenda e navigazione reale del periodo',()=>{
 assert.equal(calendar.calendarViews.length,4);assert.equal(calendar.calendarView('ignoto'),'settimana');
 assert.deepEqual(calendar.dateWindow('2026-11-26','giorno').days,['2026-11-26']);
 assert.equal(calendar.dateWindow('2026-11-26','agenda').days[0],'2026-11-26');
 assert.equal(calendar.dateWindow('2026-11-26','agenda').days.length,7);
 assert.equal(calendar.dateWindow('2026-11-26','mese').days.length,42);
 assert.equal(calendar.changePeriod('2026-11-30','giorno',1),'2026-12-01');
 assert.equal(calendar.changePeriod('2026-11-26','agenda',1),'2026-12-03');
 assert.equal(calendar.changePeriod('2026-11-26','mese',1),'2026-12-01');
});
test('Intervalli locali, mezzanotte, adiacenze e giorni di 23/25 ore',()=>{
 const spring=calendar.dayBounds('2026-03-29'),autumn=calendar.dayBounds('2026-10-25');
 assert.equal((Date.parse(spring.to)-Date.parse(spring.from))/3600000,23);
 assert.equal((Date.parse(autumn.to)-Date.parse(autumn.from))/3600000,25);
 const a='2026-11-26T22:30:00Z',b='2026-11-27T01:00:00Z';
 assert.deepEqual(calendar.intervalOnDay(a,b,'2026-11-26'),{start:'23:30',end:'24:00',continuesBefore:false,continuesAfter:true});
 assert.deepEqual(calendar.intervalOnDay(a,b,'2026-11-27'),{start:'00:00',end:'02:00',continuesBefore:true,continuesAfter:false});
 assert.equal(calendar.overlaps('2026-11-26T09:00:00Z','2026-11-26T10:00:00Z','2026-11-26T10:00:00Z','2026-11-26T11:00:00Z'),false);
 assert.equal(calendar.intervalOnDay(a,b,'2026-11-28'),null);
});
test('Una sola validazione temporale per i due tipi di editor',()=>{
 assert.deepEqual(course.lessonInterval(form(times)),course.lessonInterval(form({inizio:'2026-11-26T10:00',fine:'2026-11-26T11:00'})));
 assert.throws(()=>course.lessonInterval(form({...times,ora_fine:'09:00'})));
 assert.throws(()=>course.lessonInterval(form({...times,giorno_inizio:'2026-10-25',ora_inizio:'02:30'})));
});
test('Ritorno al calendario conserva soltanto parametri ammessi, senza redirect esterni',()=>{
 const ctx=calendar.calendarFormContext(form({...context,cal_piscina:'https://evil.example',cal_vista:'https://evil.example'}));
 assert.equal(ctx.piscina,'');assert.equal(ctx.vista,'settimana');
 const url=calendar.calendarHref(calendar.calendarFormContext(form(context)),{msg:'lezione_creata',lezione:lesson});
 assert.ok(url.startsWith('/gestionale/calendario-visivo?'));const q=new URL(url,'https://example.invalid').searchParams;
 for(const [k,v] of Object.entries({giorno:'2026-11-26',vista:'mese',piscina:pool,edizione:edition,annullate:'1',lezione:lesson}))assert.equal(q.get(k),v);
});
test('Preflight corsie: tutti i corsi, sole confermate, intervallo semiaperto ed esclusione della lezione modificata',async()=>{
 const log=[];const rows=[{id:booking,corsia_id:lane,lezione_id:lesson,inizio:'2026-11-26T09:30:00Z',fine:'2026-11-26T10:30:00Z'}];
 const a=actions({from:table=>{assert.equal(table,'prenotazioni_corsie');return chain(rows,null,log);}});
 const result=await a.checkLaneConflicts(form({...times,piscina_id:pool,lezione_id:lesson}));
 assert.equal(result.status,'ready');assert.deepEqual(result.conflicts,rows);
 for(const expected of [['eq','corsie.piscina_id',pool],['eq','stato','confermata'],['lt','inizio','2026-11-26T10:00:00.000Z'],['gt','fine','2026-11-26T09:00:00.000Z'],['neq','lezione_id',lesson]])assert.ok(log.some(x=>JSON.stringify(x)===JSON.stringify(expected)));
 assert.ok(!log.some(x=>x[1]==='edizione_id'));
 const fail=actions({from:()=>chain(null,{message:'denied'})});
 assert.equal((await fail.checkLaneConflicts(form({...times,piscina_id:pool}))).status,'error');
});
test('Preflight archivio: valida le relazioni e ignora solo il record in modifica',async()=>{
 const log=[];let lessonPool=pool;
 const db={from:table=>table==='lezioni'?chain({piscina_id:lessonPool,inizio:'2026-11-26T08:00:00Z',fine:'2026-11-26T12:00:00Z',annullata_il:null}):table==='corsie'?chain({piscina_id:pool}):chain([],null,log)};
 const a=actions(db),f=form({...times,lezione_id:lesson,corsia_id:lane,id:booking});
 assert.equal((await a.checkBookingConflict(f)).status,'ready');assert.ok(log.some(x=>x[0]==='neq'&&x[1]==='id'&&x[2]===booking));
 lessonPool=edition;assert.match((await a.checkBookingConflict(f)).message,/coerenti/);
});
test('Creazione calendario: stessa RPC atomica e ritorno ai filtri originali',async()=>{
 const calls=[];let error=null;
 const a=load('app/gestionale/corsi/actions.ts',{'@/lib/calendar-tools':calendar,'@/lib/course-ui':h,'@/lib/course-tools':course,'@/lib/pagine':pages,'@/lib/course-errors':{courseDuplicate:async()=>null},'@/lib/security':{requireStaff:async()=>({supabase:{rpc:async(...args)=>{calls.push(args);return {data:lesson,error};}}})},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}}});
 const f=form({...times,...context,origine:'calendario',edizione_id:edition,titolo:'Piscina',tipo_lezione:'piscina',piscina_id:pool,corsie_id:lane});
 error={code:'23P01'};assert.match((await a.createLesson(f)).error,/Nessuna lezione creata/);
 error=null;await assert.rejects(a.createLesson(f),/REDIRECT \/gestionale\/calendario-visivo\?giorno=2026-11-26&vista=mese&piscina=.*&edizione=.*&annullate=1&msg=lezione_creata&lezione=/);
 assert.equal(calls[1][0],'crea_lezione_guidata');assert.deepEqual(calls[1][1].p_corsie,[lane]);
});
test('Modifica e annullamento: errori espliciti, conferma, RPC e contesto',async()=>{
 const calls=[];let error={code:'23P01'};
 const a=actions({rpc:async(...args)=>{calls.push(args);return {error};}});
 const f=form({...times,...context,lezione_id:lesson,titolo:'Piscina',piscina_id:pool,corsie_id:lane});
 assert.match((await a.changeLesson(f)).error,/originali/);assert.equal(calls[0][0],'modifica_lezione_e_corsie');
 assert.match((await a.cancelLesson(f)).error,/Conferma/);assert.equal(calls.length,1);
 error=null;f.set('conferma','on');await assert.rejects(a.cancelLesson(f),/vista=mese.*annullate=1&msg=annullata/);
 assert.equal(calls[1][0],'annulla_lezione_guidata');
});
test('Struttura calendario, piscine e prenotazioni: nessun percorso generico per creare lezioni',()=>{
 const p=read('app/gestionale/calendario-visivo/page.tsx');
 assert.match(p,/calendarViews\.map/);assert.match(p,/action=\{createLesson\}/);assert.match(p,/CourseScheduleFields/);assert.match(p,/CourseLessonFields/);assert.match(p,/returnContext=\{context\}/);
 assert.match(p,/byLane\.get\(l.id\)/);assert.match(p,/boundsByDay=new Map\(days\.map\(d=>\[d,dayBounds\(d\)\]\)\)/);assert.match(p,/days\.map\(d=>\{const bounds=boundsByDay\.get\(d\)!,entries=bookings\.filter\(b=>overlaps\(b.inizio,b.fine,bounds.from,bounds.to\)\)/);
 assert.match(p,/Non prenotata nel gestionale/);assert.match(p,/L’occupazione include tutti i corsi/);assert.match(p,/occupancyFailed/);
 const m=read('app/gestionale/moduli/[modulo]/page.tsx');assert.match(m,/corsie\.piscina_id/);assert.match(m,/BookingConflictPreview/);assert.match(m,/if\(modulo==='calendario'&&nuovo==='1'\)redirect/);
 assert.match(read('app/module-actions.ts'),/key==='calendario'&&!id/);
 const pools=read('app/gestionale/moduli/piscine/page.tsx');assert.match(pools,/requireStaff/);assert.match(pools,/Aggiungi piscina/);assert.match(pools,/Consulta corsie/);assert.match(pools,/RemoveRecord/);
});


test('F4B: matrice semantica, etichette certe, filtri indipendenti e mobile',()=>{
 const p=read('app/gestionale/calendario-visivo/page.tsx');
 assert.match(p,/aria-label="Occupazione corsie per giorno"/);assert.match(p,/scope="row" role="rowheader"/);assert.match(p,/scope="col" role="columnheader"/);assert.match(p,/labelsByDay=new Map\(days\.map\(d=>\[d,dayName\(d\)\]\)\)/);assert.match(p,/labelDay=\(d:string\)=>labelsByDay\.get\(d\)\?\?dayName\(d\)/);assert.match(p,/data-day=\{labelDay\(d\)\}/);
 assert.match(p,/allBookings=\(bookingResult.data\?\?\[\]\)/);assert.match(p,/from\('prenotazioni_corsie'\).*eq\('stato','confermata'\)/);assert.match(p,/for\(const b of allBookings\)/);
 assert.match(p,/extraLessons.error&&<Alert/);assert.match(p,/aria-label="Legenda lezioni"/);assert.match(p,/vista:'agenda'/);
 assert.match(read('app/calendar-ui.css'),/\.sc-occupancy-matrix-wrap\{overflow:auto;max-width:100%/);assert.match(read('app/calendar-ui.css'),/\.sc-occupancy-matrix \.sc-lane-mobile-day\{display:block/);
 const modules=read('app/gestionale/programmi-didattici/page.tsx');assert.match(modules,/aria-label="Archivi didattici"/);assert.match(modules,/StatusBadge tone=\{m.tipo==='Piscina'/);assert.match(modules,/action=\{editTeachingModule\}/);
 const generic=read('app/gestionale/moduli/[modulo]/page.tsx');assert.match(generic,/lockedVersion&&f.name!=='stato'/);assert.match(generic,/!lockedVersion&&<RemoveRecord/);
});
