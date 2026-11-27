import type {createClient} from '@/lib/supabase/server';
type DB=Awaited<ReturnType<typeof createClient>>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function duplicateMessage(table:string,id:unknown){
 return {error:'Questo corso esiste già',field:'nome',...(typeof id==='string'&&uuid.test(id)?{href:table==='corsi'?`/gestionale/moduli/corsi?edit=${id}`:`/gestionale/corsi/${id}`}:{})};
}
// UX only: authoritative trigger + unique index remain in place, also for concurrent writes.
export async function findCourseDuplicate(db:DB,table:string,values:Record<string,unknown>){
 const {data,error}=await db.rpc('cerca_corso_esistente',{p_tabella:table,p_dati:values});
 return !error&&typeof data==='string'&&uuid.test(data)?duplicateMessage(table,data):undefined;
}
export async function courseDuplicate(db:DB,table:string,values:Record<string,unknown>,error:{code:string;details:string}){
 if(error.code!=='23505'&&error.code!=='P3419')return;
 if(error.code==='P3419')return duplicateMessage(table,error.details);
 return await findCourseDuplicate(db,table,values)??duplicateMessage(table,null);
}
// For a cancelled edition, remove only its assignments atomically through the
// narrow RPC. Other states use the original FK-aware removal protection.
export async function removeCourseEdition(db:DB,id:string){
 const {data,error}=await db.from('edizioni_corsi').select('stato').eq('id',id).maybeSingle();
 if(error||!data)return {error:error??{code:'P3414'}};
 return data.stato==='annullato'
  ?await db.rpc('elimina_edizione_annullata_vuota',{p_id:id})
  :await db.rpc('rimuovi_record_gestionale',{p_tabella:'edizioni_corsi',p_id:id});
}
