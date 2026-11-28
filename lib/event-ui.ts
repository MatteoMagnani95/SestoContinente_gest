import {UUID_RE} from './course-tools';
export const eventTabs=[['informazioni','Informazioni'],['iscrizioni','Iscrizioni'],['approvazioni','Approvazioni'],['pagamenti','Pagamenti'],['comunicazioni','Comunicazioni']] as const;
export type EventTab=typeof eventTabs[number][0];
export const eventTab=(v?:string):EventTab=>eventTabs.find(([key])=>key===v)?.[0]??'informazioni';
export const eventPeriod=(v?:string)=>['prossimi','passati'].includes(v??'')?v!:'';
export const eventState=(v?:string)=>['aperto','chiuso','annullato'].includes(v??'')?v!:'';
export function eventHref(id:string,tab:EventTab,msg?:string){const q=new URLSearchParams({tab});if(msg)q.set('msg',msg);return '/gestione-eventi/'+encodeURIComponent(id)+'?'+q;}
export function occupancy(capacity:number,free:unknown){if(typeof free!=='number'||!Number.isInteger(free)||free<0||free>capacity)return null;return {occupied:capacity-free,free,percent:Math.round((capacity-free)*100/capacity)};}
export function eventReturn(form:FormData,id:string,status:string){return form.get('origine')==='scheda'&&UUID_RE.test(id)?eventHref(id,eventTab(String(form.get('tab')??'')),status):'/gestione-eventi?msg='+status;}
