import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireUser} from '@/lib/security';
import {formatValue} from '@/lib/format';
import {recordAttendance} from './actions';
export default async function Instructor({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();
 const {data:role}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','istruttore').maybeSingle();
 if(!role)redirect('/?msg=permessi');
 const {msg}=await searchParams;
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const ids=links?.map(l=>l.persona_id)??[];
 const {data:assignments}=ids.length?await supabase.from('assegnazioni_istruttori').select('edizione_id,persona_id,ruolo').in('persona_id',ids):{data:[]};
 const editionIds=[...new Set(assignments?.map(a=>a.edizione_id)??[])];
 const [{data:editions},{data:lessons},{data:students},{data:gear}]=await Promise.all([
 editionIds.length?supabase.from('edizioni_corsi').select('id,nome,inizio,fine,stato').in('id',editionIds):Promise.resolve({data:[]}),
 editionIds.length?supabase.from('lezioni').select('id,edizione_id,titolo,inizio,fine,materiale').in('edizione_id',editionIds).order('inizio',{ascending:true}).limit(150):Promise.resolve({data:[]}),
 editionIds.length?supabase.from('iscrizioni_corsi').select('edizione_id,persona_id,stato').in('edizione_id',editionIds).eq('stato','iscritto').limit(300):Promise.resolve({data:[]}),
 supabase.from('attrezzature').select('id,codice,categoria,stato,prossima_revisione').limit(50)
 ]);
 const allIds=[...new Set(students?.map(s=>s.persona_id)??[])];
 const {data:people}=allIds.length?await supabase.from('persone').select('id,nome,cognome').in('id',allIds):{data:[]};
 // I nomi degli iscritti assegnati possono essere consultati solo attraverso
 // una policy dedicata nel database (nessun accesso generico alle anagrafiche).
 return <div className="container"><div className="page-intro"><p className="eyebrow">Area istruttore</p><h1>I miei corsi</h1><p>Calendario, materiali e registrazione delle presenze per le lezioni assegnate.</p></div>
 {msg==='ok'&&<p className="notice success">Presenza registrata.</p>}{msg==='errore'&&<p className="notice error">Operazione non consentita. Verifica assegnazione e iscrizione dell'allievo.</p>}
 <div className="cards">{editions?.map(e=><article className="panel" key={e.id}><h2>{e.nome}</h2><p>{formatValue(e.inizio)} – {formatValue(e.fine)}</p><p>Stato: {e.stato}</p><p>Allievi iscritti: {students?.filter(s=>s.edizione_id===e.id).length??0}</p></article>)}
 {!editions?.length&&<div className="notice">Non risulti assegnato ad alcuna edizione di corso. Chiedi alla segreteria di collegare la tua anagrafica e assegnare il ruolo di istruttore.</div>}</div>
 <section className="panel"><h2>Lezioni e presenze</h2>{lessons?.map(l=><div key={l.id} className="timeline-item"><h3>{formatValue(l.inizio)} · {l.titolo}</h3><p className="muted">Materiale: {l.materiale||'Non specificato'}</p>
 {students?.filter(s=>s.edizione_id===l.edizione_id).map(s=><form action={recordAttendance} key={`${l.id}-${s.persona_id}`} className="attendance-line">
 <input type="hidden" name="lezione_id" value={l.id}/><input type="hidden" name="persona_id" value={s.persona_id}/>
 <strong>{people?.find(p=>p.id===s.persona_id)?.cognome??s.persona_id.slice(0,8)} {people?.find(p=>p.id===s.persona_id)?.nome??''}</strong>
 <select name="presente"><option value="si">Presente</option><option value="no">Assente</option></select>
 <input type="text" name="nota_didattica" placeholder="Nota didattica (facoltativa)"/>
 <button type="submit" className="button ghost">Registra</button></form>)}
 </div>)}{!lessons?.length&&<p className="muted">Nessuna lezione associata.</p>}</section>
 <section className="panel"><h2>Attrezzature</h2><p className="muted">Consulta lo stato dell'inventario; la manutenzione è gestita dalla segreteria.</p><p>{gear?.length??0} attrezzature disponibili nella vista.</p><Link href="/documenti">Documenti didattici autorizzati</Link></section>
 </div>;
}
