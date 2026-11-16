'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {asRomeISO,COURSE_STATES,ENROLLMENT_STATES,UUID_RE,dateValue,detailHref,textValue,uuidValue} from '@/lib/course-tools';

const fail='/gestionale/corsi/nuovo?msg=errore';
function refresh(id?:string){revalidatePath('/gestionale/corsi');revalidatePath('/gestionale');if(id)revalidatePath(`/gestionale/corsi/${id}`);}
function valueOf(form:FormData,name:string,max=200){return textValue(form,name,max);}

export async function createCatalogCourse(form:FormData){
 const {supabase}=await requireStaff();
 let tipo='',nome='',livello:number|null=null,descrizione:string|null=null;
 try{
  tipo=valueOf(form,'tipo',20);if(!['ARA','APNEA','NUOTO_LIBERO'].includes(tipo))throw Error();
  nome=valueOf(form,'nome',150);if(!nome)throw Error();
  livello=tipo==='ARA'?Number(valueOf(form,'livello',1)):null;
  if(tipo==='ARA'&&(livello===null||!Number.isInteger(livello)||livello<1||livello>5))throw Error();
  descrizione=valueOf(form,'descrizione',1000)||null;
 }catch{redirect(fail);}
 const {error}=await supabase.from('corsi').insert({tipo,nome,livello,descrizione});
 if(error)redirect(fail);
 refresh();redirect('/gestionale/corsi/nuovo?msg=catalogo');
}

export async function createEdition(form:FormData){
 const {supabase}=await requireStaff();
 let corso_id='',stagione_id='',nome='',inizio='',fine='',capienza=0,costo_corso:number|null=null,note:string|null=null;
 try{
  corso_id=uuidValue(form,'corso_id');stagione_id=uuidValue(form,'stagione_id');
  nome=valueOf(form,'nome',160);if(!nome)throw Error();
  inizio=dateValue(form,'inizio');fine=dateValue(form,'fine');if(fine<inizio)throw Error();
  capienza=Number(valueOf(form,'massimo_partecipanti',4));if(!Number.isInteger(capienza)||capienza<1||capienza>500)throw Error();
  note=valueOf(form,'note',2000)||null;const raw=valueOf(form,'costo_corso',20);costo_corso=raw?Number(raw.replace(',','.')):null;if(costo_corso!==null&&(!Number.isFinite(costo_corso)||costo_corso<0||Math.round(costo_corso*100)!==costo_corso*100))throw Error();
 }catch{redirect(fail);}
 const {data:season}=await supabase.from('stagioni').select('dal,al').eq('id',stagione_id).maybeSingle();
 if(!season||inizio<season.dal||fine>season.al)redirect('/gestionale/corsi/nuovo?msg=stagione');
 const {data,error}=await supabase.from('edizioni_corsi').insert({corso_id,stagione_id,nome,inizio,fine,massimo_partecipanti:capienza,costo_corso,stato:'programmato',note}).select('id').single();
 if(error||!data)redirect(fail);
 refresh(data.id);redirect(detailHref(data.id,'creato'));
}

export async function updateEdition(form:FormData){
 const {supabase}=await requireStaff();
 let id='',nome='',capienza=0,stato='',costo_corso:number|null=null,note:string|null=null;
 try{
  id=uuidValue(form,'edizione_id');nome=valueOf(form,'nome',160);if(!nome)throw Error();
  capienza=Number(valueOf(form,'massimo_partecipanti',4));if(!Number.isInteger(capienza)||capienza<1||capienza>500)throw Error();
  stato=valueOf(form,'stato',20);if(!COURSE_STATES.some(s=>s===stato))throw Error();
  note=valueOf(form,'note',2000)||null;const raw=valueOf(form,'costo_corso',20);costo_corso=raw?Number(raw.replace(',','.')):null;if(costo_corso!==null&&(!Number.isFinite(costo_corso)||costo_corso<0||Math.round(costo_corso*100)!==costo_corso*100))throw Error();
 }catch{redirect('/gestionale/corsi?msg=dati');}
 const {error}=await supabase.from('edizioni_corsi').update({nome,massimo_partecipanti:capienza,costo_corso,stato,note}).eq('id',id).select('id').single();
 if(error)redirect(detailHref(id,'vincolo'));
 refresh(id);redirect(detailHref(id,'salvato'));
}

export async function addInstructor(form:FormData){
 const {supabase}=await requireStaff();
 let id='',persona_id='',ruolo='';
 try{id=uuidValue(form,'edizione_id');persona_id=uuidValue(form,'persona_id');ruolo=valueOf(form,'ruolo',15);if(!['responsabile','aiuto'].includes(ruolo))throw Error();}
 catch{redirect('/gestionale/corsi?msg=dati');}
 const {data:edition}=await supabase.from('edizioni_corsi').select('stato').eq('id',id).maybeSingle();
 if(!edition||edition.stato==='annullato'||edition.stato==='concluso')redirect(detailHref(id,'stato'));
 const {data:qual}=await supabase.from('qualifiche_istruttori').select('id').eq('persona_id',persona_id).limit(1);
 if(!qual?.length)redirect(detailHref(id,'qualifica'));
 const {error}=await supabase.from('assegnazioni_istruttori').insert({edizione_id:id,persona_id,ruolo});
 if(error)redirect(detailHref(id,'assegnazione'));
 refresh(id);redirect(detailHref(id,'istruttore'));
}

export async function removeInstructor(form:FormData){
 const {supabase}=await requireStaff();let id='',assignment='';
 try{id=uuidValue(form,'edizione_id');assignment=uuidValue(form,'assegnazione_id');}catch{redirect('/gestionale/corsi?msg=dati');}
 const {data:row}=await supabase.from('assegnazioni_istruttori').select('ruolo').eq('id',assignment).eq('edizione_id',id).maybeSingle();
 if(!row)redirect(detailHref(id,'vincolo'));
 // Prima di togliere il responsabile di un'edizione attiva, bisogna concludere/sospendere la gestione del corso.
 if(row.ruolo==='responsabile')redirect(detailHref(id,'responsabile'));
 const {error}=await supabase.from('assegnazioni_istruttori').delete().eq('id',assignment).eq('edizione_id',id);
 if(error)redirect(detailHref(id,'vincolo'));
 refresh(id);redirect(detailHref(id,'istruttore'));
}

export async function replaceResponsible(form:FormData){
 const {supabase}=await requireStaff();let id='',person='';
 try{id=uuidValue(form,'edizione_id');person=uuidValue(form,'persona_id');}catch{redirect('/gestionale/corsi?msg=dati');}
 const [{data:current},{data:edition},{data:qual}]=await Promise.all([
  supabase.from('assegnazioni_istruttori').select('id,persona_id').eq('edizione_id',id).eq('ruolo','responsabile').maybeSingle(),
  supabase.from('edizioni_corsi').select('stato').eq('id',id).maybeSingle(),
  supabase.from('qualifiche_istruttori').select('id').eq('persona_id',person).limit(1)
 ]);
 if(!edition||!['programmato','attivo'].includes(edition.stato))redirect(detailHref(id,'stato'));
 if(!qual?.length)redirect(detailHref(id,'qualifica'));
 if(current?.persona_id===person)redirect(detailHref(id,'istruttore'));
 if(!current)redirect(detailHref(id,'responsabile'));
 const {error}=await supabase.from('assegnazioni_istruttori').update({persona_id:person}).eq('id',current.id).eq('edizione_id',id).select('id').single();
 if(error)redirect(detailHref(id,'assegnazione'));
 refresh(id);redirect(detailHref(id,'istruttore'));
}

export async function addEnrollment(form:FormData){
 const {supabase}=await requireStaff();let id='',person='',stato='';
 try{id=uuidValue(form,'edizione_id');person=uuidValue(form,'persona_id');stato=valueOf(form,'stato',20);if(!['in_attesa','iscritto'].includes(stato))throw Error();}
 catch{redirect('/gestionale/corsi?msg=dati');}
 const {data:edition}=await supabase.from('edizioni_corsi').select('stagione_id,stato').eq('id',id).maybeSingle();
 if(!edition||!['programmato','attivo'].includes(edition.stato))redirect(detailHref(id,'stato'));
 // L'adesione attiva nella stagione è richiesta per la conferma, non per la richiesta in attesa.
 if(stato==='iscritto'){
  const {data:member}=await supabase.from('adesioni').select('id').eq('persona_id',person).eq('stagione_id',edition.stagione_id).eq('stato','attiva').limit(1);
  if(!member?.length)redirect(detailHref(id,'adesione'));
 }
 const {error}=await supabase.from('iscrizioni_corsi').insert({edizione_id:id,persona_id:person,stato});
 if(error)redirect(detailHref(id,'iscrizione'));
 refresh(id);redirect(detailHref(id,'iscritto'));
}

export async function updateEnrollment(form:FormData){
 const {supabase}=await requireStaff();let id='',iscrizione='',stato='';
 try{id=uuidValue(form,'edizione_id');iscrizione=uuidValue(form,'iscrizione_id');stato=valueOf(form,'stato',20);if(!ENROLLMENT_STATES.some(s=>s===stato))throw Error();}
 catch{redirect('/gestionale/corsi?msg=dati');}
 const [{data:edition},{data:row}]=await Promise.all([
  supabase.from('edizioni_corsi').select('stagione_id,stato').eq('id',id).maybeSingle(),
  supabase.from('iscrizioni_corsi').select('persona_id,stato').eq('edizione_id',id).eq('id',iscrizione).maybeSingle()
 ]);
 if(!edition||!row)redirect(detailHref(id,'vincolo'));
 if(stato==='iscritto'){
  if(!['programmato','attivo'].includes(edition.stato))redirect(detailHref(id,'stato'));
  const {data:member}=await supabase.from('adesioni').select('id').eq('persona_id',row.persona_id).eq('stagione_id',edition.stagione_id).eq('stato','attiva').limit(1);
  if(!member?.length)redirect(detailHref(id,'adesione'));
 }
 if(row.stato==='concluso'&&stato!=='concluso')redirect(detailHref(id,'stato'));
 const {error}=await supabase.from('iscrizioni_corsi').update({stato}).eq('id',iscrizione).eq('edizione_id',id).select('id').single();
 if(error)redirect(detailHref(id,'iscrizione'));
 refresh(id);redirect(detailHref(id,'iscritto'));
}

export async function createLesson(form:FormData){
 const {supabase}=await requireStaff();let id='',titolo='',inizio='',fine='',piscina_id:string|null=null,corsie:string[]=[],esercizi:string|null=null,materiale:string|null=null;
 const rawId=String(form.get('edizione_id')??'');
 try{
  id=uuidValue(form,'edizione_id');titolo=valueOf(form,'titolo',160);if(!titolo)throw Error();
  inizio=asRomeISO(valueOf(form,'inizio',16));fine=asRomeISO(valueOf(form,'fine',16));if(fine<=inizio)throw Error();
  const p=valueOf(form,'piscina_id',40);piscina_id=p?(UUID_RE.test(p)?p:(()=>{throw Error();})()):null;
  corsie=form.getAll('corsie_id').map(v=>String(v)).filter(Boolean);
  if(corsie.length>20||new Set(corsie).size!==corsie.length||corsie.some(v=>!UUID_RE.test(v))||(corsie.length>0&&!piscina_id))throw Error();
  esercizi=valueOf(form,'esercizi',2000)||null;materiale=valueOf(form,'materiale',1000)||null;
 }catch{redirect(UUID_RE.test(rawId)?detailHref(rawId,'lezione'):'/gestionale/corsi?msg=dati');}
 // La funzione SQL inserisce lezione e corsie in un'unica transazione; qualsiasi conflitto annulla tutto.
 const {error}=await supabase.rpc('crea_lezione_guidata',{
  p_edizione:id,p_titolo:titolo,p_inizio:inizio,p_fine:fine,p_piscina:piscina_id,
  p_corsie:corsie,p_esercizi:esercizi,p_materiale:materiale
 });
 if(error)redirect(detailHref(id,'lezione'));
 refresh(id);revalidatePath('/gestionale/calendario-visivo');redirect(detailHref(id,'lezione_creata'));
}

export async function recordClassAttendance(form:FormData){
 const {supabase}=await requireStaff();let id='',lesson_id='';
 try{id=uuidValue(form,'edizione_id');lesson_id=uuidValue(form,'lezione_id');}catch{redirect('/gestionale/corsi?msg=dati');}
 const {data:lesson}=await supabase.from('lezioni').select('id').eq('id',lesson_id).eq('edizione_id',id).is('annullata_il',null).maybeSingle();
 if(!lesson)redirect(detailHref(id,'vincolo'));
 const {data:learners,error:listError}=await supabase.from('iscrizioni_corsi').select('persona_id')
  .eq('edizione_id',id).in('stato',['iscritto','concluso']).limit(501);
 if(listError||!learners||learners.length>500)redirect(detailHref(id,'vincolo'));
 const rows:{lezione_id:string;persona_id:string;presente:boolean}[]=[];
 for(const p of learners){
  const value=String(form.get(`pres_${p.persona_id}`)??'');
  if(value==='si'||value==='no')rows.push({lezione_id:lesson_id,persona_id:p.persona_id,presente:value==='si'});
 }
 if(rows.length){const {error}=await supabase.from('presenze').upsert(rows,{onConflict:'lezione_id,persona_id'});if(error)redirect(detailHref(id,'presenze'));}
 refresh(id);redirect(detailHref(id,'presenze_salvate'));
}

export async function setCourseProgram(form:FormData){
 const {supabase}=await requireStaff();let id='',version:string|null=null;
 try{id=uuidValue(form,'edizione_id');const raw=valueOf(form,'programma_versione_id',40);version=raw?(UUID_RE.test(raw)?raw:(()=>{throw Error();})()):null;}
 catch{redirect('/gestionale/corsi?msg=dati');}
 if(version){
  const {data:edition}=await supabase.from('edizioni_corsi').select('corso_id').eq('id',id).maybeSingle();
  const {data:catalog}=edition?await supabase.from('corsi').select('tipo').eq('id',edition.corso_id).maybeSingle():{data:null};
  const {data:ver}=await supabase.from('versioni_programmi').select('programma_id,stato').eq('id',version).maybeSingle();
  const {data:program}=ver?await supabase.from('programmi_didattici').select('tipo').eq('id',ver.programma_id).maybeSingle():{data:null};
  if(!catalog||!ver||ver.stato!=='approvato'||!program||catalog.tipo!==program.tipo)redirect(detailHref(id,'programma'));
 }
 const {error}=await supabase.from('edizioni_corsi').update({programma_versione_id:version}).eq('id',id).select('id').single();
 if(error)redirect(detailHref(id,'programma'));
 refresh(id);redirect(detailHref(id,'programma_salvato'));
}

// MOD-22: sostituzione atomica dell'ordine dei moduli di una sola lezione.
export async function saveLessonModules(form:FormData){
 const {supabase}=await requireStaff();
 let edizione='',lezione='';
 try{edizione=uuidValue(form,'edizione_id');lezione=uuidValue(form,'lezione_id');}catch{redirect('/gestionale/corsi');}
 const {data:lesson}=await supabase.from('lezioni').select('id').eq('id',lezione).eq('edizione_id',edizione).is('annullata_il',null).maybeSingle();
 if(!lesson)redirect(detailHref(edizione,'lezione'));
 const ids=form.getAll('modulo_id').map(String);
 if(ids.length>50||ids.some(x=>!UUID_RE.test(x))||new Set(ids).size!==ids.length)redirect(detailHref(edizione,'moduli'));
 const {error}=await supabase.rpc('imposta_moduli_lezione',{p_lezione:lezione,p_moduli:ids});
 if(error)redirect(detailHref(edizione,'moduli'));
 revalidatePath(`/gestionale/corsi/${edizione}`);redirect(detailHref(edizione,'moduli_salvati'));
}
