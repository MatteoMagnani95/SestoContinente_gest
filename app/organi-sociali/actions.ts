'use server';
import {tutteLePagine} from '@/lib/pagine';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireBoard,requireStaff} from '@/lib/security';
import {convertVerbaleDocx} from '@/lib/cda-pdf';
import {percorsoAnteprima,tipiVerbale} from '@/lib/cda-documenti';
const root='/organi-sociali';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const val=(f:FormData,k:string)=>String(f.get(k)??'').trim();
function fail(reason:string):never{return redirect(`${root}?msg=${reason}`);}
export async function salvaComponente(form:FormData){
 const {supabase}=await requireStaff();const persona_id=val(form,'persona_id'),carica=val(form,'carica'),dal=val(form,'dal');
 if(!uuid.test(persona_id)||!['Presidente','Vice Presidente','Segretaria','Tesoriere','Consigliere'].includes(carica)||!/^\d{4}-\d{2}-\d{2}$/.test(dal))return {error:'Controlla componente, carica e data.'};
 const start=new Date(`${dal}T12:00:00Z`);if(Number.isNaN(start.getTime())||start.toISOString().slice(0,10)!==dal)return {error:'Data di inizio mandato non valida.'};
 start.setUTCFullYear(start.getUTCFullYear()+4);const al=start.toISOString().slice(0,10);
 const {error}=await supabase.from('cda_componenti').insert({persona_id,carica,dal,al});
 if(error)return {error:'Componente non registrato: controlla mandato e duplicati.'};revalidatePath(root);redirect(`${root}?msg=componente_ok`);
}
function metadati(form:FormData){
 const data=val(form,'data_consiglio'),oggetto=val(form,'oggetto'),tipo=val(form,'tipo');
 const date=new Date(`${data}T12:00:00Z`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==data||!oggetto||oggetto.length>500||!tipiVerbale.some(t=>t===tipo))return null;
 return {data,oggetto,tipo};
}
async function leggiDocx(doc:unknown){
 if(!(doc instanceof File)||!doc.name.toLowerCase().endsWith('.docx')||doc.size>3_000_000||doc.size<100)return null;
 const buffer=Buffer.from(await doc.arrayBuffer());return buffer.subarray(0,2).toString()==='PK'?buffer:null;
}
async function salvaVersione(supabase:Awaited<ReturnType<typeof requireStaff>>['supabase'],path:string,buffer:Buffer,info:{data:string;oggetto:string}){
 let pdf:Buffer;
 try{pdf=await convertVerbaleDocx(buffer,{...info,bozza:true});}catch{return 'conversione';}
 const bucket=supabase.storage.from('sesto-cda');
 const {error:docErr}=await bucket.upload(path,buffer,{contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',upsert:false});
 if(docErr)return 'storage';
 const {error:pdfErr}=await bucket.upload(percorsoAnteprima(path),pdf,{contentType:'application/pdf',upsert:false});
 if(pdfErr)return 'storage';
 try{
  const finale=await convertVerbaleDocx(buffer,info);
  const {error}=await bucket.upload(path.replace(/[.]docx$/,'.deliberato.pdf'),finale,{contentType:'application/pdf',upsert:false});
  return error?'storage':null;
 }catch{return 'conversione';}
}
export async function caricaBozza(form:FormData){
 const {supabase,user}=await requireStaff();
 const info=metadati(form),buffer=await leggiDocx(form.get('documento'));
 if(!info||!buffer)return {error:'Controlla data, oggetto, tipologia e Word (massimo 3 MB).'};
 const id=crypto.randomUUID(),percorso_docx=`${id}/bozza.docx`;
 const upload=await salvaVersione(supabase,percorso_docx,buffer,info);if(upload)return {error:'Caricamento o conversione non riusciti.',field:'documento'};
 const {error}=await supabase.from('cda_verbali').insert({id,data_consiglio:info.data,oggetto:info.oggetto,tipo:info.tipo,percorso_docx,creato_da:user.id});
 if(error)return {error:'Bozza non registrata. Verifica le autorizzazioni e contatta la segreteria se il problema persiste.'};revalidatePath(root);revalidatePath(`${root}/archivio`);redirect(`${root}/archivio?msg=bozza_ok`);
}
export async function modificaBozza(form:FormData){
 const {supabase}=await requireStaff();const id=val(form,'verbale_id'),previous=val(form,'percorso_docx');
 const info=metadati(form);if(!uuid.test(id)||!info)return {error:'Controlla data, oggetto e tipologia.'};
 const {data:row,error}=await supabase.from('cda_verbali').select('stato,percorso_docx').eq('id',id).single();
 if(error||!row||row.stato!=='bozza'||row.percorso_docx!==previous)return {error:'La bozza è cambiata. Riapri la versione corrente.'};
 const doc=form.get('documento');let buffer:Buffer|null;
 if(doc instanceof File&&doc.size>0){buffer=await leggiDocx(doc);}
 else{const {data,error:load}=await supabase.storage.from('sesto-cda').download(row.percorso_docx);buffer=!load&&data?Buffer.from(await data.arrayBuffer()):null;}
 if(!buffer)return {error:'Seleziona un documento Word valido di massimo 3 MB.',field:'documento'};
 const path=`${id}/revisione-${crypto.randomUUID()}.docx`;
 const upload=await salvaVersione(supabase,path,buffer,info);
 if(upload)return {error:'Non è stato possibile salvare o convertire il documento.',field:'documento'};
 const {error:update}=await supabase.rpc('modifica_bozza_cda',{p_verbale:id,p_docx_precedente:previous,p_data:info.data,p_oggetto:info.oggetto,p_tipo:info.tipo,p_docx:path});
 if(update)return {error:'La bozza è stata modificata. Riapri la versione corrente.'};
 revalidatePath(root);revalidatePath(`${root}/archivio`);redirect(`${root}/archivio?msg=modificata&edit=${id}`);
}
export async function avviaApprovazione(form:FormData){
 const {supabase}=await requireStaff();const id=val(form,'verbale_id');if(!uuid.test(id))return {error:'Verbale non valido.'};
 const ids=form.getAll('adesione_id').map(String);if(ids.some(x=>!uuid.test(x))||new Set(ids).size!==ids.length)return {error:'Adesioni non valide o duplicate.'};
 const {error}=await supabase.rpc('prepara_verbale_cda',{p_verbale:id,p_adesioni:ids});
 if(error)return {error:'Votazione non avviata. Verifica gli aventi diritto alla data della seduta, gli account collegati e le adesioni selezionate.'};revalidatePath(root);redirect(`${root}?msg=avviata`);
}
async function finalizza(supabase:Awaited<ReturnType<typeof requireBoard>>['supabase'],id:string){
 const {data:verbale,error:load}=await supabase.from('cda_verbali').select('id,percorso_docx,data_consiglio,oggetto,stato').eq('id',id).single();
 if(verbale?.stato==='approvato')return;
 if(load||!verbale||verbale.stato!=='in_approvazione')fail('documento');
 const {data:word,error:download}=await supabase.storage.from('sesto-cda').download(verbale.percorso_docx);
 if(download||!word)fail('documento');
 let pdf:Buffer;
 try{pdf=await convertVerbaleDocx(Buffer.from(await word.arrayBuffer()),{data:verbale.data_consiglio,oggetto:verbale.oggetto});}catch{fail('pdf');}
 const percorso=`${id}/definitivo.pdf`;
 const {error:pdfErr}=await supabase.storage.from('sesto-cda').upload(percorso,pdf,{contentType:'application/pdf',upsert:false});
 if(pdfErr&&!/already exists|duplicate/i.test(pdfErr.message))fail('pdf');
 const {error:final}=await supabase.rpc('finalizza_verbale_cda',{p_verbale:id,p_percorso_pdf:percorso});
 if(final){const {data}=await supabase.from('cda_verbali').select('stato').eq('id',id).maybeSingle();if(data?.stato!=='approvato')fail('finalizzazione');}
}
export async function approvaVerbale(form:FormData){
 const {supabase}=await requireBoard();const id=val(form,'verbale_id');if(!uuid.test(id))fail('dati');
 const {data:ready,error}=await supabase.rpc('approva_versione_cda',{p_verbale:id,p_docx:val(form,'versione')});
 if(error)fail('lettura');
 if(ready)await finalizza(supabase,id);
 revalidatePath(root);revalidatePath(`${root}/archivio`);redirect(`${root}?msg=${ready?'approvato':'voto_ok'}`);
}
export async function sostituisciVerbale(form:FormData){
 const {supabase}=await requireStaff(),id=val(form,'verbale_id');
 if(!uuid.test(id))fail('dati');
 const {data:v}=await supabase.from('cda_verbali').select('percorso_docx,data_consiglio,oggetto').eq('id',id).single();
 const buffer=await leggiDocx(form.get('documento'));
 if(!v||!buffer||v.percorso_docx!==val(form,'versione'))return {field:'documento',error:'Seleziona il nuovo documento e verifica la versione.'};
 const nuovo=crypto.randomUUID();const path=nuovo+'/bozza.docx';
 const errore=await salvaVersione(supabase,path,buffer,{data:v.data_consiglio,oggetto:v.oggetto});
 if(errore)return {field:'documento',error:'Caricamento del documento non riuscito.'};
 const {error}=await supabase.rpc('sostituisci_verbale',{p_vecchio:id,p_docx:v.percorso_docx,p_nuovo:nuovo});
 if(error)return {error:'Revisione non salvata. Controlla il quorum e che il verbale sia ancora corrente.'};
 revalidatePath(root);revalidatePath(root+'/archivio');redirect(root+'?msg=avviata');
}
export async function riprovaFinalizzazione(form:FormData){
 const {supabase}=await requireStaff();const id=val(form,'verbale_id');if(!uuid.test(id))fail('dati');
 const {data,error}=await tutteLePagine((da,a)=>supabase.rpc('cda_progressi').order('verbale_id').range(da,a));
 const row=(Array.isArray(data)?data:[]).find((p:{verbale_id:string})=>p.verbale_id===id) as {approvati:number;totali:number}|undefined;
 if(error||!row||Number(row.totali)<=0||Number(row.approvati)!==Number(row.totali))fail('quorum');
 await finalizza(supabase,id);revalidatePath(root);revalidatePath(`${root}/archivio`);redirect(`${root}/archivio?msg=approvato`);
}
