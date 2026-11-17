import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {markNotification} from './actions';
import {formatValue} from '@/lib/format';
export default async function PersonalArea() {
 const {supabase,user}=await requireUser();
 const {data:request}=await supabase.from('richieste').select('id,stato').eq('utente_id',user.id).maybeSingle();
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id,relazione').eq('utente_id',user.id);
 if(request?.stato!=='approvata'&&(!links||links.length===0))redirect('/richiesta/stato');
 const ids=links?.map(x=>x.persona_id)??[];
 const {data:areaSociAccess}=await supabase.rpc('area_soci_accesso');
 const [{data:people},{data:memberships},{data:certs},{data:brevetti},{data:quotes},{data:payments},{data:news},{data:alerts}]=await Promise.all([
  ids.length?supabase.from('persone').select('id,nome,cognome,email,telefono').in('id',ids):Promise.resolve({data:[]}),
  ids.length?supabase.from('adesioni').select('persona_id,stato').in('persona_id',ids):Promise.resolve({data:[]}),
  ids.length?supabase.from('certificati_medici').select('persona_id,scade_il,idoneita_verificata').in('persona_id',ids).order('scade_il',{ascending:false}):Promise.resolve({data:[]}),
  ids.length?supabase.from('brevetti_allievi').select('persona_id,titolo,scade_il').in('persona_id',ids).limit(50):Promise.resolve({data:[]}),
  ids.length?supabase.from('quote_associative').select('id,persona_id,importo_dovuto,scadenza').in('persona_id',ids).limit(50):Promise.resolve({data:[]}),
  ids.length?supabase.from('pagamenti').select('quota_id,importo').in('persona_id',ids).limit(100):Promise.resolve({data:[]}),
  supabase.from('comunicazioni').select('id,titolo,contenuto,pubblicata_il').eq('attiva',true).order('pubblicata_il',{ascending:false}).limit(10),
  supabase.from('notifiche').select('id,titolo,messaggio,creata_il').eq('utente_id',user.id).is('letta_il',null).order('creata_il',{ascending:false}).limit(20),
 ]);
 return <div className="container"><div className="page-intro"><p className="eyebrow">Area personale</p><h1>La tua associazione</h1><p>Adesioni, corsi, brevetti, documenti e comunicazioni in un unico posto.</p></div>
 <div className="buttons" style={{marginBottom:25}}>{areaSociAccess===true&&<Link className="button" href="/area-soci">Area soci</Link>}<Link className="button" href="/area-personale/corsi">I miei corsi e iscrizioni</Link><Link className="button ghost" href="/documenti">Documenti personali</Link><Link className="button ghost" href="/area-personale/certificato">Carica certificato medico</Link><Link className="button ghost" href="/area-personale/profilo">Modifica recapiti</Link><Link className="button ghost" href="/richiesta/stato">Domanda di adesione</Link></div>
 <div className="cards">{people?.map(p=>{
 const quota=quotes?.find(q=>q.persona_id===p.id);
 const paid=quota?payments?.filter(x=>x.quota_id===quota.id).reduce((a,x)=>a+Number(x.importo),0)??0:0;
 const cert=certs?.find(c=>c.persona_id===p.id);
 return <article className="panel" key={p.id}><span className="eyebrow">{links?.find(l=>l.persona_id===p.id)?.relazione==='tutore'?'Persona rappresentata':'Profilo personale'}</span>
 <h2>{p.nome} {p.cognome}</h2>
 <p>Adesione: <strong>{memberships?.find(a=>a.persona_id===p.id)?.stato.replaceAll('_',' ')??'Non presente'}</strong></p>
 <p>Certificato: <strong>{cert?`${cert.scade_il} · ${cert.idoneita_verificata?'verificato':'da verificare'}`:'Non registrato'}</strong></p>
 <p>Quota: <strong>{quota?`${formatValue(paid,'importo')} versati su ${formatValue(quota.importo_dovuto,'importo')}`:'Non registrata'}</strong></p>
 <p>Brevetti registrati: <strong>{brevetti?.filter(b=>b.persona_id===p.id).length??0}</strong></p>
 </article>})}</div>
 <div className="cards">
 <section className="panel"><h2>Notifiche</h2>{alerts?.length?alerts.map(n=><div className="timeline-item" key={n.id}><strong>{n.titolo}</strong><p>{n.messaggio}</p><form action={markNotification}><input type="hidden" name="id" value={n.id}/><button className="button ghost">Segna come letta</button></form></div>):<p className="muted">Nessuna nuova notifica.</p>}</section>
 <section className="panel"><h2>Comunicazioni</h2>{news?.length?news.map(n=><div className="timeline-item" key={n.id}><strong>{n.titolo}</strong><p>{n.contenuto}</p><small>{formatValue(n.pubblicata_il)}</small></div>):<p className="muted">Nessuna comunicazione recente.</p>}</section>
 </div><div className="notice warning"><strong>Attenzione:</strong> l'approvazione della domanda non certifica il pagamento della quota o il tesseramento. La segreteria completerà le verifiche.</div>
 </div>;
}
