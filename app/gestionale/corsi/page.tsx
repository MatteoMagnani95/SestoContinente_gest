import {tutteLePagine} from '@/lib/pagine';
import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {courseName,COURSE_STATES} from '@/lib/course-tools';
import {formatValue} from '@/lib/format';

type Edition={id:string;nome:string;corso_id:string;stagione_id:string;inizio:string;fine:string;stato:string;massimo_partecipanti:number};
const pageSize=25;
function href(base:string,q:string,stato:string,stagione:string,p:number){const x=new URLSearchParams();if(q)x.set('q',q);if(stato)x.set('stato',stato);if(stagione)x.set('stagione',stagione);x.set('p',String(p));return `${base}?${x.toString()}`;}
export default async function Courses({searchParams}:{searchParams:Promise<{q?:string;stato?:string;stagione?:string;p?:string;msg?:string;area?:string}>}){
 const {supabase}=await requireStaff();const p=await searchParams;
 const iscrizioni=p.area==='iscrizioni';const base=iscrizioni?'/gestionale/moduli/iscrizioni':'/gestionale/corsi';
 const q=(p.q??'').normalize('NFC').replace(/[^\p{L}\p{N} .-]/gu,'').trim().slice(0,70);
 const stato=COURSE_STATES.find(x=>x===p.stato)??'';
 const requested=Math.min(10000,Math.max(1,Number.parseInt(p.p??'1',10)||1));
 const [{data:seasons},{data:catalog}]=await Promise.all([
  supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false}).limit(100),
  supabase.from('corsi').select('id,nome,tipo,livello').order('nome').limit(500)
 ]);
 const stagione=(seasons??[]).some(s=>s.id===p.stagione)?p.stagione??'':'';
 let query=supabase.from('edizioni_corsi').select('id,nome,corso_id,stagione_id,inizio,fine,stato,massimo_partecipanti',{count:'exact'});
 if(stagione)query=query.eq('stagione_id',stagione);
 if(stato)query=query.eq('stato',stato);
 if(q)query=query.ilike('nome',`%${q.replace(/[%_\\]/g,'')}%`);
 const {data,error,count}=await query.order('nome').order('id').range((requested-1)*pageSize,requested*pageSize-1);
 const rows=(data??[]) as Edition[];const ids=rows.map(x=>x.id);
 const {data:enrollments,error:enrollmentError}=ids.length?await tutteLePagine((da,a)=>supabase.from('iscrizioni_corsi').select('edizione_id').in('edizione_id',ids).eq('stato','iscritto').order('id').range(da,a)):{data:[],error:null};
 const counts=new Map<string,number>();for(const row of enrollments??[])counts.set(row.edizione_id,(counts.get(row.edizione_id)??0)+1);
 const [storiciCatalogo,storicheEdizioni]=await Promise.all(['corsi','edizioni_corsi'].map(tabella=>tutteLePagine((da,a)=>supabase.from(tabella).select('id,nome').eq('duplicato_storico',true).order('id').range(da,a))));
 const totalPages=Math.max(1,Math.ceil((count??0)/pageSize));
 return <>
  <div className="page-intro course-header"><div><p className="eyebrow">Segreteria · Fase 3.2</p><h1>{p.area==='iscrizioni'?'Iscrizioni ai corsi':'Gestione corsi'}</h1><p>Seleziona l’edizione per vedere gli allievi iscritti e gestire le iscrizioni.</p></div><Link className="button" href="/gestionale/corsi/nuovo">+ Nuova edizione</Link></div>
  {Boolean(storiciCatalogo.data?.length||storicheEdizioni.data?.length)&&<details className="notice warning"><summary>Duplicati storici da verificare</summary><ul>{storiciCatalogo.data?.map(c=><li key={c.id}><Link href={'/gestionale/moduli/corsi?edit='+c.id}>Catalogo · {c.nome}</Link></li>)}{storicheEdizioni.data?.map(e=><li key={e.id}><Link href={'/gestionale/corsi/'+e.id}>Edizione · {e.nome}</Link></li>)}</ul></details>}
  {p.msg==='eliminato'&&<p role="status" className="notice success">Edizione rimossa.</p>}
  {p.msg==='dati'&&<p className="notice warning">Controlla i dati inseriti e riprova.</p>}
  <div className="panel course-filter"><form method="get" className="member-filters">
   <label>Nome corso<input name="q" type="search" maxLength={70} placeholder="Cerca edizione" defaultValue={q}/></label>
   <label>Stagione<select name="stagione" defaultValue={stagione}><option value="">Tutte</option>{(seasons??[]).map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
   <label>Stato<select name="stato" defaultValue={stato}><option value="">Tutti</option>{COURSE_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <button className="button">Filtra</button><Link className="button ghost" href={base}>Azzera</Link>
  </form></div>
  {p.msg&&['elimina_collegati','elimina_conferma','database'].includes(p.msg)&&<p className="notice">{p.msg==='eliminato'?'Edizione rimossa.':'Rimozione non consentita: verifica collegamenti e permessi.'}</p>}
  {error?<p className="notice error">Impossibile leggere le edizioni dal database.</p>:<div className="panel table-panel"><table><thead><tr><th>Edizione</th><th>Attività</th><th>Stagione</th><th>Periodo</th><th>Iscritti</th><th>Capienza</th><th>Stato</th><th>Apri</th></tr></thead><tbody>
   {rows.map(e=>{const c=(catalog??[]).find(c=>c.id===e.corso_id);const n=counts.get(e.id)??0;return <tr key={e.id}><td><strong>{e.nome}</strong></td><td>{c?courseName(c.tipo,c.livello):'Catalogo non trovato'}</td><td>{seasons?.find(s=>s.id===e.stagione_id)?.nome??'—'}</td><td>{formatValue(e.inizio)} – {formatValue(e.fine)}</td><td>{enrollmentError?'—':n}</td><td>{e.massimo_partecipanti}</td><td><span className="status">{e.stato}</span></td><td><Link href={`/gestionale/corsi/${e.id}${iscrizioni?'#allievi':''}`}>{iscrizioni?'Apri iscrizioni':'Apri corso'}</Link></td></tr>;})}
   {!rows.length&&<tr><td colSpan={8} className="empty-cell">Nessuna edizione trovata. Puoi crearne una dal pulsante in alto.</td></tr>}
  </tbody></table></div>}
  <div className="pager"><span>{count??0} edizioni · Pagina {requested} di {totalPages}</span><div className="buttons">{requested>1&&<Link className="button ghost" href={href(base,q,stato,stagione,requested-1)}>Precedente</Link>}{requested<totalPages&&<Link className="button ghost" href={href(base,q,stato,stagione,requested+1)}>Successiva</Link>}</div></div>
  {enrollmentError&&<p className="notice error" role="alert">Conteggi delle iscrizioni non disponibili: riprova.</p>}
  <p className="tiny muted">Il conteggio degli iscritti include solo gli stati «iscritto».</p>
 </>;
}
