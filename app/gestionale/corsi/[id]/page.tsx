import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {UUID_RE,courseName,formatRome,ENROLLMENT_STATES,COURSE_STATES} from '@/lib/course-tools';
import {formatValue} from '@/lib/format';
import CourseLanePicker from '@/components/CourseLanePicker';
import {addEnrollment,addInstructor,createLesson,recordClassAttendance,removeInstructor,replaceResponsible,setCourseProgram,updateEdition,updateEnrollment} from '../actions';

type Person={id:string;nome:string;cognome:string};
type Enrollment={id:string;persona_id:string;edizione_id:string;stato:string;iscritta_il:string};
type Assignment={id:string;persona_id:string;ruolo:string};
type Lesson={id:string;titolo:string;inizio:string;fine:string;piscina_id:string|null;esercizi:string|null;materiale:string|null};
type Certificate={persona_id:string;scade_il:string;idoneita_verificata:boolean};
type Qualification={persona_id:string;titolo:string;scade_il:string|null};
const message:Record<string,string>={
 creato:'Edizione creata. Ora puoi completare istruttori, iscrizioni e calendario.',salvato:'Edizione aggiornata.',
 iscritto:'Iscrizione aggiornata.',istruttore:'Assegnazione istruttore aggiornata.',lezione_creata:'Lezione e corsie salvate.',
 presenze_salvate:'Presenze salvate.',programma_salvato:'Programma associato al corso.',
 vincolo:'Operazione non eseguita: controlla la capienza, i duplicati o le autorizzazioni.',
 stato:'Operazione non consentita nello stato attuale del corso.',adesione:'Per confermare serve un’adesione attiva alla stessa stagione.',
 iscrizione:'Impossibile salvare l’iscrizione: controlla i duplicati e la capienza.',
 assegnazione:'Impossibile assegnare: potrebbe esserci già un responsabile o lo stesso istruttore.',
 qualifica:'L’istruttore selezionato non ha qualifiche registrate. Completa prima la sua scheda.',
 responsabile:'Il responsabile non può essere rimosso direttamente: puoi sostituirlo dal modulo istruttori.',
 lezione:'La lezione non è stata creata: verifica date, ora italiana (anche cambio ora), piscina e conflitti fra corsie. È necessaria la migrazione 0004.',
 presenze:'Presenze non salvate: verifica iscrizioni e autorizzazioni.',programma:'Scegli soltanto versioni approvate della stessa disciplina.'
};
function displayPerson(id:string,people:Person[]){const p=people.find(x=>x.id===id);return p?`${p.cognome} ${p.nome}`:'Anagrafica non trovata';}
function Section({id,title,children}:{id:string;title:string;children:React.ReactNode}){return <section className="panel course-section" id={id}><h2>{title}</h2>{children}</section>;}

export default async function EditionDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string;lezione?:string}>}){
 const {id}=await params;if(!UUID_RE.test(id))notFound();
 const {supabase}=await requireStaff();const p=await searchParams;
 const {data:ed,error:editionError}=await supabase.from('edizioni_corsi').select('id,corso_id,stagione_id,nome,inizio,fine,massimo_partecipanti,stato,note,programma_versione_id').eq('id',id).maybeSingle();
 if(editionError||!ed)notFound();
 const [{data:cat},{data:season},{data:enrollData,error:enrollError},{data:teacherData,error:teacherError},{data:lessonData,error:lessonError},
  {data:allPeople},{data:qualifications},{data:pools},{data:lanes},{data:activeMemberships},{data:programVersions}]=await Promise.all([
  supabase.from('corsi').select('id,nome,tipo,livello').eq('id',ed.corso_id).maybeSingle(),
  supabase.from('stagioni').select('nome,attiva').eq('id',ed.stagione_id).maybeSingle(),
  supabase.from('iscrizioni_corsi').select('id,persona_id,edizione_id,stato,iscritta_il').eq('edizione_id',id).order('iscritta_il',{ascending:false}).limit(501),
  supabase.from('assegnazioni_istruttori').select('id,persona_id,ruolo').eq('edizione_id',id).limit(101),
  supabase.from('lezioni').select('id,titolo,inizio,fine,piscina_id,esercizi,materiale').eq('edizione_id',id).order('inizio',{ascending:true}).limit(201),
  supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').limit(500),
  supabase.from('qualifiche_istruttori').select('persona_id,titolo,scade_il').limit(500),
  supabase.from('piscine').select('id,nome').order('nome').limit(100),
  supabase.from('corsie').select('id,piscina_id,numero').limit(500),
  supabase.from('adesioni').select('persona_id').eq('stagione_id',ed.stagione_id).eq('stato','attiva').limit(1000),
  supabase.from('versioni_programmi').select('id,programma_id,versione,stato').eq('stato','approvato').limit(200)
 ]);
 const enrollments=(enrollData??[]) as Enrollment[];const assignments=(teacherData??[]) as Assignment[];
 const lessons=(lessonData??[]) as Lesson[];const people=(allPeople??[]) as Person[];
 const instructors=(qualifications??[]) as Qualification[];const qualified=new Set(instructors.map(q=>q.persona_id));
 const currentIds=new Set(enrollments.map(e=>e.persona_id));const assignedIds=new Set(assignments.map(e=>e.persona_id));
 const activeIds=new Set((activeMemberships??[]).map(a=>a.persona_id));
 const candidates=people.filter(person=>!currentIds.has(person.id));
 const teacherCandidates=people.filter(person=>qualified.has(person.id)&&!assignedIds.has(person.id));
 const confirmed=enrollments.filter(x=>x.stato==='iscritto');
 const {data:certs}=confirmed.length?await supabase.from('certificati_medici').select('persona_id,scade_il,idoneita_verificata').in('persona_id',confirmed.map(x=>x.persona_id)).order('scade_il',{ascending:false}).limit(500):{data:[]};
 const certificateList=(certs??[]) as Certificate[];
 const selected=lessons.find(l=>l.id===p.lezione)??lessons[0];
 const {data:attendance}=selected?await supabase.from('presenze').select('persona_id,presente').eq('lezione_id',selected.id).limit(500):{data:[]};
 const registered=new Map((attendance??[]).map(a=>[a.persona_id,a.presente]));
 const {data:programNames}=await supabase.from('programmi_didattici').select('id,titolo,tipo').limit(200);
 const matchingPrograms=(programVersions??[]).filter(v=>programNames?.some(q=>q.id===v.programma_id&&q.tipo===cat?.tipo));
 const canEdit=!['concluso','annullato'].includes(ed.stato);
 const {msg}=p;
 return <>
  <Link className="back-link" href="/gestionale/corsi">← Tutte le edizioni</Link>
  <div className="page-intro course-header"><div><p className="eyebrow">Scheda corso · {cat?courseName(cat.tipo,cat.livello):'Attività'}</p><h1>{ed.nome}</h1><p>{season?.nome??'Stagione'} · {formatValue(ed.inizio)} – {formatValue(ed.fine)} · <strong>{ed.stato}</strong></p></div><Link className="button ghost" href="/gestionale/calendario-visivo">Calendario generale</Link></div>
  {msg&&message[msg]&&<p role="status" className={`notice ${['creato','salvato','iscritto','istruttore','lezione_creata','presenze_salvate','programma_salvato'].includes(msg)?'success':'warning'}`}>{message[msg]}</p>}
  {(enrollError||teacherError||lessonError)&&<p className="notice error">Una sezione non è stata caricata correttamente. Verifica Supabase e le migrazioni.</p>}
  <div className="course-overview">
   <div className="panel"><span className="k">Allievi confermati</span><strong>{confirmed.length} / {ed.massimo_partecipanti}</strong></div>
   <div className="panel"><span className="k">Richieste in attesa</span><strong>{enrollments.filter(x=>x.stato==='in_attesa').length}</strong></div>
   <div className="panel"><span className="k">Istruttori assegnati</span><strong>{assignments.length}</strong></div>
   <div className="panel"><span className="k">Lezioni</span><strong>{lessons.length}</strong></div>
  </div>
  <nav className="course-jump" aria-label="Sezioni del corso">{[['configurazione','Configurazione'],['istruttori','Istruttori'],['allievi','Allievi'],['didattica','Didattica'],['lezioni','Lezioni'],['presenze','Presenze']].map(([anchor,label])=><a key={anchor} href={`#${anchor}`}>{label}</a>)}</nav>
  <div className="course-sections">
   <Section id="configurazione" title="Configurazione dell'edizione"><form action={updateEdition} className="stack"><input type="hidden" name="edizione_id" value={id}/>
    <div className="form-grid"><label>Nome edizione<input name="nome" maxLength={160} required defaultValue={ed.nome}/></label><label>Stato<select name="stato" defaultValue={ed.stato}>{COURSE_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Capienza<input type="number" name="massimo_partecipanti" min={1} max={500} step={1} defaultValue={ed.massimo_partecipanti} required/></label><label>Stagione / periodo<input readOnly value={`${season?.nome??'—'} · ${ed.inizio} – ${ed.fine}`}/></label></div>
    <label>Note<textarea name="note" maxLength={2000} rows={2} defaultValue={ed.note??''}/></label>
    <div className="actions"><button className="button">Salva modifiche</button><Link className="button ghost" href="/gestionale/moduli/edizioni">Modifica avanzata</Link></div>
    <p className="tiny muted">Non è possibile ridurre la capienza sotto gli iscritti confermati. Conclusione e annullamento bloccano le nuove iscrizioni dalla scheda guidata.</p>
   </form></Section>
   <Section id="istruttori" title="Istruttori assegnati">
    <div className="course-list">{assignments.map(a=><div key={a.id} className="course-list-row"><div><strong>{displayPerson(a.persona_id,people)}</strong><p className="tiny muted">{a.ruolo==='responsabile'?'Responsabile':'Aiuto istruttore'}</p></div>
    {a.ruolo==='aiuto'&&<form action={removeInstructor}><input type="hidden" name="edizione_id" value={id}/><input type="hidden" name="assegnazione_id" value={a.id}/><button className="button ghost" type="submit">Rimuovi</button></form>}</div>)}
    {!assignments.length&&<p className="muted">Non è ancora stato assegnato un istruttore.</p>}</div>
    {canEdit&&<form className="course-inline-form" action={addInstructor}><input type="hidden" name="edizione_id" value={id}/><label>Istruttore con qualifica registrata<select name="persona_id" required defaultValue=""><option value="">Seleziona...</option>{teacherCandidates.map(t=><option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}</select></label>
    <label>Ruolo<select name="ruolo" required><option value="aiuto">Aiuto istruttore</option><option value="responsabile">Responsabile</option></select></label><button className="button" disabled={!teacherCandidates.length}>Assegna</button></form>}
    {canEdit&&assignments.some(a=>a.ruolo==='responsabile')&&<form className="course-inline-form" action={replaceResponsible}><input type="hidden" name="edizione_id" value={id}/><label>Sostituisci il responsabile<select name="persona_id" required defaultValue=""><option value="">Scegli un nuovo responsabile</option>{teacherCandidates.map(t=><option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}</select></label><span className="tiny muted">Per scegliere un aiuto già assegnato, rimuovi prima il suo incarico di aiuto.</span><button className="button ghost" disabled={!teacherCandidates.length}>Sostituisci</button></form>}
    <p className="tiny muted">È ammesso un solo responsabile per edizione. La presenza di una qualifica in archivio non equivale alla verifica dell'abilitazione richiesta per la disciplina: confermala prima dell'assegnazione. <Link href="/gestionale/moduli/qualifiche">Gestisci qualifiche</Link>.</p>
   </Section>
   <Section id="allievi" title="Iscrizioni e allievi"><p className="muted tiny">Puoi registrare una richiesta in attesa o confermare un allievo con adesione attiva per questa stagione. La capienza è controllata dal database.</p>
    <div className="panel table-panel"><table><thead><tr><th>Allievo</th><th>Adesione</th><th>Certificato</th><th>Stato iscrizione</th><th>Apri</th></tr></thead><tbody>
    {enrollments.map(i=>{const cert=certificateList.find(x=>x.persona_id===i.persona_id);const valid=cert?.idoneita_verificata&&cert.scade_il>=new Date().toISOString().slice(0,10);return <tr key={i.id}>
     <td>{displayPerson(i.persona_id,people)}</td><td>{activeIds.has(i.persona_id)?'Attiva':'Da verificare'}</td><td>{cert?(valid?'Verificato':'Da verificare'):'Non presente'}</td>
     <td><form action={updateEnrollment} className="course-state-form"><input type="hidden" name="edizione_id" value={id}/><input type="hidden" name="iscrizione_id" value={i.id}/><select name="stato" defaultValue={i.stato} aria-label={`Stato iscrizione ${displayPerson(i.persona_id,people)}`}>{ENROLLMENT_STATES.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select><button className="button ghost">Salva</button></form></td>
     <td><Link href={`/gestionale/soci/${i.persona_id}`}>Scheda</Link></td>
     </tr>;})}
    {!enrollments.length&&<tr><td colSpan={5} className="empty-cell">Nessuna iscrizione registrata.</td></tr>}
    </tbody></table></div>
    {canEdit&&<form action={addEnrollment} className="course-inline-form"><input type="hidden" name="edizione_id" value={id}/><label>Allievo<select name="persona_id" required defaultValue=""><option value="">Seleziona...</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.cognome} {x.nome}{activeIds.has(x.id)?' · adesione attiva':''}</option>)}</select></label>
    <label>Stato iniziale<select name="stato"><option value="in_attesa">In attesa</option><option value="iscritto">Iscritto (adesione attiva)</option></select></label><button className="button" disabled={!candidates.length}>Aggiungi allievo</button></form>}
    <p className="tiny muted">La scadenza del certificato è solo un'indicazione amministrativa. Verifica anche i requisiti didattici e le norme applicabili prima delle attività in acqua. Elenco selezionabile fino a 500 anagrafiche: per archivi più grandi usa i moduli generici.</p>
   </Section>
   <Section id="didattica" title="Programma didattico"><p className="muted tiny">Puoi collegare soltanto una versione approvata della stessa disciplina. Le versioni approvate sono protette dalle modifiche.</p>
    <form action={setCourseProgram} className="course-inline-form"><input type="hidden" name="edizione_id" value={id}/><label>Versione approvata<select name="programma_versione_id" defaultValue={ed.programma_versione_id??''}><option value="">Nessun programma associato</option>{matchingPrograms.map(v=><option key={v.id} value={v.id}>{programNames?.find(x=>x.id===v.programma_id)?.titolo??'Programma'} · v{v.versione}</option>)}</select></label><button className="button">Salva programma</button></form>
    <Link href="/gestionale/moduli/versioni">Gestisci programmi e versioni</Link>
   </Section>
   <Section id="lezioni" title="Calendario e nuove lezioni">
    <div className="course-list">{lessons.map(l=><div className="course-list-row" key={l.id}><div><strong>{l.titolo}</strong><p className="tiny muted">{formatRome(l.inizio)} – {formatRome(l.fine)}{l.piscina_id?` · ${pools?.find(x=>x.id===l.piscina_id)?.nome??'Piscina'}`:''}</p></div><a href={`?lezione=${l.id}#presenze`}>Presenze</a></div>)}
    {!lessons.length&&<p className="muted">Nessuna lezione pianificata.</p>}</div>
    {canEdit&&<form action={createLesson} className="stack course-lesson-form"><input type="hidden" name="edizione_id" value={id}/>
    <h3>Programma una lezione</h3><label>Titolo<input name="titolo" maxLength={160} required placeholder="Es. Esercitazione ARA in piscina"/></label>
    <div className="form-grid"><label>Inizio (ora italiana)<input name="inizio" type="datetime-local" required/></label><label>Fine (ora italiana)<input name="fine" type="datetime-local" required/></label></div>
    <CourseLanePicker pools={(pools??[]).map(x=>({id:x.id,nome:x.nome}))} lanes={(lanes??[]).map(x=>({id:x.id,piscina_id:x.piscina_id,numero:x.numero}))}/>
    <label>Esercizi<textarea name="esercizi" rows={2} maxLength={2000}/></label><label>Materiale necessario<textarea name="materiale" rows={2} maxLength={1000}/></label>
    <button className="button">Crea lezione e prenota corsie</button>
    <p className="tiny muted">L'orario è interpretato come Europe/Rome; orari ambigui o inesistenti durante il cambio dell'ora saranno rifiutati. Conflitti di prenotazione annullano l'intera creazione.</p>
    </form>}
    <div className="buttons"><Link href="/gestionale/moduli/calendario">Modifica avanzata lezioni</Link><Link href="/gestionale/moduli/prenotazioni">Gestisci prenotazioni</Link></div>
   </Section>
   <Section id="presenze" title="Registro presenze">
    {!selected?<p className="muted">Crea una lezione per iniziare a registrare le presenze.</p>:<>
     <form method="get" className="course-lesson-picker"><label>Seleziona lezione<select name="lezione" defaultValue={selected.id}>{lessons.map(l=><option key={l.id} value={l.id}>{formatRome(l.inizio)} · {l.titolo}</option>)}</select></label><button className="button ghost" formAction={`/gestionale/corsi/${id}#presenze`}>Apri registro</button></form>
     <form action={recordClassAttendance} className="stack"><input type="hidden" name="edizione_id" value={id}/><input type="hidden" name="lezione_id" value={selected.id}/>
      <div className="panel table-panel"><table><thead><tr><th>Allievo</th><th>Presenza</th></tr></thead><tbody>
       {enrollments.filter(x=>['iscritto','concluso'].includes(x.stato)).map(e=><tr key={e.id}><td>{displayPerson(e.persona_id,people)}</td><td><select name={`pres_${e.persona_id}`} defaultValue={registered.get(e.persona_id)===true?'si':registered.get(e.persona_id)===false?'no':''} aria-label={`Presenza ${displayPerson(e.persona_id,people)}`}>
        <option value="">Non registrata</option><option value="si">Presente</option><option value="no">Assente</option></select></td></tr>)}
       {!confirmed.length&&<tr><td colSpan={2} className="empty-cell">Nessun allievo confermato.</td></tr>}
      </tbody></table></div><button className="button">Salva presenze</button>
     </form></>}
    <p className="tiny muted">Solo gli allievi iscritti o che hanno concluso il corso possono essere registrati. Le note individuali sono disponibili nel modulo presenze avanzato.</p>
   </Section>
  </div>
  {(enrollments.length>500||lessons.length>200||assignments.length>100)&&<p className="notice warning">Alcuni elenchi sono stati limitati per sicurezza. Usa i moduli generici per consultare lo storico completo.</p>}
 </>;
}
