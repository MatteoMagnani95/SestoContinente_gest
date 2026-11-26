import Link from 'next/link';
import {requireEventManager} from '@/lib/event-access';
import {formatDate} from '@/lib/security';
import {type SocioEvento,messaggiEventi,euroEvento,todayRome} from '@/lib/area-soci';
import {eventPeriod,eventState,eventHref,occupancy} from '@/lib/event-ui';
import {cleanSearch,pageNumber,listHref,singleSearchParams} from '@/lib/module-ui';
import {dateFilter} from '@/lib/secretariat';
import {PageHeader,ButtonLink,StatusBadge,Alert,EmptyState} from '@/components/ui/Primitives';
import {SearchBar,Pagination} from '@/components/ui/DataTable';
import {Drawer} from '@/components/ui/Drawer';
import EventEditor from '@/components/EventEditor';
export default async function ManageEvents({searchParams}:{searchParams:Promise<{msg?:string;periodo?:string;dal?:string;p?:string;q?:string;stato?:string;richieste?:string;nuovo?:string}>}){
 const {supabase,user,staff,admin}=await requireEventManager();
 const s=singleSearchParams(await searchParams),today=todayRome(),periodo=eventPeriod(s.periodo),stato=eventState(s.stato),from=dateFilter(s.dal)||today,page=pageNumber(s.p),size=20,q=cleanSearch(s.q??'');
 let query=supabase.from('eventi_soci').select(s.richieste==='1'?'*,eventi_soci_iscrizioni!inner(id)':'*',{count:'exact'});
 if(!staff)query=query.eq('responsabile_id',user.id);
 if(periodo==='prossimi')query=query.gte('al',from).neq('stato','annullato');
 if(periodo==='passati')query=query.lt('al',today);
 if(stato)query=query.eq('stato',stato);
 if(q)query=query.or('titolo.ilike.%'+q+'%,destinazione.ilike.%'+q+'%');
 if(s.richieste==='1')query=query.eq('eventi_soci_iscrizioni.stato','in_attesa');
 const {data,error,count}=await query.order('dal',{ascending:periodo==='prossimi'}).order('titolo').order('id').range((page-1)*size,page*size-1);
 const events=(data??[]) as unknown as SocioEvento[];
 const details=await Promise.all(events.map(async e=>{const [p,slots]=await Promise.all([supabase.from('eventi_soci_iscrizioni').select('id',{count:'exact',head:true}).eq('evento_id',e.id).eq('stato','in_attesa'),supabase.rpc('area_soci_posti',{p_evento:e.id})]);return {event:e,pending:p.error?null:p.count,occupancy:slots.error?null:occupancy(e.posti,slots.data)};}));
 return <>
 <PageHeader eyebrow="Eventi associativi" title="Eventi soci" description={staff?'Gestisci tutti gli eventi e le richieste.':'Gestisci gli eventi di cui sei responsabile.'} actions={<Drawer primary title="Nuovo evento" trigger="Nuovo evento" initialOpen={s.nuovo==='1'&&!s.msg}><EventEditor/></Drawer>}/>
 <p className="muted">Le richieste in attesa riservano già un posto. I posti sono assegnati in ordine di arrivo.</p>
 {s.msg&&Object.hasOwn(messaggiEventi,s.msg)&&<Alert announce tone={['ok','rimosso'].includes(s.msg)?'success':'warning'}>{messaggiEventi[s.msg]}</Alert>}
 <SearchBar query={s.q??''} placeholder="Cerca evento o destinazione" resetHref="/gestione-eventi"><label>Periodo<select name="periodo" defaultValue={periodo}><option value="">Tutti</option><option value="prossimi">Prossimi / in corso</option><option value="passati">Passati</option></select></label><label>Stato<select name="stato" defaultValue={stato}><option value="">Tutti</option><option value="aperto">Aperti</option><option value="chiuso">Chiusi</option><option value="annullato">Annullati</option></select></label><label className="check-label"><input type="checkbox" name="richieste" value="1" defaultChecked={s.richieste==='1'}/> Richieste da gestire</label></SearchBar>
 {error?<Alert tone="danger" announce>Eventi non disponibili. Riprova.</Alert>:!events.length?<EmptyState title="Nessun evento con questi filtri"/>:<div className="sc-event-grid">{details.map(({event:e,pending,occupancy:o})=><article className="sc-card sc-event-card" key={e.id} id={'evento-'+e.id}><div className="sc-section-header"><h2><Link href={eventHref(e.id,'informazioni')}>{e.titolo}</Link></h2><StatusBadge tone={e.stato==='annullato'?'danger':e.stato==='aperto'?'success':'neutral'}>{e.stato}</StatusBadge></div><p>{e.destinazione} · {formatDate(e.dal)} – {formatDate(e.al)}</p><p><strong>{euroEvento(e.costo)}</strong> · {e.posti} posti totali</p>
 {o?<><div className="sc-capacity" role="progressbar" aria-label="Posti occupati" aria-valuenow={o.occupied} aria-valuemax={e.posti} aria-valuemin={0}><span style={{width:o.percent+'%'}}/></div><p>{o.occupied} riservati · {o.free} non riservati{e.stato!=='aperto'||e.dal<today?' (iscrizioni non aperte)':''}</p></>:<p>Capienza residua non verificabile.</p>}
 <p>{pending===null?'Richieste non disponibili':pending+' richieste in attesa'}</p><div className="buttons"><ButtonLink href={eventHref(e.id,'informazioni')}>Apri evento</ButtonLink><ButtonLink variant="secondary" href={eventHref(e.id,'approvazioni')}>Gestisci richieste</ButtonLink></div></article>)}</div>}
 <Pagination page={page} size={size} count={error?null:count} href={p=>listHref({periodo,dal:from,stato,q:s.q,richieste:s.richieste,p:String(p)})}/>
 <div className="buttons"><ButtonLink href="/area-soci" variant="secondary">Area soci</ButtonLink>{admin&&<ButtonLink href="/documenti?pubblica=soci" variant="secondary">Pubblica documento per i soci</ButtonLink>}</div>
 </>;
}
