import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
import {romeDay,shiftDay} from '@/lib/calendar-tools';
import {tutteLePagine} from '@/lib/pagine';
import {pendingRequestStates} from '@/lib/secretariat';
import {money} from '@/lib/finance-ui';
import {reportPeriod,periodValid,inPeriod,daysTo,priority,orderTasks,debtSummary,type Task} from '@/lib/report-ui';
import {PageHeader,MetricCard,Alert,StatusBadge,ButtonLink} from '@/components/ui/Primitives';
import {DataTable,SearchBar,Pagination} from '@/components/ui/DataTable';
import {pageNumber,listHref} from '@/lib/module-ui';
export default async function Report({searchParams}:{searchParams:Promise<{periodo?:string;dal?:string;al?:string;categoria?:string;p?:string}>}){
 const {supabase}=await requireStaff(),s=await searchParams,today=romeDay(new Date().toISOString()),period=reportPeriod(today,s.periodo,s.dal,s.al),page=pageNumber(s.p),size=30;
 const [equipment,medical,quotes,courseFees,people,requests,lessons,events,loans,docs,tickets,adhesions,courses,instructors,verbali]=await Promise.all([
 tutteLePagine((da,a)=>supabase.from('attrezzature').select('id,codice,categoria,marca,modello,prossima_revisione').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('stato_certificati').select('id,persona_id,scade_il,stato_certificato').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('saldi_quote').select('id,persona_id,stagione_id,residuo,scadenza').gt('residuo',0).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('saldi_corsi').select('id,persona_id,stagione_id,residuo,scadenza').gt('residuo',0).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('richieste').select('id,nome,cognome,stato,inviata_il').in('stato',[...pendingRequestStates]).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('lezioni').select('id,titolo,inizio').is('annullata_il',null).gte('inizio',new Date().toISOString()).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('eventi_soci').select('id,titolo,dal').neq('stato','annullato').gte('dal',today).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('assegnazioni_attrezzature').select('id,attrezzatura_id,persona_id,assegnata_il').is('restituita_il',null).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('documenti').select('id,nome,scadenza_conservazione').not('scadenza_conservazione','is',null).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('tesseramenti').select('id,adesione_id,ente,scade_il,stato').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('adesioni').select('id,persona_id,stato,stagione_id').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('edizioni_corsi').select('id,nome,inizio,direttore_id').in('stato',['programmato','attivo']).order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('assegnazioni_istruttori').select('id,edizione_id').order('id').range(da,a)),
 tutteLePagine((da,a)=>supabase.from('cda_verbali').select('id,oggetto,data_consiglio,stato,precedente_id').is('rimosso_il',null).order('id').range(da,a))
 ]);
 const errors=[equipment,medical,quotes,courseFees,people,requests,lessons,events,loans,docs,tickets,adhesions,courses,instructors,verbali].some(x=>x.error);
 const names=new Map((people.data??[]).map(p=>[p.id,p.cognome+' '+p.nome])),assets=new Map((equipment.data??[]).map(e=>[e.id,[e.categoria,e.marca,e.modello,e.codice].filter(Boolean).join(' · ')])),memberships=new Map((adhesions.data??[]).map(a=>[a.id,a.persona_id])),assigned=new Set((instructors.data??[]).map(i=>i.edizione_id));
 const person=(id:string|null)=>id?names.get(id)??'Anagrafica non disponibile':'—',tasks:Task[]=[];
 function add(category:string,id:string,entity:string,description:string,date:string|null,href:string,kind:Task['kind']='deadline',status='Da verificare'){tasks.push({id:category+':'+id,category,entity,description,date,href,kind,status});}
 for(const e of equipment.data??[])add('Revisioni',e.id,assets.get(e.id)??e.codice,e.prossima_revisione?'Revisione prevista':'Data revisione non acquisita',e.prossima_revisione,'/gestionale/attrezzature/'+e.id,e.prossima_revisione?'deadline':'open');
 for(const c of medical.data??[])if(['valido','scaduto','mancante','in_attesa','non_valido'].includes(c.stato_certificato))add('Certificati',c.id,person(c.persona_id),'Verifica amministrativa del certificato',c.scade_il,'/gestionale/moduli/certificati?edit='+c.id,['valido','scaduto'].includes(c.stato_certificato)?'deadline':'open',c.stato_certificato.replaceAll('_',' '));
 for(const [category,rows,tab] of [['Quote associative',quotes.data??[],'quota'],['Quote corsi',courseFees.data??[],'corso']] as const)for(const d of rows)add(category,d.id,person(d.persona_id),'Residuo '+money(d.residuo),d.scadenza,'/gestionale/incassi/posizione/'+d.id+'?tab='+tab,d.scadenza?'deadline':'open','Da incassare');
 for(const x of requests.data??[])add('Domande',x.id,x.cognome+' '+x.nome,'Domanda da esaminare',x.inviata_il?romeDay(x.inviata_il):null,'/gestionale/richieste/'+x.id,'open',x.stato);
 for(const l of lessons.data??[])add('Lezioni',l.id,l.titolo,'Lezione programmata',romeDay(l.inizio),'/gestionale/calendario-visivo/'+l.id,'activity','Programmata');
 for(const e of events.data??[])add('Eventi',e.id,e.titolo,'Evento programmato',e.dal,'/gestione-eventi/'+e.id,'activity','Programmato');
 for(const l of loans.data??[])add('Prestiti',l.id,assets.get(l.attrezzatura_id)??'Attrezzatura','Prestito aperto · '+person(l.persona_id)+' (nessuna scadenza prevista)',l.assegnata_il,'/gestionale/moduli/consegne?attrezzatura='+l.attrezzatura_id,'open','Da restituire');
 for(const d of docs.data??[])add('Documenti',d.id,d.nome,'Riesame della conservazione',d.scadenza_conservazione,'/documenti');
 for(const t of tickets.data??[])if(t.stato==='attiva'||t.stato==='scaduta')add('Tesseramenti',t.id,person(memberships.get(t.adesione_id)??null),'Scadenza tessera · '+t.ente,t.scade_il,'/gestionale/moduli/tesseramenti?edit='+t.id,'deadline',t.stato);
 for(const a of adhesions.data??[])if(a.stato==='da_perfezionare')add('Adesioni',a.id,person(a.persona_id),'Adesione da perfezionare',null,'/gestionale/moduli/adesioni?edit='+a.id,'open');
 for(const c of courses.data??[]){if(!c.direttore_id)add('Corsi',c.id,c.nome,'Direttore non assegnato',c.inizio,'/gestionale/corsi/'+c.id,'open');if(!instructors.error&&!assigned.has(c.id))add('Corsi',c.id+':istruttori',c.nome,'Nessun istruttore assegnato',c.inizio,'/gestionale/corsi/'+c.id,'open');}
 const previous=new Set((verbali.data??[]).map(v=>v.precedente_id).filter(Boolean));for(const v of verbali.data??[])if(['bozza','in_approvazione'].includes(v.stato)&&!previous.has(v.id))add('Verbali',v.id,v.oggetto,v.stato==='bozza'?'Bozza da completare':'Votazione in corso',v.data_consiglio,'/organi-sociali?tab='+(v.stato==='bozza'?'bozze':'votazioni'),'open',v.stato.replaceAll('_',' '));
 const qStats=debtSummary([...(quotes.data??[]),...(courseFees.data??[])],period),selected=orderTasks(tasks.filter(t=>inPeriod(t,period)&&(!s.categoria||t.category===s.categoria)),today),categories=[...new Set(tasks.map(t=>t.category))].sort();
 return <><PageHeader eyebrow="Segreteria · Centro operativo" title="Scadenze e attività da gestire" description="Scadenze, attività senza termine e appuntamenti. Il residuo totale comprende tutte le stagioni, indipendentemente dal periodo."/>
 {errors&&<Alert tone="danger" announce>Alcune fonti non sono disponibili: elenco parziale. I dati mancanti non equivalgono a zero.</Alert>}
 <div className="sc-metrics"><MetricCard label="Quote non saldate" value={quotes.error||courseFees.error?'—':qStats.open} icon="wallet"/><MetricCard label="Quote scadute" value={quotes.error||courseFees.error?'—':qStats.overdue} icon="clock"/><MetricCard label="Quote in scadenza nel periodo" value={quotes.error||courseFees.error||!periodValid(period)?'—':qStats.due} icon="calendar"/><MetricCard label="Residuo totale" value={quotes.error||courseFees.error?'—':money(qStats.residue)} icon="wallet"/></div>
 <SearchBar hideSearch resetHref="/gestionale/report"><label>Periodo<select name="periodo" defaultValue={period.mode}>{[['scadute','Già scadute'],['7','Prossimi 7 giorni'],['15','Prossimi 15 giorni'],['30','Prossimi 30 giorni'],['60','Prossimi 60 giorni'],['90','Prossimi 90 giorni'],['personalizzato','Personalizzato']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Dal (personalizzato)<input type="date" name="dal" defaultValue={s.dal??''}/></label><label>Al (personalizzato)<input type="date" name="al" defaultValue={s.al??''}/></label><label>Categoria<select name="categoria" defaultValue={s.categoria??''}><option value="">Tutte</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label></SearchBar>
 {!periodValid(period)&&<Alert tone="warning">Seleziona un intervallo personalizzato valido.</Alert>}
 <p className="tiny muted">Le attività senza termine effettivo sono incluse nelle viste future, non considerate scadute. I certificati sono registrazioni, non persone uniche. Per i verbali e le votazioni consulta <Link href="/organi-sociali">Organi sociali</Link>.</p>
 <DataTable label="Attività e scadenze" mobileCards><thead><tr>{['Entità e categoria','Descrizione','Data','Giorni','Priorità','Stato','Azione'].map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{selected.slice((page-1)*size,page*size).map(t=>{const pr=priority(t,today);return <tr key={t.id}><td data-label="Entità"><strong>{t.entity}</strong><p>{t.category}</p></td><td data-label="Descrizione">{t.description}</td><td data-label="Data">{t.date?formatValue(t.date):'—'}</td><td data-label="Giorni">{t.kind==='open'||!t.date?'—':daysTo(today,t.date)}</td><td data-label="Priorità"><StatusBadge tone={pr==='Scaduta'?'danger':pr==='Imminente'||pr==='Da gestire'?'warning':'info'}>{pr}</StatusBadge></td><td data-label="Stato">{t.status}</td><td data-label="Azione"><Link href={t.href}>Apri</Link></td></tr>;})}{!selected.length&&<tr><td colSpan={7}>{errors?'Nessun risultato nelle fonti disponibili.':'Nessuna attività nel periodo.'}</td></tr>}</tbody></DataTable>
 <Pagination page={page} size={size} count={selected.length} href={n=>listHref({periodo:period.mode,dal:s.dal??'',al:s.al??'',categoria:s.categoria??'',p:String(n)})} label={errors?'risultati disponibili':'attività'}/><ButtonLink href="/gestionale" variant="secondary">Panoramica</ButtonLink></>;
}
