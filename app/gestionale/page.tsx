import { ButtonLink, PageHeader, SectionHeader, MetricCard, EmptyState, ErrorState, Alert } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import type { Area } from '@/components/ui/Primitives';
import type { IconName } from '@/components/ui/Icon';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
export default async function Dashboard(){
 const {supabase,user}=await requireStaff();
 const counts=await Promise.all([
  supabase.from('richieste').select('*',{head:true,count:'exact'}).in('stato',['inviata','in_verifica','integrazione_richiesta']),
  supabase.from('adesioni').select('*',{head:true,count:'exact'}),
  supabase.from('edizioni_corsi').select('*',{head:true,count:'exact'}).eq('stato','attivo'),
  supabase.from('iscrizioni_corsi').select('*',{head:true,count:'exact'}).eq('stato','iscritto'),
  supabase.from('attrezzature').select('*',{head:true,count:'exact'}),
  supabase.from('certificati_medici').select('*',{head:true,count:'exact'}),
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle(),
 ]);
 const metrics: {label:string;icon:IconName;area:Area}[]=[
  {label:'Richieste da gestire',icon:'clipboard',area:'secretariat'},
  {label:'Adesioni registrate',icon:'users',area:'secretariat'},
  {label:'Corsi attivi',icon:'course',area:'teaching'},
  {label:'Allievi iscritti',icon:'users',area:'teaching'},
  {label:'Attrezzature',icon:'equipment',area:'equipment'},
  {label:'Certificati registrati',icon:'certificate',area:'system'},
 ];
 const {data:nextLessons,error:lessonsError}=await supabase.from('lezioni').select('id,titolo,inizio').is('annullata_il',null).gte('inizio',new Date().toISOString()).order('inizio').limit(8);
 return <>
 <PageHeader eyebrow="Segreteria · Panoramica" title="Gestione Sesto Continente" description="La situazione associativa, didattica e organizzativa in un'unica schermata."/>
 <div className="sc-metrics">{metrics.map((metric,i)=><MetricCard key={metric.label} {...metric} value={counts[i].error?'—':(counts[i].count??'—')} note={counts[i].error||counts[i].count===null?'Dato non disponibile':undefined}/>)}</div>
 {counts.slice(0,6).some(result=>result.error)&&<Alert tone="warning" title="Alcuni dati non sono disponibili">I valori mancanti non sono conteggi pari a zero.</Alert>}
 <div className="sc-dashboard-grid">
 <section className="sc-card" aria-labelledby="dashboard-actions"><SectionHeader id="dashboard-actions" title="Azioni rapide"/><div className="buttons">
 <ButtonLink href="/gestionale/richieste" icon="clipboard">Esamina domande</ButtonLink>
 <ButtonLink href="/gestionale/moduli/anagrafiche" variant="secondary">Anagrafiche</ButtonLink>
 <ButtonLink href="/gestionale/corsi/nuovo" variant="secondary" icon="plus">Crea un corso</ButtonLink>
 <ButtonLink href="/gestionale/calendario-visivo" variant="secondary" icon="calendar">Calendario</ButtonLink>
 <ButtonLink href="/gestionale/report" variant="secondary">Scadenze e report</ButtonLink>
 <ButtonLink href="/gestionale/incassi" variant="secondary">Incassi e saldi</ButtonLink>
 <ButtonLink href="/documenti" variant="secondary" icon="document">Documenti</ButtonLink>
 </div></section>
 <section className="sc-card" aria-labelledby="dashboard-lessons"><SectionHeader id="dashboard-lessons" title="Prossime lezioni" description="Fino a 8 appuntamenti programmati."/>
 {lessonsError?<ErrorState description="Non è stato possibile caricare le lezioni."/>:nextLessons?.length?nextLessons.map(l=><div className="sc-appointment" key={l.id}><Icon name="calendar"/><div><strong>{l.titolo}</strong><p>{formatValue(l.inizio)}</p></div></div>):<EmptyState title="Nessuna attività programmata"/>}
 <div className="actions"><ButtonLink href="/gestionale/calendario-visivo" variant="secondary">Apri calendario</ButtonLink></div>
 </section></div>
 {counts[6].data&&<section className="sc-card" aria-labelledby="dashboard-admin"><SectionHeader id="dashboard-admin" title="Amministrazione" description="Accesso riservato all'amministratore."/><div className="buttons">
 <ButtonLink href="/gestionale/moduli/contabilita">Movimenti contabili</ButtonLink>
 <ButtonLink href="/gestionale/utenti" variant="secondary">Gestione utenti</ButtonLink>
 <ButtonLink href="/gestionale/amministrazione-dati" variant="secondary">Amministrazione dati</ButtonLink>
 <ButtonLink href="/gestionale/moduli/stagioni" variant="secondary">Stagioni</ButtonLink>
 </div></section>}
 <p className="sc-dashboard-footnote">I dati vengono letti in tempo reale dal database, in base ai permessi dell'account.</p>
 </>;
}
