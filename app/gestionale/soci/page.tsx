import {singleSearchParams} from '@/lib/module-ui';
import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {PageHeader,ButtonLink,StatusBadge,Alert} from '@/components/ui/Primitives';
import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {statusTone,searchTerms,maskedFiscalCode,exactCount} from '@/lib/secretariat';
import {SecretariatNav,PersonName} from '@/components/ui/Secretariat';
import {MetricCard} from '@/components/ui/Primitives';

const statuses=['da_perfezionare','attiva','sospesa','cessata'] as const;
type SocioRow={adesione_id:string;persona_id:string;stagione_id:string;stagione:string;stato:string;nome:string;cognome:string;codice_fiscale:string|null;email:string|null;telefono:string|null};
const perPage=25;
function cleanSearch(value:string){return value.normalize('NFC').replace(/[^\p{L}\p{N} ]/gu,'').trim().slice(0,60);}
function makeHref(filters:{q:string;stagione:string;stato:string;ordine:string},page:number){
 const query=new URLSearchParams();
 if(filters.q)query.set('q',filters.q);
 if(filters.stagione)query.set('stagione',filters.stagione);
 if(filters.stato)query.set('stato',filters.stato);
 if(filters.ordine)query.set('ordine',filters.ordine);
 query.set('p',String(page));
 return `/gestionale/soci?${query.toString()}`;
}
export default async function SociPage({searchParams}:{searchParams:Promise<{q?:string;stagione?:string;stato?:string;p?:string;msg?:string;ordine?:string}>}){
 const {supabase}=await requireStaff();
 const params=singleSearchParams(await searchParams);
 const q=(params.q??'').trim().slice(0,80);
 const ordine=params.ordine==='desc'?'desc':'asc';
 const stato=statuses.find(s=>s===params.stato)??'';
 const {data:stagioni,error:seasonError}=await supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false});
 const chosen=(stagioni??[]).some(s=>s.id===params.stagione)?params.stagione??'':
  params.stagione==='tutte'?'tutte':(stagioni??[]).find(s=>s.attiva)?.id??'tutte';
 const desiredPage=Math.min(10000,Math.max(1,Number.parseInt(params.p??'1',10)||1));
 function base(head=false){
  let query=supabase.from('schede_soci').select('adesione_id,persona_id,stagione_id,stagione,stato,nome,cognome,codice_fiscale,email,telefono',{count:'exact',head});
  if(chosen!=='tutte')query=query.eq('stagione_id',chosen);
  for(const term of searchTerms(q))query=query.or(`nome.ilike.%${term}%,cognome.ilike.%${term}%,codice_fiscale.ilike.%${term}%`);
  return query;
 }
 let query=base();if(stato)query=query.eq('stato',stato);
 const [{data,error,count},total,...byStatus]=await Promise.all([
 query.order('cognome',{ascending:ordine==='asc'}).order('nome',{ascending:ordine==='asc'}).order('adesione_id').range((desiredPage-1)*perPage,desiredPage*perPage-1),
 base(true),...statuses.map(s=>base(true).eq('stato',s))
 ]);
 const rows=(data??[]) as unknown as SocioRow[];
 const filters={q,stagione:chosen,stato,ordine};
 const pageCount=Math.max(1,Math.ceil((count??0)/perPage));
 const page=Math.min(desiredPage,pageCount);
 return <>
 <PageHeader eyebrow="Segreteria" title="Soci e allievi" area="secretariat" icon="users" marine description="Elenco per adesione associativa. Per persone senza adesione, consulta l’archivio anagrafico." actions={<ButtonLink href="/gestionale/moduli/anagrafiche?nuovo=1" icon="plus">Aggiungi persona</ButtonLink>}/>
 <SecretariatNav active="/gestionale/soci"/>
 <div className="sc-member-list-metrics sc-metrics" aria-label="Adesioni per stato nella ricerca e stagione selezionate">
 {[{key:'',label:'Totale adesioni',result:total},{key:'attiva',label:'Attive',result:byStatus[1]},{key:'da_perfezionare',label:'Da perfezionare',result:byStatus[0]},{key:'sospesa',label:'Sospese',result:byStatus[2]},{key:'cessata',label:'Cessate',result:byStatus[3]}].map(m=><Link key={m.key} className="sc-metric-link" aria-current={stato===m.key?'true':undefined} href={makeHref({...filters,stato:m.key},1)}><MetricCard label={m.label} area={m.key==='da_perfezionare'?'equipment':'secretariat'} icon={m.key==='da_perfezionare'?'clock':'users'} value={seasonError?'—':exactCount(m.result)}/></Link>)}
 </div>
 {params.msg&&<Alert tone={params.msg==='eliminato'?'success':'warning'} announce>{params.msg==='eliminato'?'Adesione rimossa.':'Rimozione non consentita: verifica i dati collegati e i permessi.'}</Alert>}
 {seasonError&&<Alert tone="danger" announce>Impossibile caricare le stagioni. Riprova.</Alert>}
 <FilterBar><SearchBar query={q} placeholder="Nome, cognome o codice fiscale" resetHref="/gestionale/soci">
 <label>Stagione<select name="stagione" defaultValue={chosen}><option value="tutte">Tutte le stagioni</option>{(stagioni??[]).map(s=><option key={s.id} value={s.id}>{s.nome}{s.attiva?' · attiva':''}</option>)}</select></label>
 <label>Stato adesione<select name="stato" defaultValue={stato}><option value="">Tutti gli stati</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
 <label>Ordina<select name="ordine" defaultValue={ordine}><option value="asc">Cognome A–Z</option><option value="desc">Cognome Z–A</option></select></label></SearchBar><ButtonLink href="/gestionale/moduli/anagrafiche" variant="secondary">Tutte le anagrafiche</ButtonLink></FilterBar>
 {error||seasonError?<Alert tone="danger" announce>Impossibile leggere l’elenco con i filtri richiesti.</Alert>:<DataTable label="Adesioni di soci e allievi" mobileCards><thead role="rowgroup"><tr role="row">{['Socio','Codice fiscale','Contatto',...(chosen==='tutte'?['Stagione']:[]),'Stato','Azioni'].map(x=><th key={x} role="columnheader" scope="col">{x}</th>)}</tr></thead><tbody role="rowgroup">
 {rows.map(row=><tr key={row.adesione_id} role="row"><td role="cell" data-label="Socio"><PersonName nome={row.nome} cognome={row.cognome} href={'/gestionale/soci/'+row.persona_id}/></td><td role="cell" data-label="Codice fiscale">{maskedFiscalCode(row.codice_fiscale)}</td><td role="cell" data-label="Contatto">{row.email??row.telefono??'Non acquisito'}</td>{chosen==='tutte'&&<td role="cell" data-label="Stagione">{row.stagione}</td>}<td role="cell" data-label="Stato"><StatusBadge tone={statusTone(row.stato)}>{row.stato.replaceAll('_',' ')}</StatusBadge></td><td role="cell" data-label="Azioni"><Link className="sc-button sc-button-secondary" href={'/gestionale/soci/'+row.persona_id}>Apri scheda</Link></td></tr>)}
 {!rows.length&&<tr><td colSpan={chosen==='tutte'?6:5} className="empty-cell">Nessuna adesione con questi filtri.</td></tr>}</tbody></DataTable>}
 <Pagination page={desiredPage} size={perPage} count={error||seasonError?null:count} href={p=>makeHref(filters,p)} label="adesioni"/>
 <p className="tiny muted">Il codice fiscale completo è consultabile nella scheda della persona. I conteggi indicano adesioni, non persone uniche.</p>
 {chosen==='tutte'&&<p className="tiny muted">Una persona può comparire più volte se ha adesioni in stagioni diverse.</p>}
 </>;
}
