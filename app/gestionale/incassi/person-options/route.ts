import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {structuralQaEnabled,structuralRpc,readPersonOptions,markStructuralRpcUsed} from '@/lib/structural-qa';
import {tutteLePagine} from '@/lib/pagine';
import {UUID_RE} from '@/lib/course-tools';
const headers={'Cache-Control':'private, no-store, max-age=0, must-revalidate'};
export async function GET(request:Request){
 if(!structuralQaEnabled())return NextResponse.json({error:'Non disponibile'},{status:404,headers});
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:'Accedi'},{status:401,headers});
 const {data:staff,error:staffError}=await supabase.rpc('is_staff');
 if(staffError||staff!==true)return NextResponse.json({error:'Accesso non autorizzato'},{status:403,headers});
 const params=new URL(request.url).searchParams;
 const query=(params.get('q')??'').slice(0,120),page=Math.max(1,Math.min(100000,Number.parseInt(params.get('p')??'1',10)||1));
 const selected=params.get('selected')??'';
 const args={p_query:query,p_page:page,p_selected:UUID_RE.test(selected)?selected:null};
 const snapshot=readPersonOptions(await structuralRpc(supabase,'sc_perf_person_options',args));
 if(snapshot){markStructuralRpcUsed('person-options');return NextResponse.json(snapshot,{headers});}
 // Read-only fallback: preserve every matching record and the selected value.
 const {data,error:loadError}=await tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').order('id').range(da,a));
 if(loadError||!data)return NextResponse.json({error:'Elenco soci non disponibile'},{status:503,headers});
 const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('it');
 const all=data.map(p=>({value:p.id,label:p.cognome+' '+p.nome})),term=normalize(query.trim()),filtered=all.filter(o=>normalize(o.label).includes(term));
 return NextResponse.json({count:filtered.length,options:filtered.slice((page-1)*50,page*50),selected:all.find(o=>o.value===selected)??null},{headers});
}
