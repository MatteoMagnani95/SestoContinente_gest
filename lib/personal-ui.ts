export const personalTabs=[['panoramica','Panoramica'],['tessere','Adesioni e tessere'],['quote','Quote e saldi'],['brevetti','Brevetti'],['notifiche','Notifiche'],['comunicazioni','Comunicazioni']] as const;
export const instructorTabs=[['corsi','Corsi assegnati'],['lezioni','Lezioni e calendario'],['allievi','Allievi'],['presenze','Registro presenze'],['materiali','Programmi e materiali']] as const;
export function selectedTab<T extends readonly (readonly [string,string])[]>(tabs:T,value?:string):T[number][0]{return (tabs.find(([key])=>key===value)?.[0]??tabs[0][0]) as T[number][0];}
export function authorizedSelection(ids:string[],requested?:string){return requested?ids.includes(requested)?requested:null:ids[0]??null;}
export function attendanceValue(value:unknown):'si'|'no'|null{return value==='si'||value==='no'?value:null;}
