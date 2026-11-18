// Funzioni pure: nessuna credenziale o chiamata esterna.
export type MailMode='simulate'|'test'|'live';
export type MailTemplate={id:string;label:string;subject:string;body:string};
export function validEmail(raw:unknown):string|null{
 if(typeof raw!=='string')return null;
 const s=raw.trim();return s.length<=254&&/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(s)?s:null;
}
export function uniqueRecipients(values:unknown[]):string[]{
 const map=new Map<string,string>();for(const raw of values){const email=validEmail(raw);if(email&&!map.has(email.toLowerCase()))map.set(email.toLowerCase(),email);}
 return [...map.values()].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase(),'en'));
}
export function mailMode(env:Record<string,string|undefined>):MailMode{
 const requested=env.SESTO_EMAIL_MODE?.trim().toLowerCase();
 if(requested==='test')return 'test';
 if(requested==='live'&&env.SESTO_TEST_MODE?.trim().toLowerCase()!=='true')return 'live';
 return 'simulate';
}
export function validMessage(subject:string,body:string){return Boolean(subject.trim()&&subject.length<=180&&!/[\r\n]/.test(subject)&&body.trim()&&body.length<=12000);}
export function money(raw:number|string){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(raw));}
export function debtTemplate(kind:'quota'|'corso',id:string,name:string,label:string,residual:number|string,due:string|null):MailTemplate|null{
 if(!Number.isFinite(Number(residual))||Number(residual)<=0)return null;
 const description=kind==='quota'?`quota associativa • ${label}`:`corso ${label}`;
 const date=due&&/^\d{4}-\d{2}-\d{2}$/.test(due)?due.split('-').reverse().join('/'):null;
 return {id:`${kind}:${id}`,label:`Sollecito ${description} (${money(residual)})`,subject:`Promemoria pagamento – ${kind==='quota'?'Quota associativa':'Corso'}`,
 body:`Ciao ${name},\n\nti ricordiamo che per ${description} risulta ancora un importo da versare di ${money(residual)}.${date?`\nScadenza: ${date}.`:''}\nSe hai già provveduto al pagamento, contatta la segreteria per la verifica.\n\nGrazie,\nSesto Continente`};
}
