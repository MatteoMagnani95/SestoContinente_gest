import type {ModuleKey} from './modules';
export const moduleUi:Record<ModuleKey,{entity:string;create:string;search:string;fields:string[]}> = {
 anagrafiche:{entity:'anagrafica',create:'Aggiungi persona',search:'Cerca per nome o cognome',fields:['nome','cognome','codice_fiscale']},
 adesioni:{entity:'adesione',create:'Registra adesione',search:'Cerca socio',fields:[]},
 tesseramenti:{entity:'tesseramento',create:'Registra tesseramento',search:'Cerca socio',fields:[]},
 stagioni:{entity:'stagione',create:'Aggiungi stagione',search:'Cerca stagione',fields:['nome']},
 corsi:{entity:'corso',create:'Aggiungi corso al catalogo',search:'Cerca corso',fields:['nome']},
 edizioni:{entity:'edizione',create:'Nuova edizione del corso',search:'Cerca edizione',fields:['nome']},
 iscrizioni:{entity:'iscrizione',create:'Iscrivi allievo',search:'Cerca allievo',fields:[]},
 istruttori:{entity:'incarico istruttore',create:'Assegna istruttore',search:'Cerca istruttore',fields:[]},
 qualifiche:{entity:'qualifica',create:'Registra qualifica',search:'Cerca istruttore',fields:[]},
 brevetti:{entity:'brevetto',create:'Registra brevetto',search:'Cerca allievo',fields:[]},
 certificati:{entity:'certificato medico',create:'Registra certificato medico',search:'Cerca persona',fields:[]},
 programmi:{entity:'programma didattico',create:'Aggiungi programma',search:'Cerca programma',fields:['titolo']},
 versioni:{entity:'versione programma',create:'Crea versione del programma',search:'',fields:[]},
 piscine:{entity:'piscina',create:'Aggiungi piscina',search:'Cerca nome o indirizzo',fields:['nome','indirizzo']},
 corsie:{entity:'corsia',create:'Aggiungi corsia',search:'',fields:[]},
 calendario:{entity:'lezione',create:'Programma lezione',search:'Cerca titolo della lezione',fields:['titolo']},
 prenotazioni:{entity:'prenotazione corsia',create:'Prenota corsia',search:'',fields:[]},
 presenze:{entity:'presenza',create:'Registra presenza',search:'Cerca allievo',fields:[]},
 attrezzature:{entity:'attrezzatura',create:'Aggiungi attrezzatura',search:'Cerca codice, categoria, marca, modello o matricola',fields:['codice','categoria','marca','modello','matricola']},
 revisioni:{entity:'revisione',create:'Registra revisione',search:'Cerca tipo di intervento o esito',fields:['tipo','esito']},
 consegne:{entity:'consegna',create:'Registra consegna',search:'Cerca destinatario',fields:[]},
 quote:{entity:'quota associativa',create:'Registra quota associativa',search:'Cerca socio',fields:[]},
 addebiti:{entity:'quota corso',create:'Registra quota corso',search:'Cerca allievo',fields:[]},
 pagamenti:{entity:'versamento',create:'Registra versamento',search:'Cerca socio',fields:[]},
 listino:{entity:'voce di listino',create:'Aggiungi importo al listino',search:'',fields:[]},
 contabilita:{entity:'movimento contabile',create:'Registra movimento contabile',search:'Cerca categoria o descrizione',fields:['categoria','descrizione']},
 comunicazioni:{entity:'comunicazione',create:'Crea comunicazione',search:'Cerca titolo',fields:['titolo']},
 promemoria:{entity:'regola promemoria',create:'Aggiungi regola promemoria',search:'Cerca tipo di promemoria',fields:['tipo']},
};
export const extraEntities:Record<string,string>={richieste:'domanda di adesione',cda_componenti:'incarico nell’organo sociale',cda_verbali:'bozza del verbale',moduli_didattici:'modulo didattico'};
export function entityLabel(key:string){return Object.hasOwn(moduleUi,key)?moduleUi[key as ModuleKey].entity:extraEntities[key]??'elemento';}
export function cleanSearch(q:string){return q.trim().slice(0,80).replace(/[%_\\(),."]/g,' ').trim();}
export function pageNumber(p:string|undefined){return Math.max(1,Math.min(100000,Number.parseInt(p??'1',10)||1));}
export function listHref(params:Record<string,string|undefined>){const q=new URLSearchParams();for(const [key,value] of Object.entries(params))if(value)q.set(key,value);return '?'+q.toString();}
