import {redirect} from 'next/navigation';
import {statoSingolo} from '@/lib/certificati';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {markNotification} from './actions';
import {formatValue} from '@/lib/format';
export default async function PersonalArea() {
 const {supabase,user}=await requireUser();
 const {data:request,error:requestError}=await supabase.from('richieste').select('id,stato').eq('utente_id',user.id).maybeSingle();
 const {data:links,error:linksError}=await supabase.from('collegamenti_persone').select('persona_id,relazione').eq('utente_id',user.id);
 if(requestError||linksError)return <div className="container narrow"><h1>Area personale non disponibile</h1><p role="alert">Non è stato possibile verificare il profilo. Riprova prima di procedere.</p><Link href="/smista">Riprova</Link></div>;
 if(request?.stato!=='approvata'&&(!links||links.length===0))redirect('/richiesta/stato');
 const ids=links?.map(x=>x.persona_id)??[];
 const [{data:areaSociAccess},{data:season,error:seasonError}]=await Promise.all([supabase.rpc('area_soci_accesso'),supabase.from('stagioni').select('id,nome').eq('attiva',true).maybeSingle()]);
 const [{data:people,error:peopleError},{data:memberships,error:membershipError},{data:certs,error:certError},{data:quotes,error:quoteError},{data:news,error:newsError},{data:alerts,error:alertError}]=await Promise.all([
  ids.length?supabase.from('persone').select('id,nome,cognome,email,telefono').in('id',ids):Promise.resolve({data:[],error:null}),
  ids.length&&season?supabase.from('adesioni').select('persona_id,stato').in('persona_id',ids).eq('stagione_id',season.id):Promise.resolve({data:[],error:null}),
  ids.length?supabase.from('stato_certificati').select('id,persona_id,scade_il,idoneita_verificata,stato_certificato,documento_id').in('persona_id',ids).order('creato_il',{ascending:false}).order('id',{ascending:false}):Promise.resolve({data:[],error:null}),
  ids.length&&season?supabase.from('saldi_quote').select('id,persona_id,stagione_id,importo_dovuto,versato,residuo').in('persona_id',ids).eq('stagione_id',season.id):Promise.resolve({data:[],error:null}),
  supabase.from('comunicazioni').select('id,titolo,contenuto,pubblicata_il').eq('attiva',true).order('pubblicata_il',{ascending:false}).limit(10),
  supabase.from('notifiche').select('id,titolo,messaggio,creata_il').eq('utente_id',user.id).is('letta_il',null).order('creata_il',{ascending:false}).limit(20),
 ]);
 const brevetti=await Promise.all(ids.map(async id=>{const {count,error}=await supabase.from('brevetti_allievi').select('id',{head:true,count:'exact'}).eq('persona_id',id);return {id,count:error?null:count};}));
 return <div className="container"><div className="page-intro"><p className="eyebrow">Area personale</p><h1>La tua associazione</h1><p>Adesioni, corsi, brevetti, documenti e comunicazioni in un unico posto.</p></div>
 <div className="buttons" style={{marginBottom:25}}>{areaSociAccess===true&&<Link className="button" href="/area-soci">Area soci</Link>}<Link className="button" href="/area-personale/corsi">I miei corsi e iscrizioni</Link><Link className="button ghost" href="/documenti">Documenti personali</Link><Link className="button ghost" href="/area-personale/certificato">Carica certificato medico</Link><Link className="button ghost" href="/area-personale/profilo">Modifica recapiti</Link><Link className="button ghost" href="/richiesta/stato">Domanda di adesione</Link></div>
 {peopleError&&<p className="notice error" role="alert">Impossibile leggere i profili collegati.</p>}
 {seasonError?<p className="notice error">Stagione non verificabile.</p>:<p className="muted">{season?`Stagione attiva: ${season.nome}`:"Nessuna stagione attiva configurata."}</p>}
 <div className="cards">{people?.map(p=>{
 const quota=quotes?.find(q=>q.persona_id===p.id);
 const cert=certs?.find(c=>c.persona_id===p.id);
 return <article className="panel" key={p.id}><span className="eyebrow">{links?.find(l=>l.persona_id===p.id)?.relazione==='tutore'?'Persona rappresentata':'Profilo personale'}</span>
 <h2>{p.nome} {p.cognome}</h2>
 <p>Adesione: <strong>{seasonError||membershipError?'Non verificabile':!season?'Nessuna stagione attiva':memberships?.find(a=>a.persona_id===p.id)?.stato.replaceAll('_',' ')??'Non presente'}</strong></p>
 <p>Certificato: <strong>{certError?'Non verificabile':cert?`${formatValue(cert.scade_il)} · ${statoSingolo(cert.stato_certificato)}`:'Documento mancante'}</strong> · {cert?.documento_id?<Link href={'/documenti/'+cert.documento_id}>Apri certificato</Link>:<Link href={`/area-personale/certificato?persona=${p.id}`}>Carica certificato</Link>}</p>
 <p>Quota: <strong>{seasonError||quoteError?'Non verificabile':!season?'Nessuna stagione attiva':quota?`${formatValue(Number(quota.versato),'importo')} versati su ${formatValue(Number(quota.importo_dovuto),'importo')} · Residuo ${formatValue(Number(quota.residuo),'importo')}`:'Non registrata'}</strong></p>
 <p>Brevetti registrati: <strong>{brevetti.find(b=>b.id===p.id)?.count??'Non verificabile'}</strong></p>
 </article>})}</div>
 <div className="cards">
 <section className="panel"><h2>Notifiche</h2>{alertError?<p role="alert">Notifiche non disponibili.</p>:alerts?.length?alerts.map(n=><div className="timeline-item" key={n.id}><strong>{n.titolo}</strong><p>{n.messaggio}</p><form action={markNotification}><input type="hidden" name="id" value={n.id}/><button className="button ghost">Segna come letta</button></form></div>):<p className="muted">Nessuna nuova notifica.</p>}</section>
 <section className="panel"><h2>Comunicazioni</h2>{newsError?<p role="alert">Comunicazioni non disponibili.</p>:news?.length?news.map(n=><div className="timeline-item" key={n.id}><strong>{n.titolo}</strong><p>{n.contenuto}</p><small>{formatValue(n.pubblicata_il)}</small></div>):<p className="muted">Nessuna comunicazione recente.</p>}</section>
 </div><div className="notice warning"><strong>Attenzione:</strong> l'approvazione della domanda non certifica il pagamento della quota o il tesseramento. La segreteria completerà le verifiche.</div>
 </div>;
}
