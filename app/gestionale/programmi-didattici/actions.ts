'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
export async function editTeachingModule(form:FormData){
 const {supabase}=await requireStaff();const text=(k:string)=>String(form.get(k)??'').trim();
 const id=text('id'),tipo=text('tipo'),codice=text('codice'),titolo=text('titolo'),descrizione=text('descrizione');
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['Piscina','Teoria'].includes(tipo)||!codice||codice.length>100||!titolo||titolo.length>250||!descrizione||descrizione.length>15000)redirect('/gestionale/programmi-didattici?msg=dati');
 const {data,error}=await supabase.from('moduli_didattici').update({tipo,codice,titolo,descrizione}).eq('id',id).select('id').maybeSingle();
 revalidatePath('/gestionale/programmi-didattici');redirect(`/gestionale/programmi-didattici?msg=${error||!data?'errore':'salvato'}`);
}
