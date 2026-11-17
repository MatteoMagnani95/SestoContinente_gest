export type SocioEvento={id:string;responsabile_id:string;titolo:string;destinazione:string;descrizione:string;dal:string;al:string;costo:number;posti:number;stato:'aperto'|'chiuso'|'annullato'};
export type SocioProfilo={persona_id:string;nome:string;cognome:string};
export type SocioIscrizione={id:string;evento_id:string;persona_id:string;stato:string;richiesta_il:string};
export type SocioPartecipante=Omit<SocioIscrizione,'evento_id'>&{nome:string;cognome:string};
export const messaggiEventi:Record<string,string>={ok:'Operazione completata.',posti:'Posti esauriti oppure capienza inferiore ai posti già riservati.',stato:'Evento non disponibile o iscrizioni chiuse.',permessi:'Operazione non consentita: verifica quota, responsabile e stato.',dati:'Controlla i dati inseriti e le conferme.',errore:'Operazione non completata. Verifica i dati e riprova.'};
export const todayRome=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const euroEvento=(v:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);
