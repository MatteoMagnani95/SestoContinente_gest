import {singleSearchParams} from '@/lib/module-ui';
import {PageHeader,SectionHeader,ButtonLink,StatusBadge,Alert} from '@/components/ui/Primitives';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import EditForm from '@/components/EditForm';
import CalendarContextFields from '@/components/CalendarContextFields';
import CourseScheduleFields from '@/components/CourseScheduleFields';
import LessonComposer from '@/components/LessonComposer';
import {calendarContext,calendarHref,romeDay,romeTime} from '@/lib/calendar-tools';
import {tutteLePagine} from '@/lib/pagine';
import Link from 'next/link';
import RemoveRecord from '@/components/RemoveRecord';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {datetimeForInput} from '@/lib/format';
import {formatRome,UUID_RE} from '@/lib/course-tools';
import CourseLanePicker from '@/components/CourseLanePicker';
import {changeLesson,cancelLesson} from '../actions';

const messages:Record<string,string>={
 salvata:'Lezione e prenotazioni aggiornate correttamente.',
 dati:'Controlla titolo, data, ora, piscina e corsie.',
 conflitto:'Modifica non salvata: orario non valido, corsia occupata o lezione con presenze. Nessuna prenotazione precedente è stata persa.',
 annullamento:'Non è stato possibile annullare la lezione. Controlla che non abbia presenze registrate.',
 annullata:'Lezione annullata. Le sue prenotazioni sono state liberate; i dati restano nello storico.'
};
export default async function EditLesson({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string;giorno?:string;vista?:string;piscina?:string;edizione?:string;annullate?:string}>}){
 const {id}=await params;const query=singleSearchParams(await searchParams);const {msg}=query;const context=calendarContext(query);
 if(!UUID_RE.test(id))notFound();
 const {supabase}=await requireStaff();
 const {data:admin}=await supabase.rpc('is_admin');
 const [{data:lesson,error},{data:bookings,error:bookingError},{data:pools,error:poolError},{data:lanes,error:laneError}]=await Promise.all([
  supabase.from('lezioni').select('id,titolo,edizione_id,inizio,fine,piscina_id,esercizi,materiale,note,annullata_il').eq('id',id).maybeSingle(),
  tutteLePagine((da,a)=>supabase.from('prenotazioni_corsie').select('id,corsia_id,stato,inizio,fine').eq('lezione_id',id).order('inizio').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('piscine').select('id,nome,orari_disponibili,limitazioni').order('nome').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('corsie').select('id,piscina_id,numero,note').order('numero').order('id').range(da,a))
 ]);
 if(error)return <Alert tone="danger">Dettaglio della lezione non disponibile.</Alert>;if(!lesson)notFound();
 const {data:edition,error:editionError}=await supabase.from('edizioni_corsi').select('id,nome,stato').eq('id',lesson.edizione_id).maybeSingle();
 const {count:attendances,error:attendanceError}=await supabase.from('presenze').select('id',{head:true,count:'exact'}).eq('lezione_id',id);
 const failed=Boolean(bookingError||poolError||laneError||editionError||attendanceError);
 const readOnly=failed||attendances===null||Boolean(lesson.annullata_il)||Boolean(attendances)||!['programmato','attivo'].includes(edition?.stato??'');
 const [moduleCatalog,moduleLinks]=await Promise.all([
 tutteLePagine((da,a)=>supabase.from('moduli_didattici').select('id,tipo,codice,titolo').order('pre_id').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('lezione_moduli').select('modulo_id,ordine').eq('lezione_id',id).order('ordine').order('modulo_id').range(da,a))]);
 const activeBookings=(bookings??[]).filter(b=>b.stato==='confermata');
 const pool=pools?.find(p=>p.id===lesson.piscina_id);
 const returnContext=query.giorno?context:calendarContext({...query,giorno:romeDay(lesson.inizio)});
 return <>
 <Link className="back-link" href={calendarHref(returnContext)}>← Torna al calendario</Link>
 <PageHeader eyebrow="Calendario · Dettaglio lezione" title={lesson.titolo} description={formatRome(lesson.inizio)+' – '+formatRome(lesson.fine)} actions={<StatusBadge tone={lesson.annullata_il?'danger':'info'}>{lesson.annullata_il?'Annullata':lesson.piscina_id?'In piscina':'Senza piscina'}</StatusBadge>}/>
 {msg&&Object.hasOwn(messages,msg)&&<Alert announce tone={['salvata','annullata'].includes(msg)?'success':'warning'}>{messages[msg]}</Alert>}
 {failed&&<Alert tone="danger" announce>Non è stato possibile verificare tutti i dati e i vincoli. Le modifiche sono disabilitate.</Alert>}
 {lesson.annullata_il&&<Alert tone="warning">Annullata il {formatRome(lesson.annullata_il)}. Lo storico è conservato.</Alert>}
 {Boolean(attendances)&&!lesson.annullata_il&&<Alert tone="warning">Presenze già registrate: non è possibile spostare o annullare la lezione con questa procedura.</Alert>}
 <section className="sc-card"><SectionHeader title="Riepilogo lezione" actions={<ButtonLink href={'/gestionale/corsi/'+lesson.edizione_id+'?tab=lezioni&lezione='+id} variant="secondary">Apri corso</ButtonLink>}/>
 <div className="sc-course-content"><div><strong>Corso</strong><p>{edition?.nome??'Non disponibile'}</p></div><div><strong>Piscina</strong><p>{lesson.piscina_id?pool?.nome??'Non disponibile':'Senza piscina'}</p></div><div><strong>Presenze registrate</strong><p>{attendanceError?'Non disponibili':attendances??'Non disponibili'}</p></div><div><strong>Corsie confermate</strong><p>{bookingError||laneError?'Non disponibili':activeBookings.map(b=>lanes?.find(l=>l.id===b.corsia_id)?.numero??'Non disponibile').join(', ')||'Nessuna'}</p></div><div><strong>Esercizi</strong><p>{lesson.esercizi??'Non indicati'}</p></div><div><strong>Materiale</strong><p>{lesson.materiale??'Non indicato'}</p></div><div><strong>Note</strong><p>{lesson.note??'Non indicate'}</p></div></div>
 {!readOnly&&<Drawer title="Modifica lezione e prenotazioni" trigger="Modifica lezione e corsie" primary><EditForm action={changeLesson} className="stack"><CalendarContextFields context={returnContext}/><input type="hidden" name="lezione_id" value={id}/><label>Titolo<input name="titolo" defaultValue={lesson.titolo} maxLength={160} required/></label><CourseScheduleFields day={romeDay(lesson.inizio)} endDay={romeDay(lesson.fine)} startTime={romeTime(lesson.inizio)} endTime={romeTime(lesson.fine)}/><CourseLanePicker pools={pools??[]} lanes={lanes??[]} initialPool={lesson.piscina_id??''} initialLanes={activeBookings.map(x=>x.corsia_id)}/><label>Esercizi<textarea name="esercizi" defaultValue={lesson.esercizi??''} maxLength={2000} rows={3}/></label><label>Materiale<textarea name="materiale" defaultValue={lesson.materiale??''} maxLength={1000} rows={3}/></label><label>Note<textarea name="note" defaultValue={lesson.note??''} maxLength={2000} rows={3}/></label><button type="submit" className="button">Salva orario e corsie</button></EditForm></Drawer>}
 </section>
 <section className="sc-card"><SectionHeader title="Prenotazioni della lezione" description="Sono comprese le prenotazioni annullate ancora conservate nello storico."/>
 {bookingError||laneError?<Alert tone="warning">Prenotazioni non disponibili.</Alert>:!bookings?.length?<p>Nessuna prenotazione registrata.</p>:<div className="course-list">{bookings.map(b=><div className="course-list-row" key={b.id}><div><strong>Corsia {lanes?.find(l=>l.id===b.corsia_id)?.numero??'Non disponibile'}</strong><p>{formatRome(b.inizio)} – {formatRome(b.fine)}</p></div><StatusBadge tone={b.stato==='confermata'?'info':'neutral'}>{b.stato}</StatusBadge></div>)}</div>}
 <ButtonLink href={'/gestionale/moduli/prenotazioni?lezione='+id} variant="secondary">Archivio prenotazioni della lezione</ButtonLink></section>
 <section className="sc-card"><SectionHeader title="Didattica e registri"/>{moduleCatalog.error||moduleLinks.error?<Alert tone="warning">Moduli didattici non disponibili.</Alert>:<><ol>{(moduleLinks.data??[]).map((m,i)=><li key={m.modulo_id}>{moduleCatalog.data?.find(x=>x.id===m.modulo_id)?.titolo??'Modulo non disponibile'}</li>)}</ol>{!lesson.annullata_il&&<Drawer title="Componi moduli" trigger="Componi moduli"><LessonComposer edizioneId={lesson.edizione_id} lezioneId={id} moduli={moduleCatalog.data??[]} initial={(moduleLinks.data??[]).map(x=>x.modulo_id)}/></Drawer>}</>}
 <div className="buttons"><ButtonLink variant="secondary" href={'/gestionale/corsi/'+lesson.edizione_id+'?tab=presenze&lezione='+id}>Registro presenze</ButtonLink><ButtonLink variant="secondary" href={'/gestionale/corsi/'+lesson.edizione_id+'?tab=stampe'}>Documenti e stampe</ButtonLink></div></section>
 {!readOnly&&<section className="sc-card"><SectionHeader title="Annullamento lezione" description="L’annullamento libera le corsie e conserva la lezione nello storico."/><ConfirmDialog title={'Annulla lezione · '+lesson.titolo} trigger="Annulla lezione"><EditForm action={cancelLesson} className="stack"><CalendarContextFields context={returnContext}/><input type="hidden" name="lezione_id" value={id}/><p>Le prenotazioni confermate saranno annullate. Le registrazioni storiche restano disponibili.</p><label><input type="checkbox" name="conferma" required/> Confermo l’annullamento</label><button type="submit" className="sc-button sc-button-danger">Conferma annullamento</button></EditForm></ConfirmDialog></section>}
 {admin===true&&<section className="sc-card"><h2>Rimozione record</h2><p>Operazione separata e consentita soltanto in assenza di collegamenti. Preferisci l’annullamento per conservare lo storico.</p><RemoveRecord moduleKey="calendario" id={id} back="calendario" label={lesson.titolo}/></section>}
 <p className="tiny muted">Le variazioni di orario e gli annullamenti mantengono le notifiche interne esistenti. L’invio email richiede una configurazione separata.</p>
 </>;
}
