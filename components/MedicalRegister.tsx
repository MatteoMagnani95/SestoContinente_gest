import type {SupabaseClient} from '@supabase/supabase-js';
import Link from '@/components/ui/PrivateLink';
import {PageHeader,Alert,StatusBadge,ButtonLink} from '@/components/ui/Primitives';
import {SecretariatNav} from '@/components/ui/Secretariat';
import {medicalRoster,medicalDates,MEDICAL_FILTERS,type MedicalRow} from '@/lib/medical-roster';
import {statoSingolo} from '@/lib/certificati';
import {formatValue} from '@/lib/format';
import {dateFilter,searchTerms} from '@/lib/secretariat';
import {pageNumber} from '@/lib/module-ui';
import {EsitoCertificato,SollecitoCertificato} from '@/components/CertificateRowActions';
const base='/gestionale/moduli/certificati';
const labels:Record<string,string>={in_attesa:'Da verificare',in_scadenza:'In scadenza',scaduto:'Scaduti',mancante:'Mancanti',non_valido:'Non validi',valido:'Validi'};
const tones:Record<string,'info'|'warning'|'danger'|'success'>={in_attesa:'info',in_scadenza:'warning',scaduto:'danger',mancante:'danger',non_valido:'danger',valido:'success'};
const colors:Record<string,string>={info:'#216ba5',warning:'#80520b',danger:'#a62d40',success:'#246d43'};
export default async function MedicalRegister({supabase,params}:{supabase:SupabaseClient;params:Record<string,string|undefined>}){
 const {today,limit}=medicalDates();const q=params.q??'',dal=dateFilter(params.dal),al=dateFilter(params.al);
 const active=MEDICAL_FILTERS.find(k=>k===params.stato)??'',page=pageNumber(params.p),size=30;
 let roster:MedicalRow[]=[];let error=false;try{roster=await medicalRoster(supabase);}catch{error=true;}
 const match=(row:MedicalRow,k:string)=>k==='in_scadenza'?Boolean(row.documento_id&&typeof row.scade_il==='string'&&row.scade_il>=today&&row.scade_il<=limit):row.stato_certificato===k;
 const scoped=roster.filter(r=>searchTerms(q).every(t=>(r.sort_cognome+' '+r.sort_nome).toLocaleLowerCase('it').includes(t.toLocaleLowerCase('it')))&&(!dal||Boolean(r.documento_id&&String(r.scade_il)>=dal))&&(!al||Boolean(r.documento_id&&String(r.scade_il)<=al)));
 const filtered=scoped.filter(r=>!active||match(r,active));
 const dir=params.dir==='desc'?-1:1;
 if(params.ordine==='scade_il')filtered.sort((a,b)=>{if(!a.documento_id||!b.documento_id)return Number(Boolean(b.documento_id))-Number(Boolean(a.documento_id));return dir*String(a.scade_il).localeCompare(String(b.scade_il))||a.persona_id.localeCompare(b.persona_id);});
 else if(dir===-1)filtered.reverse();
 const href=(state:string,pn=1)=>{const sp=new URLSearchParams();if(q)sp.set('q',q);if(dal)sp.set('dal',dal);if(al)sp.set('al',al);if(state)sp.set('stato',state);if(params.ordine==='scade_il')sp.set('ordine','scade_il');if(dir===-1)sp.set('dir','desc');if(pn>1)sp.set('p',String(pn));return base+(sp.size?'?'+sp.toString():'');};
 return <div className="medical-register stack">
 <PageHeader area="certificate" icon="certificate" marine eyebrow="Segreteria" title="Certificati medici" description="Soci e allievi della stagione attiva: controlla documenti, esiti e scadenze." actions={<ButtonLink href={base+'?archivio=1&nuovo=1'}>Registra certificato</ButtonLink>}/>
 <SecretariatNav active={base}/>
 <nav className="medical-metrics" aria-label="Situazione certificati">{MEDICAL_FILTERS.map(k=><Link className="sc-card" key={k} href={href(k)} aria-current={active===k?'page':undefined} style={{color:colors[tones[k]],outline:active===k?'2px solid currentColor':undefined}}>{labels[k]}<strong>{error?'—':scoped.filter(r=>match(r,k)).length}</strong>{k==='in_scadenza'&&<small>Entro 30 giorni</small>}</Link>)}</nav>
 <form method="get" className="module-toolbar"><div className="search-line"><input name="q" aria-label="Cerca per nome o cognome" placeholder="Cerca nome o cognome" defaultValue={q}/><button type="submit" className="button ghost">Cerca</button></div>{active&&<input type="hidden" name="stato" value={active}/>}<label>Scadenza dal<input type="date" name="dal" defaultValue={dal}/></label><label>Scadenza al<input type="date" name="al" defaultValue={al}/></label><label>Ordina<select name="ordine" defaultValue={params.ordine==='scade_il'?'scade_il':''}><option value="">Nominativo</option><option value="scade_il">Scadenza</option></select></label><label>Direzione<select name="dir" defaultValue={dir===-1?'desc':'asc'}><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></label><button className="button ghost">Applica filtri</button></form>
 <div className="buttons"><Link className="button ghost" href={href('')}>Tutti gli iscritti</Link><Link className="button ghost" href={base}>Azzera filtri</Link><Link className="button ghost" href={base+'?archivio=1'}>Archivio storico</Link><Link className="button ghost" href="/gestionale/esporta/certificati">Esporta archivio CSV</Link></div>
 <section className="stack"><h2>{active?labels[active]:'Tutte le persone iscritte'}</h2><p>Una riga per persona. Scadenza imminente entro 30 giorni, anche per documenti in attesa di verifica.</p>
 {error?<Alert tone="warning">Elenco iscritti non disponibile. Riprova.</Alert>:<><p className="hint medical-scroll-hint">Scorri orizzontalmente per tutte le azioni.</p><div className="sc-card table-panel medical-table-scroll" tabIndex={0} role="region" aria-label="Registro certificati"><table className="medical-table"><thead><tr>{['Nome e cognome','Certificato','Documento','Scadenza','Cambia esito','Azioni'].map(l=><th key={l} scope="col">{l}</th>)}</tr></thead><tbody>
 {filtered.slice((page-1)*size,page*size).map(r=>{const nome=r.sort_cognome+' '+r.sort_nome,doc=r.documento_id??'',state=r.stato_certificato,previous=String(r.esito_verifica??'');return <tr key={r.persona_id}><th scope="row">{nome}</th><td><StatusBadge tone={tones[state]??'neutral'}>{statoSingolo(state)}</StatusBadge></td><td>{doc?<Link className="button ghost" href={'/documenti/'+doc}>Visualizza certificato</Link>:<Link className="button ghost" href={'/area-personale/certificato?origine=gestionale&persona='+r.persona_id}>Carica certificato</Link>}</td><td>{doc?formatValue(r.scade_il,'scade_il'):'—'}{doc&&typeof r.scade_il==='string'&&r.scade_il>=today&&r.scade_il<=limit&&<div className="hint" style={{color:'#80520b'}}>Entro 30 giorni</div>}</td><td>{doc?<EsitoCertificato key={r.id+':'+doc+':'+previous} id={r.id} documento={doc} precedente={previous} iniziale={previous||(r.idoneita_verificata===true?'valido':'in_attesa')} nome={nome}/>:<span className="hint">Documento mancante</span>}</td><td><div className="buttons">{!doc&&<SollecitoCertificato persona={r.persona_id} nome={nome}/>}<Link href={base+'?persona='+r.persona_id+'&archivio=1'}>Storico</Link></div></td></tr>;})}
 {!filtered.length&&<tr><td colSpan={6}>Nessun iscritto corrisponde ai filtri.</td></tr>}
 </tbody></table></div><div className="pager"><span>{filtered.length} persone · Pagina {page}</span><div className="buttons">{page>1&&<Link className="button ghost" href={href(active,page-1)}>Precedente</Link>}{page*size<filtered.length&&<Link className="button ghost" href={href(active,page+1)}>Successiva</Link>}</div></div></>}
 </section><p className="hint">Notifica interna: un sollecito al giorno per persona, solo agli account collegati. Lo stato scaduto è calcolato automaticamente.</p></div>;
}
