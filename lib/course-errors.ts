import type {createClient} from '@/lib/supabase/server';
export async function courseDuplicate(db:Awaited<ReturnType<typeof createClient>>,table:string,values:Record<string,unknown>,error:{code:string;details:string}){
 if(error.code!=='23505'&&error.code!=='P3419')return;
 const id=error.code==='P3419'?error.details:(await db.rpc('cerca_corso_esistente',{p_tabella:table,p_dati:values})).data;
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return;
 return {error:'Questo corso esiste già',field:'nome',href:table==='corsi'?`/gestionale/moduli/corsi?edit=${id}`:`/gestionale/corsi/${id}`};
}
