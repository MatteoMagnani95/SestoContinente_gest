export const requestStates=['bozza','inviata','in_verifica','integrazione_richiesta','approvata','respinta'] as const;
export const pendingRequestStates=['inviata','in_verifica','integrazione_richiesta'] as const;
export function exactCount(result:{count:number|null;error:unknown}){return result.error||result.count===null?'—':result.count;}
export function dateFilter(value?:string){if(!value||value<'1900-01-01'||value>'9998-12-30'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:'';}
export function uuidReference(value:string){
 const raw=value.trim().replace(/^#/,'').toLowerCase();
 if(/^[0-9a-f]{8}$/.test(raw))return {from:raw+'-0000-0000-0000-000000000000',to:raw+'-ffff-ffff-ffff-ffffffffffff'};
 if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(raw))return {from:raw,to:raw};
 return null;
}
export function searchTerms(value:string){return value.normalize('NFC').replace(/[^\p{L}\p{N} '-]/gu,' ').trim().slice(0,80).split(/\s+/).filter(Boolean).slice(0,6);}
export function statusTone(value:string):'success'|'warning'|'danger'|'info'|'neutral'{
 if(['attiva','attivo','approvata','valido','pagata','iscritto'].includes(value))return 'success';
 if(['da_perfezionare','inviata','integrazione_richiesta','in_scadenza','in_attesa','da_emettere'].includes(value))return 'warning';
 if(['respinta','scaduto','scaduta','non_valido','mancante','cessata'].includes(value))return 'danger';
 if(['in_verifica','programmato'].includes(value))return 'info';
 return 'neutral';
}
export const memberTabs=[['panoramica','Panoramica'],['anagrafica','Anagrafica e recapiti'],['adesioni','Adesioni e dichiarazioni'],['tesseramenti','Tesseramenti'],['corsi','Corsi'],['pagamenti','Pagamenti'],['certificati','Certificati'],['brevetti','Brevetti'],['documenti','Documenti'],['istruttore','Qualifiche istruttore'],['attrezzature','Attrezzature'],['famiglia','Famiglia e collegamenti'],['cronologia','Cronologia']] as const;
export function memberTab(value?:string){return memberTabs.find(([key])=>key===value)?.[0]??'panoramica';}

const moduleTabs:Record<string,string>={adesioni:'adesioni',tesseramenti:'tesseramenti',certificati:'certificati',iscrizioni:'corsi',brevetti:'brevetti',qualifiche:'istruttore',istruttori:'istruttore',consegne:'attrezzature',quote:'pagamenti',addebiti:'pagamenti'};
export function memberTabForModule(key:string){return Object.hasOwn(moduleTabs,key)?moduleTabs[key]:undefined;}

/** Presentation only: never write the formatted value back into anagrafica. */
export function displayName(value:string|null|undefined){
 const s=(value??'').trim();
 return s===s.toLocaleUpperCase('it')?s.toLocaleLowerCase('it').replace(/(^|[ '\u2019-])\p{L}/gu,v=>v.toLocaleUpperCase('it')):s;
}
export function personInitials(nome:string,cognome:string){
 return [nome,cognome].map(v=>Array.from(v.trim())[0]??'').join('').toLocaleUpperCase('it');
}
export function maskedFiscalCode(value:string|null|undefined){
 return value?(value.length>4?'•••• '+value.slice(-4):'••••'):'Non acquisito';
}
export const secondaryMemberTabs=['brevetti','documenti','istruttore','attrezzature','famiglia','cronologia'] as const;
export function isSecondaryMemberTab(key:string){return secondaryMemberTabs.some(k=>k===key);}
export const secretariatLinks=[
 {href:'/gestionale/soci',label:'Soci e allievi',icon:'users'},
 {href:'/gestionale/moduli/anagrafiche',label:'Anagrafiche',icon:'user'},
 {href:'/gestionale/richieste',label:'Domande',icon:'clipboard'},
 {href:'/gestionale/moduli/adesioni',label:'Adesioni',icon:'users'},
 {href:'/gestionale/moduli/tesseramenti',label:'Tesseramenti',icon:'document'},
 {href:'/gestionale/moduli/certificati',label:'Certificati',icon:'certificate'},
 {href:'/gestionale/moduli/brevetti',label:'Brevetti',icon:'course'},
] as const;
