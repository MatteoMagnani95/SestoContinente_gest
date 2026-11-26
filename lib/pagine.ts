export async function tutteLePagine<T>(leggi:(da:number,a:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
 const rows:T[]=[];
 try{
  for(let da=0;;da+=500){
   const r=await leggi(da,da+499);
   if(r.error)return {data:null,error:r.error};
   // A successful empty page is [], not a missing or malformed response.
   // Do not turn a partial archive into an apparently complete list.
   if(!Array.isArray(r.data))return {data:null,error:new Error('Risposta paginata non disponibile')};
   rows.push(...r.data);
   if(r.data.length<500)return {data:rows,error:null};
  }
 }catch(error){return {data:null,error:error||new Error('Lettura paginata non riuscita')};}
}
