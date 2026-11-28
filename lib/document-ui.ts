export const documentScopes=['associazione','personale','didattica','amministrativo'] as const;
export const documentVisibility=['staff','proprietario','soci','istruttori'] as const;
export const archiveUploadLimit=3*1024*1024;
export const scopeLabel:Record<string,string>={associazione:'Associazione',personale:'Personale',didattica:'Didattica',amministrativo:'Amministrativo'};
export const visibilityLabel:Record<string,string>={staff:'Staff',proprietario:'Intestatario',soci:'Soci autorizzati',istruttori:'Istruttori autorizzati'};
export function documentAudience(ambito:string,visibilita:string,hasOwner:boolean){
 const base='Staff autorizzato'+(hasOwner?' e account intestatario':'');
 if(visibilita==='soci')return base+(ambito==='associazione'?' e soci attivi':' e iscritti autorizzati al corso');
 if(visibilita==='istruttori')return base+' e istruttori autorizzati';
 return base;
}
export function checkDocumentDestination(x:{ambito:string;visibilita:string;utente:string;persona:string;edizione:string;versione:string;isAdmin:boolean}){
 const {ambito,visibilita,utente,persona,edizione,versione,isAdmin}=x;
 if(!documentScopes.some(s=>s===ambito)||!documentVisibility.some(v=>v===visibilita))return false;
 if(ambito==='personale')return Boolean(utente)&&['staff','proprietario'].includes(visibilita)&&!edizione&&!versione;
 if(ambito==='amministrativo')return visibilita==='staff'&&!utente&&!persona&&!edizione&&!versione;
 if(ambito==='associazione')return !utente&&!persona&&!edizione&&!versione&&(visibilita==='staff'||visibilita==='soci'&&isAdmin);
 return !utente&&!persona&&Boolean(edizione||versione)&&(visibilita==='staff'||visibilita==='istruttori'||visibilita==='soci'&&Boolean(edizione));
}

/** Format metadata, without changing file names, access paths or storage. */
export function documentFileKind(mime:string|null|undefined):{label:string;icon:'file-pdf'|'file-image'|'file-sheet'|'file-word'|'document';style:string}{
 const m=(mime??'').toLowerCase();if(m==='application/pdf')return {label:'PDF',icon:'file-pdf',style:'pdf'};if(m.startsWith('image/'))return {label:'Immagine',icon:'file-image',style:'image'};if(m.includes('spreadsheet')||m==='application/vnd.ms-excel'||m==='text/csv')return {label:'Foglio dati',icon:'file-sheet',style:'sheet'};if(m.includes('wordprocessing')||m==='application/msword')return {label:'Documento',icon:'file-word',style:'word'};return {label:'File',icon:'document',style:'other'};
}
export function documentSize(bytes:number|null|undefined):string{if(bytes==null||!Number.isFinite(bytes)||bytes<0)return 'Non disponibile';if(bytes<1024)return bytes.toLocaleString('it-IT')+' B';if(bytes<1024*1024)return Math.ceil(bytes/1024).toLocaleString('it-IT')+' KB';return (bytes/(1024*1024)).toLocaleString('it-IT',{maximumFractionDigits:2})+' MB';}
