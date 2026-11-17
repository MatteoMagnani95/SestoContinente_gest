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
export default async function EditLesson({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string}>}){
 const {id}=await params;const {msg}=await searchParams;
 if(!UUID_RE.test(id))notFound();
 const {supabase}=await requireStaff();
 const {data:admin}=await supabase.rpc('is_admin');
 const [{data:lesson,error},{data:bookings},{data:pools},{data:lanes}]=await Promise.all([
  supabase.from('lezioni').select('id,titolo,edizione_id,inizio,fine,piscina_id,esercizi,materiale,note,annullata_il').eq('id',id).maybeSingle(),
  supabase.from('prenotazioni_corsie').select('corsia_id').eq('lezione_id',id).eq('stato','confermata').limit(30),
  supabase.from('piscine').select('id,nome').order('nome').limit(100),
  supabase.from('corsie').select('id,piscina_id,numero').order('numero').limit(1000)
 ]);
 if(error||!lesson)notFound();
 const {data:edition}=await supabase.from('edizioni_corsi').select('id,nome,stato').eq('id',lesson.edizione_id).maybeSingle();
 const {count:attendances}=await supabase.from('presenze').select('id',{head:true,count:'exact'}).eq('lezione_id',id);
 const readOnly=Boolean(lesson.annullata_il)||Boolean(attendances)||!['programmato','attivo'].includes(edition?.stato??'');
 return <>
 <Link className="back-link" href="/gestionale/calendario-visivo">← Torna al calendario</Link>
 <div className="page-intro"><p className="eyebrow">Calendario · Gestione lezioni</p><h1>{lesson.titolo}</h1>
 <p>{formatRome(lesson.inizio)} – {formatRome(lesson.fine)} · <Link href={`/gestionale/corsi/${lesson.edizione_id}`}>{edition?.nome??'Corso'}</Link></p></div>
 {msg&&messages[msg]&&<p className={`notice ${['dati','conflitto','annullamento'].includes(msg)?'error':''}`}>{messages[msg]}</p>}
 {lesson.annullata_il&&<p className="notice">Questa lezione è stata annullata il {formatRome(lesson.annullata_il)}. Non è modificabile.</p>}
 {Boolean(attendances)&&!lesson.annullata_il&&<p className="notice">Sono state registrate presenze: la lezione non può essere spostata o annullata con questa procedura. Occorre una rettifica amministrativa.</p>}
 {!readOnly?<>
 <section className="panel"><h2>Modifica lezione e prenotazioni</h2><p>Le modifiche sono atomiche. Se una corsia è occupata, il sistema mantiene gli orari e le prenotazioni originali.</p>
 <form action={changeLesson} className="module-form">
 <input type="hidden" name="lezione_id" value={id}/>
 <div className="form-grid">
 <label>Titolo<input name="titolo" defaultValue={lesson.titolo} maxLength={160} required/></label>
 <label>Inizio (ora italiana)<input type="datetime-local" name="inizio" required defaultValue={datetimeForInput(lesson.inizio)}/></label>
 <label>Fine (ora italiana)<input type="datetime-local" name="fine" required defaultValue={datetimeForInput(lesson.fine)}/></label>
 </div>
 <CourseLanePicker key={lesson.id} pools={pools??[]} lanes={lanes??[]} initialPool={lesson.piscina_id??''} initialLanes={(bookings??[]).map(x=>x.corsia_id)}/>
 <div className="form-grid">
 <label>Esercizi<textarea name="esercizi" defaultValue={lesson.esercizi??''} maxLength={2000} rows={3}/></label>
 <label>Materiale<textarea name="materiale" defaultValue={lesson.materiale??''} maxLength={1000} rows={3}/></label>
 <label className="span-2">Note<textarea name="note" defaultValue={lesson.note??''} maxLength={2000} rows={3}/></label>
 </div>
 <div className="form-actions"><button className="button" type="submit">Salva orario e corsie</button></div>
 </form></section>
 <section className="panel calendar-danger"><h2>Annullamento lezione</h2><p>Annullando la lezione vengono liberate le corsie prenotate. La lezione resta nello storico senza essere cancellata.</p>
 <details><summary>Voglio annullare questa lezione</summary><form action={cancelLesson} className="calendar-cancel-form"><input type="hidden" name="lezione_id" value={id}/><button className="button danger" type="submit">Conferma annullamento</button></form></details>
 </section>
 </>:<section className="panel"><h2>Dettaglio lezione</h2><div className="info-row"><span>Corso</span><strong>{edition?.nome??'—'}</strong></div><div className="info-row"><span>Inizio</span><strong>{formatRome(lesson.inizio)}</strong></div><div className="info-row"><span>Fine</span><strong>{formatRome(lesson.fine)}</strong></div><div className="info-row"><span>Corsie prenotate</span><strong>{(bookings??[]).map(b=>(lanes??[]).find(l=>l.id===b.corsia_id)?.numero).filter(Boolean).join(', ')||'Nessuna'}</strong></div></section>}
 {admin===true&&<section className="panel"><h2>Rimozione record</h2><p>Rimuovi prima eventuali prenotazioni, presenze e moduli associati; in alternativa annulla la lezione per conservarne lo storico.</p><RemoveRecord moduleKey="calendario" id={id} back="calendario"/></section>}
 <p className="tiny muted">I cambi di orario generano notifiche interne ai partecipanti e agli istruttori assegnati tramite il trigger già presente in Supabase. L'invio email richiede configurazione separata.</p>
 </>;
}
