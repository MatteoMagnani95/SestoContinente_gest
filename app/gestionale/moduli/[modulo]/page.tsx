import CancelEditButton from '@/components/CancelEditButton';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Module,type Field} from '@/lib/modules';
import {formatValue,datetimeForInput} from '@/lib/format';
import {formatRome} from '@/lib/course-tools';
import {saveModuleRecord,deleteCourseRecord} from '@/app/module-actions';
import CodiceFiscaleAssist from '@/components/CodiceFiscaleAssist';
import CourseEnrollmentSelect from '@/components/CourseEnrollmentSelect';

type Row=Record<string,unknown> & {id:string};
const status:Record<string,string>={eliminato:'Record rimosso.',elimina_conferma:'Conferma la rimozione del record.',elimina_collegati:'Impossibile eliminare: ci sono dati collegati. Per le edizioni usa lo stato Annullato per conservarne lo storico.',iscrizione_non_attiva:'Seleziona un allievo iscritto a un corso attivo della stagione attiva.',iscrizione_vincolata:'Non è possibile riassegnare una quota esistente a un’altra iscrizione.',salvato:'Dati salvati nel database.',vincolo:'Operazione non consentita: controlla duplicati, capienza, date e collegamenti.',
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
 :field.type==='select'?<select {...common} defaultValue={display}><option value="">Seleziona...</option>{field.options?.map(o=><option key={o} value={o}>{o.replaceAll('_',' ')}</option>)}</select>
 :field.type==='reference'?<select {...common} defaultValue={display}><option value="">Seleziona...</option>
 {(references[field.ref?.table??'']??[]).map(row=><option key={row.id} value={row.id}>{labelOf(row,field.ref?.labels??['id']) || row.id.slice(0,8)}</option>)}</select>
 :<input {...common} type={field.type==='datetime'?'datetime-local':field.type==='number'?'number':field.type==='date'?'date':field.type==='email'?'email':'text'}
 min={field.min} step={field.step} defaultValue={field.type==='datetime'?datetimeForInput(value):display} />}
 {field.hint&&<span className="hint">{field.hint}</span>}
 </label>;
}
function Editor({module,moduleKey,record,references}:{module:Module;moduleKey:string;record?:Row;references:Record<string,Row[]>}){
 return <><form action={saveModuleRecord} className="module-form stack">
 <input type="hidden" name="modulo" value={moduleKey}/>
 {record&&<input type="hidden" name="id" value={record.id}/>}
 <div className="form-grid">{module.fields.map(f=>moduleKey==='addebiti'&&f.name==='iscrizione_id'?<EnrollmentInput key={f.name} field={f} value={record?.[f.name]} references={references} editing={!!record}/>:<FieldInput key={`${record?.id??'new'}-${f.name}`} field={f} value={record?.[f.name]??(!record&&moduleKey==='anagrafiche'&&['stato_nascita','stato_residenza'].includes(f.name)?'Italia':undefined)} references={references}/>)}</div>
 {moduleKey==='anagrafiche'&&<CodiceFiscaleAssist/>}<div className="form-actions"><button type="submit" className="button">{record?'Salva modifiche':'Crea nuovo'}</button><CancelEditButton/></div>
 </form>
 {record&&['corsi','edizioni'].includes(moduleKey)&&<details className="calendar-danger"><summary className="button danger">Rimuovi record</summary><form action={deleteCourseRecord} className="stack"><input type="hidden" name="modulo" value={moduleKey}/><input type="hidden" name="id" value={record.id}/><p>Eliminazione definitiva, consentita solo senza dati collegati.</p><label><input type="checkbox" name="conferma" required/> Confermo la rimozione</label><button className="button danger" type="submit">Elimina definitivamente</button></form></details>}</>;
}
function bookingConflictText(corsia?:string,inizio?:string,fine?:string):string{
 const numero=corsia&&/^\d{1,4}$/.test(corsia)?` ${corsia}`:'';
 const safeDate=(value?:string)=>value&&value.length<=35&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))?formatRome(value):null;
 const dal=safeDate(inizio),al=safeDate(fine);
 const fascia=dal&&al?` dalle ${dal} alle ${al}`:' nell’intervallo richiesto';
 return `Corsia${numero} già prenotata${fascia}. Scegli un’altra corsia o modifica l’orario.`;
}
export default async function ModulePage({params,searchParams}:{params:Promise<{modulo:string}>;searchParams:Promise<{q?:string;msg?:string;p?:string;corsia?:string;inizio?:string;fine?:string}>}){
 const {modulo}=await params;
 if(!isModuleKey(modulo))notFound();
 if(modulo==='pagamenti')redirect('/gestionale/incassi');
 const module:Module=modules[modulo];
 const {supabase,user}=await requireStaff();
 if(module.adminOnly){
  const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  if(!data)redirect('/gestionale?msg=permessi');
 }
 const {q='',msg='',p='1',corsia,inizio,fine}=await searchParams;
 const feedback=msg==='corsia_occupata'&&modulo==='prenotazioni'?bookingConflictText(corsia,inizio,fine):status[msg];
 const page=Math.min(100,Math.max(1,Number.parseInt(p,10)||1));
 const perPage=30;
 let query=supabase.from(module.table).select('*',{count:'exact'});
 const searchField=module.fields.find(f=>f.type==='text' || (!f.type&&f.name!=='codice_fiscale'));
 const safeSearch=q.trim().slice(0,80).replace(/[%_\\]/g,'');
 if(safeSearch&&searchField)query=query.ilike(searchField.name,`%${safeSearch}%`);
 const {data,error,count}=await query.order(module.order??'id',{ascending:false}).range((page-1)*perPage,page*perPage-1);
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
  const ref=module.fields.find(f=>f.ref?.table===table)?.ref;
  const cols=[...new Set(['id',...(ref?.labels??[])])].join(',');
  const {data:rows}=await supabase.from(table).select(cols).limit(500);
  let selected=(rows??[]) as unknown as Row[];
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
 const rows=(data??[]) as Row[];
 return <>
 <div className="page-intro"><p className="eyebrow">Gestionale · {module.label}</p><h1>{module.label}</h1><p>{module.description}</p></div>
 {feedback&&<p className={`notice ${['salvato','eliminato'].includes(msg)?'success': 'warning'}`} role="status">{feedback}</p>}
 {enrollmentLoadError&&<p className="notice error">Impossibile caricare tutte le iscrizioni dei corsi. Riprova o verifica i permessi.</p>}
 <div className="module-toolbar">
  <form method="get" className="search-line"><input name="q" aria-label="Cerca" placeholder="Cerca nel campo principale" defaultValue={q}/><button className="button ghost">Cerca</button></form>
  <Link className="button ghost" href={`/gestionale/esporta/${modulo}`}>Esporta CSV</Link>
 </div>
 <details className="panel module-editor"><summary><strong>+ {module.appendOnly?'Registra nuovo versamento':'Aggiungi nuovo record'}</strong></summary>
 <Editor module={module} moduleKey={modulo} references={references}/></details>
 {error?<div className="notice error">Impossibile leggere i dati. Esegui prima la migrazione 0002 e verifica i permessi.</div>:<div className="panel table-panel"><table><thead><tr>
 {module.columns.map(c=><th key={c}>{module.fields.find(f=>f.name===c)?.label??c.replaceAll('_',' ')}</th>)}
 {!module.appendOnly&&<th>Modifica</th>}
 </tr></thead><tbody>
 {rows.map(row=><tr key={row.id}>
 {module.columns.map(c=><td key={c}>{references[module.fields.find(f=>f.name===c)?.ref?.table??'']?.find(x=>x.id===row[c])
 ? labelOf(references[module.fields.find(f=>f.name===c)?.ref?.table??''].find(x=>x.id===row[c])!,module.fields.find(f=>f.name===c)?.ref?.labels??['id'])
 : modulo==='addebiti'&&c==='iscrizione_id'?'Iscrizione non disponibile':c.endsWith('_id')?String(row[c]??'—').slice(0,8):formatValue(row[c],c)}</td>)}
 {!module.appendOnly&&<td><details className="row-editor"><summary>Modifica</summary><div className="row-editor-pop"><Editor module={module} moduleKey={modulo} record={row} references={references}/></div></details></td>}
 </tr>)}
 {!rows.length&&<tr><td colSpan={module.columns.length+1} className="empty-cell">Nessun record trovato.</td></tr>}
 </tbody></table></div>}
 <div className="pager"><span>{count??0} record · Pagina {page}</span><div className="buttons">
 {page>1&&<Link className="button ghost" href={`?p=${page-1}&q=${encodeURIComponent(q)}`}>Precedente</Link>}
 {page*perPage<(count??0)&&<Link className="button ghost" href={`?p=${page+1}&q=${encodeURIComponent(q)}`}>Successiva</Link>}
 </div></div>
 </>;
}
