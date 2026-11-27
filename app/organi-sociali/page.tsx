import {PageHeader,ButtonLink,StatusBadge,Alert,MetricCard,EmptyState} from '@/components/ui/Primitives';
import {Icon} from '@/components/ui/Icon';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import {DataTable,Pagination} from '@/components/ui/DataTable';
import SearchableSelect from '@/components/ui/SearchableSelect';
import BoardAdmissions from '@/components/BoardAdmissions';
import {pageNumber} from '@/lib/module-ui';
import {todayRome} from '@/lib/area-soci';
import {formatDate} from '@/lib/security';
import BoardDraftFields from '@/components/BoardDraftFields';
import BoardFile from '@/components/BoardFile';
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
export default async function OrganiSociali({searchParams}:{searchParams:Promise<{msg?:string;tab?:string;p?:string}>}){
 const {supabase,user,isStaff}=await requireBoard();const {msg,tab:rawTab,p}=await searchParams;
 const tabs=[['panoramica','Panoramica'],['componenti','Componenti in carica'],['sedute','Sedute'],['bozze','Bozze'],['votazioni','Votazioni in corso'],['approvati','Verbali approvati'],['sostituiti','Versioni sostituite']] as const;
 const tab=tabs.find(([k])=>k===rawTab)?.[0]??(msg==='componente_ok'?'componenti':msg==='avviata'||msg==='voto_ok'||msg==='lettura'?'votazioni':msg==='approvato'?'approvati':'panoramica'),page=pageNumber(p),size=25,today=todayRome();
 const [{data:members,error:membersError},{data:verbali,error:verbaliError},{data:progress,error:progressError},{data:people,error:peopleError},{data:pending,error:pendingError},{data:votanti,error:votantiError}]=await Promise.all([
  tutteLePagine((da,a)=>supabase.rpc('cda_anagrafiche_membri').order('persona_id').order('dal').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('cda_verbali').select('id,data_consiglio,oggetto,tipo,stato,percorso_docx,percorso_pdf,precedente_id').is('rimosso_il',null).order('data_consiglio',{ascending:false}).order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.rpc('cda_progressi').order('verbale_id').range(da,a)),
  isStaff?tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').order('id').range(da,a)):Promise.resolve({data:[],error:null}),
  isStaff?tutteLePagine((da,a)=>supabase.from('adesioni').select('id,persona_id,stato').eq('stato','da_perfezionare').order('id').range(da,a)):Promise.resolve({data:[],error:null}),
  tutteLePagine((da,a)=>supabase.from('cda_votanti').select('verbale_id,utente_id').eq('utente_id',user.id).order('verbale_id').range(da,a))
 ]);
 const membriCda=((Array.isArray(members)?members:[]) as MembroCda[]).sort((a,b)=>a.cognome.localeCompare(b.cognome,'it')||a.nome.localeCompare(b.nome,'it'));
 const {data:memberIds,error:memberIdsError}=isStaff?await tutteLePagine((da,a)=>supabase.from('cda_componenti').select('id,persona_id,dal').order('id').range(da,a)):{data:[],error:null};
 const verbaliCda=(Array.isArray(verbali)?verbali:[]) as VerbaleCda[];
 const precedenti=new Set(verbaliCda.map(v=>v.precedente_id).filter(Boolean));
 const votantiCda=(Array.isArray(votanti)?votanti:[]) as Votante[];
 const persone=(Array.isArray(people)?people:[]) as Persona[];
 const adesioni=(Array.isArray(pending)?pending:[]) as Adesione[];
 const progressi=(Array.isArray(progress)?progress:[]) as Progresso[];
 const {data:giaFirmati,error:firmatiError}=await tutteLePagine((da,a)=>supabase.from('cda_voti').select('verbale_id').eq('utente_id',user.id).order('verbale_id').range(da,a));
 const firmati=new Set(giaFirmati?.map(v=>v.verbale_id));
 const eligible=new Set<string>((votantiError||firmatiError?[]:votantiCda).filter(v=>!firmati.has(v.verbale_id)).map(x=>x.verbale_id));
 const names=new Map<string,string>(persone.map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 adesioni.sort((a,b)=>(names.get(a.persona_id)??'').localeCompare(names.get(b.persona_id)??'','it'));
 const progressMap=new Map<string,Progresso>(progressi.map(x=>[x.verbale_id,x]));
 const messages:Record<string,string>={lettura:'Apri la versione corrente del verbale prima di approvare.',voto_ok:'Approvazione registrata. Mancano altre conferme.',approvato:'Verbale approvato.',avviata:'Versione sottoposta al Consiglio.',componente_ok:'Componente registrato.',quorum:'Impossibile aprire o completare la votazione: verifica aventi diritto e adesioni.',dati:'Controlla i dati inseriti.',documento:'Documento non disponibile.',pdf:'PDF non generato.',finalizzazione:'Finalizzazione non completata.',componente:'Componente non registrato.',eliminato:'Record rimosso.'};
 return <>
 <PageHeader area="secretariat" icon="users" marine eyebrow="Organi sociali" title="Consiglio d'Amministrazione" description="Componenti in carica, deliberazioni, voto individuale e documenti riservati." actions={<><ButtonLink href="/organi-sociali/archivio" variant="secondary">Archivio verbali</ButtonLink><ButtonLink href="/organi-sociali/riepilogo" variant="secondary">Riepilogo aggregato CdA</ButtonLink></>}/>
 {msg&&Object.hasOwn(messages,msg)&&<Alert announce tone={['voto_ok','approvato','avviata','componente_ok','eliminato'].includes(msg)?'success':'warning'}>{messages[msg]}</Alert>}
 {(membersError||verbaliError||progressError||peopleError||pendingError||votantiError||firmatiError||memberIdsError)&&<Alert tone="warning">Alcune informazioni non sono disponibili. Non interpretare dati mancanti come assenza di registrazioni.</Alert>}
 <nav className="sc-event-tabs sc-operation-tabs" aria-label="Sezioni Consiglio">{tabs.map(([k,label])=><Link className={'sc-button '+(tab===k?'sc-button-primary':'sc-button-secondary')} key={k} href={'/organi-sociali?tab='+k} aria-current={tab===k?'page':undefined}>{label}</Link>)}<ButtonLink variant="secondary" href="/organi-sociali/archivio">Archivio</ButtonLink></nav>
 {tab==='panoramica'&&<div className="sc-metrics sc-board-kpis"><Link href="?tab=componenti" className="sc-metric-link"><MetricCard area="secretariat" label="Mandati in corso" icon="users" value={membersError?'—':membriCda.filter(m=>m.dal<=today&&m.al>=today).length}/></Link><Link href="?tab=bozze" className="sc-metric-link"><MetricCard area="equipment" label="Bozze" icon="document" value={verbaliError?'—':verbaliCda.filter(v=>v.stato==='bozza'&&!precedenti.has(v.id)).length}/></Link><Link href="?tab=votazioni" className="sc-metric-link"><MetricCard area="calendar" label="Votazioni in corso" icon="clipboard" value={verbaliError?'—':verbaliCda.filter(v=>v.stato==='in_approvazione'&&!precedenti.has(v.id)).length}/></Link><Link href="?tab=approvati" className="sc-metric-link"><MetricCard area="finance" label="Verbali approvati correnti" icon="check" value={verbaliError?'—':verbaliCda.filter(v=>v.stato==='approvato'&&!precedenti.has(v.id)).length}/></Link></div>}
 {tab==='panoramica'&&<div className="sc-board-overview"><section className="sc-card"><div className="sc-section-header"><div><h2>Votazioni in corso</h2><p>Versioni correnti sottoposte ai componenti.</p></div><ButtonLink href="?tab=votazioni" variant="secondary">Tutte le votazioni</ButtonLink></div>{verbaliError?<Alert tone="warning">Verbali non disponibili.</Alert>:verbaliCda.filter(v=>v.stato==='in_approvazione'&&!precedenti.has(v.id)).slice(0,3).map(v=>{const progress=progressMap.get(v.id);const known=!progressError&&progress&&Number(progress.totali)>0&&Number(progress.approvati)>=0&&Number(progress.approvati)<=Number(progress.totali);return <article key={v.id} className="sc-board-summary-item"><div><h3>{v.oggetto}</h3><p className="tiny muted">{formatDate(v.data_consiglio)} · {v.tipo}</p></div><StatusBadge tone="warning">In approvazione</StatusBadge>{known&&progress?<div className="sc-board-progress"><span>{Number(progress.approvati)} / {Number(progress.totali)} approvazioni</span><progress max={Number(progress.totali)} value={Number(progress.approvati)} aria-label={'Approvazioni · '+v.oggetto}/></div>:<p>{progressError?'Voti non disponibili':'Votazione non configurata o non verificabile'}</p>}<div className="sc-row-actions"><ButtonLink href={'/organi-sociali/archivio?edit='+v.id} variant="secondary">Apri verbale</ButtonLink><ButtonLink href={'?tab=votazioni#verbale-'+v.id} variant="secondary">Consulta voti e cronologia</ButtonLink></div></article>})}{!verbaliError&&!verbaliCda.some(v=>v.stato==='in_approvazione'&&!precedenti.has(v.id))&&<EmptyState title="Nessuna votazione in corso"/>}</section><aside className="sc-card sc-board-private"><Icon name="lock"/><h2>Documenti riservati</h2><p>I verbali sono accessibili soltanto agli utenti autorizzati. Le approvazioni sono registrate dal sistema; originali e versioni restano protetti.</p><ButtonLink href="/organi-sociali/archivio" variant="secondary">Archivio verbali</ButtonLink>{isStaff&&<ButtonLink href="?tab=sedute" icon="plus">Nuova seduta e verbale</ButtonLink>}</aside><section className="sc-card sc-board-drafts"><div className="sc-section-header"><div><h2>Bozze recenti</h2><p>Verbali in predisposizione.</p></div><ButtonLink href="?tab=bozze" variant="secondary">Tutte le bozze</ButtonLink></div>{verbaliError?<Alert tone="warning">Bozze non disponibili.</Alert>:verbaliCda.filter(v=>v.stato==='bozza'&&!precedenti.has(v.id)).slice(0,3).map(v=><article className="sc-board-summary-item" key={v.id}><div><h3>{v.oggetto}</h3><p className="tiny muted">{formatDate(v.data_consiglio)} · {v.tipo}</p></div><StatusBadge>Bozza</StatusBadge><div className="sc-row-actions"><ButtonLink href={'/organi-sociali/archivio?edit='+v.id} variant="secondary">{isStaff?'Modifica bozza':'Apri verbale'}</ButtonLink>{isStaff&&<ButtonLink href={'?tab=bozze#verbale-'+v.id}>Apri gestione votazione</ButtonLink>}</div></article>)}{!verbaliError&&!verbaliCda.some(v=>v.stato==='bozza'&&!precedenti.has(v.id))&&<EmptyState title="Nessuna bozza corrente"/>}</section></div>}
 {tab==='componenti'&&<section className="sc-card"><h2>Componenti CdA</h2><DataTable label="Componenti del Consiglio" mobileCards><thead><tr><th>Socio</th><th>Carica</th><th>Inizio mandato</th><th>Fine mandato</th><th>Stato</th>{isStaff&&<th>Azioni</th>}</tr></thead><tbody>
 {membriCda.slice((page-1)*size,page*size).map(m=><tr key={`${m.persona_id}-${m.dal}`}><td data-label="Nominativo">{m.cognome} {m.nome}</td><td data-label="Carica">{m.carica}</td><td data-label="Inizio mandato">{formatDate(m.dal)}</td><td data-label="Fine mandato">{formatDate(m.al)}</td><td data-label="Stato"><StatusBadge tone={m.dal<=today&&m.al>=today?'success':'neutral'}>{m.dal>today?'Futuro':m.al<today?'Scaduto':'In carica'}</StatusBadge></td>{isStaff&&<td>{(()=>{const entry=memberIds?.find(x=>x.persona_id===m.persona_id&&x.dal===m.dal);return entry?<RemoveRecord moduleKey="cda_componenti" id={entry.id} back="organi" label={m.cognome+' '+m.nome}/>:null;})()}</td>}</tr>)}</tbody></DataTable><Pagination page={page} size={size} count={membersError?null:membriCda.length} href={p=>'?tab=componenti&p='+p}/>
 {isStaff&&!peopleError&&persone.length===0&&<Alert tone="warning">Non ci sono anagrafiche disponibili per registrare un componente.</Alert>}
 {isStaff&&!peopleError&&persone.length>0&&<Drawer title="Aggiungi componente" trigger="Aggiungi componente" primary><EditForm action={salvaComponente} successHref="/organi-sociali?tab=componenti&msg=componente_ok" showValidationErrors className="stack"><p className="sc-field-hint">Compila tutti e tre i campi obbligatori. Il mandato dura quattro anni.</p><div className="form-grid sc-editor-columns-3"><div className="sc-field"><label htmlFor="board-person">Socio (obbligatorio)</label>{persone.length<=20?<select id="board-person" name="persona_id" required defaultValue=""><option value="">Seleziona un socio…</option>{persone.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}</select>:<SearchableSelect id="board-person" name="persona_id" label="Socio" required options={persone.map(p=>({value:p.id,label:p.cognome+" "+p.nome}))}/>}</div>
 <label>Carica (obbligatoria)<select name="carica" required defaultValue=""><option value="">Seleziona carica…</option>{roles.map(r=><option key={r}>{r}</option>)}</select></label><label>Inizio mandato (obbligatorio)<input name="dal" type="date" required/></label></div>
 <div className="form-actions"><button type="submit" className="button">Registra componente</button><CancelEditButton/></div></EditForm></Drawer>}
 </section>}
 {tab==='sedute'&&<section className="sc-card"><h2>Sedute</h2><p>Le sedute sono registrate tramite i verbali: non esiste un registro separato delle riunioni.</p>{isStaff&&<Drawer title="Nuova seduta e verbale" trigger="Nuova seduta e verbale" primary><EditForm className="stack" action={caricaBozza}>
 <BoardDraftFields/>
 <div className="form-actions"><p>Le eventuali adesioni saranno selezionate e confermate prima di aprire la votazione.</p><button className="button">Carica bozza</button><CancelEditButton/></div></EditForm></Drawer>}{verbaliError?<Alert tone="warning">Sedute non disponibili.</Alert>:<ul>{verbaliCda.slice((page-1)*size,page*size).map(v=><li key={v.id}>{formatDate(v.data_consiglio)} · <Link href={'/organi-sociali/archivio?edit='+v.id}>{v.oggetto}</Link></li>)}</ul>}<Pagination page={page} size={size} count={verbaliError?null:verbaliCda.length} href={p=>'?tab=sedute&p='+p}/></section>}
 {([['in_approvazione','Verbali in approvazione'],['approvato','Verbali approvati'],['bozza','Bozze'],['sostituito','Versioni sostituite']] as const).map(([stato,titolo])=>{
 if(tab!==({in_approvazione:'votazioni',approvato:'approvati',bozza:'bozze',sostituito:'sostituiti'} as const)[stato])return null;
 const gruppo=verbaliCda.filter(v=>stato==='sostituito'?precedenti.has(v.id):v.stato===stato&&!precedenti.has(v.id));
 return <section key={stato} className="panel"><h2>{titolo}</h2>{verbaliError?<Alert tone="warning">Verbali non disponibili.</Alert>:!gruppo.length&&<p>Nessun verbale.</p>}{stato==='bozza'&&isStaff&&<ButtonLink href="?tab=sedute">Nuova seduta e verbale</ButtonLink>}
 {gruppo.slice((page-1)*size,page*size).map(v=>{const p=progressMap.get(v.id);return <article id={'verbale-'+v.id} key={v.id} className="sc-card timeline-item"><h3>{formatDate(v.data_consiglio)} · {v.oggetto}</h3>
 <p>Tipo: {v.tipo} · <StatusBadge tone={v.stato==='approvato'?'success':v.stato==='in_approvazione'?'warning':'neutral'}>{stato==='sostituito'?'Versione sostituita':v.stato.replaceAll('_',' ')}</StatusBadge> · {progressError?'Voti non disponibili':p&&Number(p.totali)>0?Number(p.approvati)+' / '+Number(p.totali)+' approvazioni':'Votazione non configurata'}</p>
 <Drawer title={'Voti registrati · '+v.oggetto} trigger="Consulta voti"><Firme id={v.id}/></Drawer><Drawer title={'Cronologia · '+v.oggetto} trigger="Cronologia"><Cronologia tipo="verbale" id={v.id} expanded/></Drawer>
 {v.precedente_id&&<Link href={'/organi-sociali/archivio?edit='+v.precedente_id}>Versione precedente</Link>}
 <div className="buttons"><Link href={'/organi-sociali/archivio?edit='+v.id}>Apri verbale</Link><a href={`/organi-sociali/documento/${v.id}?tipo=docx`}>Scarica Word</a>
 {v.stato==='approvato'?<Link href={`/organi-sociali/documento/${v.id}?tipo=pdf`}>PDF definitivo</Link>:<a href={`/organi-sociali/documento/${v.id}?tipo=anteprima`} target="_blank" rel="noopener">Apri e leggi il verbale</a>}</div>
 {v.stato==='bozza'&&isStaff&&<Link href={`/organi-sociali/archivio?edit=${v.id}`}>Modifica bozza</Link>}
 {v.stato==='bozza'&&isStaff&&!pendingError&&!peopleError&&<Drawer title={'Apri votazione · '+v.oggetto} trigger="Apri votazione" primary><EditForm action={avviaApprovazione} className="stack"><input type="hidden" name="verbale_id" value={v.id}/>
 <p>Data seduta: {formatDate(v.data_consiglio)} · {v.tipo}. Il quorum viene verificato dal sistema per la data della seduta.</p>{v.tipo!=='Gestione Ordinaria / Altro'?<BoardAdmissions options={adesioni.map(a=>({id:a.id,label:names.get(a.persona_id)??'Nominativo non disponibile'}))}/>:<p>Nessuna adesione associabile a questa tipologia.</p>}
 <button className="button">Conferma apertura votazione</button><CancelEditButton/></EditForm></Drawer>}
 {v.stato==='in_approvazione'&&!precedenti.has(v.id)&&isStaff&&p&&Number(p.totali)>0&&Number(p.approvati)===Number(p.totali)&&<form action={riprovaFinalizzazione}><input type="hidden" name="verbale_id" value={v.id}/><button className="button">Completa generazione PDF definitivo</button></form>}
 {v.stato==='in_approvazione'&&!precedenti.has(v.id)&&eligible.has(v.id)&&<form action={approvaVerbale}><input type="hidden" name="verbale_id" value={v.id}/><input type="hidden" name="versione" value={v.percorso_docx??''}/><button className="button">Approva verbale</button></form>}
 {isStaff&&!precedenti.has(v.id)&&['approvato','in_approvazione'].includes(v.stato)&&<Drawer title="Sostituisci documento" trigger="Sostituisci documento"><EditForm action={sostituisciVerbale}><h4>Nuova versione · {v.oggetto}</h4><input type="hidden" name="verbale_id" value={v.id}/><input type="hidden" name="versione" value={v.percorso_docx??''}/><BoardFile required label="Nuovo documento Word"/><div className="form-actions"><CancelEditButton/><button className="button">Sottoponi la nuova versione</button></div></EditForm></Drawer>}
 </article>;})}<Pagination page={page} size={size} count={verbaliError?null:gruppo.length} href={p=>'?tab='+tab+'&p='+p}/></section>;})}</>;
}
async function Firme({id}:{id:string}){
 const {supabase}=await requireBoard();
 const {data,error}=await tutteLePagine((da,a)=>supabase.rpc('firme_verbale',{p_verbale:id}).order('utente_id').range(da,a));
 if(error)return <p>Elenco delle approvazioni non disponibile.</p>;
 return <ul>{((data??[]) as {utente_id:string;nominativo:string;votato_il:string|null}[]).map(f=><li key={f.utente_id}>{f.nominativo} · {f.votato_il?'Approvato il '+dataOra(f.votato_il):'In attesa di approvazione'}</li>)}</ul>;
}
