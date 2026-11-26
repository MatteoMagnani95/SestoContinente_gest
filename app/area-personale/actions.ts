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
 if(!uuid.test(p_persona)||!uuid.test(p_edizione))return {error:'Seleziona un profilo e un corso validi.'};
 const p_nome=String(form.get('emergenza_nome')??'').trim(),p_telefono=String(form.get('emergenza_telefono')??'').trim();
 if(!emergencyPair(p_nome,p_telefono)||p_nome.length>160||p_telefono.length>32)return {error:'Inserisci entrambi i dati del contatto di emergenza, oppure lasciali entrambi vuoti.'};
 const {error}=await supabase.rpc('iscrivi_con_contatto',{p_persona,p_edizione,p_nome,p_telefono,p_richiesta:true});
 if(error)return {error:error.code==='P3421'?'Il direttore non può essere allievo.':error.code==='23505'?'Iscrizione già presente.':'Richiesta non inviata. Verifica requisiti associativi e capienza.'};
 revalidatePath('/area-personale/corsi');redirect('/area-personale/corsi?tab=iscrizioni&msg=inviata');
}
export async function markNotification(form:FormData){
 const {supabase,user}=await requireUser();
 const p_id=String(form.get('id')??'');
 if(!uuid.test(p_id))redirect('/area-personale?tab=notifiche&msg=notifica_errore');
 await supabase.rpc('segna_notifica_letta',{p_id});
 // La RPC restituisce void anche se l'identificativo non appartiene all'account.
 // Confermare l'esito con una lettura sotto RLS, non dalla sola assenza di errori.
 const {data:notification,error:readError}=await supabase.from('notifiche').select('letta_il').eq('id',p_id).eq('utente_id',user.id).maybeSingle();
 revalidatePath('/area-personale');redirect('/area-personale?tab=notifiche&msg='+(readError||!notification?.letta_il?'notifica_errore':'letta'));
}
