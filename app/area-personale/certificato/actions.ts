'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {randomUUID} from 'node:crypto';
import {requireUser} from '@/lib/security';
const mimeToExt:Record<string,string>={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
const uuid=/^[0-9a-f-]{36}$/i;
function checkSignature(buffer:Buffer,mime:string){
 if(mime==='application/pdf')return buffer.subarray(0,5).toString()==='%PDF-';
 if(mime==='image/jpeg')return buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
 if(mime==='image/png')return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 return false;
}
export async function caricaCertificato(form:FormData){
 const {supabase,user}=await requireUser();const base='/area-personale/certificato';
 const persona_id=String(form.get('persona_id')??'');
 const rilasciato=String(form.get('rilasciato_il')??'');const scade=String(form.get('scade_il')??'');
 const file=form.get('file');
 if(!uuid.test(persona_id)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(rilasciato)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(scade)||
  scade<rilasciato||rilasciato>new Date().toISOString().slice(0,10)||
  !(file instanceof File)||!mimeToExt[file.type]||file.size<5||file.size>10*1024*1024)redirect(`${base}?msg=dati`);
 const {data:link}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id).eq('persona_id',persona_id).maybeSingle();
 if(!link)redirect(`${base}?msg=permessi`);
 const buffer=Buffer.from(await file.arrayBuffer());if(!checkSignature(buffer,file.type))redirect(`${base}?msg=dati`);
 const path=`${user.id}/${randomUUID()}.${mimeToExt[file.type]}`;
 const {data:document,error}=await supabase.from('documenti').insert({
   nome:`Certificato medico ${rilasciato}`,categoria:'Certificato medico',ambito:'personale',visibilita:'proprietario',
   utente_id:user.id,persona_id,percorso_storage:path,mime:file.type,dimensione_bytes:file.size,caricato_da:user.id
 }).select('id').single();
 if(error||!document)redirect(`${base}?msg=errore`);
 const uploaded=await supabase.storage.from('sesto-documenti').upload(path,buffer,{contentType:file.type,upsert:false});
 if(uploaded.error){await supabase.rpc('annulla_upload_documento',{p_id:document.id});redirect(`${base}?msg=errore`);}
 const {error:registration}=await supabase.rpc('registra_certificato_personale',{
  p_persona:persona_id,p_documento:document.id,p_rilasciato:rilasciato,p_scade:scade
 });
 if(registration){await supabase.storage.from('sesto-documenti').remove([path]);await supabase.rpc('annulla_upload_documento',{p_id:document.id});redirect(`${base}?msg=errore`);}
 revalidatePath('/area-personale');redirect(`${base}?msg=ok`);
}
