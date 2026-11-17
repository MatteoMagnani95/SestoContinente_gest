export const tipiVerbale=['Approvazione Adesioni Soci','Gestione Ordinaria / Altro','Misto'] as const;
export function percorsoAnteprima(docx:string){return docx.replace(/\.docx$/i,'.anteprima.pdf');}
export function nomeVerbale(data:string,id:string,tipo:'docx'|'pdf'|'anteprima'){return `verbale-cda-${data}-${id.slice(0,8)}${tipo==='anteprima'?'-bozza':''}.${tipo==='docx'?'docx':'pdf'}`;}
