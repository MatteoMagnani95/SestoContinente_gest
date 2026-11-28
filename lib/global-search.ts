/** Input and output rules shared by search UI and server action. */
export const SEARCH_LIMIT=6;
export const SEARCH_MIN=2;
export type SearchCategory='Soci e persone'|'Allievi'|'Corsi'|'Eventi'|'Attrezzature'|'Documenti';
export type SearchResult={category:SearchCategory;label:string;href:string};
export type SearchResponse={results:SearchResult[];partial:boolean;denied?:boolean};
export function searchWords(raw:unknown){
 if(typeof raw!=='string'||raw.length>200)return [];
 const value=raw.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s-]/gu,' ').trim().slice(0,80);
 return value.replace(/\s+/g,' ').length>=SEARCH_MIN?value.split(/\s+/).filter(Boolean).slice(0,4):[];
}
export function searchOr(fields:readonly string[],word:string){
 if(!/^[\p{L}\p{M}\p{N}-]+$/u.test(word))throw Error('Invalid search word');
 return fields.map(field=>field+'.ilike.%'+word+'%').join(',');
}
export function resultLink(category:SearchCategory,id:unknown,label:unknown,edition?:unknown):SearchResult|null{
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||typeof label!=='string'||!label.trim())return null;
 const href=category==='Soci e persone'?'/gestionale/soci/'+id:category==='Allievi'?'/gestionale/soci/'+id+'?tab=corsi':category==='Corsi'?(edition==='instructor'?'/istruttore?tab=lezioni&edizione='+id:'/gestionale/corsi/'+id):category==='Eventi'?'/gestione-eventi/'+id:category==='Attrezzature'?'/gestionale/attrezzature/'+id:'/documenti/'+id;
 return {category,label:label.trim().slice(0,180),href};
}
