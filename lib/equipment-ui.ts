export type Equipment={id:string;codice:string;categoria:string;marca:string|null;modello:string|null;matricola:string|null;acquistata_il:string|null;stato:string;ultima_revisione:string|null;prossima_revisione:string|null;note:string|null};
export type Loan={id:string;attrezzatura_id:string;persona_id:string|null;edizione_id:string|null;assegnata_il:string;restituita_il:string|null;note:string|null};
export type Revision={id:string;attrezzatura_id:string;data_intervento:string;prossimo_intervento:string|null;tipo:string;esito:string|null;costo:number|null;note:string|null};
export function equipmentState(row:Equipment,open:boolean){return open?(['in_manutenzione','fuori_servizio'].includes(row.stato)?row.stato:'assegnata'):row.stato==='assegnata'?'incongruente':row.stato;}
export function revisionState(date:string|null,today:string,limit:string){return !date?'non_acquisita':date<today?'scaduta':date<=limit?'in_scadenza':'registrata';}
export const equipmentLabel=(e:Equipment)=>[e.codice,e.categoria,e.marca,e.modello].filter(Boolean).join(' · ');
export const equipmentStates:Record<string,string>={disponibile:'Disponibile',assegnata:'In prestito',in_manutenzione:'In manutenzione',fuori_servizio:'Fuori servizio',incongruente:'Stato da verificare'};
export const revisionStates:Record<string,string>={non_acquisita:'Data non acquisita',scaduta:'Scaduta',in_scadenza:'In scadenza',registrata:'Data futura registrata'};

// Stessa identità indicativa usata dalla RPC registra_revisione (lower/btrim).
// Non modifica né elimina le registrazioni storiche.
export function revisionSimilarityKey(r:Pick<Revision,'attrezzatura_id'|'data_intervento'|'tipo'|'prossimo_intervento'>){
 return JSON.stringify([r.attrezzatura_id,r.data_intervento,r.tipo.replace(/^ +| +$/g,'').toLowerCase(),r.prossimo_intervento]);
}
