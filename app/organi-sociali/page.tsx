import {dataOra} from '@/lib/scelte';
import Cronologia from '@/components/Cronologia';
import EditForm from '@/components/EditForm';
import CancelEditButton from '@/components/CancelEditButton';
import {tutteLePagine} from '@/lib/pagine';
import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {requireBoard} from '@/lib/security';
import {salvaComponente,caricaBozza,avviaApprovazione,approvaVerbale,riprovaFinalizzazione,sostituisciVerbale} from './actions';
const roles=['Presidente','Vice Presidente','Segretaria','Tesoriere','Consigliere'];
// Tipi espliciti: le RPC senza tipi generati non devono propagare `any` nella UI.
type MembroCda = { persona_id:string; nome:string; cognome:string; carica:string; dal:string; al:string };
type VerbaleCda = { id:string; data_consiglio:string; oggetto:string; tipo:string; stato:string; percorso_docx:string|null; percorso_pdf:string|null;precedente_id:string|null };
type Progresso = { verbale_id:string; approvati:number; totali:number };
type Persona = { id:string; nome:string; cognome:string };
type Adesione = { id:string; persona_id:string; stato:string };
type Votante = { verbale_id:string; utente_id:string };
export default async function OrganiSociali({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user,isStaff}=await requireBoard();const {msg}=await searchParams;
 const [{data:members},{data:verbali},{data:progress},{data:people},{data:pending},{data:votanti}]=await Promise.all([
  supabase.rpc('cda_anagrafiche_membri'),
  tutteLePagine((da,a)=>supabase.from('cda_verbali').select('id,data_consiglio,oggetto,tipo,stato,percorso_docx,percorso_pdf,precedente_id').is('rimosso_il',null).order('data_consiglio',{ascending:false}).order('id').range(da,a)),
  supabase.rpc('cda_progressi'),
  isStaff?supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').limit(500):Promise.resolve({data:[]}),
  isStaff?supabase.from('adesioni').select('id,persona_id,stato').eq('stato','da_perfezionare').limit(250):Promise.resolve({data:[]}),
  supabase.from('cda_votanti').select('verbale_id,utente_id').eq('utente_id',user.id)
 ]);
 const membriCda=((Array.isArray(members)?members:[]) as MembroCda[]).sort((a,b)=>a.cognome.localeCompare(b.cognome,'it')||a.nome.localeCompare(b.nome,'it'));
 const {data:memberIds}=isStaff?await supabase.from('cda_componenti').select('id,persona_id,dal').limit(1000):{data:[]};
 const verbaliCda=(Array.isArray(verbali)?verbali:[]) as VerbaleCda[];
 const precedenti=new Set(verbaliCda.map(v=>v.precedente_id).filter(Boolean));
 const votantiCda=(Array.isArray(votanti)?votanti:[]) as Votante[];
 const persone=(Array.isArray(people)?people:[]) as Persona[];
 const adesioni=(Array.isArray(pending)?pending:[]) as Adesione[];
 const progressi=(Array.isArray(progress)?progress:[]) as Progresso[];
 const {data:giaFirmati}=await supabase.from('cda_voti').select('verbale_id').eq('utente_id',user.id);
 const firmati=new Set(giaFirmati?.map(v=>v.verbale_id));
 const eligible=new Set<string>(votantiCda.filter(v=>!firmati.has(v.verbale_id)).map(x=>x.verbale_id));
 const names=new Map<string,string>(persone.map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 adesioni.sort((a,b)=>(names.get(a.persona_id)??'').localeCompare(names.get(b.persona_id)??'','it'));
 const progressMap=new Map<string,Progresso>(progressi.map(x=>[x.verbale_id,x]));
 return <div className="container"><div className="page-intro"><p className="eyebrow">Organi Sociali</p><h1>Consiglio d'Amministrazione</h1>
 <p>Componenti in carica, deliberazioni, voto individuale e documenti riservati.</p><div className="buttons"><Link className="button" href="/organi-sociali/archivio">Archivio verbali e PDF</Link><Link className="button ghost" href="/organi-sociali/riepilogo">Riepilogo aggregato CdA</Link></div><Link href={isStaff?'/gestionale':'/smista'}>Torna indietro</Link></div>
 {msg&&<p className="notice">{msg==='lettura'?'Apri la versione corrente del verbale prima di approvare.':msg==='voto_ok'?'Approvazione registrata. Mancano altre conferme.':msg==='approvato'?'Verbale approvato.':msg==='avviata'?'Versione sottoposta al Consiglio.':'Esito operazione: '+msg}</p>}
 <section className="panel"><h2>Componenti CdA</h2><div className="table-panel"><table><thead><tr><th>Socio</th><th>Carica</th><th>Quadriennio</th>{isStaff&&<th>Azioni</th>}</tr></thead><tbody>
 {membriCda.map(m=><tr key={`${m.persona_id}-${m.dal}`}><td>{m.cognome} {m.nome}</td><td>{m.carica}</td><td>{m.dal} – {m.al}</td>{isStaff&&<td>{(()=>{const entry=memberIds?.find(x=>x.persona_id===m.persona_id&&x.dal===m.dal);return entry?<details><summary>Modifica</summary><RemoveRecord moduleKey="cda_componenti" id={entry.id} back="organi"/></details>:null;})()}</td>}</tr>)}</tbody></table></div>
 {isStaff&&<form action={salvaComponente} className="stack"><h3>Registra componente</h3><div className="form-grid"><label>Socio<select name="persona_id" required><option value="">Seleziona...</option>{persone.map(p=><option value={p.id} key={p.id}>{p.cognome} {p.nome}</option>)}</select></label>
 <label>Carica<select name="carica">{roles.map(r=><option key={r}>{r}</option>)}</select></label><label>Inizio mandato<input name="dal" type="date" required/></label></div>
 <div className="form-actions"><button className="button">Registra</button><Link className="button ghost" href="/organi-sociali">Annulla / Torna indietro</Link></div></form>}
 </section>
 {isStaff&&<section className="panel"><h2>Nuova seduta e bozza Word</h2><form className="stack" action={caricaBozza}>
 <div className="form-grid"><label>Data CdA<input type="date" name="data_consiglio" required/></label><label>Oggetto<input name="oggetto" required maxLength={500}/></label>
 <label>Tipologia<select name="tipo"><option>Approvazione Adesioni Soci</option><option>Gestione Ordinaria / Altro</option><option>Misto</option></select></label>
 <label>Bozza DOCX (max 3 MB)<input type="file" name="documento" accept=".docx" required/></label></div>
 <p className="tiny muted">Al caricamento viene creata un’anteprima PDF di bozza, disponibile nell’archivio. Il PDF definitivo viene creato dopo il voto unanime. La conversione genera una trascrizione del testo Word; conserva sempre l'originale per l'impaginazione, tabelle e allegati.</p>
 <div className="form-actions"><button className="button">Carica bozza</button><Link className="button ghost" href="/organi-sociali">Annulla / Torna indietro</Link></div></form></section>}
 {([['in_approvazione','Verbali in approvazione'],['approvato','Verbali approvati'],['bozza','Bozze'],['sostituito','Versioni sostituite']] as const).map(([stato,titolo])=>{
 const gruppo=verbaliCda.filter(v=>stato==='sostituito'?precedenti.has(v.id):v.stato===stato&&!precedenti.has(v.id));
 return <section key={stato} className="panel"><h2>{titolo}</h2>{!gruppo.length&&<p>Nessun verbale.</p>}
 {gruppo.map(v=>{const p=progressMap.get(v.id);return <article id={'verbale-'+v.id} key={v.id} className="timeline-item"><h3>{v.data_consiglio} · {v.oggetto}</h3>
 <p>Tipo: {v.tipo} · Stato: <strong>{v.stato}</strong> · Voti: {p?.approvati??0}/{p?.totali??0}</p>
 <Firme id={v.id}/><Cronologia tipo="verbale" id={v.id}/>
 {v.precedente_id&&<a href={'#verbale-'+v.precedente_id}>Versione precedente</a>}
 <div className="buttons"><a href={`/organi-sociali/documento/${v.id}?tipo=docx`}>Scarica Word</a>
 {v.stato==='approvato'?<Link href={`/organi-sociali/documento/${v.id}?tipo=pdf`}>PDF definitivo</Link>:<a href={`/organi-sociali/documento/${v.id}?tipo=anteprima`} target="_blank" rel="noopener">Apri e leggi il verbale</a>}</div>
 {v.stato==='bozza'&&isStaff&&<Link href={`/organi-sociali/archivio?edit=${v.id}`}>Modifica bozza</Link>}
 {v.stato==='bozza'&&isStaff&&<form action={avviaApprovazione} className="stack"><input type="hidden" name="verbale_id" value={v.id}/>
 {v.tipo!=='Gestione Ordinaria / Altro'&&<fieldset><legend>Adesioni da ammettere</legend>{adesioni.map(a=><label className="check-label" key={a.id}><input type="checkbox" name="adesione_id" value={a.id}/>{names.get(a.persona_id)??a.persona_id.slice(0,8)}</label>)}</fieldset>}
 <button className="button">Apri votazione (quorum completo)</button></form>}
 {v.stato==='in_approvazione'&&isStaff&&p&&Number(p.totali)>0&&Number(p.approvati)===Number(p.totali)&&<form action={riprovaFinalizzazione}><input type="hidden" name="verbale_id" value={v.id}/><button className="button">Completa generazione PDF definitivo</button></form>}
 {v.stato==='in_approvazione'&&eligible.has(v.id)&&<form action={approvaVerbale}><input type="hidden" name="verbale_id" value={v.id}/><input type="hidden" name="versione" value={v.percorso_docx??''}/><button className="button">Approva verbale</button></form>}
 {isStaff&&!precedenti.has(v.id)&&['approvato','in_approvazione'].includes(v.stato)&&<details><summary>Sostituisci documento</summary><EditForm action={sostituisciVerbale}><h4>Nuova versione · {v.oggetto}</h4><input type="hidden" name="verbale_id" value={v.id}/><input type="hidden" name="versione" value={v.percorso_docx??''}/><label>Nuovo documento Word<input type="file" name="documento" accept=".docx" required/></label><div className="form-actions"><CancelEditButton/><button className="button">Sottoponi la nuova versione</button></div></EditForm></details>}
 </article>;})}</section>;})}</div>;
}
async function Firme({id}:{id:string}){
 const {supabase}=await requireBoard();
 const {data,error}=await supabase.rpc('firme_verbale',{p_verbale:id});
 if(error)return <p>Elenco delle approvazioni non disponibile.</p>;
 return <ul>{(data??[]).map((f:{utente_id:string;nominativo:string;votato_il:string|null})=><li key={f.utente_id}>{f.nominativo} · {f.votato_il?'Approvato il '+dataOra(f.votato_il):'In attesa di approvazione'}</li>)}</ul>;
}
