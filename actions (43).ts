'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireBoard,requireStaff} from '@/lib/security';
import {convertVerbaleDocx} from '@/lib/cda-pdf';
const root='/organi-sociali';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const val=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const fail=(reason:string)=>redirect(`${root}?msg=${reason}`);
export async function salvaComponente(form:FormData){
 const {supabase}=await requireStaff();const persona_id=val(form,'persona_id'),carica=val(form,'carica'),dal=val(form,'dal');
 if(!uuid.test(persona_id)||!['Presidente','Vice Presidente','Segretaria','Tesoriere','Consigliere'].includes(carica)||!/\d{4}-\d{2}-\d{2}/.test(dal))fail('dati');
 const start=new Date(`${dal}T12:00:00Z`);if(Number.isNaN(start.getTime()))fail('dati');
 start.setUTCFullYear(start.getUTCFullYear()+4);const al=start.toISOString().slice(0,10);
 const {error}=await supabase.from('cda_componenti').insert({persona_id,carica,dal,al});
 if(error)fail('componente');revalidatePath(root);redirect(`${root}?msg=componente_ok`);
}
export async function caricaBozza(form:FormData){
 const {supabase,user}=await requireStaff();
 const doc=form.get('documento');const data=val(form,'data_consiglio'),oggetto=val(form,'oggetto').slice(0,500),tipo=val(form,'tipo');
 if(!(doc instanceof File)||!doc.name.toLowerCase().endsWith('.docx')||doc.size>3_000_000||doc.size<100||
 !/^\d{4}-\d{2}-\d{2}$/.test(data)||!oggetto||!['Approvazione Adesioni Soci','Gestione Ordinaria / Altro','Misto'].includes(tipo))fail('documento');
 const buffer=Buffer.from(await doc.arrayBuffer());if(buffer.subarray(0,2).toString()!=='PK')fail('documento');
 // UUID come path evita collisioni e nomi del file potenzialmente pericolosi.
 const id=crypto.randomUUID();const percorso_docx=`${id}/bozza.docx`;
 const {error:upload}=await supabase.storage.from('sesto-cda').upload(percorso_docx,buffer,{contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',upsert:false});
 if(upload)fail('storage');
 const {error}=await supabase.from('cda_verbali').insert({id,data_consiglio:data,oggetto,tipo,percorso_docx,creato_da:user.id});
 if(error)fail('verbale');revalidatePath(root);redirect(`${root}?msg=bozza_ok`);
}
export async function avviaApprovazione(form:FormData){
 const {supabase}=await requireStaff();const id=val(form,'verbale_id');if(!uuid.test(id))fail('dati');
 const ids=form.getAll('adesione_id').map(String);if(ids.some(x=>!uuid.test(x)))fail('dati');
 const {error}=await supabase.rpc('prepara_verbale_cda',{p_verbale:id,p_adesioni:ids});
 if(error)fail('quorum');revalidatePath(root);redirect(`${root}?msg=avviata`);
}
export async function approvaVerbale(form:FormData){
 const {supabase}=await requireBoard();const id=val(form,'verbale_id');if(!uuid.test(id))fail('dati');
 const {data:ready,error}=await supabase.rpc('vota_verbale_cda',{p_verbale:id});
 if(error)fail('voto');
 if(ready){
  const {data:verbale,error:load}=await supabase.from('cda_verbali').select('id,percorso_docx,data_consiglio,oggetto').eq('id',id).single();
  if(load||!verbale)fail('documento');
  const {data:word,error:download}=await supabase.storage.from('sesto-cda').download(verbale.percorso_docx);
  if(download||!word)fail('documento');
  try{
   const pdf=await convertVerbaleDocx(Buffer.from(await word.arrayBuffer()),{data:verbale.data_consiglio,oggetto:verbale.oggetto});
   const percorso=`${id}/definitivo.pdf`;
   const {error:pdfErr}=await supabase.storage.from('sesto-cda').upload(percorso,pdf,{contentType:'application/pdf',upsert:false});
   if(pdfErr&&!pdfErr.message.toLowerCase().includes('already exists'))fail('pdf');
   const {error:final}=await supabase.rpc('finalizza_verbale_cda',{p_verbale:id,p_percorso_pdf:percorso});
   if(final)fail('finalizzazione');
  }catch{fail('pdf');}
 }
 revalidatePath(root);redirect(`${root}?msg=${ready?'approvato':'voto_ok'}`);
}
