import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Module} from '@/lib/modules';
const escapeCSV=(input:unknown):string=>{
 const raw=String(input??'');
 // Le celle che iniziano con formule sono neutralizzate per Excel/Calc.
 const safe=/^[=+\-@\t\r]/.test(raw)?`'${raw}`:raw;
 return `"${safe.replaceAll('"','""')}"`;
};
export async function GET(_request:Request,{params}:{params:Promise<{modulo:string}>}){
 const {modulo}=await params;
 if(!isModuleKey(modulo))return new Response('Modulo inesistente',{status:404});
 const module:Module=modules[modulo];
 const {supabase,user}=await requireStaff();
 if(module.adminOnly){
  const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  if(!data)return new Response('Non autorizzato',{status:403});
 }
 const columns=['id',...module.fields.map(x=>x.name)];
 const {data,error}=await supabase.from(module.table).select(columns.join(',')).limit(5000);
 if(error)return new Response('Errore lettura',{status:500});
 const csv='\uFEFF'+[columns.map(escapeCSV).join(';'),...(data??[]).map((row:unknown)=>{
  const record:Record<string,unknown>=row!==null && typeof row==='object' && !Array.isArray(row)
   ? row as Record<string,unknown> : {};
  return columns.map(k=>escapeCSV(record[k])).join(';');
 })].join('\r\n');
 return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="sesto-${modulo}.csv"`,'Cache-Control':'no-store'}});
}
