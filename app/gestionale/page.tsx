import Link from 'next/link';
import {ButtonLink,PageHeader,SectionHeader,MetricCard,EmptyState,ErrorState,Alert,type Area} from '@/components/ui/Primitives';
import {Icon,type IconName} from '@/components/ui/Icon';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
import {romeDay,shiftDay} from '@/lib/calendar-tools';
import {asRomeISO} from '@/lib/course-tools';
import {exactCount,pendingRequestStates} from '@/lib/secretariat';
export default async function Dashboard(){
 const {supabase,user}=await requireStaff();
 const now=new Date().toISOString(),today=romeDay(now),cutoff=shiftDay(today,30);
 const {data:season,error:seasonError}=await supabase.from('stagioni').select('id,nome').eq('attiva',true).maybeSingle();
 const unavailable={count:null,error:true};
 const [requests,adhesions,courses,enrollments,revisions,certificates,quotes,pendingAdhesions,events,lessons,admin]=await Promise.all([
  supabase.from('richieste').select('id',{head:true,count:'exact'}).in('stato',[...pendingRequestStates]),
  season?supabase.from('adesioni').select('id',{head:true,count:'exact'}).eq('stagione_id',season.id).eq('stato','attiva'):unavailable,
  supabase.from('edizioni_corsi').select('id',{head:true,count:'exact'}).eq('stato','attivo'),
  supabase.from('iscrizioni_corsi').select('id',{head:true,count:'exact'}).eq('stato','iscritto'),
  supabase.from('attrezzature').select('id',{head:true,count:'exact'}).gte('prossima_revisione',today).lte('prossima_revisione',cutoff),
  supabase.from('stato_certificati').select('id',{head:true,count:'exact'}).eq('stato_certificato','valido').gte('scade_il',today).lte('scade_il',cutoff),
  season?supabase.from('saldi_quote').select('id',{head:true,count:'exact'}).eq('stagione_id',season.id).gt('residuo',0):unavailable,
  season?supabase.from('adesioni').select('id',{head:true,count:'exact'}).eq('stagione_id',season.id).eq('stato','da_perfezionare'):unavailable,
  supabase.from('eventi_soci').select('id,titolo,dal,al,stato',{count:'exact'}).gte('dal',today).neq('stato','annullato').order('dal').order('id').limit(5),
  supabase.from('lezioni').select('id,titolo,inizio,fine',{count:'exact'}).is('annullata_il',null).gte('inizio',now).order('inizio').order('id').limit(8),
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle()
 ]);
 type Metric={label:string;icon:IconName;area:Area;result:{count:number|null;error:unknown};href:string;note?:string};
 const seasonQuery=season?'&stagione='+season.id:'';
 const summary:Metric[]=[
  {label:'Adesioni attive',icon:'users',area:'secretariat',result:adhesions,href:'/gestionale/soci?stato=attiva'+seasonQuery,note:season?.nome??'Stagione attiva non disponibile'},
  {label:'Corsi attivi',icon:'course',area:'teaching',result:courses,href:'/gestionale/corsi?stato=attivo'},
  {label:'Iscrizioni allievi',icon:'users',area:'teaching',result:enrollments,href:'/gestionale/moduli/iscrizioni?vista=elenco&filtro_modulo=stato%3Aiscritto',note:'Iscrizioni, non persone uniche'},
  {label:'Eventi imminenti',icon:'calendar',area:'calendar',result:events,href:'/gestione-eventi?periodo=prossimi&dal='+today}
 ];
 const tasks:Metric[]=[
  {label:'Domande da gestire',icon:'clipboard',area:'secretariat',result:requests,href:'/gestionale/richieste?filtro=da_gestire'},
  {label:'Adesioni da perfezionare',icon:'users',area:'secretariat',result:pendingAdhesions,href:'/gestionale/soci?stato=da_perfezionare'+seasonQuery,note:season?.nome??'Stagione attiva non disponibile'},
  {label:'Quote da incassare',icon:'wallet',area:'finance',result:quotes,href:'/gestionale/incassi?tab=quota&stato=residuo'+seasonQuery,note:'Posizioni con residuo positivo'},
  {label:'Revisioni da effettuare',icon:'equipment',area:'equipment',result:revisions,href:'/gestionale/report?categoria=Revisioni&periodo=30',note:'Entro 30 giorni (scadute nel report dedicato)'},
  {label:'Certificati in scadenza',icon:'certificate',area:'system',result:certificates,href:'/gestionale/moduli/certificati?stato=in_scadenza&dal='+today+'&al='+cutoff,note:'Validi, in scadenza entro 30 giorni'}
 ];
 function metric(m:Metric){if(!season&&['Adesioni attive','Adesioni da perfezionare','Quote da incassare'].includes(m.label))return <MetricCard key={m.label} label={m.label} icon={m.icon} area={m.area} value="—" note="Stagione attiva non disponibile"/>;return <Link key={m.label} href={m.href} className="sc-metric-link" aria-label={m.label+': '+exactCount(m.result)+'. Apri elenco'}><MetricCard label={m.label} icon={m.icon} area={m.area} value={exactCount(m.result)} note={exactCount(m.result)==='—'?'Dato non disponibile':m.note}/><span className="sc-metric-open">Apri elenco <Icon name="chevron-right"/></span></Link>;}
 const lessonsError=lessons.error;
 return <>
 <PageHeader eyebrow="Segreteria · Centro operativo" title="Panoramica" description={season?'Stagione attiva: '+season.nome:'Consulta la situazione associativa e le attività da gestire.'}/>
 {(!season||seasonError)&&<Alert tone="warning" title="Stagione attiva non disponibile">I dati che dipendono dalla stagione non possono essere calcolati.</Alert>}
 <section className="sc-dashboard-section"><SectionHeader title="Panoramica associativa"/><div className="sc-metrics">{summary.map(metric)}</div></section>
 <section className="sc-dashboard-section"><SectionHeader title="Attività da gestire" description="Priorità operative e scadenze."/><div className="sc-metrics">{tasks.map(metric)}</div></section>
 {[...summary,...tasks].some(m=>exactCount(m.result)==='—')&&<Alert tone="warning">Alcuni dati non sono disponibili: un valore mancante non equivale a zero.</Alert>}
 <section className="sc-card"><SectionHeader title="Azioni rapide"/><div className="sc-quick-actions">
 {[
 ['Cerca socio','/gestionale/soci','search'],['Esamina domande','/gestionale/richieste?filtro=da_gestire','clipboard'],['Crea corso','/gestionale/corsi/nuovo','plus'],['Programma lezione','/gestionale/moduli/calendario?nuovo=1','calendar'],['Registra incasso','/gestionale/incassi?stato=residuo','wallet'],['Registra consegna','/gestionale/moduli/consegne?nuovo=1','equipment'],['Consulta calendario','/gestionale/calendario-visivo','calendar'],['Consulta scadenze','/gestionale/report','clock']
 ].map(([label,href,icon])=><ButtonLink key={label} href={href} icon={icon as IconName} variant="secondary">{label}</ButtonLink>)}</div></section>
 <div className="sc-dashboard-grid"><section className="sc-card"><SectionHeader title="Prossime lezioni" description="Fino a 8 appuntamenti futuri."/>
 {lessonsError?<ErrorState description="Non è stato possibile caricare le lezioni."/>:lessons.data?.length?lessons.data.map(l=><Link className="sc-appointment sc-appointment-link" key={l.id} href={'/gestionale/calendario-visivo/'+l.id}><Icon name="calendar"/><div><strong>{l.titolo}</strong><p>{formatValue(l.inizio)} – {formatValue(l.fine)}</p></div><Icon name="chevron-right"/></Link>):<EmptyState title="Nessuna lezione programmata"/>}
 <ButtonLink href="/gestionale/calendario-visivo" variant="secondary">Apri calendario</ButtonLink></section>
 <section className="sc-card"><SectionHeader title="Prossimi eventi" description="Fino a 5 eventi non annullati."/>
 {events.error?<ErrorState description="Non è stato possibile caricare gli eventi."/>:events.data?.length?events.data.map(e=><Link className="sc-appointment sc-appointment-link" key={e.id} href={'/gestione-eventi/'+e.id}><Icon name="calendar"/><div><strong>{e.titolo}</strong><p>{formatValue(e.dal)} – {formatValue(e.al)}</p></div><Icon name="chevron-right"/></Link>):<EmptyState title="Nessun evento imminente"/>}
 <ButtonLink href={'/gestione-eventi?periodo=prossimi&dal='+today} variant="secondary">Apri eventi</ButtonLink></section></div>
 {admin.data&&<section className="sc-card"><SectionHeader title="Amministrazione" description="Accesso riservato all’amministratore."/><div className="sc-quick-actions"><ButtonLink href="/gestionale/economia">Rendiconto economico</ButtonLink><ButtonLink href="/gestionale/moduli/contabilita" variant="secondary">Movimenti contabili</ButtonLink><ButtonLink href="/gestionale/utenti" variant="secondary">Gestione utenti</ButtonLink><ButtonLink href="/gestionale/amministrazione-dati" variant="secondary">Amministrazione dati</ButtonLink><ButtonLink href="/gestionale/moduli/stagioni" variant="secondary">Stagioni</ButtonLink></div></section>}
 <p className="sc-dashboard-footnote">Conteggi esatti dal database, secondo i permessi dell’account. Gli appuntamenti sono anteprime, non elenchi completi.</p>
 </>;
}
