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
export function markStructuralRpcUsed(name:'dashboard'|'soci-counts'|'incassi-totals'|'navigation-account'){
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
