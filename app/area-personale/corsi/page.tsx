import Emergenza from '@/components/Emergenza';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {formatValue} from '@/lib/format';
import {askForCourse} from '../actions';
export default async function MyCourses({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();
 const {msg}=await searchParams;
 const [{data:links},{data:editions},{data:courses}]=await Promise.all([
 supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id),
 supabase.from('edizioni_corsi').select('id,nome,inizio,fine,stato,corso_id,stagione_id,massimo_partecipanti').order('inizio',{ascending:false}).limit(250),
 supabase.from('corsi').select('id,nome,tipo,livello').limit(250)
 ]);
 const ids=links?.map(l=>l.persona_id)??[];
 const {data:myEnrollments}=ids.length?await supabase.from('iscrizioni_corsi').select('edizione_id').in('persona_id',ids).in('stato',['iscritto','concluso']):{data:[]};
 const myCourseIds=[...new Set((myEnrollments??[]).map(x=>x.edizione_id))];
 const {data:didacticFiles}=myCourseIds.length?await supabase.from('documenti').select('id,nome,edizione_id').in('edizione_id',myCourseIds).eq('ambito','didattica').eq('visibilita','soci').limit(150):{data:[]};
 const [{data:people},{data:enrollments},{data:lessons}]=await Promise.all([
 ids.length?supabase.from('persone').select('id,nome,cognome').in('id',ids).order('cognome').order('nome'):Promise.resolve({data:[]}),
 ids.length?supabase.from('iscrizioni_corsi').select('id,persona_id,edizione_id,stato').in('persona_id',ids).limit(250):Promise.resolve({data:[]}),
 myCourseIds.length?supabase.from('lezioni').select('id,edizione_id,titolo,inizio,fine').in('edizione_id',myCourseIds).is('annullata_il',null).gte('inizio',new Date().toISOString()).order('inizio').limit(50):Promise.resolve({data:[]}),
 ]);
 const {data:eligible}=ids.length?await supabase.from('gest_soci_iscrivibili').select('persona_id,stagione_id').in('persona_id',ids):{data:[]};
 const fullName=(id:string)=>{const p=people?.find(x=>x.id===id);return `${p?.cognome??''} ${p?.nome??''}`;};
 const eligibleFor=(season:string,edition:string)=>people?.filter(p=>eligible?.some(x=>x.persona_id===p.id&&x.stagione_id===season)&&!enrollments?.some(i=>i.persona_id===p.id&&i.edizione_id===edition))??[];
 return <div className="container"><Link className="back-link" href="/area-personale">← Area personale</Link>
 <div className="page-intro"><p className="eyebrow">Attività</p><h1>I miei corsi</h1><p>Puoi richiedere l'iscrizione; la segreteria dovrà approvarla prima che sia confermata.</p></div>
 {msg==='direttore'&&<p role="alert">Il direttore non può essere allievo dello stesso corso.</p>}{msg==='duplicata'&&<p role="alert">Risulti già iscritto a questa edizione.</p>}{msg==='inviata'&&<div className="notice success">Richiesta d'iscrizione registrata.</div>}{msg==='errore'&&<div className="notice warning">Iscrizione non inviata: verifica adesione attiva e tesseramento valido e che il corso non sia già richiesto.</div>}
 <section className="panel"><h2>Iscrizioni attuali</h2><div className="panel table-panel"><table><thead><tr><th>Persona</th><th>Corso</th><th>Stato</th></tr></thead><tbody>
 {enrollments?.sort((a,b)=>fullName(a.persona_id).localeCompare(fullName(b.persona_id),'it')).map(i=><tr key={i.id}><td>{fullName(i.persona_id)}</td><td>{editions?.find(e=>e.id===i.edizione_id)?.nome??i.edizione_id.slice(0,8)}</td><td>{i.stato}</td></tr>)}
 {!enrollments?.length&&<tr><td colSpan={3}>Non risultano iscrizioni.</td></tr>}
 </tbody></table></div></section>
 <section className="panel"><h2>Richiedi iscrizione a un corso</h2><div className="cards">
 {editions?.filter(e=>['programmato','attivo'].includes(e.stato)).map(e=><article className="panel" key={e.id}><h3>{e.nome}</h3>
 <p className="muted">{courses?.find(c=>c.id===e.corso_id)?.tipo} · {formatValue(e.inizio)} – {formatValue(e.fine)}</p>
 <form action={askForCourse} className="stack"><input type="hidden" name="edizione_id" value={e.id}/><label>Iscrivi persona<select name="persona_id" required><option value="">Seleziona</option>{eligibleFor(e.stagione_id,e.id).map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}</select></label><Emergenza/><button className="button" disabled={!eligibleFor(e.stagione_id,e.id).length}>Richiedi iscrizione</button></form></article>)}
 </div></section>
 <section className="panel"><h2>Materiali didattici scaricabili</h2>{(didacticFiles??[]).map(doc=><p key={doc.id}><Link href={`/documenti/${doc.id}`} prefetch={false}>{doc.nome}</Link> · {editions?.find(e=>e.id===doc.edizione_id)?.nome??'Corso iscritto'}</p>)}{!didacticFiles?.length&&<p className="muted">Nessun materiale didattico pubblicato per i tuoi corsi.</p>}</section>
 <section className="panel"><h2>Prossime lezioni</h2>{lessons?.map(l=><p key={l.id}><strong>{editions?.find(e=>e.id===l.edizione_id)?.nome??'Corso'}</strong> · {formatValue(l.inizio)} · {l.titolo}</p>)}{!lessons?.length&&<p className="muted">Nessuna lezione visibile.</p>}</section>
 </div>;
}
