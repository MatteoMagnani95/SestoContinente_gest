'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {parseHistoricalFile} from '@/lib/import-file';
import {requireStaff} from '@/lib/security';
import {headings,normalizzaRiga,erroriRiga,type TipoImportazione} from '@/lib/importazione';
const where='/gestionale/importazione';
function text(v:FormDataEntryValue|null){return typeof v==='string'?v.trim():'';}
function q(msg:string):never{return redirect(`${where}?msg=${encodeURIComponent(msg)}`);}
export async function stageImport(form:FormData){
 const {supabase,user}=await requireStaff();
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
 const editions=tipo==='corsi'?[...new Set(mapped.map(x=>x.edizione_id).filter(Boolean))]:[];
 const {data:editionData,error:edErr}=tipo==='corsi'?await supabase.from('edizioni_corsi').select('id').in('id',editions.filter(x=>/^[a-f0-9-]{36}$/i.test(x))):{data:[],error:null};
 if(edErr)q('database');const okEd=new Set((editionData??[]).map((x:{id:string})=>x.id));
 const {data:batch,error}=await supabase.from('importazioni_batch').insert({tipo,creato_da:user.id,base_documentale_verificata:tipo==='soci'&&form.get('base_documentale')==='on'}).select('id').single();
 if(error||!batch)q('database');
 const seen=new Set<string>();
 const rows=mapped.map((r,i)=>{
  const errors=erroriRiga(r,tipo);
  if(seen.has(r.codice_fiscale+(tipo==='corsi'?`/${r.edizione_id}`:'')))errors.push('Duplicato all’interno del file');
  seen.add(r.codice_fiscale+(tipo==='corsi'?`/${r.edizione_id}`:''));
  if(tipo==='soci'&&have.has(r.codice_fiscale))errors.push('CF già presente in anagrafica');
  if(tipo==='corsi'&&!have.has(r.codice_fiscale))errors.push('CF allievo non presente in anagrafica');
  if(tipo==='corsi'&&!okEd.has(r.edizione_id))errors.push('Edizione corso non trovata');
  return {batch_id:batch.id,numero:i+2,dati:r,errori:errors};
 });
 // A single PostgREST INSERT is one database transaction. A failed
 // request cannot leave a confirmable prefix of the imported file.
 const {error:rowsError}=await supabase.from('importazioni_righe').insert(rows);
 if(rowsError){
  const {count,error:checkError}=await supabase.from('importazioni_righe').select('id',{head:true,count:'exact'}).eq('batch_id',batch.id);
  if(checkError||count!==rows.length)q('database');
 }
 revalidatePath(where);redirect(`${where}?batch=${batch.id}`);
}
export async function commitImport(form:FormData){
 const {supabase}=await requireStaff();const batch=text(form.get('batch'));
 if(form.get('conferma')!=='on'||!/^[a-f0-9-]{36}$/i.test(batch))q('batch');
 const {data,error}=await supabase.rpc('conferma_importazione',{p_batch:batch});
 if(error)redirect(`${where}?batch=${batch}&msg=quarantena`);
 revalidatePath(where);redirect(`${where}?batch=${batch}&msg=importato&n=${data}`);
}
