import Link from 'next/link';
import {requireBoard} from '@/lib/security';
import {salvaComponente,caricaBozza,avviaApprovazione,approvaVerbale} from './actions';
const roles=['Presidente','Vice Presidente','Segretaria','Tesoriere','Consigliere'];
// Tipi espliciti: le RPC senza tipi generati non devono propagare `any` nella UI.
type MembroCda = { persona_id:string; nome:string; cognome:string; carica:string; dal:string; al:string };
type VerbaleCda = { id:string; data_consiglio:string; oggetto:string; tipo:string; stato:string; percorso_docx:string|null; percorso_pdf:string|null };
type Progresso = { verbale_id:string; approvati:number; totali:number };
type Persona = { id:string; nome:string; cognome:string };
type Adesione = { id:string; persona_id:string; stato:string };
type Votante = { verbale_id:string; utente_id:string };
export default async function OrganiSociali({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user,isStaff}=await requireBoard();const {msg}=await searchParams;
 const [{data:members},{data:verbali},{data:progress},{data:people},{data:pending},{data:votanti}]=await Promise.all([
  supabase.rpc('cda_anagrafiche_membri'),
  supabase.from('cda_verbali').select('id,data_consiglio,oggetto,tipo,stato,percorso_docx,percorso_pdf').order('data_consiglio',{ascending:false}).limit(100),
  supabase.rpc('cda_progressi'),
  isStaff?supabase.from('persone').select('id,nome,cognome').order('cognome').limit(500):Promise.resolve({data:[]}),
  isStaff?supabase.from('adesioni').select('id,persona_id,stato').eq('stato','da_perfezionare').limit(250):Promise.resolve({data:[]}),
  supabase.from('cda_votanti').select('verbale_id,utente_id').eq('utente_id',user.id)
 ]);
 const membriCda=(Array.isArray(members)?members:[]) as MembroCda[];
 const verbaliCda=(Array.isArray(verbali)?verbali:[]) as VerbaleCda[];
 const votantiCda=(Array.isArray(votanti)?votanti:[]) as Votante[];
 const persone=(Array.isArray(people)?people:[]) as Persona[];
 const adesioni=(Array.isArray(pending)?pending:[]) as Adesione[];
 const progressi=(Array.isArray(progress)?progress:[]) as Progresso[];
 const eligible=new Set<string>(votantiCda.map(x=>x.verbale_id));
 const names=new Map<string,string>(persone.map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 const progressMap=new Map<string,Progresso>(progressi.map(x=>[x.verbale_id,x]));
 return <div className="container"><div className="page-intro"><p className="eyebrow">Organi Sociali</p><h1>Consiglio d'Amministrazione</h1>
 <p>Componenti in carica, deliberazioni, voto individuale e documenti riservati.</p><p><Link href="/organi-sociali/riepilogo">Apri riepilogo aggregato CdA</Link></p><Link href={isStaff?'/gestionale':'/smista'}>Torna indietro</Link></div>
 {msg&&<p className="notice">Esito operazione: {msg}. Se compare un errore, controlla la configurazione o l'esito della migrazione.</p>}
 <section className="panel"><h2>Componenti CdA</h2><div className="table-panel"><table><thead><tr><th>Socio</th><th>Carica</th><th>Quadriennio</th></tr></thead><tbody>
 {membriCda.map(m=><tr key={`${m.persona_id}-${m.dal}`}><td>{m.cognome} {m.nome}</td><td>{m.carica}</td><td>{m.dal} – {m.al}</td></tr>)}</tbody></table></div>
 {isStaff&&<form action={salvaComponente} className="stack"><h3>Registra componente</h3><div className="form-grid"><label>Socio<select name="persona_id" required><option value="">Seleziona...</option>{persone.map(p=><option value={p.id} key={p.id}>{p.cognome} {p.nome}</option>)}</select></label>
 <label>Carica<select name="carica">{roles.map(r=><option key={r}>{r}</option>)}</select></label><label>Inizio mandato<input name="dal" type="date" required/></label></div>
 <div className="form-actions"><button className="button">Registra</button><Link className="button ghost" href="/organi-sociali">Annulla / Torna indietro</Link></div></form>}
 </section>
 {isStaff&&<section className="panel"><h2>Nuova seduta e bozza Word</h2><form className="stack" action={caricaBozza}>
 <div className="form-grid"><label>Data CdA<input type="date" name="data_consiglio" required/></label><label>Oggetto<input name="oggetto" required maxLength={500}/></label>
 <label>Tipologia<select name="tipo"><option>Approvazione Adesioni Soci</option><option>Gestione Ordinaria / Altro</option><option>Misto</option></select></label>
 <label>Bozza DOCX (max 3 MB)<input type="file" name="documento" accept=".docx" required/></label></div>
 <p className="tiny muted">La conversione in PDF genera una trascrizione del testo Word; conserva sempre l'originale per l'impaginazione, tabelle e allegati.</p>
 <div className="form-actions"><button className="button">Carica bozza</button><Link className="button ghost" href="/organi-sociali">Annulla / Torna indietro</Link></div></form></section>}
 <section className="panel"><h2>Consigli d'Amministrazione e approvazioni</h2>
 {verbaliCda.map(v=>{const p=progressMap.get(v.id);return <article key={v.id} className="timeline-item"><h3>{v.data_consiglio} · {v.oggetto}</h3>
 <p>Tipo: {v.tipo} · Stato: <strong>{v.stato}</strong> · Voti: {p?.approvati??0}/{p?.totali??0}</p>
 <div className="buttons"><Link href={`/organi-sociali/documento/${v.id}?tipo=docx`}>Bozza Word</Link>
 {v.stato==='approvato'&&<Link href={`/organi-sociali/documento/${v.id}?tipo=pdf`}>PDF definitivo</Link>}</div>
 {v.stato==='bozza'&&isStaff&&<form action={avviaApprovazione} className="stack"><input type="hidden" name="verbale_id" value={v.id}/>
 {v.tipo!=='Gestione Ordinaria / Altro'&&<fieldset><legend>Adesioni da ammettere</legend>{adesioni.map(a=><label className="check-label" key={a.id}><input type="checkbox" name="adesione_id" value={a.id}/>{names.get(a.persona_id)??a.persona_id.slice(0,8)}</label>)}</fieldset>}
 <button className="button">Apri votazione (quorum completo)</button></form>}
 {v.stato==='in_approvazione'&&eligible.has(v.id)&&<form action={approvaVerbale}><input type="hidden" name="verbale_id" value={v.id}/><button className="button">Approvo il verbale</button></form>}
 </article>;})}
 {!verbaliCda.length&&<p>Nessun verbale registrato.</p>}</section></div>;
}
