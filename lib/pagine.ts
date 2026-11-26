export async function tutteLePagine<T>(leggi:(da:number,a:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
 const rows:T[]=[];for(let da=0;;da+=500){const r=await leggi(da,da+499);if(r.error)return {data:null,error:r.error};rows.push(...(r.data??[]));if((r.data??[]).length<500)return {data:rows,error:null};}
}
