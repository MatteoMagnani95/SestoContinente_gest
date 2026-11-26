'use server';
import {createClient} from '@/lib/supabase/server';
import {SEARCH_LIMIT,searchWords,searchOr,resultLink,type SearchResponse,type SearchResult,type SearchCategory} from '@/lib/global-search';

/** Read-only, bounded searches in the current user's session. No privileged client. */
export async function globalSearch(raw:unknown):Promise<SearchResponse>{
 const words=searchWords(raw);
 const empty={results:[],partial:false};
 if(!words.length)return empty;
 try{
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return {...empty,denied:true};
  const {data:enabled,error:enabledError}=await supabase.rpc('account_corrente_abilitato');
  if(enabledError||enabled!==true)return {...empty,denied:true};
  const {data:roles,error:roleError}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
  if(roleError)return {...empty,denied:true};
  const staff=(roles??[]).some(r=>r.ruolo==='amministratore'||r.ruolo==='segreteria');
  const instructor=(roles??[]).some(r=>r.ruolo==='istruttore');
  let partial=false;
  const results:SearchResult[]=[];
  const add=(category:SearchCategory,rows:readonly Record<string,unknown>[]|null,error:unknown,label:(r:Record<string,unknown>)=>string,id='id',mode?:string)=>{
   if(error){partial=true;return;}
   if((rows?.length??0)>SEARCH_LIMIT)partial=true;
   const seen=new Set<string>();
   for(const row of rows??[]){
    const item=resultLink(category,row[id],label(row),mode);
    if(item&&!seen.has(item.href)){seen.add(item.href);if(seen.size<=SEARCH_LIMIT)results.push(item);}
   }
  };
  const full=(r:Record<string,unknown>)=>[r.cognome,r.nome].filter(v=>typeof v==='string').join(' ');
  const name=(r:Record<string,unknown>)=>typeof r.nome==='string'?r.nome:'';
  const jobs:PromiseLike<void>[]=[];
  if(staff){
   let people=supabase.from('persone').select('id,nome,cognome');
   let students=supabase.from('gest_elenco_iscrizioni_corsi').select('id,persona_id,sort_nome,sort_cognome').in('stato',['iscritto','concluso']);
   let courses=supabase.from('edizioni_corsi').select('id,nome');
   let equipment=supabase.from('attrezzature').select('id,codice,categoria,marca,modello');
   for(const word of words){people=people.or(searchOr(['nome','cognome'],word));students=students.or(searchOr(['sort_nome','sort_cognome'],word));courses=courses.ilike('nome','%'+word+'%');equipment=equipment.or(searchOr(['codice','categoria','marca','modello'],word));}
   jobs.push(people.order('cognome').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Soci e persone',r.data,r.error,full)));
   jobs.push(students.order('sort_cognome').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Allievi',r.data,r.error,row=>full({nome:row.sort_nome,cognome:row.sort_cognome}),'persona_id')));
   jobs.push(courses.order('nome').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Corsi',r.data,r.error,name)));
   jobs.push(equipment.order('codice').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Attrezzature',r.data,r.error,row=>[row.codice,row.categoria,row.marca,row.modello].filter(v=>typeof v==='string').join(' · '))));
  }else if(instructor){
   // Match the exact assignment scope of /istruttore. Truncation is explicit.
   jobs.push((async()=>{
    const links=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id).order('persona_id').limit(101);
    if(links.error){partial=true;return;}
    if((links.data?.length??0)>100)partial=true;
    const ids=(links.data??[]).slice(0,100).map(r=>r.persona_id);
    if(!ids.length)return;
    const assignments=await supabase.from('assegnazioni_istruttori').select('edizione_id').in('persona_id',ids).order('id').limit(201);
    if(assignments.error){partial=true;return;}
    if((assignments.data?.length??0)>200)partial=true;
    const editions=[...new Set((assignments.data??[]).slice(0,200).map(r=>r.edizione_id))];
    if(!editions.length)return;
    let query=supabase.from('edizioni_corsi').select('id,nome').in('id',editions);
    for(const word of words)query=query.ilike('nome','%'+word+'%');
    const r=await query.order('nome').order('id').limit(SEARCH_LIMIT+1);
    add('Corsi',r.data,r.error,name,'id','instructor');
   })());
  }
  if(staff||instructor){
   let events=supabase.from('eventi_soci').select('id,titolo');
   if(!staff)events=events.eq('responsabile_id',user.id);
   for(const word of words)events=events.or(searchOr(['titolo','destinazione'],word));
   jobs.push(events.order('titolo').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Eventi',r.data,r.error,row=>typeof row.titolo==='string'?row.titolo:'')));
  }
  // Deliberately only documents published for members, not health, personal or internal files.
  // The actual document handler checks authorization again. No storage URLs are fetched.
  let docs=supabase.from('documenti').select('id,nome').eq('ambito','associazione').eq('visibilita','soci');
  for(const word of words)docs=docs.ilike('nome','%'+word+'%');
  jobs.push(docs.order('nome').order('id').limit(SEARCH_LIMIT+1).then(r=>add('Documenti',r.data,r.error,name)));
  await Promise.all(jobs);
  const order=['Soci e persone','Allievi','Corsi','Eventi','Attrezzature','Documenti'];
  return {results:results.sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category)||a.label.localeCompare(b.label,'it')),partial};
 }catch{return {results:[],partial:true};}
}
