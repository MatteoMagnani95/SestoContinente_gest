'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import ExcelJS from 'exceljs';
import {parse as parseCsv} from 'csv-parse/sync';
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
 let input:Record<string,unknown>[]=[];
 try{
  if(file.name.toLowerCase().endsWith('.csv')){
   input=parseCsv(Buffer.from(await file.arrayBuffer()).toString('utf8').replace(/^\uFEFF/,''),{columns:true,skip_empty_lines:true,trim:true,bom:true}) as Record<string,unknown>[];
  }else{
   const book=new ExcelJS.Workbook();
   // ExcelJS e @types/node possono utilizzare dichiarazioni Buffer non allineate.
   // Il valore è un Buffer Node.js valido; adeguiamo solo il tipo atteso da load().
   const workbookBytes=Buffer.from(await file.arrayBuffer());
   await book.xlsx.load(workbookBytes as unknown as Parameters<typeof book.xlsx.load>[0]);
   const sheet=book.worksheets[0];if(!sheet)throw Error('No sheet');
   const header=sheet.getRow(1).values as (string|undefined)[];
   for(let i=2;i<=sheet.rowCount;i++){
    const row=sheet.getRow(i),obj:Record<string,string>={};let filled=false;
    for(let c=1;c<=sheet.columnCount;c++){
     const name=String(header[c]??'').trim();const val=row.getCell(c).text.trim();
     if(name){obj[name]=val;if(val)filled=true;}
    }
    if(filled)input.push(obj);
   }
  }
 }catch{q('formato');}
 if(input.length<1||input.length>1000)q('righe');
 const needed=headings(tipo);if(!needed.every(h=>Object.hasOwn(input[0],h)))q('intestazioni');
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
 for(let i=0;i<rows.length;i+=100){const {error:e}=await supabase.from('importazioni_righe').insert(rows.slice(i,i+100));if(e)q('database');}
 revalidatePath(where);redirect(`${where}?batch=${batch.id}`);
}
export async function commitImport(form:FormData){
 const {supabase}=await requireStaff();const batch=text(form.get('batch'));
 if(form.get('conferma')!=='on'||!/^[a-f0-9-]{36}$/i.test(batch))q('batch');
 const {data,error}=await supabase.rpc('conferma_importazione',{p_batch:batch});
 if(error)redirect(`${where}?batch=${batch}&msg=quarantena`);
 revalidatePath(where);redirect(`${where}?batch=${batch}&msg=importato&n=${data}`);
}
