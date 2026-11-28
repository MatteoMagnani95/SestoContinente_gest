'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function askForCourse(form:FormData){
 const {supabase}=await requireUser();
 const p_persona=String(form.get('persona_id')??'');
 const p_edizione=String(form.get('edizione_id')??'');
 if(!uuid.test(p_persona)||!uuid.test(p_edizione))redirect('/area-personale/corsi?msg=errore');
 const {error}=await supabase.rpc('richiedi_iscrizione_corso',{p_persona,p_edizione});
 if(error)redirect('/area-personale/corsi?msg='+(error.code==='P3421'?'direttore':error.code==='23505'||error.message.includes('già presente')?'duplicata':error.code==='P3413'?'requisiti':error.code==='P3520'||error.code==='P3521'?'istruttore':'errore'));
 revalidatePath('/area-personale/corsi');revalidatePath('/gestionale/corsi');revalidatePath('/gestionale/corsi/'+p_edizione);redirect('/area-personale/corsi?msg=inviata');
}
export async function markNotification(form:FormData){
 const {supabase}=await requireUser();
 const p_id=String(form.get('id')??'');
 if(!uuid.test(p_id))return;
 await supabase.rpc('segna_notifica_letta',{p_id});
 revalidatePath('/area-personale');
}
