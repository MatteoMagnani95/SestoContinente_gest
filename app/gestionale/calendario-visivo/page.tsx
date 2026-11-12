import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {changePeriod,dateUTC,dateWindow,monday,shiftDay,romeDay,romeTime,validDay,type CalendarView} from '@/lib/calendar-tools';

type Lesson={id:string;titolo:string;edizione_id:string;inizio:string;fine:string;piscina_id:string|null;annullata_il:string|null};
type Booking={id:string;lezione_id:string;corsia_id:string;inizio:string;fine:string;stato:string};
const weekDays=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
function dayName(day:string){return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',timeZone:'UTC'}).format(dateUTC(day));}
export default async function CalendarPage({searchParams}:{searchParams:Promise<{giorno?:string;vista?:string;piscina?:string;msg?:string}>}){
 const {supabase}=await requireStaff();
 const params=await searchParams;const day=validDay(params.giorno);const view:CalendarView=params.vista==='mese'?'mese':'settimana';
 const {days,from,to}=dateWindow(day,view);
 const [{data:pools,error:poolError},{data:lanes,error:laneError},{data:lessons,error:lessonError},{data:bookings,error:bookingError}]=await Promise.all([
  supabase.from('piscine').select('id,nome').order('nome').limit(100),
  supabase.from('corsie').select('id,numero,piscina_id').order('numero').limit(1000),
  supabase.from('lezioni').select('id,titolo,edizione_id,inizio,fine,piscina_id,annullata_il')
   .is('annullata_il',null).lt('inizio',to).gt('fine',from).order('inizio').limit(1000),
  supabase.from('prenotazioni_corsie').select('id,lezione_id,corsia_id,inizio,fine,stato')
   .eq('stato','confermata').lt('inizio',to).gt('fine',from).order('inizio').limit(2000)
 ]);
 const failed=poolError||laneError||lessonError||bookingError;
 const allLessons=(lessons??[]) as Lesson[];const allBookings=(bookings??[]) as Booking[];
 const validPool=(pools??[]).some(p=>p.id===params.piscina)?params.piscina??'':'';
 const visible=validPool?allLessons.filter(l=>l.piscina_id===validPool):allLessons;
 const editionIds=[...new Set(visible.map(l=>l.edizione_id))];
 const {data:editions}=editionIds.length?await supabase.from('edizioni_corsi').select('id,nome').in('id',editionIds.slice(0,500)):{data:[]};
 const names=new Map((editions??[]).map(e=>[e.id,e.nome]));
 const bookingsByLesson=new Map<string,Booking[]>();for(const b of allBookings){const rows=bookingsByLesson.get(b.lezione_id)??[];rows.push(b);bookingsByLesson.set(b.lezione_id,rows);}
 const lessonIds=new Set(visible.map(l=>l.id));
 const poolLanes=(lanes??[]).filter(l=>l.piscina_id===validPool);
 const boardDays=Array.from({length:7},(_,i)=>shiftDay(monday(day),i));
 const previous=changePeriod(day,view,-1),next=changePeriod(day,view,1);
 const query=(giorno:string,vista:CalendarView,piscina=validPool)=>`/gestionale/calendario-visivo?giorno=${giorno}&vista=${vista}${piscina?`&piscina=${encodeURIComponent(piscina)}`:''}`;
 const incomplete=allLessons.length>=1000||allBookings.length>=2000;
 return <>
 <div className="page-intro"><p className="eyebrow">Gestione impianti · Fase 3.3</p><h1>Calendario piscine e corsie</h1>
 <p>Consulta le lezioni, controlla le occupazioni e modifica le prenotazioni. Orari Europe/Rome.</p></div>
 {params.msg==='dati'&&<p className="notice error">Parametri non validi. Riprova.</p>}
 {failed&&<p className="notice error">Non è stato possibile leggere tutti i dati. Controlla la migrazione 0005 e i permessi Supabase.</p>}
 {incomplete&&<p className="notice error">Sono presenti più dati del limite di visualizzazione: restringi il periodo o la piscina prima di usare questa vista per pianificare.</p>}
 <div className="panel calendar-filters"><form action="/gestionale/calendario-visivo" method="get" className="calendar-filter-form">
 <label>Giorno di riferimento<input type="date" name="giorno" defaultValue={day}/></label>
 <label>Piscina<select name="piscina" defaultValue={validPool}><option value="">Tutte le piscine</option>{(pools??[]).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
 <label>Vista<select name="vista" defaultValue={view}><option value="settimana">Settimana</option><option value="mese">Mese</option></select></label>
 <button className="button" type="submit">Applica filtri</button></form></div>
 <div className="module-toolbar calendar-period">
 <div className="buttons"><Link className="button ghost" href={query(previous,view)}>← Precedente</Link>
 <span className="calendar-range">{dayName(days[0])} – {dayName(days[days.length-1])}</span>
 <Link className="button ghost" href={query(next,view)}>Successivo →</Link></div>
 <div className="buttons"><Link className="button ghost" href={query(day,'settimana')}>Settimana</Link><Link className="button ghost" href={query(day,'mese')}>Mese</Link>
 <Link className="button" href="/gestionale/corsi">+ Nuova lezione</Link></div></div>
 <div className={`calendar-grid ${view==='mese'?'calendar-month':''}`}>
 {weekDays.map(x=><div className="calendar-head" key={x}>{x}</div>)}
 {days.map(d=>{const records=visible.filter(l=>romeDay(l.inizio)===d);
 return <div key={d} className={`calendar-day ${d.slice(0,7)!==day.slice(0,7)?'calendar-muted':''}`}>
 <div className="calendar-date">{dayName(d)}</div>
 {records.length===0?<span className="tiny muted">—</span>:records.map(l=><Link className="calendar-event calendar-event-link" href={`/gestionale/calendario-visivo/${l.id}`} key={l.id}>
 <strong>{romeTime(l.inizio)}–{romeTime(l.fine)}</strong><span>{l.titolo}</span>
 <small>{names.get(l.edizione_id)??'Corso'} · {(bookingsByLesson.get(l.id)??[]).length} corsie</small></Link>)}
 </div>;})}</div>
 <section className="panel"><h2>Occupazione corsie · settimana</h2><p>La tabella evidenzia le lezioni prenotate nelle singole corsie. Uno spazio privo di prenotazioni non certifica la disponibilità contrattuale dell'impianto.</p>
 {!validPool?<p className="notice">Seleziona una piscina per visualizzare l'occupazione delle corsie.</p>:poolLanes.length===0?<p className="notice">Non ci sono corsie configurate per questa piscina.</p>:
 <div className="table-panel calendar-lane-table"><table><thead><tr><th>Corsia</th>{boardDays.map(d=><th key={d}>{dayName(d)}</th>)}</tr></thead><tbody>
 {poolLanes.map(l=><tr key={l.id}><th>Corsia {l.numero}</th>{boardDays.map(d=>{
 const entries=allBookings.filter(b=>b.corsia_id===l.id&&romeDay(b.inizio)===d&&lessonIds.has(b.lezione_id));
 return <td key={d}>{entries.length?entries.map(b=>{const lesson=visible.find(x=>x.id===b.lezione_id);return <Link key={b.id} className="lane-booking" href={`/gestionale/calendario-visivo/${b.lezione_id}`}><strong>{romeTime(b.inizio)}–{romeTime(b.fine)}</strong><span>{lesson?.titolo??'Lezione'}</span></Link>;}):<span className="tiny muted">Nessuna prenotazione</span>}</td>;
 })}</tr>)}</tbody></table></div>}
 </section>
 <div className="buttons"><Link href="/gestionale/moduli/piscine">Configura piscine</Link><Link href="/gestionale/moduli/corsie">Configura corsie</Link><Link href="/gestionale/corsi">Gestisci corsi e lezioni</Link></div>
 </>;
}
