'use server';
import {archiveUploadLimit,checkDocumentDestination} from '@/lib/document-ui';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';
import {randomUUID} from 'node:crypto';
const mimeToExt:Record<string,string>={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
function realMime(file:Buffer,mime:string){
 if(mime==='application/pdf')return file.subarray(0,5).toString()==='%PDF-';
 if(mime==='image/jpeg')return file[0]===0xff&&file[1]===0xd8&&file[2]===0xff;
 if(mime==='image/png')return file.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/webp')return file.subarray(0,4).toString()==='RIFF'&&file.subarray(8,12).toString()==='WEBP';
 return false;
}
export async function uploadDocument(form:FormData){
 const {supabase,user}=await requireUser();
 const {data:roles}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
 const isStaff=roles?.some(x=>['amministratore','segreteria'].includes(x.ruolo))??false;
 const isAdmin=roles?.some(x=>x.ruolo==='amministratore')??false;
 const file=form.get('file');
 if(!(file instanceof File)||file.size<=0||file.size>archiveUploadLimit||!mimeToExt[file.type])return {error:'Seleziona un file PDF o immagine valido, massimo 3 MB per questo modulo.',field:'file'};
 const buffer=Buffer.from(await file.arrayBuffer());
 if(!realMime(buffer,file.type))return {error:'Seleziona un file PDF o immagine valido, massimo 10 MB.',field:'file'};
 const nome=String(form.get('nome')||file.name).trim().slice(0,150);
 const categoria=String(form.get('categoria')||'Altro').trim().slice(0,80);
 const ambito=isStaff?String(form.get('ambito')||'associazione'):'personale';
 const visibilita=isStaff?String(form.get('visibilita')||'staff'):'proprietario';
 const utente=isStaff?String(form.get('utente_id')||'').trim():user.id;
 const persona=isStaff?String(form.get('persona_id')||'').trim():'';
 const edizione=isStaff?String(form.get('edizione_id')||'').trim():'';
 const versione=isStaff?String(form.get('programma_versione_id')||'').trim():'';
 const conservazione=String(form.get('scadenza_conservazione')||'').trim();
 if(!checkDocumentDestination({ambito,visibilita,utente,persona,edizione,versione,isAdmin}))return {error:'Controlla destinazione, visibilità e collegamenti. Per documenti sanitari usa la procedura certificati.'};
 if(!nome||!categoria||!['associazione','personale','didattica','amministrativo'].includes(ambito)||
 !['staff','proprietario','soci','istruttori'].includes(visibilita)||
 (ambito==='personale'&&(!utente||!['staff','proprietario'].includes(visibilita)))||
 (utente&&!uuid.test(utente))||(persona&&!uuid.test(persona))||(edizione&&!uuid.test(edizione))||(versione&&!uuid.test(versione))||
 (conservazione&&!/^\d{4}-\d{2}-\d{2}$/.test(conservazione)))return {error:'Controlla ambito, visibilità e collegamenti del documento.'};
 const path=`${user.id}/${randomUUID()}.${mimeToExt[file.type]}`;
 const {data,error}=await supabase.from('documenti').insert({nome,categoria,ambito,visibilita,
  utente_id:utente||null,persona_id:persona||null,edizione_id:edizione||null,programma_versione_id:versione||null,
  percorso_storage:path,mime:file.type,dimensione_bytes:file.size,caricato_da:user.id,scadenza_conservazione:conservazione||null}).select('id').single();
 if(error||!data)return {error:'Caricamento non completato. Verifica il file e i permessi.'};
 const uploaded=await supabase.storage.from('sesto-documenti').upload(path,buffer,{contentType:file.type,upsert:false});
 if(uploaded.error){await supabase.rpc('annulla_upload_documento',{p_id:data.id});return {error:'Caricamento non completato. Verifica il file e i permessi.'};}
 revalidatePath('/documenti');redirect('/documenti?msg=ok');
}
export async function deleteDocument(form:FormData){
 const {supabase,user}=await requireUser();
 const {data:role}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!role)redirect('/documenti?msg=permessi');
 if(form.get('conferma')!=='on')redirect('/documenti?msg=conferma');
 const id=String(form.get('id')??'');
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect('/documenti?msg=errore');
 const [{data:doc,error:docError},{count:linked,error:linkError}]=await Promise.all([
  supabase.from('documenti').select('percorso_storage').eq('id',id).maybeSingle(),
  supabase.from('certificati_medici').select('*',{head:true,count:'exact'}).eq('documento_id',id)
 ]);
 if(docError||linkError||!doc||linked)redirect('/documenti?msg=collegato');
 const {data:deleted,error}=await supabase.from('documenti').delete().eq('id',id).select('id').maybeSingle();
 if(error||!deleted)redirect('/documenti?msg=collegato');
 const {error:storageError}=await supabase.storage.from('sesto-documenti').remove([doc.percorso_storage]);
 if(storageError){revalidatePath('/documenti');redirect('/documenti?msg=storage_residuo');}
 revalidatePath('/documenti');redirect('/documenti?msg=eliminato');
}

export async function editDocumentMetadata(form:FormData){
 const {supabase,user}=await requireUser();
 const {data:role}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!role)redirect('/documenti?msg=permessi');
 const id=String(form.get('id')??''),nome=String(form.get('nome')??'').trim(),categoria=String(form.get('categoria')??'').trim();
 if(!uuid.test(id)||!nome||nome.length>150||!categoria||categoria.length>80)return {error:'Controlla nome e categoria del documento.'};
 const {data,error}=await supabase.from('documenti').update({nome,categoria}).eq('id',id).select('id').maybeSingle();
 if(error||!data)return {error:'Modifiche non salvate. Verifica i dati e le autorizzazioni.'};
 revalidatePath('/documenti');revalidatePath('/area-soci');redirect('/documenti?msg=modificato');
}
