'use server';
import {redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';
export async function grantRole(form:FormData){
 const {supabase,user}=await requireStaff();
 const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!data)redirect('/gestionale?msg=permessi');
 const email=String(form.get('email')??'').trim().toLowerCase();
 const ruolo=String(form.get('ruolo')??'').trim();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!['amministratore','segreteria','istruttore','socio','tutore','consigliere_cda'].includes(ruolo))
  redirect('/gestionale/utenti?msg=dati');
 const {error}=await supabase.rpc('assegna_ruolo_email',{p_email:email,p_ruolo:ruolo});
 if(error)redirect('/gestionale/utenti?msg=errore');
 redirect('/gestionale/utenti?msg=ok');
}
export async function linkPersonToAccount(form:FormData){
 const {supabase,user}=await requireStaff();
 const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!data)redirect('/gestionale?msg=permessi');
 const p_email=String(form.get('email')??'').trim().toLowerCase();
 const p_persona=String(form.get('persona_id')??'');
 const p_relazione=String(form.get('relazione')??'titolare');
 if(!p_email.includes('@')||!/^[0-9a-f-]{36}$/i.test(p_persona)||!['titolare','tutore'].includes(p_relazione))redirect('/gestionale/utenti?msg=dati');
 const {error}=await supabase.rpc('collega_account_a_persona',{p_email,p_persona,p_relazione});
 redirect(`/gestionale/utenti?msg=${error?'errore':'collegato'}`);
}
