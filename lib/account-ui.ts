import {accountState,type AccountRow} from './admin-accounts';
export type AccountLink={utente_id:string;persona_id:string};
export function accountSummary(rows:AccountRow[],links:AccountLink[]){
 const connected=new Set(links.map(l=>l.utente_id));
 return {total:rows.length,active:rows.filter(a=>accountState(a)==='Attivo').length,disabled:rows.filter(a=>accountState(a)==='Disattivato').length,unverified:rows.filter(a=>accountState(a)==='Email non verificata').length,removed:rows.filter(a=>Boolean(a.rimosso_il)).length,noRole:rows.filter(a=>!a.ruoli.length).length,unlinked:rows.filter(a=>!connected.has(a.id)).length};
}
export function filterAccounts(rows:AccountRow[],links:AccountLink[],q:string,role:string,state:string,linked:string){
 const connected=new Set(links.map(l=>l.utente_id)),query=q.trim().toLocaleLowerCase('it');
 return rows.filter(a=>(!query||[a.cognome,a.nome,a.email].filter(Boolean).join(' ').toLocaleLowerCase('it').includes(query))&&(!role||(role==='nessuno'?!a.ruoli.length:a.ruoli.includes(role)))&&(!state||accountState(a)===state)&&(!linked||(linked==='si'?connected.has(a.id):!connected.has(a.id))));
}
export const roleDescriptions:Record<string,string>={amministratore:'Gestione completa del sistema, degli account e della contabilità.',segreteria:'Gestione operativa di soci, corsi e archivi autorizzati.',istruttore:'Accesso ai corsi assegnati e alle funzioni didattiche autorizzate.',socio:'Accesso alle informazioni personali e ai servizi associativi consentiti.',tutore:'Accesso alle persone collegate secondo le autorizzazioni.',consigliere_cda:'Accesso ai verbali e alle votazioni consentite.'};
export const roleLabel=(r:string)=>r==='consigliere_cda'?'Consigliere CdA':r.charAt(0).toUpperCase()+r.slice(1);
export const dependencyLabel=(table:string,restriction:string)=>table==='cda_verbali'?'Verbali collegati':table==='collegamenti_persone'?'Collegamenti anagrafici':table==='eventi_pratica'?'Attività sulle domande':table==='documenti'?'Documenti collegati':table==='eventi_soci'?'Eventi collegati':table==='richieste'?(restriction.includes('esaminatore')?'Domande esaminate':'Domande presentate'):table==='ruoli_utente'?'Ruoli assegnati':table==='pagamenti'?'Pagamenti collegati':table==='registro_operazioni'?'Registrazioni di audit':table==='notifiche'?'Notifiche':'Altri riferimenti protetti';
