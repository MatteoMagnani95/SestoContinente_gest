import ExcelJS from 'exceljs';
import {parse as parseCsv} from 'csv-parse/sync';
export type ImportFileResult={rows:Record<string,unknown>[];error:null}|{rows:null;error:'formato'|'righe'|'intestazioni'};

class HeaderError extends Error{}
function validatedHeaders(raw:unknown[],needed:string[]){
 const columns=raw.map(x=>String(x??'').trim());
 const seen=new Set<string>();
 for(const name of columns){
  if(!needed.includes(name))continue;
  if(seen.has(name))throw new HeaderError('Intestazione duplicata');
  seen.add(name);
 }
 if(needed.some(name=>!seen.has(name)))throw new HeaderError('Intestazione mancante');
 // Unknown columns are ignored, never used as object property names.
 return columns.map(name=>needed.includes(name)?name:false);
}

export async function parseHistoricalFile(bytes:Buffer,filename:string,needed:string[]):Promise<ImportFileResult>{
 if(bytes.length<2||bytes.length>2_000_000)return {rows:null,error:'formato'};
 let rows:Record<string,unknown>[]=[];
 try{
  if(filename.toLowerCase().endsWith('.csv')){
   rows=parseCsv(bytes,{columns:(header:string[])=>validatedHeaders(header,needed),skip_empty_lines:true,trim:true,bom:true,max_record_size:2_000_000,to:1001}) as Record<string,unknown>[];
  }else if(filename.toLowerCase().endsWith('.xlsx')){
   const book=new ExcelJS.Workbook();
   await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);
   const sheet=book.worksheets[0];if(!sheet)return {rows:null,error:'formato'};
   // Do not iterate over millions of empty/sparse rows or unrelated columns.
   if(sheet.rowCount>1001)return {rows:null,error:'righe'};
   if(sheet.columnCount>256)return {rows:null,error:'intestazioni'};
   const header=Array.from({length:sheet.columnCount},(_,i)=>sheet.getRow(1).getCell(i+1).text);
   const columns=validatedHeaders(header,needed);
   for(let i=2;i<=sheet.rowCount;i++){
    const row=sheet.getRow(i),obj:Record<string,string>=Object.create(null);let filled=false;
    for(let c=0;c<columns.length;c++){
     const name=columns[c];if(!name)continue;
     const val=row.getCell(c+1).text.trim();obj[name]=val;if(val)filled=true;
    }
    if(filled)rows.push(obj);
   }
  }else return {rows:null,error:'formato'};
 }catch(e){return {rows:null,error:e instanceof HeaderError?'intestazioni':'formato'};}
 if(rows.length<1||rows.length>1000)return {rows:null,error:'righe'};
 return {rows,error:null};
}
