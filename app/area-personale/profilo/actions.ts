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
