/** Pure navigation rules. Authorization is enforced separately on the server. */
export type NavigationAccess = { signedIn:boolean; enabled:boolean; staff:boolean; admin:boolean; instructor:boolean; board:boolean; personal:boolean; member:boolean; unread:number|null; firstName?:string; lastInitial?:string };
export const guestAccess:NavigationAccess={signedIn:false,enabled:false,staff:false,admin:false,instructor:false,board:false,personal:false,member:false,unread:null};
export type NavItem={href:string;label:string;aliases?:string[];exact?:boolean};
export const isWithin=(path:string,base:string)=>path===base||path.startsWith(base+'/');
export function staffArea(path:string,access:NavigationAccess){
 return access.staff&&['/gestionale','/gestione-eventi','/organi-sociali','/documenti','/comunicazioni'].some(base=>isWithin(path,base));
}
export function activeItem(path:string,items:NavItem[]){
 let winner:string|undefined;let length=-1;
 for(const item of items){
  for(const base of [item.href,...(item.aliases??[])]){
   if((item.exact?path===base:isWithin(path,base))&&base.length>length){winner=item.href;length=base.length;}
  }
 }
 return winner;
}
export function areaLabel(path:string,access:NavigationAccess){
 if(staffArea(path,access))return access.admin?'Amministrazione':'Segreteria';
 if(isWithin(path,'/organi-sociali'))return 'Organi sociali';
 if(['/istruttore','/gestione-eventi','/comunicazioni/corsi'].some(b=>isWithin(path,b)))return 'Area istruttori';
 if(isWithin(path,'/area-soci'))return 'Area soci';
 if(isWithin(path,'/area-personale'))return 'Area personale';
 if(isWithin(path,'/richiesta'))return 'Adesione';
 if(isWithin(path,'/documenti'))return 'Documenti';
 if(isWithin(path,'/notifiche'))return 'Notifiche account';
 return 'Area pubblica';
}
export function homeFor(access:NavigationAccess){return access.staff?'/gestionale':access.board?'/organi-sociali':access.instructor?'/istruttore':access.personal?'/area-personale':access.enabled?'/smista':'/';}
export type BackTarget={href:string;label:string};
const simpleBack:Record<string,BackTarget>={
 '/accedi':{href:'/',label:'Torna alla home'},'/registrati':{href:'/',label:'Torna alla home'},
 '/nuova-password':{href:'/accedi',label:'Torna all’accesso'},'/registrati/informativa-test':{href:'/registrati',label:'Torna alla registrazione'},
 '/richiesta/documenti-test':{href:'/richiesta/nuova',label:'Torna alla domanda'},
 '/richiesta/nuova':{href:'/richiesta/stato',label:'Torna alla domanda'},
 '/gestionale/archivio-incassi':{href:'/gestionale/incassi',label:'Torna agli incassi'},
 '/organi-sociali/archivio':{href:'/organi-sociali',label:'Torna agli organi sociali'},
 '/organi-sociali/riepilogo':{href:'/organi-sociali',label:'Torna agli organi sociali'},
 '/gestionale/economia':{href:'/gestionale',label:'Torna alla panoramica'},
};
const detailParents:[string,string,string][]=[
 ['/gestionale/attrezzature','/gestionale/moduli/attrezzature','Torna all’inventario'],
 ['/gestione-eventi','/gestione-eventi','Torna agli eventi'],
 ['/gestionale/amministrazione-dati/dipendenze','/gestionale/amministrazione-dati','Torna all’amministrazione dati'],
 ['/gestionale/calendario-visivo','/gestionale/calendario-visivo','Torna al calendario'],
 ['/gestionale/richieste','/gestionale/richieste','Torna alle domande'],
 ['/gestionale/soci','/gestionale/soci','Torna ai soci'],
 ['/gestionale/corsi','/gestionale/corsi','Torna ai corsi'],
 ['/gestionale/incassi','/gestionale/incassi','Torna agli incassi'],
 ['/gestionale/utenti','/gestionale/utenti','Torna agli utenti'],
 ['/organi-sociali/archivio','/organi-sociali/archivio','Torna all’archivio dei verbali'],
 ['/area-personale','/area-personale','Torna alla mia area personale'],
];
export function backTarget(path:string,access:NavigationAccess):BackTarget|null{
 if(path==='/'||path==='/smista')return null;
 if(simpleBack[path])return simpleBack[path];
 if(path==='/area-personale/profilo'&&!access.personal)return {href:'/richiesta/stato',label:'Torna alla domanda'};
 const account=path.match(/^\/gestionale\/utenti\/([^/]+)\/elimina$/);
 if(account)return {href:'/gestionale/utenti/'+account[1],label:'Torna alla scheda account'};
 const mail=path.match(/^\/comunicazioni\/(corsi|soci)\/([^/]+)$/);
 if(mail)return mail[1]==='soci'?{href:'/gestionale/soci/'+mail[2],label:'Torna alla scheda socio'}:access.staff?{href:'/gestionale/corsi/'+mail[2],label:'Torna al corso'}:{href:'/istruttore',label:'Torna ai miei corsi'};
 for(const [prefix,href,label] of detailParents)if(path.startsWith(prefix+'/'))return {href,label};
 if(path==='/gestionale')return {href:'/',label:'Torna alla home'};
 if(staffArea(path,access))return {href:'/gestionale',label:'Torna alla panoramica'};
 if(path==='/gestione-eventi'&&access.instructor)return {href:'/istruttore',label:'Torna ai miei corsi'};
 if(path==='/richiesta/stato')return {href:access.personal?'/area-personale':'/',label:access.personal?'Torna alla mia area personale':'Torna alla home'};
 if(path==='/area-soci'&&access.personal)return {href:'/area-personale',label:'Torna alla mia area personale'};
 const home=homeFor(access);
 return home!==path?{href:home,label:'Torna alla tua area'}:{href:'/',label:'Torna alla home'};
}
export const filterKeys=['q','p','stagione','stato','filtro','giorno','vista','vista_corsi','piscina','tab','persona','area','corsia','inizio','fine','tipo','anno','dal','al','filtro_modulo','ordine','dir','ambito','np','tp','pm','periodo','p2','disciplina','livello','lezione','edizione','annullate','corsia_id','richieste','visibilita','debito','attrezzatura','revisione','categoria','ruolo','collegato'] as const;
export function listContext(path:string,search:string){
 const params=new URLSearchParams(search),safe=new URLSearchParams();
 for(const key of filterKeys)for(const val of params.getAll(key))safe.append(key,val);
 return path+(safe.size?'?'+safe.toString():'');
}
export function contextPath(path:string){
 return ['/gestionale/soci','/gestionale/corsi','/gestionale/richieste','/gestionale/calendario-visivo','/gestionale/utenti','/gestionale/incassi','/gestionale/archivio-incassi','/organi-sociali/archivio','/documenti','/gestione-eventi','/area-personale','/area-personale/corsi','/area-soci','/istruttore','/gestionale/report','/gestionale/economia','/gestionale/amministrazione-dati'].includes(path)||/^\/gestionale\/moduli\/[a-z_]+$/.test(path);
}
export function restoredTarget(target:BackTarget,contexts:Record<string,string>){
 const saved=contexts[target.href];
 return saved&&(saved===target.href||saved.startsWith(target.href+'?'))?{...target,href:saved}:target;
}

/** Account identity is not the identity of a represented child or other person. */
export function accountFirstName(owners:readonly {nome:unknown}[]):string|undefined{
 if(owners.length!==1||typeof owners[0].nome!=='string')return undefined;
 const name=owners[0].nome.trim().replace(/\s+/g,' ');
 if(name.length>60||!/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u.test(name))return undefined;
 return name===name.toLocaleUpperCase('it')?name.toLocaleLowerCase('it').replace(/(^|[ '\u2019-])\p{L}/gu,s=>s.toLocaleUpperCase('it')):name;
}
export function greeting(access:NavigationAccess){return access.enabled&&access.firstName?'Ciao, '+access.firstName:'Ciao';}
export function initials(access:NavigationAccess){return access.enabled&&access.firstName?(Array.from(access.firstName).slice(0,1).join('')+(access.lastInitial??'')).toLocaleUpperCase('it'):'';}
export type MobileDestination={href:string;label:string;icon:'home'|'users'|'course'|'calendar'|'document'|'user'|'clipboard'};
export function mobileDestinations(path:string,access:NavigationAccess):MobileDestination[]{
 if(!access.enabled)return [];
 if(staffArea(path,access)||(path==='/'&&access.staff))return [{href:'/gestionale',label:'Dashboard',icon:'home'},{href:'/gestionale/soci',label:'Soci',icon:'users'},{href:'/gestionale/corsi',label:'Corsi',icon:'course'},{href:'/gestionale/calendario-visivo',label:'Calendario',icon:'calendar'}];
 if(access.instructor&&(isWithin(path,'/istruttore')||isWithin(path,'/gestione-eventi')||(!access.personal&&!access.board)))return [{href:'/istruttore',label:'Corsi',icon:'course'},{href:'/gestione-eventi',label:'Eventi',icon:'calendar'},{href:'/documenti',label:'Documenti',icon:'document'},{href:'/area-personale/profilo',label:'Profilo',icon:'user'}];
 if(access.board&&(isWithin(path,'/organi-sociali')||!access.personal))return [{href:'/organi-sociali',label:'Consiglio',icon:'clipboard'},{href:'/documenti',label:'Documenti',icon:'document'},{href:'/area-personale/profilo',label:'Profilo',icon:'user'}];
 if(access.personal)return [{href:'/area-personale',label:'La mia area',icon:'home'},{href:'/area-personale/corsi',label:'Corsi',icon:'course'},...(access.member?[{href:'/area-soci',label:'Eventi',icon:'calendar' as const}]:[]),{href:'/area-personale/profilo',label:'Profilo',icon:'user'}];
 return [{href:'/richiesta/stato',label:'Domanda',icon:'clipboard'},{href:'/documenti',label:'Documenti',icon:'document'},{href:'/area-personale/profilo',label:'Profilo',icon:'user'}];
}
export function searchVisible(path:string,access:NavigationAccess){
 return access.enabled&&path!=='/'&&path!=='/smista'&&!['/accedi','/registrati','/nuova-password','/richiesta'].some(p=>isWithin(path,p));
}
