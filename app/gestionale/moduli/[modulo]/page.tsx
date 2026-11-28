import {medicalRoster,MEDICAL_FILTERS,type MedicalRow} from '@/lib/medical-roster';
import {EsitoCertificato,SollecitoCertificato} from '@/components/CertificateRowActions';
import {statiCertificato,statoSingolo} from '@/lib/certificati';
import Cronologia from '@/components/Cronologia';
import EditForm from '@/components/EditForm';
import CancelEditButton from '@/components/CancelEditButton';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Module,type Field} from '@/lib/modules';
import {formatValue,datetimeForInput} from '@/lib/format';
import {formatRome} from '@/lib/course-tools';
import {saveModuleRecord} from '@/app/module-actions';
import CodiceFiscaleAssist from '@/components/CodiceFiscaleAssist';
import RemoveRecord from '@/components/RemoveRecord';
import EligibleEnrollmentSelect from '@/components/EligibleEnrollmentSelect';
import CourseEnrollmentSelect from '@/components/CourseEnrollmentSelect';

type Row=Record<string,unknown> & {id:string};
const status:Record<string,string>={socio_non_iscrivibile:'Solo soci con adesione attiva e tessera attiva e valida per la stagione possono essere iscritti.',eliminato:'Record rimosso.',elimina_conferma:'Conferma la rimozione del record.',elimina_collegati:'Rimozione non consentita: sono presenti dati collegati oppure il record è protetto.',iscrizione_non_attiva:'Seleziona un allievo iscritto a un corso attivo della stagione attiva.',iscrizione_vincolata:'Non è possibile riassegnare una quota esistente a un’altra iscrizione.',salvato:'Dati salvati nel database.',vincolo:'Operazione non consentita: controlla duplicati, capienza, date e collegamenti.',
 cf:'Codice fiscale non coerente, oppure luogo di nascita non identificato. Verifica i dati e il CF ufficiale.',omocodia:'Omocodia: conferma la verifica documentale e indica la motivazione.', dati:'Controlla i campi obbligatori e i formati.',database:'Impossibile salvare. Verifica le autorizzazioni e la migrazione SQL.',permessi:'Operazione non consentita.',
 corsia_duplicata:'Questa corsia è già associata alla stessa lezione. Controlla le prenotazioni esistenti.'};
function labelOf(record:Row,labels:readonly string[]){
 return labels.map(k=>String(record[k]??'')).join(' ').trim().slice(0,100);
}
function EnrollmentInput({field,value,references,editing}:{field:Field;value?:unknown;references:Record<string,Row[]>;editing:boolean}){
 const rows=references.iscrizioni_corsi??[];
 if(editing){const selected=rows.find(r=>r.id===value);return <label>{field.label}<input type="hidden" name={field.name} value={String(value??'')}/><input readOnly value={selected?String(selected.etichetta):'Iscrizione storica (non disponibile)'}/><span className="hint">L’iscrizione è vincolata alla quota esistente.</span></label>;}
 return <CourseEnrollmentSelect name={field.name} options={rows.filter(r=>r.selezionabile===true).map(r=>({id:r.id,editionId:String(r.edizione_id),course:String(r.gruppo),person:String(r.allievo)}))}/>;
}
function FieldInput({field,value,references}:{field:Field;value?:unknown;references:Record<string,Row[]>}){
 const id=`${field.name}-${String(value??'nuovo').slice(0,20)}`;
 const common={name:field.name,id,required:field.required??false};
 const display=Array.isArray(value)?value.join(', '):(typeof value==='string'||typeof value==='number'?String(value):'');
 return <label htmlFor={id}>{field.label}
 {field.type==='textarea'?<textarea {...common} rows={3} defaultValue={display}/>
 :field.type==='checkbox'?<input {...common} type="checkbox" defaultChecked={value===true}/>
 :field.type==='select'?<select {...common} defaultValue={display}><option value="">Seleziona...</option>{field.options?.map(o=><option key={o} value={o}>{field.name==='esito_verifica'?statoSingolo(o):o.replaceAll('_',' ')}</option>)}</select>
 :field.type==='reference'?<select {...common} defaultValue={display}><option value="">Seleziona...</option>
 {(references[field.ref?.table??'']??[]).map(row=><option key={row.id} value={row.id}>{labelOf(row,field.ref?.labels??['id']) || row.id.slice(0,8)}</option>)}</select>
 :<input {...common} type={field.type==='datetime'?'datetime-local':field.type==='number'?'number':field.type==='date'?'date':field.type==='email'?'email':'text'}
 min={field.min} step={field.step} defaultValue={field.type==='datetime'?datetimeForInput(value):display} />}
 {field.hint&&<span className="hint">{field.hint}</span>}
 </label>;
}
const sezioniEditor:Record<string,Record<string,string[]>>={
 anagrafiche:{'Anagrafica':['nome','cognome','data_nascita','luogo_nascita','provincia_nascita','stato_nascita','sesso_cf','codice_fiscale','cf_omocodia_verificata','cf_override_motivo'],'Residenza e recapiti':['indirizzo','cap','comune','provincia_residenza','stato_residenza','email','telefono']},
 edizioni:{'Corso e direzione':['corso_id','nome','direttore_id','programma_versione_id'],'Stagione e calendario':['stagione_id','inizio','fine','stato'],'Organizzazione':['massimo_partecipanti','costo_corso','note']},
 brevetti:{'Allievo e corso':['persona_id','edizione_id'],'Dati del brevetto':['titolo','ente','numero_brevetto','ottenuto_il','scade_il','note']},
 certificati:{'Intestatario e periodo':['persona_id','rilasciato_il','scade_il'],'Verifica amministrativa':['esito_verifica','note_amministrative']},
};
function Editor({module,moduleKey,record,references,admin=false}:{module:Module;moduleKey:string;record?:Row;references:Record<string,Row[]>;admin?:boolean}){
 const sezioni=sezioniEditor[moduleKey];
 const gruppi=sezioni?Object.entries(sezioni).map(([titolo,nomi])=>({titolo,fields:module.fields.filter(f=>nomi.includes(f.name))})):[{titolo:'Dati della scheda',fields:module.fields}];
 return <><EditForm action={saveModuleRecord} className="module-form stack">
 <h3>{moduleKey==='certificati'?(record?'Verifica o aggiorna certificato':'Registra dati del certificato'):(record?'Modifica':'Nuovo record')+' · '+module.label}{record?' · '+([record.sort_cognome,record.sort_nome,record.nome,record.titolo].filter(Boolean).join(' ')||record.id.slice(0,8)):''}</h3>
 <input type="hidden" name="modulo" value={moduleKey}/>
 {record&&<input type="hidden" name="id" value={record.id}/>}{record&&moduleKey==='certificati'&&<input type="hidden" name="documento_atteso" value={String(record.documento_id??'')}/>}
 {gruppi.map(({titolo,fields})=><fieldset key={titolo}><legend>{titolo}</legend><div className="form-grid">{moduleKey==='iscrizioni'&&!record&&<EligibleEnrollmentSelect editions={(references.edizioni_corsi??[]) as unknown as {id:string;nome:string;stagione_id:string;stato:string}[]} eligible={(references.gest_soci_iscrivibili??[]) as unknown as {persona_id:string;stagione_id:string;nome:string;cognome:string}[]}/>} {fields.filter(f=>!(moduleKey==='iscrizioni'&&!record&&['edizione_id','persona_id','stato'].includes(f.name))).map(f=>moduleKey==='addebiti'&&f.name==='iscrizione_id'?<EnrollmentInput key={f.name} field={f} value={record?.[f.name]} references={references} editing={!!record}/>:(moduleKey==='iscrizioni'||moduleKey==='brevetti')&&record&&['persona_id','edizione_id'].includes(f.name)?<label key={f.name}>{f.label}<input type="hidden" name={f.name} value={String(record[f.name]??'')}/><input readOnly value={labelOf(references[f.ref?.table??'']?.find(r=>r.id===record[f.name])??({id:''} as Row),f.ref?.labels??['id'])||'Non acquisito'}/></label>:<FieldInput key={`${record?.id??'new'}-${f.name}`} field={moduleKey==='iscrizioni'&&record&&f.name==='stato'?{...f,options:f.options?.filter(o=>o===record.stato||!['in_attesa','iscritto'].includes(o)||((references.edizioni_corsi??[]).some(e=>e.id===record.edizione_id&&['programmato','attivo'].includes(String(e.stato)))&&(references.gest_soci_iscrivibili??[]).some(e=>e.persona_id===record.persona_id&&e.stagione_id===(references.edizioni_corsi??[]).find(x=>x.id===record.edizione_id)?.stagione_id)))}:f} value={record?.[f.name]??(moduleKey==='certificati'&&f.name==='esito_verifica'&&record?(record.idoneita_verificata?'valido':record.documento_id?'in_attesa':'non_valido'):undefined)??(!record&&moduleKey==='anagrafiche'&&['stato_nascita','stato_residenza'].includes(f.name)?'Italia':undefined)} references={references}/>)}</div></fieldset>)}
 {moduleKey==='anagrafiche'&&<CodiceFiscaleAssist/>}<div className="form-actions"><button type="submit" className="button">{moduleKey==='certificati'?(record?'Salva verifica e modifiche':'Registra certificato'):(record?'Salva modifiche':'Crea nuovo')}</button><CancelEditButton/></div>
 </EditForm>
 {record&&!module.appendOnly&&<RemoveRecord moduleKey={moduleKey} id={record.id}/>}
 {record&&moduleKey==='certificati'&&<Cronologia tipo="certificato" id={record.id}/>}
 {record&&admin&&<p><Link href={`/gestionale/amministrazione-dati/dipendenze/${module.table}/${record.id}`}>Visualizza dati collegati</Link></p>}
</>;
}
function bookingConflictText(corsia?:string,inizio?:string,fine?:string):string{
 const numero=corsia&&/^\d{1,4}$/.test(corsia)?` ${corsia}`:'';
 const safeDate=(value?:string)=>value&&value.length<=35&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))?formatRome(value):null;
 const dal=safeDate(inizio),al=safeDate(fine);
 const fascia=dal&&al?` dalle ${dal} alle ${al}`:' nell’intervallo richiesto';
 return `Corsia${numero} già prenotata${fascia}. Scegli un’altra corsia o modifica l’orario.`;
}
export default async function ModulePage({params,searchParams}:{params:Promise<{modulo:string}>;searchParams:Promise<{q?:string;msg?:string;p?:string;corsia?:string;inizio?:string;fine?:string;edit?:string;stato?:string;archivio?:string}>}){
 const {modulo}=await params;
 if(!isModuleKey(modulo))notFound();
 if(modulo==='pagamenti')redirect('/gestionale/incassi');
 const module:Module=modules[modulo];
 const {supabase,user}=await requireStaff();
 const {data:isAdministrator}=await supabase.rpc('is_admin');
 if(module.adminOnly){
  const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  if(!data)redirect('/gestionale?msg=permessi');
 }
 const {q='',msg='',p='1',corsia,inizio,fine,edit,stato,archivio}=await searchParams;
 const feedback=msg==='corsia_occupata'&&modulo==='prenotazioni'?bookingConflictText(corsia,inizio,fine):status[msg];
 const page=Math.min(100,Math.max(1,Number.parseInt(p,10)||1));
 const perPage=30;
 const personViews=new Set(['adesioni', 'iscrizioni_corsi', 'assegnazioni_istruttori', 'qualifiche_istruttori', 'brevetti_allievi', 'certificati_medici', 'presenze', 'assegnazioni_attrezzature', 'quote_associative', 'saldi_quote', 'saldi_corsi', 'tesseramenti', 'addebiti_corsi']);
 const personSorted=personViews.has(module.table);
 const medical=modulo==='certificati';
 const editId=edit&&/^[0-9a-f-]{36}$/i.test(edit)?edit:null;
 const medicalSearch=q.trim().slice(0,80).replace(/[^\p{L}\p{M}\p{N}'’\s-]/gu,' ').split(/\s+/).filter(Boolean);
 const archive=medical&&archivio==='1';
 let roster:MedicalRow[]|null=null,rosterError=false;
 if(medical&&!archive&&!editId){try{roster=await medicalRoster(supabase);}catch{rosterError=true;roster=[];}}
 const rosterState=stato&&MEDICAL_FILTERS.some(k=>k===stato)?stato:'';
 const filteredRoster=roster?.filter(row=>(!rosterState||row.stato_certificato===rosterState)&&medicalSearch.every(token=>(row.sort_nome+' '+row.sort_cognome).toLocaleLowerCase('it').includes(token.toLocaleLowerCase('it'))));
 const filtri=roster!==null?MEDICAL_FILTERS.map(k=>({k,label:k,n:rosterError?'—':roster!.filter(row=>row.stato_certificato===k).length})):medical&&archive?await Promise.all(Object.entries(statiCertificato).map(async ([k,label])=>{const {count,error}=await supabase.from('stato_certificati').select('id',{head:true,count:'exact'}).eq('stato_certificato',k);return {k,label,n:error?'—':count??0};})):[];
 let query=supabase.from(medical?'stato_certificati':personSorted?`gest_elenco_${module.table}`:module.table).select('*',{count:'exact'});
 if(medical&&!editId&&stato&&Object.hasOwn(statiCertificato,stato))query=query.eq('stato_certificato',stato);
 const searchField=module.fields.find(f=>f.type==='text' || (!f.type&&f.name!=='codice_fiscale'));
 const safeSearch=q.trim().slice(0,80).replace(/[%_\\]/g,'');
 if(medical){if(!editId)for(const token of medicalSearch)query=query.or(`sort_cognome.ilike.%${token}%,sort_nome.ilike.%${token}%`);}
 else if(safeSearch&&(personSorted||module.table==='persone')){const cleaned=safeSearch.replace(/[(),.]/g,' ').trim();if(cleaned)query=query.or(`${personSorted?'sort_cognome':'cognome'}.ilike.%${cleaned}%,${personSorted?'sort_nome':'nome'}.ilike.%${cleaned}%`);}
 else if(safeSearch&&searchField)query=query.ilike(searchField.name,`%${safeSearch}%`);
 if(editId)query=query.eq('id',editId);
 const primary=personSorted?'sort_cognome':module.table==='persone'?'cognome':module.fields.find(f=>['nome','titolo','codice','tipo'].includes(f.name))?.name??module.order??'id';
 query=query.order(primary,{ascending:true,nullsFirst:false});
 if(personSorted||module.table==='persone')query=query.order(personSorted?'sort_nome':'nome',{ascending:true});
 const result=filteredRoster!==undefined?{data:filteredRoster.slice((page-1)*perPage,page*perPage),error:rosterError?{message:'Elenco iscritti non disponibile'}:null,count:filteredRoster.length}:await query.order('id',{ascending:true}).range(medical&&editId?0:(page-1)*perPage,medical&&editId?perPage-1:page*perPage-1);
 const {data,error,count}=result;
 const refs=[...new Set(module.fields.map(f=>f.ref?.table).filter((v):v is string=>Boolean(v)))];
 const references:Record<string,Row[]>={};
 let enrollmentLoadError=false;
 await Promise.all(refs.map(async table=>{
  if(modulo==='addebiti'&&table==='iscrizioni_corsi'){
   const columns='id,stato,edizione_id,edizione:edizioni_corsi!inner(id,nome,stato,stagione:stagioni!inner(nome,attiva)),persona:persone!inner(nome,cognome)';
   type Enroll={id:string;stato:string;edizione_id:string;edizione:{nome:string;stato:string;stagione:{nome:string;attiva:boolean}};persona:{nome:string;cognome:string}};
   const active:Enroll[]=[];
   // Pagina per non perdere le opzioni oltre il limite predefinito di PostgREST.
   for(let offset=0;;){
    const {data:entries,error:entriesError}=await supabase.from('iscrizioni_corsi').select(columns).eq('stato','iscritto').eq('edizione.stato','attivo').eq('edizione.stagione.attiva',true).order('id').range(offset,offset+499);
    if(entriesError){enrollmentLoadError=true;active.length=0;break;}
    const batch=(entries??[]) as unknown as Enroll[];
    active.push(...batch);if(batch.length<500)break;offset+=batch.length;
   }
   const existingIds=[...new Set((data??[]).map(row=>String(row.iscrizione_id??'')).filter(Boolean))];
   const missing=existingIds.filter(id=>!active.some(r=>r.id===id));
   const historical=missing.length?await supabase.from('iscrizioni_corsi').select(columns).in('id',missing):{data:[],error:null};
   if(historical.error)enrollmentLoadError=true;
   const map=(r:Enroll,selectable:boolean):Row=>{
    const allievo=`${r.persona.cognome} ${r.persona.nome}`.trim(),gruppo=`${r.edizione.nome} · ${r.edizione.stagione.nome}`;
    return {id:r.id,edizione_id:r.edizione_id,gruppo,allievo,etichetta:`${gruppo} — ${allievo}${selectable?'':' (storico)'}`,selezionabile:selectable};
   };
   references[table]=[...active.map(r=>map(r,true)),...((historical.data??[]) as unknown as Enroll[]).map(r=>map(r,false))];return;
  }
  if(modulo==='tesseramenti'&&table==='adesioni'){
   const rows:Row[]=[];const currentIds=[...new Set((data??[]).map(r=>String(r.adesione_id??'')).filter(Boolean))];
   const columns='id,sort_cognome,sort_nome,stagione_id';
   const [{data:members},{data:seasons}]=await Promise.all([supabase.from('gest_elenco_adesioni').select(columns).order('sort_cognome').order('sort_nome').order('id').limit(500),supabase.from('stagioni').select('id,nome').limit(1000)]);
   const missing=currentIds.filter(id=>!members?.some(r=>r.id===id));
   const {data:extra}=missing.length?await supabase.from('gest_elenco_adesioni').select(columns).in('id',missing):{data:[]};
   for(const a of [...(members??[]),...(extra??[])])rows.push({id:a.id,etichetta:`${a.sort_cognome??''} ${a.sort_nome??''} · ${seasons?.find(s=>s.id===a.stagione_id)?.nome??'Stagione'}`});
   references[table]=rows.sort((a,b)=>String(a.etichetta).localeCompare(String(b.etichetta),'it'));return;
  }
  const ref=module.fields.find(f=>f.ref?.table===table)?.ref;
  const cols=[...new Set(['id',...(ref?.labels??[]),...(modulo==='iscrizioni'&&table==='edizioni_corsi'?['stagione_id','stato']:[])])].join(',');
  const refOrder=ref?.labels?.[0]??'id';
  let refQuery=supabase.from(table).select(cols).order(refOrder,{ascending:true});
  if(table==='persone')refQuery=refQuery.order('nome',{ascending:true});
  const {data:rows}=await refQuery.limit(500);
  let selected=(rows??[]) as unknown as Row[];
  const currentKeys=module.fields.filter(f=>f.ref?.table===table).map(f=>f.name);
  const missingIds=[...new Set((data??[]).flatMap(row=>currentKeys.map(k=>String(row[k]??''))).filter(id=>id&&!selected.some(r=>r.id===id)))];
  if(missingIds.length){const {data:extra}=await supabase.from(table).select(cols).in('id',missingIds);selected.push(...((extra??[]) as unknown as Row[]));}
  selected.sort((a,b)=>labelOf(a,ref?.labels??['id']).localeCompare(labelOf(b,ref?.labels??['id']),'it'));
  if(modulo==='istruttori'&&table==='persone'){
   const {data:allQualifications}=await supabase.from('qualifiche_istruttori').select('persona_id').limit(5000);
   const ids=new Set((allQualifications??[]).map(q=>q.persona_id));
   selected=selected.filter(person=>ids.has(person.id));
  }
  if(modulo==='adesioni'&&table==='cda_verbali'){
   const {data:approved}=await supabase.from('cda_verbali').select('id').eq('stato','approvato').in('tipo',['Approvazione Adesioni Soci','Misto']);
   const ids=new Set((approved??[]).map(v=>v.id));selected=selected.filter(row=>ids.has(row.id));
  }
  references[table]=selected;
 }));
 if(modulo==='iscrizioni'){
  const eligible:Row[]=[];
  for(let offset=0;;offset+=500){const {data:batch,error:loadError}=await supabase.from('gest_soci_iscrivibili').select('persona_id,stagione_id,nome,cognome').order('cognome').order('nome').order('persona_id').order('stagione_id').range(offset,offset+499);if(loadError){eligible.length=0;enrollmentLoadError=true;break;}eligible.push(...(batch??[]).map(r=>({...r,id:r.persona_id})));if((batch??[]).length<500)break;}
  references.gest_soci_iscrivibili=eligible;
  const available:Row[]=[];for(let offset=0;;offset+=500){const {data:batch,error:loadError}=await supabase.from('edizioni_corsi').select('id,nome,stagione_id,stato').in('stato',['programmato','attivo']).order('nome').order('id').range(offset,offset+499);if(loadError){available.length=0;enrollmentLoadError=true;break;}available.push(...((batch??[]) as Row[]));if((batch??[]).length<500)break;}
  const existing=references.edizioni_corsi??[];references.edizioni_corsi=[...available,...existing.filter(r=>!available.some(e=>e.id===r.id)&&!['programmato','attivo'].includes(String(r.stato)))];
 }
 const rows=(data??[]) as Row[];

 if(medical){
  const base='/gestionale/moduli/certificati';
  const active=archive?(stato&&Object.hasOwn(statiCertificato,stato)?stato:''):rosterState;
  const href=(filter:string,pn=1,selected?:string)=>{const sp=new URLSearchParams();if(archive)sp.set('archivio','1');if(filter)sp.set('stato',filter);if(q)sp.set('q',q);if(pn>1)sp.set('p',String(pn));if(selected)sp.set('edit',selected);return base+(sp.size?'?'+sp.toString():'');};
  const tones:Record<string,{bg:string;fg:string;hint:string}>={
   in_scadenza:{bg:'#fff3dd',fg:'#80520b',hint:'Entro 30 giorni'},
   in_attesa:{bg:'#fff3dd',fg:'#80520b',hint:'Controlla i documenti ricevuti'},
   scaduto:{bg:'#ffeaec',fg:'#a62d40',hint:'Da rinnovare'},
   mancante:{bg:'#fff3dd',fg:'#80520b',hint:'Da acquisire'},
   non_valido:{bg:'#ffeaec',fg:'#a62d40',hint:'Da regolarizzare'},
   valido:{bg:'#e5f4eb',fg:'#246d43',hint:'In regola'}
  };
  const names:Record<string,string>={in_scadenza:'In scadenza',in_attesa:'Da verificare',scaduto:'Scaduti',mancante:'Mancanti',non_valido:'Non validi',valido:'Validi'};
  const totalPages=count??0;
  const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 180px),1fr))',gap:12};
  const nameOf=(row:Row)=>[row.sort_cognome,row.sort_nome].filter(Boolean).join(' ')||labelOf(references.persone?.find(p=>p.id===row.persona_id)??({id:''} as Row),['cognome','nome'])||'Intestatario non disponibile';
  const upload=(id:unknown)=>'/area-personale/certificato?origine=gestionale&persona='+encodeURIComponent(String(id??''));
  const selected=editId?rows.find(row=>row.id===editId):undefined;
  return <>
   <div className="page-intro"><p className="eyebrow">Gestionale · Salute e idoneità</p><h1>Certificati medici</h1><p>Controlla i certificati ricevuti, verifica le scadenze e individua chi deve consegnare un documento.</p></div>
   {feedback&&<p className={`notice ${['salvato','eliminato'].includes(msg)?'success':'warning'}`} role="status">{msg==='salvato'?'Certificato aggiornato.':msg==='eliminato'?'Certificato rimosso.':feedback}</p>}
   {editId?<section className="panel stack">
    <Link className="button ghost" href={href(active,page)}>← Torna ai certificati</Link>
    {error?<p className="notice error" role="alert">Impossibile caricare il certificato. Riprova.</p>:selected?<><h2>{nameOf(selected)}</h2><p>Stato attuale: <strong>{statoSingolo(String(selected.stato_certificato))}</strong> · Scadenza {formatValue(selected.scade_il)}</p>
     <div className="buttons">{selected.documento_id?<Link className="button" href={'/documenti/'+selected.documento_id}>Apri documento da controllare</Link>:<Link className="button" href={upload(selected.persona_id)}>Carica certificato</Link>}{!!selected.documento_id&&<Link className="button ghost" href={upload(selected.persona_id)}>Carica un nuovo documento</Link>}</div>
     <Editor module={module} moduleKey={modulo} record={selected} references={references} admin={isAdministrator===true}/></>:<p>Certificato non trovato o non accessibile.</p>}
   </section>:<>
    <nav aria-label="Situazione certificati" style={grid}>
     {(archive?['in_attesa','scaduto','mancante','non_valido','valido']:MEDICAL_FILTERS).map(k=>{const f=filtri.find(item=>item.k===k),t=tones[k];return <Link key={k} href={href(k)} aria-current={active===k?'page':undefined} className="panel" style={{padding:18,textDecoration:'none',borderColor:active===k?t.fg:undefined,boxShadow:active===k?`inset 0 0 0 1px ${t.fg}`:undefined}}><span style={{color:t.fg,fontWeight:700}}>{names[k]}</span><strong style={{display:'block',fontSize:30,color:t.fg,margin:'6px 0'}}>{f?.n??'—'}</strong><span style={{fontSize:13,color:'var(--muted)'}}>{t.hint}</span></Link>;})}
    </nav>
    <div className="module-toolbar">
     <form method="get" className="search-line">{archive&&<input type="hidden" name="archivio" value="1"/>}{active&&<input type="hidden" name="stato" value={active}/>}<input name="q" aria-label="Cerca per nome o cognome" placeholder="Cerca nome o cognome" defaultValue={q}/><button className="button ghost">Cerca</button></form>
     <div className="buttons"><Link className="button ghost" aria-current={!active?'page':undefined} href={href('')}>Tutti i certificati</Link>{q&&<Link className="button ghost" href={base+(archive?'?archivio=1'+(active?'&stato='+active:''):(active?'?stato='+active:''))}>Azzera ricerca</Link>}<Link className="button ghost" href={archive?base:base+'?archivio=1'}>{archive?'Torna agli iscritti':'Archivio storico'}</Link><Link className="button ghost" href="/gestionale/esporta/certificati">Esporta CSV</Link></div>
    </div>
    <details className="panel module-editor"><summary><strong>+ Registra o carica un certificato</strong></summary>
     <p>Se hai il documento, scegli l’intestatario e caricalo. Se devi registrare soltanto i dati amministrativi, usa il modulo sottostante.</p>
     <form className="search-line" action="/area-personale/certificato" method="get"><input type="hidden" name="origine" value="gestionale"/><select name="persona" aria-label="Intestatario del certificato" required defaultValue=""><option value="">Scegli intestatario…</option>{(references.persone??[]).map(person=><option key={person.id} value={person.id}>{labelOf(person,['cognome','nome'])}</option>)}</select><button className="button">Carica documento</button></form>
     <Editor module={module} moduleKey={modulo} references={references}/>
    </details>
    <section className="stack" aria-label="Elenco certificati"><h2>{active?names[active]:archive?'Archivio certificati':'Tutte le persone iscritte'}</h2><p>{archive?'Tutti i certificati registrati, incluse le edizioni precedenti.':'Soci e allievi della stagione attiva, una riga per persona. Scadenza imminente: entro 30 giorni.'}</p>
     {error&&<p className="notice error" role="alert">Impossibile leggere i certificati. Riprova o verifica i permessi.</p>}
     <div className="panel table-panel"><table style={{minWidth:940}}><thead><tr><th scope="col">Nome e cognome</th><th scope="col">Certificato</th><th scope="col">Documento</th><th scope="col">Scadenza</th><th scope="col">Cambia esito</th><th scope="col">Azioni</th></tr></thead><tbody>
     {!error&&rows.map(row=>{
      const key=String(row.stato_certificato),t=tones[key]??{bg:'#edf1f4',fg:'#47606d',hint:''};
      const nome=nameOf(row),doc=String(row.documento_id??''),previous=String(row.esito_verifica??'');
      const initial=previous|| (row.idoneita_verificata===true?'valido':'in_attesa');
      return <tr key={row.id}><th scope="row" style={{textAlign:'left',whiteSpace:'nowrap'}}>{nome}</th>
       <td><span style={{display:'inline-block',background:t.bg,color:t.fg,padding:'5px 10px',borderRadius:20,fontSize:13,fontWeight:700}}>{key==='in_scadenza'?'In scadenza':statoSingolo(key)}</span></td>
       <td>{doc?<Link className="button ghost" href={'/documenti/'+doc}>Visualizza certificato</Link>:<Link className="button ghost" href={upload(row.persona_id)}>Carica certificato</Link>}</td>
       <td style={{whiteSpace:'nowrap'}}>{formatValue(row.scade_il)}</td>
       <td>{doc?<EsitoCertificato key={row.id+':'+doc+':'+previous} id={row.id} documento={doc} precedente={previous} iniziale={initial} nome={nome}/>:<span className="hint">Documento mancante</span>}</td>
       <td><div className="buttons">{!doc&&<SollecitoCertificato persona={String(row.persona_id)} nome={nome}/>}{!row.senza_registrazione&&<Link href={href(active,page,row.id)}>Altri dati e storico</Link>}</div></td>
      </tr>;
     })}
     {!error&&!rows.length&&<tr><td colSpan={6} className="empty-cell">Nessun certificato corrisponde alla ricerca.</td></tr>}
     </tbody></table></div>
     <p className="hint">Lo stato Scaduto dipende automaticamente dalla data di scadenza. La notifica viene registrata nell’area personale degli account collegati; è consentito un sollecito al giorno per persona.</p>
    </section>
    <div className="pager"><span>{error?'—':count??0} {archive?'certificati registrati':'persone'} · Pagina {page}</span><div className="buttons">{page>1&&<Link className="button ghost" href={href(active,page-1)}>Precedente</Link>}{page*perPage<totalPages&&<Link className="button ghost" href={href(active,page+1)}>Successiva</Link>}</div></div>
    <p className="hint">Dati sanitari riservati: registra solo informazioni amministrative, senza diagnosi o informazioni cliniche.</p>
   </>}
  </>;
 }

 return <>
 <div className="page-intro"><p className="eyebrow">Gestionale · {module.label}</p><h1>{module.label}</h1><p>{module.description}</p></div>
 {feedback&&<p className={`notice ${['salvato','eliminato'].includes(msg)?'success': 'warning'}`} role="status">{feedback}</p>}
 {enrollmentLoadError&&<p className="notice error">Impossibile caricare tutte le iscrizioni dei corsi. Riprova o verifica i permessi.</p>}
 <div className="module-toolbar">
  <form method="get" className="search-line">{medical&&stato&&<input type="hidden" name="stato" value={stato}/>}<input name="q" aria-label="Cerca" placeholder="Cerca nel campo principale" defaultValue={q}/><button className="button ghost">Cerca</button></form>
  <Link className="button ghost" href={`/gestionale/esporta/${modulo}`}>Esporta CSV</Link>
 </div>
 {!editId&&<details className="panel module-editor"><summary><strong>+ {module.appendOnly?'Registra nuovo versamento':'Aggiungi nuovo record'}</strong></summary>
 <Editor module={module} moduleKey={modulo} references={references}/></details>}
 {error?<div className="notice error">Impossibile leggere i dati. Esegui prima la migrazione 0002 e verifica i permessi.</div>:<div className="panel table-panel"><table><thead><tr>
 {module.columns.map(c=><th key={c}>{module.fields.find(f=>f.name===c)?.label??({documento_id:'Certificato',stato_certificato:'Stato',rilasciato_da_nome:'Rilasciato da'} as Record<string,string>)[c]??c.replaceAll('_',' ')}</th>)}
 {!module.appendOnly&&<th>Azioni</th>}
 </tr></thead><tbody>
 {rows.map(row=><tr key={row.id}>
 {module.columns.map(c=><td key={c}>{medical&&c==='documento_id'?(row[c]?<Link href={'/documenti/'+row[c]}>Apri certificato</Link>:<Link href={'/area-personale/certificato?persona='+row.persona_id}>Carica certificato</Link>):medical&&c==='stato_certificato'?statoSingolo(String(row[c])):references[module.fields.find(f=>f.name===c)?.ref?.table??'']?.find(x=>x.id===row[c])
 ? labelOf(references[module.fields.find(f=>f.name===c)?.ref?.table??''].find(x=>x.id===row[c])!,module.fields.find(f=>f.name===c)?.ref?.labels??['id'])
 : c==='persona_id'&&row.sort_cognome?`${row.sort_cognome} ${row.sort_nome??''}`: modulo==='addebiti'&&c==='iscrizione_id'?'Iscrizione non disponibile':c.endsWith('_id')?String(row[c]??'—').slice(0,8):formatValue(row[c],c)}</td>)}
 {!module.appendOnly&&<td><details className="row-editor" open={(msg!=='salvato'&&editId===row.id)||undefined}><summary>Modifica</summary><div className="row-editor-pop"><Editor module={module} moduleKey={modulo} record={row} references={references} admin={isAdministrator===true}/></div></details></td>}
 </tr>)}
 {!rows.length&&<tr><td colSpan={module.columns.length+1} className="empty-cell">Nessun record trovato.</td></tr>}
 </tbody></table></div>}
 <div className="pager"><span>{count??0} record · Pagina {page}</span><div className="buttons">
 {page>1&&<Link className="button ghost" href={`?p=${page-1}&q=${encodeURIComponent(q)}&stato=${encodeURIComponent(stato??'')}`}>Precedente</Link>}
 {page*perPage<(count??0)&&<Link className="button ghost" href={`?p=${page+1}&q=${encodeURIComponent(q)}&stato=${encodeURIComponent(stato??'')}`}>Successiva</Link>}
 </div></div>
 </>;
}
