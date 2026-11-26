'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {calendarFormContext,calendarLessonHref,type LanePreview} from '@/lib/calendar-tools';
import {tutteLePagine} from '@/lib/pagine';
import {lessonInterval,UUID_RE,uuidValue,textValue} from '@/lib/course-tools';


export async function changeLesson(form:FormData){
 const {supabase}=await requireStaff();
 let id='',titolo='',inizio='',fine='',piscina:string|null=null,corsie:string[]=[],esercizi:string|null=null,materiale:string|null=null,note:string|null=null;
 try{
  id=uuidValue(form,'lezione_id');titolo=textValue(form,'titolo',160);
  ({inizio,fine}=lessonInterval(form));
  if(!titolo||fine<=inizio)throw Error('Intervallo non valido');
  const raw=textValue(form,'piscina_id',40);piscina=raw?(UUID_RE.test(raw)?raw:(()=>{throw Error('Piscina non valida');})()):null;
  corsie=form.getAll('corsie_id').map(String).filter(Boolean);
  if(corsie.length>20||new Set(corsie).size!==corsie.length||corsie.some(c=>!UUID_RE.test(c))||(corsie.length>0&&!piscina))throw Error('Corsie non valide');
  esercizi=textValue(form,'esercizi',2000)||null;
  materiale=textValue(form,'materiale',1000)||null;
  note=textValue(form,'note',2000)||null;
 }catch{return {error:'Controlla titolo, date, orari italiani, piscina e corsie.'};}
 const {error}=await supabase.rpc('modifica_lezione_e_corsie',{
  p_lezione:id,p_titolo:titolo,p_inizio:inizio,p_fine:fine,p_piscina:piscina,
  p_corsie:corsie,p_esercizi:esercizi,p_materiale:materiale,p_note:note
 });
 if(error)return {error:error.code==='23P01'?'Corsia già prenotata nell’intervallo richiesto. Le prenotazioni originali non sono state modificate.':'Modifica non salvata. Verifica periodo, orario, stato del corso e presenze registrate. Le prenotazioni originali sono conservate.'};
 revalidatePath('/gestionale/calendario-visivo');revalidatePath('/gestionale/corsi','layout');
 redirect(calendarLessonHref(id,calendarFormContext(form),'salvata'));
}
export async function cancelLesson(form:FormData){
 const {supabase}=await requireStaff();
 let id='';try{id=uuidValue(form,'lezione_id');}catch{return {error:'Lezione non valida.'};}
 if(form.get('conferma')!=='on')return {error:'Conferma esplicitamente l’annullamento.'};
 const {error}=await supabase.rpc('annulla_lezione_guidata',{p_lezione:id});
 if(error)return {error:'Annullamento non riuscito. Verifica lo stato e le presenze già registrate.'};
 revalidatePath('/gestionale/calendario-visivo');revalidatePath('/gestionale/corsi','layout');
 redirect(calendarLessonHref(id,calendarFormContext(form),'annullata'));
}

// Anteprima non vincolante. Il controllo finale resta nella RPC e nella constraint EXCLUDE.
export async function checkLaneConflicts(form:FormData):Promise<LanePreview>{
 const {supabase}=await requireStaff();
 let pool='',exclude='',inizio='',fine='';
 try{pool=uuidValue(form,'piscina_id');({inizio,fine}=lessonInterval(form));exclude=String(form.get('lezione_id')??'');if(exclude&&!UUID_RE.test(exclude))throw Error();}catch{return {status:'error',message:'Indica piscina e intervallo valido (ora italiana).'};}
 // Non trasformare un errore RLS, di rete o di lettura in assenza di conflitti.
 const result=await tutteLePagine((da,a)=>{
  let query=supabase.from('prenotazioni_corsie').select('id,corsia_id,lezione_id,inizio,fine,corsie!inner(piscina_id)').eq('corsie.piscina_id',pool).eq('stato','confermata').lt('inizio',fine).gt('fine',inizio);
  if(exclude)query=query.neq('lezione_id',exclude);
  return query.order('inizio').order('id').range(da,a);
 });
 if(result.error||!result.data)return {status:'error',message:'Occupazione non verificabile. Riprova prima di prenotare.'};
 return {status:'ready',conflicts:result.data.map(({id,corsia_id,lezione_id,inizio,fine})=>({id,corsia_id,lezione_id,inizio,fine})),checkedAt:new Date().toISOString()};
}
