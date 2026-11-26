import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Module} from '@/lib/modules';
const escapeCSV=(input:unknown):string=>{
 const raw=String(input??'');
 // Le celle che iniziano con formule sono neutralizzate per Excel/Calc.
 // Neutralizza anche formule precedute da spazi o caratteri di controllo.
 const safe=/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(raw)?`'${raw}`:raw;
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
 // Paginazione ordinata, senza taglio silenzioso a 5.000 righe.
 // Il limite esplicito evita timeout/memoria e segnala quando serve un export dedicato.
 const PAGE_SIZE=500;const MAX_ROWS=50000;
 const lines:string[]=[columns.map(escapeCSV).join(';')];
 for(let offset=0;;offset+=PAGE_SIZE){
  const peopleSorted=['adesioni','iscrizioni_corsi','assegnazioni_istruttori','qualifiche_istruttori','brevetti_allievi','certificati_medici','presenze','assegnazioni_attrezzature','quote_associative','tesseramenti','addebiti_corsi','pagamenti'].includes(module.table);
  let query=supabase.from(modulo==='certificati'?'stato_certificati':peopleSorted?`gest_elenco_${module.table}`:module.table).select(columns.join(','));
  if(peopleSorted||module.table==='persone')query=query.order(peopleSorted?'sort_cognome':'cognome',{nullsFirst:false}).order(peopleSorted?'sort_nome':'nome');
  const {data,error}=await query.order('id',{ascending:true}).range(offset,offset+PAGE_SIZE-1);
  if(error)return new Response('Errore lettura',{status:500});
  if(offset+(data?.length??0)>MAX_ROWS)return new Response('Esportazione troppo grande: supera 50.000 righe. Richiedere un export dedicato.',{status:413});
  for(const rawRow of data??[]){
   const row:unknown=rawRow;
   const record:Record<string,unknown>=row!==null && typeof row==='object' && !Array.isArray(row)
    ? row as Record<string,unknown> : {};
   lines.push(columns.map(k=>escapeCSV(record[k])).join(';'));
  }
  if((data?.length??0)<PAGE_SIZE)break;
 }
 const csv='\uFEFF'+lines.join('\r\n');
 return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="sesto-${modulo}.csv"`,'Cache-Control':'no-store'}});
}
