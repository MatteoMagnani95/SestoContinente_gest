'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
export async function editTeachingModule(form:FormData){
 const {supabase}=await requireStaff();const text=(k:string)=>String(form.get(k)??'').trim();
 const id=text('id'),pre_id=text('pre_id').toUpperCase(),tipo=text('tipo'),codice=text('codice'),titolo=text('titolo'),descrizione=text('descrizione');
 if((id&&!/^[0-9a-f-]{36}$/i.test(id))||(!id&&!/^[A-Z0-9-]{1,6}$/.test(pre_id))||!['Piscina','Teoria'].includes(tipo)||!codice||codice.length>100||!titolo||titolo.length>250||!descrizione||descrizione.length>15000)return {error:'Controlla codice, titolo, tipologia e descrizione.'};
 const {data,error}=id?await supabase.from('moduli_didattici').update({tipo,codice,titolo,descrizione}).eq('id',id).select('id').maybeSingle():await supabase.from('moduli_didattici').insert({pre_id,tipo,codice,titolo,descrizione}).select('id').single();
 if(error||!data)return {error:'Modulo non salvato. Controlla eventuali duplicati e collegamenti.'};
 revalidatePath('/gestionale/programmi-didattici');redirect('/gestionale/programmi-didattici?msg=salvato');
}
