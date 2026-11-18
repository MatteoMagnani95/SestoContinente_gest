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
export default async function Review({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{msg?:string}>}){
  const {id}=await params;
  const {msg}=await searchParams;
  const {supabase}=await requireStaff();
  const {data:r}=await supabase.from('richieste').select('*').eq('id',id).maybeSingle();
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
  const {data:events}=await supabase.from('eventi_pratica').select('evento,creato_il,nota_interna').eq('richiesta_id',r.id).order('creato_il',{ascending:false});
  return <><Link href="/gestionale/richieste" className="back-link">← Torna alle domande</Link>
    <div className="page-intro"><p className="eyebrow">Dettaglio della pratica #{r.id.slice(0,8).toUpperCase()}</p><h1>{r.nome} {r.cognome}</h1><span className={`status status-${r.stato}`}>{statoLabel[r.stato as Stato]}</span></div>
    {isTestApplication(r)&&<div className="notice warning">COLLAUDO — pratica simulata. Utilizzare solo per test; nessuna presa visione ufficiale. {r.stato==='approvata'?'Approvazione simulata: i dati sono registrati nel database in uso, anche se condiviso con la produzione.':''}</div>}
    {msg && (msg!=='approvata'||r.stato==='approvata') && <p role="status" className={`notice ${['presa','approvata','integrazione','respinta'].includes(msg)?'success':'error'}`}>{msg==='approvata'&&testMode?'Domanda di collaudo approvata. Anagrafica associata nel database: si tratta di una simulazione.':queryMessage(msg)}</p>}
    <div className="review-grid"><section className="panel"><h2>Dati forniti</h2>
      <Row label="Nome" value={`${r.nome} ${r.cognome}`}/><Row label="Data di nascita" value={formatDate(r.data_nascita)}/>
      <Row label="Comune / luogo di nascita" value={r.luogo_nascita}/><Row label="Provincia e Stato di nascita" value={[r.provincia_nascita,r.stato_nascita].filter(Boolean).join(" · ")}/><Row label="Sesso per CF" value={r.sesso_cf}/><Row label="Codice catastale" value={r.codice_catastale_nascita}/><Row label="Codice fiscale" value={r.codice_fiscale??'Non indicato'}/>
      <Row label="Residenza" value={`${r.indirizzo}, ${r.cap} ${r.comune}`}/><Row label="Telefono" value={r.telefono}/>
      <Row label="Tutore" value={r.nome_tutore?`${r.nome_tutore} ${r.cognome_tutore} (${r.parentela_tutore})`:'Non previsto'}/>
      <Row label="Presa visione" value={r.presa_visione?(isTestApplication(r)?'Simulata (collaudo)':'Registrata'):'Non registrata'}/>
      <Row label="Statuto" value={r.flag_statuto?(r.versione_statuto??'Versione mancante'):'Non registrato'}/><Row label="Informativa privacy" value={r.flag_privacy?(r.versione_privacy??'Versione mancante'):'Non registrata'}/>
      <Row label="Data invio" value={formatDate(r.inviata_il)}/>
      {r.stato==='approvata'&&r.persona_id&&<Link className="button" href={`/comunicazioni/soci/${r.persona_id}`}>Prepara email di benvenuto</Link>}
      {r.nota_pubblica && <div className="notice">Comunicazione al richiedente: {r.nota_pubblica}</div>}
      {r.stato==='inviata' && <form action={takeApplicationAction} className="actions"><input type="hidden" name="id" value={id}/><button type="submit" className="button">Prendi in carico</button></form>}
      {r.stato==='in_verifica' && <ApplicationReviewForm key={r.id} id={r.id} testMode={testMode} checks={checks}/>}
    <details><summary>Gestisci pratica</summary><RemoveRecord moduleKey="richieste" id={r.id} back="richieste"/></details></section><aside className="panel"><h2>Storico delle operazioni</h2>
      {events?.map((e,i)=><div className="timeline-item" key={i}><strong>{testMode&&e.evento==='approvata'?'approvata (collaudo)':e.evento.replaceAll('_',' ')}</strong><small>{formatDate(e.creato_il)}</small>{e.nota_interna && <p className="muted">Nota interna: {e.nota_interna}</p>}</div>)}
      {!events?.length && <p className="muted">Nessuna operazione registrata.</p>}
      <p className="muted tiny">Le note interne non sono leggibili dal richiedente.</p>
    </aside></div>
  </>;
}
