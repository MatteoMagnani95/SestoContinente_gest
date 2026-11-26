export const courseTabs=[['panoramica','Panoramica'],['configurazione','Configurazione'],['istruttori','Direttore e istruttori'],['allievi','Allievi'],['didattica','Programma didattico'],['lezioni','Lezioni'],['presenze','Presenze'],['brevetti','Brevetti'],['stampe','Documenti e stampe'],['cronologia','Cronologia']] as const;
export type CourseTab=typeof courseTabs[number][0];
const messageTabs:Record<string,CourseTab>={salvato:'configurazione',istruttore:'istruttori',assegnazione:'istruttori',qualifica:'istruttori',responsabile:'istruttori',iscritto:'allievi',direttore:'allievi',gia_iscritto:'allievi',adesione:'allievi',iscrizione:'allievi',lezione_creata:'lezioni',lezione:'lezioni',moduli:'lezioni',moduli_salvati:'lezioni',presenze:'presenze',presenze_salvate:'presenze',programma:'didattica',programma_salvato:'didattica'};
export function courseTab(value?:string,msg?:string,lesson?:string):CourseTab{return courseTabs.find(([key])=>key===value)?.[0]??(msg&&Object.hasOwn(messageTabs,msg)?messageTabs[msg]:lesson?'presenze':'panoramica');}
export function courseViewHref(id:string,tab:CourseTab,msg?:string,lesson?:string){const query=new URLSearchParams({tab});if(msg)query.set('msg',msg);if(lesson)query.set('lezione',lesson);return '/gestionale/corsi/'+encodeURIComponent(id)+'?'+query.toString();}
export const disciplines=['ARA','APNEA','NUOTO_LIBERO'] as const;
export function validDiscipline(value?:string){return disciplines.find(x=>x===value)??'';}
export function validLevel(value?:string){return ['1','2','3','4','5'].includes(value??'')?Number(value):null;}
export function enrollmentEligibility(input:{isDirector:boolean;alreadyEnrolled:boolean;eligible:boolean;membership?:string|null;hasValidCard?:boolean;unavailable?:boolean}){
 if(input.isDirector)return 'Direttore del corso: non può essere allievo';
 if(input.alreadyEnrolled)return 'Iscrizione già registrata';
 if(input.unavailable)return 'Requisiti non verificabili';
 if(input.eligible)return '';
 if(!input.membership)return 'Adesione assente nella stagione';
 if(input.membership!=='attiva')return 'Adesione non attiva';
 if(!input.hasValidCard)return 'Tesseramento attivo e valido mancante';
 return 'Requisiti attuali non soddisfatti';
}
export function emergencyPair(name:string,phone:string){return (!name&&!phone)||(name.trim().length>=2&&phone.trim().length>=5);}

export async function readCourseChunks<T>(ids:string[],read:(ids:string[],from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
 const data:T[]=[];const distinct=[...new Set(ids)];
 for(let start=0;start<distinct.length;start+=100){const group=distinct.slice(start,start+100);for(let from=0;;from+=500){const result=await read(group,from,from+499);if(result.error)return {data:null,error:result.error};data.push(...(result.data??[]));if((result.data??[]).length<500)break;}}
 return {data,error:null};
}
