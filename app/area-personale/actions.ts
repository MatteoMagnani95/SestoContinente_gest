'use server';
import {emergencyPair} from '@/lib/course-ui';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';
const uuid=/^[0-9a-f-]{36}$/i;
export async function askForCourse(form:FormData){
 const {supabase}=await requireUser();
 const p_persona=String(form.get('persona_id')??'');
 const p_edizione=String(form.get('edizione_id')??'');
 if(!uuid.test(p_persona)||!uuid.test(p_edizione))redirect('/area-personale/corsi?msg=errore');
 const p_nome=String(form.get('emergenza_nome')??'').trim(),p_telefono=String(form.get('emergenza_telefono')??'').trim();
 if(!emergencyPair(p_nome,p_telefono)||p_nome.length>160||p_telefono.length>32)redirect('/area-personale/corsi?msg=errore');
 const {error}=await supabase.rpc('iscrivi_con_contatto',{p_persona,p_edizione,p_nome,p_telefono,p_richiesta:true});
 if(error)redirect('/area-personale/corsi?msg='+(error.code==='P3421'?'direttore':error.code==='23505'||error.message.includes('già presente')?'duplicata':'errore'));
 revalidatePath('/area-personale/corsi');redirect('/area-personale/corsi?msg=inviata');
}
export async function markNotification(form:FormData){
 const {supabase}=await requireUser();
 const p_id=String(form.get('id')??'');
 if(!uuid.test(p_id))return;
 await supabase.rpc('segna_notifica_letta',{p_id});
 revalidatePath('/area-personale');
}
