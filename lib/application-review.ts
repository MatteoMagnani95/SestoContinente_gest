export type ReviewDecision = 'approvata' | 'integrazione' | 'respinta';
export type DecisionResult = { error: string; next?: never } | { next: string; error?: never };
export type ReviewCheck = { label: string; status: 'ok' | 'blocked' | 'unknown'; detail: string };
export type ReviewDeclaration = {presa_visione?: boolean|null; flag_statuto?: boolean|null; flag_privacy?: boolean|null; versione_statuto?: string|null; versione_privacy?: string|null};

export function isReviewDecision(value: string): value is ReviewDecision {
  return ['approvata','integrazione','respinta'].includes(value);
}
export function decisionValidation(action: string, confirmed: boolean, message: string, note: string): string | null {
  if (!isReviewDecision(action)) return 'Seleziona una decisione valida.';
  if (action === 'approvata' && !confirmed) return 'Conferma le verifiche preliminari prima di approvare.';
  if (action === 'integrazione' && message.trim().length < 10) return 'Indica le informazioni da integrare (almeno 10 caratteri).';
  if (action === 'respinta' && note.trim().length < 10) return 'Inserisci una motivazione interna del rifiuto (almeno 10 caratteri).';
  return null;
}
export function declarationCheck(r: ReviewDeclaration): ReviewCheck {
  const valid = (v?: string|null) => Boolean(v?.trim() && v !== 'DA_CONFIGURARE');
  const missing = [!r.presa_visione && 'presa visione', !r.flag_statuto && 'statuto', !r.flag_privacy && 'informativa privacy', !valid(r.versione_statuto) && 'versione statuto', !valid(r.versione_privacy) && 'versione privacy'].filter(Boolean);
  return {label:'Documentazione della pratica',status:missing.length?'blocked':'ok',detail:missing.length?`Mancano: ${missing.join(', ')}.`:'Dichiarazioni e versioni registrate. Verificare comunque la documentazione pertinente.'};
}
export function seasonCheck(count: number|null, failed: boolean): ReviewCheck {
  return failed || count===null ? {label:'Stagione associativa',status:'unknown',detail:'Controllo non disponibile. Il database ripeterà la verifica.'} : count===1 ? {label:'Stagione associativa',status:'ok',detail:'Una stagione attiva presente.'} : {label:'Stagione associativa',status:'blocked',detail:count===0?'Nessuna stagione attiva. Configurala prima di approvare.':'Più stagioni attive: verifica la configurazione prima di approvare.'};
}
export function duplicateCheck(counts: (number|null)[], failed: boolean): ReviewCheck {
  return counts.some(n=>n!==null&&n>0) ? {label:'Possibili duplicati',status:'blocked',detail:'Possibile anagrafica duplicata. Risolvere il caso prima di approvare.'} : failed || counts.some(n=>n===null) ? {label:'Possibili duplicati',status:'unknown',detail:'Controllo non disponibile. Il database ripeterà la verifica.'} : {label:'Possibili duplicati',status:'ok',detail:'Nessuna corrispondenza rilevata per CF o nome, cognome e data di nascita.'};
}
// PostgreSQL ILIKE: treat user-provided % and _ as literal characters.
export function escapeReviewPattern(value: string): string { return value.replace(/[\\%_]/g, '\\$&'); }

// Only known, deliberately written business exceptions are mapped. Never expose raw SQL,
// constraint values, details or hints (they may contain other members' information).
export function reviewError(error: {code?:string;message?:string}): {key:string;message:string} {
  const known: Record<string,{key:string;message:string}> = {
    'Accesso negato':{key:'permessi',message:'La sessione non è autorizzata a valutare questa domanda.'},
    'Domanda non in verifica':{key:'stato',message:'La domanda non è più in verifica. Ricarica la pagina per vedere lo stato aggiornato.'},
    'Domanda già lavorata o non disponibile':{key:'stato',message:'La domanda è già stata presa in carico o non è più disponibile. Ricarica la pagina.'},
    'Esito non riconosciuto':{key:'esito',message:'Seleziona una decisione valida.'},
    'Indicare i dati da integrare (almeno 10 caratteri)':{key:'integrazione',message:'Indica le informazioni da integrare (almeno 10 caratteri).'},
    'Motivazione interna obbligatoria (almeno 10 caratteri)':{key:'rifiuto',message:'Inserisci una motivazione interna del rifiuto (almeno 10 caratteri).'},
    'Confermare le verifiche preliminari':{key:'verifiche',message:'Conferma le verifiche preliminari prima di approvare.'},
    'Presa visione mancante':{key:'documentazione',message:'La pratica non contiene la presa visione richiesta. Chiedi un’integrazione.'},
    'Configurare una stagione attiva':{key:'stagione',message:'Non è presente una stagione attiva. Configurala prima di approvare.'},
    'Anagrafica potenzialmente duplicata: approvazione bloccata':{key:'duplicato',message:'Possibile anagrafica duplicata. Verifica CF, nome, cognome e data di nascita prima di approvare.'},
    'Dichiarazioni Statuto / informativa obbligatorie prima dell’invio':{key:'documentazione',message:'Statuto, informativa privacy o relative versioni mancanti. Chiedi un’integrazione.'},
  };
  if(error.code==='P0001' && error.message && Object.hasOwn(known,error.message)) return known[error.message];
  switch(error.code){
    case '23505':return {key:'univocita',message:'Un record con identificativo o dati univoci coincidenti è già presente. Verifica anagrafica, adesione e collegamenti all’account.'};
    case '23503':return {key:'relazione',message:'Un record collegato non è disponibile. Verifica stagione, anagrafica e account.'};
    case '23502':case '23514':case '22001':case '22P02':return {key:'vincolo',message:'Uno o più dati non rispettano i vincoli del database. Verifica la pratica; i dati della decisione non sono stati persi.'};
    case '42501':return {key:'permessi',message:'Permessi insufficienti per completare l’operazione.'};
    case 'PGRST202':case '42883':return {key:'migrazioni',message:'Funzione di valutazione non disponibile. Verifica l’allineamento delle migrazioni Supabase.'};
    case '40001':case '40P01':return {key:'concorrenza',message:'Un’altra operazione è in corso. Ricarica lo stato della pratica prima di riprovare.'};
    default:return {key:'database',message:'Decisione non registrata. Controlla lo stato della pratica; se l’errore persiste, consulta i log con il riferimento riportato.'};
  }
}
