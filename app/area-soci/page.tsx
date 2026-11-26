import {PageHeader,StatusBadge,Alert,ButtonLink} from '@/components/ui/Primitives';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import {Pagination} from '@/components/ui/DataTable';
import EditForm from '@/components/EditForm';
import {tutteLePagine} from '@/lib/pagine';
import {readCourseChunks} from '@/lib/course-ui';
import {pageNumber} from '@/lib/module-ui';
import Link from 'next/link';
import {requireUser,formatDate} from '@/lib/security';
import {type SocioEvento,type SocioProfilo,type SocioIscrizione,messaggiEventi,euroEvento,todayRome} from '@/lib/area-soci';
import {joinEvent,withdrawEvent} from './actions';
export default async function AreaSoci({searchParams}:{searchParams:Promise<{msg?:string;tab?:string;p?:string}>}){
 const {supabase,user}=await requireUser();const {msg,tab:rawTab,p}=await searchParams;const tab=rawTab==='documenti'||rawTab==='storico'?rawTab:'eventi',page=pageNumber(p),size=15;const href=(n:number)=>'?tab='+tab+'&p='+n;
 const {data:profiles,error:accessError}=await supabase.rpc('area_soci_miei_profili');
 const people=(profiles??[]) as SocioProfilo[];
 if(accessError)return <div className="container narrow"><h1>Area soci non disponibile</h1><p className="notice error">Impossibile verificare l’abilitazione. Contatta la segreteria.</p><Link href="/smista">Torna alla panoramica</Link></div>;
 if(!people.length)return <div className="container narrow"><h1>Area soci riservata</h1><p className="notice warning">Accesso riservato ai soci con adesione attiva e quota interamente saldata per la stagione corrente. Contatta la segreteria per verificare la tua posizione.</p><Link href="/area-personale">Area personale</Link></div>;
 const today=todayRome();
 const [{data:events,error:eventsError},{data:registrations,error:registrationError},{data:docs,error:docsError}]=await Promise.all([
  tutteLePagine((da,a)=>supabase.from('eventi_soci').select('*').gte('al',today).order('dal').order('titolo').order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('eventi_soci_iscrizioni').select('id,evento_id,persona_id,stato,richiesta_il').eq('utente_id',user.id).order('richiesta_il',{ascending:false}).order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('documenti').select('id,nome,categoria,caricato_il').eq('ambito','associazione').eq('visibilita','soci').order('nome').order('id').range(da,a))
 ]);
 const rows=(events??[]) as SocioEvento[],mine=(registrations??[]) as SocioIscrizione[];
 const historyIds=[...new Set(mine.map(i=>i.evento_id))].filter(id=>!rows.some(e=>e.id===id));
 const history=await readCourseChunks(historyIds,(group,da,a)=>supabase.from('eventi_soci').select('*').in('id',group).order('dal',{ascending:false}).order('id').range(da,a));
 const visible=(tab==='storico'?[...rows,...((history.data??[]) as SocioEvento[])].filter(e=>mine.some(i=>i.evento_id===e.id)):rows);const visiblePage=visible.slice((page-1)*size,page*size);
 const slots=await Promise.all(visiblePage.map(async e=>{const {data,error}=await supabase.rpc('area_soci_posti',{p_evento:e.id});return [e.id,error||data===null?null:Number(data)] as const;}));const availability=new Map(slots);
 return <div className="container"><div className="page-intro"><p className="eyebrow">Sesto Continente · Area riservata</p><h1>Area soci</h1><p>Benvenuto, {people.map(p=>`${p.nome} ${p.cognome}`).join(' / ')}. Consulta gli eventi e i documenti associativi.</p><div className="buttons"><Link href="/area-personale" className="button ghost">Area personale</Link><Link href="?tab=documenti" className="button ghost">Documenti associativi</Link></div></div>
 {msg&&<p role="status" className={`notice ${msg==='ok'?'success':'error'}`}>{messaggiEventi[msg]??messaggiEventi.errore}</p>}
 <nav className="sc-secretariat-tabs" aria-label="Area soci">{[['eventi','Eventi in programma'],['storico','Le mie iscrizioni'],['documenti','Documenti associativi']].map(([key,label])=><Link key={key} href={'?tab='+key} aria-current={tab===key?'page':undefined}>{label}</Link>)}</nav>{tab!=='documenti'&&<section className="sc-card"><h2>{tab==='storico'?'Le mie iscrizioni':'Eventi associativi'}</h2><p>Le richieste in attesa riservano un posto in ordine di arrivo. L'iscrizione diventa definitiva dopo l’approvazione del responsabile. Un ritiro o un rifiuto libera il posto.</p>
 {(eventsError||registrationError||history.error)&&<p className="notice error">Impossibile leggere eventi o iscrizioni: riprova.</p>}
 {!visible.length&&!eventsError&&<p>Nessun evento disponibile.</p>}
 {visiblePage.map(e=>{const own=mine.filter(i=>i.evento_id===e.id);const free=availability.get(e.id);const canJoin=e.stato==='aperto'&&e.dal>=today&&free!=null&&free>0&&!registrationError&&!eventsError;const options=people.filter(p=>!own.some(i=>i.persona_id===p.persona_id&&['in_attesa','approvata'].includes(i.stato)));return <article key={e.id} className="timeline-item"><h3>{e.titolo}</h3><p><strong>{e.destinazione}</strong> · {formatDate(e.dal)}{e.al!==e.dal&&` – ${formatDate(e.al)}`}</p><p style={{whiteSpace:'pre-wrap'}}>{e.descrizione}</p><p>Costo indicativo: <strong>{euroEvento(e.costo)}</strong> · Posti disponibili: <strong>{free??'—'} / {e.posti}</strong> · {e.stato}</p>
 {own.map(i=><div key={i.id} className="notice"><strong>{people.find(p=>p.persona_id===i.persona_id)?.nome??'Iscrizione'}: {i.stato.replaceAll('_',' ')}</strong> · {formatDate(i.richiesta_il)}{['in_attesa','approvata'].includes(i.stato)&&e.stato!=='annullato'&&e.dal>=today&&<ConfirmDialog title={'Disiscriviti · '+e.titolo} trigger="Disiscriviti"><EditForm action={withdrawEvent} className="stack"><input type="hidden" name="evento_id" value={e.id}/><input type="hidden" name="iscrizione_id" value={i.id}/><label><input type="checkbox" name="conferma" required/> Confermo il ritiro della mia iscrizione</label><button className="button danger">Disiscriviti</button></EditForm></ConfirmDialog>}</div>)}
 {canJoin&&options.length>0&&<Drawer title={'Richiedi iscrizione · '+e.titolo} trigger="Richiedi iscrizione" primary><EditForm action={joinEvent} className="stack"><input type="hidden" name="evento_id" value={e.id}/><label>Iscritto<select name="persona_id" required defaultValue=""><option value="">Seleziona persona</option>{options.map(p=><option value={p.persona_id} key={p.persona_id}>{p.cognome} {p.nome}</option>)}</select></label><button className="button" type="submit">Richiedi iscrizione</button></EditForm></Drawer>}
 {e.stato==='aperto'&&free===0&&<p className="muted">Posti esauriti; riprova se si libera un posto.</p>}</article>;})}<Pagination page={page} size={size} count={eventsError||registrationError||history.error?null:visible.length} href={href} label="eventi"/></section>}
 {tab==='documenti'&&<section className="sc-card" id="documenti-soci"><h2>Documenti associativi</h2><p>Documenti pubblicati dall’amministrazione e riservati ai soci attivi.</p>{docsError?<p className="notice error">Archivio non disponibile.</p>:!docs?.length?<p>Nessun documento pubblicato.</p>:docs.slice((page-1)*size,page*size).map(d=><article key={d.id} className="timeline-item"><strong>{d.nome}</strong><p>{d.categoria} · {formatDate(d.caricato_il)}</p><a className="button ghost" href={`/documenti/${d.id}`} target="_blank" rel="noopener noreferrer">Visualizza / scarica</a></article>)}<Pagination page={page} size={size} count={docsError?null:docs?.length??0} href={href} label="documenti"/></section>}
 </div>;
}
