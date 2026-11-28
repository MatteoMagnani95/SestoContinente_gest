'use server';
import {revalidatePath} from 'next/cache';
import {randomUUID} from 'node:crypto';
import {createAuthAdmin} from '@/lib/supabase/admin';
import {requireUser} from '@/lib/security';
import {UUID_RE,isCalendarDate,todayRome} from '@/lib/course-tools';
import {certificatoAmmesso,tipoCertificato} from '@/lib/file-certificato';

async function contesto(persona:string){
 const {supabase,user}=await requireUser();
 if(!UUID_RE.test(persona))return null;
 const [{data:owner},{data:staff}]=await Promise.all([supabase.rpc('owns_person',{p_persona:persona}),supabase.rpc('is_staff')]);
 const storage=createAuthAdmin()?.storage.from('sesto-documenti');
 return storage&&(owner===true||staff===true)?{supabase,user,storage}:null;
}
export async function preparaCaricamento(persona:string,nome:string,mime:string,size:number){
 const ctx=await contesto(persona);
 const ext=tipoCertificato(nome,mime,size);if(!ctx||!ext)return null;
 const path=`${ctx.user.id}/transito/${randomUUID()}.${ext}`;
 const {data,error}=await ctx.storage.createSignedUploadUrl(path,{upsert:false});
 return error||!data?null:{path,token:data.token};
}
export async function caricaCertificato(form:FormData){
 const persona=String(form.get('persona_id')??''),ctx=await contesto(persona);
 if(!ctx)return {error:'Archivio non disponibile o persona non autorizzata.'};
 const {supabase,user,storage}=ctx;
 const dal=String(form.get('rilasciato_il')??''),al=String(form.get('scade_il')??'');
 if(!isCalendarDate(dal)||!isCalendarDate(al)||al<dal||dal>todayRome())return {error:'Controlla data di rilascio e scadenza.'};
 let file=form.get('file');
 const staged=String(form.get('transito')??'');
 if(staged){
  const parts=staged.split('/');
  if(parts.length!==3||parts[0]!==user.id||parts[1]!=='transito'||!/^[a-f0-9-]{36}\.(jpg|pdf)$/.test(parts[2]))return {error:'File non disponibile.'};
  const {data}=await storage.download(staged);if(!data)return {error:'File non disponibile.'};
  file=new File([data],parts[2],{type:data.type});
 }
 if(!(file instanceof File))return {error:'Seleziona il certificato.'};
 const ext=tipoCertificato(file.name,file.type,file.size);
 if(!ext)return {error:'Carica un JPG/JPEG o un PDF di massimo 10 MB.'};
 const bytes=Buffer.from(await file.arrayBuffer());if(!certificatoAmmesso(bytes,ext))return {error:'Il contenuto del file non corrisponde al formato selezionato.'};
 const path=`${user.id}/certificati/${randomUUID()}.${ext}`;
 const {data:document,error}=await supabase.from('documenti').insert({
  nome:'Certificato medico '+dal,categoria:'Certificato medico',ambito:'personale',visibilita:'proprietario',
  utente_id:user.id,persona_id:persona,percorso_storage:path,mime:file.type,dimensione_bytes:file.size,caricato_da:user.id
 }).select('id').single();
 if(error||!document)return {error:'Impossibile registrare il documento.'};
 const upload=await storage.upload(path,bytes,{contentType:file.type,upsert:false});
 if(upload.error){
  // L'errore del provider può seguire un upload riuscito. Non rimuovere
  // un file o il relativo metadata se non è certa l'assenza dell'oggetto.
  const stored=await storage.download(path);
  if(stored.error||!stored.data)return {error:'Caricamento da verificare. Controlla l’archivio o contatta la segreteria prima di ripetere l’invio.'};
  const actual=Buffer.from(await stored.data.arrayBuffer());
  if(!actual.equals(bytes))return {error:'File non verificabile. Contatta la segreteria prima di ripetere l’invio.'};
 }
 const result=await supabase.rpc('registra_certificato_personale',{p_persona:persona,p_documento:document.id,p_rilasciato:dal,p_scade:al});
 if(result.error){
  // Una risposta interrotta può seguire un commit riuscito. Prima di compensare
  // controlliamo la registrazione con la stessa sessione che ha inviato il file.
  const linked=await supabase.from('certificati_medici').select('id').eq('documento_id',document.id).eq('persona_id',persona).maybeSingle();
  if(!linked.data){
   if(linked.error||!/^([0-9]{2}|P0)[0-9A-Z]{3}$/.test(result.error.code??'')){
    return {error:'Invio da verificare. Controlla il certificato nell’area personale prima di ripetere il caricamento.'};
   }
   const cleanup=await storage.remove([path]);
   if(!cleanup.error)await supabase.rpc('annulla_upload_documento',{p_id:document.id});
   return {error:'Certificato non salvato. Controlla le date e riprova.'};
  }
 }
 if(staged){await storage.remove([staged]).catch(()=>undefined);}
 revalidatePath('/gestionale/moduli/certificati');revalidatePath('/area-personale');return {error:null};
}
