'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {parseHistoricalFile} from '@/lib/import-file';
import {requireStaff} from '@/lib/security';
import {headings,normalizzaRiga,erroriRiga,IMPORT_EDITION_UUID,type TipoImportazione} from '@/lib/importazione';
const where='/gestionale/importazione';
function text(v:FormDataEntryValue|null){return typeof v==='string'?v.trim():'';}
function q(msg:string):never{return redirect(`${where}?msg=${encodeURIComponent(msg)}`);}
export async function stageImport(form:FormData){
 const {supabase}=await requireStaff();
 const tipo=text(form.get('tipo')) as TipoImportazione;
 if(!['soci','corsi'].includes(tipo))q('tipo');
 const file=form.get('file');if(!(file instanceof File)||file.size<2||file.size>2_000_000)q('file');
 if(!/\.(csv|xlsx)$/i.test(file.name))q('file');
 const parsed=await parseHistoricalFile(Buffer.from(await file.arrayBuffer()),file.name,headings(tipo));
 if(parsed.error)q(parsed.error);
 const input=parsed.rows;
 const mapped=input.map(row=>normalizzaRiga(row,tipo));
 const cfSet=[...new Set(mapped.map(r=>r.codice_fiscale).filter(Boolean))];
 const {data:existing,error:lookupError}=await supabase.rpc('cf_storici_esistenti',{p_cf:cfSet});
 if(lookupError)q('database');
 const have=new Set((existing??[]).map((x:{codice_fiscale:string})=>x.codice_fiscale));
 const editions=tipo==='corsi'?[...new Set(mapped.map(x=>x.edizione_id).filter(x=>IMPORT_EDITION_UUID.test(x)))]:[];
 const okEd=new Set<string>();
 // Keep PostgREST GET URLs bounded even for files containing 1000 distinct editions.
 for(let i=0;i<editions.length;i+=100){
  const {data,error}=await supabase.from('edizioni_corsi').select('id').in('id',editions.slice(i,i+100));
  if(error)q('database');
  for(const row of data??[])okEd.add(row.id);
 }
 const seen=new Set<string>();
 const rows=mapped.map(r=>{
  const errors=erroriRiga(r,tipo);
  if(seen.has(r.codice_fiscale+(tipo==='corsi'?`/${r.edizione_id}`:'')))errors.push('Duplicato all’interno del file');
  seen.add(r.codice_fiscale+(tipo==='corsi'?`/${r.edizione_id}`:''));
  if(tipo==='soci'&&have.has(r.codice_fiscale))errors.push('CF già presente in anagrafica');
  if(tipo==='corsi'&&!have.has(r.codice_fiscale))errors.push('CF allievo non presente in anagrafica');
  if(tipo==='corsi'&&!okEd.has(r.edizione_id))errors.push('Edizione corso non trovata');
  if(tipo==='corsi'&&r.brevetto)errors.push('Brevetto storico: verificare il rilascio originale con la segreteria prima della registrazione.');
  return {dati:r,errori:errors};
 });
 // The batch and all rows are created in the same database transaction.
 const {data:batch,error}=await supabase.rpc('crea_anteprima_importazione',{p_tipo:tipo,p_base_documentale:tipo==='soci'&&form.get('base_documentale')==='on',p_righe:rows});
 if(error||typeof batch!=='string')q('database');
 revalidatePath(where);redirect(`${where}?batch=${batch}`);
}
export async function commitImport(form:FormData){
 const {supabase}=await requireStaff();const batch=text(form.get('batch'));
 if(form.get('conferma')!=='on'||!/^[a-f0-9-]{36}$/i.test(batch))q('batch');
 await supabase.rpc('conferma_importazione',{p_batch:batch});
 // The RPC can commit even if the response is lost, or reject a repeated
 // confirmation of a completed batch. Verify the persisted outcome under RLS.
 const {data:record,error:readError}=await supabase.from('importazioni_batch').select('stato').eq('id',batch).maybeSingle();
 if(readError||!record)redirect(`${where}?batch=${batch}&msg=esito`);
 if(record.stato!=='importato')redirect(`${where}?batch=${batch}&msg=quarantena`);
 const [total,remaining]=await Promise.all([
  supabase.from('importazioni_righe').select('id',{head:true,count:'exact'}).eq('batch_id',batch),
  supabase.from('importazioni_righe').select('id',{head:true,count:'exact'}).eq('batch_id',batch).is('importato_id',null)
 ]);
 if(total.error||remaining.error||!total.count||remaining.count!==0)redirect(`${where}?batch=${batch}&msg=esito`);
 revalidatePath(where);redirect(`${where}?batch=${batch}&msg=importato`);
}
