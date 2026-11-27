import 'server-only';
import type {createClient} from '@/lib/supabase/server';

// Experimental path only: no production service or schema dependency.
export function structuralQaEnabled(){
 if(process.env.SC_STRUCTURAL_RPC!=='true'||process.env.QA_ISOLATED_ENV!=='true'||process.env.SESTO_TEST_MODE!=='true'||process.env.SESTO_EMAIL_MODE!=='simulate')return false;
 try{const u=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');return ['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='54321'&&u.protocol==='http:';}catch{return false;}
}
export async function structuralRpc(client:Awaited<ReturnType<typeof createClient>>,name:string,args:Record<string,unknown>){
 if(!structuralQaEnabled())return null;
 try{const {data,error}=await client.rpc(name,args);return !error&&data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:null;}catch{return null;}
}
export function validCount(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;}
export function readFinanceTotals(value:Record<string,unknown>|null){
 if(!value)return null;
 const {due,paid,residue,settled,open}=value;
 return typeof due==='number'&&Number.isFinite(due)&&typeof paid==='number'&&Number.isFinite(paid)&&typeof residue==='number'&&Number.isFinite(residue)&&validCount(settled)&&validCount(open)?{due,paid,residue,settled,open}:null;
}
type Season={id:string;nome:string};
type Event={id:string;titolo:string;dal:string;al:string|null;stato:string};
type Lesson={id:string;titolo:string;inizio:string;fine:string};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown):v is string=>typeof v==='string';
const event=(v:unknown):v is Event=>record(v)&&str(v.id)&&str(v.titolo)&&str(v.dal)&&(v.al===null||str(v.al))&&str(v.stato);
const lesson=(v:unknown):v is Lesson=>record(v)&&str(v.id)&&str(v.titolo)&&str(v.inizio)&&str(v.fine);
function preview<T>(value:unknown,guard:(v:unknown)=>v is T,max:number){
 return record(value)&&validCount(value.count)&&Array.isArray(value.data)&&value.data.length<=max&&value.data.length<=value.count&&value.data.every(guard)?{count:value.count,data:value.data,error:null}:null;
}
export function readDashboardSnapshot(v:Record<string,unknown>|null){
 if(!v)return null;
 const season:Season|null=v.season===null?null:record(v.season)&&str(v.season.id)&&str(v.season.nome)?{id:v.season.id,nome:v.season.nome}:null;
 if(v.season!==null&&!season)return null;
 const {requests,courses,enrollments,revisions,certificates,adhesions,pendingAdhesions,quotes,admin}=v;
 const events=preview(v.events,event,5),lessons=preview(v.lessons,lesson,8);
 if(!validCount(requests)||!validCount(courses)||!validCount(enrollments)||!validCount(revisions)||!validCount(certificates)||typeof admin!=='boolean'||!events||!lessons)return null;
 if(season?(!validCount(adhesions)||!validCount(pendingAdhesions)||!validCount(quotes)):(adhesions!==null||pendingAdhesions!==null||quotes!==null))return null;
 const count=(n:unknown)=>({count:validCount(n)?n:null,error:validCount(n)?null:true});
 return {season,seasonError:null,requests:count(requests),courses:count(courses),enrollments:count(enrollments),revisions:count(revisions),certificates:count(certificates),events,lessons,admin:{data:admin},adhesions:count(adhesions),pendingAdhesions:count(pendingAdhesions),quotes:count(quotes)};
}

const used=new Set<string>();
export function markStructuralRpcUsed(name:'dashboard'|'soci-counts'|'incassi-totals'|'navigation-account'|'inventory-page'|'person-options'|'soci-page'){
 if(structuralQaEnabled()&&!used.has(name)){used.add(name);console.log('QA_STRUCTURAL_RPC_USED '+name);}
}

type AccountSnapshot={enabled:false}|{enabled:true;roles:string[];member:boolean;personal:boolean;unread:number;owner:{nome:string;cognome:string|null}|null};
export function readAccountSnapshot(v:Record<string,unknown>|null):AccountSnapshot|null{
 if(!v)return null;
 if(v.enabled===false)return {enabled:false};
 if(v.enabled!==true||!Array.isArray(v.roles)||!v.roles.every(str)||typeof v.member!=='boolean'||typeof v.personal!=='boolean'||!validCount(v.unread))return null;
 const owner=v.owner===null?null:record(v.owner)&&str(v.owner.nome)&&(v.owner.cognome===null||str(v.owner.cognome))?{nome:v.owner.nome,cognome:v.owner.cognome}:null;
 if(v.owner!==null&&!owner)return null;
 return {enabled:true,roles:v.roles,member:v.member,personal:v.personal,unread:v.unread,owner};
}

type InventoryRow=import('@/lib/equipment-ui').Equipment&{has_loan:boolean;locked?:boolean};
const equipment=(v:unknown):v is InventoryRow=>record(v)&&str(v.id)&&str(v.codice)&&str(v.categoria)&&str(v.stato)&&typeof v.has_loan==='boolean'&&['marca','modello','matricola','acquistata_il','ultima_revisione','prossima_revisione','note'].every(k=>v[k]===null||str(v[k]));
export function readInventorySnapshot(v:Record<string,unknown>|null){
 if(!v||!validCount(v.count)||typeof v.direct!=='boolean'||!validCount(v.upcomingCount)||!Array.isArray(v.categories)||!v.categories.every(str)||!record(v.metrics)||!Array.isArray(v.rows)||v.rows.length>30||!v.rows.every(equipment)||!v.rows.every(r=>typeof r.locked==='boolean')||!Array.isArray(v.upcoming)||v.upcoming.length>6||!v.upcoming.every(equipment))return null;
 const keys=['available','loaned','maintenance','out','due','total'] as const;
 if(!keys.every(k=>validCount(v.metrics&&record(v.metrics)?v.metrics[k]:null)))return null;
 return {rows:v.rows as InventoryRow[],upcoming:v.upcoming as InventoryRow[],upcomingCount:v.upcomingCount,count:v.count,direct:v.direct,categories:v.categories as string[],metrics:v.metrics as Record<typeof keys[number],number>};
}
export type PersonOption={value:string;label:string};
const option=(v:unknown):v is PersonOption=>record(v)&&str(v.value)&&str(v.label);
export function readPersonOptions(v:Record<string,unknown>|null){
 if(!v||!validCount(v.count)||!Array.isArray(v.options)||v.options.length>50||!v.options.every(option)||!(v.selected===null||option(v.selected)))return null;
 return {count:v.count,options:v.options as PersonOption[],selected:v.selected as PersonOption|null};
}

type MemberRow={adesione_id:string;persona_id:string;stagione_id:string;stagione:string;stato:string;nome:string;cognome:string;codice_fiscale:string|null;email:string|null;telefono:string|null};
const memberRow=(v:unknown):v is MemberRow=>record(v)&&['adesione_id','persona_id','stagione_id','stagione','stato','nome','cognome'].every(k=>str(v[k]))&&['codice_fiscale','email','telefono'].every(k=>v[k]===null||str(v[k]));
type MemberSeason={id:string;nome:string;attiva:boolean};
const memberSeason=(v:unknown):v is MemberSeason=>record(v)&&str(v.id)&&str(v.nome)&&typeof v.attiva==='boolean';
export function readMembersPage(v:Record<string,unknown>|null){
 if(!v||!str(v.chosen)||!validCount(v.count)||!Array.isArray(v.seasons)||!v.seasons.every(memberSeason)||!record(v.counts)||!Array.isArray(v.rows)||v.rows.length>25||v.rows.length>v.count||!v.rows.every(memberRow))return null;
 const counts=v.counts,keys=['total','da_perfezionare','attiva','sospesa','cessata'] as const;
 if(!keys.every(k=>validCount(counts[k])))return null;
 if(v.chosen!=='tutte'&&!v.seasons.some(s=>s.id===v.chosen))return null;
 return {seasons:v.seasons as MemberSeason[],chosen:v.chosen,count:v.count,counts:counts as Record<typeof keys[number],number>,rows:v.rows as MemberRow[]};
}
