'use server';
import {redirect} from 'next/navigation';
import {requireUser} from '@/lib/security';
export async function updateContact(form:FormData){
 const {supabase}=await requireUser();
 const person=String(form.get('persona_id')??'');
 if(!/^[0-9a-f-]{36}$/i.test(person))redirect('/area-personale/profilo?msg=errore');
 const read=(key:string)=>String(form.get(key)??'').trim();
 const {error}=await supabase.rpc('aggiorna_recapiti_personali',{p_persona:person,p_telefono:read('telefono'),p_indirizzo:read('indirizzo'),p_cap:read('cap'),p_comune:read('comune')});
 redirect(`/area-personale/profilo?msg=${error?'errore':'ok'}`);
}

export async function updateEmergencyContact(form:FormData){
 const {supabase,user}=await requireUser();
 const person=String(form.get('persona_id')??'');
 const name=String(form.get('emergenza_nome')??'').trim();
 const phone=String(form.get('emergenza_telefono')??'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(person)||name.length<2||name.length>160||phone.length<5||phone.length>32||!/^\+?[\d\s().-]+$/.test(phone)||phone.replace(/\D/g,'').length<5)redirect('/area-personale/profilo?msg=emergenza_dati');
 const {data:link,error:linkError}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id).eq('persona_id',person).maybeSingle();
 if(linkError||!link)redirect('/area-personale/profilo?msg=emergenza_errore');
 const {error}=await supabase.from('contatti_emergenza').upsert({persona_id:person,nominativo:name,telefono:phone},{onConflict:'persona_id'});
 redirect('/area-personale/profilo?msg='+ (error?'emergenza_errore':'emergenza_ok'));
}
