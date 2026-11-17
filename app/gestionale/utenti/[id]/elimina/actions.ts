'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/security';
import {createAuthAdmin} from '@/lib/supabase/admin';
import {accountUuid} from '@/lib/admin-accounts';
type FileEntry={bucket:string;path:string};
export async function deleteFullAccount(form:FormData){
 const {supabase,user}=await requireAdmin();
 const id=String(form.get('utente_id')??'');
 if(!accountUuid.test(id)||id===user.id)redirect('/gestionale/utenti?msg=protetto');
 const back=(msg:string):never=>redirect(`/gestionale/utenti/${id}/elimina?msg=${msg}`);
 const admin=createAuthAdmin();if(!admin) return back('config');
 const confirm=String(form.get('conferma_testo')??'');
 if(confirm!=='ELIMINA DEFINITIVAMENTE'||form.get('conferma')!=='on')return back('conferma');
 const hash=String(form.get('hash')??'');
 const {error:startError}=await supabase.rpc('admin_avvia_eliminazione_account',{p_utente:id,p_hash:hash,p_conferma:confirm});
 if(startError){console.error('account purge start',startError.code,startError.message);return back('piano');}
 // The server obtains the file list from the database, never the submitted form.
 const {data,error}=await supabase.rpc('admin_file_eliminazione_pendente',{p_utente:id});
 if(error||!Array.isArray(data))return back('pendente');
 const files=data as FileEntry[];
 if(files.some(f=>f.bucket!=='sesto-documenti'||typeof f.path!=='string'||!f.path))return back('pendente');
 for(let i=0;i<files.length;i+=100){
  const paths=files.slice(i,i+100).map(f=>f.path);
  const {error:removeError}=await admin.storage.from('sesto-documenti').remove(paths);
  if(removeError){console.error('account purge storage',removeError.name);return back('pendente');}
 }
 const {data:clean,error:checkError}=await supabase.rpc('admin_verifica_file_eliminazione',{p_utente:id});
 if(checkError||clean!==true)return back('pendente');
 // Auth hard delete only after application data and Storage have been cleaned.
 const {error:authError}=await admin.auth.admin.deleteUser(id,false);
 if(authError)console.error('account purge auth',authError.code??'auth_error');
 // If Auth was already deleted on an earlier request, this also makes retry idempotent.
 const {error:finishError}=await supabase.rpc('admin_concludi_eliminazione_account',{p_utente:id});
 if(finishError){console.error('account purge finish',finishError.code);return back('pendente');}
 revalidatePath('/gestionale/utenti');revalidatePath('/gestionale/soci');revalidatePath('/gestionale');
 redirect('/gestionale/utenti?msg=eliminato_completamente');
}
