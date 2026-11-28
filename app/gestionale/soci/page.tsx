import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';

const statuses=['da_perfezionare','attiva','sospesa','cessata'] as const;
type SocioRow={adesione_id:string;persona_id:string;stagione_id:string;stagione:string;stato:string;nome:string;cognome:string;codice_fiscale:string|null;email:string|null;telefono:string|null};
const perPage=25;
function cleanSearch(value:string){return value.normalize('NFC').replace(/[^\p{L}\p{N} ]/gu,'').trim().slice(0,60);}
function makeHref(filters:{q:string;stagione:string;stato:string},page:number){
 const query=new URLSearchParams();
 if(filters.q)query.set('q',filters.q);
 if(filters.stagione)query.set('stagione',filters.stagione);
 if(filters.stato)query.set('stato',filters.stato);
 query.set('p',String(page));
 return `/gestionale/soci?${query.toString()}`;
}
export default async function SociPage({searchParams}:{searchParams:Promise<{q?:string;stagione?:string;stato?:string;p?:string;msg?:string}>}){
 const {supabase}=await requireStaff();
 const params=await searchParams;
 const q=cleanSearch(params.q??'');
 const stato=statuses.find(s=>s===params.stato)??'';
 const {data:stagioni,error:seasonError}=await supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false});
 const chosen=(stagioni??[]).some(s=>s.id===params.stagione)?params.stagione??'':
  params.stagione==='tutte'?'tutte':(stagioni??[]).find(s=>s.attiva)?.id??'tutte';
 const desiredPage=Math.min(10000,Math.max(1,Number.parseInt(params.p??'1',10)||1));
 let query=supabase.from('schede_soci').select('*',{count:'exact'});
 if(chosen!=='tutte')query=query.eq('stagione_id',chosen);
 if(stato)query=query.eq('stato',stato);
 if(q)query=query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,codice_fiscale.ilike.%${q}%`);
 const {data,error,count}=await query.order('cognome',{ascending:true}).order('nome',{ascending:true}).order('adesione_id')
  .range((desiredPage-1)*perPage,desiredPage*perPage-1);
 const {data:pending,error:pendingError,count:pendingCount}=await supabase.from('rettifiche_anagrafiche').select('id,persona_id,nome,cognome,creata_il',{count:'exact'}).eq('stato','in_attesa').order('creata_il').order('id').limit(50);
 const rows=(data??[]) as unknown as SocioRow[];
 const filters={q,stagione:chosen,stato};
 const pageCount=Math.max(1,Math.ceil((count??0)/perPage));
 const page=Math.min(desiredPage,pageCount);
 return <>
  <div className="page-intro"><p className="eyebrow">Segreteria · Anagrafiche</p><h1>Soci e allievi</h1>
   <p>Ricerca per nominativo o codice fiscale, elenco per stagione e accesso alla scheda personale unificata.</p></div>
  {params.msg&&<p className="notice warning">{params.msg==='eliminato'?'Adesione rimossa.':'Rimozione non consentita: verifica i dati collegati e i permessi.'}</p>}
  <section className="panel stack"><h2>Rettifiche anagrafiche da verificare {pendingError?'': '('+(pendingCount??0)+')'}</h2>{pendingError?<p role="alert">Impossibile caricare le rettifiche.</p>:pending?.length?<ul>{pending.map(r=><li key={r.id}><Link href={'/gestionale/soci/'+r.persona_id+'#anagrafica'}>{r.cognome} {r.nome}</Link> · {formatValue(r.creata_il)}</li>)}</ul>:<p className="muted">Nessuna richiesta in attesa.</p>}{(pendingCount??0)>50&&<p>Prime 50 richieste: elaborale per vedere le successive.</p>}</section>
  {seasonError&&<p className="notice error">Impossibile caricare le stagioni. Verifica il database.</p>}
  <div className="panel member-filter-panel">
   <form method="get" className="member-filters">
    <label>Cerca socio<input name="q" type="search" maxLength={60} placeholder="Nome, cognome o codice fiscale" defaultValue={q}/></label>
    <label>Stagione<select name="stagione" defaultValue={chosen}><option value="tutte">Tutte le stagioni</option>
     {(stagioni??[]).map(s=><option key={s.id} value={s.id}>{s.nome}{s.attiva?' · attiva':''}</option>)}</select></label>
    <label>Stato adesione<select name="stato" defaultValue={stato}><option value="">Tutti gli stati</option>
     {statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
    <button type="submit" className="button">Applica filtri</button>
    <Link className="button ghost" href="/gestionale/soci">Azzera</Link>
   </form>
  </div>
  {error?<p className="notice error">Impossibile leggere l'elenco. Verifica di aver applicato la migrazione 0003 e le autorizzazioni Supabase.</p>:
   <div className="panel table-panel"><table><thead><tr><th>Socio</th><th>Codice fiscale</th><th>Contatto</th><th>Stagione</th><th>Stato</th><th>Dettagli</th></tr></thead><tbody>
   {rows.map(row=><tr key={row.adesione_id}>
    <td><strong>{row.cognome} {row.nome}</strong></td><td>{row.codice_fiscale??'—'}</td>
    <td>{row.email??row.telefono??'—'}</td><td>{row.stagione}</td>
    <td><span className={`status status-${row.stato}`}>{String(row.stato).replaceAll('_',' ')}</span></td>
    <td><Link href={`/gestionale/soci/${row.persona_id}`}>Apri scheda</Link></td>
   </tr>)}
   {rows.length===0&&<tr><td colSpan={6} className="empty-cell">Nessun socio trovato con questi filtri.</td></tr>}
   </tbody></table></div>}
  <div className="pager"><span>{error?'—':formatValue(count??0)} adesioni · Pagina {desiredPage} di {pageCount}</span>
   <div className="buttons">
    {desiredPage>1&&<Link className="button ghost" href={makeHref(filters,desiredPage-1)}>Precedente</Link>}
    {desiredPage<pageCount&&<Link className="button ghost" href={makeHref(filters,desiredPage+1)}>Successiva</Link>}
   </div></div>
  {chosen==='tutte'&&<p className="tiny muted">Visualizzazione per adesione: una persona può comparire più volte se iscritta a stagioni diverse.</p>}
 </>;
}
