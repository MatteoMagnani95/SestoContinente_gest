'use server';
import {redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';
export async function grantRole(form:FormData){
 const {supabase,user}=await requireStaff();
 const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!data)redirect('/gestionale?msg=permessi');
 const email=String(form.get('email')??'').trim().toLowerCase();
 const ruolo=String(form.get('ruolo')??'').trim();
 if(form.get('conferma')!=='on'||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!['amministratore','segreteria','istruttore','socio','tutore','consigliere_cda'].includes(ruolo))
  redirect('/gestionale/utenti?msg=dati');
 const {error}=await supabase.rpc('assegna_ruolo_email',{p_email:email,p_ruolo:ruolo});
 if(error)redirect('/gestionale/utenti?msg=errore');
 redirect(accountBack(form,'ok'));
}
export async function linkPersonToAccount(form:FormData){
 const {supabase,user}=await requireStaff();
 const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!data)redirect('/gestionale?msg=permessi');
 const p_email=String(form.get('email')??'').trim().toLowerCase();
 const p_persona=String(form.get('persona_id')??'');
 const p_relazione=String(form.get('relazione')??'');
 if(form.get('conferma')!=='on'||!p_email.includes('@')||!/^[0-9a-f-]{36}$/i.test(p_persona)||!['titolare','tutore'].includes(p_relazione))redirect('/gestionale/utenti?msg=dati');
 const {error}=await supabase.rpc('collega_account_a_persona',{p_email,p_persona,p_relazione});
 redirect(accountBack(form,error?'errore':'collegato'));
}

export async function removeRole(form:FormData){
 const {supabase}=await requireStaff();
 const id=String(form.get('utente_id')??''),role=String(form.get('ruolo')??'');
 if(form.get('conferma')!=='on'||!/^[0-9a-f-]{36}$/i.test(id)||!['amministratore','segreteria','istruttore','socio','tutore','consigliere_cda'].includes(role))redirect('/gestionale/utenti?msg=dati');
 const {error}=await supabase.rpc('rimuovi_ruolo_gestionale',{p_utente:id,p_ruolo:role});
 redirect(accountBack(form,error?'rimozione_negata':'rimosso'));
}

// Le API Auth amministrative usano la chiave privilegiata solo dopo una verifica server del ruolo.
import {requireAdmin} from '@/lib/security';
import {createAuthAdmin} from '@/lib/supabase/admin';
import {accountUuid,accountEmail,type AccountRow} from '@/lib/admin-accounts';
import {revalidatePath} from 'next/cache';
const value=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const index='/gestionale/utenti';
function accountBack(form:FormData,msg:string){const id=value(form,'back_account');return `${accountUuid.test(id)?`${index}/${id}`:index}?msg=${msg}`;}
function destination(id:string,msg:string):never{revalidatePath(index);redirect(`${id?`${index}/${id}`:index}?msg=${msg}`);}
export async function createAccount(form:FormData){
 const {supabase}=await requireAdmin();const admin=createAuthAdmin();
 if(!admin)destination('','config');
 const email=value(form,'email').toLowerCase(),password=String(form.get('password')??'');
 if(!accountEmail(email)||password.length<10||password.length>128||password!==String(form.get('password_confirm')??'')||form.get('conferma')!=='on')destination('','dati');
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:form.get('email_verificata')==='on'});
 if(error||!data.user){console.error('admin create account',error?.code??'missing_user');destination('','errore');}
 const logged=await supabase.rpc('admin_registra_intervento_account',{p_id:data.user.id,p_operazione:'CREATE'});
 destination(data.user.id,logged.error?'audit':'creato');
}
export async function manageAccount(form:FormData){
 const {supabase,user}=await requireAdmin();const admin=createAuthAdmin();
 const id=value(form,'utente_id'),op=value(form,'operazione');
 if(!accountUuid.test(id))destination('','dati');
 if(!admin)destination(id,'config');
 if(id===user.id)destination(id,'protetto');
 const {data:pending,error:pendingError}=await supabase.from('eliminazioni_account_pendenti').select('utente_id').eq('utente_id',id).maybeSingle();
 if(pendingError)destination(id,'errore');
 if(pending)redirect(`${index}/${id}/elimina`);
 if(!['update','password','disable','enable','soft_delete','delete'].includes(op)||form.get('conferma')!=='on')destination(id,'dati');
 const {data:rows,error:readError}=await supabase.rpc('admin_elenco_account',{p_q:'',p_offset:0,p_limit:1,p_id:id});
 const target=(rows as AccountRow[]|null)?.[0];if(readError||!target)destination('','errore');
 if(target.ruoli.includes('amministratore')&&!['update','password'].includes(op))destination(id,'protetto');
 if(target.rimosso_il&&op!=='delete')destination(id,'dati');
 let status='ok',audit='UPDATE';let error:{code?:string;message?:string}|null=null;
 if(op==='update'){
  const email=value(form,'email').toLowerCase();if(!accountEmail(email))destination(id,'dati');
  // La conferma manuale è deliberata; non confermare automaticamente indirizzi non verificati.
  if(email!==target.email&&form.get('email_verificata')!=='on')destination(id,'dati');
  const result=await admin.auth.admin.updateUserById(id,{email,...(form.get('email_verificata')==='on'?{email_confirm:true}:{})});error=result.error;status='aggiornato';
 }else if(op==='password'){
  const password=String(form.get('password')??'');if(password.length<10||password.length>128||password!==String(form.get('password_confirm')??''))destination(id,'dati');
  error=(await admin.auth.admin.updateUserById(id,{password})).error;status='password';audit='RESET_PASSWORD';
 }else if(op==='disable'||op==='enable'){
  error=(await admin.auth.admin.updateUserById(id,{ban_duration:op==='disable'?'876000h':'none'})).error;status=op==='disable'?'disattivato':'riattivato';audit=op==='disable'?'DISABLE':'ENABLE';
 }else{
  if(value(form,'conferma_testo')!=='RIMUOVI')destination(id,'dati');
  if(op==='delete'){
   const {data:deps,error:depsError}=await supabase.rpc('admin_fk_dipendenze',{p_schema:'auth',p_tabella:'users',p_id:id});
   if(depsError)destination(id,'errore');
   if((deps??[]).some((d:{tabella:string})=>!['ruoli_utente','collegamenti_persone'].includes(d.tabella)))destination(id,'storico');
  }
  error=(await admin.auth.admin.deleteUser(id,op==='soft_delete')).error;status='rimosso_account';audit=op==='soft_delete'?'SOFT_DELETE':'DELETE';
 }
 if(error){console.error('admin auth mutation',op,error.code??'auth_error');destination(id,op==='delete'||op==='soft_delete'?'storage':'errore');}
 const recorded=await supabase.rpc('admin_registra_intervento_account',{p_id:id,p_operazione:audit});
 destination(op==='delete'?'':id,recorded.error?'audit':status);
}
export async function unlinkAccount(form:FormData){
 const {supabase,user}=await requireAdmin();const id=value(form,'utente_id'),person=value(form,'persona_id');
 if(!accountUuid.test(id)||!accountUuid.test(person)||id===user.id||form.get('conferma')!=='on')destination(accountUuid.test(id)?id:'','dati');
 const {data,error}=await supabase.from('collegamenti_persone').delete().eq('utente_id',id).eq('persona_id',person).select('persona_id').maybeSingle();
 destination(id,error||!data?'errore':'scollegato');
}
