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
