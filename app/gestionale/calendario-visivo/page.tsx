import {singleSearchParams} from '@/lib/module-ui';
import Link from 'next/link';
import {requireStaffForRender as requireStaff} from '@/lib/security';
import {tutteLePagine} from '@/lib/pagine';
import {readCourseChunks} from '@/lib/course-ui';
import {calendarContext,calendarHref,calendarLessonHref,calendarViews,changePeriod,dateUTC,dateWindow,dayBounds,intervalOnDay,overlaps,romeDay,validDay,type CalendarContext} from '@/lib/calendar-tools';
import {formatRome,UUID_RE} from '@/lib/course-tools';
import {PageHeader,SectionHeader,ButtonLink,Alert,EmptyState} from '@/components/ui/Primitives';
import {Icon} from '@/components/ui/Icon';
import {Drawer} from '@/components/ui/Drawer';
import EditForm from '@/components/EditForm';
import CalendarContextFields from '@/components/CalendarContextFields';
import CourseScheduleFields from '@/components/CourseScheduleFields';
import CourseLessonFields from '@/components/CourseLessonFields';
import SearchableSelect from '@/components/ui/SearchableSelect';
import LessonComposer from '@/components/LessonComposer';
import {createLesson} from '@/app/gestionale/corsi/actions';

type Lesson={id:string;titolo:string;edizione_id:string;inizio:string;fine:string;piscina_id:string|null;annullata_il:string|null};
type Booking={id:string;lezione_id:string;corsia_id:string;inizio:string;fine:string;stato:string};
const weekdays=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const dayName=(day:string)=>new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(dateUTC(day));
const shortDay=(day:string)=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',timeZone:'UTC'}).format(dateUTC(day));
const periodTitle=(days:string[],context:CalendarContext)=>context.vista==='mese'?new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'UTC'}).format(dateUTC(context.giorno)):days.length===1?dayName(days[0]):shortDay(days[0])+' – '+shortDay(days[days.length-1])+' '+days[days.length-1].slice(0,4);
export default async function CalendarPage({searchParams}:{searchParams:Promise<{giorno?:string;vista?:string;piscina?:string;edizione?:string;annullate?:string;msg?:string;nuovo?:string;crea_giorno?:string;lezione?:string}>}){
 const {supabase}=await requireStaff();
 const params=singleSearchParams(await searchParams);
 const context=calendarContext(params),day=context.giorno,view=context.vista,today=validDay(undefined);
 const {days,from,to}=dateWindow(day,view);
 const boundsByDay=new Map(days.map(d=>[d,dayBounds(d)]));
 const labelsByDay=new Map(days.map(d=>[d,dayName(d)]));
 const labelDay=(d:string)=>labelsByDay.get(d)??dayName(d);
 const [poolResult,laneResult,lessonResult,bookingResult,editionResult]=await Promise.all([
  tutteLePagine((da,a)=>supabase.from('piscine').select('id,nome,indirizzo,orari_disponibili,limitazioni').order('nome').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('corsie').select('id,numero,piscina_id,note').order('numero').order('id').range(da,a)),
  tutteLePagine((da,a)=>{let query=supabase.from('lezioni').select('id,titolo,edizione_id,inizio,fine,piscina_id,annullata_il').lt('inizio',to).gt('fine',from);if(!context.annullate)query=query.is('annullata_il',null);return query.order('inizio').order('id').range(da,a);}),
  tutteLePagine((da,a)=>supabase.from('prenotazioni_corsie').select('id,lezione_id,corsia_id,inizio,fine,stato').eq('stato','confermata').lt('inizio',to).gt('fine',from).order('inizio').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('edizioni_corsi').select('id,nome,stato,inizio,fine').order('nome').order('id').range(da,a))
 ]);
 const pools=poolResult.data??[],lanes=laneResult.data??[],allLessons=(lessonResult.data??[]) as Lesson[],allBookings=(bookingResult.data??[]) as Booking[],editions=editionResult.data??[];
 const validPool=context.piscina,validEdition=context.edizione;
 const pool=pools.find(p=>p.id===validPool),edition=editions.find(e=>e.id===validEdition);
 const invalidFilter=Boolean(validPool&&!pool||validEdition&&!edition);
 const lessonReadFailed=Boolean(lessonResult.error||editionResult.error||poolResult.error||invalidFilter);
 const occupancyFailed=Boolean(bookingResult.error||laneResult.error||poolResult.error);
 const visible=allLessons.filter(l=>(!validPool||l.piscina_id===validPool)&&(!validEdition||l.edizione_id===validEdition));
 const names=new Map(editions.map(e=>[e.id,e.nome]));
 const poolNames=new Map(pools.map(p=>[p.id,p.nome]));
 const laneNames=new Map(lanes.map(l=>[l.id,l.numero]));
 const byLesson=new Map<string,Booking[]>(),byLane=new Map<string,Booking[]>();
 for(const b of allBookings){const entries=byLesson.get(b.lezione_id)??[];entries.push(b);byLesson.set(b.lezione_id,entries);const intervals=byLane.get(b.corsia_id)??[];intervals.push(b);byLane.set(b.corsia_id,intervals);}
 // Occupazione: non applicare mai il filtro del corso. Anche le prenotazioni prive di un titolo leggibile restano visibili.
 const poolLanes=lanes.filter(l=>l.piscina_id===validPool);
 const allLessonNames=new Map(allLessons.map(l=>[l.id,l.titolo]));
 const missingBookingLessons=[...new Set(allBookings.map(b=>b.lezione_id).filter(id=>!allLessonNames.has(id)))];
 const extraLessons=await readCourseChunks(missingBookingLessons,(ids,da,a)=>supabase.from('lezioni').select('id,titolo').in('id',ids).order('id').range(da,a));
 for(const l of extraLessons.data??[])allLessonNames.set(l.id,l.titolo);
 const previous=changePeriod(day,view,-1),next=changePeriod(day,view,1);
 const createDay=params.crea_giorno&&days.includes(params.crea_giorno)?params.crea_giorno:day;
 const selectableEditions=editions.filter(e=>['programmato','attivo'].includes(e.stato));
 const canCreate=!poolResult.error&&!laneResult.error&&!editionResult.error&&selectableEditions.length>0;
 const newLesson=UUID_RE.test(params.lezione??'')&&['lezione_creata','moduli_salvati'].includes(params.msg??'')?await supabase.from('lezioni').select('id,titolo,edizione_id,annullata_il').eq('id',params.lezione!).maybeSingle():{data:null,error:null};
 const saved=newLesson.data;
 const [moduleCatalog,moduleLinks]=saved&&params.msg==='lezione_creata'&&!saved.annullata_il?await Promise.all([
  tutteLePagine((da,a)=>supabase.from('moduli_didattici').select('id,tipo,codice,titolo').order('pre_id').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('lezione_moduli').select('modulo_id,ordine').eq('lezione_id',saved.id).order('ordine').order('modulo_id').range(da,a))
 ]):[{data:[],error:null},{data:[],error:null}];
 const editor=<Drawer key={createDay+'-'+context.piscina+'-'+context.edizione} title="Nuova lezione" trigger="Nuova lezione" primary initialOpen={params.nuovo==='1'}><EditForm action={createLesson} className="stack"><CalendarContextFields context={context}/><div className="sc-field"><label htmlFor="calendar-edition">Corso / edizione</label><SearchableSelect id="calendar-edition" name="edizione_id" label="Edizione" required value={selectableEditions.some(e=>e.id===validEdition)?validEdition:''} options={selectableEditions.map(e=>({value:e.id,label:e.nome+' · '+e.inizio+' – '+e.fine}))}/></div><label>Titolo<input name="titolo" required maxLength={160}/></label><CourseScheduleFields day={createDay}/><CourseLessonFields pools={pools} lanes={lanes} initialPool={pool?.id??''}/><p className="tiny muted">La lezione e le eventuali corsie sono salvate insieme. Dopo la creazione puoi comporre i moduli didattici senza uscire dal calendario.</p></EditForm></Drawer>;
 const msg:Record<string,string>={eliminato:'Record rimosso.',elimina_collegati:'Rimozione non consentita: sono presenti dati collegati.',database:'Operazione non riuscita.',dati:'Controlla i dati inseriti.',lezione_creata:'Lezione salvata. Puoi completare i moduli didattici.',moduli_salvati:'Composizione della lezione salvata.',annullata:'Lezione annullata; le prenotazioni sono state liberate.'};
 return <>
 <PageHeader area="pool" icon="calendar" marine eyebrow="Impianti e calendario" title="Calendario piscine e corsie" description="Programma le lezioni, verifica le prenotazioni e consulta gli impianti. Tutti gli orari sono italiani." actions={<>{canCreate?editor:<ButtonLink href="/gestionale/corsi/nuovo" variant="secondary">Crea edizione del corso</ButtonLink>}<ButtonLink href="/gestionale/moduli/piscine" variant="secondary" icon="nuoto">Piscine</ButtonLink></>}/>
 {params.msg&&Object.hasOwn(msg,params.msg)&&<Alert announce tone={['eliminato','lezione_creata','moduli_salvati','annullata'].includes(params.msg)?'success':'warning'}>{msg[params.msg]} {saved&&<Link href={calendarLessonHref(saved.id,context)}>Apri lezione</Link>}</Alert>}
 {params.msg==='lezione_creata'&&saved&&!saved.annullata_il&&(!moduleCatalog.error&&!moduleLinks.error?<Drawer key={'composizione-'+saved.id} title={'Moduli didattici · '+saved.titolo} trigger="Componi moduli della nuova lezione" initialOpen><LessonComposer edizioneId={saved.edizione_id} lezioneId={saved.id} moduli={moduleCatalog.data??[]} initial={(moduleLinks.data??[]).map(x=>x.modulo_id)} returnContext={context}/></Drawer>:<Alert tone="warning">La lezione è stata creata, ma i moduli non sono leggibili. Apri la lezione per riprovare.</Alert>)}
 {newLesson.error&&<Alert tone="warning">Dettaglio della lezione appena salvata non disponibile.</Alert>}
 {(lessonReadFailed||occupancyFailed)&&<Alert tone="danger" announce>Alcuni dati non sono disponibili. Non interpretare elenchi incompleti come assenza di lezioni o prenotazioni.</Alert>}
 {invalidFilter&&<Alert tone="warning">Il corso o la piscina selezionati non sono disponibili. Cambia i filtri.</Alert>}
 {!canCreate&&<Alert tone="warning">{editionResult.error||poolResult.error||laneResult.error?'Dati per la creazione non disponibili. Riprova.':'Non ci sono edizioni programmate o attive. Creane una prima di programmare una lezione.'}</Alert>}
 <section className="sc-card sc-calendar-controls" aria-label="Controlli calendario">
 <nav className="sc-calendar-views" aria-label="Modalità calendario">{calendarViews.map(([key,label])=><Link className={'sc-button '+(view===key?'sc-button-primary':'sc-button-secondary')} key={key} href={calendarHref({...context,vista:key})} aria-current={view===key?'page':undefined}>{label}</Link>)}</nav>
 <div className="sc-calendar-period"><ButtonLink variant="secondary" href={calendarHref({...context,giorno:previous})}>← Precedente</ButtonLink><h2>{periodTitle(days,context)}</h2><ButtonLink variant="secondary" href={calendarHref({...context,giorno:next})}>Successivo →</ButtonLink><ButtonLink variant="secondary" href={calendarHref({...context,giorno:today})}>Oggi</ButtonLink></div>
 <form action="/gestionale/calendario-visivo" method="get" className="sc-calendar-filter">
 <input type="hidden" name="vista" value={view}/><label>Data<input type="date" name="giorno" defaultValue={day} required/></label>
 <label>Piscina<select name="piscina" defaultValue={validPool}><option value="">Tutte le piscine e lezioni senza piscina</option>{pools.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}{validPool&&!pool&&<option value={validPool}>Piscina non disponibile</option>}</select></label>
 <label>Corso / edizione<select name="edizione" defaultValue={validEdition}><option value="">Tutti i corsi</option>{editions.map(e=><option key={e.id} value={e.id}>{e.nome} · {e.stato}</option>)}{validEdition&&!edition&&<option value={validEdition}>Corso non disponibile</option>}</select></label>
 <label className="check-label"><input type="checkbox" name="annullate" value="1" defaultChecked={context.annullate}/> Mostra lezioni annullate</label><div className="buttons"><button className="button" type="submit">Applica filtri</button><ButtonLink variant="secondary" href={calendarHref({...context,piscina:'',edizione:'',annullate:false})}>Azzera filtri</ButtonLink></div></form>
 <div className="sc-calendar-legend" aria-label="Legenda lezioni"><span className="sc-legend-pool"><Icon name="nuoto"/> Piscina</span><span className="sc-legend-theory"><Icon name="course"/> Senza piscina</span><span className="sc-legend-cancelled"><Icon name="close"/> Annullata</span><Link className="sc-calendar-mobile-agenda" href={calendarHref({...context,vista:'agenda'})}>Apri agenda</Link></div>
 </section>
 {!lessonReadFailed&&<>
 {!visible.length&&<EmptyState title="Nessuna lezione nel periodo selezionato" description="Cambia data o filtri, oppure programma una nuova lezione." action={canCreate?<ButtonLink href={calendarHref(context,{nuovo:true,creaGiorno:day})}>Programma lezione</ButtonLink>:undefined}/>}
 <div className={'sc-calendar sc-calendar-'+view} role="region" tabIndex={0} aria-label={'Calendario '+view}>
 {['settimana','mese'].includes(view)&&weekdays.map(x=><div className="sc-calendar-weekday" key={x}>{x.slice(0,3)}</div>)}
 {days.map(d=>{const bounds=boundsByDay.get(d)!,records=visible.filter(l=>overlaps(l.inizio,l.fine,bounds.from,bounds.to));return <section key={d} className={'sc-calendar-day'+(d===today?' sc-calendar-today':'')+(view==='mese'&&d.slice(0,7)!==day.slice(0,7)?' sc-calendar-outside':'')} aria-label={labelDay(d)}>
 <div className="sc-calendar-day-head"><Link href={calendarHref({...context,giorno:d,vista:'giorno'})} aria-current={d===today?'date':undefined}>{labelDay(d)} {d===today&&<span className="sc-today-label">Oggi</span>}</Link>{canCreate&&<Link className="sc-calendar-add" aria-label={'Nuova lezione '+labelDay(d)} href={calendarHref(context,{nuovo:true,creaGiorno:d})}>+</Link>}</div>
 {!records.length?<p className="sc-calendar-empty">Nessuna lezione</p>:records.map(l=>{const time=intervalOnDay(l.inizio,l.fine,d)!;const laneNumbers=[...new Set((byLesson.get(l.id)??[]).filter(b=>overlaps(b.inizio,b.fine,bounds.from,bounds.to)).map(b=>laneNames.get(b.corsia_id)).filter(n=>n!==undefined))].sort((a,b)=>a!-b!);
 return <Link key={l.id} className={'sc-calendar-event'+(l.annullata_il?' sc-calendar-cancelled':l.piscina_id?' sc-calendar-pool':' sc-calendar-theory')} href={calendarLessonHref(l.id,context)}><strong className="sc-calendar-event-time"><Icon name={l.annullata_il?'close':l.piscina_id?'nuoto':'course'}/>{time.start}–{time.end}{time.continuesBefore||time.continuesAfter?' · Prosegue':''}</strong><span>{l.titolo}</span><small>{names.get(l.edizione_id)??'Corso non disponibile'}</small><small>{l.annullata_il?'Annullata':l.piscina_id?poolNames.get(l.piscina_id)??'Piscina non disponibile':'Senza piscina'}</small>{!l.annullata_il&&l.piscina_id&&<small>{occupancyFailed?'Corsie da verificare':laneNumbers.length?'Corsie '+laneNumbers.join(', '):'Nessuna corsia prenotata'}</small>}</Link>;})}</section>;})}
 </div></>}
 <section className="sc-card sc-occupancy-section">
 <SectionHeader title="Occupazione corsie" description={'Prenotazioni confermate per tutto il periodo visualizzato · '+periodTitle(days,context)} actions={<><ButtonLink icon="calendar" href={'/gestionale/moduli/prenotazioni'+(validPool?'?piscina='+validPool:'')}>Gestisci prenotazioni</ButtonLink>{pool&&<ButtonLink href={'/gestionale/moduli/piscine?edit='+pool.id} variant="secondary">Scheda piscina</ButtonLink>}</>}/>
 <p><strong>Prenotata</strong> = intervallo registrato. <strong>Non prenotata nel gestionale</strong> = nessuna prenotazione registrata nell’intervallo. Orari e limitazioni dell’impianto devono essere verificati separatamente.</p>
 {context.edizione&&<Alert tone="info">L’occupazione include tutti i corsi, anche quando il calendario è filtrato per edizione.</Alert>}
 {extraLessons.error&&<Alert tone="warning">Alcuni titoli delle lezioni non sono leggibili; le prenotazioni registrate restano visibili.</Alert>}
 {!validPool?<p>Seleziona una piscina per consultare le sue corsie.</p>:occupancyFailed||!pool?<Alert tone="warning">Occupazione non verificabile.</Alert>:<>
 <div className="sc-pool-conditions"><h3>{pool.nome}</h3><p>Orari dichiarati: {pool.orari_disponibili||'Non acquisiti'}</p><p>Limitazioni: {pool.limitazioni||'Non acquisite'}</p><p className="tiny muted">Disponibilità contrattuale non verificata. Le condizioni sono informazioni testuali, non fasce orarie automaticamente validate.</p><ButtonLink variant="secondary" href={'/gestionale/moduli/piscine?edit='+pool.id}>Scheda piscina</ButtonLink></div>
 {!poolLanes.length?<EmptyState title="Nessuna corsia configurata" action={<ButtonLink href={'/gestionale/moduli/corsie?piscina='+pool.id+'&nuovo=1'}>Aggiungi corsia</ButtonLink>}/>:<div className="sc-occupancy-matrix-wrap" role="region" aria-label="Matrice occupazione corsie" tabIndex={0}><table className="sc-occupancy-matrix" role="table" aria-label="Occupazione corsie per giorno"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Corsia</th>{days.map(d=><th key={d} scope="col" role="columnheader">{labelDay(d)}</th>)}</tr></thead><tbody role="rowgroup">{poolLanes.map(l=>{const bookings=byLane.get(l.id)??[];return <tr role="row" key={l.id}><th scope="row" role="rowheader"><strong>Corsia {l.numero}</strong>{l.note&&<p className="sc-prewrap">Vincoli / note: {l.note}</p>}<Link href={'/gestionale/moduli/prenotazioni?piscina='+pool.id+'&corsia_id='+l.id}>Tutte le prenotazioni della corsia</Link></th>
 {days.map(d=>{const bounds=boundsByDay.get(d)!,entries=bookings.filter(b=>overlaps(b.inizio,b.fine,bounds.from,bounds.to));return <td key={d} role="cell" className="sc-lane-day" data-day={labelDay(d)}><span className="sc-lane-mobile-day" aria-hidden="true">{labelDay(d)}</span>{entries.length?entries.map(b=>{const time=intervalOnDay(b.inizio,b.fine,d)!;return <Link key={b.id} className="sc-lane-booking" href={calendarLessonHref(b.lezione_id,context)}><span><strong>{time.start}–{time.end}</strong> · Prenotata</span><span>{allLessonNames.get(b.lezione_id)??'Lezione non disponibile'}</span></Link>;}):<span className="sc-lane-state">Non prenotata nel gestionale</span>}</td>;})}</tr>;})}</tbody></table></div>}
 </>}
 </section>
 <div className="buttons"><ButtonLink href="/gestionale/moduli/piscine" variant="secondary">Piscine</ButtonLink><ButtonLink href="/gestionale/moduli/corsie" variant="secondary">Corsie</ButtonLink><ButtonLink href="/gestionale/moduli/prenotazioni" variant="secondary">Prenotazioni</ButtonLink></div>
 </>;
}
