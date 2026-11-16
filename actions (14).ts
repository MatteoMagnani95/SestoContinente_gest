'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {asRomeISO,UUID_RE,uuidValue,textValue} from '@/lib/course-tools';

function page(id:string,msg:string){return `/gestionale/calendario-visivo/${id}?msg=${msg}`;}
export async function changeLesson(form:FormData){
 const {supabase}=await requireStaff();
 let id='',titolo='',inizio='',fine='',piscina:string|null=null,corsie:string[]=[],esercizi:string|null=null,materiale:string|null=null,note:string|null=null;
 try{
  id=uuidValue(form,'lezione_id');titolo=textValue(form,'titolo',160);
  inizio=asRomeISO(textValue(form,'inizio',16));fine=asRomeISO(textValue(form,'fine',16));
  if(!titolo||fine<=inizio)throw Error('Intervallo non valido');
  const raw=textValue(form,'piscina_id',40);piscina=raw?(UUID_RE.test(raw)?raw:(()=>{throw Error('Piscina non valida');})()):null;
  corsie=form.getAll('corsie_id').map(String).filter(Boolean);
  if(corsie.length>20||new Set(corsie).size!==corsie.length||corsie.some(c=>!UUID_RE.test(c))||(corsie.length>0&&!piscina))throw Error('Corsie non valide');
  esercizi=textValue(form,'esercizi',2000)||null;
  materiale=textValue(form,'materiale',1000)||null;
  note=textValue(form,'note',2000)||null;
 }catch{redirect(UUID_RE.test(id)?page(id,'dati'):'/gestionale/calendario-visivo?msg=dati');}
 const {error}=await supabase.rpc('modifica_lezione_e_corsie',{
  p_lezione:id,p_titolo:titolo,p_inizio:inizio,p_fine:fine,p_piscina:piscina,
  p_corsie:corsie,p_esercizi:esercizi,p_materiale:materiale,p_note:note
 });
 if(error)redirect(page(id,'conflitto'));
 revalidatePath('/gestionale/calendario-visivo');revalidatePath(page(id,''));
 redirect(page(id,'salvata'));
}
export async function cancelLesson(form:FormData){
 const {supabase}=await requireStaff();
 let id='';try{id=uuidValue(form,'lezione_id');}catch{redirect('/gestionale/calendario-visivo?msg=dati');}
 const {error}=await supabase.rpc('annulla_lezione_guidata',{p_lezione:id});
 if(error)redirect(page(id,'annullamento'));
 revalidatePath('/gestionale/calendario-visivo');revalidatePath(page(id,''));
 redirect(page(id,'annullata'));
}
