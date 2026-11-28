import {PageHeader,StatusBadge,Alert,ButtonLink} from '@/components/ui/Primitives';
import {Pagination} from '@/components/ui/DataTable';
import ActionForm from '@/components/ui/ActionForm';
import {statusTone,displayName} from '@/lib/secretariat';
import {pageNumber,listHref} from '@/lib/module-ui';
import {minorAge} from '@/lib/application-input';
import {dataOra} from '@/lib/scelte';
import Dichiarazioni from '@/components/Dichiarazioni';
import {isTestApplication} from '@/lib/application-config';
import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff,formatDate,statoLabel,type Stato,queryMessage} from '@/lib/security';
import {takeApplicationAction} from '@/app/actions';
import ApplicationReviewForm from '@/components/ApplicationReviewForm';
import {declarationCheck,seasonCheck,duplicateCheck,escapeReviewPattern,type ReviewCheck} from '@/lib/application-review';
function Row({label,value}:{label:string,value:React.ReactNode}){
  return <div className="info-row"><span className="k">{label}</span><strong>{value || '—'}</strong></div>;
}
export default async function Review({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{msg?:string;p?:string}>}){
  const {id}=await params;
  const {msg,p}=await searchParams;const page=pageNumber(p),size=30;
  const {supabase}=await requireStaff();
  const {data:r,error:requestError}=await supabase.from('richieste').select('*').eq('id',id).maybeSingle();
  if(requestError)return <Alert tone="danger" announce>Impossibile leggere la pratica. Riprova.</Alert>;
  if(!r) notFound();
  const testMode=isTestApplication(r);
  const checks:ReviewCheck[]=[];
  if(r.stato==='in_verifica'){
    const [season,cf,identity]=await Promise.all([
      supabase.from('stagioni').select('id',{count:'exact',head:true}).eq('attiva',true),
      r.codice_fiscale!=null&&!r.codice_fiscale.includes('*')?supabase.from('persone').select('id',{count:'exact',head:true}).ilike('codice_fiscale',escapeReviewPattern(r.codice_fiscale)):Promise.resolve({count:r.codice_fiscale==null?0:null,error:r.codice_fiscale!=null}),
      r.nome&&r.cognome&&r.data_nascita&&!r.nome.includes('*')&&!r.cognome.includes('*')?supabase.from('persone').select('id',{count:'exact',head:true}).ilike('nome',escapeReviewPattern(r.nome)).ilike('cognome',escapeReviewPattern(r.cognome)).eq('data_nascita',r.data_nascita):Promise.resolve({count:null,error:true}),
    ]);
    checks.push(declarationCheck(r),seasonCheck(season.count,Boolean(season.error)),duplicateCheck([cf.count,identity.count],Boolean(cf.error||identity.error)));
  }
  const {data:events,error:eventError,count:eventCount}=await supabase.from('eventi_pratica').select('id,evento,creato_il,nota_interna',{count:'exact'}).eq('richiesta_id',r.id).order('creato_il',{ascending:false}).order('id',{ascending:false}).range((page-1)*size,page*size-1);
  let documentQuery=supabase.from('documenti').select('id,nome,categoria,caricato_il',{count:'exact'}).eq('utente_id',r.utente_id);
  documentQuery=r.persona_id?documentQuery.eq('persona_id',r.persona_id):documentQuery.is('persona_id',null);
  const documents=await documentQuery.order('caricato_il',{ascending:false}).order('id').limit(20);
  return <>
    <PageHeader eyebrow={'Pratica #'+r.id.slice(0,8).toUpperCase()} title={displayName(r.nome)+' '+displayName(r.cognome)} area="secretariat" icon="clipboard" marine description="Valutazione della domanda di adesione" actions={<StatusBadge tone={statusTone(r.stato)}>{statoLabel[r.stato as Stato]}</StatusBadge>}/>
    {isTestApplication(r)&&<Alert tone="warning" title="COLLAUDO">Pratica simulata, non attestazione di documenti ufficiali. {r.stato==='approvata'?'Approvazione simulata: dati registrati nel database in uso.':''}</Alert>}
    {msg && (msg!=='approvata'||r.stato==='approvata') && <p role="status" className={`notice ${['presa','approvata','integrazione','respinta'].includes(msg)?'success':'error'}`}>{msg==='approvata'&&testMode?'Domanda di collaudo approvata. Anagrafica associata nel database: si tratta di una simulazione.':queryMessage(msg)}</p>}
    <div className="sc-review-sections">
      <section className="sc-card sc-review-wide sc-review-priority"><h2>Riepilogo e gestione della pratica</h2><Row label="Data invio" value={formatDate(r.inviata_il)}/><Row label="Ultimo aggiornamento" value={dataOra(r.modificato_il)}/>
      {r.stato==='inviata'&&<ActionForm action={takeApplicationAction} className="actions"><input type="hidden" name="id" value={id}/><button type="submit" className="sc-button sc-button-primary">Prendi in carico</button></ActionForm>}
      {r.stato==='in_verifica'&&<ApplicationReviewForm key={r.id} id={r.id} testMode={testMode} checks={checks}/>}
      {r.stato==='approvata'&&r.persona_id&&<div className="sc-row-actions"><ButtonLink href={'/gestionale/soci/'+r.persona_id}>Apri scheda socio</ButtonLink><ButtonLink href={`/comunicazioni/soci/${r.persona_id}`} variant="secondary">Prepara email di benvenuto</ButtonLink></div>}
      {r.stato==='approvata'&&<p>Approvazione della domanda distinta dall’attivazione dell’adesione, dal tesseramento e dal pagamento della quota.</p>}
      {r.stato==='integrazione_richiesta'&&<p>In attesa delle integrazioni del richiedente.</p>}{r.stato==='bozza'&&<p>La domanda non è ancora stata inviata.</p>}
      </section>
      <section className="sc-card"><h2>Dati anagrafici</h2><Row label="Nome" value={r.nome+' '+r.cognome}/><Row label="Data di nascita" value={formatDate(r.data_nascita)}/><Row label="Comune / luogo di nascita" value={r.luogo_nascita}/><Row label="Provincia e Stato" value={[r.provincia_nascita,r.stato_nascita].filter(Boolean).join(' · ')}/><Row label="Sesso per CF" value={r.sesso_cf}/><Row label="Codice fiscale" value={r.codice_fiscale??'Non acquisito'}/></section>
      <section className="sc-card"><h2>Residenza e recapiti</h2><Row label="Residenza" value={[r.indirizzo,r.cap,r.comune].filter(Boolean).join(' · ')}/><Row label="Telefono" value={r.telefono}/><Row label="Contatto di emergenza" value={[r.emergenza_nome,r.emergenza_telefono].filter(Boolean).join(' · ')||'Non acquisito'}/><h3>Tutore o rappresentante</h3><Row label="Tutore" value={r.nome_tutore?r.nome_tutore+' '+r.cognome_tutore+' ('+r.parentela_tutore+')':minorAge(r.data_nascita??'')?'Non acquisito':'Non applicabile'}/></section>
      <section className="sc-card"><h2>Documenti</h2><p className="tiny muted">Documenti dell’account richiedente non collegati ad altre persone. Non sono necessariamente allegati alla singola pratica.</p>{documents.error?<Alert tone="warning">Elenco non disponibile.</Alert>:documents.data?.length?<ul>{documents.data.map(doc=><li key={doc.id}><Link href={'/documenti/'+doc.id}>{doc.nome}</Link> · {doc.categoria}</li>)}</ul>:<p>Nessun documento collegato all’account.</p>}{!documents.error&&(documents.count??0)>20&&<p>Primi 20 documenti su {documents.count}. Consulta l’archivio autorizzato.</p>}<Link href="/documenti">Apri archivio documenti</Link></section>
      <section className="sc-card"><h2>Dichiarazioni e consensi</h2><Row label="Presa visione" value={r.presa_visione?(testMode?'Simulata (collaudo)':'Registrata'):'Non registrata'}/><Row label="Statuto" value={r.flag_statuto?(r.versione_statuto??'Versione mancante'):'Non registrato'}/><Dichiarazioni dati={r}/></section>
      <section className="sc-card sc-review-wide"><h2>Comunicazioni</h2>{r.nota_pubblica?<p>{r.nota_pubblica}</p>:<p>Nessun messaggio al richiedente registrato nella pratica.</p>}</section>
      <section className="sc-card sc-review-wide"><h2>Cronologia</h2>{eventError?<Alert tone="danger">Impossibile leggere la cronologia.</Alert>:events?.length?<ol className="sc-timeline">{events.map(e=><li key={e.id}><strong>{testMode&&e.evento==='approvata'?'approvata (collaudo)':e.evento.replaceAll('_',' ')}</strong><time dateTime={e.creato_il}>{dataOra(e.creato_il)}</time>{e.nota_interna&&<p>Nota interna: {e.nota_interna}</p>}</li>)}</ol>:<p>Nessuna operazione registrata.</p>}<Pagination page={page} size={size} count={eventError?null:eventCount} label="eventi" href={p=>listHref({p:String(p)})}/><p className="tiny muted">Le note interne sono riservate alla segreteria.</p></section>
    </div>
    {r.stato!=='approvata'&&<section className="sc-card"><h2>Operazioni sulla pratica</h2><RemoveRecord moduleKey="richieste" id={r.id} back="richieste" label={r.nome+' '+r.cognome}/></section>}
  </>;
}
