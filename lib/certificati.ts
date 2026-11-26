export const statiCertificato={scaduto:'Scaduti',non_valido:'Non validi',valido:'Validi',in_attesa:'In attesa di verifica',mancante:'Documento mancante'} as const;
export function statoSingolo(s:string){return ({scaduto:'Scaduto',non_valido:'Non valido',valido:'Valido',in_attesa:'In attesa di verifica',mancante:'Documento mancante'} as Record<string,string>)[s]??'Da verificare';}
