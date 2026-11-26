import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import Emergenza from '@/components/Emergenza';
import {statoSingolo} from '@/lib/certificati';
import EditForm from '@/components/EditForm';
import CancelEditButton from '@/components/CancelEditButton';
import Cronologia from '@/components/Cronologia';
import {tutteLePagine} from '@/lib/pagine';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {UUID_RE,courseName,formatRome,ENROLLMENT_STATES,COURSE_STATES} from '@/lib/course-tools';
import {formatValue} from '@/lib/format';
import CourseLanePicker from '@/components/CourseLanePicker';
import LessonComposer from '@/components/LessonComposer';
import {addEnrollment,addInstructor,createLesson,deleteEdition,recordClassAttendance,removeInstructor,replaceResponsible,setCourseProgram,updateEdition,updateEnrollment} from '../actions';

type Person={id:string;nome:string;cognome:string};
type Enrollment={id:string;persona_id:string;edizione_id:string;stato:string;iscritta_il:string;sort_cognome:string;sort_nome:string};
type Assignment={id:string;persona_id:string;ruolo:string;sort_cognome:string;sort_nome:string};
type Lesson={id:string;titolo:string;inizio:string;fine:string;piscina_id:string|null;esercizi:string|null;materiale:string|null};
type Certificate={stato_certificato:string;persona_id:string;scade_il:string;idoneita_verificata:boolean};
type Qualification={persona_id:string;titolo:string;scade_il:string|null};
const message:Record<string,string>={
 direttore:'Il direttore non può essere iscritto come allievo dello stesso corso.',gia_iscritto:'Questo allievo ha già un’iscrizione a questa edizione.',
 creato:'Edizione creata. Ora puoi completare istruttori, iscrizioni e calendario.',salvato:'Edizione aggiornata.',
 iscritto:'Iscrizione aggiornata.',istruttore:'Assegnazione istruttore aggiornata.',lezione_creata:'Lezione e corsie salvate.',
 presenze_salvate:'Presenze salvate.',programma_salvato:'Programma associato al corso.',
 elimina_conferma:'Conferma esplicitamente la rimozione.',elimina_collegati:'Rimozione non consentita: il record è protetto o contiene dati collegati. Per una lezione o un corso puoi usare l’annullamento.',elimina_errore:'Impossibile rimuovere il corso. Verifica i permessi e la migrazione 0012.',
 vincolo:'Operazione non eseguita: controlla la capienza, i duplicati o le autorizzazioni.',
 stato:'Operazione non consentita nello stato attuale del corso.',adesione:'Servono adesione attiva e tessera attiva non scaduta nella stessa stagione.',eliminato:'Elemento rimosso.',database:'Rimozione non riuscita.',
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
 const {data:ed,error:editionError}=await supabase.from('edizioni_corsi').select('id,corso_id,stagione_id,nome,inizio,fine,massimo_partecipanti,costo_corso,stato,note,programma_versione_id,direttore_id,duplicato_storico').eq('id',id).maybeSingle();
 if(editionError||!ed)notFound();
 const [{data:cat},{data:season},{data:enrollData,error:enrollError},{data:teacherData,error:teacherError},{data:lessonData,error:lessonError},
  {data:allPeople},{data:qualifications},{data:pools},{data:lanes},{data:activeMemberships},{data:programVersions}]=await Promise.all([
  supabase.from('corsi').select('id,nome,tipo,livello').eq('id',ed.corso_id).maybeSingle(),
  supabase.from('stagioni').select('nome,attiva').eq('id',ed.stagione_id).maybeSingle(),
  tutteLePagine((da,a)=>supabase.from('gest_elenco_iscrizioni_corsi').select('id,persona_id,edizione_id,stato,iscritta_il,sort_cognome,sort_nome').eq('edizione_id',id).order('sort_cognome').order('sort_nome').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('gest_elenco_assegnazioni_istruttori').select('id,persona_id,ruolo,sort_cognome,sort_nome').eq('edizione_id',id).order('sort_cognome').order('sort_nome').order('id').range(da,a)),
  supabase.from('lezioni').select('id,titolo,inizio,fine,piscina_id,esercizi,materiale').eq('edizione_id',id).is('annullata_il',null).order('inizio',{ascending:true}).limit(201),
  tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').order('id').range(da,a)),
  supabase.from('qualifiche_istruttori').select('persona_id,titolo,scade_il').limit(500),
  supabase.from('piscine').select('id,nome').order('nome').limit(100),
  supabase.from('corsie').select('id,piscina_id,numero').limit(500),
  supabase.from('gest_soci_iscrivibili').select('persona_id,nome,cognome').eq('stagione_id',ed.stagione_id).order('cognome').order('nome').limit(1000),
  supabase.from('versioni_programmi').select('id,programma_id,versione,stato').eq('stato','approvato').limit(200)
 ]);
 const enrollments=(enrollData??[]) as Enrollment[];const assignments=(teacherData??[]) as Assignment[];
 const [{data:moduleCatalog},{data:lessonModLinks},{data:prices}]=await Promise.all([
  supabase.from('moduli_didattici').select('id,tipo,codice,titolo').order('pre_id'),
  supabase.from('lezione_moduli').select('lezione_id,modulo_id,ordine').in('lezione_id',(lessonData??[]).map(l=>l.id)).order('ordine'),
  supabase.from('listino_corsi').select('importo').order('importo')
 ]);
 const lessons=(lessonData??[]) as Lesson[];const roster=[...enrollments,...assignments].map(r=>({id:r.persona_id,cognome:r.sort_cognome??'',nome:r.sort_nome??''}));
 const eligiblePeople:Person[]=(activeMemberships??[]).map(r=>({id:r.persona_id,nome:r.nome,cognome:r.cognome}));
 const people=[...new Map([...roster,...eligiblePeople,...((allPeople??[]) as Person[])].map(r=>[r.id,r])).values()].sort((a,b)=>a.cognome.localeCompare(b.cognome,'it')||a.nome.localeCompare(b.nome,'it'));
 const instructors=(qualifications??[]) as Qualification[];const qualified=new Set(instructors.map(q=>q.persona_id));
 const currentIds=new Set(enrollments.map(e=>e.persona_id));const assignedIds=new Set(assignments.map(e=>e.persona_id));
 const activeIds=new Set((activeMemberships??[]).map(a=>a.persona_id));
 const candidates=people.filter(person=>person.id!==ed.direttore_id&&activeIds.has(person.id)&&!currentIds.has(person.id));
 const byPerson=(a:{persona_id:string},b:{persona_id:string})=>displayPerson(a.persona_id,people).localeCompare(displayPerson(b.persona_id,people),'it');
 enrollments.sort(byPerson);assignments.sort(byPerson);
 const teacherCandidates=people.filter(person=>qualified.has(person.id)&&!assignedIds.has(person.id));
 const confirmed=enrollments.filter(x=>x.stato==='iscritto');
 const {data:certs}=confirmed.length?await supabase.from('stato_certificati').select('persona_id,scade_il,idoneita_verificata,stato_certificato').in('persona_id',confirmed.map(x=>x.persona_id)).order('creato_il',{ascending:false}).limit(1000):{data:[]};
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
  <div className="page-intro course-header"><div><p className="eyebrow">Scheda corso · {cat?courseName(cat.tipo,cat.livello):'Attività'}</p><h1>{ed.nome}</h1><p>{season?.nome??'Stagione'} · {formatValue(ed.inizio)} – {formatValue(ed.fine)} · <strong>{ed.stato}</strong></p></div><div className="buttons"><Link className="button" href={`/comunicazioni/corsi/${id}`}>Mailing list · Scrivi ai corsisti</Link><Link className="button ghost" href="/gestionale/calendario-visivo">Calendario generale</Link></div></div>
  {msg&&message[msg]&&<p role="status" className={`notice ${['eliminato','creato','salvato','iscritto','istruttore','lezione_creata','presenze_salvate','programma_salvato'].includes(msg)?'success':'warning'}`}>{message[msg]}</p>}
  {(enrollError||teacherError||lessonError)&&<p className="notice error">Una sezione non è stata caricata correttamente. Verifica Supabase e le migrazioni.</p>}
  {ed.duplicato_storico&&<p className="notice warning">Possibile duplicato storico. Verifica le edizioni in archivio.</p>}
  <section className="panel"><h2>Direttore del corso</h2><p>{ed.direttore_id?displayPerson(ed.direttore_id,people):'Da assegnare'}</p>
  {([['responsabile','Istruttori'],['aiuto','Aiuto-istruttori']] as const).map(([role,label])=><div key={role}><h3>{label}</h3><p>{assignments.filter(a=>a.ruolo===role).map(a=>displayPerson(a.persona_id,people)).join(', ')||'Nessuna assegnazione'}</p></div>)}
  {enrollError?<p role="alert">Elenco iscritti non disponibile.</p>:<><h3>Iscritti ({confirmed.length})</h3><ul>{confirmed.map(e=><li key={e.id}>{e.sort_nome} {e.sort_cognome}</li>)}</ul></>}<a href="#allievi">Gestisci iscrizioni</a></section>
  <div className="course-overview">
   <div className="panel"><span className="k">Capienza</span><strong>{ed.massimo_partecipanti}</strong></div>
   <div className="panel"><span className="k">Richieste in attesa</span><strong>{enrollments.filter(x=>x.stato==='in_attesa').length}</strong></div>
   <div className="panel"><span className="k">Istruttori assegnati</span><strong>{assignments.length}</strong></div>
   <div className="panel"><span className="k">Lezioni</span><strong>{lessons.length}</strong></div>
  </div>
  <nav className="course-jump" aria-label="Sezioni del corso">{[['configurazione','Configurazione'],['istruttori','Istruttori'],['allievi','Allievi'],['didattica','Didattica'],['lezioni','Lezioni'],['presenze','Presenze']].map(([anchor,label])=><a key={anchor} href={`#${anchor}`}>{label}</a>)}</nav>
  <div className="course-sections">
   <Section id="configurazione" title="Configurazione dell'edizione"><EditForm action={updateEdition} className="stack"><input type="hidden" name="edizione_id" value={id}/>
    <div className="form-grid"><label>Direttore del corso<select name="direttore_id" required defaultValue={ed.direttore_id??''}><option value="">Da assegnare</option>{people.map(t=><option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}</select></label><label>Nome edizione<input name="nome" maxLength={160} required defaultValue={ed.nome}/></label><label>Stato<select name="stato" defaultValue={ed.stato}>{COURSE_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Capienza<input type="number" name="massimo_partecipanti" min={1} max={500} step={1} defaultValue={ed.massimo_partecipanti} required/></label><label>Stagione / periodo<input readOnly value={`${season?.nome??'—'} · ${ed.inizio} – ${ed.fine}`}/></label></div>
    <label>Costo del corso (€)<input name="costo_corso" type="number" list="listino-edit" step="0.01" min="0" required defaultValue={ed.costo_corso??''}/></label><datalist id="listino-edit">{prices?.map(p=><option key={p.importo} value={p.importo}/>)}</datalist>
    <label>Note<textarea name="note" maxLength={2000} rows={2} defaultValue={ed.note??''}/></label>
    <div className="actions"><button className="button">Salva modifiche</button><Link className="button ghost" href={`/gestionale/moduli/edizioni?edit=${id}`}>Modifica avanzata</Link><CancelEditButton/></div>
    <p className="tiny muted">Non è possibile ridurre la capienza sotto gli iscritti confermati. Conclusione e annullamento bloccano le nuove iscrizioni dalla scheda guidata.</p>
   </EditForm>
   <details className="calendar-danger"><summary className="button danger">Rimuovi</summary><form action={deleteEdition} className="stack">
    <input type="hidden" name="edizione_id" value={id}/><p>La rimozione è definitiva e possibile solo se non ci sono dati collegati. Per conservare lo storico usa lo stato Annullato.</p>
    <label><input type="checkbox" name="conferma" required/> Confermo la rimozione di {ed.nome}</label><button type="submit" className="button danger">Rimuovi</button>
   </form></details></Section>
   <Section id="istruttori" title="Istruttori assegnati">
    <div className="course-list">{assignments.map(a=><div key={a.id} className="course-list-row"><div><strong>{displayPerson(a.persona_id,people)}</strong><p className="tiny muted">{a.ruolo==='responsabile'?'Responsabile':'Aiuto istruttore'}</p></div>
    {a.ruolo==='aiuto'&&<details><summary>Modifica incarico</summary><form action={removeInstructor}><input type="hidden" name="edizione_id" value={id}/><input type="hidden" name="assegnazione_id" value={a.id}/><label><input type="checkbox" name="conferma" required/> Confermo la rimozione</label><button className="button danger" type="submit">Rimuovi</button></form></details>}</div>)}
    {!assignments.length&&<p className="muted">Non è ancora stato assegnato un istruttore.</p>}</div>
    {canEdit&&<form className="course-inline-form" action={addInstructor}><input type="hidden" name="edizione_id" value={id}/><label>Istruttore con qualifica registrata<select name="persona_id" required defaultValue=""><option value="">Seleziona...</option>{teacherCandidates.map(t=><option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}</select></label>
    <label>Ruolo<select name="ruolo" required><option value="aiuto">Aiuto istruttore</option><option value="responsabile">Responsabile</option></select></label><button className="button" disabled={!teacherCandidates.length}>Assegna</button></form>}
    {canEdit&&assignments.some(a=>a.ruolo==='responsabile')&&<form className="course-inline-form" action={replaceResponsible}><input type="hidden" name="edizione_id" value={id}/><label>Sostituisci il responsabile<select name="persona_id" required defaultValue=""><option value="">Scegli un nuovo responsabile</option>{teacherCandidates.map(t=><option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}</select></label><span className="tiny muted">Per scegliere un aiuto già assegnato, rimuovi prima il suo incarico di aiuto.</span><button className="button ghost" disabled={!teacherCandidates.length}>Sostituisci</button></form>}
    <p className="tiny muted">È ammesso un solo responsabile per edizione. La presenza di una qualifica in archivio non equivale alla verifica dell'abilitazione richiesta per la disciplina: confermala prima dell'assegnazione. <Link href="/gestionale/moduli/qualifiche">Gestisci qualifiche</Link>.</p>
   </Section>
   <Section id="allievi" title="Iscrizioni e allievi"><p className="muted tiny">Puoi iscrivere soltanto soci con adesione attiva e tessera valida per questa stagione. La capienza è controllata dal database.</p>
    <div className="panel table-panel"><table><thead><tr><th>Allievo</th><th>Adesione</th><th>Certificato</th><th>Stato iscrizione</th><th>Azioni</th></tr></thead><tbody>
    {enrollments.map(i=>{const cert=certificateList.find(x=>x.persona_id===i.persona_id);return <tr key={i.id}>
     <td>{displayPerson(i.persona_id,people)}</td><td>{activeIds.has(i.persona_id)?'Tesserato':'Non iscrivibile'}</td><td>{cert?statoSingolo(cert.stato_certificato)+' · '+cert.scade_il:'Documento mancante'}</td>
     <td>{i.stato.replaceAll('_',' ')}</td><td><div className="sc-row-actions"><Drawer title={'Stato iscrizione · '+displayPerson(i.persona_id,people)} trigger="Cambia stato"><ActionForm action={updateEnrollment} className="course-state-form"><input type="hidden" name="edizione_id" value={id}/><input type="hidden" name="iscrizione_id" value={i.id}/><select name="stato" defaultValue={i.stato} aria-label={`Stato iscrizione ${displayPerson(i.persona_id,people)}`}>{ENROLLMENT_STATES.map(s=><option key={s} value={s} disabled={s!==i.stato&&['in_attesa','iscritto'].includes(s)&&(!canEdit||!activeIds.has(i.persona_id))}>{s.replaceAll('_',' ')}</option>)}</select><button className="button ghost">Salva</button></ActionForm></Drawer><Link href={`/gestionale/soci/${i.persona_id}`}>Scheda socio</Link><Link href={`/gestionale/moduli/iscrizioni?edit=${i.id}`}>Modifica iscrizione</Link></div></td>
     </tr>;})}
    {!enrollments.length&&<tr><td colSpan={5} className="empty-cell">Nessuna iscrizione registrata.</td></tr>}
    </tbody></table></div>
    {canEdit&&<form action={addEnrollment} className="course-inline-form"><input type="hidden" name="edizione_id" value={id}/><label>Allievo<select name="persona_id" required defaultValue=""><option value="">Seleziona...</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.cognome} {x.nome} · tesserato</option>)}</select></label>
    <Emergenza/><input type="hidden" name="stato" value="iscritto"/><span>Stato: Iscritto</span><button className="button" disabled={!candidates.length}>Aggiungi allievo</button></form>}
    <p className="tiny muted">La scadenza del certificato è solo un'indicazione amministrativa. Verifica anche i requisiti didattici e le norme applicabili prima delle attività in acqua. Elenco fino a 1.000 soci idonei: per archivi più grandi usa i moduli generici.</p>
   </Section>
   <Section id="didattica" title="Programma didattico"><p className="muted tiny">Puoi collegare soltanto una versione approvata della stessa disciplina. Le versioni approvate sono protette dalle modifiche.</p>
    <form action={setCourseProgram} className="course-inline-form"><input type="hidden" name="edizione_id" value={id}/><label>Versione approvata<select name="programma_versione_id" defaultValue={ed.programma_versione_id??''}><option value="">Nessun programma associato</option>{matchingPrograms.map(v=><option key={v.id} value={v.id}>{programNames?.find(x=>x.id===v.programma_id)?.titolo??'Programma'} · v{v.versione}</option>)}</select></label><button className="button">Salva programma</button></form>
    <Link href="/gestionale/moduli/versioni">Gestisci programmi e versioni</Link>
   </Section>
   <Section id="lezioni" title="Calendario e nuove lezioni">
    <div className="course-list">{lessons.map(l=><div className="course-list-row" key={l.id}><div><strong>{l.titolo}</strong><p className="tiny muted">{formatRome(l.inizio)} – {formatRome(l.fine)}{l.piscina_id?` · ${pools?.find(x=>x.id===l.piscina_id)?.nome??'Piscina'}`:''}</p></div><div className="buttons"><Link href={`/gestionale/calendario-visivo/${l.id}`}>Modifica calendario</Link><a href={`?lezione=${l.id}#presenze`}>Presenze</a><Link href={`/gestionale/moduli/${"calendario"}?edit=${l.id}`}>Modifica</Link></div></div>)}
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
   <Section id="composizione" title="Composizione e stampe lezioni">
    {lessons.map(l=><details className="panel" key={l.id}><summary><strong>{l.titolo}</strong> · {formatRome(l.inizio)}</summary>
     <LessonComposer edizioneId={id} lezioneId={l.id} moduli={moduleCatalog??[]} initial={(lessonModLinks??[]).filter(x=>x.lezione_id===l.id).sort((a,b)=>a.ordine-b.ordine).map(x=>x.modulo_id)}/>
     <div className="buttons"><Link className="button ghost" href={`/gestionale/corsi/${id}/stampe?tipo=piscina&lezione=${l.id}`}>Stampa registro Piscina PDF</Link>
     <Link className="button ghost" href={`/gestionale/corsi/${id}/stampe?tipo=teoria&lezione=${l.id}`}>Stampa registro Teoria PDF</Link></div>
    </details>)}
    <Link className="button" href={`/gestionale/corsi/${id}/stampe?tipo=programma`}>Stampa programma completo PDF</Link>
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
  <Cronologia tipo="corso" id={id}/>
  {(lessons.length>200)&&<p className="notice warning">Alcuni elenchi sono stati limitati per sicurezza. Usa i moduli generici per consultare lo storico completo.</p>}
 </>;
}
