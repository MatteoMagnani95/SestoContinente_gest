'use server';
import {redirect} from 'next/navigation';
import {requireUser} from '@/lib/security';
export async function updateContact(form:FormData){
 const {supabase}=await requireUser();
 const person=String(form.get('persona_id')??'');
 if(!/^[0-9a-f-]{36}$/i.test(person))return {error:'Profilo non valido.'};
 const read=(key:string)=>String(form.get(key)??'').trim();
 const {error}=await supabase.rpc('aggiorna_recapiti_personali',{p_persona:person,p_telefono:read('telefono'),p_indirizzo:read('indirizzo'),p_cap:read('cap'),p_comune:read('comune')});
 if(error)return {error:'Recapiti non salvati. Verifica i dati e i permessi.'};redirect('/area-personale/profilo?msg=ok');
}
